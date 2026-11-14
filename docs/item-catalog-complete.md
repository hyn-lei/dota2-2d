# 完整商店目录

目标补丁为 **7.41f**。2026-11-14 再次检查 [Valve 补丁列表](https://www.dota2.com/datafeed/patchnoteslist?language=english)，该接口仍以 7.41f 为最新条目。完整物品快照获取于 2026-10-28。

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

## 所选装备效果显示

2026-11-14 修复桌面商店把 `.item-description` 隐藏的问题。详情使用已有记录中的 `description`、`activeDescription` 和 `notes`，把属性与各项主动、被动、开关、升级等效果分开显示，保留说明内的数值、范围、持续时间与使用限制。多段数值说明归属其前面的效果，卷轴显示合成说明；补充规则可在“效果细节”中展开。悬停预览与所选详情共用效果排版，补充规则在可交互的所选详情中查看。

选中目录、组件或已持有装备后，商店回到该物品的详情位置；换物品时重置说明滚动位置。效果区域有独立滚动条，手机不再把说明限制到原来的 90 像素。

双击购买保留第一次点击的装备，避免展开说明或自动滚动后第二次点击落到其他控件；单击只查看，右键继续购买所指装备。

当天直接核对 [Valve 狂战斧数据](https://www.dota2.com/datafeed/itemdata?language=schinese&item_id=145)：常驻攻击力 +50、生命恢复/秒 +7.5、魔法恢复/秒 +2.75；近战分裂对英雄 60%、对非英雄 40% 物理伤害，最远 650 距离。砍伐、压制和分裂分别显示。这些数值与现有记录一致，本次只改变显示，不更新官方快照、生成器或战斗规则。测试覆盖全部 268 件可购物品的说明完整性及四种屏幕尺寸，证据见 [本轮验证](verification/2026-11-14-shop-effects.md)。
