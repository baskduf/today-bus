# Harness Adoption Report

## Target Repository Observed

- Stack and framework: Next.js 16.2.7 App Router, React 19.2.4, TypeScript, Tailwind CSS 4.
- Package manager and commands: npm with `package-lock.json`; existing commands were `dev`, `build`, `start`, and `lint`.
- Local server, fixture, seed data, emulator, or device dependencies: local Next.js dev server only, via `npm run dev` on `http://localhost:3000`.
- Existing docs or agent instructions: create-next-app README, `CLAUDE.md` pointing to `AGENTS.md`, and a short `AGENTS.md` warning to read `node_modules/next/dist/docs/`.
- CI or verification path: no CI found; local npm scripts are the verification path.
- Monorepo or special layout: single app repository using `src/app/`.

## Files Added Or Changed

- `AGENTS.md`: expanded with project-specific commands, boundaries, harness workflow routing, knowledge-store rules, and completion criteria.
- `README.md`: corrected the edited page path to `src/app/page.tsx` and documented local checks and harness notes.
- `package.json`: added `typecheck` and `check:harness` scripts.
- `.gitignore`: added `tsconfig.tsbuildinfo` and ignored the local `harness-starter-kit/` reference clone.
- `scripts/check-harness.mjs`: added lightweight docs, structure, package-manager, and Next.js App Router drift checks using Node.
- `docs/conventions/coding.md`: added Next.js, TypeScript, styling, and verification conventions.
- `docs/decisions/0001-adopt-prompt-first-harness.md`: recorded this adoption decision.
- `docs/domain/glossary.md`: created the initial domain glossary.
- `docs/failures/README.md`: created the failure-memory location and criteria.
- `docs/checklists/`: added decision/failure memory, external API, and verification script checklists after harness update.
- `docs/harness/adoption-report.md`: recorded this adoption report.
- `docs/design/`: added mockup source tracking and component rules after the today-bus mockup reference was provided.
- `src/components/` and `src/lib/design/`: added shared today-bus UI tokens, doodle icons, and sketch-style primitives.
- `.harness/decision-memory-rules.json` and `scripts/check-harness.mjs`: added a non-failing decision-memory warning after `/harness update` refreshed the starter kit to `30a030573aa232dc71d876242621a665fbba8a86`.
- `.harness/source.json`, `AGENTS.md`, `docs/checklists/verification-scripts.md`, and this report: recorded the `/harness update` to kit commit `94e416b354facffafead6bbb9691af1598139389` and adopted gate-placement reporting guidance.
- `.harness/source.json`, `scripts/check-harness.mjs`, `docs/failures/`, `docs/checklists/decision-failure-memory.md`, and this report: recorded the `/harness update` to kit commit `fa76b7aa94506aa3ff2c9b256ee45368d418451b` and adopted failure-memory detection/prevention linkage.
- `.harness/source.json`, `scripts/check-harness.mjs`, `docs/decisions/0016-link-failure-memory-to-detection-checks.md`, and this report: recorded the `/harness update` to kit commit `7d6fac27d69229bfc954b662d24dea9984b1bc50` and adopted package-script validation for failure-memory detection commands.

## Existing Structures Reused

- Reused npm and `package-lock.json`; no package manager change.
- Reused existing `lint` and `build` commands.
- Reused existing `AGENTS.md` instead of creating a parallel agent-instruction file.
- Reused create-next-app layout and `src/app/` source structure.
- Reused `CLAUDE.md` as an alias to `AGENTS.md`.

## Checks Run

```bash
npm run lint
npm run build
```

Result: passed before harness adoption.

Additional checks are listed in the final turn report and should include:

```bash
npm run check:harness
python3 harness-starter-kit/scripts/check_effectiveness_plan.py --require-report
```

## Verification Gate Placement

- Normal completion gate: `npm run check:harness`.
- Deterministic behavior checks included in the normal gate: `npm run test:planner` is included in `check:harness` because it is deterministic, local, non-network, reasonably fast, and verifies coordinate-based direct route selection, TAGO provider parameter casing, Gumi BIS timetable, OpenRouteService and TMAP walking-route fixtures, mock fallback, stale arrival recomputation, and future train-time normalization behavior.
- Focused or manual checks outside the normal gate: `npm run check:walking-route`, `node scripts/check-tago-backend.mjs`, `node scripts/check-gumi-bis-offset.mjs`, browser smoke verification through `npm run dev`, and any live public-data diagnostics.
- Reasons for focused/manual placement: live TAGO, OpenRouteService, TMAP, and Gumi BIS checks depend on credentials, network behavior, public provider availability, quota, and current public-data state. Browser smoke is useful for visible UI work but remains manual because the repository has no stable automated browser test runner yet.

## Server Or Fixture Verification

- Required: yes, for visible UI work or local app smoke checks. Harness adoption itself does not change runtime behavior.
- How to run: `npm run dev` from the repository root, then open `http://localhost:3000`.
- Verification performed before adoption: local page rendered with the default heading.
- Not applicable: no database, seed data, emulator, device, or external fixture exists yet.

## External API Verification

