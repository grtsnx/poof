/**
 * Poof — Inbox (server-side)
 * Reads inbound emails straight from Resend's receiving API. No webhook,
 * no Redis: Resend already holds every inbound email, so the client just
 * polls and we filter by recipient.
 *
 * Resend rate-limits per team, so the recent-email listing is cached
 * in-memory for a couple of seconds and shared by every poll that lands on
 * the same instance. Full email bodies are cached by ID.
 */

import { Resend } from "resend"
import { isOurDomain } from "./domains"

export interface InboxEmail {
  id: string
  from: string
  subject: string
  html: string
  text: string
  receivedAt: number
  attachments: { filename: string; mimeType: string; size: number; dataUrl: string }[]
}

interface ListedEmail {
  id: string
  to: string[]
  createdAt: number
  hasAttachments: boolean
}

/** Reuse a listing for this long before asking Resend again */
const LIST_CACHE_MS = 2000

/** Max listing pages (100 emails each) fetched to cover one `since` */
const MAX_PAGES = 5

/** Max full emails kept in the per-instance body cache */
const BODY_CACHE_SIZE = 200

let resendClient: Resend | null = null
function resend(): Resend {
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY)
  return resendClient
}

export class RateLimitedError extends Error {}

/** Resend timestamps may come as "2026-03-08 04:19:26.123+00" — normalize before parsing */
function parseTimestamp(value: string): number {
  const iso = value.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00")
  const ms = Date.parse(iso)
  return Number.isNaN(ms) ? Date.parse(value) : ms
}

/** "Name <a@b.com>" → "a@b.com" */
function bareAddress(recipient: string): string {
  const lower = recipient.toLowerCase().trim()
  return lower.match(/<([^>]+)>/)?.[1] ?? lower
}

function isRateLimit(error: { name?: string; statusCode?: number | null } | null): boolean {
  return error?.name === "rate_limit_exceeded" || error?.statusCode === 429
}

// ─── Recent listing (shared across polls) ────────────────────────

interface Listing {
  fetchedAt: number
  items: ListedEmail[]
  /** Oldest createdAt the listing is known to include (0 = everything) */
  coversSince: number
}

let listCache: Listing | null = null
let listInFlight: Promise<Listing> | null = null

async function fetchListing(since: number): Promise<Listing> {
  const items: ListedEmail[] = []
  let after: string | undefined
  let coversSince = Infinity

  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await resend().emails.receiving.list(
      after ? { limit: 100, after } : { limit: 100 }
    )
    if (error || !data) {
      if (isRateLimit(error)) throw new RateLimitedError()
      throw new Error(`Resend list failed: ${error?.message ?? "unknown error"}`)
    }

    for (const e of data.data) {
      const createdAt = parseTimestamp(e.created_at)
      items.push({
        id: e.id,
        to: (e.to ?? []).map(bareAddress),
        createdAt,
        hasAttachments: (e.attachments?.length ?? 0) > 0,
      })
      coversSince = Math.min(coversSince, createdAt)
    }

    // Listing is newest-first: stop once we've reached `since` or run out
    if (!data.has_more || coversSince <= since || !data.data.length) {
      if (!data.has_more) coversSince = 0
      break
    }
    after = data.data[data.data.length - 1].id
  }

  return { fetchedAt: Date.now(), items, coversSince }
}

async function getListing(since: number): Promise<ListedEmail[]> {
  const cached = listCache
  if (cached && Date.now() - cached.fetchedAt < LIST_CACHE_MS && cached.coversSince <= since) {
    return cached.items
  }

  // Collapse concurrent polls into one Resend call
  if (!listInFlight) {
    listInFlight = fetchListing(since)
      .then((result) => {
        listCache = result
        return result
      })
      .finally(() => {
        listInFlight = null
      })
  }
  return (await listInFlight).items
}

// ─── Full email bodies (cached by ID) ────────────────────────────

const bodyCache = new Map<string, InboxEmail>()

async function getFullEmail(listed: ListedEmail): Promise<InboxEmail> {
  const cached = bodyCache.get(listed.id)
  if (cached) return cached

  const { data: email, error } = await resend().emails.receiving.get(listed.id)
  if (error || !email) {
    if (isRateLimit(error)) throw new RateLimitedError()
    throw new Error(`Resend get failed: ${error?.message ?? "unknown error"}`)
  }

  const attachments: InboxEmail["attachments"] = []
  if (listed.hasAttachments) {
    const { data: list } = await resend().emails.receiving.attachments.list({ emailId: listed.id })
    for (const att of list?.data ?? []) {
      let dataUrl = ""
      if (att.download_url) {
        try {
          const res = await fetch(att.download_url)
          const buf = Buffer.from(await res.arrayBuffer())
          dataUrl = `data:${att.content_type};base64,${buf.toString("base64")}`
        } catch (e) {
          console.warn("Failed to fetch attachment", att.id, e)
        }
      }
      attachments.push({
        filename: att.filename ?? "attachment",
        mimeType: att.content_type ?? "application/octet-stream",
        size: att.size ?? 0,
        dataUrl,
      })
    }
  }

  const full: InboxEmail = {
    id: email.id,
    from: email.from ?? "unknown@sender.com",
    subject: email.subject ?? "(no subject)",
    html: email.html ?? "",
    text: email.text ?? "",
    receivedAt: listed.createdAt,
    attachments,
  }

  bodyCache.set(full.id, full)
  if (bodyCache.size > BODY_CACHE_SIZE) {
    bodyCache.delete(bodyCache.keys().next().value!)
  }
  return full
}

/** Emails addressed to `address` received at or after `since` (epoch ms), oldest first */
export async function getEmailsForAddress(address: string, since: number): Promise<InboxEmail[]> {
  const target = address.toLowerCase()
  if (!isOurDomain(target)) return []

  const listing = await getListing(since)
  const matches = listing
    .filter((e) => e.createdAt >= since && e.to.includes(target))
    .sort((a, b) => a.createdAt - b.createdAt)

  const emails: InboxEmail[] = []
  for (const m of matches) emails.push(await getFullEmail(m))
  return emails
}
