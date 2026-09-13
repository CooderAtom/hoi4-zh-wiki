// Step 7: render the whole offline Chinese site.
//   site/*.html                 one file per mirrored wiki page
//   site/assets/*               css/js
//   site/assets/search-index.js offline full-text index
//   site/index.html             Chinese entry page (hub)
// usage: node tools/07-build.mjs [--only "Page title"] [--no-articles]
import fs from 'node:fs';
import path from 'node:path';
import { DATA, CACHE, SITE, readJson, writeJson, WIKI } from './lib.mjs';
import { parse, serialize, byTag } from './dom.mjs';
import { sanitize, parserOutput, assignHeadingIds, slugify, setImageCaseMap } from './sanitize.mjs';
import { applyTranslations } from './units.mjs';
import { buildArticle, shell, tocHtml, SITE_NAME } from './page.mjs';
import { Registry, HUBS, navHtml, hrefFor } from './registry.mjs';
import { Store, normalize } from './translate.mjs';

const argv = process.argv.slice(2);
const only = argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : null;
const noArticles = argv.includes('--no-articles');

const store = new Store();
const fetched = readJson(path.join(DATA, 'fetched.json'), { pages: {} });
const media = readJson(path.join(DATA, 'media.json'), { files: {} });
const manifest = readJson(path.join(DATA, 'pages.json'), { pages: [] });
const catOf = new Map(manifest.pages.map((p) => [p.title, p.cats || []]));
const sizeOf = new Map(manifest.pages.map((p) => [p.title, p.size || 0]));

const reg = new Registry({ store, fetched, media });
for (const rec of reg.pages.values()) { rec.cats = catOf.get(rec.title) || []; rec.size = sizeOf.get(rec.title) || 0; }
console.log('registry pages:', reg.pages.size);
// every link target that actually has a page in this mirror (lower-case slugs)
const knownPages = new Set([...reg.pages.values()].map((r) => r.slug.toLowerCase()));
console.log('known link targets:', knownPages.size);
// The set handed to sanitize() must match 04-extract.mjs exactly: extraction keys on the
// cache/pages/<File>.json names. The registry slugifies titles differently (e.g.
// Formable_nations_Europe vs Formable_nations_2f_Europe), and because a unit's id is a hash of its
// sanitized tokenization, a different set here makes the build compute different ids than extraction
// did and translations silently fail to apply.
const knownSlugs = new Set(fs.readdirSync(path.join(CACHE, 'pages'))
  .filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '').toLowerCase()));
console.log('sanitize known slugs:', knownSlugs.size);

// css/js assets
fs.mkdirSync(path.join(SITE, 'assets'), { recursive: true });
for (const f of ['style.css', 'app.js']) {
  fs.copyFileSync(path.join(path.dirname(new URL(import.meta.url).pathname.slice(1)), 'assets', f), path.join(SITE, 'assets', f));
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// Per-page character cap for the offline search index. See the note at the push site below.
const SEARCH_CAP = Number(process.env.HOI4_SEARCH_CAP || 20000);
const searchPages = [];
const report = { pages: 0, failed: [], coverage: [], untranslatedTitles: 0, images: 0, chars: 0, imageCaseFixed: 0 };

// Pin <img> references to the exact case of the files on disk. Without this the site renders fine
// on Windows but shows broken images on any case-sensitive host. See setImageCaseMap() in sanitize.mjs.
{
  const imgDir = path.join(SITE, 'images');
  if (fs.existsSync(imgDir)) {
    const names = fs.readdirSync(imgDir, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name);
    setImageCaseMap(names);
  }
}

const PAGES_DIR = path.join(CACHE, 'pages');
let files = fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith('.json'));
if (only) files = files.filter((f) => f.toLowerCase().includes(only.toLowerCase()));

