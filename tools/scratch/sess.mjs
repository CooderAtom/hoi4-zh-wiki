// Decompress a DSH subagent session transcript (.jsonl.zstd) and print the tail records.
//   node tools/scratch/sess.mjs <agentId> [tailCount]
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const home = process.env.DSH_HOME || 'C:\\Users\\Atom\\.dsh';
const root = path.join(home, 'sessions', '--C-Users-Atom-Documents-GeneralWS--');
const id = process.argv[2];
const tail = Number(process.argv[3] || 12);
console.log('node=' + process.version + ' zstd=' + (typeof zlib.zstdDecompressSync));
const dir = path.join(root, id);
if (!fs.existsSync(dir)) { console.log('no session dir: ' + dir); process.exit(0); }
const f = fs.readdirSync(dir).find((n) => n.endsWith('.jsonl.zstd'));
const raw = fs.readFileSync(path.join(dir, f));
const chunks = [];
// The transcript is a sequence of concatenated zstd frames; Node's stream stops after the first,
// so split on the zstd magic (28 B5 2F FD) and decode each frame independently.
const MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);
const starts = [];
for (let i = 0; i + 4 <= raw.length; i++) if (raw.compare(MAGIC, 0, 4, i, i + 4) === 0) starts.push(i);
starts.push(raw.length);
let frames = 0, failed = 0;
for (let i = 0; i + 1 < starts.length; i++) {
  const fr = raw.subarray(starts[i], starts[i + 1]);
  try { chunks.push(zlib.zstdDecompressSync(fr)); frames++; }
  catch (e) { failed++; if (failed <= 2) console.log('frame ' + i + ' error: ' + e.message); }
}
console.log('frames decoded=' + frames + ' failed=' + failed + ' magicAt=' + starts.length - 1);
let text = Buffer.concat(chunks).toString('utf8');
const lines = text.split('\n').filter(Boolean);
console.log('records=' + lines.length);
for (const l of lines.slice(-tail)) {
  let o;
  try { o = JSON.parse(l); } catch { console.log('RAW ' + l.slice(0, 400)); continue; }
  const s = JSON.stringify(o);
  console.log('--- type=' + (o.type || o.kind || '?') + ' role=' + (o.role || (o.message && o.message.role) || '') + ' len=' + s.length);
  console.log(s.length > 1800 ? s.slice(0, 1800) + ' …[truncated]' : s);
}
