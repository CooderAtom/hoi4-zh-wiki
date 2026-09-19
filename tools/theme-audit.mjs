// 主题系统自检：不依赖浏览器，把「本该用眼睛看」的部分换成可执行的断言。
//
// 背景：本机沙箱禁止 Chrome 启动（mojo platform_channel.cc:108 拒绝访问），
// 无法截图核对。所以在这里补三类检查：
//   1) 结构：每处 var(--x) 都有定义；四个令牌块（浅色默认 / 自动深色 / 手动深色 /
//      手动浅色）令牌集合完全一致——否则某一种状态下会出现取值回落或漏项。
//   2) 回归：浅色取值必须与改动前的原文件逐字节相同（只允许属性名替换）。
//   3) 可读性：对深色/浅色两套取值算 WCAG 对比度，并按实际用到的地方分组断言。
// 以及统计内联色覆盖规则在真实页面里的命中量（通用选择器会参与近 19 万次样式重算，
// 命中 0 的规则必须删掉）。
//
// usage: node tools/theme-audit.mjs
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, SITE } from './lib.mjs';

const CSS = path.join(SITE, 'assets', 'style.css');
const SRC = path.join(ROOT, 'tools', 'assets', 'style.css');
let fail = 0, warn = 0;
let failsAtSectionStart = 0;
const ok = (m) => console.log('  ok   ' + m);
const bad = (m) => { fail++; console.log('  FAIL ' + m); };
const meh = (m) => { warn++; console.log('  warn ' + m); };
/* 分节汇总必须看「本节新增的失败数」，不能用全局计数——否则前面某一节失败后，
   后面每一节的“全部通过”提示都会被静默吞掉（第一版就踩了这个坑）。 */
const sectionOk = (m) => { if (fail === failsAtSectionStart) ok(m); };
const section = (title) => { failsAtSectionStart = fail; console.log('\n' + title); };

/* ---------- 1. 读入并切块 ---------- */
const cssOf = (p) => fs.readFileSync(p, 'utf8');
const css = cssOf(CSS);
if (css !== cssOf(SRC)) bad('site/assets/style.css 与 tools/assets/style.css 不一致（构建产物未同步）');
else ok('site/assets/style.css 与 tools/assets/style.css 一致');

/* 顶层声明扫描器：返回 { selector, body, media }，media 为 null 表示不在媒体查询内。
   朴素正则配不出 CSS 的嵌套括号，这里按大括号深度手工切。 */
