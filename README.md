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
- **Real-time delivery** — New emails show up within ~3 seconds; the browser polls an API route that reads them straight from Resend (no webhook, no Redis)
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
| Email provider | [Resend](https://resend.com) (inbound receiving API) |
| Real-time | Short polling (~3s) of `/api/email/inbox/[address]` |
| Local storage | IndexedDB via `idb` |
| Encryption | Web Crypto API — AES-GCM 256-bit |
| Language | TypeScript |

## How It Works

```
User opens app
  └─> Device config created in IndexedDB (email address + burn timer)
  └─> Browser polls /api/email/inbox/[address]?since=<cursor> every ~3s
      (every 15s while the tab is in the background)

Sender sends email to anything@yourdomain.com
  └─> Resend receives it via inbound MX and keeps it

Next poll
  └─> Server lists recent inbound emails from Resend (cached ~2s, shared by all polls)
  └─> Filters to the polled address, fetches the full email + attachments
  └─> Returns new emails and a cursor; the browser saves the cursor so
      nothing is missed between polls or reloads

Browser receives new emails
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

- [Bun](https://bun.sh) 1.3+ (package manager)
- Node.js 20.9+ (required by Next.js 16)
- A [Resend](https://resend.com) account with a verified domain and inbound email enabled

### 1. Clone and install

```bash
git clone https://github.com/yourusername/poof.git
cd poof
bun install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `RESEND_API_KEY` | Yes | Your Resend API key |
| `NEXT_PUBLIC_EMAIL_DOMAIN` | Yes | Your verified domain (e.g. `yourdomain.com`) |
| `NEXT_PUBLIC_APP_URL` | No | Your deployed app URL (use an ngrok URL for local inbound) |
| `NEXT_PUBLIC_GITHUB_URL` | No | If set, shows a GitHub link in the footer |

### 3. Configure Resend inbound

1. Go to **Resend → Domains → your domain → Inbound**
2. Add the MX record Resend provides
No webhook is needed — the app reads inbound emails through Resend's API using `RESEND_API_KEY`, so it also works locally without a tunnel.

> **Rate limits:** Resend rate-limits API calls per team. Polls on the same server instance share one cached listing (refreshed at most every 2s), and the client backs off on `429`. For high traffic, ask Resend to raise your limit.

### 4. Run locally

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).


## Project Structure

```
app/
  api/
    email/
      inbox/[address]/route.ts  # GET  — new emails for an address, read from Resend
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
  use-inbox-poll.ts             # Polls the inbox route, tracks the cursor
  use-is-mobile.ts              # Viewport ≤640px for responsive layout
  use-new-email-sound.ts        # Optional sound on new email

lib/
  inbox.ts                      # Resend receiving API reads + short-lived cache
  crypto.ts                     # AES-GCM encrypt / decrypt (Web Crypto)
  db.ts                         # IndexedDB schema + CRUD via idb
  domains.ts                    # Address generation
  email-utils.ts                # OTP extraction, link detection, burn progress
  utils.ts                      # Class name utilities
```

## API

### `GET /api/email/inbox/[address]?since=<epoch ms>`

Returns emails sent to `address` that Resend received at or after `since`, oldest first, plus the server time `now`. The client sends `now` (minus a 30s overlap) back as the next `since` and skips IDs it has already stored. Returns `429` with `Retry-After` when Resend rate-limits.

**Response:**
```json
{
  "emails": [
    {
    "id": "resend-email-id",
      "from": "sender@example.com",
      "subject": "Your OTP",
      "html": "<p>Your code is 123456</p>",
      "text": "Your code is 123456",
      "receivedAt": 1712345678901,
      "attachments": []
    }
  ],
  "now": 1712345680000
}
```

## Privacy Model

| Data | Where stored | Encrypted |
|---|---|---|
| Email content (HTML / text) | IndexedDB (browser) | Yes — AES-GCM 256-bit |
| Attachments | IndexedDB (browser) | Yes — AES-GCM 256-bit |
| Device config (address, timer) | IndexedDB (browser) | No |
| Encryption key | localStorage | No (base64 raw key) |
| Emails in transit (Resend → app → browser) | HTTPS only | TLS |
| Emails at rest (server) | Resend (inbound storage, per your Resend retention) | Per Resend |
| Emails at rest (this app) | Nowhere — only a few seconds of in-memory cache | — |

This app never persists email content. Inbound emails live in your Resend account (as they do with any Resend inbound setup); the API route only caches them in memory briefly to stay under Resend's rate limits.

## Scripts

```bash
bun run dev        # Start dev server with Turbopack (suppresses Node deprecation warnings)
bun run build      # Production build
bun run start      # Start production server
bun run lint       # ESLint
bun run format     # Prettier
bun run typecheck  # TypeScript type check
```

If you see a `DEP0169 url.parse()` deprecation warning, it comes from a dependency (e.g. Next.js or a transitive package). The dev script sets `NODE_OPTIONS=--no-deprecation` to hide it. To show it again (e.g. to trace the source), run `node --trace-deprecation ./node_modules/.bin/next dev --turbopack`.

**Vercel:** Polling uses short, normal requests, so there are no long-running functions to tune. To suppress the DEP0169 warning on Vercel, set the environment variable `NODE_OPTIONS` = `--no-deprecation` in your project’s Environment Variables (Settings → Environment Variables).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and pull request guidelines. This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).

## License

MIT — see [LICENSE](LICENSE).
