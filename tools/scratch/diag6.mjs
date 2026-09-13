import fs from 'node:fs';
const raw = JSON.parse(fs.readFileSync('data/tm.json', 'utf8'));
const hits = [];
for (const [k, v] of Object.entries(raw)) {
  const zh = typeof v === 'string' ? v : (v && v.zh) || '';
  if (typeof zh === 'string' && (zh.includes('大型补丁') || zh.includes('重大补丁')))
    hits.push([k, (v && v.en) || '', zh]);
}
console.log('entries mentioning 大[型重]补丁: ' + hits.length);
for (const [k, en, zh] of hits) console.log('  ' + k + ' | EN=' + JSON.stringify(en) + ' | ZH=' + JSON.stringify(zh));
