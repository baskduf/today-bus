# Decision 0006: Use Gumi BIS Timetable For Demo Planning

- Date: 2026-06-02
- Status: Accepted

## Context

Decision 0005 added the TAGO-backed planner boundary. TAGO arrival data works
for real-time "leave soon" decisions, but the route-specific arrival lookup can
return zero rows for the 180 demo route at `GMB780`.

Today-Bus still needs to answer future same-day questions such as "arrive at
Gumi Station by today 18:00". Mock fallback is necessary as a final safety net,
but it should not be the first answer when an official timetable exists.

The Gumi BIS timetable page exposes official route timetable JSON for route
`18020`, which is the demo direction from 구평예다음아파트 toward 구미역.

## Decision

Keep TAGO as the first live data source. If TAGO returns a usable arrival and
the resulting plan is not too early for the requested arrival time, return a
`source: "tago"` plan.

If TAGO succeeds but has no upcoming arrival for the demo stop, or the current
live arrival would arrive too early for a future arrival request, query the Gumi
BIS timetable and return a `source: "gumi_bis_timetable"` plan. The response
includes timetable metadata:

- provider: `gumi_bis`
- routeId: `18020`
- schedule type: `weekday` or `holiday`
- departure count
- estimated route-start-to-origin offset

The planner still keeps `warnings: string[]` for current UI compatibility and
keeps the structured `fallback` object only when it actually falls back to mock
data.

The health endpoint keeps the existing TAGO checks and adds non-secret Gumi BIS
timetable status so operators can distinguish:

- TAGO live fallback is needed;
- mock fallback is not needed because official timetable data is available.

## Consequences

- A request such as `오늘 18:00` can produce a real official-timetable plan even
  when TAGO real-time arrivals are empty.
- The first release remains demo-route scoped and does not add a general route
  planner, database, login, notifications, or deployment assumptions.
- The timetable is route-start based, so the origin-stop pass time is estimated
  from existing demo route stop orders and ride-time assumptions.
- Mock fallback remains in place for unsupported routes, invalid arrival input,
  TAGO failures plus BIS failures, or empty timetable results.
