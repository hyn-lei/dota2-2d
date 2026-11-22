# 英雄装备推荐来源

推荐的阶段、物品和阶段内原始顺序来自 Valve 客户端默认出装指南。当前参照版本为 7.42，固定使用 SteamTracking/GameTracking-Dota2 的提交 [`76ab89451c1384c2e106b676258c6e9f72787e11`](https://github.com/SteamTracking/GameTracking-Dota2/tree/76ab89451c1384c2e106b676258c6e9f72787e11/game/dota/itembuilds)。SteamTracking 是客户端文件的公开镜像；十份本地 `default_*.txt` 文件均标记作者 `Valve`。

原始快照存放在 `docs/research/item-builds-742/`；[manifest](research/item-builds-742/manifest.json) 记录每份文件的固定来源 URL、原始字节 SHA-256、指南标题、旧名称转换和过滤结果。生成器只读取本地文件，不在生成时请求网络；运行 `node scripts/generate-hero-item-builds.mjs` 会重新生成 `src/hero-item-builds.js` 和 manifest。

指南覆盖当前十名可用英雄。运行时英雄 ID 保持不变；风行者的运行时 `windranger` 对应 Valve 文件 `default_windrunner.txt` 及来源英雄名 `npc_dota_hero_windrunner`。

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

这是 Valve 随客户端提供的默认指南，不是胜率、职业比赛或玩家购买率统计，也不能证明某一套出装在所有阵容中“最强”。7.42 表示本项目选用的客户端快照和物品数据版本，不保证所有默认指南都已针对该版本重新调整；指南中保留的旧名称和退役物品也体现了这一边界。

## 商店展示与操作

商店左侧推荐区约为原商店宽度的一半，按前期、核心、备选展示，固定跟随玩家自身英雄。中期与后期合并为核心，编织者将原指南的黯灭备选提高展示顺序，与代达罗斯之殇一起说明减甲和暴击收益；这项排序及中文理由是本项目根据实际技能与物品效果的解释，不改写原始指南。

推荐条目沿用现有的单击详情、双击/右键购买、Shift 加入快捷购买、库存与真实购买限制。物品、数量和已拥有状态同时统计玩家的装备栏、背包、储藏和自有信使货物；堆叠补给按充能折算实际购买份数。关闭商店时不更新推荐区，打开后以整秒、整金和物品实例变化缓存，避免增加每帧规划工作。

`tests/browser-shop-recommendations.mjs` 验证编织者理由、真实购买、队列、查看敌人仍为自身推荐、桌面半宽布局与小屏无横向溢出；`tests/browser-shop-recommendation-boundaries.mjs` 验证中立分类切回普通推荐、两枚堆叠侦察守卫的拥有状态和消耗后的更新。原商店组件抵扣与退款用例继续通过。

界面的中文理由、适用场景、展示排序或额外优先级属于本项目的解释与设计，不应称为 Valve 原文。实际效果以当前二维运行时为准；物品实现及尚未核对的客户端行为见 [物品运行时来源](item-runtime-sources.md)。
