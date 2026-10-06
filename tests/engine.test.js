import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  normaliseStandard, rankOf, compare, nextRevision, expectedRevision, computeQuantity, round,
  checkCompleteness, checkSpec, checkStandards, checkLeadTime, checkRevision, checkQuantities, checkJudgment,
  triage, triageAll, leadTimeFloat, RULES, clausesFor,
} from '../public/js/engine.js';
import { SUBMITTALS } from '../public/js/submittals.js';
import { CLAUSES, CLAUSE_INDEX } from '../public/js/spec.js';

const codes = (flags) => flags.filter((f) => f.severity !== 'pass').map((f) => f.code);
const base = () => ({
  id: 'T-1', section: 'G20', package: 'T-PKG', revision: 'A', submittedOn: '2027-01-04', activity: 'A-210', leadTimeWeeks: 8,
  clauses: ['G20/210', 'G20/220', 'G20/230', 'G20/010'],
  properties: { strengthClass: 'GL28h', moistureContentPct: 12 },
  citedStandards: ['BS EN 14080', 'BS EN 1995-1-1', 'BS EN 1995-1-2'],
  attachments: ['shop-drawings', 'member-schedule', 'structural-calcs', 'declaration-of-performance'].map((type) => ({ type })),
  certificates: [{ type: 'factory-production-control', expires: '2028-01-01' }, { type: 'chain-of-custody', expires: '2028-01-01' }],
  transmittal: { signed: true, signer: 'A Person' },
});

describe('normaliseStandard', () => {
  const cases = [
    ['BS EN 14080:2013', 'EN 14080'],
    ['bs en 14080', 'EN 14080'],
    ['EN 14080', 'EN 14080'],
    ['BS  EN   1995-1-1', 'EN 1995-1-1'],
    ['BS 4449:2005+A3:2016', 'BS 4449'],
    ['BS EN 13830:2015+A1:2020', 'EN 13830'],
    ['BS 8500-2:2023', 'BS 8500-2'],
    ['BS EN ISO 1461', 'EN ISO 1461'],
    [' BS 8666 ', 'BS 8666'],
    ['BS EN 1366-3:2021', 'EN 1366-3'],
  ];
  for (const [input, out] of cases) test(`${input} → ${out}`, () => assert.equal(normaliseStandard(input), out));
});

describe('rankOf', () => {
  test('glulam GL28h is above GL24h', () => assert.ok(rankOf('glulamClass', 'GL28h') > rankOf('glulamClass', 'GL24h')));
  test('concrete C32/40 is ranked', () => assert.ok(rankOf('concreteClass', 'C32/40') >= 0));
  test('reaction to fire reads the class before the smoke suffix', () => assert.equal(rankOf('reactionToFire', 'D-s2,d0'), rankOf('reactionToFire', 'D')));
  test('A2-s1,d0 outranks D', () => assert.ok(rankOf('reactionToFire', 'A2-s1,d0') > rankOf('reactionToFire', 'D')));
  test('EI 120 outranks EI 90', () => assert.ok(rankOf('fireResistance', 'EI 120') > rankOf('fireResistance', 'EI 90')));
  test('unknown value is -1', () => assert.equal(rankOf('glulamClass', 'GL99x'), -1));
  test('null value is -1', () => assert.equal(rankOf('glulamClass', null), -1));
  test('F is the weakest reaction class', () => assert.equal(rankOf('reactionToFire', 'F'), 0));
});

