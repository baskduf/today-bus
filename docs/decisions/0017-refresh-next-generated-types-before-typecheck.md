# Decision 0017: Refresh Next Generated Types Before Typecheck

## Status

Accepted

## Date

2026-06-03

## Context

`npm run check:harness` failed at `npm run typecheck` while an active
development server had left a malformed `.next/dev/types/validator.ts` file.
The source application code was not the cause, and `.next/` plus
`next-env.d.ts` are generated files that should not be patched manually.

Next.js 16 can add `.next/dev/types/**/*.ts` to `tsconfig.json` automatically.
Running plain `tsc` before refreshing Next's generated type files can therefore
make local verification depend on stale development output.

## Decision

`npm run typecheck` must run `next typegen` before `tsc`:

```bash
next typegen && tsc --noEmit --incremental false
```

This keeps the npm verification workflow aligned with Next's supported type
generation path instead of editing or deleting generated files.

## Consequences

- Typecheck takes an extra Next type-generation step.
- `npm run check:harness` refreshes Next route/page/layout type helpers before
  TypeScript reads them.
- Agents should treat `.next/dev` type errors as generated-output freshness
  issues first and avoid manual patches under `.next/`.

## Verification

- `npm run typecheck`
- `npm run check:harness`
