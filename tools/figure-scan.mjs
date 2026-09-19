// 扫描全站：找出「同时含图片和文字、且用内联 flex 横排」的表格单元格，量出它们的尺寸需求。
//
// 目的：判断能否用容器查询（@container）自动决定「图文同行」还是「文在圖下」。
// 需要三个数字才能定阈值：
//   1) 结构的规模——多少个格、多少页（决定这条 CSS 的价值与重算成本）
//   2) 图片的固有宽度分布——决定每个格至少需要多宽才放得下「图 + 旁边还能写字」
//   3) 文字块的长度分布——决定同行时右侧还剩多少空间才不至于单字折行
//
// usage: node tools/figure-scan.mjs [--top N]
import fs from 'node:fs';
import path from 'node:path';
import { SITE } from './lib.mjs';

const topN = Number((() => { const i = process.argv.indexOf('--top'); return i === -1 ? 12 : process.argv[i + 1]; })());

const pages = fs.readdirSync(SITE).filter((f) => f.endsWith('.html'));
let cells = 0, cellsWithImg = 0, pagesHit = 0;
const imgWidths = new Map();
const textLens = [];
const perPage = [];
const samples = [];

for (const f of pages) {
  const t = fs.readFileSync(path.join(SITE, f), 'utf8');
  // 内联 flex 的容器格：<td ...><div style="display:flex...">...</div></td>
  const re = /<t([dh])\b[^>]*>\s*<div style="display:\s*flex[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/t\1>/g;
  let m, n = 0;
  while ((m = re.exec(t))) {
    cells++;
    const inner = m[2];
    const img = /<img\b[^>]*>/.exec(inner);
    if (!img) continue;
    const w = /\bwidth="(\d+)"/.exec(img[0]);
    const iw = w ? Number(w[1]) : 0;
    cellsWithImg++;
    n++;
    imgWidths.set(iw, (imgWidths.get(iw) || 0) + 1);
    // 文字块：flex 里除图片外的文本长度（去掉标签）
    const text = inner.replace(/<img\b[^>]*>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text) textLens.push(text.length);
    if (samples.length < 12) samples.push({ page: f, iw, iw2: null, text: text.slice(0, 60), textLen: text.length });
  }
  if (n) { pagesHit++; perPage.push({ page: f, n }); }
}

const sorted = (arr) => [...arr].sort((a, b) => a - b);
const pct = (arr, p) => (arr.length ? arr[Math.min(arr.length - 1, Math.floor(arr.length * p))] : 0);

console.log(`页面数 ${pages.length}`);
console.log(`内联 flex 的单元格 ${cells} 个，其中含图片 ${cellsWithImg} 个（${(100 * cellsWithImg / (cells || 1)).toFixed(1)}%），分布 ${pagesHit} 页`);
console.log('\n图片固有宽度分布（width 属性，0 = 未写宽度）:');
for (const [w, n] of [...imgWidths].sort((a, b) => b[1] - a[1]).slice(0, 18)) {
  console.log(`  ${String(w || '未写').padStart(6)}px  ${String(n).padStart(5)} 次`);
}
const tl = sorted(textLens);
console.log('\n同格文字长度（字符）:');
console.log(`  n=${tl.length}  p10=${pct(tl, 0.1)}  p50=${pct(tl, 0.5)}  p90=${pct(tl, 0.9)}  max=${tl[tl.length - 1] || 0}`);
const needImg = sorted([...imgWidths.keys()].filter((w) => w > 0));
console.log(`\n需要「图 + 右侧文字」的最小格宽下界 = 最宽图片 ${needImg[needImg.length - 1] || 0}px + 间隙 + 一点文字宽度`);

/* ---------- 能否只用 CSS 把「图标」和「立绘」分开 ----------
   只能靠 HTML 里看得到的东西：width 属性的字面量、或文件名。
   分别量这两种判据的规模与误判风险。 */
const ICON_MAX = 99;        // < 100px 视为图标（成就/列表），保持并排
const FIG_MIN = 100;        // ≥ 100px 视为立绘，文字改到图下
const attrRe = /<td\b[^>]*>\s*<div style="display:\s*flex[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/td>/g;
const imgRe = /<img\b[^>]*>/g;
let iconCells = 0, figCells = 0, noAttr = 0;
const figNames = new Map();
const allNames = new Map();
for (const f of pages) {
  const t = fs.readFileSync(path.join(SITE, f), 'utf8');
  let m;
  attrRe.lastIndex = 0;
  while ((m = attrRe.exec(t))) {
    const img = imgRe.exec(m[1]);
    if (!img) continue;
    const wm = /\bwidth="(\d+)"/.exec(img[0]);
    const nm = /src="images\/([^"]+)"/.exec(img[0]);
    const name = nm ? nm[1] : '(未知)';
    allNames.set(name, (allNames.get(name) || 0) + 1);
    if (!wm) { noAttr++; continue; }
    const w = Number(wm[1]);
    if (w > ICON_MAX) { figCells++; figNames.set(name, (figNames.get(name) || 0) + 1); }
    else iconCells++;
  }
}
console.log(`\n判据规模：图标格(<${FIG_MIN}px) ${iconCells} 个｜立绘格(≥${FIG_MIN}px) ${figCells} 个｜无 width 属性 ${noAttr} 个`);
console.log(`立绘用到的不同文件名 ${figNames.size} 个，出现最多的：`);
for (const [n, c] of [...figNames].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${String(c).padStart(4)}  ${n}`);
const figNamed = [...figNames.keys()];
const genericFig = figNamed.filter((n) => /^Generic_|_generic|^Focus_|^Goal_/i.test(n));
console.log(`  其中文件名带 Generic/Focus/Goal 的 ${genericFig.length} 个：${genericFig.slice(0, 8).join(', ') || '无'}`);
const iconNamed = [...allNames.keys()].filter((n) => !figNames.has(n));
console.log(`\n只出现在图标格里的文件名 ${iconNamed.length} 个，抽样：${iconNamed.slice(0, 8).join(', ')}`);
console.log('\n含此类格子最多的页面:');
for (const p of perPage.sort((a, b) => b.n - a.n).slice(0, topN)) console.log(`  ${String(p.n).padStart(4)}  ${p.page}`);
console.log('\n样例:');
for (const s of samples) console.log(`  img ${String(s.iw).padStart(4)}px | ${String(s.textLen).padStart(4)}字 | ${s.text}  [${s.page}]`);
