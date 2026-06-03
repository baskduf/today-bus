# Decision 0012: Use TMAP Pedestrian Routing For Origin Walk Time

- Date: 2026-06-03
- Status: Accepted

## Context

Decision 0011 added coordinate-based direct route planning, but the first
implementation estimated the walk from the selected origin coordinate to each
candidate boarding stop by dividing a straight/provider distance by 67 meters
per minute. That estimate is stable and cheap, but it can undercount or
overcount real walking time when crossings, blocks, pedestrian-only paths,
stairs, or stop-side access matter.

The product needs a better house-to-stop walk time without turning the app into
a full multimodal route planner.

## Decision

Use TMAP pedestrian routing as the optional server-side source for the
origin-to-boarding-stop walking segment.

The boundary is:

- `src/lib/tmap/walking.ts`: low-level TMAP pedestrian route client.
- `src/lib/transit/walking-route-provider.ts`: transit-facing provider wrapper.
- `src/lib/transit/direct-route-planner.ts`: asks the walking provider only
  after a nearby stop and a Gumi Station-bound direct route are validated.

TMAP is used only for the selected origin coordinate to candidate boarding stop
walk time. TAGO remains the source for nearby stops, route direction, and live
route arrivals. Gumi BIS remains the official timetable fallback.

The TMAP app key stays server-only in `TMAP_APP_KEY`. Live walking calls are
enabled when `TMAP_WALKING_MODE=live` or when `TMAP_APP_KEY` is present and no
mode override is configured. `TMAP_WALKING_MODE=estimate` keeps live walking
calls disabled. `TMAP_WALKING_BASE_URL` and `TMAP_WALKING_TIMEOUT_MS` are
available for endpoint and timeout overrides.

When TMAP is unavailable, unconfigured, returns an invalid response, or the
candidate stop has no coordinates, the planner keeps the existing distance
estimate. The response exposes the walk source on `itinerary.boardingStop`:

- `walkSource: "tmap_pedestrian"` for TMAP route time.
- `walkSource: "distance_estimate"` with `walkFallbackReason` for fallback.

## Consequences

- Dynamic direct route candidates can be scored with route-based walking time
  instead of only straight/provider distance.
- The planner still works without TMAP credentials and remains deterministic in
  default tests.
- TMAP failures do not break bus planning, but they are no longer silent because
  the itinerary records fallback metadata.
- The normal `npm run test:planner` gate includes fixture coverage for TMAP
  request shape, empty-summary handling, text-error redaction, and planner
  fallback behavior. Live TMAP smoke checks stay outside `check:harness`.
