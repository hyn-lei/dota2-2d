# 完整商店目录

目标补丁为 **7.41f**。2026-10-31 再次检查 [Valve 补丁列表](https://www.dota2.com/datafeed/patchnoteslist?language=english)，该接口仍以 7.41f 为最新条目。完整物品快照获取于 2026-10-28。

## 范围与生成

`src/item-records.js` 包含 270 条记录，其中 268 条可购买，包含 80 张收费卷轴。非收费自动配方、中立物品及过时装备不放入购买列表。额外保留已下架短棍的兼容记录，以及不可直接购买的组合眼包装记录。运行时为 85 件可主动使用的物品提供施放处理。

原有项目 ID 保留，例如 `blade` 为阔剑、`arcane` 为魔力法杖、`robe` 为法师长袍。不要凭英文名称猜测 ID。`staffwizardry` 仍作为 `arcane` 别名。

来源：

- [Valve Item List](https://www.dota2.com/datafeed/itemlist?language=english)：名称、物品类别和配方关系。
- [Valve Item Datafeed](https://www.dota2.com/datafeed/itemdata?language=schinese&item_id=1)：中文说明、价格、属性、施法与充能数值。逐件响应位于 `docs/research/items/full/{id}-schinese.json`。
- 客户端 KV 快照 `docs/research/items/items.txt`：可购买标记、商店、替代配方、库存、共享、拆分、掉落及背包限制。快照来源链见 [旧物品来源说明](item-shop-sources.md) 与 [属性来源说明](research/attributes-sources.md)。
- [Valve CDN](https://cdn.akamai.steamstatic.com/apps/dota2/images/dota_react/items/blink.png)：270 个本地物品图标；收费卷轴采用官方通用 recipe 图标。

完整清单及排除原因位于 `docs/research/items/full-catalog-manifest.json`；提取的 KV 字段位于 `full-items-script.json`；图标 URL 和摘要位于 `full-icons.json`。

```sh
node scripts/extract-full-items.mjs
node --test tests/full-item-data.test.mjs tests/attributes.test.mjs
```

默认复用本地快照，`--fetch` 才刷新远端数据。新增机制必须同时核对生成器和运行时，不能只填说明。普通属性、主动效果、临时加成分开映射，例如迅疾闪光的主动敏捷不会常驻；假腿的选定属性由实例模式决定。

## 数据与执行的边界

替代配方、收费卷轴成本、物品价格、本地图标及关键属性均有独立快照回归。执行测试验证目标合法性、经济守恒和战斗效果，不能证明所有客户端隐藏规则完全一致。

2026-10-31 直接复查 [撒旦之邪力数据](https://www.dota2.com/datafeed/itemdata?language=schinese&item_id=156) 发现：常驻吸血字段为 25%，主动额外吸血为 145%，描述用的总量字段仍为 175%。本实现使用数值字段相加，得到 170%；商店说明显示该实际值，原始 175% 仍保留在快照与 `values` 中。这是来源内部冲突，未宣称客户端实测结论。

商店、运输及战斗的具体实现与限制见 [运行时说明](item-runtime-sources.md)；五位英雄升级见 [神杖与魔晶说明](hero-upgrades-sources.md)。
