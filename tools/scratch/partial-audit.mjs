import fs from 'node:fs';

const rows = JSON.parse(fs.readFileSync('data/coverage-real.json', 'utf8'));

// "translated but not yet 100%" = anything strictly between 0 and 100.
const partial = rows
  .map(r => ({
    t: r.title,
    pct: r.pct,
    total: r.proseChars,
    translated: r.translatedChars,
    left: Math.round(r.proseChars - r.translatedChars),
  }))
  .filter(r => r.translated > 0 && r.pct < 0.995)
  .sort((a, b) => b.left - a.left);

const untouched = rows.filter(r => r.translated === 0);
const dynamic = rows.filter(r => r.pct < 0.995);

const sum = partial.reduce((a, r) => a + r.left, 0);
console.log('部分翻译页(0 < pct < 100%): ' + partial.length + ' 页, 合计剩余 ' + sum.toLocaleString() + ' 字符');
console.log('完全未译页(pct = 0):        ' + untouched.length + ' 页');
console.log('全部未译完页:                ' + dynamic.length + ' 页, 合计剩余 ' +
  Math.round(dynamic.reduce((a, r) => a + (r.proseChars - r.translatedChars), 0)).toLocaleString() + ' 字符');
console.log('');
console.log('已译字符总量: ' + Math.round(rows.reduce((a, r) => a + r.translatedChars, 0)).toLocaleString());
console.log('');

// Bucket the partial pages so the work is visible.
const buckets = [[10000, Infinity], [5000, 10000], [2000, 5000], [500, 2000], [1, 500]];
console.log('=== 部分翻译页按剩余字符分桶 ===');
for (const [lo, hi] of buckets) {
  const b = partial.filter(r => r.left >= lo && r.left < hi);
  const s = b.reduce((a, r) => a + r.left, 0);
  console.log('  剩余 ' + lo + '-' + (hi === Infinity ? '∞' : hi) + ': ' + b.length + ' 页, ' +
    s.toLocaleString() + ' 字符');
}
console.log('');
console.log('=== 剩余最多的 30 页 ===');
for (const r of partial.slice(0, 30)) {
  console.log('  ' + String(Math.round(r.pct * 100)).padStart(3) + '%  剩 ' +
    String(r.left).padStart(7) + '  ' + r.t);
}
console.log('');
console.log('=== 剩余最少的 25 页(收尾易完成) ===');
for (const r of partial.slice(-25)) {
  console.log('  ' + String(Math.round(r.pct * 100)).padStart(3) + '%  剩 ' +
    String(r.left).padStart(6) + '  ' + r.t);
}
