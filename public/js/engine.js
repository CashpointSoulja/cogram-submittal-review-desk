// Deterministic triage engine. Pure functions only: same submittal in, same findings out.
import { CLAUSE_INDEX, RANKS, SUPERSEDED, SCHEDULE_INDEX, TAKEOFFS, REVIEW_CONFIG, DOC_LABELS, CERT_LABELS } from './spec.js';
import { addDays, diffDays } from './dates.js';

export const SEVERITY_ORDER = ['blocker', 'major', 'minor', 'review'];

export const RULES = {
  C1: { name: 'Required document attached', category: 'Completeness', rule: 'every doc in clause.requiredDocs ∈ submittal.attachments[].type' },
  C2: { name: 'Transmittal form signed', category: 'Completeness', rule: 'transmittal.signed === true && transmittal.signer is not empty' },
  C3: { name: 'Required certificate present', category: 'Completeness', rule: 'every cert in clause.requiredCerts ∈ submittal.certificates[].type' },
  C4: { name: 'Certificate in date', category: 'Completeness', rule: 'certificate.expires >= submittal.submittedOn' },
  S1: { name: 'Declared value meets clause', category: 'Spec cross-check', rule: 'compare(properties[prop], requirement.op, requirement.value)' },
  S2: { name: 'Value declared for clause', category: 'Spec cross-check', rule: 'properties[requirement.prop] is present and parseable' },
  T1: { name: 'Required standard cited', category: 'Standards', rule: 'every standard in clause.requiredStandards ∈ normalise(citedStandards)' },
  T2: { name: 'No superseded standard cited', category: 'Standards', rule: 'no normalise(citedStandard) starts with a key in SUPERSEDED' },
  D1: { name: 'Lead time fits programme', category: 'Deterministic', rule: 'submittedOn + reviewWindow(14d) + leadTime ≤ activity.start − buffer(7d)' },
  D2: { name: 'Revision sequence', category: 'Deterministic', rule: 'revision === next letter after highest earlier revision in package (A if none)' },
  D3: { name: 'Quantities add up', category: 'Deterministic', rule: '|statedTotal − Σ lines| / Σ lines ≤ 1 %' },
  D4: { name: 'Quantity matches take-off', category: 'Deterministic', rule: '|Σ lines − takeoff| / takeoff ≤ 2 %' },
  J1: { name: 'Judgment clause', category: 'Needs reviewer', rule: 'clause.judgment === true → always routed to a person' },
  J2: { name: 'Declared deviation', category: 'Needs reviewer', rule: 'every entry in submittal.deviations → always routed to a person' },
};

export function normaliseStandard(ref) {
  return String(ref)
    .toUpperCase()
    .replace(/[:]\s*\d{4}.*$/, '')
    .replace(/\+A\d.*$/, '')
    .replace(/\s+/g, ' ')
    .replace(/^BS EN /, 'EN ')
    .trim();
}

export function rankOf(scale, value) {
  if (value == null) return -1;
  const head = scale === 'reactionToFire' ? String(value).split('-')[0].trim() : String(value).trim();
  return RANKS[scale].indexOf(head);
}

// Returns { ok, comparable }.
export function compare(actual, req) {
  if (actual === undefined || actual === null || actual === '') return { ok: false, comparable: false };
  switch (req.op) {
    case '>=': return typeof actual === 'number' ? { ok: actual >= req.value, comparable: true } : { ok: false, comparable: false };
    case '<=': return typeof actual === 'number' ? { ok: actual <= req.value, comparable: true } : { ok: false, comparable: false };
    case '==': return { ok: actual === req.value, comparable: true };
    case 'in': return { ok: req.value.includes(actual), comparable: true };
    case 'rank>=': {
      const a = rankOf(req.rank, actual);
      const r = rankOf(req.rank, req.value);
      if (a < 0 || r < 0) return { ok: false, comparable: false };
      return { ok: a >= r, comparable: true };
    }
    default: throw new Error(`Unknown operator ${req.op}`);
  }
}

export function nextRevision(letter) {
  return String.fromCharCode(letter.charCodeAt(0) + 1);
}

