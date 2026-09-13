// Compositional translator for short wiki labels: a curated phrase dictionary plus
// word-level fallback, applied only where it is safe (short strings, no sentence
// punctuation, placeholders preserved). Longer prose is left for human/LLM batches.
const PHRASES = [
  // equipment & designers
  ['Military Industrial Organization', '军工组织'], ['Research Bonus', '科研加成'],
  ['Production efficiency growth', '生产效率增长'], ['Production efficiency cap', '生产效率上限'],
  ['Production efficiency', '生产效率'], ['Production output', '产出'], ['Production cost', '生产成本'],
  ['Production resource need', '生产资源需求'], ['Resource Gain Efficiency', '资源获取效率'],
  ['Lack of Resources Penalty', '资源匮乏惩罚'], ['Max Factories in a State', '单州最大工厂数'],
  ['Factory Energy Consumption', '工厂能源消耗'], ['Factory construction speed', '工厂建造速度'],
  ['Factory conversion cost', '工厂转换花费'], ['Factory output', '工厂产出'],
  ['Dockyard output', '船坞产出'], ['Consumer Goods', '消费品'],
  ['Recruitable population', '可征召人口'], ['Resources to market', '出口到市场的资源'],
  ['Electronics Research Speed', '电子科研速度'], ['Industrial Research Speed', '工业科研速度'],
  ['Artillery Research Speed', '火炮科研速度'], ['Industry Research Speed', '工业科研速度'],
  ['Research Speed', '科研速度'], ['Research speed', '科研速度'],
  // combat stats
  ['Soft attack', '软攻'], ['Hard attack', '硬攻'], ['Air Attack', '对空攻击'],
  ['Air Defence', '对空防御'], ['Air Defense', '对空防御'], ['Naval Attack', '对海攻击'],
  ['Naval Targeting', '对海瞄准'], ['Surface detection', '水面探测'], ['Sub detection', '潜艇探测'],
  ['Division Attack', '师攻击'], ['Division Defense', '师防御'], ['Combat width', '战斗宽度'],
  ['Breakthrough', '突破'], ['Piercing', '穿甲'], ['Reliability', '可靠性'], ['Hardness', '硬度'],
  ['Armor', '装甲'], ['Organisation', '组织度'], ['Organization', '组织度'],
  ['Attrition', '损耗'], ['Suppression', '镇压'], ['Reconnaissance', '侦察'],
  ['Entrenchment', '构筑工事'], ['Initiative', '主动性'], ['Planning', '计划'],
  ['Fuel Usage', '燃料消耗'], ['Fuel capacity', '燃料容量'], ['Fuel gain', '燃料获取'],
  ['Air Superiority', '空中优势'], ['Air superiority', '空中优势'], ['Naval supremacy', '海上优势'],
  ['Convoy defense', '护航效率'], ['Convoy raiding', '破交作战'], ['Escort efficiency', '护航效率'],
  ['Screening efficiency', '屏护效率'], ['Minesweeping', '扫雷'], ['Mine laying', '布雷'],
  // laws & politics
  ['Conscription Law', '征兵法案'], ['Trade Law', '贸易法案'], ['Economy Law', '经济法案'],
  ['Recruitable Population', '可征召人口'], ['Political Power', '政治点数'],
  ['Command Power', '指挥点数'], ['Political power gain', '政治点数获取'],
  ['Stability', '稳定度'], ['War support', '战争支持度'], ['World tension', '世界紧张度'],
  ['Ideology', '意识形态'], ['Popularity', '支持率'], ['Elections', '选举'],
  // nation & diplomacy
  ['War goal', '战争目标'], ['Justify War goal time', '制造战争目标时间'],
  ['Annex cost', '吞并花费'], ['Puppet cost', '傀儡化花费'],
  ['Guarantee', '保障独立'], ['Non-Aggression Pact', '互不侵犯条约'],
  ['Military Access', '军事通行权'], ['Expeditionary Force', '远征军'],
  ['Lend-Lease', '租借'], ['Volunteers', '志愿军'], ['Faction', '阵营'],
  ['Compliance', '顺从度'], ['Resistance', '抵抗度'], ['Resistance target', '抵抗度目标'],
  ['Compliance gain', '顺从度获取'], ['Occupation law', '占领法案'], ['Garrison law', '驻军法案'],
  // units
  ['Infantry', '步兵'], ['Motorized', '摩托化'], ['Mechanized', '机械化'],
  ['Armored', '装甲'], ['Cavalry', '骑兵'], ['Militia', '民兵'],
  ['Artillery', '火炮'], ['Anti-Air', '防空'], ['Anti-Tank', '反坦克'],
  ['Anti-air', '防空'], ['Anti-tank', '反坦克'], ['Rocket Artillery', '火箭炮'],
  ['Self-Propelled', '自行'], ['Tank Destroyer', '坦克歼击车'],
  ['Super Heavy', '超重型'], ['Heavy', '重型'], ['Medium', '中型'], ['Light', '轻型'],
  ['Amphibious', '两栖'], ['Airborne', '空降'], ['Paratrooper', '伞兵'],
  ['Marine', '海军陆战队'], ['Mountaineer', '山地兵'], ['Garrison', '驻军'],
  ['Engineer Company', '工兵连'], ['Recon Company', '侦察连'], ['Military Police', '军事警察'],
  ['Field Hospital', '野战医院'], ['Maintenance Company', '维修连'], ['Logistics Company', '后勤连'],
  ['Signal Company', '通信连'], ['Support Artillery', '支援火炮'],
  // buildings
  ['Civilian Factories', '民用工厂'], ['Military Factories', '军用工厂'],
  ['Naval Dockyards', '海军船坞'], ['Building Slots', '建筑槽位'], ['Building slot', '建筑槽位'],
  ['Infrastructure', '基础设施'], ['Air base', '空军基地'], ['Naval base', '海军基地'],
  ['Radar station', '雷达站'], ['Supply hub', '补给中心'], ['Fuel silo', '燃料储罐'],
  ['Synthetic refinery', '合成炼油厂'], ['Refinery', '炼油厂'], ['Coastal fort', '海岸炮台'],
  ['Land fort', '陆地要塞'], ['Victory points', '胜利点'], ['Railway', '铁路'],
  // tech & research
  ['Research categories', '研究类别'], ['Affected equipment', '受影响装备'],
  ['Mutually exclusive with', '互斥'], ['Requires all of the following', '需要以下全部'],
  ['Requires one of the following', '需要以下之一'], ['Only for', '仅适用于'],
  ['Always available', '始终可用'], ['Bonuses', '加成'], ['Requirements', '需求'],
  ['Category', '类别'], ['Trait', '特质'], ['Traits', '特质'], ['Skill', '技能'],
  // generic table words
  ['Country name', '国家名称'], ['Capital', '首都'], ['Population', '人口'],
  ['State', '州'], ['Province', '省份'], ['Region', '地区'], ['Strategy', '战略'],
  ['Type', '类型'], ['Name', '名称'], ['Value', '数值'], ['Effect', '效果'],
  ['Description', '说明'], ['Notes', '注释'], ['Total', '合计'], ['Cost', '花费'],
  ['Time', '时间'], ['Date', '日期'], ['Event', '事件'], ['Decision', '决议'],
  ['Mission', '任务'], ['Focus', '国策'], ['Doctrine', '学说'], ['Technology', '科技'],
  // ---- equipment, ships, aircraft, techs ----
  ['Small Arms', '轻武器'], ['Infantry Weapons', '步兵武器'], ['Infantry Equipment', '步兵装备'],
  ['Support Equipment', '支援装备'], ['Motorized Equipment', '摩托化装备'],
  ['Mechanized Equipment', '机械化装备'], ['Armored Equipment', '装甲装备'],
  ['Towed Artillery', '牵引火炮'], ['Towed Anti-Air', '牵引防空炮'], ['Towed Anti-Tank', '牵引反坦克炮'],
  ['Towed Rocket Artillery', '牵引火箭炮'], ['Rocket Artillery', '火箭炮'],
  ['Anti-Air Gun', '高射炮'], ['Anti-Tank Gun', '反坦克炮'], ['Field Gun', '野战炮'],
  ['Machine Gun', '机枪'], ['Heavy Machine Gun', '重机枪'], ['Submachine Gun', '冲锋枪'],
  ['Rifle', '步枪'], ['Semi-Auto Rifle', '半自动步枪'], ['Assault Rifle', '突击步枪'],
  ['Bolt-Action Rifle', '栓动步枪'], ['Gun', '火炮'], ['Ammunition', '弹药'],
  ['Capital Ship', '主力舰'], ['Carrier', '航空母舰'], ['Battleship', '战列舰'],
  ['Battlecruiser', '战列巡洋舰'], ['Heavy Cruiser', '重巡洋舰'], ['Light Cruiser', '轻巡洋舰'],
  ['Destroyer', '驱逐舰'], ['Submarine', '潜艇'], ['Convoy', '运输船队'],
  ['Screens', '护卫舰'], ['Screen', '护卫舰'], ['Escort', '护航舰'], ['Warship', '军舰'],
  ['Fighter', '战斗机'], ['Naval Bomber', '海军轰炸机'], ['Close Air Support', '近距空中支援'],
  ['Tactical Bomber', '战术轰炸机'], ['Strategic Bomber', '战略轰炸机'],
  ['Carrier Fighter', '舰载战斗机'], ['Carrier Bomber', '舰载轰炸机'],
  ['Transport Plane', '运输机'], ['Recon Plane', '侦察机'], ['Maritime Patrol', '海上巡逻机'],
  ['Heavy Fighter', '重型战斗机'], ['Jet Fighter', '喷气式战斗机'], ['Jet Engine', '喷气发动机'],
  ['Rocket Engine', '火箭发动机'], ['Engine', '发动机'], ['Airframe', '机体'],
  ['Tank', '坦克'], ['Light Tank', '轻型坦克'], ['Medium Tank', '中型坦克'],
  ['Heavy Tank', '重型坦克'], ['Super Heavy Tank', '超重型坦克'], ['Modern Tank', '现代坦克'],
  ['Amphibious Tank', '两栖坦克'], ['Main Battle Tank', '主战坦克'],
  ['Self-Propelled Artillery', '自行火炮'], ['Self-Propelled Anti-Air', '自行防空炮'],
  ['Self-Propelled Anti-Tank', '自行反坦克炮'], ['Tank Destroyer', '坦克歼击车'],
  ['Motorized Rocket Artillery', '摩托化火箭炮'], ['Armored Car', '装甲车'],
  ['Half-Track', '半履带车'], ['Truck', '卡车'], ['Tractor', '牵引车'],
  ['Infantry Support', '步兵支援'], ['Combat Engineer', '战斗工兵'], ['Assault Engineer', '突击工兵'],
  ['Paratrooper', '伞兵'], ['Airborne Division', '空降师'], ['Marine Division', '陆战师'],
  ['Mountain Division', '山地师'], ['Cavalry Division', '骑兵师'], ['Armored Division', '装甲师'],
  ['Motorized Division', '摩托化师'], ['Infantry Division', '步兵师'], ['Garrison Division', '守备师'],
  ['Panzer Division', '装甲师'], ['Volunteer', '志愿军'], ['Militia Division', '民兵师'],
  // ---- traits & advisors ----
  ['Field Marshal', '陆军元帅'], ['General', '上将'], ['Admiral', '海军上将'],
  ['Army Chief', '陆军长官'], ['Navy Chief', '海军长官'], ['Air Chief', '空军长官'],
  ['Chief of Staff', '总参谋长'], ['Chief of Army', '陆军总长'], ['Chief of Navy', '海军总长'],
  ['Chief of Air Force', '空军总长'], ['Head of Government', '政府首脑'],
  ['Head of State', '国家元首'], ['Foreign Minister', '外交部长'], ['Economy Minister', '经济部长'],
  ['Interior Minister', '内政部长'], ['Defence Minister', '国防部长'],
  ['Political Advisor', '政治顾问'], ['Political Adviser', '政治顾问'],
  ['Army Reformer', '陆军改革者'], ['Naval Reformer', '海军改革者'],
  ['Air Reformer', '空军改革者'], ['Military Theorist', '军事理论家'],
  ['Naval Theorist', '海军理论家'], ['Air Warfare Theorist', '空战理论家'],
  ['Infantry Expert', '步兵专家'], ['Armor Expert', '装甲专家'], ['Artillery Expert', '火炮专家'],
  ['Trait', '特质'], ['Traits', '特质'], ['Skill', '技能'], ['Attack', '攻击'], ['Defense', '防御'],
  ['Bonus', '加成'], ['Penalty', '惩罚'], ['Modifier', '修正'], ['Modifiers', '修正'],
  // ---- technologies & research ----
  ['Industry', '工业'], ['Construction', '建造'], ['Excavation', '采掘'],
  ['Concentrated Industry', '集中工业'], ['Dispersed Industry', '分散工业'],
  ['Machine Tools', '机床'], ['Assembly Line', '流水线'], ['Excavation Technology', '采掘科技'],
  ['Synthetic Oil', '合成石油'], ['Fuel Refining', '燃料精炼'], ['Nuclear', '核能'],
  ['Atomic Research', '原子研究'], ['Computing', '计算机'], ['Radio', '无线电'],
  ['Radar', '雷达'], ['Decryption', '解密'], ['Encryption', '加密'],
  ['Land Doctrine', '陆军学说'], ['Naval Doctrine', '海军学说'], ['Air Doctrine', '空军学说'],
  ['Mobile Warfare', '机动战'], ['Superior Firepower', '优势火力'], ['Grand Battleplan', '大规模作战计划'],
  ['Mass Assault', '人海突击'], ['Trench Warfare', '堑壕战'],
  ['Base Strike', '基地打击'], ['Trade Interdiction', '贸易封锁'], ['Fleet in Being', '存在舰队'],
  ['Strategic Destruction', '战略毁灭'], ['Operational Integrity', '作战完整性'],
  ['Battlefield Support', '战场支援'], ['Air Superiority Doctrine', '制空权学说'],
  // ---- article boilerplate (appears on hundreds of pages) ----
  ['Main article', '主条目'], ['See also', '参见'], ['Note', '注'], ['Notes', '注释'],
  ['For more information', '更多信息'], ['For further information', '更多信息'],
  ['Further information', '更多信息'], ['For example', '例如'], ['Example', '示例'],
  ['From game file', '来自游戏文件'], ['References', '参考文献'], ['External links', '外部链接'],
  ['Main page', '首页'], ['Overview', '概述'],
  // ---- misc ----
  ['Main article', '主条目'], ['See also', '参见'], ['References', '参考文献'],
  ['External links', '外部链接'], ['Notes and references', '注释与参考文献'],
  ['Statistics', '统计数据'], ['Overview', '概述'], ['Example', '示例'], ['Examples', '示例'],
  ['Decisions', '决议'], ['Events', '事件'], ['Missions', '任务'], ['Ideas', '理念'],
  ['Advisors', '顾问'], ['Generals', '将领'], ['Leaders', '领袖'], ['Characters', '角色'],
  ['Equipment list', '装备列表'], ['Unit list', '单位列表'], ['Full list', '完整列表'],
  ['Available from', '可用时间'], ['Available until', '失效时间'], ['Introduced', '引入版本'],
  ['Version', '版本'], ['Patch', '补丁'], ['Update', '更新'], ['Release date', '发布日期'],
];

