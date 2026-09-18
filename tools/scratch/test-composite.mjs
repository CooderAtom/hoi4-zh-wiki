// Build the exact composite unit for a Navy sentence from the built page, then ask the REAL
// pipeline (collectUnits -> store lookup -> applyTranslations) whether a whole-unit translation
// renders. This decides whether node-level fixes alone survive a rebuild.
import fs from 'node:fs';
import { parse, serialize } from '../dom.mjs';
import { collectUnits, applyTranslations } from '../units.mjs';
import { Store, normalize } from '../translate.mjs';

const html = fs.readFileSync('site/Navy.html', 'utf8');
const s = html.indexOf('mw-parser-output');
const root = parse(html.slice(html.lastIndexOf('<div', s), html.indexOf('</main>', s)));
const body = root.descendants().find((x) => String(x.attr('class') || '').includes('mw-parser-output'));

// Rebuild the source sentence for the target paragraph from the ORIGINAL backup (English version),
// because the current page has my Chinese fragments already applied.
const before = fs.readFileSync('cache/refsite/Navy.prebak.html', 'utf8');
const s2 = before.indexOf('mw-parser-output');
const root2 = parse(before.slice(before.lastIndexOf('<div', s2), before.indexOf('</main>', s2)));

const units = collectUnits(root2);
const wantKey = process.argv[2] || '1ru3p54';
const { key } = await import('../translate.mjs');
const target = units.find((u) => key(u.src) === wantKey);
if (!target) {
  console.log(`unit ${wantKey} not found among ${units.length} units`);
  const near = units.filter((u) => u.src.includes('For organization and control'));
  for (const n of near) console.log('  candidate:', JSON.stringify(n.src), 'fragments:', n.fragments.length);
  process.exit(1);
}
console.log('UNIT SRC   :', JSON.stringify(target.src));
console.log('FRAGMENTS  :', target.fragments.map((f) => f.slice(0, 70)));

// Simulate what the store must contain for a whole-unit render.
const zh = process.argv[3];
if (!zh) { console.log('\n(no zh supplied — pass the translation as argv[3] to test rendering)'); process.exit(0); }

const store = new Store();
store.data[key(target.src)] = { en: target.src, zh };
const st = applyTranslations(body, store, {});
console.log('\nstats:', JSON.stringify({ blocks: st.blocks, texts: st.texts, inlines: st.inlines }));
const out = serialize(body);
const line = out.split('\n').find((l) => l.includes('organization') || l.includes('舰队') && l.includes('任务'));
console.log('rendered snippet:', (out.match(/<p>[^<]*For organization[\s\S]{0,200}/) || ['(not found)'])[0]);
const idx = out.indexOf('组织');
console.log('output around match:', out.slice(Math.max(0, idx - 120), idx + 220));
