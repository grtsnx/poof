"use client"

import { useState, useCallback } from "react"
import { useEmail } from "@/hooks/use-email"
import { useSSE } from "@/hooks/use-sse"
import { EmailAddressBar } from "@/components/email-address-bar"
import { BurnTimer } from "@/components/burn-timer"
import { Inbox } from "@/components/inbox"
import { EmailViewer } from "@/components/email-viewer"
import { StoredEmail } from "@/lib/db"
import { Tray, EnvelopeOpen, GithubLogo, ArrowRight } from "@phosphor-icons/react"

const GITHUB_URL = process.env.NEXT_PUBLIC_GITHUB_URL

function FlameLogo({ size = 18 }: { size?: number }) {
  const h = size
  const w = Math.round(size * 0.75)
  return (
    <svg width={w} height={h} viewBox="0 0 16 20" fill="none" aria-hidden>
      <path
        d="M8 1 C5 5 2 8 2 11.5 C2 15 4.5 18.5 8 18.5 C11.5 18.5 14 15 14 11.5 C14 8 11 5 8 1Z"
        fill="currentColor"
      />
      <path
        d="M8 6.5 C6.5 9 5.5 10.5 5.5 12.5 C5.5 14.5 6.5 16.5 8 16.5 C9.5 16.5 10.5 14.5 10.5 12.5 C10.5 10.5 9.5 9 8 6.5Z"
        fill="#ff5500"
        opacity="0.85"
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
    generateNewEmail,
    setBurnDuration,
    selectEmail,
    removeEmail,
    burnNow,
    addEmailFromSSE,
  } = useEmail()

  const [isConnected, setIsConnected] = useState(false)
  const [mobileTab, setMobileTab] = useState<"inbox" | "viewer">("inbox")

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

  return (
    <div className="app">
      <div className="app-noise" aria-hidden />

      <header className="app-header">
        <div className="header-inner">
          <div className="header-logo">
            <span className="logo-flame-wrap">
              <FlameLogo size={22} />
            </span>
            <span className="logo-text">Poof</span>
          </div>
          <nav className="header-nav">
          {unreadCount > 0 && (
            <span className="header-unread-badge">{unreadCount} new</span>
          )}
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
          <EmailAddressBar
            config={config}
            isLoading={isLoading}
            onGenerateNew={generateNewEmail}
          />
          <BurnTimer
            config={config}
            isBurned={isBurned}
            onSetDuration={setBurnDuration}
            onBurnNow={burnNow}
          />
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
            <Inbox
              emails={emails}
              selectedId={selectedEmail?.id ?? null}
              onSelect={handleSelect}
              onDelete={removeEmail}
              isConnected={isConnected}
            />
          </aside>
          <section className={`panel-viewer ${mobileTab === "inbox" ? "panel-mobile-hidden" : ""}`}>
            <EmailViewer email={selectedEmail} />
          </section>
        </main>
      )}

      <footer className="app-footer">
        <div className="footer-inner">
          <div className="footer-left">
            <span className="logo-flame-wrap footer-flame">
              <FlameLogo size={16} />
            </span>
            <span className="footer-brand-name">Poof</span>
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
