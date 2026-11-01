# Docker 镜像发布与服务器部署

仓库：[hyn-lei/dota2-2d](https://github.com/hyn-lei/dota2-2d)。默认镜像 `ghcr.io/hyn-lei/dota2-2d:latest`，支持 Linux amd64/arm64。

## 1. 自动编译、发布、部署

main 提交后，**Actions → Build, publish and deploy game** 执行：

1. 运行游戏测试、静态构建、生产容器、HTTP/WebSocket 和浏览器检查。
2. 将编译好的 Docker 镜像发布到 GHCR，输出本次不可变摘要。
3. 使用与参考项目 `E:\works\vps_cost` 一样的 appleboy/ssh-action，通过 root 登录配置好的服务器。
4. 自动创建部署目录，写入 Docker Compose；没有 .env 时生成默认配置。
5. 执行 `docker compose up -d --pull always --wait` 拉取本次镜像并启动/更新 game。
6. 验证容器健康及网站返回的提交版本，记录真实结果。

部署命令直接位于 workflow 的 SSH `script` 字段。此前两个部署 .sh 文件已删除，不再上传部署脚本。PR 只验证；版本标签只发布镜像，main 和手动运行 main 才部署。

| 发布方式 | 标签 |
| --- | --- |
| main 或手动运行 main | latest、sha-完整40位提交 |
| v1.0.0 等版本标签 | 1.0.0、sha-完整40位提交 |
| PR 或其他分支 | 不发布、不部署 |

实际部署使用本次发布的 `@sha256:...` 摘要，避免排队时拉到另一个版本。旧 main 提交准备部署时发现新提交就跳过。

## 2. 服务器首次准备

服务器需要已安装 Docker Engine、Docker Compose v2（支持 --wait/--pull）、Bash、curl 和 util-linux 的 flock；root 对应的 SSH 公钥已被服务器允许登录。

**目录、Compose 和 .env 由 deploy 阶段自动生成**，不用预先传文件。默认：

```dotenv
HTTP_PORT=8080
BIND_ADDRESS=0.0.0.0
```

默认目录为 /opt/dota2-2d。已有 .env 的端口、绑定和其他设置保留，成功后只把 IMAGE 更新为本次摘要。首次创建可用下表的 DEPLOY_HTTP_PORT / DEPLOY_BIND_ADDRESS 指定默认值。

已有 Compose 文件会沿用其文件名和已解析的项目名称，并生成本项目的 game 配置。指定目录必须独立用于本游戏；如果现有 Compose 包含其他服务，部署拒绝覆盖，保护其他项目。

## 3. 配置一次，以后自动更新

在 [游戏仓库 Actions Secrets](https://github.com/hyn-lei/dota2-2d/settings/secrets/actions) 设置。另一个仓库的 Secrets 不会自动共享。

| 设置 | 内容 | 必填 |
| --- | --- | --- |
| SERVER_HOST 或 DEPLOY_HOST | 服务器 SSH 主机名/IP，不含协议或端口 | 是 |
| SERVER_SSH_KEY 或 DEPLOY_SSH_KEY | root 登录的 SSH 私钥完整内容 | 是 |
| DEPLOY_SSH_PORT | SSH 端口，默认 22 | 否 |
| DEPLOY_PATH | 部署目录，默认 /opt/dota2-2d | 否 |
| DEPLOY_PUBLIC_URL | 网站根地址，默认 https://dota2.prismabyss.com | 否 |
| DEPLOY_HTTP_PORT | 首次生成 .env 的 HTTP 端口，默认 8080 | 否 |
| DEPLOY_BIND_ADDRESS | 首次生成 .env 的绑定地址，默认 0.0.0.0 | 否 |
| DEPLOY_SSH_FINGERPRINT 或 SERVER_FINGERPRINT | 可选 SHA256 SSH 主机指纹 | 否 |
| GH_TOKEN | 可选 GHCR 读取令牌，默认使用任务的短期 GITHUB_TOKEN | 否 |

用户名固定 **root**，不用设置 DEPLOY_USER，GitHub 镜像登录自动使用 github.actor。两套主机/私钥名称同时存在时 DEPLOY_ 名称优先。

端口、目录和网站地址也支持同名 Actions Variables，Secrets 优先。原 DEPLOY_KNOWN_HOSTS 已不再使用。ssh-action 的 fingerprint 可选：填写 SHA256 主机指纹就固定核验；留空时按参考工作流默认连接，不进行固定指纹比对。

保存配置后手动运行 main 工作流一次，就会部署现有代码；以后 main 提交自动完成所有步骤。主机和私钥都没设置时明确报告等待配置并跳过部署；仅缺一项时配置检查失败并列出名称。

部署成功以 **Write Compose, pull published image and update server** 的结果为准。镜像发布成功不等于服务器已经更新。

## 4. 失败恢复与手动回滚

写文件前备份现有 Compose/.env 和当前镜像。拉取失败时恢复生成前的配置，旧容器保持运行；新容器启动、版本验证或文件持久化失败时，恢复配置，再通过临时 Compose 覆盖将 game.image 明确固定为缓存的旧镜像 ID，并核对恢复后的容器 ID。这样旧配置中写死的镜像标签不会影响恢复。首次失败时移除本次生成的服务和配置。

临时 Docker 登录使用独立目录，任务结束后清除，不永久覆盖服务器原登录。配置恢复失败会保留私有备份并报告位置；不会把它报告成部署成功。旧镜像保留用于回滚。

手动回滚仍可把 .env 的 IMAGE 改成旧发布 Summary 中的摘要，再执行：

```bash
docker compose pull game
docker compose up -d --wait --wait-timeout 90 game
```

单实例更新会短暂中断服务并结束内存联机房间，已有开发提醒保留。

## 5. 域名和 HTTPS

如果服务器已有 Nginx、Caddy 等反向代理，将 `BIND_ADDRESS=127.0.0.1`，把域名根路径代理到 `http://127.0.0.1:8080`，由代理处理 TLS。游戏使用 `/src/` 和 `/assets/` 等根路径，建议使用独立域名或子域名，不要直接挂在 `/dota/` 这样的子目录下。

容器内的 Node 服务现在同时提供静态网页和 `/ws/coop` 同源 WebSocket，支持五真人对五 AI。房间保存在当前服务内存，没有数据库或跨实例恢复；更新、重启容器会结束现有房间。浏览器设置和战绩保存在对应站点的 localStorage 中，改变域名或端口后浏览器会把它当作另一个站点。

反向代理需要转发 WebSocket Upgrade，并保留原 Host。Nginx 的同域名根路径示例（TLS 配置沿用已有站点）：

```nginx
location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 180s;
}
```

自动部署通过网站 `/healthz` 的 `X-Game-Revision` 响应头核对运行中的提交 SHA；健康检查正文仍为 `ok`。反向代理应将该路径转发到 Node 容器并保留响应头，不缓存它。镜像构建自动写入 GAME_REVISION，本地开发可以不设置。

## 6. 本地构建和验证

有 Docker 的环境可以直接验证同一套生产配置：

```bash
docker build --pull -t dota2-2d:local .
IMAGE=dota2-2d:local docker compose up -d --pull never --wait --wait-timeout 90
npm run test:container
npm run test:multiplayer-smoke
npm ci
npx playwright install chromium
npm run test:deployment
```

上面是 Bash 命令。PowerShell 的环境变量写法为 `$env:IMAGE='dota2-2d:local'`，随后单独运行 `docker compose up -d --pull never --wait --wait-timeout 90`。

没有 Docker 时仍可运行 `npm run build` 和 `npm run check:build`，但这两项不能替代容器启动检查。后者使用 Node 的实验性 VM 模块接口，只做语法和静态导入校验，不执行浏览器代码。

镜像包含静态构建、共享模拟代码、联机服务器及 `ws` 生产依赖，以 Node 镜像的非 root `node` 用户运行。Compose 保持只读根文件系统与 `/tmp` 临时目录；`.env`、文档、测试和浏览器开发依赖不会进入运行镜像。HTTP 只公开 `index.html`、`src/`、`assets/` 和健康检查，服务器文件及包配置不可通过网页下载。

## 常见问题

- **`denied` / `unauthorized`**：确认首次 Actions 发布成功，包是否私有，以及当前服务器账号是否登录 GHCR；仓库权限与包权限应允许读取。
- **`permission_denied: write_package`**：检查仓库/组织的 Actions 权限。如果同名包此前由其他方式创建，需在包设置中把此仓库加入 Actions 访问权限。
- **端口占用**：修改 `.env` 中 `HTTP_PORT` 后重新启动。
- **容器 unhealthy**：查看 `docker compose logs --tail=100`；保留 Compose 的 `/tmp` 挂载和镜像内的健康检查。
- **更新后浏览器仍显示旧内容**：正常配置要求重新验证静态文件；若使用 CDN 或额外代理缓存，检查其缓存规则并刷新页面。
