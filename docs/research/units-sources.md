# 7.41f 建筑、野怪和兵线数据

## 来源

- Valve 游戏 depot 原始 [npc_units.txt](https://raw.githubusercontent.com/SteamTracking/GameTracking-Dota2/master/game/dota/pak01_dir/scripts/npc/npc_units.txt) 和 [npc_abilities.txt](https://raw.githubusercontent.com/SteamTracking/GameTracking-Dota2/master/game/dota/pak01_dir/scripts/npc/npc_abilities.txt)，2026-10-24 获取；原文件与解析结果保存在 `units/`。
- 官方 [7.41 补丁](https://www.dota2.com/datafeed/patchnotes?version=7.41&language=english) 覆盖旗手经验 60、30/60 分钟攻城车数量、洪流营地的进化上限。相关 7.38、7.40、7.41 原始 JSON 保存在 `units/`。
- 建筑位置和队伍、兵路、近战/远程兵营分类来自真实地图实体，详见 [地图来源](map-sources.md)。
- 建筑偷塔保护的 50% 减伤见 [Valve 7.29](https://www.dota2.com/dawnbreaker?l=english)，90/秒修复、900 范围、15 秒延迟取自原始 `backdoor_protection` 技能定义。
- 原始定义没有展开 C++ 中的兵线成长；补充核对 [Lane Creeps](https://liquipedia.net/dota2/Lane_Creeps)。若网页旧表与当前 depot 基础值冲突，优先保留 depot 数值。超级兵的基础攻击力在本快照为近战 41–49、远程 46–51；不得用旧表覆盖为 36–44 / 41–46。

## 已接入

- 22 座防御塔、12 座兵营、2 遗迹、2 泉水、14 基地填充建筑。
- 塔生命 1800 / 2500 / 2500 / 2600；基础护甲 12 / 16 / 16 / 21；四塔每座存活兵营再增加 4 护甲。
- 近战兵营生命 2200、护甲 15、恢复 5；远程兵营生命 1300、护甲 9、无自然恢复。遗迹生命 4500、护甲 23、恢复 12。
- 野怪表含 47 种单位、22 套常规营地编组及洪流营地的混合进化编组。地图上的 28 个营地都使用实际刷新框。
- 60 秒首次刷新，此后每分钟检查是否有单位阻挡；空营地刷新、拉出刷新框可以形成堆叠。野怪有中立阵营、攻击、追击、回营、击杀奖励、7.5 分钟成长和部分主动控制技能。泥土傀儡死亡产生碎土傀儡。
- 肉山使用原始基础属性，死亡后随机 8–11 分钟刷新；击杀者获得五分钟不朽之守护，致命伤害触发原地五秒复生。
- 兵线 30 秒一波，3 近战 + 1 远程开局；5 分钟开始攻城车；2 分钟开始每分钟一只旗手。兵营分别升级对应兵种，全部兵营摧毁才产生超级大兵。
- 树木、地形和存活建筑阻挡导航；建筑死亡后释放其占地。

## 数据与二维实现的界限

2026-11-08 补齐单位技能查看：原有 67 项 KV 能力以及单位引用、但旧 KV 缺少的寒冰盔甲、诱捕、亡灵复生均进入底部技能栏。后 3 项由 Valve 官方 datafeed 的能力 5304 / 5305 / 5306 补充，原始响应与 URL 独立保存在 `units/supplemental-ability-datafeed.json`，获取器为 `scripts/fetch-unit-skill-details.mjs`。这些补充定义用于准确展示，不会自动增加此前不存在的施法行为。

技能名称、说明、属性标题与图标来自本机 Valve 客户端（Steam build 26139613），所选原始 token 和纹理哈希保存在 `units/client-ability-tokens.json`；`scripts/extract-client-unit-skills.py` 只读 VPK 并调用 Source 2 Viewer CLI 20.1 解码，`scripts/generate-unit-skill-ui.mjs` 单独生成展示数据。客户端没有提供“野怪成长”的公开文案/图标，其说明从原始成长数值生成；带 HIDDEN 标记的内部能力遵循原版隐藏方式。单位技能查看不再被英雄类型条件阻断，野怪、被支配单位、兵线、建筑、守卫和信使共享原来的底部栏，详情只读。

旗手的鼓舞光环已接入实际战斗和状态栏：700 范围内己方兵线（含旗手自身）获得 3/秒额外生命恢复；每 450 秒增加 4% 魔抗，最多 15 次。魔抗和已有魔抗按剩余伤害乘算，多名旗手不会重复叠加；离开范围或所有来源死亡后立即消失。英雄/野怪/建筑不接受该光环。成长、死亡、暂停和存档恢复使用同一模拟状态。这是本次明确补齐的效果，不表示其他未实现野怪能力已因图标显示而自动生效。

`RingRadius` 是选择圈，不能当作碰撞半径。本项目将它保存在 `selectionRadius`；建筑碰撞使用导出 bounds，移动单位使用二维碰撞约定。导航是 64 单位栅格，不能等同 Source 2 原生寻路网格。

原始技能表包含 67 项能力定义；当前战斗已接入常见踩地板、震击、投石、闪电、冲击波和法力燃烧等效果，不是全部中立被动/主动技能的完整虚拟机。肉山的完整掉落轮次、离洞限制、迁洞行为、中立装备掉落、所有光环及单位推挤仍有简化。基础建筑生命和属性、保护顺序、偷塔保护与兵营升级已实现；建筑经济奖励和仇恨优先级也没有宣称与服务器逐帧一致。

`unit-data.js` 保留原始定义中的 mega 基础值和 `requiresEngineUpgrade` 标记；引擎在产生 mega 单位时应用 30 次成长上限。它不是把原始基础生命 700 / 475 直接作为最终 mega 生命。额外单位魔法、视野和技能伤害由 `scripts/extract-unit-extras.mjs` 从同一份 KV 提取。
