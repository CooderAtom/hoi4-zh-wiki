// Export the translation units of a page that are still missing from a template file,
// as a single JSON block (avoids the thousands of files 09-page-block.mjs would create).
//   node tools/09e-export-pending.mjs Modifiers [--limit N] [--from N]
import fs from 'node:fs';
import path from 'node:path';
import { DATA, readJson, writeJson } from './lib.mjs';

const page = process.argv[2];
if (!page) { console.error('usage: node tools/09e-export-pending.mjs <page> [--limit N] [--from N]'); process.exit(1); }
const argN = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? dflt : Number(process.argv[i + 1]);
};
const limit = argN('--limit', 130);
const from = argN('--from', 0);

const pageUnits = readJson(path.join(DATA, 'page-units.json'))[page];
if (!pageUnits) { console.error('no page-units entry for:', page); process.exit(1); }
const byK = new Map(readJson(path.join(DATA, 'units.json'), []).map((u) => [u.k, u.en]));

const safe = page.replace(/[^\w.-]+/g, '_').slice(0, 60);
const tplPath = path.join(DATA, 'pageblocks', `${safe}.template.json`);
const tpl = fs.existsSync(tplPath) ? readJson(tplPath) : null;
const inTpl = new Set(tpl ? tpl.items.map((i) => i.k) : []);

const missing = pageUnits.units
  .filter((k) => !inTpl.has(k))
  .map((k) => ({ k, en: byK.get(k) }))
  .filter((i) => i.en);

const slice = missing.slice(from, from + limit);
const out = { page, batch: `pending-${from}`, items: slice };
writeJson(path.join(DATA, 'pageblocks', `${safe}.p${String(from).padStart(4, '0')}.json`), out);
console.log(`${safe}.p${String(from).padStart(4, '0')}.json: items=${slice.length} chars=${slice.reduce((s, i) => s + i.en.length, 0)} | page has ${pageUnits.units.length} units, template has ${inTpl.size}, missing ${missing.length}, total missing chars ${missing.reduce((s, i) => s + i.en.length, 0)}`);
