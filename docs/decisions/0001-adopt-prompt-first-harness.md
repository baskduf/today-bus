# Decision 0001: Adopt Prompt-First Harness Engineering

- Date: 2026-06-02
- Status: Accepted

## Context

This repository is a new Next.js App Router project with npm scripts, ESLint, TypeScript, Tailwind CSS, and no existing project-specific harness beyond a short `AGENTS.md` warning about Next.js version drift.

The user requested adoption of `https://github.com/baskduf/harness-starter-kit` using the prompt-first workflow. The kit is cloned into `harness-starter-kit/` as read-only reference material.

## Decision

Adopt a small repository-specific harness instead of copying starter-kit templates wholesale:

- Expand `AGENTS.md` with project commands, source boundaries, completion criteria, and `/harness` command routing.
- Add a minimal knowledge store under `docs/`.
- Add npm scripts for `typecheck` and `check:harness`.
- Use a local Node script for docs, structure, package-manager, and Next.js App Router drift checks.
- Ignore the local `harness-starter-kit/` clone so it does not get committed accidentally.

## Consequences

- Future agents have durable instructions and checks without needing this chat context.
- The harness stays aligned with this repository's npm workflow and avoids adding Python, CI, pre-commit, or new dependencies.
- The local kit clone should be removed or left ignored before committing unless the maintainer intentionally wants a tracked reference.
