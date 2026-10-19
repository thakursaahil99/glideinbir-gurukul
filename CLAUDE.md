# Glideinbir Gurukul: "Learn. Soar. Grow."

Super-app education platform. ONE website, ONE login, ONE wallet, 7 independent modules:
1 Courses, 2 Test Series, 3 Notes Marketplace, 4 Instant Doubt Solving,
5 Mentorship Booking, 6 Coding Practice, 7 Jobs/Internships.

## Stack
Next.js 15 App Router + TypeScript strict, Tailwind v4, Framer Motion, Lenis, Lucide.
Supabase (Postgres, Auth, Realtime, Storage, RLS), Razorpay TEST mode, LiveKit,
Resend, Judge0 CE, Zod, React Hook Form, TanStack Query, Vitest, Playwright.
Everything must stay within free tiers.

## Design system
- Tokens live in `src/app/globals.css` (`--bg`, `--fg`, `--muted`, `--card`, `--border`,
  `--primary`, `--saffron`, `--rose`, `--teal`). Use Tailwind names: `bg-bg`, `text-fg`,
  `text-muted`, `border-line`, `glass`, `text-gradient`, `container-x`.
- Dark mode is the default and toggled with the `.dark` class (`ThemeToggle`).
- Fonts: Bricolage Grotesque (`font-display`), Plus Jakarta Sans (body), Tiro Devanagari (`font-deva`).
- Motion: ease `[0.22, 1, 0.36, 1]`; reuse `Reveal`, `SectionHeading`, `Magnetic` from
  `src/components/motion/effects.tsx`. Respect `prefers-reduced-motion`.
- Brand mark: `BirdMark` / `Logo` in `src/components/brand/logo.tsx`.

## Architecture rules
- /src/core: auth, roles, profile, wallet (ledger), payments, notifications,
  reviews, search, module-registry.
- /src/modules/<name>: components, actions, queries, types, schema (zod),
  admin pages. A module NEVER imports from another module, only from core.
- Home tiles, sidebar and landing bento are generated from `src/core/module-registry.ts`
  (enable/disable per module with `enabled`).
- Routes: `(public)` landing/login/signup, `(app)` logged-in shell, `(admin)/admin`.
- DB: every table has id (uuid), created_at, updated_at. Module tables are
  prefixed (courses_, tests_, notes_, doubts_, mentor_, code_, jobs_).
- All schema changes via Supabase migrations in /supabase/migrations.
- RLS on EVERY table. No table without policies.
- Roles: student, instructor, tutor, mentor, vendor, recruiter, admin.

## Security rules
- Validate every input with Zod on the server. Never trust the client.
- Verify Razorpay payment signature on the server before crediting.
- Wallet changes ONLY through Postgres functions in a transaction, writing to
  an append-only ledger table. No direct balance updates. Money in paise (integers).
- Service-role key only on the server, never in client code.
- Secure file downloads (notes, paid videos) with signed URLs.

## Code rules
- Small files, typed everything, no `any`. Server Actions for mutations.
- Every page has loading, empty and error states.
- Mobile-first, accessible (labels, focus states, contrast). Dark mode.
- Write Vitest tests for wallet, pricing, evaluation and booking logic.

## Workflow
- Work one PHASE at a time. After each phase: list what was built, give a
  manual test checklist, and stop.
- Never modify other modules while working on one.
- Before coding a phase, show a short plan and wait for approval.

## Phase status
- [x] Phase 0: foundation, theme, animated landing, app shell, registry, home tiles
- [x] Phase 1: Core (auth, roles, wallet, payments, notifications, admin shell)
  - Persistence is the JSON store in /data (`src/core/db/json-store.ts`), not Supabase yet.
    Every write goes through one in-process queue, which makes it atomic like a DB transaction.
  - Wallet: `src/core/wallet/ledger.ts` (pure, tested) + `store.ts`. Append-only, paise,
    idempotency key on every movement, `transfer()` splits commission to `PLATFORM_ID`.
    Modules must charge users via `walletDebit` / `walletTransfer`, never by editing balances.
  - Payments: `src/core/payments/*`. Razorpay REST + server-side signature check;
    webhook at `/api/webhooks/razorpay`. No keys → demo recharge, local dev only.
  - Notifications: `notify()` in `src/core/notifications/store.ts`; email via `sendEmail()`.
  - Rate limits: `src/core/security/rate-limit.ts` (in-memory, single process).
  - Not done: Google sign-in (needs OAuth credentials), Supabase migration.
