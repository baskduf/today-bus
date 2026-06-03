# TAGO API Integration Notes

## Scope

Today-Bus has approved development access for these Ministry of Land,
Infrastructure and Transport TAGO bus APIs:

- `국토교통부_(TAGO)_버스정류소정보`
- `국토교통부_(TAGO)_버스노선정보`
- `국토교통부_(TAGO)_버스도착정보`
- `국토교통부_(TAGO)_버스위치정보`

The approved development period is 2026-06-02 to 2028-06-02. Each listed API
has a development traffic limit of 10,000 calls per day per detailed function.

Do not commit service keys. Store the public data service key only in local or
deployment environment variables, such as `TAGO_SERVICE_KEY`.

## Services

### Bus Stop Information

- Data name: `국토교통부_(TAGO)_버스정류소정보`
- Endpoint: `https://apis.data.go.kr/1613000/BusSttnInfoInqireService`
- Format: JSON + XML
- Reference doc: `오픈API활용가이드_국토교통부(TAGO)_버스정류소정보v1.0.docx`

Detailed functions:

- `/getCrdntPrxmtSttnList`: Search bus stops within 500m of GPS coordinates.
- `/getSttnNoList`: Search stop information by stop name and stop number.
- `/getSttnThrghRouteList`: List routes passing through a stop.
- `/getCtyCodeList`: List supported city codes.

Parameter note:

- `/getSttnThrghRouteList` must receive the stop id as `nodeid`, not `nodeId`.
  Using `nodeId` can cause TAGO to ignore the stop filter and return city-wide
  route results, which can trigger rate limits during coordinate route search.

Today-Bus use:

- Find Gumi `cityCode`.
- Find `nodeId` for 진평중학교 정류장.
- Find nearby origin-stop candidates from selected origin coordinates.
- Find candidate destination stop IDs near 구미역.
- Confirm which routes pass through the selected stop.

### Bus Route Information

- Data name: `국토교통부_(TAGO)_버스노선정보`
- Endpoint: `https://apis.data.go.kr/1613000/BusRouteInfoInqireService`
- Format: JSON + XML
- Reference doc: `오픈API활용가이드_국토교통부(TAGO)_버스노선정보v1.0.docx`

Detailed functions:

- `/getRouteInfoIem`: Get route basic information.
- `/getRouteNoList`: Search route list by route number.
- `/getRouteAcctoThrghSttnList`: List stops passed by a route.
- `/getCtyCodeList`: List supported city codes.

Parameter note:

- `/getRouteAcctoThrghSttnList` currently works with `routeId`; `routeid`
  returns empty results in local smoke checks.

Today-Bus use:

- Resolve Gumi route number `180` to a route ID.
- Confirm the stop order for 진평중학교 정류장 to 구미역 direction.
- Confirm route direction from a coordinate-selected origin stop to a managed
  Gumi Station destination stop.
- Build a route-stop cache for the demo route.

### Bus Arrival Information

- Data name: `국토교통부_(TAGO)_버스도착정보`
- Endpoint: `https://apis.data.go.kr/1613000/ArvlInfoInqireService`
- Format: JSON + XML
- Reference doc: `오픈API활용가이드_국토교통부(TAGO)_버스도착정보v1.0.docx`

Detailed functions:

- `/getSttnAcctoArvlPrearngeInfoList`: List real-time arrival and operation information by stop.
- `/getSttnAcctoSpcifyRouteBusArvlPrearngeInfoList`: List real-time arrival and operation information for a specific route at a stop.
- `/getCtyCodeList`: List supported city codes.

Today-Bus use:

- Fetch current expected arrivals for route `180` at 진평중학교 정류장.
- Derive "if missed" delay from the next available vehicle when the API returns
  multiple arrivals.
- Treat this as real-time "leave now / soon" data, not a complete future
  timetable.

### Bus Location Information

- Data name: `국토교통부_(TAGO)_버스위치정보`
- Endpoint: `https://apis.data.go.kr/1613000/BusLcInfoInqireService`
- Format: JSON + XML
- Reference doc: `오픈API활용가이드_국토교통부(TAGO)_버스위치정보v1.0.docx`

Detailed functions:

- `/getRouteAcctoBusLcList`: List GPS locations of buses on a route.
- `/getRouteAcctoSpcifySttnAccesBusLcInfo`: Get GPS location information for a bus approaching a specific stop.
- `/getCtyCodeList`: List supported city codes.

Today-Bus use:

- Cross-check whether a route vehicle is actually active.
- Improve reliability of "missed bus" or "approaching stop" messaging.
- Keep this optional for the first backend spike; arrival information is more
  important for the MVP decision flow.

