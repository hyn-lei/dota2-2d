# 英雄装备推荐来源

装备推荐按玩家英雄和职责使用 7.42a 的公开 Steam 指南及职业赛购买记录。2026-11-27 查询 Valve 补丁列表，7.42a 是最新版本，官方时间为 2026-11-24 08:00 UTC。[Valve 补丁列表](https://www.dota2.com/datafeed/patchnoteslist?language=english) · [7.42a 公告](https://www.dota2.com/patches/7.42a)

Valve 客户端默认指南提供后备推荐。以 7.42 的 SteamTracking/GameTracking-Dota2 公开镜像为快照，十份本地 `default_*.txt` 均标记作者 `Valve`。[客户端指南固定提交](https://github.com/SteamTracking/GameTracking-Dota2/tree/76ab89451c1384c2e106b676258c6e9f72787e11/game/dota/itembuilds)

原始快照存放在 `docs/research/item-builds-742/`；[manifest](research/item-builds-742/manifest.json) 记录每份文件的固定来源 URL、原始字节 SHA-256、指南标题、旧名称转换和过滤结果。生成器只读取本地文件，不在生成时请求网络；运行 `node scripts/generate-hero-item-builds.mjs` 会重新生成 `src/hero-item-builds.js` 和 manifest。

指南覆盖当前十名可用英雄。运行时英雄 ID 保持不变；风行者的运行时 `windranger` 对应 Valve 文件 `default_windrunner.txt` 及来源英雄名 `npc_dota_hero_windrunner`。

## 7.42a 指南和实战样本

Steam Workshop 上 ImmortalFaith 发布的 14 份指南覆盖现有十英雄。指南文件内的 `GameplayVersion` 均为 `7.42a`。快照保留 Workshop ID、职责、更新时间、订阅和投票数、公开文件地址、SHA-256 和用于推荐的物品阶段。订阅和投票表示读者参与度。指南没有披露对局样本量或固定阵容，因此根据职责使用指南，由本地阵容规则补充克制选项。[指南证据快照](research/item-builds-742/workshop-guides.json)

| 英雄 | 对应职责及 Steam 指南 |
| --- | --- |
| 斧王 | [劣势路](https://steamcommunity.com/sharedfiles/filedetails/?id=1468038788) |
| 混沌骑士 | [安全路核心](https://steamcommunity.com/sharedfiles/filedetails/?id=1468040611) |
| 陈 | [辅助及游走](https://steamcommunity.com/sharedfiles/filedetails/?id=1468093614) |
| 水晶室女 | [辅助及游走](https://steamcommunity.com/sharedfiles/filedetails/?id=1468094690) |
| 卓尔游侠 | [安全路核心](https://steamcommunity.com/sharedfiles/filedetails/?id=1468060309) |
| 剑圣 | [安全路核心](https://steamcommunity.com/sharedfiles/filedetails/?id=1468064842) |
| 昆卡 | [中路核心](https://steamcommunity.com/sharedfiles/filedetails/?id=1468046531) |
| 食人魔魔法师 | [辅助及游走](https://steamcommunity.com/sharedfiles/filedetails/?id=1468103159)、[劣势路](https://steamcommunity.com/sharedfiles/filedetails/?id=1829488832) |
| 编织者 | [安全路核心](https://steamcommunity.com/sharedfiles/filedetails/?id=1468079905)、[游走](https://steamcommunity.com/sharedfiles/filedetails/?id=1683022789) |
| 风行者 | [中路](https://steamcommunity.com/sharedfiles/filedetails/?id=1780567951)、[劣势路](https://steamcommunity.com/sharedfiles/filedetails/?id=1468110686)、[辅助及游走](https://steamcommunity.com/sharedfiles/filedetails/?id=2177205431) |

OpenDota 公共 Explorer 快照保留完整十人英雄阵容、公开队伍 ID、分路以及本项目英雄的首次购买所依赖的事件记录。查询使用 OpenDota 的 7.42 大版本标记，按 Valve 7.42a 上线时间划分子版本。2026-11-24 08:00 至 11-27 13:00 UTC 的当期段包括 BLAST SLAM IX 的 19 场已解析比赛。较早的 57 场来自 BLAST SLAM IX 和 DreamLeague Division 2 Series 5，保留作历史参考。[OpenDota API](https://www.opendota.com/api) · [查询和比赛快照](research/item-builds-742/opendota-professional.json)

职责按 OpenDota 的分路、游走标记和第 10 分钟补刀估算。35 刀起识别为对应分路核心，24 刀以内按安全路、劣势路或游走情况识别辅助，歧义样本跳过。一条职责路线至少需要 5 个当期样本，单件物品至少出现在 60% 的样本和 3 支队伍中。符合条件的物品按首次购买中位时间排序。常规前期截止 10 分钟，900 金及以下的小件放宽到 12 分钟。

| 7.42a 职业场次 | 观察 |
| --- | --- |
| 混沌骑士安全路核心 | 5 场、5 支队伍。5 场都买臂章，其中 4 场买紫苑、4 场买黑皇杖。 |
| 风行者劣势路辅助 | 8 场、5 支队伍。8 场都买影之灵龛和精华萃取器，6 场买圣洁裹手。 |
| 编织者安全路核心 | 1 场可复核，约 15 分钟买黯灭、37 分钟买代达罗斯。[比赛 9104081844](https://www.opendota.com/matches/9104081844/overview) |

样本只支持所记录的分路和比赛范围，购买频率受阵容、比赛时长、版本更新和同队重复比赛影响。第三方 7,000+ MMR 指南提供补充线索，作者报告陈辅助的 178 场为 7.42a。编织者和剑圣各 100 场中分别有 40 场和 91 场为 7.42a，两份指南仍混有 7.42。部分天梯 MMR 由作者按排行榜估算，原始对局未随指南发布。同步保留其公开摘要和文件哈希供核查。[7000+ 指南交叉核对](research/item-builds-742/workshop-ranked-cross-checks.json)

## 映射与数量

五个阶段分别将 Valve 的 `Starting_Items`、`Early_Game`、`Mid_Items`、`Late_Items`、`Other_Items` 映射为 `starting`、`early`、`mid`、`late`、`situational`。重复的 `"item"` 键按原始顺序读取，同阶段内同一物品合并为 `{id, quantity}`；第一次出现的位置保持不变。例如编织者的三根铁树枝干生成 `{id: "branch", quantity: 3}`。

生成器以 `src/item-data.js` 的 `ITEMS` 中 `dotaName → id` 建立当前可购买物品映射，保留已有物品 ID。可购买资格与 `inventory.js` 的静态 `purchasable` 条件一致；零价格不表示不可购买，因此侦察守卫会保留。金币、库存、购买时间、神秘商店与物品栏空间仍由实际购买事务检查，推荐不会绕过这些条件。

客户端默认指南仍含两种旧名称，生成器显式转换并逐项记录在 manifest：

- 斧王的 `item_travel_boots_1` 映射到当前 `item_travel_boots`，保持运行时 ID `travel_boots`。
- 水晶室女的 `item_shadow_blade` 映射到当前 `item_invis_sword`，保持运行时 ID `invis_sword`。

混沌骑士指南里的 `Item_aghanims_shard`、昆卡指南里的 `Item_lotus_orb` 使用了大写前缀；生成器先归一为小写再匹配当前物品，并在 manifest 中记录这两次名称转换。快照原文不改。

陈的 `item_necronomicon_3` 不在当前物品数据中，属于已退役死灵书三级，生成的可购买推荐会跳过它。原始快照保留，manifest 记录跳过阶段、名称、数量和原因。不会擅自以其他装备替换缺失物品。

## 编织者与解释边界

[编织者的 Valve 默认指南](https://github.com/SteamTracking/GameTracking-Dota2/blob/76ab89451c1384c2e106b676258c6e9f72787e11/game/dota/itembuilds/default_weaver.txt) 将魔杖、漩涡、散夜对剑列为中期；黑皇杖、代达罗斯和阿哈利姆魔晶列为后期；黯灭列在其他装备中。代达罗斯保持已有 ID `greater_crit`，黯灭保持已有 ID `desolator`。它们分别提供暴击和减甲，推荐显示可以据此解释适用目的，原始指南本身没有这些解释文案。

7.42a 的核心指南将漩涡、雷神之锤列入持续输出路线，并将黑皇杖及撒旦之邪力列入生存选择。商店将黯灭和代达罗斯保留在物理路线中。中文理由读取本地攻击系统使用的物品数值，当前黯灭减 6 点护甲，代达罗斯普攻暴击为 30% 概率和 225% 倍率。职业记录和指南分别支持这些选择在对应场景中的适用性。

## 商店展示与操作

商店左侧推荐区按前期、核心、备选展示，跟随玩家自己的英雄和职责。当前指南的起始和对线装备进入前期，核心装备进入核心，奢侈或防御装备进入备选。满足采样条件的职业路线排在对应阶段前方，并显示购买数量。其后使用当前职责的指南并保留旧指南的补充物品和多件购买数量。无对应职责证据时使用 Valve 后备。

公开奖池中的敌方英雄用于判断缩地隐身、组合控制和技能护甲。检测装备在对线期可用，控制和护甲应对从 10 分钟起按核心或辅助职责提示，25 分钟时增加后期选择。应对分支考虑玩家已持有和由自己信使运输的物品。分支读取选人、公开分工、阶段及玩家自产库存信息。

推荐条目沿用单击详情、双击或右键购买、Shift 加入快捷购买，以及真实的库存、商店范围和购买限制。已拥有状态统计玩家的装备栏、背包、储藏和自有信使货物。堆叠补给按充能折算购买份数，信使仅在本地数量不足而在途货物足以补齐时显示“运送中”。关闭商店时跳过更新，打开时根据职责、对局阶段和自有资源变化缓存分支。推荐面板只读当前状态，购买和队列仍由商店的明确操作触发。

`tests/hero-item-recommendations.test.mjs` 覆盖十英雄角色路线、证据回退和阵容应对，`tests/browser-shop-recommendations.mjs` 覆盖编织者真实购买与布局，`tests/browser-shop-recommendation-boundaries.mjs` 覆盖中立分类、堆叠守卫、离店信使运输和更新阶段时的队列保留。

更新时先核对最新补丁和来源记录，再更新本地 Workshop 与 OpenDota 快照。运行 `node scripts/generate-current-hero-item-builds.mjs` 按现有物品 ID 和已实现效果生成运行时数据，并用同命令的 `--check` 验证可复现性。运行时从本地模块读取数据。实际效果以当前二维运行时为准。[物品运行时来源](item-runtime-sources.md)
