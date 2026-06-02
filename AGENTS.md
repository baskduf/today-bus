<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 구미역 기차 언제 타지? Agent Instructions

## Project Overview

- Product: `구미역 기차 언제 타지?`
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
- If `./harness-starter-kit` is absent for a harness command, clone `https://github.com/baskduf/harness-starter-kit` into that path first, then treat it as read-only reference material.

## Knowledge Store

Inspect these before architecture, workflow, integration, or repeated-failure work:

- `docs/decisions/`
- `docs/conventions/`
- `docs/design/`
- `docs/domain/`
- `docs/failures/`
- `docs/harness/adoption-report.md`

Add or update durable docs when behavior, architecture, commands, conventions, known failures, or harness rules change. If a user-visible runtime failure, failed check, repeated agent mistake, data-loss risk, security issue, or cross-environment mismatch is fixed, add a `docs/failures/` record unless an existing record already covers it.

For structural product or workflow changes, mock/API boundary choices, major data models or state classifications, or UX principles that become code structure, add a `docs/decisions/` record or explicitly state which existing ADR covers the decision. A domain glossary update does not replace a decision record.

## Completion Criteria

- Review `git status --short` and avoid unrelated edits.
- Run the documented checks relevant to the change.
- For UI or server behavior changes, verify the local app with `npm run dev` and a browser or explain why build-only validation is enough.
- For structural behavior, workflow, mock/API boundary, data model, state, or UX changes, add/update a `docs/decisions/` record, cite the existing ADR that covers it, or explain why no decision record was needed.
- Keep README, AGENTS, and docs aligned when commands or conventions change.
- Summarize changed files, checks run, assumptions, remaining risks, and any manual follow-up.
