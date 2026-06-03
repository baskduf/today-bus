# TMAP Walking Route Integration Notes

## Scope

Today-Bus can use TMAP pedestrian routing to improve the walking time from a
selected origin coordinate to a candidate boarding stop. It does not use TMAP to
choose bus routes, validate route direction, or replace TAGO/Gumi BIS timing.
OpenRouteService is also available as an alternate walking route provider.

## Endpoint

- Provider: TMAP API
- Endpoint: `POST https://apis.openapi.sk.com/tmap/routes/pedestrian`
- Request format: JSON body, WGS84 longitude/latitude coordinates
- Response format: GeoJSON-like `FeatureCollection`
- Summary fields used:
  - `features[].properties.totalDistance`: walking route distance in meters
  - `features[].properties.totalTime`: walking route duration in seconds

## Configuration

Do not expose the TMAP app key to client components.

- `TMAP_APP_KEY`: server-only TMAP app key.
- `WALKING_ROUTE_PROVIDER`: set to `tmap` to force TMAP when multiple walking
  providers are configured.
- `TMAP_WALKING_MODE`: `live` to use TMAP, `estimate` to force distance
  estimates. If omitted, a configured `TMAP_APP_KEY` enables live mode.
- `TMAP_WALKING_BASE_URL`: optional endpoint override for tests or controlled
  environments.
- `TMAP_WALKING_TIMEOUT_MS`: optional request timeout, default `3000`.

## Response Handling

The TMAP client must treat these as separate cases:

- successful summary route: use `totalTime` for `walkMinutesFromOrigin` and
  record `walkSource: "tmap_pedestrian"`;
- empty or malformed summary: fail the TMAP client call and let the planner use
  `walkSource: "distance_estimate"`;
- text provider errors such as unauthorized responses: preserve status and
  sanitized message without printing `TMAP_APP_KEY`;
- missing stop coordinates: skip TMAP and use the distance estimate with
  `walkFallbackReason: "missing_stop_coordinates"`;
- unconfigured or disabled TMAP: use the distance estimate with
  `walkFallbackReason: "provider_unavailable"`.

The planner never silently falls from live walking data to a fake route. It uses
the existing deterministic distance estimate and exposes the fallback reason in
the itinerary.

## Verification

Default deterministic checks:

```bash
npm run test:planner
```

The fixture tests cover request shape, redaction for text errors, empty-summary
handling, TMAP-disabled mode, TMAP duration use in candidate scoring, and
distance-estimate fallback.

Live smoke checks are intentionally separate from `check:harness` because they
depend on credentials, provider availability, network state, and current TMAP
quota.
