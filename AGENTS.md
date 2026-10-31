# 项目协作约定

- 在现有原生 JavaScript / Canvas 工程中继续开发，保留已有英雄、地图、物品 ID 与部署方式。
- 用户于 2026-10-31 明确要求：以后每条开发指令完成后上传。本仓库的“上传”指完成必要验证后提交代码和相关文档，并推送到 `origin/main`（`https://github.com/hyn-lei/dota2-2d.git`）。不要只留下本地修改；不要强制推送。
- 推送后检查本次提交的 GitHub Actions。镜像由工作流发布到 `ghcr.io/hyn-lei/dota2-2d`；未配置服务器凭据时，不把镜像发布说成服务器已更新。
- 游戏规则改动运行 `npm test`；界面变动运行适用的 Playwright 检查；发布前运行 `npm run build` 和 `npm run check:build`。测试证据应对应实际提交。
- 官方数据快照、生成器、运行时代码、来源说明分别维护。当前参照版本为 7.41f，继续开发前按任务需要核对 Valve 最新数据。
- 不把目录覆盖或测试通过称为与 Dota 2 客户端完全等价。已知边界记录在 `docs/item-runtime-sources.md` 和 README。
