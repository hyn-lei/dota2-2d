# Kunkka feature review

## Verdict

Approved for the bounded feature scope, subject to the owner's browser and full-match validation. No actionable new correctness defects were found. The implementation substantially matches `docs/kunkka-plan.md`, and code quality is acceptable within the existing engine architecture.

Reviewed the binding plan, ten new Kunkka tests, hero data, five-distinct-hero drafting, delayed spells, X marks and cleanup, cleave, AI timing, recast HUD behavior, renderer effects, and dynamic roster CSS. The approved baseline was not broadly re-reviewed.

## Findings

No blocking or optional code changes are requested.

The core integration is coherent:

- Q/R retain snapshot damage, source identity and simulation-time deadlines in `pendingSpells`. Resolution tests current occupants, excludes buildings, preserves longer control durations and removes completed events. Dead heroes remain available for source credit.
- X recast checks pause/death/stun/taunt before bypassing initial mana and cooldown costs. The mark lives on its caster, so independent marks do not overwrite each other. Death cleanup cancels marks involving either participant, and respawn clears residual state. Return clears movement/attack commands and interrupts recall.
- Cleave computes its raw hit before primary-target death/level-up processing, applies the primary hit once, then excludes that target, allies and buildings from splash. Each victim uses ordinary damage mitigation. Building attacks retain the primed charge.
- AI schedules return before Torrent impact and aims both delayed spells at the saved point. The HUD presents the active E recast at zero cost while keeping the original cooldown running, then restores the normal label/cost/cooldown state.
- Drafting deliberately gives each team all five distinct heroes. The desktop roster derives its columns from hero count, and mobile rules wrap the cards into three columns.

## Evidence

The owner reports all 34 Node tests passing, including ten new Kunkka tests. These tests were inspected; the full suite was not rerun by the reviewer.

Additional focused Node scenarios passed during this review:

1. Opposing Kunkkas mark each other, move, and recast independently; each returns the correct opponent without consuming the other mark. A subsequent participant death clears both marks involving that participant.
2. Ghostship remains pending while paused, resolves after its caster dies, awards the dead caster a last hit, and leaves no completed event in `pendingSpells`.

## Limits

Browser artwork, recast interaction and roster layout verification remain with the owner, as does the new full-match simulation. No implementation files were edited by this reviewer.
