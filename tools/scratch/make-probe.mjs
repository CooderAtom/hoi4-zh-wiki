// Measure the rendered column widths of every table in a page, before/after a CSS change.
// Uses Edge/Chrome headless via CDP-free --dump-dom? No: we measure with the browser's own
// layout by injecting a probe script and reading the result through a temp HTML file.
import fs from 'node:fs';
import path from 'node:path';

const page = process.argv[2];                    // e.g. site/Naval_support_technology.html
const extraCss = process.argv[3] || '';          // CSS to inject before measuring
const html = fs.readFileSync(page, 'utf8');
const probe = `
<script>
window.addEventListener('load', function () {
  var out = [];
  var tables = document.querySelectorAll('.mw-parser-output table.wikitable');
  var n = 0;
  for (var i = 0; i < tables.length && n < 12; i++) {
    var t = tables[i];
    if (t.querySelector('table')) continue;      // outer tables only
    var first = t.querySelector('tr');
    if (!first) continue;
    var cells = first.children;
    var widths = [];
    for (var j = 0; j < cells.length; j++) widths.push(Math.round(cells[j].getBoundingClientRect().width));
    var r = t.getBoundingClientRect();
    out.push({ tableW: Math.round(r.width), scrollW: t.scrollWidth, cols: widths });
    n++;
  }
  document.title = 'PROBE:' + JSON.stringify(out);
});
</script>`;
const out = html.replace('</body>', (extraCss ? `<style>${extraCss}</style>` : '') + probe + '</body>');
const tmp = path.join('cache', 'refsite', '_probe.html');
fs.mkdirSync(path.dirname(tmp), { recursive: true });
fs.writeFileSync(tmp, out);
console.log('wrote ' + tmp);
