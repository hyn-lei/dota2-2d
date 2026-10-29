# 7.41f 英雄属性与装备数值来源

快照获取日期：2026-10-24。最新版本由 [Valve 补丁列表](https://www.dota2.com/datafeed/patchnoteslist?language=english) 确认。

## 原始资料

- 五名英雄的 [Valve Hero Datafeed](https://www.dota2.com/datafeed/herodata?language=english&hero_id=23)：`heroes/{2,5,8,21,23}.json`。
- [当前游戏脚本镜像，commit d50f4d9](https://github.com/SteamTracking/GameTracking-Dota2/tree/d50f4d992e5b58d037b1da2de759cd7e1a2128d4/game/dota/pak01_dir/scripts/npc/heroes)：原始 base hero 和五名英雄 KV 保存在 `heroes/`。这是 Valve depot 的原始定义，不是手填的原型数值。
- 三十一件基础装备逐件获取 [Valve Item Datafeed](https://www.dota2.com/datafeed/itemdata?language=english&item_id=29)，原始响应在 `items/{id}.json`。
- shipped client 的属性说明存为 `heroes/dota-stat-localization.txt`；相关 [7.27](https://www.dota2.com/datafeed/patchnotes?version=7.27&language=english)、[7.32](https://www.dota2.com/datafeed/patchnotes?version=7.32&language=english)、[7.33](https://www.dota2.com/datafeed/patchnotes?version=7.33&language=english)、[7.38](https://www.dota2.com/datafeed/patchnotes?version=7.38&language=english) 原始补丁也保存在 `heroes/`。

## 公式和数据语义

- 每点力量：22 生命、0.1 生命恢复/秒。
- 每点敏捷：1/6 护甲、1 攻击速度。
- 每点智力：12 魔法、0.05 魔法恢复/秒、0.1 个百分点基础魔法抗性。
- 普通主属性每点提供 1 攻击力；全才从三项属性的总和获得 `0.45 × 总属性` 攻击力。当前风行者是全才。
- 物理伤害系数：`1 - 0.06 × armor / (1 + 0.06 × abs(armor))`，负护甲会放大伤害。
- 攻击间隔：`BAT × 100 / attackSpeed`；攻速限制为 20–700。剑圣的基础攻速为 110，风行者为 90，不能把所有英雄统一写为 100。
- 升级先计算三维成长，再计算衍生属性；装备全属性不会重复计入攻击力。重复的速度之靴不叠加移动速度。
- XP 数组以当前等级索引；1→2 需要 240 XP，等级上限 30。旧版 230 的数字没有沿用。

官方网页 API 的普通英雄 damage 字段已经包含主属性；风行者的字段却不包含全才加成。因此基础伤害以原始英雄脚本为准，测试分别核对 API 的不同语义。API 的 magic_resistance 字段为基础 25%，没有列出智力带来的附加魔抗。

`tests/attributes.test.mjs` 把五名英雄一级的生命、魔法、护甲、恢复、范围、移速、攻击伤害与官方快照逐一比较，并逐件比较装备价格和 bonus 字段。

## 范围

这些是基础数值、自然等级成长和三十一件基础装备的被动属性。英雄技能仍沿用本项目的既有二维操作版本；没有借此宣称天赋、先天技能、全部主动装备或每一种临时状态都已逐项还原。铁树枝干的种树主动效果未实现。
