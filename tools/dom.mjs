// Minimal DOM: tokenizer + tree builder + serializer + query helpers.
// Written for MediaWiki-generated HTML (regular, XHTML-ish, void elements unclosed,
// implicit </p> and </li> omitted). Zero dependencies on purpose.

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr']);
const RAW = new Set(['script', 'style']);

// start tag -> set of currently-open tags it implicitly closes
const IMPLICIT = {
  li: new Set(['li']),
  dt: new Set(['dt', 'dd']),
  dd: new Set(['dt', 'dd']),
  tr: new Set(['tr', 'td', 'th']),
  td: new Set(['td', 'th']),
  th: new Set(['td', 'th']),
  thead: new Set(['tr', 'td', 'th']),
  tbody: new Set(['tr', 'td', 'th']),
  tfoot: new Set(['tr', 'td', 'th']),
  option: new Set(['option']),
  p: new Set(['p']),
  figcaption: new Set(['figcaption']),
};
// block-ish tags that close an open <p>
const CLOSES_P = new Set(['div', 'p', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'h1', 'h2', 'h3',
  'h4', 'h5', 'h6', 'section', 'article', 'header', 'footer', 'nav', 'aside', 'blockquote',
  'figure', 'figcaption', 'dl', 'dt', 'dd', 'hr', 'pre', 'form', 'details', 'summary', 'main']);

export const ELEMENT = 1, TEXT = 3, COMMENT = 8, DOCUMENT = 9;

export class Node {
  constructor(type, name = '') {
    this.type = type;
    this.name = name;          // lower-case tag name
    this.attrs = Object.create(null);
    this.children = [];
    this.parent = null;
    this.data = '';            // text / comment content
  }
  get tag() { return this.name; }
  get isElement() { return this.type === ELEMENT; }
  get isText() { return this.type === TEXT; }
  attr(n) { const v = this.attrs[n]; return v === undefined ? null : v; }
  setAttr(n, v) { this.attrs[n] = String(v); }
  removeAttr(n) { delete this.attrs[n]; }
  get classes() { return (this.attrs.class || '').split(/\s+/).filter(Boolean); }
  hasClass(c) { return this.classes.includes(c); }
  addClass(c) { const s = new Set(this.classes); s.add(c); this.attrs.class = [...s].join(' '); }
  removeClass(c) { this.attrs.class = this.classes.filter((x) => x !== c).join(' ') || undefined; if (!this.attrs.class) delete this.attrs.class; }
  append(child) { child.parent = this; this.children.push(child); return child; }
  prepend(child) { child.parent = this; this.children.unshift(child); return child; }
  remove() {
    if (this.parent) {
      const i = this.parent.children.indexOf(this);
      if (i >= 0) this.parent.children.splice(i, 1);
      this.parent = null;
    }
    return this;
  }
  replaceWith(node) {
    if (!this.parent) return this;
    const i = this.parent.children.indexOf(this);
    if (i >= 0) {
      const list = Array.isArray(node) ? node : [node];
      for (const n of list) n.parent = this.parent;
      this.parent.children.splice(i, 1, ...list);
    }
    return this;
  }
  insertBefore(node, ref) {
    if (!this.parent) return node;
    const i = this.parent.children.indexOf(ref);
    node.parent = this.parent;
    this.parent.children.splice(i < 0 ? this.parent.children.length : i, 0, node);
    return node;
  }
  insertAfter(node, ref) {
    if (!this.parent) return node;
    const i = this.parent.children.indexOf(ref);
    node.parent = this.parent;
    this.parent.children.splice(i < 0 ? this.parent.children.length : i + 1, 0, node);
    return node;
  }
  /** all descendant elements, document order */
  descendants() {
    const out = [];
    const walk = (n) => { for (const c of n.children) { if (c.type === ELEMENT) { out.push(c); walk(c); } } };
    walk(this);
    return out;
  }
  /** all descendant + self nodes (all types), document order */
  allNodes() {
    const out = [];
    const walk = (n) => { for (const c of n.children) { out.push(c); walk(c); } };
    walk(this);
    return out;
  }
  closest(pred) {
    let n = this;
    while (n) { if (n.type === ELEMENT && pred(n)) return n; n = n.parent; }
    return null;
  }
  get textContent() {
    let s = '';
    const walk = (n) => { for (const c of n.children) { if (c.type === TEXT) s += c.data; else if (c.type === ELEMENT) { if (c.name === 'br') s += ' '; walk(c); } } };
    walk(this);
    return s;
  }
}

