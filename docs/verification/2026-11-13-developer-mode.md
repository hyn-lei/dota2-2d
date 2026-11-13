# 2026-11-13 单人人机开发者模式验证

基于 `343f4a8cf19198ccf963f718f75b3b56cbe306da` 添加用户指定的当前对局开发者功能。保留原生 JavaScript / Canvas、英雄/技能/物品 ID 和现有 GitHub Actions / GHCR / SSH 部署方式。

## 规则与生命周期

设置的最后一节为“是否开启开发者模式”，输入六位数字密码 `821027` 开启。开启时自己的金钱设为 99999。面板可选自己、友方 AI 或敌方 AI，输入目标等级或升到满级 30；等级使用正常经验、技能点、天赋点和 AI 自动加点流程，拒绝降级和非整数输入。目标金钱可独立设为 99999。

每名英雄的生命、魔法额外回复可独立开关，默认为关闭。实际模拟持续补足存活英雄的对应资源；不提前复活，灵魂之戒等临时魔法继续使用已有消耗与到期规则。关闭模式停止所有目标的额外回复，保留已应用等级和金钱。

模式状态和开关使用游戏实例的临时存储，不加入存档或浏览器偏好。返回大厅、重开、对局结束、真实页面离开后关闭；恢复存档、新局和 `pagehide` / `pageshow` 生命周期返回都需重新输入密码。单机设置继续暂停比赛，关闭设置仍保留本局已开启的模式。大厅和所有联机房间不可开启，包括一名真人加 AI 补位的房间；联机协议没有添加开发者命令。

改键录入在焦点进入密码、等级输入或选择框时取消，保留已经编辑的键位草稿。开发者操作不会自动保存未确认的键位。Tab 焦点包含可见输入框，跳过隐藏的密码表单。

## 规则回归

`node --test tests/developer-mode.test.mjs`：**18 项全部通过**。覆盖错误密码原子性、暂停中操作、30 级与点数上限、自己/友方/敌方独立升级、金钱、无效目标、阵亡目标、回复开关、临时魔法、关闭/再次开启、保存恢复、对局结束和联机客户端/服务器拒绝。

已有弱/强幻象的召唤快照继续保留；测试确认本体通过开发者模式升级、加金钱和额外回复都不会更新旧幻象或为它们开启额外回复。定向日志为 `artifacts/developer-mode-targeted-first.log`。

最终 `npm test -- --test-concurrency=4`：**609 项，608 通过，1 跳过，0 失败**。只降低本机运行并发，不过滤任何用例或延长测试超时。跳过项为本机无 Docker Compose 的既有检查，Actions 保留真实生产容器验证。日志为 `artifacts/developer-mode-npm-test.log`。

首轮默认并发的完整 `npm test` 有一项既有部署回滚夹具子进程触及 30000 毫秒超时（`a failed pull restores files and leaves the previous running image intact`）。单独复测该项通过，约 5.2 秒，再以较低并发运行上述完整测试全部通过；未改动回滚脚本、用例或超时。原日志为 `artifacts/developer-mode-npm-test-first.log`，隔离日志为 `artifacts/developer-mode-deployment-recheck.log`。

## 浏览器与构建

最终生产 `dist/` 顺序运行以下检查，合计 **16 组通过、无浏览器错误**：

- `tests/browser-developer-mode.mjs`：**8 组**，通过真实齿轮、密码表单、升级按钮、目标列表、回复开关和保存恢复操作；覆盖自己与双方 AI、错误密码、非法等级、不同目标的开关、退出/重开/刷新、页面生命周期事件、改键焦点与密码输入、桌面和 390 像素手机布局。另在本地独立服务器实际开启一真人加 AI 联机房，验证 UI 和客户端修改都被拒绝。
- `tests/browser-keybindings.mjs`：**4 组**，确认原有 ASDF / QWERTY、Ctrl 学习、Alt 自施法、附加技能、保存/恢复和默认键位。
- `tests/browser-recovery.mjs`：**4 组**，确认刷新、关页、返回大厅、新局替换和存储失败提示。

日志为 `artifacts/developer-mode-browser-regressions.log`；报告为 `artifacts/developer-mode-browser-report.json` 与 `artifacts/keybindings-report.json`；桌面/手机截图为 `artifacts/developer-mode-settings-1366.png` 和 `artifacts/developer-mode-settings-390.png`，已检查实际可读性与遮挡。

`npm run build` 与 `npm run check:build`：通过，**58 个 JS 模块、309 个本地引用**。前端内容版本为 `df79a69d3dd35b9b701676cf009dec8ddc32e7b994a155b69687fa19acf118f3`。日志为 `artifacts/developer-mode-build.log`、`artifacts/developer-mode-check-build.log`。

发布前 `git diff --check` 通过。上传后按本次提交检查 Actions、GHCR 镜像与 SSH 部署结果，再核对公网 `/healthz` 的提交版本、HTML 前端版本及相关运行时模块，并复测正式站开发者面板。

## 数据与范围

本轮为用户指定的单机练习功能，沿用同日已核对的 7.41f 参照和现有 30 级上限，不修改官方数据快照、生成器或常规对局伤害/经济数值。不据此宣称与 Dota 2 客户端开发工具或所有机制等价。使用与边界见[开发者模式说明](../developer-mode.md)、README 和[物品运行时来源](../item-runtime-sources.md)。