const WORDS = [
  ['Attack', '攻击'], ['Defense', '防御'], ['Defence', '防御'], ['Speed', '速度'],
  ['Efficiency', '效率'], ['Bonus', '加成'], ['Penalty', '惩罚'], ['Cost', '花费'],
  ['Gain', '获取'], ['Growth', '增长'], ['Cap', '上限'], ['Max', '最大'],
  ['Research', '科研'], ['Production', '生产'], ['Factory', '工厂'], ['Dockyard', '船坞'],
  ['Military', '军事'], ['Civilian', '民用'], ['Naval', '海军'], ['Air', '空军'],
  ['Army', '陆军'], ['Division', '师'], ['Battalion', '营'], ['Company', '连'],
  ['Regiment', '团'], ['Brigade', '旅'], ['Unit', '单位'], ['Equipment', '装备'],
  ['Manpower', '人力'], ['Fuel', '燃料'], ['Supply', '补给'], ['Resources', '资源'],
  ['Resource', '资源'], ['Industry', '工业'], ['Industrial', '工业'], ['Electronics', '电子'],
  ['Artillery', '火炮'], ['Infantry', '步兵'], ['Armor', '装甲'], ['Armour', '装甲'],
  ['Reliability', '可靠性'], ['Breakthrough', '突破'], ['Piercing', '穿甲'],
  ['Organization', '组织度'], ['Organisation', '组织度'], ['Stability', '稳定度'],
  ['Compliance', '顺从度'], ['Resistance', '抵抗度'], ['Autonomy', '自治度'],
  ['Tension', '紧张度'], ['Support', '支持'], ['War', '战争'], ['Peace', '和平'],
  ['State', '州'], ['Province', '省份'], ['Region', '地区'], ['Terrain', '地形'],
  ['Weather', '天气'], ['Climate', '气候'], ['Nation', '国家'], ['Country', '国家'],
  ['Faction', '阵营'], ['Puppet', '傀儡国'], ['Subject', '附属国'], ['Overlord', '宗主国'],
  ['Intelligence', '情报'], ['Operative', '特工'], ['Network', '网络'],
  ['Government', '政府'], ['Party', '党派'], ['Leader', '领袖'], ['Advisor', '顾问'],
  ['Designer', '设计商'], ['Theorist', '理论家'], ['Chief', '长官'],
  ['Available', '可用'], ['Possible', '可用'], ['Required', '需要'], ['Total', '合计'],
  ['Initial', '初始'], ['Base', '基础'], ['Default', '默认'], ['Current', '当前'],
  ['Level', '等级'], ['Tier', '层级'], ['Size', '规模'], ['Width', '宽度'],
];

