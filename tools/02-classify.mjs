// Classify every main-namespace page so we can pick "gameplay" content precisely.
import fs from 'node:fs';
import path from 'node:path';
import { DATA, readJson } from './lib.mjs';

const d = readJson(path.join(DATA, 'pages.json'));
const pages = d.pages;

const COUNTRY_CATS = new Set(['Countries', 'Countries with unique National Focus trees', 'Releasable countries']);

function classify(p) {
  const c = new Set(p.cats);
  const t = p.title;
  if (/national focus tree/i.test(t) && !/\/Scriptoutput$/.test(t)) return 'focustree';
  if (/\/Scriptoutput$/i.test(t)) return 'scriptoutput';
  if (/\/scriptoutput$/i.test(t)) return 'scriptoutput';
  if (/national focus tree/i.test(t)) return 'focustree';
  if (c.has('National focus trees')) return 'focustree';
  if (/^Patch /.test(t) || c.has('Patches')) return 'patch';
  if (c.has('Achievements')) return 'achievement';
  if (c.has('Disambiguation')) return 'disambig';
  if (c.has('Modding') || c.has('Mods') || /modding$/i.test(t)) return 'modding';
  if (c.has('Countries') || COUNTRY_CATS.has([...c].find((x) => COUNTRY_CATS.has(x)))) return 'country';
  if (c.has('Wiki') || c.has('Main page') || /^Main Page/.test(t)) return 'wikimeta';
  if (c.has('Decisions') || c.has('Events') || c.has('Lists of ideas')) return 'data-list';
  if (/^(Defines|Effect|Trigger|Modifier|List of provinces|List of states|Console commands)$/.test(t)) return 'scriptdata';
  if (t.includes('/')) return 'subpage';
  return 'gameplay';
}

const groups = {};
for (const p of pages) {
  const g = classify(p);
  (groups[g] ||= []).push(p);
}
const order = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);
for (const g of order) {
  const arr = groups[g];
  const bytes = arr.reduce((s, p) => s + p.size, 0);
  console.log(`\n### ${g}: ${arr.length} pages, ${(bytes / 1048576).toFixed(2)} MB`);
  const show = arr.slice().sort((a, b) => b.size - a.size);
  const preview = show.slice(0, 40).map((p) => p.title + '(' + (p.size / 1024).toFixed(0) + 'k)');
  console.log('   ' + preview.join(' | '));
  if (show.length > 40) console.log(`   ... and ${show.length - 40} more`);
}
