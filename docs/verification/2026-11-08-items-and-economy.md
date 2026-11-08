# 2026-11-08 装备、单位技能与商店验证

本记录与第二批装备修正一同提交。第一批已发布提交为 `ca38ad724e1c3012ee3417b316b90a352981e576`，包含单位技能、臂章、性能、商店按钮、HUD 快捷购买及储藏/信使图标。后续装备的数值、行为和已知边界见 [核对记录](../item-parity-audit.md)。

- `npm test -- --test-concurrency=1`：449 项，448 通过、0 失败、1 项因本机没有 Docker Compose 跳过。包括新增 28 项装备测试、85 件主动装备的合法施放、原始三组 90 秒对局完整状态比较，以及英雄、单位、存档、联网和部署事务测试。原始日志：`artifacts/final-rules.log`。
- `npm run test:browser`：17 项通用检查全部通过，无脚本/资源错误。野怪选择断言已更新为共享 HUD，不再寻找废弃的独立信息窗。原始日志：`artifacts/final-browser.log`。
- Playwright：`browser-economy.mjs`、`browser-items.mjs`、`browser-hud.mjs`、`browser-selected-hud.mjs`、`browser-unit-skills.mjs`、`browser-shop.mjs` 全部通过。覆盖关闭商店直接左右键购买、组件队列、臂章生命和状态、完整储藏/信使图标、七位英雄头部肖像、友军/敌军共享栏、天赋方形加号、全部 47 种野怪与各级塔技能，以及桌面/笔记本/手机布局。
- `npm run build` 与 `npm run check:build`：49 个 JavaScript 模块编译、入口依赖连接、153 个本地引用检查通过。
- 性能补测：1366 × 768，约 271 单位，七秒采样的帧间隔平均 16.95 ms、P95 16.8 ms。来源和原始/后续对照见 [性能说明](../performance-unit-hud.md)。未降低模拟精度、DPR 或删除已有内容。
- `git diff --check` 通过。官方补丁列表复核仍为 7.41f。

截图和性能原始数据保留在忽略目录 `artifacts/`。以上结果验证当前工程；未记录原 Dota 2 客户端的全部装备组合实测，不能称为全客户端等价。
