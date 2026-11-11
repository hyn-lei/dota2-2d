# 2026-11-11 前方阻挡检测与泉水圆圈外落点验证

基于 `d97fd3b011d7fc67ef5d921645ce123f7aae5579`，继续在原生 JavaScript / Canvas 工程中修复 AI / 小兵堵路，以及英雄开局、复活、回城落点。保留既有英雄、地图、物品 ID、联机控制权和部署工作流。

## 行为与边界

原有绕行只检查一个障碍，并排小兵和侧面单位会封住所有候选方向，使单位持续走向同一阻挡。AI 英雄和小兵现在每 0.35 比赛秒检查前方行走范围中的单位、建筑和地形，必要时补充局部 A* 路线。搜索使用 32 世界单位步长、当前位置周围 640 世界单位范围，最多访问 1681 个节点；路线允许先后退或横移，再接回原目的地。每段路线都通过地形与连续碰撞检查。

没有通路时保留实际碰撞，短暂等待并持续重试；碰撞后的等待不能一直推迟下一次阻挡检查。阻挡单位移动或死亡后可继续前进。原有攻击、控制、玩家操作和战术等待规则继续使用。

用户所指的泉水是地图中会攻击的小圆圈。其画面半径为 `max(200, radius)`，大于原建筑占地的半宽 72。现在渲染与放置使用同一个圆圈半径，英雄开局、复活和回城落点还加上英雄碰撞半径及 8 世界单位间隙。优先放在圆圈边缘外；地形或其他单位占用时查找旁边空位，并立即更新碰撞索引。普通行走仍使用既有建筑占地，回城的消耗、吟唱、打断和冷却规则沿用现有实现。

## 最终验证

- 新增 8 项回归：两队小兵 / AI 在三名正面阻挡单位及侧面单位围堵下先退后绕行、塔与小兵组合阻挡、无通路时定时重试与死亡释放，以及两队真人 / AI 回城和同时回城落点。加强既有全部英雄选择、1–5 真人房间和同时复活检查，验证整段英雄碰撞范围位于可见泉水圆圈外。
- 堵路场景在加入局部寻路前失败；持续堵路场景还验证定时检查不会被反复碰撞延期。最终 `node --test tests/obstacle-navigation.test.mjs tests/hero-spawn.test.mjs tests/teleport.test.mjs`：**16 项全部通过**。
- 最终 `npm test`：**544 项，543 通过，1 跳过，0 失败**。跳过的是本机缺少 Docker Compose 的既有检查，容器验证继续由 GitHub Actions 执行。
- `node tests/browser-collision.mjs`：**9 组通过，0 浏览器错误**。真实 B 键回城在距泉水中心约 232 世界单位处落地；构造的小兵 / AI 堵路场景在真实 Canvas 模拟中后退约 60 世界单位，再绕过单位和塔到达目的地，全程未穿过碰撞体。原有键盘碰撞、相位鞋及其到期检查通过。
- `node tests/browser-ai.mjs`：**5 组通过，0 浏览器错误**。开局装备、难度梯度、英雄装备路线、技能 / 物品实际战斗和信使 / 永久升级继续通过。
- `node tests/browser-ai-tactics.mjs`：**4 组通过，0 浏览器错误**。双方守塔 TP、支援加入战斗、危险位置等待和兵线到来后恢复攻击通过。
- 最终 `npm run build`、`npm run check:build` 通过：**56 个 JS 模块、186 个本地资源引用**。
- `git diff --check` 通过。

最终日志在忽略目录 `artifacts/`：`obstacle-navigation-npm-test-final.log`、`obstacle-navigation-browser-collision-final.log`、`obstacle-navigation-browser-ai-final.log`、`obstacle-navigation-browser-tactics-final.log`、`obstacle-navigation-build-final.log`、`obstacle-navigation-check-build-final.log`。浏览器报告及截图为 `collision-report.json`、`collision-spawns.png`、`collision-fountain-return.png`、`collision-hero-detour.png`、`collision-creep-detour.png`。

## 确定性与来源

移动路线、落点和检查时钟有意改变完整模拟状态。保留 `simulation-with-safe-spawns.json` 历史基线，使用 `scripts/capture-obstacle-state.mjs` 对相同三个英雄 / 种子、90 秒输入各运行两遍，先确认独立对局状态哈希一致，再生成 `simulation-with-obstacle-navigation.json`。独立行为断言验证修复，完整快照检测后续非预期变化。

2026-11-11 已核对 Valve 官方补丁列表，最新仍为 **7.41f**，结果保存在 `artifacts/hero-spawn-valve-version.json`。本次修改运行时判定，未改动官方数值快照和生成器；本工程二维碰撞与局部寻路不宣称等同 Source 2 客户端实现。来源与既有边界见 [键位与碰撞说明](../controls-and-collision.md)。

## 云端检查补充

`6276df5` 的 GitHub Actions 已通过规则、构建、容器和新增九组碰撞 / 泉水浏览器检查，随后旧 `browser-illusions.mjs` 的独立键盘控制断言失败，镜像发布和服务器更新因此未执行。该检查把左侧幻象向右移动，路径会经过静止本体和另一幻象，却要求 0.6 秒内横向移动超过 80 世界单位。重现时 30 FPS 步长下有效碰撞绕行约移动 77，其他步长约 84–86，原门槛不能稳定表达独立控制。

控制检查改为让左侧幻象向左侧畅通地面移动，保留超过 80 的位移要求、松键停止、所有未控制单位完全静止，以及后续右键 / 停止 / 弱强幻象技能和移动端检查。本次补充只修改浏览器场景和验证说明，运行时代码与已通过 544 项规则检查的 `6276df5` 一致。

修正后 `node tests/browser-illusions.mjs` 的 **6 组**和 `node tests/browser-illusion-coop.mjs` 的 **3 组**全部通过，均无浏览器错误；重新执行 `npm run build`、`npm run check:build` 通过，仍为 **56 个 JS 模块、186 个资源引用**。日志保存在 `artifacts/obstacle-navigation-browser-illusions-final.log`、`artifacts/obstacle-navigation-browser-illusion-coop-final.log`、`artifacts/obstacle-navigation-ci-fix-build.log` 和 `artifacts/obstacle-navigation-ci-fix-check-build.log`。
