// Can the two truly-absent images be recovered from the origin wiki?
import { getBuf } from '../lib.mjs';
import fs from 'node:fs';
import path from 'node:path';

const candidates = [
  ['States_map_nogui.png', '/thumb.php?f=States_map_nogui.png&width=300'],
  ['Diplomacy_map_nogui.png', '/thumb.php?f=Diplomacy_map_nogui.png&width=300'],
  ['States_map_nogui.png', '/images/4/4c/States_map_nogui.png'],
  ['Diplomacy_map_nogui.png', '/images/4/4c/Diplomacy_map_nogui.png'],
];
for (const [name, url] of candidates) {
  try {
    const buf = await getBuf('https://hoi4.paradoxwikis.com' + url);
    console.log(`OK    ${name.padEnd(26)} ${url}  ${buf.length} bytes  magic=${buf.slice(0, 4).toString('hex')}`);
  } catch (e) {
    console.log(`FAIL  ${name.padEnd(26)} ${url}  ${String(e.message).slice(0, 90)}`);
  }
}
