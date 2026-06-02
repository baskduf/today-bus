# Today-Bus Component Rules

Use these rules when building today-bus UI from the mockup references.

## Source Of Truth

- App implementation source: `src/components/` and `src/lib/design/`.
- Design reference source: `today-bus.zip` and the offline HTML listed in `docs/design/mockup-source.md`.
- Do not treat `frames/design-canvas.jsx`, `frames/ios-frame.jsx`, bundled HTML, or generated mockup wrappers as app components.

## Visual Language

- Tone: friendly, hand-drawn, high-readability transit planner.
- Base surfaces: pale mint background, warm cream cards, dark green-gray text.
- Accent colors:
  - Mint/green for primary safe actions and current plan state.
  - Coral for warnings, delays, and risky plans.
  - Yellow for highlights, selected safety buffer, and emphasis swipes.
- Shape language: organic rounded corners from the shared `.ob-card`, `.ob-r2`, `.ob-r3`, and `.ob-pill` helpers.
- Icons: simple line-drawn doodle icons with rounded caps and the `.ob-rough` filter.

## Shared Components

- `SketchCard`: use for grouped input panels, plan cards, warning cards, and timeline step cards.
- `SketchButton`: use for primary, soft, coral, and ghost actions.
- `Badge`: use for compact status, warning, and selected-state labels.
- `ObHeader`: use for app screen headers with optional back navigation.
- `Doodle` icons: use `src/components/icons/doodle-icons.tsx` before adding new hand-drawn SVGs.

## Implementation Rules

- Prefer `obColors` from `src/lib/design/tokens.ts` over raw hex values in app components.
- Prefer shared UI components before introducing a new repeated card, button, badge, or header pattern.
- Keep interactive behavior in client components at the smallest useful boundary.
- Keep mockup-only device frames, design canvas controls, and offline bundle code out of `src/`.
- Add a new shared component only when it removes repeated structure or protects a visible convention.

## Verification

- Run `npm run check:harness` after changing shared UI rules, tokens, icons, or components.
- For visible screen work, also run `npm run dev` and verify the page in a browser.
