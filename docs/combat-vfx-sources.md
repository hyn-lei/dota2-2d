# 战斗外形与特效参照

2026-11-01 核对 [Valve 官方补丁列表](https://www.dota2.com/datafeed/patchnoteslist?language=english)，最后一项为 **7.41f**。本轮为视觉改动，未修改官方数值快照或生成器。

## 来源与实现

参照现有官方脚本快照（固定提交与来源见 [属性来源](research/attributes-sources.md) 和 [单位来源](research/units-sources.md)）中的粒子标识、弹道速率，以及 [六英雄技能数据](research/abilities-sources.md) 和本地官方技能图标的颜色、材质与主题。

| 来源 | 官方脚本标识 / 视觉速率 | 二维表现 |
| --- | --- | --- |
| 水晶室女 | `hero_crystalmaiden/maiden_base_attack.vpcf`，900 | 尖锐浅蓝冰晶、冰屑尾迹 |
| 风行者 | `hero_windrunner/windrunner_base_attack.vpcf`，1250 | 有箭头、箭杆和羽翎的箭；强力击为亮绿风箭 |
| 天辉塔 | `ranged_tower_good.vpcf`，1200 | 金色弹芯、能量晕和渐细尾迹 |
| 夜魇塔 | `ranged_tower_bad.vpcf`，1200 | 橙红火团、熔火弹芯和余烬 |
| 远程兵 | `ranged_goodguy.vpcf` / `ranged_badguy.vpcf`，900 | 绿色光弹 / 橙色火弹 |

技能参照来自官方技能身份：冰霜新星与极寒领域的碎冰和雪花；剑刃风暴的红橙旋转剑锋；反击螺旋的斧刃；淘汰之刃的垂直落斧；洪流的水柱和泡沫；幽灵船的透明船身、船帆与航迹。敌方和友方使用同一套英雄材质。食人魔新增双头蓝色模型、棍棒、火焰爆轰、引燃追踪弹、嗜血光环和烈火护盾；弹道位置来自实际模拟事件，范围与资料见 [食人魔说明](ogre-runtime-sources.md)。

`combat-visuals.js` 只维护视觉标识、插值和状态查询；`combat-effects.js` 负责 Canvas 绘制；`hero-runtime.js` 和 `engine.js` 在原有视觉事件上附加来源标识。资源均为程序化图形，未导入或声称复刻 Valve 的 `.vpcf` 粒子系统。

动画使用模拟时间，暂停冻结。剑刃风暴、冰封、战斗饥渴、极寒领域、蓄力、风行、集中火力和治疗守卫读取实际状态；死亡、驱散或中断后对应视觉消失。束缚击在施放后显示飞行，命中并连接到树/单位后显示绳索；强力击使用与规则弹道相同的方向、距离和飞行时长。

## 边界

既有英雄普通攻击仍在出手时立即结算伤害；食人魔新增按攻速缩放的 0.3 秒攻击前摇，出手前可取消。光弹、箭和火球随后按视觉时长插值，命中火花也属于画面表现。普通攻击不具有完整客户端的飞行中追踪、弹道躲避、前后摇和投射物结算。塔与普攻的画面时长限制在 0.12–0.8 秒，以兼顾二维缩放和清晰度；这不是数值规则修改。

立体模型、真实粒子材质、深度遮挡、英雄装饰品、完整技能音效和所有物品的独立粒子仍未复刻。通用物品光束和爆发共用绘制方式。不能把本轮效果或测试通过称为与 Dota 2 客户端完全等价。规则边界继续见 README 和 [物品运行时来源](item-runtime-sources.md)。

## 验收

自动检查：`npm test`、`npm run test:vfx`、`npm run test:browser`、`npm run build`、`npm run check:build`。新浏览器检查包含双方共 20 组真实技能施放、发射/中途/命中画面、Canvas 状态恢复、零长度路径、渲染不修改模拟状态、暂停像素一致、控制效果清理、小屏与缩放；另检查束缚击被躲掉后的消失、旧绳索不能随无关眩晕重现，以及屏幕外施法者的范围效果。

截图在本地 `artifacts/vfx-projectiles.png`、`vfx-skills.png`、`vfx-battle-desktop.png`、`vfx-battle-1366.png`、`vfx-battle-390.png`；机器结果为 `artifacts/vfx-browser-report.json`。GitHub Actions 容器验收也运行 `tests/browser-vfx.mjs`。具体执行结果记录于 [本轮验收](verification/2026-11-01-combat-vfx.md)。
