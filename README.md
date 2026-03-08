# Poof

A privacy-first disposable email service built with Next.js. Generate a temporary inbox, receive real emails in real-time, and burn everything when you're done — no accounts, no server-side storage.

## Features

- **Disposable inboxes** — Random address generated per device, no sign-up required
- **Real-time delivery** — Emails arrive instantly via Server-Sent Events (SSE)
- **Client-side encryption** — Email content is AES-GCM encrypted in the browser before being stored in IndexedDB
- **Auto-burn timer** — Inbox self-destructs after 5 minutes, 1 hour, 24 hours, or never
- **Burn on command** — Instantly wipe an address and all its emails
- **Address history** — Browse and search emails from past addresses; clear all history permanently
- **OTP & verify-link detection** — One-time codes and verification links are automatically flagged
- **Attachment support** — Attachments stored as encrypted data in IndexedDB
- **Zero server-side storage** — The server is a relay only; emails are never persisted on the backend
- **Dark / light theme**
- **Responsive** — Mobile-friendly two-tab layout (Inbox / Viewer)

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | HeroUI, Radix UI, shadcn/ui, Tailwind CSS v4 |
| Icons | Phosphor Icons |
| Email provider | [Resend](https://resend.com) (inbound webhooks) |
| Real-time | Server-Sent Events (SSE) |
| Local storage | IndexedDB via `idb` |
| Encryption | Web Crypto API — AES-GCM 256-bit |
| Language | TypeScript |

## How It Works

```
User opens app
  └─> Device config created in IndexedDB (email address + burn timer)
  └─> SSE connection opened to /api/email/stream/[address]

Sender sends email to anything@yourdomain.com
  └─> Resend receives it via inbound MX
  └─> Resend POSTs to /api/email/receive (webhook)
  └─> Server validates payload, broadcasts via SSE

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
- A [Resend](https://resend.com) account with a verified domain and inbound email enabled

### 1. Clone and install

```bash
git clone https://github.com/yourusername/poof.git
cd poof
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

| Variable | Description |
|---|---|
| `RESEND_API_KEY` | Your Resend API key |
| `NEXT_PUBLIC_EMAIL_DOMAIN` | Your verified domain (e.g. `yourdomain.com`) |
| `WEBHOOK_SECRET` | Optional random secret for webhook validation |
| `NEXT_PUBLIC_APP_URL` | Your deployed app URL |
| `NEXT_PUBLIC_GITHUB_URL` | Optional — shows a GitHub link in the header |

### 3. Configure Resend inbound

1. Go to **Resend → Domains → your domain → Inbound**
2. Add the MX record Resend provides
3. Set the webhook URL to `https://yourapp.com/api/email/receive`
4. Optionally set a webhook secret and add it to `WEBHOOK_SECRET`

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Local inbound emails:** Resend can't reach `localhost`. Use a tunnel like [ngrok](https://ngrok.com) and point the Resend webhook at your tunnel URL during development.

## Project Structure

```
app/
  api/
    email/
      receive/route.ts          # POST — Resend inbound webhook
      stream/[address]/route.ts # GET  — SSE stream per address
  layout.tsx
  page.tsx
  globals.css

components/
  email-address-bar.tsx         # Address display, copy, regenerate
  burn-timer.tsx                # Countdown timer + duration picker
  inbox.tsx                     # Email list
  email-viewer.tsx              # Email content renderer
  history-panel.tsx             # Past addresses + clear history
  otp-badge.tsx                 # OTP / verify-link highlight
  theme-toggle.tsx
  theme-provider.tsx

hooks/
  use-email.ts                  # Core state: config, emails, burn logic
  use-sse.ts                    # SSE connection management

lib/
  crypto.ts                     # AES-GCM encrypt / decrypt (Web Crypto)
  db.ts                         # IndexedDB schema + CRUD via idb
  domains.ts                    # Address generation
  email-utils.ts                # OTP extraction, link detection, burn progress
  sse-manager.ts                # Server-side SSE client registry
  utils.ts                      # Class name utilities
```

## API

### `POST /api/email/receive`

Resend inbound webhook. Validates the payload and broadcasts the email to any connected SSE clients for that address.

**Response:**
```json
{ "ok": true, "delivered": 1, "id": "uuid" }
```

### `GET /api/email/stream/[address]`

Opens a persistent SSE stream. Emits events when emails arrive for the given address. Sends a heartbeat comment every 25 seconds to keep the connection alive through proxies.

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
| Emails in transit (SSE) | In-memory server map | No (HTTPS in prod) |
| Emails at rest (server) | Nowhere | — |

The server never persists email content. The SSE manager holds an in-memory map of live connections only; emails are forwarded and discarded.

> **Multi-instance deployments:** The SSE manager uses a Node.js in-process `Map`. For multi-instance setups (serverless, multiple containers), replace it with a Redis pub/sub channel.

## Scripts

```bash
npm run dev       # Start dev server with Turbopack
npm run build     # Production build
npm run start     # Start production server
npm run lint      # ESLint
npm run format    # Prettier
npm run typecheck # TypeScript type check
```

## License

MIT