export function computeQuantity(q) {
  const lines = q.lines || [];
  switch (q.kind) {
    case 'rebar': return lines.reduce((t, l) => t + 0.00617 * l.dia * l.dia * l.lengthM * l.count, 0);
    case 'volume': return lines.reduce((t, l) => t + (l.count * l.bMm * l.hMm * l.lengthM) / 1e6, 0);
    case 'area': return lines.reduce((t, l) => t + l.count * l.areaM2, 0);
    case 'items': return lines.reduce((t, l) => t + l.count, 0);
    default: throw new Error(`Unknown quantity kind ${q.kind}`);
  }
}

export const round = (n, dp = 1) => Math.round(n * 10 ** dp) / 10 ** dp;
const pct = (a, b) => (Math.abs(a - b) / b) * 100;

function finding(code, severity, ref, title, detail, clauses = [], extra = {}) {
  return { key: `${code}:${ref}`, code, severity, title, detail, clauses, rule: RULES[code].rule, category: RULES[code].category, needsReviewer: true, ...extra };
}
function pass(code, ref, title, clauses = []) {
  return { key: `${code}:${ref}`, code, severity: 'pass', title, clauses, rule: RULES[code].rule, category: RULES[code].category };
}

export function clausesFor(s) {
  return (s.clauses || []).map((id) => {
    const c = CLAUSE_INDEX[id];
    if (!c) throw new Error(`${s.id}: unknown clause ${id}`);
    return c;
  });
}

export function checkCompleteness(s) {
  const out = [];
  const attached = new Set((s.attachments || []).map((a) => a.type));
  const certs = s.certificates || [];
  const certTypes = new Set(certs.map((c) => c.type));
  const t = s.transmittal || {};
  out.push(t.signed && t.signer
    ? pass('C2', 'transmittal', 'Transmittal signed by ' + t.signer)
    : finding('C2', 'blocker', 'transmittal', 'Transmittal form is not signed', 'The contractor\u2019s transmittal has no signature, so the submission has not been checked by the main contractor.'));
  const seenDocs = new Set();
  const seenCerts = new Set();
  for (const c of clausesFor(s)) {
    for (const d of c.requiredDocs || []) {
      if (seenDocs.has(d)) continue;
      seenDocs.add(d);
      out.push(attached.has(d)
        ? pass('C1', d, `${DOC_LABELS[d]} attached`, [c.id])
        : finding('C1', 'major', d, `Missing: ${DOC_LABELS[d]}`, `Clause ${c.id} asks for a ${DOC_LABELS[d].toLowerCase()}; none is attached.`, [c.id]));
    }
    for (const k of c.requiredCerts || []) {
      if (seenCerts.has(k)) continue;
      seenCerts.add(k);
      if (!certTypes.has(k)) {
        out.push(finding('C3', 'major', k, `Missing certificate: ${CERT_LABELS[k]}`, `Clause ${c.id} requires a ${CERT_LABELS[k].toLowerCase()}; none is attached.`, [c.id]));
        continue;
      }
      out.push(pass('C3', k, `${CERT_LABELS[k]} attached`, [c.id]));
      const cert = certs.find((x) => x.type === k);
      if (cert.expires && cert.expires < s.submittedOn) {
        out.push(finding('C4', 'major', k, `Expired: ${CERT_LABELS[k]}`, `Certificate ${cert.ref || ''} expired on ${cert.expires}, before the submission date ${s.submittedOn}.`.replace('  ', ' '), [c.id]));
      } else {
        out.push(pass('C4', k, `${CERT_LABELS[k]} in date`, [c.id]));
      }
    }
  }
  return out;
}

