# Gumi BIS Timetable Notes

## Scope

Gumi BIS is used as the official timetable source for the current Today-Bus
demo route when TAGO real-time arrival data has no upcoming route-specific
arrival at the origin stop.

This source does not require a service key. Do not send or document the TAGO
service key when calling Gumi BIS.

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
