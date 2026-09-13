// Turn a cached wiki page into a clean article DOM ready for translation,
// with all internal links and media pointing at the offline mirror.
import { parse, el, text, $, $1, byTag, byClass } from './dom.mjs';

export const parserOutput = (dom) => $1(dom, '.mw-parser-output') || dom;

const WIKI_HOST = 'hoi4.paradoxwikis.com';

/** human-friendly local path for an article title */
export function slugify(title) {
  let s = String(title).trim().replace(/\s+/g, '_');
  s = s.replace(/[^\p{L}\p{N}_.\-()!',%]/gu, (c) => '_' + c.codePointAt(0).toString(16) + '_');
  s = s.replace(/_{2,}/g, '_');
  if (!s) s = 'page';
  return s.length > 120 ? s.slice(0, 110) + '_' + hash32(title) : s;
}
export function hash32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}
export const localPageHref = (title, frag) => slugify(title) + '.html' + (frag ? '#' + frag : '');
/** Windows-safe local file name for a wiki image (keeps the extension). */
export const safeImageName = (name) => String(name)
  // The wiki HTML carries some file names HTML-escaped ("Mobile_Recon_&amp;_Assault.png"), but the
  // downloader writes the real name with a literal "&". Without decoding, the page's <img src>
  // pointed at "Mobile_Recon_&amp;_Assault.png", which does not exist on disk.
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/[<>:"/\\|?*\u0000-\u001f]/g, (c) => '_' + c.codePointAt(0).toString(16) + '_')
  .replace(/ /g, '_');
export const localImagePath = (name) => 'images/' + safeImageName(name);

// Case-insensitive reconciliation against the files actually downloaded.
//
// The wiki's <img src> names and the names the downloader wrote to site/images can differ only in
// case (the origin wiki stores e.g. "Nuclear_Reactor.png"; the local file is "Nuclear_reactor.png").
// On Windows/macOS this is invisible, so fs.existsSync() reports the reference as fine -- but on any
// case-sensitive host (Linux, GitHub Pages, most static servers) those <img> become broken images.
// Resolving through the real directory listing makes the emitted HTML correct everywhere.
let IMAGE_CASE_MAP = null;
export function setImageCaseMap(names) {
  IMAGE_CASE_MAP = names instanceof Map ? names : new Map([...names].map((n) => [String(n).toLowerCase(), n]));
}
export const resolveImageName = (name) => {
  if (!IMAGE_CASE_MAP) return name;
  return IMAGE_CASE_MAP.get(String(name).toLowerCase()) || name;
};

/** Normalize a wiki href into {title, frag, external, interwiki, special} */
export function classifyHref(href, baseTitle) {
  if (!href) return { kind: 'empty' };
  if (href.startsWith('#')) return { kind: 'anchor', frag: href.slice(1) };
  if (/^(mailto|tel):/i.test(href)) return { kind: 'external-offsite', url: href };
  if (href.startsWith('//')) href = 'https:' + href;
  if (/^https?:/i.test(href)) {
    let u;
    try { u = new URL(href); } catch { return { kind: 'external-offsite', url: href }; }
    if (u.hostname.endsWith(WIKI_HOST)) {
      const p = decodeURIComponent(u.pathname.replace(/^\//, ''));
      if (p.startsWith('index.php')) {
        const t = u.searchParams.get('title');
        if (t) return { kind: 'internal', title: t.replace(/_/g, ' '), frag: u.hash.slice(1) };
        return { kind: 'special', url: href };
      }
      if (!p) return { kind: 'internal', title: 'Hearts of Iron 4 Wiki', frag: u.hash.slice(1) };
      return { kind: 'internal', title: p.replace(/_/g, ' '), frag: u.hash.slice(1) };
    }
    return { kind: 'external-offsite', url: href };
  }
  if (href.startsWith('/')) return classifyHref(WIKI + href, baseTitle);
  // relative
  let t = href.replace(/^\.\//, '');
  const h = t.indexOf('#');
  const frag = h >= 0 ? t.slice(h + 1) : '';
  if (h >= 0) t = t.slice(0, h);
  if (!t) return { kind: 'anchor', frag };
  return { kind: 'internal', title: decodeURIComponent(t).replace(/_/g, ' '), frag };
}
const WIKI = 'https://' + WIKI_HOST;

const INTERWIKI = /^(wikipedia|wikt|commons|wikisource|forum|wp|file|image|media|special|w|:)/i;

/* ------------------------------------------------------------------ */
/*  sanitizing                                                         */
/* ------------------------------------------------------------------ */

const STRIP_SELECTORS = [
  '.mw-editsection', '.mw-empty-elt', '.mw-jump-link', '#toc', '.toc', '.mw-hidden-catlinks',
  '.printfooter', '.catlinks', '.noprint', '.metadata', '.ambox', '.eu4box', '.hatnote',
  'link', 'meta', 'script', 'style', 'noscript', 'iframe',
];

export function sanitize(root, { images, pageTitle, known }) {
  const stats = { videos: 0, droppedAbsolute: 0, images: 0, internalLinks: 0, externalLinks: 0, unavailable: 0, tabs: 0, stripTemplates: 0 };

  // 1. drop known chrome
  for (const sel of STRIP_SELECTORS) {
    for (const e of $(root, sel)) { if (sel === '.ambox' || sel === '.hatnote') stats.stripTemplates++; e.remove(); }
  }
  // drop version banners that only say "this page is for 1.9"
  for (const e of byClass(root, 'versionbox')) e.remove();

  // 2. mediawiki video embeds -> dropped (offline mirror cannot play them)
  for (const e of $(root, 'figure.embedvideo')) e.remove();

  // 2b. any leftover video containers
  for (const e of byClass(root, 'embedvideo')) { e.remove(); stats.videos++; }

  // 3. tabber -> plain sequential sections (offline-friendly)
  for (const e of byClass(root, 'tabber')) {
    const tabs = byClass(e, 'tabbertab');
    const frag = el('div', { class: 'tabber-plain' });
    for (const t of tabs) {
      const ttl = t.attr('title') || '';
      if (ttl) frag.append(el('h4', { class: 'tabber-heading' }, [text(ttl)]));
      for (const c of [...t.children]) frag.append(c);
      t.remove();
    }
    if (tabs.length) { e.replaceWith(frag); stats.tabs++; }
  }

  // 3b. The wiki renders every formula through MediaWiki's math extension, which either
  //     emits an <img src="https://en.wikipedia.org/..."> (an external dependency an
  //     offline mirror cannot have) or, when its renderer is broken, dumps a raw
  //     "Failed to parse ... from server https://en.wikipedia.org/..." error into the
  //     page. Both cases become clean, readable inline text.
  const TEX_ERR = /Failed to parse|Math extension cannot connect|texerror|解析失败/;
  for (const el2 of [...byClass(root, 'mwe-math-element'), ...byClass(root, 'texerror'), ...byClass(root, 'math-error')]) {
    const img = byTag(el2, 'img')[0];
    const ann = byTag(el2, 'annotation').find((a) => /tex/i.test(a.attr('encoding') || ''));
    let tex = '';
    if (ann) tex = ann.textContent;
    else {
      const raw = el2.textContent.replace(/\s+/g, ' ').trim();
      if (TEX_ERR.test(raw)) tex = raw.split(/":\)\s*|）：\s*/).pop() || raw;
      else if (img && /wikipedia\.org/i.test(img.attr('src') || '')) tex = raw;
    }
    if (!tex) continue;
    tex = tex.replace(/\\displaystyle|\\textstyle|\\scriptstyle/g, '').trim();
    el2.replaceWith(el('span', { class: 'math-inline' }, [text(prettyTex(tex))]));
    stats.math = (stats.math || 0) + 1;
  }
  for (const img of byTag(root, 'img')) {
    if (/wikipedia\.org/i.test(img.attr('src') || '')) img.remove();
  }

  // 4. images: rewrite to local paths
  for (const img of byTag(root, 'img')) {
    const nm = imageNameFromUrl(img.attr('src') || img.attr('data-src') || '');
    if (!nm) { img.remove(); continue; }
    const w = parseInt(img.attr('width') || '0', 10) || 0;
    const rec = images.get(nm);
    const width = pickWidth(rec, w);
    // alt text on wiki images is a filename-like label; empty alt keeps screen readers quiet
    // resolveImageName() pins the reference to the file actually on disk (see note above)
    img.attrs = { src: localImagePath(resolveImageName(nm)), alt: '' };
    if (width) img.setAttr('width', String(width));
    if (rec && rec.height && rec.width && width) img.setAttr('height', String(Math.round(rec.height * width / rec.width)));
    img.setAttr('loading', 'lazy');
    stats.images++;
  }
  // <a class=image> wrappers, srcset leftovers
  for (const e of root.descendants()) {
    if (e.attr('srcset')) e.removeAttr('srcset');
    if (e.attr('data-src')) e.removeAttr('data-src');
  }

  // 5. links
  for (const a of byTag(root, 'a')) {
    const href = a.attr('href');
    const c = classifyHref(href, pageTitle);
    switch (c.kind) {
      case 'internal': {
        if (INTERWIKI.test(c.title)) { demote(a); stats.droppedAbsolute++; break; }
        // Links to wiki pages that are not part of this offline mirror (country pages,
        // focus trees, script/data pages) become plain text so no link ever dead-ends.
        if (known && known.size && !known.has(slugify(c.title).toLowerCase())) { demote(a); stats.unavailable++; break; }
        a.setAttr('href', localPageHref(c.title, c.frag));
        a.setAttr('data-wiki-title', c.title);
        a.removeAttr('class');
        if (a.attr('title')) a.removeAttr('title');
        stats.internalLinks++;
        break;
      }
      case 'anchor':
      case 'empty':
        a.setAttr('href', c.frag ? '#' + c.frag : '#');
        break;
      case 'special':
      case 'external-offsite':
        demote(a);
        stats.externalLinks++;
        break;
      default: break;
    }
    for (const at of ['data-image-name', 'data-image-key', 'rel', 'target']) a.removeAttr(at);
  }

  // 6. inline styles that fight our CSS / tracking left by the skin
  for (const e of root.descendants()) {
    if (e.attr('typeof')) e.removeAttr('typeof');
    if (e.attr('about')) e.removeAttr('about');
    if (e.attr('data-mw')) e.removeAttr('data-mw');
    for (const at of Object.keys(e.attrs)) {
      if (/^on[a-z]+$/i.test(at)) delete e.attrs[at];
    }
  }
  // 7. plain-text the "figcaption" video remnants, drop empty figures
  for (const fig of byTag(root, 'figure')) if (!fig.descendants().length && !fig.textContent.trim()) fig.remove();

  // 8. strip empty nodes
  for (let pass = 0; pass < 3; pass++) {
    for (const e of root.descendants().reverse()) {
      if (!e.children.length && !e.textContent.trim() && !['img', 'br', 'hr', 'td', 'th'].includes(e.name)) e.remove();
    }
  }
  return stats;
}

function demote(a) {
  // keep the text, drop the link to off-topic destinations
  a.replaceWith([...a.children]);
}

function imageNameFromUrl(src) {
  if (!src) return null;
  let s = src;
  // this wiki serves EVERY image through /thumb.php?f=<File name>&width=N (relative, no hash dirs)
  const t = /(?:^|\/)thumb\.php\?([^"'#]*)/i.exec(s);
  if (t) {
    const q = new URLSearchParams(t[1].replace(/&amp;/g, '&'));
    const f = q.get('f');
    if (f) return decodeURIComponent(f);
  }
  try {
    if (/^https?:/i.test(s)) {
      const u = new URL(s);
      s = decodeURIComponent(u.pathname);
      s = s.replace(/^\/images\/thumb\//, '/images/');
      const parts = s.split('/').filter(Boolean);
      // images/thumb/a/ab/File.png/250px-File.png -> File.png
      s = parts[parts.length - 1].replace(/^\d+px-/, '');
      if (/^[0-9a-f]$/i.test(parts[parts.length - 2] || '')) s = parts[parts.length - 1].replace(/^\d+px-/, '');
      return s;
    }
  } catch { /* fall through */ }
  const m = /\/images\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/]+?)(?:\/\d+px-[^/]+)?$/i.exec(s);
  if (m) return decodeURIComponent(m[1]);
  const tail = s.split('/').pop();
  return tail && !tail.startsWith('data:') ? decodeURIComponent(decodeURIComponent(tail).replace(/^\d+px-/, '')) : null;
}

/** Turn a LaTeX snippet into something readable in plain text. */
function prettyTex(tex) {
  if (!tex) return '';
  return tex
    .replace(/\\text\{([^{}]*)\}/g, '$1')
    .replace(/\\mathrm\{([^{}]*)\}/g, '$1')
    .replace(/\\cdot/g, '·').replace(/\\times/g, '×').replace(/\\div/g, '÷')
    .replace(/\\leq/g, '≤').replace(/\\geq/g, '≥').replace(/\\neq/g, '≠')
    .replace(/\\left|\\right/g, '')
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^{}]*)\}/g, '√($1)')
    .replace(/\\sum/g, 'Σ').replace(/\\prod/g, 'Π').replace(/\\int/g, '∫')
    .replace(/\\alpha/g, 'α').replace(/\\beta/g, 'β').replace(/\\gamma/g, 'γ').replace(/\\delta/g, 'δ')
    .replace(/\\pi/g, 'π').replace(/\\sigma/g, 'σ').replace(/\\mu/g, 'μ').replace(/\\lambda/g, 'λ')
    .replace(/[{}]/g, '')
    .replace(/\\\\/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickWidth(rec, requested) {  if (!rec) return requested || null;
  if (!requested) return rec.width && rec.width > 800 ? 800 : rec.width || null;
  return requested;
}

/* ------------------------------------------------------------------ */
/*  heading anchors                                                    */
/* ------------------------------------------------------------------ */

export function assignHeadingIds(root) {
  const heads = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].flatMap((t) => byTag(root, t));
  const seen = new Map();
  const toc = [];
  for (const h of heads) {
    const txt = h.textContent.replace(/\s+/g, ' ').trim();
    if (!txt) continue;
    let slug = h.attr('id') || ('s-' + hash32(txt));
    if (seen.has(slug)) {
      const n = seen.get(slug) + 1;
      seen.set(slug, n);
      slug = slug + '-' + n;
    } else seen.set(slug, 1);
    h.setAttr('id', slug);
    h.setAttr('data-section', '1');
    toc.push({ level: Number(h.name[1]), id: slug, text: txt });
  }
  return toc;
}
