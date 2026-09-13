'use strict';
const fs = require('fs');
const path = require('path');

const dir = 'C:/Users/Atom/Documents/GeneralWS/hoi4-zh-wiki/data/batches';
const tmp = 'C:/Users/Atom/Documents/GeneralWS/hoi4-zh-wiki/data/work/tmp-035';

const phTokens = (s) => s.match(/⟦\d+⟧/g) || [];
const numTokens = (s) => s.match(/-?\d+(?:[.,]\d+)?/g) || [];
const badHtml = /<\/?(?:div|span|a|b|i|em|p|br|table|tr|td|th|ul|ol|li|h[1-6]|ref|nowiki|code|pre)\b/i;

const problems = [];
const warnings = [];

for (const n of [138, 139]) {
  const src = JSON.parse(fs.readFileSync(path.join(dir, `batch-${n}.json`), 'utf8'));
  const raw = fs.readFileSync(path.join(tmp, `zh-${n}.txt`), 'utf8');
  let lines = raw.split(/\r?\n/);
  while (lines.length && lines[lines.length - 1] === '') lines.pop();

  if (lines.length !== src.units.length) {
    problems.push(`batch ${n}: line count ${lines.length} != source units ${src.units.length}`);
  }

  const items = src.units.map((u, i) => {
    const zh = lines[i] === undefined ? '' : lines[i];
    const a = phTokens(u.en).join(' ');
    const b = phTokens(zh).join(' ');
    if (a !== b) problems.push(`batch ${n} #${i} k=${u.k}: placeholder seq [${a}] != [${b}]`);
    if (phTokens(zh).length !== phTokens(u.en).length)
      problems.push(`batch ${n} #${i} k=${u.k}: placeholder count differs`);
    const stripped = zh.replace(/⟦\d+⟧/g, '');
    if (/[⟦⟧]/.test(stripped)) problems.push(`batch ${n} #${i} k=${u.k}: malformed placeholder`);
    if (!zh.trim()) problems.push(`batch ${n} #${i} k=${u.k}: empty translation`);
    if (badHtml.test(zh)) problems.push(`batch ${n} #${i} k=${u.k}: html/wiki tag in output`);
    if (/\|\||\[\[|\{\{/.test(zh)) problems.push(`batch ${n} #${i} k=${u.k}: wiki markup in output`);

    const srcNums = numTokens(u.en).slice().sort().join(',');
    const zhNums = numTokens(zh).slice().sort().join(',');
    if (srcNums !== zhNums) warnings.push(`batch ${n} #${i} k=${u.k}: numbers [${srcNums}] -> [${zhNums}]`);

    return { k: u.k, zh };
  });

  const out = {
    batch: n,
    items,
  };
  const body =
    '{\n "batch": ' + n + ',\n "items": [\n' +
    items.map((it) => '  ' + JSON.stringify(it)).join(',\n') +
    '\n ]\n}\n';
  const outPath = path.join(dir, `batch-${n}.zh.json`);
  fs.writeFileSync(outPath, body, 'utf8');

  // ---- independent re-read verification of the written file ----
  const rt = fs.readFileSync(outPath, 'utf8');
  if (rt.charCodeAt(0) === 0xfeff) problems.push(`batch ${n}: BOM in output`);
  const parsed = JSON.parse(rt);
  if (parsed.batch !== n) problems.push(`batch ${n}: batch field is ${parsed.batch}`);
  if (!Array.isArray(parsed.items)) problems.push(`batch ${n}: items not an array`);
  if (parsed.items.length !== src.units.length)
    problems.push(`batch ${n}: wrote ${parsed.items.length} items, source has ${src.units.length}`);
  parsed.items.forEach((it, i) => {
    const u = src.units[i];
    if (!u) return problems.push(`batch ${n}: extra item at ${i}`);
    if (it.k !== u.k) problems.push(`batch ${n} #${i}: k ${it.k} != ${u.k}`);
    if (phTokens(it.zh).join(' ') !== phTokens(u.en).join(' '))
      problems.push(`batch ${n} #${i} k=${u.k}: written placeholder mismatch`);
    if (typeof it.zh !== 'string' || !it.zh.trim())
      problems.push(`batch ${n} #${i} k=${u.k}: written zh empty/not string`);
    if (Object.keys(it).join(',') !== 'k,zh')
      problems.push(`batch ${n} #${i} k=${u.k}: unexpected item keys ${Object.keys(it)}`);
  });

  console.log(`batch-${n}.zh.json items=${parsed.items.length} written`);
}

console.log('--- warnings (number token diffs, review manually) ---');
if (!warnings.length) console.log('none');
for (const w of warnings) console.log(w);
console.log('--- problems ---');
if (!problems.length) console.log('none');
for (const p of problems) console.log(p);
process.exitCode = problems.length ? 1 : 0;
