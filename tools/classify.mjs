// Shared classifier: is an extracted text unit prose (should be translated) or a code
// identifier / path / script stub (must stay byte-identical to the game files)?
//
// Used by 08b-page-gap.mjs and 08c-real-coverage.mjs so the two reports cannot disagree.

const SYMBOLS = /^[A-Za-z0-9_@.<>|/*\-+=\s{}[\](),'"%:;#]+$/;

export function isCodeUnit(s) {
  const t = String(s ?? '').trim();
  if (!t) return true;
  // Sentence punctuation means it is prose, full stop.
  if (/[.!?](\s|$)/.test(t)) return false;
  if (!SYMBOLS.test(t)) return false;            // contains CJK, & or other prose characters
  if (/^\/?[\w./*<>-]+$/.test(t)) return true;   // file path or bare identifier
  if (/[\w.@<>|*+\-\s]+\s*=\s*[\w.\-+@{}[\]\s.]+/i.test(t)) return true; // "key = value"
  if (/\{\s*\.\.\.\s*\}/.test(t)) return true;   // "block = { ... }"
  if (/\{/.test(t)) return true;                 // brace-delimited script stub
  if (/^[\w@.<>|*\-+]+$/.test(t)) return true;   // single token
  if (/^[a-z_0-9]+( [a-z_0-9.@<>|*+\-]+)*$/.test(t)) return true; // lowercase identifier run
  return false;
}

export function isProseUnit(s) {
  return !isCodeUnit(s);
}

/**
 * Wiki-side template ERROR text, not content. When a page passes a focus/idea id the wiki's own
 * templates do not recognise, MediaWiki renders the diagnostic into the page body:
 *   (Unrecognized focus 'id' "council for scientific and industrial research" in 'tag' "ast" for Template:Focus)
 * On the Research page this accounted for 25 units. Translating them would be wrong (they are
 * diagnostics aimed at wiki editors, not players) and counting them as "English still remaining"
 * overstates how much prose is actually outstanding. The pattern is deliberately narrow: it must
 * name a Template: and contain the word Unrecognized, so genuine prose that happens to contain
 * parentheses is untouched.
 */
export function isTemplateArtifact(s) {
  const t = String(s ?? '').trim();
  if (!t) return true;
  if (/^\(?\s*(Unrecognized|Unknown|Invalid|Missing)\b[^)]*\bfor Template:/i.test(t)) return true;
  if (/\bfor Template:\w+\s*\)\s*$/.test(t) && /^\(/.test(t)) return true;
  return false;
}

/**
 * The single question every tool should ask: "is this string translatable prose?"
 * Combining the three tests here keeps the coverage report, the page-gap report and the
 * exporters from disagreeing about what still needs work.
 */
export function isTranslatableProse(s) {
  return !isCodeUnit(s) && !isMathArtifact(s) && !isTemplateArtifact(s) && !isPathLike(s);
}

/**
 * Raw math markup rather than a translation: LaTeX source, MathJax fallback output, or the
 * "Failed to parse" text the wiki emitted when its MathJax extension broke. These strings were
 * once captured into translation memory as if they were translatable prose; they must never be
 * merged back, and the rendered site already converts real formulas to readable inline text
 * (see prettyTex in tools/sanitize.mjs).
 */
export function isMathArtifact(s) {
  const t = String(s ?? '');
  if (!t) return true;
  if (/\\displaystyle|\\text\{|\\cdot|\\frac|\\sum|\\begin\{|\\end\{|\\left|\\right/.test(t)) return true;
  if (/Failed to parse|MathML|TeX|math error/i.test(t)) return true;
  // Bare symbol soup such as "F ∗ ( max ( 0 , T − ∑ regions P ⋅ A ) + 10 ⋅ ... )" carries no prose.
  if (/[∗⋅∑√≥≤≠]/.test(t) && !/[\u4e00-\u9fff]/.test(t)) return true;
  // MathJax fallback that lost its LaTeX commands but kept the algebra. The Research page emitted
  // strings such as ": (t)/(365) = T+(1)/(AOT) - (T + (1)/(AOT)) e^-(AOT · N)/(365)(1)/(1+B\%)",
  // which contain no letters-as-words and cannot be translated. Signal: several inline (a)/(b)
  // divisions, an exponent of e, or an escaped percent.
  if (/\\%/.test(t)) return true;
  if (/\)\s*\/\s*\(/.test(t) && (t.match(/\)\s*\/\s*\(/g) || []).length >= 2) return true;
  if (/e\^-?\(/.test(t)) return true;
  // Short algebra fragments that survived as separate units, e.g. ": t", ": N", ": t>365T".
  // They start with the stripped MathJax ":" marker and are made of single-letter variables.
  if (/^:\s*[A-Za-z][A-Za-z0-9><=+\-*/^().\s]*$/.test(t) && t.length <= 24) return true;
  return false;
}

// Paths, filenames and source-location markers. These are byte-identical game/on-disk references:
// translating them would break their meaning, and counting them as untranslated prose inflates the
// denominator. Examples seen in the corpus:
//   "/Hearts of Iron IV/common/buildings/00_buildings.txt"
//   "Hearts of Iron IV\common\modifiers\00_static_modifiers.txt"
//   "/Hearts of Iron IV/events/"          (a bare directory)
//   "forumpost:29341015"                  (a forum permalink used as a citation)
//   "file Hearts of Iron IV\map\strategicregions\228-South Indochina.txt"
//   "constant:sp_scientist_xp_gain.very_high"   (a game constant reference, not text)
const isPathLike = (s) => {
  const t = String(s).trim();
  if (/^(file\s+)?[/\\]?Hearts of Iron IV[/\\]/i.test(t)) return true;
  if (/^forumpost:\d+$/i.test(t)) return true;
  // "constant:name.value", "constant:name", "define:NCountry.X" -- engine-side lookups whose
  // spelling is part of the data model.
  if (/^(constant|define|variable|flag|event_target|modifier|idea|trait|focus|decision):[A-Za-z0-9_.]+$/i.test(t)) return true;
  if (/\.(txt|lua|json|dds|tga|png|jpg|gui|gfx|asset|shader|yml|csv)\s*$/i.test(t) && !/\s\w+\s\w+\s\w+/.test(t)) return true;
  return false;
};
