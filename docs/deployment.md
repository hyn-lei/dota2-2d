# Docker 镜像发布与服务器部署

仓库：[hyn-lei/dota2-2d](https://github.com/hyn-lei/dota2-2d)。默认镜像为 `ghcr.io/hyn-lei/dota2-2d:latest`，支持 Linux amd64 和 arm64 服务器。

## 1. GitHub 自动构建

推送到 `main` 后，进入仓库 **Actions → Build, publish and deploy game** 查看执行结果。也可以点击 **Run workflow**，选择 `main` 手动运行。

工作流先运行全部规则测试、构建和静态检查，再以生产 Compose 启动测试容器，验证 HTTP、真实 WebSocket 与浏览器流程；全部通过才发布镜像。配置服务器 Secrets 后，main 还会自动更新服务器并核对线上提交版本。PR 只做验证，版本标签只发布镜像。

发布使用 GitHub 自动提供的 `GITHUB_TOKEN` 和工作流声明的 `packages: write` 权限，无需另建 Docker Hub 账号或添加发布密码。仓库或组织的 Actions 策略仍需允许这些官方 Actions 和包发布。配置参考 [GitHub 镜像发布文档](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images)。

| 触发方式 | 镜像标签 |
| --- | --- |
| 推送 main，或手动运行 main | `latest`、`sha-完整的40位提交SHA` |
| 推送 `v1.0.0` 这样的版本标签 | `1.0.0`、`sha-完整的40位提交SHA` |
| PR 或手动运行其他分支 | 只验证，不发布 |

版本标签不会覆盖 `latest`。每次发布的 Summary 中还会输出 `IMAGE=ghcr.io/hyn-lei/dota2-2d@sha256:...`，使用该摘要可精确固定一个镜像。相同提交重新构建时基础镜像可能更新，因此摘要比 SHA 标签更适合严格回滚。

## 2. 服务器首次启动

服务器安装 [Docker Engine](https://docs.docker.com/engine/install/) 与 [Docker Compose 插件](https://docs.docker.com/compose/install/linux/)。确认 `docker version` 和 `docker compose version` 可用。以下命令在服务器的 Bash 中执行。

把仓库根目录的 `compose.yaml` 和 `.env.example` 放入同一目录，例如 `/opt/dota2-2d`。服务器只运行镜像，无需安装 Node.js、下载游戏源码或自行构建。

```bash
cd /opt/dota2-2d
cp .env.example .env
```

默认 `.env`：

```dotenv
IMAGE=ghcr.io/hyn-lei/dota2-2d:latest
HTTP_PORT=8080
BIND_ADDRESS=0.0.0.0
```

先等 GitHub Actions 成功完成首次发布。GHCR 新包默认是私有包，即使源码仓库公开，也应检查包的可见性。公开镜像可以匿名拉取；私有镜像需要有访问权限的 GitHub 账号和 **classic PAT 的 `read:packages` 权限**。见 [GHCR 访问与认证说明](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)。

私有镜像先登录；下方会隐藏令牌输入，不要把令牌写到 `.env` 或 Compose 中：

```bash
read -rsp 'GitHub token (read:packages): ' GHCR_TOKEN
printf '\n'
printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u hyn-lei --password-stdin
unset GHCR_TOKEN
```

使用与日后运行 Compose 相同的系统账号登录。然后启动：

```bash
docker compose config --quiet
docker compose pull
docker compose up -d --wait --wait-timeout 90
docker compose ps
curl --fail http://127.0.0.1:8080/healthz
```

健康检查返回 `ok`。放行服务器防火墙/云安全组中所选的 TCP 端口后，浏览器访问 `http://服务器IP:8080`。如果修改了 `HTTP_PORT`，地址和检查命令也要对应修改。

## 3. 配置一次，以后自动更新

在 [仓库 Actions Secrets](https://github.com/hyn-lei/dota2-2d/settings/secrets/actions) 添加以下 Repository secrets，名称必须一致。用户选择自行在仓库填写，私钥不进入代码。

SSH 登录用户名按用户要求固定为 `root`，与参考项目 `E:\works\vps_cost` 的工作流一致；不用设置 DEPLOY_USER，也不是让用户填写 GitHub 登录名。GitHub 镜像登录由 github.actor 和任务令牌自动处理。

| Secret | 内容 | 必须填写 |
| --- | --- | --- |
| `DEPLOY_HOST` | 服务器 SSH 主机名或 IP；不带协议和端口 | 是 |
| `DEPLOY_SSH_KEY` | 用于该用户的 SSH 私钥完整内容；对应公钥已在服务器 authorized_keys | 是 |
| `DEPLOY_KNOWN_HOSTS` | 服务器已验证的 SSH 主机公钥 known_hosts 内容 | 是 |
| `DEPLOY_SSH_PORT` | SSH 端口，默认 `22` | 否 |
| `DEPLOY_PATH` | 服务器已有 Compose 目录，默认 `/opt/dota2-2d` | 否 |
| `DEPLOY_PUBLIC_URL` | 网站根地址，默认 `https://dota2.prismabyss.com` | 否 |

兼容参考工作流的名称：`SERVER_HOST` 可替代 `DEPLOY_HOST`，`SERVER_SSH_KEY` 可替代 `DEPLOY_SSH_KEY`。同时设置时 DEPLOY_ 名称优先；这些 Secrets 仍需放在游戏仓库中，不会自动读取另一个仓库的 Secrets。

后三项也可放在同名 Actions Variables 中；Secrets 优先。无需另设 GHCR 密码：部署使用当前任务的短期 `GITHUB_TOKEN` 和 `packages: read` 权限，服务器的临时 Docker 认证目录在结束后清除，原有 Docker 登录不改写。

服务器一次性准备：Linux/Bash、Docker Compose v2（支持 `--wait`）、curl、util-linux 的 flock；指定目录已包含本仓库 `compose.yaml` 和普通文件 `.env`。沿用已有目录即可。`.env` 的 HTTP_PORT 和 BIND_ADDRESS 保持不变，仅 IMAGE 在成功更新后原子改为本次摘要。

`DEPLOY_KNOWN_HOSTS` 保存服务器的 SSH 主机公钥，确认连接目标的身份；它不是登录私钥。可以在可信环境用 `ssh-keyscan -p SSH端口 SSH主机` 获取，再与服务器控制台提供的主机密钥指纹核对；自定义端口的主机项为 `[主机]:端口`。Actions 使用 `StrictHostKeyChecking=yes`，不在部署时临时接受未知主机。参考工作流的 ssh-action 没有配置 fingerprint，因此没有这项显式核验。

配置完成后推送 main，或手动运行 main 工作流。顺序为 **验证 → 发布不可变镜像 → SSH 拉取 → 重建 game → 容器健康检查 → 网站 /healthz 提交版本检查**，以后无需登录服务器更新。准备部署时 main 已有新提交的旧任务会跳过更新。

全部三个必填 Secrets 都缺失时，配置检查明确显示等待首次配置，服务器部署任务跳过；只填写一部分时，配置检查报缺失名称并失败。不要把前两项任务通过理解为网站已经更新；以 **Update production server and verify deployed commit** 的结果和 Summary 为准。Secrets 保存后可手动运行 main 来部署已有代码。

## 4. 回滚与手动更新

拉取失败时旧容器保持运行。新容器、线上版本或 IMAGE 写入检查失败时，脚本尝试以更新前缓存的不可变镜像 ID 自动恢复 game，并仍让部署任务失败，方便排查。脚本不执行 compose down 或镜像 prune；保留缓存镜像以支持回滚。

手动指定版本也仍可用：把 `.env` 的 IMAGE 改成发布 Summary 中的旧摘要，再运行：

```bash
docker compose pull
docker compose up -d --wait --wait-timeout 90
```

单实例更新会短暂中断服务，并结束服务器内存中的联机房间；网页每次打开/刷新已有开发提醒。这不是零停机部署。

回滚时，将 `.env` 中的 `IMAGE` 改成先前发布 Summary 里的摘要地址，再运行相同命令。也可用明确的版本号或 `sha-完整提交SHA` 标签。不要依赖 `latest` 指向旧版本。

查看日志或停止：

```bash
docker compose logs -f --tail=100
docker compose down
```

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
