# 新会话交接提示词 —— 钢铁雄心4 简体中文离线维基

> 用法：把本文件内容整段贴给新会话作为开场。所有数字均为 **2026-09** 会话结束时的实测值，可直接用于验证环境一致。**本轮最重要的变化：整站重建链已失效，务必先看 2.1 节。**

---

## 0. 一句话任务

继续 `D:\code\hoi4-zh-wiki` 项目的翻译推进：**把 hoi4.paradoxwikis.com 的玩法内容译成简体中文，做成离线可点击静态站 + 中文全文搜索**。最近两轮已完成 Military industrial organization（CONT.b106，102 条）与 Fuel（CONT.b107，29 条）。

> ⚠️ **务必先读 2.1 节：整站重建链已失效**（`cache/pages` 已丢失 + wiki 全站返回 HTTP 427），`07-build.mjs` 跑不起来，页面只能逐页回填。跳过那节会白跑一趟。

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
| 统计分母（正文可译字符） | **8,669,373** |
| 已译字符 | **4,803,366** |
| 正文完成度 | **55.4%** |
| 代码/标识符字符（已排除） | 909,647 |
| 真未译 | **3,833,104 字符 / 44,651 单元 / 269 页** |
| 结构性残留（按设计不可译） | 32,903 字符 |
| 永不为 100% 的页面 | 24 页 |
| 全站理论完成度上限 | **99.6%** |
| TM 条目数 | **42,243**（`data/tm.json`，**对象**不是数组） |
| 内链 | 439,662，**broken=0** |
| 图片 | 磁盘 9,326 个；引用 146,987 全部命中；大小写不一致 0；缺失 0 |
| banned-pattern | 105（当前值，只能减不能增） |
| 页面数 | 覆盖率统计 655 页；生成 HTML 660 个 |
| 完成度分布 | 「100%」376 页；≥80% 414 页；50–80% 50 页；<10% 61 页 |

验证命令：

```powershell
node tools/08c-real-coverage.mjs --top 0
```

期望输出含：`real coverage=55.4%`、`genuine prose=3,833,104 chars / 44,651 units`、`structural ... =32,903 chars`、`ceiling ... 99.6%`。

> ⚠️ `08c` 要写 `data/coverage-real.json`，在低完整性沙箱下会 EPERM（见 5 节），需要一次性提权。

### 2.1 整站重建链已失效（**务必先读**）

- `cache/pages/`（约 1 GB 原始抓取缓存，被 `.gitignore` 排除）**已不存在**，`cache/site-before/` 也没了；磁盘与回收站都没有备份。
- wiki（`hoi4.paradoxwikis.com` 与 `paradoxwikis.com`）对**所有**请求返回 **HTTP 427**，换浏览器 UA 无效；`example.com` 正常，所以不是本机断网。**重抓也不可行。**
- 于是 `node tools/07-build.mjs` 直接报 `ENOENT: ... scandir 'cache\pages'`，**整站重建暂时不可用**。

替代做法：把 TM 逐页回填进已生成的 HTML。

```powershell
node tools/scratch/apply-tm-to-page.mjs "<页面标题>" --dry       # 只看会改什么
node tools/scratch/apply-tm-to-page.mjs "<页面标题>" --verbose   # 真正写入
```

它用项目自己的渲染器（`tools/units.mjs` 的 `applyTranslations`）处理 `<main>` 区域，所以链接/图标/上标全部保留；改前会在 `cache/refsite/<页>.preapply.html` 留备份。**必须用渲染器而不是逐字面量替换**，原因有两个：段落的英文词可能被包在链接元素里；旧构建还可能把段落中间的小连接词文本节点单独译成中文（`and`→`和`），使段落自身的 key 与 TM 不再相等。该脚本会先把这类文本节点还原成英文源文，再交给渲染器重建。

wiki 恢复后，可按页脚记录的版本号重建全部缓存（保证 unit key 不变、既有译文不失效）：

```powershell
node tools/scratch/refetch-by-revid.mjs --probe    # 只探测连通性，不写盘
node tools/scratch/refetch-by-revid.mjs            # 按 _revids.txt 逐页重抓
```

