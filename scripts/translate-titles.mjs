// scripts/translate-titles.mjs — build data/batches/titles.zh.json from the title list.
import fs from 'node:fs';
const dir = 'C:/Users/Atom/Documents/GeneralWS/hoi4-zh-wiki/data/batches/';
const src = JSON.parse(fs.readFileSync(dir + 'titles.json', 'utf8'));

const T = {}; // exact english title -> zh
const add = (en, zh) => { T[en] = zh; };

// ---- countries & political entities ----
const C = {
  'Albania': '阿尔巴尼亚', 'Afghanistan': '阿富汗', 'Argentina': '阿根廷', 'Australia': '澳大利亚',
  'Austria': '奥地利', 'Belgium': '比利时', 'Belgian Congo': '比属刚果', 'Brazil': '巴西',
  'Bulgaria': '保加利亚', 'Canada': '加拿大', 'Chile': '智利', 'China': '中国',
  'Chinese Soviet Republic': '中华苏维埃共和国', 'Colombia': '哥伦比亚', 'Costa Rica': '哥斯达黎加',
  'Croatia': '克罗地亚', 'Cuba': '古巴', 'Czechoslovakia': '捷克斯洛伐克', 'Denmark': '丹麦',
  'Dominican Republic': '多米尼加', 'Ecuador': '厄瓜多尔', 'El Salvador': '萨尔瓦多',
  'Estonia': '爱沙尼亚', 'Ethiopia': '埃塞俄比亚', 'Finland': '芬兰', 'France': '法国',
  'German Reich': '德意志国', 'Germany': '德国', 'Greece': '希腊', 'Guatemala': '危地马拉',
  'Haiti': '海地', 'Honduras': '洪都拉斯', 'Hungary': '匈牙利', 'Iceland': '冰岛', 'India': '印度',
  'British Raj': '英属印度', 'Indonesia': '印度尼西亚', 'Dutch East Indies': '荷属东印度',
  'Iran': '伊朗', 'Iraq': '伊拉克', 'Ireland': '爱尔兰', 'Italy': '意大利', 'Japan': '日本',
  'Japanese Empire': '大日本帝国', 'Latvia': '拉脱维亚', 'Liberia': '利比里亚', 'Lithuania': '立陶宛',
  'Luxembourg': '卢森堡', 'Manchukuo': '满洲国', 'Mengkukuo': '蒙疆联合自治政府', 'Mexico': '墨西哥',
  'Mongolia': '蒙古', 'Netherlands': '荷兰', 'New Zealand': '新西兰', 'Nicaragua': '尼加拉瓜',
  'Norway': '挪威', 'Oman': '阿曼', 'Panama': '巴拿马', 'Paraguay': '巴拉圭', 'Peru': '秘鲁',
  'Philippines': '菲律宾', 'Poland': '波兰', 'Portugal': '葡萄牙', 'Romania': '罗马尼亚',
  'Republican Spain': '共和西班牙', 'Nationalist Spain': '国民西班牙', 'Spain': '西班牙',
  'Siam': '暹罗', 'South Africa': '南非', 'Soviet Union': '苏联', 'Sweden': '瑞典',
  'Switzerland': '瑞士', 'Turkey': '土耳其', 'United Kingdom': '英国', 'United States': '美国',
  'Uruguay': '乌拉圭', 'Venezuela': '委内瑞拉', 'Yugoslavia': '南斯拉夫', 'Wales': '威尔士',
  'Scotland': '苏格兰', 'Kingdom of Burundi': '布隆迪王国', 'United Netherlands': '尼德兰联合王国',
  'Guinea': '几内亚', 'Congo': '刚果', 'Formable nations': '可成立国家', 'Releasable countries': '可释放国家',
  'Amerindian Nations': '美洲原住民国家', 'Warlords': '军阀', 'Communist China': '中国共产党',
};
for (const [en, zh] of Object.entries(C)) { add(en, zh); add(en + ' national focus tree', zh + '国策树'); add(en + ' events', zh + '事件'); add(en + ' decisions', zh + '决议'); add(en + ' missions', zh + '任务'); }