describe('compare', () => {
  const t = (name, actual, req, ok, comparable = true) => test(name, () => assert.deepEqual(compare(actual, req), { ok, comparable }));
  t('>= passes at the limit', 200, { op: '>=', value: 200 }, true);
  t('>= fails below', 180, { op: '>=', value: 200 }, false);
  t('<= passes at the limit', 14, { op: '<=', value: 14 }, true);
  t('<= fails above', 14.5, { op: '<=', value: 14 }, false);
  t('<= with decimals', 1.39, { op: '<=', value: 1.4 }, true);
  t('== exact string', 'HDG BS EN ISO 1461', { op: '==', value: 'HDG BS EN ISO 1461' }, true);
  t('== different string', 'Pre-galvanised', { op: '==', value: 'HDG BS EN ISO 1461' }, false);
  t('in list', 'B500C', { op: 'in', value: ['B500B', 'B500C'] }, true);
  t('not in list', 'B500A', { op: 'in', value: ['B500B', 'B500C'] }, false);
  t('rank>= equal', 'GL28h', { op: 'rank>=', value: 'GL28h', rank: 'glulamClass' }, true);
  t('rank>= stronger', 'GL32h', { op: 'rank>=', value: 'GL28h', rank: 'glulamClass' }, true);
  t('rank>= weaker', 'GL24h', { op: 'rank>=', value: 'GL28h', rank: 'glulamClass' }, false);
  t('rank>= unknown value is not comparable', 'GL28', { op: 'rank>=', value: 'GL28h', rank: 'glulamClass' }, false, false);
  t('missing value is not comparable', undefined, { op: '>=', value: 1 }, false, false);
  t('string against numeric op is not comparable', '200mm', { op: '>=', value: 200 }, false, false);
  t('empty string is not comparable', '', { op: '==', value: 'x' }, false, false);
  test('unknown operator throws', () => assert.throws(() => compare(1, { op: '~', value: 1 })));
});

describe('revisions', () => {
  test('A → B', () => assert.equal(nextRevision('A'), 'B'));
  test('C → D', () => assert.equal(nextRevision('C'), 'D'));
  test('no history expects A', () => assert.equal(expectedRevision(base()).expected, 'A'));
  test('prior register revisions are used', () => assert.equal(expectedRevision({ ...base(), priorRevisions: ['A', 'B'] }).expected, 'C'));
  test('earlier submittals in the same package count', () => {
    const a = { ...base(), id: 'X1', revision: 'A', submittedOn: '2026-12-01' };
    const b = { ...base(), id: 'X2', revision: 'B', submittedOn: '2027-01-04' };
    assert.equal(expectedRevision(b, [a, b]).expected, 'B');
  });
  test('later submittals are ignored', () => {
    const a = { ...base(), id: 'X1', revision: 'A', submittedOn: '2027-01-04' };
    const b = { ...base(), id: 'X2', revision: 'B', submittedOn: '2027-02-01' };
    assert.equal(expectedRevision(a, [a, b]).expected, 'A');
  });
  test('other packages are ignored', () => {
    const a = { ...base(), id: 'X1', package: 'OTHER', submittedOn: '2026-12-01' };
    assert.equal(expectedRevision(base(), [a]).expected, 'A');
  });
  test('reused letter is flagged as reused', () => {
    const f = checkRevision({ ...base(), priorRevisions: ['A'] })[0];
    assert.equal(f.code, 'D2'); assert.equal(f.severity, 'major'); assert.match(f.title, /reused/);
  });
  test('skipped letter is flagged out of sequence', () => {
    const f = checkRevision({ ...base(), revision: 'C', priorRevisions: ['A'] })[0];
    assert.match(f.title, /out of sequence/);
  });
  test('correct letter passes and shows the calculation', () => {
    const f = checkRevision({ ...base(), revision: 'B', priorRevisions: ['A'] })[0];
    assert.equal(f.severity, 'pass'); assert.match(f.calc, /expect B/);
  });
});

describe('computeQuantity', () => {
  test('rebar mass uses 0.00617 d² per metre', () => assert.equal(round(computeQuantity({ kind: 'rebar', lines: [{ dia: 16, count: 1, lengthM: 1 }] }), 4), 1.5795));
  test('rebar multiple lines', () => assert.equal(round(computeQuantity({ kind: 'rebar', lines: [{ dia: 16, count: 420, lengthM: 3.6 }, { dia: 12, count: 610, lengthM: 2.4 }, { dia: 20, count: 180, lengthM: 4.8 }] }), 1), 5821.3));
  test('volume in m³ from mm sections', () => assert.equal(round(computeQuantity({ kind: 'volume', lines: [{ count: 48, bMm: 240, hMm: 630, lengthM: 7.5 }] }), 2), 54.43));
  test('area sums count × area', () => assert.equal(round(computeQuantity({ kind: 'area', lines: [{ count: 140, areaM2: 9.4 }] }), 1), 1316));
  test('items sums counts', () => assert.equal(computeQuantity({ kind: 'items', lines: [{ count: 192 }, { count: 2136 }, { count: 192 }] }), 2520));
  test('empty lines total zero', () => assert.equal(computeQuantity({ kind: 'items', lines: [] }), 0));
  test('unknown kind throws', () => assert.throws(() => computeQuantity({ kind: 'weight', lines: [] })));
});

