// Holloway Yard: synthetic project specification (NBS / CAWS-style sections).
// All clause wording is fictional and written for this concept.

export const PROJECT = {
  name: 'Holloway Yard',
  code: 'HY',
  description: '8-storey mass-timber office building, London N7 (synthetic project)',
  client: 'Holloway Yard Developments Ltd (fictional)',
  architect: 'Studio Kerrow (fictional)',
  contractor: 'Ashgrove Build (fictional)',
  reviewer: 'Maya Okonjo',
  reviewerRole: 'Project Architect, Studio Kerrow',
  today: '2027-01-11',
};

export const REVIEW_CONFIG = {
  reviewWindowDays: 14,
  deliveryBufferDays: 7,
  quantityTolerancePct: 1,
  takeoffTolerancePct: 2,
};

export const SECTIONS = {
  E10: { code: 'E10', title: 'Mixing/casting/curing in situ concrete', trade: 'Concrete (cores)' },
  E30: { code: 'E30', title: 'Reinforcement for in situ concrete', trade: 'Rebar' },
  G20: { code: 'G20', title: 'Glued laminated timber structure', trade: 'Glulam' },
  G21: { code: 'G21', title: 'Cross-laminated timber panels (project section)', trade: 'CLT' },
  H11: { code: 'H11', title: 'Curtain walling', trade: 'Curtain wall' },
  P12: { code: 'P12', title: 'Fire stopping systems', trade: 'Fire stopping' },
  Y40: { code: 'Y40', title: 'Air handling units', trade: 'HVAC' },
  Y63: { code: 'Y63', title: 'Support components: cables (containment)', trade: 'MEP containment' },
};

// Ordered from weakest to strongest so that rank comparison is a simple index test.
export const RANKS = {
  glulamClass: ['GL20h', 'GL22h', 'GL24h', 'GL26h', 'GL28h', 'GL30h', 'GL32h'],
  concreteClass: ['C25/30', 'C28/35', 'C30/37', 'C32/40', 'C35/45', 'C40/50', 'C45/55'],
  fireResistance: ['EI 30', 'EI 60', 'EI 90', 'EI 120', 'EI 240'],
  reactionToFire: ['F', 'E', 'D', 'C', 'B', 'A2', 'A1'],
};

