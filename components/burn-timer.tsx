"use client"

import { useState, useEffect, useRef, useLayoutEffect } from "react"
import { createPortal } from "react-dom"
import { DeviceConfig } from "@/lib/db"
import { BurnDuration } from "@/hooks/use-email"
import { formatCountdown, getBurnProgress } from "@/lib/email-utils"
import { Fire, Timer, ArrowClockwise } from "@phosphor-icons/react"

const MOBILE_BREAKPOINT = 640

interface Props {
  config: DeviceConfig | null
  isBurned: boolean
  onSetDuration: (d: BurnDuration) => Promise<void>
  onBurnNow: () => Promise<void>
  /** On mobile: single row with flame, countdown, duration button (no "Burns in" label) */
  compact?: boolean
}

const DURATIONS: { label: string; value: BurnDuration; ms: number | null }[] = [
  { label: "5 min", value: "5min", ms: 5 * 60 * 1000 },
  { label: "1 hour", value: "1hour", ms: 60 * 60 * 1000 },
  { label: "24 hours", value: "24hours", ms: 24 * 60 * 60 * 1000 },
  { label: "∞  Never (we judge you)", value: "never", ms: null },
]

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)
    setIsMobile(mql.matches)
    const handler = () => setIsMobile(mql.matches)
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [])
  return isMobile
}

