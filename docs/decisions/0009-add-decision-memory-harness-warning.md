# Decision 0009: Add Decision Memory Harness Warning

- Date: 2026-06-02
- Status: Accepted

## Context

The harness starter kit added a configurable decision-memory warning that points
agents toward `docs/decisions/` when implementation diffs may change workflow,
input semantics, state, API shapes, fallback policy, or displayed decision
criteria.

This repository already records the prompt-first harness adoption in Decision
0001. That decision keeps the local harness aligned with npm and Node instead of
adding Python, CI, pre-commit hooks, or copied starter-kit scripts.

## Decision

Adopt the decision-memory warning inside `scripts/check-harness.mjs` as a
non-failing check, configured by `.harness/decision-memory-rules.json`.

The warning watches implementation-facing paths such as `src/**`, `public/**`,
`next.config.*`, and `package.json`. It is satisfied when the same diff includes
a `docs/decisions/**` change. If the warning appears, the agent must add or
update an ADR, cite the existing ADR that covers the change, or explain why no
decision memory is needed.

## Consequences

- `npm run check:harness` can surface missing decision review without blocking
  narrow implementation work.
- The harness remains dependency-free and uses the existing Node verification
  path.
- Future agents have a visible prompt to consider ADR coverage when product,
  API, state, or workflow behavior changes.
