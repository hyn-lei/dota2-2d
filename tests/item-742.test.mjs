import test from 'node:test';
import assert from 'node:assert/strict';
import {arena} from './skill-arena.mjs';
import {ITEM_BY_ID} from '../src/item-data.js';
import * as Items from '../src/item-runtime.js';
import {createIllusions} from '../src/illusions.js';
import {tickArmlet} from '../src/armlet-runtime.js';
import {addStatus,applyDispel} from '../src/hero-runtime.js';
import {plantTree} from '../src/item-common.js';
function setup(ids){const s=arena('crystal_maiden',[0,0,0,0]);s.p.inventory=ids;s.p.inventoryMeta=[];s.g._refreshHero(s.p);s.p.hp=s.p.maxHp;s.p.mana=3000;return s;}
test('Mordiggian sabatons toggle gains health nonlethally and grants phased speed with health-scaled slow resistance',()=>{
 const {g,p}=setup(['berserkers_sabatons']),max=p.maxHp;assert.equal(g.useItem(0,p).ok,true);const state=Items.itemState(g,p,0);tickArmlet(g,p,state,.6);assert.equal(p.maxHp,max+600);assert.equal(Items.combatStats(g,p,g.combatStats(p)).slowResistance,40);assert.equal(Items.itemState(g,p,0).mode,'on');
 p.hp=1;Items.tickUnit(g,p,.1);assert.equal(p.hp,1);state.meta.cooldownRemaining=0;p.itemCooldowns={};g.useItem(0,p);assert.equal(p.hp,1);assert.equal(p.dead,false);
});
test('Caduceus force applies allied empower without consuming its independent spell proc cooldown',()=>{
 const {g,p,e}=setup(['caduceus']);p.hp=100;assert.equal(g.useItem(0,p).ok,true);assert.equal(p.hp,300);p.hp=100;Items.onSpellTarget(g,p,p,{});assert.equal(p.hp,300);const hp=e.hp;Items.onSpellTarget(g,p,e,{});assert.ok(e.hp<hp);p.hp=100;Items.onSpellTarget(g,p,p,{});assert.equal(p.hp,100);
});
test('7.42 illusion corruption uses highest item potency and manabreak burns scaled mana',()=>{
 const {g,p,e}=setup(['desolator','diffusal_blade']),[clone]=createIllusions(g,p,1,10);clone.itemPotency=20;e.mana=200;Items.afterAttack(g,clone,e,{damage:10,itemPotency:20},0);assert.ok(Math.abs(e.statuses.corruption.armor+1.2)<1e-9);assert.equal(e.mana,192);Items.afterAttack(g,p,e,{damage:10,itemPotency:100},0);assert.equal(e.statuses.corruption.armor,-6);Items.afterAttack(g,clone,e,{damage:10,itemPotency:20},0);assert.equal(e.statuses.corruption.armor,-6);
});
test('Frost and Skadi apply potency-scaled debuffs through debuff immunity',()=>{
 const {g,p,e}=setup(['skadi']);addStatus(g,e,'immune',{duration:10,debuffImmune:true});Items.afterAttack(g,p,e,{damage:10,itemPotency:50},0);const frost=e.statuses['itemSlow:skadi'];assert.ok(frost);assert.equal(frost.healReduction,25);assert.equal(frost.slowPct,20);
});
test('Starforge meteor deals percentage impact damage and ignites after owned stun expires',()=>{
 const {g,p,e}=setup(['starforge']);e.maxHp=e.hp=2000;const hp=e.hp;assert.equal(g.useItem(0,e).ok,true);g.time+=2.5;Items.tickUnit(g,p,2.5);Items.tickWorld(g,.1);assert.ok(e.hp<hp-300);const s=addStatus(g,e,'testStun',{duration:1,stunned:true,sourceId:p.id});g.time+=1;Items.expiredStatus(g,e,s);assert.ok(e.statuses['itemDot:starforgeFlare']);
});
test('Skypiercer accelerates disarm recharge near non-invisible enemies and strong dispels remove disarm',()=>{
 const {g,p,e}=setup(['skypiercer']);assert.equal(g.useItem(0,e).ok,true);Items.tickUnit(g,p,1);assert.equal(p.inventoryMeta[0].cooldownRemaining,12.75);applyDispel(g,e,true);assert.ok(!Object.values(e.statuses).some(s=>s.disarmed));
});
test('Neutral slot grants tiered enchantment stats and Brick drains ordered barriers without overflowing into health',()=>{
 const {g,p,e}=setup([]);p.neutralItem='brick';p.neutralEnchantment='enhancement_alert';p.neutralTier=3;g._refreshHero(p);assert.equal(p.range,680);addStatus(g,e,'magicBarrier',{duration:10,barrier:100,barrierType:'magical',itemId:'pipe'});addStatus(g,e,'allBarrier',{duration:10,barrier:150,barrierType:'all',itemId:'pipe'});const hp=e.hp;assert.equal(Items.useItem(g,p,0,e,'neutral').ok,true);g.time+=1;Items.tickWorld(g,1);assert.equal(e.statuses.magicBarrier.barrier,0);assert.equal(e.statuses.allBarrier.barrier,0);assert.ok(e.hp<=hp);
});
test('Prophet pendulum delays thirty percent without reducing or recursively delaying the debt',()=>{
 const {g,p,e}=setup([]);p.neutralItem='prophets_pendulum';g._refreshHero(p);p.hp=1000;g.damage(p,100,e,'pure');assert.equal(p.hp,930);for(let j=0;j<8;j++){g.time+=1;Items.tickUnit(g,p,1);}assert.equal(p.hp,900);
});
test('Caduceus chooses its superior empower over Phylactery and allied casts never harm their target',()=>{
 const {g,p,e}=setup(['phylactery','caduceus']);const hp=e.hp;Items.onSpellTarget(g,p,e,{});assert.equal(hp-e.hp,175);p.hp=100;Items.onSpellTarget(g,p,p,{});assert.equal(p.hp,300);
});
test('Illusion MKB hit damage uses thirty magic damage and item potency scales the proc chance',()=>{
 const {g,p,e}=setup(['monkey_king_bar']),[clone]=createIllusions(g,p,1,10);g._random=()=>.15;assert.equal(Items.trueStrike(g,clone,e,{itemPotency:20}),true);const hp=e.hp;Items.afterAttack(g,clone,e,{damage:10,itemPotency:20},0);assert.equal(hp-e.hp,30);g._random=()=>.17;assert.equal(Items.trueStrike(g,clone,e,{itemPotency:20}),false);
});
test('Roshan banner casts from backpack and protects allied lane creeps until its fragile banner is destroyed',()=>{
 const {g,p,c}=setup([]);p.backpack=['roshans_banner'];p.backpackMeta=[];c.team=p.team;c.x=p.x+100;assert.equal(Items.useItem(g,p,0,p,'backpack').ok,true);Items.tickWorld(g,.1);assert.ok(Object.values(c.statuses).some(s=>s.invulnerable));const flag=g.entities.find(t=>t.wardType==='banner');assert.ok(flag.fragile&&flag.pipHealth);flag.dead=true;g.time+=.2;Items.tickWorld(g,.2);assert.ok(!Object.values(c.statuses).some(s=>s.invulnerable&&s.until>g.time));
});
test('Buckler yields to stronger aura while Vladmir and Assault armor auras stack',()=>{
 const {g,p,e}=setup(['buckler','vladmir','assault']);e.team=p.team;Items.tickWorld(g,.25);assert.equal(e.itemAura.armor,6);
});
test('Assault and Shiva attack speed auras combine once each and expire with their sources',()=>{
 const {g,p}=setup([]);
 const sources=[['assault',0],['shivas_guard',1],['assault',0],['shivas_guard',1]].map(([item,team],index)=>{
  const source=g._makeHero('axe',team,1,false,index+1);
  Object.assign(source,{x:p.x+100,y:p.y+index*50,inventory:[item],inventoryMeta:[]});
  g._refreshHero(source);return source;
 });
 const base=g.combatStats(p).attackSpeed;
 const sample=()=>{g.time+=.5;Items.tickWorld(g,.5);return g.combatStats(p).attackSpeed-base;};
 g.entities=[p,...sources];
 assert.equal(sample(),-10);
 g.entities.reverse();assert.equal(sample(),-10);
 sources[0].x+=2000;assert.equal(sample(),-10);
 sources[2].x+=2000;assert.equal(sample(),-40);
 g._kill(sources[1],null);assert.equal(sample(),-40);
 g._kill(sources[3],null);assert.equal(sample(),0);
});
test('Helm of the Hivemind counts both teams and dead holders while excluding their illusions',()=>{
 const {g,p,e}=setup([]),item='helm_of_the_hivemind';
 const initialHp=p.maxHp;
 p.neutralItem=item;g._refreshHero(p);
 assert.equal(p.castRangeBonus,200);assert.ok(Math.abs(p.maxHp-initialHp*.92)<1e-9);
 const [illusion]=createIllusions(g,p,1,10);assert.equal(illusion.neutralItem,item);
 e.neutralItem=item;Items.tickUnit(g,p,.05);
 assert.equal(p.castRangeBonus,280);assert.ok(Math.abs(p.maxHp-initialHp*.84)<1e-9);
 g._kill(e,null);Items.tickUnit(g,p,.05);
 assert.equal(p.castRangeBonus,280);assert.ok(Math.abs(p.maxHp-initialHp*.84)<1e-9);
 e.neutralItem=null;Items.tickUnit(g,p,.05);
 assert.equal(p.castRangeBonus,200);assert.ok(Math.abs(p.maxHp-initialHp*.92)<1e-9);
});
test('Red Ledger exposes a real shared-trait hit list and pays each bounty once before rerolling',()=>{
 const create=()=>{const scene=setup([]),{g,e}=scene;
  const extra=g._makeHero('kunkka',e.team,1,false,1);extra.x=e.x;extra.y=e.y;g.entities.push(extra);return scene;};
 const {g,p,e}=create();p.neutralItem='red_ledger';
 Items.tickUnit(g,p,.1);const state=Items.itemState(g,p,0,'neutral');
 assert.ok(state.bountyTrait?.name);assert.equal(state.bountyTargets.length,2);assert.ok(e.statuses['redLedgerWanted:'+p.id]);
 const gold=p.gold,baseline=create(),baseGold=baseline.p.gold;
 baseline.g._kill(baseline.e,baseline.p);g._kill(e,p);
 assert.equal(p.gold-gold,baseline.p.gold-baseGold+50);assert.ok(p.neutralItemMeta.closed.includes(e.id));
});
test('Red Ledger can include Weaver in its real shared blue-hero bounty',()=>{
 const {g,p}=setup([]),e=g._makeHero('axe',1,1,false,0),weaver=g._makeHero('weaver',1,1,false,1),maiden=g._makeHero('crystal_maiden',1,1,false,2);
 g.entities=[p,e,weaver,maiden];p.neutralItem='red_ledger';g._index();
 let state;
 for(let i=0;i<200;i++){
  g._random=()=>i/200;p.neutralItemMeta={};Items.tickUnit(g,p,.1);state=Items.itemState(g,p,0,'neutral');
  if(state.bountyTrait?.id==='Blue')break;
 }
 assert.equal(state.bountyTrait?.id,'Blue','Weaver and Crystal Maiden must be eligible for a shared blue-hero bounty');
 assert.deepEqual(new Set(state.bountyTargets.map(t=>t.id)),new Set([weaver.id,maiden.id]));
 assert.ok(weaver.statuses['redLedgerWanted:'+p.id]);assert.ok(maiden.statuses['redLedgerWanted:'+p.id]);
 assert.ok(!e.statuses['redLedgerWanted:'+p.id]);
});
test('Foragers Kit collects each actual consumable and their stacks grant and consume the correct bonuses',()=>{
 for(const [roll,id]of [[0,'foragers_stats'],[.25,'foragers_mana'],[.5,'foragers_health']]){const {g,p}=setup([]);p.neutralItem='foragers_kit';g._refreshHero(p);plantTree(g,p);const tree=g.plantedTrees[0];p.neutralItemMeta.forageTrees=[tree];p.neutralItemMeta.nextTreeAt=999;g._random=()=>roll;Items.tickUnit(g,p,.1);g.time=.75;Items.tickUnit(g,p,.75);assert.ok(p.inventory.includes(id),id);assert.equal(p.neutralItemMeta.procReadyAt,50.75);}
 const {g,p,e}=setup(['foragers_stats','foragers_mana','foragers_health']);const initial=p.intelligence;p.inventoryMeta[0].charges=2;g._refreshHero(p);assert.equal(g.useItem(0,p).ok,true);assert.equal(p.intelligence,initial+1);e.team=p.team;e.maxMana=1000;e.mana=0;assert.equal(g.useItem(1,e).ok,true);assert.equal(e.mana,100);e.maxHp=1000;e.hp=100;assert.equal(g.useItem(2,e).ok,true);g.time+=1;Items.tickUnit(g,e,1);assert.equal(e.hp,110);
});
test('Harmonizer switches its actual mana reduction and spell lifesteal as abilities enter cooldown',()=>{
 const {g,p}=setup([]);p.neutralItem='harmonizer';g._refreshHero(p);assert.equal(p.spellLifesteal,0);assert.equal(p.manaCostReduction,28);p.cooldowns[0]=2;Items.tickUnit(g,p,.1);assert.equal(p.spellLifesteal,9);assert.equal(p.manaCostReduction,21);p.cooldowns[0]=0;Items.tickUnit(g,p,.1);assert.equal(p.spellLifesteal,0);
});
test('Tier three Brawny restores sixteen percent of actual attack damage as lifesteal',()=>{
 const {g,p,e}=setup([]);p.neutralEnchantment='enhancement_brawny';p.neutralTier=3;g._refreshHero(p);p.hp=100;Items.afterAttack(g,p,e,{damage:100},100);assert.equal(p.hp,116);
});
test('Bauble boosts Evolved item potency and Desolator applies the actual boosted armor reduction',()=>{
 const {g,p,e}=setup(['desolator']);p.neutralItem='enchanters_bauble';p.neutralEnchantment='enhancement_evolved';p.neutralTier=4;g._refreshHero(p);Items.afterAttack(g,p,e,{damage:100,itemPotency:100},0);assert.ok(Math.abs(e.statuses.corruption.armor+7.32)<1e-9);
});
test('Weak illusions retain their own neutral item instance and trigger Serrated Shiv on attacks',()=>{
 const {g,p,e}=setup([]);p.neutralItem='serrated_shiv';g._refreshHero(p);const [clone]=createIllusions(g,p,1,10);g._random=()=>0;Items.afterAttack(g,clone,e,{damage:0,itemPotency:20},0);assert.equal(e.hp,3600);
});
test('Cheese restores its official health and mana and consumes only one stacked charge',()=>{
 const {g,p}=setup(['cheese']);p.maxHp=p.maxMana=4000;p.hp=p.mana=100;p.inventoryMeta[0].charges=2;assert.equal(g.useItem(0,p).ok,true);assert.equal(p.hp,2600);assert.equal(p.mana,1600);assert.equal(p.inventoryMeta[0].charges,1);
});
test('Refresher Shard resets hero cooldowns while preserving item cooldowns and sharing Refresher cooldown',()=>{
 const {g,p}=setup(['refresher_shard','blink']);p.cooldowns=[10,11,12,13];p.inventoryMeta[1].cooldownRemaining=9;assert.equal(g.useItem(0,p).ok,true);assert.deepEqual(p.cooldowns,[0,0,0,0]);assert.equal(p.inventoryMeta[1].cooldownRemaining,9);assert.equal(p.itemCooldowns.refresher,180);assert.equal(p.inventory[0],null);
});
