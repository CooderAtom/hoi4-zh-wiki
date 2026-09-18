// Deterministic table layout variants: make the table fit its container exactly by using
// table-layout:fixed with explicit column widths, instead of letting the auto algorithm fight
// a flex cell whose minimum width it cannot compute.
import fs from 'node:fs';
import path from 'node:path';

const src = process.argv[2];
const html = fs.readFileSync(src, 'utf8');

const COMMON_FLEX = `
  .content table td > div[style*="display:flex"], .content table td > div[style*="display: flex"] { min-width: 0; }
  .content table td > div[style*="display:flex"] > div, .content table td > div[style*="display: flex"] > div { min-width: 0; }`;

const VARIANTS = {
  // A: fixed layout, explicit widths, normal CJK breaking everywhere
  x1_fixed: `
    .content table { display: block; overflow-x: auto; width: 100%; max-width: 100%; table-layout: fixed; }
    .content table table { display: table; width: 100%; table-layout: auto; }
    .content table th, .content table td { word-break: normal; overflow-wrap: break-word; }
    .content table > tbody > tr > th:first-child, .content table > tbody > tr > td:first-child { width: 26%; }
    ${COMMON_FLEX}`,
  // B: fixed layout but only the "科技" table family (5 cols), others untouched
  x2_fixed_5col: `
    .content table { display: block; overflow-x: auto; width: 100%; max-width: 100%; }
    .content table table { display: table; width: 100%; table-layout: auto; }
    .content table th, .content table td { word-break: normal; overflow-wrap: break-word; }
    .content table > tbody > tr > th:nth-child(2),
    .content table > tbody > tr > td:nth-child(2),
    .content table > tbody > tr > th:nth-child(3),
    .content table > tbody > tr > td:nth-child(3) { white-space: nowrap; }
    ${COMMON_FLEX}`,
  // C: keep auto layout, but stop keep-all and give the flex text a sane width
  x3_flexwidth: `
    .content table { display: block; overflow-x: auto; width: auto; min-width: 100%; max-width: none; }
    .content table table { display: table; width: 100%; }
    .content table th, .content table td { word-break: normal; overflow-wrap: break-word; }
    .content table td > div[style*="display:flex"], .content table td > div[style*="display: flex"] { min-width: 0; }
    .content table td > div[style*="display:flex"] > div, .content table td > div[style*="display: flex"] > div { min-width: 0; max-width: 20em; }`,
};

for (const [name, css] of Object.entries(VARIANTS)) {
  const out = html.replace('</head>', `<style id="__vartest__">\n${css}\n</style>\n</head>`);
  const p = path.join('site', `_xt_${name}.html`);
  fs.writeFileSync(p, out);
  console.log(`${name.padEnd(16)} -> ${p}`);
}
