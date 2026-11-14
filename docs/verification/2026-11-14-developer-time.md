# 开发者对局时间调整验证

## 实现

单人人机设置中的开发者模式增加对局时间输入，范围 **0–500 分钟**，支持小数、按钮和 Enter。修改时直接平移当前活跃状态的绝对时间，保留单位、位置、资源、施法与弹道、相对冷却、持续效果及复活剩余时间，不模拟或补刷跳过的历史。下一波兵线和野怪采用新时间的下一个刷新边界；商店首次解锁随绝对时间，现有补货保留剩余倒计时。

所有单机对局实际时间 **超过** 500 分钟后清除本局存档并立即刷新页面。恰好 500 分钟可暂停和保存，暂停、已经胜败或关闭开发者模式不能绕过超时检查。清档前设刷新标志，阻止自动保存、pagehide 和 beforeunload 重新写入旧局或弹出离页确认；超时旧存档也不能继续恢复。偏好、战绩、键位和近期 AI 阵容记录保留。真实联机房间拒绝开发者调整，不接受新联机命令。

官方数据快照、生成器、英雄/地图/物品 ID 和部署方式沿用原工程；这次修改为用户指定的开发者功能，不改 7.41f 数值。

## 规则与审查

- 最终 `npm test`：**688 项，687 通过、1 跳过、0 失败**。跳过项为本机未安装 Docker Compose 的既有容器检查；日志 `artifacts/developer-time-npm-test-final.log`。
- 集中规则 `node --test tests/developer-time.test.mjs tests/developer-mode.test.mjs tests/game-save.test.mjs`：**43/43 通过**；日志 `artifacts/developer-time-focused-final.log`，只读审查独立复跑同样通过。
- 新增时间规则 **15 项**，覆盖权限与输入、前跳/倒退、AI 私有计划重置、施法与持续伤害、绝对和相对计时、树木/召唤/复活、商店、实际小兵成长、过期存档及保存限制。
- 审查发现并修复三种遗漏计时：`lastDamagers`、雷神之锤护盾的 `nextProc`、Crella's Crozier 的 `nextCrozierSteal`。四个真实行为回归分别验证有效助攻不会因前跳丢失、过期助攻不会因倒退恢复、两个方向都保留护盾逐秒触发与 **225** 伤害、速度偷取下一层按原剩余时间触发。最后只读复核无遗留 Critical / Important / Minor 问题。

## 生产页面与构建

最终静态构建内容版本：

```text
a3a9e896b94389e923d2e6ac72d460e9c387337fa667b13be2ad58361f981feb
```

由临时 `createCoopServer` 提供最终 `dist/`，按顺序实际运行原开发者界面、时间界面和生产启动检查。完整日志 `artifacts/developer-time-browser-final.log`。

- `tests/browser-developer-mode.mjs`：**8 组通过**，覆盖密码、三方目标升级、生命/魔法回复、关闭/退出/读档/刷新、键位、响应式布局和实际联机禁用。
- `tests/browser-developer-time.mjs`：**7 组通过**，覆盖实际 1→200 分钟与 HUD、Enter 倒退、小数与无效值、1366×768 与 390×844、恰好 500 分钟暂停存档、继续跨界真实刷新、已胜利且暂停仍清档、旧超时存档加载删除、实际一真人九 AI 房间拒绝时间调整。刷新后检查没有离页对话框、本局存档和“继续游戏”入口消失、其余四项存储原值保留。报告 `artifacts/developer-time-browser-report.json`，截图 `artifacts/developer-time-{1366,390}.png`。
- `scripts/smoke-browser.mjs`：通过，当前完整英雄目录、立绘和游戏 Canvas 无启动错误。
- `npm run build`：通过；日志 `artifacts/developer-time-build-final.log`。
- `npm run check:build`：通过，**69 个 JavaScript 模块、371 个本地资源引用**；日志 `artifacts/developer-time-check-build-final.log`。

## 发布检查修正

陈批次提交 `4517ba6911b506b48cb4e11da7af7073b74eb52e` 的 Actions [43601168008](https://github.com/hyn-lei/dota2-2d/actions/runs/43601168008) 在 “Verify the game opens in a browser” 失败，镜像发布和部署被跳过。启动检查仍把英雄选项写死为七个，当前目录已经有八位。

本次改为逐一比较页面 `data-hero` ID 与 `HEROES` 的完整 ID 集合；最终生产构建上的启动检查已通过。新时间浏览器检查接入同一发布工作流。推送后继续核对实际提交的 Actions、GHCR 发布和部署步骤；本机通过与镜像发布均不单独代表公网服务器已经更新。
