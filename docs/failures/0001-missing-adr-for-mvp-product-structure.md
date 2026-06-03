# 0001. MVP Product Structure Was Implemented Before ADR Review

## Date Observed

2026-06-02

## Failure Type

Repeated agent mistake and durable memory gap.

## Goal

Structural product choices should be recorded in `docs/decisions/` when they
become durable code, so future agents can cite the decision instead of
re-litigating route flow, mock/API boundaries, or UX state.

## What Happened Or Was Tried

The Today-Bus MVP routes, mock data boundary, URL query behavior, and
departure-time-first UX structure were implemented before a decision record was
created under `docs/decisions/`.

The domain glossary was updated, but that did not capture the architectural and
product-structure choices behind the implementation.

## Why It Failed

The maintainer asked why no decision record had been added after the MVP
implementation.

Glossary updates are useful for terms, but they are not a substitute for
decision records.

## Current Replacement

When a change turns product behavior into durable code structure, the agent must
add a `docs/decisions/*.md` record or explicitly name the existing ADR that
covers it. This applies to route flows, mock/API boundaries, user-flow state,
major data models, plan status classifications, and UX principles encoded in
components or pages.

## Detection Or Prevention Check

- `docs/decisions/0003-implement-mvp-flow-with-mock-data.md`
- `docs/decisions/0004-add-missed-bus-recovery-flow.md`
- `scripts/check-harness.mjs` emits a decision-memory warning when watched
  implementation paths change without a `docs/decisions/` change, and
  `npm run check:harness` runs that warning in the normal completion gate.
- Manual review point `docs/checklists/decision-failure-memory.md` covers when
  a decision record is required.

## Agent Guidance

Do not treat a glossary update as enough for structural product or workflow
changes. Add an ADR, cite the existing ADR, or explicitly explain why no
decision memory is needed before finishing.
