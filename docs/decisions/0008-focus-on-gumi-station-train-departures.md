# Decision 0008: Focus On Gumi Station Train Departures

- Date: 2026-06-02
- Status: Accepted

## Context

The MVP initially asked for an origin, destination, and desired arrival time.
That made the product look like a general local bus planner, even though the
clearest user problem is narrower: catching a train at Gumi Station.

The destination is effectively fixed. Users need to enter their train departure
time and starting place, then get the time they should leave and the bus plan
that gets them to Gumi Station with enough station buffer.

## Decision

Position the product as `구미역 기차 언제 타지?`.

The planning input now treats `구미역` as the fixed destination station. The home
screen asks for:

- `trainDeparture`: the train departure time, normalized to the next future
  `오늘 HH:mm` or `내일 HH:mm` value.
- `origin`: the user's starting place, selected from a map coordinate on the
  home screen and carried with optional address metadata.
- `buffer`: minutes before the train departure when the user wants to be at
  Gumi Station.

The planner derives `arrival` from `trainDeparture - buffer`. In this codebase,
`arrival` means the Gumi Station arrival deadline used by the existing TAGO and
Gumi BIS planning logic. Planner responses include a `train` object so UI and
API callers can read the train departure, fixed destination station, station
arrival deadline, and station buffer without re-deriving them.

The existing demo route remains:

- origin place: `진평동`
- boarding stop: `진평중학교입구건너`
- route: `180` toward `구미역`
- alighting stop: `구미역(중앙시장)`
- destination station/place: `구미역`

## Consequences

- The destination input and favorite-destination shortcuts are removed from the
  first screen.
- Existing TAGO, Gumi BIS timetable, mock fallback, and place-to-stop itinerary
  boundaries stay intact.
- URL state and `POST /api/plans` prefer `trainDeparture` but keep `arrival` as
  the internal station-arrival deadline for compatibility.
- The app still does not support arbitrary destinations, train timetable lookup,
  or train departures beyond the next-day rollover used to keep selected times
  in the future.
