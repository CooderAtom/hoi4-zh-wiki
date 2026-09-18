// The nested "效果" table carries inline width:551px (and 50% cells), which inflates the outer
// table's minimum width and starves the name column. Cap those inline widths so the browser can
// shrink columns sensibly, and give the name column a real minimum.
import fs from 'node:fs';
import path from 'node:path';

const src = process.argv[2];
const html = fs.readFileSync(src, 'utf8');

const COMMON = `.content table { display: block; overflow-x: auto; width: auto; min-width: 100%; max-width: none; }
  .content table table { display: table; width: 100%; }
  .content table th, .content table td { word-break: keep-all; }`;

const VARIANTS = {
  p1_cap_inline: `${COMMON}
    .content table th[style*="width"], .content table td[style*="width"] { width: auto !important; max-width: 100%; }
    .content table > tbody > tr > td:first-child { min-width: 15em; max-width: 26em; }
    .content table td > div[style*="display:flex"], .content table td > div[style*="display: flex"] { min-width: 0; }
    .content table td > div[style*="display:flex"] > div, .content table td > div[style*="display: flex"] > div { min-width: 0; }`,
  p2_cap_and_scroll: `${COMMON}
    .content table th[style*="width"], .content table td[style*="width"] { width: auto !important; }
    .content table > tbody > tr > td:first-child { min-width: 16em; }
    .content table { min-width: 1100px; }`,
  p3_firstwidth: `${COMMON}
    .content table > tbody > tr > td:first-child { width: 22em; min-width: 22em; }
    .content table td > div[style*="display:flex"], .content table td > div[style*="display: flex"] { flex-wrap: wrap; }
    .content table td > div[style*="display:flex"] > div, .content table td > div[style*="display: flex"] > div { min-width: 0; flex: 1 1 100%; }`,
};

for (const [name, css] of Object.entries(VARIANTS)) {
  const out = html.replace('</head>', `<style id="__vartest__">\n${css}\n</style>\n</head>`);
  fs.writeFileSync(path.join('site', `_pt_${name}.html`), out);
  console.log(`${name} -> site/_pt_${name}.html`);
}
