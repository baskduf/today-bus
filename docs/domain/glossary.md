# Domain Glossary

`구미역 기차 언제 타지?` helps users decide when to leave for Gumi
Station so they can catch a train. The MVP still uses the local bus planner and
demo route data behind that decision.

Current technical terms:

- `today-bus`: The repository/package identifier retained for npm and local
  paths.
- `구미역 기차 언제 타지?`: The product name shown to users.
- App Router: The Next.js routing model used under `src/app/`.
- Harness: Durable repository instructions, memory, and checks that help future coding agents work consistently.

Product terms:

- 출발 의사결정: The core service goal. The main answer is when the user should leave for Gumi Station, not which bus number exists.
- 기차 출발 시간: User-entered train departure time, currently in `오늘 HH:mm` format.
- 구미역 도착 기준: The internal station-arrival deadline, derived from `기차 출발 시간 - 구미역 도착 여유`.
- 추천 플랜: The primary route plan shown first. In the MVP this is plan A for 진평동 → 구미역.
- 대안 플랜: Backup plans shown for too-early or late outcomes, used when the recommended plan is missed or unsuitable.
- 놓친 뒤 전환: A recovery flow that moves from the recommended plan detail back to alternatives with the late plan highlighted as the next action.
- 구미역 도착 여유: User-selected station buffer of 5, 10, or 15 minutes before the train departure.
- 상태 분류: A plan can be `safe`, `caution`, `danger`, `late`, or `too_early`.
- mock data: Fixed demo transit data used until real bus APIs are introduced.
