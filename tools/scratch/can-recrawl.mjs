// Can we re-crawl the wiki? The pipeline's network layer (lib.mjs getText) uses fetch with a
// custom User-Agent. Probe whether that path works from a written script file.
import { getText, API } from '../lib.mjs';

const url = `${API}?action=query&format=json&formatversion=2&titles=${encodeURIComponent('Naval technology')}&prop=revisions&rvprop=ids`;
try {
  const t = await getText(url, { retries: 1, timeoutMs: 25000 });
  console.log('OK bytes=' + t.length);
  console.log(t.slice(0, 300));
} catch (e) {
  console.log('FAILED: ' + e.message);
}
