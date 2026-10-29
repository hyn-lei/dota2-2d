# Dota 2 map data provenance and coordinate contract

Verified on **2026-10-24**. Gameplay target: **7.41f**. Geometry snapshot: **7.41**.

The implementation uses actual exported entity coordinates, lane paths, neutral spawn triggers, tree positions and traversal samples. It does not invent a symmetric layout. The available map export is not sufficient to certify that every collision cell is identical to the current 7.41f game binary.

## Current version and changes since the geometry export

Valve's [patch list JSON](https://www.dota2.com/datafeed/patchnoteslist?language=english) ends at 7.41f, released September 15, 2026. The [official 7.41f announcement](https://www.dota2.com/newsentry/677383425371407609?l=english) also explicitly mentions a geometry fix near the upper Roshan cave. Therefore the April geometry dump cannot honestly be described as a verified exact 7.41f navigation mesh.

The official datafeed was fetched for [7.41a](https://www.dota2.com/datafeed/patchnotes?version=7.41a&language=english), [7.41b](https://www.dota2.com/datafeed/patchnotes?version=7.41b&language=english), [7.41c](https://www.dota2.com/datafeed/patchnotes?version=7.41c&language=english), [7.41d](https://www.dota2.com/datafeed/patchnotes?version=7.41d&language=english), [7.41e](https://www.dota2.com/datafeed/patchnotes?version=7.41e&language=english), and [7.41f](https://www.dota2.com/datafeed/patchnotes?version=7.41f&language=english). Local snapshots are `official-patch-7.41[a-f].json`.

Those gameplay notes do not list tower, barracks or neutral camp position changes. Relevant map-related mechanics include Roshan pit vision in 7.41c, Dire fountain aura and teleport destination adjustments in 7.41d, and gate/Tormentor behavior in 7.41e. Absence from patch notes does not prove absence of unlisted geometry fixes. The [official updates page](https://www.dota2.com/news/updates/16749/) also mentions a 7.41a fix to a trapped teleport destination near Dire fountain; the April 3 export postdates that announcement.

## Primary data sources

### Entity and navigation extraction

- Original extractor: [leamare/dota-map-coordinates](https://github.com/leamare/dota-map-coordinates), maintained from devilesk's tool.
- Original [7.41 VConsole log](https://raw.githubusercontent.com/leamare/dota-map-coordinates/master/logs/741_data.log), downloaded as `extractor-741_data.log`. It contains `mapdata.json`, `worlddata.json`, `gridnavdata.json`, and `elevationdata.json` sections.
- [Extraction Lua](https://github.com/leamare/dota-map-coordinates/blob/master/game/dota_addons/dota-map-coordinates/scripts/vscripts/addon_game_mode.lua), downloaded as `extractor-addon_game_mode.lua`. Building coordinates are returned by `GetOrigin()` and rounded to whole units; names and teams are also exported. Thus these are original entity data, with rounding precision approximately one world unit, rather than positions estimated from a picture.
- Processed [7.41 mapdata](https://raw.githubusercontent.com/leamare/dota-interactive-map/master/assets/data/741/mapdata.json), downloaded as `leamare-mapdata.json`.
- The mapdata was added by [commit bc73d0e](https://github.com/leamare/dota-interactive-map/commit/bc73d0e3ea6a421d43780a017aa92e0288c939b5), dated 2026-04-03 and labelled 7.41.
- The interactive map's [introduction](https://github.com/leamare/dota-interactive-map/blob/master/docs/01-intro.md) explicitly identifies that extractor as its data source.

Validated counts: **22 towers, 12 barracks, 2 Ancients, 2 fountains, 14 filler buildings, 28 neutral camps, and 2,475 trees**. Building names were read from the original log, not inferred from a point's nearest lane. For example, `dota_goodguys_tower1_top` and `good_rax_melee_mid` identify team, lane, tier, and barracks type directly.

### Camp cross-check

- [gem map annotations documentation](https://whanyu1212.github.io/gem-dota/experimental/map-annotations).
- [gem camp catalog](https://github.com/whanyu1212/gem-dota/blob/main/src/gem/data/camp_zones.json), downloaded as `camp_zones.json`.
- Its centers were extracted from `CDOTA_NeutralSpawner` replay entities. The repository reports agreement across nine local 7.41 replay fixtures.
- **All 28 centers were independently compared here with leamare's coordinates and matched exactly after subtracting 16,384 from both gem axes.** The check is enforced by `generate-map-data.mjs`.
- Use gem's `type` for the 7.41 camp type, including flooded camps. Use leamare's `trigger_multiple` polygon for the actual spawn-block rectangle. gem's ellipse is an analysis region, not a Valve spawn-block boundary.
- Each geographical side has 14 camps: 2 small, 5 medium, 3 large, 1 ancient, 1 flooded-small, 2 flooded-medium. The six flooded camps evolve over time. gem documents a game-log ownership exception for camp 22; the exported `ownerTeam` follows geography, as its catalog does.

### Terrain image and calibration

- [gem map asset](https://github.com/whanyu1212/gem-dota/blob/main/assets/maps/Game_map_7.41.jpg), downloaded unchanged to `Game_map_7.41.jpg` and copied unchanged to `assets/map-7.41.jpg`.
- [Image provenance](https://github.com/whanyu1212/gem-dota/blob/main/assets/maps/README.md): source is the [Liquipedia 7.41 map file](https://liquipedia.net/dota2/File:Game_map_7.41.jpg). The repository resized that image to 8,878 × 8,356 pixels. It reports no generative editing or reconstructed contents.
- Downloaded SHA-256 verified as `9fb56fc131acc161fb904f6c7189c6f37c57705bac752ccf9a47e01b1b079764`, matching its provenance file.
- [Projection implementation](https://github.com/whanyu1212/gem-dota/blob/main/src/gem/catalog/map.py), downloaded as `map.py`.
- [Nine-landmark calibration test](https://github.com/whanyu1212/gem-dota/blob/main/tests/test_map_projection.py), downloaded as `test_map_projection.py`. Landmarks come from replay 8974053011. The reported fit is 9 image pixels RMS and at most about 29 pixels, approximately 60–66 world units.

This image has the correct actual terrain layout, but its fitted pixel projection is approximate. Do not describe its calibration as pixel-perfect or a directly extracted 7.41f mesh.

## Coordinate contract

`src/map-data.js` uses an axis-aligned view with Y increasing downward and **one game-world unit equal to one Source 2 unit**. No nonuniform scaling is applied to the gameplay map.

```js
gameX = sourceX + 10464;
gameY = 10400 - sourceY;
sourceX = gameX - 10464;
sourceY = 10400 - gameY;
```

The extraction world extent is Source X/Y `[-10464, 10400]`. `WORLD.width` and `WORLD.height` are both 20,864. This bounding square includes nonplayable margins; it is not a declaration that every point is walkable. Both conversion functions are exported.

gem replay coordinates use an additional positive bias:

```js
gemX = sourceX + 16384;
gemY = sourceY + 16384;
```

For gem's 8,878 × 8,356 image:

```js
pixelX = 261 + (gemX - 7487) / 18322 * 8356;
pixelY = (26015 - gemY) / 18322 * 8356;
```

The full image's draw rectangle, in this app's game-world coordinates, is exported as both `MAP_IMAGE` fields and `MAP_IMAGE.worldRect`:

```js
{ x: 994.7115844901873, y: 769,
  width: 19466.576831019625, height: 18322 }
```

Draw the complete JPG into this rectangle. The 261-pixel crop offset is already represented by the rectangle's X. Do not apply a second crop or stretch the image over the complete 20,864-square navigation extent. gem's square viewport used the central 8,356 pixels, but this app may show the full image. Clip to the camera viewport in the normal renderer, not to a newly guessed terrain outline.

## Lane and building exports

`LANE_IDS` is `['top', 'mid', 'bot']`, corresponding to lane IDs 0, 1, 2. Teams are 0=Radiant and 1=Dire; the original Source teams are 2 and 3.

- `BASES[team]` is the exact fountain coordinate.
- `BUILDING_LAYOUT` contains 52 buildings, with exact `id`, `kind`, `team`, `sourceTeam`, `sourceX`, `sourceY`, `lane`, `laneId`, `tier`, and `barracksType`. The original Source name is preserved as `id`.
- Tower tiers are 1–4. Each team has three T1, three T2, three T3 and two T4. T4 towers have `lane: null`; their original `top`/`bot` name suffix is preserved separately as `sourceLaneTag`.
- Barracks are `melee` or `ranged`, one of each per team per lane. They are separate buildings, not a merged lane building.
- Numeric building stats are the extraction snapshot's stats, not independently updated 7.41f combat data.
- `TEAM_LANES[team][lane]` holds six distinct actual routes, one per team and lane. Each starts with its exact spawn point followed by its exported path corners. Dire routes must not be made by reversing Radiant routes.
- `LANES` aliases `TEAM_LANES[0]` for existing renderer compatibility; it is not sufficient by itself for Dire creep movement.
- `LANE_SPAWNS[team][lane]` is also exported separately.

Lane sources are [path_corner.json](https://github.com/leamare/dota-interactive-map/blob/master/assets/data/741/path_corner.json) and [npc_dota_spawner.json](https://github.com/leamare/dota-interactive-map/blob/master/assets/data/741/npc_dota_spawner.json). Names are `npc_dota_spawner_good_top/mid/bot` and `npc_dota_spawner_bad_top/mid/bot`. These are route control points; straight line movement between them still needs terrain-aware local pathfinding.

`MAP_OBJECTIVES` additionally exports exact positions for outposts, watchers, gates, wisdom shrines, lotus pools, Roshan points, Tormentor points, runes, and shops. `RIVER_OUTLINE` is a traced analysis polygon from gem's actual image, rather than game collision geometry.

## Navigation data

`src/nav-data.js` exports `NAV_GRID` synchronously:

```js
{ cellSize: 64, cols: 327, rows: 327,
  origin: { x: 0, y: 0 }, originX: 0, originY: 0,
  terrainOnly: true, geometryVersion: '7.41',
  blockedCount: 47323, blocked: '...' }
```

`blocked` has 106,929 characters in row-major order, Y downward. `'1'` means the sampled terrain is not traversable; `'0'` means traversable. Cell sample centers are `(column * 64, row * 64)` in game coordinates. Map a point to its nearest sample with `Math.round(x / 64)`, `Math.round(y / 64)`. Reject indices outside the grid. The original blocked points were converted without deleting or adding any cells; all 47,323 were retained.

The extraction code uses `GridNav:IsTraversable` only. It does not query `GridNav:IsBlocked`, units or live tree state. **Overlay tree and building collision separately.** `TREES` gives all 2,475 original positions and elevation; tree removal should update that overlay rather than edit the static terrain string. The 64-unit sample is not a continuous collision mesh, so agent hull clearance and diagonal-corner checking belong in pathfinding.

For reference, `leamare-map_data_741.png` contains five adjacent 327 × 327 panels in this order: terrain elevation, tree elevation, terrain traversal, fog blockers, no-ward zones. `extractor-process_data.py` documents the layout. The module uses the raw log rather than trying to infer traversal from terrain colors.

## Reproduction and validation

Run `node docs/research/generate-map-data.mjs` to regenerate the two source modules, building reference JSON and the unchanged asset copy. It validates all 28 camp matches and required building counts. `map-validation.json` records output counts and the image rectangle.

Additional local checks confirmed unique building names, in-bounds buildings/camps, six nonempty lane routes, the full navigation string length, and the image SHA-256. These validate transcription and projection consistency; they are not a fresh extraction from an installed 7.41f client.

For a strict latest-binary collision claim, rerun the original extractor in the current Dota 2 Workshop Tools/client and replace the dump. The remaining known version risk is small geometry fixes such as the upper Roshan cave; its cells cannot safely be guessed from the announcement.

## Attribution

The leamare/devilesk software is ISC licensed; its notice is saved as `leamare-LICENSE`. gem code is MIT licensed. The terrain screenshot is **copyright Valve Corporation**; the source repository explicitly does not relicense the image as MIT. Preserve the image's original provenance. Community data extraction and calibration are attributed to leamare, devilesk and whanyu1212.
