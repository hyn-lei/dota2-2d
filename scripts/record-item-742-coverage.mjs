import fs from 'node:fs/promises';
import {ITEM_BY_ID} from '../src/item-data.js';
const patch=JSON.parse(await fs.readFile('docs/research/patches/7.42/patchnotes-schinese.json','utf8'));
const english=JSON.parse(await fs.readFile('docs/research/patches/7.42/patchnotes-english.json','utf8'));
const list=JSON.parse(await fs.readFile('docs/research/items/full/itemlist-schinese.json','utf8')).result.data.itemabilities;
const byNumber=new Map(Object.values(ITEM_BY_ID).map(i=>[i.dotaId,i]));
const clean=s=>String(s||'').replace(/<br\s*\/?\s*>/g,' ').replace(/<[^>]*>/g,'').replaceAll('|','\\|').trim();
let text=`# 7.42 物品改动逐项覆盖

本轮目标为 Valve 官方 7.42。普通物品84个条目包含82个物品，中立物品83个条目包含79个物品/附魔；标题和中立全局规则单独处理。下表保留全部官方逐条改动，目录、图标和测试通过不代表与 Source 2 客户端完全等价。

来源：[官方中文补丁](research/patches/7.42/patchnotes-schinese.json)、[官方英文补丁](research/patches/7.42/patchnotes-english.json)、[逐件物品快照与摘要](research/items/full/snapshots.json)、[客户端物品 KV](research/items/items.txt)、[中立池与附魔等级 KV](research/items/742/neutral_items.txt)。客户端固定提交为 \`76ab89451c1384c2e106b676258c6e9f72787e11\`，获取日期2026-11-21。采菌产物初版规则来自[官方7.41](research/items/742/patch-7.41.json)，再与7.42 KV及Datafeed核对。

当前生成354条记录、274条可购条目、85张收费卷轴、48件活跃中立宝物、19类活跃附魔及3种采菌消耗物；保留既有普通物品ID。118个主动处理包含兼容记录。自动配方、下架装备、中立宝物及地图奖励不列入普通商店。

`;
const custom={151:'隐身中开关、非致死流失、净回复显示',1953:'正式配方/属性、力量/生命贡献、45/秒非致死流失、相位移动、血量比例减速抗性',1942:'正式配方/属性、飞行/命中/持续伤害、30%衰减至15%减速、生命消耗和共享冷却',1955:'正式配方/属性、推送、敌友独立8秒赋能；推送忽略赋能内部冷却',1944:'正式配方/属性、攻击/技能吸血、伤害/护甲/魔法光环',1948:'正式配方/属性、3秒强驱散缴械、共享冷却、500范围非隐形敌英雄/幻象加速冷却',1946:'正式配方/属性、15%最大生命落点伤害、控制结束独立燃烧/减速',1951:'背包施放、一次性消耗，世界模块三路大兵召唤',1804:'背包施放、脆弱分格生命、真实三路小兵保护和范围特效',7:'商店下架；兼容ID保留',635:'商店下架；兼容ID保留；退休流程测试移除',1808:'商店下架；兼容ID保留',911:'移出商店并重做为3级中立宝物'};
for(const [section,title]of [['items','普通物品'],['neutral_items','中立宝物与附魔']]){
 text+=`## ${title}\n\n| 物品 / 稳定 ID | 接入内容 | 官方7.42改动 |\n| --- | --- | --- |\n`;
 for(const entry of patch[section].filter(e=>e.ability_id>0)){
  const item=byNumber.get(entry.ability_id),source=list.find(i=>i.id===entry.ability_id);
  const notes=english[section].find(i=>i.ability_id===entry.ability_id)?.ability_notes||[];
  const out=notes.some(n=>n.note.includes('Cycled Out'));
  const scope=out?'退出本轮候选池':custom[entry.ability_id]|| (item?.enchantment?'对应等级的属性、收益和惩罚；按官方主属性限定附魔候选':section==='neutral_items'?'候选池、正式数值、主动/被动接入 item-neutral-runtime':'正式数值/配方由运行时消费；相应主动、被动和物品威力规则接入');
  text+=`| ${item?.name||source?.name_loc||entry.ability_id} / \`${item?.id||source?.name.replace(/^item_/,'')||entry.ability_id}\` | ${scope} | ${(entry.ability_notes||[]).map(n=>clean(n.note)).filter(Boolean).join('<br>')} |\n`;
 }
 text+='\n';
}
text+=`## 中立全局规则和独立状态

开始时按四个官方池为每级固定候选，0/15/30/50分钟开放，65分钟取消魔石上限。成本为6/10/10/14，4级重新打造每次增加6。附魔按全局候选、英雄主属性和官方等级选择。世界模块负责魔石、营地、打造、地面奖励、Tormentor号角和恶魔召唤；物品消费 \`neutralItem/neutralItemMeta\`、\`neutralEnchantment/neutralEnchantmentMeta\`、\`neutralTier\`。

休眠珍品打造增幅保存为实例 \`curioBoost\`，只增幅客户端标记 \`apply_curio_bonus\` 的字段。附魔师之椟依 \`recrafts\` 提升附魔；协和随技能冷却变化重新计算实际魔法消耗降低/技能吸血。攻击物品威力读取 \`result.itemPotency\`，默认英雄100%、普通幻象20%，幻影斧35%、影墟棱晶100%；混沌骑士例外由英雄模块提供。重叠减益保留最高物品威力来源。

悬红按当前10位可选英雄的全部官方 KV \`Adjectives\`（继承基础英雄字段并覆盖专属值，包含编织者）与壮硕/灵巧/聪慧/富裕四种玩法特征生成2–5名唯一英雄名单。每个目标有制造者专属标记，击杀/助攻一次结算，全部领取或主动使用后重列。界面从 \`itemState.bountyTrait/bountyTargets\` 读取特征、英雄姓名和领取状态。

采菌套具标记1200范围树木、最多3棵、每5秒补充，近250范围站立0.75秒采集，50秒冷却。产物为铁木坚果、魔力蘑菇、活力毒蕈或30金币。三种物品真实入栏、最多叠5，分别有3移速/2智力/2伤害的每层被动；消耗提供永久主属性、即时魔法或可被敌英雄/肉山攻击打断的1%最大生命持续回复。

## 验证和仍需客户端采样的细节

\`tests/item-742.test.mjs\` 验证新升级、物品威力/幻象、穿透减益免疫、控制结束燃烧、冷却加速、中立栏/附魔/屏障、延迟伤害、真实上路战旗、悬红名单/赏金、采菌产物与协和动态。既有物品/库存/臂章专项保留业务测试，版本数值变化只重跑失败的完整用例；已下架统御头盔的退休流程测试移除。集成检查证据由实际发布提交的验证报告记录。

客户端未公开的随机权重（采菌产物、悬红特征相对概率等）使用对局种子可重复选择，未宣称与客户端概率完全一致。悬红采用默认外观标签，饰品改变外观后的标签变化不模拟。转身速度、粒子外观、中立自动反击和弹道逐帧精度仍缺客户端采样；二维引擎不能由目录覆盖推出完全等价。蜂群头盔对原版多分身、英雄型召唤物等完整名单的排除边界仍需对照，当前使用本工程的真实英雄实体。
`;
await fs.writeFile('docs/item-742-coverage.md',text);
console.log('Recorded all 82 ordinary and 79 neutral/enchantment patch entries.');
