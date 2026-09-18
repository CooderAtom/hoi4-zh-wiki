// Scan a page (rendered from English via the pipeline) for leftover English/odd artifacts,
// and compare the body text with the currently shipped page.
import fs from 'node:fs';
import { parse } from '../dom.mjs';
import { applyTranslations } from '../units.mjs';
import { Store } from '../translate.mjs';

const [backup, current, label] = process.argv.slice(2);
const store = new Store();

function load(file, apply) {
  const html = fs.readFileSync(file, 'utf8');
  const s = html.indexOf('mw-parser-output');
  const tail = html.slice(html.lastIndexOf('<div', s));
  const root = parse(tail);
  const body = root.descendants().find((x) => String(x.attr('class') || '').includes('mw-parser-output'));
  if (apply) applyTranslations(body, store, {});
  return body.textContent.replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
}

const pipe = load(backup, true);
const ship = load(current, false);
const cjk = (t) => (t.match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
console.log(`##### ${label}`);
console.log(`  pipeline CJK=${cjk(pipe)} len=${pipe.length}`);
console.log(`  shipped  CJK=${cjk(ship)} len=${ship.length}`);
console.log(`  delta    CJK=${cjk(pipe) - cjk(ship)} len=${pipe.length - ship.length}`);

// show the first differing text region
let i = 0;
while (i < Math.min(pipe.length, ship.length) && pipe[i] === ship[i]) i++;
if (i >= Math.min(pipe.length, ship.length)) {
  console.log('  (one is a prefix of the other)');
} else {
  console.log(`  first diff @${i}`);
  console.log('   pipeline: ' + JSON.stringify(pipe.slice(Math.max(0, i - 80), i + 160)));
  console.log('   shipped : ' + JSON.stringify(ship.slice(Math.max(0, i - 80), i + 160)));
}
