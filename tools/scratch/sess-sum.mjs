// Summarize every subagent session transcript: rate-limit hits, retries, and final turn/end reason.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const home = process.env.DSH_HOME || 'C:\\Users\\Atom\\.dsh';
const root = path.join(home, 'sessions', '--C-Users-Atom-Documents-GeneralWS--');
const MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);
function decode(file) {
  const raw = fs.readFileSync(file);
  const starts = [];
  for (let i = 0; i + 4 <= raw.length; i++) if (raw.compare(MAGIC, 0, 4, i, i + 4) === 0) starts.push(i);
  starts.push(raw.length);
  const chunks = [];
  for (let i = 0; i + 1 < starts.length; i++) {
    try { chunks.push(zlib.zstdDecompressSync(raw.subarray(starts[i], starts[i + 1]))); } catch {}
  }
  return Buffer.concat(chunks).toString('utf8');
}
const rows = [];
for (const d of fs.readdirSync(root)) {
  const p = path.join(root, d);
  if (!fs.statSync(p).isDirectory()) continue;
  const f = fs.readdirSync(p).find((n) => n.endsWith('.jsonl.zstd'));
  if (!f) continue;
  let text;
  try { text = decode(path.join(p, f)); } catch { continue; }
  const lines = text.split('\n').filter(Boolean);
  let rate = 0, retries = 0, lastReason = '', turns = 0, provider = '';
  let origin = '';
  for (const l of lines) {
    let o; try { o = JSON.parse(l); } catch { continue; }
    if (o.type === 'session') origin = o.origin || '';
    const s = JSON.stringify(o);
    if (s.includes('RATE_LIMIT')) rate++;
    if (o.type === 'llm/retry') { retries++; if (!provider) provider = o.data?.provider || ''; }
    if (o.type === 'turn/end') { turns++; lastReason = JSON.stringify(o.data?.reason || {}).slice(0, 120); }
  }
  if (origin !== 'subagent') continue;
  rows.push({ id: d.slice(0, 8), turns, rate, retries, provider, lastReason });
}
rows.sort((a, b) => a.id.localeCompare(b.id));
console.log('subagent sessions=' + rows.length);
for (const r of rows) {
  const verdict = /RATE_LIMIT/.test(r.lastReason) ? 'FAILED(429)' : 'ok';
  console.log(`${r.id}  turns=${r.turns} rateLimitEvents=${r.rate} retries=${r.retries} prov=${r.provider} ${verdict}  ${r.lastReason.slice(0, 90)}`);
}
