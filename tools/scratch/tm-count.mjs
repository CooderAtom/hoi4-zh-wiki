import fs from 'node:fs';
const j = JSON.parse(fs.readFileSync('data/tm.json', 'utf8'));
console.log('isObject=' + (!Array.isArray(j)));
console.log('entries=' + Object.keys(j).length.toLocaleString('en-US'));
