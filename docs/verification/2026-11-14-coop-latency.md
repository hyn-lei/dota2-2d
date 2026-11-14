# 联机移动卡顿修复与验证

用户反馈为“人物移动断续、操作响应慢”，单人房间加入九个 AI 后仍明显卡顿。初次复现中 Canvas 约 60 帧，但人物位置每秒只变化约 2.6 次，首个移动反馈约 648 毫秒。主瓶颈在状态传输与移动呈现。

## 原因与修复

原协议一份快照必须同时等到发送完成和浏览器应用确认，才允许发送下一份。网络来回延迟会直接限制同步频率。每次还重传完整单位数据，浏览器人物位置只在收到快照时改变。模拟完成后的时间戳参与发送周期计算，也会使 100 毫秒的周期额外跳过一个 50 毫秒模拟帧。

- 连接协商 `delta-v1`，首帧保持完整快照，随后传输变化字段、单位增删和顺序。保留嵌套物品、状态与正负无穷时间；同一房间的共同变化可复用计算。旧客户端继续接收完整快照，新客户端能回退连接旧服务。
- 新协议最多四份快照在途。每份仍需发送完成和对应应用 ACK，超额广播合并为最新状态；缓冲、心跳、断线保留席位与终局送达继续生效。换房、换席位和重连从完整状态开始。
- 发送截止时间按原计划推进，延迟的一次模拟只发送当前状态，不追发过期帧。
- `NetworkPresentation` 为 Canvas、小地图和鼠标选取提供独立位置。其他单位在快照之间插值；自己的键盘、点地和受控幻象移动回放未确认输入，复用既有移速、寻路、树木和单位碰撞。服务器命令序号消除已处理输入，小误差按至少 80 毫秒衰减时间渐进校正；行走中根据误差和实际移速延长时间，使初始校正速度不超过行走速度的一半，避免转向确认把人物反向拉回。
- 客户端预测最多延续到最近收到快照后的 250 毫秒，估计单程回放最多 250 毫秒。拒绝操作、控制状态、生命状态改变、大幅位移、暂停、终局和断线会停止或重置显示。切换查看单位时，在途移动也能发送停止指令。金币、装备、生命、学习、技能结果及真正的位置仍来自服务器。

英雄、物品和地图 ID、原生 JavaScript / Canvas 与现有部署方式沿用原工程。详细协议见 [联机协议](../multiplayer-protocol.md)。

## 可复现对照

使用同一台机器、1366 × 768 的 Chromium、同一英雄阵容与种子 42，单真人加九个 AI。测试从 180 秒场景开始，生成野怪和四波小兵，共 250 个单位；普通剑圣从 `(10000, 11000)` 开始，预先检查左右各 450 单位的移动走廊畅通。预热一秒后采集约十秒，交替按左右方向键。WebSocket 收发各延后 150 毫秒，模拟 300 毫秒往返。没有更改英雄属性、AI 难度或开启无敌；对照与修复后玩家均保持完整的 560 生命，每一采样帧均存活，全部真实命令成功。

旧代码从 `f49c39428ae12d088a1ed41031731ecaa0fd9692` 的独立 checkout 加载。修复后网页由 `dist` 生产构建提供，内容版本为 `04125562f6ef4fa6159ba0076f4727474f6608bf4eb2e23dbbf68d0bf6221027`。两次报告均记录相同的十名英雄和 250 个单位。

| 指标 | 旧代码 | 修复后生产构建 |
| --- | ---: | ---: |
| 首个可见移动 | 583.5 ms | 58.1 ms |
| 人物位置连续变化 | 2.65 次/秒 | 59.73 次/秒 |
| Canvas 帧率 | 60.10 FPS | 59.92 FPS |
| 快照平均间隔 | 358.61 ms | 99.84 ms |
| 快照间隔 P95 | 369.6 ms | 136.1 ms |
| 每份解码后 JSON，平均 | 278.4 KB | 13.3 KB |
| 解码后 JSON 总量 | 764.2 KB/秒 | 133.2 KB/秒 |
| 压缩 WebSocket 实际写出量 | 70.3 KB/秒 | 40.7 KB/秒 |
| 服务端模拟一步，中位 | 6.18 ms | 5.69 ms |
| 实际命令 ACK，中位 | 329.9 ms | 330.3 ms |

KB 按 1000 字节计。JSON 字节数使用 UTF-8 编码；压缩写出量采集服务端 TCP socket 的 bytesWritten，含 WebSocket 帧和控制回复，不含 TLS/IP 开销。增加同步频率后，压缩写出量仍减少约 42%。首个移动受输入与快照相位影响，此表采用相同安全区域的最终对照。

逐帧额外记录当前输入方向，统计方向不变时位移投影小于 -0.05 单位的反向帧。单纯的 80 毫秒校正时间在十秒复测中产生 51 帧回拉，单帧最大 7.36 单位；限制行走中的校正速度后，本次生产构建为 **0 帧回拉**。单元测试同时检查水平、垂直与对角移动，要求每帧持续向输入方向前进，且显示误差收敛。

