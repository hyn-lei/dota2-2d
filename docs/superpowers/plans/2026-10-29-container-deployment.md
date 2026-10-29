# Container Deployment Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement the checklist in this session.

**Goal:** Publish this static game to GHCR and provide a server-ready Compose configuration, then push the project to the requested GitHub main branch.

**Architecture:** Node copies the standalone site into a non-root Nginx image. Actions verifies the image before publishing two architectures; the server pulls a configurable image with Compose.

**Tech Stack:** Node 24, Nginx, Docker Buildx, GitHub Actions, GHCR, Docker Compose.

**Spec:** `docs/superpowers/specs/2026-10-29-container-deployment-design.md`

## Constraints and review focus

- Preserve paused gameplay work; no new gameplay implementation.
- Do not publish credentials, node_modules, build output or local artifacts.
- A missing JS import or static asset must fail validation.
- Read-only root filesystem must still allow Nginx PID and temporary files.
- PRs must not publish images; latest must follow main only.
- Keep immutable digest references available for rollback.
- User explicitly authorized main push; inspect the remote and never force-push.

## Task 1: Package and verify the static game

- [x] Add `Dockerfile`, `.dockerignore`, `deploy/nginx.conf`, `compose.yaml`, `.env.example`.
- [x] Add `scripts/check-static-build.mjs` and package command; verify current build links and HTML/CSS url references exist.
- [x] Add a container HTTP smoke check covering health, JS/CSS/map resources, MIME types, missing files and excluded source files.
- [x] Validate Compose with the official standalone CLI; schedule actual container checks in CI because local Docker is unavailable.

## Task 2: Publish, document and push

- [x] Add `.github/workflows/docker.yml`: verify first, publish to GHCR on main/tags/manual, PR validation only.
- [x] Pin official actions to verified release SHAs; validate with actionlint.
- [x] Add Chinese deployment instructions covering private registry login, updates, rollback and local builds; link from README.
- [ ] Review configuration, initialize Git, inspect staged paths and sizes, commit and push to `hyn-lei/dota2-2d` main.
- [ ] Inspect the triggered Actions run when accessible; report its real status and any environment limitation.

## Verification record

- Local static build and import linking passed: 26 modules, 52 references. Deliberately broken fixtures confirmed missing files and missing named exports fail the check.
- Official actionlint v1.7.12 and Compose v5.6.1 configuration validation passed; downloaded validators were checked against release SHA256 digests.
- Browser startup passed against the existing local development server. Actual container startup is left to CI; Docker is not installed locally.
- Full existing gameplay suite: 137 passed, 17 failed. Failures concern the paused shop/inventory/item-active and hero-upgrade work. No gameplay changes are part of this deployment task, and these failures are not represented as passing CI checks.
- Independent deployment review found no critical or important blockers. Documentation now clarifies switching away from a pinned image when updating. Static reference checks do not enumerate arbitrary JS-generated asset names or quoted CSS @import; the browser smoke check covers resources requested during startup.
