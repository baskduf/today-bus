# Decision 0015: Add Explicit Train Departure Date Input

- Date: 2026-06-03
- Status: Accepted

## Context

The home screen previously asked for only train departure hour and minute. That
worked for same-day and next-day rollover, but it made future train planning
unclear because users could not choose the calendar date directly.

The user requested that train time entry also include a date.

## Decision

Add a `type="date"` control to the train-time form section. The client combines
the selected date with the selected hour and minute and sends:

- `trainDeparture`: `YYYY-MM-DD HH:mm`
- `arrival`: `trainDeparture - buffer`, also as `YYYY-MM-DD HH:mm`

Keep the existing compatibility formats:

- clock-only `HH:mm` still normalizes to the next future `오늘 HH:mm` or
  `내일 HH:mm`.
- explicit `오늘 HH:mm` and `내일 HH:mm` still parse as relative KST values.

Absolute date-time input is treated as explicit user intent and is not silently
rolled forward. The UI prevents past calendar dates with a date-input `min`
value, while server parsing remains format-focused and deterministic.

## Consequences

- Result pages preserve the selected date in train and station-arrival summary
  text.
- Planner parsing now supports `YYYY-MM-DD HH:mm` station-arrival deadlines in
  addition to the existing relative formats.
- Gumi BIS schedule type is derived from the explicit target date when a dated
  input is used.
- The app still does not look up actual train timetables; the user-entered date
  and time remain the source of truth.
