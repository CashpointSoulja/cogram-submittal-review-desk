import { PROJECT, SECTIONS, CLAUSE_INDEX, SCHEDULE_INDEX, DOC_LABELS, CERT_LABELS, TAKEOFFS } from './spec.js';
import { SUBMITTALS } from './submittals.js';
import { triageAll, RULES, computeQuantity, round, leadTimeFloat } from './engine.js';
import { STATUSES, STATUS_LABEL, resolveFlag, clearResolution, unresolved, decisionBlockers, applyDecision, startReview, MIN_RATIONALE } from './review.js';
import { triageEvents, resolutionEvent, decisionEvent, auditEvent, toCSV, toJSON, sortEvents } from './audit.js';
import { runEvals } from './evals.js';
import { timeSaved, burndown, firstPass, readyForReview, TIME_MODEL } from './metrics.js';
import { shortDate, longDate } from './dates.js';

const STORE = 'srd-state-v1';
const TEST_RUN = { total: 205, pass: 205, fail: 0, suites: 17, command: 'npm test' };
const $main = document.getElementById('main');
const $ev = document.getElementById('evidence');
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pct = (x, dp = 0) => `${(x * 100).toFixed(dp)}%`;
const TRIAGED = triageAll(SUBMITTALS);
const EVALS = runEvals();

function seedState() {
  const subs = SUBMITTALS.map((s) => structuredClone(s));
  const resolutions = {};
  let events = [];
  for (const s of subs) {
    const at = `${s.submittedOn}T09:00:00.000Z`;
    events.push(auditEvent(`${s.submittedOn}T08:59:00.000Z`, 'Procore sync (simulated)', 'submittal.received', s.id, s.revision, '', `${s.title} from ${s.company}`));
    events = events.concat(triageEvents(s, TRIAGED[s.id], at));
    resolutions[s.id] = {};
    if (s.seedReview) {
      const r = s.seedReview;
      const resAt = new Date(Date.parse(r.at) - 600000).toISOString();
      for (const [key, v] of Object.entries(r.resolutions)) {
        const flag = TRIAGED[s.id].flags.find((f) => f.key === key);
        resolutions[s.id][key] = { ...v, at: resAt };
        events.push(resolutionEvent(s, flag, resolutions[s.id][key], r.reviewer));
      }
      s.review = { decision: r.decision, rationale: r.rationale, reviewer: r.reviewer, decidedAt: r.at, resolutions: resolutions[s.id] };
      events.push(decisionEvent(s, s.review));
    }
  }
  return { subs, resolutions, events: sortEvents(events), view: 'board', trade: 'all', drafts: {}, decision: {}, auditFilter: 'all', auditType: 'all' };
}

function load() {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) { const s = JSON.parse(raw); if (s && s.subs?.length === SUBMITTALS.length) return s; }
  } catch (e) { /* storage unavailable: run in memory */ }
  return seedState();
}
let state = load();
function save() { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* ignore */ } }
const sub = (id) => state.subs.find((s) => s.id === id);

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2400);
}

// ---------- shared fragments ----------
const sevTag = (sev) => `<span class="sev sev-${sev}">${sev === 'review' ? 'Needs reviewer' : esc(sev)}</span>`;
const statusTag = (st) => `<span class="status st-${st}"><span class="dot"></span>${esc(STATUS_LABEL[st])}</span>`;
const chip = (id) => `<button type="button" class="chip chip-evidence" data-action="evidence" data-clause="${esc(id)}" aria-label="Open spec clause ${esc(id)}">${esc(id)}</button>`;
const sectionChip = (code) => `<span class="chip">${esc(code)} · ${esc(SECTIONS[code].trade)}</span>`;

function flagSummary(id) {
  const c = TRIAGED[id].counts;
  const parts = [];
  if (c.blocker) parts.push(`<span class="sev sev-blocker">${c.blocker} blocker${c.blocker > 1 ? 's' : ''}</span>`);
  if (c.major) parts.push(`<span class="sev sev-major">${c.major} major</span>`);
  if (c.review) parts.push(`<span class="sev sev-review">${c.review} needs reviewer</span>`);
  if (!parts.length) parts.push('<span class="sev sev-pass">No rule issues</span>');
  return parts.join('');
}

function windowBar(title, right = '') {
  return `<div class="window-bar"><div class="window-title"><span class="lights" aria-hidden="true"><i></i><i></i><i></i></span>
  <img class="mark" src="assets/brand/cogram-mark.svg" alt="" width="16" height="16"><span>${esc(title)}</span></div>
  <div class="window-tools">${right}<span class="sync"><span class="dot"></span>Synced from Procore (simulated)</span></div></div>`;
}

