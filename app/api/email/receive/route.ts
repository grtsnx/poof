/**
 * POST /api/email/receive
 * Resend inbound email webhook handler.
 * Webhook sends { type: "email.received", data: { email_id, ... } }; we fetch
 * full content via Resend API and broadcast to SSE clients.
 *
 * Setup: Webhooks → Add webhook → URL = this endpoint, event = email.received.
 * Env: WEBHOOK_SECRET or RESEND_WEBHOOK_SECRET, RESEND_API_KEY.
 */

import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { Webhook } from "svix"
import { broadcastToAddress } from "@/lib/sse-manager"
import { isOurDomain } from "@/lib/domains"

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  const secret = process.env.WEBHOOK_SECRET ?? process.env.RESEND_WEBHOOK_SECRET
  if (secret) {
    const id = req.headers.get("svix-id")
    const timestamp = req.headers.get("svix-timestamp")
    const signature = req.headers.get("svix-signature")
    if (!id || !timestamp || !signature) {
      return NextResponse.json(
        { error: "Missing Svix headers (svix-id, svix-timestamp, svix-signature)" },
        { status: 401 }
      )
    }
    try {
      const wh = new Webhook(secret)
      wh.verify(rawBody, { "svix-id": id, "svix-timestamp": timestamp, "svix-signature": signature })
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const body = JSON.parse(rawBody) as { type?: string; data?: { email_id?: string } }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 })
  }

  if (body.type !== "email.received" || !body.data?.email_id) {
    return NextResponse.json({ error: "Expected email.received with data.email_id" }, { status: 400 })
  }

  const emailId = body.data.email_id
  const resend = new Resend(process.env.RESEND_API_KEY)

  const { data: email, error: emailError } = await resend.emails.receiving.get(emailId)
  if (emailError || !email) {
    console.error("Resend get receiving email failed:", emailError)
    return NextResponse.json(
      { error: "Failed to fetch email content", details: emailError },
      { status: 502 }
    )
  }

  // Fetch attachment contents (download_url → base64 data URL)
  const attachments: { filename: string; mimeType: string; size: number; dataUrl: string }[] = []
  const { data: attachmentsList } = await resend.emails.receiving.attachments.list({ emailId })
  if (attachmentsList?.data?.length) {
    for (const att of attachmentsList.data) {
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

  const to: string[] = Array.isArray(email.to) ? email.to : [email.to].filter(Boolean)
  const from = email.from ?? "unknown@sender.com"
  const subject = email.subject ?? "(no subject)"
  const html = email.html ?? ""
  const text = email.text ?? ""
  const receivedAt = Date.now()
  const id = crypto.randomUUID()

  let delivered = 0
  for (const recipient of to) {
    const address = recipient.toLowerCase().split(/[<>]/)[1] ?? recipient.toLowerCase()
    if (!isOurDomain(address)) continue

    await broadcastToAddress(address, {
      type: "email",
      email: {
        id,
        from,
        subject,
        html,
        text,
        receivedAt,
        attachments,
      },
    })
    delivered++
  }

  return NextResponse.json({ ok: true, delivered, id })
}
