# 7.42 发布物品浏览器检查

检查地址为本地最新开发服务 `http://127.0.0.1:5184`。本轮修复商店布局与浏览器测试夹具，没有改变游戏规则。

## 真实问题与修复

卷轴分类点击后仍显示旧的182项，原因是 `shop-layout.js` 沿用旧目录，其中 `recipe_revenants_brooch` 已不存在，渲染 `card(undefined)` 抛错；搜索函数本身能正确匹配83张卷轴。此次从本机Steam build 26825343的VPK单独读取原始 `scripts/shops.txt`，校验CRC32及SHA256，再按当前可购目录生成186个普通展示项、5个升级等级变体和83张卷轴。来源记录只更新 `client-sources.json.shopSnapshot`，没有把旧HUD纹理来源改称为当前客户端。

商店新物品全额退款用例在截图耗时后越过10秒退款窗口，实际显示252而非505。本次冻结该合成至出售场景的模拟时钟，交易仍经真实UI执行，505退款及空库存断言保留；后续背包冷却计时场景恢复时钟。臂章满额生命预期更新为7.42的500；全部物品说明检查的数量引用当前可购目录，仍逐件验证完整说明。

## 验证证据

| 检查 | 范围与结果 | 日志 |
| --- | --- | --- |
| selected HUD | 初轮前4组通过；修复后仅重试目录及桌面/笔记本/手机布局2组，83卷轴分类和搜索均通过 | `ci-742-selected-hud.log`、`ci-742-selected-hud-catalog-final.log` |
| economy | 3组通过，含快捷购买、储藏/信使完整图标、臂章实时生命 | `ci-742-economy-retry.log` |
| item tracking | 3组通过，含实际飞行、命中伤害/状态、否决驱散、鱼叉躲避例外 | `ci-742-item-tracking-retry.log` |
| shop | 目录1组、合成/全额退款2组、背包/储藏/神秘商店/快捷购买/布局5组分别通过 | `ci-742-shop-catalog-final.log`、`ci-742-shop-refund.log`、`ci-742-shop-after-refund.log` |
| shop effects | 5组通过；覆盖全部274件可购物品完整说明和4种视口 | `ci-742-shop-effects.log` |
| items | 6组通过，含使用快捷键、装备切换、信使、拆分、掉落拾取及布局 | `ci-742-items.log` |
| VFX | 4组、20个真实技能事件通过，含飞行与暂停/驱散/死亡后的视觉状态 | `ci-742-vfx.log` |

日志位于 `artifacts/`。初轮economy和item-tracking在进入场景前启动超时，隔离后完成原脚本；没有因此降低业务断言。已失败的商店场景通过 `BROWSER_SCENARIO=refund/after-refund/catalog` 单独验证，selected-HUD通过 `BROWSER_SCENARIO=catalog` 验证未完成的目录与布局段；默认CI调用仍执行原来的全部业务检查。

物品UI相关修改的 `git diff --check` 通过。最后发布构建及GitHub Actions结果应对应实际收尾提交，本报告不把本地检查或镜像发布称为服务器已经更新。
