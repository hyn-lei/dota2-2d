# Automatic Deployment Implementation Plan

此计划保留作为历史记录；当前部署实现执行 [内联 Compose 计划](2026-11-01-inline-compose-deployment.md)。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** main 提交在通过验证和镜像发布后自动更新现有 Docker Compose 服务器。

**Architecture:** 保留现有验证/发布任务，增加配置检查和 SSH 部署任务。Bash 脚本分别负责 Actions 侧传输与服务器部署事务；健康接口以响应头公开镜像提交 SHA，验证运行版本。

**Tech Stack:** GitHub Actions、OpenSSH、Bash、Docker Compose、现有 Node 测试框架。

**Spec:** `docs/superpowers/specs/2026-11-01-automatic-deployment-design.md`

## Global Constraints

- 保留游戏/地图/物品 ID、Compose 服务和 .env 的端口/绑定配置，不改变玩法。
- main 自动部署，标签只发布镜像，PR 不部署；不使用 latest 代替本次摘要。
- 固定 SSH 主机公钥；不提交或输出私钥、令牌，不永久改写服务器的 Docker 认证。
- 必要验证后提交相关代码/文档并推送 origin/main，检查本次 SHA 的 Actions。
- 没有凭据就明确报告首次配置尚未完成，不把发布镜像说成已部署。

## Review Focus

- 新镜像拉取失败：现有服务保持运行。
- 容器或公网版本检查失败：恢复上次不可变镜像并保留原配置。
- 路径含空格/引号或恶意输入：参数正确传递，不执行插入的命令。
- 重复部署、旧提交、并发部署：不覆盖新版本、不破坏其他服务。
- 部分/全部配置缺失和私有 GHCR：状态明确，临时凭据清理。

### Task 1: Actions 侧配置与安全传输

**Files:** 创建 `scripts/deploy-from-actions.sh`、`tests/automatic-deployment.test.mjs`。

- [x] 使用真实 Bash 和受控 SSH/Docker 边界写配置、输入验证、传输及清理测试。
- [x] 实现配置预检、严格 SSH 参数、临时私钥/known_hosts、脚本传输与令牌标准输入。
- [x] 验证空白/引号路径、缺少配置、主机验证和临时 SSH 文件清理。

### Task 2: 服务器事务与运行版本

**Files:** 创建 `scripts/deploy-on-server.sh`；修改 `Dockerfile`、`server/coop-server.mjs`；扩展测试。

- [x] 写拉取失败、健康失败回滚、成功持久化 IMAGE、版本头测试；版本头、检查失败回滚和原子写入失败均观察到 RED→GREEN。
- [x] 实现部署锁、保留当前镜像、临时认证、精确摘要更新、容器/公网版本验证与回滚。
- [x] 把提交 SHA 编入镜像，/healthz 保持 ok 正文并增加版本头。
- [x] 运行所有部署测试与 npm test，323 / 323。

### Task 3: 工作流、文档和交付

**Files:** 修改 `.github/workflows/docker.yml`、`docs/deployment.md`、`README.md`；创建验收文档。

- [x] 发布任务输出镜像摘要，构建传入提交 SHA；增加 main 配置检查、旧提交检查和自动部署。
- [x] 明确一次性 Secrets/Variables、部署目录、回滚和联机中断边界。
- [x] 运行 actionlint、Bash 语法、部署测试、npm test、build/check:build；独立只读审查。
- [x] 用户明确选择自行在仓库 Secrets 配置；实现参数读取、默认值和配置等待状态，不代填登录凭据。
- [ ] 验证后的代码/文档提交并推送 origin/main，核实该 SHA 的构建/发布/部署状态。

## 执行记录

- 基线：a283515 已完成远端 312 项规则测试、浏览器和容器检查，并成功发布 GHCR；本轮开始时工作区干净。
- 选择：在当前工作区的 codex/auto-deploy 分支实现，保留 main，全部检查后按用户约定集成并推送。
- Task 1/2: complete，真实 Bash 部署情境 10 / 10，完整规则/部署套件 323 / 323；健康版本头在旧实现返回 null，修正后通过。
- Task 3: 配置、文档、actionlint 1.7.12、Bash 语法、构建 38 模块/102 引用和生产目录 HTTP/WS 通过，待提交推送及对应 Actions。
- Final review: 独立只读审查无 Critical/Important，审查者复跑范围内 31 / 31。
- Final: minor (deferred): flock 由测试替身代替，没有专门注入信号测试；真实并发和中断恢复不作为本轮已经完成的验收证据。
- Final review boundaries: 实际 SSH/GHCR/反向代理由首次配置后验证；SIGKILL/断电/守护进程故障超出尽力回滚；本轮面向已有 Compose 服务；玩法等价性不在部署改动范围。
- 后续用户指定 root：固定工作流 SSH 用户名、移除用户名 Secret 要求，兼容参考项目 SERVER_HOST / SERVER_SSH_KEY。新增默认 root 回归 RED→GREEN，最新完整检查 324 / 324；具体证据见 docs/verification/2026-11-01-root-ssh-config.md。