本机移动反馈改善，服务器 ACK 仍承担实际网络往返。模拟不包含丢包、带宽限速和生产反向代理开销；结果描述这次九 AI 场景，不作为所有设备和网络的帧率保证。

报告与截图：`artifacts/coop-baseline-safe-performance.{json,png}`、`artifacts/coop-release-performance.{json,png}`；最终日志为 `artifacts/coop-release-performance.log`，逐帧原始数据为 `artifacts/coop-release-samples.json`。复现入口：

```powershell
git worktree add --detach artifacts/coop-baseline-source f49c394
node scripts/profile-coop.mjs baseline-safe --mature --source artifacts/coop-baseline-source
npm run build
node scripts/profile-coop.mjs release --mature --root dist --check
```

`npm run test:coop-performance` 为自动回归入口；可附加 `-- --root dist` 使用生产构建。检查九个 AI、至少 200 个单位、首个移动先于网络往返、位置随渲染连续变化、没有反向回拉、快照不被整次 RTT 阻塞，以及玩家存活、真正 ACK 和浏览器错误。已接入 GitHub Actions。

第一次 Actions（提交 `95075e6`，运行 `43546003010`）的性能检查未通过：旧起点 `(10400, 10400)` 靠近敌方中路一塔，推进更快的 CI 中剑圣被敌方英雄击杀，随后六条移动命令返回“阵亡期间无法操作”。首个移动 31.5 ms、位置变化 51.22 次/秒、快照平均间隔 100.22 ms 均已达到原阈值，但未发布镜像或部署。修正仅把测试起点移到上述安全走廊，并增加生命、失败原因和逐帧回拉检查；九个 AI、250 个单位和原性能阈值均保留。另以 1.2 倍模拟推进诊断确认新起点维持完整生命、零失败命令。

## 规则、浏览器与构建验证

最终 `npm test`：**642 项，641 通过，1 跳过，0 失败**。跳过项为本机缺少 Docker Compose 的既有检查，容器检查由 GitHub Actions 完成。日志为 `artifacts/coop-npm-test-release.log`，对应最终服务器定时与前端代码。

新增规则回归覆盖增量还原每个公共字段、永久状态时间、实体增删与顺序、四份在途上限、ACK/发送完成两种顺序、旧协议、终局、换房、真实 WebSocket 重连、延迟模拟周期，以及即时移动、停止/反向输入、碰撞、拒绝回滚、控制/死亡/传送、断线限制。`NetworkGame.step()` 和权威状态仍保持原值。

以下 Playwright 检查在最终构建后再次全部通过，日志为 `artifacts/coop-release-{检查名}.log`：

| 检查名 | 入口 | 覆盖 |
| --- | --- | --- |
| coop | `tests/browser-coop.mjs` | 五个独立客户端、移动、购买、学习、技能同步、菜单、刷新重连、退出和移动尺寸 |
| ai-room | `tests/browser-ai-room.mjs` | 单/双真人 AI 补位、关闭补位、重连、双击购买与四种尺寸 |
| matchmaking | `tests/browser-matchmaking.mjs` | 真人队列、取消、自动开局、独立操作与恢复原英雄 |
| illusion-coop | `tests/browser-illusion-coop.mjs` | 幻象独立控制、越权拒绝、自动战斗、强弱增益快照 |
| coop-review | `tests/browser-coop-review.mjs` | 信使真正 ACK、重连菜单退出、旧倒计时清理 |
| collision | `tests/browser-collision.mjs` | 单位脚印、阻挡、绕行、英雄/AI/小兵和建筑 |
| shop-effects | `tests/browser-shop-effects.mjs` | 完整装备说明、狂战斧分裂、268 件目录、购买手势与多尺寸 |
| release-cache | `tests/browser-release-cache.mjs` | 保留旧模块缓存后的生产刷新、九个 AI 推进 |

除可注入战斗状态的幻象自建服务外，其余常规浏览器流程指向 `http://127.0.0.1:5199` 的生产构建；缓存检查另建代理与生产构建服务。`npm run test:multiplayer-smoke -- http://127.0.0.1:5199` 同样通过真实 HTTP/WebSocket 的五席位、权威操作、技能/装备同步与保留身份重连。

- `npm run build`：通过，内容版本见上。
- `npm run check:build`：通过，**62 个 JavaScript 模块、326 个本地资源引用**。
- `git diff --check`：通过。

构建日志为 `artifacts/coop-build-release.log` 和 `artifacts/coop-check-build-release.log`，传输冒烟日志为 `artifacts/coop-release-transport-smoke.log`。推送后按实际提交检查 Actions 的验证、GHCR 发布和服务器部署；以部署步骤及公网版本/协议实测确认上线，镜像发布本身不表示服务器更新。
