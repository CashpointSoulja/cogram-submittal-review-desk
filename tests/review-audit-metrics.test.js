import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { resolveFlag, clearResolution, unresolved, standing, decisionBlockers, applyDecision, startReview, STATUSES } from '../public/js/review.js';
import { toCSV, toJSON, csvCell, triageEvents, decisionEvent, resolutionEvent, sortEvents, AUDIT_COLUMNS } from '../public/js/audit.js';
import { reviewMinutes, timeSaved, burndown, firstPass, readyForReview } from '../public/js/metrics.js';
import { runEvals, scoreCase } from '../public/js/evals.js';
import { GOLDEN } from '../public/js/golden.js';
import { triage, triageAll } from '../public/js/engine.js';
import { SUBMITTALS } from '../public/js/submittals.js';

const blocker = { key: 'S1:X', code: 'S1', severity: 'blocker' };
const minor = { key: 'D9:Y', code: 'D9', severity: 'minor' };
const judgment = { key: 'J1:Z', code: 'J1', severity: 'review' };
const AT = '2027-01-11T10:00:00Z';
const WHY = 'Checked against the clause text.';

describe('review flow', () => {
  test('five statuses in board order', () => assert.deepEqual(STATUSES.map((s) => s.label), ['Incoming', 'In Review', 'Approved', 'Rejected', 'Revise & Resubmit']));
  test('confirm records action and time', () => assert.deepEqual(resolveFlag({}, blocker, 'confirm', '', AT)['S1:X'], { action: 'confirm', note: '', at: AT }));
  test('override needs a note', () => assert.throws(() => resolveFlag({}, blocker, 'override', '  ')));
  test('override with a note is recorded', () => assert.equal(resolveFlag({}, blocker, 'override', 'Wrong clause', AT)['S1:X'].action, 'override'));
  test('judgment needs a note even to confirm', () => assert.throws(() => resolveFlag({}, judgment, 'confirm', '')));
  test('unknown action throws', () => assert.throws(() => resolveFlag({}, blocker, 'approve', 'x')));
  test('resolveFlag does not mutate input', () => { const r = {}; resolveFlag(r, blocker, 'confirm'); assert.deepEqual(r, {}); });
  test('clearResolution removes one key', () => assert.deepEqual(clearResolution({ a: 1, b: 2 }, 'a'), { b: 2 }));
  test('unresolved lists open flags', () => assert.deepEqual(unresolved([blocker, minor], { 'S1:X': {} }), [minor]));
  test('standing lists confirmed flags', () => assert.deepEqual(standing([blocker, minor], { 'S1:X': { action: 'confirm' }, 'D9:Y': { action: 'override' } }), [blocker]));
  test('decision blocked while a flag is open', () => assert.match(decisionBlockers([blocker], {}, 'rejected', WHY).join(), /still need/));
  test('approve blocked by a confirmed blocker', () => assert.match(decisionBlockers([blocker], { 'S1:X': { action: 'confirm' } }, 'approved', WHY).join(), /Cannot approve/));
  test('approve blocked by a confirmed judgment concern', () => assert.match(decisionBlockers([judgment], { 'J1:Z': { action: 'confirm', note: 'n' } }, 'approved', WHY).join(), /Cannot approve/));
  test('approve allowed with a confirmed minor', () => assert.deepEqual(decisionBlockers([minor], { 'D9:Y': { action: 'confirm' } }, 'approved', WHY), []));
  test('approve allowed when the blocker was overridden', () => assert.deepEqual(decisionBlockers([blocker], { 'S1:X': { action: 'override', note: 'n' } }, 'approved', WHY), []));
  test('reject allowed with confirmed blocker', () => assert.deepEqual(decisionBlockers([blocker], { 'S1:X': { action: 'confirm' } }, 'rejected', WHY), []));
  test('rationale is required', () => assert.match(decisionBlockers([], {}, 'approved', 'ok').join(), /rationale/));
  test('decision must be one of three', () => assert.match(decisionBlockers([], {}, 'auto', WHY).join(), /Choose/));
  test('applyDecision sets status and review record', () => {
    const s = applyDecision({ id: 'X', status: 'in-review' }, [blocker], { 'S1:X': { action: 'confirm' } }, 'revise-resubmit', WHY, 'Maya Okonjo', AT);
    assert.equal(s.status, 'revise-resubmit'); assert.equal(s.review.reviewer, 'Maya Okonjo'); assert.equal(s.review.decidedAt, AT);
  });
  test('applyDecision throws when blocked', () => assert.throws(() => applyDecision({ id: 'X' }, [blocker], {}, 'approved', WHY, 'M')));
  test('startReview moves incoming to in review', () => assert.equal(startReview({ status: 'incoming' }).status, 'in-review'));
  test('startReview leaves decided items alone', () => assert.equal(startReview({ status: 'approved' }).status, 'approved'));
  test('no submittal can be approved without its flags handled', () => {
    const all = triageAll(SUBMITTALS);
    for (const s of SUBMITTALS) if (all[s.id].flags.length) assert.ok(decisionBlockers(all[s.id].flags, {}, 'approved', WHY).length > 0, s.id);
  });
});

