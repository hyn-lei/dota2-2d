# Complete Items and Shop Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans or superpowers:subagent-driven-development to implement task-by-task.

**Goal:** 补齐可购买装备的战斗效果、五英雄神杖/魔晶、信使及商店流程。

**Architecture:** 保留字符串物品栏和逐格实例元数据。目录、物品效果、英雄升级、运输与 UI 分模块实现，由 engine 统一调用生命周期接口。

**Tech Stack:** Native JavaScript ES modules, Canvas, Node tests, Playwright.

**Spec:** ../specs/2026-10-27-complete-items-design.md

## Global Constraints
- 当前参照版本 7.41f；保留所有既有物品 ID 与五英雄。
- 不重建工程，不删除用户文件；未初始化 git，不自行创建提交。
- 无运行时外链图片依赖；生成数据保留快照和来源。
- 主线程拥有 engine/main/renderer；并行任务只修改分配的模块。

## Review Focus
- 购买、合成、运输、拆分、出售中金钱/物品不能复制或丢失。
- 物品被移动、消耗、合成后，冷却与充能不能通过换格重置。
- 阵亡、暂停、免疫、目标失效、装备升级移除时的状态一致性。
- 目标施放与单击查看/拖拽换装、搜索输入与快捷键不能冲突。
- 无神杖/魔晶时常规技能数据不得被升级效果污染。

## Tasks
- [ ] 数据：扩展 item-data/生成器至全部当前可购买物品，含配方、属性、行为、消耗、冷却、充能和库存；逐项比对官方快照。
- [ ] 运输与仓储：inventory/courier 模块，新增购买库存、逐件元数据、六格信使、运输/死亡/返回、合成锁定/拆分、丢弃拾取；先覆盖经济守恒与状态持久回归。
- [ ] 英雄升级：hero-runtime 与 upgrade-data 模块接入五英雄神杖/魔晶、额外技能；测试升级生效/移除、消耗永久生效和目标限制。
- [ ] 装备运行时：item-runtime 统一施放、受伤、攻击、技能、死亡、每步更新接口；按效果类别覆盖消耗品、位移、控制、免疫、光环、攻击特效、治疗、召唤、幻象和持续效果。
- [ ] 引擎与界面：engine 集成全部生命周期，main 输入目标与物品快捷键，shop 显示真实充能/冷却/主动说明，信使/物品实体绘制与控制。
- [ ] 审查与验收：数据覆盖审计、规则测试、浏览器完整操作链、长局、构建和来源文档更新；逐项列出尚无法核实的原版边界。

每个行为子任务先增加可复现的失败断言，再实现、通过对应回归；数据生成和低风险样式调整按实际检查验证。最终测试覆盖工作结果，不为了计数添加重复实现断言。
