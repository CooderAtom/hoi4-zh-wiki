# 新会话交接提示词 —— 钢铁雄心4 简体中文离线维基

> 用法：把本文件内容整段贴给新会话作为开场。所有数字均为上一会话结束时的实测值，可直接用于验证环境一致。

---

## 0. 一句话任务

继续 `C:\Users\Atom\Documents\GeneralWS\hoi4-zh-wiki` 项目的翻译推进：**把 hoi4.paradoxwikis.com 的玩法内容译成简体中文，做成离线可点击静态站 + 中文全文搜索**。上一会话已完成 Patch 1.16.X / 1.17.X 与部分入口页，当前正在扫 **index 二级页面（入口页）集群**。

---

## 1. 总目标与边界

- **要**：Getting started、State affairs 等全部玩法内容；图片/图标本地化；简中翻译；离线站点 + 中文全文搜索。
- **不要**：非 HOI4 内容（Paradox 商店、论坛、YouTube、模组下载站、国策树数据页）。
- **已按既定决策排除**：国策树页面、`/Scriptoutput` 页面。
- **保留**（用户明确决定）：modding / mods / developer diaries 类页面。

---

## 2. 当前实测基线（**先跑一遍验证环境一致，对不上就先查原因**）

| 指标 | 值 |
|---|---|
| 统计分母（正文可译字符） | **8,325,776** |
| 已译字符 | **3,483,002** |
| 正文完成度 | **41.8%** |
| 代码/标识符字符（已排除） | 906,025 |
| 真未译 | **4,800,991 字符 / 58,681 单元 / 290 页** |
| 结构性残留（按设计不可译） | 41,783 字符 |
| 永不为 100% 的页面 | 24 页 |
| 全站理论完成度上限 | **99.5%** |
| TM 条目数 | **28,872**（`data/tm.json`，**对象**不是数组） |
| index 入口页 | **47 / 66 已译完**，覆盖率 **81.3%**，剩 220,359 字符 |
| 内链 | 441,139，**broken=0** |
| 图片 | 磁盘 9,326 个；引用 8,445 全部命中；大小写不一致 0；缺失 0 |
| banned-pattern | 142（这是基线，不得增长） |
| 页面数 | 覆盖率统计 655 页；生成 HTML 660 个 |

验证命令：

```powershell
node tools/08c-real-coverage.mjs --top 0
```

期望输出含：`real coverage=41.8%`、`genuine prose=4,800,991 chars / 58,681 units`、`structural ... =41,783 chars`、`ceiling ... 99.5%`。

---

## 3. 固定流水线（**严格按此顺序，不要改动**）

### 3.1 单个页面翻译的完整循环

```powershell
# 1) 清掉上次残留
Remove-Item data/pageblocks/*.pr0000.json -Force -ErrorAction SilentlyContinue

# 2) 导出待译散文单元 —— 绝对不要加 --limit（默认 130，加了会静默截断）
node tools/10d-export-prose.mjs "<页面标题>"

# 3) 通读全部内容（必须读完，见纪律 B）
node tools/scratch/show.mjs "<页面标题>"
#    若输出 NO MATCH，就直接看 data/pageblocks/*.pr0000.json

# 4) 写 data/pageblocks/CONT.bNN.zh.json
# 5) 两道校验必须都过
node tools/10e-token-check.mjs CONT.bNN.zh.json    # 必须 ok
node tools/10c-dupkey-check.mjs CONT.bNN.zh.json   # 必须 dupKeys=0 sharedEnglish=0

# 6) 合并 + 重建（注意：08c 必须在 07 之前！）
node tools/10-merge-pageblocks.mjs
Remove-Item data/pageblocks/*.pr0000.json -Force -ErrorAction SilentlyContinue
node tools/06c-rebuild-tm.mjs
node tools/06b-normalize.mjs
node tools/08c-real-coverage.mjs --top 0     # ← 在 07 之前，否则 progress.html 慢一拍
node tools/07-build.mjs
if (-not (Test-Path site/images)) { Copy-Item -Recurse cache/site-before/images site/images }

# 7) 确认该页归零
node tools/08b-page-gap.mjs "<页面标题>"
```

> ⚠️ **流水线顺序在上会话被改过**：`progress.html` 现在读取 `coverage-real.json`，所以 `08c` 必须跑在 `07` **之前**。`08c` 只依赖 TM、不依赖 `site/`，这个顺序是安全的。旧顺序会让进度页显示上一轮的数据。

### 3.2 批次文件格式

```json
{
  "page": "真实页面标题",
  "batch": "cont13c",
  "items": [
    { "k": "abc1234", "zh": "简体中文译文" }
  ]
}
```

