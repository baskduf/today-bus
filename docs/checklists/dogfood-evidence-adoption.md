# Dogfood Evidence Adoption Checklist

Use this checklist before publishing TodayBus as dogfood evidence, adding a
README badge, adopting an aggregate effectiveness report, or claiming an
effectiveness benchmark from local task outcomes.

Dogfood evidence should make the repository easier to evaluate. It should not
turn a single target run into an unsupported effectiveness claim.

## Required Before Adoption

- Source tracking exists in `.harness/source.json` and names the kit source,
  commit, and update context.
- The target repository commit, branch, or PR being cited is stable and
  linkable.
- The report separates non-comparable setup or harness-maintenance work from
  comparable product-task outcomes.
- Each counted product task has a task outcome record with repository ref,
  prompt ref or prompt hash, expected boundary, known failure mode, files
  changed, first-pass verification, final verification, and inclusion flags.
- The target normal completion gate is named from the real workflow.
- Deterministic, local, non-network, reasonably fast behavior checks are either
  included in that normal gate or have a recorded reason for focused/manual
  placement.
- Live API, credential, provider-uptime, visual, device, slow, watcher, or
  otherwise fragile checks stay outside the normal gate unless this repository
  intentionally expects them in normal verification.
- Failure records exist for non-transient failed setup checks, failed harness
  checks, recurring agent mistakes, cross-environment mismatches, or high-risk
  bug paths that should not recur.
- Each failure record names a regression test, fixture, smoke check, lint rule,
  drift check, CI gate, or manual review point that detects or prevents
  recurrence, or explains why no check is practical.
- Every failed first-pass or final verification is linked to a target failure
  record, or the report explicitly states why the failure was not promoted and
  names the check that detects recurrence.
- Aggregate reports state clearly whether the evidence is baseline-vs-harnessed
  or harnessed-only tracking.
- Harnessed-only reports explicitly say they do not prove effectiveness
  improvement without a later comparison point.

## Required Checks

Run the target's normal gate and focused harness evidence validators before
adopting the evidence:

```bash
npm run check:harness
python3 harness-starter-kit/scripts/check_effectiveness_plan.py --require-report
python3 harness-starter-kit/scripts/check_failure_memory.py
```

## Reject Or Defer Adoption When

- The evidence relies on local-only paths without stable repository refs or
  prompt hashes.
- Setup failures are excluded from metrics but not evaluated for failure memory.
- Failed first-pass or final verification is recorded as a metric but has no
  linked target failure record, no skip rationale, and no recurrence-detection
  check.
- A template or placeholder task outcome is included in the effectiveness report
  or comparable product-task count.
- The aggregate report says product tasks are complete while also saying no
  product-task records are complete.
- The report uses Harness Doctor, passing checks, or fixture tests as proof of
  agent effectiveness.
- The target adopted starter-kit defaults blindly instead of preserving its own
  architecture, package manager, docs, commands, and conventions.

## Review Questions

- Does the report preserve this repository as the source of truth?
- Does it count only comparable product-task outcomes?
- Does it name the real normal gate and gate-placement decisions?
- Does it record misses honestly, including wrong-file edits and failed first
  verification?
- Does each failed first-pass or final verification have failure memory or an
  explicit skip rationale with a recurrence-detection check?
- Does it link failure memory to detection or prevention?
- Does it avoid claiming improvement unless there is a comparable baseline or
  later comparison window?
