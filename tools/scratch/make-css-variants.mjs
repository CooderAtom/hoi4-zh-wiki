// Build CSS test variants of a page so each candidate table-layout rule can be screenshotted
// and compared. Each variant is the real page with an extra <style> overriding the table rules.
import fs from 'node:fs';
import path from 'node:path';

const src = process.argv[2];
const html = fs.readFileSync(src, 'utf8');

const VARIANTS = {
  v1_current: '',   // as-is on disk
  v2_autowidth: `.content table { width: auto; min-width: 100%; max-width: none; }
                  .content table th, .content table td { word-break: keep-all; }`,
  v3_mediarule: `.content table { width: auto; max-width: none; }
                  .content table th, .content table td { word-break: keep-all; }
                  .content table > tbody > tr > td:first-child { min-width: 22em; }`,
  v4_table100: `.content table { width: 100%; max-width: none; table-layout: auto; }
                  .content table th, .content table td { word-break: keep-all; }
                  .content table > tbody > tr > td:first-child { min-width: 20em; }`,
  v5_nowrap_name: `.content table { width: auto; max-width: none; }
                  .content table th, .content table td { word-break: keep-all; }
                  .content table > tbody > tr > td:first-child > div { min-width: 20em; }`,
};

// Variants must live in site/ so relative assets/ and images/ paths resolve exactly as on the
// real page. They are written with a _vartest_ prefix and deleted after the comparison.
const outDir = 'site';
for (const [name, css] of Object.entries(VARIANTS)) {
  const out = html.replace('</head>', `<style id="__vartest__">\n${css}\n</style>\n</head>`);
  const p = path.join(outDir, `_vartest_${name}.html`);
  fs.writeFileSync(p, out);
  console.log(`${name.padEnd(16)} -> ${p}  (${css.trim() ? 'override' : 'unchanged'})`);
}
