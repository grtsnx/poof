# Poof

<p align="center">
  <img src="./public/favicon.svg" alt="Poof logo" width="80" height="80" />
</p>

<p align="center">
  <strong>Your email, but it burns.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-blue?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-4-38bdf8?style=flat-square&logo=tailwindcss" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Privacy--first-encrypted-green?style=flat-square" alt="Privacy-first" />
  <img src="https://img.shields.io/badge/Zero%20server%20storage-IndexedDB-orange?style=flat-square" alt="Zero server storage" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="License MIT" />
</p>

---

A privacy-first disposable email service built with Next.js. Generate a temporary inbox, receive real emails in real-time, and burn everything when you're done — no accounts, no server-side storage.

## Features

- **Disposable inboxes** — Random address generated per device, no sign-up required
- **Real-time delivery** — Emails arrive instantly via Server-Sent Events (SSE) backed by Redis pub/sub
- **Client-side encryption** — Email content is AES-GCM encrypted in the browser before being stored in IndexedDB
- **Auto-burn timer** — Inbox self-destructs after 5 minutes, 1 hour, 24 hours, or never
- **Burn on command** — Instantly wipe an address and all its emails
- **Address history** — Browse emails from past addresses; clear all history permanently
- **OTP & verify-link detection** — One-time codes and verification links are automatically flagged
- **Attachment support** — Attachments stored as encrypted data in IndexedDB
- **Zero server-side storage** — The server is a relay only; emails are never persisted on the backend
- **Dark / light theme**
- **Responsive** — Mobile-friendly layout: email on one line, compact burn timer (flame + countdown + duration) with Copy/New as icon-only; rounded email box with draining border

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | HeroUI, Tailwind CSS v4 |
| Icons | Phosphor Icons |
| Email provider | [Resend](https://resend.com) (inbound webhooks) |
| Real-time | Server-Sent Events (SSE) + Redis pub/sub (`ioredis`) |
| Local storage | IndexedDB via `idb` |
| Encryption | Web Crypto API — AES-GCM 256-bit |
| Language | TypeScript |

## How It Works

```
User opens app
  └─> Device config created in IndexedDB (email address + burn timer)
  └─> SSE connection opened to /api/email/stream/[address]
  └─> Stream handler subscribes to Redis channel poof:email:[address]

Sender sends email to anything@yourdomain.com
  └─> Resend receives it via inbound MX
  └─> Resend POSTs to /api/email/receive (webhook)
  └─> Server validates payload
  └─> Publishes to Redis channel poof:email:[address]
  └─> All subscribed SSE streams forward the event to their clients

Browser receives SSE event
  └─> Email content encrypted with AES-GCM device key
  └─> Stored in IndexedDB
  └─> UI updates instantly

User burns the inbox
  └─> All emails deleted from IndexedDB
  └─> Device config wiped
  └─> New address generated on next visit
```

## Getting Started

### Prerequisites

- Node.js 18+
- A Redis instance (local, [Upstash](https://upstash.com), Railway, etc.)
- A [Resend](https://resend.com) account with a verified domain and inbound email enabled

### 1. Clone and install

```bash
git clone https://github.com/yourusername/poof.git
cd poof
pnpm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `RESEND_API_KEY` | Yes | Your Resend API key |
| `NEXT_PUBLIC_EMAIL_DOMAIN` | Yes | Your verified domain (e.g. `yourdomain.com`) |
| `REDIS_URL` | Yes | Redis connection URL (e.g. `redis://localhost:6379`) |
| `WEBHOOK_SECRET` | No | Random secret for webhook request validation |
| `NEXT_PUBLIC_APP_URL` | No | Your deployed app URL (use an ngrok URL for local inbound) |
| `NEXT_PUBLIC_GITHUB_URL` | No | If set, shows a GitHub link in the footer |

### 3. Start Redis

For local development:

```bash
# macOS
brew install redis && brew services start redis

# Docker
docker run -p 6379:6379 redis:alpine
```

For production, use a hosted Redis service such as [Upstash](https://upstash.com) (free tier available) and set `REDIS_URL` to the connection string they provide.

### 4. Configure Resend inbound

1. Go to **Resend → Domains → your domain → Inbound**
2. Add the MX record Resend provides
3. Set the **webhook URL** to your app base URL + `/api/email/receive`:
   ```text
   https://yourapp.com/api/email/receive
   ```
   For local development with ngrok, use your tunnel URL:
   ```text
   https://your-subdomain.ngrok-free.app/api/email/receive
   ```
4. To verify webhook signatures (recommended in production), copy the **signing secret** from Resend’s webhook settings (it starts with `whsec_`) into `WEBHOOK_SECRET` or `RESEND_WEBHOOK_SECRET`. Leave empty to skip verification (e.g. for local testing).

### 5. Run locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Local inbound emails:** Resend can't reach `localhost`. Use a tunnel like [ngrok](https://ngrok.com) and set `NEXT_PUBLIC_APP_URL` to your tunnel URL; point the Resend webhook at `https://your-ngrok-url.ngrok-free.app/api/email/receive` during development.

## Project Structure

```
app/
  api/
    email/
      receive/route.ts          # POST — Resend inbound webhook → publishes to Redis
      stream/[address]/route.ts # GET  — SSE stream; subscribes to Redis channel
      generate/route.ts         # POST — optional server-side address generation
  layout.tsx
  page.tsx
  globals.css

components/
  email-address-bar.tsx         # Address display, copy, regenerate (icon-only on mobile)
  burn-timer.tsx                # Countdown + duration picker; compact row on mobile
  inbox.tsx                     # Email list
  email-viewer.tsx              # Email content renderer
  history-panel.tsx             # Past addresses + clear all history
  theme-toggle.tsx
  theme-provider.tsx
  sound-toggle.tsx              # Optional new-email sound
  favicon-badge.tsx             # Unread count in favicon

hooks/
  use-email.ts                  # Core state: config, emails, burn logic, history
  use-sse.ts                    # SSE connection management
  use-is-mobile.ts              # Viewport ≤640px for responsive layout
  use-new-email-sound.ts        # Optional sound on new email

lib/
  redis.ts                      # ioredis singleton publisher + subscriber factory
  sse-manager.ts                # broadcastToAddress — publishes via Redis
  crypto.ts                     # AES-GCM encrypt / decrypt (Web Crypto)
  db.ts                         # IndexedDB schema + CRUD via idb
  domains.ts                    # Address generation
  email-utils.ts                # OTP extraction, link detection, burn progress
  utils.ts                      # Class name utilities
```

## API

### `POST /api/email/receive`

Resend inbound webhook. **URL:** `https://<your-app-url>/api/email/receive`

Validates the payload and publishes the email to the Redis channel for the recipient address. All connected SSE streams subscribed to that channel receive the event.

**Response:**
```json
{ "ok": true, "delivered": 1, "id": "uuid" }
```

### `GET /api/email/stream/[address]`

Opens a persistent SSE stream. Subscribes to the Redis channel `poof:email:[address]` and forwards any published messages to the client. Sends a heartbeat comment every 25 seconds to keep the connection alive through proxies. Unsubscribes and closes the Redis connection on client disconnect.

**Event payload:**
```json
{
  "type": "email",
  "email": {
    "id": "uuid",
    "from": "sender@example.com",
    "subject": "Your OTP",
    "html": "<p>Your code is 123456</p>",
    "text": "Your code is 123456",
    "receivedAt": 1712345678901,
    "attachments": []
  }
}
```

## Privacy Model

| Data | Where stored | Encrypted |
|---|---|---|
| Email content (HTML / text) | IndexedDB (browser) | Yes — AES-GCM 256-bit |
| Attachments | IndexedDB (browser) | Yes — AES-GCM 256-bit |
| Device config (address, timer) | IndexedDB (browser) | No |
| Encryption key | localStorage | No (base64 raw key) |
| Emails in transit (Redis → SSE) | Redis pub/sub (in-flight only) | No (use TLS in prod) |
| Emails at rest (server) | Nowhere | — |

The server never persists email content. Redis is used solely as a pub/sub message bus — messages are delivered to subscribers and immediately discarded.

## Scripts

```bash
pnpm dev       # Start dev server with Turbopack (suppresses Node deprecation warnings)
pnpm build     # Production build
pnpm start     # Start production server
pnpm lint      # ESLint
pnpm format    # Prettier
pnpm typecheck # TypeScript type check
```

If you see a `DEP0169 url.parse()` deprecation warning, it comes from a dependency (e.g. Next.js or a transitive package). The dev script sets `NODE_OPTIONS=--no-deprecation` to hide it. To show it again (e.g. to trace the source), run `node --trace-deprecation ./node_modules/.bin/next dev --turbopack`.

**Vercel:** The SSE stream route (`/api/email/stream/[address]`) closes the connection after 4 minutes so it never hits Vercel’s 300s serverless limit; the client reconnects automatically. To suppress the DEP0169 warning on Vercel, set the environment variable `NODE_OPTIONS` = `--no-deprecation` in your project’s Environment Variables (Settings → Environment Variables).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and pull request guidelines. This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).

## License

MIT — see [LICENSE](LICENSE).