export function checkSpec(s) {
  const out = [];
  const props = s.properties || {};
  for (const c of clausesFor(s)) {
    const req = c.requirement;
    if (!req) continue;
    const actual = props[req.prop];
    const r = compare(actual, req);
    const shown = Array.isArray(req.value) ? req.value.join(' or ') : req.value;
    const unit = req.unit ? ` ${req.unit}` : '';
    if (!r.comparable) {
      out.push(finding('S2', 'major', c.id, `No usable value for ${c.title.toLowerCase()}`, `Clause ${c.id} needs ${req.prop} ${req.op} ${shown}${unit}; the submittal declares ${actual === undefined ? 'nothing' : `"${actual}"`}.`, [c.id]));
    } else if (!r.ok) {
      out.push(finding('S1', req.severity, c.id, `${c.title}: ${actual}${unit} does not meet ${shown}${unit}`, `Declared ${req.prop} = ${actual}${unit}. Clause ${c.id} requires ${req.op} ${shown}${unit}.`, [c.id], { actual, expected: req.value, op: req.op }));
    } else {
      out.push(pass('S1', c.id, `${c.title}: ${actual}${unit} meets ${shown}${unit}`, [c.id]));
    }
  }
  return out;
}

export function checkStandards(s) {
  const out = [];
  const cited = (s.citedStandards || []).map(normaliseStandard);
  const citedSet = new Set(cited);
  const seen = new Set();
  for (const c of clausesFor(s)) {
    for (const std of c.requiredStandards || []) {
      if (seen.has(std)) continue;
      seen.add(std);
      out.push(citedSet.has(normaliseStandard(std))
        ? pass('T1', std, `${std} cited`, [c.id])
        : finding('T1', 'major', std, `${std} not cited`, `Clause ${c.id} requires work to ${std}. The submittal does not reference it.`, [c.id]));
    }
  }
  (s.citedStandards || []).forEach((raw) => {
    const n = normaliseStandard(raw);
    const key = Object.keys(SUPERSEDED).find((k) => n === normaliseStandard(k) || n.startsWith(normaliseStandard(k) + ' ') || n.startsWith(normaliseStandard(k) + '-') || n.startsWith(normaliseStandard(k) + ':'));
    if (key) {
      const sectionClauses = clausesFor(s).filter((c) => (c.requiredStandards || []).length).map((c) => c.id);
      out.push(finding('T2', 'major', raw, `Superseded standard cited: ${raw}`, `${key} has been replaced by ${SUPERSEDED[key]}. Work designed to a withdrawn code needs checking.`, sectionClauses.slice(0, 1), { replacedBy: SUPERSEDED[key] }));
    }
  });
  return out;
}

export function leadTimeFloat(s, config = REVIEW_CONFIG) {
  const act = SCHEDULE_INDEX[s.activity];
  if (!act) return null;
  const expectedOnSite = addDays(s.submittedOn, config.reviewWindowDays + s.leadTimeWeeks * 7);
  const requiredOnSite = addDays(act.start, -config.deliveryBufferDays);
  return { activity: act, expectedOnSite, requiredOnSite, floatDays: diffDays(requiredOnSite, expectedOnSite) };
}

export function checkLeadTime(s, config = REVIEW_CONFIG) {
  if (!s.activity || s.leadTimeWeeks == null) return [];
  const lt = leadTimeFloat(s, config);
  if (!lt) return [finding('D1', 'major', 'programme', 'Programme activity not found', `Activity ${s.activity} is not in the construction programme.`)];
  const calc = `${s.submittedOn} + ${config.reviewWindowDays}d review + ${s.leadTimeWeeks}w lead = ${lt.expectedOnSite}; needed by ${lt.requiredOnSite} (${lt.activity.id} starts ${lt.activity.start} − ${config.deliveryBufferDays}d buffer)`;
  if (lt.floatDays < 0) {
    return [finding('D1', 'major', 'programme', `Arrives ${-lt.floatDays} days after it is needed`, `${calc}. Float ${lt.floatDays} days.`, [], { floatDays: lt.floatDays, calc })];
  }
  return [{ ...pass('D1', 'programme', `Lead time fits programme (${lt.floatDays} days float)`), calc, floatDays: lt.floatDays }];
}

export function expectedRevision(s, all = []) {
  const earlier = [
    ...(s.priorRevisions || []),
    ...all.filter((o) => o.id !== s.id && o.package === s.package && o.submittedOn < s.submittedOn).map((o) => o.revision),
  ];
  if (!earlier.length) return { expected: 'A', earlier };
  const max = earlier.slice().sort().pop();
  return { expected: nextRevision(max), earlier };
}

