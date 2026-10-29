# 容器发布与部署

用户优先要求生成 GitHub Actions、Docker 镜像与 Compose 部署配置，并提交到 `hyn-lei/dota2-2d` 的 `main` 分支。其余游戏功能开发暂停，现有未完成工作随源码保存。

当前程序由 `scripts/build.mjs` 将 HTML、模块和资源复制到 `dist/`，没有服务器数据库或运行时 Node 依赖。因此采用 Node 构建阶段与非 root Nginx 运行阶段，容器监听 8080。相比将本地开发服务器搬到生产环境，此方案直接提供静态文件和健康检查；无需增加应用后端。

GitHub Actions 在 PR 中校验构建和容器，在 main 推送、版本标签和手动执行时发布 GHCR 的 amd64/arm64 镜像。使用仓库 GITHUB_TOKEN，发布 latest、完整提交 SHA 与版本号标签。Compose 拉取镜像运行，端口和镜像由 `.env` 配置；服务器执行更新，不在工作流中保存 SSH 密钥或自动连接未知服务器。

校验范围是静态模块链接、资源、容器 HTTP 和 Compose 配置，不声称暂停中的全部游戏功能已经通过测试。此次发布任务不改动游戏机制。当前电脑没有 Docker，必须如实区分本地配置校验与 GitHub runner 的实际容器检查。
