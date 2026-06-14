# 🎨 Retro Pop Comics

[retro-pop-comics.com](https://retro-pop-comics.com) — a vintage and modern comic book marketplace with multi-source comic database search, AI-powered recommendations, a live comics news feed, new-release tracking, a community forum, and a blog.

Built with **Next.js 16** (App Router, Turbopack), **Supabase**, **Chakra UI v3**, and **Stripe**.

---

## ✨ Features

| Area | Description |
| --- | --- |
| 🔍 **Comic Database Search** | Search issues, characters, creators & publishers across Comic Vine, Marvel, Metron Cloud, Superhero API, Quadrinhos Brasil, and getcomics.org |
| 🆕 **New Releases** | Weekly new-release listings with detailed release pages |
| 🛒 **Comics Store** | Buy and sell comics with listing management and Stripe checkout |
| 📰 **Comics News** | Live AI-rewritten articles from 11 sources, infinite scroll, real-time search |
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
| 💳 Payments | Stripe |
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
```

---

## ✅ Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- A [Supabase](https://supabase.com) project
- A [Stripe](https://stripe.com) account (test keys are fine locally)
- The `retro-pop-dispatch` backend deployed (for the news feed)

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

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Comics news backend (retro-pop-dispatch)
RETROPOP_DISPATCH_API_URL=https://bue12b3514.execute-api.eu-north-1.amazonaws.com/dev

# AWS S3 (avatar uploads)
AWS_REGION=eu-north-1
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
S3_BUCKET_NAME=<your-bucket>

# Google Gemini (comic suggestions)
GEMINI_API_KEY=<your-gemini-key>

# AWS Gateway URL for comics news feed (if using a custom deployment of retro-pop-dispatch)
RETROPOP_DISPATCH_API_URL=https://<your-api-gateway-url>
```

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
```

---

## 📰 Comics News Feed

The `/news` page pulls AI-rewritten comics articles from the `retro-pop-dispatch` backend:

1. `src/app/api/news/trending/route.ts` fetches all 11 RSS feeds in parallel, checks which articles have an AI rewrite ready, and returns up to 40 results sorted by publish date.
2. `ComicsNewsClient` renders them in an infinite-scroll grid (12 cards initially, +12 on scroll) with real-time client-side search by title, source, or topic.
3. Clicking a card opens a modal that fetches the full AI-rewritten body on demand.

See [retro-pop-dispatch](../retro-pop-dispatch/README.md) for backend setup and deployment.

---

## 🚀 Deployment

The app is deployed to [Vercel](https://vercel.com). Add the same environment variables from `.env.local` to the Vercel project settings under **Settings → Environment Variables**.
