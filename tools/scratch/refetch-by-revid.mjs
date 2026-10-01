// Rebuild cache/pages/*.json by re-fetching every mirrored page at the exact revision
// recorded in the built site footers (_revids.txt: slug \t title \t revid).
//   node tools/scratch/refetch-by-revid.mjs --probe      # network check only, writes nothing
//   node tools/scratch/refetch-by-revid.mjs              # fetch everything still missing
//   node tools/scratch/refetch-by-revid.mjs --limit 5    # fetch at most 5 pages
import fs from 'node:fs';
import path from 'node:path';
import { CACHE, ROOT, api, slug, sleep } from '../lib.mjs';

const argv = process.argv.slice(2);
const probe = argv.includes('--probe');
const argN = (n, d) => { const i = argv.indexOf(n); return i === -1 ? d : Number(argv[i + 1]); };
const limit = argN('--limit', Infinity);

const listPath = path.join(ROOT, '_revids.txt');
const rows = fs.readFileSync(listPath, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => {
  const [siteSlug, title, revid] = l.split('\t');
  return { siteSlug, title, revid: Number(revid) };
});

const PAGES_DIR = path.join(CACHE, 'pages');
const PROPS = 'text|wikitext|images|sections|displaytitle|revid|properties|indicators';

async function fetchByOldid(title, oldid) {
  const d = await api({
    action: 'parse', oldid, prop: PROPS, redirects: '1',
    disabletoc: '1', disableeditsection: '1',
    format: 'json', formatversion: '2',
  });
  if (d.error) throw new Error(d.error.code + ': ' + d.error.info);
  const p = d.parse;
  return {
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
}

if (probe) {
  const r = rows.find((x) => x.siteSlug === 'Military_industrial_organization') || rows[0];
  console.log('probing', r.title, 'oldid', r.revid);
  const rec = await fetchByOldid(r.title, r.revid);
  console.log('returned title:', rec.title);
  console.log('returned revid:', rec.revid, '(expected', r.revid + ')', rec.revid === r.revid ? 'MATCH' : 'MISMATCH');
  console.log('html bytes:', rec.html.length, 'wikitext bytes:', rec.wikitext.length, 'images:', rec.images.length);
  console.log('target cache file:', slug(rec.title) + '.json');
  process.exit(0);
}

fs.mkdirSync(PAGES_DIR, { recursive: true });
let cached = 0, fetched = 0, mismatch = 0, failed = 0;
const t0 = Date.now();
for (const row of rows) {
  if (fetched >= limit) break;
  const target = path.join(PAGES_DIR, slug(row.title) + '.json');
  if (fs.existsSync(target) && fs.statSync(target).size > 1000) { cached++; continue; }
  try {
    const rec = await fetchByOldid(row.title, row.revid);
    if (rec.revid !== row.revid) { mismatch++; console.log('REVID MISMATCH', row.title, row.revid, '->', rec.revid); }
    fs.writeFileSync(target, JSON.stringify(rec));
    fetched++;
  } catch (e) {
    failed++;
    console.log('FAIL', row.title, row.revid, String(e && e.message || e));
  }
  if ((fetched + failed) % 25 === 0) {
    process.stderr.write(`\r  fetched=${fetched} failed=${failed} cached=${cached} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  await sleep(120);
}
console.log(`\ndone: fetched=${fetched} cached=${cached} failed=${failed} revidMismatch=${mismatch} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
