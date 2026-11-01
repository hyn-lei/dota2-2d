# 五真人联机实施计划

> For agentic workers: use superpowers:executing-plans for implementation, and scoped agents for independent investigation/review.

Goal: fix Ogre's sustained attacks and deliver exactly five client-controlled humans versus five nightmare bots through real WebSocket rooms.

Architecture: server-authoritative Game and per-hero input; room/session transport separate from rendering. Existing offline API is reused through a browser NetworkGame adapter. Production preserves GHCR and Compose with an HTTP+WebSocket Node runtime.

Tech Stack: native JavaScript/Canvas, Node, ws, Node tests and Playwright.

Spec: docs/superpowers/specs/2026-11-01-coop-multiplayer-design.md

## Constraints and review focus

- Exactly five connected, ready humans; no AI fallback, no client state authority or peer-controlled simulation.
- Preserve existing IDs, official stats, three offline tiers and main/GHCR/Compose publication.
- Player input and action ownership, dead/paused status, disconnect race and duplicate tokens must be independently tested.
- No arbitrary remote method calls, private file serving, unbounded transport queues or indefinite orphaned matches.
- User later clarified delivery is code commit/upload only; actual rollout/server access is outside this task. Preserve the existing publication workflow.

## Tasks

- [x] Reproduce/fix Ogre no-op movement cancellation; add sustained player/bot/taunt/cadence/cancellation tests without changing stats.
- [x] Add per-hero input clearing and server CoopGame actor context; test five humans cannot auto-buy/auto-learn/control each other.
- [x] Implement nightmare coordination and stronger decision profile in src/bot-ai.js plus focused tests.
- [x] Define shared protocol/codec, authoritative rooms/sessions/command validation, HTTP/WebSocket service and integration tests.
- [x] Add browser NetworkGame, room UI and main integration; five-context Playwright tests with actual movement, learning, purchases, skill combat and reconnection.
- [x] Update Docker/Compose/CI and source/deployment/verification docs; complete Node/browser/build/transport checks and scoped final review.

Delivery follows AGENTS.md: commit and push verified code/documents to origin/main without force, then inspect the exact SHA's Actions.
- [x] Apply latest user scope: commit/upload code only; no server access collection or actual target-site rollout.
