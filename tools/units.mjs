// Translation units for one sanitized article.
//
// A *block* (p, li, td, h2, figcaption, or an inline-only div) becomes one unit:
// its inline children (links, bold, icons-with-alt) are replaced by placeholders
//   "The ⟦0⟧ is the political representation ..."  with fragments ["<a …>Government</a>"]
// so the model sees whole sentences, and the linked wiki titles survive untouched.
// After translation the placeholders are substituted back and the HTML is re-parsed,
// so link text becomes its own (translatable) unit.
import { serialize, parse, text, matches } from './dom.mjs';
import { Store, key, normalize } from './translate.mjs';

export const PH_OPEN = '⟦', PH_CLOSE = '⟧';
const token = (i) => PH_OPEN + i + PH_CLOSE;
const TOKEN_RE = /⟦\s*(\d+)\s*⟧/g;

const BLOCK = new Set(['p', 'li', 'dt', 'dd', 'td', 'th', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'figcaption', 'caption', 'blockquote', 'summary']);
const INLINE_OK = new Set(['a', 'b', 'i', 'em', 'strong', 'span', 'small', 'sup', 'sub', 'abbr',
  'del', 'ins', 'u', 's', 'mark', 'big', 'tt', 'font', 'ruby', 'rt', 'time', 'q', 'cite', 'dfn',
  'kbd', 'samp', 'var', 'code', 'br', 'img']);
const STRUCT = new Set(['ul', 'ol', 'dl', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'figure',
  'form', 'details', 'nav', 'aside', 'header', 'footer', 'main', 'article', 'blockquote', 'pre',
  'div', 'section', 'center', 'p', 'li', 'td', 'th', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'figcaption']);

