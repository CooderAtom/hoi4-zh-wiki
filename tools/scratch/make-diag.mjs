// Diagnostic page: load the real page in an iframe-free copy, then render the COMPUTED layout
// of the target table into the document body so a screenshot reveals the real numbers.
import fs from 'node:fs';
import path from 'node:path';

const [src, out] = process.argv.slice(2);
let html = fs.readFileSync(src, 'utf8');

const script = `
<script>
window.addEventListener('load', function () {
  var lines = [];
  var tables = document.querySelectorAll('.mw-parser-output table.wikitable');
  var target = null;
  for (var i = 0; i < tables.length; i++) {
    var rows = tables[i].querySelectorAll(':scope > tbody > tr');
    if (rows.length > 1) {
      var tds = rows[1].querySelectorAll(':scope > td');
      if (tds.length >= 4 && tds[0].querySelector('div[style*="flex"]')) { target = tables[i]; break; }
    }
  }
  if (!target) { lines.push('TARGET TABLE NOT FOUND'); }
  else {
    var tr = target.querySelectorAll(':scope > tbody > tr')[1];
    var cells = tr.querySelectorAll(':scope > td');
    lines.push('table offsetWidth=' + target.offsetWidth + ' clientWidth=' + target.clientWidth +
               ' scrollWidth=' + target.scrollWidth + ' display=' + getComputedStyle(target).display +
               ' tableLayout=' + getComputedStyle(target).tableLayout);
    lines.push('container .content width=' + document.querySelector('main.content').getBoundingClientRect().width);
    for (var c = 0; c < cells.length; c++) {
      var r = cells[c].getBoundingClientRect();
      lines.push('  td[' + c + '] w=' + Math.round(r.width) + ' left=' + Math.round(r.left) +
                 ' scrollW=' + cells[c].scrollWidth + ' wordBreak=' + getComputedStyle(cells[c]).wordBreak +
                 ' overflowWrap=' + getComputedStyle(cells[c]).overflowWrap);
    }
    var flex = cells[0].querySelector('div[style*="flex"]');
    if (flex) {
      var fr = flex.getBoundingClientRect();
      lines.push('  FLEX w=' + Math.round(fr.width) + ' scrollW=' + flex.scrollWidth +
                 ' minWidth=' + getComputedStyle(flex).minWidth + ' display=' + getComputedStyle(flex).display);
      var inner = flex.children[1];
      if (inner) {
        var ir = inner.getBoundingClientRect();
        lines.push('  FLEX-CHILD w=' + Math.round(ir.width) + ' scrollW=' + inner.scrollWidth +
                   ' minWidth=' + getComputedStyle(inner).minWidth + ' maxWidth=' + getComputedStyle(inner).maxWidth +
                   ' overflowWrap=' + getComputedStyle(inner).overflowWrap + ' wordBreak=' + getComputedStyle(inner).wordBreak);
      }
    }
  }
  var pre = document.createElement('pre');
  pre.id = 'DIAGOUT';
  pre.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#fff;color:#000;font:13px monospace;padding:10px;border:2px solid red;white-space:pre-wrap;max-width:1300px';
  pre.textContent = lines.join('\\n');
  document.body.appendChild(pre);
});
</script>`;

html = html.replace('</body>', script + '</body>');
const p = path.join('site', out);
fs.writeFileSync(p, html);
console.log('wrote', p);
