# 2026-11-12 AI 开局 T3 路点折返验证

基于 `ed3fe614b7e63ec42efd7ad3a90f2701c749aaf8` 修复原生 JavaScript / Canvas 运行时。保留英雄、地图、物品 ID 和部署方式。

## 原因与修复

`macroGoal` 在没有战斗或团队任务时每帧重新查找最近兵线路点，覆盖 `pathIndex`。当英雄向下一路点前进、距上一路点超过 180 世界单位时，由于下一点仍远在数千单位外，最近点又变成身后的点。AI 因此折返，随后再次前进，形成约 180 单位边界附近的循环。

在未修改的运行时上，以种子 17、30 FPS 模拟默认开局一分钟，九个 AI 中七个仍留在出生兵线路点附近，距离该路首点约 399–541 世界单位；两个后来因远处防守任务传送离开。天辉下路风行者持续停留在约 `(6366, 16634)`，临近本方 T3。此前五秒的离开泉水检查能通过，但不能发现后续路点循环。完整每秒采样保存在 `artifacts/ai-t3-opening-before.json`。

推进时现在保留进度，由 `_followLane` 递增 `pathIndex`。首次进入兵线、兵线变化、结束战斗或团队任务后重新定位一次，并清除旧局部路径和重试等待。复活使旧兵线标记失效，包括不朽盾原地重生；新存档继续保存兵线进度，旧存档缺少标记时自动重新定位。地形、建筑和单位碰撞继续参与实际行走。

## 回归与浏览器证据

新增 `tests/bot-lane-progress.test.mjs` 的 16 项行为回归，在修复前全部失败：

- 四档难度下，九个 AI 在真人不动时完成 25 秒自然开局。
- 一名和四名真人的联机补位房间，两队 AI 均走过开局高地路点。
- 双方 AI 在旧推进状态、换路、结束守塔和结束推进任务后继续向前。
- 保存 / 恢复后继续推进，以及不朽盾原地重生后的重新定位。

开局断言按首段出门方向计算实际位移，要求越过第二个出门路点至少 600 世界单位；不能靠离开泉水、路点计数或测试通过代替实际前进。修复后的 `node --test tests/bot-lane-progress.test.mjs tests/bot-tactics.test.mjs tests/hero-spawn.test.mjs` **51 项全部通过**，日志为 `artifacts/ai-t3-targeted.log`；修复前失败日志为 `artifacts/ai-t3-regression-before.log`。

`node tests/browser-ai.mjs` **6 组通过、无浏览器错误**。从真实开局按钮进入挑战难度，以 30 FPS 模拟额外 25 比赛秒，真人全程静止；九个 AI 沿初始出门方向的最大前进距离为约 **4491–5908 世界单位**，并继续进入对线。证据为 `artifacts/ai-opening-lanes-report.json`、`artifacts/ai-opening-lanes.png` 和 `artifacts/ai-t3-browser-ai.log`。原有装备购买、难度梯度、英雄出装、实际战斗和永久升级检查也通过。

`node tests/browser-ai-tactics.mjs` **4 组通过、无浏览器错误**，覆盖双方付费 / 读条 / 落地守塔 TP、团战支援、稳定退避和等兵线后恢复，日志为 `artifacts/ai-t3-browser-tactics.log`。

## 最终发布检查

- `npm test`：**560 项，559 通过，1 跳过，0 失败**。跳过的是本机缺少 Docker Compose 的既有检查，容器验证仍由 GitHub Actions 执行。
- `npm run build` 和 `npm run check:build`：通过，**56 个 JS 模块、186 个本地资源引用**。
- `git diff --check`：通过。

最终日志为 `artifacts/ai-t3-npm-test.log`、`artifacts/ai-t3-build.log` 和 `artifacts/ai-t3-check-build.log`。浏览器 AI 的新增开局断言已纳入现有 GitHub Actions 浏览器检查入口；上传后检查对应提交的工作流，镜像发布与服务器部署按工作流实际结果报告。

## 确定性与来源

向前推进有意改变移动时间、战斗和英雄保存状态。保留历史 `simulation-with-obstacle-navigation.json`；`scripts/capture-lane-state.mjs` 对相同三组英雄 / 种子和 90 秒输入各运行两次，验证独立对局完整状态哈希相同，再生成 `simulation-with-lane-progress.json`。行为回归验证实际推进，完整状态快照检查后续非预期模拟变化，生成日志为 `artifacts/ai-t3-capture-state.log`。

2026-11-12 核对 Valve 官方 `https://www.dota2.com/datafeed/patchnoteslist?language=english`，最新补丁仍为 **7.41f**，结果保存在 `artifacts/ai-t3-valve-version.json`。本次改变本项目 AI 决策，未更新官方数值快照、生成器或地图几何；不据此宣称与 Source 2 客户端或 Valve 机器人完全等价。既有边界见 [AI 说明](../bot-ai.md)、[地图来源](../research/map-sources.md) 和 README。