`_revids.txt` 由各页页脚的「原站版本号」生成（列在第一列的是页面文件名，脚本自己用 `lib.mjs` 的 `slug()` 换算缓存文件名）。

---

## 3. 固定流水线（**严格按此顺序，不要改动**）

### 3.1 单个页面翻译的完整循环

```powershell
# 1) 清掉本页上次的残留导出（只删本页！仓库里跟踪着别的页的 pr0000.json，别用通配符）
Remove-Item "data/pageblocks/<页面名>.pr0000.json" -Force -ErrorAction SilentlyContinue

# 2) 导出待译散文单元 —— 绝对不要加 --limit（默认 130，加了会静默截断）
node tools/10d-export-prose.mjs "<页面标题>"

# 3) 通读全部内容（必须读完，见纪律 B）
node tools/scratch/show.mjs "<页面标题>"
#    若输出 NO MATCH，就直接读 data/pageblocks/<页面名>.pr0000.json
#    （里面有 key + 占位符序列 + 英文全文）

# 4) 写 data/pageblocks/CONT.bNN.zh.json
# 5) 两道校验必须都过
node tools/10e-token-check.mjs CONT.bNN.zh.json    # 必须 ok
node tools/10c-dupkey-check.mjs CONT.bNN.zh.json   # 必须 dupKeys=0 sharedEnglish=0

# 6) 合并进 TM（08c 要在回填之前跑：progress.html 读它的输出）
node tools/10-merge-pageblocks.mjs                 # 报 errors=3 是既有问题，见 8 节
Remove-Item "data/pageblocks/<页面名>.pr0000.json" -Force -ErrorAction SilentlyContinue
node tools/06c-rebuild-tm.mjs
node tools/06b-normalize.mjs
node tools/08c-real-coverage.mjs --top 0

# 7) 回填该页（07-build 已不可用，见 2.1）
node tools/scratch/apply-tm-to-page.mjs "<页面标题>" --verbose
node tools/08b-page-gap.mjs "<页面标题>"          # 期望 untranslated prose units=0
```

> ⚠️ **`07-build.mjs` 现在跑不了**（`cache/pages` 丢失 + wiki 427）。旧的「07 之后补 images」那一步也就不存在了；但**永远不要在没备份 `site/images/` 的情况下删除 `site/`**——`cache/site-before/images` 已经没了，删了就真没了。
>
> ⚠️ 若回填后页面里还留着「被判为标识符、其实玩家可见」的小写标签（`funds`、`policies`、`fuel silos`、`kamikaze` 这类），把词条加进 `tools/short-translate.mjs`，先 `node tools/06e-short-labels.mjs --dry` 看会新增哪些，确认无误再去掉 `--dry` 执行，然后重跑第 7 步。注意 `translateShort` 会拒绝「含数字」的字符串（`KEEP` 规则），倍数一类只能保持数字形式。
>
> ⚠️ 回填完请核对「链接 / 图片 / 上标」数量与 `cache/refsite/<页>.preapply.html` 一致，确认没有丢元素。

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

- **文件策略 `workspace-write`，审批策略 `ask`**。⚠️ **但沙箱比这更严**：命令以低完整性令牌运行，**只有工作区根目录可写**；`data/`、`site/`、`tools/`、`cache/`、`.git` 这些**已存在**的子目录仍是中完整性，写入会被系统拒绝（`EPERM` / `Access denied` / `SetNamedSecurityInfoW failed (Win32 5)`）。所以每条要写盘的流水线命令（`10d`/`10-merge`/`06c`/`06b`/`08c`/`08b`/`06e`/`apply-tm-to-page`/`git commit`/`git push`）都得对**那一条**命令申请一次 `danger-full-access`（审批弹给用户），或请用户把本会话切到「完全权限」。不要预防性地设置，也不要因为一条被拒就换别的方式绕。只读命令（`10e`/`10c`/`show`/`99*`/`git status`）照常在沙箱内跑即可；输出重定向到**工作区根目录**的文件是允许的。
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
- **Military industrial organization**：补译 102 单元（`CONT.b106`），`08b` 报 `0`，页脚 100%。
- **Fuel**：补译 29 单元（`CONT.b107`），`08b` 报 `0`，页脚 100%；同时把 14 条「被判为标识符、实际玩家可见」的标签补进 `tools/short-translate.mjs`（`Storage`、`Consumption`、`airframe`、`engine module`、`mission efficiency`、`naval bases`、`fuel silos`、`fuel refining`、`kamikaze`、`port strike`、`logistics strike` 等），经 `06e` 折入 TM。
- **页面回填工具链**（因 `cache/pages` 丢失而新增）：`tools/scratch/apply-tm-to-page.mjs`（用项目渲染器把 TM 回填进已生成 HTML，含把被旧构建半译的文本节点还原成英文源文）、`patch-built-page.mjs`、`align-debug.mjs`、`unit-debug.mjs`、`refetch-by-revid.mjs`、`fix-tm-entry.mjs`。详见 2.1。

