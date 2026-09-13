# 钢铁雄心4 中文离线维基 —— 会话交接提示词

把下面「提示词正文」整段复制给新会话的第一个消息。

---

## 提示词正文（复制这一段）

```
继续做「钢铁雄心4 简体中文离线维基」项目。项目根目录：
C:\Users\Atom\Documents\GeneralWS\hoi4-zh-wiki

【总目标】
把 hoi4.paradoxwikis.com 上所有游戏玩法相关内容（含相关页面如 Getting started、
State affairs 等）完整抓取、连同图片图标一起本地化，翻译为简体中文，产出一个
可离线点击浏览的静态站点 + 中文全文搜索。不属于本游戏的内容不入库。国策树
（focus tree）页面与 /Scriptoutput 页面按既定决定排除；模组制作/模组/开发日志
按用户决定保留。

【当前进度（实测，勿凭记忆改写）】
- 正文完成度 40.6%：已译 3,383,722 / 8,325,776 字符
- 完全译完（pct>=0.995）349 页；>=80% 共 380 页；共 655 页
- 翻译记忆库 data/tm.json 共 27,604 条
- 站点 site/ 可离线浏览：内部链接 439,087，断链 0
- 图片 8,445 个命中真实文件名，大小写不符 0，缺失 0
- 搜索索引 655 页
- 剩余 4,942,054 字符 / 317 页。其中 Patch 系列剩 973,493 字符 / 31 页。
  最大单页 Defines 约 132,236 字符。
- 上一轮已完成并已合并验证的翻译块：CONT.b92 / b93 / b94
  （Patch 1.12.X 130 条、Patch 1.17.X 两批各 130 条）

【本轮从哪继续】
优先继续 Patch 1.17.X。该页已导出过一次，当时报：
  prose pending=574 units / 45561 chars (already in blocks: 130; remaining after this slice: 444)
所以直接用下面命令接着导出即可：
  Remove-Item data/pageblocks/*.pr0000.json -Force -ErrorAction SilentlyContinue
  node tools/10d-export-prose.mjs "Patch 1.17.X"
写到 CONT.b95.zh.json 起。之后再做 Patch 1.16.X（58,735 字符 / 约 700 条）。

【每页固定流程（务必按序）】
1. Remove-Item data/pageblocks/*.pr0000.json -Force -ErrorAction SilentlyContinue
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
7. node tools/10-merge-pageblocks.mjs
8. 重建链（一条条跑，注意 07-build 之后要补 images）：
   Remove-Item data/pageblocks/*.pr0000.json -Force
   node tools/06c-rebuild-tm.mjs
   node tools/06b-normalize.mjs
   node tools/07-build.mjs
   if (-not (Test-Path site/images)) { Copy-Item -Recurse cache/site-before/images site/images }
   node tools/08c-real-coverage.mjs
9. 周期性地跑验收：
   node tools/99-offline-check.mjs      → internal links=... broken=0
   node tools/99f-image-audit.mjs       → A) 有、B) 大小写不符=0、C) 缺失=0
   node tools/99b-residue-check.mjs
   node tools/99c-search-check.mjs
   node tools/99g-objective-audit.mjs

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
- 沙箱为 danger-full-access，且审批提示已禁用 —— 不要设置 sandbox_permissions。
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

【必须遵守的术语表（每次合并都会校验，务必沿用）】
政治点数 political power｜指挥点数 command power｜稳定度 stability｜
战争支持度 war support｜世界紧张度 world tension｜国家焦点 national focus｜
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
协调 coordination｜屏卫 screening｜MIO 军工产业组织｜精通 mastery｜特种部队 special forces｜
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
  （当前权威分母是 8,325,776，来自 tools/08c-real-coverage.mjs）。
- 08c 的「fully translated (100%)」是 pct >= 0.995，不是严格 100%。
- 如果上下文快不够了，明确直说「本会话干不动了」，不要假装还有余量。
```

---

## 使用说明（不用复制给新会话）

- **本轮建议起点**：`Patch 1.17.X` 剩余 444 条。该页术语和句式已建立，
  边际成本最低。
- **单批容量**：固定 130 条，约 22,000–23,000 字符。上下文紧张时降到 60–80 条。
- **预期速率**：每批约耗掉本会话 1/3 上下文（130 条译文的输出量很大）。
  也就是说一个会话大约只能推进 3–4 批。
- **如果新会话也想做验收**：需要临时起预览服务器
  `node tools/serve.mjs 8099`，用完 `Ctrl+C` 停掉，不要留后台常驻。
