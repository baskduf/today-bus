# Failure Memory

Recorded failures:

- `0001-missing-adr-for-mvp-product-structure.md`
- `0002-server-timezone-live-planning.md`
- `0003-gumi-bis-node-tls-chain.md`
- `0004-tago-stop-route-parameter-rate-limit.md`
- `0005-next-dev-validator-typecheck-artifact.md`

Add a dated Markdown record in this directory when a failure should not recur. Include:

- `## Date Observed`
- `## Failure Type`
- `## Goal`
- `## What Happened Or Was Tried`
- `## Why It Failed`
- `## Current Replacement`
- `## Detection Or Prevention Check`
- `## Agent Guidance`

The detection/prevention section must name the concrete test, fixture, smoke
check, lint rule, drift check, CI gate, or manual review point that would catch
the same bug path again. If no check is practical, name the blocker and the
future signal that should trigger review.