- `page` **必须是真实页面标题**，不能自造标签 —— 否则 `10-merge` 的去重（按 `page` 精确匹配）会失效。
- `items` 里只放 `k` 和 `zh`；**不要**加 `en`（那是旧格式，会触发 `missing en/zh` 报错）。
- 占位符写作 `⟦0⟧`，不是 `<0>`。

---

## 4. 三条硬纪律（违反过，都被工具抓到）

**A. 占位符序列必须与英文完全一致，且顺序相同 —— 不只是"升序"。**
英文 `en(3): 0,1,2` 就必须渲染成 `⟦0⟧⟦1⟧⟦2⟧`。上会话 `dy5wlf` 写成 `⟦0⟧⟦2⟧⟦1⟧` 被 `10e` 报 `TOKEN MISMATCH`。**中文要绕着占位符改写语序，不能挪占位符。**

**B. 只翻译你**通读过**的英文键。**
历史上发生过 5 次凭印象编造词条（CONT.b53 捏造 56 个键、CONT.b77 捏造 13 个），全部被 `10e` 以 `NO ENGLISH (stale key?)` 拦下。**绝不能用 `Select-Object` 切片当数据源**（切片会掩盖未读内容）。

**C. 每次 `edit` 之后立刻重跑 `10e`。**
曾有一次 `edit` 把内容复制成两份，`10e` 报 `zh(14) vs en(10)`。

---

## 5. 环境约束与已知坑

- **文件策略 `workspace-write`，审批策略 `ask`**。项目在 workspace 内，正常读写即可；**不要预防性地设置 `sandbox_permissions`**，只在真的被拒时才一次性升级。
- **所有网络 I/O 必须用 Node `fetch`**（`tools/lib.mjs` 的 `getText`/`getBuf`/`api`）。本机 PowerShell 的 `Invoke-WebRequest` 因 TLS 问题不可用。`npm` 也不可用（`_cacache` EPERM）。
- **不要用 `node xxx.mjs | Select-Object -First N`** —— 会提前杀掉上游进程，其 `[exit code: 1]` 是那次 kill，不是真实失败。
- 判断 Node 真实退出码：`node tools/07-build.mjs 2>$null 1>$null; $LASTEXITCODE`。
- **Node 输出重定向到文件**要用 `| Out-File -FilePath ... -Encoding utf8`；用 `>` 会写成 UTF-16，read 工具会当成二进制。
- **不要在内联 `node -e` 里写带转义引号 / 正则字面量 / 多行模板的代码** —— 一律写成 `tools/scratch/*.mjs` 再跑。
- **绝不在没备份 `site/images/` 的情况下删除 `site/`**。
- `ConvertFrom-Json` 显示 `⟦⟧` 会乱码 —— 那只是显示问题，文件本身是对的。
- **使用 `tools/scratch/show.mjs` 或 `dump-real.mjs`**；`tools/scratch/dump-block.mjs` 和 `token-refs.mjs` 是坏的（缺 `parserOutput(dom)`），别用。
- TM 机制：`key(en) = hash32(normalize(en))`，导入 `Store` / `key` / `normalize` from `tools/translate.mjs`，**绝不要自己重写**。

---

## 6. 上一会话已完成的事（**不要重做**）

- **Patch 1.16.X**：全部译完，`08b` 报 `untranslated prose units=0`。批 `b99`–`b103`。
- **Patch 1.17.X**：全部译完，`08b` 报 `0`。批 `b95`–`b98`。
- **Combat tactics**：译完（96 单元），`08b` 报 `0`。批 `b105`。
- **Console commands**：`b104` 译了 105 单元；剩 34 单元中 33 个是纯命令标识符（保持英文才正确），页面 96.4%。
- **修复入口页静默丢失**：新增 `data/redirect-aliases.json`（8 条），`tools/registry.mjs` 合并时使用。原因：原站这 8 个入口是重定向（`Decisions→List of Decision lists`、`Stability`/`War support→Government`、`Lend-Lease→Diplomacy`、`Attrition→Attrition and accidents`、`Naval units→Ship`、`Air units→Aircraft designer`、`Technology→Research`），但 `fetched.json` 没有它们的 `redirectedFrom`，导致 `reg.resolve()` 返回 null、被 `07-build.mjs` 的 `if (!rec) return ''` 整条丢弃（既不显示也不算断链，所以 `99-offline-check` 看不见）。**`包围 Encirclement` 在原站就是红链（API 查证 `missing=true`），保持不映射是正确的。**
- **进度显示区分两类残留**：新增 `tools/residue.mjs`（`isStructuralResidue`），`08c` 现在同时报真未译与结构性残留，`progress.html` 新增「真正还需翻译的内容」、前 40 待译页面表格、以及「永不为 100% 的 24 页」清单。

