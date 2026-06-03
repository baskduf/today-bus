# Decision 0010: Normalize Clock-Only Train Times

- Date: 2026-06-02
- Status: Accepted

## Context

Decision 0008 focused the product on catching trains at Gumi Station. The UI now
presents train time as hour and minute controls, and users naturally think in
clock-only values such as `18:10`.

Keeping only the full `오늘 HH:mm` input shape would make form controls, URL
state, and API requests carry more text than the user actually chooses. It also
creates a risk that UI display and API normalization diverge.

## Decision

Accept clock-only `HH:mm` train departure input at the form, URL, and
`POST /api/plans` boundary.

Normalize valid clock-only values to the next future train time before planner
comparison. If the selected clock time is still ahead today, it becomes
`오늘 HH:mm`; if it is at or before the current KST minute, it becomes
`내일 HH:mm`.

The station arrival deadline remains `trainDeparture - buffer`, so `18:10` with
a 10-minute buffer can become:

- `trainDeparture`: `오늘 18:10`
- `arrival`: `오늘 18:00`

If the current KST time has already passed `14:10`, `14:10` becomes:

- `trainDeparture`: `내일 14:10`
- `arrival`: `내일 14:00`

Display train and station-arrival times as compact clock values in user-facing
summary text, preserving the `내일` label when the next-day rollover is used.

## Consequences

- The planner continues to support the existing `오늘 HH:mm` format and now also
  supports the next-day `내일 HH:mm` rollover.
- The app still does not support train timetable lookup or planning more than
  one day ahead.
- `npm run test:planner` covers clock-only normalization and the existing TAGO,
  Gumi BIS timetable, and mock fallback branches.
- `npm run check:harness` now includes `npm run test:planner` so this input
  semantics check is part of the default local harness gate.
