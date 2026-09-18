// Direct A/B/C on the width declaration only, everything else held constant.
import fs from 'node:fs';
import path from 'node:path';

const src = process.argv[2];
const html = fs.readFileSync(src, 'utf8');

const base = (extra) => `
    .content table { display: block; overflow-x: auto; ${extra} }
    .content table table { display: table; width: 100%; }
    .content table th, .content table td { word-break: keep-all; }`;

const VARIANTS = {
  q1_width100: base('width: 100%; max-width: 100%;'),
  q2_maxcontent: base('width: max-content; max-width: none; min-width: 100%;'),
  q3_oldrule: base('width: max-content; max-width: 100%;'),
  q4_width100_nokeep: `
    .content table { display: block; overflow-x: auto; width: 100%; max-width: 100%; }
    .content table table { display: table; width: 100%; }`,
};

for (const [name, css] of Object.entries(VARIANTS)) {
  const out = html.replace('</head>', `<style id="__vartest__">\n${css}\n</style>\n</head>`);
  fs.writeFileSync(path.join('site', `_qt_${name}.html`), out);
  console.log(`${name} -> site/_qt_${name}.html`);
}