// Clause: { id, section, title, text, requirement?, requiredDocs?, requiredCerts?, requiredStandards?, judgment? }
// requirement: { prop, op: '>=' | '<=' | '==' | 'in' | 'rank>=', value, rank?, unit?, severity }
export const CLAUSES = [
  // E10 concrete for cores
  { id: 'E10/110', section: 'E10', title: 'Designed concrete for stair and lift cores',
    text: 'Concrete for cores to be a designed concrete to BS 8500-2 and BS EN 206, strength class not less than C32/40, exposure class XC3/XF1.',
    requirement: { prop: 'strengthClass', op: 'rank>=', value: 'C32/40', rank: 'concreteClass', severity: 'blocker' } },
  { id: 'E10/120', section: 'E10', title: 'Maximum water/cement ratio',
    text: 'Maximum free water/cement ratio 0.55 for the specified exposure class.',
    requirement: { prop: 'waterCementRatio', op: '<=', value: 0.55, severity: 'major' } },
  { id: 'E10/130', section: 'E10', title: 'Minimum cement content',
    text: 'Minimum cement content 320 kg/m³ including additions counted under BS 8500-2.',
    requirement: { prop: 'cementContentKgM3', op: '>=', value: 320, unit: 'kg/m³', severity: 'major' } },
  { id: 'E10/010', section: 'E10', title: 'Submittal content: concrete mix',
    text: 'Submit the mix design, third-party product conformity certificate, and 28-day trial mix cube results. Cite BS 8500-1, BS 8500-2 and BS EN 206.',
    requiredDocs: ['mix-design', 'trial-mix-results'],
    requiredCerts: ['product-conformity'],
    requiredStandards: ['BS 8500-1', 'BS 8500-2', 'BS EN 206'] },

  // E30 rebar
  { id: 'E30/110', section: 'E30', title: 'Reinforcing steel grade',
    text: 'Ribbed bar to BS 4449, grade B500B or B500C. Grade B500A is not accepted in core walls.',
    requirement: { prop: 'rebarGrade', op: 'in', value: ['B500B', 'B500C'], severity: 'blocker' } },
  { id: 'E30/120', section: 'E30', title: 'Bar schedules',
    text: 'Bar schedules to BS 8666. Scheduled masses to be calculated at 0.00617 × d² kg/m and totalled per member.',
    requiredDocs: ['bar-schedule'] },
  { id: 'E30/010', section: 'E30', title: 'Submittal content: reinforcement',
    text: 'Submit bar schedules, mill certificates, and a current third-party reinforcement certification certificate for the supplier. Cite BS 4449 and BS 8666.',
    requiredDocs: ['bar-schedule', 'mill-certificates'],
    requiredCerts: ['reinforcement-certification'],
    requiredStandards: ['BS 4449', 'BS 8666'] },

  // G20 glulam
  { id: 'G20/210', section: 'G20', title: 'Glulam strength class',
    text: 'Glued laminated timber to BS EN 14080, homogeneous strength class not less than GL28h, service class 1.',
    requirement: { prop: 'strengthClass', op: 'rank>=', value: 'GL28h', rank: 'glulamClass', severity: 'blocker' } },
  { id: 'G20/220', section: 'G20', title: 'Moisture content at delivery',
    text: 'Moisture content at delivery 10–14 %; maximum 14 %.',
    requirement: { prop: 'moistureContentPct', op: '<=', value: 14, unit: '%', severity: 'major' } },
  { id: 'G20/230', section: 'G20', title: 'Structural and fire design basis',
    text: 'Member and connection design to BS EN 1995-1-1 with UK National Annex; fire design by charring to BS EN 1995-1-2. Superseded permissible-stress codes are not accepted.',
    requiredStandards: ['BS EN 1995-1-1', 'BS EN 1995-1-2'] },
  { id: 'G20/240', section: 'G20', title: 'Exposed glulam appearance',
    text: 'Exposed members to match the approved visual sample panel. Acceptance of appearance is at the architect\u2019s discretion.',
    judgment: true },
  { id: 'G20/250', section: 'G20', title: 'Connection steelwork finish',
    text: 'Steel flitch plates, hangers and dowels hot-dip galvanised to BS EN ISO 1461.',
    requirement: { prop: 'finish', op: '==', value: 'HDG BS EN ISO 1461', severity: 'major' } },
  { id: 'G20/260', section: 'G20', title: 'Submittal content: connections',
    text: 'Submit connection shop drawings and connection design calculations to BS EN 1995-1-1 and BS EN 1993-1-8.',
    requiredDocs: ['shop-drawings', 'structural-calcs'],
    requiredStandards: ['BS EN 1995-1-1', 'BS EN 1993-1-8'] },
  { id: 'G20/010', section: 'G20', title: 'Submittal content: glulam',
    text: 'Submit shop drawings, member schedule, structural calculations, declaration of performance, factory production control certificate and chain-of-custody certificate. Cite BS EN 14080.',
    requiredDocs: ['shop-drawings', 'member-schedule', 'structural-calcs', 'declaration-of-performance'],
    requiredCerts: ['factory-production-control', 'chain-of-custody'],
    requiredStandards: ['BS EN 14080'] },

  // G21 CLT
  { id: 'G21/110', section: 'G21', title: 'CLT floor panel build-up',
    text: 'Floor panels 5-layer, overall thickness not less than 200 mm, to BS EN 16351.',
    requirement: { prop: 'panelThicknessMm', op: '>=', value: 200, unit: 'mm', severity: 'blocker' } },
  { id: 'G21/120', section: 'G21', title: 'Reaction to fire of exposed CLT',
    text: 'Exposed CLT surfaces to achieve reaction to fire class not worse than D-s2,d0 to BS EN 13501-1 before any encapsulation.',
    requirement: { prop: 'reactionToFire', op: 'rank>=', value: 'D', rank: 'reactionToFire', severity: 'major' } },
  { id: 'G21/130', section: 'G21', title: 'Visual grade of exposed soffits',
    text: 'Exposed soffits to visual grade agreed against the approved sample. Knots, resin pockets and glue lines are assessed by the architect on site.',
    judgment: true },
  { id: 'G21/140', section: 'G21', title: 'Panel area against drawing take-off',
    text: 'Total panel area to agree with the architect\u2019s take-off schedule within ±2 %.' },
  { id: 'G21/010', section: 'G21', title: 'Submittal content: CLT',
    text: 'Submit panel layout drawings, panel schedule, declaration of performance and factory production control certificate. Cite BS EN 16351 and BS EN 13501-1.',
    requiredDocs: ['shop-drawings', 'panel-schedule', 'declaration-of-performance'],
    requiredCerts: ['factory-production-control'],
    requiredStandards: ['BS EN 16351', 'BS EN 13501-1'] },

  // H11 curtain wall
  { id: 'H11/210', section: 'H11', title: 'Thermal performance',
    text: 'System thermal transmittance (Ucw) not more than 1.40 W/m²K, calculated to BS EN ISO 12631.',
    requirement: { prop: 'uValue', op: '<=', value: 1.4, unit: 'W/m²K', severity: 'blocker' } },
  { id: 'H11/220', section: 'H11', title: 'Reaction to fire of spandrel insulation',
    text: 'Spandrel insulation and cavity materials to achieve class A2-s1,d0 or better to BS EN 13501-1.',
    requirement: { prop: 'spandrelReactionToFire', op: 'rank>=', value: 'A2', rank: 'reactionToFire', severity: 'blocker' } },
  { id: 'H11/230', section: 'H11', title: 'Finish colour and sightlines',
    text: 'Frame colour and sightlines to match the approved visual mock-up. Appearance acceptance is at the architect\u2019s discretion.',
    judgment: true },
  { id: 'H11/240', section: 'H11', title: 'Bracket fixings into CLT slab edges',
    text: 'Bracket screws into CLT edges to respect edge and end distances in BS EN 1995-1-1. Any change to fixing size or spacing needs structural engineer acceptance; a reviewer judgment.',
    judgment: true },
  { id: 'H11/250', section: 'H11', title: 'Submittal content: brackets',
    text: 'Submit bracket shop drawings and fixing calculations. Cite BS EN 1995-1-1.',
    requiredDocs: ['shop-drawings', 'structural-calcs'],
    requiredStandards: ['BS EN 1995-1-1'] },
  { id: 'H11/010', section: 'H11', title: 'Submittal content: curtain walling',
    text: 'Submit system drawings, thermal calculations, structural calculations and a weathertightness test report. Cite BS EN 13830 and BS EN 13501-1.',
    requiredDocs: ['shop-drawings', 'thermal-calcs', 'structural-calcs', 'weathertightness-test-report'],
    requiredStandards: ['BS EN 13830', 'BS EN 13501-1'] },

  // P12 fire stopping
  { id: 'P12/110', section: 'P12', title: 'Fire resistance of penetration seals',
    text: 'Penetration seals in compartment floors to achieve EI 90 classified to BS EN 13501-2 from tests to BS EN 1366-3.',
    requirement: { prop: 'fireResistance', op: 'rank>=', value: 'EI 90', rank: 'fireResistance', severity: 'blocker' } },
  { id: 'P12/120', section: 'P12', title: 'Tested substrate',
    text: 'Seals must be tested in, or assessed for, the actual substrate (CLT). Applicability of evidence from other substrates is a reviewer judgment.',
    judgment: true },
  { id: 'P12/130', section: 'P12', title: 'Linear joint seals',
    text: 'Linear joint seals at compartment floor edges to achieve EI 60 minimum classified to BS EN 13501-2 from tests to BS EN 1366-4.',
    requirement: { prop: 'fireResistance', op: 'rank>=', value: 'EI 60', rank: 'fireResistance', severity: 'blocker' } },
  { id: 'P12/140', section: 'P12', title: 'Submittal content: linear joints',
    text: 'Submit product data, classification report and installer certification. Cite BS EN 13501-2 and BS EN 1366-4.',
    requiredDocs: ['product-data', 'classification-report'],
    requiredCerts: ['installer-certification'],
    requiredStandards: ['BS EN 13501-2', 'BS EN 1366-4'] },
  { id: 'P12/010', section: 'P12', title: 'Submittal content: fire stopping',
    text: 'Submit product data, classification report and the installer\u2019s third-party certification. Cite BS EN 13501-2 and BS EN 1366-3.',
    requiredDocs: ['product-data', 'classification-report'],
    requiredCerts: ['installer-certification'],
    requiredStandards: ['BS EN 13501-2', 'BS EN 1366-3'] },

  // Y40 AHU
  { id: 'Y40/210', section: 'Y40', title: 'Specific fan power',
    text: 'Specific fan power not more than 1.6 W/(l/s) at design duty.',
    requirement: { prop: 'specificFanPower', op: '<=', value: 1.6, unit: 'W/(l/s)', severity: 'major' } },
  { id: 'Y40/220', section: 'Y40', title: 'Heat recovery efficiency',
    text: 'Dry heat recovery efficiency not less than 75 % at design conditions.',
    requirement: { prop: 'heatRecoveryPct', op: '>=', value: 75, unit: '%', severity: 'major' } },
  { id: 'Y40/010', section: 'Y40', title: 'Submittal content: AHUs',
    text: 'Submit selection data, dimensioned drawings and a performance certificate. Cite BS EN 13053 and BS EN 1886.',
    requiredDocs: ['selection-data', 'shop-drawings'],
    requiredCerts: ['performance-certificate'],
    requiredStandards: ['BS EN 13053', 'BS EN 1886'] },

  // Y63 containment
  { id: 'Y63/110', section: 'Y63', title: 'Cable tray finish',
    text: 'Cable tray and supports hot-dip galvanised after manufacture to BS EN ISO 1461. Pre-galvanised material is not accepted in the basement plant room.',
    requirement: { prop: 'finish', op: '==', value: 'HDG BS EN ISO 1461', severity: 'blocker' } },
  { id: 'Y63/010', section: 'Y63', title: 'Submittal content: containment',
    text: 'Submit product data, load tables and support spacing calculations. Cite BS EN 61537.',
    requiredDocs: ['product-data', 'load-tables'],
    requiredStandards: ['BS EN 61537'] },
];

