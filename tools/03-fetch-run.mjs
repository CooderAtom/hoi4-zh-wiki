// Run 03-fetch-all in passes until every page is cached (handles transient network flakiness).
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DATA, readJson, sleep } from './lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(HERE, '03-fetch-all.mjs');

for (let pass = 1; pass <= 4; pass++) {
  console.log(`\n########## fetch pass ${pass} ##########`);
  const r = spawnSync(process.execPath, [script], { stdio: 'inherit' });
  const state = readJson(path.join(DATA, 'fetched.json'), { pages: {} });
  const failed = Object.entries(state.pages).filter(([, v]) => !v.ok);
  console.log(`pass ${pass}: ${Object.keys(state.pages).length} recorded, ${failed.length} failed (exit ${r.status})`);
  if (!failed.length) break;
  console.log('failures:', failed.slice(0, 10).map(([k, v]) => `${k} <- ${v.error}`).join('\n           '));
  await sleep(3000);
}
