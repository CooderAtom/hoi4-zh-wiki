# Translator brief — offline Simplified-Chinese HOI4 wiki

Working directory: `C:\Users\Atom\Documents\GeneralWS\hoi4-zh-wiki` (pass `workdir` to pwsh; `cd` does not persist between calls).

You are producing validated Chinese translation batch files for one wiki page. The parent agent merges
and rebuilds the site centrally — you never do that.

## KEEP GOING — read this first

Your turn may be killed by a hard time limit, but do **not** stop early on purpose:

- Work **continuously**: write batch after batch in the same turn until the page reports `items=0`.
- Do **NOT** stop after one batch and do **NOT** wait for a follow-up prompt between batches.
- Report progress only occasionally (say, every 3–5 batches), not after every batch.
- If you are killed partway, the batch files persist on disk; resume from the next free batch number.
- Never claim a batch is done unless `10e` printed its `ok:` line for that exact file.

## Per-turn workflow

There is a scratch helper `tools/scratch/item.mjs` for inspecting a block:

```
node tools/scratch/item.mjs <file.zh.json> <key>     # show EN/ZH/placeholder sequence for one key
node tools/scratch/item.mjs <file.zh.json> --bad     # list every key whose token order differs from EN
```

0. Decide the batch number NN (first turn: 01).
1. If `data/pageblocks/<Page_Safe>.pr0000.json` does not exist, or you already wrote batch NN-1, run:
   `node tools/10d-export-prose.mjs "<Exact Page Title>"`
   Do NOT pass `--limit` or `--from`. It automatically excludes keys already present in `.zh.json`
   blocks for that page, so each re-run returns the NEXT slice. It prints the item count.
   If it prints `items=0`, that page is finished — move straight on to the NEXT page you were
   assigned (start its batch numbering at 01), and only stop once every assigned page is at `items=0`.
2. Read the WHOLE exported `data/pageblocks/<Page_Safe>.pr0000.json` with the read tool. Never use
   `Select-Object` slicing as a data source. **Never invent keys** — only keys present in that export
   file may appear in your batch.
3. Write `data/pageblocks/<Page_Safe>.b<NN>.zh.json`:

```json
{
  "page": "<Exact Page Title>",
  "batch": "<Page_Safe>.b<NN>",
  "items": [
    { "k": "abc1234", "zh": "简体中文译文" }
  ]
}
```

   - `page` MUST be the real page title (not a made-up label).
   - Items carry only `k` and `zh`. **NEVER add an `en` field** (old format; triggers `missing en/zh`).
4. Placeholders look like `⟦0⟧`, `⟦1⟧` (U+27E6 / U+27E7), NEVER `<0>`. The Chinese must contain
   EXACTLY the same placeholder sequence in the SAME ORDER as the English — not merely ascending.
   English `⟦0⟧⟦1⟧⟦2⟧` must render as `⟦0⟧⟦1⟧⟦2⟧`; `⟦0⟧⟦2⟧⟦1⟧` is a hard failure.
   **Reorder the Chinese wording around the placeholders; never move a placeholder.**
5. Run both checks and make them pass:
   - `node tools/10e-token-check.mjs <file>` → must print `ok: N items, all token sequences identical`
   - `node tools/10c-dupkey-check.mjs <file>` → must print `dupKeys=0 sharedEnglish=0`
   Re-run `10e` after EVERY edit. If `10e` reports `--bad`-style mismatches, run
   `node tools/scratch/item.mjs <file> --bad` to see them, fix by rewording, and re-check.
6. Report and STOP. Reply with only: the batch filename, item count, the literal `10e` line, the
   literal `10c` line.

## Translation rules

- Obey `data/glossary.json` (read it once) — on conflict the glossary wins.
- Game script identifiers (`add_equipment`, `modifier = { ... }`, `set_cosmetic_tag`, …) stay
  byte-identical to English; translate only the surrounding prose.
- UI labels are wrapped in `「」`.
- Country/DLC tags (GER/SOV/SPR/BBA/NCNS/LaR/GoE/AAT/MTG/NSB/GTD/RAJ), person names, codenames,
  version numbers and dates stay as-is.
