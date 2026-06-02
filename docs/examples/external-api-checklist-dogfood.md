# External API Checklist Dogfood Note

- Date: 2026-06-02
- Target: `today-bus`, a Next.js App Router app using TAGO and Gumi BIS public
  data.
- Scope: mini dog-food of the new external API checklist against a real target
  with secrets, zero-result responses, provider errors, live/mock fallback, and
  focused smoke scripts.

This is a lifecycle note, not an effectiveness report. It does not claim reduced
agent mistakes. It records where the checklist helped during one external API
pass and where the checklist or target verification still needs refinement.

## Commands Run

```bash
npm run test:planner
node scripts/check-tago-backend.mjs
node scripts/check-gumi-bis-offset.mjs
TAGO_SERVICE_KEY=INVALID_DOGFOOD_KEY node scripts/check-gumi-bis-offset.mjs
```

Additional one-off probes checked that `TAGO_SERVICE_KEY` was configured without
printing its value, that `/api/tago/health` returned HTTP 200, that an invalid
test key produced an HTTP 401 `text/plain` provider response, and that
`getSafeTagoErrorMessage` redacted raw and encoded service-key forms.

## Observations By Checklist Axis

| Axis | What happened | Result |
| --- | --- | --- |
| Secret redaction | Redaction removed raw, encoded, and `serviceKey=...` forms from synthetic error messages. Live smoke script output did not print the configured key. | Good signal |
| Zero-result response | TAGO returned `arrivalCount: 0`; health reported `fallbackRequired: true` and `mockFallbackRequired: false` because Gumi BIS timetable data was available. | Good signal |
| Provider error envelope | The code handles XML public-data envelopes and TAGO header errors. The invalid-key probe returned HTTP 401 `text/plain` `Unauthorized`, which the current smoke path classifies as an unsupported response format. | Gap found |
| Live/mock fallback | Planner tests covered `tago`, `gumi_bis_timetable`, and `mock` sources. Live smoke returned `source: "gumi_bis_timetable"` for current zero-arrival conditions. | Good signal |
| Focused smoke script | `npm run test:planner` is deterministic. `check-tago-backend.mjs` and `check-gumi-bis-offset.mjs` are useful live diagnostics and correctly stay outside `check:harness`. | Useful, but can be clearer |

## Where The Checklist Helped

- It forced the review to separate a zero-result provider response from a
  provider failure. That distinction matched the live state: TAGO had no current
  arrival rows, but Gumi BIS provided usable timetable data.
- It made the live/mock fallback chain explicit in the report: TAGO first, Gumi
  BIS timetable second, mock last.
- It kept the smoke checks focused instead of adding live provider calls to the
  default harness gate.
- It surfaced redaction as a reportable verification axis instead of an implicit
  implementation detail.

## Where It Was Still Insufficient

- The provider-error guidance emphasized JSON/XML envelopes, but the invalid
  TAGO key returned HTTP 401 with `text/plain` `Unauthorized`. Public-data
  checklist language should include text provider errors as a first-class case.
- `check-tago-backend.mjs` prints useful status summaries, but it does not name
  `redactionChecked`, `emptyStateChecked`, or `providerErrorChecked` axes.
- Provider-error verification still required an ad hoc invalid-key probe. A
  focused fixture or safe diagnostic mode would make that repeatable without
  risking real secrets.
- The live smoke script proves the current happy/zero-result path, but it does
  not prove malformed response handling or all provider envelope variants.

## Follow-Up Candidates

- Keep external API checklist wording explicit about provider `text/plain`
  errors alongside XML, JSON, and mixed envelopes.
- Add a compact axis summary to `check-tago-backend.mjs`.
- Consider a fixture-backed provider-error test for TAGO normalization so the
  invalid-key probe stays optional.
- Keep live diagnostics outside `check:harness` unless maintainers decide the
  external provider and environment are stable enough for the default gate.

## Durable Memory Decision

No ADR was added. This pass did not change the product workflow, API boundary,
fallback policy, or data model. Existing ADR 0005 covers the TAGO-backed planner
boundary, and ADR 0006 covers the Gumi BIS timetable fallback.

No failure record was added. The invalid-key `text/plain` response is a
checklist and verification gap found during dog-food, not a user-visible runtime
failure in the app.
