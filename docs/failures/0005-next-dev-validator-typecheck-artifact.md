# 0005. Next Dev Validator Artifact Broke Typecheck

## Date Observed

2026-06-03

## Failure Type

Stale generated framework artifact included in the default TypeScript check.

## Goal

`npm run check:harness` should typecheck the application source and refreshed
Next.js generated route types without failing on stale development-server
output.

## What Happened Or Was Tried

`npm run check:harness` passed lint and planner tests, then failed during
`npm run typecheck` with:

```text
.next/dev/types/validator.ts(17,62): error TS1434: Unexpected keyword or identifier.
```

The active development server had generated `.next/dev/types/validator.ts`
without the expected `import type` prefix on a route type import. The production
generated `.next/types/validator.ts` did not have that syntax error.

## Why It Failed

`tsconfig.json` included `.next/dev/types/**/*.ts`, which Next.js 16 can add
automatically for generated route types. However, the `typecheck` script ran
plain `tsc` without first asking Next.js to refresh generated type files.

Because `.next/` is ignored generated output, plain `tsc` could pick up a stale
or malformed development artifact before `next build` had a chance to regenerate
it.

## Current Replacement

Run `next typegen` before `tsc` in the default `typecheck` script:

```bash
next typegen && tsc --noEmit --incremental false
```

Do not edit `.next/dev/types/*` or `next-env.d.ts` to repair this class of
failure. Let Next.js regenerate them through `next typegen`, `next dev`, or
`next build`.

## Detection Or Prevention Check

- `npm run typecheck`
- `npm run check:harness`

## Agent Guidance

When a typecheck failure points at `.next/dev`, treat it as generated
development output first. Prefer refreshing generated types with `next typegen`
over changing application code or generated files.
