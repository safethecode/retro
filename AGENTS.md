# Repository instructions

These rules apply to the entire repository. A more deeply nested `AGENTS.md` may add stricter local
rules, but it must not weaken this contract.

## Working agreement

- Use pnpm only. Keep `pnpm-lock.yaml` synchronized with every manifest change.
- Use the Node and pnpm versions declared by `.node-version`, `engines`, and `packageManager`.
- Do not commit, push, publish, deploy, or rewrite Git history unless the user explicitly asks.
- Preserve unrelated working-tree changes. Never use destructive cleanup commands such as
  `git clean`, `git reset --hard`, or `git checkout --`.
- Prefer the smallest complete change. Do not add speculative packages, generic repositories,
  service bases, controllers, barrel files, or wrappers without a current consumer and a policy they
  enforce.
- Do not hand-edit generated build output, `.next`, coverage, or dependency directories.

## Architecture

### Web application

- `apps/web/src/app` owns routing, layouts, metadata routes, and route composition. Keep route files
  thin.
- `apps/web/src/modules/<name>` owns one business capability. Components, schemas, actions, and
  server code that change together stay in that module.
- A module root exports only client-safe public APIs. Put secrets, database access, Auth.js setup,
  and other privileged code below `modules/<name>/server`; every server entry point starts with
  `import "server-only"`.
- `components`, `config`, `i18n`, and `lib` are domain-neutral. They must never import from
  `@/modules/*`.
- Modules may import neutral app layers and workspace packages. Avoid direct imports into another
  module's internals; use its public entry point or extract a genuinely neutral capability.
- Use `@/*` for web source imports and workspace package exports for shared code. Avoid long relative
  paths across feature boundaries.
- Server Components are the default. Add `"use client"` only at the smallest interactive boundary.
  Never import a server entry point into a Client Component.

### Workspace packages

- `@repo/ui` contains reusable visual primitives, hooks, providers, fonts, and theme styles. It must
  not import from an app or encode an app-specific workflow.
- `@repo/utils` is TypeScript-only, framework-neutral, and safe in browser or server contexts unless
  an export explicitly documents otherwise.
- `@repo/typescript-config` owns shared compiler policy. Package-local configs should contain only
  necessary environment or build overrides.
- Add a new package only when it has a distinct dependency/runtime boundary and at least two real
  consumers. A folder is cheaper than a package.
- Keep package exports explicit. Consumers must not reach through unexported source paths.

## Data, authentication, and HTTP

- Validate environment variables in `apps/web/src/config/env.ts` and document them in `.env.example`
  in the same change.
- Treat Proxy authorization as an optimistic redirect only. Sensitive pages, actions, and data
  access must verify the session again on the server.
- Use Zod at untrusted input boundaries. Infer types from schemas instead of duplicating them.
- Successful API responses use `{ data: ... }`. Public errors use
  `{ error: { code, message, details? } }`.
- Throw `AppError` only for safe, expected failures. Never return stack traces, exception messages,
  secrets, or raw provider/database errors to clients.
- Keep the HTTP client and route error envelope synchronized. Network errors must use a stable public
  code and must not leak browser or infrastructure details.

## React and UI

- Prefer composition over boolean-heavy components and avoid premature memoization.
- Keep state as close as possible to its owner. Do not mirror derivable values in state.
- Preserve keyboard behavior, labels, focus handling, and semantic HTML when changing UI.
- shadcn/ui files are owned source after generation. Review updates; do not run `ui:update` as an
  unrelated cleanup.
- The narrow Biome overrides under `packages/ui/src/components` document upstream shadcn patterns.
  Do not broaden them or exclude the directory. New application code receives no such exemption.

## Code quality

- `pnpm lint` must finish with no diagnostics. Do not add blanket ignores or file-wide suppressions.
  Prefer fixing the cause; if an external/generated pattern truly conflicts, add the narrowest rule
  override with an obvious scope.
- Do not use explicit `any`, non-null assertions, floating promises, ignored import cycles, or debug
  console calls. Use `unknown` and narrow it.
- Use `import type` for type-only imports and `node:` prefixes for Node built-ins.
- Keep functions below the configured cognitive-complexity budget. Split by responsibility, not by
  arbitrary line count.
- Formatting and import ordering are owned by Biome. Run `pnpm lint:fix` after broad source changes.

## Tests and verification

- For behavior changes, write or update a failing test first, then implement the smallest passing
  change. Test public behavior rather than implementation details.
- Unit tests live beside the behavior or under `apps/web/src/test` for repository contracts.
  Browser journeys live in `apps/web/e2e`.
- Extend architecture tests when introducing a new invariant rather than relying on prose alone.
- Before handing off a change, run the checks proportionate to its scope. For repository-wide work,
  the minimum is:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm check-types
pnpm test
pnpm build
pnpm test:e2e
```

- Report any check that could not run and the concrete reason. Never claim completion from stale or
  partial output.
