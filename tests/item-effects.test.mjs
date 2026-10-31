import test from 'node:test';
import assert from 'node:assert/strict';
import { arena } from './skill-arena.mjs';
import * as Inventory from '../src/inventory.js';
import * as Skills from '../src/hero-runtime.js';
import { BASES } from '../src/map-data.js';
const equip=(g,h,ids)=>{h.inventory=ids;h.inventoryMeta=[];g._refreshHero(h);h.hp=h.maxHp;h.mana=h.maxMana;};

test('raindrops block magical damage, spend charges and respect the seven second cooldown',()=>{
 const {g,p,e}=arena('crystal_maiden');equip(g,p,['infused_raindrop']);p.magicResistance=0;
 assert.equal(g.damage(p,200,e,'magical'),80);assert.equal(p.inventoryMeta[0].charges,5);
 assert.equal(g.damage(p,200,e,'magical'),200);assert.equal(p.inventoryMeta[0].charges,5);
});
test('consecrated wraps spend stored charges on a real barrier and regenerate stacks',()=>{
 const {g,p,e}=arena('crystal_maiden');equip(g,p,['consecrated_wraps']);const hp=p.hp;
 assert.equal(g.damage(p,100,e,'pure'),0);assert.equal(p.hp,hp);assert.equal(p.inventoryMeta[0].charges,0);
 g.step(4.1);assert.equal(p.inventoryMeta[0].charges,1);assert.ok(Object.values(p.statuses).some(s=>s.movePercent===15));
});
test('Aeon Disk prevents lethal burst and suppresses both incoming and outgoing damage temporarily',()=>{
 const {g,p,e}=arena('crystal_maiden');equip(g,p,['aeon_disk']);g.damage(p,99999,e,'pure');
 assert.equal(p.dead,false);assert.ok(p.hp>0);assert.equal(g.damage(p,99999,e,'pure'),0);assert.equal(g.damage(e,100,p,'pure'),0);
 g.step(2.6);assert.ok(g.damage(e,100,p,'pure')>0);assert.ok(p.inventoryMeta[0].cooldownRemaining>90);
});
test('Linken blocks one targeted item, then the second cast damages the target',()=>{
 const {g,p,e}=arena('crystal_maiden');equip(g,p,['dagon']);equip(g,e,['sphere']);e.magicResistance=0;e.maxHp=e.hp=10000;
 assert.equal(g.useItem(0,e).blocked,true);assert.equal(e.hp,10000);
 p.inventoryMeta[0].cooldownRemaining=0;p.itemCooldowns={};assert.equal(g.useItem(0,e).ok,true);assert.equal(e.hp,9600);
});
test('Refresher clears shared item cooldowns and item charges cannot be created by moving slots',()=>{
 const {g,p}=arena('crystal_maiden');equip(g,p,['blink','refresher']);p.maxMana=p.mana=2000;
 g.useItem(0,{x:p.x+300,y:p.y});assert.ok(p.itemCooldowns.blink>0);assert.equal(g.useItem(1,p).ok,true);
 assert.equal(g.useItem(0,{x:p.x+300,y:p.y}).ok,true);assert.equal(g.useItem(1,p).ok,false);
});
test('ranged split shot harms secondary targets without recursively triggering attack effects',()=>{
 const {g,p,e,c}=arena('crystal_maiden',[0,0,0,0]);equip(g,p,['specialists_array']);g._random=()=>0;
 p.attackCooldown=0;g._attack(p,e);assert.ok(c.hp<4000);assert.ok(e.hp<4000);
});
test('witch blade poison uses intelligence and Devastator reduces magic resistance',()=>{
 const {g,p,e}=arena('crystal_maiden',[0,0,0,0]);equip(g,p,['devastator']);p.attackCooldown=0;g._attack(p,e);const hp=e.hp;
 g.step(1.1);assert.ok(e.hp<hp-20);assert.ok(g.combatStats(e).magicResistance<0);
});
test('Scepter can be moved out of equipment and Shard is consumed only after its stock unlocks',()=>{
 const {g,p}=arena('kunkka');equip(g,p,['ultimate_scepter']);assert.equal(p.hasScepter,true);
 g.moveItem('inventory',0,'backpack',0);assert.equal(p.hasScepter,false);
 p.gold=10000;assert.equal(g.buy('aghanims_shard').ok,false);g.time=990;
 assert.equal(g.buy('aghanims_shard').ok,true);assert.equal(p.hasShard,false);
 assert.ok(p.stash.includes('aghanims_shard'));
});
test('Midas consumes rechargeable ability charges and refills one charge at a time',()=>{
 const {g,p,c}=arena('crystal_maiden');equip(g,p,['hand_of_midas']);const gold=p.gold;
 assert.equal(g.useItem(0,c).ok,true);assert.equal(c.dead,true);assert.equal(p.gold,gold+160);assert.equal(p.inventoryMeta[0].charges,1);
 g.step(90.1);assert.equal(p.inventoryMeta[0].charges,2);
});
test('spell lifesteal is based on damage actually dealt and reflected damage cannot recurse',()=>{
 const {g,p,e}=arena('crystal_maiden');equip(g,p,['voodoo_mask','blade_mail']);equip(g,e,['blade_mail']);p.hp=100;e.hp=e.maxHp;
 assert.equal(g.useItem(1,p).ok,true);assert.equal(g.useItem(1,p).ok,false);
 g.damage(e,100,p,'pure');assert.ok(p.hp>100);const hp=p.hp;g.damage(p,10,e,'pure',{reflected:true});assert.equal(p.hp,hp-10);
});
test('mana burning, armor reduction and lifesteal take effect on actual attacks',()=>{
 const {g,p,e}=arena('juggernaut',[0,0,0,0]);equip(g,p,['diffusal_blade','desolator','lifesteal']);p.hp=100;e.mana=200;
 p.attackCooldown=0;g._attack(p,e);assert.equal(e.mana,160);assert.equal(g.combatStats(e).armor,-6);assert.ok(p.hp>100);
});
test('purchased consumables stack and partial usage does not refund consumed charges',()=>{
 const {g,p}=arena('crystal_maiden');Object.assign(p,BASES[p.team]);p.gold=10000;
 assert.equal(g.buy('flask').ok,true);assert.equal(g.buy('flask').ok,true);assert.equal(p.inventoryMeta[0].charges,2);
 assert.equal(g.useItem(0,p).ok,true);assert.equal(p.inventoryMeta[0].charges,1);assert.equal(Inventory.sellValue(g,p,'inventory',0),50);
});