---

## 7. 下一步：把入口页集群扫完

剩余 **19 个入口页 / 约 2,500 单元 / 220,359 字符**。**按"几批能译完一页"排序，不要按字符数排序**（Modding 字符最多但要 3 批才译完一页，性价比低于 1 批即完成的页）。

### 优先做（1 批即完成，性价比最高）

| 页面 | 单元 | 字符 |
|---|---|---|
| Infantry technology | 124 | 12,081 |
| Land battle | 85 | 14,352 |
| Attrition and accidents | 53 | 8,809 |

### 然后（2 批）

| 页面 | 单元 | 字符 |
|---|---|---|
| Naval doctrine | 240 | 10,714 |
| Air doctrine | 210 | 8,045 |
| Naval battle | 193 | 29,585 |
| Tank designer | 137 | 7,215 |

### 最后（3 批，体量最大）

| 页面 | 单元 | 字符 |
|---|---|---|
| Developer diaries | 343 | 14,699 |
| Land doctrine | 298 | 10,752 |
| Modding | 279 | 50,833 |
| Achievements | 308 | 47,165 |

随时用这个脚本重算排序（已按 `redirect-aliases.json` 跟随重定向）：

```powershell
node tools/scratch/hub-effort.mjs
```

### 建议的会话开场命令

```powershell
Remove-Item data/pageblocks/*.pr0000.json -Force -ErrorAction SilentlyContinue
node tools/10d-export-prose.mjs "Land battle"
node tools/scratch/show.mjs "Land battle"
```

### 更远期的剩余大盘（本次不做，供判断）

| 集群 | 字符 | 单元 | 页 |
|---|---|---|---|
| A. 入口页（正在做） | 220,359 | ~2,500 | 19 |
| B. Patch 系列 | ~898,000 | ~9,885 | 30 |
| C. 国家页 | ~2,926,000 | ~40,000 | 220 |
| D. modding/脚本/Defines | ~805,000 | ~7,400 | 28 |

规模现实：**58,681 单元 ÷ 130/批 ≈ 451 批**。上会话完成约 9 批。**这不可能一次做完，必须按可见度排序推进。**

---

## 8. 已知问题 —— **故意不修，不要在无关批次里顺手改**

1. `tools/10-merge-pageblocks.mjs` 报 `errors=1`：`Faction.b12.zh.json irsj1z: missing en/zh`。该条目是 `{"k":"irsj1z","zh":"已启用 没有任何阵营成员是间谍大师"}`，缺 `en` 字段。属已知的 Faction 嵌套块问题。
2. `99-offline-check` 报 `missing=1`：`images/Mobile_Recon_&amp;_Assault.png`。这是检查器里的 HTML 实体假象，`99f-image-audit` 的 C) 确认真正缺失 = 0。
3. 578 个键只靠 TM 的 `recoveredFromMemory` 通过。
4. **11,274 个「在 TM 里但从未被应用」的嵌套块单元**，最严重的页面：Achievements、Faction、Experience、List of political advisors。
5. **新发现，尚未解决**：`Hotkeys`、`Land units`、`Jargon` 三页，`08c` 认为有残留（合计 70 字符），但 `10d-export-prose` 导出 **0 条** —— 导出器与覆盖率统计口径不一致，这些残留既导不出也译不掉。量极小，但属真实缺口，值得单独排查。

> ⚠️ 关于 Achievements：虽然它在上面第 4 条名单里，但**它同时也有 308 个实打实的未译单元**（抽样确认是真散文，如 `It is not possible to gain achievements if the checksum has been changed…`、`Playing as Canada`）。这两个问题是独立的，不要因为它在名单 4 里就跳过它。

---

## 9. 验收套件（每个阶段收尾跑一次）

```powershell
node tools/99-offline-check.mjs     # 期望 internal links=441139+ broken=0（missing=1 是已知假象）
node tools/99f-image-audit.mjs      # 期望 A) 8445  B) CASE-ONLY=0  C) truly absent=0
node tools/99b-residue-check.mjs    # 期望 math-error=0  external @import=0
node tools/99c-search-check.mjs     # 期望 ALL glossary terms searchable
node tools/99g-objective-audit.mjs  # 期望 banned-pattern occurrences=142（不得增长）
```

---

## 10. 术语表（机器应用，**不要手抄**）

