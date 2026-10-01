// Retry the wiki with browser-like headers to see whether 427 is UA/WAF related.
const UA_BROWSER = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const targets = [
  { url: 'https://hoi4.paradoxwikis.com/api.php?action=query&meta=siteinfo&format=json', headers: { 'User-Agent': UA_BROWSER, Accept: 'application/json,*/*' } },
  { url: 'https://hoi4.paradoxwikis.com/api.php?action=query&meta=siteinfo&format=json', headers: { 'User-Agent': 'hoi4-offline-zh-mirror/0.1 (personal offline study; contact: local)' } },
  { url: 'https://hoi4.paradoxwikis.com/wiki/Military_industrial_organization', headers: { 'User-Agent': UA_BROWSER, Accept: 'text/html,*/*' } },
  { url: 'https://paradoxwikis.com/', headers: { 'User-Agent': UA_BROWSER } },
];
for (const t of targets) {
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 25000);
    const r = await fetch(t.url, { headers: t.headers, signal: ac.signal });
    clearTimeout(timer);
    const body = await r.text();
    console.log('===', t.url.slice(0, 100));
    console.log('   ua:', (t.headers['User-Agent'] || '').slice(0, 40), '| status', r.status, '| bytes', body.length);
    console.log('   head:', JSON.stringify(body.slice(0, 220).replace(/\s+/g, ' ')));
  } catch (e) {
    console.log('===', t.url.slice(0, 100), 'FAILED', String(e && e.message || e));
  }
}
