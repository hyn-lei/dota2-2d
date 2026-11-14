# 开发者模式长对局卡死修复

真实 Chromium 对局开启开发者模式，并为双方十名英雄设置满级、99999 金币和生命 / 魔法回复。约 8 分 30 秒时，AI 吞服银月之晶后，`src/bot-tactics.js` 的 `landingTargets` 对永久攻速加成调用 `e.id.startsWith`，产生 `TypeError`。这是通用 AI 装备判断，和玩家英雄无关；普通对局后期同样可能触发。

`statItems` 除有效装备之外，也返回没有库存 ID 的永久属性项。回城落点判断现在只识别实际旅行鞋两个 ID，永久银月攻速继续正常计算。未给永久属性伪造装备身份，未移除银月效果。主页面在帧开始时安排下一帧，单次模拟 / HUD / 渲染异常不再永久取消后续动画回调。

修复前，新增的双方 AI 回城回归均复现同一错误；修复后，`tests/bot-tactics.test.mjs` 与 `tests/developer-mode.test.mjs` 的 **50 项**检查全部通过，证据 `artifacts/developer-freeze-focused.log`。回归实际使用银月之晶并消费物品，验证永久 +60 攻速、真实卷轴 / 魔法 / 冷却、落地后继续推进，以及存档恢复后同样可回城。

新增 `npm run test:developer-stability` 使用真实开发者设置按钮，为九个 AI 实际吞服银月，保留双方基地以连续推进十五分钟模拟时间，并在分批推进间检查真实 HUD、渲染回调及页面错误。另验证一次注入的渲染异常后同局继续运行、退出 / 读档保留银月和关闭开发者模式。**三项真实浏览器检查全部通过**，报告 `artifacts/developer-stability-report.json`，截图 `artifacts/developer-stability.png`，输出 `artifacts/developer-stability-browser.log`。只有专门注入的一次异常，未出现其他页面错误。

最终审查修正后的 `npm test` 672 通过、0 失败、1 项因本机无 Docker Compose 跳过；构建及静态构建检查均通过，记录见 [陈、成长与头像验证](2026-11-14-chen-growth-orders.md)。稳定性检查已加入 GitHub Actions。本项是固定场景的浏览器回归，不能代替所有设备和任意长局的性能证明。