export function checkRevision(s, all = []) {
  const { expected, earlier } = expectedRevision(s, all);
  const calc = earlier.length ? `Earlier revisions in ${s.package}: ${earlier.join(', ')} → expect ${expected}` : `No earlier revision in ${s.package} → expect A`;
  if (s.revision === expected) return [{ ...pass('D2', 'revision', `Revision ${s.revision} follows the sequence`), calc }];
  const reused = earlier.includes(s.revision);
  return [finding('D2', 'major', 'revision', reused ? `Revision ${s.revision} reused` : `Revision ${s.revision} out of sequence`, `${calc}; submitted as ${s.revision}. ${reused ? 'Two documents with the same revision letter will confuse the record.' : ''}`.trim(), [], { calc, expected })];
}

export function checkQuantities(s, config = REVIEW_CONFIG) {
  const q = s.quantities;
  if (!q) return [];
  const out = [];
  const computed = computeQuantity(q);
  const unit = q.unit;
  const diff = pct(q.statedTotal, computed);
  const calc = `Σ lines = ${round(computed, 1)} ${unit}; stated ${q.statedTotal} ${unit}; difference ${round(diff, 1)} %`;
  out.push(diff > config.quantityTolerancePct
    ? finding('D3', 'major', 'total', `Stated total does not add up (${round(diff, 1)} % off)`, `${calc}. Tolerance ${config.quantityTolerancePct} %.`, q.clause ? [q.clause] : [], { computed: round(computed, 2), calc })
    : { ...pass('D3', 'total', `Quantities add up (${round(computed, 1)} ${unit})`, q.clause ? [q.clause] : []), calc });
  if (q.takeoff) {
    const tk = TAKEOFFS[q.takeoff];
    const td = pct(computed, tk.quantity);
    const tcalc = `Σ lines = ${round(computed, 1)} ${unit}; take-off ${tk.label} = ${tk.quantity} ${tk.unit}; difference ${round(td, 1)} %`;
    out.push(td > config.takeoffTolerancePct
      ? finding('D4', 'major', 'takeoff', `Quantity is ${round(td, 1)} % away from the drawing take-off`, `${tcalc}. Tolerance ${config.takeoffTolerancePct} %.`, q.clause ? [q.clause] : [], { calc: tcalc })
      : { ...pass('D4', 'takeoff', `Matches take-off within ${config.takeoffTolerancePct} %`, q.clause ? [q.clause] : []), calc: tcalc });
  }
  return out;
}

export function checkJudgment(s) {
  const out = [];
  for (const c of clausesFor(s)) {
    if (c.judgment) out.push(finding('J1', 'review', c.id, `Needs reviewer: ${c.title.toLowerCase()}`, 'This clause asks for professional judgment. No rule can approve it.', [c.id]));
  }
  (s.deviations || []).forEach((d, i) => {
    out.push(finding('J2', 'review', `dev-${i + 1}`, `Needs reviewer: declared deviation`, d.text, d.clause ? [d.clause] : []));
  });
  return out;
}

export function triage(s, all = [], config = REVIEW_CONFIG) {
  const results = [
    ...checkCompleteness(s),
    ...checkSpec(s),
    ...checkStandards(s),
    ...checkLeadTime(s, config),
    ...checkRevision(s, all),
    ...checkQuantities(s, config),
    ...checkJudgment(s),
  ];
  const flags = results.filter((r) => r.severity !== 'pass')
    .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));
  const passes = results.filter((r) => r.severity === 'pass');
  const count = (sev) => flags.filter((f) => f.severity === sev).length;
  const counts = { blocker: count('blocker'), major: count('major'), minor: count('minor'), review: count('review') };
  const suggestion = counts.blocker + counts.major > 0 ? 'revise-resubmit' : 'no-rule-issues';
  return {
    submittalId: s.id,
    flags,
    passes,
    counts,
    checksRun: results.length,
    suggestion,
    // Triage only ever suggests. A named reviewer makes every decision.
    autoApproved: false,
    disposition: 'needs-reviewer',
  };
}

export function triageAll(list, config = REVIEW_CONFIG) {
  return Object.fromEntries(list.map((s) => [s.id, triage(s, list, config)]));
}
