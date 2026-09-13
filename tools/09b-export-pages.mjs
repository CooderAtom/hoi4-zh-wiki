// Export several pages' pending blocks in one run.
//   node tools/09b-export-pages.mjs "Trade" "Warfare" "Occupation" ...
import { execFileSync } from 'node:child_process';
const pages = process.argv.slice(2);
if (!pages.length) { console.error('usage: node tools/09b-export-pages.mjs "<Page>" ...'); process.exit(1); }
for (const p of pages) {
  try {
    const out = execFileSync(process.execPath, ['tools/09-page-block.mjs', p, '--chunk', '400'], { encoding: 'utf8' });
    console.log(out.split('\n')[0]);
  } catch (e) { console.log('FAILED', p, e.message.split('\n')[0]); }
}
