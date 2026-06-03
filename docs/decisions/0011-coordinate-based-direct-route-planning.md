# Decision 0011: Add Coordinate-Based Direct Route Planning

- Date: 2026-06-03
- Status: Accepted

## Context

Decision 0007 separated user places from bus stops and left a clear extension
point for replacing the fixed demo boarding stop. The home screen carries
map-click coordinates through `originLat` and `originLng`, and the planner can
use those coordinates instead of always calculating from the fixed
`진평중학교입구건너` stop.

For `구미역 기차 언제 타지?`, the next useful step is not a full multimodal
planner. The product still needs a narrow answer: given a starting coordinate
and a Gumi Station train departure time, which nearby stop and direct bus should
the user use today?

## Decision

Support coordinate-based direct route planning as the first dynamic origin-stop
selection mode.

The destination remains fixed to `구미역`. The first implementation supports:

- nearby origin stops from the selected coordinate;
- direct bus routes only, with no transfers;
- route direction validation through TAGO route stop order;
- a small managed list of Gumi Station-side destination stops;
- TAGO live route-specific arrivals as the first timing source;
- Gumi BIS route-start timetables as the fallback timing source when a matching
  timetable route id can be derived;
- mock/demo fallback only when dynamic direct planning cannot produce a usable
  plan.

The direct-route search runs behind the server-side planner boundary. Client
components may provide coordinates, but they must not call TAGO or hold the
TAGO service key.

Planner responses may include dynamic planning metadata so the UI and future
diagnostics can distinguish:

- fixed demo planning;
- dynamic direct route planning;
- mock fallback.

## Consequences

- A selected Kakao place can now change the boarding stop and route when a
  direct Gumi Station route is found.
- The app still does not support arbitrary destinations, transfers, train
  timetable lookup, more-than-next-day train departures, or full route ranking.
- Dynamic planning needs deterministic fixture tests because live TAGO and Gumi
  BIS state are not stable enough for the default harness gate.
- The route-start timetable offset remains an estimate based on stop order and
  should be replaced with stop-level timetable data if the provider exposes it.
