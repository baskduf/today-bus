# Decision 0003: Implement MVP Flow With Mock Data

- Date: 2026-06-02
- Status: Accepted

## Context

Today-Bus needs to prove the core departure decision workflow before connecting
to real bus APIs. The MVP scope is three screens:

- Home/search
- Recommended plan list
- Recommended plan timeline detail

The key product answer is when the user should leave home. Bus numbers,
route-search complexity, maps, and live data are secondary until the user flow is
clear.

## Decision

Implement the MVP as App Router pages backed by fixed mock data:

- `/` collects trip inputs with defaults for 진평동, 구미역, 오늘 14:00, and safety buffer.
- `/plans` shows the recommended plan and alternatives from `src/lib/today-bus/mock-plans.ts`.
- `/plans/recommended` shows the detailed 13:03 to 13:53 action timeline for plan A.
- Search inputs are carried through URL query parameters so refresh and back
  navigation preserve the demo trip context.
- Interactive behavior stays in small client components, while route pages remain
  server components where practical.

## Consequences

- The MVP demonstrates the product decision structure without real transit API
  integration.
- Future API work can replace the mock data source without changing the screen
  hierarchy first.
- Alternative-plan and missed-bus behavior can grow from the existing plan status
  model: `safe`, `caution`, `danger`, `late`, and `too_early`.
- This decision intentionally avoids map-first UI and avoids treating the bus
  number as the primary information.
