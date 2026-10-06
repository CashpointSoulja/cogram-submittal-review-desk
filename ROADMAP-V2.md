# Roadmap V2

Ordered by value to the reviewer, with the eval lab driving priorities.

| # | Item | Why | Evidence from V1 |
|---|---|---|---|
| 1 | Extraction with source pages | Rules read declared values; reading them from the PDF, with a link to the page, is the real product | All S-flags depend on it |
| 2 | Parse schedule tables, not just summaries | Fixes the honest miss: a weaker class written in a member-schedule note | GOLD-23 miss |
| 3 | Recognise renewal letters for certificates | Fixes the known false positive | GOLD-24 false positive |
| 4 | Procore write-back | Post decision, status and rationale to the Procore submittal; attach the audit CSV | VIABILITY mapping |
| 5 | Clause-to-rule library per NBS section | Reuse rules across projects; practices own their templates | 14 rules, 8 sections hand-written |
| 6 | Per-rule precision dashboard from real overrides | Retire or fix noisy rules with data | Override notes in audit trail |
| 7 | Resubmission diff | Show what changed since the last revision and which flags it closed | E30-001 → E30-002 |
| 8 | Contract status codes | A/B/C, "approved as noted", configurable mapping | PRD risk |
| 9 | Programme import (P6 / MS Project) | D1 against the live programme, not a fixture | D1 lead-time rule |
| 10 | Consultant routing | Send a judgment item to the structural engineer with the clause attached | H11-002 bracket deviation |

Not planned: automatic approval of any kind.