---

## 7. 下一步：按「一批能译完」排序挑页

⚠️ 旧的「入口页集群」清单（Infantry technology / Land battle / Attrition and accidents / …）**已经过期**：那批页面多数已译完，剩下的字符数与批次数必须现算，不要照旧表开工。

```powershell
node tools/08c-real-coverage.mjs --top 40   # 还剩哪些页、各剩多少字符/单元（权威口径；注意要提权）
node tools/scratch/hub-effort.mjs           # 入口页按「几批能译完」排序
```

当前大盘（2026-09 实测）：真未译 **3,833,104 字符 / 44,651 单元 / 269 页**，`44,651 ÷ 130 ≈ 344 批`；一轮会话大约只能推进 3–4 批。**这不可能一次做完，必须按可见度排序**（玩法机制页与入口页优先，Patch 日志、国家页、Defines 靠后）。

建议的会话开场（把 `<页面标题>` 换成挑好的那页）：

```powershell
Remove-Item "data/pageblocks/<页面名>.pr0000.json" -Force -ErrorAction SilentlyContinue
node tools/10d-export-prose.mjs "<页面标题>"
node tools/scratch/show.mjs "<页面标题>"
```

已知的几个大盘（供判断，非精确清单）：Patch 系列、国家页（约 220 页）、modding/脚本/Defines。

---

## 8. 已知问题 —— **故意不修，不要在无关批次里顺手改**

1. `tools/10-merge-pageblocks.mjs` 报 `errors=3`：`Japan.c01.zh.json` 两条 `placeholder mismatch`、`Manpower.zh.json` 一条 `missing en/zh`（更早还报过 `Faction.b12.zh.json irsj1z: missing en/zh`，该条目是 `{"k":"irsj1z","zh":"已启用 没有任何阵营成员是间谍大师"}`，缺 `en` 字段）。都是既有条目问题，别在无关批次里顺手改。
2. `99-offline-check` 的 `missing=1` 假象（`images/Mobile_Recon_&amp;_Assault.png`，检查器里的 HTML 实体问题）当前已不复现：2026-09 实测 `missing=0`、`internal links=439662 broken=0`。
3. `99c-search-check` 报 1 条术语搜不到：「国家焦点」。站点与 `data/glossary.json` 用的都是「国策」，所以该词永远不会出现在正文里 —— 属检查脚本的陈旧期望，不是漏译。
4. 578 个键只靠 TM 的 `recoveredFromMemory` 通过。
5. **11,274 个「在 TM 里但从未被应用」的嵌套块单元**，最严重的页面：Achievements、Faction、Experience、List of political advisors。
6. **新发现，尚未解决**：`Hotkeys`、`Land units`、`Jargon` 三页，`08c` 认为有残留（合计 70 字符），但 `10d-export-prose` 导出 **0 条** —— 导出器与覆盖率统计口径不一致，这些残留既导不出也译不掉。量极小，但属真实缺口，值得单独排查。

> ⚠️ 关于 Achievements：虽然它在上面第 5 条名单里，但**它同时也有实打实的未译单元**（抽样确认是真散文，如 `It is not possible to gain achievements if the checksum has been changed…`、`Playing as Canada`）。这两个问题是独立的，不要因为它在名单 5 里就跳过它。

