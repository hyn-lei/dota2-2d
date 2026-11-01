# 2026-11-01 公网 WebSocket 代理修复验证

线上 `wss://dota2.prismabyss.com/ws/coop` 握手返回 HTTP 404；同一容器内部握手返回 `welcome`。检查确认 `/etc/nginx/conf.d/all.conf` 中游戏 HTTPS 站点只转发普通 HTTP 和 Host，没有 HTTP/1.1、Upgrade、Connection 转发。

## 线上修复

通过现有 Actions SSH 凭据，以 root 对游戏域名和 `http://localhost:8080` 同时匹配的唯一站点增加精确 `/ws/coop` 规则。其他站点及游戏 HTTP 跳转保持原样。修复工具先备份，执行 `nginx -t` 后平滑重载；配置验证或重载失败时恢复原始字节并验证、重载旧配置。

[定向修复 Actions](https://github.com/hyn-lei/dota2-2d/actions/runs/41303203971) 成功，日志记录配置验证通过、实际写入成功及 `PUBLIC_WS=welcome`。随后从本地公网 Node 客户端和线上页面的 Chromium 原生 WebSocket 分别握手，均收到 `welcome`。探测仅发送 `hello`，未创建房间或加入真人席位，未输出会话令牌。

当前线上 Compose 使用 `/data/dota2/docker-compose.yml`，项目 `dota2`，容器 `dota2-game-1`，端口 8080。仓库 `DEPLOY_PATH` Variable 已指向 `/data/dota2`。

## 永久发布检查

镜像包含 `scripts/check-public-coop.mjs`。CI 在真实测试容器中执行该脚本；部署后通过新容器访问公网 URL，发送浏览器同源 Origin 和 WebSocket hello，必须收到 welcome。失败发生在部署事务提交前，会恢复旧配置和缓存旧镜像，不能仅凭 `/healthz` 和版本头报告联机可用。

本地回归先复现公网 WebSocket 失败仍报告部署成功，加入检查后验证失败触发回滚。Nginx 事务回归先暴露换行格式在恢复时改变的问题，修复后按原始字节恢复。

## 提交前验证

- `npm test`：345 项，344 通过、0 失败、1 跳过；日志 `artifacts/coop-proxy-tests.log`。跳过项是本机无 Docker 的真实 Compose 检查，CI 要求执行。
- `npm run build`、`npm run check:build`：通过，38 模块、102 本地引用。
- actionlint：真实 workflow 通过。
- `npm run test:public-coop -- https://dota2.prismabyss.com`：通过。
- Playwright Chromium：在线页面原生 WebSocket 握手收到 welcome。

游戏运行、技能和数值未改动。Nginx 修复工具的测试需要 Python 3 标准库，运行镜像不需要 Python。
