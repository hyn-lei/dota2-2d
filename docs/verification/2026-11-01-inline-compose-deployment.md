# 2026-11-01 Workflow 内写 Compose 验收

按用户指定的 vps_cost workflow 流程调整：验证/编译后发布 GHCR 镜像，deploy 通过固定版本 ssh-action 以 root 登录，在服务器自动建目录、写 Compose/.env，并用 up --pull always 拉取启动本次摘要。删除两份部署 .sh 和旧测试，部署操作直接显示在 workflow。

## 验证

- 构建和静态检查通过：38 模块 / 102 引用。
- actionlint 1.7.12 与内联 Bash 语法检查通过。
- `npm test` 最终 331 项：330 通过、0 失败、1 项因本机没有 Docker 跳过，日志 artifacts/inline-deployment-node-reviewed.log。CI 必须执行该真实 Compose 检查，不能沿用本地跳过结果。
- 测试解析真实 YAML 的 script 并运行 Bash；Docker/curl 使用受控边界，真实 Docker Compose 配置/合并检查本地因无 Docker 跳过，但在 CI 必须执行。

## 审查与修正

独立只读审查发现三项 Important，均已修正：

1. CI 的 HTTP_PORT=18080 会覆盖测试 .env 的 9184：真实 Compose 验证显式清除 IMAGE、HTTP_PORT、BIND_ADDRESS、COMPOSE_PROJECT_NAME。
2. 旧 Compose 写死 image 时，shell IMAGE 不会覆盖它：测试边界现在解析实际传给 Docker 的全部 Compose 文件；回滚通过临时 game.image 覆盖文件强制使用缓存 ID，并核对恢复后 ID。旧实现的字面标签恢复回归先失败，修正后通过。
3. 旧配置的项目名会在重新生成时丢失：保存已解析的项目名，并贯穿查找、更新、恢复和新文件；具名项目回归先复现启动第二个项目，修正后更新原项目。

另有空目录初始化、已有端口/文件名保留、其他服务目录保护、拉取失败、启动失败、线上版本不符、inspect/持久化失败、首次失败清理、恢复失败保留备份且删除认证，以及缺少可选变量的覆盖。SSH/实际服务器部署由用户配置 Secrets 后验证，不用测试替身代表部署成功。

## 交付边界

主机/私钥为仅有两项必填连接配置，root 固定；指纹可选，与参考流程一致，文档明确空指纹时不进行固定比对。全部缺失时部署跳过并报告等待配置。

实际 Docker 生命周期和 SSH、单实例更新中断、守护进程或断电导致的恢复不可用，都不能由本地测试证明。验证、镜像发布、服务器部署必须分别报告。测试工具、日志和 dist 不提交。
