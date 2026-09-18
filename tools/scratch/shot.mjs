// Screenshot a page scrolled to a given anchor, using Chrome headless.
// usage: node tools/scratch/shot.mjs <url> <out.png> [windowW] [windowH] [anchor]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const [url, out, w = '1366', h = '1400', anchor] = process.argv.slice(2);
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const target = anchor ? `${url}#${anchor}` : url;
const args = ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=${w},${h}`,
  `--screenshot=${out}`, '--virtual-time-budget=3000', target];
execFileSync(chrome, args, { stdio: 'inherit' });
console.log('wrote', out, fs.existsSync(out) ? fs.statSync(out).size + ' bytes' : '(MISSING)');
