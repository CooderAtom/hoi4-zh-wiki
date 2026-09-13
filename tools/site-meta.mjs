// robots.txt + sitemap.xml for the published site.
//
// Kept as its own module (rather than inlined in 07-build.mjs) so that the exact same code
// path can be run standalone:
//
//     node tools/site-meta.mjs
//
// which regenerates just these two files from whatever is already in site/, without
// rebuilding the 655 article pages (a full rebuild rewrites every HTML file and the
// timestamped search index, producing a huge diff for a two-file change).
//
// 2026-09 note: 07-build.mjs used to hardcode `Disallow: /`, which made the whole mirror
// invisible to search engines. Coverage is now open on request. Keep an eye on the
// GitHub Pages soft bandwidth limit (100 GB/month) — the site ships ~490 MB of images,
// so one full crawl by a search engine costs roughly 0.5 GB.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Public origin of the deployed site. Only used for robots.txt / sitemap.xml, which require
// absolute URLs; every page in the mirror itself uses relative links and works under any path.
export const SITE_BASE = process.env.HOI4_SITE_BASE || 'https://cooderatom.github.io/hoi4-zh-wiki';

// Non-article pages written by writeIndexAndHubs() in 07-build.mjs.
export const HUB_PAGES = ['index.html', 'search.html', 'all-pages.html', 'glossary.html', 'progress.html'];

const xmlEscape = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export function robotsTxt({ base = SITE_BASE } = {}) {
  return `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`;
}

export function sitemapXml(articleFiles, { base = SITE_BASE, lastmod = new Date().toISOString().slice(0, 10) } = {}) {
  const entries = [
    ...HUB_PAGES.map((h) => ({ h, priority: '1.0' })),
    ...articleFiles.map((h) => ({ h, priority: '0.6' })),
  ];
  const body = entries.map((e) =>
    `  <url><loc>${xmlEscape(`${base}/${encodeURI(e.h)}`)}</loc>`
    + `<lastmod>${lastmod}</lastmod><priority>${e.priority}</priority></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n`
    + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function writeSiteMeta(siteDir, articleFiles, opts = {}) {
  fs.writeFileSync(path.join(siteDir, 'robots.txt'), robotsTxt(opts));
  fs.writeFileSync(path.join(siteDir, 'sitemap.xml'), sitemapXml(articleFiles, opts));
  return { urls: HUB_PAGES.length + articleFiles.length };
}

// ---------------- standalone mode ----------------
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const siteDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
  const articleFiles = fs.readdirSync(siteDir)
    .filter((f) => f.endsWith('.html') && !HUB_PAGES.includes(f))
    .sort();
  const { urls } = writeSiteMeta(siteDir, articleFiles);
  console.log(`robots.txt + sitemap.xml written to ${siteDir}`);
  console.log(`  article pages: ${articleFiles.length}, hub pages: ${HUB_PAGES.length}, total urls: ${urls}`);
  console.log(`  base: ${SITE_BASE}`);
}
