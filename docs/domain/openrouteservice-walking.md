# OpenRouteService Walking Route Integration Notes

## Scope

Today-Bus can use OpenRouteService foot-walking to improve the walking time from
a selected origin coordinate to a candidate boarding stop. This source only
replaces the origin-to-stop walking duration. TAGO still owns nearby stops,
route direction, and live route arrivals. Gumi BIS still owns timetable
fallback.

OpenRouteService is based on OpenStreetMap data, so Korean pedestrian detail
must be treated as provider data that can vary by local map coverage.

## Endpoint

- Provider: OpenRouteService
- Endpoint: `POST https://api.openrouteservice.org/v2/directions/foot-walking`
- Request body:
  - `coordinates`: `[[startLng, startLat], [endLng, endLat]]`
  - `instructions`: `false`
  - `preference`: `recommended`
  - `units`: `m`
- Response summary fields:
  - `routes[0].summary.distance`: walking route distance in meters
  - `routes[0].summary.duration`: walking route duration in seconds

The client also accepts GeoJSON-style summaries under
`features[0].properties.summary` so endpoint variants can be fixture-tested
without changing planner code.

## Configuration

Do not expose the ORS API key to client components.

- `WALKING_ROUTE_PROVIDER`: `openrouteservice`, `tmap`, or `estimate`.
- `ORS_API_KEY`: server-only OpenRouteService API key.
- `OPENROUTESERVICE_API_KEY`: optional alias for the same key.
- `ORS_WALKING_MODE`: `live` to use ORS, `estimate` to force distance
  estimates.
- `ORS_WALKING_BASE_URL`: optional endpoint override for tests or controlled
  environments.
- `ORS_WALKING_TIMEOUT_MS`: optional request timeout, default `3000`.

Provider selection prefers OpenRouteService when an ORS key is present, then
TMAP when a TMAP key is present, then the deterministic estimate. Set
`WALKING_ROUTE_PROVIDER` to force a specific provider.

## Response Handling

The OpenRouteService client must treat these as separate cases:

- successful summary route: use `duration` for `walkMinutesFromOrigin` and
  record `walkSource: "openrouteservice_foot_walking"`;
- empty or malformed summary: fail the ORS client call and let the planner use
  `walkSource: "distance_estimate"`;
- provider error envelope: preserve sanitized provider code and message;
- text provider errors: preserve status and sanitized message without printing
  `ORS_API_KEY` or `OPENROUTESERVICE_API_KEY`;
- unconfigured or disabled ORS: use the distance estimate with
  `walkFallbackReason: "provider_unavailable"`.

## Verification

Default deterministic checks:

```bash
npm run test:planner
```

The fixture tests cover request shape, summary parsing, GeoJSON-style summaries,
text-error redaction, empty-summary handling, provider-disabled mode, and
provider selection.

Live ORS smoke checks are intentionally separate from `check:harness` because
they depend on credentials, provider availability, quota, network state, and
current OpenStreetMap coverage.

Focused live check:

```bash
npm run check:walking-route
```

Optional coordinate overrides:

- `WALKING_ROUTE_START_LAT`
- `WALKING_ROUTE_START_LNG`
- `WALKING_ROUTE_END_LAT`
- `WALKING_ROUTE_END_LNG`
