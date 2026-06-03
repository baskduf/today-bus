# 0004. TAGO Stop Route Lookup Ignored The Stop Filter And Hit Rate Limits

## Date Observed

2026-06-03

## Failure Type

External API parameter mismatch and provider rate-limit failure.

## What Failed

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

## How It Was Detected

The user reported visible result-page warnings after selecting a map coordinate.
Focused live checks showed:

- `/api/tago/health` succeeded for key, city, route, route-stop order, and
  timetable.
- `getSttnThrghRouteList` with `nodeId=GMB16` returned 300 routes.
- `getSttnThrghRouteList` with `nodeid=GMB16` returned the expected 9 routes.
- Direct route planning failed with HTTP `429` before the parameter fix.

## Prevention Rule

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

## Verification

- Live direct route check for `경상북도 구미시 인동20길 70` returned 6 direct
  candidates instead of failing.
- `POST /api/plans` for that coordinate returned `source: "tago"` with route
  `187` from `강동병원앞` to `구미역(중앙시장)`.
- `npm run test:planner`, including provider-boundary coverage for the
  `nodeid` parameter.
