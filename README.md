# Glideinbir Gurukul

**Learn. Soar. Grow.** One website, one login, one wallet, seven learning modules:
Courses, Test Series, Notes Marketplace, Instant Doubts, Mentorship, Coding Practice and
Jobs & Internships.

Next.js 15 (App Router) + TypeScript, Tailwind v4, Framer Motion. Data lives in a JSON store
under `data/` (see "How it runs" below). Project rules and module notes are in [CLAUDE.md](CLAUDE.md).

## Run it locally

Requires Node 22 or newer (the local JavaScript code runner uses `node --permission`).

```bash
npm install
cp .env.example .env.local   # then fill in at least the three auth values below
npm run dev                  # http://localhost:3000
```

Create the admin password hash:

```bash
node -e "const c=require('crypto');const s=c.randomBytes(16);console.log('scrypt:'+s.toString('hex')+':'+c.scryptSync(process.argv[1],s,64).toString('hex'))" 'YourPassword'
```

On first use the app seeds free starter content (courses, tests, notes, coding problems).
Without Razorpay keys, `npm run dev` offers demo wallet top-ups so every paid flow can be tried.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server (builds into `.next-dev`, so it can run next to a production build) |
| `npm test` | Vitest unit tests (wallet, pricing, evaluation, booking, env check, …) |
| `npm run lint` / `npx tsc --noEmit` | Lint / typecheck |
| `npm run build` && `npm start` | Production build and server |

CI (`.github/workflows/ci.yml`) runs typecheck, lint, tests and the build on every push and PR.

## Environment variables

On startup the server checks its environment (`src/core/config/env.ts`). In production a
missing auth secret or a half-configured integration stops it from starting; everything
else is logged as an `[env]` warning and that feature is switched off.

| Variable | Needed for | Without it |
| --- | --- | --- |
| `SESSION_SECRET` | Sign-in (32+ random chars) | **Production won't start** |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` | The admin account | **Production won't start** |
| `NEXT_PUBLIC_APP_URL` | Links in emails, sitemap, share cards (public https URL) | Links point at localhost |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Wallet top-ups (use test keys) | No top-ups in production |
| `RAZORPAY_WEBHOOK_SECRET` | Settling payments if the buyer closes the tab | Payments settle only on return |
| `CRON_SECRET` | Scheduled jobs (see below) | Reminders and job alerts don't run |
| `RESEND_API_KEY`, `EMAIL_FROM` | Email | Emails are skipped (logged in dev) |
| `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | Video calls for doubts and mentorship | No video calls |
| `JUDGE0_HOST`, `JUDGE0_API_KEY` | Coding practice in all 5 languages | JavaScript only, and in production only with `CODE_LOCAL_RUNNER=1` |
| `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` | Live jobs across India | Only on-site and remote jobs |

Not read yet: the Supabase variables (reserved for the planned move off the JSON store),
`GEMINI_API_KEY`, and `NEXT_PUBLIC_RAZORPAY_KEY_ID` (the checkout gets its key from the server).

## Scheduled jobs

Call these with the header `Authorization: Bearer $CRON_SECRET` (any free cron service works,
for example cron-job.org or a GitHub Actions schedule):

| Endpoint | How often | What it does |
| --- | --- | --- |
| `GET /api/cron/mentorship` | Every ~5 minutes | Session reminders (24 h and 15 min), completes and pays out finished sessions |
| `GET /api/cron/jobs` | Once a day | Job-alert digest emails, refreshes remote listings |

Both also run lazily when someone opens the relevant pages, so a missed run only delays things.

Razorpay webhook URL: `https://<your-domain>/api/webhooks/razorpay` (events `payment.captured` and `order.paid`).

## How it runs (and what that means for hosting)

- All data and uploads live in `data/` (git-ignored). Writes go through one in-process queue,
  rate limits and the realtime bus are in memory. So the app must run as **one long-lived
  Node process with a persistent disk**; serverless hosts (Vercel, Netlify) would lose data.
- Back up `data/` regularly; it is the whole database.
- `GET /api/health` returns 200 when the server is up and `data/` is writable (for uptime checks).
- Security headers (frame-ancestors, nosniff, referrer policy, HSTS) are set in `next.config.ts`.
