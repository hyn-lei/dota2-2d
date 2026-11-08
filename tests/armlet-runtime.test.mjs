import test from 'node:test';
import assert from 'node:assert/strict';
import {arena} from './skill-arena.mjs';
import {ITEM_BY_ID} from '../src/item-data.js';
import {itemState,tickUnit} from '../src/item-runtime.js';
import {tickArmlet} from '../src/armlet-runtime.js';
import {moveItem} from '../src/inventory.js';
import {serializeMatch,parseMatch,restoreMatch} from '../src/game-save.js';
import {statusEffects} from '../src/status-ui.js';
const setup=()=>{const s=arena('crystal_maiden',[0,0,0,0]);s.p.inventory=['armlet'];s.p.inventoryMeta=[];s.g._refreshHero(s.p);s.p.hp=100;return s;};
test('Armlet strength adds current and maximum HP over 0.6 seconds and removes both nonlethally',()=>{
 const {g,p}=setup(),hp=p.hp,max=p.maxHp,str=p.strength;
 assert.equal(g.useItem(0,p).ok,true);const e=itemState(g,p,0);
 assert.equal(g.useItem(0,p).ok,false,'toggle cooldown is enforced');
 tickArmlet(g,p,e,.3);assert.equal(p.strength,str+12.5);assert.equal(p.maxHp,max+275);assert.equal(p.hp,hp+275);
 tickArmlet(g,p,e,.3);assert.equal(p.strength,str+25);assert.equal(p.maxHp,max+550);assert.equal(p.hp,hp+550);
 g.time+=.1;tickUnit(g,p,.1);const before=p.hp;
 assert.equal(g.useItem(0,p).ok,true);assert.equal(p.maxHp,max);assert.equal(p.hp,before-550);
 p.itemCooldowns.armlet=0;p.inventoryMeta[0].cooldownRemaining=0;assert.equal(g.useItem(0,p).ok,true);tickArmlet(g,p,e,.6);p.hp=100;p.itemCooldowns.armlet=0;p.inventoryMeta[0].cooldownRemaining=0;assert.equal(g.useItem(0,p).ok,true);assert.equal(p.hp,1);assert.equal(p.dead,false);
});
test('Armlet drain persists while muted, never kills, and does not interrupt hero/item channels',()=>{
 const {g,p}=setup(),channel={kind:'test'},itemChannel={kind:'teleport'};p.channel=channel;p.itemChannel=itemChannel;
 assert.equal(g.useItem(0,p).ok,true);assert.equal(p.channel,channel);assert.equal(p.itemChannel,itemChannel);
 p.channel=p.itemChannel=null;g.time+=1;tickUnit(g,p,1);assert.equal(p.hp,100+550-ITEM_BY_ID.armlet.values.unholy_health_drain_per_second);
 p.statuses.mute={startedAt:0,until:100,muted:true};p.hp=2;g.time+=1;tickUnit(g,p,1);assert.equal(p.hp,1);assert.equal(p.dead,false);
 assert.ok(statusEffects(p,g.time,g).some(s=>s.id==='armletUnholy'));
});
test('Armlet active strength survives save/restore; backpack removes HP bonus and ramp resumes when ready',()=>{
 const {g,p}=setup();g.useItem(0,p);const e=itemState(g,p,0);tickArmlet(g,p,e,.3);
 // Arena disables spawn timers, and serializeMatch accepts its finite gameplay values.
 const restored=restoreMatch(parseMatch(serializeMatch(g,0))),h=restored.player,meta=h.inventoryMeta[0];restored.setPaused(false);assert.equal(meta.armletStrength,12.5);
 const hp=h.hp,max=h.maxHp;assert.equal(moveItem(restored,h,'inventory',0,'backpack',0).ok,true);assert.equal(h.maxHp,max-275);assert.equal(h.hp,hp-275);
 assert.equal(moveItem(restored,h,'backpack',0,'inventory',0).ok,true);assert.equal(h.maxHp,max-275);
 restored.time+=6.01;tickUnit(restored,h,.3);restored._refreshHero(h);assert.equal(h.strength,p.strength+12.5);assert.ok(h.hp>hp-275);
});
