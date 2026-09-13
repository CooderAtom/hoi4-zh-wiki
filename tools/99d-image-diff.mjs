// Compare the current rendered <img src> set against the previous run to name pages that lost images.
//   node tools/99d-image-diff.mjs
import fs from 'node:fs';
import path from 'node:path';
import { SITE, readJson, writeJson } from './lib.mjs';

const SNAP = path.join(SITE, '..', 'cache', 'img-snapshot.json');
const cur = {};
for (const f of fs.readdirSync(SITE).filter((x) => x.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(SITE, f), 'utf8');
  const srcs = [...html.matchAll(/<img[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]);
  if (srcs.length) cur[f] = srcs;
}
const total = Object.values(cur).reduce((s, v) => s + v.length, 0);
console.log(`pages with img=${Object.keys(cur).length} total img refs=${total}`);

if (fs.existsSync(SNAP)) {
  const prev = readJson(SNAP, {});
  const lost = [], gained = [];
  for (const [f, srcs] of Object.entries(prev)) {
    const now = cur[f] || [];
    const p = new Map(), n = new Map();
    for (const s of srcs) p.set(s, (p.get(s) || 0) + 1);
    for (const s of now) n.set(s, (n.get(s) || 0) + 1);
    for (const [s, c] of p) {
      const d = c - (n.get(s) || 0);
      if (d > 0) lost.push([f, d, s]);
    }
    for (const [s, c] of n) {
      const d = c - (p.get(s) || 0);
      if (d > 0) gained.push([f, d, s]);
    }
  }
  if (lost.length) {
    console.log(`\nimages LOST (${lost.reduce((s, x) => s + x[1], 0)}):`);
    for (const [f, d, s] of lost.slice(0, 40)) console.log(`  -${d}  ${f}  ${s}`);
  } else console.log('\nno images lost vs snapshot');
  if (gained.length) {
    console.log(`images gained (${gained.reduce((s, x) => s + x[1], 0)}):`);
    for (const [f, d, s] of gained.slice(0, 20)) console.log(`  +${d}  ${f}  ${s}`);
  }
}
writeJson(SNAP, cur);
console.log(`\nsnapshot written: ${SNAP}`);
