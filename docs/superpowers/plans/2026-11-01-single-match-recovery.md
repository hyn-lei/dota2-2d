# 单机对局恢复 Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 误关单机标签页后能继续最近保存的完整对局。

**Architecture:** 独立 game-save 模块序列化并验证模拟状态，恢复 Game 的导航与空间索引；main 负责保存时机、大厅继续入口和离开提醒。存储失败不替换旧存档。

**Tech Stack:** 原生 JavaScript、Canvas、localStorage、Node test、Playwright。

**Spec:** docs/superpowers/specs/2026-11-01-single-match-recovery-design.md

## Constraints and review focus

- 存档不能使用面向联机的裁剪快照，不能漏掉实际技能结算字段。
- Infinity、Map、Set、随机种子和物品元数据必须保留，重建导航必须反映砍树和毁塔。
- 恢复后清除键盘输入并暂停；存储失败、损坏、版本不兼容不毁旧记录。
- 新局替换需确认；恢复后正常施法、购物、死亡复活和兵线继续工作。

## Tasks

1. 创建 tests/game-save.test.mjs，先验证完整状态往返、待结算多重、树木/建筑导航、损坏与存储失败；实现 src/game-save.js 并运行测试。
2. 在 main 中接入两秒自动保存、暂停/隐藏/关页保存、大厅恢复入口、恢复暂停、替换确认和胜负清理；添加适用样式。用 tests/browser-recovery.mjs 复现刷新/关闭标签页后的恢复并覆盖取消替换。
3. 将浏览器恢复检查接入 Actions；更新 README、恢复说明和验证证据。运行 npm test、浏览器检查、npm run build、npm run check:build 和 actionlint。
4. 提交并推送 origin/main；核对本次 Actions 和真实部署的版本与公网 WebSocket。
