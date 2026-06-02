# Decision 0007: Separate Places From Bus Stops

- Date: 2026-06-02
- Status: Accepted

## Context

Today-Bus asks for human place inputs such as `진평동` and `구미역`, but the
actual transit plan depends on specific bus stops and route direction.

The current demo route uses:

- origin place: `진평동`
- boarding stop: `진평중학교입구건너` (`GMB780`, stop number `10780`)
- route: `180` toward `구미역`
- alighting stop: `구미역(중앙시장)` (`GMB79`, stop number `10079`)
- destination place: `구미역`

If the product only displays place-to-place labels, users can miss the most
important action: which nearby stop to walk to, and which side/direction of the
route to board.

## Decision

Represent the demo trip as an explicit itinerary with separate place and stop
objects:

- `originPlace`: the user's requested or canonical starting place.
- `boardingStop`: the selected stop to walk to, including node ID, stop number,
  route stop order, and walk time from the origin place.
- `route`: the route number, direction label, TAGO route ID, opposite TAGO route
  ID, and Gumi BIS timetable route ID.
- `alightingStop`: the selected stop to get off at, including node ID, stop
  number, and route stop order.
- `destinationPlace`: the user's destination place and walk time from the
  alighting stop.

Keep existing `origin` and `destination` request fields for compatibility, but
planner responses now include `itinerary`. UI copy should prefer itinerary
fields when explaining what the user should do.

The home search form may populate the origin place through Kakao Maps keyword
search when `NEXT_PUBLIC_KAKAO_MAP_APP_KEY` is configured. Those selected place
coordinates are carried through the request and response as origin-place
metadata only. They do not yet change the selected boarding stop.

The first implementation remains demo-route scoped. It does not yet add browser
geolocation, address geocoding, stop candidate search, route ranking, or a
general multimodal planner.

## Consequences

- The app can say "walk to `진평중학교입구건너`" instead of only "`진평동` to
  `구미역`".
- The destination can distinguish `구미역(중앙시장)` bus stop from the `구미역`
  place.
- Future current-location work has a clear extension point: replace the fixed
  `boardingStop` with a selected nearby stop while preserving the itinerary
  response shape.
- A selected Kakao place can make the displayed origin more precise, but the app
  must warn that the demo boarding stop is still fixed until nearby-stop
  selection exists.
- Existing callers can continue using `effectiveInput`, `plans`, `source`,
  `tago`, and `timetable` while migrating to `itinerary`.
