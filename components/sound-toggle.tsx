"use client"

import { useState, useEffect, useRef } from "react"
import { SpeakerHigh, SpeakerSlash, CaretDown } from "@phosphor-icons/react"
import { playSoundStyle } from "@/hooks/use-new-email-sound"

const STORAGE_KEY = "poof-sound-enabled"
const STORAGE_KEY_STYLE = "poof-sound-style"

export type SoundStyle = 1 | 2 | 3 | 4

function getStoredEnabled(): boolean {
  if (typeof window === "undefined") return true
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === null ? true : v === "true"
  } catch {
    return true
  }
}

function getStoredStyle(): SoundStyle {
  if (typeof window === "undefined") return 1
  try {
    const v = localStorage.getItem(STORAGE_KEY_STYLE)
    const n = v ? parseInt(v, 10) : 1
    if (n >= 1 && n <= 4) return n as SoundStyle
    return 1
  } catch {
    return 1
  }
}

export function isSoundEnabled(): boolean {
  return getStoredEnabled()
}

export function getSoundStyle(): SoundStyle {
  return getStoredStyle()
}

const STYLE_LABELS: Record<SoundStyle, string> = {
  1: "Classic",
  2: "Chime",
  3: "Pulse",
  4: "Digital",
}

export function SoundToggle() {
  const [enabled, setEnabled] = useState(true)
  const [style, setStyle] = useState<SoundStyle>(1)
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setEnabled(getStoredEnabled())
    setStyle(getStoredStyle())
  }, [])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("click", close)
    return () => document.removeEventListener("click", close)
  }, [open])

  const setMuted = (mute: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(!mute))
    } catch {}
    setEnabled(!mute)
  }

  const setStyleAndStore = (s: SoundStyle) => {
    try {
      localStorage.setItem(STORAGE_KEY_STYLE, String(s))
    } catch {}
    setStyle(s)
  }

  return (
    <div className="sound-toggle-wrap" ref={panelRef}>
      <button
        type="button"
        className="sound-toggle theme-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-label={enabled ? "Sound on (open menu)" : "Sound off (open menu)"}
        title={
          enabled
            ? `Sound: ${STYLE_LABELS[style]} (click to change)`
            : "Sound off (click to change)"
        }
      >
        {enabled ? (
          <SpeakerHigh size={18} weight="fill" />
        ) : (
          <SpeakerSlash size={18} weight="fill" />
        )}
        <CaretDown size={12} weight="bold" className="sound-toggle-caret" />
      </button>

      {open && (
        <div className="sound-toggle-panel">
          <button
            type="button"
            className={`sound-toggle-option ${!enabled ? "sound-toggle-option--active" : ""}`}
            onClick={() => {
              setMuted(true)
              setOpen(false)
            }}
          >
            <SpeakerSlash size={16} weight="fill" />
            Mute
          </button>
          {( [1, 2, 3, 4] as const ).map((n) => (
            <button
              key={n}
              type="button"
              className={`sound-toggle-option ${enabled && style === n ? "sound-toggle-option--active" : ""}`}
              onClick={() => {
                playSoundStyle(n)
                setMuted(false)
                setStyleAndStore(n)
                setOpen(false)
              }}
            >
              {STYLE_LABELS[n]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
