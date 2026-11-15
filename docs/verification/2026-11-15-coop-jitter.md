# 联机收包抖动、移动回拉与地图绘制验证

本轮继续处理公网联机时人物移动断续、转向后回拉的问题，并完成上次会话中断时尚未通过的普通延迟回归。现有原生 JavaScript / Canvas、英雄、地图与物品 ID 及 main → GHCR → Compose 发布方式继续沿用。

快照在途窗口由四份增至八份，每份仍需传输完成和客户端应用 ACK 才能释放。超额广播合并为最新状态；旧协议保留一份在途上限。新增真实时钟回归证明，700 毫秒确认往返下仍能按 100 毫秒周期发送。

自己的新移动指令从当前显示位置开始，停止时吸收合法显示偏移。预测预算依据 RTT 和最近二十次收包间隔，最近快照锚定一秒硬上限，估计单程回放最多 500 毫秒；超过上限的新输入仍提交服务器，不重启本地预测。其他单位先插值，再按已有速度短程外推，最多前推 600 毫秒。校正和外推检查地图边界、地形、单位脚印与完整路径。远端显示位置一起做碰撞检查；没有上次显示位置时，从权威锚点扫掠到候选位置，覆盖收到两份快照后才首次绘制的场景。

最后一项普通延迟失败表现为五帧小幅回拉，最大 4.74 单位。原因是快照重放恰好结束于新转向指令：实际还没走第一步，`unit.moving` 为 false，系统因而选择静止时的 80 毫秒校正。在确定性复现中，人物显示于 x=10030，已经选择左移，下一帧却向右显示于 x=10036.98。现在有效的键盘或点地移动意图也采用行走校正上限，初始校正速度最多为移速的一半，不提前推进模拟或修改权威快照。两种输入分别先失败再通过，证据为 `artifacts/resume-fresh-turn-red.log` 和 `artifacts/resume-coop-focused-green.log`。

地图沿用 8878 × 8356 原图与既有投影。共享资产保留原生解码位图，并按物理像素密度选择一个预先缩放的替代位图，最多缓存两种分辨率；替换时关闭旧替代位图。放大或恢复高像素密度视角立即使用原生细节，解码未完成或失败时采用更清晰的缓存或已加载原图。此处理避免反复绘制大型 JPEG 时出现的长帧，同时保留正常可玩视角的图像细节。实现及约束见[联机协议](../multiplayer-protocol.md)。

验证采用同一台机器、1366 × 768 Chromium、种子 42、同一十英雄阵容、单真人与九个 AI、252 个单位。从 180 秒成熟场景开始，剑圣位于 `(10000, 11000)`，左右各 450 单位走廊预先确认畅通；预热后交替按左右方向键约十秒。所有最终采样帧中玩家存活，生命保持 560，真实命令均成功，快照序号均按序送达。

旧版对照来自提交 `7add537382fe534bf60851c2657343420075c37f` 的独立源码副本，前端版本为 `a3a9e896b94389e923d2e6ac72d460e9c387337fa667b13be2ad58361f981feb`。最终生产构建及两档延迟报告共同记录前端版本：

```text
e77342a2bdb926ab41c72841b8e6f8530d1f96ae27e56f8102cd1e0f65f66f0a
```

| 指标 | 旧版，700ms 往返 + 350ms 抖动 | 最终构建，300ms 往返 | 最终构建，700ms 往返 + 350ms 抖动 |
| --- | ---: | ---: | ---: |
| 真实按键到首次可见移动 | 23.0ms | 50.2ms | 38.8ms |
| 持续输入时最长位置停顿 | 266.1ms | 0ms | 0ms |
| 输入方向不变时的回拉帧 | 30 | 0 | 0 |
| 单帧最大回拉 | 165.32 单位 | 0 | 0 |
| Canvas 帧率 | 59.22 FPS | 56.80 FPS | 55.49 FPS |
| 位置变化频率 | 55.59 次/秒 | 56.03 次/秒 | 55.01 次/秒 |
| 快照平均间隔 | 198.73ms | 99.36ms | 109.47ms |
| 快照间隔 P95 | 515.20ms | 152.60ms | 454.60ms |
| 实际命令 ACK 中位 | 732.90ms | 368.50ms | 774.40ms |
| 持续输入时最长绘制帧间隔 | 未采集 | 33.60ms | 41.60ms |
| 单次呈现与绘制最大耗时 | 26.00ms | 20.50ms | 27.60ms |