// ---------- views ----------
function viewLog() {
  const subs = state.subs.filter((s) => state.trade === 'all' || s.section === state.trade);
  const open = state.subs.filter((s) => ['incoming', 'in-review'].includes(s.status));
  const openFlags = open.reduce((t, s) => t + TRIAGED[s.id].flags.length, 0);
  const ready = readyForReview(state.subs, TRIAGED);
  const toolbar = `<div class="toolbar">
    <div class="seg" role="group" aria-label="View"><button type="button" data-action="view" data-v="board" aria-pressed="${state.view === 'board'}">Board</button><button type="button" data-action="view" data-v="list" aria-pressed="${state.view === 'list'}">List</button></div>
    <label class="lbl">Trade <select class="input" data-action="trade">${['all', ...Object.keys(SECTIONS)].map((k) => `<option value="${k}" ${state.trade === k ? 'selected' : ''}>${k === 'all' ? 'All sections' : `${k} · ${SECTIONS[k].trade}`}</option>`).join('')}</select></label></div>`;
  const body = state.view === 'board' ? board(subs) : list(subs);
  return `<div class="page-head"><p class="eyebrow">${esc(PROJECT.name)} · 8-storey mass timber · London N7</p>
  <h1>Submittals, checked before you open them</h1>
  <p class="lede">Every incoming submittal is run against the Holloway Yard specification first. Rule checks show the rule that fired and the clause behind it. Anything that needs judgment goes to a named reviewer. Nothing is approved automatically.</p></div>
  <div class="stats">
    <div><div class="k">Submittals</div><div class="v">${state.subs.length}</div><div class="s">8 trades, 14 packages</div></div>
    <div><div class="k">Awaiting review</div><div class="v">${open.length}</div><div class="s">${openFlags} flags raised by triage</div></div>
    <div><div class="k">Clean on arrival</div><div class="v">${ready.clean}<span class="muted" style="font-size:18px"> / ${ready.open}</span></div><div class="s">open items with no blocker or major</div></div>
    <div><div class="k">Auto-approved</div><div class="v">0</div><div class="s">by design: a person decides</div></div>
  </div>
  <div class="window">${windowBar('Submittals · Holloway Yard')}${toolbar}${body}</div>`;
}

function card(s) {
  return `<a class="card" href="#/s/${esc(s.id)}" data-id="${esc(s.id)}">
    <div class="card-top"><span class="card-id">${esc(s.id)} · Rev ${esc(s.revision)}</span></div>
    <div class="card-title">${esc(s.title)}</div>
    <div class="card-meta">${sectionChip(s.section)}<span>${esc(s.company)}</span><span>· ${shortDate(s.submittedOn)}</span></div>
    <div class="card-flags">${flagSummary(s.id)}</div></a>`;
}

function board(subs) {
  return `<div class="board" tabindex="0" aria-label="Submittal board">${STATUSES.map((st) => {
    const items = subs.filter((s) => s.status === st.id);
    return `<div class="col st-${st.id}"><div class="col-head"><span class="status st-${st.id}"><span class="dot"></span>${esc(st.label)}</span><span class="n">${items.length}</span></div>
    <div class="col-body">${items.map(card).join('') || '<div class="empty">Nothing here</div>'}</div></div>`;
  }).join('')}</div>`;
}

function list(subs) {
  const rows = subs.slice().sort((a, b) => STATUSES.findIndex((x) => x.id === a.status) - STATUSES.findIndex((x) => x.id === b.status) || (a.submittedOn < b.submittedOn ? 1 : -1));
  return `<div class="table-wrap"><table class="tbl stack"><thead><tr><th>Submittal</th><th>Section</th><th>Rev</th><th>From</th><th>Received</th><th>Triage</th><th>Status</th></tr></thead><tbody>
  ${rows.map((s) => `<tr><td><a class="rowlink" href="#/s/${esc(s.id)}">${esc(s.title)}</a><div class="mono muted">${esc(s.id)}</div></td>
  <td data-k="Section">${sectionChip(s.section)}</td><td data-k="Rev" class="mono">${esc(s.revision)}</td><td data-k="From">${esc(s.company)}</td>
  <td data-k="Received" class="mono">${shortDate(s.submittedOn)}</td><td data-k="Triage"><div class="chips">${flagSummary(s.id)}</div></td><td data-k="Status">${statusTag(s.status)}</td></tr>`).join('')}
  </tbody></table></div>`;
}

function quantitiesPanel(s) {
  const q = s.quantities;
  if (!q) return '';
  const fmt = (n) => round(n, 2).toLocaleString('en-GB');
  const lineQty = (l) => computeQuantity({ kind: q.kind, lines: [l] });
  const desc = (l) => q.kind === 'rebar' ? `${l.count} × H${l.dia} × ${l.lengthM} m` : q.kind === 'volume' ? `${l.count} × ${l.bMm}×${l.hMm} × ${l.lengthM} m` : q.kind === 'area' ? `${l.count} × ${l.areaM2} m²` : `${l.count}`;
  const total = computeQuantity(q);
  return `<div class="panel"><div class="panel-h"><span class="t">Quantities</span><span class="mono muted">recomputed from lines</span></div>
  <div class="table-wrap"><table class="tbl"><thead><tr><th>Line</th><th>Basis</th><th class="num">${esc(q.unit)}</th></tr></thead><tbody>
  ${q.lines.map((l) => `<tr><td>${esc(l.mark)}</td><td class="mono">${esc(desc(l))}</td><td class="num">${fmt(lineQty(l))}</td></tr>`).join('')}
  <tr><td><b>Σ lines</b></td><td></td><td class="num"><b>${fmt(total)}</b></td></tr>
  <tr><td>Stated on submittal</td><td></td><td class="num">${fmt(q.statedTotal)}</td></tr>
  ${q.takeoff ? `<tr><td>Drawing take-off</td><td class="mono">${esc(TAKEOFFS[q.takeoff].label)}</td><td class="num">${fmt(TAKEOFFS[q.takeoff].quantity)}</td></tr>` : ''}
  </tbody></table></div></div>`;
}

