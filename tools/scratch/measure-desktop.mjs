// Render a page inside a fixed-width iframe so the real desktop layout can be measured from a
// smaller headless window, and print the column widths as an overlay.
import fs from 'node:fs';
import path from 'node:path';

const [src, out, vw] = process.argv.slice(2);
const width = Number(vw || 1366);
const url = 'file:///' + path.resolve(src).replace(/\\/g, '/');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;background:#fff}
  iframe{width:${width}px;height:3000px;border:0;display:block}
  #out{position:fixed;left:0;top:0;z-index:99999;background:#fff;color:#000;font:11px monospace;
       padding:6px;border:2px solid red;white-space:pre-wrap;width:${width - 20}px}
</style></head><body>
<iframe id="f" src="${url}"></iframe>
<pre id="out">measuring…</pre>
<script>
document.getElementById('f').addEventListener('load', function () {
  var d = this.contentDocument, L = [];
  var t = d.querySelectorAll('.mw-parser-output table.wikitable');
  var target = null;
  for (var i = 0; i < t.length; i++) {
    var rows = t[i].children[0] ? t[i].children[0].children : [];
    for (var r = 1; r < rows.length; r++) {
      if (rows[r].children.length === 5) { target = t[i]; break; }
    }
    if (target) break;
  }
  L.push('viewport=' + this.contentWindow.innerWidth + '  docSW=' + d.documentElement.scrollWidth);
  if (!target) L.push('no 5-col table');
  else {
    var rows = target.children[0].children;
    L.push('table w=' + target.offsetWidth + ' clientW=' + target.clientWidth + ' scrollW=' + target.scrollWidth);
    for (var k = 1; k <= 2 && k < rows.length; k++) {
      var cells = rows[k].children, parts = [];
      for (var c = 0; c < cells.length; c++) {
        var r2 = cells[c].getBoundingClientRect();
        parts.push('td' + c + '=' + Math.round(r2.width) + (cells[c].scrollWidth > Math.round(r2.width) + 1 ? '(OVERFLOW ' + cells[c].scrollWidth + ')' : ''));
      }
      L.push('row' + k + ': ' + parts.join('  '));
    }
  }
  document.getElementById('out').textContent = L.join('\\n');
});
</script></body></html>`;

const p = path.join('cache', 'refsite', out);
fs.writeFileSync(p, html);
console.log('wrote', p);
