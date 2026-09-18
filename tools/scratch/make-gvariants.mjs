// The last idea: the inline `display:flex` wrapper is itself the problem. Flex items cannot
// shrink below their content, and the wrapper's min-content is image+text. Override the wrapper
// to normal block flow so the text wraps normally inside the cell.
import fs from 'node:fs';
import path from 'node:path';

const src = process.argv[2];
const html = fs.readFileSync(src, 'utf8');

const VARIANTS = {
  g1_blockflow: `
    .content table { display: block; overflow-x: auto; width: auto; min-width: 100%; max-width: none; }
    .content table table { display: table; width: 100%; }
    .content table th, .content table td { word-break: keep-all; }
    .content table td > div[style*="display:flex"], .content table td > div[style*="display: flex"] { display: block; }
    .content table td > div[style*="display:flex"] > div, .content table td > div[style*="display: flex"] > div { margin-left: 0 !important; }`,
  g2_blockflow_firstcell: `
    .content table { display: block; overflow-x: auto; width: auto; min-width: 100%; max-width: none; }
    .content table table { display: table; width: 100%; }
    .content table th, .content table td { word-break: keep-all; }
    .content table > tbody > tr > td:first-child > div[style*="display:flex"] { display: block; }
    .content table > tbody > tr > td:first-child > div[style*="display:flex"] > div { margin-left: 0 !important; }`,
};

for (const [name, css] of Object.entries(VARIANTS)) {
  const out = html.replace('</head>', `<style id="__vartest__">\n${css}\n</style>\n</head>`);
  fs.writeFileSync(path.join('site', `_gt_${name}.html`), out);
  console.log(`${name} -> site/_gt_${name}.html`);
}
