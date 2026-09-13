// SUPERSEDED -- kept only as a redirect. Use tools/99f-image-audit.mjs instead.
//
// This checker used fs.existsSync() to test each reference. On Windows and macOS the filesystem is
// CASE-INSENSITIVE, so a reference to "images/Nuclear_Reactor.png" was reported as fine even though
// the file on disk is "Nuclear_reactor.png" -- which is a BROKEN image on any case-sensitive host
// (Linux, GitHub Pages, most static servers). It therefore under-reported real breakage: it claimed
// 2 problems when there were 23 (21 case mismatches covering 67 <img> tags, plus 2 absent files).
//
// tools/99f-image-audit.mjs compares references against the real directory listing instead, so it
// catches case mismatches as well as missing files.
import { spawnSync } from 'node:child_process';
console.log('img-refs.mjs is superseded by 99f-image-audit.mjs (case-sensitive comparison).\n');
const r = spawnSync(process.execPath, ['tools/99f-image-audit.mjs'], { stdio: 'inherit' });
process.exitCode = r.status === null ? 1 : r.status;
