# Poof — Disposable Email, Self-Destructing

**Poof** is a privacy-first, disposable email service built with Next.js. Generate a temporary inbox, receive real emails in real-time, and burn the whole thing when you're done — no accounts, no servers storing your data, no regrets.

> *"Your email, but it burns."*

---

## Features

- **Instant disposable inboxes** — A random food-themed address (e.g. `crispytaco4821@yourdomain.com`) is generated per device with no sign-up required.
- **Real-time delivery** — Emails arrive instantly via Server-Sent Events (SSE).
- **Client-side AES-GCM encryption** — Email content is encrypted in your browser with a device-specific key before being stored in IndexedDB. Nothing readable is persisted.
- **Auto-burn timer** — Set an inbox to self-destruct after 10 minutes, 1 hour, 24 hours, or never. Default is 1 hour.
- **Burn on command** — Instantly wipe your address and all its emails with one click.
- **OTP & verify-link detection** — Emails containing one-time codes or verification links are automatically flagged.
- **Attachment support** — Attachments are stored as encrypted base64 data URLs in IndexedDB.
- **Zero server-side storage** — The server acts only as a relay. Emails are never stored on the backend.
- **Responsive** — Mobile-friendly two-tab layout (Inbox / Email viewer).
- **Dark/light theme** — Via `next-themes`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | HeroUI (beta), Radix UI, shadcn/ui, Tailwind CSS v4 |
| Icons | Phosphor Icons |
| Email provider | [Resend](https://resend.com) (inbound webhooks) |
| Real-time | Server-Sent Events (SSE) |
| Local storage | IndexedDB via `idb` |
| Encryption | Web Crypto API — AES-GCM 256-bit |
| Language | TypeScript |
| Package manager | pnpm |

---

## How It Works

```
User opens app
  └─> Device config created in IndexedDB (email address + burn timer)
  └─> SSE connection opened to /api/email/stream/[address]

Sender sends email to yourname@yourdomain.com
  └─> Resend receives it via inbound MX
  └─> Resend POSTs to /api/email/receive (webhook)
  └─> Server validates, extracts payload, broadcasts via SSE

Browser receives SSE event
  └─> Email content encrypted with AES-GCM device key
  └─> Stored in IndexedDB
  └─> UI updates in real-time

User burns the inbox
  └─> All emails deleted from IndexedDB
  └─> Device config wiped
  └─> New address generated on next visit
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- A [Resend](https://resend.com) account with a verified domain and inbound email configured

### 1. Clone & install

```bash
git clone https://github.com/yourusername/poof.git
cd poof
pnpm install
```

### 2. Configure environment

Copy the example env file and fill in your values:

```bash
cp .env.local.example .env.local
```

```env
# Resend API key (https://resend.com/api-keys)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx

# Your verified domain in Resend
NEXT_PUBLIC_EMAIL_DOMAIN=yourdomain.com

# Optional: webhook secret for request validation
WEBHOOK_SECRET=your-random-secret

# Your deployed app URL
NEXT_PUBLIC_APP_URL=https://yourapp.com

# Optional: shows a GitHub button in the footer
NEXT_PUBLIC_GITHUB_URL=https://github.com/yourusername/yourrepo
```

### 3. Configure Resend inbound

1. Go to **Resend → Domains → your domain → Inbound**.
2. Add an **MX record** pointing to Resend's inbound server (follow their docs).
3. Set the **Webhook URL** to: `https://yourapp.com/api/email/receive`
4. Optionally set a webhook secret and add the same value to `WEBHOOK_SECRET`.

### 4. Run locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Note:** Inbound emails won't arrive in local dev unless you expose your local server (e.g. via `ngrok`) and point the Resend webhook at the tunnel URL.

---

## Project Structure

```
app/
  api/
    email/
      generate/route.ts   # POST — generate a new email address
      receive/route.ts    # POST — Resend inbound webhook
      stream/[address]/
        route.ts          # GET  — SSE stream per address
  layout.tsx
  page.tsx                # Main UI
  globals.css

components/
  email-address-bar.tsx   # Address display + copy + regenerate
  burn-timer.tsx          # Timer countdown + duration picker
  inbox.tsx               # Email list
  email-viewer.tsx        # Email content renderer
  otp-badge.tsx           # OTP highlight badge
  theme-provider.tsx

hooks/
  use-email.ts            # Core state: config, emails, burn logic
  use-sse.ts              # SSE connection management

lib/
  crypto.ts               # AES-GCM encrypt/decrypt via Web Crypto
  db.ts                   # IndexedDB schema + CRUD via idb
  domains.ts              # Address generation (food adjective + noun + 4-digit number)
  email-utils.ts          # OTP extraction, verify-link detection
  sse-manager.ts          # Server-side SSE client registry
  utils.ts                # Tailwind class utilities
```

---

## API Reference

### `POST /api/email/generate`

Generate a new disposable email address.

**Request body** (optional):
```json
{ "domain": "yourdomain.com" }
```

**Response:**
```json
{
  "email": "crispytaco4821@yourdomain.com",
  "domain": "yourdomain.com",
  "availableDomains": ["yourdomain.com"],
  "generatedAt": 1712345678901
}
```

---

### `POST /api/email/receive`

Resend inbound webhook. Receives a parsed email payload and broadcasts it to connected SSE clients.

**Headers (optional):** `x-resend-signature` or `x-webhook-secret` matching `WEBHOOK_SECRET`.

**Response:**
```json
{ "ok": true, "delivered": 1, "id": "uuid" }
```

---

### `GET /api/email/stream/[address]`

Opens a persistent SSE stream. Emits `data:` events when emails arrive for the given address.

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

---

## Privacy Model

| What | Where | Encrypted |
|---|---|---|
| Email content (HTML/text) | IndexedDB (browser) | Yes — AES-GCM 256-bit |
| Attachments | IndexedDB (browser) | Yes — AES-GCM 256-bit |
| Device config (address, timer) | IndexedDB (browser) | No |
| Encryption key | localStorage | No (base64 raw key) |
| Emails in transit (SSE) | In-memory server map | No (HTTPS in prod) |
| Emails at rest (server) | Nowhere | — |

The server **never persists** email content. The SSE manager holds an in-memory map of live connections only; emails are pushed through and discarded.

> **Multi-instance / edge deployments:** The SSE manager uses a Node.js in-process `Map`. For deployments with multiple server instances (e.g. serverless, Fly.io with multiple machines), you'll need to swap this for a Redis pub/sub channel.

---

## Scripts

```bash
pnpm dev        # Start dev server with Turbopack
pnpm build      # Production build
pnpm start      # Start production server
pnpm lint       # ESLint
pnpm format     # Prettier (formats all .ts/.tsx)
pnpm typecheck  # TypeScript type check (no emit)
```

---

## License

MIT
