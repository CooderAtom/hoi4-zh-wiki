import { isTranslatableProse } from '../classify.mjs';

const cases = [
  [`(Unrecognized focus 'id' "council for scientific and industrial research" in 'tag' "ast" for Template:Focus)`, false],
  ['When a country is part of a research group, it gets a research speed bonus.', true],
  [`Countries with 2 slots that don't exist in 1936:`, true],
  ['NDefines.NCountry.POLITICAL_POWER_LOWER_CAP = -500', false],
  ['\\frac\\ln(AOT T+1)', false],
  ['Has completed focus Local Fighter Production', true],
  ['[a]', false],
  ['Id.', false],
];
let ok = true;
for (const [s, want] of cases) {
  const got = isTranslatableProse(s);
  if (got !== want) { ok = false; console.log(`FAIL want=${want} got=${got} :: ${s.slice(0, 60)}`); }
}
console.log(ok ? 'classifier cases PASS' : 'FAILURES above');
