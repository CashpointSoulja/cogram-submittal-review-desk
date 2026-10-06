# Viability: why this fits Cogram

## Which workflow it extends

Cogram's public RFI & Submittal page describes a log with lanes (Received, With Consultants, In Our Court, Issued), two-way Procore sync, and AI triage that checks incoming submittals against specifications and flags incomplete ones. Cogram's docs describe the Procore integration syncing RFIs and Submittals between the two systems.

Review Desk is the **next step inside that workflow**: what happens after triage, when a reviewer actually works the submittal. It adds:

1. Explainable flags, each tied to a rule and a clause.
2. A reviewer gate with confirm/override per flag.
3. An exportable audit trail of the review.
4. A public eval of triage quality.

## Mapping to the existing product

| Cogram today (public) | Review Desk concept |
|---|---|
| Submittal log with lanes | Same board pattern; adds outcome lanes (Approved, Rejected, Revise & Resubmit). In product these map to Procore submittal statuses; the Cogram lanes map as Received → Incoming, With Consultants / In Our Court → In Review, Issued → the three outcomes. |
| Two-way Procore sync | Submittals arrive from Procore (simulated here); decisions and the rationale would write back to the Procore submittal's response and status. The audit export attaches to the Procore record. |
| AI triage vs specs, incompleteness flags | Formalised into 14 rules with clause evidence; the model's job narrows to extraction (reading values out of the PDF), where errors are visible through S2 flags. |
| Meeting minutes, field reports, email | Future: link a flag to the RFI or site report that resolved it. |

## Why submittal triage is the pain to go after

- **Volume and repetition:** most checks on a submittal are the same each time for a given section (grade, rating, certificate, standard). Repetition is where rules pay.
- **Cost asymmetry:** a missed defect costs weeks on site; an unnecessary flag costs a minute to override.
- **Liability:** architects and engineers need to defend decisions. An evidence-linked audit trail is a feature they can sell internally.
- **Procore gravity:** the submittal record already lives in Procore for most contractors. Living inside the sync means no new system for the contractor.

## Business case (hypothesis)

For a practice running 10 live projects with ~400 submittals each per year, saving 30 minutes per submittal is ~2,000 reviewer hours a year. At a blended £60/h that is ~£120k of capacity, before counting avoided resubmission cycles. These are assumptions to be tested in a pilot (see METRICS.md), not claims.

## Fit gaps (stated honestly)

- Specs in practice are NBS Chorus exports, Word or PDF. Clause parsing needs per-format work.
- The rules here are hand-written for one synthetic spec. A product needs a clause-to-rule library per section, maintained like templates.
- Approval semantics vary by contract (A/B/C codes, "approved as noted"). Status mapping must be configurable.
