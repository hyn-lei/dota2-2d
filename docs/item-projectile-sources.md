# 定向装备弹道与命中结算

2026-11-08 按 Valve 7.41f 物品字段补齐虚灵刀（1400/秒）、否决挂饰（1800/秒）和鱼叉（2000/秒）的追踪弹道。原始物品查询、补丁历史与 URL 保存在 `docs/research/items/projectiles/`。生成目录保留官方原值，运行时代码位于 `item-projectiles.js` 与 `item-runtime.js`。

施放时支付魔法和物品冷却，飞行时保留位置、目标生命期、物品实例和制造者。追踪移动目标，不在飞行途中重复检查施法距离；仅变为不可见不会直接丢失已经锁定的目标。命中时检查林肯抵挡、莲花反射，再应用伤害、状态或牵引。反射有实际返回弹道，避免反射递归；食人魔多重施法也发射独立弹道，不重复支付资源。已出手的弹道不会因施法者死亡而自动消失。

普通追踪弹响应引擎的躲避计数，鱼叉例外。目标死亡、变为无敌或生命期改变时取消；旧存档中的定时鱼叉仍保留兼容处理。弹道状态使用已有 `itemZones` 与 `effects`，随暂停、存档、网络快照保存。

## 官方历史与旧文案冲突

- [7.33](https://www.dota2.com/datafeed/patchnotes?version=7.33&language=english) 明确写鱼叉弹道不可躲避，因此鱼叉继续跟随发生 Blink/Manta 躲避的目标。
- [7.34](https://www.dota2.com/datafeed/patchnotes?version=7.34&language=english) 明确否决不再驱散减益免疫目标。否决状态可施加，免疫期间暂停驱散/减速，免疫结束后在剩余持续时间内恢复。
- [7.37](https://www.dota2.com/datafeed/patchnotes?version=7.37&language=english) 将虚化冲击弹速改为 1400；本次采用现有 7.41f 字段。
- [7.40](https://www.dota2.com/datafeed/patchnotes?version=7.40&language=english) 明确否决不能选中无敌单位，并将虚化冲击伤害改为施法者全属性之和加基础伤害。当前 Datafeed 的否决旧备注仍写可以选中无敌单位，运行时采用较新的明确补丁。之前允许对已经吹风的单位使用否决的实现与测试已纠正。
- [7.41](https://www.dota2.com/datafeed/patchnotes?version=7.41&language=english) 补充鱼叉选树规则，既有树木牵引流程保留。

## 验证与边界

`tests/item-tracking.test.mjs` 九项回归覆盖速度、飞行途中移动、Blink 与鱼叉例外、命中时获得林肯/莲花、多重施法、暂停、存档、减益免疫及死亡取消。浏览器检查覆盖物品快捷键、可见弹道移动、命中伤害、敌方共享 HUD 状态及鱼叉牵引；截图 `artifacts/ethereal-item-flight-1366.png`，报告 `artifacts/item-tracking-browser-report.json`。

本次发布前 `npm test -- --test-concurrency=1` 共 499 项，498 通过，1 项 Docker Compose 环境检查跳过；`browser-item-tracking.mjs` 三组、`browser-items.mjs` 六组及 `browser-ogre.mjs` 七组检查通过。`npm run build` 与 `npm run check:build` 通过（54 模块、179 本地引用）。完整规则日志保存在本地 `artifacts/item-tracking-rules.log`。

Canvas 绘制虚灵能量波、否决光球和鱼叉外形，实际位置来自同一份战斗状态；它们仍是二维绘制，不是原版 Source 2 粒子资源。否决及虚灵刀的所有躲避、可见性、目标无敌转换例外还缺当前客户端的逐项采样认证。血腥榴弹等其他物品的线性飞行、施法前摇及所有特殊目标例外未在本次扩大实现。其余边界见 [装备核对](item-parity-audit.md)。
