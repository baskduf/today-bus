# Decision 0013: Use OpenRouteService For Walking Route Provider Switching

- Date: 2026-06-03
- Status: Accepted

## Context

Decision 0012 added TMAP pedestrian routing for the origin-to-boarding-stop
walking segment. Local live smoke checks against TMAP repeatedly returned
gateway key errors even after matching the documented request shape. The app
still needs an API-backed walking duration, but it should not block route
planning on a single domestic provider's app-key/IP policy.

## Decision

Add OpenRouteService foot-walking as a configurable walking route provider.

The provider selection is controlled by `WALKING_ROUTE_PROVIDER`:

- `openrouteservice`: use OpenRouteService when `ORS_API_KEY` or
  `OPENROUTESERVICE_API_KEY` is configured;
- `tmap`: use TMAP when `TMAP_APP_KEY` is configured;
- `estimate`: skip live walking APIs and use the deterministic distance
  estimate.

If `WALKING_ROUTE_PROVIDER` is omitted, the runtime prefers OpenRouteService
when an ORS key is configured, then TMAP when a TMAP key is configured, then the
distance estimate.

OpenRouteService uses:

- endpoint: `POST https://api.openrouteservice.org/v2/directions/foot-walking`;
- server-only key: `ORS_API_KEY` or `OPENROUTESERVICE_API_KEY`;
- response summary: route `distance` in meters and `duration` in seconds.

The planner still asks the walking provider only after a nearby stop and
Gumi-Station-bound direct bus candidate are validated. Provider failures,
missing keys, and missing stop coordinates keep falling back to the existing
distance estimate with itinerary metadata.

## Consequences

- TMAP is no longer the only API-backed walking provider.
- Local development can force `WALKING_ROUTE_PROVIDER=openrouteservice` to avoid
  failed TMAP key/IP checks.
- The app still needs an ORS API key for live OpenRouteService calls. Without a
  key, the planner continues using `walkSource: "distance_estimate"`.
- Default deterministic tests cover OpenRouteService request shape, summary
  parsing, provider errors, text-error redaction, and provider selection.
- Live ORS checks remain outside `check:harness` because they depend on
  credentials, quota, network state, and OpenStreetMap data freshness.
