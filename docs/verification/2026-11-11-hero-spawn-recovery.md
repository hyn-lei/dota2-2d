# 2026-11-11 英雄出生重叠与 AI 卡住修复验证

基于 `48792ca87c082d75002b059ba1f5e78ca85c77f2` 修复原生 JavaScript / Canvas 模拟，保留英雄、地图、物品 ID、联机控制权和现有部署方式。

## 原因与修复

原 AI 出生偏移只有 34 / 30 世界单位，小于英雄 48 世界单位的碰撞直径；两队泉水中心还落在现有不可行走地形内，并与泉水建筑占地重叠。实测默认开局天辉斧王、夜魇昆卡在十秒后仍停留在原位置附近。仅让玩家离开或增大初始间距不能完整解决地形阻挡。

英雄初始槽位间距改为 80，创建全部单位和建筑后，在泉水附近依次预留可行走且无单位 / 建筑重叠的位置。单机、联机真人和 AI 补位共用此逻辑；复活在返回控制前立即放置并更新碰撞索引。

移动先恢复不可行走或重叠位置，再进行寻路、停止距离判断和重试等待。分离的最短方向不可通行时查找附近空位；从原本可行走的位置出发必须保持整段地形通路可走。恢复位置后清除旧路径和旧重试等待，使旧存档中叠在泉水的 AI 也能步行出门，不消耗 TP。

## 本地验证

- 新增六项回归在修复前全部失败；修复后 `node --test tests/hero-spawn.test.mjs tests/collision.test.mjs` 的 11 项检查全部通过。
- 覆盖全部七种英雄选择、两队出生、1–5 真人的 AI 补位房间、四种难度下玩家站着不动时全部九个 AI 出门、十名英雄同时复活，以及没有 TP 且留有旧寻路等待的泉水重叠恢复。
- 独立检查英雄出生点的地形、与其他英雄 / 信使的距离、建筑矩形占地，并检查重叠分离不会穿过地形墙体。
- 最终 `npm test`：**536 项，535 通过，1 跳过，0 失败**。跳过的是本机缺少 Docker Compose 的已有部署检查；工作流继续执行容器验证。
- `node tests/browser-collision.mjs`：**6 组通过，0 浏览器错误**。真实页面上十名英雄位于可行走且无重叠的位置，玩家保持静止，五秒内九个 AI 分别移动约 1589–1806 世界单位。原有键盘阻挡、相位鞋穿过小兵、建筑阻挡和相位到期检查均通过。
- `node tests/browser-ai.mjs`：**5 组通过，0 浏览器错误**，覆盖开局装备、难度反应梯度、英雄装备路线、实际技能 / 物品战斗和信使购买 / 永久升级。
- `npm run build`、`npm run check:build` 通过：**55 个 JS 模块、184 个本地资源引用**。
- `git diff --check` 通过。

浏览器截图和原始证据保存在忽略目录 `artifacts/`：`collision-spawns.png`、`collision-blocked.png`、`collision-report.json`、`ai-browser-report.json`、`hero-spawn-npm-test-final.log`、`hero-spawn-build.log`、`hero-spawn-check-build.log`。

## 确定性基线与来源

出生、分离和复活位置会改变移动时间及后续战斗，原完整存档哈希因此有意变化。保留 `simulation-with-team-tactics.json` 历史基线，使用 `scripts/capture-spawn-state.mjs` 对相同三个英雄 / 种子、90 秒输入各运行两遍，先确认独立对局的哈希一致，再生成 `simulation-with-safe-spawns.json`。行为断言独立验证出生和恢复是否正确，快照用于检测之后非预期的模拟变化。

2026-11-11 核对 Valve 官方 `https://www.dota2.com/datafeed/patchnoteslist?language=english`，最新补丁仍为 **7.41f**，核对结果保存在 `artifacts/hero-spawn-valve-version.json`。本次未改动官方数值快照或生成器，不宣称本工程放置、碰撞和恢复机制与 Source 2 客户端完全等价。
