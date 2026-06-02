# Verification Script Patterns

Use this checklist when the repository needs more than lint, typecheck, tests,
and build to prove that a change works.

## When To Add A Script

Add or adapt a script when:

- a live or mocked backend path must be exercised repeatedly
- an external API can return provider-specific envelopes, zero results, or mixed JSON/XML responses
- a route table, generated output location, import boundary, or env contract is important enough to enforce
- the same manual smoke check has been run more than once
- `check:harness` has become opaque and needs clearer step summaries

Skip a script when:

- an existing test, lint rule, type check, or build step already gives a clear signal
- the check requires fragile local state that cannot be documented
- the script would only duplicate a one-off debugging command

## Script Shape

A good script should:

- use the repository's existing runtime and package manager
- print each verification axis before running it
- redact secrets and personal data
- use stable fixtures for provider errors and zero-result cases when live calls are not safe
- exit with a nonzero status on real failures
- support focused reruns when the full harness gate is too expensive
- when output is JSON or structured text, include explicit axis fields such as
  `redactionChecked`, `emptyStateChecked`, `providerErrorChecked`, and
  `fallbackChecked`
- avoid writing files unless the script is explicitly a generator

## Harness Commands

If a custom check becomes part of normal work, document it in `README.md` or
`AGENTS.md`. Include it in `check:harness` only if it is stable and safe by
default.

For this project, `npm run check:harness` is the normal local completion gate.
It includes `npm run test:planner` because the planner test is deterministic,
local, non-network, reasonably fast, and covers product behavior agents should
verify repeatedly.

Live/public-data smoke scripts such as `scripts/check-tago-backend.mjs` and
`scripts/check-gumi-bis-offset.mjs` should stay separate unless maintainers
decide they are stable enough for the default gate.

## Gate Placement

When adding a verification script or test for product behavior, decide where it
belongs before finishing the change.

Include deterministic, local, non-network, reasonably fast product-behavior
checks in the documented normal completion gate, or record why they remain
focused or manual.

Keep live API, credential, quota, provider-uptime, visual, device, slow, watcher,
or hardware-dependent checks outside the normal gate unless they are stable,
safe, and expected in this repository's normal local environment.

## Result Summary

At the end of a custom check, prefer a compact summary of what was checked:

```text
Harness smoke summary:
- env: required variables present, values redacted
- transport: provider endpoint reached
- parser: JSON and XML envelopes handled
- empty-state: zero-result fixture returns empty list
- redaction: request URL logs hide service keys
- flags: redactionChecked=true, emptyStateChecked=true, providerErrorChecked=true
```

The summary should describe verification axes, not just say the command passed.