describe('audit trail', () => {
  const s = SUBMITTALS[0];
  const r = triage(s, SUBMITTALS);
  const ev = triageEvents(s, r, AT);
  test('one event per check plus the run', () => assert.equal(ev.length, r.checksRun + 1));
  test('run event states nothing was auto-approved', () => assert.match(ev[0].detail, /auto-approved: no/));
  test('flags carry severity', () => assert.ok(ev.filter((e) => e.event === 'check.flag').every((e) => e.severity && e.severity !== 'pass')));
  test('csvCell quotes commas', () => assert.equal(csvCell('a,b'), '"a,b"'));
  test('csvCell doubles quotes', () => assert.equal(csvCell('say "hi"'), '"say ""hi"""'));
  test('csvCell quotes new lines', () => assert.equal(csvCell('a\nb'), '"a\nb"'));
  test('csvCell blank for null', () => assert.equal(csvCell(null), ''));
  test('CSV has header and one row per event', () => {
    const lines = toCSV(ev).trim().split('\r\n');
    assert.equal(lines[0], AUDIT_COLUMNS.join(',')); assert.equal(lines.length, ev.length + 1);
  });
  test('JSON round-trips with count', () => { const j = JSON.parse(toJSON(ev, { project: 'HY' })); assert.equal(j.count, ev.length); assert.equal(j.project, 'HY'); });
  test('decision and resolution events record the reviewer', () => {
    const d = decisionEvent(s, { decidedAt: AT, reviewer: 'Maya Okonjo', decision: 'approved', rationale: WHY });
    const x = resolutionEvent(s, r.flags[0], { action: 'override', note: 'n', at: AT }, 'Maya Okonjo');
    assert.equal(d.actor, 'Maya Okonjo'); assert.equal(x.event, 'flag.override');
  });
  test('sortEvents orders by time without mutating', () => {
    const a = [{ at: '2' }, { at: '1' }]; assert.deepEqual(sortEvents(a).map((e) => e.at), ['1', '2']); assert.equal(a[0].at, '2');
  });
});

describe('metrics', () => {
  const all = triageAll(SUBMITTALS);
  test('assisted time never exceeds manual time', () => { for (const s of SUBMITTALS) { const m = reviewMinutes(s, all[s.id]); assert.ok(m.assisted <= m.manual); } });
  test('time saved totals add up', () => { const t = timeSaved(SUBMITTALS, all); assert.equal(t.manual - t.assisted, t.saved); assert.equal(t.n, 14); });
  test('burn-down counts received and open', () => {
    const p = burndown(SUBMITTALS, '2026-10-12', '2027-01-11');
    assert.equal(p[p.length - 1].received, 14); assert.ok(p.every((x) => x.open + x.closed === x.received));
  });
  test('first-pass rate uses only first submissions that were decided', () => {
    const fp = firstPass(SUBMITTALS);
    assert.equal(fp.decided, 4); assert.equal(fp.accepted, 2); assert.equal(fp.rate, 0.5);
  });
  test('first-pass rate is null with no decisions', () => assert.equal(firstPass([]).rate, null));
  test('ready-for-review counts open items without blockers or majors', () => {
    const r = readyForReview(SUBMITTALS, all); assert.equal(r.open, 10); assert.equal(r.clean, 2);
  });
});

describe('eval lab', () => {
  const r = runEvals();
  test('24 golden cases', () => assert.equal(GOLDEN.length, 24));
  test('golden ids are unique', () => assert.equal(new Set(GOLDEN.map((g) => g.id)).size, 24));
  for (const g of GOLDEN) {
    if (g.honest === 'miss') {
      test(`${g.id} stays a known miss (not tuned away)`, () => assert.deepEqual(scoreCase(g).missed, g.expect));
    } else if (g.honest === 'false-positive') {
      test(`${g.id} stays a known false positive`, () => assert.ok(scoreCase(g).falsePositives.length > 0));
    } else {
      test(`${g.id} ${g.title}: exact match`, () => { const c = scoreCase(g); assert.deepEqual([c.missed, c.falsePositives], [[], []]); });
    }
  }
  test('headline numbers', () => {
    assert.equal(r.seeded, 21); assert.equal(r.caught, 20); assert.equal(r.missed, 1); assert.equal(r.falsePositives, 1);
  });
  test('at least one honest miss is on record', () => assert.ok(r.misses.length >= 1));
});