export function BurnTimer({ config, isBurned, onSetDuration, onBurnNow, compact = false }: Props) {
  const [countdown, setCountdown] = useState("")
  const [progress, setProgress] = useState(0)
  const [showOptions, setShowOptions] = useState(false)
  const [overlayPosition, setOverlayPosition] = useState<{ top: number; left: number; width: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!config?.burnAt) {
      setCountdown("∞")
      setProgress(0)
      return
    }

    const update = () => {
      setCountdown(formatCountdown(config.burnAt!))
      setProgress(getBurnProgress(config.createdAt, config.burnAt!))
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [config])

  useLayoutEffect(() => {
    if (!showOptions || !isMobile || !triggerRef.current) {
      setOverlayPosition(null)
      return
    }
    const rect = triggerRef.current.getBoundingClientRect()
    const padding = 12
    setOverlayPosition({
      top: rect.bottom + 8,
      left: Math.max(padding, Math.min(rect.right - 200, rect.left)),
      width: Math.min(200, window.innerWidth - padding * 2),
    })
  }, [showOptions, isMobile])

  useEffect(() => {
    if (!showOptions || !isMobile) return
    const onScrollOrResize = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        const padding = 12
        setOverlayPosition({
          top: rect.bottom + 8,
          left: Math.max(padding, Math.min(rect.right - 200, rect.left)),
          width: Math.min(200, window.innerWidth - padding * 2),
        })
      }
    }
    window.addEventListener("scroll", onScrollOrResize, true)
    window.addEventListener("resize", onScrollOrResize)
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true)
      window.removeEventListener("resize", onScrollOrResize)
    }
  }, [showOptions, isMobile])

  if (isBurned) {
    if (compact) {
      return (
        <div className="burn-timer burn-timer--burned burn-timer--burned-compact">
          <span className="burn-timer--burned-line">This address has been reduced to ash.</span>
          <span className="burn-hint burn-hint--with-icon">
            <ArrowClockwise size={16} weight="bold" />
            Generate a new one above. It&apos;s free. We checked.
          </span>
        </div>
      )
    }
    return (
      <div className="burn-timer burn-timer--burned">
        <Fire weight="fill" className="burn-icon burn-icon--dead" />
        <span>This address has been reduced to ash.</span>
        <span className="burn-hint">Generate a new one above. It&apos;s free. We checked.</span>
      </div>
    )
  }

  if (!config) return null

  const isUrgent = config.burnAt ? (config.burnAt - Date.now()) < 5 * 60 * 1000 : false
  const fillWidth = config.burnAt ? `${(1 - progress) * 100}%` : "100%"

  if (compact) {
    const durationButton = (
      <div className="burn-timer-actions burn-timer-actions--inline">
        <button
          ref={triggerRef}
          className="btn-ghost-sm"
          onClick={() => setShowOptions((v) => !v)}
          title="Change burn duration"
        >
          <Timer size={14} />
          <span>{config.burnDuration === "never" ? "Never" : config.burnDuration}</span>
        </button>
      </div>
    )
    const compactContent = (
      <>
        <div className={`burn-timer burn-timer--compact ${isUrgent ? "burn-timer--urgent" : ""}`}>
          <Fire
            weight="fill"
            className={`burn-icon burn-icon--compact ${isUrgent ? "burn-icon--urgent" : ""}`}
          />
          <span className="burn-countdown burn-countdown--compact">{countdown}</span>
        </div>
        {durationButton}
      </>
    )
    const dropdownContent = (
      <div className="burn-options burn-options--overlay">
        {DURATIONS.map((d) => (
          <button
            key={d.value}
            onClick={async () => {
              await onSetDuration(d.value)
              setShowOptions(false)
            }}
            className={`burn-option ${config.burnDuration === d.value ? "burn-option--active" : ""}`}
          >
            {d.label}
          </button>
        ))}
        <div className="burn-options-divider" />
        <button
          onClick={async () => {
            setShowOptions(false)
            await onBurnNow()
          }}
          className="burn-option burn-option--nuke"
        >
          <Fire size={12} weight="fill" /> Burn Now
        </button>
      </div>
    )
    return (
      <>
        {compactContent}
        {showOptions && isMobile && overlayPosition && typeof document !== "undefined" &&
          createPortal(
            <div
              className="burn-options-overlay-wrapper"
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9998,
                background: "rgba(0,0,0,0.2)",
              }}
              onClick={() => setShowOptions(false)}
            >
              <div
                style={{
                  position: "fixed",
                  top: overlayPosition.top,
                  left: overlayPosition.left,
                  width: overlayPosition.width,
                  zIndex: 9999,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {dropdownContent}
              </div>
            </div>,
            document.body
          )}
      </>
    )
  }

  const mainContent = (
    <div className={`burn-timer ${isUrgent ? "burn-timer--urgent" : ""}`}>
      <div className="burn-timer-left">
        <Fire
          weight="fill"
          className={`burn-icon ${isUrgent ? "burn-icon--urgent" : ""}`}
        />
        <div className="burn-timer-info">
          <span className="burn-label">Burns in</span>
          <span className="burn-countdown">{countdown}</span>
        </div>
      </div>

      {config.burnAt && (
        <div className="burn-progress-wrap">
          <div className="burn-progress-bar">
            <div
              className="burn-progress-fill"
              style={{ width: fillWidth }}
            />
          </div>
        </div>
      )}

      <div className="burn-timer-actions">
        <button
          ref={triggerRef}
          className="btn-ghost-sm"
          onClick={() => setShowOptions((v) => !v)}
          title="Change burn duration"
        >
          <Timer size={14} />
          <span>{config.burnDuration === "never" ? "Never" : config.burnDuration}</span>
        </button>

        {showOptions && !isMobile && (
          <div className="burn-options">
            {DURATIONS.map((d) => (
              <button
                key={d.value}
                onClick={async () => {
                  await onSetDuration(d.value)
                  setShowOptions(false)
                }}
                className={`burn-option ${config.burnDuration === d.value ? "burn-option--active" : ""}`}
              >
                {d.label}
              </button>
            ))}
            <div className="burn-options-divider" />
            <button
              onClick={async () => {
                setShowOptions(false)
                await onBurnNow()
              }}
              className="burn-option burn-option--nuke"
            >
              <Fire size={12} weight="fill" /> Burn Now
            </button>
          </div>
        )}
      </div>
    </div>
  )

  const dropdownContent = (
    <div className="burn-options burn-options--overlay">
      {DURATIONS.map((d) => (
        <button
          key={d.value}
          onClick={async () => {
            await onSetDuration(d.value)
            setShowOptions(false)
          }}
          className={`burn-option ${config.burnDuration === d.value ? "burn-option--active" : ""}`}
        >
          {d.label}
        </button>
      ))}
      <div className="burn-options-divider" />
      <button
        onClick={async () => {
          setShowOptions(false)
          await onBurnNow()
        }}
        className="burn-option burn-option--nuke"
      >
        <Fire size={12} weight="fill" /> Burn Now
      </button>
    </div>
  )

  return (
    <>
      {mainContent}
      {showOptions && isMobile && overlayPosition && typeof document !== "undefined" &&
        createPortal(
          <div
            className="burn-options-overlay-wrapper"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9998,
              background: "rgba(0,0,0,0.2)",
            }}
            onClick={() => setShowOptions(false)}
          >
            <div
              style={{
                position: "fixed",
                top: overlayPosition.top,
                left: overlayPosition.left,
                width: overlayPosition.width,
                zIndex: 9999,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {dropdownContent}
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
