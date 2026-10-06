// 24 golden submittals with seeded defects. `expect` lists the defect codes a careful
// human checker would raise. Judgment routing (J1/J2) is not scored as detection.
const signed = { signed: true, signer: 'Test Signer' };
const docs = (...t) => t.map((type) => ({ type }));

const BASE = {
  glulam: {
    section: 'G20', package: 'GOLD-G20', revision: 'A', submittedOn: '2027-01-04', activity: 'A-210', leadTimeWeeks: 8,
    clauses: ['G20/210', 'G20/220', 'G20/230', 'G20/010'],
    properties: { strengthClass: 'GL28h', moistureContentPct: 12 },
    citedStandards: ['BS EN 14080', 'BS EN 1995-1-1', 'BS EN 1995-1-2'],
    attachments: docs('shop-drawings', 'member-schedule', 'structural-calcs', 'declaration-of-performance'),
    certificates: [{ type: 'factory-production-control', expires: '2028-01-01' }, { type: 'chain-of-custody', expires: '2028-01-01' }],
    transmittal: signed,
    quantities: { kind: 'volume', unit: 'm³', statedTotal: 54.43, lines: [{ mark: 'GB1', count: 48, bMm: 240, hMm: 630, lengthM: 7.5 }] },
  },
  clt: {
    section: 'G21', package: 'GOLD-G21', revision: 'A', submittedOn: '2027-01-04', activity: 'A-220', leadTimeWeeks: 10,
    clauses: ['G21/110', 'G21/120', 'G21/140', 'G21/010'],
    properties: { panelThicknessMm: 200, reactionToFire: 'D-s2,d0' },
    citedStandards: ['BS EN 16351', 'BS EN 13501-1'],
    attachments: docs('shop-drawings', 'panel-schedule', 'declaration-of-performance'),
    certificates: [{ type: 'factory-production-control', expires: '2028-01-01' }],
    transmittal: signed,
    quantities: { kind: 'area', unit: 'm²', takeoff: 'CLT-FLOORS-L1-L8', statedTotal: 4857.2, lines: [
      { mark: 'F1', count: 288, areaM2: 14.4 }, { mark: 'F2', count: 64, areaM2: 9.8 }, { mark: 'F3', count: 16, areaM2: 4.6 }] },
  },
  curtain: {
    section: 'H11', package: 'GOLD-H11', revision: 'A', submittedOn: '2027-01-04', activity: 'A-310', leadTimeWeeks: 18,
    clauses: ['H11/210', 'H11/220', 'H11/010'],
    properties: { uValue: 1.3, spandrelReactionToFire: 'A2-s1,d0' },
    citedStandards: ['BS EN 13830', 'BS EN 13501-1'],
    attachments: docs('shop-drawings', 'thermal-calcs', 'structural-calcs', 'weathertightness-test-report'),
    certificates: [], transmittal: signed,
  },
  ahu: {
    section: 'Y40', package: 'GOLD-Y40', revision: 'A', submittedOn: '2027-01-04', activity: 'A-410', leadTimeWeeks: 14,
    clauses: ['Y40/210', 'Y40/220', 'Y40/010'],
    properties: { specificFanPower: 1.5, heatRecoveryPct: 80 },
    citedStandards: ['BS EN 13053', 'BS EN 1886'],
    attachments: docs('selection-data', 'shop-drawings'),
    certificates: [{ type: 'performance-certificate', expires: '2028-01-01' }], transmittal: signed,
  },
  firestop: {
    section: 'P12', package: 'GOLD-P12', revision: 'A', submittedOn: '2027-01-04', activity: 'A-330', leadTimeWeeks: 6,
    clauses: ['P12/110', 'P12/010'],
    properties: { fireResistance: 'EI 90' },
    citedStandards: ['BS EN 13501-2', 'BS EN 1366-3'],
    attachments: docs('product-data', 'classification-report'),
    certificates: [{ type: 'installer-certification', expires: '2028-01-01' }], transmittal: signed,
  },
  concrete: {
    section: 'E10', package: 'GOLD-E10', revision: 'A', submittedOn: '2026-10-19', activity: 'A-110', leadTimeWeeks: 2,
    clauses: ['E10/110', 'E10/120', 'E10/130', 'E10/010'],
    properties: { strengthClass: 'C35/45', waterCementRatio: 0.5, cementContentKgM3: 340 },
    citedStandards: ['BS 8500-1', 'BS 8500-2', 'BS EN 206'],
    attachments: docs('mix-design', 'trial-mix-results'),
    certificates: [{ type: 'product-conformity', expires: '2028-01-01' }], transmittal: signed,
  },
  rebar: {
    section: 'E30', package: 'GOLD-E30', revision: 'A', submittedOn: '2027-01-04', activity: 'A-120', leadTimeWeeks: 4,
    clauses: ['E30/110', 'E30/120', 'E30/010'],
    properties: { rebarGrade: 'B500C' },
    citedStandards: ['BS 4449', 'BS 8666'],
    attachments: docs('bar-schedule', 'mill-certificates'),
    certificates: [{ type: 'reinforcement-certification', expires: '2028-01-01' }], transmittal: signed,
    quantities: { kind: 'rebar', unit: 'kg', statedTotal: 2388.0, lines: [{ mark: 'W01', dia: 16, count: 420, lengthM: 3.6 }] },
  },
  containment: {
    section: 'Y63', package: 'GOLD-Y63', revision: 'A', submittedOn: '2027-01-04', activity: 'A-420', leadTimeWeeks: 4,
    clauses: ['Y63/110', 'Y63/010'],
    properties: { finish: 'HDG BS EN ISO 1461' },
    citedStandards: ['BS EN 61537'],
    attachments: docs('product-data', 'load-tables'),
    certificates: [], transmittal: signed,
  },
};