export const CLAUSE_INDEX = Object.fromEntries(CLAUSES.map((c) => [c.id, c]));

// Superseded or non-accepted references and what replaced them.
export const SUPERSEDED = {
  'BS 5268-2': 'BS EN 1995-1-1',
  'BS 5328': 'BS 8500 / BS EN 206',
  'BS 8110': 'BS EN 1992-1-1',
  'BS 476-22': 'BS EN 13501-2 classification',
  'BS 476-20': 'BS EN 13501-2 classification',
};

// Construction programme activities that each submittal must arrive on site for.
export const SCHEDULE = [
  { id: 'A-110', name: 'Core walls: concrete pours GF–L2', start: '2026-12-07' },
  { id: 'A-120', name: 'Core walls: concrete pours L3–L8', start: '2027-03-01' },
  { id: 'A-210', name: 'Glulam frame erection L1–L4', start: '2027-04-05' },
  { id: 'A-220', name: 'CLT floor panels L1–L4', start: '2027-04-19' },
  { id: 'A-240', name: 'CLT core lining walls', start: '2027-04-12' },
  { id: 'A-310', name: 'Curtain wall installation (east)', start: '2027-06-14' },
  { id: 'A-330', name: 'Fire stopping: services penetrations', start: '2027-07-05' },
  { id: 'A-410', name: 'AHU delivery and crane lift to roof', start: '2027-05-24' },
  { id: 'A-420', name: 'MEP containment first fix', start: '2027-05-10' },
];

