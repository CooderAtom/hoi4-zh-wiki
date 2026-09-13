// Install the two map images that the original downloader missed (it lacked the thumb.php form
// for these two). Fetches via /thumb.php, which still works, and writes them under site/images/.
import { getBuf } from '../lib.mjs';
import fs from 'node:fs';
import path from 'node:path';

const DEST = path.join('site', 'images');
const want = [
  ['States_map_nogui.png', '/thumb.php?f=States_map_nogui.png&width=300'],
  ['Diplomacy_map_nogui.png', '/thumb.php?f=Diplomacy_map_nogui.png&width=300'],
];
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
for (const [name, url] of want) {
  const buf = await getBuf('https://hoi4.paradoxwikis.com' + url);
  if (!buf.slice(0, 4).equals(PNG)) throw new Error(`${name}: not a PNG (magic ${buf.slice(0, 4).toString('hex')})`);
  if (buf.length < 1000) throw new Error(`${name}: suspiciously small (${buf.length} bytes)`);
  fs.writeFileSync(path.join(DEST, name), buf);
  console.log(`wrote ${name}  ${buf.length} bytes`);
}