---

## 9. 验收套件（每个阶段收尾跑一次）

```powershell
node tools/99-offline-check.mjs     # 期望 internal links=439662 broken=0 missing=0（660 页）
node tools/99f-image-audit.mjs      # 期望 B) CASE-ONLY=0  C) truly absent=0（磁盘 9326 个）
node tools/99b-residue-check.mjs    # 期望 external @import=0、css 外部 url=0
node tools/99c-search-check.mjs     # 当前已知 1 条搜不到（国家焦点，见 8.3），其余应全可搜
node tools/99g-objective-audit.mjs  # 期望 banned-pattern occurrences=105（不得增长）
```

---

## 10. 术语表（机器应用，**不要手抄**）

统一译名在 `data/glossary.json`，由 `tools/06d-apply-glossary.mjs` / `tools/glossary-extra.mjs` 机械应用，并在每次合并时校验。**翻译时如与该表冲突，以表为准**；需要新增术语就改这两个文件，不要只写在批次里。

短标签、小写标签（被 `tools/classify.mjs` 当成标识符、因而不会出现在导出清单里的那些，例如 `funds`、`policies`、`fuel silos`、`kamikaze`）走另一条路：加进 `tools/short-translate.mjs` 的 `PHRASES`，再用 `node tools/06e-short-labels.mjs`（可先加 `--dry` 预览）折进 TM。注意 `translateShort` 会拒绝含数字的字符串（`KEEP` 规则），倍数一类只能保持数字形式。

高频必守项（示例，非全集）：
政治点数 political power｜指挥点数 command power｜稳定度 stability｜战争支持度 war support｜世界紧张度 world tension｜国策 national focus｜国策树 focus tree｜国家精神 national spirit｜师 division｜师编制 division template｜支援连 support company｜航空队 air wing｜运输船队 convoy｜傀儡国 puppet｜军官团 officer corps｜民用工厂 civilian factory｜军用工厂 military factory｜船坞 dockyard｜科研槽 research slot｜人力 manpower｜装备 equipment｜地形 terrain｜后勤 logistics｜作战计划 battle plan｜陆军编制器 army planner｜指挥群 command group｜陆军学说 land doctrine｜租借 lend-lease｜战争目标 war goal｜州 state｜省份 province｜作用域 scope｜次意识形态 sub-ideology｜宗主国 puppet master｜附属国 subject｜自治度 autonomy｜顺从度 compliance｜抵抗度 resistance｜驻军 garrison｜占领法令 occupation law｜合作政府 collaboration government｜修正 modifier｜力量平衡 balance of power｜理念 idea｜特质 trait｜效果块 effect block｜提示框 tooltip｜定向修正 targeted modifier｜工事 entrenchment｜战斗宽度 combat width｜协调 coordination｜屏卫 screening｜军工组织 MIO｜精通 mastery｜特种部队 special forces｜阵营 faction｜阵营领袖 faction leader｜力量投射 power projection｜阵营规则 faction rules｜阵营目标 faction goals｜软攻 Soft attack｜硬攻 Hard attack｜突破 Breakthrough｜防御 Defense｜穿透 Piercing｜可靠性 Reliability｜生产效率增长 Production efficiency growth｜生产效率上限 Production efficiency cap｜海军登陆 naval invasion｜计划加成 planning bonus｜制海权 naval supremacy｜制空权 air superiority｜近距空中支援 close air support｜成就 achievement｜外观标签 cosmetic tag｜情报台账 intel ledger｜战争迷雾 fog of war｜平均触发时间 MTTH

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

- **只报实测数字，绝不估算或夸大**；每次报覆盖率必须同时给出分母（当前 8,669,373，来自 `tools/08c-real-coverage.mjs`）。
- 上下文快耗尽时**直接说「本会话干不动了」**，不要假装还有余量硬撑 —— 上一会话就是这么收尾的。
- 收尾时确保：`pr0000.json` 已清空、TM 已重建、站点已重建、验收全绿，**不留半成品**。