test('Moon Shard consumption removes its equipment bonus and grants the smaller permanent bonus',()=>{
 const {g,p}=arena('crystal_maiden');equip(g,p,['moon_shard']);const speed=p.attackSpeed;
 assert.equal(g.useItem(0,p).ok,true);assert.equal(p.moonShard,true);assert.equal(p.inventory.length,0);assert.equal(p.attackSpeed,speed-80);
});
test('Lotus reflects targeted hero spells even if Linken blocks the original',()=>{
 const {g,p,e}=arena('crystal_maiden');equip(g,e,['lotus_orb','sphere']);
 Skills.addStatus(g,e,'lotus',{positive:true,spellReflect:true,duration:6});
 assert.equal(g.cast(1,e).ok,true);g.step(.3);assert.equal(g.isRooted(e),false);assert.equal(g.isRooted(p),true);
});
test('Aether Lens extends actual hero cast range, and invisible enemy targets cannot be selected',()=>{
 const {g,p,e}=arena('crystal_maiden');e.x=p.x+700;assert.equal(g.cast(1,e).ok,false);
 equip(g,p,['aether_lens']);assert.equal(g.cast(1,e).ok,true);g.step(.3);assert.equal(g.isRooted(e),true);
 p.cooldowns[1]=0;Skills.addStatus(g,e,'hide',{positive:true,invisible:true,duration:8});assert.equal(g.cast(1,e).ok,false);
});
test('Crozier reduces enemy regeneration and its active makes the caster ethereal while stealing regeneration',()=>{
 const {g,p,e}=arena('crystal_maiden',[0,0,0,0]);equip(g,p,['crellas_crozier']);p.hp=100;p.hpRegen=0;e.hp=1000;e.hpRegen=100;
 g.step(1);assert.ok(e.hp>=1069&&e.hp<=1071);
 assert.equal(g.useItem(0,p).ok,true);assert.equal(g.damage(p,100,e,'physical'),0);assert.equal(g._attack(p,e),false);
 const before=p.hp,enemyHp=e.hp;g.step(1);assert.ok(p.hp>=before+85);assert.ok(e.hp<enemyHp+12);
});
