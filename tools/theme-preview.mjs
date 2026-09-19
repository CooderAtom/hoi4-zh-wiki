// 生成主题对照页：同屏并排渲染「自动 / 强制浅色 / 强制深色」+ 一个窄屏列。
//
// 为什么需要它：本机沙箱禁止 Chrome 启动（mojo platform_channel.cc:108 拒绝访问），
// 无法用 headless 截图核对；让用户为了看一眼深色而反复改系统主题也不现实。
// 这里把三个状态各自钉在独立的 iframe 里（data-theme 互不干扰），一屏即可对比，
// 用的是真实的 site/assets/style.css 与真实的站点图片，所以不是示意图而是真渲染。
// 窄屏列用 420px 宽 iframe 触发 560px 以下的媒体查询（iframe 的 vw = iframe 宽度），
// 用来确认顶栏在窄屏放得下「品牌 + 搜索框 + 主题开关」。
//
// usage: node tools/theme-preview.mjs
import fs from 'node:fs';
import path from 'node:path';
import { SITE, ROOT, readJson } from './lib.mjs';

/* 生成到 cache/ 而不是 site/：site/ 是 GitHub Pages 的发布根目录，
   对照页属于本地验收工具，不该被推上去（cache/ 已在 .gitignore 里）。
   样式与脚本直接用 ../../site/assets/ 下的真实文件，不做副本——副本会过期，
   而对照页的价值恰恰在于「看到的就是此刻线上的那份 CSS」。 */
const OUT = path.join(ROOT, 'cache', 'theme-preview');
fs.mkdirSync(OUT, { recursive: true });
const REL = '../../site/';
const INDEX_STUB = path.join(OUT, 'index-stub.js');
// app.js 会读 window.HOI4_INDEX；给一个空索引，避免 file:// 下 404 报错刷控制台
fs.writeFileSync(INDEX_STUB, 'window.HOI4_INDEX={pages:[]};\n');

/* 挑两张真实图片：一张透明 PNG（测画框），一张大的游戏截图（测“白底是内容”） */
const media = readJson(path.join(SITE, '..', 'data', 'media.json'), { files: {} });
const files = Object.entries(media.files || {});
const pick = (pred) => (files.find(([n, r]) => pred(n, r)) || [])[0];
const iconName = pick((n, r) => /\.png$/i.test(n) && r && r.width && r.width <= 64 && r.width === r.height)
  || pick((n) => /\.png$/i.test(n) && /focus|icon|idea|goal/i.test(n))
  || 'Focus_generic_goal.png';
const shotName = pick((n, r) => /\.(jpg|jpeg|png)$/i.test(n) && r && r.width >= 900)
  || 'NF_tree_Czechoslovakia_pfot.jpg';
const imgOk = (n) => fs.existsSync(path.join(SITE, 'images', n));
const icon = imgOk(iconName) ? iconName : null;
const shot = imgOk(shotName) ? shotName : null;

/* 内容取自真实页面会遇到的各类结构：内联色的修正符、灰底信息框、彩色标签表、
   行内代码、引用、表格、警告横幅、目录、图片。 */
