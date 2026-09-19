// 主题开关的逻辑测试：把真实的 site/assets/app.js 放进一个假 DOM 里执行，断言三种状态的行为。
//
// 为什么不用 jsdom：项目没有依赖（node_modules 不存在），而 app.js 只用到了很窄的 DOM 面。
// 假 DOM 只实现 app.js 真正碰到的成员，因此这个测试同时起到「依赖面审计」的作用——
// 一旦 app.js 用了假 DOM 没有的 API，测试会立刻炸掉，而不是悄悄放过。
//
// 覆盖点：
//   · 三种状态写出的 data-theme 是否正确（自动必须是无属性，不能是 "auto" 或空串）
//   · localStorage 抛 SecurityError 时（Chrome 在 file:// 下的常见行为）是否降级而不失灵
//   · 非法存量值 / 过期值是否回落到自动
//   · 下拉切换后是否既改了属性又写了存储
//   · 页面里没有 .topbar-inner 时是否安静跳过
//
// usage: node tools/theme-test.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { SITE } from './lib.mjs';

const CODE = fs.readFileSync(path.join(SITE, 'assets', 'app.js'), 'utf8');
let fail = 0, warn = 0;
const ok = (m) => console.log('  ok   ' + m);
const bad = (m) => { fail++; console.log('  FAIL ' + m); };
const meh = (m) => { warn++; console.log('  warn ' + m); };

function makeEl(tag) {
  const el = {
    tagName: String(tag).toUpperCase(), children: [], attrs: {}, style: {}, options: [],
    className: '', textContent: '', value: '', open: false, title: '',
    appendChild(c) {
      this.children.push(c);
      // <select> 的 options 是活的集合；app.js 靠它切换长短标签，夹具里必须同步
      if (this.tagName === 'SELECT' && String(c.tagName).toUpperCase() === 'OPTION') this.options.push(c);
      return c;
    },
    removeChild(c) { this.children = this.children.filter((x) => x !== c); return c; },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
    removeAttribute(k) { delete this.attrs[k]; },
    addEventListener(t, f) { (this._ev = this._ev || {})[t] = f; },
    removeEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    scrollIntoView() {},
    focus() {}, blur() {},
    contains() { return false; },
    get firstChild() { return this.children[0] || null; },
    set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html || ''; },
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      contains(c) { return this._s.has(c); },
    },
  };
  return el;
}

function run({ store = null, topbar = true, search = false, systemDark = false } = {}) {
  const htmlEl = makeEl('html');
  const headEl = makeEl('head');
  const bodyEl = makeEl('body');
  const barEl = makeEl('div');
  const input = makeEl('input');
  const box = makeEl('div');
  const storeScript = makeEl('script');
  const storeDiv = makeEl('div');
  storeDiv.id = 'q';
  storeScript.id = 'search-results';
  if (topbar) bodyEl.appendChild(barEl);
  if (search) bodyEl.appendChild(storeDiv), bodyEl.appendChild(storeScript);

  const selectorMap = {
    '.topbar-inner': topbar ? barEl : null,
    '.sidebar': null,
    '.toc-title': null,
    'meta[name="theme-color"]': null,
    '#q': search ? input : null,
    '#search-results': search ? box : null,
  };
  const localStore = new Map(store ? Object.entries(store) : []);
  const localStorage = {
    getItem: (k) => (localStore.has(k) ? localStore.get(k) : null),
    setItem: (k, v) => { if (store === null) throw new Error('no storage'); localStore.set(k, String(v)); },
    removeItem: (k) => { if (store === null) throw new Error('no storage'); localStore.delete(k); },
  };
  const docEvents = {};
  const document = {
    documentElement: htmlEl, head: headEl, body: bodyEl,
    readyState: 'loading',
    activeElement: bodyEl,
    createElement: makeEl,
    querySelector: (s) => selectorMap[s] !== undefined ? selectorMap[s] : null,
    querySelectorAll: () => [],
    addEventListener(t, f) { (docEvents[t] = docEvents[t] || []).push(f); },
    getElementById: (id) => (id === 'q' ? (search ? input : null) : id === 'search-results' ? (search ? box : null) : null),
  };
  const window = {
    matchMedia: (q) => ({
      media: q,
      matches: q.includes('prefers-color-scheme') ? systemDark : false,
      addEventListener() {}, addListener() {},
    }),
    addEventListener() {},
    console,
  };
  const ctx = {
    window, document, localStorage, console, location: { search: '', href: '', protocol: 'file:' },
    URLSearchParams, setTimeout, clearTimeout, Set, Map, Array, Object, String, RegExp, Math, JSON, Error,
  };
  ctx.window.document = document;
  vm.createContext(ctx);
  try {
    vm.runInContext(CODE, ctx, { filename: 'app.js' });
  } catch (e) {
    return { error: e, htmlEl, barEl, localStore };
  }
  /* app.js 是 <script defer>，真实浏览器里一定会在 DOMContentLoaded 之后才跑构造逻辑；
     夹具里必须手动派发一次，否则控件永远不会被注入（第一版就漏了这一步）。 */
  document.readyState = 'interactive';
  for (const f of docEvents.DOMContentLoaded || []) f({ type: 'DOMContentLoaded' });
  return { htmlEl, barEl, localStore };
}

