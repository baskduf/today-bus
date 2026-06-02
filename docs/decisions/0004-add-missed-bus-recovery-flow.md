# Decision 0004: Add Missed-Bus Recovery Flow

- Date: 2026-06-02
- Status: Accepted

## Context

The MVP already shows a recommended plan, alternatives, and a detailed timeline.
However, Today-Bus should also support the user's next action after missing the
recommended bus. Without that connection, the "놓치면 22분 늦어요" warning is
informational but not actionable.

The MVP also defines five plan statuses, but only some statuses appear in the
initial demo plans.

## Decision

Add a missed-bus recovery flow using URL query state:

- The recommended timeline includes a "버스를 놓쳤어요" action.
- That action routes back to `/plans` with `missed=plan-a`.
- The plan list shows a recovery warning and highlights plan C as the next
  action after missing plan A.

Add a status decision guide on the plan list so all MVP status labels and user
messages are visible without adding extra selectable route plans.

## Consequences

- The MVP now demonstrates follow-up behavior after the recommended bus is
  missed.
- Recovery state is shareable and survives refresh because it is stored in the
  URL.
- The alternative plan list remains limited to requested demo plans B and C.
- The full status vocabulary can be reviewed in the UI without over-expanding
  the mock route data.
