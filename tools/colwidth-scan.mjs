// 扫描「等宽对照表」：带 caption 的多列表格，看列宽分配规则会把它们压成什么样。
//
// 起因：Land_doctrine.html「总体学说」是 4 列对照表，每列 = 64px 图标 + 标题 + 要点 + 一段斜体描述。
// 站点全局规则把首列定为 24%、末列 46%/max-width:46%，而中间两列没有任何 width 声明；
// 首列的斜体描述实测需要超过 24%，浏览器于是从未声明的中间列抽空间，第二三列被压到几十像素，
// 标题（优势火力 / 大规模作战计划）只能一个字一行。
//
// 这里只做两件事：①数出这类表有多少、列数分布如何 ②对目标表估算每列的宽度需求，
// 用来决定该给中间列留多少。不做任何修改。
//
// usage: node tools/colwidth-scan.mjs [页面名]
import fs from 'node:fs';
import path from 'node:path';
import { SITE } from './lib.mjs';

const target = process.argv[2] || 'Land_doctrine.html';

const pages = fs.readdirSync(SITE).filter((f) => f.endsWith('.html'));
const colCounts = new Map();
let capTables = 0, multiRowCapTables = 0;
const perPage = [];

for (const f of pages) {
  const t = fs.readFileSync(path.join(SITE, f), 'utf8');
  // 只看正文里的表：带 caption 的
  const re = /<table\b[^>]*>\s*<caption>[\s\S]*?<\/table>/g;
  let m, n = 0;
  while ((m = re.exec(t))) {
    const html = m[0];
    capTables++; n++;
    const firstRow = /<tr\b[\s\S]*?<\/tr>/.exec(html);
    if (!firstRow) continue;
    const cells = (firstRow[0].match(/<t[hd]\b/g) || []).length;
    colCounts.set(cells, (colCounts.get(cells) || 0) + 1);
    const rows = (html.match(/<tr\b/g) || []).length;
    if (rows > 2) multiRowCapTables++;
  }
  if (n) perPage.push({ page: f, n });
}
console.log(`全站带 caption 的表格 ${capTables} 个，分布在 ${perPage.length} 页；其中超过 2 行的 ${multiRowCapTables} 个`);
console.log('首行单元格数分布：');
for (const [c, n] of [...colCounts].sort((a, b) => b[1] - a[1])) console.log(`  ${String(c).padStart(2)} 列  ${String(n).padStart(4)} 个表`);

/* ---------- 目标表的宽度需求估算 ---------- */
const src = fs.readFileSync(path.join(SITE, target), 'utf8');
const re = /<table\b[^>]*>\s*<caption>([\s\S]*?)<\/caption>([\s\S]*?)<\/table>/g;
let mm;
console.log(`\n=== ${target} 的对照表 ===`);
while ((mm = re.exec(src))) {
  const caption = mm[1].replace(/<[^>]+>/g, '').trim();
  const body = mm[2];
  const rows = (body.match(/<tr\b/g) || []).length;
  const firstRow = /<tr\b[\s\S]*?<\/tr>/.exec(body);
  if (!firstRow) continue;
  const cells = firstRow[0].match(/<td\b[\s\S]*?<\/td>/g) || [];
  console.log(`\n表「${caption}」：${cells.length} 列 / ${rows} 行`);
  cells.forEach((cell, i) => {
    const img = /<img\b[^>]*>/.exec(cell);
    const iw = img ? (/\bwidth="(\d+)"/.exec(img[0]) || [])[1] : null;
    const hasFlex = /display:\s*flex/.test(cell);
    // 文本量：标题（h4）+ 要点（li）+ 描述（斜体 div）
    const title = (/<h4[^>]*>([\s\S]*?)<\/h4>/.exec(cell) || [, ''])[1].replace(/<[^>]+>/g, '').trim();
    const desc = (/font-style:\s*italic[^>]*>([\s\S]*?)<\/div>/.exec(cell) || [, ''])[1].replace(/<[^>]+>/g, '').trim();
    const lis = (cell.match(/<li\b/g) || []).length;
    const plainLen = title.length + desc.length;
    console.log(`  第${i + 1}列: flex=${hasFlex ? 'Y' : 'N'} 图=${iw || '无'}px 标题="${title}"(${title.length}字) 要点${lis}条 描述${desc.length}字 文本合计${plainLen}字`);
  });
}
