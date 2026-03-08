"use client"

import { useState, useCallback, type ReactNode } from "react"
import { DeviceConfig } from "@/lib/db"
import { useIsMobile } from "@/hooks/use-is-mobile"
import { Copy, ArrowClockwise } from "@phosphor-icons/react"

interface Props {
  config: DeviceConfig | null
  isLoading: boolean
  onGenerateNew: () => Promise<void>
  unreadCount?: number
  isBurned?: boolean
  children?: ReactNode
}

export function EmailAddressBar({ config, isLoading, onGenerateNew, unreadCount = 0, isBurned = false, children }: Props) {
  const [copied, setCopied] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const isMobile = useIsMobile()
  const hideActions = isMobile && isBurned

  const copyEmail = useCallback(async () => {
    if (!config) return
    await navigator.clipboard.writeText(config.email)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [config])

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true)
    try {
      await onGenerateNew()
    } finally {
      setIsGenerating(false)
    }
  }, [onGenerateNew])

  if (isLoading || !config) {
    return (
      <div className="address-bar-skeleton">
        <div className="skeleton-line" />
      </div>
    )
  }

  const [username, domain] = config.email.split("@")

  return (
    <div className="address-bar-wrap">
      <div className="address-bar">
        <div className="address-display">
          <span className="address-display-email">
            <span className="address-username">{username}</span>
            <span className="address-at">@</span>
            <span className="address-domain">{domain}</span>
          </span>
          {hideActions && (
            <button
              onClick={handleGenerate}
              className="address-display-new-btn"
              title="Generate a new address"
              disabled={isGenerating}
              aria-label="Generate new email"
            >
              <ArrowClockwise weight="bold" size={18} className={isGenerating ? "spin" : ""} />
            </button>
          )}
        </div>

        {hideActions ? (
          <div className="address-bar-burned-mobile-extra">{children}</div>
        ) : (
        <div className="address-actions-row">
          {children}
          <div className="address-actions">
            <button
              onClick={copyEmail}
              className={`btn-icon ${copied ? "btn-icon--success" : ""}`}
              title={copied ? "Nommed!" : "Copy email"}
            >
              <Copy weight="bold" size={16} />
              <span className="btn-icon-label">{copied ? "Copied!" : "Copy"}</span>
              {unreadCount > 0 && (
                <span className="copy-unread-badge">{unreadCount}</span>
              )}
            </button>

            <button
              onClick={handleGenerate}
              className="btn-icon btn-icon--danger"
              title="Generate a new address (burns current one)"
              disabled={isGenerating}
            >
              <ArrowClockwise weight="bold" size={16} className={isGenerating ? "spin" : ""} />
              <span className="btn-icon-label">{isGenerating ? "Cooking..." : isMobile ? "New" : "New Email"}</span>
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  )
}
