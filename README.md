# today-bus

`today-bus` is a small Next.js app used to dogfood repository-level harness
engineering for coding agents.

The product is `구미역 기차 언제 타지?`: users pick a starting coordinate on a
map, enter a future train departure time, and the app recommends when to leave
for Gumi Station.

The dogfood goal is stricter than shipping the UI. Meaningful agent changes
should leave a verifiable trail through local checks, focused planner tests,
decision memory, and failure memory when needed.

## Dogfood Goal

This repository checks whether the harness catches real agent-work risks:

- implementation diffs that may need decision memory
- planner regressions across coordinate-based direct route, TAGO, Gumi BIS
  timetable, and mock fallback paths
- drift from the Next.js App Router, npm workflow, and shared UI components
- missing failure records for runtime, provider, or cross-environment bugs
- unsafe external API handling such as secret leakage or live/mock confusion

## Current Harness

The local harness is intentionally small and repo-specific:

- `AGENTS.md` is the source of truth for agent instructions and completion
  criteria.
- `docs/decisions/` records durable product, API, state, and harness decisions.
- `docs/failures/` records failures future agents should not repeat.
- `docs/checklists/` holds focused checklists for external API work, decision
  memory, failure memory, and verification scripts.
- `scripts/check-harness.mjs` checks structure, docs links, package-manager
  drift, scratch files, design-system paths, and decision-memory warnings.

Known gaps:

- no CI is configured yet
- browser smoke verification is manual
- `docs/effectiveness/` measurement records have not started yet
- live API diagnostics are intentionally outside the default harness gate

## Local Dogfood Loop

Install dependencies and run the app:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Run the full local harness gate before finishing broad work:

```bash
npm run check:harness
```

`check:harness` currently runs:

```bash
npm run lint
npm run test:planner
npm run typecheck
npm run build
node scripts/check-harness.mjs
```

Use `npm run test:planner` directly for quick deterministic checks of planner
branch behavior, including coordinate-based direct route candidate selection.

## Decision Warnings

`check:harness` may print a decision-memory warning when implementation-facing
paths changed without a `docs/decisions/` change.

Do not treat that warning as noise. Before finishing the task, do one of these:

- add or update a decision record
- cite the existing ADR that covers the change
- explain why no decision memory is needed

The warning is non-failing by design. It surfaces judgment that still needs a
human-readable resolution.

## External API Dogfood

Planner behavior uses deterministic tests by default. Live/public-data checks
stay separate because they depend on credentials, provider state, network
behavior, or public endpoint stability.

Focused diagnostics:

```bash
node scripts/check-tago-backend.mjs
node scripts/check-gumi-bis-offset.mjs
```

Use `docs/checklists/external-api-work.md` before changing TAGO, Gumi BIS, or
any public-data boundary. Reports must name live/mock mode, redaction behavior,
empty-result handling, provider-error handling, and the smoke command used or
intentionally skipped.

## Key Paths

- App source: `src/app/`
- Shared UI: `src/components/`
- Planner logic: `src/lib/today-bus/`
- Transit providers: `src/lib/tago/`, `src/lib/gumi-bis/`, `src/lib/transit/`
- Local tests: `tests/`
- Harness docs: `docs/harness/`