统一译名在 `data/glossary.json`，由 `tools/06d-apply-glossary.mjs` / `tools/glossary-extra.mjs` 机械应用，并在每次合并时校验。**翻译时如与该表冲突，以表为准**；需要新增术语就改这两个文件，不要只写在批次里。

高频必守项（示例，非全集）：
政治点数 political power｜指挥点数 command power｜稳定度 stability｜战争支持度 war support｜世界紧张度 world tension｜国家焦点 national focus｜国策树 focus tree｜国家精神 national spirit｜师 division｜师编制 division template｜支援连 support company｜航空队 air wing｜运输船队 convoy｜傀儡国 puppet｜军官团 officer corps｜民用工厂 civilian factory｜军用工厂 military factory｜船坞 dockyard｜科研槽 research slot｜人力 manpower｜装备 equipment｜地形 terrain｜后勤 logistics｜作战计划 battle plan｜陆军编制器 army planner｜指挥群 command group｜陆军学说 land doctrine｜租借 lend-lease｜战争目标 war goal｜州 state｜省份 province｜作用域 scope｜次意识形态 sub-ideology｜宗主国 puppet master｜附属国 subject｜自治度 autonomy｜顺从度 compliance｜抵抗度 resistance｜驻军 garrison｜占领法令 occupation law｜合作政府 collaboration government｜修正 modifier｜力量平衡 balance of power｜理念 idea｜特质 trait｜效果块 effect block｜提示框 tooltip｜定向修正 targeted modifier｜工事 entrenchment｜战斗宽度 combat width｜协调 coordination｜屏卫 screening｜MIO 军工产业组织｜精通 mastery｜特种部队 special forces｜阵营 faction｜阵营领袖 faction leader｜力量投射 power projection｜阵营规则 faction rules｜阵营目标 faction goals｜软攻 Soft attack｜硬攻 Hard attack｜突破 Breakthrough｜防御 Defense｜穿透 Piercing｜可靠性 Reliability｜生产效率增长 Production efficiency growth｜生产效率上限 Production efficiency cap｜海军登陆 naval invasion｜计划加成 planning bonus｜制海权 naval supremacy｜制空权 air superiority｜近距空中支援 close air support｜成就 achievement｜外观标签 cosmetic tag｜情报台账 intel ledger｜战争迷雾 fog of war｜平均触发时间 MTTH

补丁术语：Major patch 大型补丁｜Hotfix 热修复｜checksum 校验和｜Released alongside 随…一同发布｜open beta 公开测试

海军术语：战列舰 battleship｜战列巡洋舰 battlecruiser｜重巡洋舰 heavy cruiser｜轻巡洋舰 light cruiser｜驱逐舰 destroyer｜潜艇 submarine｜航空母舰 carrier｜浮式船坞 floating harbor｜超重型战列舰 super-heavy battleship｜深水炸弹 depth charges｜甲板容量 deck size｜航行中补给 underway replenishment｜节 kn｜派克瑞特 Pykrete｜冰制航空母舰

DLC 名：绝不后退 No Step Back｜唯有鲜血 By Blood Alone｜全民持枪 Man the Guns｜抵抗运动 La Résistance｜反抗暴政 Arms Against Tyranny｜效忠审判 Trial of Allegiance｜诸神黄昏 Götterdämmerung｜帝国坟场 Graveyard of Empires｜博斯普鲁斯之战 Battle for the Bosporus｜我们时代的和平 Peace for Our Time｜雷霆临门 Thunder at Our Gates｜共赴胜利 Together for Victory｜死亡或耻辱 Death or Dishonor｜唤醒猛虎 Waking the Tiger｜不妥协，不投降 No Compromise No Surrender｜大逃杀 Battle Royale

### 标识符政策

- 游戏脚本标识符（`add_equipment`、`modifier = { ... }`、`set_cosmetic_tag` 等）**与英文逐字节一致**，只翻译周围散文。
- UI 标签用 `「」` 包裹。
- 国家/DLC 标签（GER/SOV/SPR/BBA/NCNS/LaR/GoE/AAT/MTG/NSB/GTD/RAJ）保持原样。
- 人名、代号（Operation HEAD、Bose、Atatürk）、版本号、日期保持原样。

---

## 11. 汇报规则

- **只报实测数字，绝不估算或夸大**；每次报覆盖率必须同时给出分母（当前 8,325,776）。
- 上下文快耗尽时**直接说「本会话干不动了」**，不要假装还有余量硬撑 —— 上一会话就是这么收尾的。
- 收尾时确保：`pr0000.json` 已清空、TM 已重建、站点已重建、验收全绿，**不留半成品**。
