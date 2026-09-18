/* 离线全文搜索 + 站点交互（无依赖，file:// 直接可用） */
(function () {
  'use strict';
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

  /* ---------- 窄屏侧边栏折叠 ----------
     在手机上侧边栏有 2000px 以上高，正文被顶到很下面。窄屏时把它挪到正文之后（CSS order），
     并把每个 <h3> 分组折成可展开项，默认全部收起、只展开当前页所在的那一组。 */
  (function collapseSidebarOnNarrow() {
    var mq = window.matchMedia('(max-width: 900px)');
    var sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    var stashed = null;

    function collapse() {
      if (stashed) return;
      stashed = document.createDocumentFragment();
      while (sidebar.firstChild) stashed.appendChild(sidebar.firstChild);

      var groups = [], cur = null;
      Array.prototype.forEach.call(stashed.childNodes, function (node) {
        var isH3 = node.nodeType === 1 && node.tagName === 'H3';
        if (isH3) { cur = { heading: node, body: [] }; groups.push(cur); }
        else if (cur) cur.body.push(node);
      });

      groups.forEach(function (g) {
        var d = document.createElement('details');
        d.className = 'sb-group';
        var s = document.createElement('summary');
        s.textContent = g.heading.textContent;
        d.appendChild(s);
        g.body.forEach(function (n) { d.appendChild(n); });
        if (d.querySelector('a.cur')) d.open = true;
        sidebar.appendChild(d);
      });
    }

    function expand() {
      if (!stashed) return;
      while (sidebar.firstChild) sidebar.removeChild(sidebar.firstChild);
      sidebar.appendChild(stashed);
      stashed = null;
    }

    function apply() { if (mq.matches) collapse(); else expand(); }
    apply();
    // Safari < 14 lacks addEventListener on MediaQueryList
    if (mq.addEventListener) mq.addEventListener('change', apply);
    else if (mq.addListener) mq.addListener(apply);
  })();
})();