- [x] Phase 2: Courses (`src/modules/courses`)
  - Catalog (search/filter/sort via URL params), detail, buy (wallet; Razorpay top-up of the
    shortfall), player with resume, progress, certificate PDF + public `/verify/<code>`,
    reviews, instructor dashboard + editor (uploads), admin `/admin/courses`, demo courses.
  - Commission: `courses_settings.json` (default 20%), paid via `walletTransfer`.
  - Uploads live in `data/uploads/courses/<id>/` and are only served by
    `/api/courses/media/...` after an access check (enrolled / owner / free preview).
  - Not done: video transcoding/HLS, signed CDN URLs (needed once off the JSON store).
- [x] Phase 3: Test Series (`src/modules/tests`)
  - Single / multiple / numeric (± tolerance) questions, marks + negative marks, topics.
  - One attempt per learner per test. The server sets `deadline` at start; answers after
    deadline + 5s grace are refused and the attempt is auto-submitted the next time anyone
    reads it (`settleIfExpired`), so no background job is needed.
  - Answer keys never reach the browser before submit: attempt pages only get
    `publicQuestion()`; evaluation (`evaluate`) and ranking (`standing`) run on the server.
  - Instructor editor with CSV bulk import (`importQuestionsCsv`, template in the UI);
    questions freeze once a test has attempts. Paid tests via `walletTransfer` (`tests_settings.json`).
  - Admin `/admin/tests`; demo tests (free JEE mini mock, paid SSC reasoning ₹49).
- [x] Admin pages (users, site content, settings) moved to `rpc()` too.
- [x] Phase 4: Instant Doubts (`src/modules/doubts`)
  - Learner asks (subject, text, optional image, 10/20/30 min limit) → online tutors of that
    subject get it live; first `acceptDoubt` wins (atomic `transition` in `store.ts`).
  - On accept, `rate × limit` moves learner → `escrow:doubts` (key `doubt:<id>:hold`). On end,
    `bill()` charges per started minute (first minute free if ended early); tutor gets the charge
    minus commission, the rest is refunded (`doubt:<id>:pay` / `:refund`). `settle()` on read
    handles expiry (2 min unaccepted), the time limit and retries of unpaid payouts.
  - Realtime: in-process bus (`src/core/realtime/bus.ts`) + SSE `/api/doubts/stream`, with a
    10s polling fallback on the client. Single process only (swap for Redis/Supabase later).
  - Video: LiveKit token (`src/core/video/livekit.ts`); needs `LIVEKIT_*` env keys.
  - Tutors = users with role `tutor` (set in `/admin/users`); `/doubts/tutor` desk; admin
    `/admin/doubts` (escrow balance, commission). AI first answer not built yet.
- [x] Phase 5: Mentorship Booking (`src/modules/mentorship`)
  - Mentors (role `mentor`) set weekly openings in IST, days off, 30/45/60 min sessions,
    a buffer and a price in `/mentorship/mentor`. All slot maths is pure in `logic.ts`
    (IST = UTC+05:30, no DST); the server re-derives slots and never trusts a client time.
  - No double booking: `claimSlot` / `transition` check overlaps (mentor and learner) inside
    the JSON write queue. In Supabase use an exclusion constraint on tstzrange per mentor.
  - Booking holds the price in `escrow:mentorship` (`mentor:<id>:hold`). After the end the
    mentor is paid minus the commission fixed at booking time (`:pay`). Learner cancels >24h
    ahead: full refund; later: none (mentor paid). Mentor/admin cancel: full refund.
    Learners may move a session up to 24h before (max 2 times); mentors any time before start.
  - Reminders (24h, 15 min) + completion run lazily on read and from the cron route
    `GET /api/cron/mentorship` (`Authorization: Bearer $CRON_SECRET`, call every ~5 min).
  - Call room opens 10 min before the start (LiveKit, room `mentor-<id>`), feedback after.
  - Admin `/admin/mentorship`: escrow, commission, "Cancel & refund" for no-shows (works only
    until the session ends and is paid out).
