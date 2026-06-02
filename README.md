# 구미역 기차 언제 타지?

Gumi Station train departure helper built with Next.js App Router. Users enter a
train departure time and starting place; the app keeps Gumi Station fixed as the
destination and recommends when to leave and which demo bus plan to follow.

## Getting Started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

## Local Checks

```bash
npm run lint
npm run test:planner
npm run typecheck
npm run build
npm run check:harness
```

`npm run check:harness` runs the local harness verification path for this repository: lint, TypeScript, production build, and lightweight docs/structure drift checks.

`npm run test:planner` runs the focused source-branch checks for TAGO, Gumi BIS timetable, and mock planner fallback behavior.

Live/public-data diagnostics such as `node scripts/check-tago-backend.mjs` and `node scripts/check-gumi-bis-offset.mjs` are kept outside `check:harness` because they depend on external providers, credentials, network behavior, or public endpoint stability.

## Harness Notes

This repository uses prompt-first harness engineering guidance in `AGENTS.md` and `docs/`. The local `harness-starter-kit/` directory is a read-only reference clone and is ignored by Git. Do not commit it unless the repository intentionally converts it into a tracked reference or submodule.

External API and custom verification work should follow the checklists in `docs/checklists/`.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
