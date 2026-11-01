# 2026-11-01 五真人随机匹配验收

大厅新增五人随机匹配入口，下一批五名在线独立会话自动组队并进入原噩梦 AI 模拟。名字可自动生成，优先英雄重复时分配可用英雄，四人时没有房间或对局，AI 不补位。原房间创建/邀请/准备方式同时可用。

## 验证

- `npm test` 最终 365 项：364 通过、0 失败、1 项本机无 Docker 跳过；日志 `artifacts/matchmaking-node-serial.log`。CI 必须执行真实 Compose 检查。
- 匹配服务器 10 项：第五人自动开局、重复请求/身份、取消和断线清理、已有房间拒绝入队、容量等待、开局后取消不结束他人对局、抛出/null 初始化失败、两组隔离与两人等待、请求 ID 回显。
- `npm run test:matchmaking` 六组浏览器流程通过：默认限流下取消重试、真实在线客户端计数与关页移除、第五人自动开局/重复优先英雄、各自技能/装备及共享快照、重开网页恢复同一席位、三尺寸两种联机入口可用。截图为 `artifacts/matchmaking-{1366,768,390}.png`。
- 原房间模式 review 回归 3 项、单机恢复四组通过；单机存档格式未改变。
- `npm run build`、`npm run check:build`：39 模块、107 本地引用；actionlint 通过。

首次同时运行完整 Node 套件和五浏览器时，三个原有部署脚本检查超过本机 30 秒进程限制：`an existing named project is updated without starting a second project`、`deployment cannot overwrite a Compose project containing other services`、`a failed pull restores files and leaves the previous running image intact`。停止并行浏览器负载后，未修改测试超时或部署代码，重新运行整套测试，全部通过。

## 审查修正

独立审查在默认 lobbyRate=2 下复现取消被限流后界面一直等待、服务器仍保留队列位置。失败浏览器回归已复现；修复后请求 ID 标识操作，旧响应不覆盖新请求，750ms 延迟重试保留取消意图，匹配成功和已有 roomCode 优先。重试成功/离开/恢复游戏均清理定时器；需要重新连接时等待旧 socket 关闭。

独立复核确认 RATE_LIMIT 后收到同 ID 的 canceled，表单恢复、队列为 0，再次匹配/取消正常，无浏览器异常；未发现剩余阻塞。自动验收使用独立客户端环境验证接线，不代表五名真实用户已经线上试玩。公网发布验证仅 hello，不向真人匹配队列填入测试席位。

## 发布

单机恢复基线 `66afd3a70f13623aef62db2ad778780839402a5e` 的 [Actions](https://github.com/hyn-lei/dota2-2d/actions/runs/41310136526) 已实际更新 `dota2-game-1`；公网版本和 WebSocket welcome 已验证。本次随机匹配提交继续通过既有 main→GHCR→Compose 自动部署流程，最终状态以对应提交的 Actions 和公网版本为准。
