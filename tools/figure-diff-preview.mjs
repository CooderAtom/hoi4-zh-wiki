// 生成「本次图文格修复」的真实前后对比页。
//
// 与之前两个对照页的区别：这里不做任何规则模拟。
//   before 页引用「改动前的 style.css」——从 git 的 HEAD 版本取出来，剥掉本次新增的两段；
//   after  页引用 site/assets/style.css，即此刻正在生效的那一份。
// 两个 iframe 加载的是同一段真实表格标记（Naval_technology 的驱逐舰船体表），
// 所以差异只可能来自样式表本身。每个 iframe 自己量出排布方式、首列宽、图片渲染宽、
// 描述块尺寸，以及表格是否横向溢出。
//
// 剥离方式是「精确删掉自己刚加的两段」，并在删完后断言页面里不再有 container-type——
// 否则 before 页会悄悄带上修复，对比就失去意义。
//
// usage: node tools/figure-diff-preview.mjs --before <改动前样式表路径>
//   改动前的样式表请先用 git 取出，例如（PowerShell）：
//     git show HEAD:site/assets/style.css | Set-Content cache\figure-diff\head-style.css -Encoding UTF8
//   不在脚本里直接 execFileSync('git') 的原因：沙箱禁止程序通过管道捕获另一个程序的输出，
//   spawnSync 会以 EPERM 失败。让外部把结果写成文件，脚本只读文件，既避开限制也让输入可见。
import fs from 'node:fs';
import path from 'node:path';
import { SITE, ROOT } from './lib.mjs';

const argv = process.argv.slice(2);
const beforeArg = argv.includes('--before') ? argv[argv.indexOf('--before') + 1] : null;
if (!beforeArg) throw new Error('缺少 --before <路径>');

const OUT = path.join(ROOT, 'cache', 'figure-diff');
fs.mkdirSync(OUT, { recursive: true });
const REL = '../../site/';

/* ---------- before：改动前的样式表，剥掉本次新增的两段 ---------- */
const headCss = fs.readFileSync(path.resolve(beforeArg), 'utf8');

let before = headCss;
const cut = (s, from, to) => {
  const a = s.indexOf(from);
  if (a < 0) return s;
  const b = to ? s.indexOf(to, a) : -1;
  const stop = b < 0 ? s.indexOf('\n\n\n', a) : b;
  return s.slice(0, a) + (stop < 0 ? '' : s.slice(stop));
};
// 本次新增的两段：①用 :has() 提首列宽度下限 ②立绘格改竖排。逐段剥掉。
before = cut(before, '/* ---------- 首列过窄：给图文格一个真实的宽度下限 ----------', '/* ---------- 表格（wiki 风格） ----------');
before = cut(before, '/* ---------- 立绘格的文字改到图片下方（用户方案 A） ----------', '/* Images must never spill out of their cell or the panel. */');
// 历史遗留：早期试过的「按格宽判断」方案（container-type + @container）
before = cut(before, '/* ---------- 「图文同行 / 文在图下」按格子实际宽度自动切换 ----------', '/* Images must never spill out of their cell or the panel. */');
fs.writeFileSync(path.join(OUT, 'before.css'), before);

/* ---------- after：此刻生效的那一份 ---------- */
const after = fs.readFileSync(path.join(SITE, 'assets', 'style.css'), 'utf8');
fs.writeFileSync(path.join(OUT, 'after.css'), after);

/* 断言两件事：before 里不能残留任何修复特征，after 里必须真的有立绘格规则。
   之前这里断言的是「必须有 container-type」——那是早期方案的特征，方案换成
   「按图片 width 字面量判断」后这句就成了误报，白拦了一次。断言要跟着方案走。 */