describe('checkCompleteness', () => {
  test('clean package raises nothing', () => assert.deepEqual(codes(checkCompleteness(base())), []));
  test('missing document raises C1 major', () => {
    const s = base(); s.attachments = s.attachments.filter((a) => a.type !== 'member-schedule');
    const f = checkCompleteness(s).find((x) => x.code === 'C1' && x.severity !== 'pass');
    assert.equal(f.severity, 'major'); assert.deepEqual(f.clauses, ['G20/010']);
  });
  test('unsigned transmittal raises C2 blocker', () => {
    const s = base(); s.transmittal = { signed: false, signer: '' };
    assert.equal(checkCompleteness(s).find((x) => x.code === 'C2').severity, 'blocker');
  });
  test('signed flag without signer still raises C2', () => {
    const s = base(); s.transmittal = { signed: true, signer: '' };
    assert.equal(checkCompleteness(s).find((x) => x.code === 'C2').severity, 'blocker');
  });
  test('missing transmittal raises C2', () => {
    const s = base(); delete s.transmittal;
    assert.equal(checkCompleteness(s).find((x) => x.code === 'C2').severity, 'blocker');
  });
  test('missing certificate raises C3', () => {
    const s = base(); s.certificates = s.certificates.slice(1);
    assert.deepEqual(codes(checkCompleteness(s)), ['C3']);
  });
  test('expired certificate raises C4', () => {
    const s = base(); s.certificates[0].expires = '2026-12-31';
    assert.deepEqual(codes(checkCompleteness(s)), ['C4']);
  });
  test('certificate expiring on the submission date is in date', () => {
    const s = base(); s.certificates[0].expires = s.submittedOn;
    assert.deepEqual(codes(checkCompleteness(s)), []);
  });
  test('documents required by two clauses are checked once', () => {
    const s = { ...base(), section: 'G21', clauses: ['G21/010', 'G21/010'] };
    const docsChecked = checkCompleteness(s).filter((x) => x.code === 'C1').map((x) => x.key);
    assert.equal(new Set(docsChecked).size, docsChecked.length);
  });
  test('unknown clause throws', () => assert.throws(() => checkCompleteness({ ...base(), clauses: ['Z99/999'] })));
});

describe('checkSpec', () => {
  test('clean package passes', () => assert.deepEqual(codes(checkSpec(base())), []));
  test('weaker glulam class raises S1 blocker', () => {
    const f = checkSpec({ ...base(), properties: { strengthClass: 'GL24h', moistureContentPct: 12 } })[0];
    assert.equal(f.code, 'S1'); assert.equal(f.severity, 'blocker'); assert.deepEqual(f.clauses, ['G20/210']);
  });
  test('moisture over limit raises S1 major', () => {
    const f = checkSpec({ ...base(), properties: { strengthClass: 'GL28h', moistureContentPct: 16 } }).find((x) => x.severity !== 'pass');
    assert.equal(f.severity, 'major');
  });
  test('missing property raises S2', () => {
    assert.deepEqual(codes(checkSpec({ ...base(), properties: { strengthClass: 'GL28h' } })), ['S2']);
  });
  test('unparseable class raises S2 not S1', () => {
    assert.deepEqual(codes(checkSpec({ ...base(), properties: { strengthClass: 'GL 28', moistureContentPct: 12 } })), ['S2']);
  });
  test('finding names the declared and required value', () => {
    const f = checkSpec({ ...base(), properties: { strengthClass: 'GL24h', moistureContentPct: 12 } })[0];
    assert.match(f.detail, /GL24h/); assert.match(f.detail, /GL28h/);
  });
  test('every flag shows its rule text', () => {
    const f = checkSpec({ ...base(), properties: {} });
    assert.ok(f.every((x) => x.rule === RULES[x.code].rule));
  });
});

