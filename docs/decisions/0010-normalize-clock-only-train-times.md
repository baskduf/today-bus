# Decision 0010: Normalize Clock-Only Train Times

- Date: 2026-06-02
- Status: Accepted

## Context

Decision 0008 focused the product on catching trains at Gumi Station and
documented `trainDeparture` as a `오늘 HH:mm` input. The UI now presents train
time as hour and minute controls, and users naturally think in clock-only values
such as `18:10`.

Keeping only the full `오늘 HH:mm` input shape would make form controls, URL
state, and API requests carry more text than the user actually chooses. It also
creates a risk that UI display and API normalization diverge.

## Decision

Accept clock-only `HH:mm` train departure input at the form, URL, and
`POST /api/plans` boundary for same-day planning.

Normalize valid clock-only values to `오늘 HH:mm` before planner comparison. The
station arrival deadline remains `trainDeparture - buffer`, so `18:10` with a
10-minute buffer becomes:

- `trainDeparture`: `오늘 18:10`
- `arrival`: `오늘 18:00`

Display train and station-arrival times as compact clock values in user-facing
summary text where the same-day context is already clear.

## Consequences

- The planner continues to support the existing `오늘 HH:mm` format.
- The app still does not support cross-day train departures.
- `npm run test:planner` covers clock-only normalization and the existing TAGO,
  Gumi BIS timetable, and mock fallback branches.
- `npm run check:harness` now includes `npm run test:planner` so this input
  semantics check is part of the default local harness gate.
