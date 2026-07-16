# Retro Web Starter

A production-oriented Next.js monorepo starter with explicit application boundaries, shared UI,
strict static analysis, and a small test pyramid.

## Stack

- Node.js 24 LTS and pnpm 11
- Next.js 16, React 19, TypeScript 6
- Turborepo workspaces
- Tailwind CSS 4 and shadcn/ui
- Biome for formatting, linting, import organization, and architecture checks
- Vitest and Playwright
- Auth.js and next-intl

## Getting started

```bash
cp .env.example apps/web/.env.local
pnpm install --frozen-lockfile
pnpm dev
```

The web app is available at <http://localhost:3000>. The credentials provider includes the local
demo account `test@example.com` / `password`. Configure the optional Google variables to enable the
Google provider.

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

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start workspace development tasks |
| `pnpm build` | Build all buildable workspaces |
| `pnpm lint` | Run Biome checks without changing files |
| `pnpm lint:fix` | Apply safe Biome fixes |
| `pnpm format` | Format supported files |
| `pnpm check-types` | Type-check every package |
| `pnpm test` | Run unit and architecture tests |
| `pnpm test:e2e` | Run Playwright browser tests |
| `pnpm verify` | Run lint, types, unit tests, and production builds |
| `pnpm ui:update` | Refresh shadcn/ui sources intentionally |

Run `pnpm exec playwright install` once before the first local end-to-end test.

## Environment

Environment variables are declared in `.env.example` and validated in
`apps/web/src/config/env.ts`. Add a variable to both places in the same change. Never access a
client variable without the `NEXT_PUBLIC_` prefix, and never expose a server secret from a Client
Component.

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

GitHub Actions installs with the frozen lockfile and runs static analysis, type checks, unit tests,
the production build, and Playwright smoke coverage. Dependency updates are managed by the existing
Dependabot configuration.
