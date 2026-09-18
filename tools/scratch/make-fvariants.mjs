// Final two candidate designs for the tech-module tables.
import fs from 'node:fs';
import path from 'node:path';

const src = process.argv[2];
const html = fs.readFileSync(src, 'utf8');

const VARIANTS = {
  // FIXED: table fills the container exactly; columns get deterministic widths.
  f1_fixed: `
    .content table { display: block; overflow-x: auto; width: 100%; max-width: 100%; table-layout: fixed; }
    .content table table { display: table; width: 100%; table-layout: auto; }
    .content table th, .content table td { word-break: normal; overflow-wrap: break-word; }
    .content table > tbody > tr > th:nth-child(1), .content table > tbody > tr > td:nth-child(1) { width: 34%; }
    .content table > tbody > tr > th:nth-child(2), .content table > tbody > tr > td:nth-child(2) { width: 7%; }
    .content table > tbody > tr > th:nth-child(3), .content table > tbody > tr > td:nth-child(3) { width: 10%; }
    .content table > tbody > tr > th:nth-child(4), .content table > tbody > tr > td:nth-child(4) { width: 15%; }`,
  // AUTO-SCROLL: keep natural sizing; force the browser to use at least the table's minimum
  // width and scroll the wrapper, so no column has to be starved.
  f2_autoscroll: `
    .content table { display: block; overflow-x: auto; width: auto; max-width: none; min-width: 0; }
    .content table table { display: table; width: 100%; }
    .content table th, .content table td { word-break: keep-all; }
    .content table td > div[style*="display:flex"], .content table td > div[style*="display: flex"] { min-width: 0; }
    .content table td > div[style*="display:flex"] > div, .content table td > div[style*="display: flex"] > div { min-width: 0; }
    /* let the browser honour the nested table's own 551px minimum instead of squeezing it */
    .content table { width: max-content; min-width: 100%; }`,
};

for (const [name, css] of Object.entries(VARIANTS)) {
  const out = html.replace('</head>', `<style id="__vartest__">\n${css}\n</style>\n</head>`);
  fs.writeFileSync(path.join('site', `_ft_${name}.html`), out);
  console.log(`${name} -> site/_ft_${name}.html`);
}
