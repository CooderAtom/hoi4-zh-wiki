// Test the two candidate fixes for the first-column overflow, and report the computed layout,
// so the choice is made on numbers rather than appearance.
import fs from 'node:fs';
import path from 'node:path';

const src = process.argv[2];
const html = fs.readFileSync(src, 'utf8');

const COMMON = `.content table { display: block; overflow-x: auto; width: auto; max-width: none; }
  .content table table { display: table; width: 100%; }`;

const VARIANTS = {
  z1_nowrap_values: `${COMMON}
    .content table { min-width: fit-content; }
    .content table th, .content table td { word-break: keep-all; }
    .content table > tbody > tr > td:nth-child(2),
    .content table > tbody > tr > td:nth-child(3),
    .content table > tbody > tr > th:nth-child(2),
    .content table > tbody > tr > th:nth-child(3) { white-space: nowrap; }
    .content table td > div[style*="display:flex"], .content table td > div[style*="display: flex"] { min-width: 0; }
    .content table td > div[style*="display:flex"] > div, .content table td > div[style*="display: flex"] > div { min-width: 0; }`,
  z2_fitcontent: `${COMMON}
    .content table { min-width: fit-content; }
    .content table th, .content table td { word-break: keep-all; }`,
  z3_flexwrap: `${COMMON}
    .content table { min-width: fit-content; }
    .content table th, .content table td { word-break: keep-all; }
    .content table td > div[style*="display:flex"], .content table td > div[style*="display: flex"] { min-width: 0; flex-wrap: wrap; }
    .content table td > div[style*="display:flex"] > div, .content table td > div[style*="display: flex"] > div { min-width: 0; flex: 1 1 12em; }`,
};

for (const [name, css] of Object.entries(VARIANTS)) {
  const out = html.replace('</head>', `<style id="__vartest__">\n${css}\n</style>\n</head>`);
  const p = path.join('site', `_zt_${name}.html`);
  fs.writeFileSync(p, out);
  console.log(`${name} -> ${p}`);
}
