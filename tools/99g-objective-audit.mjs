// Round 50 objective audit: verify the published site meets every stated deliverable criterion,
// independently of the pipeline's own reports. Read-only.
import fs from 'node:fs';
import path from 'node:path';

const SITE = 'site';
const files = fs.readdirSync(SITE).filter((f) => f.endsWith('.html'));
const say = (s) => console.log(s);

say('=== A. OFF-SITE REFERENCES (should be only the CC BY-SA attribution link) ===');
const ext = new Map();
const ABS = /(?:href|src|action)="(https?:)?\/\/[^"]*"/g;
for (const f of files) {
  const s = fs.readFileSync(path.join(SITE, f), 'utf8');
  for (const m of s.matchAll(ABS)) ext.set(m[0], (ext.get(m[0]) || 0) + 1);
}
let tot = 0;
for (const [u, c] of ext) {
  tot += c;
  if (!u.includes('paradoxwikis.com')) say('  !! NON-PARADOX OFF-SITE: ' + u.slice(0, 120) + '  x' + c);
}
say('  absolute http(s) refs total=' + tot + '  distinct=' + ext.size);
for (const [u, c] of ext) say('  - x' + String(c).padStart(4) + '  ' + u.slice(0, 100));

say('');
say('=== B. EXTERNAL RESOURCE DEPENDENCIES (must be 0) ===');
let remoteCss = 0, remoteJs = 0, remoteImg = 0, importExt = 0, remoteFont = 0;
for (const f of files) {
  const s = fs.readFileSync(path.join(SITE, f), 'utf8');
  remoteCss += (s.match(/<link[^>]+href="https?:\/\//g) || []).length;
  remoteJs += (s.match(/<script[^>]+src="https?:\/\//g) || []).length;
  remoteImg += (s.match(/<img[^>]+src="https?:\/\//g) || []).length;
  importExt += (s.match(/@import\s+url\(\s*["']?https?:\/\//g) || []).length;
  remoteFont += (s.match(/@font-face[^}]*https?:\/\//g) || []).length;
}
say('  remote <link href=http>: ' + remoteCss);
say('  remote <script src=http>: ' + remoteJs);
say('  remote <img src=http>:    ' + remoteImg);
say('  external @import:         ' + importExt);
say('  remote @font-face:        ' + remoteFont);

say('');
say('=== C. NON-HOI4 ENTRY POINTS (should be absent) ===');
const banned = [
  'Special:RecentChanges', 'Special:Random', 'Special:Upload', 'Special:WhatLinksHere',
  'Paradox_Interactive', 'Paradox_Development_Studio', 'Forum:', 'Special:Search',
  'Special:Categories', 'Special:ListUsers', 'Special:NewPages', 'Help:', 'Manual_of_Style',
  'Central_America', 'Special:Watchlist', 'Special:Log', 'Special:Contributions',
];
let bannedHits = 0;
for (const f of files) {
  const s = fs.readFileSync(path.join(SITE, f), 'utf8');
  for (const b of banned) {
    const n = (s.match(new RegExp(b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    if (n) { bannedHits += n; say('  !! ' + f + ' contains "' + b + '" x' + n); }
  }
}
say('  total banned-pattern occurrences: ' + bannedHits);

say('');
say('=== D. SEARCH ASSETS PRESENT & SELF-CONTAINED ===');
for (const need of ['index.html', 'assets/app.js', 'assets/style.css']) {
  say('  ' + need + ': ' + (fs.existsSync(path.join(SITE, need)) ? 'OK' : 'MISSING'));
}
const idx = fs.readdirSync(SITE).find((f) => /search.*\.json|index.*\.json/.test(f));
if (idx) {
  const st = fs.statSync(path.join(SITE, idx));
  say('  search index ' + idx + ': ' + (st.size / 1048576).toFixed(2) + ' MB');
}

say('');
say('=== E. PAGE / IMAGE INVENTORY ===');
const imgs = fs.readdirSync(path.join(SITE, 'images'));
say('  html pages: ' + files.length + '   image files: ' + imgs.length);
let subdirs = 0;
for (const d of fs.readdirSync(path.join(SITE, 'images'), { withFileTypes: true })) if (d.isDirectory()) subdirs++;
say('  image subdirectories: ' + subdirs + ' (0 = flat)');
