"use client"

import { useState, useMemo } from "react"
import { StoredEmail } from "@/lib/db"
import { extractOTPs, extractVerifyLinks, createSandboxedIframeContent } from "@/lib/email-utils"
import { OTPBadge } from "./otp-badge"
import { formatRelativeTime } from "@/lib/email-utils"
import { ArrowSquareOut, Paperclip, Eye, Code, ArrowLeft } from "@phosphor-icons/react"

interface Props {
  email: StoredEmail | null
  onBack?: () => void
}

export function EmailViewer({ email, onBack }: Props) {
  const [viewMode, setViewMode] = useState<"rendered" | "plain">("rendered")
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<string | null>(null)

  const otps = useMemo(() => (email ? extractOTPs(email.textContent || email.htmlContent) : []), [email])
  const verifyLinks = useMemo(() => (email ? extractVerifyLinks(email.htmlContent) : []), [email])
  const iframeContent = useMemo(
    () => (email?.htmlContent ? createSandboxedIframeContent(email.htmlContent) : ""),
    [email]
  )

  const handleOneClickVerify = async (url: string) => {
    setVerifying(true)
    setVerifyResult(null)
    try {
      window.open(url, "_blank", "noopener,noreferrer")
      setVerifyResult("Opened in a new tab. Your account should be verified now. Congrats, you exist.")
    } catch {
      setVerifyResult("Failed to open link. The internet is broken again.")
    } finally {
      setVerifying(false)
    }
  }

  if (!email) {
    return (
      <div className="viewer-empty">
        <div className="viewer-empty-art">
          {`╔══════════════╗\n║  SELECT AN   ║\n║    EMAIL     ║\n╚══════════════╝`}
        </div>
        <p className="viewer-empty-text">
          Pick something from the inbox. We&apos;ll wait.
        </p>
      </div>
    )
  }

  return (
    <div className="viewer">
      <div className="viewer-header">
        <div className="viewer-meta">
          {onBack && (
            <button className="viewer-back-btn" onClick={onBack} title="Back to inbox">
              <ArrowLeft size={15} weight="bold" />
              <span>Inbox</span>
            </button>
          )}
          <h2 className="viewer-subject">{email.subject}</h2>
          <div className="viewer-details">
            <span className="viewer-from">
              <span className="viewer-label">From:</span> {email.from}
            </span>
            <span className="viewer-time">{formatRelativeTime(email.receivedAt)}</span>
          </div>
        </div>
        <div className="viewer-controls">
          <button
            className={`view-toggle ${viewMode === "rendered" ? "view-toggle--active" : ""}`}
            onClick={() => setViewMode("rendered")}
            title="Rendered HTML"
          >
            <Eye size={14} />
          </button>
          <button
            className={`view-toggle ${viewMode === "plain" ? "view-toggle--active" : ""}`}
            onClick={() => setViewMode("plain")}
            title="Plain text"
          >
            <Code size={14} />
          </button>
        </div>
      </div>

      {/* OTP Badge */}
      <OTPBadge codes={otps} />

      {/* One-Click Verify Buttons */}
      {verifyLinks.length > 0 && (
        <div className="verify-links">
          {verifyLinks.map((link, i) => (
            <button
              key={i}
              className="verify-btn"
              onClick={() => handleOneClickVerify(link.url)}
              disabled={verifying}
            >
              <ArrowSquareOut size={14} weight="bold" />
              {verifying ? "Opening..." : link.label || "One-Click Verify"}
            </button>
          ))}
          {verifyResult && (
            <p className="verify-result">{verifyResult}</p>
          )}
        </div>
      )}

      {/* Email Body */}
      <div className="viewer-body">
        {viewMode === "rendered" && iframeContent ? (
          <iframe
            srcDoc={iframeContent}
            sandbox="allow-popups allow-popups-to-escape-sandbox"
            className="viewer-iframe"
            title="Email content"
          />
        ) : (
          <pre className="viewer-plain">{email.textContent || "No plain text version. Fancy."}</pre>
        )}
      </div>

      {/* Attachments */}
      {email.attachments.length > 0 && (
        <div className="viewer-attachments">
          <p className="attachments-label">
            <Paperclip size={14} /> {email.attachments.length} attachment{email.attachments.length !== 1 ? "s" : ""}
          </p>
          <div className="attachments-list">
            {email.attachments.map((att) => (
              <AttachmentItem key={att.id} attachment={att} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function AttachmentItem({ attachment }: { attachment: StoredEmail["attachments"][number] }) {
  const [showPreview, setShowPreview] = useState(false)
  const isImage = attachment.mimeType.startsWith("image/")
  const isPdf = attachment.mimeType === "application/pdf"
  const canPreview = isImage || isPdf

  const formatBytes = (b: number) => {
    if (b < 1024) return `${b} B`
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
    return `${(b / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <div className="attachment-item">
      <div className="attachment-info">
        <span className="attachment-name">{attachment.filename}</span>
        <span className="attachment-size">{formatBytes(attachment.size)}</span>
      </div>
      {canPreview && (
        <button className="btn-ghost-sm" onClick={() => setShowPreview((v) => !v)}>
          <Eye size={12} /> {showPreview ? "Hide" : "Preview"}
        </button>
      )}
      {showPreview && attachment.dataUrl && (
        <div className="attachment-preview">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={attachment.dataUrl} alt={attachment.filename} className="attachment-img" />
          ) : (
            <iframe
              src={attachment.dataUrl}
              sandbox=""
              className="attachment-pdf"
              title={attachment.filename}
            />
          )}
        </div>
      )}
    </div>
  )
}
