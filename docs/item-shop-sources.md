# 商店物品目录与数据来源

> 本文件保留 2026-10-26 的 44 项基础商店历史记录。当前目录与运行时已扩展，请以 [完整目录](item-catalog-complete.md) 和 [运行时说明](item-runtime-sources.md) 为准；不要用旧 `extract-shop-items.mjs` 覆盖当前完整目录。

目录目标版本为 **7.41f**；本轮中文物品响应与图标获取日期为 **2026-10-26**。这里只记录物品数据、配方及素材的来源，不表示整个商店或所有 Dota 物品行为均已完成复刻。

## 目录范围

运行时现已接入六格装备、三格背包、六格储藏、组件自动合成、扣除已有组件的购买报价、快捷购买及出售退款。背包失效与靠近商店免除六秒激活延迟参考 [Valve 7.00 背包说明](https://www.dota2.com/700/gameplay)。换装保留生命/魔法比例，防止低生命或低魔法状态反复切换属性装备获利。原版的初次进入背包宽限时间、拆分/锁定合成、落地物品、信使运输、共享和全物品主动效果不在本轮范围内。

主商店取货范围沿用本工程泉水周围 1200 世界单位，神秘商店使用原始地图商店坐标周围 600 单位；这些服务半径尚未经当前客户端逐点实测。空灵挂件的魔法上限百分比在本工程按相加百分比后乘基础总魔法计算；官方数据确认单件 3%，未据此宣称叠加隐藏规则也已验证。

`src/item-data.js` 共有 **44 项**：保留原来的 31 件基础物品，增加 4 件基础配件、6 件合成装和 3 种收费图纸。分类数为属性 12、装备 12、神秘商店 11、合成装 6、图纸 3。

- 新增基础配件：闪电指套、振奋宝石、极限法球、恐鳌之戒。
- 新增合成装：护腕、怨灵系带、空灵挂件、空明杖、坚韧球、振魂石。
- 收费图纸：护腕、怨灵系带、空灵挂件，每张 210 金币。

所有旧 `id` 与 Dota 数字 ID 的对应关系保持不变，包括 `arcane` 仍表示魔力法杖，以及 `staffwizardry` 别名。中文名称使用本轮官方简体中文响应，例如 `circlet` 是“圆环”，`diadem` 是“宝冕”。

## 原始来源与快照

1. [Valve Item Datafeed](https://www.dota2.com/datafeed/itemdata?language=schinese&item_id=73) 提供中文名称、总价、说明、全部公开属性字段。原有 31 项的英文快照 `docs/research/items/{id}.json` 保留，新中文快照另存为 `{id}-schinese.json`。13 项新增内容存为 `{24,55,67,69,72,73,74,75,76,77,129,279,485}.json`。
2. [Valve Item List](https://www.dota2.com/datafeed/itemlist?language=english) 的已有快照 `docs/research/items/itemlist.json` 提供内部名称、英文名称、图纸数字 ID 和配件顺序。列表中 `item_recipe_*` 的 `recipes` 包含配件，收费图纸本身需另外计入合成需求。
3. `docs/research/items/items.txt` 是工作区已有的 Valve 客户端物品 KV 快照；其来源链见 [属性来源记录](research/attributes-sources.md) 中固定到 commit `d50f4d992e5b58d037b1da2de759cd7e1a2128d4` 的 [Valve depot 文件镜像](https://github.com/SteamTracking/GameTracking-Dota2/blob/d50f4d992e5b58d037b1da2de759cd7e1a2128d4/game/dota/pak01_dir/scripts/npc/items.txt)。本轮从中读取 `ItemCost`、`SecretShop`、`ItemRecipe`、`ItemResult` 和 `ItemRequirements`，并与官方 API 的全部 44 项价格交叉核对。提取结果保存在 `docs/research/items/shop-items-script.json`。
4. 图片来自 [Valve Steam CDN 的 Dota React 物品目录](https://cdn.akamai.steamstatic.com/apps/dota2/images/dota_react/items/bracer.png)，保存在 `assets/items/{内部名}.png`。44 个本地 PNG 共 471,146 字节。Valve 没有这三种图纸专属 PNG；对应文件使用官方共享 [recipe.png](https://cdn.akamai.steamstatic.com/apps/dota2/images/dota_react/items/recipe.png)，未自行绘制装备图标。每个本地文件的下载 URL 和 SHA-256 见 `docs/research/items/shop-icons.json`。

输入快照校验值：

| 文件 | SHA-256 |
| --- | --- |
| `items.txt` | `ab8558b5458ccc742a3eae8c89f4d2d348e3af850ef43f5403c5fb324e744951` |
| `itemlist.json` | `829f67446e6a88acd1e4deedabd59090546130dda7bd319fbca13808c7cf99d9` |

## 合成关系

| 成品 ID | 配件 ID（包含需要购买的图纸） | 总价 |
| --- | --- | ---: |
| `bracer` | `circlet` + `gauntlets` + `recipe_bracer` | 505 |
| `wraith_band` | `circlet` + `slippers` + `recipe_wraith_band` | 505 |
| `null_talisman` | `circlet` + `mantle` + `recipe_null_talisman` | 505 |
| `oblivion_staff` | `blitz_knuckles` + `robe` + `sobi` | 1625 |
| `perseverance` | `healthring` + `voidstone` | 1400 |
| `soul_booster` | `pointbooster` + `vitality` + `energy` | 3000 |

成品 `cost` 是完整总价；`components` 用项目稳定 ID 表示直接配件。三种收费图纸带 `recipeOnly:true`、`recipeFor`，且 `stats` 为空。其余三种合成的原始图纸费用为零，因此目录不提供可购买的零价图纸。

`secretShop` 直接使用 KV 的 `SecretShop`，不根据价格或品质猜测。例如治疗指环和虚无宝石虽然 `ItemQuality` 为 `component`，仍被标记为神秘商店物品。合成装本身不是神秘商店物品，所需配件各自保留购买地点标记。

## 属性与局限

- API 的 `special_values` 映射到当前属性字段，不通过相加配件属性猜测成品效果。例如空明杖当前为 10 智力、35 攻速、1.25 魔法恢复；坚韧球为 5.5 生命恢复、2.25 魔法恢复。
- 空灵挂件的 `bonus_max_mana_percentage:3` 显式保留为 `stats.maxManaPercent:3`；不能只录入三维与回魔而丢弃该效果。官方公开响应未说明多个百分比魔法值加成的叠加公式，此目录不把叠加语义标记为已由原版客户端验证。
- 新增物品没有主动技能、触发伤害或光环等需要另外实现的战斗效果。原有铁树枝干仍保留 `unimplementedActive:'Plant Tree'`，说明文字也明确种树暂未实装。
- 配方记录不代表拆分、合成锁定、信使运输等操作已经实现。不是完整 Dota 装备库，未加入具有未支持复杂效果的其他装备。

## 再生成与检查

```sh
node scripts/extract-shop-items.mjs
node --test tests/item-data.test.mjs tests/attributes.test.mjs
```

默认生成过程只读取本地快照和图标。首次获取或显式刷新中文响应时使用 `node scripts/extract-shop-items.mjs --fetch`；该参数也会补下载缺失的官方图标。若未来 API 数值已变更，需要同步核对目标补丁、KV 快照及获取日期，不能沿用本记录的 7.41f 断言。

`tests/item-data.test.mjs` 检查旧 ID、分类、官方配方关系、收费图纸价格、总价守恒、神秘商店标记、空灵挂件百分比属性以及每个本地 PNG。既有 `tests/attributes.test.mjs` 继续逐件对比官方属性与价格快照。
