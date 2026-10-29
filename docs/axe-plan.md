# Fourth hero: Axe

User request: add another playable hero. Implementer choice: Axe, a strength melee initiator, to complement the existing carry, mage and archer. Keep the current local 5v5 architecture and visual style.

## Behavior

- Stats: 1120 HP, 420 mana, 58 damage, 80 melee range, 190 speed, 7 armor.
- Q Berserker's Call: taunt enemy heroes/creeps within 220 units for 2.5 seconds, forcing basic attacks against Axe; 55% damage reduction during the same interval. 70 mana, 12s cooldown.
- W Battle Hunger: target enemy hero/creep within 500 units and 110 units of cursor; slow and deal 40 damage/second for 4 seconds. 60 mana, 10s cooldown. Damage follows the existing armor formula. Invalid targets do not consume resources.
- E Counter Helix: active 150 damage spin in a 160-unit radius. 45 mana, 7s cooldown. Retain normal building protection.
- R Culling Blade: target enemy hero/creep within 230 units and 110 units of cursor. Execute at <=30% max HP, ignoring armor/shield, and reset this skill's cooldown; otherwise deal 260 damage and retain 24s cooldown. 100 mana. Buildings cannot be targeted; invalid targets do not consume resources.
- Taunt overrides player movement and prevents abilities/recall, but does not override stun. Death or expiry of taunter releases victims. Debuffs clear at respawn. Hunger remains credited to its source, even if source is dead.
- Spell damage scales with the existing per-level spell multiplier. UI descriptions give level-one damage.
- AI draft includes Axe, casts in appropriate range and reserves the ultimate for execute opportunities.

## Implementation

- [x] Write failing behavior tests for selection, taunt/control expiry, hunger damage and targets, spin/building protection, execution/cooldown/credits and AI casting.
- [x] Add data, local Valve artwork, SVG ability icons, original procedural sprite, effect indicators and AI integration.
- [x] Make hero count dynamic; keep four options usable on desktop and mobile.
- [x] Run full simulation tests, browser interactions/screenshots and static build; update README and review the change.

## Verification

- `npm test`: 24 passed (15 existing, 9 Axe cases). New cases initially failed against the three-hero version, then passed after implementation.
- `npm run test:browser`: 15 checks passed, including all four Axe abilities through real keyboard/button inputs, local artwork loading, selection persistence and four-hero layout bounds.
- Screenshots inspected at 1440x900, 1366x768 and 390x844; no browser errors.
- Axe idle-player seed42 simulation ended naturally at 615.85 seconds, score47:49; all positions and health remained finite.
- `npm run build`: passed; `dist/` contains the new code and both Axe artwork assets.
- Independent review approved (`docs/axe-review.md`), with additional checks for taunt expiry and damage-over-time kill credit after caster death.
