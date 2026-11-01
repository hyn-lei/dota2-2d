# Workflow 内生成 Compose 的部署设计

用户明确要求参考 `E:\works\vps_cost\.github\workflows\deploy.yml`：先编译发布 GHCR 镜像，再在 deploy 阶段通过 SSH 登录服务器，写入 Docker Compose 并拉取、启动/重启。替换此前要求服务器已有 Compose 的双 Bash 文件组织。

- 保留现有游戏验证和 GHCR amd64/arm64 发布。main 部署，PR 不部署，标签只发布。
- 使用固定版本的 appleboy/ssh-action，用户名 root；SERVER_HOST / SERVER_SSH_KEY 与 DEPLOY_ 名称兼容。主机指纹为可选配置，与参考项目的连接方式一致，不强制 known_hosts Secret。
- 部署命令直接位于 workflow 的 `script` 字段，不再上传部署 .sh 文件。
- 服务器目录、Compose、首次默认 .env 自动生成。保留现有端口和绑定配置，不需要用户预先上传文件；默认 /opt/dota2-2d、8080。
- Compose 使用本次发布的不可变摘要；`docker compose up --pull always` 完成拉取与启动，已变化的 game 服务由 Compose 重建。
- 写入前备份现有 Compose/.env 和当前镜像。失败时恢复配置；服务已变更时用缓存的旧镜像恢复，首次失败清理本次生成的配置。
- 保留健康检查、线上提交验证、部署互斥与临时 Docker 认证清理。不停掉其他服务，不清理用于回滚的旧镜像。
- Secret 和本机固定路径不进入产品界面。用户自行填写仓库 Secrets；无登录配置时明确跳过，不能把镜像发布当作网站部署。

测试从 YAML 解析真实内联脚本并执行 Bash，外部 Docker/curl 使用受控边界；GitHub Actions 另外用真实 Docker Compose 验证生成配置。yaml 仅作为开发/测试依赖。
