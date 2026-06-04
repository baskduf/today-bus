# Decision 0018: Adopt Effectiveness Outcome Tracking Artifacts

## Status

Accepted

## Date

2026-06-04

## Context

The repository's harness adoption report already names
`docs/effectiveness/harness-effectiveness.md` and
`docs/effectiveness/task-outcomes/` as the locations for future effectiveness
tracking, but the target repository did not yet contain `docs/evaluation.md`,
`docs/templates/task-outcome.yaml`, or
`docs/templates/effectiveness-report.md`.

A dogfood run requested the effectiveness workflow and required a task outcome
record. The concrete app task, expected edit boundary, known failure mode, and
verification commands in that prompt were placeholders, so the run could not be
treated as a comparable product implementation task.

## Decision

Adopt the starter-kit effectiveness protocol into the target repository as a
docs-only harness workflow:

- Add `docs/evaluation.md` as the local measurement protocol.
- Add `docs/templates/task-outcome.yaml` and
  `docs/templates/effectiveness-report.md` as local templates.
- Store filled individual observations under
  `docs/effectiveness/task-outcomes/`.
- Treat the current evaluation mode as harnessed-only until comparable baseline
  task data exists.
- Do not claim the harness improved agent effectiveness from one run.

## Consequences

- Future dogfood or review runs can record observable task outcomes without
  depending on chat context or the read-only `harness-starter-kit/` clone.
- Task outcome files are effectiveness evidence, not harness health scores.
- Placeholder prompts should be recorded as non-comparable or incomplete rather
  than reported as successful product-task evidence.

## Verification

- `npm run check:harness`
- `python3 harness-starter-kit/scripts/check_effectiveness_plan.py --require-report`
