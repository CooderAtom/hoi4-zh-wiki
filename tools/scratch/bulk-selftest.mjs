// Self-test for the bulk pipeline: build a tiny BULK.*.zh.json from real exported items
// (zh filled with an obvious placeholder), run the splitter, verify the per-page output, then clean up.
import fs from 'node:fs';
const src = JSON.parse(fs.readFileSync('data/pageblocks/BULK.s0.json', 'utf8'));
const two = src.items.slice(0, 2);
fs.writeFileSync('data/pageblocks/BULK.test.zh.json', JSON.stringify({
  items: two.map((i) => ({ page: i.page, slug: i.slug, k: i.k, zh: '测试译文-' + i.k })),
}, null, 1));
console.log('test input pages: ' + two.map((i) => i.page + ' (' + i.slug + ')').join(' | '));
