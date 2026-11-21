# 本地 AI 对局卡顿排查

排查源码版本为 `c90a9eca9694103397b24321d3900dc996d6c233`。本机为 i5-6500、GTX 1060 3GB，桌面 3840×2160、60Hz，Chrome 显示缩放 150%。`127.0.0.1:5184` 返回的 main、engine、renderer 与工作区源码 SHA-256 一致。检查时本地服务只有监听连接，没有活动 WebSocket 对局。

本地浏览器存档为卓尔游侠、标准难度、约 13.7 秒、99 个单位，存档约 128KB。在独立浏览器会话恢复该存档，通过正常“继续上次对局”入口测量，原浏览器存档保留。两个对照使用同一安装版本的 Chrome、2560×1340 CSS 视口、DPR 1.5、默认缩放 .45，战场 Canvas 为 3840×2010。CPU 采样和帧统计每个场景约五秒。

## 绘制对照

显卡组使用 `--enable-gpu`，CDP 报告 GTX 1060，Canvas、compositing 和 rasterization 均启用。软件组使用 `--disable-gpu`，CDP 报告软件 Canvas 和软件 compositing。

| 场景 | 软件绘制 FPS | 显卡加速 FPS | 软件 render 平均 | 加速 render 平均 |
| --- | ---: | ---: | ---: | ---: |
| 从实际存档继续，99 个单位 | 12.0 | 59.2 | 34.21ms | 0.61ms |
| 180 秒布置营地与四波兵线 | 11.0 | 58.3 | 35.56ms | 0.64ms |
| 暂停同一成熟场景 | 12.3 | 59.6 | 35.37ms | 0.75ms |
| 暂停后只绘制视口对应的地图区域 | 12.3 | 59.8 | 35.60ms | 0.77ms |
| 暂停后跳过地形绘制 | 21.0 | 59.0 | 0.62ms | 0.63ms |

成熟场景采样结束时软件组与加速组各有 277 个单位。两组从相同存档起点按实际帧推进，因此采样结束的模拟时间有差异。暂停后的对照在各自冻结的局面上只替换绘制行为。各组均无浏览器脚本错误。

软件组在暂停场景将 DPR 从 1.5 调至 1，Canvas 从 3840×2010 降为 2560×1340，FPS 提高到 26.8，render 平均降为 16.49ms。独立的 1366×768、DPR 1 原有性能脚本样本约 54 FPS，272 个单位，step 平均 6.16ms、render 平均 5.32ms。

严重卡顿已在 4K 软件绘制条件下复现，主要耗时落在地形绘制及大画布的绘制、合成链路。暂停 AI 后仍约 12 FPS，裁剪地图 drawImage 的源区域也没有改善。跳过地形后 render 大幅降低，软件画布的整体帧率仍受像素量影响。

相关代码为 `src/renderer.js` 的 `resize()`、`render()`、`terrainImageForScale()`。画布按 CSS 尺寸乘 DPR 分配，每帧清屏、绘制地图和全屏渐变。默认 .45 缩放、DPR 1.5 使用 8878×8356 原生地图位图，单份 RGBA 像素约 283MiB。`src/main.js` 的 `tick()` 将模拟 dt 限制在 .05 秒，持续 12 FPS 时每秒墙钟最多推进约 .6 秒模拟时间，画面掉帧同时表现为对局慢速推进。

## 模拟与存档

实际存档在加速 Chrome 中继续时 step 平均 2.39ms，最大 6.2ms。成熟场景平均 6.43ms，最大 33.6ms。固定种子 42 的自然标准对局另在 Node 中运行到 600 秒，60 秒以后单位数保持 202–214，各三十秒区间的 step 平均 4.40–6.85ms。这次样本的单位数和模拟成本没有随时间持续增长。

`src/main.js` 每两秒在动画回调内调用 `checkpointMatch()`。`src/game-save.js` 的 `serializeMatch()` 完整编码状态，再解码、恢复引用并校验，最后 `storeMatch()` 同步写入 localStorage。浏览器内各十次直接测量，实际开局存档的完整保存平均 6.21ms、最大 7.3ms，281 个单位的保存平均 12.62ms、最大 14.5ms。这部分工作会叠加在保存当帧，增加周期性掉帧的可能。

