# Domain Glossary

`구미역으로 가자` helps users decide when to leave for Gumi
Station so they can catch a train. The MVP still uses the local bus planner and
demo route data behind that decision.

Current technical terms:

- `today-bus`: The repository/package identifier retained for npm and local
  paths.
- `구미역으로 가자`: The product name shown to users.
- App Router: The Next.js routing model used under `src/app/`.
- Harness: Durable repository instructions, memory, and checks that help future coding agents work consistently.

Product terms:

- 출발 의사결정: The core service goal. The main answer is when the user should leave for Gumi Station, not which bus number exists.
- 기차 출발 시간: User-entered train departure date and time for the train the
  user wants to catch at Gumi Station. The UI sends explicit
  `YYYY-MM-DD HH:mm`; older clock-only inputs still normalize to the next
  future `오늘 HH:mm` or `내일 HH:mm` value.
- 구미역 도착 기준: The station arrival deadline used by the planner. It is
  derived from `기차 출발 시간 - 구미역 도착 여유` and is the latest acceptable
  Gumi Station arrival time, not the bus arrival time at a stop.
- 추천 플랜: The primary route plan shown first. In the MVP this is plan A for 진평동 → 구미역.
- 대안 플랜: Backup plans shown for too-early or late outcomes, used when the recommended plan is missed or unsuitable.
- 놓친 뒤 전환: A recovery flow that moves from the recommended plan detail back to alternatives with the late plan highlighted as the next action.
- 구미역 도착 여유: User-selected station buffer of 5, 10, or 15 minutes before the train departure.
- 상태 분류: A plan can be `safe`, `caution`, `danger`, `late`, or `too_early`.
- 좌표 기반 직행 계획: A server-side planning mode that uses selected origin
  coordinates to find nearby stops, direct Gumi Station-bound routes, and a
  replacement boarding stop for the fixed demo stop.
- 인근 정류장 후보: TAGO stops near the selected origin coordinate, currently
  treated as origin-stop candidates before route direction filtering.
- 구미역 하차 후보: Managed destination-side stops near Gumi Station that can
  complete a direct route from the selected origin stop.
- 보행 경로 시간: The origin-to-boarding-stop walking duration used by dynamic
  direct planning. It can use a configured walking route API such as
  OpenRouteService or TMAP, and falls back to the deterministic distance
  estimate with response metadata.
- TAGO 실시간 도착정보: Route-specific live bus arrival predictions for a
  boarding stop. This is the preferred timing source for leave-now or
  leave-soon decisions, but an empty successful response is a handled state and
  can trigger Gumi BIS timetable fallback.
- 구미 BIS 공식 시간표 fallback: The official Gumi BIS route-start timetable path
  used when TAGO has no usable live arrival, or when a live arrival would make
  the plan too early for the station arrival deadline. It estimates the
  origin-stop pass time from route stop order.
- mock fallback: The fixed demo-plan fallback used when the planner cannot make
  a usable timing decision from TAGO live arrivals or Gumi BIS timetable data,
  or when input is unsupported. It is a user-facing safety net, not proof that
  live providers succeeded.
- planner `source`: The response field that names the timing source used for
  the returned plan: `tago`, `gumi_bis_timetable`, or `mock`.
