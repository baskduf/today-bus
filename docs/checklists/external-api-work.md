# External API Work Checklist

Use this checklist when work touches TAGO, Gumi BIS, another public-data API, an
auth provider, webhook, payment provider, map service, or a backend fixture that
can return provider-specific errors.

## Boundary First

- Identify the server-only boundary that calls the external API.
- Identify the config source for base URL, API key, service key, timeout, and live/mock mode.
- Keep secrets out of client components, logs, screenshots, reports, and failure records.
- Redact query parameters and headers before printing request URLs or debug payloads.
- Document whether live calls are required for local verification or whether fixture/mock mode is normal.

## Response Model

Handle these cases as separate states instead of collapsing them into one error:

| Case | Expected handling |
| --- | --- |
| Transport failure | Preserve a sanitized reason and fail health/smoke checks clearly |
| TLS or certificate failure | Record runtime and endpoint; add failure memory if it should not recur |
| Provider error envelope | Parse provider error codes even when HTTP status is 200 |
| Provider text error | Treat responses such as `401 text/plain Unauthorized` as provider or transport errors, not unsupported parser formats |
| Empty or zero-result response | Return a deliberate empty state, not a crash or fake success |
| Malformed JSON or XML | Report parser context without logging secrets or full personal data |
| Schema drift | Keep a focused fixture or smoke check for changed fields |

For public-data APIs, check whether the provider can return XML, JSON, text
errors, or mixed envelopes under the same endpoint. Do not rely on content type
alone.

## Live And Mock Fallbacks

- Make live/mock selection explicit through the repository's existing config pattern.
- Do not silently fall back from live data to mock data in production paths.
- If fallback is intentional, expose the fallback reason without leaking secrets.
- Keep fixtures small and representative: success, zero-result, provider error, and malformed response.

## Health And Smoke Checks

Add or adapt a target-specific verification script when repeated API work depends
on runtime behavior that lint, typecheck, and build cannot prove.

Prefer checks that:

- verify required environment variables without printing values
- call a safe endpoint or fixture
- assert success, zero-result, provider-error envelope, and provider text-error handling where practical
- print a short summary of env, transport, parser, empty-state, and redaction axes
- exit nonzero on real failures
- can run independently from the full `check:harness` gate

Keep live API checks separate from `check:harness` unless they are stable, safe,
credential-light, and expected in the normal local environment.

## Completion Check

Before reporting completion for external API work, name:

- endpoint or fixture path verified
- live/mock mode used
- redaction behavior checked
- empty-result behavior checked, or why it was not applicable
- provider error envelope or provider text-error behavior checked
- command run for API smoke verification, if any
- decision or failure memory recorded, cited, or intentionally skipped
