# Simulation implementation

Implemented `src/engine.js` as a deterministic, DOM-free ES module following `engine-contract.md`. It provides ten heroes, twelve towers, two Ancients, three waypoint lanes, 18-second waves, automatic attacks, all twelve hero abilities, bots, item purchases, income, last hits, nearby experience, levels, deaths, respawns, recall, fountains, protection rules and victory.

The spatial grid uses 220-pixel cells; simulation subdivides elapsed time into steps of at most 0.05 seconds. No random browser state is used. A seeded generator only varies bot decision timing. Persistent buildings and heroes remain available for rendering; dead creeps expire after 1.1 seconds. Effects expire automatically and are capped at 250.

No breaking interface changes. Optional entity fields include `armor`, `attackInterval`, `attackFlash`, `destination`, `explicitTarget`, `pathIndex`, `retreating`, `deathTime`, `lastDamagers`, `aiTimer` and `auraTimer`. Buffs additionally include `slowUntil`. Visual effects use the specified `tx`, `ty`, `radius`, `life`, `maxLife`, `color` and `team` fields.

## Validation

- Wrote behavior tests first and observed `ERR_MODULE_NOT_FOUND` while the engine was absent.
- `node --test tests/engine.test.mjs`: **15 passed, 0 failed** (latest run about 4 seconds).
- Tests cover deterministic initialization, click/keyboard movement, pause, waves, spell cost/cooldowns/damage, every hero's defensive/mobility/ultimate abilities, item upgrades/capacity, protection/victory, recall/cancellation, death/respawn, last-hit rewards/XP, bot combat, difficulty and an entire unattended match.
- Reviewer regression: Crystal Maiden's freeze originally allowed an affected creep to move 77 pixels in 0.5 seconds. Added per-creep buff state and a stun gate for creep movement/attacks; the regression failed before the fix and now verifies freeze, attack suppression, expiry and nova movement reduction. A related test verifies freeze and slow on enemy heroes.
- Before the final fountain defense adjustment, normal unattended seed 1/42/99 matches ended naturally in 565.9/447.95/580.75 seconds; easy seed42 in 552.15 seconds and hard in 442.45 seconds. All entity coordinates and health values remained finite. The final test rechecks natural objective destruction after the adjustment.

## Gameplay choices and limits

- Enemy stats scale to 83%/102%/118% for easy/normal/hard; player stats stay identical.
- Towers have 6000/7500 HP, Ancients 12000 HP and buildings have 12 armor. Creeps deal 65% damage to buildings. Wave stats grow 3.5% per wave so inactive matches finish.
- Bots follow their assigned lane, fight local threats, use skills, purchase equipment, retreat to their fountain, then return to the lane. They do not coordinate team-wide rotations.
- Terrain is decorative; units can overlap and walk through it as permitted by the design. Damage resolves immediately; ranged projectiles are cosmetic.
- An inactive player generally loses because the match is effectively four active allied heroes against five enemy heroes. Active player combat and pushes determine the actual match duration.
