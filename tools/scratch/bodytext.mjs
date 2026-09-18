// Print the first N characters of the article body of a built page, plain text.
import fs from 'node:fs';
import { parse } from '../dom.mjs';

const file = process.argv[2];
const n = Number(process.argv[3] || 600);
const html = fs.readFileSync(file, 'utf8');
const s = html.indexOf('mw-parser-output');
const root = parse(html.slice(html.lastIndexOf('<div', s)));
const body = root.descendants().find((x) => String(x.attr('class') || '').includes('mw-parser-output'));
const txt = body.textContent.replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
console.log(txt.slice(0, n));
