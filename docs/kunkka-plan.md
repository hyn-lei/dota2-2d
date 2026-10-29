# Fifth hero: Kunkka

User explicitly requests Kunkka. Extend the current local 5v5 game, following the existing simplified hero approach. No new libraries or networking.

## Rules

- Base stats: 1000 HP, 500 mana, 64 attack damage, 85 melee range, 195 speed, 5 armor.
- Q 洪流: point targeted, range650, radius155. After1.2s deal180 damage, stun1.3s and slow2.5s. Mana80/cooldown10s. Only hostile heroes/creeps; units can leave the telegraphed zone before impact. Damage scales with existing per-level multiplier.
- W 潮汐使者: prime the next basic attack against an enemy hero/creep for up to8s. Add80 scaled damage to that hit; splash75% of the total raw hit onto hostile heroes/creeps behind the primary target, up to260 beyond the target with cone half-width50+along*0.45. Mana35/cooldown7s. Building attacks neither consume nor benefit from the charge. Ordinary armor applies to each target. The primary target takes damage once.
- E X 标记: enemy hero/creep within600 and110 of cursor. Store position and return that living target after4s. Recast E returns it immediately at no mana cost, ignoring E's running cooldown. Initial mana50/cooldown16s. Invalid targets cost nothing. Stun/taunt still block recast. Return interrupts recall and clears stale commands; effect is cancelled on caster or target death, so it never teleports a respawn. Target mark is an entity id plus saved point on the caster. UI shows 返回 while recast is available.
- R 幽灵船: range800 point targeted. Visible ship moves from caster's cast position to target over1.6s; impact deals300 damage and stuns1.2s in radius210 to hostile heroes/creeps. At cast time, allied heroes within320 receive existing35% damage reduction for4s. Mana140/cooldown32s. No building damage.
- Delayed Q/R use simulation time, freeze when paused and still resolve after caster death. Damage retains source credit. Same-kind longer control buffs must not be shortened by a later short stun/slow.
- Five distinct heroes per team: player's four allies are the other heroes; enemy team fields all five. Existing Axe coverage is adjusted to this deliberate roster behavior.
- Kunkka AI marks a hero, aims delayed spells at the saved location, recasts return immediately before Torrent's arrival, primes cleave in melee, and uses Ghostship against heroes.

## UI and verification

- [x] Meaningful failing tests: new hero/draft, Q timing/area/evasion/pause/death credit, cleave cone and protected buildings, X manual/automatic/cancelled return and costs, R delay/control/team shielding, AI combo and a full match.
- [x] Implement pure simulation and shared data; retain other hero rules.
- [x] Download local official presentation art, draw original admiral sprite, water/cleave/mark/ship effects and skill icons.
- [x] Dynamic desktop roster count and mobile wrapping; E recast state reflects current availability.
- [x] Full rule suite, browser checks/screenshots, independent review, README and static build.

## Validation

- All10new tests were first observed failing against the four-hero version.
- Full Node suite:34passed,0failed. The existing Axe draft assertion now checks Axe's presence rather than requiring a duplicate allied Axe when the player chooses him.
- Browser suite:18checks passed, including actual X recast at zero mana, delayed Q/R impacts, visible ship effect, charged attack cleave, 5hero choices and layout bounds. No console/page errors.
- Screenshots inspected at1440x900,1366x768 and390x844; mobile roster wraps into two rows.
- Idle-player Kunkka simulations (seed42/99) ended naturally at646/694seconds, with score49:50/45:56 and finite unit state.
- Independent review approved in docs/kunkka-review.md; additional opposing-mark and dead-caster ship checks passed.
