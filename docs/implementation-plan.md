# Ancient Front Implementation Plan

This completed plan records the original three-hero baseline. Subsequent user requests added Axe and Kunkka; `docs/axe-plan.md` and `docs/kunkka-plan.md` extend and supersede the original roster count. Current behavior is documented in `docs/design.md` and README.

> For agentic workers: apply superpowers:subagent-driven-development for bounded simulation work; the owner integrates UI and renderer.

**Goal:** Deliver a playable local 2D MOBA with a finished lobby, three hero styles, bot combat and a complete win/loss flow.

**Architecture:** Pure simulation in engine.js; data.js is the shared contract. renderer.js draws game state; main.js owns input, menus, HUD and persistence. Node serves static modules without runtime dependencies.

**Tech Stack:** ES modules, Canvas 2D, CSS, Node test runner, Playwright.

**Spec:** docs/design.md

## Global constraints

- Work only in the requested E:/game/game4 folder; no publishing or git operations needed.
- Chinese UI; local single-player simulation; exactly 3 selectable heroes, 5 heroes per team.
- World 2400 by 1800, 3 lanes, 2 towers per team per lane, 18-second waves.
- Full state belongs to simulation; rendering cannot mutate combat state.
- No runtime CDN dependencies; downloaded presentation images live under assets/.

## Review focus

- Pause and hidden tabs must not advance simulation.
- Dead heroes cannot cast, buy, or move; respawn clears stale targets.
- Purchases enforce gold and six inventory slots.
- Protected buildings cannot be damaged by normal attacks or spells.
- Restart must replace match state and avoid duplicated input or animation loops.

## Task 1: Simulation (delegated)

Files: src/engine.js, tests/engine.test.mjs. Read src/data.js and docs/engine-contract.md.
- [x] Write meaningful behavior tests and observe expected failures.
- [x] Implement Game with deterministic step(dt), bots, waves, buildings, combat, spells, economy, recall and match end.
- [x] Run and pass all Node tests; report exact validation.

## Task 2: Presentation and interaction (owner)

Files: index.html, src/main.js, src/renderer.js, src/style.css, assets/, scripts/.
- [x] Implement local static server and build output.
- [x] Create lobby, hero selection, instructions/settings and match UI.
- [x] Implement procedural terrain, unit animation, camera, minimap and effects.
- [x] Wire input, HUD, shop, recall, pause, results and persistence to engine API.

## Task 3: Integration and review (owner + reviewer)

- [x] Run simulation and production build.
- [x] Browser test actual interaction and screenshots at desktop and small viewports.
- [x] Review complete project, fix material defects, write README and hand off local launch command.

## Final record

- `npm test`: 15 tests passed, including full unattended match progression.
- `npm run build`: static dist output generated successfully.
- `npm run test:browser`: 14 interaction/layout checks passed; 1440x900, 1366x768 and390x844 screenshots inspected.
- Review's creep crowd-control defect fixed, regression tested, and rereview approved.
- Ruling: direct movement uses arrow keys to preserve W for the second ability.
- Ruling: this new folder has no Git repository; no branch creation, commits or remote publication are required.