const INLINE = `
<p>上游内联色（这是深色适配的主要对象，属性选择器规则就是冲它们来的）：</p>
<ul>
  <li>装甲：<span style="color: #FF0000;; font-weight:bold;">-5%</span></li>
  <li>最大速度：<span style="color: #008000;; font-weight:bold;">+10%</span></li>
  <li>研究速度：<span style="color:#ff7019; font-weight:bold;">+5%</span></li>
  <li>不可用：<span style="color:#aaa;">—</span>　备注：<span style="color:black;">见下文</span></li>
</ul>
<p>国策/成就用的彩色小标签：</p>
<p>
  <span style="display:inline-block; width:2em; text-align:center; background-color:#d8d8ff; padding:0 2px;">1</span>
  <span style="display:inline-block; width:2em; text-align:center; background-color:#d8e8f0; padding:0 2px;">2</span>
  <span style="display:inline-block; width:2em; text-align:center; background-color:#d8fcde; padding:0 2px;">3</span>
  <span style="display:inline-block; width:2em; text-align:center; background-color:#fbfbd8; padding:0 2px;">4</span>
  <span style="display:inline-block; width:2em; text-align:center; background-color:#f0e8d8; padding:0 2px;">5</span>
  <span style="display:inline-block; width:2em; text-align:center; background-color:#ffd8d8; padding:0 2px;">6</span>
  <span style="display:inline-block; width:2em; text-align:center; background-color:#ffffff; padding:0 2px; border:1px solid #dcdcdc;">7</span>
</p>
<p>灰底块（<code>#ededed</code> / <code>#f9f9f9</code> / <code>#efefef</code>），全站约 7,000 处：</p>
<table><tbody>
  <tr><td style="background:#ededed; padding:6px;">background:#ededed</td><td style="background-color:#f9f9f9; padding:6px;">background-color:#f9f9f9</td><td style="background-color:#efefef; padding:6px;">background-color:#efefef</td></tr>
  <tr><td style="border:1px solid #dcdcdc; padding:6px;">border:#dcdcdc</td><td style="border:1px solid #aaa; padding:6px;">border:#aaa</td><td style="background:#fafafa; padding:6px;">background:#fafafa</td></tr>
</tbody></table>
<p>信息框（原站 float 布局，深色下由变量接管）：</p>
<div style="float:right; clear:right; width:230px; margin:0 0 12px 14px; border:1px solid #ccc; background:#f9f9f9; padding:8px 10px; font-size:13px;">
  <b>信息框标题</b>
  <p style="margin:4px 0;">这里是浮动信息框，带 <a href="#" style="color: #245a8d;">内联深蓝链接</a>，用于验证深色下的对比度。</p>
</div>
<p>正文段落用于看行长、字重与链接色。参考 <a href="#">国家焦点</a> 与 <a href="#">陆军学说</a> 页面。行内代码写作 <code>focus = { id = GER_rhineland }</code>，公式区会出现 <span class="math-inline">pp = (base × modifier) / 100</span> 这类文本。</p>
<pre># 代码块（--pre-bg）
focus = {
  id = GER_rhineland
  cost = 10
}</pre>
<blockquote>引用块：原站用于摘录开发者日志与补丁说明。</blockquote>
<p>列表与嵌套：</p>
<ul><li>第一项<ul><li>嵌套项，用于看缩进与行距</li></ul></li><li>第二项</li></ul>
<h3>表格：科技树（宽表在窄屏内滚动）</h3>
<table>
  <thead><tr><th>科技</th><th>年份</th><th>效果</th></tr></thead>
  <tbody>
    <tr><td>基本轻型坦克</td><td>1936</td><td>解锁轻型坦克与相关改装位</td></tr>
    <tr><td>改进轻型坦克</td><td>1939</td><td>解锁更高级底盘，装甲 <span style="color:#008000; font-weight:bold;">+10%</span></td></tr>
  </tbody>
</table>
`;

const page = (theme, title, width) => `<!DOCTYPE html>
<html lang="zh-CN"${theme === 'auto' ? '' : ` data-theme="${theme}"`}>
<head>
<meta charset="utf-8">
<title>${title}</title>
<link rel="stylesheet" href="${REL}assets/style.css">
<script>window.HOI4_REL="";</script>
<script src="index-stub.js"></script>
<script src="${REL}assets/app.js" defer></script>
<style>
  /* 只给「预览页自己」加的说明条，不属于站点样式 */
  .pv-note { background:#333; color:#eee; font:12px/1.6 monospace; padding:4px 8px; margin:0; }
</style>
</head>
<body data-rel="">
<p class="pv-note">${title} · iframe 宽度 ${width}px · data-theme=${theme === 'auto' ? '（无属性，跟随系统）' : theme}</p>
<header class="topbar"><div class="topbar-inner">
  <a class="brand" href="#">钢铁雄心 IV <small>中文离线资料库</small></a>
  <nav class="topnav"><a href="#">入门</a><a href="#">战争</a><a href="#">科技</a><a href="#">全部页面</a></nav>
  <div class="searchbox">
    <input id="q" type="search" placeholder="搜索页面（按 / 聚焦）" autocomplete="off" aria-label="搜索">
    <div id="search-results"></div>
  </div>
</div></header>
<div class="wrap">
<main class="content">
  <div class="crumbs"><a href="#">首页</a> › <a href="#">科技</a> › 装甲科技</div>
  <h1 class="page-title">装甲科技（主题对照样例）</h1>
  <p class="subtitle">原页面：Armor technology</p>
  <div class="cov-banner">本页中文翻译进度 <b>87%</b>，未译部分暂保留英文原文。</div>
  <nav class="toc" aria-label="目录"><div class="toc-title">目录</div><ol>
    <li class="lvl-2"><a href="#">1 概述</a></li>
    <li class="lvl-3"><a href="#">1.1 基础科技</a></li>
    <li class="lvl-2"><a href="#">2 表格对照</a></li>
    <li class="lvl-2"><a href="#">3 图片与画框</a></li>
  </ol></nav>
  <h2>概述</h2>
  <h4>四级标题</h4>
  ${INLINE}
  <h2>图片与画框</h2>
  <p>透明图标（深色下应有一圈描边，而不是消失）：</p>
  ${icon ? `<p><img src="${REL}images/${encodeURIComponent(icon)}" alt="" width="40"></p>` : '<p>（未找到合适的透明图标）</p>'}
  <p>游戏截图（白底属于画面内容，深色下保持原色、只加画框）：</p>
  ${shot ? `<p><img src="${REL}images/${encodeURIComponent(shot)}" alt="" style="max-width:100%;"></p>` : '<p>（未找到截图）</p>'}
</main>
<aside class="sidebar">
  <h3>科技与学说</h3>
  <ul>
    <li><a href="#">陆军学说</a></li>
    <li><a href="#" class="cur">装甲科技</a></li>
    <li><a href="#">海军学说</a></li>
    <li><a href="#">空军科技</a></li>
  </ul>
  <h3>战争</h3>
  <ul><li><a href="#">战争总览</a></li><li><a href="#">后勤</a></li><li><a href="#">地形</a></li></ul>
</aside>
</div>
<footer class="site-footer"><p>本资料库内容译自 <a href="#">Hearts of Iron IV Wiki</a>，原文以 CC BY-SA 3.0 授权发布。</p></footer>
</body>
</html>`;