for (const f of files) {
  const rec = readJson(path.join(PAGES_DIR, f));
  if (!rec?.html) continue;
  const entry = reg.pages.get(rec.title);
  if (!entry) continue;
  let art;
  try {
    art = buildArticle(rec, store, new Map(Object.entries(media.files || {})), { knownPages, knownSlugs });
  } catch (e) {
    report.failed.push({ title: rec.title, error: e.message });
    console.error('BUILD FAIL', rec.title, e.message);
    continue;
  }
  const bodyHtml = serialize(art.body);
  const { sidebar, topnav } = navHtml(reg, rec.title);
  const zhTitle = entry.titleZh;
  if (zhTitle === rec.title) report.untranslatedTitles++;
  const html = shell({
    title: rec.title,
    zhTitle,
    subtitle: zhTitle !== rec.title ? `原页面：${esc(rec.title)}` : '（本页标题尚未翻译）',
    sidebar, topnav, bodyHtml,
    tocHtml: tocHtml(art.toc),
    rel: '',
    coverage: art.cov.ratio,
    meta: { fetchedAt: (rec.fetchedAt || '').slice(0, 10), revid: rec.revid, description: '' },
  });
  fs.writeFileSync(path.join(SITE, entry.slug + '.html'), html);
  report.pages++;
  report.coverage.push(art.cov.ratio);
  report.images += byTag(art.body, 'img').length;

  // search index entry
  // Search index entry.
  // The cap is the only lever on full-text coverage: no page in this mirror is under 5,000 chars,
  // so a low cap truncates EVERY page. Measured with cap=2200: only 9.7% of rendered text was
  // searchable (2.2k of every page). cap=20000 covers 79% (all of the 524 pages <=20k chars) for a
  // ~16 MB index, which is fine for a local offline file and keeps the promise of 中文全文搜索.
  const text = normalize(art.body.textContent).slice(0, SEARCH_CAP);
  report.chars += text.length;
  searchPages.push({ t: rec.title, z: zhTitle, h: entry.slug + '.html', b: text, w: Math.round((entry.size || 0) / 1024) });
  if (report.pages % 100 === 0) process.stderr.write(`\r  built ${report.pages} pages`);
}
process.stderr.write(`\r  built ${report.pages} pages\n`);

if (noArticles) {
  console.log('skipping hub/index generation (--no-articles)');
} else {
  writeIndexAndHubs();
}

