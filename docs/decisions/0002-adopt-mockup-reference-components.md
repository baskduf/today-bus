# Decision 0002: Convert Mockup References Into Shared Components

- Date: 2026-06-02
- Status: Accepted

## Context

The repository has local today-bus mockup references: a root `today-bus.zip` and an offline HTML file in Downloads. They contain JSX screens, embedded/bundled assets, design-canvas wrappers, iOS frame wrappers, and a clear visual language for the app.

Those references are useful for UI direction but do not match the Next.js App Router source model.

## Decision

Use the mockups as reference material only. Capture their durable rules in `docs/design/`, and implement reusable app primitives as TypeScript components:

- `src/lib/design/tokens.ts`
- `src/components/icons/doodle-icons.tsx`
- `src/components/ui/sketch-card.tsx`
- `src/components/ui/sketch-button.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/ob-header.tsx`
- `src/components/ui/rough-svg-filters.tsx`

## Consequences

- Future UI work can follow the mockup style without unpacking large bundles.
- The app avoids generated HTML, global `window` exports, raw mockup wrappers, and design-canvas code.
- The harness check now expects the shared design-system files and docs to remain present.
