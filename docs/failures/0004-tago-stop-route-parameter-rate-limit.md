# 0004. TAGO Stop Route Lookup Ignored The Stop Filter And Hit Rate Limits

## Date Observed

2026-06-03

## Failure Type

External API parameter mismatch and provider rate-limit failure.

## Goal

Coordinate-based direct route planning should query TAGO stop-route data with
the endpoint-specific parameter shape, keep live lookup fan-out bounded, and
avoid surfacing provider debug warnings as primary user-facing copy.

## What Happened Or Was Tried

Coordinate-based direct route planning called TAGO
`/getSttnThrghRouteList` with `nodeId` for the stop-route lookup.
That endpoint expects `nodeid`. With `nodeId`, TAGO ignored the stop filter and
returned city-wide route results such as 300 routes for a single stop.

The direct-route planner then queried route-stop lists for far too many routes
in parallel, which caused public data portal failures such as:

- HTTP `429`
- provider error `가용한 세션이 존재하지 않습니다. (30/30)`

The user saw debug warnings like `TAGO request failed` on the result screen even
though the base TAGO key, city lookup, demo route lookup, and Gumi BIS timetable
fallback were working.

## Why It Failed

The user reported visible result-page warnings after selecting a map coordinate.
Focused live checks showed:

- `/api/tago/health` succeeded for key, city, route, route-stop order, and
  timetable.
- `getSttnThrghRouteList` with `nodeId=GMB16` returned 300 routes.
- `getSttnThrghRouteList` with `nodeid=GMB16` returned the expected 9 routes.
- Direct route planning failed with HTTP `429` before the parameter fix.

The provider endpoint does not treat `nodeId` and `nodeid` as interchangeable,
and the incorrect parameter expanded a single-stop lookup into a city-wide route
fan-out.

## Current Replacement

Use TAGO's endpoint-specific parameter casing exactly. Do not assume camelCase
and lowercase variants are interchangeable.

For coordinate-based route search:

- use `nodeid` for `/getSttnThrghRouteList`;
- keep route-stop lookups deduplicated by `routeid`;
- limit concurrent route lookups;
- skip a failed stop or route candidate instead of failing the whole coordinate
  search;
- keep provider/debug warnings in the API response but do not render them as
  primary user-facing copy.

## Detection Or Prevention Check

- `tests/nearby-stops-provider.test.mjs` asserts that
  `/getSttnThrghRouteList` receives `nodeid`.
- `tests/direct-route-planner.test.mjs` covers direct route lookup fan-out and
  failed-stop skipping.
- `npm run test:planner`
- Focused live checks remain outside the default gate through
  `node scripts/check-tago-backend.mjs` when provider state must be verified.

## Agent Guidance

For TAGO endpoints, preserve endpoint-specific parameter casing and add fixture
coverage before relying on live smoke output. Keep live diagnostics focused and
separate from `check:harness` unless maintainers decide they are stable enough
for the default gate.
