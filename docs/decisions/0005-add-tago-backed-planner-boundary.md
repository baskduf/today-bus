# Decision 0005: Add TAGO-Backed Planner Boundary

- Date: 2026-06-02
- Status: Accepted

## Context

Today-Bus needs to move from fixed mock data toward real transit data. TAGO
access is approved for bus stop, route, arrival, and location information.

The frontend should still answer a Today-Bus product question: when the user
should leave home. It should not consume raw TAGO response shapes directly.

TAGO arrival information is real-time oriented and can return no upcoming
arrivals for the target route at the current time.

## Decision

Add a backend boundary inside the Next.js App Router app:

- `src/lib/tago/client.ts` owns low-level TAGO REST calls and response
  normalization, including JSON/XML public data error handling and service-key
  redaction.
- `src/lib/transit/demo-route.ts` owns the Today-Bus demo route identifiers.
- `src/lib/transit/tago-provider.ts` owns TAGO snapshot lookup and health
  probes for the demo route.
- `src/lib/today-bus/planner.ts` translates transit snapshots into Today-Bus
  plan responses and falls back to mock plans with a structured `fallback`
  reason when live data is unavailable.
- `src/app/api/plans/route.ts` exposes the internal plan response as
  `POST /api/plans`.
- `src/app/api/tago/health/route.ts` exposes a non-secret health check for the
  TAGO demo route, including key configuration, city lookup, route lookup,
  route stop order, arrival lookup, current arrival count, and whether fallback
  is required.

The existing `/plans` and `/plans/recommended` pages use the planner response
instead of importing static mock plans directly. Mock data remains as a fallback
until route-specific live arrival data is consistently available.

## Consequences

- The frontend remains insulated from TAGO response details.
- Local development can verify real TAGO connectivity without removing the MVP
  mock flow.
- Empty arrival responses become a handled state rather than a runtime failure.
- The UI can continue rendering `warnings` while newer callers migrate to the
  structured `fallback` object.
- Operational debugging can distinguish "TAGO failed" from "TAGO succeeded but
  there are currently no route-specific arrivals."
- Future work can replace the demo-only provider with broader place search,
  timetable/headway data, and route planning without changing the API contract
  first.
