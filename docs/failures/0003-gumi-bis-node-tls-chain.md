# 0003. Gumi BIS HTTPS Fails In Node Fetch

## Date Observed

2026-06-02

## Failure Type

External API transport mismatch and cross-environment runtime risk.

## Goal

The server-side planner should be able to use the official Gumi BIS timetable
fallback when TAGO live arrivals are absent or unsuitable.

## What Happened Or Was Tried

The Gumi BIS timetable endpoint returned valid JSON with `curl`, but failed in
Node/Next.js server code with:

```txt
TypeError: fetch failed
cause: UNABLE_TO_VERIFY_LEAF_SIGNATURE
```

`openssl s_client` showed that the server returned only the leaf certificate for
`*.gumi.go.kr`, issued by `TuringSign RSA Secure CA 2`, so Node's default
certificate store could not build a trusted chain.

## Why It Failed

The planner reached the official timetable fallback path, but server-side fetch
failed and the API returned mock fallback even though the public timetable was
available.

Using `NODE_TLS_REJECT_UNAUTHORIZED=0` would have bypassed certificate
validation globally, which is not an acceptable application workaround.

## Current Replacement

Use the Gumi BIS HTTP endpoint for timetable JSON:

```txt
http://bis.gumi.go.kr/localbus/getTimetableInfo
```

The request contains only public route and schedule-type parameters. It does not
include the TAGO service key or any user secret.

## Detection Or Prevention Check

- `src/lib/gumi-bis/client.ts` keeps the Gumi BIS base URL on
  `http://bis.gumi.go.kr`.
- `tests/planner-branches.test.mjs` covers Gumi BIS timetable fallback behavior.
- `scripts/check-gumi-bis-offset.mjs` is the focused live/public-data smoke
  script for comparing TAGO arrivals with Gumi BIS timetable offsets.
- `npm run test:planner`

## Agent Guidance

If Gumi BIS fixes the HTTPS certificate chain, prefer HTTPS again after verifying
Node `fetch` succeeds without custom TLS settings. Do not use
`NODE_TLS_REJECT_UNAUTHORIZED=0` as an application workaround.
