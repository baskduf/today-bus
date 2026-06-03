# Decision 0014: Update Brand To Black White Handwritten Direction

- Date: 2026-06-03
- Status: Accepted

## Context

The product title and visual direction changed from the earlier friendly mint
mockup style. The user requested:

- project title: `구미역으로 가자`
- logo: `/Users/wb/Desktop/images/bus`
- white/black tone
- handwritten-feeling forms and fonts

This is a visible UX and brand direction change, but it does not change planner
inputs, transit APIs, fallback policy, or route-planning behavior.

## Decision

Use `구미역으로 가자` as the displayed product title and metadata title.

Copy the requested desktop bus image into `public/bus-logo.jpg` so the app can
serve it through the normal Next.js public asset path. Render it on the home
screen as the brand logo with grayscale/contrast treatment.

Move the shared design tokens to a black/white palette:

- white page and card surfaces;
- black text, borders, controls, selected states, and status emphasis;
- light gray only for secondary surfaces and low-emphasis highlights.

Use the Google `Gaegu` font through `next/font/google` as the global
handwritten family, and make form controls inherit it.

## Consequences

- Existing shared sketch components remain the styling boundary.
- Planner behavior and API response shapes are unchanged.
- Previous mint/coral/yellow status tones remain as semantic names in code, but
  they now render within the black/white visual system.
- Future UI work should follow `docs/design/component-rules.md` for the updated
  logo, palette, and handwritten typography direction.
