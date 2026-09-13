// Step 2: fetch every selected page from the wiki API and cache it locally.
//   cache/pages/<slug>.json  = { title, html, wikitext, images, categories, redirects, ... }
// Output: data/fetched.json  (status per page, resumable)
import fs from 'node:fs';
import path from 'node:path';
import { DATA, CACHE, api, readJson, writeJson, slug, sleep, WIKI } from './lib.mjs';

const PAGES_DIR = path.join(CACHE, 'pages');
fs.mkdirSync(PAGES_DIR, { recursive: true });

const only = process.argv.slice(2);
const manifest = readJson(path.join(DATA, 'pages.json'));
const prev = readJson(path.join(DATA, 'fetched.json'), { pages: {} });
const state = { generated: new Date().toISOString(), pages: { ...prev.pages } };

let titles;
if (only.length) {
  titles = only;
} else {
  const skip = new Set(
    manifest.pages
      .filter((p) => /national focus tree/i.test(p.title) || /\/[Ss]criptoutput$/.test(p.title))
      .map((p) => p.title));
  titles = manifest.pages.map((p) => p.title).filter((t) => !skip.has(t));
}
console.log('fetching', titles.length, 'pages');

const PROPS = 'text|wikitext|images|sections|displaytitle|revid|properties|indicators';

async function fetchPage(title) {
  const d = await api({
    action: 'parse', page: title, prop: PROPS, redirects: '1',
    disabletoc: '1', disableeditsection: '1',
    format: 'json', formatversion: '2',
  });
  if (d.error) throw new Error(d.error.code + ': ' + d.error.info);
  const p = d.parse;
  const rec = {
    requested: title,
    title: p.title,
    pageid: p.pageid,
    revid: p.revid,
    displaytitle: p.displaytitle,
    html: p.text,
    wikitext: p.wikitext,
    images: p.images || [],
    categories: (p.categories || []).map((c) => c.category || c['*']),
    redirectedFrom: (p.redirects || []).map((r) => r.from),
    fetchedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(PAGES_DIR, slug(p.title) + '.json'), JSON.stringify(rec));
  return rec;
}

const t0 = Date.now();
let done = 0, fail = 0;
for (const t of titles) {
  const key = slug(t);
  const cached = state.pages[t];
  if (cached && cached.ok && fs.existsSync(path.join(PAGES_DIR, slug(cached.title) + '.json'))) { done++; continue; }
  try {
    const rec = await fetchPage(t);
    state.pages[t] = { ok: true, title: rec.title, bytes: rec.html.length, wikitextBytes: rec.wikitext.length, images: rec.images.length, redirectedFrom: rec.redirectedFrom };
    done++;
  } catch (e) {
    state.pages[t] = { ok: false, error: String(e.message || e) };
    fail++;
    console.error('\nFAIL', t, e.message);
  }
  if ((done + fail) % 25 === 0) {
    writeJson(path.join(DATA, 'fetched.json'), state);
    const el = (Date.now() - t0) / 1000;
    process.stderr.write(`\r  ${done + fail}/${titles.length} ok=${done} fail=${fail} ${el.toFixed(0)}s`);
  }
  await sleep(120);
}
writeJson(path.join(DATA, 'fetched.json'), state);
console.log(`\nfetched ok=${done} fail=${fail} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);

// summary of media referenced
const media = new Map();
for (const [t, s] of Object.entries(state.pages)) {
  if (!s.ok) continue;
  const rec = readJson(path.join(PAGES_DIR, slug(s.title) + '.json'));
  if (!rec) continue;
  for (const im of rec.images) media.set(im, (media.get(im) || 0) + 1);
}
console.log('distinct media files referenced:', media.size);
writeJson(path.join(DATA, 'media-refs.json'), [...media.entries()].sort((a, b) => b[1] - a[1]).map(([f, n]) => ({ file: f, refs: n })));
