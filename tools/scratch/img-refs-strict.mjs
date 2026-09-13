// Resolve every image reference strictly by full relative path, and report the exact literal strings
// that fail. Distinguishes "file genuinely absent" from "checker bug".
import fs from 'node:fs';
import path from 'node:path';
const SITE = 'site';
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/&#0?39;/g, "'").replace(/&#x27;/gi, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

const files = fs.readdirSync(SITE).filter((f) => f.endsWith('.html'));
let refs = 0;
const miss = new Map();
for (const f of files) {
  const s = fs.readFileSync(path.join(SITE, f), 'utf8');
  for (const m of s.matchAll(/<img[^>]*\ssrc="(images\/[^"]+)"/g)) {
    refs++;
    const rel = decode(m[1]);
    if (!fs.existsSync(path.join(SITE, rel))) miss.set(rel, (miss.get(rel) || 0) + 1);
  }
}
console.log(`total <img> refs: ${refs.toLocaleString()} across ${files.length} pages`);
console.log(`distinct failing relative paths: ${miss.size}`);
for (const [rel, n] of miss) console.log(`   MISSING ${rel}  x${n}`);

// Now explain each previously-reported basename.
const probes = ['Nuclear_Reactor.png', 'Rocket_engines.png', 'Time_is_on_Our_Side.jpg',
  'Diplomacy_map_nogui.png', 'States_map_nogui.png', 'MAS.png'];
console.log('\n--- probe: does the literal name appear in any built page, and does the file exist? ---');
for (const p of probes) {
  let pageHit = null;
  for (const f of files) {
    if (fs.readFileSync(path.join(SITE, f), 'utf8').includes(p)) { pageHit = f; break; }
  }
  const onDisk = fs.existsSync(path.join(SITE, 'images', p));
  console.log(`  ${p.padEnd(34)} inHTML=${pageHit ? 'yes(' + pageHit + ')' : 'NO '}  onDisk=${onDisk}`);
}
