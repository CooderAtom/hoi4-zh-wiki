// Among non-structural no-op units, split "genuine prose that is silently stuck" from
// "code/identifier that residue.mjs simply fails to recognise".
import fs from 'node:fs';
import path from 'node:path';
import { isStructuralResidue } from '../residue.mjs';
const dir = 'data/pageblocks';
const units = JSON.parse(fs.readFileSync('data/units.json', 'utf8'));
const byK = new Map(units.map((u) => [u.k, u.en]));
const real = [];
for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.zh.json'))) {
  let b;
  try { b = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { continue; }
  for (const it of b.items || []) {
    const en = it.en !== undefined ? it.en : byK.get(it.k);
    if (en === undefined || it.zh !== en) continue;
    if (!isStructuralResidue(en)) real.push({ f: path.basename(f), k: it.k, en });
  }
}
const isCodey = (s) => {
  const t = s.replace(/\u27E6\d+\u27E7/g, ' ').trim();
  if (/=/.test(t)) return true;                       // "NAME = value" define/assignment
  if (/^[A-Za-z][A-Za-z0-9_.]*$/.test(t)) return true; // single dotted identifier
  if (/^[A-Za-z_]+(\.[A-Za-z_]+)+$/.test(t)) return true;
  if (/[{}]/.test(t)) return true;
  // no lowercase English word of >=3 letters at all -> not prose
  if (!/\b[a-z]{3,}\b/.test(t)) return true;
  return false;
};
const prose = real.filter((r) => !isCodey(r.en));
const codey = real.filter((r) => isCodey(r.en));
console.log('non-structural no-ops=' + real.length + '  of which likely-prose=' + prose.length + '  looks-like-code=' + codey.length);
fs.writeFileSync('noops-prose.txt', prose.map((r) => r.f + '\t' + r.k + '\t' + JSON.stringify(r.en)).join('\n') + '\n', 'utf8');
fs.writeFileSync('noops-codey.txt', codey.map((r) => r.f + '\t' + r.k + '\t' + JSON.stringify(r.en)).join('\n') + '\n', 'utf8');
const per = new Map();
for (const r of prose) per.set(r.f, (per.get(r.f) || 0) + 1);
console.log('--- likely-prose per file ---');
for (const [p, n] of [...per.entries()].sort((a, b) => b[1] - a[1])) console.log('  ' + n + '  ' + p);
console.log('--- all likely-prose units ---');
for (const r of prose) console.log(r.f + ' ' + r.k + ' :: ' + r.en);
