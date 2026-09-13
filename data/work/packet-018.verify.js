// Independent verifier for packet-018 outputs.
// Checks, per batch: unit count == item count, k sequence identical,
// per-item placeholder token sequence identical, plus structural rules
// (no HTML/wiki markup introduced, output is pure JSON with batch number).
const fs = require('fs');
const path = require('path');
const batches = path.join(path.dirname(__dirname), 'batches');
const packets = JSON.parse(fs.readFileSync(path.join(__dirname, 'packet-018.json'), 'utf8'));
const toks = (s) => s.match(/\u27e6[^\u27e7]*\u27e7/g) || [];
let fail = 0;

const stripBom = (buf) => (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF ? buf.slice(3) : buf);

for (const f of packets.files) {
  const tag = f.replace('batch-', '').replace('.json', '');
  const src = JSON.parse(fs.readFileSync(path.join(batches, f), 'utf8'));
  const outPath = path.join(batches, `batch-${tag}.zh.json`);
  const rawBuf = fs.readFileSync(outPath);
  const errs = [];
  if (rawBuf[0] === 0xEF) errs.push('BOM present');

  let out;
  try { out = JSON.parse(stripBom(rawBuf).toString('utf8')); }
  catch (e) { errs.push('invalid JSON: ' + e.message); }

  if (out) {
    if (out.batch !== Number(tag)) errs.push(`batch field ${out.batch} != ${Number(tag)}`);
    if (!Array.isArray(out.items)) errs.push('items is not an array');
    else {
      if (out.items.length !== src.units.length)
        errs.push(`count ${out.items.length} != ${src.units.length}`);
      const n = Math.min(out.items.length, src.units.length);
      for (let i = 0; i < n; i++) {
        const s = src.units[i], o = out.items[i];
        if (Object.keys(o).join(',') !== 'k,zh') errs.push(`item ${i}: keys ${Object.keys(o)}`);
        if (o.k !== s.k) errs.push(`item ${i}: k ${o.k} != ${s.k}`);
        const a = toks(s.en), b = toks(o.zh || '');
        if (a.join('|') !== b.join('|'))
          errs.push(`item ${i} (k=${s.k}): ph [${a}] != [${b}]`);
        if (!o.zh || !o.zh.trim()) errs.push(`item ${i} (k=${s.k}): empty zh`);
        if (!/<[a-zA-Z/!]/.test(s.en) && /<[a-zA-Z/!][^>]*>/.test(o.zh || ''))
          errs.push(`item ${i} (k=${s.k}): HTML introduced`);
        for (const m of ['[[', ']]', '{{', '}}', '&nbsp;', "''"])
          if (!s.en.includes(m) && (o.zh || '').includes(m))
            errs.push(`item ${i} (k=${s.k}): wiki markup ${m} introduced`);
        const nums = (s) => (s.match(/-?\d+(?:[.,]\d+)?%?/g) || []).sort().join(',');
        const WORDS = { three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twenty: 20, fifty: 50, hundred: 100, thousand: 1000 };
        // Spell out day-of-month numbers so "1947 年 12 月 31 日" is not flagged
        // against "Dec 31st, 1947" (the month is written numerically in Chinese),
        // and map English number words to digits ("five of the seven" -> "5"/"7").
        const norm = (s) => s
          .replace(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?/g, '$1 ⟪D⟫')
          .replace(/(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?/g, '⟪D⟫ $2')
          .replace(/(\d{1,2})\s*日/g, '⟪D⟫ 日')
          .replace(/(\d{1,2})\s*月/g, '⟪M⟫ 月')
          .replace(/\b(three|four|five|six|seven|eight|nine|ten|twenty|fifty|hundred|thousand)\b/gi,
            (w) => String(WORDS[w.toLowerCase()]));
        if (nums(norm(s.en)) !== nums(norm(o.zh || '')))
          errs.push(`item ${i} (k=${s.k}): numbers [${nums(norm(s.en))}] != [${nums(norm(o.zh || ''))}]`);
      }
    }
  }
  if (errs.length) { fail++; console.log(`FAIL ${path.basename(outPath)}`); errs.slice(0, 15).forEach((e) => console.log('   - ' + e)); }
  else console.log(`${path.basename(outPath)} items=${out.items.length} ok`);
}
console.log(fail ? `\n${fail} file(s) FAILED` : '\nall checks passed');
process.exit(fail ? 1 : 0);
