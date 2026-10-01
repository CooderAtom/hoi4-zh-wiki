# 钢铁雄心4 中文离线维基 —— 会话交接提示词

把下面「提示词正文」整段复制给新会话的第一个消息。

---

## 提示词正文（复制这一段）

```
继续做「钢铁雄心4 简体中文离线维基」项目。项目根目录：
D:\code\hoi4-zh-wiki

【总目标】
把 hoi4.paradoxwikis.com 上所有游戏玩法相关内容（含相关页面如 Getting started、
State affairs 等）完整抓取、连同图片图标一起本地化，翻译为简体中文，产出一个
可离线点击浏览的静态站点 + 中文全文搜索。不属于本游戏的内容不入库。国策树
（focus tree）页面与 /Scriptoutput 页面按既定决定排除；模组制作/模组/开发日志
按用户决定保留。

【当前进度（2026-09 实测，勿凭记忆改写）】
- 正文完成度 55.4%：已译 4,803,366 / 8,669,373 字符（分母来自 tools/08c-real-coverage.mjs）
- 完全译完（pct>=0.995）376 页；>=80% 共 414 页；共 655 页（生成 HTML 660 个）
- 翻译记忆库 data/tm.json 共 42,243 条
- 站点 site/ 可离线浏览：内部链接 439,662，断链 0；图片引用 146,987，缺失 0
- 图片：磁盘 9,326 个；大小写不符 0；真正缺失 0
- 真未译：3,833,104 字符 / 44,651 单元，分布在 269 页；结构性残留 32,903 字符
- 永不为 100% 的页面 24 个；全站理论完成度上限 99.6%
- banned-pattern 当前 105（只能减不能增）
- 最近完成：Military industrial organization（CONT.b106，102 条）、
  Fuel（CONT.b107，29 条），两页 08b 未译单元均已归零

【本轮从哪继续】
⚠️ 重建链已失效（见下一节），现在的循环是「导出 → 翻译 → 合并 → 用
apply-tm-to-page 回填该页」。优先挑「一批就能译完一页」的：
  node tools/08c-real-coverage.mjs --top 40     # 还剩哪些页、各剩多少
  node tools/scratch/hub-effort.mjs             # 入口页按「几批能译完」排序

【⚠️ 先读：整站重建链已失效（2026-09 实测）】
- cache/pages/（约 1 GB 原始抓取缓存，被 .gitignore 排除）已不存在，cache/site-before 也没了；
  磁盘与回收站都没有备份。
- wiki 现在对所有请求返回 HTTP 427（hoi4.paradoxwikis.com 与 paradoxwikis.com 都是，
  换浏览器 UA 无效），所以也无法重抓。example.com 正常，确认不是本机断网。
- 因此 node tools/07-build.mjs 直接报 ENOENT: no such file or directory, scandir 'cache\pages'，
  整站重建暂时不可用。
- 替代做法：把 TM 逐页回填进已生成的 HTML
    node tools/scratch/apply-tm-to-page.mjs "<页面标题>"      # 加 --dry 只看不改
  它用项目自己的渲染器（tools/units.mjs 的 applyTranslations）处理 <main> 区域，
  链接/图标/上标全部保留；改前会在 cache/refsite/<页>.preapply.html 留一份备份。
  之所以必须用渲染器而不是逐字面量替换：段落里的英文词可能被包在链接元素里，
  而旧构建还可能把段落中间的小连接词文本节点单独译成中文（"and"→"和"），
  使段落自身的 key 与 TM 不再相等。apply-tm-to-page 会先把这类文本节点还原成
  英文源文，再交给渲染器重建。
- wiki 恢复后可按页脚记录的版本号重建全部缓存（保证 unit key 不变）：
    node tools/scratch/refetch-by-revid.mjs --probe    # 先探测连通性，不写盘
    node tools/scratch/refetch-by-revid.mjs            # 按 _revids.txt 逐页重抓
  _revids.txt 由各页页脚「原站版本号」生成。

【每页固定流程（务必按序）】
1. Remove-Item "data/pageblocks/<页面名>.pr0000.json" -Force -ErrorAction SilentlyContinue
   —— 只删本页的导出。仓库里跟踪着别的页若干 pr0000.json，别用通配符一把删掉。
2. node tools/10d-export-prose.mjs "<页面标题>"
   —— 绝对不要加 --limit！默认 130，加了会静默截断。
3. node tools/scratch/show.mjs "<页面标题>"
   —— 只翻译屏幕上确实出现过的 key。⚠️若返回 NO MATCH，改用
      node --input-type=module 直接读 data/pageblocks/*.pr0000.json 打印
      key + token 序列 + 英文全文，再动笔。
4. 写 data/pageblocks/CONT.bNN.zh.json，
   格式 { "page": "<真实页面标题>", "batch": "...", "items": [ {"k":"...","zh":"..."} ] }
   ⚠️ "page" 必须填真实页面标题，绝不能填 "Wave2 batch N" 这类自造标签，
      否则导出的去重过滤（按 page 精确匹配）会失效、条目被反复重复导出。
5. node tools/10e-token-check.mjs CONT.bNN.zh.json     ← 必须 ok
6. node tools/10c-dupkey-check.mjs CONT.bNN.zh.json    ← 必须 ok
7. 合并进 TM（注意 08c 必须在回填之前跑，progress.html 读它的输出）：
   Remove-Item "data/pageblocks/<页面名>.pr0000.json" -Force
   node tools/10-merge-pageblocks.mjs       ← errors=3 是既有问题，见下
   node tools/06c-rebuild-tm.mjs
   node tools/06b-normalize.mjs
   node tools/08c-real-coverage.mjs --top 0
8. 回填该页（07-build 已不可用）：
   node tools/scratch/apply-tm-to-page.mjs "<页面标题>" --verbose
   node tools/08b-page-gap.mjs "<页面标题>"      ← 期望 untranslated prose units=0
   若页面里还留着「被判为标识符、其实玩家可见」的小写标签（funds、policies、
   fuel silos、kamikaze 这类），把词条加进 tools/short-translate.mjs 后跑：
   node tools/06e-short-labels.mjs          ← 加 --dry 可先看会新增哪些
   再重跑本步骤的回填。补标签时注意：translateShort 会拒绝「含数字」的字符串
   （KEEP 规则），倍数一类只能留在数字形式。
9. 周期性地跑验收（当前基线）：
   node tools/99-offline-check.mjs      → internal links=439662 broken=0
   node tools/99f-image-audit.mjs       → B) 大小写不符=0、C) 缺失=0
   node tools/99b-residue-check.mjs     → external @import=0
   node tools/99c-search-check.mjs      → 只剩 1 条：国家焦点（站点用「国策」，见下）
   node tools/99g-objective-audit.mjs   → banned-pattern occurrences=105

【三条最重要的工作纪律 —— 都是踩过坑换来的】
A. 占位符序列必须与英文完全一致，不只是升序。
   英文 en(3): 0,1,2 就必须写 ⟦0⟧⟦1⟧⟦2⟧，写成 1,0,2 会被拒。
   中文习惯把修饰语前置，最容易犯这个错。安全做法：英文 token 顺序原样保留，
   在它周围改写中文语序。示例（正确写法）：
     不能写「确保你与⟦1⟧的关系高于⟦0⟧」，要写「确保你与⟦0⟧的关系高于⟦1⟧」。
B. 只翻译你在「完整读过」的内容里见过的 key。
   已发生 5 次凭空编造 key 的事故（CONT.b53 共 56 个、CONT.b77 共 13 个），
   全部被 10e-token-check 以 "NO ENGLISH (stale key?)" 拦下，0 条入库。
   根因是看 Select-Object 切片就动笔。禁令：绝不用切片结果当数据源。
C. 改完一个条目要立刻重跑 10e-token-check。
   曾用 edit 时把已有内容重复写入，造成 zh(14) vs en(10)。先打印当前值再改。

【环境与硬约束】
- Windows + PowerShell。所有网络 I/O 必须用 Node fetch；
  PowerShell 的 Invoke-WebRequest 因 TLS 在此机器上不可用。
- npm 不可用（npm-cache\_cacache 报 EPERM）。整条流水线是零依赖 Node。
- ⚠️ 沙箱是 workspace-write + 审批 ask（不是 danger-full-access）：命令以低完整性令牌运行，
  只有工作区根目录可写；data/ site/ tools/ cache/ .git 这些已存在子目录仍是中完整性，
  写入会被系统拒绝（EPERM / Access denied）。所以每条要写盘的流水线命令都得单独申请一次
  danger-full-access（审批会弹给用户），或者请用户把本会话切到「完全权限」。
- ⚠️ 不要在 pwsh 里写内联 node -e 且带 \"、正则字面量、多行模板或嵌套引号，
  会被解析坏。一律写到 tools/scratch/*.mjs 再执行。
- ⚠️ 不要用 node xxx | Select-Object -First N：会在上游 Node 完成最终写入前
  就把它杀掉。要限制输出就重定向到文件再用 Get-Content 读。
- ⚠️ PowerShell 的 Select-Object -First -30 是硬错误（负参数）。
- ConvertFrom-Json 会把 ⟦⟧ 显示成 鉄? —— 这只是显示假象，文件本身没问题。
- 永远不要删除整个 site/ 而不先备份 site/images/。

【翻译记忆库机制】
- key(en) = hash32(normalize(en))，normalize = 折叠空白后 trim，hash32 是 FNV-1a→base36。
  必须从 tools/translate.mjs 导入 Store / key / normalize，绝不要自己重写。
- Store.get(en) 只看英文字符串；Store.set(en, zh) 在 zh 为空或 zh === en 时返回 false。
- 因此「中英完全相同的值」按设计永不入库，会永远显示为未翻译。例如
  `[a]`、`32.0 kn`、`16 June 2025`、Linux 模组路径。这些不是漏译。
  实测确认：Naval technology 与 Naval technology (Basic) 残留的 36 条
  全部只是航速数值（如 32.0 kn），纯属此类，不用管。
- 已知数据质量隐患（当前策略是不修）：578 个 key 只靠 TM 里的
  recoveredFromMemory 才通过；另有 11,274 个「已入库但从未被应用」的嵌套块单元
  （最严重的是 Achievements、Faction、Experience、List of political advisors）。
  这些是既有问题，不要在无关批次里顺手改。

【已知有问题的工具，别用】
- tools/scratch/dump-block.mjs —— 有 bug，别用
- tools/scratch/token-refs.mjs —— 已损坏（缺 parserOutput(dom) 调用）
- 正确替代：tools/scratch/show.mjs（按页取真实 key）或 dump-real.mjs
- 排查回填问题用：tools/scratch/align-debug.mjs（按 key 看逐字面量对齐到哪一步失败）、
  tools/scratch/unit-debug.mjs（按 key 看页面上有没有候选块、needle 是否命中）

【已知但故意不修的问题】
- 10-merge-pageblocks 报 errors=3：Japan.c01.zh.json 两条 placeholder mismatch、
  Manpower.zh.json 一条 missing en/zh。属既有数据问题，别在无关批次里顺手改。
- 99c-search-check 报 1 条搜不到：「国家焦点」。站点与 glossary.json 用的都是「国策」，
  所以这个词永远不会出现在正文里，属检查脚本的陈旧期望，不是漏译。

【必须遵守的术语表（每次合并都会校验，务必沿用）】
政治点数 political power｜指挥点数 command power｜稳定度 stability｜
战争支持度 war support｜世界紧张度 world tension｜国策 national focus｜
国策树 focus tree｜国家精神 national spirit｜师 division｜师编制 division template｜
支援连 support company｜航空队 air wing｜运输船队 convoy｜傀儡国 puppet｜
军官团 officer corps｜民用工厂 civilian factory｜军用工厂 military factory｜
船坞 dockyard｜科研槽 research slot｜人力 manpower｜装备 equipment｜地形 terrain｜
后勤 logistics｜作战计划 battle plan｜陆军编制器 army planner｜指挥群 command group｜
陆军学说 land doctrine｜租借 lend-lease｜战争目标 war goal｜州 state｜省份 province｜
作用域 scope｜次意识形态 sub-ideology｜宗主国 puppet master｜附属国 subject｜
自治度 autonomy｜顺从度 compliance｜抵抗度 resistance｜驻军 garrison｜
占领法令 occupation law｜合作政府 collaboration government｜修正 modifier｜
力量平衡 balance of power｜理念 idea｜特质 trait｜效果块 effect block｜
提示框 tooltip｜定向修正 targeted modifier｜工事 entrenchment｜战斗宽度 combat width｜
协调 coordination｜屏卫 screening｜军工组织 MIO｜精通 mastery｜特种部队 special forces｜
阵营 faction｜阵营领袖 faction leader｜阵营纲领 faction manifesto｜
力量投射 power projection｜阵营主动权 faction initiative｜阵营规则 faction rules｜
阵营目标 faction goals｜牵引式火炮 Towed Artillery｜反坦克炮 Towed Anti-Tank｜
防空炮 Towed Anti-Air｜火箭炮 Towed Rocket Artillery｜软攻 Soft attack｜硬攻 Hard attack｜
突破 Breakthrough｜防御 Defense｜穿透 Piercing｜可靠性 Reliability｜
生产效率增长 Production efficiency growth｜生产效率上限 Production efficiency cap｜
海军登陆 naval invasion｜计划加成 planning bonus｜制海权 naval supremacy｜
制空权 air superiority｜近距空中支援 close air support｜
轻型/中型/重型/超重型/现代坦克 L./M./H./SH./Mod. Tank｜自行火炮 SPG｜
坦克歼击车 TD｜自行高炮 AA｜成就 achievement｜外观标签 cosmetic tag｜
情报台账 intel ledger｜战争迷雾 fog of war｜平均触发时间 MTTH

补丁术语：Major patch 大型补丁｜Hotfix 热修复｜checksum 校验和｜
Released alongside 随…一同发布｜open beta 公开测试

海军术语：战列舰 battleship｜战列巡洋舰 battlecruiser｜重巡洋舰 heavy cruiser｜
轻巡洋舰 light cruiser｜驱逐舰 destroyer｜潜艇 submarine｜航空母舰 carrier｜
浮式船坞 floating harbor｜超重型战列舰 super-heavy battleship｜水面可见度｜
水面探测｜轻型/重型炮组命中几率｜鱼雷命中几率｜深水炸弹 depth charges｜
甲板容量 deck size｜航行中补给 underway replenishment｜最大航程｜服役人力｜
登陆防御｜海军登陆容量｜燃料消耗｜天气惩罚｜节 kn｜派克瑞特 Pykrete｜冰制航空母舰

DLC 名：绝不后退 No Step Back｜唯有鲜血 By Blood Alone｜全民持枪 Man the Guns｜
抵抗运动 La Résistance｜反抗暴政 Arms Against Tyranny｜效忠审判 Trial of Allegiance｜
诸神黄昏 Götterdämmerung｜帝国坟场 Graveyard of Empires｜博斯普鲁斯之战 Battle for the Bosporus｜
我们时代的和平 Peace for Our Time｜雷霆临门 Thunder at Our Gates｜共赴胜利 Together for Victory｜
死亡或耻辱 Death or Dishonor｜唤醒猛虎 Waking the Tiger｜不妥协，不投降 No Compromise No Surrender｜
大逃杀 Battle Royale

【标识符政策】
游戏脚本标识符一律保持与英文逐字节一致，只翻译其周围的散文。例如
NDefines.NResistance.RESISTANCE_TARGET_MODIFIER_STATE_VP、setowner PSH、
/Hearts of Iron IV/common/...、module_slots、pdxmesh、.asset、GER/SOV/SPR、
1.4–1.19、hungarian decisions.txt、SPR_scripted_effects.txt、Audio.PlayEffect。
界面标签用「」包裹。Wiki 模板报错：
(unrecognized define "..." for Module:Defines) → （模块 Defines 无法识别定义「...」）
Expression error: Unexpected < operator. → 表达式错误：意外的 < 运算符。

【汇报要求】
- 只用实测数字，不要估算或夸大。每次汇报都说清用的是哪个分母
  （当前权威分母是 8,669,373，来自 tools/08c-real-coverage.mjs）。
- 08c 的「fully translated (100%)」是 pct >= 0.995，不是严格 100%。
- 如果上下文快不够了，明确直说「本会话干不动了」，不要假装还有余量。
```

---

## 使用说明（不用复制给新会话）

- **本轮建议起点**：先用 `node tools/08c-real-coverage.mjs --top 40` 挑一页「一批能译完」的。
  2026-09 刚做完 Military industrial organization 与 Fuel。
- **单批容量**：固定 130 条，约 22,000–23,000 字符。上下文紧张时降到 60–80 条。
- **预期速率**：每批约耗掉本会话 1/3 上下文（130 条译文的输出量很大）。
  也就是说一个会话大约只能推进 3–4 批；本轮两个小页（102 + 29 条）连回填一起做完。
- **回填后必查**：apply-tm-to-page 只改 `<main>`，页脚百分比与横幅由它一并修正；
  跑完请核对「链接 / 图片 / 上标」数量与 cache/refsite 里的备份一致，确认没丢元素。
- **如果新会话也想做验收**：需要临时起预览服务器
  `node tools/serve.mjs 8099`，用完 `Ctrl+C` 停掉，不要留后台常驻。