const preserve = (s) => !/[.!?;]\s/.test(s) && s.length <= 48;
const KEEP = /^(?:[A-Z0-9_]{2,}|[A-Za-z0-9_.\-+%/]*\d[A-Za-z0-9_.\-+%/]*)$/;
const hasLatin = (s) => /[A-Za-z]{2,}/.test(s.replace(/⟦\d+⟧/g, ''));

/** longest-phrase lookup that only matches a whole (sub)label */
function phraseFor(text) {
  const t = text.trim();
  for (const [e, z] of PHRASES) if (t === e) return z;
  return null;
}

export function translateShort(en) {
  const tokens = [...String(en).matchAll(/⟦\d+⟧/g)].map((m) => m[0]);
  const stripped = en.replace(/⟦\d+⟧/g, '').trim();
  if (!stripped || !/[A-Za-z]/.test(stripped)) return null;
  if (!preserve(stripped)) return null;
  if (KEEP.test(stripped)) return null;

  // 1. "Label: ⟦0⟧" or "Label: some title"  ->  "标签：⟦0⟧" / "标签：some title"
  let m = /^([A-Za-z][A-Za-z ]{2,30}):\s*(.+)$/.exec(en.trim());
  if (m && tokens.length <= 1) {
    const label = phraseFor(m[1]);
    if (label) return label + '：' + m[2];
  }
  // 2. "⟦0⟧ Label"  ->  "⟦0⟧ 标签"
  m = /^((?:⟦\d+⟧\s*)+)(.+)$/.exec(en.trim());
  if (m && tokens.length) {
    const label = phraseFor(m[2]);
    if (label) return tokens.join('') + ' ' + label;
  }
  // 3. the whole string is a known label
  const whole = phraseFor(en.trim());
  if (whole) return whole;
  return null;
}

function withTokens(zh, tokens) {
  if (!tokens.length) return zh;
  return tokens.join('') + ' ' + zh;
}

/** Word-level fallback: every word must be known and fully Chinese (never guesses). */
export function translateWords(en) {
  const stripped = en.replace(/⟦\d+⟧/g, '').trim();
  if (!stripped || stripped.length > 40 || !preserve(stripped)) return null;
  if (/[.!?;:,]/.test(stripped)) return null;
  const parts = stripped.split(/\s+/);
  if (!parts.length || parts.length > 5) return null;
  const out = [];
  for (const p of parts) {
    const c = p.replace(/[^A-Za-z'\-]/g, '');
    if (!c) { out.push(p); continue; }
    const hit = WORDS.find(([w]) => w.toLowerCase() === c.toLowerCase());
    if (!hit) return null;
    out.push(p.replace(c, hit[1]));
  }
  const zh = out.join('');
  if (hasLatin(zh)) return null;
  return withTokens(zh, [...en.matchAll(/⟦\d+⟧/g)].map((x) => x[0]));
}

export const DICT_SIZE = { phrases: PHRASES.length, words: WORDS.length };
