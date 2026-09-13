// Site registry: page lookup, Chinese titles, nav tree, link resolution.
import fs from 'node:fs';
import path from 'node:path';
import { DATA, CACHE, readJson } from './lib.mjs';
import { slugify } from './sanitize.mjs';

// Alias table for hub/nav entries that are upstream redirects but were never fetched as aliases.
const EXTRA_ALIASES = (() => {
  try { return readJson(path.join(DATA, 'redirect-aliases.json'), {}); } catch { return {}; }
})();

// 入口栏目结构，取自原站主页 Main Page/links（非 HOI4 相关入口整类删除）
export const HUBS = [
  {
    id: 'getting-started', zh: '入门', en: 'Getting started', items: [
      ["Beginner's guide", '新手入门指南'],
      ['User interface', '用户界面'],
      ['Mechanics', '游戏机制'],
      ['Console commands', '控制台指令'],
      ['Hotkeys', '快捷键'],
      ['Countries', '国家'],
      ['Tutorial videos', '教学视频'],
    ],
  },
  {
    id: 'state-affairs', zh: '国家事务', en: 'State affairs', items: [
      ['Government', '政府'],
      ['Ideas', '理念、法令与顾问'],
      ['Officer corps', '军官团'],
      ['National focus', '国家焦点'],
      ['Research', '科研'],
      ['Construction', '建造'],
      ['Production', '生产'],
      ['Events', '事件'],
      ['Decisions', '决议'],
      ['Stability', '稳定度'],
      ['War support', '战争支持度'],
      ['Manpower', '人力'],
    ],
  },
  {
    id: 'foreign-affairs', zh: '外交事务', en: 'Foreign affairs', items: [
      ['Diplomacy', '外交'],
      ['Puppet', '傀儡国'],
      ['Occupation', '占领'],
      ['World tension', '世界紧张度'],
      ['Intelligence agency', '情报机构'],
      ['Trade', '贸易'],
      ['Faction', '阵营'],
      ['Lend-Lease', '租借'],
    ],
  },
  {
    id: 'warfare', zh: '战争', en: 'Warfare', items: [
      ['Warfare', '战争总览'],
      ['Combat tactics', '战斗战术'],
      ['Logistics', '后勤'],
      ['Terrain', '地形'],
      ['Weather', '天气'],
      ['Battle plan', '作战计划'],
      ['Army planner', '陆军编制器'],
      ['Command group', '集团军'],
      ['Division', '师'],
      ['Land battle', '陆战'],
      ['Naval battle', '海战'],
      ['Air warfare', '空战'],
      ['Attrition', '损耗'],
      ['Encirclement', '包围'],
    ],
  },
  {
    id: 'military', zh: '军种', en: 'Military branches', items: [
      ['Land warfare', '陆军'],
      ['Naval warfare', '海军'],
      ['Air warfare', '空军'],
      ['Land units', '陆军单位'],
      ['Naval units', '海军单位'],
      ['Air units', '空军单位'],
      ['Equipment', '装备'],
      ['Ship designer', '舰船设计'],
      ['Tank designer', '坦克设计'],
      ['Aircraft designer', '飞机设计'],
    ],
  },
  {
    id: 'technology', zh: '科技与学说', en: 'Technology', items: [
      ['Technology', '科技'],
      ['Land doctrine', '陆军学说'],
      ['Naval doctrine', '海军学说'],
      ['Air doctrine', '空军学说'],
      ['Infantry technology', '步兵科技'],
      ['Armor technology', '装甲科技'],
      ['Naval technology', '海军科技'],
      ['Air technology', '空军科技'],
      ['Support companies technology', '支援连科技'],
    ],
  },
  {
    id: 'meta', zh: '游戏与资料', en: 'Meta', items: [
      ['Achievements', '成就'],
      ['Downloadable content', '可下载内容'],
      ['Patches', '补丁'],
      ['Jargon', '术语表'],
      ['Modding', '模组制作'],
      ['Mods', '模组'],
      ['Developer diaries', '开发日志'],
    ],
  },
];