抖动夹具每二十五份快照增加一次 350 毫秒接收停顿，收发各增加半次 RTT，接收使用单一 FIFO 保持 WebSocket 顺序。首次响应从实际 keydown 的 `event.timeStamp` 起计，保留主线程输入排队时间。测试同时检查位置停顿与绘制帧间隔：位置持续变化不能单独证明没有绘制长帧。响应小于 150 毫秒、位置变化超过每秒 35 次、连续变化比例超过 0.8、持键帧间隔小于 150 毫秒、零回拉和真实 ACK 等检查均保留；抖动回归额外要求持键位置停顿小于 75 毫秒。

最终对照为 `artifacts/coop-jitter-before-final-performance.json`、`artifacts/coop-latency-upload-final-performance.json`、`artifacts/coop-jitter-upload-final-performance.json`，同名前缀的 `*-samples.json` 保留逐帧与收包记录。最终执行日志为 `artifacts/coop-latency-upload-final.log` 和 `artifacts/coop-jitter-upload-final.log`。本机数据覆盖这次成熟九 AI 场景和有序延迟注入，不包含带宽限速、丢包、TLS 与生产反向代理的额外开销；实际服务器确认仍受网络往返影响。

最终 `npm test` 为 **714 项，713 通过，1 跳过，0 失败**，日志 `artifacts/coop-jitter-upload-npm-test.log`。跳过项是本机缺少 Docker Compose 的既有检查，工作流在 Linux 上运行容器检查。集中网络、增量同步、背压与地形分辨率检查为 **50/50 通过**。只读代码审查未发现遗留阻塞问题。

最终构建通过 `npm run build` 和 `npm run check:build`，静态检查编译 **69 个 JavaScript 模块、检查 371 个本地引用**。构建后串行完成以下真实浏览器与传输检查，统一日志为 `artifacts/coop-jitter-upload-browser.log`：

| 入口 | 覆盖 |
| --- | --- |
| `scripts/smoke-browser.mjs` | 完整英雄选择、肖像、战场启动 |
| `scripts/smoke-multiplayer.mjs` | 五席位、权威操作、装备/技能同步与保留身份重连 |
| `tests/browser-terrain.mjs` | 原生位图、缩放缓存、原图像素、关闭替代位图、缺失/失败解码回退、桌面和移动尺寸 |
| `tests/browser-ai-room.mjs` | 单/双真人 AI 补位、关闭补位、重连、四种尺寸 |
| `tests/browser-coop.mjs` | 五个独立客户端、学习/购买/技能/移动、个人菜单、刷新重连与退出 |
| `tests/browser-coop-review.mjs` | 信使真实 ACK、重连菜单退出、旧倒计时清理 |
| `tests/browser-chen-coop.mjs` | 狂热者独立指令、成长、越权拒绝、死亡后恢复英雄控制 |
| `tests/browser-illusion-coop.mjs` | 幻象独立指令、越权拒绝、自动战斗与强弱增益快照 |
| `tests/browser-collision.mjs` | 双方出生、英雄/AI/小兵脚印、相位鞋、建筑与成组绕行 |
| `tests/browser-release-cache.mjs` | 保留旧模块缓存时刷新生产构建，九个 AI 继续推进 |

陈和幻象检查需要注入战斗场景，各自创建源码服务；其余常规流程指向上述 `dist` 构建，缓存检查另外创建生产代理。地形检查在三个摄像机位置和四种缩放下对照十二组图像，解码源的逐通道最大差异为 0；缩放 `.18` 及以上的正常可玩视角与原始 JPEG 差异也为 0。`.18 → .04 → .45` 高像素密度恢复立即复用原生位图，旧替代位图已经关闭。连续二十帧与新 Renderer 生命周期不增加解码次数，缓存保持两项。证据为 `artifacts/terrain-browser-report.json`、`artifacts/terrain-browser-pixels.json`、`artifacts/terrain-1366.png` 和 `artifacts/terrain-390.png`。

可用仓库入口复现核心检查，性能测量应串行运行：

```powershell
npm test
npm run build
npm run check:build
npm run test:coop-performance -- --root dist
npm run test:coop-jitter -- --root dist
npm run test:terrain
```

地形和抖动检查已加入同一发布工作流。上传后按本次提交 SHA 检查规则、浏览器、容器、GHCR 发布与 Compose 部署结果，并核对公网 `x-game-revision`、前端内容版本和真实 Origin/hello WebSocket 握手。镜像发布与服务器更新分别以各自步骤和公网证据确认。
