/**
 * GET /api/email/stream/[address]
 * Server-Sent Events endpoint for real-time email delivery.
 * Each client subscribes to a Redis channel so emails arrive regardless
 * of which server instance handles the inbound webhook.
 *
 * Vercel serverless has a 300s max duration; we close the stream before that
 * so the client reconnects seamlessly (useSSE already reconnects on close).
 */

import { NextRequest } from "next/server"
import { createSubscriber, emailChannel } from "@/lib/redis"

/** Close connection before Vercel's 300s timeout so client can reconnect. */
const MAX_STREAM_SECONDS = 240

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 300

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params
  const normalizedAddress = decodeURIComponent(address).toLowerCase()
  const channel = emailChannel(normalizedAddress)

  const subscriber = createSubscriber()
  await subscriber.subscribe(channel)

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder()

      // Send initial keepalive comment
      controller.enqueue(encoder.encode(": connected\n\n"))

      // Forward Redis messages to the SSE client
      subscriber.on("message", (_channel, message) => {
        try {
          controller.enqueue(encoder.encode(`data: ${message}\n\n`))
        } catch {
          // Client already disconnected
        }
      })

      // Heartbeat every 25s to keep connection alive through proxies
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"))
        } catch {
          clearInterval(heartbeat)
        }
      }, 25000)

      // Close before Vercel 300s timeout; client will reconnect via useSSE
      const maxTimer = setTimeout(() => {
        clearInterval(heartbeat)
        subscriber.unsubscribe(channel).then(() => subscriber.quit()).catch(() => {})
        try {
          controller.enqueue(encoder.encode(": reconnect\n\n"))
          controller.close()
        } catch {
          // Already closed
        }
      }, MAX_STREAM_SECONDS * 1000)

      // Cleanup on client disconnect
      req.signal.addEventListener("abort", () => {
        clearTimeout(maxTimer)
        clearInterval(heartbeat)
        subscriber.unsubscribe(channel).then(() => subscriber.quit()).catch(() => {})
        try {
          controller.close()
        } catch {
          // Already closed
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
