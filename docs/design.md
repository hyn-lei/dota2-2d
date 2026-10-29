# Ancient Front — Dota 2 inspired 2D MOBA

User request: design and implement a Dota 2 style 2D browser game in this folder. User accepted the recommended single-player bot direction.

## Design

A polished Chinese-language desktop-first game with a dramatic dark fantasy lobby, five selectable heroes (Juggernaut, Crystal Maiden, Windranger, Axe, Kunkka), an animated battlefield preview, and a complete 5v5 bot match. Canvas 2D renders a hand-built top-down battlefield with three lanes, a diagonal river, forest, towers, bases, units and effects. HTML provides an accessible HUD, menus, tooltips and shop. Mouse is primary; arrow keys, QWER, B, Space and Escape provide shortcuts. Arrow movement reserves W for the second ability. Small screens receive a compact layout and pointer controls.

The playable loop is hero choice, farming and combat, leveling and items, destroying towers, then destroying the enemy Ancient. Two towers per team per lane, 18-second waves, accelerated economy and respawns keep matches short. Outer towers protect the inner tower in that lane; any completely cleared lane opens the Ancient. Last hits grant gold; nearby kills grant experience. Bot heroes follow lanes, fight, use skills, retreat and respawn. A healing fountain and interrupted 3-second recall allow recovery.

Choices made by implementer: local offline simulation rather than multiplayer networking; native Canvas + ES modules rather than a large game engine; deterministic vector terrain and units rather than a tile asset dependency. Hero presentation images are downloaded from Valve's public Dota CDN, attributed in README. Gameplay sprites are original procedural drawings. This is a fan prototype, not a complete reproduction or official Dota release. Denies, fog of war, warding, jungle camps, Roshan, courier and multiplayer are outside this first version.

## Presentation

Charcoal, parchment white, antique gold and vermilion; serif display lettering and restrained sans-serif UI. Full-width lobby with left-side hero information and oversized hero artwork over a living forest scene. Bottom hero roster and a strong start button. Game HUD uses readable bars, skill cooldowns, gold, inventory, minimap, tower objective and event feed. Modal instructions, settings and match results are functional.

## Verification

Node simulation tests cover match initialization, movement, wave spawning, skills and costs, equipment, tower protection, Ancient victory, recall interruption, death/respawn and pause. Browser checks cover lobby selection, match launch, movement, abilities, shop, pause/resume, restart, viewport overflow and console errors. Use actual screenshots to inspect both lobby and battlefield.


