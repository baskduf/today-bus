<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 구미역 기차 언제 타지? Agent Instructions

## Project Overview

- Product: `구미역으로 가자`
- Repository/package identifier: `today-bus`
- Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4
- Package manager: npm with `package-lock.json`
- App source: `src/app/`
- Shared UI components: `src/components/`
- Design tokens: `src/lib/design/`
- Public assets: `public/`

## Core Rules

- Preserve the existing Next.js App Router structure and npm workflow.
- Keep code changes scoped to the requested behavior.
- Use local project patterns before adding abstractions, packages, or services.
- Do not edit generated output or dependency directories: `.next/`, `node_modules/`, `next-env.d.ts`, `tsconfig.tsbuildinfo`, `out/`, or `build/`.
- Do not edit or commit the local `harness-starter-kit/` reference clone. Treat it as read-only material.
- Do not add another package manager lockfile such as `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`, or `bun.lockb`.
- Do not copy mockup bundles or generated design-canvas code into app source. Use `docs/design/component-rules.md` and shared components instead.
- Do not leave drift-prone scratch files such as `temp_*`, `*_new.*`, `*_old.*`, `*_backup.*`, `*_fix.*`, or `*.bak`.

## Commands

Run the smallest relevant set for the change, and run the full harness check before finishing broad changes:

```bash
npm run lint
npm run test:planner
npm run typecheck
npm run build
npm run check:harness
```

Use `npm run dev` for local development. The default local URL is `http://localhost:3000`.

## Harness Workflow

- When asked for `/harness doctor`, read and follow `./harness-starter-kit/commands/harness-doctor.md`.
- When asked for `/harness update`, read and follow `./harness-starter-kit/commands/harness-update.md`.
- When asked for `/harness refresh`, read and follow `./harness-starter-kit/commands/harness-refresh.md`.
- When asked for `/harness review` or `/harness review sub-agent`, read and follow `./harness-starter-kit/commands/harness-review.md`.
- If `./harness-starter-kit` is absent for a harness command, clone `https://github.com/harnessworks/harness-starter-kit` into that path first, then treat it as read-only reference material.

## Knowledge Store

Inspect these before architecture, workflow, integration, or repeated-failure work:

- `docs/decisions/`
- `docs/checklists/`
- `docs/conventions/`
- `docs/design/`
- `docs/domain/`
- `docs/failures/`
- `docs/harness/adoption-report.md`
- `docs/evaluation.md`
- `docs/effectiveness/`

Add or update durable docs when behavior, architecture, commands, conventions, known failures, or harness rules change. If a user-visible runtime failure, failed check, repeated agent mistake, data-loss risk, security issue, or cross-environment mismatch is fixed, add a `docs/failures/` record unless an existing record already covers it.

For structural product or workflow changes, mock/API boundary choices, major data models or state classifications, or UX principles that become code structure, add a `docs/decisions/` record or explicitly state which existing ADR covers the decision. A domain glossary update does not replace a decision record.

If `npm run check:harness` prints a decision-memory warning, resolve it before the final report by adding or updating a decision record, citing the existing ADR that covers the change, or explicitly explaining why no decision memory is needed.

For live external API or public-data work, use `docs/checklists/external-api-work.md` and keep live smoke checks separate from `check:harness` unless they are stable and safe by default.

For harness effectiveness dogfood or evaluation work, read `docs/evaluation.md`, use `docs/templates/task-outcome.yaml` for individual observations, store filled records under `docs/effectiveness/task-outcomes/`, and do not claim effectiveness improvement from harnessed-only tracking unless a comparable baseline exists.

For substantial harness maintenance, decide before the final report whether task outcome evidence is needed. Record one when the work changes profiles, check scripts, command workflows, adoption workflow, dogfood or effectiveness evidence, first-pass verification results, known failure paths, failed CI or harness checks, cross-environment mismatches, or high-risk integration behavior. Skip records for trivial docs-only wording, typo, link-label, or formatting changes and state why; harness-maintenance records default `include_in_comparable_product_task_count` to `false`.

## Completion Criteria

- Review `git status --short` and avoid unrelated edits.
- Run the documented checks relevant to the change.
- For UI or server behavior changes, verify the local app with `npm run dev` and a browser or explain why build-only validation is enough.
- When adding deterministic, local, non-network, reasonably fast checks for product behavior, include them in the documented normal completion gate or explain why they remain focused/manual.
- For structural behavior, workflow, mock/API boundary, data model, state, or UX changes, add/update a `docs/decisions/` record, cite the existing ADR that covers it, or explain why no decision record was needed.
- For external API changes, report the endpoint or fixture verified, live/mock mode, redaction handling, empty-result handling, provider error envelope or text-error handling, and any focused smoke command used or intentionally skipped.
- Keep README, AGENTS, and docs aligned when commands or conventions change.
- Summarize changed files, checks run, assumptions, remaining risks, and any manual follow-up.