## Required Identifiers For The Demo

Before replacing mock data, confirm and record:

- Gumi `cityCode`.
- Route `180` `routeId`.
- Origin stop `nodeId` for 진평중학교 정류장.
- Destination-side stop `nodeId` near 구미역.
- Route-stop order from origin stop to destination stop.
- Whether TAGO returns one or multiple upcoming arrival predictions for route
  `180` at the origin stop.

Confirmed demo identifiers:

- Gumi `cityCode`: `37050`
- Route `180` toward 구미역: `GMB18020`
  - Start: `구평예다음아파트2차`
  - End: `구미역(중앙시장)`
- Opposite route `180`: `GMB18010`
  - Start: `구미역`
  - End: `구평예다음아파트2차`
- Origin stop for 진평동 to 구미역 direction:
  - `nodeId`: `GMB780`
  - Name: `진평중학교입구건너`
  - Stop number: `10780`
  - Route order on `GMB18020`: `5`
- Destination-side stop:
  - `nodeId`: `GMB79`
  - Name: `구미역(중앙시장)`
  - Stop number: `10079`
  - Route order on `GMB18020`: `29`
- Current spike result: `/getSttnAcctoSpcifyRouteBusArvlPrearngeInfoList` for
  `cityCode=37050`, `nodeId=GMB780`, `routeId=GMB18020` can return no upcoming
  arrivals depending on current operation state.

## Response Handling Notes

TAGO endpoints are requested with `_type=json`, but the backend must still treat
the response format defensively:

- Normal successful responses can contain `body.items` as `""` when no rows are
  available.
- `body.items.item` can be absent, a single object, or an array.
- Public data portal service errors can be returned as XML under
  `OpenAPI_ServiceResponse/cmmMsgHeader` even when the caller requested JSON.
- The backend normalizes these cases in `src/lib/tago/client.ts` before the
  transit provider sees the data.
- Error messages, API responses, scripts, and docs must never include the TAGO
  service key or a full `serviceKey=...` query string.

## Official Timetable Fallback

TAGO real-time arrival data remains the first live source. When the
route-specific arrival lookup succeeds but returns zero rows, Today-Bus now
checks the official Gumi BIS timetable for the current demo route before using
mock fallback.

See `docs/domain/gumi-bis.md` for the Gumi BIS endpoints and confirmed route
`18020` timetable values.

Planner source priority for the supported demo route:

1. `tago`: TAGO route-specific live arrival exists and the resulting plan is
   not too early for the requested arrival time.
2. `gumi_bis_timetable`: TAGO has no live arrival, or the current live arrival
   is too early for the requested arrival time, and Gumi BIS official timetable
   is available.
3. `mock`: unsupported route, unsupported input, TAGO/BIS failure, or no usable
   timetable result.

The Gumi BIS timetable is route-start based. The planner estimates the demo
origin-stop pass time from confirmed TAGO route stop orders, so it is more
useful than mock data but still not stop-level real-time prediction.

## Backend Shape

The frontend should not consume TAGO responses directly. The app should expose
its own planning endpoint and translate TAGO data into Gumi Station train
departure-decision plans.

Planner endpoint:

```http
POST /api/plans
```

Request shape:

```json
{
  "origin": "진평동",
  "originPlaceName": "강동병원",
  "originAddress": "경북 구미시 인동20길 46",
  "originLat": "36.1001",
  "originLng": "128.4301",
  "originSource": "manual",
  "trainDeparture": "내일 14:10",
  "stationBufferMinutes": 10
}
```

The `originPlaceName`, `originAddress`, `originLat`, `originLng`, and
`originSource` fields are optional. They can be populated by the home page's
Kakao Maps map-click coordinate selection when `NEXT_PUBLIC_KAKAO_MAP_APP_KEY`
is configured.
When valid coordinates are present, the server planner first attempts
coordinate-based direct route planning:

1. Search nearby TAGO stops around the selected origin coordinate.
2. Read routes passing through those stops.
3. Validate that a route reaches a managed Gumi Station-side destination stop
   in the correct stop-order direction.
4. Use route-specific TAGO arrivals, or Gumi BIS timetable fallback, to create
   the departure plan.

If no direct candidate is found or provider lookup fails, the planner warns and
falls back to the existing fixed demo boarding stop `진평중학교입구건너`.

