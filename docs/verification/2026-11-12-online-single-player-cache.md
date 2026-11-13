# 2026-11-12 线上单人对局与旧脚本缓存验证

用户确认入口为 `https://dota2.prismabyss.com` 的单人对局。本轮基于 `ec422769c420a6148b639013bd54e821f2c38e4f` 检查实际线上构建，并补上生产前端的缓存更新机制。

## 线上检查

- `/healthz` 返回该提交的 `X-Game-Revision`，对应 [GitHub Actions](https://github.com/hyn-lei/dota2-2d/actions/runs/43212080410) 的验证、镜像发布和服务器部署均成功。
- 八个关键模块与仓库内容一致；比较时统一 UTF-8 BOM 和换行符。证据为 `artifacts/online-solo-module-audit.json`。
- 直接从公网网页开始单人挑战对局，`tests/browser-ai.mjs` 的六组检查通过，无浏览器错误。真人静止，额外模拟 25 比赛秒、30 FPS，九个 AI 均越过开局 T3 路点。
- HTML 返回 `Cache-Control: no-cache`，健康检查返回 `no-store`；JS 返回 `max-age=14400`。带新查询参数的脚本请求返回 200、`CF-Cache-Status: MISS`。

以上确认新页面可以运行已有寻路修复，但不能还原用户当时浏览器内的代码。四小时脚本缓存可能使旧页面继续使用修复前的模块，因此本轮让整个生产模块图使用新的版本 URL。

## 生产构建改动

`scripts/build.mjs` 按前端 HTML 和源码内容计算 SHA-256，用原生 import map 为全部 56 个 ES 模块增加统一的 `?v=...`，并为入口脚本及 11 个样式文件增加同一版本。相对依赖和绝对动态导入解析到同一模块实例。内容版本记录在 HTML 的 `game-build` 元数据中；Git 提交仍通过健康检查响应头识别。

原生 JavaScript / Canvas 运行时、英雄/地图/物品 ID、单人存档及 Docker 部署路径继续使用既有实现。`dist/` 仍可由静态 HTTP 服务直接托管，联机 Node 模拟使用原始 `src/` 模块。构建检查验证版本映射的每个实际文件。

## 回归与发布前证据

- `npm run test:release-cache`：两组通过。先让浏览器加载旧入口、AI、渲染器和隐藏页面的旧样式，再在同一地址切换到生产 HTML；旧 URL 仍保留四小时缓存。刷新后的 67 个脚本/样式请求均使用当前内容版本，九个 AI 在真人静止时向前推进约 **4412–5878** 世界单位，无浏览器错误。最后主动请求无版本 AI URL，仍收到旧脚本，确认测试没有通过清空缓存规避问题。
- 生产 `dist/` 上的 `tests/browser-ai.mjs`：六组通过；`tests/browser-recovery.mjs`：四组通过，覆盖刷新、关闭标签页、存档替换确认及存储失败提示。
- `npm test`：**560 项，559 通过，1 跳过，0 失败**。跳过项为本机缺少 Docker Compose 的既有检查；GitHub Actions 继续执行生产容器验证。
- `npm run build`、`npm run check:build`：通过，**56 个 JS 模块、298 个本地资源引用**。
- `git diff --check`：通过。

本轮前端内容版本为 `fcd4dd4cfbc2407998820860ff7dd40589c6a2189321b083481561e5937d32ce`。日志为 `artifacts/online-solo-npm-test.log`、`artifacts/online-solo-check-build.log`、`artifacts/online-solo-release-cache.log`、`artifacts/online-solo-built-ai.log` 和 `artifacts/online-solo-built-recovery.log`；缓存回归的采样及截图为 `artifacts/release-cache-report.json`、`artifacts/release-cache-opening.png`。

上传后按实际提交检查 Actions 和公网前端版本；镜像发布成功与服务器部署成功分别核对。

## 来源与边界

2026-11-12 核对 Valve 官方 `https://www.dota2.com/datafeed/patchnoteslist?language=english`，最新版本仍为 **7.41f**，原始响应保存在 `artifacts/online-solo-valve-version.json`。本轮处理网页加载与缓存，不更新官方数值快照或生成器；已有运行时边界见 [AI 说明](../bot-ai.md)、[物品运行时来源](../item-runtime-sources.md) 和 README。

## 2026-11-13 续查与发布前复验

再次检查 `https://dota2.prismabyss.com`：健康检查仍返回 `ec422769c420a6148b639013bd54e821f2c38e4f`，AI、引擎和团队决策模块与工作区一致，AI 模块包含保留兵线路点进度的修复。公网 HTML 尚无前端内容版本，JS 响应仍为 `max-age=14400`。此次直接从公网开始的新对局，六组浏览器 AI 检查全部通过；真人静止，九个 AI 向前推进约 **4363–5863** 世界单位。没有复现新版本卡在本方 T3，也不能据此确定用户当时浏览器内加载的版本。原始响应和开局采样见 `artifacts/t3-followup-online-audit.json`、`artifacts/t3-followup-public-opening-report.json`。

本轮完成已有缓存修复，并让静态构建检查同时断言 HTML 中入口脚本与样式的版本，防止只更新模块映射而漏掉直接引用。最终源码验证结果：

- `node --test tests/bot-lane-progress.test.mjs tests/obstacle-navigation.test.mjs`：**22 项通过**，覆盖四档难度、双方联机补位、推进恢复和碰撞绕行。日志为 `artifacts/t3-followup-targeted.log`。
- 七种真人英雄选择，种子 17、挑战难度、60 FPS，各模拟 25 秒开局，所有 AI 越过 T3，最小前进距离约 **4027** 世界单位。记录为 `artifacts/t3-followup-hero-opening-sweep.json`。
- `npm run test:release-cache`：**两组通过**。旧入口、AI、渲染器与样式仍被缓存四小时；刷新后的 **67** 个模块及样式请求均使用内容版本，九个 AI 推进约 **4405–5905** 世界单位，无浏览器错误。主动请求无版本 AI URL 仍得到旧内容，确认测试保留了旧缓存。日志为 `artifacts/t3-followup-release-cache.log`。
- 生产 `dist/` 的 `tests/browser-ai.mjs`：**六组通过**；`tests/browser-recovery.mjs`：**四组通过**，覆盖刷新和关闭页面后的存档恢复。日志为 `artifacts/t3-followup-production-browser.log`。
- `npm test`：**560 项，559 通过，1 跳过，0 失败**。本机缺少 Docker Compose，既有容器配置检查跳过；实际容器验证由 Actions 执行。日志为 `artifacts/t3-followup-npm-test.log`。
- `npm run build`、`npm run check:build`：通过，**56 个 JS 模块、298 个本地资源引用**。日志为 `artifacts/t3-followup-build.log`、`artifacts/t3-followup-check-build.log`。

前端内容版本仍为 `fcd4dd4cfbc2407998820860ff7dd40589c6a2189321b083481561e5937d32ce`；本轮没有再次改变 AI 决策或英雄、地图、物品数值。2026-11-13 再次核对 Valve 官方补丁列表，最新仍为 **7.41f**，原始响应为 `artifacts/t3-followup-valve-version.json`。上传后检查对应提交的 Actions，再独立核对公网健康检查、前端内容版本与实际浏览器开局。