// ---- core gameplay ----
Object.entries({
  "Beginner's guide": '新手入门指南', 'User interface': '用户界面', 'Mechanics': '游戏机制',
  'Console commands': '控制台指令', 'Hotkeys': '快捷键', 'Countries': '国家', 'Tutorial videos': '教学视频',
  'Government': '政府', 'Political parties and leaders': '政党与领导人',
  'Political parties and leaders (releasable countries)': '政党与领导人（可释放国家）',
  'Ideas': '理念', 'Officer corps': '军官团', 'National focus': '国家焦点', 'Research': '科研',
  'Construction': '建造', 'Production': '生产', 'Events': '事件', 'Decisions': '决议',
  'Diplomacy': '外交', 'Puppet': '傀儡国', 'Occupation': '占领', 'World tension': '世界紧张度',
  'Intelligence agency': '情报机构', 'Trade': '贸易', 'Warfare': '战争', 'Combat tactics': '战斗战术',
  'Logistics': '后勤', 'Terrain': '地形', 'Weather': '天气', 'Battle plan': '作战计划',
  'Army planner': '陆军编制器', 'Command group': '集团军', 'Division': '师', 'Land warfare': '陆战',
  'Naval warfare': '海战', 'Air warfare': '空战', 'Land units': '陆军单位', 'Naval units': '海军单位',
  'Air units': '空军单位', 'Land units by year': '陆军单位（按年份）', 'Land units by unit': '陆军单位（按兵种）',
  'Modding': '模组制作', 'Mods': '模组', 'Jargon': '术语表', 'Developer diaries': '开发日志',
  'Patches': '补丁', 'Downloadable content': '可下载内容', 'Achievements': '成就',
  'Technology': '科技', 'Land doctrine': '陆军学说', 'Naval doctrine': '海军学说', 'Air doctrine': '空军学说',
  'Infantry technology': '步兵科技', 'Artillery technology': '火炮科技', 'Armor technology': '装甲科技',
  'Support companies technology': '支援连科技', 'Naval technology': '海军科技', 'Air technology': '空军科技',
  'Equipment': '装备', 'Ship designer': '舰船设计', 'Tank designer': '坦克设计',
  'Aircraft designer': '飞机设计', 'Special project': '特殊项目', 'Custom difficulty': '自定义难度',
  'National spirit': '国家精神', 'Country leader traits': '国家领导人特质', 'Commander trait': '指挥官特质',
  'List of commanders': '指挥官列表', 'List of commanders (base game)': '指挥官列表（原版）',
  'List of Factions': '阵营列表', 'Faction': '阵营', 'Intel': '情报', 'Ace pilots events': '王牌飞行员事件',
  'Naval battle': '海战', 'Attrition and accidents': '损耗与事故', 'Attrition': '损耗',
  'Encirclement': '包围', 'Air combat': '空战', 'Air missions': '空中任务', 'Stability': '稳定度',
  'War support': '战争支持度', 'Manpower': '人力', 'Lend-Lease': '租借', 'Volunteers': '志愿军',
  'Expeditionary forces': '远征军', 'MEFO Bills': '梅福券', 'Historical ship variants': '历史舰船型号',
  'List of default ship variants': '默认舰船型号列表', 'List of political advisors': '政治顾问列表',
  'List of industrial concerns': '工业集团列表', 'List of materiel designers': '装备设计商列表',
  'List of aircraft designers': '飞机设计商列表', 'List of tank designers': '坦克设计商列表',
  'List of ship designers': '舰船设计商列表', 'List of military chiefs': '军事首脑列表',
  'List of military high command': '最高统帅部列表', 'List of design companies': '设计公司列表',
  'List of modifiers': '修正项列表', 'List of provinces': '省份列表', 'List of states': '州列表',
  'Defines': '定义文件', 'Effect': '效果', 'Triggers': '触发器', 'Modifiers': '修正项',
  'Data structures': '数据结构', 'Scopes': '作用域', 'Localisation': '本地化文件',
  'Console': '控制台', 'Interface': '界面', 'Map': '地图', 'Units': '单位', 'Unit': '单位',
  'Military': '军事', 'Guides': '指南', 'Ideas (releasable countries)': '理念（可释放国家）',
  'Career profile': '生涯档案', 'The Munich Disagreement': '慕尼黑分歧',
  'Arms Against Tyranny': '反抗暴政', 'Battle for the Bosporus': '博斯普鲁斯之战',
  'By Blood Alone': '唯有鲜血', 'Death or Dishonor': '死亡或耻辱', 'Graveyard of Empires': '帝国坟场',
  'La Résistance': '抵抗运动', 'Man the Guns': '全民持枪', 'No Compromise, No Surrender': '不妥协，不投降',
  'No Step Back': '一步不退', 'Peace For Our Time': '我们时代的和平', 'Together for Victory': '共赴胜利',
  'Trial of Allegiance': '效忠审判', 'Walking the Tiger': '与虎同行', 'Waking the Tiger': '唤醒猛虎',
  'Thunder At Our Gates': '雷霆临门', 'Götterdämmerung': '诸神黄昏', 'Warships of the Pacific': '太平洋战舰',
  'Paradox': 'Paradox', 'Hearts of Iron IV': '钢铁雄心 IV', 'Victoria 2 to Hearts of Iron 4 Converter': '维多利亚 2 转钢铁雄心 4 转换器',
  'Victoria 2 to Hearts of Iron IV converter': '维多利亚 2 转钢铁雄心 4 转换器',
}).forEach(([en, zh]) => add(en, zh));

// ---- generic suffix patterns ----
const PATTERNS = [
  [/^(.+) national focus tree$/, (m) => m[1] + '国策树'],
  [/^(.+) events$/, (m) => m[1] + '事件'],
  [/^(.+) decisions$/, (m) => m[1] + '决议'],
  [/^(.+) missions$/, (m) => m[1] + '任务'],
  [/^(.+) shared decisions$/, (m) => m[1] + '共用决议'],
  [/^(.+) modding$/, (m) => m[1] + '模组制作'],
  [/^(.+) technology \(Basic\)$/, (m) => m[1] + '科技（基础版）'],
  [/^(.+) technology$/, (m) => m[1] + '科技'],
  [/^Patch (.+)$/, (m) => '补丁 ' + m[1]],
  [/^List of (.+)$/, (m) => m[1] + '列表'],
  [/^(.+) \(disambiguation\)$/, (m) => m[1] + '（消歧义）'],
  [/^(.+) designers$/, (m) => m[1] + '设计商'],
];

const items = [];
const missing = [];
for (const u of src.units) {
  const en = u.en;
  let zh = T[en];
  if (!zh) for (const [re, fn] of PATTERNS) { const m = re.exec(en); if (m) { zh = fn(m); break; } }
  if (!zh) {
    // achievements and unknown proper nouns: keep as-is (names are user-visible titles in-game)
    zh = en;
    missing.push(en);
  }
  items.push({ k: u.k, zh });
}
fs.writeFileSync(dir + 'titles.zh.json', JSON.stringify({ batch: 'titles', items }, null, 1));
console.log('titles:', items.length, '| translated:', items.length - missing.length, '| kept english:', missing.length);
fs.writeFileSync(dir + 'titles-missing.txt', missing.join('\n'));
console.log(missing.slice(0, 60).join(' | '));
