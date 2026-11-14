# 2026-11-14 商店装备效果显示验证

基于 `fecce3967cf473af624c65fb4a05e28529c7c0e2` 继续开发。保留原生 JavaScript / Canvas、英雄与物品 ID、地图和现有部署方式。本次修改商店显示，不改变装备战斗规则。

## 问题与修改

狂战斧的数据已包含分裂说明，但 `src/dota-ui.css` 把桌面所选详情的 `.item-description` 设为 `display:none`。手机原先也只提供 90 像素高的说明区。

现在所选详情显示属性，以及分别带标题的主动、被动、开关和升级效果。描述中的数值、范围、持续时间、叠加与近战限制保留；补充注释可展开。标题采用更清晰的字号和颜色，长说明独立滚动。滚到目录下方选中物品后，商店自动回到所选详情；换物品时说明滚动回到顶部。悬停预览共用效果渲染，注释折叠控件仅在可操作的所选详情中显示。

2026-11-14 核对 [Valve 补丁列表](https://www.dota2.com/datafeed/patchnoteslist?language=english)，最新仍为 **7.41f**；直接核对 [狂战斧数据](https://www.dota2.com/datafeed/itemdata?language=schinese&item_id=145)，确认常驻属性与分裂说明和本地记录一致。响应保存在 `artifacts/shop-effects-valve-version.json` 与 `artifacts/shop-effects-bfury-valve.json`。官方快照、生成器和运行时代码继续分开维护，未因显示调整改写数据。

## 浏览器回归

`tests/browser-shop-effects.mjs` 通过真实商店选择验证：

- 狂战斧显示 +50 攻击力、主动砍伐、被动压制和被动分裂；分裂保留对英雄 **60%**、对非英雄 **40%** 物理伤害、最远 **650** 距离及**仅近战有效**。可展开分裂无视减益免疫等注释，并在界面刷新后保持展开。
- 悬停预览与所选详情的效果一致。刃甲、黯灭、希瓦、金箍棒、撒旦、鞋类、卷轴、旅行靴、辉耀和臂章均有完整可见说明，开关与升级标题正确。
- 单击只查看；详情移动后，真实双击和右键各购买所指装备一件。检查装备栏内容，避免丢失购买或重复购买。
- 逐一选择全部 **268 件**可购物品，检查所选详情保留完整来源说明。比较忽略排版空白、标题冒号及界面添加的通用分组标题，仍按顺序核对全部原文，未只检查关键词。
- **1920 × 1080、1366 × 768、1024 × 576、390 × 844** 均检查所选物品标题可见、分裂段落完整位于商店与效果区域中、页面没有横向溢出，并捕获截图；浏览器没有脚本或资源错误。

报告为 `artifacts/shop-effects-browser-report.json`，截图为 `artifacts/shop-effects-selected-{width}.png` 和 `artifacts/shop-effects-{width}.png`。新回归入口为 `npm run test:shop-effects`，已接入现有 GitHub Actions。

以下 Playwright 检查均指向 `http://127.0.0.1:5195` 的生产构建，全部通过：

| 检查入口 | 通过组数 | 覆盖内容 |
| --- | --- | --- |
| `tests/browser-shop-effects.mjs` | 5 | 狂战斧、完整目录原文、效果分组、购买手势、四种尺寸的真实可见性 |
| `tests/browser-shop.mjs` | 8 | 购买、组件抵扣、出售、背包激活、储藏、神秘商店与快捷购买 |
| `tests/browser-selected-hud.mjs` | 6 | 七英雄共享 HUD、只读他人装备、天赋、完整目录及多尺寸布局 |
| `tests/browser-economy.mjs` | 3 | 关闭商店快捷购买、图标比例和臂章实际状态 |
| `tests/browser-items.mjs` | 6 | 使用与目标选择、冷却、假腿、信使、锁定/拆分/掉落和布局 |
| `tests/browser-ai-room.mjs` | 4 | 四种尺寸入口、单人与双人联机补位、重连及真实双击购买 |

六组日志分别保存在 `artifacts/shop-effects-built-{shop-effects,shop,selected-hud,economy,items,ai-room}.log`；新效果报告同时保存验证网址与前端内容版本。

首次 CI（`8e00b4153fc302cd2aac64b536e6803934fbcdbd`）的 **625 项规则测试**、商店效果与物品操作检查通过，但 `browser-ai-room.mjs:64` 的双击购买超时，发布未执行。本地复现捕获到第一下点击铁树枝干后商店滚动了 83 像素，第二下点击落到普通 `div`，原购买监听丢失物品。修复保留第一次点击的物品 ID，并阻止第二下点击误操作移位后的控件；真实双击仍只购买一次。新增手势回归及原有双人联机回归均通过，未放宽购买断言。首次 CI 日志为 `artifacts/shop-effects-github-job-132259879255.log`。

## 发布验证

- `npm run build`：通过，前端内容版本为 `d943e87bbd643ec52b4f57e944a818a8bffba31c73611bc09d0f251ed02fc78f`。
- `npm run check:build`：通过，**60 个 JavaScript 模块、318 个本地资源引用**。
- `git diff --check`：通过。

构建日志为 `artifacts/shop-effects-build.log` 和 `artifacts/shop-effects-check-build.log`。本地浏览器证据对应上述生产构建。推送后按实际提交检查现有 GitHub Actions 的全量规则/浏览器验证、GHCR 镜像发布与服务器部署结果；镜像发布本身不代表服务器已更新。

显示使用当前工程的物品说明，不代表已完成 Dota 2 客户端全部物品组合的实测对照。既有来源冲突与实现边界继续见 [商店目录](../item-catalog-complete.md)、[运行时说明](../item-runtime-sources.md) 和 README。
