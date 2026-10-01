// Regenerate site/progress.html from data/coverage-real.json, without running a full build.
//
// 07-build.mjs cannot run while cache/pages/ is missing (see NEXT-SESSION-PROMPT.md 2.1), so the
// progress page would otherwise keep the statistics of the last successful build. This script
// reuses exactly the same template and shell as 07-build.mjs, but takes every number from the
// authoritative coverage report written by tools/08c-real-coverage.mjs.
//
//   node tools/scratch/rebuild-progress-page.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { DATA, SITE, readJson } from '../lib.mjs';
import { shell } from '../page.mjs';
import { Registry, navHtml, hrefFor } from '../registry.mjs';
import { Store } from '../translate.mjs';

const dry = process.argv.includes('--dry');

const store = new Store();
const fetched = readJson(path.join(DATA, 'fetched.json'), { pages: {} });
const media = readJson(path.join(DATA, 'media.json'), { files: {} });
const reg = new Registry({ store, fetched, media });
const real = readJson(path.join(DATA, 'coverage-real.json'), []) || [];
if (!real.length) { console.error('data/coverage-real.json is empty — run tools/08c-real-coverage.mjs first'); process.exit(1); }

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const sum = (arr, f) => arr.reduce((s, r) => s + (f(r) || 0), 0);
const proseChars = sum(real, (r) => r.proseChars);
const translated = sum(real, (r) => r.translatedChars);
const totStruct = sum(real, (r) => r.structuralLeftChars);
const totGenuine = sum(real, (r) => r.genuineLeftChars);
const totGenuineUnits = sum(real, (r) => r.genuineLeftUnits);
const structOnly = real.filter((r) => r.structuralOnly);
const genuinePages = real.filter((r) => (r.genuineLeftChars || 0) > 0).sort((a, b) => b.genuineLeftChars - a.genuineLeftChars);
const avg = proseChars ? translated / proseChars : 0;

const cov = real.map((r) => r.pct || 0);
const buckets = [[0, 0.01], [0.01, 0.5], [0.5, 0.9], [0.9, 0.999], [0.999, 1.01]].map(([a, b]) =>
  `<tr><td>${(a * 100).toFixed(0)}% – ${b > 1 ? 100 : (b * 100).toFixed(0)}%</td><td>${cov.filter((r) => r >= a && r < b).length}</td></tr>`).join('');

const linkTo = (r) => (reg.pages.get(r.title) ? `<a href="${hrefFor(reg.pages.get(r.title))}">${esc(r.title)}</a>` : esc(r.title));

const structNote = structOnly.length
  ? `<p class="list-note">下面这 <b>${structOnly.length}</b> 个页面<b>永远不会显示 100%</b>，不是漏译：它们剩下的内容全是无法翻译的键名、国家标签、数值、路径或快捷键，而翻译记忆库按设计拒绝“中文 === 英文”的条目。合计仅 ${totStruct.toLocaleString()} 字符，可以忽略。</p>
      <div class="page-list">${structOnly.map((r) => `<span>${linkTo(r)} <span class="desc">${(r.pct * 100).toFixed(1)}%</span></span>`).join('')}</div>`
  : '';

const genuineTable = genuinePages.slice(0, 40).map((r) =>
  `<tr><td>${linkTo(r)}</td><td>${(r.pct * 100).toFixed(1)}%</td><td>${r.genuineLeftChars.toLocaleString()}</td><td>${r.genuineLeftUnits}</td></tr>`).join('');

const ceiling = (100 * (proseChars - totStruct) / (proseChars || 1)).toFixed(1);

const bodyHtml = `<p class="list-note">按渲染后的中文字符计权统计。平均完成度 <b>${(avg * 100).toFixed(1)}%</b>。</p>
  <p class="list-note">本页数字直接取自 <code>tools/08c-real-coverage.mjs</code> 的报告；整站构建缓存（<code>cache/pages</code>）丢失期间无法运行完整构建，因此这里单独刷新。</p>
  <table><thead><tr><th>完成度区间</th><th>页面数</th></tr></thead><tbody>${buckets}</tbody></table>
  <h3>真正还需翻译的内容</h3>
  <p class="list-note">未译内容分为两类。<b>真正待译</b>：${totGenuine.toLocaleString()} 字符 / ${totGenuineUnits.toLocaleString()} 个单元，分布在 ${genuinePages.length} 个页面上 —— 这才是实际工作量。
  <b>结构性残留</b>：${totStruct.toLocaleString()} 字符，是键名/标签/数值/路径等，无法翻译。</p>
  <p class="list-note">即使把所有可译内容译完，全站上限也是约 <b>${ceiling}%</b>，不会有 100%。</p>
  <h3>待译内容最多的页面（前 40）</h3>
  <table><thead><tr><th>页面</th><th>完成度</th><th>待译字符</th><th>待译单元</th></tr></thead><tbody>${genuineTable}</tbody></table>
  ${structNote}
  <p class="list-note">翻译分批进行，每次回填后重新生成本页即可看到最新进度。</p>`;

const { sidebar, topnav } = navHtml(reg, '__home__');
const html = shell({
  title: 'Progress', zhTitle: '翻译进度', sidebar, topnav, rel: '',
  bodyHtml, toc: [], coverage: 1, meta: { revid: 'progress', fetchedAt: '' },
});

console.log('pages in report:', real.length);
console.log('proseChars:', proseChars.toLocaleString(), '| translated:', translated.toLocaleString(), '| real coverage:', (avg * 100).toFixed(1) + '%');
console.log('genuine left:', totGenuine.toLocaleString(), 'chars /', totGenuineUnits.toLocaleString(), 'units on', genuinePages.length, 'pages');
console.log('structural only pages:', structOnly.length, '| structural chars:', totStruct.toLocaleString(), '| ceiling:', ceiling + '%');
console.log('bucket counts:', buckets.match(/<td>\d+<\/td>/g).map((s) => s.replace(/\D/g, '')).join(' / '));
console.log('html bytes:', html.length);

if (dry) { console.log('(dry run, nothing written)'); process.exit(0); }
const target = path.join(SITE, 'progress.html');
const bak = path.join('cache', 'refsite', 'progress.html.preapply.html');
fs.mkdirSync(path.dirname(bak), { recursive: true });
if (fs.existsSync(target)) fs.writeFileSync(bak, fs.readFileSync(target));
fs.writeFileSync(target, html);
console.log('backup:', bak);
console.log('written:', target);
