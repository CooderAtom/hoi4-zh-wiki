import fs from 'node:fs';
import path from 'node:path';

const dir = 'C:/Users/Atom/Documents/GeneralWS/hoi4-zh-wiki/data/batches';
const tmp = 'C:/Users/Atom/Documents/GeneralWS/hoi4-zh-wiki/data/work';

const jobs = [
  { num: 78, src: 'batch-078.json', parts: ['tmp-022-078-part1.json'] },
  { num: 79, src: 'batch-079.json', parts: ['tmp-022-079.json'] },
];

const phRe = /⟦\d+⟧/g;
let fail = 0;

for (const job of jobs) {
  const src = JSON.parse(fs.readFileSync(path.join(dir, job.src), 'utf8'));
  const map = {};
  for (const p of job.parts) {
    const part = JSON.parse(fs.readFileSync(path.join(tmp, p), 'utf8'));
    for (const [k, v] of Object.entries(part)) {
      if (Object.prototype.hasOwnProperty.call(map, k)) throw new Error('dup key ' + k);
      map[k] = v;
    }
  }

  const items = [];
  const problems = [];
  src.units.forEach((u, i) => {
    const zh = map[u.k];
    if (typeof zh !== 'string') { problems.push(`missing k=${u.k} (index ${i})`); items.push({ k: u.k, zh: '' }); return; }
    const srcPh = (u.en.match(phRe) || []).join(' ');
    const zhPh = (zh.match(phRe) || []).join(' ');
    if (srcPh !== zhPh) problems.push(`placeholder mismatch k=${u.k} en=[${srcPh}] zh=[${zhPh}]`);
    if (/<[a-zA-Z/][^>]*>/.test(zh)) problems.push(`html-looking tag k=${u.k}`);
    if (/\[\[|\{\{|'''|''/.test(zh)) problems.push(`wiki markup k=${u.k}`);
    if (zh.trim() === '') problems.push(`empty zh k=${u.k}`);
    items.push({ k: u.k, zh });
  });

  const extra = Object.keys(map).filter(k => !src.units.some(u => u.k === k));
  if (extra.length) problems.push('extra keys: ' + extra.join(','));

  const out = { batch: job.num, items };
  const outPath = path.join(dir, `batch-${String(job.num).padStart(3, '0')}.zh.json`);
  fs.writeFileSync(outPath, JSON.stringify(out), { encoding: 'utf8' });

  // independent re-read verification of the written file
  const back = JSON.parse(fs.readFileSync(outPath, 'utf8'));
  const chk = [];
  if (back.batch !== job.num) chk.push('batch number mismatch');
  if (back.items.length !== src.units.length) chk.push(`count ${back.items.length} != ${src.units.length}`);
  src.units.forEach((u, i) => {
    const it = back.items[i];
    if (!it || it.k !== u.k) chk.push(`k mismatch at ${i}`);
    const a = (u.en.match(phRe) || []).join(' ');
    const b = ((it && it.zh) || '').match(phRe) || [];
    if (a !== b.join(' ')) chk.push(`ph mismatch at ${i} k=${u.k}`);
  });
  const bom = fs.readFileSync(outPath);
  if (bom[0] === 0xEF && bom[1] === 0xBB && bom[2] === 0xBF) chk.push('BOM present');

  const all = problems.concat(chk);
  if (all.length) { fail++; console.log(`batch-${job.num}: FAIL`); all.slice(0, 20).forEach(p => console.log('   - ' + p)); }
  else console.log(`batch-${String(job.num).padStart(3, '0')}.zh.json items=${items.length} ok`);
}
if (fail) process.exitCode = 1;
