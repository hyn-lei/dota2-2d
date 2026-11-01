# 2026-11-01 自动部署验收

本文件记录前一版双脚本方案的测试证据。当前部署方式已按用户要求改为 workflow 内生成 Compose，说明见 [部署文档](../deployment.md)。

用户要求代码提交后自动编译、自动更新现有服务器，并明确选择自行在仓库 Secrets 中填写参数。本轮保留 Docker/GHCR/Compose 路线，增加 main 部署链路、固定主机公钥的 SSH 传输、精确摘要更新、健康提交验证和失败回滚。

## 验证结果

| 检查 | 实际结果 |
| --- | --- |
| `npm test` | **323 / 323**，0 失败，最终日志 `artifacts/automatic-deploy-node-final.log` |
| 部署情境 | **10 / 10**，真实 Bash，SSH/Docker/curl/锁等外部边界替身 |
| 健康版本接口 | 实际 HTTP 正文保持 `ok`，X-Game-Revision 与配置 SHA 相同；旧实现返回 null，回归先失败再通过 |
| `npm run build` / `npm run check:build` | **38 模块 / 102 引用**，通过 |
| actionlint 1.7.12 | 工作流语法、依赖与表达式通过；本机没有 ShellCheck，该扩展检查未运行 |
| `bash -n` | 两个部署脚本语法通过 |
| 生产目录 HTTP + WebSocket | 新服务 5199 通过页面/资源/私有路径/版本头，以及五连接权威命令、共享状态、重连暂停 |
| 独立只读审查 | 无 Critical/Important；审查者复跑范围内 **31 / 31** |

部署情境包括配置为空/不完整、非法 SSH 主机、带空格/引号目录的编码传输、临时 SSH 文件清理、拉取失败保留旧服务、成功更新并保留端口、线上版本不符、容器不健康、重建后 inspect 失败和原子 dotenv 写入失败。后两种失败分别复现没有回滚和错误报告成功，修正后回归通过。

测试将 GITHUB_OUTPUT、GITHUB_STEP_SUMMARY 与 TMPDIR 指向独立临时目录，不往 Actions 的真实输出文件写模拟部署结果；另有成功/拉取失败后临时 Docker 认证目录为空的实际文件断言。审查后仅增加这些测试隔离和清理断言，没有改运行时代码。

本地 HTTP 版本检查使用显式测试 SHA，只验证版本头传递机制；Docker 的实际提交 SHA 由 Actions 构建参数写入。没有把该测试值当作已提交镜像版本。

## 工作流与一次性设置

- main：现有规则/浏览器/容器验证 → 发布摘要 → 首次配置检查 → 旧提交检查 → SSH 部署 → 容器与线上提交版本检查。
- 标签只发布镜像，PR 不部署；未配置全部必填 Secrets 时部署明确跳过，配置只缺部分时失败并列出名称。
- 用户后续明确使用 root，当前必填 Secrets 为 DEPLOY_HOST、DEPLOY_SSH_KEY、DEPLOY_KNOWN_HOSTS；主机/私钥兼容 SERVER_HOST、SERVER_SSH_KEY。端口/目录/公网地址默认值及设置位置见 [部署说明](../deployment.md#3-配置一次以后自动更新)。
- 临时 Docker 认证使用当前 Actions 短期令牌，不永久覆盖服务器登录；成功后只原子更新 .env 的 IMAGE。

## 边界

开始时只读查询确认仓库 Secrets/Variables/Environments 为空；用户将自行配置。真实 SSH 登录、私有镜像拉取和网站反向代理由首次配置后的服务器部署任务验证；代码/镜像发布成功不等于网站已经更新。

并发锁和信号恢复经过代码审查，本轮没有真实锁争用或信号注入演练。SIGKILL、断电或 Docker 守护进程故障超出脚本的尽力回滚范围。单实例更新会结束内存中的联机房间，现有开发提醒保留。本轮更新已有 Compose 服务，不更改游戏数值或玩法。

截图、日志、工具二进制和 dist 不提交。最终交付以 origin/main 本次提交对应的 GitHub Actions 状态为准。
