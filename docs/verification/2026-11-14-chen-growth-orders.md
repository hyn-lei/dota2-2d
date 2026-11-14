# 陈、狂热者成长和头像详细属性验证

验证针对本轮提交中的原生 JavaScript / Canvas 工程。Valve 补丁列表、陈数据和单位 KV 重新核对，仍参照 7.41f；自定义“成长”及其限制与官方输入分开维护。

## 规则验证

`tests/chen.test.mjs` 验证来源哈希、数值、施法、劝化名额、远古升级、治疗、召回、殉道、死亡 / 复活、受控技能、存档与联机所有权。`tests/zealot-orders.test.mjs` 覆盖默认跟随、超过 600 的空地移动 / 指定敌人、指定目标优先、600 搜索中心与边界、锁定后追击、待命中止 / 重新开启、停止和存档。

新增 `tests/zealot-growth.test.mjs` 通过实际经验升级验证：

- 二级及三级分别累加四种加成，实际攻击伤害及受到的魔法伤害同步变化。
- 十一至十四级分别跨过魔抗、攻速与护甲限制，三十级攻击伤害继续累加到 +464；三项限制分别为 +400、+50、+60%。
- 多次升级在一次经验事件内发生、狂热者死亡期间升级、重生、存档和旧未限制记录修正。
- 被动显示不会挤占殉道 Q 热键，不修改官方 `ZEALOT.abilities` 原始数据；反复属性刷新不会重复叠加。

针对陈、指令与成长的 29 项集中规则检查通过。只读审查新增了实际攻击只计算一次光环 / 减伤、光环来源刚死亡时存档后的生命加成清理、眩晕中禁止开始殉道、连锁闪电的后续弹跳四项回归；每项先复现失败再验证修复。完整确定性模拟使用 `scripts/capture-chen-state.mjs` 为四种英雄配置分别进行两次独立运行；新基线为 `simulation-with-chen.json`，旧的随机阵容基线保留。更换理由记录在新基线中，不直接采纳失败测试的哈希。

## 浏览器验证

`npm run test:chen` 使用真实头像、单位选择按钮、右键空地 / 敌人、F1/F2/F4、W 和受控技能按钮。检查成长说明与限制、真实经验升级、当前底部头像和自己的顶部头像展开属性、面板保持 / 关闭 / Esc / 键盘激活、三十级属性，以及 1920×1080、1366×768、390×844 布局。

`npm run test:chen-coop` 创建实际九 AI 补位房，使用 WebSocket 移动 / 攻击 / 停止，验证追远敌、600 续战、待命与返回、拒绝伪造所有权指令。服务器升级到三十级后，浏览器收到受限制的成长，并显示 52 护甲、60% 魔抗、500 实际总攻速。两项浏览器脚本均通过，报告为 `artifacts/chen-browser-report.json`、`artifacts/chen-coop-report.json`。

上传前重新运行陈的 10 组单机浏览器检查与 5 组实际联机检查，新增选中的狂热者死亡后鼠标 / 键盘立即转回陈、军队成员到期后的剩余单位移动，以及同一联机客户端无需重选即可控制陈。单机测试自建临时服务，避免依赖此前已关闭的开发服务。

小兵验证用真实渲染器绘制双方三种兵种 × 三个等级；每类的三档轮廓和像素都不同。截图 `artifacts/creep-three-tiers.png`，规则仍由原兵营升级代码处理。技能说明位置调整到军队控制按钮上方，窗口变化会收起旧位置的技能说明。

最终审查修正后的 `npm test` 共 673 项：**672 通过、0 失败、1 项因本机无 Docker Compose 跳过**（`artifacts/chen-review-rules-final.log`）。包含紧急修复的银月之晶永久属性与 AI 回城回归，以及四项新增召唤物规则回归。此前并行高负载检查中的部署模拟超时已单独重查通过；最终完整运行同样通过。

审查修正后重新运行 `npm run build` 和 `npm run check:build`，静态构建检查 **68 个 JS 模块、362 个本地引用**通过；证据为 `artifacts/chen-review-build-final.log`、`artifacts/chen-review-check-build-final.log`。单位技能、幻象、随机阵容浏览器回归通过；证据为 `artifacts/chen-unit-skills.log`、`artifacts/chen-illusions-recheck.log`、`artifacts/chen-ai-draft.log`。通用浏览器 **17 组**、选中头像 / HUD **6 组**、开发者设置 **8 组**通过，输出分别为 `artifacts/chen-general-browser-final.log`、`artifacts/chen-selected-hud-final.log`、`artifacts/developer-mode-final.log`。通用施法检查保存同一时刻的洪流 / 幽灵船类型快照，避免把攻击弹当作第二个技能，或读取下一帧已经消失的临时状态。

提交后按实际 SHA 查询 GitHub Actions。镜像发布和实际服务器部署分别确认；公开客户端未逐帧对照的边界见 [陈实现说明](../chen-runtime-sources.md)。
