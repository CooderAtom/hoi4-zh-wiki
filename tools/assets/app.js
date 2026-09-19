/* 离线全文搜索 + 站点交互（无依赖，file:// 直接可用） */
(function () {
  'use strict';

  /* ---------- 主题：三态（自动 / 浅色 / 深色）----------
     状态→样式的映射全在 style.css 里，这里只做两件事：写对 <html> 上的
     data-theme 属性，以及把「自动/浅/深」渲染成一个原生 <select>。
     控件由 JS 注入，因此 660 个页面不需要任何 HTML 改动即可全站生效
     （cache/pages 已丢失，07-build.mjs 无法再生成页面，这是硬约束）。

     持久化用 localStorage，但它在 file:// 源下可能直接抛 SecurityError
     （Chrome 对 file:// 的存储判定不稳定），而本站必须同时支持 file:// 双击
     打开与 GitHub Pages 两种用法，因此每次存取都必须容错：存不了就退化为
     「本次会话有效」，并在控制台留一条说明，绝不因为存不了而让控件失灵。
     注意：没有 data-theme 就等于自动，所以选「自动」时必须 removeAttribute，
     不能把属性设成空串或 "auto"。 */
  var THEME_KEY = 'hoi4-theme';
  var THEME_BG = { light: '#f4f5f0', dark: '#1b1f1c' };
  var THEME_LABEL = { auto: '自动跟随系统', light: '浅色', dark: '深色' };
  var THEME_LABEL_SHORT = { auto: '自动', light: '浅', dark: '深' };
  var root = document.documentElement;
  var mqDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  /* 560px 以下顶栏放不下「自动跟随系统」这种长标签（已按 560 断点算过总宽），
     故窄屏改单字标签，宽度上限同步由 CSS 收到 2.9em。 */
  var mqNarrow = window.matchMedia ? window.matchMedia('(max-width: 560px)') : null;
  var themeSelect = null;
  var lastLogged = null;

  function warnOnce(e) {
    if (lastLogged === e.name) return;
    lastLogged = e.name;
    if (window.console && console.info) {
      console.info('主题偏好无法持久化（' + e.name + '，file:// 下常见），本次选择仅在当前页面有效。');
    }
  }
  function storedChoice() {
    try {
      var v = localStorage.getItem(THEME_KEY);
      return v === 'light' || v === 'dark' ? v : 'auto';
    } catch (e) { warnOnce(e); return 'auto'; }
  }
  function saveChoice(v) {
    try { if (v === 'auto') localStorage.removeItem(THEME_KEY); else localStorage.setItem(THEME_KEY, v); }
    catch (e) { warnOnce(e); }
  }
  /* 把选择落到 DOM。auto 交给 CSS 的 prefers-color-scheme 处理，不写属性。 */
  function applyTheme(choice) {
    if (choice === 'light' || choice === 'dark') root.setAttribute('data-theme', choice);
    else root.removeAttribute('data-theme');
    applyMetaThemeColor();
  }
  /* 移动端浏览器 UI（地址栏）配色；页面里本来没有这个 meta，按需建。 */
  function applyMetaThemeColor() {
    var explicit = root.getAttribute('data-theme');
    var dark = explicit ? explicit === 'dark' : !!(mqDark && mqDark.matches);
    var m = document.querySelector('meta[name="theme-color"]');
    if (!m) {
      m = document.createElement('meta');
      m.setAttribute('name', 'theme-color');
      if (document.head) document.head.appendChild(m);
    }
    m.setAttribute('content', THEME_BG[dark ? 'dark' : 'light']);
  }
  function buildThemeSelect() {
    var bar = document.querySelector('.topbar-inner');
    if (!bar || themeSelect) return;
    var sel = document.createElement('select');
    sel.className = 'theme-pick';
    sel.setAttribute('aria-label', '主题配色');
    sel.title = '主题配色：自动跟随系统 / 浅色 / 深色';
    ['auto', 'light', 'dark'].forEach(function (v) {
      var o = document.createElement('option');
      o.value = v;
      sel.appendChild(o);
    });
    sel.value = storedChoice();
    sel.addEventListener('change', function () {
      saveChoice(sel.value);
      applyTheme(sel.value);
    });
    bar.appendChild(sel);
    themeSelect = sel;
    setThemeLabels();
  }
  function setThemeLabels() {
    if (!themeSelect) return;
    var set = (mqNarrow && mqNarrow.matches) ? THEME_LABEL_SHORT : THEME_LABEL;
    Array.prototype.forEach.call(themeSelect.options, function (o) {
      var t = set[o.value];
      if (o.textContent !== t) o.textContent = t;
    });
  }

  /* 尽快应用已保存的选择。app.js 在 <head> 里带 defer，因此本函数在 DOMContentLoaded
     之前、页面首次绘制之前就会执行；配合 CSS 的 color-scheme 落定默认底色，
     不会再出现「先亮后暗」的闪白。 */
  (function themeBoot() {
    root.className = (root.className || '') + ' has-js';
    var choice = storedChoice();
    applyTheme(choice);
    /* 手动深色/浅色时，系统主题改变不该影响本页；只有「自动」才需要跟着系统切换
       （配色由 CSS 自己处理，这里只需更新地址栏颜色）。 */
    if (mqDark) {
      var onChange = function () { applyMetaThemeColor(); };
      if (mqDark.addEventListener) mqDark.addEventListener('change', onChange);
      else if (mqDark.addListener) mqDark.addListener(onChange);
    }
    if (mqNarrow) {
      var onNarrow = function () { setThemeLabels(); };
      if (mqNarrow.addEventListener) mqNarrow.addEventListener('change', onNarrow);
      else if (mqNarrow.addListener) mqNarrow.addListener(onNarrow);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildThemeSelect);
    else buildThemeSelect();
  })();

  var DATA = window.HOI4_INDEX || { pages: [], hub: {} };
  var PAGES = DATA.pages || [];
  var byHref = {};
  PAGES.forEach(function (p) { byHref[p.h] = p; });

  /* ---------- 检索 ---------- */
  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/[\u3000]/g, ' ')
      .replace(/[''`]/g, "'");
  }
  function tokens(q) {
    var s = norm(q);
    var out = [];
    var latin = s.match(/[a-z0-9][a-z0-9'._-]*/g) || [];
    latin.forEach(function (t) { if (t.length > 1) out.push({ t: t, w: 1 }); });
    var cjk = s.match(/[\u3400-\u9fff]+/g) || [];
    cjk.forEach(function (run) {
      if (run.length === 1) { out.push({ t: run, w: 1 }); return; }
      for (var i = 0; i < run.length - 1; i++) out.push({ t: run.substr(i, 2), w: 1 });
    });
    if (!out.length && s.trim()) out.push({ t: s.trim(), w: 1 });
    return out;
  }
  function score(p, toks) {
    var title = norm(p.t + ' ' + (p.z || ''));
    var body = norm(p.b || '');
    var s = 0, hits = 0;
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i].t;
      var inTitle = title.indexOf(t) >= 0;
      var n = 0, idx = body.indexOf(t);
      while (idx >= 0 && n < 12) { n++; idx = body.indexOf(t, idx + t.length); }
      if (!inTitle && !n) return -1;
      if (inTitle) { s += 24; if (title.indexOf(t) === 0) s += 10; }
      s += Math.min(n, 8) * 3;
      hits++;
    }
    if (!hits) return -1;
    s += Math.min(p.w || 0, 60) / 30;
    return s;
  }
  function snippet(p, toks) {
    var body = String(p.b || '');
    var low = norm(body);
    var at = -1;
    for (var i = 0; i < toks.length && at < 0; i++) at = low.indexOf(toks[i].t);
    if (at < 0) return body.slice(0, 130);
    var start = Math.max(0, at - 45);
    var frag = body.slice(start, start + 190);
    return (start > 0 ? '…' : '') + frag + (start + 190 < body.length ? '…' : '');
  }
  function highlight(text, toks) {
    var out = text.replace(/[&<>]/g, function (c) { return c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'; });
    var seen = {};
    toks.forEach(function (t) {
      if (seen[t.t] || t.t.length < 1) return;
      seen[t.t] = 1;
      var re = new RegExp(t.t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      out = out.replace(re, function (m) { return '<mark>' + m + '</mark>'; });
    });
    return out;
  }
  function search(q, limit) {
    var toks = tokens(q);
    if (!toks.length) return [];
    var res = [];
    for (var i = 0; i < PAGES.length; i++) {
      var s = score(PAGES[i], toks);
      if (s > 0) res.push({ p: PAGES[i], s: s });
    }
    res.sort(function (a, b) { return b.s - a.s; });
    return res.slice(0, limit || 20);
  }

  /* ---------- 顶栏下拉 ---------- */
  var input = document.getElementById('q');
  var box = document.getElementById('search-results');
  var base = (document.body.getAttribute('data-rel') || './');
  var active = -1, current = [];

  function renderDropdown(q) {
    if (!box) return;
    var res = search(q, 12);
    current = res;
    active = -1;
    if (!q.trim()) { box.className = ''; box.innerHTML = ''; return; }
    if (!res.length) { box.innerHTML = '<div class="sr-empty">没有找到匹配的页面</div>'; box.className = 'open'; return; }
    var toks = tokens(q);
    box.innerHTML = res.map(function (r, i) {
      return '<a class="sr-item" href="' + base + r.p.h + '" data-i="' + i + '">' +
        '<div class="sr-title">' + highlight(r.p.z || r.p.t, toks) + '</div>' +
        '<div class="sr-snip">' + highlight(snippet(r.p, toks), toks) + '</div></a>';
    }).join('');
    box.className = 'open';
  }

  if (input) {
    var timer = null;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      var v = input.value;
      timer = setTimeout(function () { renderDropdown(v); }, 90);
    });
    input.addEventListener('focus', function () { if (input.value.trim()) renderDropdown(input.value); });
    input.addEventListener('keydown', function (e) {
      var items = box ? box.querySelectorAll('.sr-item') : [];
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!items.length) return;
        e.preventDefault();
        active = e.key === 'ArrowDown' ? Math.min(active + 1, items.length - 1) : Math.max(active - 1, 0);
        for (var i = 0; i < items.length; i++) items[i].className = 'sr-item' + (i === active ? ' active' : '');
        items[active].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        if (active >= 0 && current[active]) location.href = base + current[active].p.h;
        else if (current.length) location.href = base + current[0].p.h;
        else location.href = base + 'search.html?q=' + encodeURIComponent(input.value);
      } else if (e.key === 'Escape') {
        if (box) { box.className = ''; }
        input.blur();
      }
    });
    document.addEventListener('click', function (e) {
      if (box && !box.contains(e.target) && e.target !== input) box.className = '';
    });
  }

  /* ---------- 搜索页 ---------- */
  var sp = document.getElementById('sp-input');
  if (sp) {
    var out = document.getElementById('sp-results');
    var params = new URLSearchParams(location.search);
    var initial = params.get('q') || '';
    sp.value = initial;
    var run = function () {
      var q = sp.value;
      var res = search(q, 60);
      if (!q.trim()) { out.innerHTML = '<p class="list-note">输入关键词开始搜索。支持中文与英文（例如：政治点数、focus、division）。</p>'; return; }
      if (!res.length) { out.innerHTML = '<p class="list-note">没有找到与 “' + q.replace(/[<>&]/g, '') + '” 匹配的页面。</p>'; return; }
      var toks = tokens(q);
      out.innerHTML = '<p class="list-note">共 ' + res.length + ' 条结果</p>' + res.map(function (r) {
        return '<div class="hit"><h3><a href="' + r.p.h + '">' + highlight(r.p.z || r.p.t, toks) + '</a></h3>' +
          '<div class="path">原页面：' + r.p.t + '</div>' +
          '<div class="snip">' + highlight(snippet(r.p, toks), toks) + '</div></div>';
      }).join('');
    };
    sp.addEventListener('input', run);
    run();
  }

  /* ---------- 键盘快捷键：/ 聚焦搜索 ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && document.activeElement !== input && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) {
      e.preventDefault();
      if (input) input.focus();
    }
  });

  /* ---------- 目录折叠 ---------- */
  var tocTitle = document.querySelector('.toc-title');
  if (tocTitle) {
    tocTitle.style.cursor = 'pointer';
    tocTitle.title = '点击折叠/展开目录';
    tocTitle.addEventListener('click', function () {
      var ol = tocTitle.parentNode.querySelector('ol');
      if (ol) ol.style.display = ol.style.display === 'none' ? '' : 'none';
    });
  }

  /* ---------- 窄屏导航抽屉 ----------
     侧边栏在手机上有 2000px 以上高。原先只把它折到正文之后，用户必须一路滚到底才能找到
     导航，等于进不去。改为：窄屏时它变成左侧滑出的抽屉，配一个常驻的「目录」按钮与遮罩，
     点按钮/遮罩/Esc/链接都能开关；宽屏保持原样（侧边栏仍是正文左侧的一列）。
     侧边栏始终留在 DOM 原位——移动它会破坏外层布局。分组折叠只在抽屉内启用。 */
  (function navDrawerOnNarrow() {
    var mq = window.matchMedia('(max-width: 900px)');
    var sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    var backdrop = document.createElement('div');
    backdrop.className = 'sb-backdrop';
    document.body.appendChild(backdrop);

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'nav-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '<span aria-hidden="true">☰</span> 目录';
    document.body.appendChild(toggle);

    var stashed = null, grouped = false;

    function group() {
      if (grouped) return;
      stashed = document.createDocumentFragment();
      while (sidebar.firstChild) stashed.appendChild(sidebar.firstChild);

      var groups = [], cur = null;
      Array.prototype.forEach.call(stashed.childNodes, function (node) {
        if (node.nodeType === 1 && node.tagName === 'H3') { cur = { heading: node, body: [] }; groups.push(cur); }
        else if (cur) cur.body.push(node);
      });
      groups.forEach(function (g) {
        var d = document.createElement('details');
        d.className = 'sb-group';
        var s = document.createElement('summary');
        s.textContent = g.heading.textContent;
        d.appendChild(s);
        g.body.forEach(function (n) { d.appendChild(n); });
        if (d.querySelector('a.cur')) d.open = true;   // 只展开当前页所在分组
        sidebar.appendChild(d);
      });
      grouped = true;
    }

    function ungroup() {
      if (!grouped || !stashed) return;
      while (sidebar.firstChild) sidebar.removeChild(sidebar.firstChild);
      sidebar.appendChild(stashed);
      stashed = null;
      grouped = false;
    }

    function close() {
      document.body.classList.remove('sb-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
    function open() {
      document.body.classList.add('sb-open');
      toggle.setAttribute('aria-expanded', 'true');
    }

    toggle.addEventListener('click', function () {
      if (document.body.classList.contains('sb-open')) close(); else open();
    });
    backdrop.addEventListener('click', close);
    sidebar.addEventListener('click', function (e) {
      if (e.target && e.target.tagName === 'A') close();   // 点链接后收起抽屉
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });

    function apply() {
      if (mq.matches) group(); else ungroup();
      close();
    }
    apply();
    if (mq.addEventListener) mq.addEventListener('change', apply);
    else if (mq.addListener) mq.addListener(apply);
  })();
})();
