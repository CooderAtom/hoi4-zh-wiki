import { Store } from '../translate.mjs';

const s = new Store();
s.load();
const en = [
  'Major patch. Released alongside Götterdämmerung',
  'Major patch. Released alongside Graveyard of Empires',
  'Major patch (aka "Husky"). Released alongside La Résistance',
  'Hotfix',
  'Major patch',
];
for (const e of en) console.log(JSON.stringify(e) + ' -> ' + JSON.stringify(s.get(e)));
