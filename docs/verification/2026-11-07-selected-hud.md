# 2026-11-07：头部头像、选中单位 HUD、天赋与商店

## 交付范围

- 七位英雄的底部头像改为 Valve 客户端竖版头肩肖像。
- 顶部头像和战场左键选中单位直接替换原底部栏，无独立单位检查窗口。生命/魔法、属性、技能、装备、状态跟随选中单位；空地左键/空格恢复自身。
- 查看队友、敌人及其他真人时控件只读；自身快捷键继续操作自身。金币、商店、信使归操作者。
- 使用客户端天赋树贴图，扩大控件并移至普通技能左侧，方形加点按钮在有可学习天赋时出现；左右已学分支独立显示。
- 商店按客户端 ShopV2 分成并排基础/升级目录，采用原版分类和顺序，四列物品图标；合成关系位于目录上方，说明通过悬停显示。全部 268 个物品/卷轴仍可访问。

## 验证

- `npm test`：413 项，412 通过，1 跳过，0 失败。
- `npm run test:browser`：17 组通过，包含敌方查看、独立购买、战场选择、中立单位属性、天赋、回城、死亡/重生和手机布局。
- `npm run test:hud`：5 组通过，包含实际奥术光环、射手天赋、驱散/到期移除、状态说明及 1920×1080、1366×768、390×844 的布局。
- `npm run test:selected-hud`：6 组通过，包含七位英雄头像位置、选中单位实时数据、只读点击/自动施法/双击装备、另一真人的权限、空地恢复、方形天赋加号和完整商店目录可达性。
- `node tests/browser-shop.mjs`：8 组通过，包含合成余款、出售、背包转移和重新生效、储藏、神秘商店、快捷购买与响应式布局。
- 卓尔游侠 8 组、食人魔 7 组、主动物品 6 组浏览器检查通过。
- `npm run test:recovery`：4 组通过，覆盖刷新/关闭恢复、返回大厅、重开对局与存储失败提示。
- `npm run build` 与 `npm run check:build`：通过；44 个 JS 模块、134 个本地引用检查通过。
- `scripts/extract-client-hud.py`：重新导出 10 张贴图后 SHA-256 与来源清单完全一致。

浏览器报告与截图在 `artifacts/`；本次固定截图另存 `selected-hud-images/`。新检查已加入 GitHub Actions 的生产容器验证。

[桌面底部栏](selected-hud-images/selected-hud-1920.png) · [敌方英雄](selected-hud-images/selected-enemy-1920.png) · [天赋树](selected-hud-images/selected-talents-1920.png) · [商店](selected-hud-images/selected-shop-1920.png) · [笔记本](selected-hud-images/selected-hud-1366.png) · [手机](selected-hud-images/selected-hud-390.png)

## 参照与边界

官方最新补丁接口仍为 7.41f。客户端源来自 Steam build 26139613 的指定 Panorama 资源；版本和纹理校验见 `../research/hud/client-sources.json`。这是本项目对原版结构、交互和可用状态的修正，尚未完成固定 HUD 设置下的客户端逐像素截图差分；静态头像、手机布局等边界见 [来源说明](../hud-status-sources.md)。