function flagBlock(s, f, decided) {
  const res = state.resolutions[s.id]?.[f.key];
  const draftKey = `${s.id}|${f.key}`;
  const draft = state.drafts[draftKey] ?? '';
  const rule = RULES[f.code];
  const evidence = f.clauses.length ? `<div class="chips"><span class="mono muted">Evidence</span>${f.clauses.map(chip).join('')}</div>` : '';
  const calc = f.calc ? `<div class="rule"><b>Calc</b>${esc(f.calc)}</div>` : '';
  let control;
  if (res) {
    control = `<div class="resolved ${res.action === 'confirm' ? 'ok' : 'ov'}"><span>${res.action === 'confirm' ? (f.severity === 'review' ? 'Concern confirmed' : 'Flag confirmed') : 'Flag overridden'} by ${esc(s.review?.reviewer || PROJECT.reviewer)}</span>${res.note ? `<span class="muted">“${esc(res.note)}”</span>` : ''}${decided ? '' : `<button type="button" class="btn btn-secondary btn-sm" data-action="undo" data-id="${esc(s.id)}" data-key="${esc(f.key)}">Undo</button>`}</div>`;
  } else if (decided) {
    control = '<div class="resolved muted">Not resolved before the decision</div>';
  } else {
    const ph = f.severity === 'review' ? 'Required: what did you check, and is it acceptable?' : 'Note (required to override)';
    control = `<div class="resolve"><textarea class="input" rows="2" data-draft="${esc(draftKey)}" placeholder="${esc(ph)}" aria-label="Reviewer note for ${esc(f.title)}">${esc(draft)}</textarea>
    <div class="resolve-row"><button type="button" class="btn btn-sm" data-action="resolve" data-do="confirm" data-id="${esc(s.id)}" data-key="${esc(f.key)}">${f.severity === 'review' ? 'Concern stands' : 'Confirm flag'}</button>
    <button type="button" class="btn btn-secondary btn-sm" data-action="resolve" data-do="override" data-id="${esc(s.id)}" data-key="${esc(f.key)}">${f.severity === 'review' ? 'Acceptable' : 'Override'}</button></div></div>`;
  }
  return `<div class="flag ${res ? 'is-done' : ''}" id="flag-${esc(f.key.replace(/[^a-z0-9]/gi, '-'))}">
    <div class="flag-top">${sevTag(f.severity)}<span class="flag-cat">${esc(f.code)} · ${esc(f.category)}</span></div>
    <h3>${esc(f.title)}</h3><p>${esc(f.detail)}</p>
    <div class="rule"><b>Rule ${esc(f.code)}</b>${esc(rule.rule)}</div>${calc}${evidence}${control}</div>`;
}

