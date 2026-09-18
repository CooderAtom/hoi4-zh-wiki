// Print the first wikitable of a section, with <img> collapsed, to inspect cell structure.
import fs from 'node:fs';

const file = process.argv[2];
const heading = process.argv[3];
const html = fs.readFileSync(file, 'utf8');
const i = html.indexOf(`id="${heading}"`);
if (i < 0) { console.log('heading not found'); process.exit(1); }
const t = html.indexOf('<table class="wikitable"', i);
const end = html.indexOf('</table>', t);
let chunk = html.slice(t, end + 8);
chunk = chunk.replace(/<img[^>]*>/gi, '<img>');
chunk = chunk.replace(/\s+/g, ' ');
console.log(chunk.slice(0, Number(process.argv[4] || 1800)));
