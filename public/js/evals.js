import { triage } from './engine.js';
import { GOLDEN } from './golden.js';

export const SCORED = (code) => !code.startsWith('J');

export function scoreCase(g) {
  const result = triage(g.submittal, []);
  const found = [...new Set(result.flags.map((f) => f.code).filter(SCORED))];
  const caught = g.expect.filter((c) => found.includes(c));
  const missed = g.expect.filter((c) => !found.includes(c));
  const falsePositives = found.filter((c) => !g.expect.includes(c));
  return { id: g.id, title: g.title, trade: g.trade, expect: g.expect, found, caught, missed, falsePositives, honest: g.honest, why: g.why, notes: g.submittal.notes, flags: result.flags };
}

export function runEvals(cases = GOLDEN) {
  const rows = cases.map(scoreCase);
  const seeded = rows.reduce((t, r) => t + r.expect.length, 0);
  const caught = rows.reduce((t, r) => t + r.caught.length, 0);
  const fp = rows.reduce((t, r) => t + r.falsePositives.length, 0);
  const raised = caught + fp;
  const cleanCases = rows.filter((r) => r.expect.length === 0);
  return {
    rows,
    cases: rows.length,
    seeded,
    caught,
    missed: seeded - caught,
    falsePositives: fp,
    catchRate: seeded ? caught / seeded : 0,
    precision: raised ? caught / raised : 0,
    cleanCases: cleanCases.length,
    cleanCasesWithFlags: cleanCases.filter((r) => r.falsePositives.length).length,
    misses: rows.filter((r) => r.missed.length),
    fps: rows.filter((r) => r.falsePositives.length),
  };
}
