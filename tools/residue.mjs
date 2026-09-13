// Structural-residue classifier.
//
// Why this exists: the translation memory is keyed by the English string and Store.set() REFUSES to
// store a value when zh === en (see translate.mjs). So any prose unit whose English is really a game
// key, a country tag, a speed value, an install path, a formula or a key-combo can never be stored and
// therefore can NEVER render as translated. Wikipedia-style percentages then show such a page as e.g.
// 99.2% forever, which looks like missing work but is not.
//
// isStructuralResidue(en) === true means: "this leftover is not human-translatable prose; do not chase it."
//
// Validated by exhaustive partition: summing (genuine + structural) over all 655 pages reproduces
// 08c's total leftover exactly (delta = 0 chars), so every leftover is classified as exactly one of the two.

const KEY_NAMES = new Set(['ctrl', 'shift', 'alt', 'tab', 'esc', 'escape', 'enter', 'return', 'space',
  'spacebar', 'home', 'end', 'del', 'delete', 'ins', 'insert', 'pgup', 'pgdn', 'pageup', 'pagedown',
  'up', 'down', 'left', 'right', 'lmb', 'rmb', 'mmb', 'numpad', 'backspace']);

export function isStructuralResidue(en) {
  if (typeof en !== 'string') return true;
  // Drop ⟦n⟧ placeholder markers; they carry no translatable content of their own.
  const t = en.replace(/\u27E6\d+\u27E7/g, ' ').trim();
  if (t === '') return true;                                            // only placeholders

  // Filesystem / install paths (Mods, Modding).
  if (/[\\/]/.test(t) && /(Documents|Paradox|\.txt|\.json|\.mod|~\/|:\/)/i.test(t)) return true;

  // Formulas (Trade and similar).
  if (/[\u03A3\u221A\u03C0]/.test(t) || /^[A-Za-z]*\(.*[T\u03A3=].*\)/.test(t)) return true;

  // Bare snake_case game key.
  if (/^[a-z][a-z0-9_]*$/.test(t)) return true;

  // Keyboard shortcut list: every '+'- or ','-separated part is a known key name.
  const parts = t.split(/\s*[+,]\s*/).filter(Boolean).map((p) => p.replace(/^[\^\u21E7\u21C6\u2325]/, '').toLowerCase());
  if (parts.length > 0 && parts.every((p) => KEY_NAMES.has(p) || /^f\d{1,2}$/.test(p))) return true;

  // Code / script block fragment.
  if (/[{}]/.test(t)) return true;

  // Bare console-command or script invocation. Deliberately narrow — only two unambiguous shapes,
  // because over-flagging here would understate the real remaining work:
  //   a) name(alias) / name (alias, other_alias)      -> the string is nothing but an invocation
  //   b) lowercase_command TAG [TAG2] [-200]          -> first token lowercase, rest ALL-CAPS
  // Anything carrying a ⟦n⟧ placeholder is rendered content and is never a bare command.
  // "MTTH blocks", "AI strategies", "the Nyim Supporters" and "⟦0⟧ owns 7 states." all fail both shapes.
  if (!/\u27E6\d+\u27E7/.test(en)) {
    if (/^[A-Za-z][A-Za-z0-9_.]* ?\([A-Za-z0-9_,. ]*\)$/.test(t)) return true;
    if (/^[a-z][a-z0-9_]*( [A-Z][A-Z0-9]{0,5})*( -?\d+)?$/.test(t) && / [A-Z]/.test(t)) return true;
  }

  // Pure number plus a short unit: "32.0 kn", "25%", "3.5 IC".
  if (/^[\d.,\s+\-%/]+[A-Za-z]{0,3}$/.test(t)) return true;

  // Country tags / DLC ids with only labels left over: strip them and see if real words remain.
  const rest = t.replace(/\b[A-Z]{2,5}\b/g, ' ')
    .replace(/\b[a-z]{2,6}\d{2,4}\b/g, ' ')
    .replace(/[\u2013\u2014\-:]/g, ' ');
  if (!/[A-Za-z]{3,}/.test(rest)) return true;

  // Single identifier-ish token containing _ or digits ("anti_air_4", "has_mastery_level").
  if (!/\s/.test(t) && /^[A-Za-z][A-Za-z0-9_.]*$/.test(t) && /[_0-9]/.test(t)) return true;

  return false;
}
