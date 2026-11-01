# Stronger Bots Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans in this session.

**Goal:** Strengthen every difficulty and replace capped generic purchases with sustainable hero builds.

**Architecture:** src/bot-items.js owns build planning, procurement and slot management; src/bot-ai.js owns tactical/macro decisions and item/skill usage. Game delegates AI through existing mechanics. Courier deliveries use the inventory assembly API.

**Tech Stack:** Native JS, existing deterministic engine, Node tests, Playwright.

**Spec:** docs/superpowers/specs/2026-11-01-stronger-bots-design.md

## Global Constraints

No base-stat/gold/XP cheats, no ID or deployment changes, respect item supply, store access and courier movement. All three enemy tiers improve; friendly bots use standard strategy. Final verified commit is pushed to origin/main and its workflow is inspected.

## Tasks

- [x] Reproduce the cap including TP/stash, then test hero build diversity, continuing upgrades, partial purchases, courier assembly, secret supply and slot management.
- [x] Implement bot procurement and inventory/courier integration; verify honest costs and no duplicate in-transit purchases.
- [x] Test and implement decision profiles, focus/last-hit choice, safe retreat and kiting, hero combos, active items, defensive/pressure objectives.
- [x] Run deterministic scenario and match simulations across tiers; run all Node and browser checks, build and static checks. Document results and limits.
- [ ] Obtain independent read-only review, fix verified findings, commit and push main, inspect Actions and GHCR publication.

## Review Focus

No shopping oscillation, duplicate items or stalls across storage locations; no courier command reset loop; full inventory upgrades work; rooted or channeling heroes obey control; target selection does not bypass visibility/structure protection; limited pursuit and tower safety; deterministic finite state and acceptable long-match performance.
