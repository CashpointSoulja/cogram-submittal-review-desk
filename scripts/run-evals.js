import { runEvals } from '../public/js/evals.js';

const r = runEvals();
const pct = (x) => `${(x * 100).toFixed(1)} %`;
console.log('Golden set: %d cases, %d seeded defects', r.cases, r.seeded);
for (const row of r.rows) {
  const tag = row.missed.length ? 'MISS' : row.falsePositives.length ? 'FALSE POSITIVE' : 'ok';
  console.log(`${row.id}  expect [${row.expect.join(', ')}]  found [${row.found.join(', ')}]  ${tag}  ${row.title}`);
}
console.log(`Caught ${r.caught}/${r.seeded} (${pct(r.catchRate)}); missed ${r.missed}; false positives ${r.falsePositives}; precision ${pct(r.precision)}`);
console.log(`Clean cases: ${r.cleanCases}, clean cases with any flag: ${r.cleanCasesWithFlags}`);
