// Rank CORE GAMEPLAY pages (not patch notes, modding, script reference or country pages) by how
// much prose is left, so the "core gameplay pages first" priority can be followed deliberately
// instead of chasing whichever page happens to be largest.
//   node tools/08i-core-queue.mjs [--top N]
import { readJson, DATA } from './lib.mjs';
import path from 'node:path';

const ti = process.argv.indexOf('--top');
const top = ti === -1 ? 20 : Number(process.argv[ti + 1]);

const rows = readJson(path.join(DATA, 'coverage-real.json'), []);
const list = Array.isArray(rows) ? rows : rows.pages || [];

// Out of scope by the agreed plan: script/data reference, patch notes, modding, focus trees, and
// individual country pages (which are huge and read as reference tables).
const OUT = [
  /^Patch /i, /^Defines$/i, /^Modding/i, /modding/i, /^Data structures/i, /^Triggers$/i,
  /^Effect$/i, /^Effects/i, /^Scopes$/i, /^Script/i, /^List of /i, /^Formable nations/i,
  /^Custom difficulty/i, /^Achievements$/i, /^Console commands/i, /^Save-game editing/i,
  /^Localisation$/i, /^Graphical asset/i, /^Sound/i, /^AI modding/i, /^Nudger$/i,
  /^Hearts of Iron IV$/i, /^German Reich$/i, /^Japan$/i, /^Poland$/i,
];

// Pages that are entirely engine/script reference rather than gameplay explanation. They are the
// largest remaining blocks by character count but are the same category as Defines/Triggers, so
// listing them as "core gameplay still to translate" is misleading.
const SCRIPT_REF = [
  /^Effect$/i, /^Triggers?$/i, /^Scopes?$/i, /^Data structures/i, /^Defines$/i, /^Modding/i,
  /^Localisation$/i, /^On actions/i, /^AI /i, /^Nudger$/i, /^Console commands/i,
  /^Save-game editing/i, /^Graphical asset/i, /^Sound$/i, /^Interface$/i, /^Event$/i,
  /^Ideas? modding/i, /^Country creation/i, /^Dynamic modifiers/i, /^Static modifiers/i,
];
const isCore = (t) => !OUT.some((re) => re.test(t));
const isScriptRef = (t) => SCRIPT_REF.some((re) => re.test(t));

const cand = list
  .filter((r) => isCore(r.title))
  .map((r) => ({ ...r, left: (r.proseChars || 0) - (r.translatedChars || 0) }))
  .filter((r) => r.left > 0)
  .sort((a, b) => b.left - a.left);

const gameplay = cand.filter((r) => !isScriptRef(r.title));
const scriptRef = cand.filter((r) => isScriptRef(r.title));

console.log(`gameplay pages still incomplete: ${gameplay.length}`);
console.log(`  untranslated prose across them: ${gameplay.reduce((s, r) => s + r.left, 0).toLocaleString()} chars\n`);
for (const r of gameplay.slice(0, top)) {
  console.log(`${String(Math.round(r.left)).padStart(7)} left  ${String(Math.round(r.pct * 100)).padStart(3)}%  ${r.title}`);
}

console.log(`\nscript/engine reference pages still incomplete: ${scriptRef.length}`);
console.log(`  untranslated prose across them: ${scriptRef.reduce((s, r) => s + r.left, 0).toLocaleString()} chars`);
console.log('  (same category as Defines/Triggers: parameter documentation, not gameplay)\n');
for (const r of scriptRef.slice(0, 8)) {
  console.log(`${String(Math.round(r.left)).padStart(7)} left  ${String(Math.round(r.pct * 100)).padStart(3)}%  ${r.title}`);
}
