// Crop a region out of a PNG using Chrome itself (no image libs in this repo).
// Renders an HTML page that positions the image with a negative offset inside a clipping div,
// then screenshots exactly the requested rect.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [src, out, x, y, w, h] = process.argv.slice(2);
const abs = path.resolve(src).replace(/\\/g, '/');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;background:#fff}
  #clip{position:relative;width:${w}px;height:${h}px;overflow:hidden}
  #clip img{position:absolute;left:${-x}px;top:${-y}px}
</style></head><body><div id="clip"><img src="file:///${abs}"></div></body></html>`;
const tmp = path.join('cache', 'refsite', '_crop.html');
fs.writeFileSync(tmp, html);
execFileSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=${w},${h}`,
   `--screenshot=${path.resolve(out)}`, '--virtual-time-budget=2000', 'file:///' + path.resolve(tmp).replace(/\\/g, '/')],
  { stdio: 'inherit' });
console.log('cropped', src, `[${x},${y} ${w}x${h}]`, '->', out);
