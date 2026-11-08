# 2026-11-08 幻象造型与手动控制验证

基于 `510020bb0ad317100b757d1faab92ed59754812a`。本次仅发布幻象造型、归属、独立操控、强弱规则及必要的存档兼容；原工作区暂停的潮汐使者/暴击改动另行保留，不属于本次提交。

## 本地结果

- `npm test -- --test-concurrency=1`：**469 项，468 通过，1 跳过，0 失败**。本机缺少 Docker Compose 的已有检查跳过；CI 继续验证生产容器。
- 新增 **12 项**幻象规则测试：幻影斧弱幻象、技能/装备独立副本、无指令待机、移动/停止/到期、技能与物品暴击/吸血、Drow 射手天赋和先天敏捷、物品光环、强幻象七英雄属性/魔法/升级与独立施法、物品冷却/辉耀开关、服务端归属和嵌套物品校验、补刀/击杀奖励、非自有物品、存档恢复、旧版幻象迁移及复制圣剑不掉落。
- `node tests/browser-illusions.mjs`：**6 组通过**。1366×768 / 390×844，七英雄完整模型与蓝色像素、真实幻影斧生成、键盘和右键独立移动、停止、空格恢复、无指令不跟随、他人幻象只读、弱幻象主动限制、强幻象技能/物品独立魔法与冷却、到期恢复底部栏。
- 七种模型以相同朝向和动画时刻对照：有效模型像素 **100%** 满足蓝色阈值，轮廓 alpha 差异超过容差的像素 **0**。此结论针对工程自身的模型与蓝色副本，不代表与 Source 2 角色资源等价。
- `node tests/browser-illusion-coop.mjs`：**3 组通过**。两个隔离浏览器身份连接真实 WebSocket 服务，分别用幻影斧制造幻象；手动移动只作用于本人的所选幻象，另一客户端同步看到结果。通过原始请求伪造他人幻象指令、弱幻象技能指令均被服务端拒绝；回到本体后幻象仍待机。
- `browser-selected-hud.mjs`：**6 组通过**，原有英雄头部肖像、共享信息栏、天赋树/加号、268 件商店目录和桌面/手机布局回归通过，无浏览器异常。
- `npm run build`、`npm run check:build`：**53 个 JS 模块、171 个本地引用**检查通过。
- `git diff --check` 通过。两个幻象浏览器检查加入 GitHub Actions，运行在本次提交的代码上；原有模拟快照无需更新。

日志和截图保存在忽略目录 `artifacts/`：`illusion-rules.log`、`illusion-focused.log`、`illusion-selected-hud.log`、`illusion-browser-report.json`、`illusion-coop-report.json`、`illusion-seven-heroes.png`、`illusion-controlled-desktop.png`、`illusion-controlled-mobile.png`、`illusion-coop.png`。

## 玩法与发布边界

强弱继承方式按用户本次指定实现；当前实际幻象来源为幻影斧，强幻象通过生成接口和测试覆盖提供，没有新增强幻象来源 ID。仍为原生 JavaScript / Canvas，不是 Valve 客户端全部幻象例外规则的复刻。详见 [幻象说明](../illusion-control.md)。

提交推送到 `origin/main` 后由工作流验证并发布镜像。服务器更新以该提交的部署任务和公网 `X-Game-Revision` 为依据，不能仅用镜像发布成功来断言服务器已更新。