export const SCHEDULE_INDEX = Object.fromEntries(SCHEDULE.map((a) => [a.id, a]));

// Drawing take-offs that submitted quantities are checked against.
export const TAKEOFFS = {
  'CLT-FLOORS-L1-L8': { label: 'CLT floor panels L1–L8', quantity: 4860, unit: 'm²' },
  'CLT-CORE-WALLS': { label: 'CLT core lining walls', quantity: 1320, unit: 'm²' },
};

export const DOC_LABELS = {
  'mix-design': 'Mix design',
  'trial-mix-results': '28-day trial mix results',
  'bar-schedule': 'Bar schedule',
  'mill-certificates': 'Mill certificates',
  'shop-drawings': 'Shop drawings',
  'member-schedule': 'Member schedule',
  'structural-calcs': 'Structural calculations',
  'declaration-of-performance': 'Declaration of performance',
  'panel-schedule': 'Panel schedule',
  'thermal-calcs': 'Thermal calculations',
  'weathertightness-test-report': 'Weathertightness test report',
  'product-data': 'Product data sheet',
  'classification-report': 'Classification report',
  'selection-data': 'Selection data',
  'load-tables': 'Load tables',
};

export const CERT_LABELS = {
  'product-conformity': 'Third-party product conformity certificate',
  'reinforcement-certification': 'Reinforcement certification certificate',
  'factory-production-control': 'Factory production control certificate',
  'chain-of-custody': 'Chain-of-custody certificate',
  'installer-certification': 'Installer third-party certification',
  'performance-certificate': 'Performance certificate',
};
