"use client"

/**
 * Inbox polling hook
 * Asks the server for new emails every few seconds. The server reads them
 * straight from Resend, so nothing is lost between polls — a missed poll just
 * picks the email up on the next one.
 */

import { useEffect, useRef } from "react"
import { RawIncomingEmail } from "./use-email"

/** Poll interval while the tab is visible */
const VISIBLE_INTERVAL_MS = 3000
/** Poll interval while the tab is in the background */
const HIDDEN_INTERVAL_MS = 15000
/** Back-off after a failed or rate-limited poll */
const ERROR_INTERVAL_MS = 10000
/** Re-check this far behind the last cursor in case Resend lists an email late */
const OVERLAP_MS = 30000

interface UseInboxPollOptions {
  address: string | null
  /** Epoch ms to start from (last saved cursor, or address creation time) */
  since: number | null
  onEmail: (email: RawIncomingEmail) => void | Promise<void>
  /** Called after each successful poll with the next cursor, to persist it */
  onCursor?: (cursor: number) => void
  onConnected?: () => void
  onDisconnected?: () => void
}

export function useInboxPoll({
  address,
  since,
  onEmail,
  onCursor,
  onConnected,
  onDisconnected,
}: UseInboxPollOptions) {
  // Keep latest callbacks in refs so the poll loop never restarts when they change
  const onEmailRef = useRef(onEmail)
  const onCursorRef = useRef(onCursor)
  const onConnectedRef = useRef(onConnected)
  const onDisconnectedRef = useRef(onDisconnected)
  const sinceRef = useRef(since)
  useEffect(() => {
    onEmailRef.current = onEmail
    onCursorRef.current = onCursor
    onConnectedRef.current = onConnected
    onDisconnectedRef.current = onDisconnected
    sinceRef.current = since
  })

  useEffect(() => {
    if (!address) return

    let stopped = false
    let timer: ReturnType<typeof setTimeout> | null = null
    let controller: AbortController | null = null
    let cursor = sinceRef.current ?? Date.now()
    // IDs already handed to onEmail this session (covers the overlap window)
    const seen = new Set<string>()

    const schedule = (delay: number) => {
      if (stopped) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(poll, delay)
    }

    const poll = async () => {
      if (stopped) return
      controller = new AbortController()
      try {
        const res = await fetch(
          `/api/email/inbox/${encodeURIComponent(address)}?since=${Math.max(0, cursor - OVERLAP_MS)}`,
          { cache: "no-store", signal: controller.signal }
        )
        if (!res.ok) throw new Error(`Poll failed: ${res.status}`)
        const body = (await res.json()) as { emails: RawIncomingEmail[]; now: number }
        if (stopped) return

        for (const email of body.emails) {
          if (seen.has(email.id)) continue
          seen.add(email.id)
          await onEmailRef.current(email)
        }

        cursor = body.now
        onCursorRef.current?.(cursor)
        onConnectedRef.current?.()
        schedule(document.hidden ? HIDDEN_INTERVAL_MS : VISIBLE_INTERVAL_MS)
      } catch {
        if (stopped) return
        onDisconnectedRef.current?.()
        schedule(ERROR_INTERVAL_MS)
      }
    }

    // Poll right away when the tab comes back to the foreground
    const onVisibility = () => {
      if (!document.hidden) schedule(0)
    }
    document.addEventListener("visibilitychange", onVisibility)

    poll()

    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
      controller?.abort()
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [address])
}
