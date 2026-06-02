# 0001. MVP Product Structure Was Implemented Before ADR Review

## Date Observed

2026-06-02

## Failure Type

Repeated agent mistake and durable memory gap.

## What Failed

The Today-Bus MVP routes, mock data boundary, URL query behavior, and
departure-time-first UX structure were implemented before a decision record was
created under `docs/decisions/`.

The domain glossary was updated, but that did not capture the architectural and
product-structure choices behind the implementation.

## How It Was Detected

The maintainer asked why no decision record had been added after the MVP
implementation.

## Prevention Rule

When a change turns product behavior into durable code structure, the agent must
add a `docs/decisions/*.md` record or explicitly name the existing ADR that
covers it. This applies to route flows, mock/API boundaries, user-flow state,
major data models, plan status classifications, and UX principles encoded in
components or pages.

Glossary updates are useful for terms, but they are not a substitute for
decision records.

## Verification

- `docs/decisions/0003-implement-mvp-flow-with-mock-data.md`
- `docs/decisions/0004-add-missed-bus-recovery-flow.md`
- `AGENTS.md` now includes the ADR trigger rule for structural product and
  workflow changes.
