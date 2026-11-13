# 2026-11-13 幻象自动索敌、技能增益与召唤快照验证

基于 `45a0f03ab17724df5f7f3cc8f0d5e35951ee30ec` 修改现有原生 JavaScript / Canvas 工程。保留英雄、地图、物品 ID、幻象生成接口及部署方式。

## 用户规则与实现

弱幻象空闲时按自身中心 600 世界单位扫描可见、可攻击的敌人，包括未进入战斗的野怪、小兵、英雄、幻象、召唤物、守卫、信使和可攻击建筑。半径不额外加上目标体积；当前目标仍合法时继续锁定，否则选择最近敌人。目标死亡、离开范围或失去可见性后重新选择。手动移动、指定攻击优先；“停止”取消当前指令，恢复空闲后可再次自动索敌。

强幻象不自动索敌，也不继承 AI 本体的当前攻击命令。两类幻象均继续独立接受合法手动指令。自动追击使用正常行走与攻击，并接入已有障碍绕行；双方回归确认不能穿越友军或瞬移越过阻挡。

两类幻象保存召唤时的装备、技能等级、天赋和增益快照。弱幻象新增有效正面状态的独立复制，保留来源、数值和原到期时间；施法与引导命令不复制。本体之后买装备、加点、收到新的友军增益，都不更新已存在的幻象。直接施加给幻象的合法技能增益和光环仍生效，并使用施法者的天赋增强。

用户给出的黑皇杖例子使用真实购买、自然金币收入、信使配送和配方合成验证：本体已有秘银锤、食人魔之斧，购买卷轴还差 10 金币时召唤幻象；之后购买卷轴、由信使送达并合成黑皇杖，旧幻象仍保留原有配件及其属性。

现有嗜血术、护盾、治疗和光环已能选择幻象，本轮补齐幽灵船朗姆酒原先只选择英雄的遗漏，并计入昆卡的技能范围天赋。卓尔游侠光环解析显式传入来源英雄的天赋与升级状态。弱幻象仍不能主动施法或使用装备；强幻象沿用已有独立技能、魔法和冷却实现。

## 行为回归

新增 `tests/illusion-behavior.test.mjs` 的 **31 项**行为检查，覆盖目标类型、600 中心半径、目标保持/失效、可见性与保护状态、手动优先、双方阻挡绕行、AI 本体命令隔离、增益与天赋、黑皇杖真实配送、后续加点不更新旧幻象以及存档恢复。

用 `git archive` 提取基准提交的原始 `src/`，在隔离的 `artifacts/illusion-baseline-45a0f03/` 中运行相同用例，结果为 **10 通过、21 失败**，日志为 `artifacts/illusion-behavior-before.log`。修复后的 `node --test tests/illusion-behavior.test.mjs tests/illusions.test.mjs tests/obstacle-navigation.test.mjs` **49 项全部通过**，日志为 `artifacts/illusion-behavior-targeted.log`。

原幻象检查中“无指令不索敌”改为明确检查强幻象；弱幻象的独立控制、技能/装备限制、实际伤害和过期恢复检查继续保留。

## 浏览器与联机

- 生产 `dist/` 的 `tests/browser-illusions.mjs`：**8 组通过、无浏览器错误**。实际使用幻影斧，验证弱幻象独自追击并攻击野怪、600 提示、两类幻象的天赋增强嗜血术快照，以及强幻象在近敌旁待机后手动施法。原七英雄蓝色模型、独立键盘/鼠标控制、越权限制、390 像素界面与过期恢复检查继续通过。报告为 `artifacts/illusion-browser-report.json`，截图为 `artifacts/illusion-controlled-desktop.png`、`artifacts/illusion-controlled-mobile.png`。
- `tests/browser-illusion-coop.mjs`：**6 组通过、无浏览器错误**。两个真实浏览器观察服务器实际执行弱幻象索敌/追击/伤害，独立保留强弱增益快照；强幻象只在收到归属玩家的真实 WebSocket 攻击命令后攻击。保留原控制、同步和越权检查。报告为 `artifacts/illusion-coop-report.json`。
- 同一生产构建的 `tests/browser-recovery.mjs`：**4 组通过**，覆盖刷新、关闭页面、存档替换确认和存储失败提示。日志为 `artifacts/illusion-behavior-production-browser.log`。
- `npm run test:release-cache`：**2 组通过**，保留四小时旧模块缓存时刷新仍加载统一的新版本，九个 AI 正常离开开局 T3 路点。日志为 `artifacts/illusion-behavior-release-cache.log`。

## 最终检查

- `npm test`：**591 项，590 通过，1 跳过，0 失败**。跳过项为本机缺少 Docker Compose 的既有配置检查；Actions 继续验证生产容器。最终日志为 `artifacts/illusion-behavior-npm-test.log`。
- 首次并行浏览器验证时，一人联机房间检查在等待快照的 2500 毫秒上限超时。隔离复测 `tests/coop-ai-fill.test.mjs` **9 项全部通过**，再单独运行完整 `npm test` 得到上述最终结果；保留首轮日志 `artifacts/illusion-behavior-npm-test-first.log` 和隔离复测日志 `artifacts/illusion-behavior-coop-init-recheck.log`。
- `npm run build`、`npm run check:build`：通过，**56 个 JS 模块、298 个本地资源引用**。日志为 `artifacts/illusion-behavior-build.log`、`artifacts/illusion-behavior-check-build.log`。
- `git diff --check`：通过。

本轮前端内容版本为 `347fb485a18056987dcb812029f95956fd6aad6c18b5a038b61b27d37b55eb32`。上传后检查对应提交的 GitHub Actions，再分别核对镜像发布、服务器部署与公网健康检查/前端内容版本。

## 来源与边界

2026-11-13 核对 Valve 官方 `https://www.dota2.com/datafeed/patchnoteslist?language=english`，最新仍为 **7.41f**，原始响应为 `artifacts/illusion-behavior-valve-version.json`。本轮实现用户指定的索敌、继承与加成规则，没有修改官方数据快照或生成器，也不据此宣称与 Valve 全部幻象例外或 Source 2 客户端等价。现有生成来源与运行时边界见 [幻象说明](../illusion-control.md) 和 README。
