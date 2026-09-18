// Find TM entries whose Chinese still contains a whole English word — the residue pattern that
// produced "Naval任务" and "Naval support科技". These are visible on page titles and in text.
import { Store } from '../translate.mjs';

const store = new Store();
// a "residue" = Chinese text containing an English word of >=3 letters (excluding the site's
// deliberate "中文（English）" bilingual style, pure identifiers, and version/number tokens)
const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const rows = [];
for (const [k, en, zh] of store.entries()) {
  if (!zh || !CJK.test(zh)) continue;
  const stripped = zh.replace(/[（(][^（()）]*[）)]/g, '');           // drop parenthetical English
  const words = stripped.match(/[A-Za-z][A-Za-z'’-]{2,}/g) || [];
  if (!words.length) continue;
  // ignore pure script/identifier words
  const interesting = words.filter((w) => !/^(NDefines|PotF|DLC|AAR|UI|AI|MP|SP|HTML|CSS|JS|ID|XP|HP|km|kn|GDP|AA|AT|TD|SPG|CAS|MIO)$/i.test(w));
  if (!interesting.length) continue;
  rows.push({ en, zh, words: interesting });
}
rows.sort((a, b) => b.words.length - a.words.length);
console.log(`entries whose zh keeps an English word: ${rows.length}`);
console.log('\n--- titles / short entries (most likely page titles or labels) ---');
for (const r of rows.filter((r) => r.en.length <= 40).slice(0, 60)) {
  console.log(`  ${JSON.stringify(r.en).padEnd(46)} -> ${JSON.stringify(r.zh)}`);
}
console.log('\n--- sample of longer entries ---');
for (const r of rows.filter((r) => r.en.length > 40).slice(0, 12)) {
  console.log(`  EN ${JSON.stringify(r.en.slice(0, 90))}\n     ZH ${JSON.stringify(r.zh.slice(0, 110))}`);
}
