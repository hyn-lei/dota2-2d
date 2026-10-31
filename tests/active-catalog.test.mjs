import test from 'node:test';
import assert from 'node:assert/strict';
import { arena } from './skill-arena.mjs';
import { ITEMS } from '../src/item-data.js';
import { ACTIVE_ITEM_HANDLERS } from '../src/item-actives.js';
import { plantTree } from '../src/item-common.js';

test('current active catalog executes valid casts without corrupting health, mana or positions',()=>{
 for(const item of ITEMS.filter(i=>!i.recipeOnly&&i.behaviors.some(b=>/_POINT|_UNIT_TARGET|_NO_TARGET|_TOGGLE/.test(b)))){
  const handler=ACTIVE_ITEM_HANDLERS[item.id];assert.ok(handler,`${item.id} has an executable active`);
  const {g,p,e,c}=arena('crystal_maiden',[0,0,0,0]);p.inventory=[item.id];p.inventoryMeta=[];g._refreshHero(p);p.mana=p.maxMana=10000;p.hp=p.maxHp=10000;
  p.inventoryMeta[0].charges=Math.max(p.inventoryMeta[0].charges,3);
  c.x=p.x+100;c.y=p.y+100;e.x=p.x+100;e.y=p.y;
  let point=handler.target.startsWith('enemy')||['anyUnit','unitOrPoint'].includes(handler.target)?handler.target==='enemyCreep'?c:e:p;
  if(handler.target==='tree'){point={x:p.x+100,y:p.y};plantTree(g,point);}
  if(item.id==='tpscroll'){point=g._unit('fountain',0,p.x+400,p.y,{range:0,damage:0});g.entities.push(point);}
  const result=g.useItem(0,point);assert.equal(result.ok,true,`${item.id}: ${result.reason}`);g.step(5);
  for(const unit of g.entities)for(const field of ['hp','maxHp','x','y',...(unit.kind==='hero'?['mana','maxMana']:[])])assert.ok(Number.isFinite(unit[field]),`${item.id}: ${unit.id}.${field}`);
 }
});