describe('checkStandards', () => {
  test('clean package passes', () => assert.deepEqual(codes(checkStandards(base())), []));
  test('missing required standard raises T1', () => {
    assert.deepEqual(codes(checkStandards({ ...base(), citedStandards: ['BS EN 14080', 'BS EN 1995-1-2'] })), ['T1']);
  });
  test('EN without BS prefix satisfies BS EN requirement', () => {
    assert.deepEqual(codes(checkStandards({ ...base(), citedStandards: ['EN 14080', 'EN 1995-1-1', 'EN 1995-1-2'] })), []);
  });
  test('dated reference satisfies undated requirement', () => {
    assert.deepEqual(codes(checkStandards({ ...base(), citedStandards: ['BS EN 14080:2013', 'BS EN 1995-1-1:2004+A2:2014', 'BS EN 1995-1-2:2004'] })), []);
  });
  test('superseded code raises T2 with replacement', () => {
    const f = checkStandards({ ...base(), citedStandards: [...base().citedStandards, 'BS 5268-2:2002'] }).find((x) => x.code === 'T2');
    assert.equal(f.replacedBy, 'BS EN 1995-1-1');
  });
  test('BS 476-20 is superseded', () => assert.ok(codes(checkStandards({ ...base(), citedStandards: [...base().citedStandards, 'BS 476-20'] })).includes('T2')));
  test('BS 5328 is superseded', () => assert.ok(codes(checkStandards({ ...base(), citedStandards: [...base().citedStandards, 'BS 5328:1997'] })).includes('T2')));
  test('BS 8500 is not mistaken for a superseded code', () => assert.deepEqual(codes(checkStandards({ ...base(), citedStandards: [...base().citedStandards, 'BS 8500-1'] })), []));
  test('BS 4766 is not mistaken for BS 476', () => assert.deepEqual(codes(checkStandards({ ...base(), citedStandards: [...base().citedStandards, 'BS 4766'] })), []));
  test('no cited standards raises a T1 per requirement', () => assert.equal(codes(checkStandards({ ...base(), citedStandards: [] })).length, 3));
});

describe('checkLeadTime', () => {
  test('fits with float', () => assert.equal(checkLeadTime(base())[0].severity, 'pass'));
  test('zero float passes', () => {
    const r = checkLeadTime({ ...base(), leadTimeWeeks: 10 })[0];
    assert.equal(r.severity, 'pass'); assert.equal(r.floatDays, 0);
  });
  test('one week too long raises D1', () => {
    const r = checkLeadTime({ ...base(), leadTimeWeeks: 11 })[0];
    assert.equal(r.code, 'D1'); assert.equal(r.floatDays, -7);
  });
  test('calculation is shown', () => assert.match(checkLeadTime(base())[0].calc, /A-210 starts 2027-04-05/));
  test('unknown activity raises D1', () => assert.equal(checkLeadTime({ ...base(), activity: 'A-999' })[0].code, 'D1'));
  test('no programme link skips the check', () => assert.deepEqual(checkLeadTime({ ...base(), activity: undefined }), []));
  test('float arithmetic', () => assert.equal(leadTimeFloat({ ...base(), leadTimeWeeks: 9 }).floatDays, 7));
  test('custom review window is honoured', () => assert.equal(leadTimeFloat({ ...base(), leadTimeWeeks: 10 }, { reviewWindowDays: 21, deliveryBufferDays: 7 }).floatDays, -7));
});

describe('checkQuantities', () => {
  const q = (statedTotal, extra = {}) => ({ ...base(), quantities: { kind: 'area', unit: 'm²', statedTotal, lines: [{ count: 140, areaM2: 9.4 }], ...extra } });
  test('matching total passes', () => assert.deepEqual(codes(checkQuantities(q(1316))), []));
  test('within 1 % passes', () => assert.deepEqual(codes(checkQuantities(q(1328))), []));
  test('transposed digits raise D3', () => assert.deepEqual(codes(checkQuantities(q(1361))), ['D3']));
  test('take-off within 2 % passes', () => assert.deepEqual(codes(checkQuantities(q(1316, { takeoff: 'CLT-CORE-WALLS' }))), []));
  test('take-off out by more than 2 % raises D4', () => assert.deepEqual(codes(checkQuantities({ ...base(), quantities: { kind: 'area', unit: 'm²', statedTotal: 1222, takeoff: 'CLT-CORE-WALLS', lines: [{ count: 130, areaM2: 9.4 }] } })), ['D4']));
  test('no quantities skips the check', () => assert.deepEqual(checkQuantities(base()), []));
  test('D3 shows the computed sum', () => assert.match(checkQuantities(q(1361))[0].calc, /Σ lines = 1316/));
});

