# Decision 0016: Link Failure Memory To Detection Checks

## Status

Accepted

## Date

2026-06-03

## Context

The `/harness update` to starter-kit commit
`fa76b7aa94506aa3ff2c9b256ee45368d418451b` added guidance that failure records
should name the regression test, fixture, smoke check, drift check, CI gate, or
manual review point that detects or prevents recurrence. The later update to
`7d6fac27d69229bfc954b662d24dea9984b1bc50` strengthened this by checking that
package-manager commands such as `npm run test:planner` refer to real root
`package.json` scripts.

This repository already had real failure records for ADR gaps, timezone
planning, Gumi BIS TLS behavior, and TAGO parameter casing. Those records were
useful context, but their schema did not consistently name the concrete check
that would catch the issue again.

## Decision

Failure records in `docs/failures/*.md` must include a
`Detection Or Prevention Check` section. That section must name a concrete
local test, fixture, script, command, checklist manual review point, CI gate, or
an explicit no-check-practical reason with a blocker and future review signal.

The normal local harness gate keeps this repository's npm-centered workflow.
Instead of copying the starter kit's Python checker, `scripts/check-harness.mjs`
validates the failure-memory schema and detection-link rule as part of
`npm run check:harness`. It also verifies `npm`, `pnpm`, `yarn`, and `bun`
`run` command references in failure records against the root `package.json`
scripts list.

## Consequences

- Updating or adding a failure record now requires a linked detection or
  prevention path.
- `npm run check:harness` fails when a failure record omits required sections,
  cites a missing local path, or uses non-committal detection prose.
- `npm run check:harness` also fails when a failure record cites a missing root
  package script such as a stale `npm run ...` command.
- Raw starter-kit scripts remain reference material; target checks stay adapted
  to the local Node harness.

## Verification

- `npm run check:harness`
- `python3 harness-starter-kit/scripts/check_effectiveness_plan.py --require-report`
