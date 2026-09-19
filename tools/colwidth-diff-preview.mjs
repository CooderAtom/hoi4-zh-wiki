// 生成「对照表首行等宽」修复的真前后对比页。
//
// 与 figure-diff-preview 的区别：被测对象是 Land_doctrine.html 的整张「总体学说」对照表
// （4 列，每列 图标+标题+要点+斜体描述），而不是单个单元格。
// before 通过从当前样式表里删掉那两条新规则得到；after 即此刻生效的 site/assets/style.css。
// 两边都引用真样式表，没有任何规则模拟。
//
// usage: node tools/colwidth-diff-preview.mjs
import fs from 'node:fs';
import path from 'node:path';
import { SITE, ROOT } from './lib.mjs';

const OUT = path.join(ROOT, 'cache', 'colwidth-diff');
fs.mkdirSync(OUT, { recursive: true });
const REL = '../../site/';

const after = fs.readFileSync(path.join(SITE, 'assets', 'style.css'), 'utf8');
const MARK_FROM = '/* ---------- 对照表：首行各列等宽 ----------';
const MARK_TO = '/* Images must never spill out of their cell or the panel. */';
const a = after.indexOf(MARK_FROM);
const b = after.indexOf(MARK_TO, a);
if (a < 0 || b < 0) throw new Error('找不到「对照表：首行各列等宽」规则段，剥离失败');
const before = after.slice(0, a) + after.slice(b);
fs.writeFileSync(path.join(OUT, 'before.css'), before);
fs.writeFileSync(path.join(OUT, 'after.css'), after);

const ruleRe = /table-layout:\s*fixed/;
console.log(`after.css 含等宽规则（table-layout: fixed）: ${ruleRe.test(after)}`);
console.log(`before.css 含等宽规则: ${ruleRe.test(before)}`);
if (ruleRe.test(before)) throw new Error('before.css 没剥干净');
if (!ruleRe.test(after)) throw new Error('after.css 里没有等宽规则（table-layout: fixed）');
if (!/width:\s*25% !important/.test(after)) throw new Error('after.css 里没有首列等宽声明');
console.log(`before ${before.length} 字符 / after ${after.length} 字符（差 ${after.length - before.length}）`);

