# 英雄装备推荐区验证

推荐区使用本地 Valve 默认出装指南，覆盖十名现有英雄，并复用现有购买和快捷购买事务。正常桌面视口中推荐区位于左侧，宽度约为原商店的一半；小屏纵向排列。编织者在核心区优先显示黯灭和代达罗斯之殇，说明减甲与暴击收益。

- `tests/browser-shop-recommendations.mjs`：真实单击查看、右键购买、Shift 加队列、已拥有状态、查看敌方仍固定为玩家英雄、桌面半宽布局、390 像素视口无横向溢出，通过。
- `tests/browser-shop-recommendation-boundaries.mjs --scenario neutral`：中立分类下点击普通推荐会回到正确详情，通过。
- `tests/browser-shop-recommendation-boundaries.mjs --scenario supplies`：真实买两枚侦察守卫堆成两充能后显示已拥有，使用一枚后更新，通过。
- `BROWSER_SCENARIO=refund node tests/browser-shop.mjs`：原组件抵扣购买和全额退款两用例通过。
- 默认推荐生成器局部核对：十名英雄、298 次原始推荐数量、全部生成 ID 可购买、十份快照 SHA-256、生成输出逐字节可复现。仅跳过已退役死灵书，旧别名转换记录在 manifest。
- 发布构建与静态检查通过，87 个 JS 模块、484 个本地引用。

关闭商店时推荐区不进行更新；打开后只在整数金钱、整秒、玩家实例与充能变化时重新计算。推荐状态包括自有信使货物，不把敌方装备当作自己的已购装备。原始快照与中文理由、展示排序分别维护，详见 [来源说明](../hero-item-build-sources.md)。
