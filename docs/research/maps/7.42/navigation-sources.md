# 7.42 原始导航与地图外观来源

2026-11-22 从已安装 Valve 客户端 build **26825343**、Client/Server **6989** 提取原始地图文件。2026-11-24 核对当前 build **26880867**、Client/Server **6993**、SourceRevision **11269454**：地图 VPK 的 SHA-256 仍为 `7fc24ff13fcbe6840e5b9d76beb23f681368ecd2aa8b32a1e31e3cda959bd304`，导航与实体资料未变。原始提取日期和后续核验版本分别记录在 `terrain-sources.json`。

`raw/maps/dota.gnv` 为原始 104,992 字节文件，SHA-256 `5451e230fb49372a3dde42588cc3a330caaad8ceef280d0c4093ae73cae64588`。32 字节小端头为 `<Ifffiiii>`：signature `0xFADEBEAD`、edge 64、offset 32/32、width 320、height 328、min -160/-168；之后恰好是 104,960 个标志字节。格式参照 [ValveResourceFormat GridNavFile](https://github.com/ValveResourceFormat/ValveResourceFormat/blob/5977db6fb057d69b96b4d14d8bcc4827926e415b/ValveResourceFormat/MapFormats/GridNavFile.cs)，并以提取时客户端原生函数核对。

| 标志 | 原始格数 | 处理 |
| --- | --- | --- |
| Traversable / 1 | 58,965 | 反转为运行时阻挡值 |
| Blocked / 2 | 0 | 动态阻挡和其他标志单独维护 |
| HeroBlocking / 4 | 38,606 | 不混入地形 Traversable 导出 |
| CreatureBlocking / 8 | 32 | 原始字节保留，未新增例外规则 |
| WardBlocking / 16 | 45,812 | 原始字节保留，未新增例外规则 |

提取时 `GridPosToWorldCenterX/Y` 原生方法是 `index × edge + offset`，`IsTraversable` 只检测 bit 0。中心范围 Source X `[-10208,10208]`、Y `[-10720,10208]`。游戏继续使用 `gameX=sourceX+10464`、`gameY=10400-sourceY`。对于原有 327 × 327、原点零的游戏采样，原始索引正好为 `nativeColumn=gameColumn-4`、`nativeRow=330-gameRow`，没有估计或插值；越出原始格的 3,249 个采样设为阻挡。全部 58,965 个原始可通行格均保留，输出 47,964 个阻挡格。

`generate-map-742.mjs` 调用 `generate-map-terrain-742.mjs` 校验原始文件哈希和结构，重建导航；不改变世界尺寸、实体 ID、A*、树木/建筑/单位动态碰撞层或缓存数组大小。

基地位置同步由最新泉水建筑派生。旧实体更新流程漏写 `BASES` 的问题已经修正，避免夜魇治疗/商店中心继续使用旧坐标。

原始 `dota.vhcg` 和 `dota.trm` 分开留存。原生查询核对表明 `GetGroundHeight(nil)` 的 mask 为 `0x3021`，地面取第一浮点层，水面单独保存，不能简单取二者最大值。所有可通行格都有有效地面高度。树的 authored Z 在部分点与地面查询不同，不能用树坐标替代高度导出。本次未增加未经消费验证的运行时高度数组，也未称为完整连续碰撞或视野复刻。

客户端确有 1024 × 1024 原生 overview 图，`decoded/dota-overview.png` 来自 `materials/overviews/dota_psd.vtex_c`。本机现役材质引用链明确指向 512 × 512 TGA；1024 PSD 为同一客户端提供的高分辨率资源，其明确材质引用未证实。两个 `dota_minimap_boundary` 实体与 overview 配置共同给出 Source ±9472，游戏绘图范围为 `{x:992,y:928,width:18944,height:18944}`。

用户明确选择**保留现有高清实景图，先使用 7.42 新导航**。因此 `imageMode=historical`，当前 `MAP_IMAGE` 和 7.41 JPG 原始字节完全保持；原生图只留在来源目录，不替换游戏外观。地图图片属于 Valve，保留既有素材归属。离散采样、当前图像选择和二维玩法边界均不等同于三维客户端完全等价。
