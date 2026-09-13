// Translation memory: JSON object on disk, key(hash of source text) -> { en, zh }.
// Deliberately simple: one file, atomic write, no sharding. ~100k entries ≈ 15 MB,
// which loads in well under a second and removes a whole class of sharding bugs.
import fs from 'node:fs';
import path from 'node:path';
import { DATA } from './lib.mjs';

export const TM_PATH = path.join(DATA, 'tm.json');
export const TR_DIR = path.join(DATA, 'translations');   // legacy shards (migration source)

export function hash32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}
export const normalize = (s) => String(s).replace(/\s+/g, ' ').trim();
export const key = (s) => hash32(normalize(s));

export class Store {
  constructor() {
    this.data = Object.create(null);   // key -> { en, zh }
    this.dirty = new Set();            // keys changed since load
    this.load();
  }

  load() {
    if (fs.existsSync(TM_PATH)) {
      try {
        const raw = JSON.parse(fs.readFileSync(TM_PATH, 'utf8'));
        for (const [k, v] of Object.entries(raw)) {
          if (typeof v === 'string') this.data[k] = { en: '', zh: v };
          else if (v && typeof v.zh === 'string') this.data[k] = { en: v.en || '', zh: v.zh };
        }
      } catch (e) {
        console.error('[tm] failed to read', TM_PATH, e.message);
      }
    }
    // legacy shard directory: read once, then stop using it
    if (!Object.keys(this.data).length && fs.existsSync(TR_DIR)) {
      let migrated = 0;
      for (const f of fs.readdirSync(TR_DIR)) {
        if (!f.endsWith('.json')) continue;
        let d;
        try { d = JSON.parse(fs.readFileSync(path.join(TR_DIR, f), 'utf8')); } catch { continue; }
        for (const [k, v] of Object.entries(d || {})) {
          if (/^\d+\.json$/.test(k) || /\.json$/.test(k)) continue;
          const zh = typeof v === 'string' ? v : v?.zh;
          if (typeof zh === 'string') { this.data[k] = { en: v?.en || '', zh }; migrated++; }
        }
      }
      if (migrated) console.error('[tm] migrated', migrated, 'entries from legacy shards');
    }
  }

  get(en) { const e = this.data[key(en)]; return e ? e.zh : undefined; }
  has(en) { return this.data[key(en)] !== undefined; }

  set(en, zh) {
    if (typeof zh !== 'string' || !zh.trim() || zh === en) return false;
    const k = key(en);
    const cur = this.data[k];
    if (cur && cur.zh === zh) return false;
    this.data[k] = { en, zh };
    this.dirty.add(k);
    return true;
  }

  /** atomic write of the whole memory */
  flush() {
    if (!this.dirty.size && fs.existsSync(TM_PATH)) return 0;
    const tmp = TM_PATH + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.data));
    fs.renameSync(tmp, TM_PATH);
    const n = this.dirty.size;
    this.dirty.clear();
    return n;
  }

  get size() { return Object.keys(this.data).length; }
  entries() { return Object.entries(this.data).map(([k, v]) => [k, v.en, v.zh]); }
}
