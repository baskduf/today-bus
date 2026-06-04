# Gumi BIS Timetable Notes

## Scope

Gumi BIS is used as the official timetable fallback for the current Today-Bus
demo route when TAGO live arrivals have no usable route-specific timing at the
origin stop, or when a TAGO live arrival would make the user reach Gumi Station
too early for the station arrival deadline.

This source does not require a service key. Do not send or document the TAGO
service key when calling Gumi BIS.

Terminology:

- TAGO live arrivals: real-time route-specific arrival predictions from TAGO.
- Gumi BIS timetable fallback: route-start timetable planning with an estimated
  origin-stop pass time.
- mock fallback: fixed demo plans used when no usable timing result can be
  planned from TAGO or Gumi BIS.

## Endpoints

The public timetable page is:

- `https://bis.gumi.go.kr/localbus/timetable`

The page calls these JSON endpoints:

- `POST http://bis.gumi.go.kr/localbus/selectBusRouteList`
- `POST http://bis.gumi.go.kr/localbus/setAllBusRouteInfo`
- `POST http://bis.gumi.go.kr/localbus/getTimetableInfo`

The backend uses HTTP for these calls because the Gumi BIS HTTPS endpoint does
not provide the full certificate chain required by Node's default certificate
store. The timetable data is public and the request contains no service key or
user secret.

## Demo Route

Gumi BIS route candidates for route `180`:

- `18010`: `구미역_구평예다음아파트`
- `18020`: `구평예다음아파트_구미역`

Today-Bus uses `routeId=18020` because the demo trip is 진평동 to 구미역.

Route info for `18020`:

- Route number: `180`
- Start stop: `구평예다음아파트2차`
- Last stop: `구미역(중앙시장)`
- Remark: `구평예다음아파트_구미역`

## Timetable Query

Request body:

```txt
routeId=18020&bType=0
```

Schedule type mapping:

- `bType=0`: weekday
- `bType=2`: holiday/weekend

Confirmed weekday departures for `18020`:

```txt
06:15, 07:00, 07:20, 08:00, 08:10, 08:35, 09:20, 09:50,
10:25, 11:00, 11:40, 12:10, 12:40, 13:20, 14:00, 14:30,
15:05, 15:40, 16:10, 16:40, 17:15, 17:50, 18:30, 19:00,
19:35, 20:10, 20:50, 21:35
```

Confirmed holiday/weekend departures for `18020`:

```txt
07:00, 09:20, 11:40, 14:00, 16:10, 18:30, 20:50
```

## Planning Constraint

The timetable is route-start based, not origin-stop based. For the demo route,
the planner estimates the origin-stop pass time using the confirmed TAGO stop
orders:

- Origin order: `5`
- Destination order: `29`
- Existing demo ride estimate from origin to destination: `28` minutes

Current estimate:

- Route start to origin stop: about `5` minutes

This is good enough for demo planning but should be replaced by operator-provided
stop-level timetable data if it becomes available.

For coordinate-based direct route planning, the planner derives the candidate
Gumi BIS `routeId` from the TAGO route id by removing the `GMB` prefix, then
uses the same route-start-to-origin stop-order estimate. This is still a
fallback estimate; TAGO live route-specific arrivals remain the preferred
timing source when available.

If the Gumi BIS response has no usable timetable rows for the requested station
arrival deadline, the planner continues to mock fallback with a structured
fallback reason instead of treating the empty timetable as a live provider
success.

## Offset Observation

Use `node scripts/check-gumi-bis-offset.mjs` to compare TAGO live arrival data at
`GMB780` with the nearest Gumi BIS route-start timetable entry for route
`18020`.

The script loads `TAGO_SERVICE_KEY` from `.env.local` through the Next.js env
loader and never prints the key. It returns JSON containing:

- the current TAGO arrival count;
- the Gumi BIS departure count and schedule type;
- one match per usable positive `arrtime`;
- `observedOffsetMinutes` compared with the planner's current
  `plannerOffsetMinutes`.

If TAGO returns zero live arrivals, the script exits successfully with
`status: "unobservable"` and an empty `matches` array. This is a normal handled
state, not a failure.