export class Registry {
  constructor({ store, fetched, media }) {
    this.store = store;
    this.media = media;
    this.pages = new Map();        // canonical title -> rec
    this.bySlug = new Map();       // slug -> title
    this.redirects = new Map();    // alias -> canonical
    this.titleZh = new Map();

    // canonical pages = everything we actually cached
    for (const [title, info] of Object.entries(fetched.pages)) {
      if (!info.ok) continue;
      const canonical = info.title;
      let rec = this.pages.get(canonical);
      if (!rec) {
        rec = { title: canonical, slug: slugify(canonical), aliases: new Set(), cats: [], size: 0, images: 0 };
        this.pages.set(canonical, rec);
      }
      rec.aliases.add(title);
      this.redirects.set(title, canonical);
      for (const from of info.redirectedFrom || []) { rec.aliases.add(from); this.redirects.set(from, canonical); }
    }
    // Extra aliases for hub/nav entries that are redirects upstream but were never fetched under
    // their alias title, so fetched.json has no redirectedFrom record for them. Without this the
    // index builder drops those entries entirely. See data/redirect-aliases.json.
    for (const [alias, canonical] of Object.entries(EXTRA_ALIASES.aliases || {})) {
      if (!this.pages.has(canonical)) continue;   // never point at a page we do not have
      this.redirects.set(alias, canonical);
      this.pages.get(canonical).aliases.add(alias);
    }

    for (const rec of this.pages.values()) {
      const t = store.get(rec.title);
      rec.titleZh = t || rec.title;
      this.titleZh.set(rec.title, rec.titleZh);
      this.bySlug.set(rec.slug, rec.title);
    }
  }

  resolve(title) {
    if (!title) return null;
    const norm = String(title).replace(/_/g, ' ').trim();
    if (this.pages.has(norm)) return this.pages.get(norm);
    const canon = this.redirects.get(norm);
    if (canon) return this.pages.get(canon);
    // case-insensitive / first-letter fallback
    const lower = norm.toLowerCase();
    for (const [t, rec] of this.pages) if (t.toLowerCase() === lower) return rec;
    for (const [alias, canon] of this.redirects) if (alias.toLowerCase() === lower) return this.pages.get(canon);
    return null;
  }

  iconHtml(name, size = 22) {
    const rec = this.media.files?.[name];
    if (!rec || rec.missing || !rec.local) return '';
    return `<img src="images/${rec.local}" width="${size}" alt="" loading="lazy">`;
  }
  mediaExists(name) {
    const rec = this.media.files?.[name];
    return !!(rec && !rec.missing && rec.local);
  }
}

export function hrefFor(rec) { return rec.slug + '.html'; }

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** sidebar + top navigation, shared by every page */
export function navHtml(reg, current) {
  const used = new Set();
  const sections = [];
  for (const hub of HUBS) {
    const items = [];
    for (const [title, zhLabel] of hub.items) {
      const rec = reg.resolve(title);
      if (!rec || used.has(rec.title)) continue;
      used.add(rec.title);
      items.push({ rec, label: zhLabel || rec.titleZh });
    }
    if (items.length) sections.push({ hub, items });
  }
  // everything else, grouped by category
  const rest = [...reg.pages.values()].filter((r) => !used.has(r.title));
  const byCat = new Map();
  for (const r of rest) {
    const cat = (r.cats || [])[0] || '其他页面';
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat).push(r);
  }
  const CAT_ZH = {
    Countries: '国家', 'Countries with unique National Focus trees': '拥有独特国策树的国家',
    'Releasable countries': '可释放国家', Military: '军事', Units: '单位', Technology: '科技',
    Diplomacy: '外交', Ideas: '理念', Events: '事件', Decisions: '决议', Modding: '模组制作',
    Achievements: '成就', Patches: '补丁', 'Game concepts': '游戏概念', Interface: '界面',
    'National focus trees': '国策树', Lists: '列表', Guides: '指南', Map: '地图',
    'Hearts of Iron 4': '钢铁雄心 IV', Wiki: '维基', Timeless: '常青页面',
  };
  const extraCats = [...byCat.entries()].sort((a, b) => b[1].length - a[1].length);

  const sidebar = sections.map(({ hub, items }) => `
      <h3>${esc(hub.zh)}</h3>
      <ul>${items.map((it) => `<li><a href="${hrefFor(it.rec)}"${current === it.rec.title ? ' class="cur"' : ''}>${esc(it.label)}</a></li>`).join('')}</ul>`).join('') +
    `
      <h3>更多页面</h3>
      <ul>
        <li><a href="all-pages.html"${current === '__all__' ? ' class="cur"' : ''}>全部页面索引（${reg.pages.size}）</a></li>
        <li><a href="search.html">搜索</a></li>
        <li><a href="glossary.html">中英术语对照表</a></li>
      </ul>` +
    extraCats.slice(0, 14).map(([cat, list]) => `
      <h3>${esc(CAT_ZH[cat] || cat)}（${list.length}）</h3>
      <ul>${list.sort((a, b) => a.titleZh.localeCompare(b.titleZh, 'zh')).slice(0, 40).map((r) =>
        `<li><a href="${hrefFor(r)}"${current === r.title ? ' class="cur"' : ''}>${esc(r.titleZh)}</a></li>`).join('')}</ul>`).join('');

  const topnav = sections.map((s) => `<a href="index.html#${s.hub.id}">${esc(s.hub.zh)}</a>`).join('') +
    `<a href="all-pages.html">全部页面</a><a href="glossary.html">术语表</a>`;

  return { sidebar, topnav, sections };
}