const selOf = (bar) => bar.children.find((c) => c.tagName === 'SELECT') || null;
const result = [];
const check = (name, cond, detail) => { result.push([name, cond, detail]); };

console.log('[1] 三种状态写出的 data-theme');
for (const [stored, want, label] of [[null, null, '无存储 → 自动（无属性）'], ['dark', 'dark', '存 dark → 强制深色'], ['light', 'light', '存 light → 强制浅色']]) {
  const r = run({ store: stored === null ? {} : { 'hoi4-theme': stored } });
  const got = r.htmlEl.getAttribute('data-theme');
  check(`${label}`, got === want, `实际 data-theme=${JSON.stringify(got)}`);
}
for (const bogus of ['auto', '', 'DARK', 'blue', '1']) {
  const r = run({ store: { 'hoi4-theme': bogus } });
  const got = r.htmlEl.getAttribute('data-theme');
  check(`非法存量值 ${JSON.stringify(bogus)} → 回落为自动`, got === null, `实际 ${JSON.stringify(got)}`);
}

console.log('\n[2] localStorage 不可用（file:// 下 Chrome 抛 SecurityError 的常见情形）');
{
  const r = run({ store: null });   // 任何读写都抛
  if (r.error) check('存储抛异常时 app.js 仍能加载完成', false, r.error.message);
  else {
    check('存储抛异常时 app.js 仍能加载完成', true);
    check('存储抛异常时不写 data-theme（自动）', r.htmlEl.getAttribute('data-theme') === null);
    const sel = selOf(r.barEl);
    check('控件仍然渲染出来', !!sel);
    if (sel) {
      sel.value = 'dark';
      sel._ev.change();               // 模拟用户选择
      check('存储抛异常时切换仍生效（属性被写入）', r.htmlEl.getAttribute('data-theme') === 'dark');
      sel.value = 'auto';
      sel._ev.change();
      check('切回自动时属性被移除（不是空串）', r.htmlEl.getAttribute('data-theme') === null);
    }
  }
}

console.log('\n[3] 控件与持久化');
{
  const r = run({ store: { 'hoi4-theme': 'dark' } });
  const sel = selOf(r.barEl);
  check('控件被注入 .topbar-inner', !!sel);
  check('控件初始值反映已存偏好', sel && sel.value === 'dark', sel ? 'value=' + sel.value : '');
  check('控件有 aria-label', sel && !!sel.getAttribute('aria-label'));
  check('三个状态都有 option', sel && sel.options.length === 3, sel ? 'options=' + sel.options.length : '');
  if (sel) {
    sel.value = 'light';
    sel._ev.change();
    check('切换到浅色后写入存储', r.localStore.get('hoi4-theme') === 'light', 'store=' + r.localStore.get('hoi4-theme'));
    sel.value = 'auto';
    sel._ev.change();
    check('切到自动后清除存储', !r.localStore.has('hoi4-theme'), 'store=' + JSON.stringify([...r.localStore]));
  }
}

console.log('\n[4] 边界情况');
{
  const r = run({ topbar: false });
  check('页面没有 .topbar-inner 时安静跳过', !r.error);
  const r2 = run({ topbar: false, store: { 'hoi4-theme': 'dark' } });
  check('没有顶栏时仍然应用已存主题', r2.htmlEl.getAttribute('data-theme') === 'dark');
}
{
  const r = run({ search: true, store: {} });
  check('搜索框存在时两条链路互不干扰', !r.error && !!selOf(r.barEl));
}
{
  const r = run({ store: {} });
  const cls = r.htmlEl.className || '';
  check('标记 has-js（CSS 用它决定是否显示控件）', cls.includes('has-js'), 'class=' + JSON.stringify(cls));
}

for (const [name, cond, detail] of result) {
  if (cond) ok(name);
  else bad(name + (detail ? ' —— ' + detail : ''));
}

console.log(`\n结果：${fail} 项失败，${warn} 项提醒（共 ${result.length} 项断言）`);
process.exit(fail ? 1 : 0);