- **Every exported item must end up with Chinese that differs from the English**, otherwise the
  coverage checker still counts it as untranslated and the page never reaches zero. This includes
  wordless-looking units — use the established conventions:
  - `0.5x` → `0.5 倍`; `0.06x⟦0⟧` → `0.06 倍⟦0⟧`
  - `X#Y` wiki anchor link text → translate BOTH sides, keep the `#`:
    `Terrain#Terrain_features` → `地形#地形特征`; `Hotkeys#Battleplan_hotkeys` → `快捷键#作战计划快捷键`
    (check the target page's Chinese `<h1>`/heading in `site/<Target>.html` before translating).
  - `round(...)` → `取整(...)`; `forum:12345` → `论坛：12345`
  - A bare formula/identifier with no words at all still needs a faithful Chinese rendering.
- Established HOI4 terms (non-exhaustive): 政治点数 political power｜指挥点数 command power｜稳定度 stability｜
  战争支持度 war support｜世界紧张度 world tension｜国家焦点 national focus｜国策树 focus tree｜国家精神 national spirit｜
  师 division｜师编制 division template｜支援连 support company｜航空队 air wing｜运输船队 convoy｜傀儡国 puppet｜
  军官团 officer corps｜民用工厂 civilian factory｜军用工厂 military factory｜船坞 dockyard｜科研槽 research slot｜
  人力 manpower｜装备 equipment｜地形 terrain｜后勤 logistics｜作战计划 battle plan｜陆军学说 land doctrine｜
  海军学说 naval doctrine｜空军学说 air doctrine｜租借 lend-lease｜战争目标 war goal｜州 state｜省份 province｜
  作用域 scope｜自治度 autonomy｜顺从度 compliance｜抵抗度 resistance｜驻军 garrison｜占领法令 occupation law｜
  修正 modifier｜理念 idea｜特质 trait｜效果块 effect block｜提示框 tooltip｜定向修正 targeted modifier｜
  工事 entrenchment｜战斗宽度 combat width｜协调 coordination｜屏卫 screening｜特种部队 special forces｜阵营 faction｜
  力量投射 power projection｜软攻 soft attack｜硬攻 hard attack｜突破 breakthrough｜防御 defense｜穿透 piercing｜
  可靠性 reliability｜生产效率增长 production efficiency growth｜生产效率上限 production efficiency cap｜
  海军登陆 naval invasion｜计划加成 planning bonus｜制海权 naval supremacy｜制空权 air superiority｜
  近距空中支援 close air support｜成就 achievement｜外观标签 cosmetic tag｜战争迷雾 fog of war｜平均触发时间 MTTH｜
  大型补丁 major patch｜热修复 hotfix｜校验和 checksum｜公开测试 open beta
- DLC names keep their official form: 绝不后退 No Step Back｜唯有鲜血 By Blood Alone｜全民持枪 Man the Guns｜
  抵抗运动 La Résistance｜反抗暴政 Arms Against Tyranny｜效忠审判 Trial of Allegiance｜诸神黄昏 Götterdämmerung｜
  帝国坟场 Graveyard of Empires｜博斯普鲁斯之战 Battle for the Bosporus｜我们时代的和平 Peace for Our Time｜
  雷霆临门 Thunder at Our Gates｜共赴胜利 Together for Victory｜死亡或耻辱 Death or Dishonor｜
  唤醒猛虎 Waking the Tiger｜不妥协，不投降 No Compromise No Surrender｜大逃杀 Battle Royale

## Forbidden

- Do NOT run `tools/10-merge-pageblocks.mjs`, `tools/06c-rebuild-tm.mjs`, `tools/06b-normalize.mjs`,
  `tools/08c-real-coverage.mjs`, `tools/07-build.mjs`, or any `99*` acceptance script.
- Do NOT delete or modify any `*.pr0000.json` file, and never run
  `Remove-Item data/pageblocks/*.pr0000.json`.
- Never pipe a node command into `Select-Object -First N` — it kills the process and the resulting
  exit code 1 is that kill, not a real failure. For a real exit code:
  `node tools/x.mjs 2>$null 1>$null; $LASTEXITCODE`
- There is no repo-root `scratch/` directory; the only one is `tools/scratch/`.
- Read console output directly; no output redirection is needed (`>` writes UTF-16 and the read tool
  treats it as binary).
