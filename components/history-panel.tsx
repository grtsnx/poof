"use client"

import { ArchivedAddress, StoredEmail } from "@/lib/db"
import { formatRelativeTime, formatFrom } from "@/lib/email-utils"
import { ClockCounterClockwise, Trash, ArrowLeft, EnvelopeSimple, FireSimple } from "@phosphor-icons/react"

interface Props {
  archivedAddresses: ArchivedAddress[]
  historyAddress: string | null
  historyEmails: StoredEmail[]
  selectedId: string | null
  isLoading?: boolean
  onViewAddress: (email: string) => Promise<void>
  onDeleteAddress: (email: string) => Promise<void>
  onSelectEmail: (email: StoredEmail) => void
  onDeleteEmail: (id: string) => Promise<void>
  onClearAllHistory: () => Promise<void>
  onBack: () => void
}

export function HistoryPanel({
  archivedAddresses,
  historyAddress,
  historyEmails,
  selectedId,
  isLoading = false,
  onViewAddress,
  onDeleteAddress,
  onSelectEmail,
  onDeleteEmail,
  onClearAllHistory,
  onBack,
}: Props) {
  if (isLoading) {
    return (
      <div className="history-empty">
        <ClockCounterClockwise size={36} weight="thin" className="animate-pulse" />
        <p className="history-empty-title">Loading history…</p>
        <button className="history-back-link" onClick={onBack}>
          <ArrowLeft size={13} /> Back to inbox
        </button>
      </div>
    )
  }

  if (archivedAddresses.length === 0) {
    return (
      <div className="history-empty">
        <ClockCounterClockwise size={36} weight="thin" />
        <p className="history-empty-title">No history yet.</p>
        <p className="history-empty-sub">Past addresses appear here when you generate a new one.</p>
        <button className="history-back-link" onClick={onBack}>
          <ArrowLeft size={13} /> Back to inbox
        </button>
      </div>
    )
  }

  // Viewing a specific past address
  if (historyAddress) {
    return (
      <div className="history-list">
        <div className="inbox-header">
          <button className="history-back-link" onClick={() => onViewAddress("")}>
            <ArrowLeft size={13} /> All addresses
          </button>
          <span className="history-address-label">{historyAddress}</span>
        </div>
        {historyEmails.length === 0 ? (
          <div className="history-address-empty">
            <EnvelopeSimple size={28} weight="thin" />
            <p>No emails for this address.</p>
          </div>
        ) : (
          historyEmails.map((email) => (
            <div
              key={email.id}
              className={`inbox-item ${selectedId === email.id ? "inbox-item--selected" : ""}`}
              onClick={() => onSelectEmail(email)}
            >
              <div className="inbox-item-icon">
                <EnvelopeSimple size={16} weight={email.read ? "regular" : "fill"} />
              </div>
              <div className="inbox-item-body">
                <div className="inbox-item-row">
                  <span className="inbox-item-from">{formatFrom(email.from)}</span>
                  <span className="inbox-item-time">{formatRelativeTime(email.receivedAt)}</span>
                </div>
                <div className="inbox-item-subject">{email.subject}</div>
              </div>
              <button
                className="inbox-item-delete"
                onClick={(e) => { e.stopPropagation(); onDeleteEmail(email.id) }}
                title="Delete"
              >
                <Trash size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    )
  }

  // Address list view
  return (
    <div className="history-list">
      <div className="inbox-header">
        <button className="history-back-link" onClick={onBack}>
          <ArrowLeft size={13} /> Back to inbox
        </button>
        <div className="history-header-right">
          <button
            className="btn-icon btn-icon--danger history-clear-btn"
            title="Permanently delete all history"
            onClick={onClearAllHistory}
          >
            <FireSimple weight="bold" size={13} />
            <span>Clear all</span>
          </button>
        </div>
      </div>
      {archivedAddresses.map((addr) => (
        <div
          key={addr.id}
          className="history-item"
          onClick={() => onViewAddress(addr.email)}
        >
          <div className="history-item-body">
            <span className="history-item-email">{addr.email}</span>
            <span className="history-item-meta">
              Archived {formatRelativeTime(addr.archivedAt)}
            </span>
          </div>
          <button
            className="inbox-item-delete"
            onClick={(e) => { e.stopPropagation(); onDeleteAddress(addr.email) }}
            title="Delete address and its emails"
          >
            <Trash size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

