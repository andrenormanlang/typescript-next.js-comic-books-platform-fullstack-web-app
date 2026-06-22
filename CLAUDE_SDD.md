# retro-pop (Frontend) — SDD Detail

> Repo-specific SDD context for the **`retro-pop` frontend**. Read the workspace constitution first:
> [`../CLAUDE_SDD.md`](../CLAUDE_SDD.md). This file owns the frontend's stack, directory map,
> conventions, env, and commands. **Paths in this file are relative to this repo** (`retro-pop/`), so
> a bare `src/...` means `retro-pop/src/...`. In `specs/` artifacts, prefix with `retro-pop/`.

---

## 1. Tech stack (authoritative)

Pin to these. A plan that proposes a different library for a job already covered here must justify the
swap explicitly.

| Concern | Choice | Notes |
| --- | --- | --- |
| Framework | **Next.js 16** (App Router) | `next dev --turbo` for dev. React **19**. |
| Language | **TypeScript** (strict) | `pnpm type-check` must pass. |
| UI | **Chakra UI v3** (`@chakra-ui/react` 3.x) | v3 API — *not* v2. See §6 hydration note. |
| Motion / icons | Framer Motion, `lucide-react`, `react-icons` | |
| Auth + DB | **Supabase** (Postgres + Auth) via `@supabase/ssr` | RLS-backed. |
| Payments | **Stripe** (`stripe` + `@stripe/react-stripe-js`) | Checkout + webhooks. |
| Server state | **TanStack React Query v5** | All remote reads/writes via hooks in `src/hooks/`. |
| Client state | **Redux Toolkit** | Cart, auth, user, avatar slices only. |
| Rich text | **TipTap** | Blog editor. |
| File storage | **AWS S3** (`@aws-sdk/client-s3`) | Avatar uploads. |
| AI — suggestions | **Google Gemini** (`@google/genai`) | `/comic-suggestion`. |
| AI — news rewrite | **retro-pop-dispatch** (separate repo: Lambda + DynamoDB + OpenAI) | Consumed over HTTP; see [`../retro-pop-dispatch/CLAUDE_SDD.md`](../retro-pop-dispatch/CLAUDE_SDD.md) and workspace §3. |
| Validation | **Zod** | Use for all form + API input validation. |
| Package manager | **pnpm** | Backend uses npm — don't cross them. |

> **Dependency caveat:** `@prisma/client` and `next-auth` appear in `package.json` but there is **no
> Prisma schema** and auth is **Supabase**, not NextAuth. Treat these as legacy/unused — do **not**
> build new features on them. The data layer is Supabase only.

---

## 2. Architecture & directory map

Next.js App Router, single deployable. API routes act as a **proxy/BFF layer** between the client and
Supabase / Stripe / external comic APIs / the Dispatch backend.

```text
src/
├── app/
│   ├── layout.tsx              # Root layout: fonts, metadata, <ClientProviders>
│   ├── page.tsx                # Home
│   ├── auth/                   # login, signup, confirm, forgot/reset password, account, callbacks
│   ├── search/                 # comic-vine/ marvel/ metron/ superheros/ guia-search/ comicbooks-api/
│   ├── releases/               # new-release list + [id] detail
│   ├── comics-store/           # buy, buy/[id], sell, edit/[id], admin-tables
│   ├── comic-suggestion/       # AI recommendation form
│   ├── blog/                   # list, [id], create, edit/[id]
│   ├── forums/                 # [id] board, topics/[topicId], create-topic, create-post, edit/[id]
│   ├── news/                   # AI news feed (backed by retro-pop-dispatch)
│   ├── receipt/  payment-success/  admin/  error/
│   └── api/                    # see "API surface" below
├── components/                 # about/ auth/ comics-store/ partials/ ui/  (ui/ = Chakra wrappers)
├── hooks/                      # React Query data hooks, grouped by domain (marvel/, forum/, news/, …)
├── store/                      # Redux: store.ts, hooks.ts, {auth,user,avatar,cart}Slice.ts
├── contexts/                   # ReduxProvider, UserContext, AvatarContext
├── lib/                        # orders.ts, validations/, react-query-provider, stripe + supabase-server helpers
├── utils/
│   └── supabase/               # client.ts (browser), server.ts (RSC), admin-client.ts (service role), middleware.ts
├── helpers/                    # shared helper components/utilities
└── types/                      # shared TS types, grouped by domain
middleware.ts                   # route protection (see §5)
```

**API surface** (`src/app/api/`), grouped:

- **Store/commerce:** `comics-store/{buy,sell,sell-bulk,update-bulk,delete-bulk,toggle-approval}`,
  `create-order`, `confirm-payment`, `payment-success`, `clear-cart`, `generate-receipt`,
  `orders/[id]`, `update-stock`, `comics-admin`, `receipts-admin`.
- **External comic DBs (proxy):** `comic-vine/*`, `marvel/*`, `metron/*`, `superhero/*`,
  `characters-list`, `comicbooks-api/*`, `guia-search`, `random-cover`, `image-proxy`.
- **Content/community:** `blog/{get-posts,post}`, `forum/{create-forums,create-topics,create-posts,fetch-topics}`.
- **AI:** `comic-suggestion`, `comic-suggestion/enrich` (Gemini); `news/{trending,article}` (Dispatch).
- **Auth/account:** `auth/{callback,callback-password,session}`, `register`, `fetch-users`, `avatar-image`.
- **Releases:** `releases`, `releases/[id]`.

---

## 3. Data & integration model

