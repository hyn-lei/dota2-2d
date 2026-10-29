# Axe feature review

## Verdict

Approved for the bounded feature scope, subject to the owner's browser validation. No actionable new correctness defects were found. The implementation matches `docs/axe-plan.md`, and code quality is acceptable within the existing small engine architecture.

Reviewed the binding plan, all nine new Axe tests, Axe data and bot selection, engine integration, procedural sprite and effect indicators, dynamic roster text, and appended four-column roster CSS. This was not a repeat review of the approved baseline.

## Verified behavior

- Target selection for Hunger and Culling Blade filters to living enemy heroes/creeps and enforces both cast range and cursor proximity before charging mana or starting cooldowns (`src/engine.js:267`).
- Call cancels victim recall/commands, controls player, bot and creep basic attacks, blocks casting/recall, and respects stun. Source death and timer expiry release control (`src/engine.js:516`, `src/engine.js:521`). Damage reduction follows the existing armor/shield calculation and expires with its timer.
- Hunger uses the caster ID for damage attribution even after caster death, clips its final damage interval to the debuff duration, and clears with other hero debuffs on death/respawn (`src/engine.js:405`).
- Culling Blade checks the inclusive 30% threshold, executes through armor/shield using the existing death/credit path, and resets its cooldown only on execution. Above the threshold it uses ordinary scaled damage. Its validated targets exclude buildings (`src/engine.js:340`).
- Helix retains shared damage and building-protection handling. Original heroes retain their explicit ability branches. Both bot teams include Axe without changing the 5v5 counts.
- The roster count is derived from hero data, and the layout provides four equal columns; Axe has dedicated artwork references, skill icons, a procedural sprite and visible combat indicators.

## Evidence

The owner reports all 24 Node tests passing, including the nine Axe tests. Those new tests were inspected and cover control, costs, damage, death credit, respawn, building protection, execute behavior and AI casting. The full suite was not rerun by the reviewer.

Two additional focused Node scenarios passed during this review:

1. Natural 2.5-second taunt expiry with the source still alive restores player movement and recall.
2. Hunger killing an enemy hero after its Axe caster dies credits the dead caster with a kill and updates the team score.

## Findings and limits

No blocking or optional code changes are requested. Browser visual/layout verification remains with the owner; this review does not independently certify the new artwork or four-card layout at every viewport. No implementation files were edited.
