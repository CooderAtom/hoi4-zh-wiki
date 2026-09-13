// Shared helpers for the HOI4 wiki mirror pipeline.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA = path.join(ROOT, 'data');
export const CACHE = path.join(ROOT, 'cache');
export const SITE = path.join(ROOT, 'site');

export const API = 'https://hoi4.paradoxwikis.com/api.php';
export const WIKI = 'https://hoi4.paradoxwikis.com';
export const UA = 'hoi4-offline-zh-mirror/0.1 (personal offline study; contact: local)';

for (const d of [DATA, CACHE]) fs.mkdirSync(d, { recursive: true });

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** GET a URL with retries; returns text. */
export async function getText(url, { retries = 4, timeoutMs = 90000, headers = {} } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, ...headers }, signal: ac.signal });
      clearTimeout(t);
      if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url.slice(0, 160));
      return await r.text();
    } catch (e) {
      clearTimeout(t);
      lastErr = e;
      await sleep(500 * Math.pow(2, i));
    }
  }
  throw lastErr;
}

/** GET a URL; returns a Buffer (for images). */
export async function getBuf(url, opts = {}) {
  let lastErr;
  const { retries = 4, timeoutMs = 120000 } = opts;
  for (let i = 0; i <= retries; i++) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, ...(opts.headers || {}) }, signal: ac.signal });
      clearTimeout(t);
      if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url.slice(0, 160));
      return Buffer.from(await r.arrayBuffer());
    } catch (e) {
      clearTimeout(t);
      lastErr = e;
      await sleep(500 * Math.pow(2, i));
    }
  }
  throw lastErr;
}

/** MediaWiki API call (GET). */
export async function api(params, opts = {}) {
  const u = new URL(API);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    u.searchParams.set(k, String(v));
  }
  const txt = await getText(u.toString(), opts);
  return JSON.parse(txt);
}

/** MediaWiki API call with continuation, collecting one list. */
export async function apiList(params, listKey, { limit = 100000, verbose = false } = {}) {
  const out = [];
  let cont = {};
  for (;;) {
    const d = await api({ ...params, ...cont, format: 'json', formatversion: '2' });
    const arr = d?.query?.[listKey];
    if (Array.isArray(arr)) out.push(...arr);
    cont = d?.continue || {};
    if (!Object.keys(cont).length) break;
    if (out.length >= limit) break;
    if (verbose) process.stderr.write(`\r  fetched ${out.length}...`);
  }
  if (verbose) process.stderr.write('\n');
  return out;
}

export function readJson(p, dflt = null) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return dflt; }
}
export function writeJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 1));
}
export function slug(title) {
  return title.replace(/ /g, '_').replace(/[^\w!.\-()',]/g, (c) => '_' + c.charCodeAt(0).toString(16) + '_');
}

/** Simple bounded concurrency map. */
export async function pmap(items, worker, concurrency = 4) {
  const results = new Array(items.length);
  let idx = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    for (;;) {
      const i = idx++;
      if (i >= items.length) return;
      try { results[i] = await worker(items[i], i); }
      catch (e) { results[i] = { __error: String(e && e.message || e) }; }
    }
  });
  await Promise.all(runners);
  return results;
}
