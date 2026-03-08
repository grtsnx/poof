"use client"

import { useState } from "react"
import { StoredEmail } from "@/lib/db"
import { formatRelativeTime, extractOTPs } from "@/lib/email-utils"
import { EnvelopeSimple, EnvelopeOpen, Trash, Key, Link, ClockCounterClockwise, FireSimple, Copy, Check } from "@phosphor-icons/react"

interface Props {
  emails: StoredEmail[]
  selectedId: string | null
  onSelect: (email: StoredEmail) => void
  onDelete: (id: string) => Promise<void>
  isConnected: boolean
  onOpenHistory: () => void
  onClearAllHistory: () => Promise<void>
  historyCount: number
  showDragHint?: boolean
}

export function Inbox({ emails, selectedId, onSelect, onDelete, isConnected, onOpenHistory, onClearAllHistory, historyCount, showDragHint = false }: Props) {
  if (emails.length === 0) {
    return (
      <div className="inbox-empty">
        <div className="inbox-empty-icon">
          <EnvelopeSimple size={40} weight="thin" />
        </div>
        <p className="inbox-empty-title">Nothing here yet.</p>
        <p className="inbox-empty-sub">
          {isConnected
            ? "Refreshing endlessly won't help. Trust us, we checked."
            : "Connecting to the mothership..."}
        </p>
        <div className={`inbox-status-dot ${isConnected ? "inbox-status-dot--live" : "inbox-status-dot--connecting"}`}>
          <span className={isConnected ? "status-live" : "status-connecting"}>
            {isConnected ? "● LIVE" : "◌ CONNECTING"}
          </span>
        </div>
        {showDragHint && (
          <div className="inbox-empty-drag-hint" aria-hidden>
            <span className="viewer-empty-drag-text">you can drag me</span>
            <svg
              className="viewer-empty-drag-arrow"
              viewBox="0 0 40 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 12 H30 M30 12 L24 6 M30 12 L24 18" />
            </svg>
          </div>
        )}
        {historyCount > 0 && (
          <div className="inbox-empty-history-actions">
            <button className="inbox-history-btn" onClick={onOpenHistory}>
              <ClockCounterClockwise size={13} />
              {historyCount} past address{historyCount !== 1 ? "es" : ""}
            </button>
            <span className="inbox-empty-sep">·</span>
            <button className="inbox-history-btn inbox-history-btn--clear" onClick={onClearAllHistory} title="Clear all history">
              <FireSimple weight="bold" size={12} />
              <span>Clear all</span>
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="inbox-list">
      <div className="inbox-header">
        <span className="inbox-count">{emails.length} message{emails.length !== 1 ? "s" : ""}</span>
        <div className="inbox-header-right">
          <span className={`inbox-live-badge ${isConnected ? "inbox-live-badge--on" : ""}`}>
            {isConnected ? "● LIVE" : "◌"}
          </span>
          <button className="inbox-history-btn" onClick={onOpenHistory} title="View past addresses">
            <ClockCounterClockwise size={13} />
            {historyCount > 0 ? historyCount : ""}
          </button>
        </div>
      </div>
      {emails.map((email) => (
        <div
          key={email.id}
          className={`inbox-item ${selectedId === email.id ? "inbox-item--selected" : ""} ${!email.read ? "inbox-item--unread" : ""}`}
          onClick={() => onSelect(email)}
        >
          <div className="inbox-item-icon">
            {email.read ? (
              <EnvelopeOpen size={16} weight="regular" />
            ) : (
              <EnvelopeSimple size={16} weight="fill" />
            )}
          </div>
          <div className="inbox-item-body">
            <div className="inbox-item-subject">{email.subject}</div>
            <div className="inbox-item-row">
              <span className="inbox-item-from">{formatFrom(email.from)}</span>
              <span className="inbox-item-time">{formatRelativeTime(email.receivedAt)}</span>
            </div>
            <div className="inbox-item-badges">
              {email.hasOtp && (
                <InboxOTPCopy email={email} />
              )}
              {email.hasVerifyLink && (
                <span className="inbox-badge inbox-badge--link">
                  <Link size={10} weight="bold" /> Verify
                </span>
              )}
            </div>
          </div>
          <button
            className="inbox-item-delete"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(email.id)
            }}
            title="Delete this email"
          >
            <Trash size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

function formatFrom(from: string): string {
  const nameMatch = from.match(/^([^<]+)</)
  if (nameMatch) return nameMatch[1].trim()
  const domain = from.split("@")[1]
  return domain ? domain.split(".")[0] : from
}

function InboxOTPCopy({ email }: { email: StoredEmail }) {
  const [copied, setCopied] = useState(false)
  const otps = extractOTPs(email.textContent || email.htmlContent || "")
  if (otps.length === 0) return null

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const text = otps.length === 1 ? otps[0] : otps.join(", ")

    const doCopy = () => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(doCopy).catch(() => {
        fallbackCopy(text)
        doCopy()
      })
    } else {
      fallbackCopy(text)
      doCopy()
    }
  }

  return (
    <button
      type="button"
      className={`inbox-badge inbox-badge--otp inbox-otp-copy${copied ? " inbox-otp-copy--copied" : ""}`}
      onClick={handleCopy}
      title={otps.length === 1 ? `Copy ${otps[0]}` : `Copy ${otps.length} codes`}
    >
      {copied ? (
        <>
          <Check size={10} weight="bold" className="inbox-otp-copy-icon" />
          <span className="inbox-otp-copy-label">Copied</span>
        </>
      ) : (
        <>
          <Key size={10} weight="fill" />
          <span className="inbox-otp-copy-code">{otps[0]}</span>
          <Copy size={10} className="inbox-otp-copy-icon" />
        </>
      )}
    </button>
  )
}

function fallbackCopy(text: string) {
  const ta = document.createElement("textarea")
  ta.value = text
  ta.style.position = "fixed"
  ta.style.opacity = "0"
  document.body.appendChild(ta)
  ta.select()
  try {
    document.execCommand("copy")
  } finally {
    document.body.removeChild(ta)
  }
}
