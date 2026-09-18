// Fetch pristine upstream HTML (published mirror of the same build) for structural diffing.
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.join('cache', 'refsite');
fs.mkdirSync(OUT, { recursive: true });

const PAGES = process.argv.slice(2);
const BASE = 'https://cooderatom.github.io/hoi4-zh-wiki/';

for (const p of PAGES) {
  const url = BASE + p + '.html';
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'hoi4-offline-zh-mirror/0.1' } });
    if (!r.ok) { console.log(`${p}: HTTP ${r.status}`); continue; }
    const t = await r.text();
    fs.writeFileSync(path.join(OUT, p + '.html'), t);
    console.log(`${p}: ${t.length} bytes -> cache/refsite/${p}.html`);
  } catch (e) {
    console.log(`${p}: FAIL ${e.message}`);
  }
}
