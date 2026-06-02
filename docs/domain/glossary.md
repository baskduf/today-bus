# Domain Glossary

Today-Bus helps users decide when to leave home for irregular local bus
schedules. The MVP uses fixed mock data before real transit API integration.

Current technical terms:

- `today-bus`: The repository and application name.
- App Router: The Next.js routing model used under `src/app/`.
- Harness: Durable repository instructions, memory, and checks that help future coding agents work consistently.

Product terms:

- 출발 의사결정: The core service goal. The main answer is when the user should leave home, not which bus number exists.
- 추천 플랜: The primary route plan shown first. In the MVP this is plan A for 진평동 → 구미역.
- 대안 플랜: Backup plans shown for too-early or late outcomes, used when the recommended plan is missed or unsuitable.
- 놓친 뒤 전환: A recovery flow that moves from the recommended plan detail back to alternatives with the late plan highlighted as the next action.
- 안전 여유 시간: User-selected buffer time of 5, 10, or 15 minutes.
- 상태 분류: A plan can be `safe`, `caution`, `danger`, `late`, or `too_early`.
- mock data: Fixed demo transit data used until real bus APIs are introduced.
