# Retro Web Starter

A production-oriented Next.js monorepo starter with explicit application boundaries, shared UI,
strict static analysis, and a small test pyramid.

## Stack

- Node.js 24 LTS and pnpm 11
- Next.js 16, React 19 with React Compiler, TypeScript 7
- Turborepo workspaces
- Tailwind CSS 4 and shadcn/ui
- Biome for formatting, linting, import organization, and architecture checks
- Vitest projects, MSW, and Playwright
- Better Auth, Drizzle ORM, PostgreSQL 18, and next-intl

## Getting started

```bash
cp .env.example apps/web/.env.local
pnpm install --frozen-lockfile
docker compose up -d
pnpm db:migrate
pnpm dev
```

The web app is available at <http://localhost:3000>. Register an account to use the protected
dashboard. Accounts and sessions persist in PostgreSQL; there is no built-in demo account.
Configure both Google variables to enable Google sign-in. Its callback URL is
`<AUTH_URL>/api/auth/callback/google`.

Before a production build, set `AUTH_SECRET` in `apps/web/.env.local` to a random value of at least
32 characters. Generate one with:

```bash
pnpm exec node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex') + '\n')"
```

## Repository layout

```text
apps/
  web/
    src/
      app/          Next.js routes and route composition
      components/   app-wide, domain-neutral components
      config/       validated environment and runtime configuration
      i18n/         locale routing and messages
      lib/          domain-neutral infrastructure
      modules/      business capabilities with public entry points
      styles/       application styles and fonts
      test/         shared test setup and architecture contracts
packages/
  ui/               reusable UI components, hooks, providers, and styles
  utils/            framework-neutral utilities
  typescript-config/ shared strict TypeScript configurations
```

The intended dependency direction is:

```text
app -> modules -> lib/config
app -> components -> lib/config
app/modules/components -> @repo/ui, @repo/utils
```

Neutral layers (`components`, `config`, and `lib`) must not import application modules. Server-only
module exports live below a `server` entry point and must import `server-only`. See `AGENTS.md` for
the complete contribution contract.

## Commands

| Command            | Purpose                                            |
| ------------------ | -------------------------------------------------- |
| `pnpm dev`         | Start workspace development tasks                  |
| `pnpm build`       | Build all buildable workspaces                     |
| `pnpm lint`        | Run Biome checks without changing files            |
| `pnpm lint:fix`    | Apply safe Biome fixes                             |
| `pnpm format`      | Format supported files                             |
| `pnpm check-types` | Type-check every package                           |
| `pnpm test`        | Run unit and architecture tests                    |
| `pnpm test:e2e`    | Run Playwright browser tests                       |
| `pnpm verify`      | Run lint, types, unit tests, and production builds |
| `pnpm ui:update`   | Refresh shadcn/ui sources intentionally            |

Database schema lives in `apps/web/src/modules/auth/server/schema.ts`. Run `pnpm db:generate`
after changing it, review the generated migration in `apps/web/drizzle`, then apply it with
`pnpm db:migrate`. The Compose database binds to localhost and uses local-development credentials.

Run `pnpm --filter web analyze` for the interactive Turbopack bundle analyzer, or add `--output`
to save its report. Shared dependency versions are defined in the pnpm catalog. Keep Node type
definitions on the same major version as `.node-version`.

Run `pnpm --filter web exec playwright install` before the first local end-to-end test.
`pnpm test:e2e` builds the application and tests `next start` on port 3187. It requires a migrated
test database and valid build environment variables; it never reuses an existing development server.

## Environment

Environment variables are declared in `.env.example` and validated in
`apps/web/src/config/env.ts`. Add a variable to both places in the same change. Never access a
client variable without the `NEXT_PUBLIC_` prefix, and never expose a server secret from a Client
Component.

Production requires `AUTH_SECRET`, `AUTH_URL`, and `DATABASE_URL`. Development defaults are local
only. `SKIP_ENV_VALIDATION=true` can bypass local validation; production always validates.
`NEXT_PUBLIC_API_URL` is the API base path, including `/api/v1/`, rather than only the site origin.

The authentication baseline provides email/password registration and optional Google sign-in.
Better Auth owns password hashing and database sessions, with database-backed request limits.
`/api/v1/users` returns only the signed-in user's profile; individual profile routes enforce
ownership and allow name updates. The old mock login, registration, user creation, and deletion
handlers have been removed. `/api/auth/*` follows Better Auth's response contract; other application
APIs use the documented `data` and `error` envelopes. JSON and authentication request bodies are
limited to 64 KiB. A self-hosted reverse proxy must overwrite client-supplied forwarded-IP headers
before exposing the origin so authentication request limits use trusted client addresses.

## Adding code

- Add a business capability under `apps/web/src/modules/<name>` and expose its client-safe API from
  the module root.
- Put cross-feature visual primitives in `@repo/ui`; keep app-specific composition in
  `apps/web/src/components`.
- Promote a utility to `@repo/utils` only when it is framework-neutral and has more than one real
  consumer.
- Keep route handlers thin. Known failures use `AppError`; unexpected failures are hidden by the
  shared HTTP error boundary.
- Add tests with behavior. Architecture tests protect boundaries and should be extended when a new
  invariant is introduced.

## CI

Cache Components and Partial Prefetching are enabled. The public welcome heading is cached by
locale, while database session reads and personalized dashboard content remain behind Suspense.
The locale root layout sets the document language, and `next/root-params` supplies the server
locale without a request-header dependency. Proxy imports only routing configuration so App
Router navigation code stays out of its runtime. Browser tests verify that two accounts never
share personalized content across cached page renders.

Unit and contract tests run in the Node Vitest project, while `.test.tsx` component tests run in
the DOM project. `@repo/utils` has its own Node tests. HTTP contract tests use MSW without a live
API server. `pnpm check-types` generates Next.js route types before running TypeScript.

GitHub Actions installs with the frozen lockfile and runs static analysis, type checks, unit tests,
the production build, and Playwright journeys against PostgreSQL 18. CI uses public test-only
environment values, read-only verification credentials, pinned Actions, and a production dependency
audit. Dependency updates are managed by the existing
Dependabot configuration.