function decisionBlock(s) {
  const flags = TRIAGED[s.id].flags;
  if (s.review) {
    return `<div class="panel"><div class="panel-h"><span class="t">Decision</span>${statusTag(s.status)}</div><div class="panel-b decision">
    <p style="margin:0">${esc(s.review.rationale)}</p><p class="mono muted" style="margin:0">${esc(s.review.reviewer)} · ${esc(s.review.decidedAt.replace('T', ' ').slice(0, 16))} UTC</p></div></div>`;
  }
  const d = state.decision[s.id] || { choice: '', rationale: '' };
  const reasons = decisionBlockers(flags, state.resolutions[s.id] || {}, d.choice, d.rationale);
  const opt = (v, label) => `<button type="button" class="btn btn-secondary" data-action="choose" data-id="${esc(s.id)}" data-v="${v}" aria-pressed="${d.choice === v}">${label}</button>`;
  return `<div class="panel" id="decision"><div class="panel-h"><span class="t">Reviewer decision</span><span class="never">Triage suggests: ${TRIAGED[s.id].suggestion === 'revise-resubmit' ? 'Revise &amp; Resubmit' : 'no rule issues'} · you decide</span></div>
  <div class="panel-b decision"><div class="opts" role="group" aria-label="Decision">${opt('approved', 'Approve')}${opt('revise-resubmit', 'Revise &amp; Resubmit')}${opt('rejected', 'Reject')}</div>
  <textarea class="input" data-rationale="${esc(s.id)}" placeholder="Rationale for the record (at least ${MIN_RATIONALE} characters)" aria-label="Decision rationale">${esc(d.rationale)}</textarea>
  <div data-reasons="${esc(s.id)}">${reasonsList(reasons)}</div>
  <div><button type="button" class="btn" data-action="decide" data-id="${esc(s.id)}" ${reasons.length ? 'disabled' : ''}>Record decision as ${esc(PROJECT.reviewer)}</button></div></div></div>`;
}
const reasonsList = (r) => (r.length ? `<ul class="reasons">${r.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="mono" style="margin:0;color:var(--success-ink)">Ready to record</p>');

function viewDetail(id) {
  const s = sub(id);
  if (!s) return `<div class="page-head"><h1>Not found</h1><p><a href="#/log">Back to submittals</a></p></div>`;
  const t = TRIAGED[s.id];
  const decided = Boolean(s.review);
  const lt = leadTimeFloat(s);
  const act = SCHEDULE_INDEX[s.activity];
  const open = unresolved(t.flags, state.resolutions[s.id] || {}).length;
  const attached = new Set(s.attachments.map((a) => a.type));
  return `<a class="back" href="#/log">← All submittals</a>
  <div class="detail-head"><div><p class="eyebrow">${esc(s.id)} · Rev ${esc(s.revision)}</p><h1>${esc(s.title)}</h1>
  <div class="chips">${statusTag(s.status)}${sectionChip(s.section)}<span class="chip">${esc(SECTIONS[s.section].title)}</span></div></div></div>
  <div class="detail-grid">
    <div class="side-stack">
      <div class="panel"><div class="panel-h"><span class="t">Submittal</span></div><div class="panel-b"><dl class="meta">
        <dt>From</dt><dd>${esc(s.company)}</dd><dt>Package</dt><dd class="mono">${esc(s.package)}</dd>
        <dt>Received</dt><dd>${longDate(s.submittedOn)}</dd><dt>Lead time</dt><dd>${s.leadTimeWeeks} weeks</dd>
        <dt>Needed for</dt><dd>${act ? `${esc(act.id)} ${esc(act.name)}, starts ${longDate(act.start)}` : '—'}</dd>
        <dt>Float</dt><dd>${lt ? `${lt.floatDays} days` : '—'}</dd>
        <dt>Transmittal</dt><dd>${s.transmittal?.signed ? `Signed, ${esc(s.transmittal.signer)}` : '<span style="color:var(--destructive)">Unsigned</span>'}</dd>
        <dt>Summary</dt><dd>${esc(s.summary)}</dd></dl></div></div>
      <div class="panel"><div class="panel-h"><span class="t">Spec clauses checked</span></div><div class="panel-b chips">${s.clauses.map(chip).join('')}</div></div>
      <div class="panel"><div class="panel-h"><span class="t">Declared values</span></div><div class="panel-b">${Object.keys(s.properties).length ? `<ul class="plain">${Object.entries(s.properties).map(([k, v]) => `<li><span class="mono muted">${esc(k)}</span><span>${esc(v)}</span></li>`).join('')}</ul>` : '<span class="muted">None declared</span>'}</div></div>
      <div class="panel"><div class="panel-h"><span class="t">Attachments</span><span class="mono muted">${s.attachments.length + s.certificates.length} files</span></div><div class="panel-b"><ul class="plain">
        ${s.attachments.map((a) => `<li><span>${esc(DOC_LABELS[a.type])}</span><span class="mono muted">PDF</span></li>`).join('')}
        ${s.certificates.map((c) => `<li><span>${esc(CERT_LABELS[c.type])}</span><span class="mono ${c.expires < s.submittedOn ? '' : 'muted'}" ${c.expires < s.submittedOn ? 'style="color:var(--destructive)"' : ''}>exp ${esc(c.expires)}</span></li>`).join('')}
        ${!attached.size && !s.certificates.length ? '<li class="muted">No attachments</li>' : ''}</ul></div></div>
      <div class="panel"><div class="panel-h"><span class="t">Standards cited</span></div><div class="panel-b chips">${s.citedStandards.map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</div></div>
      ${quantitiesPanel(s)}
    </div>
    <div class="side-stack">
      <div class="panel" id="triage"><div class="panel-h"><span class="t">Triage</span><div class="triage-summary"><span>${t.checksRun} checks run</span><span>${t.flags.length} flagged</span><span>${t.passes.length} passed</span><span>${decided ? 'Decided' : `${open} open`}</span></div></div>
        <div class="panel-b"><div class="note-banner"><span>Triage ran on ${longDate(s.submittedOn)} when this arrived from Procore. Deterministic checks show the rule as code; clause chips open the exact spec text. Judgment items always come to you.</span></div></div>
        ${t.flags.map((f) => flagBlock(s, f, decided)).join('') || '<div class="flag"><h3>No rule flags</h3><p>Every rule passed. You still review and decide.</p></div>'}
        <details class="passes"><summary>${t.passes.length} checks passed</summary><ul class="plain">${t.passes.map((p) => `<li>${sevTag('pass')}<span class="mono muted">${esc(p.code)}</span><span>${esc(p.title)}</span>${p.clauses.map(chip).join('')}</li>`).join('')}</ul></details>
      </div>
      ${decisionBlock(s)}
    </div>
  </div>`;
}

function viewAudit() {
  const types = ['all', 'submittal.received', 'triage.run', 'check.pass', 'check.flag', 'flag.confirm', 'flag.override', 'status.change', 'decision'];
  const rows = filteredEvents().slice().reverse();
  const shown = rows.slice(0, 150);
  return `<div class="page-head"><p class="eyebrow">Audit trail</p><h1>Every check, flag and decision, with a time</h1>
  <p class="lede">Rules write a line for each check they run. Reviewers write a line for each confirm, override and decision. Export the lot for the project record.</p></div>
  <div class="window">${windowBar('Audit trail · Holloway Yard', `<button type="button" class="btn btn-secondary btn-sm" data-action="export" data-fmt="csv">Export CSV</button><button type="button" class="btn btn-secondary btn-sm" data-action="export" data-fmt="json">Export JSON</button>`)}
  <div class="toolbar"><label class="lbl">Submittal <select class="input" data-action="audit-filter"><option value="all">All</option>${state.subs.map((s) => `<option value="${esc(s.id)}" ${state.auditFilter === s.id ? 'selected' : ''}>${esc(s.id)}</option>`).join('')}</select></label>
  <label class="lbl">Event <select class="input" data-action="audit-type">${types.map((t) => `<option value="${t}" ${state.auditType === t ? 'selected' : ''}>${t === 'all' ? 'All events' : t}</option>`).join('')}</select></label>
  <span class="mono muted">${rows.length} events${rows.length > shown.length ? `, newest ${shown.length} shown` : ''}</span></div>
  <div class="table-wrap"><table class="tbl stack"><thead><tr><th>Time (UTC)</th><th>Actor</th><th>Event</th><th>Submittal</th><th>Ref</th><th>Detail</th></tr></thead><tbody>
  ${shown.map((e) => `<tr><td class="mono" data-k="Time">${esc(e.at.replace('T', ' ').slice(0, 19))}</td><td data-k="Actor">${esc(e.actor)}</td><td data-k="Event" class="mono">${esc(e.event)}</td>
  <td data-k="Submittal"><a href="#/s/${esc(e.submittal)}" class="mono">${esc(e.submittal)}</a></td><td data-k="Ref" class="mono">${esc(e.ref)} ${e.severity ? sevTag(e.severity) : ''}</td><td data-k="Detail">${esc(e.detail)}</td></tr>`).join('')}
  </tbody></table></div></div>`;
}
function filteredEvents() {
  return state.events.filter((e) => (state.auditFilter === 'all' || e.submittal === state.auditFilter) && (state.auditType === 'all' || e.event === state.auditType));
}

function viewEvals() {
  const r = EVALS;
  const miss = r.misses[0];
  const fp = r.fps[0];
  return `<div class="page-head"><p class="eyebrow">Eval lab</p><h1>How often the rules are right</h1>
  <p class="lede">24 golden submittals, each with known defects seeded by hand. The same engine that triages Holloway Yard scores them. The misses stay on this page; they are the reason a reviewer signs every decision.</p></div>
  <div class="stats">
    <div><div class="k">Catch rate</div><div class="v">${pct(r.catchRate, 1)}</div><div class="s">${r.caught} of ${r.seeded} seeded defects</div></div>
    <div><div class="k">Missed</div><div class="v">${r.missed}</div><div class="s">shown below, not tuned away</div></div>
    <div><div class="k">False positives</div><div class="v">${r.falsePositives}</div><div class="s">precision ${pct(r.precision, 1)} of ${r.caught + r.falsePositives} flags</div></div>
    <div><div class="k">Unit tests</div><div class="v">${TEST_RUN.pass}/${TEST_RUN.total}</div><div class="s">passing · <span class="mono">${TEST_RUN.command}</span></div></div>
  </div>
  <section class="block grid-2">
    <div class="callout miss" id="honest-miss"><p class="eyebrow" style="color:var(--destructive);margin:0">Honest miss · ${esc(miss.id)}</p><h3>${esc(miss.title)}</h3>
      <p>Seeded defect <b>${esc(miss.missed.join(', '))}</b> (strength class below GL28h). The rules found: ${miss.found.length ? esc(miss.found.join(', ')) : 'nothing'}.</p>
      <div class="quote">${esc(miss.notes)}</div><p>${esc(miss.why)}</p><p class="muted">V2 fix: parse member schedule tables, not only the declared summary. Logged in ROADMAP-V2.</p></div>
    <div class="callout fp"><p class="eyebrow" style="color:var(--warning);margin:0">False positive · ${esc(fp.id)}</p><h3>${esc(fp.title)}</h3>
      <p>Flagged <b>${esc(fp.falsePositives.join(', '))}</b> on a pack that was actually fine.</p>
      <div class="quote">${esc(fp.notes)}</div><p>${esc(fp.why)}</p><p class="muted">A reviewer overrides this in one click with a note; the override is in the audit trail.</p></div>
  </section>
  <div class="window">${windowBar('Golden set · 24 cases')}<div class="table-wrap"><table class="tbl stack"><thead><tr><th>Case</th><th>Trade</th><th>Seeded</th><th>Found</th><th>Result</th></tr></thead><tbody>
  ${r.rows.map((x) => { const res = x.missed.length ? '<span class="sev sev-blocker">Miss</span>' : x.falsePositives.length ? '<span class="sev sev-major">False positive</span>' : '<span class="sev sev-pass">Match</span>';
    return `<tr><td><b style="font-weight:500">${esc(x.title)}</b><div class="mono muted">${esc(x.id)}</div></td><td data-k="Trade">${esc(x.trade)}</td><td data-k="Seeded" class="mono">${esc(x.expect.join(', ') || 'none (clean)')}</td><td data-k="Found" class="mono">${esc(x.found.join(', ') || 'none')}</td><td data-k="Result">${res}</td></tr>`; }).join('')}
  </tbody></table></div></div>`;
}

function viewMetrics() {
  const ts = timeSaved(state.subs, TRIAGED);
  const bd = burndown(state.subs.map((s) => ({ ...s, review: s.review })), '2026-10-12', PROJECT.today);
  const fp = firstPass(state.subs);
  const ready = readyForReview(state.subs, TRIAGED);
  const max = Math.max(...ts.rows.map((r) => r.manual));
  const bars = ts.rows.map((r) => `<div class="bar-row"><span class="mono">${esc(r.id.replace('HY-SUB-', ''))}</span><span class="bars"><span class="bar" style="width:${(r.manual / max) * 100}%;background:#c9ccc5"></span><span class="bar" style="width:${(r.assisted / max) * 100}%;background:var(--primary)"></span></span><span class="mono num">−${r.saved} min</span></div>`).join('');
  return `<div class="page-head"><p class="eyebrow">Metrics</p><h1>What changes for the reviewer</h1>
  <p class="lede">Three numbers a project architect would watch. The time figures come from a stated model, not from timing real reviewers, and say so.</p></div>
  <div class="stats">
    <div><div class="k">Time saved / submittal</div><div class="v">${Math.round(ts.perSubmittal)} min</div><div class="s">modelled, n = ${ts.n}</div></div>
    <div><div class="k">Review hours</div><div class="v">${(ts.assisted / 60).toFixed(1)} h</div><div class="s">vs ${(ts.manual / 60).toFixed(1)} h by hand</div></div>
    <div><div class="k">First-pass acceptance</div><div class="v">${fp.rate == null ? '—' : pct(fp.rate)}</div><div class="s">${fp.accepted} of ${fp.decided} first submissions decided</div></div>
    <div><div class="k">Open</div><div class="v">${bd[bd.length - 1].open}</div><div class="s">${ready.clean} with no blocker or major</div></div>
  </div>
  <section class="block grid-2">
    <div class="panel"><div class="panel-h"><span class="t">Review time per submittal (modelled)</span><span class="legend"><span><i style="background:#c9ccc5"></i>By hand</span><span><i style="background:var(--primary)"></i>With triage</span></span></div>
      <div class="panel-b">${bars}<p class="assume">Model: by hand = ${TIME_MODEL.manualBase} min + ${TIME_MODEL.manualPerClause} min per clause + ${TIME_MODEL.manualPerDocument} min per document + ${TIME_MODEL.manualQuantities} min if quantities. With triage = ${TIME_MODEL.assistedBase} min + ${TIME_MODEL.assistedPerFlag} min per flag + ${TIME_MODEL.assistedPerJudgment} min per judgment item. Assumptions to validate in a pilot (see METRICS.md).</p></div></div>
    <div class="panel"><div class="panel-h"><span class="t">Backlog burn-down</span><span class="legend"><span><i style="background:var(--primary)"></i>Open</span><span><i style="background:#c9ccc5"></i>Received</span></span></div>
      <div class="panel-b">${burnChart(bd)}<p class="assume">Weekly from 12 Oct 2026. Open = received and not yet decided. Updates live when you record a decision.</p></div></div>
  </section>
  <section class="block panel"><div class="panel-h"><span class="t">First-pass acceptance: the denominator</span></div><div class="panel-b"><p class="assume" style="margin-top:0">Only first submissions in a package that have been decided count. ${fp.decided < 5 ? `With n = ${fp.decided} this is a reading, not a trend: no target is set until at least 20 packages close.` : ''}</p>
  <ul class="plain">${fp.ids.map((id) => `<li><a href="#/s/${esc(id)}" class="mono">${esc(id)}</a>${statusTag(sub(id).status)}</li>`).join('')}</ul></div></section>`;
}

function burnChart(points) {
  const W = 560, H = 220, P = 30;
  const maxY = Math.max(...points.map((p) => p.received), 1);
  const x = (i) => P + (i * (W - P * 2)) / Math.max(points.length - 1, 1);
  const y = (v) => H - P - (v * (H - P * 2)) / maxY;
  const line = (k) => points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[k]).toFixed(1)}`).join(' ');
  const ticks = [0, Math.round(maxY / 2), maxY];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Open submittals by week">
  ${ticks.map((t) => `<line x1="${P}" x2="${W - P}" y1="${y(t)}" y2="${y(t)}" stroke="#e8eae5"/><text x="${P - 6}" y="${y(t) + 3}" text-anchor="end">${t}</text>`).join('')}
  <path d="${line('received')}" fill="none" stroke="#c9ccc5" stroke-width="2"/>
  <path d="${line('open')}" fill="none" stroke="#3d5a80" stroke-width="2"/>
  ${points.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.open)}" r="2.5" fill="#3d5a80"/>`).join('')}
  ${points.map((p, i) => (i % 3 === 0 || i === points.length - 1 ? `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${shortDate(p.date)}</text>` : '')).join('')}</svg>`;
}

function viewAbout() {
  return `<div class="page-head"><p class="eyebrow">How it works</p><h1>The 30-second version</h1>
  <p class="lede">Submittals arrive faster than an architect can read them. Most problems are findable by rule: a missing certificate, a weaker grade, a total that doesn't add up. Review Desk runs those rules the moment a submittal syncs from Procore, links each flag to the clause that justifies it, and leaves every judgment and every decision to the reviewer.</p></div>
  <section class="block"><ol class="steps">
    <li><b>Arrives from Procore</b>A submittal lands in the existing Cogram RFI and Submittal log through the two-way sync (simulated here).</li>
    <li><b>Triage runs first</b>Completeness, spec cross-checks, standards, lead time against the programme, revision sequence and quantity arithmetic. ${Object.keys(RULES).length} rules, all plain code.</li>
    <li><b>Evidence, not opinions</b>Every flag carries the rule that fired and a chip that opens the exact clause text from the project specification.</li>
    <li><b>The reviewer decides</b>Each flag is confirmed or overridden with a note. Judgment clauses are always routed to a person. Approval is blocked while confirmed issues stand.</li>
    <li><b>Everything is recorded</b>Checks, flags, overrides and decisions land in a timestamped audit trail, exportable as CSV or JSON.</li>
  </ol></section>
  <section class="block grid-2">
    <div class="panel"><div class="panel-h"><span class="t">Rules in this build</span></div><div class="table-wrap"><table class="tbl"><tbody>${Object.entries(RULES).map(([k, r]) => `<tr><td class="mono">${k}</td><td>${esc(r.name)}<div class="mono muted">${esc(r.rule)}</div></td></tr>`).join('')}</tbody></table></div></div>
    <div class="panel"><div class="panel-h"><span class="t">What this is, and isn't</span></div><div class="panel-b prose">
      <p>An independent concept that extends Cogram's RFI and Submittal management with a pre-review triage step. It is a static prototype: synthetic project, fictional companies and people, no backend, no sign-in, no live model calls.</p>
      <p>The rules here are deterministic on purpose: they are testable and explainable. In a real product, document reading would populate the declared values; the rules and the reviewer gate would stay as they are.</p>
      <p>The eval lab shows where it fails today. That is part of the design.</p></div></div>
  </section>`;
}

// ---------- evidence dialog ----------
function openEvidence(id, trigger) {
  const c = CLAUSE_INDEX[id];
  if (!c) return;
  const req = c.requirement;
  const highlight = (text) => {
    const v = req ? (Array.isArray(req.value) ? req.value : [String(req.value)]) : [];
    let out = esc(text);
    for (const x of v) out = out.replace(esc(x), `<mark>${esc(x)}</mark>`);
    return out;
  };
  $ev.innerHTML = `<div class="ev-h"><div><div class="mono" style="color:var(--primary)">${esc(c.id)} · ${esc(SECTIONS[c.section].title)}</div><div id="evidence-title" style="font-weight:500">${esc(c.title)}</div></div><button type="button" class="x" data-action="close-evidence" aria-label="Close">×</button></div>
  <div class="ev-b"><blockquote>${highlight(c.text)}</blockquote>
  ${req ? `<div class="rule"><b>As code</b>${esc(req.prop)} ${esc(req.op)} ${esc(Array.isArray(req.value) ? JSON.stringify(req.value) : req.value)}${req.unit ? ' ' + esc(req.unit) : ''} → ${esc(req.severity)}</div>` : ''}
  ${c.requiredDocs ? `<div class="rule"><b>Required docs</b>${esc(c.requiredDocs.map((d) => DOC_LABELS[d]).join(' · '))}</div>` : ''}
  ${c.requiredCerts ? `<div class="rule"><b>Required certs</b>${esc(c.requiredCerts.map((d) => CERT_LABELS[d]).join(' · '))}</div>` : ''}
  ${c.requiredStandards ? `<div class="rule"><b>Standards</b>${esc(c.requiredStandards.join(' · '))}</div>` : ''}
  ${c.judgment ? '<div class="rule"><b>Judgment</b>No rule decides this clause. Always routed to a reviewer.</div>' : ''}
  <p class="mono muted" style="margin:0">Holloway Yard specification (synthetic) · section ${esc(c.section)}</p></div>`;
  $ev.returnFocus = trigger;
  if (typeof $ev.showModal === 'function') $ev.showModal(); else $ev.setAttribute('open', '');
}
function closeEvidence() { if ($ev.open) $ev.close(); $ev.returnFocus?.focus?.(); }
$ev.addEventListener('click', (e) => { if (e.target === $ev) closeEvidence(); });

// ---------- actions ----------
function pushEvents(...evs) { state.events = sortEvents(state.events.concat(evs)); }

function doResolve(id, key, action) {
  const s = sub(id);
  const flag = TRIAGED[id].flags.find((f) => f.key === key);
  const note = state.drafts[`${id}|${key}`] || '';
  try {
    state.resolutions[id] = resolveFlag(state.resolutions[id] || {}, flag, action, note);
  } catch (err) { toast(err.message); focusDraft(id, key); return; }
  if (s.status === 'incoming') {
    const next = startReview(s); Object.assign(s, next);
    pushEvents(auditEvent(new Date().toISOString(), PROJECT.reviewer, 'status.change', id, 'in-review', '', 'Incoming → In Review'));
  }
  pushEvents(resolutionEvent(s, flag, state.resolutions[id][key], PROJECT.reviewer));
  delete state.drafts[`${id}|${key}`];
  save(); render({ keepScroll: true });
  toast(action === 'confirm' ? 'Flag confirmed · logged' : 'Flag overridden · logged');
}
function focusDraft(id, key) { const el = document.querySelector(`[data-draft="${CSS.escape(`${id}|${key}`)}"]`); el?.focus(); }

function doDecide(id) {
  const s = sub(id);
  const d = state.decision[id] || {};
  try {
    const next = applyDecision(s, TRIAGED[id].flags, state.resolutions[id] || {}, d.choice, d.rationale || '', PROJECT.reviewer);
    Object.assign(s, next);
  } catch (err) { toast(err.message); return; }
  pushEvents(decisionEvent(s, s.review));
  delete state.decision[id];
  save(); render({ keepScroll: true });
  toast(`${STATUS_LABEL[s.status]} · recorded in the audit trail`);
}

function download(name, text, type) {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function doExport(fmt) {
  const evs = filteredEvents();
  const stamp = new Date().toISOString().slice(0, 10);
  if (fmt === 'csv') download(`holloway-yard-audit-${stamp}.csv`, toCSV(evs), 'text/csv');
  else download(`holloway-yard-audit-${stamp}.json`, toJSON(evs, { project: PROJECT.name, exportedAt: new Date().toISOString(), filter: { submittal: state.auditFilter, event: state.auditType } }), 'application/json');
  toast(`Exported ${evs.length} events as ${fmt.toUpperCase()}`);
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action;
  if (a === 'evidence') { e.preventDefault(); openEvidence(el.dataset.clause, el); }
  else if (a === 'close-evidence') closeEvidence();
  else if (a === 'view') { state.view = el.dataset.v; save(); render({ keepScroll: true }); }
  else if (a === 'resolve') doResolve(el.dataset.id, el.dataset.key, el.dataset.do);
  else if (a === 'undo') {
    const id = el.dataset.id; const key = el.dataset.key;
    state.resolutions[id] = clearResolution(state.resolutions[id] || {}, key);
    pushEvents(auditEvent(new Date().toISOString(), PROJECT.reviewer, 'flag.undo', id, key.replace(':', ' '), '', 'Resolution withdrawn'));
    save(); render({ keepScroll: true });
  } else if (a === 'choose') {
    const id = el.dataset.id; state.decision[id] = { ...(state.decision[id] || { rationale: '' }), choice: el.dataset.v };
    save(); render({ keepScroll: true });
  } else if (a === 'decide') doDecide(el.dataset.id);
  else if (a === 'export') doExport(el.dataset.fmt);
  else if (a === 'reset') {
    if (window.confirm('Reset all reviews and the audit trail to the starting data?')) { state = seedState(); save(); render(); toast('Demo data reset'); }
  }
});
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.draft) { state.drafts[t.dataset.draft] = t.value; save(); }
  if (t.dataset.rationale) {
    const id = t.dataset.rationale;
    state.decision[id] = { ...(state.decision[id] || { choice: '' }), rationale: t.value }; save();
    const reasons = decisionBlockers(TRIAGED[id].flags, state.resolutions[id] || {}, state.decision[id].choice, t.value);
    document.querySelector(`[data-reasons="${CSS.escape(id)}"]`).innerHTML = reasonsList(reasons);
    document.querySelector(`[data-action="decide"][data-id="${CSS.escape(id)}"]`).disabled = reasons.length > 0;
  }
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.action === 'trade') { state.trade = t.value; save(); render({ keepScroll: true }); }
  if (t.dataset.action === 'audit-filter') { state.auditFilter = t.value; save(); render({ keepScroll: true }); }
  if (t.dataset.action === 'audit-type') { state.auditType = t.value; save(); render({ keepScroll: true }); }
});

// ---------- router ----------
function route() {
  const h = location.hash.replace(/^#\/?/, '') || 'log';
  const [page, arg] = h.split('/');
  return { page, arg };
}
let lastRoute = '';
function render(opts = {}) {
  const { page, arg } = route();
  const views = { log: viewLog, audit: viewAudit, evals: viewEvals, metrics: viewMetrics, about: viewAbout };
  const y = window.scrollY;
  const active = document.activeElement;
  const activeSel = active?.dataset?.draft ? `[data-draft="${CSS.escape(active.dataset.draft)}"]` : active?.dataset?.rationale ? `[data-rationale="${CSS.escape(active.dataset.rationale)}"]` : null;
  $main.innerHTML = page === 's' ? viewDetail(arg) : (views[page] || viewLog)();
  document.querySelectorAll('[data-nav]').forEach((n) => n.setAttribute('aria-current', n.dataset.nav === (page === 's' ? 'log' : page) ? 'page' : 'false'));
  const titles = { log: 'Submittals', audit: 'Audit trail', evals: 'Eval lab', metrics: 'Metrics', about: 'How it works', s: arg };
  document.title = `${titles[page] || 'Submittals'} · Submittal Review Desk`;
  const key = location.hash;
  if (opts.keepScroll && key === lastRoute) window.scrollTo(0, y); else window.scrollTo(0, 0);
  if (activeSel) document.querySelector(activeSel)?.focus();
  lastRoute = key;
}
window.addEventListener('hashchange', () => render());
render();
