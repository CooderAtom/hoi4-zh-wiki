// List work packets that still have untranslated batches, in packet order.
import fs from 'node:fs';
import path from 'node:path';
import { DATA, readJson } from './lib.mjs';

const dir = path.join(DATA, 'work');
const files = fs.readdirSync(dir).filter((f) => /^packet-\d+\.json$/.test(f)).sort();
const out = [];
for (const f of files) {
  const p = readJson(path.join(dir, f));
  const pending = (p.files || []).filter((b) => !fs.existsSync(path.join(DATA, 'batches', b.replace(/\.json$/, '.zh.json'))));
  if (pending.length) out.push({ packet: f.replace(/\.json$/, ''), num: Number(f.match(/\d+/)[0]), units: p.units, files: p.files.length, pending: pending.length });
}
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const limit = Number(arg('--limit', 24));
console.log(`packets total=${files.length} with work left=${out.length}`);
console.log('next packets:');
for (const o of out.slice(0, limit)) console.log(`  ${o.packet}  batches=${o.files} pending=${o.pending} units=${o.units}`);
console.log('  ...');
console.log('first pending packet number:', out[0]?.num);
