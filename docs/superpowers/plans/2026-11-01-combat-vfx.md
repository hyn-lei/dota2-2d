# Combat VFX Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement the steps in this session.

**Goal:** Improve both teams' hero, tower and unit combat visuals while preserving combat rules.

**Architecture:** Pure visual profiles describe attack identity; a dedicated Canvas module draws finite effects and persistent state. Runtime adds source/skill labels to existing events. Renderer delegates combat drawing using simulation time.

**Tech Stack:** Native JavaScript, Canvas 2D, Node test runner, existing Playwright.

**Spec:** docs/superpowers/specs/2026-11-01-combat-vfx-design.md

## Global Constraints

Keep existing IDs, rules and deployment. No new runtime dependencies. Ordinary damage remains immediate; spell flight retains its existing timing. Push verified commit to origin/main without force and inspect its workflow.

## Tasks

- [x] Add meaningful event integration tests: both teams use hero-specific ranged visuals, tower projectile profiles differ, shackle flight starts at release, Powershot position follows its actual flight, continuous effects follow live status. Run first and confirm expected failures.
- [x] Add src/combat-visuals.js for source profiles, src/combat-effects.js for Canvas drawing, label skill events in src/hero-runtime.js and attacks in src/engine.js; integrate into src/renderer.js. Keep generic item effects supported.
- [x] Add tests/browser-vfx.mjs using real Game and Renderer, sample beginning/middle/end frames, real casts from both teams, towers, small viewport, zoom and paused time. Capture visual sheets and match screenshots, review them.
- [x] Run npm test, browser VFX and existing browser checks, npm run build, npm run check:build; update README and docs/combat-vfx-sources.md with actual evidence and boundaries.
- [ ] Review final diff, commit, merge locally to main, push origin/main, inspect GitHub Actions for the pushed SHA.

## Review Focus

Zero-length paths must remain finite; rooted non-frost units must not acquire ice; dispelled/interrupted spells must stop visually; Canvas composite/transform must be restored; visual variation must not consume the simulation RNG. Browser checks cover these rendering concerns.