- [x] Phase 6: Notes Marketplace (`src/modules/notes`)
  - Selling is profile-based, not role-based: anyone applies at `/notes/sell`, an admin approves
    (`notes_vendors.status`). Suspended stores drop out of the marketplace; buyers keep access.
  - Upload: `PUT /api/notes/upload?noteId=&kind=pdf|cover`, streamed with size cap + magic bytes;
    PDFs must open in pdf-lib (encrypted ones are refused) and their page count is stored.
  - Free preview = first N pages (max 30% for paid, cached as `preview-N-<file>`), served by
    `/api/notes/preview/[id]`. Full file only via a 5-minute HMAC link bound to the user
    (`signDownload`/`verifyDownload`, `/api/notes/file/[id]`), stamped with the buyer's name and
    email on every page. Files live in `data/uploads/notes/<id>/`, never in /public.
  - Buy = `walletTransfer` buyer → vendor with commission (key `note:<id>:<user>`), short wallets
    top up via Razorpay first. One purchase / review per user per note (enforced in the queue).
  - Reports: 3 open reports from different people auto-hide a note until an admin restores or
    hides it. Payouts: request moves money to `escrow:payouts`; admin marks paid (with UTR,
    ledger `payout` debit) or rejects (money returns). One open request per seller.
  - Admin `/admin/notes`: sellers, reports, payouts, hidden notes, commission/min payout, demo notes.
- [x] Phase 7: Coding Practice (`src/modules/code`)
  - stdin/stdout problems (markdown statement, samples + hidden tests, per-language starter).
    Hidden tests never leave the server; Run = samples or custom input, Submit = all tests.
  - Runner (`runner.ts`): Judge0 CE when `JUDGE0_HOST` (+ `JUDGE0_API_KEY`, RapidAPI or
    X-Auth-Token) is set: all 5 languages. Otherwise a local JavaScript-only sandbox: separate
    `node --permission` process (no fs beyond its script, no child processes/workers/eval), no
    server env, time/memory/output caps. It can still reach the network, so it's on by default
    only in dev; production needs `CODE_LOCAL_RUNNER=1`.
  - Output: compare the full stdout (up to 4 MB), but store/show only 64 KB (`clipShown`).
  - Monaco via `@monaco-editor/react`, self-hosted: `scripts/copy-monaco.mjs` copies it to
    `public/monaco` (git-ignored) on install/dev/build; the loader path must be absolute.
  - Streak = days (IST) with an accepted submission; leaderboard = 10/25/50 points per solved
    easy/medium/hard problem. Instructors/admins author problems at `/code/manage` and can
    check a reference solution against all tests.
- [x] Starter content (`src/app/starter-content.ts`): on first use the app seeds free courses
  (embedded YouTube lectures from CS50, Khan Academy, Abdul Bari, freeCodeCamp, ids verified via
  oEmbed, creators credited), 6 free + 2 paid tests, 7 notes (4 free) and 10 problems, owned by a
  "Glideinbir Team" curator account that can't sign in. Runs once (`data/starter_content.json`);
  bump `STARTER_VERSION` to add more. The dashboard shows live counts and free picks.
