# Test plan

## Scope

| Layer | What | How | Where |
|---|---|---|---|
| Rule engine | Every rule (C1–C4, S1–S2, T1–T2, D1–D4, J1–J2), helpers (standard normalisation, rank tables, revision sequence, quantity maths) | Node built-in test runner, table-driven unit tests | `tests/engine.test.js` |
| Fixtures | Each of the 14 Holloway Yard submittals raises exactly its expected flags; none is auto-approved | Unit tests | `tests/engine.test.js` |
| Review flow | Confirm/override rules, note requirements, approval gate, rationale | Unit tests | `tests/review-audit-metrics.test.js` |
| Audit | Event per check, CSV escaping, JSON round-trip, ordering | Unit tests | same |
| Metrics | Time model bounds, burn-down arithmetic, first-pass denominator | Unit tests | same |
| Evals | 24 golden cases; known miss stays a miss; known false positive stays one; headline numbers pinned | Unit tests plus `npm run evals` report | same, `scripts/run-evals.js` |
| UI | Routes render at 390, 834, 1440 px; no horizontal page overflow; no console errors or warnings | Headless Chromium (Playwright) script, screenshots inspected by eye | `docs/screenshots/` |
| End-to-end | Open a submittal → open evidence → resolve every flag → decide → see audit rows → export CSV and JSON | Headless Chromium walkthrough (same run that records the demo video) | `video/` |
| Publication | No tool or model attribution; synthetic names only; commits authored by Ayo Ahmed | `grep -ri -E` over the repo and `git log` | TEST-RESULTS.md |

## Invariants that must never break

1. `triage().autoApproved === false` and `disposition === 'needs-reviewer'` for every submittal.
2. `decisionBlockers(flags, {}, 'approved', …)` is non-empty for any submittal with a flag.
3. Judgment items cannot be resolved without a note.
4. GOLD-23 remains a miss until the extraction it needs exists. Fixing it by special-casing the note text is not allowed.

## Entry and exit

- CI runs `npm test` and `npm run evals` on every push to `main`; Pages deploys only if both pass.
- Exit: all unit tests pass, UI checks clean at three widths, publication grep returns no matches.
