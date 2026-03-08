"use client"

import { useState, useCallback, useEffect } from "react"
import { useEmail } from "@/hooks/use-email"
import { useSSE } from "@/hooks/use-sse"
import { EmailAddressBar } from "@/components/email-address-bar"
import { BurnTimer } from "@/components/burn-timer"
import { Inbox } from "@/components/inbox"
import { EmailViewer } from "@/components/email-viewer"
import { HistoryPanel } from "@/components/history-panel"
import { ThemeToggle } from "@/components/theme-toggle"
import { StoredEmail } from "@/lib/db"
import { getBurnProgress } from "@/lib/email-utils"
import { Tray, EnvelopeOpen, GithubLogo, ArrowRight } from "@phosphor-icons/react"

const GITHUB_URL = process.env.NEXT_PUBLIC_GITHUB_URL

function PoofLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      {/* Envelope body */}
      <rect x="2" y="6" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" fill="none" />
      {/* Flap chevron */}
      <path d="M2 7.5l10 7.5 10-7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {/* Flame rising from envelope top-center */}
      <path
        d="M12 2 C11 3.5 9.5 4.5 9.5 6 C9.5 7.4 10.6 8.2 12 8.2 C13.4 8.2 14.5 7.4 14.5 6 C14.5 4.5 13 3.5 12 2Z"
        fill="var(--logo-flame, #ff5500)"
        opacity="0.9"
      />
    </svg>
  )
}

export default function Home() {
  const {
    config,
    emails,
    selectedEmail,
    unreadCount,
    isLoading,
    isBurned,
    archivedAddresses,
    historyEmails,
    historyAddress,
    generateNewEmail,
    setBurnDuration,
    selectEmail,
    removeEmail,
    burnNow,
    addEmailFromSSE,
    viewHistoryAddress,
    removeArchivedAddress,
    clearHistoryView,
    clearAllHistory,
  } = useEmail()

  const [isConnected, setIsConnected] = useState(false)
  const [mobileTab, setMobileTab] = useState<"inbox" | "viewer">("inbox")
  const [showHistory, setShowHistory] = useState(false)
  const [burnProgress, setBurnProgress] = useState(0)

  useEffect(() => {
    if (!config?.burnAt) {
      setBurnProgress(0)
      return
    }
    const update = () => setBurnProgress(getBurnProgress(config.createdAt, config.burnAt!))
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [config?.burnAt, config?.createdAt])

  useSSE({
    address: config?.email ?? null,
    onEmail: addEmailFromSSE,
    onConnected: () => setIsConnected(true),
    onDisconnected: () => setIsConnected(false),
  })

  const handleSelect = useCallback(
    (email: StoredEmail) => {
      selectEmail(email)
      setMobileTab("viewer")
    },
    [selectEmail]
  )

  const handleHistorySelect = useCallback(
    (email: StoredEmail) => {
      selectEmail(email)
      setMobileTab("viewer")
    },
    [selectEmail]
  )

  const handleOpenHistory = useCallback(() => {
    setShowHistory(true)
    clearHistoryView()
  }, [clearHistoryView])

  const handleCloseHistory = useCallback(() => {
    setShowHistory(false)
    clearHistoryView()
  }, [clearHistoryView])

  const handleViewHistoryAddress = useCallback(
    async (email: string) => {
      if (!email) {
        clearHistoryView()
        return
      }
      await viewHistoryAddress(email)
    },
    [viewHistoryAddress, clearHistoryView]
  )

  return (
    <div className="app">
      <div className="app-noise" aria-hidden />

      <header className="app-header">
        <div className="header-inner">
          <div className="header-logo">
            <span className="logo-wrap">
              <PoofLogo size={22} />
            </span>
            <span className="logo-text">Poof</span>
          </div>
          <nav className="header-nav">
            {unreadCount > 0 && (
              <span className="header-unread-badge">{unreadCount} new</span>
            )}
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="hero-left">
          <h1 className="hero-title">
            Your email,<br />
            <em className="hero-accent">but it burns.</em>
          </h1>
          <p className="hero-sub">
            Spam-proof with zero regrets. Encrypted locally.
            <br />
            Self-destructs on command like your last relationship,
            <br />
            but <strong>on purpose.</strong>
          </p>
        </div>

        <div className="hero-right">
          <div
            className={`hero-email-box${config?.burnAt && config.burnAt - Date.now() < 5 * 60 * 1000 && !isBurned ? " hero-email-box--urgent" : ""}`}
            style={{
              ["--burn-remaining" as string]:
                config?.burnAt && !isBurned ? 1 - burnProgress : 0,
            }}
          >
            <div className="hero-email-box-inner">
              <EmailAddressBar
                config={config}
                isLoading={isLoading}
                onGenerateNew={generateNewEmail}
                unreadCount={unreadCount}
              />
              <BurnTimer
                config={config}
                isBurned={isBurned}
                onSetDuration={setBurnDuration}
                onBurnNow={burnNow}
              />
            </div>
          </div>
        </div>
      </section>

      {!isBurned && (
        <main className="main-panel">
          <div className="mobile-tabs">
            <button
              className={`mobile-tab ${mobileTab === "inbox" ? "mobile-tab--active" : ""}`}
              onClick={() => setMobileTab("inbox")}
            >
              <Tray size={15} />
              <span>Inbox</span>
              {unreadCount > 0 && (
                <span className="mobile-tab-badge">{unreadCount}</span>
              )}
            </button>
            <button
              className={`mobile-tab ${mobileTab === "viewer" ? "mobile-tab--active" : ""}`}
              onClick={() => setMobileTab("viewer")}
            >
              <EnvelopeOpen size={15} />
              <span>Email</span>
            </button>
          </div>

          <aside className={`panel-inbox ${mobileTab === "viewer" ? "panel-mobile-hidden" : ""}`}>
            {showHistory ? (
              <HistoryPanel
                archivedAddresses={archivedAddresses}
                historyAddress={historyAddress}
                historyEmails={historyEmails}
                selectedId={selectedEmail?.id ?? null}
                onViewAddress={handleViewHistoryAddress}
                onDeleteAddress={removeArchivedAddress}
                onSelectEmail={handleHistorySelect}
                onDeleteEmail={removeEmail}
                onClearAllHistory={clearAllHistory}
                onBack={handleCloseHistory}
              />
            ) : (
              <Inbox
                emails={emails}
                selectedId={selectedEmail?.id ?? null}
                onSelect={handleSelect}
                onDelete={removeEmail}
                isConnected={isConnected}
                onOpenHistory={handleOpenHistory}
                historyCount={archivedAddresses.length}
              />
            )}
          </aside>
          <section className={`panel-viewer ${mobileTab === "inbox" ? "panel-mobile-hidden" : ""}`}>
            <EmailViewer email={selectedEmail} onBack={() => setMobileTab("inbox")} />
          </section>
        </main>
      )}

      <footer className="app-footer">
        <div className="footer-inner">
          <div className="footer-left">
            <span className="logo-wrap footer-dim">
              <PoofLogo size={15} />
            </span>
            <span className="footer-brand-name">Poof</span>
            <span className="footer-sep">·</span>
            <span className="footer-legal">© {new Date().getFullYear()}</span>
            <span className="footer-sep">·</span>
            <p className="footer-legal">
              Nothing stored server-side. AES-GCM encrypted in your browser. Burns on command.
            </p>
          </div>
          {GITHUB_URL && (
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link"
            >
              <GithubLogo size={14} weight="fill" />
              <span>GitHub</span>
              <ArrowRight size={10} />
            </a>
          )}
        </div>
      </footer>
    </div>
  )
}
