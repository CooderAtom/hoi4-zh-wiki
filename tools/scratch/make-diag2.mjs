// Measure each cell's box and its content's natural width, and list the widest unbreakable run
// inside the first cell, so we can see WHY the column cannot be satisfied.
import fs from 'node:fs';
import path from 'node:path';

const src = process.argv[2];
const out = process.argv[3];
let html = fs.readFileSync(src, 'utf8');

const script = `
<script>
window.addEventListener('load', function () {
  var L = [];
  var tables = document.querySelectorAll('.mw-parser-output table.wikitable');
  var target = null, tries = [];
  for (var i = 0; i < tables.length; i++) {
    var rows = tables[i].children[0] ? tables[i].children[0].children : [];
    for (var r = 1; r < rows.length; r++) {
      var tds = rows[r].children;
      if (tds.length === 5) { target = tables[i]; tries.push(i); break; }
    }
    if (target) break;
  }
  if (!target) { L.push('no 5-column table found; tables=' + tables.length); }
  else {
    var rows = target.children[0].children;
    var first = rows[1];
    L.push('table w=' + target.offsetWidth + ' scrollW=' + target.scrollWidth +
           ' tableLayout=' + getComputedStyle(target).tableLayout);
    for (var c = 0; c < first.children.length; c++) {
      var td = first.children[c];
      var r2 = td.getBoundingClientRect();
      L.push('td[' + c + '] w=' + Math.round(r2.width) + ' right=' + Math.round(r2.right) +
             ' scrollW=' + td.scrollWidth + ' overflow=' + (td.scrollWidth - Math.round(r2.width)));
    }
    // widest unbreakable text run inside td[0]
    var t0 = first.children[0];
    var walker = document.createTreeWalker(t0, NodeFilter.SHOW_TEXT, null);
    var runs = [], n;
    while ((n = walker.nextNode())) {
      var s = n.nodeValue.replace(/\\s+/g, ' ').trim();
      if (!s) continue;
      // measure with a canvas using the node's computed font
      var el = n.parentElement, cs = getComputedStyle(el);
      var cv = document.createElement('canvas').getContext('2d');
      cv.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      runs.push({ t: s.slice(0, 30), w: Math.round(cv.measureText(s).width), font: cs.fontSize });
    }
    L.push('text runs in td[0]:');
    for (var k = 0; k < runs.length; k++) L.push('   w=' + runs[k].w + '  ' + runs[k].font + '  "' + runs[k].t + '"');
  }
  var pre = document.createElement('pre');
  pre.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#fff;color:#000;font:12px monospace;padding:8px;border:2px solid red;white-space:pre-wrap;max-width:1350px';
  pre.textContent = L.join('\\n');
  document.body.appendChild(pre);
});
</script>`;
html = html.replace('</body>', script + '</body>');
fs.writeFileSync(path.join('site', out), html);
console.log('wrote site/' + out);
