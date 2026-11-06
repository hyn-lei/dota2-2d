# 2026-11-06：卓尔游侠、命中结算与渐隐验收

参照版本为 Valve **7.41f**。保留原生 JavaScript / Canvas、既有英雄/地图/物品 ID 和部署流程。实现来源、公开值及客户端证据缺口见 [卓尔游侠与弹道说明](../drow-runtime-sources.md)。

本记录对应本次提交中的运行时代码和生成数据；测试完成后只补充说明文档和同步发布启动检查的七英雄数量，运行时代码没有继续修改。

## 验证结果

| 检查 | 结果 |
| --- | --- |
| `npm test` | 共 404 项：403 通过、0 失败、1 跳过；约 114.8 秒。跳过项为本机没有 Docker Compose 的真实配置验收，GitHub Actions 使用实际容器继续验证 |
| `npm run test:browser` | 17 组通过，七英雄资源、技能/天赋、地图、实际操作、胜负与 1366/390 宽度布局无运行时或资源错误 |
| `npm run test:vfx` | 4 组、双方 20 个实际技能案例通过，验证飞行阶段、状态清理、暂停像素、缩放与 Canvas 状态恢复 |
| `npm run test:drow` | 8 组、9 张真实效果画面通过，包括冰箭/狂风延迟、多重射击、冰川、战斗饥渴、渐隐和防御塔命中同步 |
| `npm run test:ogre` | 7 组通过；护盾用例确认弹道飞行时零伤害、零护盾消耗，到达后才扣血和消耗一次护盾 |
| `npm run test:ai` | 5 组通过，包括七英雄分阶段采购、难度梯度、主动装备和实际战斗 |
| `npm run test:deployment -- http://127.0.0.1:5316` | 七英雄选择、立绘、启动及 Canvas 加载通过，无脚本或资源错误 |
| `npm run build` / `npm run check:build` | 通过；42 个 JS 模块编译并链接，119 个本地引用检查 |
| `git diff --check` | 通过；原始 Valve KV 的行尾/空白按 `.gitattributes` 保留 |

Playwright 使用本地 HTTP 服务 `http://127.0.0.1:5316`。新增规则用例涵盖各类远程单位、移动追踪、闪避、隐身、无敌、躲弹、攻击者死亡、存档恢复、各弹独立触发、护甲/吸血/减速的命中时机，以及 Drow 各级官方数值、攻击前摇、免疫变化、低温层数、多重射击冰箭伤害和冰川范围。

首轮全量检查有一个发布回滚脚本用例在与浏览器并行执行时超过子进程 30 秒上限；单独复查通过，随后完整 `npm test` 在无并行浏览器负载下通过。旧食人魔浏览器用例仍期待出手立即受伤，已改为检查飞行和到达两个阶段，并重新通过。

## 数据可复现性

依次重跑 `extract-abilities.mjs`、`extract-upgrades.mjs`、`extract-drow-stats.mjs` 和 `extract-attack-profiles.mjs`，四项产物 SHA-256 均不变化：

| 生成文件 | SHA-256 |
| --- | --- |
| `src/ability-records.js` | `f4e44f8562ac2447c4a1e35ed1de86e549bf6ef24f5e459b456643b6fd5415e8` |
| `src/upgrade-records.js` | `7a08ac4ba790285a3fcbfa83efc7c21c7894e10668186206db03bb185948a79e` |
| `src/hero-data.js` | `fa6b6cfc3948d19bce60eb371b31645f848f21b33fce86f3bf62b88989ee4886` |
| `src/attack-records.js` | `890c9fea69d47d2adc6fd7ef1b7bb6b46d444c253c54eabd997d225eeed926a7` |

## 画面证据与边界

本地截图：`artifacts/drow-lobby.png`（高清官方透明立绘）、`drow-vfx-evidence.png`（九个效果案例）、`drow-combat-1366.png`、`drow-combat-390.png`。已查看立绘和九案例画面，战斗饥渴标记明显，微光 0/0.25/0.5 秒透明度连续变化，飞行与命中相互区分。

机器记录：`artifacts/drow-browser-report.json`、`vfx-browser-report.json`、`ai-browser-report.json`；终端日志为 `task-test-final.log`、`task-browser-final.log`、`task-vfx-final.log`、`task-drow-browser.log`、`task-ogre-final.log`、`task-ai-final.log`、`task-deployment-browser.log` 和 `task-build-final.log`。`artifacts/` 按仓库约定忽略，未加入提交。

测试验证当前工程行为，不能证明与 Dota 2 客户端全部隐藏机制等价。尤其冰川三维坡面、飞行视野、高低地、多重射击客户端帧时序、原版粒子/声音和全部弹道例外仍有边界。

发布遵循提交、推送 `origin/main`、检查对应 SHA 的 GitHub Actions。工作流在容器验收中新增 Drow 检查；镜像目的地为 `ghcr.io/hyn-lei/dota2-2d`。只有服务器部署 job 成功且验证公网 revision/WebSocket 时，才可报告服务器已更新；镜像发布本身不能证明服务器更新。