describe('checkJudgment', () => {
  test('judgment clause is always routed', () => {
    const f = checkJudgment({ ...base(), clauses: ['G20/240'] });
    assert.equal(f[0].code, 'J1'); assert.equal(f[0].severity, 'review'); assert.equal(f[0].needsReviewer, true);
  });
  test('declared deviation is routed', () => assert.equal(checkJudgment({ ...base(), deviations: [{ text: 'x' }] })[0].code, 'J2'));
  test('no judgment clauses, nothing routed', () => assert.deepEqual(checkJudgment(base()), []));
  test('every judgment clause in the spec routes', () => {
    for (const c of CLAUSES.filter((x) => x.judgment)) {
      assert.equal(checkJudgment({ ...base(), section: c.section, clauses: [c.id] })[0].code, 'J1');
    }
  });
});

describe('spec integrity', () => {
  test('clause ids are unique', () => assert.equal(Object.keys(CLAUSE_INDEX).length, CLAUSES.length));
  test('every clause has quotable text', () => assert.ok(CLAUSES.every((c) => c.text.length > 20)));
  test('every requirement has a severity', () => assert.ok(CLAUSES.filter((c) => c.requirement).every((c) => ['blocker', 'major', 'minor'].includes(c.requirement.severity))));
  test('every submittal clause exists and matches its section', () => {
    for (const s of SUBMITTALS) for (const c of clausesFor(s)) assert.equal(c.section, s.section, `${s.id} ${c.id}`);
  });
});

const EXPECTED = {
  'HY-SUB-G20-001': ['S1', 'T1', 'T2', 'J1'],
  'HY-SUB-G21-001': ['J1'],
  'HY-SUB-G21-002': ['C3', 'D3'],
  'HY-SUB-H11-001': ['S1', 'D1', 'J1'],
  'HY-SUB-Y40-001': ['S1', 'D1'],
  'HY-SUB-P12-001': ['S1', 'T1', 'T2', 'J1'],
  'HY-SUB-E10-001': ['T2'],
  'HY-SUB-E30-001': ['D3'],
  'HY-SUB-E30-002': ['D2'],
  'HY-SUB-Y63-001': ['S1'],
  'HY-SUB-G20-002': ['C2'],
  'HY-SUB-Y40-002': [],
  'HY-SUB-H11-002': ['J1', 'J2'],
  'HY-SUB-P12-002': ['C4'],
};

describe('Holloway Yard submittals', () => {
  const all = triageAll(SUBMITTALS);
  test('there are 14 submittals', () => assert.equal(SUBMITTALS.length, 14));
  for (const s of SUBMITTALS) {
    test(`${s.id} raises ${EXPECTED[s.id].join(', ') || 'nothing'}`, () => assert.deepEqual(codes(all[s.id].flags).sort(), EXPECTED[s.id].slice().sort()));
    test(`${s.id} is never auto-approved`, () => {
      assert.equal(all[s.id].autoApproved, false);
      assert.equal(all[s.id].disposition, 'needs-reviewer');
    });
  }
  test('blockers come first', () => {
    const f = all['HY-SUB-G20-001'].flags;
    assert.equal(f[0].severity, 'blocker'); assert.equal(f[f.length - 1].severity, 'review');
  });
  test('a clean submittal still needs a reviewer', () => {
    const r = all['HY-SUB-Y40-002'];
    assert.equal(r.suggestion, 'no-rule-issues'); assert.equal(r.disposition, 'needs-reviewer');
  });
  test('every flag except programme/revision/transmittal links to a clause', () => {
    for (const s of SUBMITTALS) for (const f of all[s.id].flags) {
      if (['D1', 'D2', 'C2'].includes(f.code) || (f.code === 'D3' && !s.quantities?.clause) || f.code === 'J2' && !f.clauses.length) continue;
      assert.ok(f.clauses.length > 0, `${s.id} ${f.key}`);
    }
  });
  test('triage is deterministic', () => assert.deepEqual(triage(SUBMITTALS[0], SUBMITTALS), triage(SUBMITTALS[0], SUBMITTALS)));
  test('triage does not mutate the submittal', () => {
    const copy = structuredClone(SUBMITTALS[0]); triage(SUBMITTALS[0], SUBMITTALS);
    assert.deepEqual(SUBMITTALS[0], copy);
  });
  test('flag keys are unique within a submittal', () => {
    for (const s of SUBMITTALS) { const k = all[s.id].flags.map((f) => f.key); assert.equal(new Set(k).size, k.length); }
  });
});
