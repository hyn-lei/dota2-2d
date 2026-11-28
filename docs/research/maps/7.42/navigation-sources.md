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

原始 `dota.vhcg` 与 `dota.trm` 分开留存。`dota.trm` 的树源记录只含 X/Y 与图层索引。原始提取 build 26825343 的 `server.dll` 中，`GetGroundHeight(pos,nil)` 经 RVA `0x19ae750 → 0x2500340 → 0x1c2ba60` 调用 `host.dll` 的 `CDotaMapUtils001` 地图查询（RVA `0x17a90`）。该路径传入内容掩码 `0x3021`，水面需要单独的 `0x8000`。宿主反序列化（`0xc8b10`）读取两个 float32 与一个细节标志。第一层由地面查询（`0xc8560`）读取，带标志的格内使用 5 × 5 细节补丁。独立的水面查询（`0xc8750`）读取第二层。2026-11-27 核对本机 7.42a build 26936712、Client/Server 6997、SourceRevision 11278692，地图 VPK SHA-256 仍与 7.42 提取版本一致。

`node docs/research/generate-map-height-742.mjs` 校验原始 VHCG 的 SHA-256、头部和记录结构，再以导航原有的 327 × 327 中心采样。每个进入细节补丁的采样坐标都恰好落在原始 32 单位的顶点。输出按行游程编码，保留原始 float32。共取得 90,456 个地面样本、14,168 个水面样本，58,965 个可通行中心均有地面值。使用独立 Python 解码逐格比对后，将两层以缺值 `-16384` 填入、按行序列化为小端 float32，SHA-256 分别为 `9798eccc9ab8994ac12e7ab8ddc585b70e8fa464cac2c814287feed6533d6113` 和 `9e89d6283fb60c8309bf5ca920b5c88b3091fc6b26178bef61d2ee526da2bbd2`。

运行时 `terrainHeightAt(point)` 和 `terrainWaterHeightAt(point)` 分别查询地面与水面，共用现有导航中心的取整。缺值和网格外查询返回 `null`。客户端在缺地面记录时可回退到实时物理追踪。任意坐标的连续插值、动态预制件覆盖和实时物理回退仍待客户端对照。部分树的作者 Z 与实际地面不同，例如 Source 坐标 `(-448,-8448)` 的树 Z 为 128，编译地面为 134，水面为 144。

| 位置 | 游戏 X/Y | Source X/Y | 地面 Z | 水面 Z |
| --- | --- | --- | ---: | ---: |
| 中路坡顶 | (9856, 9600) | (-608, 800) | 128 | — |
| 中路坡脚 | (9856, 9728) | (-608, 672) | 23.158203125 | 16 |
| 中路河床 | (9856, 9792) | (-608, 608) | 0 | 16 |
| 天辉泉水高台 | (3008, 17344) | (-7456, -6944) | 384 | — |

同一天在本机专用服务加载 `dota` 地图并通过 VScript 运行下列探针。上表四个位置与 `GetGroundHeight` 实时结果完全匹配，夜魇泉水高台也为 384。网格外的 Source `(10272,-352)` 返回 `-16384`，游戏 API 将它表示为缺值 `null`。中路河床通过原生 `GridNav:IsTraversable`，地面查询为 0，第二层的水面高度 16 仍取自编译数据。

```lua
local points = {{-608,800},{-608,672},{-608,608},{-7456,-6944},{7136,6560},{10272,-352}}
for _, p in ipairs(points) do
  local point = Vector(p[1], p[2], 0)
  print(p[1], p[2], GetGroundHeight(point, nil), GridNav:IsTraversable(point))
end
```

客户端确有 1024 × 1024 原生 overview 图，`decoded/dota-overview.png` 来自 `materials/overviews/dota_psd.vtex_c`。本机现役材质引用链明确指向 512 × 512 TGA；1024 PSD 为同一客户端提供的高分辨率资源，其明确材质引用未证实。两个 `dota_minimap_boundary` 实体与 overview 配置共同给出 Source ±9472，游戏绘图范围为 `{x:992,y:928,width:18944,height:18944}`。

用户明确选择**保留现有高清实景图，先使用 7.42 新导航**。因此 `imageMode=historical`，当前 `MAP_IMAGE` 和 7.41 JPG 原始字节完全保持；原生图只留在来源目录，不替换游戏外观。地图图片属于 Valve，保留既有素材归属。离散采样、当前图像选择和二维玩法边界均不等同于三维客户端完全等价。