const without = (list, type) => list.filter((x) => x.type !== type);

function make(n, base, title, mutate, expect, note = {}) {
  const s = structuredClone(BASE[base]);
  s.id = `GOLD-${String(n).padStart(2, '0')}`;
  s.title = title;
  s.package = `${s.package}-${n}`;
  mutate(s);
  return { id: s.id, trade: base, title, submittal: s, expect, ...note };
}

export const GOLDEN = [
  make(1, 'glulam', 'Clean glulam package', () => {}, []),
  make(2, 'glulam', 'Glulam below strength class', (s) => { s.properties.strengthClass = 'GL24h'; }, ['S1']),
  make(3, 'glulam', 'Glulam missing declaration of performance', (s) => { s.attachments = without(s.attachments, 'declaration-of-performance'); }, ['C1']),
  make(4, 'glulam', 'Glulam designed to withdrawn code', (s) => { s.citedStandards = ['BS EN 14080', 'BS 5268-2', 'BS EN 1995-1-2']; }, ['T1', 'T2']),
  make(5, 'clt', 'Clean CLT floor package', () => {}, []),
  make(6, 'clt', 'CLT panel too thin', (s) => { s.properties.panelThicknessMm = 180; }, ['S1']),
  make(7, 'clt', 'CLT schedule total mistyped', (s) => { s.quantities.statedTotal = 4587.2; }, ['D3']),
  make(8, 'clt', 'CLT area short of drawing take-off', (s) => { s.quantities.lines[0].count = 270; s.quantities.statedTotal = 4598.0; }, ['D4']),
  make(9, 'curtain', 'Curtain wall over U-value limit', (s) => { s.properties.uValue = 1.6; }, ['S1']),
  make(10, 'curtain', 'Curtain wall transmittal unsigned', (s) => { s.transmittal = { signed: false, signer: '' }; }, ['C2']),
  make(11, 'ahu', 'AHU lead time misses roof lift', (s) => { s.leadTimeWeeks = 22; }, ['D1']),
  make(12, 'ahu', 'AHU fan power too high', (s) => { s.properties.specificFanPower = 1.8; }, ['S1']),
  make(13, 'firestop', 'Penetration seal under-rated', (s) => { s.properties.fireResistance = 'EI 60'; }, ['S1']),
  make(14, 'firestop', 'Installer certification missing', (s) => { s.certificates = []; }, ['C3']),
  make(15, 'firestop', 'Installer certification expired', (s) => { s.certificates[0].expires = '2026-12-01'; }, ['C4']),
  make(16, 'concrete', 'Clean concrete mix', () => {}, []),
  make(17, 'concrete', 'Water/cement ratio too high', (s) => { s.properties.waterCementRatio = 0.6; }, ['S1']),
  make(18, 'concrete', 'Trial mix results missing', (s) => { s.attachments = without(s.attachments, 'trial-mix-results'); }, ['C1']),
  make(19, 'rebar', 'Rebar grade B500A in core walls', (s) => { s.properties.rebarGrade = 'B500A'; }, ['S1']),
  make(20, 'rebar', 'Rebar mass overstated', (s) => { s.quantities.statedTotal = 2620; }, ['D3']),
  make(21, 'rebar', 'Rebar revision letter reused', (s) => { s.priorRevisions = ['A']; }, ['D2']),
  make(22, 'containment', 'Pre-galvanised tray in plant room', (s) => { s.properties.finish = 'Pre-galvanised BS EN 10346'; }, ['S1']),
  make(23, 'glulam', 'Weaker class hidden in a schedule note', (s) => {
    s.notes = 'Member schedule, note 4: secondary beams B7–B9 supplied in GL24h from stock.';
  }, ['S1'], { honest: 'miss', why: 'The rules read the declared strength class (GL28h). The weaker class is only written in a free-text note inside the member schedule, which the rules do not parse. A reviewer reading the schedule would catch it.' }),
  make(24, 'firestop', 'Expired certificate with renewal in the pack', (s) => {
    s.certificates[0].expires = '2026-12-31';
    s.notes = 'Renewal letter from the certification body (valid to 2027-12-31) attached as page 14 of the product data.';
  }, [], { honest: 'false-positive', why: 'The renewal is a scanned letter inside another document, so the rules only see the expired certificate record and flag it.' }),
];
