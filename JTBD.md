# Jobs to be done

## Core job

**When** a submittal lands in my queue, **I want to** know straight away what is missing or wrong and which clause says so, **so I can** spend my review on the parts that need my judgment and return the rest the same day.

## Related jobs

| When… | I want to… | So I can… | Feature |
|---|---|---|---|
| I open a submittal | see the blockers first, with the clause beside each | decide in minutes whether it is even reviewable | Triage panel, severity order, evidence chips |
| I disagree with a flag | dismiss it with a reason | keep moving without losing the record | Override with required note |
| a clause needs taste or engineering judgment | have it called out, not quietly passed | make sure I actually look at it | J1/J2 "Needs reviewer" |
| a resubmission arrives | know whether it fixed the last problem and kept the revision sequence | avoid re-reviewing from scratch | D2 revision rule, package history |
| the programme is tight | see which submittals will arrive after they are needed | escalate early | D1 lead-time float |
| a dispute comes up months later | show exactly what was checked and why I decided | defend the decision | Audit trail CSV/JSON |
| I report to the project lead | show backlog and first-pass rate honestly | plan resources | Metrics panel |

## Forces

- **Push:** backlog, late resubmissions, liability for missed defects, repetitive checks.
- **Pull:** faster review, fewer cycles, defensible record, flags tied to the spec.
- **Anxiety:** "Will it approve something it shouldn't?" "Will I drown in false alarms?" Answered by no auto-approve, one-click override, and an eval lab that shows misses and false positives.
- **Habit:** reviewers trust their own markup. The Desk does not replace markup; it front-loads the checklist.
