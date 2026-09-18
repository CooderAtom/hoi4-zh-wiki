// Targeted variants for the flex-cell column: keep-all gives the COLUMN a sane minimum width,
// overflow-wrap:anywhere lets the flex item's TEXT wrap inside it. Testing which combination
// actually stops the one-character-per-line stacking and the overlap.
import fs from 'node:fs';
import path from 'node:path';

const src = process.argv[2];
const html = fs.readFileSync(src, 'utf8');

const TBL = `.content table { display: block; overflow-x: auto; width: auto; min-width: 100%; max-width: none; }
  .content table table { display: table; width: 100%; }`;
const FLEX = `.content table td > div[style*="display:flex"], .content table td > div[style*="display: flex"] { min-width: 0; }
  .content table td > div[style*="display:flex"] > div, .content table td > div[style*="display: flex"] > div { min-width: 0; }`;

const VARIANTS = {
  y1_keepall_anywhere: `${TBL}
    .content table th, .content table td { word-break: keep-all; }
    ${FLEX}
    .content table td { overflow-wrap: anywhere; }`,
  y2_keepall_anywhere_flexonly: `${TBL}
    .content table th, .content table td { word-break: keep-all; }
    ${FLEX}
    .content table td > div[style*="display:flex"] div, .content table td > div[style*="display: flex"] div { overflow-wrap: anywhere; }`,
  y3_keepall_imgflex: `${TBL}
    .content table th, .content table td { word-break: keep-all; }
    .content table td > div[style*="display:flex"], .content table td > div[style*="display: flex"] { min-width: 0; flex-wrap: wrap; }
    .content table td > div[style*="display:flex"] > div, .content table td > div[style*="display: flex"] > div { min-width: 0; overflow-wrap: anywhere; }`,
};

for (const [name, css] of Object.entries(VARIANTS)) {
  const out = html.replace('</head>', `<style id="__vartest__">\n${css}\n</style>\n</head>`);
  fs.writeFileSync(path.join('site', `_yt_${name}.html`), out);
  console.log(`${name} -> site/_yt_${name}.html`);
}