const hasLatin = (s) => /[A-Za-z\u00c0-\u024f]/.test(s);
const escapeHtml = (s) => String(s).replace(/[&<>\u00a0]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\u00a0': '&nbsp;' }[c]));
export const translatable = (s) => {
  const t = normalize(s);
  if (!t || !hasLatin(t)) return false;
  if (/^[\W\d_]+$/.test(t)) return false;
  if (/^[A-Za-z0-9_+\-./%×:()\[\]{}<>|&*#@$^~=`'"\s]{1,2}$/.test(t)) return false;
  return true;
};

/** element contains block-level descendants? */
export function hasBlockContent(e) {
  const walk = (n) => {
    for (const c of n.children) {
      if (c.type !== 1) continue;
      if (STRUCT.has(c.name)) return true;
      if (walk(c)) return true;
    }
    return false;
  };
  return walk(e);
}

/** pure decoration: icon images / links that wrap only an image */
const isIcon = (e) => {
  if (e.name === 'img') return true;
  if (e.name === 'a') {
    const kids = e.children.filter((c) => c.type === 1 || (c.type === 3 && c.data.trim()));
    return kids.length > 0 && kids.every((c) => c.type === 1 && c.name === 'img');
  }
  return false;
};

/**
 * An image carried directly by a block (a bare <img>, or an <a> that wraps only images).
 * These are not translatable and must not become placeholders (that would change the
 * translation-memory key of every block containing an icon), but they must also not be
 * thrown away: when a block is rebuilt from its translation the whole child list is
 * replaced, so such nodes are re-inserted afterwards at their original positions.
 */
const isCarriedImage = (e) => isIcon(e);

/** Direct-child carried images, with the positions they occupied. */
export function carriedImages(e) {
  const out = [];
  e.children.forEach((c, i) => {
    if (c.type === 1 && isCarriedImage(c)) out.push({ at: i, node: c });
  });
  return out;
}

/**
 * Images carried anywhere inside `e`, with the path of child indices that reaches each one.
 * Kept for reference: an inline rebuild needs this because a nested `<a><img></a>` flag would
 * otherwise be dropped, but the inline rebuild itself is not enabled (see the note in pass 2 of
 * applyTranslations), so this is currently unused by the build.
 */
export function carriedImagesDeep(e) {
  const out = [];
  const walk = (n, pathIdx) => {
    n.children.forEach((c, i) => {
      if (c.type !== 1) return;
      const p = pathIdx.concat(i);
      if (isCarriedImage(c)) out.push({ path: p, node: c });
      else walk(c, p);
    });
  };
  walk(e, []);
  return out;
}

/** Re-insert deeply carried images once the subtree has been rebuilt from a translation. */
export function restoreCarriedImagesDeep(host, carried) {
  for (const { path, node } of carried) {
    let target = host;
    let ok = true;
    for (let i = 0; i < path.length - 1; i++) {
      const next = target.children[path[i]];
      if (!next || next.type !== 1) { ok = false; break; }
      target = next;
    }
    if (!ok) { host.append(node); node.parent = host; continue; }
    const at = Math.min(path[path.length - 1], target.children.length);
    target.children.splice(at, 0, node);
    node.parent = target;
  }
}

/** Put carried images back into a freshly rebuilt child list, keeping their old order. */
export function restoreCarriedImages(host, carried) {
  for (const { at, node } of carried) {
    const idx = Math.max(0, Math.min(at, host.children.length));
    host.children.splice(idx, 0, node);
    node.parent = host;
  }
}

/** Replace inline children of `e` with placeholders; returns {src, fragments} */
function tokenize(e) {
  let src = '';
  const fragments = [];
  // Fallback for children that are not inline-able (nested block markup). It must recurse and
  // separate block-level descendants with spaces rather than flattening through textContent,
  // otherwise the text inside a nested block is never emitted as its own unit and the renderer
  // has no key to apply there. For simple blocks (text + inline children only) this produces
  // exactly the same string as before, so existing translation-memory keys are unaffected.
  const flatten = (n) => {
    let out = '';
    for (const c of n.children) {
      if (c.type === 3) { out += c.data; continue; }
      if (c.type !== 1) continue;
      if (c.name === 'br') { out += ' '; continue; }
      if (isIcon(c)) continue;                        // icons are decoration, not text
      if (STRUCT.has(c.name)) out += ' ' + flatten(c) + ' ';
      else out += flatten(c);
    }
    return out;
  };
  for (const c of e.children) {
    if (c.type === 3) { src += c.data; continue; }
    if (c.type !== 1) continue;
    if (c.name === 'br') { src += ' '; continue; }
    if (isIcon(c)) continue;                        // icons are decoration, not text
    if (INLINE_OK.has(c.name) && !hasBlockContent(c)) {
      // keep the element but let its inner text be translated separately
      src += token(fragments.length);
      fragments.push(serialize(c));
      continue;
    }
    src += ' ' + flatten(c) + ' ';
  }
  return { src, fragments };
}

/**
 * Tokenize an element that contains nested block markup ("mixed" content), used for elements that
 * carry their own prose AND nest other blocks -- e.g. `<li>text <a>x</a> <ul><li>y</li></ul></li>`
>`.
 *
 * Unlike tokenize(), every element child becomes a placeholder, including block-level ones, instead
 * of being flattened into the source text. That is what makes such a unit renderable: the renderer
 * rebuilds the element from its translation and substitutes the placeholder back with the ORIGINAL
 * serialized markup, so the nested <ul>/<table>/<a> survive untouched.
 *
 * tokenize() must keep flattening blocks, because its output is the translation-memory key of every
 * existing leaf block; changing it would invalidate the whole memory. This function produces
 * different strings, so mixed blocks get their own keys and nothing already translated is disturbed.
 */
function tokenizeMixed(e) {
  let src = '';
  const fragments = [];
  for (const c of e.children) {
    if (c.type === 3) { src += c.data; continue; }
    if (c.type !== 1) continue;
    if (c.name === 'br') { src += ' '; continue; }
    if (isIcon(c)) continue;                        // icons are decoration, not text
    src += token(fragments.length);
    fragments.push(serialize(c));
  }
  return { src, fragments };
}

/**
 * Collect units for a page body.
 * Returns [{ src, fragments, path, ctx }] where path identifies the element.
 */
export function collectUnits(body) {
  const units = [];
  const push = (src, fragments, ctx) => {
    const s = normalize(src);
    if (!translatable(s)) return;
    units.push({ src: s, fragments, ctx });
  };

  const walk = (node) => {
    for (const c of node.children) {
      if (c.type !== 1) continue;
      if (STRUCT.has(c.name)) {
        // A leaf container (no nested block markup) is a single text run, so it becomes one unit.
        // This deliberately covers more than BLOCK: `div` matters most, because image captions
        // (<div class="thumbcaption">) and the styled flavour-text divs used for equipment and
        // achievement descriptions live there, and `div` is structural but not a BLOCK -- so it
        // used to be descended into and never registered at all (measured: 41 uncovered Latin text
        // nodes / 5,262 chars on Armor_technology alone, while the page reported 100% coverage).
        // `pre` is excluded: its content is code and must stay byte-identical.
        // `dl` is excluded as well: dt/dd are BLOCK but deliberately not STRUCT members, so
        // hasBlockContent(dl) is false and treating it as a leaf would flatten a whole definition
        // list -- and the formula "where:" blocks inside it -- into one concatenated unit. It must
        // keep descending so each dt/dd registers on its own, exactly as before.
        if (c.name !== 'pre' && c.name !== 'dl' && !hasBlockContent(c)) {
          // Leaf-style container: the renderer rebuilds these wholesale from one unit.
          const { src, fragments } = tokenize(c);
          push(src, fragments, 'block:' + c.name);
          // also register the inline children as their own units (link labels etc.)
          walkInline(c);
        } else if (BLOCK.has(c.name)) {
          // Block containing nested block markup: `<li>own text <ul>...</ul></li>`, `<p>text
          // <div>...</div></p>` and friends. It used to be descended into with nothing registered
          // for the element itself, so its own bare text nodes were never emitted at all and stayed
          // English forever while the page reported 100% (measured on Faction: 198 uncovered Latin
          // text nodes / 7,938 chars; on Modding: 33 / 5,041).
          //
          // Register the element's own inline runs as one unit, with nested blocks left as
          // placeholders so the renderer can rebuild the element without flattening that markup.
          if (c.name !== 'pre') {
            const { src, fragments } = tokenizeMixed(c);
            push(src, fragments, 'mixed:' + c.name);
          }
          // ...and still descend, so the nested blocks own their own units.
          walk(c);
          walkInline(c);
        } else {
          // Non-BLOCK container with nested block markup (div is the common one).
          if (c.name !== 'pre') {
            const { src, fragments } = tokenizeMixed(c);
            push(src, fragments, 'mixed:' + c.name);
          }
          walk(c);
        }
        continue;
      }
      // top-level inline element
      const { src, fragments } = tokenize(c);
      push(src, fragments, 'inline:' + c.name);
    }
  };

  const walkInline = (e) => {
    for (const c of e.children) {
      if (c.type !== 1) continue;
      if (isIcon(c)) continue;
      if (INLINE_OK.has(c.name) && !hasBlockContent(c)) {
        if (c.name !== 'br' && !isIcon(c)) {
          const { src, fragments } = tokenize(c);
          push(src, fragments, 'inline:' + c.name);
        }
        walkInline(c);
      } else {
        // Nested block markup inside an inline context must still be descended, otherwise the
        // text inside it never becomes a unit at all (it needs its own text-node key).
        walk(c);
      }
    }
  };

  walk(body);
  const attrs = ['alt', 'title', 'placeholder'];
  for (const e of body.descendants()) {
    for (const a of attrs) {
      const v = e.attr(a);
      if (v && translatable(v)) units.push({ src: normalize(v), fragments: [], ctx: 'attr:' + a });
    }
  }
  return units;
}

/** unique units for a page (dedup by normalized source) */
export function uniqueUnits(units) {
  const seen = new Set();
  const out = [];
  for (const u of units) {
    const k = key(u.src);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(u);
  }
  return out;
}

/**
 * Apply the translation store to a body in place.
 *  pass 1: leaf blocks whose own source string is translated (inline placeholders restored)
 *  pass 2: remaining text nodes / link labels / attributes
 * Coverage is counted per rendered text node, weighted by characters.
 */
export function applyTranslations(body, store, stats = {}) {
  stats.blocks = 0; stats.texts = 0; stats.attrs = 0; stats.missed = 0;
  stats.nodes = 0; stats.charTotal = 0; stats.inlines = 0;

  // Denominator, measured BEFORE anything is translated. It has to be taken up front: once pass 0
  // or pass 2 replaces a node with Chinese the node no longer looks translatable, so counting
  // afterwards leaves only the leftovers in the denominator and reports a collapsed ratio
  // (measured: this dropped the reported average from 58.4% to 8.2% when the inline pass landed).
  const watched = [];
  const markDone = (n) => {
    for (const c of n.children || []) {
      if (c.type === 3) { c.__done = true; continue; }
      if (c.type === 1) markDone(c);
    }
  };
  for (const e of body.descendants()) {
    for (const c of e.children || []) {
      if (c.type === 3 && translatable(c.data)) {
        stats.nodes++; stats.charTotal += Math.max(1, normalize(c.data).length);
        watched.push(c);
      }
    }
    for (const a of ['alt', 'title', 'placeholder']) {
      const v = e.attr(a);
      if (v && translatable(v)) { stats.nodes++; stats.charTotal += Math.max(1, normalize(v).length); }
    }
  }

  // pass 0: inline elements that carry their own unit (an <i>/<small>/<span>/<dd> wrapping a whole
  // sentence, e.g. "<i>By selecting this <span>Design Company</span> they will permanently
  // affect ...</i>"). collectUnits() has always registered these, and they have always been
  // translated, but nothing ever applied them: pass 1 only rebuilds blocks/leaf divs and pass 2
  // only matches whole text nodes, so the sentence stayed English while the page reported 100%.
  // Measured before this fix: 434 units / 35,356 chars already translated and never rendered,
  // one of them present on 111 pages.
  //
  // This runs BEFORE the block pass on purpose. tokenize() reads the live tree, so translating
  // the innermost inline elements first means the enclosing block's fragments already hold the
  // translated markup when pass 1 re-inserts them, and no element is ever rebuilt after its
  // parent has been replaced (which is what previously made this unsafe: rebuilding an element
  // that pass 1 had just re-parsed from a translation fragment could drop its own tag).
  // The block's own source string is unaffected -- placeholders are positional -- so every
  // translation-memory key stays exactly the same.
  const INLINE_UNIT = (e) => INLINE_OK.has(e.name) && e.name !== 'br' && !isIcon(e) && !hasBlockContent(e);
  const applyInline = (node) => {
    for (const c of [...node.children]) {
      if (c.type !== 1) continue;
      applyInline(c);                                  // deepest first
      if (!INLINE_UNIT(c) || !c.children.length) continue;
      const carried = carriedImages(c);
      const { src, fragments } = tokenize(c);
      const tr = store.get(src);
      if (tr === undefined) continue;
      const html = fragments.length
        ? tr.replace(TOKEN_RE, (m, i) => fragments[Number(i)] ?? '')
        : escapeHtml(tr);
      const parsed = parse('<div id="__phi__">' + html + '</div>');
      const holder = parsed.descendants().find((x) => x.attr('id') === '__phi__');
      if (!holder) continue;
      markDone(c);
      c.children = [];
      for (const k of [...holder.children]) c.append(k);
      restoreCarriedImages(c, carried);
      stats.inlines++;
    }
  };
  applyInline(body);

  const applyNode = (node) => {
    for (const c of [...node.children]) {
      if (c.type !== 1) continue;
      // Only leaf blocks (text + inline children only) may be rebuilt wholesale. Rebuilding a
      // block that contains nested block markup would flatten that markup, because the translation
      // for such a unit was stored as plain linearised text: measured on Achievements.html this
      // cost 445 <ul>, 1898 <li>, 1458 <img> and 1440 <a> in a single page. Blocks that nest are
      // left to the text-node pass below, which translates their innermost text safely.
      const isLeafBlock = BLOCK.has(c.name) && !hasBlockContent(c);
      const isLeafDiv = c.name === 'div' && !hasBlockContent(c);
      // Mixed block: carries its own prose AND nests other blocks. Rebuilt with tokenizeMixed, whose
      // placeholders carry the nested markup, so nothing is flattened. Only fires when the memory
      // actually holds this element's own (mixed) key, so untouched pages are left exactly as they
      // are -- that guard is what made the old flattening attempt safe to redo properly.
      const isMixedBlock = (BLOCK.has(c.name) || c.name === 'div') && c.name !== 'pre' && hasBlockContent(c);
      if ((isLeafBlock || isLeafDiv || isMixedBlock) && c.children.length) {
        const carried = carriedImages(c);
        const { src, fragments } = isMixedBlock ? tokenizeMixed(c) : tokenize(c);
        const tr = store.get(src);
        if (tr !== undefined) {
          let html;
          if (fragments.length) {
            html = tr.replace(TOKEN_RE, (m, i) => fragments[Number(i)] ?? '');
          } else {
            // no inline markup in the source: translation is plain text
            html = escapeHtml(tr);
          }
          const parsed = parse('<div id="__ph__">' + html + '</div>');
          const holder = parsed.descendants().find((x) => x.attr('id') === '__ph__');
          if (holder) {
            markDone(c);
            c.children = [];
            for (const k of [...holder.children]) c.append(k);
            restoreCarriedImages(c, carried);
            stats.blocks++;
            // A mixed block's placeholders stand for whole nested blocks, re-inserted as their
            // ORIGINAL markup, so the rebuilt subtree still has to be walked or the nested blocks
            // would keep their English text. Leaf blocks need no re-walk: their placeholders are
            // inline elements only, already handled by pass 0 and pass 2.
            if (isMixedBlock) applyNode(c);
            continue;
          }
        }
      }
      applyNode(c);
    }
  };
  applyNode(body);

  // pass 2: plain text nodes and translatable attributes everywhere
  const walkText = (node) => {
    for (const c of [...node.children]) {
      if (c.type === 3) {
        if (translatable(c.data)) {
          const tr = store.get(c.data);
          if (tr !== undefined) { c.data = tr; c.__done = true; stats.texts++; }
          else {
            const pieces = splitSentences(c.data);
            if (pieces.length > 1) {
              let all = true;
              const mapped = pieces.map((p) => { const t = store.get(p); if (t === undefined) all = false; return t ?? p; });
              if (all) { c.data = mapped.join(' '); c.__done = true; stats.texts++; }
              else stats.missed++;
            } else stats.missed++;
          }
        }
        continue;
      }
      if (c.type !== 1) continue;
      for (const a of ['alt', 'title', 'placeholder']) {
        const v = c.attr(a);
        if (v && translatable(v)) {
          const tr = store.get(v);
          if (tr !== undefined) { c.setAttr(a, tr); stats.attrs++; }
          else stats.missed++;
        }
      }
      // NOTE: inline elements that carry their own unit are deliberately NOT rebuilt here.
      // collectUnits() registers them (and recurses into nested ones), so their translations sit in
      // memory unapplied — but the obvious fix is unsafe: pass 1 has already rebuilt the enclosing
      // block, so such an element is a freshly parsed fragment of a translation, and rebuilding it
      // discards its own tag. Measured on Afghanistan.html that cost 43 <a> country links (the flag
      // anchor survived while the anchor wrapping the country name was dropped) for a gain of 1,193
      // CJK chars. Applying them safely needs an apply-order change (translate children first, or
      // re-pair fragments with their originals) and a full-page verification pass; until then the
      // text stays English, which is preferable to a renderer that silently drops links.
      walkText(c);
    }
  };
  walkText(body);
  stats.done = watched.reduce((n, c) => n + (c.__done ? 1 : 0), 0) + stats.attrs;
  stats.ratio = stats.nodes ? stats.done / stats.nodes : 1;
  return stats;
}

export function splitSentences(s) {
  const t = normalize(s);
  if (!t) return [];
  if (t.length <= 240) return [t];
  const parts = t.split(/(?<=[.!?])\s+(?=[A-Z"“(\u00c0-\u024f])/);
  const out = [];
  let buf = '';
  for (const p of parts) {
    if (buf && (buf.length + p.length) > 240) { out.push(buf); buf = p; }
    else buf = buf ? buf + ' ' + p : p;
  }
  if (buf) out.push(buf);
  return out.filter((x) => x.trim());
}
