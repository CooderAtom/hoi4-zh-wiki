// Probe outbound network reachability for the wiki host.
const URLS = [
  'https://hoi4.paradoxwikis.com/api.php?action=query&format=json&titles=Naval%20technology',
  'https://hoi4.paradoxwikis.com/Naval_technology',
  'https://example.com/',
];
for (const u of URLS) {
  const t0 = Date.now();
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 20000);
    const r = await fetch(u, { headers: { 'User-Agent': 'hoi4-offline-zh-mirror/0.1' }, signal: ac.signal });
    clearTimeout(timer);
    const body = await r.text();
    console.log(`\n=== ${u}\n  status=${r.status} ct=${r.headers.get('content-type')} bytes=${body.length} ms=${Date.now() - t0}`);
    console.log('  head:', JSON.stringify(body.slice(0, 200)));
  } catch (e) {
    console.log(`\n=== ${u}\n  FAILED after ${Date.now() - t0}ms: ${e.name}: ${e.message}`);
  }
}
