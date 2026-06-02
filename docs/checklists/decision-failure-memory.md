# Decision And Failure Memory Checklist

Use this checklist to decide whether a change needs durable repository memory.
The default is not to write an ADR for every change. Record memory when a
future agent would otherwise repeat the same decision, mistake, or investigation.

## Choose The Artifact

| Situation | Prefer | Usually skip when |
| --- | --- | --- |
| Structural product, workflow, API boundary, runtime, state, or integration policy changed | `docs/decisions/*.md` | The task follows an existing ADR or local pattern |
| A runtime or integration failure should not recur | `docs/failures/*.md` | The issue was transient or already covered |
| Provider or product terms need consistent language | `docs/domain/*.md` | The term is obvious and documented nearby |
| A repeated coding or review habit changed | `docs/conventions/*.md` or `AGENTS.md` | The habit applies only to one narrow file |
| A verification script becomes normal workflow | `README.md`, `AGENTS.md`, or `docs/conventions/*.md` | The check was a one-off diagnostic |
| A small implementation detail changed | Final report or check note | The change creates a new boundary or recurring risk |

## Decision Record Triggers

Consider a decision record when the change:

- selects or changes architecture, router shape, persistence, runtime, state, or integration policy
- codifies product workflow structure in code
- defines live/mock fallback policy or external API ownership
- introduces a durable data model or state classification
- changes a rule future agents are likely to re-litigate

No decision record is usually needed when:

- the change is a narrow bug fix inside an existing boundary
- an ADR already covers the decision and the final report cites it
- tests or conventions document the behavior clearly enough
- the only change is adding a check that enforces an existing documented rule

## Failure Record Triggers

Record a failure when the issue should not recur and at least one of these is true:

- user-visible runtime failure, crash, 5xx path, or broken production-like flow
- security, permission, privacy, or data-loss risk
- failed CI or harness check that revealed a real bug or drift
- repeated agent mistake or previously identified bug path
- external API, certificate, schema, parser, or environment mismatch
- local/CI or local/server runtime mismatch

No failure record is usually needed when:

- the issue was purely transient and no repo behavior changed
- the failure is already covered by an existing record
- a normal test failure was fixed immediately and revealed no broader bug path
- the final report can name the skipped reason without losing useful memory

## Final Report Language

When no durable memory is added for a non-trivial change, report the reason:

```text
Decision docs: skipped because this follows ADR 0005 and does not introduce a new boundary.
Failure memory: skipped because no user-visible failure or recurring bug path changed.
```
