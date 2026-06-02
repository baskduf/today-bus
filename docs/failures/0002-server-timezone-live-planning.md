# 0002. Live Planning Used Server Local Time For Korean Arrival Input

## Date Observed

2026-06-02

## Failure Type

Cross-environment mismatch risk.

## What Failed

The TAGO-backed live planner parsed `오늘 HH:mm` by mutating a plain
`new Date()` with `setHours()`. That works only when the server process runs in
the same timezone as the product domain.

If the app is deployed on a UTC host, the desired arrival timestamp can be
anchored to the wrong Korean calendar day or hour, causing `safe`, `caution`,
`too_early`, and `late` decisions to be wrong.

## How It Was Detected

During the live-planning hardening pass, the planner's `parseTodayArrival()`
logic was reviewed after TAGO live arrivals were connected to the UI.

## Prevention Rule

All Korean user-facing relative time inputs for Today-Bus planning must be
anchored to `Asia/Seoul`, independent of the server process timezone.

Do not use server-local `Date#setHours()` for route planning decisions. Convert
KST date parts into an absolute timestamp before comparing with live TAGO
arrival-derived times.

## Verification

- `npm run typecheck`
- `npm run build`
- Browser/API verification for `/plans/recommended` and `POST /api/plans`
