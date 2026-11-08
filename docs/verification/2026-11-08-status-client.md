# 客户端状态栏位置与显示对照

本次再次读取安装的 Valve 客户端 Steam build **26466928**，解码 `hud_reborn.vcss_c` 与 `dota_hud_buff.vcss_c`，保留状态相关规则和来源 SHA-256 到 `docs/research/hud/status/`。可重现提取：

```powershell
python scripts/extract-client-status.py --vpk "E:/SteamLibrary/steamapps/common/dota 2 beta/game/dota/pak01_dir.vpk" --decoder artifacts/vrf/Source2Viewer-CLI.exe --retrieved 2026-11-08
```

核对后的桌面行为：

| 客户端规则 | 本次实现 |
| --- | --- |
| `#buffs` 左边缘位于屏幕 50%，向右流动；`#debuffs` 右边缘位于 50%，向左流动 | 同一基线从中心向两侧排列，纠正此前上下两排 |
| `margin-bottom:151px`，有加点或额外技能时上移 32px | 对应桌面位置，自有单位有加点/额外技能时移到 183px |
| `DOTABuff` 为 40×40，左右各 2px；`QueryUnit` 为 36×36 | 自有单位与查询其他单位分别采用 40px / 36px |
| `BuffImage` 四边 2px；绿色 `#8bdd4f`，减益 `#e43c10` | 使用对应间距、黑色图像边缘及计时环颜色 |
| 不可驱散状态使用较深颜色并提高圆环亮度 | 从真实状态的 `undispellable` 字段投影，不改动战斗规则 |
| `StackCount` 中央对齐、20px 等宽数字 | 层数在图标中央显示，包括实际的一层计数 |
| `CircularDuration`，没有图标底部秒数标签 | 图标用计时环，具体剩余时间仍可从悬停/键盘说明读取 |

运行时样式独立位于 `src/status-client.css`。状态显示保留真实来源、寿命、层数、驱散、死亡和共享 HUD；手机继续使用可操作的适配布局。多状态溢出时向上换行，避免网页横向溢出。

本次 HUD 浏览器检查验证左右方向、同基线、40px 图标、中央层数、图标秒数隐藏、1920/1366/390 宽度及来源消失。规则显示测试补充单层计数。当前单位栏、单位技能栏、临时魔法及装备弹道浏览器检查继续通过。Linux 发布检查曾在鱼叉测试中因同步推进模拟未等待绘制而失败；测试现在先等待实际 Canvas 绘制，再推进命中，保留绘制断言。

本次发布前全量 `npm test -- --test-concurrency=1` 共 500 项，499 通过，1 项 Docker Compose 环境检查跳过。HUD 六组、所选单位六组、单位技能七组、装备弹道三组、临时魔法/幻象状态两组浏览器检查通过；构建与静态检查通过（54 模块、180 本地引用）。规则日志保存在本地 `artifacts/status-client-rules.log`。

截图保存在本地 `artifacts/hud-game-1920.png`、`hud-game-1366.png`、`hud-game-390.png`。这次明确对照的是客户端 CSS 规则，仍不是默认客户端全界面逐像素实测认证；Source 2 动态头像、粒子、全部字体和材质的边界见 [HUD 来源](../hud-status-sources.md)。
