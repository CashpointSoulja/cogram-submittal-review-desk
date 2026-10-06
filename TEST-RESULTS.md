# Test results

Every block below is pasted command output from Ayo's build machine, 6 Oct 2026, Node v24.19.0. CI repeats `npm test` and `npm run evals` on Node 22 before each Pages deploy.

## 1. Unit tests: `npm test`

```
ℹ tests 205
ℹ suites 17
ℹ pass 205
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 181.748639
```

Tests per suite:

| Suite | Tests |
|---|---|
| Holloway Yard submittals | 35 |
| audit trail | 11 |
| checkCompleteness | 10 |
| checkJudgment | 4 |
| checkLeadTime | 8 |
| checkQuantities | 7 |
| checkSpec | 7 |
| checkStandards | 10 |
| compare | 17 |
| computeQuantity | 7 |
| eval lab | 28 |
| metrics | 6 |
| normaliseStandard | 10 |
| rankOf | 8 |
| review flow | 23 |
| revisions | 10 |
| spec integrity | 4 |
| **Total** | **205** |

## 2. Golden-set evals: `npm run evals`

```
Golden set: 24 cases, 21 seeded defects
GOLD-01  expect []  found []  ok  Clean glulam package
GOLD-02  expect [S1]  found [S1]  ok  Glulam below strength class
GOLD-03  expect [C1]  found [C1]  ok  Glulam missing declaration of performance
GOLD-04  expect [T1, T2]  found [T1, T2]  ok  Glulam designed to withdrawn code
GOLD-05  expect []  found []  ok  Clean CLT floor package
GOLD-06  expect [S1]  found [S1]  ok  CLT panel too thin
GOLD-07  expect [D3]  found [D3]  ok  CLT schedule total mistyped
GOLD-08  expect [D4]  found [D4]  ok  CLT area short of drawing take-off
GOLD-09  expect [S1]  found [S1]  ok  Curtain wall over U-value limit
GOLD-10  expect [C2]  found [C2]  ok  Curtain wall transmittal unsigned
GOLD-11  expect [D1]  found [D1]  ok  AHU lead time misses roof lift
GOLD-12  expect [S1]  found [S1]  ok  AHU fan power too high
GOLD-13  expect [S1]  found [S1]  ok  Penetration seal under-rated
GOLD-14  expect [C3]  found [C3]  ok  Installer certification missing
GOLD-15  expect [C4]  found [C4]  ok  Installer certification expired
GOLD-16  expect []  found []  ok  Clean concrete mix
GOLD-17  expect [S1]  found [S1]  ok  Water/cement ratio too high
GOLD-18  expect [C1]  found [C1]  ok  Trial mix results missing
GOLD-19  expect [S1]  found [S1]  ok  Rebar grade B500A in core walls
GOLD-20  expect [D3]  found [D3]  ok  Rebar mass overstated
GOLD-21  expect [D2]  found [D2]  ok  Rebar revision letter reused
GOLD-22  expect [S1]  found [S1]  ok  Pre-galvanised tray in plant room
GOLD-23  expect [S1]  found []  MISS  Weaker class hidden in a schedule note
GOLD-24  expect []  found [C4]  FALSE POSITIVE  Expired certificate with renewal in the pack
Caught 20/21 (95.2 %); missed 1; false positives 1; precision 95.2 %
Clean cases: 4, clean cases with any flag: 1
```

## 3. UI checks: headless Chromium at 390, 834 and 1440 px

Each route is loaded at each width. The script records `documentElement.scrollWidth` against `clientWidth`, lists any element extending past the viewport (scrollable board and table containers excluded), and collects console errors, warnings and page errors.

```
390 log {"sw":390,"cw":390,"h":2893,"wide":["A."]}
390 s/HY-SUB-G20-001 {"sw":390,"cw":390,"h":4489,"wide":["A."]}
390 audit {"sw":390,"cw":390,"h":27052,"wide":["A."]}
390 evals {"sw":390,"cw":390,"h":5743,"wide":["A."]}
390 metrics {"sw":390,"cw":390,"h":2287,"wide":["A."]}
390 about {"sw":390,"cw":390,"h":3322,"wide":["A."]}
390 console: none
834 log {"sw":834,"cw":834,"h":2454,"wide":[]}
834 s/HY-SUB-G20-001 {"sw":834,"cw":834,"h":3685,"wide":[]}
834 audit {"sw":834,"cw":834,"h":11872,"wide":[]}
834 evals {"sw":834,"cw":834,"h":2671,"wide":[]}
834 metrics {"sw":834,"cw":834,"h":1630,"wide":[]}
834 about {"sw":834,"cw":834,"h":2263,"wide":[]}
834 console: none
1440 log {"sw":1440,"cw":1440,"h":2287,"wide":[]}
1440 s/HY-SUB-G20-001 {"sw":1440,"cw":1440,"h":2385,"wide":[]}
1440 audit {"sw":1440,"cw":1440,"h":9879,"wide":[]}
1440 evals {"sw":1440,"cw":1440,"h":2525,"wide":[]}
1440 metrics {"sw":1440,"cw":1440,"h":1511,"wide":[]}
1440 about {"sw":1440,"cw":1440,"h":1951,"wide":[]}
1440 console: none
```

Result: page width equals viewport width on every route at all three widths. No console errors or warnings. At 390 px the nav row scrolls horizontally inside its own container; the page does not. Screenshots are in [`docs/screenshots/`](docs/screenshots/).

## 4. End-to-end walkthrough

The demo recording (`video/submittal-review-desk-demo.mp4`) is a real scripted run through the app at 540 × 960 (2×). It opens HY-SUB-G20-001, opens evidence G20/210, confirms S1, T1 and T2, notes and keeps the J1 concern, tries Approve (blocked, reasons shown), records Revise & Resubmit with a rationale, then exports the audit trail as CSV and JSON. The recording logged no page errors.
