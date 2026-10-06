# PRD: Submittal Review Desk

Status: concept · Owner: Ayo Ahmed · Extends: Cogram RFI & Submittal management

## 1. Problem

On a mid-size commercial job, the design team reviews hundreds of submittals. Each one means reading a PDF pack, opening the right spec sections, and checking dozens of facts by hand: is every document here, is it signed, are the certificates in date, does the grade meet the clause, does the quantity add up, will it arrive in time. Most of those checks are mechanical, but they eat the reviewer's attention, so the judgment calls (does this fire seal evidence apply to CLT?) get less of it.

When a defect slips through, the cost lands on site: wrong material delivered, rework, or a stalled activity. When the reviewer catches it late, the cost is a resubmission cycle of one to three weeks.

**Hypothesis (to validate, not observed at Cogram):** at least half of returned submittals fail on a defect a rule could have found on arrival.

## 2. Users

| Persona | Need |
|---|---|
| Project architect / engineer (primary reviewer) | Spend review time on judgment, not on finding the missing certificate. Defend every decision later. |
| Design manager / project lead | See the backlog, what is blocked, and what is about to hit the programme. |
| Main contractor's package manager (indirect) | Get a clear, early, specific reason when something comes back. |

## 3. Goals and non-goals

Goals
1. Every incoming submittal is triaged before a reviewer opens it.
2. Every flag is explainable: the rule, the calculation, the clause text.
3. A person makes every decision. No automatic approval, ever.
4. Every check and decision is recorded and exportable.
5. The quality of triage is measured in the open, misses included.

Non-goals (V1)
- Reading PDFs into structured values (assumed upstream; see ROADMAP-V2).
- Writing decisions back to Procore (designed, simulated).
- Replacing the reviewer's stamp or the contract's review process.

## 4. Requirements

| # | Requirement | Acceptance | Built |
|---|---|---|---|
| R1 | Submittal log, board and list | 5 statuses; NBS/CAWS section on every card; filter by section | Yes |
| R2 | Completeness checks | Missing document (C1), unsigned transmittal (C2), missing certificate (C3), expired certificate (C4) | Yes |
| R3 | Spec cross-check | Declared value vs clause requirement (S1); missing or unparseable value (S2) | Yes |
| R4 | Standards verification | Required standards cited (T1); superseded standards flagged with replacement (T2) | Yes |
| R5 | Deterministic checks | Lead time vs programme (D1), revision sequence (D2), quantity sum (D3), take-off (D4); each shows its calculation | Yes |
| R6 | Judgment routing | Judgment clauses (J1) and declared deviations (J2) always marked "Needs reviewer" | Yes |
| R7 | Evidence chips | Every clause-backed flag opens the clause text with the requirement as code | Yes |
| R8 | Review flow | Confirm/override each flag; notes required for overrides and judgment; approve blocked while confirmed issues stand; rationale ≥ 15 chars | Yes |
| R9 | Audit trail | Timestamped events for receipt, every check, flag action, status change and decision; CSV and JSON export | Yes |
| R10 | Eval lab | 24 golden cases; catch rate, false positives, misses on screen | Yes |
| R11 | Metrics | Time saved per submittal (modelled), burn-down, first-pass acceptance with denominator | Yes |
| R12 | Tests | 100+ unit tests on the engine; run in CI before deploy | 205 |

## 5. Key design decisions

- **Rules as code, not a model.** Each check is a pure function with a one-line rule string shown in the UI. That is what makes a flag defensible in a dispute and testable in CI. Extraction (reading the PDF) is where a model belongs; the decision logic is not.
- **Severity drives the gate, not the suggestion.** Triage suggests "Revise & Resubmit" when a blocker or major is present, but it only suggests. The gate is: every flag resolved, no confirmed non-minor issue standing for an approval, rationale written.
- **Overrides are first-class.** A false positive costs one click and a note, and the note is evidence. The eval lab's false-positive case shows why.
- **Judgment is labelled, not hidden.** Appearance, substrate applicability and structural acceptance of a change are never scored by a rule.
- **Same Cogram surface.** Board lanes, window chrome, mono IDs and section codes match the existing RFI & Submittal product so this reads as a tab in it, not a new app.

## 6. Success metrics

See [METRICS.md](METRICS.md). North star: **median reviewer minutes per submittal**, with **first-pass acceptance rate** and **defects found on site** as guardrails.

## 7. Risks

| Risk | Mitigation |
|---|---|
| Reviewers rubber-stamp triage | Every flag needs an explicit action; judgment needs a note; no auto-approve path exists in code (tested). |
| False positives erode trust | Precision tracked per rule; one-click override with note; per-rule suppression in V2 only with audit. |
| Extraction errors feed wrong values | Show the source page for each declared value (V2); S2 flags when a value is missing or unreadable. |
| Spec clauses are not machine-readable | Start with the 20 % of clauses that carry most returns (grades, ratings, certificates, standards). |
