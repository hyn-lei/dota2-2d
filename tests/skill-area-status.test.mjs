import test from 'node:test';
import assert from 'node:assert/strict';
import {arena} from './skill-arena.mjs';
import {createIllusions} from '../src/illusions.js';
import {statusEffects} from '../src/status-ui.js';
import {tickWorldAbilities} from '../src/hero-runtime.js';
const ids=(g,p)=>statusEffects(p,g.time,g).map(s=>s.id);
test('Talent area adds to the strongest item area once, with actual Torrent boundary hits',()=>{
 for(const items of [[],['chasm_stone'],['chasm_stone','shivas_guard']]){
  const {g,p,e,c}=arena('kunkka');p.level=25;p.talents=[6];p.inventory=items;p.inventoryMeta=[];g._refreshHero(p);p.mana=p.maxMana;p.cooldowns[0]=0;
  const bonus=items.length===2?175:items.length?140:100;assert.equal(p.spellAoE,bonus);const radius=g.skill(0).values.radius;
  e.x=p.x+radius+bonus+e.radius-1;c.x=p.x-radius-bonus-c.radius-1;e.y=c.y=p.y;
  assert.equal(g.cast(0,p).ok,true);for(let i=0;i<70;i++)g.step(.05);assert.ok(e.hp<4000);assert.equal(c.hp,4000);
 }
});
test('Illusion HUD shows inherited Marksmanship, Trueshot, Arcane Aura and ready item passives; conditions remove them',()=>{
 const {g,p,e}=arena('drow_ranger',[4,4,4,3]);p.inventory=['sphere'];p.inventoryMeta=[];g._refreshHero(p);e.x=p.x+1200;
 const cm=g._makeHero('crystal_maiden',p.team,1,false,5);cm.abilityLevels[2]=4;g.entities.push(cm);const clone=createIllusions(g,p,1,30)[0];tickWorldAbilities(g);
 for(const id of ['marksmanship','trueshot','arcaneAura','spellBlock'])assert.ok(ids(g,clone).includes(id),id);
 clone.statuses.break={id:'break',startedAt:0,until:1,break:true};tickWorldAbilities(g);assert.ok(!ids(g,clone).includes('marksmanship'));g.time=1;tickWorldAbilities(g);assert.ok(ids(g,clone).includes('marksmanship'));
 e.x=clone.x+100;e.y=clone.y;assert.ok(!ids(g,clone).includes('marksmanship'));cm.dead=true;assert.ok(!ids(g,clone).includes('arcaneAura'));clone.inventoryMeta[0].cooldownRemaining=10;assert.ok(!ids(g,clone).includes('spellBlock'));
});
test('Armlet contributes exactly one status icon and disappears when switched off',()=>{
 const {g,p}=arena('juggernaut');p.inventory=['armlet'];p.inventoryMeta=[];g._refreshHero(p);g.useItem(0,p);assert.equal(statusEffects(p,g.time,g).filter(s=>s.image?.endsWith('/armlet.png')).length,1);
 g.time=1;p.inventoryMeta[0].cooldownRemaining=0;p.itemCooldowns={};g.useItem(0,p);assert.equal(statusEffects(p,g.time,g).filter(s=>s.image?.endsWith('/armlet.png')).length,0);
});
test('Ready Tidebringer status follows learning, cooldown, autocast and break, including owned illusions',()=>{
 const {g,p,e}=arena('kunkka',[0,0,0,0]);assert.ok(!ids(g,p).includes('tide'));p.abilityLevels[1]=4;assert.ok(ids(g,p).includes('tide'));
 p.attackCooldown=0;g._attack(p,e);assert.ok(!ids(g,p).includes('tide'));p.cooldowns[1]=0;p.autocast={1:false};assert.ok(!ids(g,p).includes('tide'));p.autocast[1]=true;p.statuses.break={id:'break',startedAt:0,until:1,break:true};assert.ok(!ids(g,p).includes('tide'));g.time=1;
 const clone=createIllusions(g,p,1,30)[0];assert.ok(ids(g,p).includes('tide'));assert.ok(ids(g,clone).includes('tide'));
});