const figRe = /:has\(> img\[width="/;
const beforeDirty = [
  /container-type\s*:/.test(before) && 'container-type',
  /@container/.test(before) && '@container',
  figRe.test(before) && ':has(> img[width=…',
  /table:has\(/.test(before) && 'table:has(',
].filter(Boolean);
const afterHasFix = figRe.test(after) && /display:\s*block\s*!important/.test(after);
console.log(`before.css ${before.length} 字符，残留修复特征：${beforeDirty.length ? beforeDirty.join(', ') : '无'}`);
console.log(`after.css  ${after.length} 字符，立绘格规则：${afterHasFix ? '存在' : '缺失'}`);
if (beforeDirty.length) throw new Error('before.css 没剥干净（' + beforeDirty.join(', ') + '），对比会失真');
if (!afterHasFix) throw new Error('after.css 里没有立绘格规则（:has(> img[width=…]) + display:block !important）');

/* ---------- 被测表格：真实标记，原样抽出 ---------- */
const page = fs.readFileSync(path.join(SITE, 'Naval_technology.html'), 'utf8');
function sliceTable(src, marker) {
  const h = src.indexOf(marker);
  if (h < 0) throw new Error('未找到标记：' + marker);
  const start = src.indexOf('<table', h);
  const re = /<\/?table\b/g;
  re.lastIndex = start;
  let depth = 0, m;
  while ((m = re.exec(src))) {
    depth += m[0] === '<table' ? 1 : -1;
    if (depth === 0) {
      const out = src.slice(start, re.lastIndex + 1);
      const open = (out.match(/<table\b/g) || []).length;
      const close = (out.match(/<\/table>/g) || []).length;
      if (open !== close) throw new Error('表格切片不配平');
      return out;
    }
  }
  throw new Error('表格未闭合');
}
function tbodySlice(table) {
  const a = table.indexOf('<tbody>');
  let depth = 1;
  const re = /<\/?tbody\b/g;
  re.lastIndex = a + 7;
  let m;
  while ((m = re.exec(table))) {
    depth += m[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return { head: table.slice(0, a + 7), body: table.slice(a + 7, m.index), tail: table.slice(m.index) };
  }
  throw new Error('<tbody> 未闭合');
}
function trimRows(table, keepData) {
  const { head, body, tail } = tbodySlice(table);
  const marks = [];
  let depth = 0, i = 0;
  while (i < body.length) {
    const lt = body.indexOf('<', i);
    if (lt < 0) break;
    if (body.startsWith('<table', lt)) { depth++; i = lt + 6; continue; }
    if (body.startsWith('</table', lt)) { depth--; i = lt + 7; continue; }
    if (depth === 0 && body.startsWith('<tr', lt) && /[\s>]/.test(body[lt + 3] || '>')) marks.push(lt);
    i = lt + 1;
  }
  const cut = marks[1 + keepData];
  return `${head}${cut === undefined ? body : body.slice(0, cut)}${tail}`;
}
const table = trimRows(sliceTable(page, '驱逐舰船体</span>'), 2)
  .replace(/(src=")images\//g, `$1${REL}images/`)
  .replace(/\r\n/g, '\n');
if (!/Early_destroyer\.png/.test(table)) throw new Error('首列图片丢失');

/* 探测脚本。第一版把它写成「遍历表里每一行」，结果命中了嵌套表的行
   （图片宽 -1、描述 -1×-1 这些自相矛盾的数字就是那么来的），而且同一个「首列」
   被报出 247px 与 453px 两个值——因为那些行属于嵌套表。这样的输出没法用来判断，
   所以改成：只报我自己裁出来的那两行（按顺序取前两个含图文格的数据行），
   并且取不到图片/描述时直接说明，不输出 -1。 */
const PROBE = `
<div id="probe"></div>
<script>
(function () {
  function run() {
    var lines = [];
    var tb = document.querySelector('table.wikitable > tbody');
    if (!tb) { document.getElementById('probe').textContent = '找不到被测表格'; return; }
    lines.push(tb.scrollWidth > tb.clientWidth + 1
      ? '<b style="color:#c00">表格横向溢出 ' + (tb.scrollWidth - tb.clientWidth) + 'px</b>'
      : '<b style="color:#080">表格未溢出</b>');
    // 只认「直接子行」，避开嵌套表里的行
    var rows = [];
    var kids = tb.children;
    for (var i = 0; i < kids.length; i++) {
      if (kids[i].tagName === 'TR') rows.push(kids[i]);
    }
    var shown = 0;
    for (var j = 0; j < rows.length && shown < 2; j++) {
      var cell = rows[j].querySelector(':scope > td');
      if (!cell) continue;
      var wrap = cell.querySelector('div[style*="flex"]');
      var img = wrap ? wrap.querySelector('img') : null;
      if (!wrap || !img) continue;            // 只报图文格，其余行跳过
      shown++;
      var nameEl = wrap.querySelector('div > div');
      var desc = nameEl ? nameEl.nextElementSibling : null;
      var w = function (el) { return el ? Math.round(el.getBoundingClientRect().width) : null; };
      var h = function (el) { return el ? Math.round(el.getBoundingClientRect().height) : null; };
      lines.push('图文格' + shown
        + ' 排布 <b>' + getComputedStyle(wrap).display + '</b>'
        + ' | 首列 ' + w(cell) + 'px'
        + ' | 图片 ' + w(img) + 'px（固有 ' + img.naturalWidth + 'px）'
        + ' | 描述 ' + (desc ? w(desc) + '×' + h(desc) : '未取到'));
    }
    if (!shown) lines.push('没有找到图文格，表格标记可能已变');
    document.getElementById('probe').innerHTML = lines.join('<br>');
  }
  if (document.readyState === 'complete') run(); else window.addEventListener('load', run);
})();
</script>`;

const frame = (which, label, width) => `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>${label}</title>
<link rel="stylesheet" href="${which}.css">
<style>
  .sheet { background:#333; color:#eee; font:12px/1.7 monospace; padding:6px 8px; margin:0; }
</style>
</head>
<body data-rel="">
<p class="sheet">${label} · iframe ${width}px</p>
${PROBE}
<main class="content" style="border:0;padding:10px;">
${table}
</main>
</body></html>`;

const WIDTHS = [1064, 780, 420];
for (const which of ['before', 'after']) {
  for (const w of WIDTHS) {
    fs.writeFileSync(path.join(OUT, `${which}-w${w}.html`), frame(which, which === 'before' ? '改动前' : '改动后', w));
  }
}

const shell = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<title>图文格修复 · 真实前后对比</title>
<style>
  body { margin:0; background:#111; color:#eee; font:13px/1.6 "Microsoft YaHei", system-ui, sans-serif; }
  h1 { font-size:17px; margin:12px 14px 4px; }
  p.note { margin:0 14px 12px; color:#aaa; max-width:1200px; }
  h2 { font-size:13px; margin:12px 14px 4px; color:#8fbf8a; }
  .row { display:flex; gap:12px; padding:0 14px 16px; align-items:flex-start; }
  iframe { border:1px solid #444; background:#fff; display:block; }
  .lbl { font:12px monospace; color:#888; margin:0 0 3px; }
</style></head>
<body>
<h1>图文格修复：改动前 vs 改动后</h1>
<p class="note">
  <b>怎么看这一页</b>：请直接<b>用眼睛比较左右两边</b>——左边是改动前，右边是改动后，同一段真实表格、同一宽度。
  每边顶部那两行数字只是辅助（表格是否横向溢出 / 两个图文格的排布方式、首列宽、图片渲染宽与固有宽、描述块宽×高）。<br>
  <b>本次只改了一件事</b>：格子窄的时候，文字从「挤在图片右边」改为「落到图片下方、吃满整格宽」；
  格子够宽（≥260px）时维持原样并排。另外给这类表格的首列加了 17em 宽度下限，并把「效果」列的 46% 钳制解除。<br>
  <b>两个 iframe 引用的是两份真实样式表</b>（<code>before.css</code> 已断言不含修复，<code>after.css</code> 即站点当前生效的
  <code>site/assets/style.css</code>），没有任何规则模拟。三档宽度分别是 1064 / 780 / 420px。
</p>
${WIDTHS.map((w) => `<h2>iframe 宽 ${w}px</h2>
<div class="row">
  <div><p class="lbl">改动前</p><iframe src="before-w${w}.html" width="${w}" height="560"></iframe></div>
  <div><p class="lbl">改动后</p><iframe src="after-w${w}.html" width="${w}" height="560"></iframe></div>
</div>`).join('\n')}
</body></html>`;
fs.writeFileSync(path.join(OUT, 'index.html'), shell);
console.log('已生成 cache/figure-diff/index.html');
