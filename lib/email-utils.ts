/**
 * FLARE Email Utilities
 * OTP extraction, link finding, and other dark arts.
 */

/** Extract 6-digit OTP codes from email text/HTML */
export function extractOTPs(content: string): string[] {
  const found = new Set<string>()

  // Match plain 6-digit codes
  const plain = content.matchAll(/\b(\d{6})\b(?!\s*[-/]\s*\d)/g)
  for (const m of plain) found.add(m[1])

  // Match labelled codes: "code: XXXXXX"
  const labelled = content.matchAll(/(?:otp|pin|code|token|passcode|verification)[:\s]+(\d{4,8})/gi)
  for (const m of labelled) found.add(m[1])

  // Spaced format "123 456"
  const spaced = content.matchAll(/(\d{3})\s(\d{3})\b/g)
  for (const m of spaced) found.add(`${m[1]}${m[2]}`)

  return Array.from(found).filter((c) => /^\d{4,8}$/.test(c))
}

export interface VerifyLink {
  url: string
  label: string
}

/** Extract verification/confirmation links from HTML */
export function extractVerifyLinks(html: string): VerifyLink[] {
  const verifyKeywords = [
    "verify", "confirm", "activate", "validate", "click here",
    "complete", "authorize", "approve",
  ]

  const links: VerifyLink[] = []
  const matches = html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)

  for (const match of matches) {
    const url = match[1]
    const label = match[2].replace(/<[^>]+>/g, "").trim().toLowerCase()

    if (
      url.startsWith("http") &&
      verifyKeywords.some((kw) => label.includes(kw) || url.toLowerCase().includes(kw))
    ) {
      links.push({ url, label: match[2].replace(/<[^>]+>/g, "").trim() })
    }
  }

  return links
}

/** Sanitize HTML for safe rendering in a sandboxed iframe */
export function createSandboxedIframeContent(html: string): string {
  const safe = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/on\w+\s*=\s*[^\s>]*/gi, "")
    .replace(/javascript:/gi, "about:blank#")

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <base target="_blank">
  <style>
    * { box-sizing: border-box; }
    html, body { width: 100%; max-width: 100%; margin: 0; padding: 16px; overflow-x: auto; font-family: system-ui, sans-serif; color: #1a1a1a; background: #fff; line-height: 1.6; }
    table { max-width: 100% !important; }
    .wrapper { width: 100% !important; max-width: 100% !important; }
    img { max-width: 100%; height: auto; }
    a { color: #5b8af5; }
  </style>
</head>
<body>${safe}</body>
</html>`
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export function formatCountdown(burnAt: number): string {
  const remaining = burnAt - Date.now()
  if (remaining <= 0) return "BURNED"

  const totalSeconds = Math.floor(remaining / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60

  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export function getBurnProgress(createdAt: number, burnAt: number): number {
  const total = burnAt - createdAt
  const elapsed = Date.now() - createdAt
  return Math.min(1, Math.max(0, elapsed / total))
}

export function formatFrom(from: string): string {
  const nameMatch = from.match(/^([^<]+)</)
  if (nameMatch) return nameMatch[1].trim()
  const domain = from.split("@")[1]
  return domain ? domain.split(".")[0] : from
}
