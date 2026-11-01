# 房间 AI 补位 Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 顶部可直接进入匹配，房间支持真人加困难 AI 对阵五噩梦 AI。

**Architecture:** 显式 fillWithAI 扩展权威模拟的真人人数；RoomManager 创建设置、预览和开局验证；botProfile 按单位选困难或噩梦；顶部快捷入口和房间预览显示真实角色。

**Spec:** docs/superpowers/specs/2026-11-01-room-ai-fill-design.md

## Constraints and review focus

- 默认构造和随机匹配仍严格五真人，补位必须显式授权且不能接管已有真人。
- 1/2/5 真人分别有 4/3/0 困难 AI，敌方五个噩梦 AI；AI 不具有真人会话或控制权。
- AI 难度分派必须实际用于决策，不能只改显示；AI 会出装/学习/移动，真人输入与物品独立。
- 顶部入口在 1366×768、1024×576、768×1024、390×844 均首屏可点且无横向溢出。
- 纯真人房间、随机匹配、重连、单机存档继续工作。

## Tasks

1. 为角色构成、难度分派和 AI 行为写失败测试；实现 engine/CoopGame/botProfile 和权威房间创建/启动/预览。
2. 添加顶部快捷入口、AI 设置及角色标签；浏览器验证单人房、双人房、顶部首屏和真人重连，更新原纯真人测试明确关闭补位。
3. 接入 Actions、文档，完成独立审查与所有必要检查，提交推送 origin/main 并核对 Actions/公网版本。
