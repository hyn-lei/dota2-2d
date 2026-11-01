# 2026-11-01 SSH root 与参考配置

按用户提供的参考项目 `E:\works\vps_cost\.github\workflows\deploy.yml` 核对：该工作流使用 SERVER_HOST、SERVER_SSH_KEY，SSH 用户名固定 root，端口 22，没有配置 ssh-action 的 fingerprint。只读查看参考项目，没有修改它。

用户明确要求 DEPLOY_USER 使用 root。游戏工作流现在固定 root，不读取或要求用户名 Secret；部署脚本默认 root。主机与私钥兼容 SERVER_HOST / SERVER_SSH_KEY，现有 DEPLOY_HOST / DEPLOY_SSH_KEY 优先。DEPLOY_KNOWN_HOSTS 继续保存并核验服务器 SSH 主机公钥；它不是 GitHub 用户名或登录私钥。

用户名默认回归在旧实现因缺少 DEPLOY_USER 失败，修正后实际 SSH 传输目标为 root。验证结果：

- `npm test`：324 / 324，日志 artifacts/root-ssh-config-node.log。
- 部署脚本情境：11 / 11。
- `npm run build` / `npm run check:build`：38 模块 / 102 引用通过。
- actionlint 1.7.12 和 Bash 语法检查通过。

本轮仅调整 SSH 用户名与 Secret 名称兼容；不修改游戏规则、端口或服务器目录。实际服务器更新仍以本次提交的 Actions 部署任务为准，未配置主机/私钥/主机公钥时不能声称已更新。
