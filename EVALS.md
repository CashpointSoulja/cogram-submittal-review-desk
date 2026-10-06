# Evals

## Design

- **24 golden submittals** in `public/js/golden.js`, built from eight clean base packs (one per trade) with one seeded change each.
- **Expected codes** are what a careful human checker would raise. Judgment routing (J1/J2) is not scored as detection: it is routing, and it always fires.
- **Scoring** (`public/js/evals.js`): per case, compare the set of rule codes found with the set expected. Caught = expected ∩ found. Missed = expected − found. False positive = found − expected.
- Four cases are clean (no defect) so false positives on good packs are measured.
- The golden set is scored by the same `triage()` used on Holloway Yard. No separate eval-only path.

## Results (run `npm run evals`)

| Measure | Value |
|---|---|
| Cases | 24 |
| Seeded defects | 21 |
| Caught | 20 |
| Missed | 1 |
| False positives | 1 |
| Catch rate | 95.2 % |
| Precision | 95.2 % |
| Clean cases with any flag | 1 of 4 |

Per-case output is in [TEST-RESULTS.md](TEST-RESULTS.md).

## The honest miss: GOLD-23

*Weaker class hidden in a schedule note.* The pack declares GL28h, but note 4 of the member schedule says secondary beams B7–B9 come in GL24h from stock. The rules read the declared class only, so S1 does not fire. A reviewer who reads the schedule catches it.

This stays on screen in the eval lab, and a unit test pins it as a miss. Making it pass by matching the note text would be tuning to the test. The real fix is parsing schedule tables (ROADMAP-V2 #2).

## The false positive: GOLD-24

*Expired certificate with renewal in the pack.* The installer certificate record expired on 31 Dec 2026; a renewal letter sits on page 14 of the product data. The rules see only the certificate record and raise C4. The reviewer overrides with a note, and the override is logged. Fix: recognise renewal letters (ROADMAP-V2 #3).

## What these numbers do not say

- They measure the rules on clean, structured inputs. Real-world accuracy also depends on extraction, which is not built.
- 21 defects is a small set. The point is the method: every new rule ships with golden cases, and misses are listed by name.