The destination is fixed to `구미역`. `trainDeparture` is the preferred time
input and is normalized to the next future `오늘 HH:mm` or `내일 HH:mm` value.
The planner derives the internal station-arrival deadline as `trainDeparture -
stationBufferMinutes`. When `trainDeparture` is present, that derived deadline
takes precedence over stale `arrival` query state. Existing callers may still
send `arrival` or `desiredArrivalTime` when they omit `trainDeparture`; those
are treated as the already-derived Gumi Station arrival deadline.

Response shape should stay close to `src/lib/today-bus/mock-plans.ts` so the
current UI can switch from mock data to backend data with minimal churn.
The response keeps `warnings: string[]` for the current UI, includes an
`itinerary` that separates places from bus stops, and may also include a
structured fallback:

```json
{
  "source": "mock",
  "train": {
    "departureTime": "오늘 14:10",
    "destinationStation": "구미역",
    "stationArrivalDeadline": "오늘 14:00",
    "stationBufferMinutes": 10
  },
  "itinerary": {
    "originPlace": {
      "label": "진평동"
    },
    "boardingStop": {
      "name": "진평중학교입구건너",
      "nodeId": "GMB780",
      "stopNo": "10780",
      "stopOrder": 5,
      "walkMinutesFromOrigin": 10
    },
    "route": {
      "routeNo": "180",
      "directionLabel": "구미역 방향",
      "tagoRouteId": "GMB18020",
      "oppositeTagoRouteId": "GMB18010",
      "timetableRouteId": "18020"
    },
    "alightingStop": {
      "name": "구미역(중앙시장)",
      "nodeId": "GMB79",
      "stopNo": "10079",
      "stopOrder": 29
    },
    "destinationPlace": {
      "label": "구미역",
      "walkMinutesFromAlightingStop": 7
    }
  },
  "fallback": {
    "reason": "no_arrival",
    "message": "TAGO 실시간 도착정보와 구미 BIS 공식 시간표에서 사용할 수 있는 미래 계획을 찾지 못해 mock 플랜으로 대체했습니다."
  },
  "warnings": [
    "TAGO 실시간 도착정보에 현재 180번 도착예정이 없어 구미 BIS 공식 시간표를 확인합니다."
  ]
}
```

Fallback reasons:

- `unsupported_route`: reserved for future broader route support. The current UI
  does not expose arbitrary destinations because the destination is fixed to
  `구미역`.
- `future_planning_not_supported`: the requested train departure or derived
  station-arrival deadline is not a supported `오늘/내일 HH:mm` value.
- `no_arrival`: TAGO lookup succeeded, but the route-specific origin-stop
  arrival list is empty and no usable timetable plan was available.
- `tago_error`: the public data API call failed or returned an error response.
- `timetable_error`: TAGO and Gumi BIS timetable lookup did not produce a usable
  plan.

Operational health endpoint:

```http
GET /api/tago/health
```

The health response is non-secret and reports:

- whether `TAGO_SERVICE_KEY` is configured;
- whether Gumi city lookup succeeded;
- whether route `180` lookup found `GMB18020`;
- whether route stop order matches `GMB780` order `5` before `GMB79` order `29`;
- whether arrival lookup completed;
- current `arrivalCount`;
- whether TAGO live fallback is required;
- whether mock fallback is required after checking the Gumi BIS timetable;
- current Gumi BIS timetable lookup status.

An arrival count of `0` is a handled state: the arrival lookup can still be
`ok: true`, while `fallbackRequired: true`. If the Gumi BIS timetable returns
departures, `mockFallbackRequired` can still be `false`.

## First Spike Order

1. Add `TAGO_SERVICE_KEY` to local `.env.local`.
2. Run `node scripts/tago-spike.mjs`.
3. Confirm Gumi city code.
4. Confirm route `180`.
5. Confirm 진평중학교 and 구미역 stop IDs.
6. Confirm direction and stop order.
7. Confirm whether route-specific arrival predictions are currently available.
8. Decide whether the initial backend can support only "leave soon" decisions or
   also future arrival-time planning.
9. With the app running, run `node scripts/check-tago-backend.mjs` to verify
   `/api/tago/health` and `POST /api/plans` without printing the service key.

## Known Gap

TAGO bus arrival information is real-time arrival oriented. Today-Bus also wants
future arrival-time planning such as "arrive by today 14:00". If TAGO does not
provide enough timetable or headway data for the target city, the backend will
need an additional timetable/headway data source or a limited first release
focused on near-term departure decisions.

For the current 진평동 to 구미역 demo route, Gumi BIS official route-start
timetable data partially covers this gap. The remaining limitation is that the
planner estimates the origin-stop pass time instead of using stop-level
timetable data.