/* 取出真实的「总体学说」表格 —— 按 caption 定位，用 <table> 配对切出整表 */
const src = fs.readFileSync(path.join(SITE, 'Land_doctrine.html'), 'utf8');
const capIdx = src.indexOf('<caption>总体学说</caption>');
if (capIdx < 0) throw new Error('找不到「总体学说」表');
const start = src.lastIndexOf('<table', capIdx);
const re = /<\/?table\b/g;
re.lastIndex = start;
let depth = 0, m, end = -1;
while ((m = re.exec(src))) {
  depth += m[0] === '<table' ? 1 : -1;
  if (depth === 0) { end = re.lastIndex + 1; break; }
}
if (end < 0) throw new Error('表格未闭合');
const table = src.slice(start, end).replace(/(src=")images\//g, `$1${REL}images/`).replace(/\r\n/g, '\n');
const open = (table.match(/<table\b/g) || []).length, close = (table.match(/<\/table>/g) || []).length;
if (open !== close) throw new Error('表格切片不配平');
if (!/大规模作战计划/.test(table)) throw new Error('取到的表格内容不对');
console.log(`表格长度 ${table.length} 字符，<table> ${open} 个`);

/* 量每列宽度 + 表格自身的布局属性。
   只报列宽不够用：420px 档出现过「四列仍不等宽」的情况，必须知道 table-layout / display /
   width 到底解析成了什么，才能区分「规则没命中」和「命中了但被别的规则压掉」。 */
const PROBE = `
<div id="probe"></div>
<script>
(function () {
  function run() {
    var t = document.querySelector('table.wikitable');
    if (!t) { document.getElementById('probe').textContent = '找不到表格'; return; }
    var cs = getComputedStyle(t);
    var tb = t.querySelector('tbody');
    var tds = tb.querySelectorAll(':scope > tr:first-child > td');
    var r = function (el) { return Math.round(el.getBoundingClientRect().width); };
    var out = [];
    out.push('table-layout=<b>' + cs.tableLayout + '</b>  display=<b>' + cs.display + '</b>  width=<b>' + cs.width + '</b>');
    out.push('表宽 ' + r(t) + 'px');
    if (tb.scrollWidth > tb.clientWidth + 1) out.push('<b style="color:#c00">表格横向溢出 ' + (tb.scrollWidth - tb.clientWidth) + 'px</b>');
    else out.push('<b style="color:#080">表格未溢出</b>');
    var ws = [], sum = 0;
    for (var i = 0; i < tds.length; i++) { var w = r(tds[i]); ws.push(w); sum += w; }
    out.push('各列宽: ' + ws.join(' / ') + ' px' + (ws.length > 1 ? '（相邻列比值 ' + (Math.max.apply(null, ws) / Math.max(1, Math.min.apply(null, ws))).toFixed(2) + '×）' : ''));
    out.push('各列占表宽: ' + ws.map(function (w) { return (100 * w / Math.max(1, r(t))).toFixed(1) + '%'; }).join(' / '));
    var h4 = tb.querySelector(':scope > tr:first-child > td:nth-child(3) h4');
    if (h4) {
      var lh = parseInt(getComputedStyle(h4).lineHeight, 10) || 22;
      var lines = Math.round(h4.getBoundingClientRect().height / lh);
      out.push('第3列标题「' + h4.textContent.trim() + '」占 ' + lines + ' 行' + (lines > 2 ? ' <b style="color:#c00">（还是折得很碎）</b>' : ' <b style="color:#080">（正常）</b>'));
    }
    // 逐列报「格内排布」：flex=图文同行，block=图标在上文字在下。
    // 之前只报列宽，无法区分「列够宽但仍被竖排」这种响应式判定错误。
    var layouts = [];
    for (var k = 0; k < tds.length; k++) {
      var wrap = tds[k].querySelector(':scope > div[style*="flex"]');
      if (!wrap) { layouts.push('列' + (k + 1) + '=无flex'); continue; }
      var im = wrap.querySelector('img');
      var d = wrap.querySelector('div');
      var ml = d ? getComputedStyle(d).marginLeft : '-';
      var sameRow = im && d ? (Math.abs(im.getBoundingClientRect().top - d.getBoundingClientRect().top) < 6) : null;
      var cellW = Math.round(tds[k].getBoundingClientRect().width);
      var contentW = cellW - 18; // 左右各 9px padding
      var needW = (im ? im.getBoundingClientRect().width : 0) + 40;
      layouts.push('列' + (k + 1) + '=' + getComputedStyle(wrap).display + (sameRow ? '(同行)' : '(竖排)') +
        ' 格' + cellW + 'px 内容' + contentW + 'px' + (sameRow ? ' 需' + Math.round(needW) + 'px' : '') + ' ml=' + ml);
    }
    out.push('格内排布: ' + layouts.join(' ｜ '));
    document.getElementById('probe').innerHTML = out.join('<br>');
  }
  if (document.readyState === 'complete') run(); else window.addEventListener('load', run);
})();
</script>`;

const frame = (which, label, width) => `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>${label}</title>
<link rel="stylesheet" href="${which}.css">
<style>.sheet { background:#333; color:#eee; font:12px/1.7 monospace; padding:6px 8px; margin:0; }</style>
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
<title>对照表列宽修复 · 真前后对比</title>
<style>
  body { margin:0; background:#111; color:#eee; font:13px/1.6 "Microsoft YaHei", system-ui, sans-serif; }
  h1 { font-size:17px; margin:12px 14px 4px; }
  p.note { margin:0 14px 12px; color:#aaa; max-width:1200px; }
  h2 { font-size:13px; margin:14px 14px 4px; color:#8fbf8a; }
  /* 关键：iframe 必须 flex:0 0 auto，否则会被 flex 压缩——那会让 iframe 的视口宽度
     小于标签上的数字，媒体查询、百分比列宽全部按错误的宽度计算，预览就是失真的。
     之前正是这个原因，导致 780px 档看起来和 420px 一样是竖排。 */
  .row { display:flex; gap:12px; padding:0 14px 16px; align-items:flex-start; }
  .row > div { flex:0 0 auto; }
  iframe { border:1px solid #444; background:#fff; display:block; flex:0 0 auto; }
  .lbl { font:12px monospace; color:#888; margin:0 0 3px; }
  .warn { color:#e8c877; }
</style></head>
<body>
<h1>「总体学说」对照表：改动前 vs 改动后</h1>
<p class="note">
  被测的是 <code>Land_doctrine.html</code> 的整张「总体学说」表（4 列，每列 = 图标 + 标题 + 要点 + 斜体描述）。
  左列引用 <code>before.css</code>（从当前样式表删掉那几条规定得到），右列引用此刻生效的
  <code>site/assets/style.css</code>。两边都是真样式表，没有规则模拟。<br>
  <span class="warn">每对 iframe 按标注宽度 1:1 渲染、不做压缩</span>，所以一行放不下时本页会横向滚动——
  请横向滚动查看，不要用缩小窗口的方式看，否则视口宽度就不是标注值了。<br>
  每边顶部自报：table-layout / display / width、表宽、是否横向溢出、各列宽与占比、
  <b>格内排布</b>（flex=图文同行，block=图标在上文字在下）。<br>
  预期：1064px 与 780px 档应<b>图文同行</b>（780 档表格可能轻微横滚）；420px 档应<b>竖排且不横滚</b>。
</p>
${WIDTHS.map((w) => `<h2>iframe 宽 ${w}px（视口真实宽度 ${w}px）</h2>
<div class="row">
  <div><p class="lbl">改动前</p><iframe src="before-w${w}.html" width="${w}" height="700"></iframe></div>
  <div><p class="lbl">改动后</p><iframe src="after-w${w}.html" width="${w}" height="700"></iframe></div>
</div>`).join('\n')}
</body></html>`;
fs.writeFileSync(path.join(OUT, 'index.html'), shell);
console.log('已生成 cache/colwidth-diff/index.html');
