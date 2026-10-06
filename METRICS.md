# Metrics

All figures in the prototype are from synthetic data. Time figures are **modelled** and labelled as such on screen.

## North star

**Median reviewer minutes per submittal** (receipt → decision, active time). Target for a pilot: −30 % against a two-week baseline on the same project.

## Shown in the prototype

| Metric | Definition | Prototype value | Denominator shown |
|---|---|---|---|
| Review time saved per submittal | modelled manual minutes − modelled assisted minutes | ~46 min (n = 14; 14.4 h → 3.7 h total) | yes, n = 14 |
| Backlog burn-down | weekly count of received and not yet decided | 10 open on 11 Jan 2027 | received line on the chart |
| First-pass acceptance rate | approved first submissions ÷ decided first submissions | 50 % (2 of 4) | yes; flagged as too small for a target |
| Clean on arrival | open submittals with no blocker or major | 2 of 10 | yes |

### Time model (assumption, to be replaced by measurement)

- By hand: 20 min + 8 min per clause checked + 3 min per document + 15 min if quantities are scheduled.
- With triage: 8 min + 4 min per flag + 6 min per judgment item.
- The model is in `public/js/metrics.js` (`TIME_MODEL`) and tested so assisted time never exceeds manual time.

## Guardrails

| Guardrail | Why | Threshold |
|---|---|---|
| Defects found on site traced to an approved submittal | catches rubber-stamping | must not rise vs baseline |
| Override rate per rule | high override = bad rule or bad extraction | review any rule > 20 % |
| Rule precision on the golden set | trust | ≥ 90 % before a rule ships |
| Catch rate on the golden set | coverage | tracked; misses listed by name |
| Judgment items with empty notes | blocked in code | 0 |

## Pilot measurement plan

1. Two weeks of baseline on one live project: log receipt time, open time and decision time per submittal (from Cogram's existing log and Procore timestamps).
2. Turn on triage for half of incoming packages, randomised by package.
3. Compare median active minutes, resubmission count per package, and first-pass rate. Report with n and spread; no claim below 30 decided submittals per arm.
