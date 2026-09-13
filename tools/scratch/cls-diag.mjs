// Diagnose the denominator collapse: which classifier drops the 8.4M chars?
import { readJson, DATA } from '../lib.mjs';
import path from 'node:path';
import { isCodeUnit, isMathArtifact, isTemplateArtifact } from '../classify.mjs';

const units = readJson(path.join(DATA, 'units.json'), []);
const inStore = new Set();
const tm = readJson(path.join(DATA, 'tm.json'), {});
for (const k of Object.keys(tm)) inStore.add(k);

let n = 0, byCode = 0, byMath = 0, byTemplate = 0, prose = 0;
let chCode = 0, chMath = 0, chTemplate = 0, chProse = 0, total = 0;
const samples = { math: [], template: [], code: [] };
for (const u of units) {
  const en = u.en || '';
  const weight = en.length * (u.pages || 1);
  total += weight;
  if (isTemplateArtifact(en)) { byTemplate++; chTemplate += weight; if (samples.template.length < 3) samples.template.push(en.slice(0, 90)); continue; }
  if (isMathArtifact(en)) { byMath++; chMath += weight; if (samples.math.length < 3) samples.math.push(en.slice(0, 90)); continue; }
  if (isCodeUnit(en)) { byCode++; chCode += weight; if (samples.code.length < 3) samples.code.push(en.slice(0, 90)); continue; }
  prose++; chProse += weight; n++;
}
const f = (x) => x.toLocaleString();
console.log(`units=${f(units.length)}  total weighted chars=${f(total)}`);
console.log(`  template-artifact: ${f(byTemplate)} units  ${f(chTemplate)} ch`);
console.log(`  math-artifact    : ${f(byMath)} units  ${f(chMath)} ch`);
console.log(`  code/identifier  : ${f(byCode)} units  ${f(chCode)} ch`);
console.log(`  PROSE            : ${f(prose)} units  ${f(chProse)} ch`);
for (const [k, v] of Object.entries(samples)) {
  console.log(`  samples ${k}:`);
  for (const s of v) console.log('    ' + JSON.stringify(s));
}