function writeIndexAndHubs() {
  // ---------------- search index ----------------
  const idx = `window.HOI4_INDEX = ${JSON.stringify({ generated: new Date().toISOString(), pages: searchPages })};`;
  fs.writeFileSync(path.join(SITE, 'assets', 'search-index.js'), idx);
  console.log('search index:', (idx.length / 1024).toFixed(0), 'KB for', searchPages.length, 'pages');

  const { sidebar, topnav } = navHtml(reg, '__home__');
  const searchBoxHtml = '';

  // ---------------- hub / index page ----------------
  const boxes = HUBS.map((hub) => {
    const items = hub.items.map(([title, zhLabel]) => {
      const rec = reg.resolve(title);
      if (!rec) return '';
      const href = hrefFor(rec);
      const done = (reg.store.get(rec.title) ? 1 : 0);
      return `<li><a href="${href}">${esc(zhLabel || rec.titleZh)}</a> <span class="desc">${rec.titleZh !== rec.title ? esc(rec.title) : ''}</span></li>`;
    }).join('');
    return `<section class="hub-box" id="${hub.id}"><h2>${esc(hub.zh)}</h2><ul>${items}</ul></section>`;
  }).join('');

  const stats = {
    pages: reg.pages.size,
    images: Object.values(media.files || {}).filter((m) => m && m.local).length,
    zh: searchPages.filter((p) => p.z !== p.t).length,
  };
  const homeBody = `
<div class="hero">
  <h1>钢铁雄心 IV 中文离线资料库</h1>
  <p>本站是 <i>Hearts of Iron IV</i> 官方社区维基（hoi4.paradoxwikis.com）玩法内容的简体中文离线镜像：原站页面、表格、图标与图片已全部本地化，链接全部指向本地页面，无需联网即可浏览。</p>
  <p class="stat-row"><span>收录页面 <b>${stats.pages}</b></span><span>本地图片 <b>${stats.images}</b></span><span>已译页面 <b>${stats.zh}</b></span><span><a href="search.html">中文全文搜索 →</a></span></p>
</div>
<div class="hub-grid">${boxes}</div>
<div class="hub-box">
  <h2>站点工具</h2>
  <ul>
    <li><a href="all-pages.html">全部页面索引</a> <span class="desc">按分类列出全部 ${stats.pages} 个页面</span></li>
    <li><a href="search.html">全文搜索</a> <span class="desc">支持中文与英文关键词</span></li>
    <li><a href="glossary.html">中英术语对照表</a> <span class="desc">统一译名参考</span></li>
    <li><a href="progress.html">翻译进度</a> <span class="desc">各页面中文完成度</span></li>
  </ul>
</div>
<p class="list-note">未列入本站的原站内容（Paradox 商店、论坛、YouTube 视频、模组下载站、国策树数据页等）已在本地镜像中整体移除，相关入口不再保留。</p>`;
  fs.writeFileSync(path.join(SITE, 'index.html'), shell({
    title: 'Hearts of Iron 4 Wiki', zhTitle: '钢铁雄心 IV 中文离线资料库',
    sidebar, topnav, bodyHtml: homeBody, toc: [], rel: '', coverage: 1,
    meta: { fetchedAt: new Date().toISOString().slice(0, 10), revid: 'hub', description: 'Hearts of Iron IV 社区维基玩法内容的简体中文离线镜像' },
  }));

  // ---------------- all pages ----------------
  const groups = new Map();
  for (const rec of [...reg.pages.values()].sort((a, b) => a.titleZh.localeCompare(b.titleZh, 'zh'))) {
    const cat = (rec.cats || []).find((c) => !/^(1\.\d+|Articles|Pages|Outdated|Expand|Stubs|Timeless|Disambiguation)/.test(c)) || '未分类';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(rec);
  }
  const listHtml = [...groups.entries()].sort((a, b) => b[1].length - a[1].length).map(([cat, list]) =>
    `<h3>${esc(cat)}（${list.length}）</h3><div class="page-list">${list.map((r) =>
      `<a href="${hrefFor(r)}">${esc(r.titleZh)}${r.titleZh !== r.title ? ` <span class="desc">${esc(r.title)}</span>` : ''}</a>`).join('')}</div>`).join('');
  fs.writeFileSync(path.join(SITE, 'all-pages.html'), shell({
    title: 'All pages', zhTitle: '全部页面索引',
    sidebar, topnav,
    bodyHtml: `<p class="list-note">共 ${reg.pages.size} 个页面，按原站分类归组。点击任意条目进入中文页面。</p>${listHtml}`,
    toc: [], rel: '', coverage: 1, meta: { revid: 'index', fetchedAt: '' },
  }));

  // ---------------- search page ----------------
  fs.writeFileSync(path.join(SITE, 'search.html'), shell({
    title: 'Search', zhTitle: '搜索', sidebar, topnav, rel: '',
    bodyHtml: `<div class="search-page"><input id="sp-input" type="search" placeholder="输入关键词，例如：政治点数 / 师 / focus / division" autocomplete="off"><div id="sp-results"></div></div>`,
    toc: [], coverage: 1, meta: { revid: 'search', fetchedAt: '' },
  }));

  // ---------------- glossary page ----------------
  const glossary = readJson(path.join(DATA, 'glossary.json'), { terms: {} });
  const rows = Object.entries(glossary.terms || {}).map(([en, zh]) => `<tr><td>${esc(en)}</td><td>${esc(zh)}</td></tr>`).join('');
  fs.writeFileSync(path.join(SITE, 'glossary.html'), shell({
    title: 'Glossary', zhTitle: '中英术语对照表', sidebar, topnav, rel: '',
    bodyHtml: `<p class="list-note">全站统一译名，翻译时严格遵循；如发现不一致之处，以本表为准。</p>
      <table><thead><tr><th>English</th><th>简体中文</th></tr></thead><tbody>${rows}</tbody></table>`,
    toc: [], coverage: 1, meta: { revid: 'glossary', fetchedAt: '' },
  }));

  // ---------------- progress page ----------------
  const prog = readJson(path.join(DATA, 'build-report.json'), null);
  const cov = report.coverage;
  const avg = cov.length ? cov.reduce((a, b) => a + b, 0) / cov.length : 0;
  const buckets = [[0, 0.01], [0.01, 0.5], [0.5, 0.9], [0.9, 0.999], [0.999, 1.01]].map(([a, b]) =>
    `<tr><td>${(a * 100).toFixed(0)}% – ${b > 1 ? 100 : (b * 100).toFixed(0)}%</td><td>${cov.filter((r) => r >= a && r < b).length}</td></tr>`).join('');

  // Distinguish genuinely-translatable leftovers from structural residue. A page whose only
  // leftovers are keys/tags/numbers/paths can never reach 100%, because Store.set() rejects
  // zh === en. Without this split those pages look like unfinished work forever.
  const real = readJson(path.join(DATA, 'coverage-real.json'), []) || [];
  const realBySlug = new Map(real.map((r) => [r.slug, r]));
  const structOnly = real.filter((r) => r.structuralOnly);
  const totStruct = real.reduce((s, r) => s + (r.structuralLeftChars || 0), 0);
  const totGenuine = real.reduce((s, r) => s + (r.genuineLeftChars || 0), 0);
  const totGenuineUnits = real.reduce((s, r) => s + (r.genuineLeftUnits || 0), 0);
  const genuinePages = real.filter((r) => (r.genuineLeftChars || 0) > 0)
    .sort((a, b) => b.genuineLeftChars - a.genuineLeftChars);
  const linkTo = (r) => (reg.pages.get(r.title) ? `<a href="${hrefFor(reg.pages.get(r.title))}">${esc(r.title)}</a>` : esc(r.title));

  const structNote = structOnly.length
    ? `<p class="list-note">下面这 <b>${structOnly.length}</b> 个页面<b>永远不会显示 100%</b>，不是漏译：它们剩下的内容全是无法翻译的键名、国家标签、数值、路径或快捷键，而翻译记忆库按设计拒绝“中文 === 英文”的条目。合计仅 ${totStruct.toLocaleString()} 字符，可以忽略。</p>
      <div class="page-list">${structOnly.map((r) => `<span>${linkTo(r)} <span class="desc">${(r.pct * 100).toFixed(1)}%</span></span>`).join('')}</div>`
    : '';

  const genuineTable = genuinePages.slice(0, 40).map((r) =>
    `<tr><td>${linkTo(r)}</td><td>${(r.pct * 100).toFixed(1)}%</td><td>${r.genuineLeftChars.toLocaleString()}</td><td>${r.genuineLeftUnits}</td></tr>`).join('');

  fs.writeFileSync(path.join(SITE, 'progress.html'), shell({
    title: 'Progress', zhTitle: '翻译进度', sidebar, topnav, rel: '',
    bodyHtml: `<p class="list-note">按渲染后的中文字符计权统计。平均完成度 <b>${(avg * 100).toFixed(1)}%</b>。</p>
      <table><thead><tr><th>完成度区间</th><th>页面数</th></tr></thead><tbody>${buckets}</tbody></table>
      <h3>真正还需翻译的内容</h3>
      <p class="list-note">未译内容分为两类。<b>真正待译</b>：${totGenuine.toLocaleString()} 字符 / ${totGenuineUnits.toLocaleString()} 个单元，分布在 ${genuinePages.length} 个页面上 —— 这才是实际工作量。
      <b>结构性残留</b>：${totStruct.toLocaleString()} 字符，是键名/标签/数值/路径等，无法翻译。</p>
      <p class="list-note">即使把所有可译内容译完，全站上限也是约 <b>${(100 * (real.reduce((s, r) => s + r.proseChars, 0) - totStruct) / (real.reduce((s, r) => s + r.proseChars, 0) || 1)).toFixed(1)}%</b>，不会有 100%。</p>
      <h3>待译内容最多的页面（前 40）</h3>
      <table><thead><tr><th>页面</th><th>完成度</th><th>待译字符</th><th>待译单元</th></tr></thead><tbody>${genuineTable}</tbody></table>
      ${structNote}
      <p class="list-note">翻译分批进行，每次回填后重新生成本站即可看到最新进度。</p>`,
    toc: [], coverage: 1, meta: { revid: 'progress', fetchedAt: '' },
  }));

  // ---------------- robots + README ----------------
  fs.writeFileSync(path.join(SITE, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
}

writeJson(path.join(DATA, 'build-report.json'), {
  generated: new Date().toISOString(),
  pages: report.pages,
  failed: report.failed,
  avgCoverage: report.coverage.length ? report.coverage.reduce((a, b) => a + b, 0) / report.coverage.length : 0,
  fullyTranslated: report.coverage.filter((r) => r > 0.999).length,
  images: report.images,
  indexChars: report.chars,
  searchEntries: searchPages.length,
});
console.log(`pages=${report.pages} images=${report.images} indexChars=${report.chars.toLocaleString()}`);
console.log('avg coverage:', (100 * (report.coverage.reduce((a, b) => a + b, 0) / (report.coverage.length || 1))).toFixed(1) + '%',
  '| fully translated pages:', report.coverage.filter((r) => r > 0.999).length);
if (report.failed.length) console.log('failures:', report.failed.length);