- Required: yes when work touches TAGO, OpenRouteService, TMAP, Gumi BIS, planner fallback behavior, or related fixtures; not required for harness-only documentation updates.
- Boundary: ADR 0005 covers the TAGO-backed planner boundary, ADR 0006 covers the Gumi BIS timetable fallback boundary, ADR 0012 covers the TMAP pedestrian walking boundary, and ADR 0013 covers walking provider switching through OpenRouteService.
- Live/mock mode: `npm run test:planner` covers non-network planner branches, TAGO provider request-shape fixtures, and OpenRouteService/TMAP walking-route fixtures, and is included in `check:harness`. `npm run check:walking-route`, `scripts/check-tago-backend.mjs`, and `scripts/check-gumi-bis-offset.mjs` are focused live/public-data diagnostics and stay outside `check:harness`.
- Secret handling and redaction checked: TAGO service-key handling, ORS API-key handling, and TMAP app-key handling belong in server-only client boundaries. Reports and failure notes must not print service-key, API-key, or app-key values.
- Empty or zero-result behavior: TAGO zero-arrival, Gumi BIS fallback behavior, OpenRouteService empty-summary fallback behavior, and TMAP empty-summary fallback behavior are documented in ADR 0005, ADR 0006, ADR 0012, and ADR 0013 and covered by planner branch checks.
- Provider error handling: TAGO JSON/XML provider envelopes, OpenRouteService text errors, TMAP text errors, and Gumi BIS transport/runtime quirks are handled in the integration boundary; known Node TLS behavior is recorded in Failure 0003. The external API dogfood note records the remaining provider text-error gap for invalid TAGO credentials.
- Focused smoke command or fixture: `npm run test:planner` is the deterministic branch check inside the normal gate; run live diagnostics only when the task requires provider/runtime verification.

## Feature Scenario Test Note

- Broad feature work: no. This adoption changes docs, scripts, and local checks only.
- Build-only validation is enough: no. Harness adoption should also run the harness drift check because it adds agent-facing docs and structure rules.
- Scenarios covered for broad feature work: not applicable.
- Manual or hardware-dependent checks: none.

## Failure Memory

- Recorded: none.
- Detection or prevention check: `scripts/check-harness.mjs` now checks that
  non-template `docs/failures/*.md` records name a concrete detection or
  prevention check, verifies package-manager command references against
  `package.json` scripts, and `npm run check:harness` runs that check in the
  normal completion gate.
- Skipped: no user-visible runtime failure, high-risk bug path, failed CI run, repeated agent mistake, or cross-environment mismatch was fixed during adoption.

## Documentation Updated

- `README.md`: local setup and checks.
- `AGENTS.md`: agent instructions and harness command routing.
- `docs/conventions/coding.md`: current code conventions.
- `docs/checklists/`: decision/failure memory, external API, and verification script guidance.
- `docs/design/component-rules.md`: mockup-derived component rules.
- `docs/decisions/`: adoption decision added.
- Behavior or integration decisions considered: no application behavior or external integration changed, so the harness adoption decision record is sufficient.
- Not updated: no contribution guide or CI docs exist yet.

## Profile Absorption

- Profile reviewed: `templates/profiles/nextjs/README.md` and TypeScript profile notes from the starter kit.
- Snippets adopted: `typecheck`, `check:harness`, Next.js generated-file warnings, and App Router completion guidance.
- Snippets adapted: Python drift scripts were adapted into one dependency-free Node script to preserve this repository's npm-centered workflow. External API and verification guidance was adapted into local `docs/checklists/` files.
- Snippets skipped or deferred: CI wiring, pre-commit hooks, copied profile directories, unused-export tooling, package/dependency boundary tools, and default live API smoke checks were skipped until the project has enough architecture and environment stability to justify them.

## Drift Checks Added

- Baseline doc or structure hygiene checks: local Markdown links, scratch filenames, required package scripts, npm lockfile, ignored generated/reference paths, required App Router files, required shared design-system files, and a non-failing decision-memory warning for watched implementation diffs without a decision-record change.
- Encoding or localization hygiene checks: not added. The repository has no localized source text, XML resources, PDF-derived docs, or prior mojibake evidence.
- Target-specific architecture checks: required `src/app/layout.tsx`, `src/app/page.tsx`, `next.config.ts`, npm lockfile, and Next.js docs rule in `AGENTS.md`.
- Not added: import boundary, unused export, and CI checks were deferred because the app currently has only the create-next-app starter surface.

## Effectiveness Measurement Plan

- Baseline available: No historical comparable agent-task data exists for this new repository.
- Comparable tasks to repeat or track: future UI copy/layout edits in `src/app/page.tsx`, adding a typed component under `src/`, and updating project docs or scripts without touching generated files.
- Primary metric: wrong-file edits plus first-pass `npm run check:harness` success.
- Review window: next 5 comparable agent changes after adoption.
- Results location: `docs/effectiveness/harness-effectiveness.md`.
- Task outcome records location: `docs/effectiveness/task-outcomes/`.

## Assumptions

- npm remains the package manager.
- The current Next.js App Router structure under `src/app/` is intentional.
- No CI provider is configured yet.
- The local `harness-starter-kit/` clone is reference material, not source code for this app.

## Remaining Manual Steps

- Decide whether to remove the local `harness-starter-kit/` clone before commit or keep it ignored for future `/harness` commands.
- Add CI only after choosing a CI provider and deciding which local checks should run remotely.
- Add real failure records only after a recurring or high-risk failure is found.

## Notes For Future Agents

- Do not blindly copy starter-kit templates into this repository.
- Do not blindly copy today-bus mockup bundles into app source; implement through the shared tokens and components.
- Use `docs/checklists/` before external API, verification script, decision-memory, or failure-memory work.
- Review gate placement when adding deterministic product-behavior checks; include stable local checks in `npm run check:harness` or record why they remain focused/manual.
- Use `AGENTS.md` as the source of truth for harness command routing and completion criteria.
- Keep this report updated only when harness adoption choices, checks, or effectiveness tracking materially change.