function topLevel(src) {
  const out = [];
  const clean = src.replace(/\/\*[\s\S]*?\*\//g, '');
  let i = 0;
  while (i < clean.length) {
    const open = clean.indexOf('{', i);
    if (open < 0) break;
    const selector = clean.slice(i, open).trim();
    let depth = 1, j = open + 1;
    while (j < clean.length && depth > 0) {
      if (clean[j] === '{') depth++;
      else if (clean[j] === '}') depth--;
      j++;
    }
    const body = clean.slice(open + 1, j - 1);
    if (selector.startsWith('@media')) {
      for (const inner of topLevel(body)) out.push({ selector: inner.selector, body: inner.body, media: selector });
    } else {
      out.push({ selector, body, media: null });
    }
    i = j;
  }
  return out;
}
function decls(rule) {
  const map = new Map();
  if (!rule) return map;
  for (const part of rule.body.split(';')) {
    const i = part.indexOf(':');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (k.startsWith('--')) map.set(k, part.slice(i + 1).trim());
  }
  return map;
}

const rules = topLevel(css);
const findRule = (selector, mediaMatch) => rules.find((r) => r.selector === selector && (mediaMatch ? r.media && mediaMatch.test(r.media) : !r.media));
const rootTokens = decls(findRule(':root'));
const manualDark = decls(findRule(':root[data-theme="dark"]'));
const manualLight = decls(findRule(':root[data-theme="light"]'));
const autoDarkTokens = decls(rules.find((r) => r.selector === ':root:not([data-theme])' && r.media && r.media.includes('prefers-color-scheme: dark')));

console.log('\n[1] 令牌结构');
console.log(`  浅色默认 ${rootTokens.size} 项 / 自动深色 ${autoDarkTokens.size} 项 / 手动深色 ${manualDark.size} 项 / 手动浅色 ${manualLight.size} 项`);
/* 这几项在两套主题下取值相同（顶栏深绿渐变、圆角、版心宽度），刻意不参与深色重定值；
   白名单写成显式常量，避免“漏写”被误判成“有意省略”。 */
const THEME_AGNOSTIC = ['--topbar-1', '--topbar-2', '--topbar-text', '--topbar-nav', '--radius', '--maxw'];
for (const [name, map] of [['自动深色', autoDarkTokens], ['手动深色', manualDark], ['手动浅色', manualLight]]) {
  if (!map.size) { bad(`${name} 块没解析到令牌`); continue; }
  const missing = [...rootTokens.keys()].filter((k) => !map.has(k) && !THEME_AGNOSTIC.includes(k));
  // 反向检查：深色块里出现了浅色 :root 没有的令牌 = 拼写错误或忘在 :root 里定义兜底值
  const extra = [...map.keys()].filter((k) => !rootTokens.has(k));
  if (missing.length) bad(`${name} 缺少令牌：${missing.join(', ')}`);
  if (extra.length) bad(`${name} 多出未在 :root 定义的令牌：${extra.join(', ')}`);
}
sectionOk(`除刻意共用的 ${THEME_AGNOSTIC.length} 项（顶栏/圆角/版心）外，四套令牌集合一致`);
if (autoDarkTokens.size && manualDark.size) {
  const drift = [...autoDarkTokens].filter(([k, v]) => manualDark.get(k) !== v).map(([k]) => k);
  if (drift.length) bad(`自动深色与手动深色取值不一致：${drift.join(', ')}`);
  else ok('自动深色与手动深色逐项一致');
}

section('[2] var() 引用完整性');
const referenced = new Set([...css.matchAll(/var\((--[a-z0-9-]+)\)/gi)].map((m) => m[1]));
const undef = [...referenced].filter((v) => !rootTokens.has(v));
if (undef.length) bad(`引用了未定义的变量：${undef.join(', ')}`);
else ok(`${referenced.size} 个被引用的变量全部已在 :root 定义`);
const unused = [...rootTokens.keys()].filter((k) => !referenced.has(k));
if (unused.length) meh(`定义了但没被引用（可能是留给将来或纯占位）：${unused.join(', ')}`);

section('[3] 深色块排序（手动浅色必须压过系统深色偏好）');
const iDark = css.indexOf(':root[data-theme="dark"]');
const iLight = css.indexOf(':root[data-theme="light"]');
if (iDark > 0 && iLight > iDark) ok('data-theme="light" 排在 data-theme="dark" 之后，同特异性后者生效');
else bad('手动浅色块必须排在手动深色块之后，否则系统为深色时选「浅色」不生效');

section('[4] 回退安全性（自动是默认，不能依赖 JS）');
if (rootTokens.size && /prefers-color-scheme:\s*dark/.test(css) && /:root:not\(\[data-theme\]\)/.test(css)) {
  ok('无 data-theme 时由媒体查询接管 = 禁用 JS 也能跟随系统');
} else bad('自动跟随必须只靠 CSS 媒体查询实现');
if (rules.some((r) => r.selector === ':root' && /color-scheme:\s*light/.test(r.body))) ok('color-scheme 有浅色兜底（表单控件/滚动条原生渲染）');
else meh('未找到 color-scheme 浅色兜底');
if (rules.some((r) => r.selector === ':root:not([data-theme])' && r.media && /prefers-color-scheme/.test(r.media) && /color-scheme:\s*dark/.test(r.body))) {
  ok('自动深色时 color-scheme 同步为 dark');
} else bad('系统深色下的 color-scheme 未跟随，滚动条/表单控件原生渲染会仍是浅色');

/* ---------- 5. 浅色取值回归 ---------- */
section('[5] 浅色取值回归（应与改动前逐字节相同）');
const LEGACY = {
  '--green': '#5b7f5b', '--green-dark': '#3f5c3f', '--green-light': '#96be96',
  '--bg': '#f4f5f0', '--panel': '#ffffff', '--text': '#1d211d', '--muted': '#5d6459',
  '--border': '#ccd3c6', '--link': '#245a8d', '--link-visited': '#6b4a86',
  '--table-head': '#dfe7d6', '--table-alt': '#f2f5ec', '--warn': '#8a6d1f',
  '--warn-bg': '#fdf3d6', '--warn-border': '#e6d391',
  '--topbar-1': '#4e6f4e', '--topbar-2': '#3d5a3d',
  '--input-bg': '#f7f9f4', '--input-text': '#1d211d', '--input-border': '#2f4630',
  '--menu-bg': '#ffffff', '--menu-border': '#eef1e8', '--hover-bg': '#eef4e6', '--cur-bg': '#dfe7d6',
  '--nav-label': '#3f5c3f',
  '--code-bg': '#eef1e8', '--pre-bg': '#f6f8f2', '--blockquote-bg': '#f8faf5',
  '--blockquote-text': '#33402f', '--head4': '#2c3a2c', '--toc-bg': '#f7f9f3', '--hint': '#333d31',
  '--special-link': '#2b3a2b', '--mark-bg': '#ffe9a8',
  '--shadow': 'rgba(0, 0, 0, .22)', '--shadow-strong': 'rgba(0, 0, 0, .3)', '--backdrop': 'rgba(0, 0, 0, .42)',
};
for (const [k, want] of Object.entries(LEGACY)) {
  const got = rootTokens.get(k);
  if (got !== want) bad(`${k} 浅色取值被改动：期望 ${want}，实际 ${got}`);
}
sectionOk(`抽查的 ${Object.keys(LEGACY).length} 个浅色令牌与原值逐字节一致`);
// 浅色块里不允许出现深色取值
const darkBg = manualDark.get('--bg');
if (manualLight.get('--bg') === darkBg) bad('手动浅色块的 --bg 与深色相同');

/* ---------- 6. 对比度 ---------- */
section('[6] 深色对比度（WCAG，正文目标 ≥4.5:1）');
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lum = (hex) => {
  if (typeof hex !== 'string') throw new Error('对比度检查拿到非颜色值：' + hex);
  const m = hex.replace('#', '');
  const v = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  if (!/^[0-9a-f]{6}$/i.test(v)) throw new Error('对比度检查只支持 #rrggbb，收到：' + hex);
  return 0.2126 * lin(parseInt(v.slice(0, 2), 16)) + 0.7152 * lin(parseInt(v.slice(2, 4), 16)) + 0.0722 * lin(parseInt(v.slice(4, 6), 16));
};
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const d = (k) => manualDark.get(k);
const bg = d('--bg'), panel = d('--panel');
const darkChecks = [
  ['正文 text/panel', d('--text'), panel, 4.5],
  ['次要 muted/panel', d('--muted'), panel, 4.5],
  ['链接 link/panel', d('--link'), panel, 4.5],
  ['已访问 link-visited/panel', d('--link-visited'), panel, 4.5],
  ['正文 text/bg', d('--text'), bg, 4.5],
  ['次要 muted/bg', d('--muted'), bg, 4.5],
  ['区块标题 nav-label/panel', d('--nav-label'), panel, 4.5],
  ['信息框链接 special-link/panel', d('--special-link'), panel, 4.5],
  ['提示 hint/panel', d('--hint'), panel, 4.5],
  ['h4 head4/panel', d('--head4'), panel, 4.5],
  ['引用文字 blockquote-text/bg', d('--blockquote-text'), d('--blockquote-bg'), 4.5],
  ['警告横幅 warn/warn-bg', d('--warn'), d('--warn-bg'), 4.5],
  ['表头 table-head/panel 上的正文', d('--text'), d('--table-head'), 4.5],
  ['隔行 table-alt 上的正文', d('--text'), d('--table-alt'), 4.5],
  ['代码块 code-bg 上的正文', d('--text'), d('--code-bg'), 4.5],
  ['顶栏底 topbar-1 上的导航字', '#f0f4ec', d('--topbar-1'), 4.5],
].filter(([, f, b]) => f && b);
for (const [name, f, b, min] of darkChecks) {
  const r = ratio(f, b);
  if (r < min) bad(`${name} = ${r.toFixed(2)}:1（需 ≥${min}）`);
  else ok(`${name} = ${r.toFixed(2)}:1`);
}
// 上游内联色在深色下会被覆盖规则改写成这些值，一并验算
const UPSTREAM = { green: '#4fbf5a', red: '#ff7676', orange: '#e8a33d', grey: '#9aa79a', info: '#7ec8e3' };
for (const [name, hex] of Object.entries(UPSTREAM)) {
  const r = ratio(hex, panel);
  if (r < 4.5) bad(`上游字色覆盖 ${name} ${hex}/panel = ${r.toFixed(2)}:1`);
  else ok(`上游字色覆盖 ${name} ${hex}/panel = ${r.toFixed(2)}:1`);
}

/* ---------- 7. 未走变量的硬编码颜色 ---------- */
section('[7] 变量块之外残留的硬编码颜色');
// 只看普通样式规则：排除 :root 系列令牌块（颜色本就该写在那里）、自动深色里那条
// 图片画框规则（有意保留 #fff 底），以及 print 块（刻意写死的浅色）。
const body = rules
  .filter((r) => r.selector !== ':root:not([data-theme])' && !r.selector.startsWith(':root') && !(r.media && r.media.includes('print')))
  .map((r) => r.body)
  .join('\n');
/* 颜色字面量的统一匹配式。词边界不能省：内联样式里有 6 万处 `white-space:nowrap`，
   没有 \b 的话 "white" 会被当成颜色统计，直接污染分布结论（第一版就错了）。 */
const COLOR_RE = () => /#[0-9a-fA-F]{3,8}\b|\brgba?\([^)]*\)|\b(?:white|black|silver|maroon|navy|teal|olive|purple|lime|aqua|fuchsia)\b/g;
const leftovers = [...body.matchAll(COLOR_RE())].map((m) => m[0].toLowerCase());
const tally = {};
for (const c of leftovers) tally[c] = (tally[c] || 0) + 1;
const entries = Object.entries(tally).sort((a, b) => b[1] - a[1]);
const EXPECTED = {
  'rgba(255,255,255,.16)': '顶栏导航悬停蒙版，两套主题通用',
  'rgba(255,255,255,.12)': '主题开关底色，压在深绿顶栏上，两套主题通用',
  'rgba(255,255,255,.28)': '主题开关描边，同上',
  'rgba(255,255,255,.2)': '主题开关悬停底色，同上',
  '#fff': '顶栏文字 / 悬浮按钮文字（配深绿或品牌绿底）',
  'white': '同 #fff —— .nav-toggle 的 color 简写归一化后的形式',
  '#f0f4ec': '顶栏导航文字',  '#ffe9a8': '属性选择器里的原值（实际取值走 --mark-bg）',
  '#4fbf5a': '上游绿字覆盖值', '#ff7676': '上游红字覆盖值', '#e8a33d': '上游橙字覆盖值',
  '#9aa79a': '上游灰字覆盖值', '#7ec8e3': '上游蓝字覆盖值', '#245a8d': '属性选择器里的原值',
};
for (const [c, n] of entries) {
  if (EXPECTED[c]) ok(`保留字面量 ${c} ×${n} —— ${EXPECTED[c]}`);
  else meh(`未登记的字面量 ${c} ×${n}（若两套主题通用可加到 EXPECTED，否则应提成变量）`);
}
// 深色图片画框：white 出现在自动深色块的 background 上，属于有意保留
if (rules.some((r) => r.media && /prefers-color-scheme/.test(r.media) && /background:\s*#fff/.test(r.body))) {
  ok('深色图片画框保留 #fff 底（让截图/国旗保持原色，见 style.css 注释）');
} else meh('未找到深色图片画框规则（图片在深色下可能只剩描边）');
sectionOk(`除 ${Object.keys(EXPECTED).length} 项已登记的字面量外，正文规则全部走变量`);

/* ---------- 8. 内联色分布与覆盖规则命中量 ---------- */
section('[8] 内联色分布（真实页面统计，口径已排除属性名污染）');
const sels = [...css.matchAll(/^\s*([^\n{}]*\[style\*=[^\n{}]*)\{/gim)].map((m) => m[1].trim());
console.log(`  style*= 选择器共 ${sels.length} 条`);
if (!sels.length) {
  console.log('  （当前尚未加入内联色兜底规则，阶段 2 再加；此处先给出上游色的真实分布）');
}
const counts = {};
const byProp = {};
const pages = fs.readdirSync(SITE).filter((f) => f.endsWith('.html'));
const DECL = /([a-z-]+)\s*:\s*([^;]+)/gi;
for (const f of pages) {
  const t = fs.readFileSync(path.join(SITE, f), 'utf8');
  for (const m of t.matchAll(/style\s*=\s*"([^"]*)"/g)) {
    // 必须先按“属性:值”切开再找颜色：直接对整串匹配会把 `white-space:nowrap`
    // 的 white 算成颜色，全站会凭空多出 6 万次“白色”。
    for (const d of m[1].matchAll(DECL)) {
      const prop = d[1].toLowerCase();
      for (const cm of d[2].matchAll(COLOR_RE())) {
        const k = cm[0].toLowerCase();
        counts[k] = (counts[k] || 0) + 1;
        const pk = prop + ' → ' + k;
        byProp[pk] = (byProp[pk] || 0) + 1;
      }
    }
  }
}
const total = Object.values(counts).reduce((a, b) => a + b, 0);
const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
let cum = 0;
console.log(`  页面 ${pages.length} 个，内联色出现 ${total} 次，共 ${sorted.length} 种`);
for (const [c, n] of sorted.slice(0, 21)) {
  cum += n;
  console.log(`    ${String(c).padEnd(10)} ${String(n).padStart(6)}  累计 ${(100 * cum / total).toFixed(1)}%`);
}
console.log('  出现最多的「属性 → 颜色」组合：');
for (const [k, n] of Object.entries(byProp).sort((a, b) => b[1] - a[1]).slice(0, 12)) {
  console.log(`    ${k.padEnd(34)} ${String(n).padStart(6)}`);
}
const bgLight = sorted.filter(([c]) => /^#(e|f)/i.test(c) || /^(white|#fff)/i.test(c)).reduce((a, [, n]) => a + n, 0);
console.log(`  其中浅色底/白底类（#e*/#f*/white）合计 ${bgLight} 次，是深色下必须处理的主要对象`);

console.log(`\n结果：${fail} 项失败，${warn} 项提醒`);
process.exit(fail ? 1 : 0);