- [x] Phase 8: Jobs & Internships (`src/modules/jobs`)
  - Three sources on Find jobs: **Across India** = live Adzuna search (`adzuna.ts`, needs free
    `ADZUNA_APP_ID`/`ADZUNA_APP_KEY`; server-side proxy, 30-min cache, ≤20 calls/min, credit
    "Jobs by Adzuna", apply via their redirect_url); **On Glideinbir** = recruiter postings with
    skill match + one-click apply; **Remote worldwide** = Remotive public API (`remotive.ts`,
    synced ≤3×/day, credited, also on the public `/remote-jobs` page because their terms forbid
    gating jobs behind signup). Remotive's free feed is tiny (~12 jobs); Adzuna is the volume.
  - Never invent job listings. Real data only, from APIs or real recruiters.
  - Recruiting is company-based (admin verifies `jobs_companies`); pipeline applied →
    shortlisted → interview → hired / rejected (`canMove`), candidates notified + emailed.
  - Resume PDF in `data/uploads/jobs/resumes/<user>/`, copied per application so recruiters see
    what was sent; served only to the candidate, that company's owner and admins.
  - Job alerts: daily digest via `GET /api/cron/jobs` (Bearer CRON_SECRET).
- [ ] Phase 9: polish & deploy

## Hard-won rules (read before writing UI)
- **Client mutations go through `rpc()` (`src/lib/rpc.ts` → `/api/rpc/[name]`)**, not by calling
  server actions from the browser. In this app the client side of server actions intermittently
  never resolved (response arrived, promise stayed pending, buttons hung), and same-URL
  `router.refresh()` / `revalidatePath` updates were intermittently not committed. Add new
  functions to `HANDLERS` in the rpc route; they keep their own `requireUser` + zod checks.
  Login/signup still use form actions (they redirect, which works).
- **After a mutation**, update local state or navigate to a new URL (`router.push`, or
  `router.replace(path + "?updated=" + Date.now())` to re-fetch the same page). Don't rely on
  `router.refresh()`. No `revalidatePath` needed: every page is `force-dynamic`.
  Prefer local state when the same component stays on screen: a `?updated=` replace on the
  seller dashboard was seen not to commit (header updated, page props stayed stale).
- **Demo payments are off in production builds** (`next start`): e2e runs credit wallets with
  `admin.adjustWallet` instead of the top-up flow.
- **Header numbers** (wallet balance, unread badge) live in the layout, which client navigation
  doesn't re-render: call `refreshSummary()` (`src/lib/summary.ts`) after changing them.
- **Page transitions:** don't wrap `<main>` in `AnimatePresence` (it remounted pages on the first
  keystroke, wiping form state) and don't animate `filter` on it (a lingering filter makes
  `<main>` the containing block for `position: fixed` modals and bars).
- **Async edits in editors:** update nested state functionally by id (`update(all => ...)`),
  never from a captured copy, or uploads/probes finishing later undo the user's edits.
- **JSON store:** writes share one process-wide queue on `globalThis`; reads retry on torn files.
  Single server process only.
- **Grid columns with horizontal scrollers** (date strips, tables) need `min-w-0` on the grid
  item, or the `1fr` column grows past the viewport.
- **e2e checks:** a full page load shows the intro loader first; wait with `locator.waitFor()`
  (`isVisible()` doesn't wait). Missing pages render the 404 UI with status 200 because the
  root `loading.tsx` streams the response.
- **Numbers use Indian grouping** (`toLocaleString("en-IN")` → 2,45,310); write tests to match.
- **Anything clock-based (greetings, "x minutes ago") renders after hydration** or from a
  server-passed `serverNow`, never `new Date()` during render: it caused a hydration mismatch.
- **Never ship an empty module.** New modules need starter content (see starter-content.ts)
  and the dashboard should point at something free to try.
- **The owner may be running `next dev` on :3000 against the same `data/`.** After e2e runs,
  remove only test users and test activity; never wipe the owner's data or uploads.
- **Always use braces in `useEffect` bodies.** `useEffect(() => el.scrollIntoView(...))` returns
  a Promise in new Chrome, React treats it as a cleanup and crashes ("u is not a function").
- **PowerShell 5.1 gotchas:** `Get-Content` without `-Encoding utf8` corrupts UTF-8 (₹, …), and
  paths with `[slug]` are wildcards for `Copy-Item` (use `-LiteralPath`).
