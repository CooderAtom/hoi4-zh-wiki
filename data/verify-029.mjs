// Verify packet-029 translations: count, k order, placeholder token sequence,
// no HTML/wiki markup introduced, no BOM.
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'C:/Users/Atom/Documents/GeneralWS/hoi4-zh-wiki/data/batches';
const files = ['batch-092.json', 'batch-093.json'];
const TAGS = /<\/?[a-zA-Z][^>]*>|\[\[|\{\{|\]\]|\}\}|''/;
const toks = (s) => (String(s).match(/⟦\s*\d+\s*⟧/g) || []).map((t) => t.replace(/\s+/g, ''));
let bad = 0;

for (const f of files) {
  const src = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  const outName = f.replace(/\.json$/, '.zh.json');
  const outPath = path.join(DIR, outName);
  const raw = fs.readFileSync(outPath);
  const problems = [];
  if (raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) problems.push('BOM present');
  const out = JSON.parse(raw.toString('utf8'));
  if (out.batch !== src.batch) problems.push(`batch field ${out.batch} != ${src.batch}`);
  if (!Array.isArray(out.items)) problems.push('items not array');
  if (out.items.length !== src.units.length) problems.push(`count ${out.items.length} != ${src.units.length}`);
  const n = Math.min(out.items.length, src.units.length);
  for (let i = 0; i < n; i++) {
    const a = src.units[i], b = out.items[i];
    if (a.k !== b.k) { problems.push(`k[${i}] ${a.k} != ${b.k}`); continue; }
    const ta = toks(a.en).join(' '), tb = toks(b.zh).join(' ');
    if (ta !== tb) problems.push(`tokens[${i}] ${a.k}: "${ta}" != "${tb}"`);
    if (!b.zh || !b.zh.trim()) problems.push(`empty zh[${i}] ${a.k}`);
    if (TAGS.test(b.zh)) problems.push(`markup[${i}] ${a.k}: ${b.zh.slice(0, 60)}`);
    const extraKeys = Object.keys(b).filter((x) => x !== 'k' && x !== 'zh');
    if (extraKeys.length) problems.push(`extra keys[${i}] ${a.k}: ${extraKeys.join(',')}`);
  }
  if (problems.length) { bad++; console.log(`${outName} FAIL (${problems.length})`); for (const p of problems.slice(0, 20)) console.log('   -', p); }
  else console.log(`${outName} items=${out.items.length} ok`);
}
console.log(bad ? 'RESULT: FAIL' : 'RESULT: ALL OK');
process.exit(bad ? 1 : 0);