- **Database = Supabase Postgres.** There is no ORM/migration file in-repo; schema is managed in the
  Supabase project. A plan that adds/changes tables must state the SQL (and RLS policy) it needs and
  call out that it must be applied in Supabase, not via a local migration tool.
- **Three Supabase clients — pick deliberately:**
  - `utils/supabase/client.ts` — browser/client components (anon key).
  - `utils/supabase/server.ts` — Server Components / route handlers (cookie-bound session).
  - `utils/supabase/admin-client.ts` — **service-role key, server-only.** Never import into client
    code or a component that ships to the browser.
  - (`utils/supabaseClient.ts` is a bare anon client; prefer the `supabase/` variants.)
- **External comic APIs are never called from the browser.** Always proxy through a route in
  `src/app/api/` so keys stay server-side and responses can be normalized/cached.
- **News** comes from the separate `retro-pop-dispatch` service via `RETROPOP_DISPATCH_API_URL`; this
  repo only consumes its HTTP API (workspace §3 governs that seam).

---

## 4. Auth & route protection

- Email/password auth via Supabase. Session is refreshed in `middleware.ts` →
  `utils/supabase/middleware.ts#updateSession`.
- **Protected routes** are declared centrally in `middleware.ts`: an exact/prefix list
  (`protectedPaths`) and regex patterns (`protectedPatterns`) for forum write routes. Unauthenticated
  hits redirect to `/auth/login?redirectTo=…&message=…`.
- **To gate a new route, add it to those lists in `middleware.ts`** — do not scatter ad-hoc auth
  checks in pages. Server-side data mutations should still verify the user via the server client
  (defense in depth).

---

## 5. Conventions a plan must follow

- **Remote data goes through a React Query hook** in `src/hooks/<domain>/`. Components don't `fetch`
  directly; they call the hook. New endpoints get a matching hook.
- **Mutations/secret-bearing calls go through an `app/api/*` route handler**, not directly from the
  client.
- **Client state is Redux only for cart/auth/user/avatar.** Don't add Redux for server data (that's
  React Query's job) or for trivial local UI state (use `useState`).
- **Validate input with Zod** at the API boundary and in forms (`react-hook-form` +
  `@hookform/resolvers`). Existing schemas live in `lib/validations/`.
- **Styling is Chakra UI v3.** Use components/tokens, not raw CSS where Chakra covers it. Color mode
  via `next-themes` + `components/ui/color-mode`.
  - ⚠️ **Known hydration trap:** Turbopack + Chakra v3 can mismatch on color mode. The provider stack
    (`components/client-providers.tsx`) gates `mounted`, uses `suppressHydrationWarning`, and loads
    the navbar with `ssr: false`. Preserve this pattern; if SSR hydration breaks in dev, the known
    workaround is running `next dev` **without** `--turbo`.
- **Provider order is fixed:** `ColorMode → Chakra → ReactQuery → Redux → UserContext`. Don't reorder.
- **Types live in `src/types/<domain>/`.** Reuse existing types; extend rather than duplicate.
- **Server-only secrets never reach the client.** Anything using a service-role key, Stripe secret,
  AWS, Gemini, or an external API key must be in a route handler / server module.
- **Match existing file style:** this codebase uses **tabs** in many files and kebab-case route
  folders. Mirror the conventions of the directory you're editing.

---

## 6. Environment variables

Required (`.env.local` locally; mirror in Vercel for deploy):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=            # server-only

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=                    # server-only
STRIPE_WEBHOOK_SECRET=               # server-only

# Comics news backend (retro-pop-dispatch)
RETROPOP_DISPATCH_API_URL=

# AWS S3 (avatar uploads) — server-only
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=

# Google Gemini (comic suggestions) — server-only
GEMINI_API_KEY=
```

Rule: any new secret is **server-only** unless it is genuinely public, in which case it gets a
`NEXT_PUBLIC_` prefix and you accept it ships to the browser.

---

## 7. Commands

```bash
pnpm install
pnpm dev          # http://localhost:3000 (Turbopack)
pnpm build        # production build
pnpm type-check   # tsc --noEmit  — must pass before a task is "done"
pnpm lint         # ESLint CLI (eslint . --ext .js,.jsx,.ts,.tsx)
```

> Note: `next lint` was **removed in Next.js 16**, so the `lint` script invokes the ESLint CLI
> directly against the existing `.eslintrc.json` (config + ignores via `.eslintignore`).

**Definition of done for a frontend implement task:** code matches the plan, `pnpm type-check`
passes, `pnpm lint` passes, and the spec's acceptance criteria are demonstrably met.

---

## 8. Spec template

Frontend features use the shared templates in [`../specs/_template/`](../specs/_template/) — set
`Surface / target repo(s): retro-pop`. See [`../specs/README.md`](../specs/README.md).

---

## 9. Constitution addenda (frontend-specific)

These **extend** the workspace Constitution ([`../CLAUDE_SDD.md`](../CLAUDE_SDD.md) §4):

1. **Data layer is Supabase.** Don't introduce Prisma/NextAuth or a second database/auth system.
2. **Remote data via React Query hooks; secret-bearing/mutating calls via `app/api/*` routes.** Never
   call external comic APIs from the browser.
3. **Centralized auth gating** in `middleware.ts`; mutations re-verify the user server-side.
4. **Validate all external input with Zod.**
5. **Respect Chakra v3 + the provider/hydration pattern.** Don't reorder providers or strip the
   `mounted`/`suppressHydrationWarning` guards.
6. **Type-check and lint must pass.** Strict TypeScript; reuse existing types.
7. **Prefer extending existing domain folders** (`hooks/`, `types/`, `app/api/`) over inventing
   parallel structures.
