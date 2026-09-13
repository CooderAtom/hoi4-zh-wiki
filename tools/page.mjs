// Render one article page to a self-contained HTML file.
import { parse, serialize, el, text, $, $1, byTag } from './dom.mjs';
import { parserOutput, sanitize, assignHeadingIds, localPageHref, slugify } from './sanitize.mjs';
import { applyTranslations } from './units.mjs';
import { readJson, DATA } from './lib.mjs';

export const SITE_NAME = '钢铁雄心 IV 中文离线资料库';
export const SITE_SHORT = 'HOI4 中文资料库';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** the TOC box for a page */
export function tocHtml(toc) {
  if (!toc || !toc.length) return '';
  const items = toc.filter((t) => t.level >= 2 && t.level <= 4);
  if (!items.length) return '';
  return `<nav class="toc" aria-label="目录"><div class="toc-title">目录</div><ol>` +
    items.map((t) => `<li class="lvl-${t.level}"><a href="#${esc(t.id)}">${esc(t.textZh || t.text)}</a></li>`).join('') +
    `</ol></nav>`;
}

/**
 * Full page shell.
 * @param {{title:string, zhTitle:string, sidebar:string, topnav:string,
 *          bodyHtml:string, toc:Array, rel:string, meta:object, extraHead?:string,
 *          crumbs?:string, coverage?:number}} o
 */
export function shell(o) {
  const rel = o.rel || '';
  const cov = typeof o.coverage === 'number' ? o.coverage : 1;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(o.zhTitle)} - ${SITE_NAME}</title>
<meta name="description" content="${esc(o.meta?.description || '')}">
<link rel="stylesheet" href="${rel}assets/style.css">
<script>window.HOI4_REL=${JSON.stringify(rel)};</script>
<script src="${rel}assets/search-index.js" defer></script>
<script src="${rel}assets/app.js" defer></script>${o.extraHead || ''}
</head>
<body data-rel="${rel}">
<header class="topbar"><div class="topbar-inner">
  <a class="brand" href="${rel}index.html">钢铁雄心 IV <small>中文离线资料库</small></a>
  <nav class="topnav">${o.topnav || ''}</nav>
  <div class="searchbox">
    <input id="q" type="search" placeholder="搜索页面（按 / 聚焦）" autocomplete="off" aria-label="搜索">
    <div id="search-results"></div>
  </div>
</div></header>
<div class="wrap">
<aside class="sidebar">${o.sidebar || ''}</aside>
<main class="content">
${o.crumbs ? `<div class="crumbs">${o.crumbs}</div>` : ''}
<h1 class="page-title">${esc(o.zhTitle)}</h1>
${o.subtitle ? `<p class="subtitle">${o.subtitle}</p>` : ''}
${cov < 0.995 ? `<div class="cov-banner">本页中文翻译进度 <b>${Math.round(cov * 100)}%</b>，未译部分暂保留英文原文。</div>` : ''}
${o.tocHtml || ''}
${o.bodyHtml}
</main>
</div>
<footer class="site-footer">
<p>本资料库内容译自 <a href="https://hoi4.paradoxwikis.com/" rel="noreferrer">Hearts of Iron IV Wiki</a>（Paradox Interactive 社区维基），原文以 CC BY-SA 3.0 授权发布，译文沿用同一授权。仅供个人离线学习，与 Paradox Interactive 无隶属关系。</p>
<p>原页面「${esc(o.title)}」｜ 抓取时间 ${esc(o.meta?.fetchedAt || '')} ｜ 原站版本号 ${esc(String(o.meta?.revid || ''))} ｜ 中文翻译进度 ${Math.round(cov * 100)}%</p>
</footer>
</body>
</html>`;
}

export function buildArticle(rec, store, images, { knownPages, knownSlugs }) {
  const dom = parse(rec.html);
  const body = parserOutput(dom);
  // sanitize() must be given EXACTLY the "known page" set that 04-extract used, because `known`
  // changes how links are unwrapped and therefore how units are tokenized. Unit ids are hashes of
  // that tokenization, so any difference here silently stops translations from applying.
  // knownSlugs is the extraction set (cache/pages filenames); knownPages is the registry set, which
  // slugifies titles differently and is the right one for the link rewriting below.
  const stats = sanitize(body, { images, pageTitle: rec.title, known: knownSlugs || knownPages });
  const toc = assignHeadingIds(body);
  const trStats = applyTranslations(body, store, {});
  const cov = { ratio: trStats.ratio, total: trStats.nodes, done: trStats.done };

  // page title: prefer the translated H1
  let zhTitle = store.get(rec.title) || null;
  const h1 = byTag(body, 'h1')[0];
  if (!zhTitle && h1) zhTitle = store.get(h1.textContent) || null;
  if (!zhTitle) zhTitle = rec.title;

  // drop the in-body H1 (the shell renders the title)
  for (const h of byTag(body, 'h1')) h.remove();

  // translate the TOC labels
  for (const e of [...toc]) e.textZh = store.get(e.text) || e.text;

  // local wiki links: drop links to pages we did not mirror
  for (const a of byTag(body, 'a')) {
    const t = a.attr('data-wiki-title');
    if (!t) continue;
    a.removeAttr('data-wiki-title');
    if (knownPages && knownPages.size && !knownPages.has(slugify(t).toLowerCase())) {
      // page is intentionally not part of the mirror -> keep the words, drop the link
      a.replaceWith([...a.children]);
      continue;
    }
    a.setAttr('href', localPageHref(t));
  }
  return { title: rec.title, zhTitle, body, toc, cov, stats };
}
