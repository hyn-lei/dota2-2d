# 2026-11-08 键位设置与单位碰撞验证

本次基于 `1209a2abd36ba6aec90d9347327a56c5be4d3d17`，优先发布键位设置与单位碰撞。此前暂停的潮汐使者 / 暴击修改保留在原工作区，不属于本次提交。

## 本地验证

- `npm test -- --test-concurrency=1`：**457 项，456 通过，1 跳过，0 失败**。本地 Docker Compose 不可用的已有容器检查跳过；GitHub Actions 继续执行容器检查。
- 新增键位规则检查：ASDF / QWERTY 同时生效、逐槽动作索引、保存和恢复、冲突 / 保留键 / 损坏存储拒绝、附加技能分配。
- 新增碰撞规则检查：所有地面单位类型、友军 / 敌军、大步长连续碰撞、五种建筑占地、死亡释放、选择圈独立、延迟 / 到期相位、索引移动、接触滑动、出生重叠分离、实际绕行和相位鞋。
- `node tests/browser-keybindings.mjs`：**4 组检查通过**。1366×768 / 390×844 齿轮和弹窗、实际技能与物品操作、Ctrl 升级、Alt 自施法、录入暂停与取消、冲突提示、附加技能空闲键、刷新保留、恢复默认。
- `node tests/browser-collision.mjs`：**4 组检查通过**。真实键盘操作在建筑通道被己方小兵阻挡，键位使用相位鞋穿行，建筑在相位期间仍阻挡，到期后恢复单位碰撞。
- 原有 `browser-selected-hud.mjs`、`browser-unit-skills.mjs` 和 `browser.mjs` 通过，共享栏、单位技能、天赋 / 商店布局、右键寻路、技能、复活及桌面 / 手机回归无浏览器错误。
- `npm run build`、`npm run check:build` 通过：**52 个 JS 模块、160 个本地资源引用**。
- `git diff --check` 通过。新增两个浏览器检查进入 GitHub Actions 的容器验证步骤。

原始日志和截图生成在忽略目录 `artifacts/`：`keybindings-collision-rules.log`、`keybindings-report.json`、`collision-report.json`、`keybindings-1366.png`、`keybindings-390.png`、`collision-blocked.png`。

## 旧检查的适配

新增单位碰撞会有意改变行走位置、接敌时间和后续战斗状态，因此不能继续要求与“无单位碰撞”版本的完整存档哈希相同。保留 `tests/fixtures/simulation-before-unit-hud.json` 作为历史，另用 `scripts/capture-collision-state.mjs` 记录相同的三个英雄 / 种子、90 秒输入序列，生成 `simulation-with-unit-collision.json`。新快照结合独立碰撞断言，用于检测后续无意的模拟变化，不将更新快照本身称为规则正确的证据。

AI 决策缓存检查从完成空间索引之后开始计数，避免把新增碰撞索引的必要遍历计为 AI 重复扫描。原来的时间窗口和扫描上限保持不变。十分钟标准对局的兵线、战斗、塔推进、遗迹未提前结束和 AI 经济检查仍全部通过。

二维足底范围和局部绕行并不等于 Source 2 原生碰撞 / 推挤。版本核对、操作方法和相位边界见 [实现说明](../controls-and-collision.md)。
