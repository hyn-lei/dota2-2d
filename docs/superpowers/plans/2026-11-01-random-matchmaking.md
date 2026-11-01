# 五真人随机匹配 Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 五位真人各点击匹配即可自动组队开局。

**Architecture:** RoomManager 保存等待队列、过滤在线会话并五人组队，复用统一 launchMatch 启动规则；CoopConnection 转发排队状态，coop-ui 提供第二种入口和等待/取消界面。

**Tech Stack:** 原生 JavaScript、Node/ws、Canvas、Node test、Playwright。

**Spec:** docs/superpowers/specs/2026-11-01-random-matchmaking-design.md

## Constraints and review focus

- 五人以下不建立比赛；每席位来自唯一在线会话，AI 不补位。
- 断线、取消、重复请求、正在房间里和容量不足处理一致，不制造幽灵席位。
- 重复优先英雄仍可五人开局；匹配玩家输入、库存和指令属于本人的服务器英雄。
- 匹配成立后取消排队不能误结束整个游戏；恢复连接不能重复入队。
- 大厅按钮和等待/取消在桌面、平板与手机可操作。

## Tasks

1. tests/matchmaking.test.mjs 使用真实 WebSocket 验证排队、第五人开局、重复英雄、取消/断线、重复身份、容量等待和失败保护。实现 server/coop-server.mjs 的队列和统一启动函数。
2. src/coop-connection.js 转发 matchmaking，src/coop-ui.js 接入随机模式、名字和优先英雄、等待取消和重连；src/coop-ui.css 适配。用 tests/browser-matchmaking.mjs 五独立浏览器环境验证完整用户流程及真人控制。
3. 接入 Actions、README 和联机说明，独立审查；运行 npm test、适用浏览器检查、npm run build/check:build、actionlint。
4. 提交推送 origin/main；核对对应 Actions 真实部署、版本和公网 WebSocket。
