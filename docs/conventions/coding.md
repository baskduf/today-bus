# Coding Conventions

## Next.js App Router

- Keep routes, layouts, and page-level UI under `src/app/`.
- Read the relevant Next.js 16 documentation in `node_modules/next/dist/docs/` before changing framework APIs or route conventions.
- Prefer server components unless a component needs browser-only state, effects, event handlers, or DOM APIs.
- Add `"use client"` only at the smallest component boundary that needs it.
- Keep generated Next.js files and output untouched: `.next/`, `next-env.d.ts`, and `tsconfig.tsbuildinfo`.

## TypeScript

- Use the configured `@/*` alias for imports from `src/` when it improves clarity.
- Keep `strict` TypeScript behavior intact.
- Run `npm run typecheck` after TypeScript changes.

## Styling

- Use Tailwind CSS 4 utilities and `src/app/globals.css` theme tokens already present in the project.
- Keep styling changes close to the component being changed unless a shared convention is being added.
- For today-bus UI work, follow `docs/design/component-rules.md` and prefer shared components from `src/components/ui/` before introducing one-off cards, buttons, badges, or headers.

## Verification

- Use `npm run lint`, `npm run test:planner`, `npm run typecheck`, and `npm run build` for normal code changes that touch planner behavior, input semantics, or displayed transit decisions.
- Use `npm run check:harness` before completing broad changes or harness/documentation changes.
- For visible UI behavior, verify the page through `npm run dev` and a browser when practical.
