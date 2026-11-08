# 潮汐使者与暴击结算

2026-11-08 重新核对 [Valve 补丁列表](https://www.dota2.com/datafeed/patchnoteslist?language=english) 和 [昆卡官方数据](https://www.dota2.com/datafeed/herodata?language=schinese&hero_id=23)，最新参照仍为 7.41f。生成快照保留在 `docs/research/abilities/23-schinese.json`，运行时不访问官方接口。

潮汐使者各级增加 35 / 70 / 105 / 140 攻击伤害，分裂比例为固定 150%，冷却为 13 / 10 / 7 / 4 秒。升级提高强化攻击和分裂总伤害，并扩大距离；不会把官方固定分裂比例改成随等级增长。100 攻击力、零护甲的分裂目标分别受到 202.5 / 255 / 307.5 / 360 伤害。天赋另行增加攻击伤害、分裂比例、护甲穿透和减速。

分裂以包含潮汐使者加成及暴击的完整攻击伤害为基础，每个分裂目标单独计算护甲。主目标的护甲或剩余生命不会缩小分裂伤害。分裂属于攻击伤害，不受技能增强、技能易伤、技能伤害降低或技能吸血修改。范围加成只应用一次。破坏暂停潮汐使者及剑舞，不消耗潮汐使者冷却，物品暴击仍可触发。

英雄与物品暴击同时触发时采用较高倍率；一次命中显示一次红色放大的暴击跳字。暴击概率仍使用现有确定性随机源，未以当前客户端采样认证所有 PRD 分布。

验证：`tests/kunkka-tidebringer.test.mjs` 的十项回归覆盖各级伤害、暴击分裂、护甲、天赋、范围、破坏、存档及同时暴击。`npm test -- --test-concurrency=1` 共 479 项，478 通过，1 项 Docker Compose 环境检查跳过。`node tests/browser-tidebringer.mjs` 两组实际加点、提示和 Canvas 跳字检查通过；`npm run build` 与 `npm run check:build` 通过。截图及报告保存在本地 `artifacts/tidebringer-critical-1366.png` 和 `artifacts/tidebringer-browser-report.json`。
