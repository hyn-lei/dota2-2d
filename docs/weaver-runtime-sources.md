# 编织者 7.42 数据、机制与来源

核对日期为 2026-11-22。当前版本由 Valve 补丁列表确认仍为 **7.42**，编织者的 Dota 英雄 ID 为 **63**。本次只把编织者加入既有九位英雄，当前可玩阵容为十位，不扩展其余官方英雄。

## 原始资料与生成产物

- [英文 Hero Datafeed](https://www.dota2.com/datafeed/herodata?language=english&hero_id=63) 与 [简体中文 Hero Datafeed](https://www.dota2.com/datafeed/herodata?language=schinese&hero_id=63) 原始响应保存在 `docs/research/weaver/63.json`、`63-schinese.json`。生成器使用字节一致的 `docs/research/heroes/63.json`、`docs/research/abilities/63-schinese.json`。
- [Valve 英雄 KV](https://raw.githubusercontent.com/SteamTracking/GameTracking-Dota2/76ab89451c1384c2e106b676258c6e9f72787e11/game/dota/pak01_dir/scripts/npc/heroes/npc_dota_hero_weaver.txt) 固定提交为 `76ab89451c1384c2e106b676258c6e9f72787e11`。原始文件在 `docs/research/weaver/npc_dota_hero_weaver.txt`，生成器读取 `docs/research/heroes/npc_dota_hero_weaver.txt`。
- 甲虫单位资料来自已有的同一固定 7.42 提交 `docs/research/attacks/npc_units.txt` 中 `npc_dota_weaver_swarm`，来源日期与 SHA 在 `docs/research/attacks/meta.json`。其日夜视野均为 321，击杀经验 20、金币 32–34；不以英雄 KV 的技能半径冒充单位视野。`docs/research/units/parsed-units.json` 的同名条目提供相同的展开值。
- 补丁列表核对与官方简体中文补丁保存在 `docs/research/weaver/version-check.json`、`patch-schinese.json`。全阵容原始资料、图片与模型的 SHA-256 见 `docs/research/heroes/sources-7.42.json`。
- 辅助机制资料为 [Liquipedia Weaver 页面 API](https://liquipedia.net/dota2/api.php?action=parse&page=Weaver&prop=wikitext&format=json)，原始 wikitext 存在 `docs/research/weaver/liquipedia-wikitext.json`，页面声明 `ctrlver=7.42`。它用于核对官方文本未展开的主攻击力、破隐与断线规则，官方 KV/Datafeed 数值优先。
- `scripts/extract-hero-stats.mjs`、`extract-abilities.mjs`、`extract-upgrades.mjs`、`extract-attack-profiles.mjs` 分别生成属性、技能/先天/天赋、神杖/魔晶、攻击弹道资料；当前为 40 项常规技能、10 项先天、80 项天赋和 7 项额外升级技能。来源、生成器与运行时分别维护。

一级裸装有 520 生命、315 魔法、54–60 攻击力、425 射程；移动速度 275，基础攻击速度 120，基础攻击间隔 1.8 秒，攻击点 0.55 秒，弹道速度 900。三维为 16/17/20，成长 2.1/3.3/2。护甲、回复与魔抗沿用工程已经核对的 7.42 属性公式。

## 技能数据约定

| 入口 | 官方技能与关键数据 |
| --- | --- |
| Q 虫群 `weaver_the_swarm`（5289） | 12 只幼虫，速度 750，附着判定半径 100，持续 16 秒；攻击间隔 1.2/1.05/0.9/0.75 秒，伤害 18/23/28/33，每击降低 1 护甲；3/4/4/5 格生命，非英雄和幻象每次只造成 25% 格伤害。 |
| W 缩地 `weaver_shukuchi`（5290） | 即时施放，0.25 秒渐隐，持续 4 秒，移动速度下限 550，穿过目标一次造成 100/130/160/190 魔法伤害，半径 175；同一次缩地不能再次伤害同一目标。 |
| E 连击 `weaver_geminate_attack`（5291） | 官方行为为单位目标、自动施放、攻击；默认自动施放开启，不是退役版本的纯被动按钮。额外攻击在前一次攻击 0.25 秒后发出，发出后没有距离上限；仅额外攻击增加 20/35/50/65 伤害和 15 个百分点物品威力。 |
| R 时光倒流 `weaver_time_lapse`（5292） | 0.3 秒前摇，耗魔 150/75/0，CD 70/55/40；回到五秒前的位置、生命和魔法，强驱散并躲避弹道，不回滚经验、金币、技能或物品冷却。 |
| D 时光倒流（友军） `weaver_time_lapse_ally`（1915） | 神杖授予独立技能栏，500 施法距离，仅友方英雄；KV `DependentOnAbility` 与 `AbilitySharedCooldown` 均指向 R，等级跟随 R。 |
| 先天 命运之线 `weaver_threads_of_fate`（1754） | 对敌方英雄造成攻击/技能伤害后，在 700 范围内停留 1.25 秒建立丝线；每 6 秒减速 100%，持续 0.4 秒；断线距离为 `890+10×英雄等级`，英雄死亡后伤害增益残留 5 秒。旧 `weaver_rewoven` 保留在 KV 中，但不进入当前阵容。 |

命运之线的 `damage_per_thread_hero` 在 Datafeed 中标记 **`is_percentage=true`**，基础值为 10。官方中文天赋为“+5% 命运之线每根伤害”；KV 的 `+5` 和 Datafeed 的加法 operation 表示从 10% 增至 15%，不是增加五点固定攻击力，也不是把 10% 乘以 1.05。生成记录的 `valuePercentages` 保留百分比语义。辅助资料明确按当前**主攻击力（基础攻击力与主属性，即白字）**计算加成，不包括绿色物品额外攻击力；物品技能伤害不能建立丝线。断线距离在 Datafeed 中只有 890，KV 的 `hero_levelup=10` 必须补入，一级为 900、30 级为 1190。

八项天赋依官方顺序为：10 级 +50 缩地移动速度 / +5% 命运之线每根伤害；15 级 +90 缩地伤害 / +1 虫群生命格；20 级 +60 连击额外伤害 / +0.5 虫群削甲；25 级 -3 秒缩地冷却 / +1 连击。

## 神杖与魔晶

神杖把 R 的 CD 减少 10 秒，即 60/45/30 秒，同时提供 D。官方 Datafeed 的 D 耗魔、前摇和冷却数组均为零；KV 注释明确“AbilityCastPoint, AbilityManaCost and AbilityCooldown are read from weaver_time_lapse in code”。因此生成器从 R 继承这些有效字段和神杖减冷却，再由运行时根据 R 的当前等级解析；D 不能作为独立免费、零冷却技能使用。目标标记 `NOT_CREEP_HERO` 排除类英雄单位。

魔晶使缩地命中的敌人被标记 4.6 秒；脱离缩地 0.2 秒后，对编织者周围 1200 范围内仍被标记的敌人发出连击的额外攻击。连击还会攻击**原始主目标周围 1200 范围内带虫群附着的单位**；这不是在任意甲虫周围搜索普通敌人。这些字段独立由 KV 的 `special_bonus_shard` 生成，基础状态仍为零。

虫群 KV 还保留 `shard_cooldown_reduction` 的神杖碎片值 2，生成器如实保留该字段。但当前 Q 没有 `HasShardUpgrade`，Datafeed 的 Q `shard_loc` 为空，当前辅助资料也没有甲虫命中降低缩地冷却的行为。它可能是旧魔晶残留，尚无当前客户端代码或补丁证实，因此本次不启用任何从字段名推断的减冷却效果。

## 图片与模型

头像来自 Valve CDN 的 `heroes/weaver.png`，五个常规/额外技能图标来自 `abilities/weaver_{the_swarm,shukuchi,geminate_attack,time_lapse,time_lapse_ally}.png`，全部保存在已有 `assets/` 布局中。

专属 `abilities/weaver_threads_of_fate.png` URL 在核对日返回 404，因此 `assets/abilities/weaver_threads_of_fate.png` 保存的是 [Valve 通用先天图标](https://cdn.akamai.steamstatic.com/apps/dota2/images/dota_react/icons/innate_icon.png)，来源清单明确标注替代关系。没有用旧先天名称或其他技能图标冒充新先天专属纹理。

[官方透明模型视频](https://cdn.akamai.steamstatic.com/apps/dota2/videos/dota_react/heroes/renders/weaver.webm) 保存在 `docs/research/heroes/weaver.webm`；`scripts/extract-hero-render.mjs` 提取 0.8 秒时的透明静态 PNG 至 `assets/weaver.png`。游戏使用该 PNG 和模拟时间驱动的 Canvas 特效。

底部 HUD 的竖版头像 `assets/hud/portraits/weaver.png` 从本机 7.42 客户端的 `panorama/images/heroes/selection/npc_dota_hero_weaver_png.vtex_c` 解码。`scripts/extract-client-hud.py --hero weaver` 只提取这一张头像，保留其他既有 HUD 资源；文件哈希登记在英雄来源清单。

## 运行时与显示

`src/weaver-runtime.js` 分别管理甲虫实体、缩地状态、延迟额外攻击、命运线与回溯。甲虫飞行时不能被攻击，附着时生命格按真实攻击结算；减益免疫期间仍提供视野和物理伤害，减甲暂时失效。目标转隐身且无真视时甲虫脱落。命运线只由攻击、虫群和缩地伤害建立，主动物品伤害不建立丝线。弱幻象继承命运线，连击遵守现有幻象强弱约定。

缩地在 0.25 秒渐隐期间可攻击或施法，完全隐身后普通攻击与非 `IGNORE_INVISIBLE` 物品/技能会结束缩地，并在 0.2 秒后触发魔晶标记攻击。缩地施放时，无敌方真视则立即躲避已有追踪弹道。连击额外攻击独立保存、使用普通攻击物品触发，增加 15% 物品威力，不消耗普通攻击冷却、不递归；后续缴械不取消已经安排的额外攻击。

回溯按模拟时间每 0.1 秒采样，每个英雄或幻象最多保留 64 条记录。存档保存这些记录并拒绝损坏或无界数组；开发者调整时钟会重新定位时间戳。网络服务器保留权威历史，公共快照只提供单个回溯预览，客户端不重复记录历史。死亡前最后存活的锚点跨复活保留，供五秒目标时间落在死亡期间时回溯；这个选择依据辅助资料的“恢复死亡前数值、复活后不会因此死亡”，没有客户端逐 tick 认证。

虫群、连击弹道、缩地轨迹、命运线和回溯特效均读取模拟状态与游戏时间，暂停时像素稳定。命运线不追踪隐藏敌人的真实位置；敌方友军回溯目标仍隐身时不绘制其坐标或路径。绘制不保留以死亡幻象 ID 为键的长期丝线缓存。

## AI 与验证范围

编织者进入既有阵容轮换并使用专门的核心/游走评分。出装沿用真实购买、组件合成、背包管理与信使配送，主要路线为动力鞋、漩涡、魔龙枪、黑皇杖、魔晶、雷神之锤，后续购买防御、反制和神杖；这是本工程 AI 决策，不是 Valve 官方装备推荐。

AI 根据真实五秒前历史选择明显恢复生命或安全强驱散的 R/D，避免把友军回溯到更低生命；主动缩地期间继续移动，以自动连击进行常规攻击。使用 Q/W 后仍遵守现有反应计时，不在每帧重复发起无效施法。数据消费者、真实阵容生成和升级继承由 `tests/weaver-data.test.mjs` 定向验证，实际施法、逃生移动与购买由 `tests/weaver-bot.test.mjs` 验证。`tests/bot-draft.test.mjs` 继续验证十英雄的真人锁定、角色互补、每英雄轮换、合作构造与存档，不通过放宽平衡条件来掩盖新增英雄的问题。战斗行为、浏览器与集成上传证据由主任务补充。

## 未认证边界

辅助资料核对了破隐同时结束缩地并从结束时刻计划魔晶的 0.2 秒额外攻击；命运线目标的已建立减益可被弱/强驱散，驱散会断线。这些隐藏规则来自辅助资料，不冒称全部由官方 KV 明示。

这些资料能证明官方数值、当前技能阵容与显式目标/升级约定，不能证明二维实现与 Dota 2 客户端完全等价。隐藏多重攻击与物品触发时序、甲虫视野与客户端碰撞判定，尚无当前客户端逐项采样认证；运行时采用的选择和真实行为测试需分别记录。历史采样、二维地形和视野使用工程现有约定。幻象继续保留用户明确要求的弱幻象关闭臂章主动力量规则，不能冒称 Valve 原生幻象完全等价。
