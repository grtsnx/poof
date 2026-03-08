"use client"

import { useState, useEffect } from "react"
import { DeviceConfig } from "@/lib/db"
import { BurnDuration } from "@/hooks/use-email"
import { formatCountdown, getBurnProgress } from "@/lib/email-utils"
import { Fire, Timer } from "@phosphor-icons/react"

interface Props {
  config: DeviceConfig | null
  isBurned: boolean
  onSetDuration: (d: BurnDuration) => Promise<void>
  onBurnNow: () => Promise<void>
}

const DURATIONS: { label: string; value: BurnDuration; ms: number | null }[] = [
  { label: "5 min", value: "5min", ms: 5 * 60 * 1000 },
  { label: "1 hour", value: "1hour", ms: 60 * 60 * 1000 },
  { label: "24 hours", value: "24hours", ms: 24 * 60 * 60 * 1000 },
  { label: "∞  Never (we judge you)", value: "never", ms: null },
]

export function BurnTimer({ config, isBurned, onSetDuration, onBurnNow }: Props) {
  const [countdown, setCountdown] = useState("")
  const [progress, setProgress] = useState(0)
  const [showOptions, setShowOptions] = useState(false)

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

  if (isBurned) {
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

  return (
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
          className="btn-ghost-sm"
          onClick={() => setShowOptions((v) => !v)}
          title="Change burn duration"
        >
          <Timer size={14} />
          <span>{config.burnDuration === "never" ? "Never" : config.burnDuration}</span>
        </button>

        {showOptions && (
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
}
