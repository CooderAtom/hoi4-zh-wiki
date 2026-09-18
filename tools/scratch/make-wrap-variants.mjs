// CSS variants for the flex-cell overflow (the "text collides with the next column" bug).
import fs from 'node:fs';
import path from 'node:path';

const src = process.argv[2];
const html = fs.readFileSync(src, 'utf8');

const BASE = `.content table { width: auto; min-width: 100%; max-width: none; display: block; overflow-x: auto; }
.content table th, .content table td { word-break: keep-all; }`;

const VARIANTS = {
  w1_nowrap_cjk: BASE,                                   // current deployed rule (still overlaps)
  w2_flexmin0: BASE + `
    .content table td > div[style*="display:flex"], .content table td > div[style*="display: flex"] { min-width: 0; }
    .content table td > div[style*="display:flex"] > div, .content table td > div[style*="display: flex"] > div { min-width: 0; }
    .content table td > div[style*="display:flex"] div, .content table td > div[style*="display: flex"] div { overflow-wrap: anywhere; }`,
  w3_anywhere: BASE + `
    .content table td { overflow-wrap: anywhere; }
    .content table td > div[style*="display:flex"], .content table td > div[style*="display: flex"] { min-width: 0; }
    .content table td > div[style*="display:flex"] > div, .content table td > div[style*="display: flex"] > div { min-width: 0; }`,
  w4_noKeepAll: `.content table { width: auto; min-width: 100%; max-width: none; display: block; overflow-x: auto; }
    .content table td > div[style*="display:flex"], .content table td > div[style*="display: flex"] { min-width: 0; }
    .content table td > div[style*="display:flex"] > div, .content table td > div[style*="display: flex"] > div { min-width: 0; }`,
};

for (const [name, css] of Object.entries(VARIANTS)) {
  const out = html.replace('</head>', `<style id="__vartest__">\n${css}\n</style>\n</head>`);
  const p = path.join('site', `_wt_${name}.html`);
  fs.writeFileSync(p, out);
  console.log(`${name.padEnd(16)} -> ${p}`);
}
