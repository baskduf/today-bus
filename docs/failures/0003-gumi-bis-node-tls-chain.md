# Failure 0003: Gumi BIS HTTPS Fails In Node Fetch

- Date: 2026-06-02
- Status: Mitigated

## What Happened

The Gumi BIS timetable endpoint returned valid JSON with `curl`, but failed in
Node/Next.js server code with:

```txt
TypeError: fetch failed
cause: UNABLE_TO_VERIFY_LEAF_SIGNATURE
```

`openssl s_client` showed that the server returned only the leaf certificate for
`*.gumi.go.kr`, issued by `TuringSign RSA Secure CA 2`, so Node's default
certificate store could not build a trusted chain.

## Impact

The planner reached the official timetable fallback path, but server-side fetch
failed and the API returned mock fallback even though the public timetable was
available.

## Mitigation

Use the Gumi BIS HTTP endpoint for timetable JSON:

```txt
http://bis.gumi.go.kr/localbus/getTimetableInfo
```

The request contains only public route and schedule-type parameters. It does not
include the TAGO service key or any user secret.

## Follow-Up

If Gumi BIS fixes the HTTPS certificate chain, prefer HTTPS again after verifying
Node `fetch` succeeds without custom TLS settings. Do not use
`NODE_TLS_REJECT_UNAUTHORIZED=0` as an application workaround.
