# Submittal Review Desk

**Live:** https://cashpointsoulja.github.io/cogram-submittal-review-desk/ (public, no sign-in)

> Independent concept by Ayo Ahmed. Not affiliated with Cogram. Synthetic project, people and companies.

## ELI5

When a building is designed, the architect writes a rulebook (the specification). Before the builder orders anything (beams, glass, fire seals), they send the architect a pack of paperwork called a **submittal** to say: "this is what we plan to buy". The architect checks the pack against the rulebook.

That checking is slow, and people miss things: a weaker grade of timber, a missing fire certificate, a total that doesn't add up. If a mistake gets through, the wrong thing arrives on site and the job waits weeks.

**Submittal Review Desk checks the boring parts first.** As soon as a pack arrives, it runs simple rules, the kind you could check with a ruler and a calculator. For each problem it points to the exact line of the rulebook. Anything that needs taste or judgment, it hands to a person. **It never approves anything by itself.** Every step is written down in a log you can download.

## The 30-second version

Cogram already syncs RFIs and submittals with Procore and triages incoming submittals. Review Desk is a concept for the next step: a review workspace where every submittal arrives **pre-checked**. Completeness, spec cross-checks, standards, lead time against the programme, revision sequence and quantity arithmetic run as plain code, and each flag carries the clause that justifies it. The reviewer confirms or overrides each flag, then approves, rejects or returns the submittal. The eval lab shows how often the rules are right, including the case they miss.

## What's in the prototype

| Area | What it does |
|---|---|
| Submittal log | 14 synthetic submittals for *Holloway Yard* (8-storey mass-timber office, London N7) across glulam, CLT, curtain wall, AHUs, fire stopping, concrete, rebar and containment. Board and list views. Statuses: Incoming, In Review, Approved, Rejected, Revise & Resubmit. NBS/CAWS-style section codes (E10, E30, G20, G21, H11, P12, Y40, Y63). |
| Triage panel | 14 rules (C1–C4 completeness, S1–S2 spec, T1–T2 standards, D1–D4 deterministic, J1–J2 judgment). Each flag shows the rule as code, the calculation, and clickable `§` evidence chips that open the clause text. |
| Review flow | Confirm or override each flag (override needs a note; judgment items need a note either way). Approve is blocked while a confirmed issue stands. Rationale required. |
| Audit trail | Every receipt, check, flag, confirm, override, status change and decision, timestamped. Export CSV or JSON. |
| Eval lab | 24 golden submittals with 21 seeded defects. Catch rate 95.2 % (20/21), 1 false positive, 1 honest miss shown on screen. |
| Metrics | Modelled review time saved per submittal, backlog burn-down, first-pass acceptance with its denominator. |

## Run it

No build step and no dependencies.

```bash
npm test          # 205 unit tests (Node built-in test runner)
npm run evals     # golden-set report
npm run serve     # http://localhost:4173
```

The site is the `public/` folder. GitHub Actions runs the tests and the evals, then deploys `public/` to Pages (`.github/workflows/pages.yml`).

## Repository map

```
public/            static site (index.html, css/, js/, assets/)
  js/spec.js       synthetic specification: clauses, programme, take-offs
  js/submittals.js 14 Holloway Yard submittals
  js/engine.js     rule engine (pure functions)
  js/review.js     reviewer workflow and decision gate
  js/audit.js      audit events, CSV/JSON export
  js/golden.js     24 golden cases;  js/evals.js scorer
  js/metrics.js    time model, burn-down, first-pass acceptance
tests/             205 unit tests
design/            BRAND.md, VISUAL-GUIDE.md, screenshots of the reference site
docs/screenshots/  prototype at 390, 834 and 1440 px
video/             demo video and SCRIPT.md
```

## Docs

[PRD](PRD.md) · [Five whys](FIVE-WHYS.md) · [JTBD](JTBD.md) · [Metrics](METRICS.md) · [Test plan](TEST-PLAN.md) · [Test results](TEST-RESULTS.md) · [Viability](VIABILITY.md) · [Roadmap V2](ROADMAP-V2.md) · [Evals](EVALS.md) · [Brand](design/BRAND.md) · [Visual guide](design/VISUAL-GUIDE.md) · [Video script](video/SCRIPT.md)

## Honest limits

- The declared values a rule reads (strength class, U-value, fire rating) are typed into the fixture. In a product they would come from reading the PDFs; that extraction step is the hard part and is not built here.
- Time-saved figures are a stated model, not measured.
- Clause wording is written for this concept. Standards are referenced by number only.
- The Cogram name and logo are used to show where the concept would sit. They belong to Cogram.