export const doc = () => new Node(DOCUMENT, '#document');
export const el = (name, attrs = {}, children = []) => {
  const e = new Node(ELEMENT, name.toLowerCase());
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) e.attrs[k] = String(v);
  for (const c of [].concat(children)) e.append(typeof c === 'string' ? text(c) : c);
  return e;
};
export const text = (s) => { const t = new Node(TEXT); t.data = String(s); return t; };
export const comment = (s) => { const c = new Node(COMMENT); c.data = String(s); return c; };

/* ---------------- parser ---------------- */

const decodeEntities = (s) => s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (m, body) => {
  if (body[0] === '#') {
    const cp = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
    if (!Number.isFinite(cp) || cp < 0 || cp > 0x10ffff) return m;
    try { return String.fromCodePoint(cp); } catch { return m; }
  }
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', ndash: '–', mdash: '—', hellip: '…', times: '×', middot: '·', deg: '°', laquo: '«', raquo: '»', copy: '©', reg: '®', trade: '™', minus: '−', shy: '\u00ad', ensp: ' ', emsp: ' ' };
  return Object.prototype.hasOwnProperty.call(named, body) ? named[body] : m;
});

function parseAttrs(src) {
  const attrs = {};
  const re = /([^\s"'>/=]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = re.exec(src))) {
    const name = m[1].toLowerCase();
    const val = m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : m[5] !== undefined ? m[5] : '';
    attrs[name] = decodeEntities(val);
  }
  return attrs;
}

export function parse(html) {
  const root = doc();
  const stack = [root];              // stack[stack.length-1] is the insertion point
  const cur = () => stack[stack.length - 1];
  const openIdx = (name) => {        // index in stack of nearest open element with name
    for (let k = stack.length - 1; k >= 1; k--) if (stack[k].name === name) return k;
    return -1;
  };
  const closeImplicit = (set) => {
    for (;;) {
      const top = cur();
      if (top.type === ELEMENT && set.has(top.name)) stack.pop();
      else break;
    }
  };
  let i = 0;
  const n = html.length;
  let guard = 0;

  while (i < n) {
    if (++guard > n + 1000) { console.error('[dom] iteration guard hit, aborting parse'); break; }
    const lt = html.indexOf('<', i);
    if (lt < 0) { if (i < n) cur().append(text(decodeEntities(html.slice(i)))); break; }
    if (lt > i) cur().append(text(decodeEntities(html.slice(i, lt))));
    i = lt;

    if (html.startsWith('<!--', i)) {
      const end = html.indexOf('-->', i + 4);
      const stop = end < 0 ? n : end;
      // MediaWiki uses comments to strip whitespace; keep them out of the tree.
      i = end < 0 ? n : end + 3;
      continue;
    }
    if (html.startsWith('<!', i)) { // doctype or bogus
      const end = html.indexOf('>', i);
      i = end < 0 ? n : end + 1;
      continue;
    }
    if (html.startsWith('</', i)) {
      const end = html.indexOf('>', i);
      if (end < 0) break;
      const name = html.slice(i + 2, end).trim().toLowerCase().split(/\s/)[0];
      const k = openIdx(name);
      if (k >= 0) stack.length = k;    // pop the matched element (and anything inside it)
      i = end + 1;
      continue;
    }

    // start tag
    const m = /^<([a-zA-Z][a-zA-Z0-9:_-]*)/.exec(html.slice(i, i + 80));
    if (!m) { cur().append(text('<')); i++; continue; }
    const name = m[1].toLowerCase();
    // find end of tag, respecting quoted attribute values
    let j = i + m[0].length, q = null;
    while (j < n) {
      const ch = html[j];
      if (q) { if (ch === q) q = null; }
      else if (ch === '"' || ch === "'") q = ch;
      else if (ch === '>') break;
      j++;
    }
    if (j >= n) { cur().append(text(html.slice(i))); break; }
    const rawTag = html.slice(i, j + 1);
    const selfClose = /\/\s*>$/.test(rawTag);
    const attrSrc = html.slice(i + m[0].length, selfClose ? j - 1 : j);
    const e = new Node(ELEMENT, name);
    e.attrs = parseAttrs(attrSrc);

    // implicit closes (HTML auto-closing rules)
    if (CLOSES_P.has(name)) closeImplicit(new Set(['p']));
    if (name === 'p') closeImplicit(new Set(['p']));
    const imp = IMPLICIT[name];
    if (imp) closeImplicit(imp);

    cur().append(e);
    i = j + 1;

    if (VOID.has(name) || selfClose) continue;

    if (RAW.has(name)) {
      const closeRe = new RegExp('</' + name + '\\s*>', 'i');
      const rest = html.slice(i);
      const cm = closeRe.exec(rest);
      if (cm) {
        e.append(text(rest.slice(0, cm.index)));
        i += cm.index + cm[0].length;
      } else { e.append(text(rest)); i = n; }
      continue;
    }
    stack.push(e);
  }
  return root;
}

/* ---------------- serializer ---------------- */

const ESC_TEXT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '\u00a0': '&nbsp;' };
const ESC_ATTR = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\u00a0': '&nbsp;' };
const escText = (s) => s.replace(/[&<>\u00a0]/g, (c) => ESC_TEXT[c]);
const escAttr = (s) => s.replace(/[&<>\u00a0"]/g, (c) => ESC_ATTR[c]);

export function serialize(node, opts = {}) {
  const out = [];
  const emit = (nd, depth) => {
    if (nd.type === TEXT) {
      out.push(nd.data.length > 20000 ? escText(nd.data) : escText(nd.data));
      return;
    }
    if (nd.type === COMMENT) { if (opts.keepComments) out.push('<!--' + nd.data + '-->'); return; }
    if (nd.type === DOCUMENT) { for (const c of nd.children) emit(c, depth); return; }
    const parts = [];
    for (const [k, v] of Object.entries(nd.attrs)) {
      if (v === undefined || v === null) continue;
      if (v === '') { if (opts.xml) parts.push(' ' + k + '=""'); else parts.push(' ' + k); continue; }
      parts.push(' ' + k + '="' + escAttr(v) + '"');
    }
    const open = '<' + nd.name + parts.join('');
    if (VOID.has(nd.name)) { out.push(open + (opts.xml ? '/>' : '>')); return; }
    out.push(open + '>');
    for (const c of nd.children) emit(c, depth + 1);
    out.push('</' + nd.name + '>');
  };
  emit(node, 0);
  return out.join('');
}

/* ---------------- query helpers ---------------- */

export function queryAll(root, pred) { return root.descendants().filter(pred); }
export function find(root, pred) { return root.descendants().find(pred); }
export const byTag = (root, tag) => queryAll(root, (e) => e.name === tag);
export const byClass = (root, cls) => queryAll(root, (e) => e.hasClass(cls));
export const byId = (root, id) => find(root, (e) => e.attr('id') === id);
export const matches = (e, sel) => {
  // very small selector subset: tag, .class, #id, tag.class, [attr], [attr="v"]
  if (!e || e.type !== ELEMENT) return false;
  for (const part of sel.split(/(?=[.#\[])/)) {
    if (part[0] === '.') { if (!e.hasClass(part.slice(1))) return false; }
    else if (part[0] === '#') { if (e.attr('id') !== part.slice(1)) return false; }
    else if (part[0] === '[') {
      const m = /^\[([^\]=]+)(?:=["']?([^"'\]]*)["']?)?\]$/.exec(part);
      if (!m) return false;
      if (e.attr(m[1]) === null) return false;
      if (m[2] !== undefined && e.attr(m[1]) !== m[2]) return false;
    } else if (part && e.name !== part.toLowerCase()) return false;
  }
  return true;
};
export const $ = (root, sel) => queryAll(root, (e) => matches(e, sel));
export const $1 = (root, sel) => find(root, (e) => matches(e, sel));

/** remove nodes matching pred */
export function removeAll(root, pred) {
  let n = 0;
  for (const e of root.descendants()) if (pred(e)) { e.remove(); n++; }
  return n;
}
/** unwrap an element: replace it with its children */
export function unwrap(e) {
  e.replaceWith([...e.children]);
  return e;
}
