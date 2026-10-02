/**
 * GET /api/email/inbox/[address]?since=<epoch ms>
 * Returns emails received by `address` since the given time, read directly
 * from Resend. The client polls this every few seconds.
 *
 * Response: { emails, now } — `now` is server time; the client sends it back
 * (minus a small overlap) as the next `since` so clock skew can't drop mail.
 */

import { NextRequest, NextResponse } from "next/server"
import { getEmailsForAddress, RateLimitedError } from "@/lib/inbox"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params
  const normalizedAddress = decodeURIComponent(address).toLowerCase()

  const sinceParam = Number(req.nextUrl.searchParams.get("since"))
  const since = Number.isFinite(sinceParam) && sinceParam > 0 ? sinceParam : Date.now() - 60_000
  const now = Date.now()

  try {
    const emails = await getEmailsForAddress(normalizedAddress, since)
    return NextResponse.json({ emails, now }, { headers: { "Cache-Control": "no-store" } })
  } catch (e) {
    if (e instanceof RateLimitedError) {
      return NextResponse.json(
        { error: "Rate limited" },
        { status: 429, headers: { "Retry-After": "5" } }
      )
    }
    console.error("Inbox poll failed:", e)
    return NextResponse.json({ error: "Failed to fetch inbox" }, { status: 502 })
  }
}