Node 自然对局中的保存测量中位数为 40.54ms，范围 35.07–84.40ms。浏览器实际开销采用上面的浏览器内测量，两种执行环境分别记录。

## 当前确认范围

当前 Chrome 配置中的 `hardware_acceleration_mode_previous` 为 true。该字段描述加速配置记录，实际用户标签页的 Canvas 加速状态仍待读取。独立加速会话恢复同一存档约 59 FPS，因此尚不能把用户当前标签页的严重卡顿最终归因为软件绘制。需要出现问题的同一个 Chrome 中 `chrome://gpu` 的 Canvas 和 Compositing 状态完成确认。

原始 CPU profile、逐场景报告和浏览器存档保存在本地忽略目录 `artifacts/`。主要记录为 `ai-stutter-user-4k-gpu-report.json`、`ai-stutter-user-4k-chrome-software-report.json`、`ai-stutter-natural-simulation.json`、`ai-stutter-browser-save.json`，同前缀 cpuprofile 保存调用采样。临时诊断脚本亦位于 `artifacts/`。

初次排查记录已提交为 `67322b3`，该提交的 GitHub Actions 完成且结果为 success。

## 后续修复与验证

`src/renderer.js` 在正常 DPR 下开始绘制。大画布连续八帧绘制超过 20ms 后，将绘制预算设置为 150 万像素，下一帧开始时重新分配画布。每次窗口尺寸变化都重新计算密度并清空慢帧计数，较小视口可以恢复设备 DPR。回退预算随当前 Renderer 生命周期执行，新 Renderer 从设备 DPR 开始。

高负载回退会降低战场绘制分辨率。这个修复依据实际绘制耗时触发，回退后约 2560×1340 CSS 视口对应 1693×886 绘制像素。坐标转换继续使用 CSS 视口尺寸，真实鼠标点地验证中目标世界坐标与实际移动指令一致。

使用同一份本地存档、同一安装版本的 Chrome、同一 4K 视口重新测量，结果如下。

| 软件绘制场景 | 修复前 FPS | 修复后 FPS | 修复前 render | 修复后 render |
| --- | ---: | ---: | ---: | ---: |
| 实际开局存档 | 12.0 | 45.6 | 34.21ms | 8.21ms |
| 180 秒成熟场景 | 11.0 | 40.6 | 35.56ms | 7.51ms |

显卡加速复测开局 59.2 FPS、成熟场景 58.8 FPS，两者的 Canvas 均为 3840×2010。原始报告为 `artifacts/ai-stutter-fixed-user-4k-software-report.json` 和 `artifacts/ai-stutter-fixed-user-4k-gpu-report.json`。

`tests/browser-terrain.mjs` 新增大视口回归，可用 `node tests/browser-terrain.mjs --large-viewport-only` 单独运行，并接入原有地形浏览器检查。回归通过短时给 Canvas 绘制注入 25ms 延迟，在快速机器上也验证慢帧回退，恢复原始绘制方法后采集 FPS。成熟场景在已检查左右各 450 世界单位通路的区域交替按左右键，检查持续位移、存活状态、真实鼠标目标和窗口缩小时的清晰度恢复。

修复前该回归开局 12.58 FPS、移动 11.46 FPS，因低帧率断言失败。最终源码检查开局 49.06 FPS、成熟移动 38.73 FPS，约 150 万绘制像素、持续移动、真实鼠标指令及 800×600 视口恢复 DPR 1.5 均通过。地形完整浏览器检查的六组原有行为和新回归通过，十二组像素对照最大解码差异为 0。五项 `terrain-resolution.test.mjs` 检查通过。

生产构建前端版本为 `b32a2426b9228255bf73c9e695d23403f6fce215dbc480b45eaf6ac6d65b0db7`。构建与静态检查通过，编译 69 个 JS 模块、校验 371 个本地引用。生产构建的大视口回归开局 37.13 FPS、成熟移动 30.52 FPS，通过回退、持续位移、存活、真实鼠标指令和清晰度恢复检查。推送后按实际提交查询 GitHub Actions。
