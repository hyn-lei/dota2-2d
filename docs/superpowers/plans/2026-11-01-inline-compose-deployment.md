# Inline Compose Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 workflow 的 SSH 部署步骤自动写 Compose、拉镜像并启动，无需提前上传服务器配置。

**Architecture:** 验证/发布链路保持，deploy 改用 appleboy/ssh-action 的内联 Bash；配置生成、容器更新和失败恢复均在服务器执行。Node 测试解析 YAML 后执行该真实脚本。

**Tech Stack:** GitHub Actions、Docker Compose、SSH action、Bash、Node test/yaml。

**Spec:** `docs/superpowers/specs/2026-11-01-inline-compose-deployment-design.md`

## Constraints and review focus

- 固定 root，保留现有服务/端口/路径默认值；服务器参数仍由用户配置。
- 精确部署发布摘要；main 新提交检查与互斥保留。
- 首次部署、已有配置更新、拉取失败、启动失败、版本不符必须产生真实结果。
- 配置写入或恢复失败不能报告成功；凭据和备份必须清理。
- 可选指纹校验及第三方 SSH 连接边界要明确，镜像发布不等于部署。

### Task 1: YAML 脚本与配置测试

- [x] 将旧脚本测试改成从 YAML 解析和执行内联脚本，覆盖空目录、配置保留、失败恢复和异常参数；首次初始化用例先失败再通过。
- [x] 在 workflow 内生成 Compose/.env，使用 up --pull always 更新服务，验证版本并恢复失败；改为 SSH action，取消双脚本。
- [x] 运行部署测试，CI 用真实 Docker Compose 解析生成的配置和回滚覆盖文件；本地未安装 Docker 时明确跳过该一项。

### Task 2: 交付

- [x] 更新文档，明确两个必填 Secrets、自动首次初始化和可选指纹。
- [x] 运行 npm test（330 通过/1 跳过/0 失败）、build/check:build（38/102）、actionlint 和内联 Bash 语法；独立只读审查。
- [ ] 必要修正后提交推送 origin/main，检查对应 Actions，区分编译、发布、实际部署状态。

## 审查修正记录

- CI 端口环境清理：真实 Compose 验证不继承测试 runner 的 IMAGE、HTTP_PORT、BIND_ADDRESS 和 COMPOSE_PROJECT_NAME。
- 字面镜像恢复：测试解析实际 Compose 文件而不是盲读 IMAGE；旧代码在已重标记标签的场景不能恢复缓存镜像，修正后通过。
- 具名项目：旧代码启动了第二个项目，回归 RED→GREEN；现保存已解析项目名并用于所有命令和新配置。
- 恢复写入失败：保留配置备份、清除认证，回归通过。
- 实际 SSH 和 Docker 容器生命周期由用户配置后的部署检查验证；可选指纹按用户指定参考流程保留，游戏规则不在本轮审查范围。
