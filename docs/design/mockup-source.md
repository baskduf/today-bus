# Mockup Source

The today-bus visual language comes from local mockup reference files. These files are reference material, not application source.

## Reference Files

- Root zip reference: `today-bus.zip`
  - SHA256: `f7daa40e6324965b72c0ff49ef0dd1e335450a7fe4fa14127d80dc59d411f5e0`
  - Contents observed: JSX mockup screens, design-canvas wrappers, iOS frame wrappers, and PNG screen captures.
- Offline HTML reference: `/Users/wb/Downloads/오늘버스 (오프라인).html`
  - SHA256: `a3ed716e02f8220609bee5bccd2bba2c6e9b7cad830e6707dd12c27427603402`
  - Contents observed: bundled React/Babel mockup, embedded fonts, inline scripts, and the same today-bus visual language.

## Usage Rules

- Do not copy bundled HTML, `ReactDOM.createRoot`, `window` exports, design-canvas wrappers, iOS frame wrappers, or generated inline styles into the Next.js app.
- Use the mockup only to extract durable product UI rules, tokens, icon style, and reusable component behavior.
- Implement app UI through `src/lib/design/tokens.ts`, `src/components/ui/`, and `src/components/icons/`.
- Keep `today-bus.zip` ignored unless the maintainer explicitly decides to track mockup artifacts.
- If a new mockup replaces these references, update this file, `docs/design/component-rules.md`, and the shared components together.
