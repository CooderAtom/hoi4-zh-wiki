// Isolate why applyTranslations leaves the Assault Engineer paragraph English in the real build
// (tools/page.mjs) but not in my earlier diagnostic. The only difference is that the diagnostic ran
// collectUnits() first. Run both orders on identical input.
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '../dom.mjs';
import { readJson } from '../lib.mjs';
import { parserOutput, sanitize, assignHeadingIds } from '../sanitize.mjs';
import { collectUnits, applyTranslations } from '../units.mjs';
import { Store } from '../translate.mjs';

const media = readJson(path.join('data', 'media.json'), { files: {} });
const images = new Map(Object.entries(media.files || {}));
const known = new Set(fs.readdirSync(path.join('cache', 'pages')).map((f) => f.replace(/\.json$/, '').toLowerCase()));
const rec = readJson(path.join('cache', 'pages', 'Support_company.json'));
const NEEDLE = 'introduced the Assault Engineer';

function fresh() {
  const dom = parse(rec.html);
  const body = parserOutput(dom);
  sanitize(body, { images, pageTitle: rec.title, known });
  assignHeadingIds(body);
  return body;
}

const store = new Store();

const withCollect = fresh();
collectUnits(withCollect);
applyTranslations(withCollect, store, {});
const a = withCollect.textContent.includes(NEEDLE);

const without = fresh();
applyTranslations(without, store, {});
const b = without.textContent.includes(NEEDLE);

console.log('WITH    collectUnits() first -> english still present: ' + a);
console.log('WITHOUT collectUnits()      -> english still present: ' + b);
console.log('');
console.log(a === b ? 'No difference — collectUnits is NOT the cause.' : 'DIFFERENT — collectUnits() side effect is the cause.');
