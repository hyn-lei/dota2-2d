import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {ITEMS} from '../src/item-data.js';
const source=await readFile(new URL('../docs/research/hud/shops-client.txt',import.meta.url),'utf8');
const sections=[['consumables','消耗品','basic'],['attributes','属性','basic'],['weapons_armor','装备','basic'],['misc','杂项','basic'],['secretshop','神秘商店','basic'],['basics','配件','upgrades'],['support','辅助','upgrades'],['magics','法器','upgrades'],['defense','防具','upgrades'],['weapons','武器','upgrades'],['artifacts','宝物','upgrades']];
const byName=new Map(ITEMS.map(i=>[i.dotaName,i.id])),seen=new Set();
const groups=sections.map(([id,label,column])=>{
 const block=source.match(new RegExp('"'+id+'"\\s*(?://[^\\n]*\\n\\s*)?\\{([^}]+)\\}'))?.[1];
 if(!block)throw Error('Missing Valve shop group '+id);
 const names=[...block.matchAll(/"item"\s*"([^"]+)"/g)].map(m=>m[1]);
 const items=names.map(name=>byName.get(name)).filter(Boolean);items.forEach(id=>seen.add(id));
 return {id,label,column,items};
});
const additional=ITEMS.filter(i=>!i.recipeOnly&&!seen.has(i.id));
if(additional.length)groups.push({id:'variants',label:'升级等级与其他物品',column:'upgrades',items:additional.map(i=>i.id)});
groups.push({id:'recipes',label:'合成卷轴',column:'recipes',items:ITEMS.filter(i=>i.recipeOnly).map(i=>i.id)});
await writeFile(new URL('../src/shop-layout.js',import.meta.url),'// Generated from Valve client scripts/shops.txt; node scripts/generate-shop-layout.mjs\nexport const SHOP_GROUPS = '+JSON.stringify(groups,null,2)+';\n');
console.log(`Mapped ${seen.size} client items, ${additional.length} variants, ${ITEMS.filter(i=>i.recipeOnly).length} recipes`);
