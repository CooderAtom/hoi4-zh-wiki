// Prove the search index now reaches text that the old 2200-char cap could never see.
// Uses the SAME tokenizer/scorer as tools/assets/app.js so the result reflects real behaviour.
import fs from 'node:fs';
const raw = fs.readFileSync('site/assets/search-index.js', 'utf8');
const DATA = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
const PAGES = DATA.pages;

function norm(s) {
  return String(s || '').toLowerCase().replace(/[\u3000]/g, ' ').replace(/[''`]/g, "'");
}
function tokens(q) {
  const s = norm(q); const out = [];
  (s.match(/[a-z0-9][a-z0-9'._-]*/g) || []).forEach((t) => { if (t.length > 1) out.push(t); });
  (s.match(/[\u3400-\u9fff]+/g) || []).forEach((run) => {
    if (run.length === 1) { out.push(run); return; }
    for (let i = 0; i < run.length - 1; i++) out.push(run.substr(i, 2));
  });
  if (!out.length && s.trim()) out.push(s.trim());
  return out;
}
function search(q) {
  const toks = tokens(q); const res = [];
  for (const p of PAGES) {
    const title = norm(p.t + ' ' + (p.z || ''));
    const body = norm(p.b || '');
    let s = 0, ok = true;
    for (const t of toks) {
      const inTitle = title.indexOf(t) >= 0;
      let n = 0, idx = body.indexOf(t);
      while (idx >= 0 && n < 12) { n++; idx = body.indexOf(t, idx + t.length); }
      if (!inTitle && !n) { ok = false; break; }
      if (inTitle) { s += 24; if (title.indexOf(t) === 0) s += 10; }
      s += Math.min(n, 8) * 3;
    }
    if (ok && toks.length) res.push({ t: p.t, z: p.z, s });
  }
  return res.sort((a, b) => b.s - a.s);
}

// A term is "deep" if it occurs ONLY beyond char 2200 of the indexed body -- i.e. unreachable
// under the old cap.
function findDeep(needle) {
  const hits = [];
  for (const p of PAGES) {
    const at = String(p.b || '').indexOf(needle);
    if (at >= 0) hits.push({ t: p.t, at });
  }
  return hits;
}

const probes = process.argv.slice(2);
if (!probes.length) { console.log('usage: index-probe.mjs <needle> [...]'); process.exit(0); }
for (const needle of probes) {
  const deep = findDeep(needle).filter((h) => h.at >= 2200);
  const shallow = findDeep(needle).filter((h) => h.at < 2200);
  console.log(`\nneedle "${needle}": total pages=${deep.length + shallow.length}  deep(>=2200)=${deep.length}  shallow=${shallow.length}`);
  if (deep.length) console.log(`  deepest first hit: ${deep[0].t} @ char ${deep[0].at}`);
  const res = search(needle).slice(0, 5);
  console.log(`  search() top hits: ${res.length ? res.map((r) => r.z || r.t).join(' | ') : '(none)'}`);
}
