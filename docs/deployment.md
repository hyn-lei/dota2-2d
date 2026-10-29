# Docker 镜像发布与服务器部署

仓库：[hyn-lei/dota2-2d](https://github.com/hyn-lei/dota2-2d)。默认镜像为 `ghcr.io/hyn-lei/dota2-2d:latest`，支持 Linux amd64 和 arm64 服务器。

## 1. GitHub 自动构建

推送到 `main` 后，进入仓库 **Actions → Build and publish Docker image** 查看执行结果。也可以点击 **Run workflow**，选择 `main` 手动运行。

工作流先检查静态模块和资源，再构建镜像、按生产 Compose 配置启动容器，检查 HTTP 和浏览器启动；全部通过后才发布镜像。PR 只做验证。此前暂停的游戏功能开发仍保留在源码中，这些部署检查不代表全部游戏机制测试通过。

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

## 3. 更新和回滚

每次 main 发布成功后，在服务器运行：

如果之前将 `IMAGE` 固定为版本号或摘要，先改成此次发布的版本/摘要，或恢复为 `ghcr.io/hyn-lei/dota2-2d:latest`；只执行 pull 不会改变固定的引用。

```bash
docker compose pull
docker compose up -d --wait --wait-timeout 90
```

Compose 仅在镜像变化时重建容器。单实例更新会短暂中断服务，不是零停机部署。工作流负责发布镜像，服务器更新由上述命令执行，没有隐含的 SSH 自动部署。

回滚时，将 `.env` 中的 `IMAGE` 改成先前发布 Summary 里的摘要地址，再运行相同命令。也可用明确的版本号或 `sha-完整提交SHA` 标签。不要依赖 `latest` 指向旧版本。

查看日志或停止：

```bash
docker compose logs -f --tail=100
docker compose down
```

## 4. 域名和 HTTPS

如果服务器已有 Nginx、Caddy 等反向代理，将 `BIND_ADDRESS=127.0.0.1`，把域名根路径代理到 `http://127.0.0.1:8080`，由代理处理 TLS。游戏使用 `/src/` 和 `/assets/` 等根路径，建议使用独立域名或子域名，不要直接挂在 `/dota/` 这样的子目录下。

这是浏览器端单人人机游戏，容器没有数据库和存档卷；部署不会自动变成多人联机。浏览器设置和战绩保存在对应站点的 localStorage 中，改变域名或端口后浏览器会把它当作另一个站点。

## 5. 本地构建和验证

有 Docker 的环境可以直接验证同一套生产配置：

```bash
docker build --pull -t dota2-2d:local .
IMAGE=dota2-2d:local docker compose up -d --pull never --wait --wait-timeout 90
npm run test:container
npm ci
npx playwright install chromium
npm run test:deployment
```

上面是 Bash 命令。PowerShell 的环境变量写法为 `$env:IMAGE='dota2-2d:local'`，随后单独运行 `docker compose up -d --pull never --wait --wait-timeout 90`。

没有 Docker 时仍可运行 `npm run build` 和 `npm run check:build`，但这两项不能替代容器启动检查。后者使用 Node 的实验性 VM 模块接口，只做语法和静态导入校验，不执行浏览器代码。

镜像只包含构建后的网页和资源，使用非 root Nginx，Compose 将根文件系统设为只读并为临时文件提供 `/tmp`。`.env`、文档、测试、开发工具和 node_modules 不会被复制到镜像。运行方式参考 [Nginx unprivileged 官方说明](https://github.com/nginx/docker-nginx-unprivileged)。

## 常见问题

- **`denied` / `unauthorized`**：确认首次 Actions 发布成功，包是否私有，以及当前服务器账号是否登录 GHCR；仓库权限与包权限应允许读取。
- **`permission_denied: write_package`**：检查仓库/组织的 Actions 权限。如果同名包此前由其他方式创建，需在包设置中把此仓库加入 Actions 访问权限。
- **端口占用**：修改 `.env` 中 `HTTP_PORT` 后重新启动。
- **容器 unhealthy**：查看 `docker compose logs --tail=100`；保留 Compose 的 `/tmp` 挂载和镜像内的健康检查。
- **更新后浏览器仍显示旧内容**：正常配置要求重新验证静态文件；若使用 CDN 或额外代理缓存，检查其缓存规则并刷新页面。
