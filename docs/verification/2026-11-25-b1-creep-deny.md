# 2026-11-25 B1.1 兵线反补验证

范围：统一计划 B1 的兵线普通攻击切片；建筑/英雄、恰好半血和特殊攻击修饰仍待核验，不计为完整客户端对齐。来源见 [反补规则与边界](../deny-runtime-sources.md)。

## 直接行为与输入

- `tests/deny-runtime.test.mjs` 共 14 个真实场景，按最小范围逐例验证：合法/非法友军、近战结算、敌方半额经验分摊、死亡和距离外排除、正常补刀、治疗取消、攻击点、远程到达、存档/快照、英雄拥有单位、幻象原输出比例、攻击者阵亡后的已释放弹道、陈狂热者实际行动管线，以及权威命令和网络查询。
- 初始反补单例 `node --test --test-name-pattern '^melee lane deny gives owner credit, zero gold and half XP split among living nearby opponents$' tests/deny-runtime.test.mjs` 因缺少友军反补真实击杀而失败。实现后仅重试失败的完整用例；发现测试布置重复加入英雄对象，修正布置并再次只跑该例，通过。其余初次失败的远程、物品、归属、服务器场景分别按完整名字重试，通过。
- 幻象输出比例和已释放弹道的攻击者阵亡用例先失败、修复后分别通过。代码复查又发现狂热者丢弃友军目标、前摇中换阵营被转为敌方补刀；两条对应真实路径先复现失败，修复后分别通过。未默认重跑失败文件或全套单测。
- `$env:GAME_URL='http://127.0.0.1:5197'; node tests/browser-denies.mjs`：初次实际低血量友军右键未创建攻击指令，检查失败；实现后通过。最终代码再次通过左键友军选择、高血量右键移动、低血量右键反补、零金币和敌方半额经验。单台 1366×768 Chromium，无页面错误。报告与截图保存在忽略目录 `artifacts/deny-browser-report.json`、`deny-browser.png`，此输入场景加入既有 Actions 浏览器验证。

## 相关回归与发布检查

- `node --test tests/attack-impact.test.mjs tests/world-network.test.mjs`：17/17 通过，覆盖原敌方跟踪弹道、闪避/无敌/死亡、原命中物品事件，以及共享世界存档与权威操作。
- `node --test --test-name-pattern '^illusion attacks credit owner last hits, gold, kills and assists without giving foreign copied items ownership$' tests/illusions.test.mjs`：通过。
- `node --test --test-name-pattern '^server validates ownership, lifetime, nested args and copied-item slot guards for each human$' tests/illusions.test.mjs`：通过。
- `node --test --test-name-pattern '^controlled creature damage auras and reductions apply once to actual attacks$' tests/chen.test.mjs`：通过。
- `node --test tests/ogre-attack-loop.test.mjs`：原攻击点相关玩家、嘲讽、AI 攻击频率及中断检查通过。
- `npm run build`、`npm run check:build`：最终代码通过；前端内容版本 `f84ddd9524325b009af0f3c0bc99524e3536155556fb545caa28d3a1dd2d38d7`，89 个 JS 模块编译并链接、491 个本地引用校验通过。首次构建后因复查修复改变源码，重新执行了必需发布检查。
- 独立代码复查的两项 P2 均修复，修复增量复查无新问题；额外窄探针确认新攻击前摇字段和缺少该字段的旧存档均可恢复并正确结算。

未在本地运行全套 `npm test`、全量物品审计、跨设备浏览器矩阵或性能长测。GitHub 既有发布工作流按仓库原范围继续验证；镜像是否发布成功以本轮 Actions 最终结论为准，服务器部署需另有凭据及证据。
