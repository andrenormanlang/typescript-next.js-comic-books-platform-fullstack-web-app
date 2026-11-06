# 🎨 Retro Pop Comics

[Retropop Comics](https://retropop.vercel.app) is a vintage and modern comic book marketplace with multi-source comic database search, AI-powered recommendations, a live comics news feed, new-release tracking, a community forum, and a blog.

Built with **Next.js 16** (App Router, Turbopack), **Supabase** (Postgres, Auth, Storage, Edge Functions), **Chakra UI v3**, and **Stripe**.

---

## ✨ Features

| Area | Description |
| --- | --- |
| 🔍 **Comic Database Search** | Search issues, characters, creators & publishers across Comic Vine, Marvel, Metron Cloud, Superhero API, Quadrinhos Brasil, and getcomics.org |
| 🆕 **New Releases** | Weekly new-release listings with detailed release pages |
| 🛒 **Comics Store** | Buy and sell comics with listing management and Stripe checkout. Stock is reserved for 30 minutes at checkout and orders are confirmed by a Stripe webhook, never by the browser |
| ❤️ **Wishlist** | Save comics with the heart button, see stock at a glance on `/comics-store/wishlist`, move items to the cart |
| ✨ **AI cover auto-fill** | On "Tip Us!" and the edit page, uploading a cover fills title, publisher, genre, release date, pages, writer, artist and description. Facts come from Guia dos Quadrinhos (Brazilian editions), Metron, Comic Vine and the Marvel/DC Fandom wikis, with Gemini as the fallback. Writers and artists are combined across sources, and the description is a collector write-up (story + collector notes such as first appearances, notable history, era and cover price) written only from the gathered facts; every field stays editable and has its own ✨ re-lookup button |
| 🛡️ **Listing moderation** | New listings get an advisory Gemini check (does the cover match the title? red flags?) and admins get an email; results show in the admin table |
| 🖼️ **Thumbnails** | Uploaded covers and avatars get a 320px thumbnail automatically, so the store grid loads faster |
| 📰 **Comics News** | Live AI-rewritten articles from 11 sources, infinite scroll, real-time search |
| 🗞️ **Daily Pull Digest** | AI summary of the day's comics news — 5 themed highlights (publisher + topic) above the news grid, refreshed each morning |
| 🤖 **Comic Suggestion** | AI-powered comic recommendations via Google Gemini |
| ✏️ **Blog** | Rich-text posts with TipTap editor |
| 💬 **Forums** | Threaded discussion boards |
| 🔐 **Auth** | Supabase email/password with confirm, forgot-password, and reset flows |
| 👤 **Account** | Profile management and avatar upload to AWS S3 |

---

## 🛠️ Tech Stack

| Layer | Technology |
| --- | --- |
| 🚀 Framework | Next.js 16 (App Router, Turbopack) |
| 🔷 Language | TypeScript |
| 🎨 UI | Chakra UI v3, Lucide React, Framer Motion |
| 🔤 Fonts | Google Fonts via `next/font` (Bangers, Archivo Black, Inter) |
| 🗄️ Auth & Database | Supabase (`@supabase/ssr`, Postgres) |
| 💳 Payments | Stripe (PaymentIntents + webhook) |
| ⚡ Serverless | Supabase Edge Functions (Deno), `pg_cron` + `pg_net` for schedules and database triggers |
| ✉️ Email | Resend (admin notifications) |
| 🔄 Server state | TanStack React Query v5 |
| 🗃️ Client state | Redux Toolkit (`react-redux`) |
| 📝 Rich text editor | TipTap |
| ☁️ File storage | AWS S3 |
| 📡 Comics news backend | [retro-pop-dispatch](../retro-pop-dispatch) (AWS Lambda + DynamoDB + OpenAI) |
| 📦 Package manager | pnpm |

---

## 📁 Project Structure

```text
src/
├── app/
│   ├── auth/             # Login, signup, confirm, forgot/reset password, account
│   ├── search/           # Comic database search (Comic Vine, Marvel, Metron, etc.)
│   ├── releases/         # New release listings and detail pages
│   ├── blog/             # Blog list, single post, create, edit
│   ├── comic-suggestion/ # AI comic recommendation form
│   ├── comics-store/     # Buy, sell, edit listings, cart, admin tables
│   ├── forums/           # Forum boards, topics, posts
│   ├── news/             # Comics news feed (powered by retro-pop-dispatch)
│   ├── receipt/          # Order receipts
│   ├── payment-success/  # Stripe checkout success
│   ├── admin/            # Admin area
│   └── api/              # Next.js API routes (proxy layer to Supabase / Dispatch)
├── components/           # Shared UI components
├── store/                # Redux Toolkit store and slices (cart, avatar, auth, user)
├── hooks/                # TanStack React Query data-fetching hooks
├── lib/                  # Stripe helpers, validations, React Query provider
├── utils/                # Supabase client/server helpers
├── helpers/              # Shared helper components and utilities
├── contexts/             # React context providers
└── types/                # Shared TypeScript types

supabase/
├── config.toml           # Supabase CLI config (Edge Functions run with verify_jwt = false)
├── migrations/           # SQL migrations: tables, RLS, SQL functions, cron jobs, triggers
└── functions/            # Supabase Edge Functions (Deno)
    ├── _shared/          # Admin client, Stripe, Gemini, auth + order helpers (+ Deno tests)
    ├── stripe-webhook/
    ├── checkout-maintenance/
    ├── sync-exchange-rates/
    ├── on-listing-created/
    └── on-image-uploaded/
```

---

## ✅ Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- A [Supabase](https://supabase.com) project
- A [Stripe](https://stripe.com) account (test keys are fine locally)
- The `retro-pop-dispatch` backend deployed (for the news feed)
- For the Edge Functions: the Supabase CLI (`npx supabase`), [Deno](https://deno.com) to type-check/test them locally, a [Resend](https://resend.com) account, and a Gemini API key

---

## ⚙️ Setup

```bash
pnpm install
```

Create `.env.local` in the project root:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Stripe (the webhook secret lives in Supabase, see below)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Comics news backend (retro-pop-dispatch)
RETROPOP_DISPATCH_API_URL=https://<your-api-gateway-url>

# AWS S3 (avatar uploads)
AWS_REGION=eu-north-1
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
S3_BUCKET_NAME=<your-bucket>

# Google Gemini (comic suggestions)
GEMINI_API_KEY=<your-gemini-key>
```

### Supabase (database + Edge Functions)

Run these from the repo root, in this order:

1. **Log in and link the project**

   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   ```

2. **Create two Vault secrets** in the Supabase SQL editor. The cron job and database triggers use them to call the Edge Functions:

   ```sql
   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
   select vault.create_secret('<long random string>', 'internal_hook_secret');
   ```

3. **Apply the migrations** (check the list with `--dry-run` first):

   ```bash
   npx supabase db push --remote --dry-run
   npx supabase db push --remote
   ```

4. **Set the Edge Function secrets.** Put them in `supabase/.env` (git-ignored) and upload:

   ```bash
   INTERNAL_HOOK_SECRET=<same value as the Vault secret internal_hook_secret>
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...        # from step 6
   GEMINI_API_KEY=<your-gemini-key>
   COMIC_VINE_API_KEY=<your-comic-vine-key>        # analyze-cover
   METRON_API_AUTH_HEADER=<base64 user:password>    # analyze-cover
   RESEND_API_KEY=re_...
   NOTIFY_FROM_EMAIL=Retro Pop <onboarding@resend.dev>   # or an address on a domain verified in Resend
   SITE_URL=https://retro-pop-comics.com
   ```

   ```bash
   npx supabase secrets set --env-file supabase/.env
   ```

   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to every function automatically.

5. **Deploy the functions**

   ```bash
   npx supabase functions deploy
   ```

6. **Create the Stripe webhook** (Stripe Dashboard → Developers → Webhooks → Add destination):
   - Endpoint URL: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
   - Payload style: **Snapshot**
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`

   Copy its signing secret into `STRIPE_WEBHOOK_SECRET` and run `secrets set` again. Use the same Stripe mode (test or live) as `STRIPE_SECRET_KEY`.

> **Resend test sender:** `onboarding@resend.dev` only delivers to the email address that owns the Resend account. That works while there is a single admin using that address. For more admins, verify a domain in Resend and change `NOTIFY_FROM_EMAIL`.

---

## 💻 Development

```bash
pnpm dev
```

App runs at `http://localhost:3000` with Turbopack.

---

## 🏗️ Build & checks

```bash
pnpm build        # production build
pnpm type-check   # TypeScript check without emitting
pnpm lint         # ESLint

# Edge Functions (Deno; excluded from the Next.js tsconfig and ESLint)
cd supabase/functions
deno check */index.ts
deno test --allow-env _shared/
```

---

## 🧭 Spec-Driven Development (SDD)

This app is **continuously developed using Spec-Driven Development**: every non-trivial change is specified, planned, and split into tasks *before* code is written, so intent and architecture stay explicit as the app grows.

- **[`CLAUDE_SDD.md`](./CLAUDE_SDD.md)** — this repo's constitution: stack, directory map, conventions, env vars, commands, and the guardrails every change must follow. Read it before starting work.
- This repo is one of **two deployables** in the parent **`retro-pop-project/` workspace** (which also contains [`retro-pop-dispatch`](../retro-pop-dispatch)). The shared SDD assets live at the workspace root (the parent folder, not committed to this repo):
  - `CLAUDE_SDD.md` — the workspace constitution (the four-phase loop + cross-repo HTTP contract rules).
  - `specs/<feature>/` — one folder per feature: `spec.md` (what & why, tech-free) → `plan.md` (how, real repo-qualified files) → `tasks.md` (ordered, verifiable steps).
  - `claude-sdd/` — lifecycle staging (`todo/` → `done/`).

**The loop:** Specify → Plan → Tasks → Implement. Every spec & plan declares its target repo(s) — `retro-pop`, `retro-pop-dispatch`, or `both`. A cross-repo feature is a single spec that defines the HTTP contract on both sides (the **Daily Pull Digest** is one such feature: generated in `retro-pop-dispatch`, rendered here).

**Definition of done (frontend):** code matches the plan, `pnpm type-check` and `pnpm lint` pass, and the spec's acceptance criteria are demonstrably met.

---

## 📰 Comics News Feed

The `/news` page pulls AI-rewritten comics articles from the `retro-pop-dispatch` backend:

1. `src/app/api/news/trending/route.ts` fetches all 11 RSS feeds in parallel, checks which articles have an AI rewrite ready, and returns up to 40 results sorted by publish date.
2. `ComicsNewsClient` renders them in an infinite-scroll grid (12 cards initially, +12 on scroll) with real-time client-side search by title, source, or topic.
3. Clicking a card opens a modal that fetches the full AI-rewritten body on demand.

At the top of the page, a **Daily Pull Digest** shows 5 AI-generated highlights of the last 24 hours — each tagged with a publisher and topic and linking into the same article modal. It is served by the dispatch `GET /news/digest` endpoint and refreshed each morning (~06:00 Malmö time). If no digest is available it simply hides, leaving the grid unaffected.

See [retro-pop-dispatch](../retro-pop-dispatch/README.md) for backend setup and deployment.

---

## 🧾 Checkout & Supabase Edge Functions

Stock and payment state are owned by the database and Stripe, not the browser.

```text
Add to cart ──► cart row only (stock untouched)

Checkout ──► /api/create-order (buyer's currency)
              ├─ reserve_order()      atomic: take stock, price from DB, convert to the buyer's
              │                       currency (ECB rates), pending order, 30-min hold
              └─ Stripe PaymentIntent (amount + currency computed server-side, metadata.order_id)
            Checkout panel counts down the hold; at 0 (or on close) /api/cancel-order releases it

Pay ──► Stripe ──► stripe-webhook (Edge Function)
                    ├─ payment_intent.succeeded → mark_order_paid(): order paid, receipt, cart cleared
                    └─ payment_intent.canceled  → release_order(): stock given back

Every 10 min ──► pg_cron ──► checkout-maintenance (Edge Function)
                    └─ holds past expires_at: cancel PaymentIntent, release stock
                       (or settle it if the payment succeeded but the webhook was missed)
```

**Currencies.** Visitors see prices in their own currency (USD, EUR, GBP, SEK, DKK, NOK or BRL), guessed from their country by `middleware.ts` (Vercel's `x-vercel-ip-country` header) and changeable in the navbar. Store prices are estimates with the seller's price underneath; `reserve_order()` converts on the server at checkout, stores the rates on the order (`fx_rates`), and Stripe charges in that currency. A mixed-currency cart can't be checked out while rates are stale; a single-currency cart is then charged in its own currency.

The success page (`/payment-success`) polls `/api/payment-success` until the webhook has marked the order paid, then shows the receipt.

| Edge Function | Triggered by | What it does |
| --- | --- | --- |
| `stripe-webhook` | Stripe (signature-verified) | Marks orders paid, creates receipts, clears carts, releases stock on cancel. Refunds automatically if a hold expired and the comic sold to someone else |
| `checkout-maintenance` | `pg_cron`, every 10 minutes | Expires unpaid checkout holds and returns their stock |
| `sync-exchange-rates` | `pg_cron`, 15:30 and 21:30 UTC | Saves European Central Bank rates (via frankfurter.dev, no key) to `exchange_rates`. Checkout refuses rates older than 5 days |
| `on-listing-created` | Insert into `comics-sell` | Gemini reviews the cover and listing (stored in `ai_review`, advisory only), then emails admins via Resend |
| `analyze-cover` | The seller's browser (`supabase.functions.invoke`, logged-in users only; 30 lookups/hour) | Gemini identifies the cover (series, issue, year, language), then Guia dos Quadrinhos (Brazilian) or Metron, plus Comic Vine (and the Marvel/DC Fandom wiki for Marvel/DC covers), supply the facts in parallel; per field the first database with a value wins, writer/artist combine every database's names, Gemini fills the rest. A second Gemini call writes the collector description from all gathered facts only. Guia is reached through the app's own `/api/guia-search` route at `SITE_URL` |
| `on-image-uploaded` | Upload to the `comics-images` / `avatars` buckets | Writes a 320px JPEG to `<bucket>/thumbs/`. WebP/AVIF and files over 4 MB are skipped and the original is used |

`analyze-cover` uses Supabase's normal login check (`verify_jwt = true`) instead. The internal functions only accept calls carrying the `x-internal-secret` header. The database reads it from Vault, and it must match the `INTERNAL_HOOK_SECRET` function secret. A nightly SQL-only cron job also refreshes the price/stock copies stored on cart rows.

**Checking it works:**

- **Cron runs:** `select created, status_code, left(content::text, 80) from net._http_response order by created desc limit 5;`
- **Webhook deliveries:** Stripe Dashboard → Webhooks → the destination → Event deliveries
- **Function logs:** Supabase Dashboard → Edge Functions → *function* → Logs

---

## 🚀 Deployment

- **Next.js app:** every push to `main` builds the Docker image `retropop:latest` and pushes it to Docker Hub (`.github/workflows/docker-publish.yml`). The app can also be deployed to [Vercel](https://vercel.com); add the variables from `.env.local` under **Settings → Environment Variables**.
- **Database & Edge Functions:** deployed with the Supabase CLI (see *Setup → Supabase*). When a release contains migrations, run `npx supabase db push --remote` **before** deploying the app, because the new app code expects the new schema.