const COLS = [
  ['auto', '自动（跟随系统）', 520],
  ['light', '强制浅色', 520],
  ['dark', '强制深色', 520],
  ['dark', '强制深色 · 窄屏 420px', 420],
];
for (const [theme, title, w] of COLS) {
  const name = (theme === 'auto' ? 'auto' : theme) + (w === 420 ? '-narrow' : '') + '.html';
  fs.writeFileSync(path.join(OUT, name), page(theme, title, w));
}

const shell = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<title>主题对照 · 钢铁雄心 IV 中文离线资料库</title>
<style>
  body { margin:0; background:#111; color:#eee; font:14px/1.6 "Microsoft YaHei", system-ui, sans-serif; }
  h1 { font-size:18px; margin:14px 16px 6px; }
  p.note { margin:0 16px 12px; color:#aaa; font-size:13px; max-width:1100px; }
  .row { display:flex; gap:12px; padding:0 16px 24px; align-items:flex-start; }
  .col { flex:0 0 auto; }
  .col h2 { font-size:13px; margin:0 0 6px; color:#8fbf8a; font-weight:600; }
  iframe { border:1px solid #444; background:#fff; display:block; }
  code { background:#222; padding:1px 4px; border-radius:3px; }
</style></head>
<body>
<h1>主题对照：自动 / 强制浅色 / 强制深色</h1>
<p class="note">
  三列用的是真实的 <code>site/assets/style.css</code>、真实的 <code>app.js</code> 与真实站点图片；
  每列是一个独立 iframe，各自钉住一个 <code>data-theme</code>，因此可以同屏比较。
  「自动」列跟随你当前系统主题，另外两列是强制值。<br>
  要验证开关本身：直接打开 <code>../Air_combat.html</code>（真实页面），顶栏右侧的下拉即为三态开关；
  选完刷新页面应保持选择，选「自动」则应重新跟随系统。<br>
  注意：iframe 之间同源，所以这一页里在某一列切换下拉会写进 localStorage、
  刷新后影响所有 <code>auto</code> 列——这是 localStorage 的正常行为，不是缺陷。
</p>
<div class="row">
${COLS.map(([theme, title, w]) => `  <div class="col"><h2>${title} · ${w}px</h2><iframe src="${(theme === 'auto' ? 'auto' : theme) + (w === 420 ? '-narrow' : '')}.html" width="${w}" height="1300"></iframe></div>`).join('\n')}
</div>
</body></html>`;
fs.writeFileSync(path.join(OUT, 'index.html'), shell);

console.log('已生成 ' + path.relative(SITE, OUT) + '/index.html');
console.log('  列：' + COLS.map(([t, n, w]) => `${n}(${w}px)`).join(' / '));
console.log('  用到的图片：' + (icon || '无') + ' / ' + (shot || '无'));
