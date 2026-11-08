import test from 'node:test';
import assert from 'node:assert/strict';
import {arena} from './skill-arena.mjs';
import {moveItem,sellItem} from '../src/inventory.js';
import {tickUnit,tickWorld,afterAttack,attackModifiers,trueStrike,useItem} from '../src/item-runtime.js';
import {dot,illusion,plantTree} from '../src/item-common.js';
import {tickStatuses,hasStatusFlag} from '../src/hero-runtime.js';
import {ITEM_BY_ID} from '../src/item-data.js';
import {serializeMatch,parseMatch,restoreMatch} from '../src/game-save.js';
import {BASES} from '../src/map-data.js';
const equipped=(id,hero='crystal_maiden')=>{const s=arena(hero,[0,0,0,0]);s.p.inventory=[id];s.p.inventoryMeta=[];s.g._refreshHero(s.p);s.p.hp=s.p.maxHp;s.p.mana=2000;s.p.maxMana=2000;return s;};

test('Mask of Madness grants the correct ranged/melee slow resistance during Berserk',()=>{
 for(const [hero,move,resist]of [['crystal_maiden',6,.15],['ogre_magi',12,.30]]){
  const {g,p}=equipped('mask_of_madness',hero);p.statuses.slow={id:'slow',startedAt:0,until:100,slowPct:50};assert.equal(g.useItem(0,p).ok,true);
  assert.equal(p.statuses['itemBuff:mask_of_madness'].slowResistance,resist*100);
  const expected=p.speed*(1+move/100)*(1-.5*(1-resist));assert.ok(Math.abs(g.combatStats(p).speed-expected)<1e-8);
  g.time=7;assert.ok(Math.abs(g.combatStats(p).speed-p.speed*.5)<1e-8,'the resistance ends with the buff');
 }
});
test('Silver Edge break caps target movement at 200 even with haste/aura bonuses and expires',()=>{
 const {g,p,e}=equipped('silver_edge');e.speed=400;e.buffs.hasteUntil=100;e.itemAura={speed:50};
 afterAttack(g,p,e,{damage:0,breakDuration:5},0);assert.equal(g.combatStats(e).speed,200);assert.ok(e.statuses.itemBreak.break);
 g.time=6;assert.ok(g.combatStats(e).speed>200);
});
test('Refresher cooldown freezes outside the main inventory, while its shared timer stays consistent',()=>{
 const {g,p}=equipped('refresher');assert.equal(g.useItem(0,p).ok,true);const before=p.inventoryMeta[0].cooldownRemaining;
 assert.equal(moveItem(g,p,'inventory',0,'backpack',0).ok,true);g.time+=1;tickUnit(g,p,1);assert.equal(p.backpackMeta[0].cooldownRemaining,before);assert.equal(p.itemCooldowns.refresher,before);
 assert.equal(moveItem(g,p,'backpack',0,'inventory',0).ok,true);g.time+=1;tickUnit(g,p,1);assert.equal(p.inventoryMeta[0].cooldownRemaining,before-1);assert.equal(p.itemCooldowns.refresher,before-1);
});
test('Aeon Disk activates only from player damage and strictly below its threshold',()=>{
 const {g,p,e,c}=equipped('aeon_disk');p.hp=p.maxHp=1000;
 g.damage(p,400,c,'pure');assert.equal(p.hp,600);assert.equal(p.statuses.aeonDisk,undefined);
 p.hp=1000;g.damage(p,300,e,'pure');assert.equal(p.hp,700);assert.equal(p.statuses.aeonDisk,undefined);
 p.hp=1000;p.statuses.shield={id:'shield',itemId:'consecrated_wraps',positive:true,startedAt:0,until:10,barrier:500,barrierType:'all'};g.damage(p,400,e,'pure');assert.equal(p.hp,1000);assert.equal(p.statuses.aeonDisk,undefined);delete p.statuses.shield;
 p.hp=1000;g.damage(p,301,e,'pure');assert.equal(p.hp,700);assert.ok(p.statuses.aeonDisk);assert.ok(p.inventoryMeta[0].cooldownRemaining>0);
});
test('Nullifier can target and purge an invulnerable enemy self-cyclone',()=>{
 const {g,p,e}=equipped('nullifier');e.statuses.cyclone={startedAt:0,until:10,positive:true,invulnerable:true};assert.equal(g.useItem(0,e).ok,true);
 assert.equal(e.statuses.cyclone,undefined);assert.ok(e.statuses['itemDebuff:nullifier']);
});
test('Quelling Blade adds 8/4 damage to nonheroes and duplicate blades do not stack',()=>{
 for(const [hero,bonus]of [['crystal_maiden',4],['ogre_magi',8]]){
  const {g,p,e,c}=equipped('quelling_blade',hero);p.inventory.push('quelling_blade');g._refreshHero(p);
  assert.equal(attackModifiers(g,p,c,{damage:100}).damage,100+bonus);assert.equal(attackModifiers(g,p,e,{damage:100}).damage,100);
 }
});
test('Bloodthorn passive pierces evasion for 60 damage; active uses hero/basic damage and owner true strike',()=>{
 const {g,p,e,c}=equipped('bloodthorn');g._random=()=>0;
 assert.equal(trueStrike(g,p,e),true);const hp=e.hp;afterAttack(g,p,e,{damage:0,itemAttackProcs:[...p.itemAttackProcs]},0);assert.equal(hp-e.hp,60);
 assert.equal(g.useItem(0,e).ok,true);const debuff=e.statuses['itemDebuff:bloodthorn'];assert.ok(debuff);
 c.team=p.team;c.ownerId=p.id;assert.equal(trueStrike(g,c,e),true);delete c.ownerId;assert.equal(trueStrike(g,c,e),false);
 const before=e.hp;afterAttack(g,c,e,{damage:0},0);assert.equal(before-e.hp,25);
 p.inventory=[];p.inventoryMeta=[];g._refreshHero(p);const previous=e.hp;afterAttack(g,p,e,{damage:0},0);assert.equal(previous-e.hp,50);
});
test('Disperser always buffs/dispels its caster, provides 40% resistance and decays both speed effects',()=>{
 const {g,p,e}=equipped('disperser');e.speed=400;p.statuses.bad={id:'bad',positive:false,startedAt:0,until:20,slowPct:25};e.statuses.good={id:'good',positive:true,startedAt:0,until:20,armor:10};
 assert.equal(g.useItem(0,e).ok,true);assert.equal(p.statuses.bad,undefined);assert.equal(e.statuses.good,undefined);
 assert.equal(p.statuses['itemBuff:disperser'].slowResistance,40);assert.equal(p.statuses['itemBuff:disperser'].slowImmune,undefined);
 assert.equal(g.combatStats(p).speed,550);assert.equal(g.combatStats(e).speed,100);
 g.time=2;assert.ok(Math.abs(g.combatStats(p).speed-p.speed*1.5)<1e-8);assert.equal(g.combatStats(e).speed,200);
 g.time=4;assert.equal(g.combatStats(p).speed,p.speed);assert.equal(g.combatStats(e).speed,400);
});
test('Force Staff and Hurricane Pike honor their different ally/enemy cast ranges',()=>{
 const first=equipped('force_staff');first.e.x=first.p.x+800;assert.equal(first.g.useItem(0,first.e).ok,true);
 const second=equipped('force_staff');second.e.team=second.p.team;second.e.x=second.p.x+800;assert.equal(second.g.useItem(0,second.e).ok,false);
 const pike=equipped('hurricane_pike');pike.e.x=pike.p.x+550;assert.equal(pike.g.useItem(0,pike.e).ok,false);
 pike.e.team=pike.p.team;assert.equal(pike.g.useItem(0,pike.e).ok,true);
});
test('Crimson Guard applies to heroes/buildings with ranged hero penalty and per-target lockout',()=>{
 const {g,p,c}=equipped('crimson_guard');c.team=p.team;
 const tower=g._unit('tower',p.team,p.x+100,p.y,{maxHp:1000,range:700});g.entities.push(tower);assert.equal(g.useItem(0,p).ok,true);
 const expected=70+p.maxHp*.02;assert.equal(p.statuses['itemBuff:crimson_guard'].damageBlock,expected-25);assert.equal(tower.statuses['itemBuff:crimson_guard'].damageBlock,expected);assert.equal(c.statuses['itemBuff:crimson_guard'],undefined);
 const ally=g._makeHero('juggernaut',p.team,1,false,1);Object.assign(ally,{x:p.x,y:p.y,inventory:['crimson_guard'],inventoryMeta:[]});g._refreshHero(ally);assert.equal(useItem(g,ally,0,ally).ok,true);assert.equal(tower.statuses['itemBuff:crimson_guard'].damageBlock,expected);
});
test('Pipe barrier cannot be replaced by another caster during its 60-second target lockout',()=>{
 const {g,p,c}=equipped('pipe');c.team=p.team;assert.equal(g.useItem(0,p).ok,true);assert.equal(c.statuses['itemBarrier:pipe'].barrier,425);c.statuses['itemBarrier:pipe'].barrier=100;
 const ally=g._makeHero('juggernaut',p.team,1,false,1);Object.assign(ally,{x:p.x,y:p.y,inventory:['pipe'],inventoryMeta:[]});g._refreshHero(ally);assert.equal(useItem(g,ally,0,ally).ok,true);assert.equal(c.statuses['itemBarrier:pipe'].barrier,100);
});
test('Item damage over time includes its final tick and deals the advertised total',()=>{
 const {g,p,e}=equipped('urn_of_shadows');dot(g,e,ITEM_BY_ID.urn_of_shadows,8,25,p);const hp=e.hp;
 for(let i=1;i<=32;i++){g.time=i*.25;tickStatuses(g,e,.25);}assert.equal(hp-e.hp,200);assert.equal(e.statuses['itemDot:urn_of_shadows'],undefined);
});

test('Chain lightning grants true strike only for successful procs and jumps at .25 second intervals',()=>{
 const {g,p,e,c}=equipped('mjollnir');g._random=()=>.99;assert.equal(trueStrike(g,p,e),false);
 g._random=()=>0;assert.equal(trueStrike(g,p,e),true);const result={damage:0,itemAttackProcs:[...p.itemAttackProcs]};
 afterAttack(g,p,e,result,0);assert.equal(e.hp,3820);assert.equal(c.hp,4000);
 g.time=.24;tickWorld(g,.24);assert.equal(c.hp,4000);
 g.time=.25;tickWorld(g,.01);assert.equal(c.hp,3820);assert.equal(g.itemZones.length,0);
});
test('Chain lightning continues from a dead primary and survives pause/save/restore without duplicate hits',()=>{
 const {g,p,e,c}=equipped('mjollnir');g._random=()=>0;trueStrike(g,p,e);const result={damage:0,itemAttackProcs:[...p.itemAttackProcs]};
 e.hp=0;e.dead=true;e.deathTime=0;afterAttack(g,p,e,result,0);assert.equal(c.hp,4000);
 const restored=restoreMatch(parseMatch(serializeMatch(g)));restored.step(10);assert.equal(restored.time,0);assert.equal(restored.entities.find(x=>x.id===c.id).hp,4000);
 restored.setPaused(false);restored.step(.25);assert.equal(restored.entities.find(x=>x.id===c.id).hp,3820);restored.step(.5);assert.equal(restored.entities.find(x=>x.id===c.id).hp,3820);
});
test('Meteor lands .5 seconds after its channel and burns for six full ticks; interruption prevents impact',()=>{
 const {g,p,e}=equipped('meteor_hammer');assert.equal(g.useItem(0,e).ok,true);g.step(2.49);assert.equal(e.hp,4000);assert.ok(g.itemZones.some(z=>z.type==='itemMeteor'));
 const restored=restoreMatch(parseMatch(serializeMatch(g)));restored.setPaused(false);restored.step(.01);const enemy=restored.entities.find(x=>x.id===e.id);
 assert.ok(Math.abs(enemy.hp-(4000-130*1.1))<1e-6);assert.equal(enemy.statuses['itemSlow:meteor_hammer'].slowPct,20);
 restored.step(6);assert.ok(Math.abs(enemy.hp-(4000-430*1.1))<1e-6);assert.equal(enemy.statuses['itemDot:meteor_hammer'],undefined);
 const canceled=equipped('meteor_hammer');canceled.g.useItem(0,canceled.e);canceled.p.statuses.stun={id:'stun',startedAt:0,until:1,stunned:true};canceled.g.step(3);assert.equal(canceled.e.hp,4000);assert.equal(canceled.g.itemZones?.length||0,0);
});
test('Damage block runs before armor and uses only the largest successful block',()=>{
 const {g,p,e}=equipped('vanguard','ogre_magi');p.inventory.push('crimson_guard','vanguard');g._refreshHero(p);p.armor=10;g._random=()=>0;
 p.statuses.shield={id:'shield',startedAt:0,until:10,damageBlock:100,blockChance:100};
 assert.ok(Math.abs(g.damage(p,200,e,'physical',{attack:true})-100/1.6)<1e-8);
 delete p.statuses.shield;assert.ok(Math.abs(g.damage(p,200,e,'physical',{attack:true})-125/1.6)<1e-8);
 assert.ok(Math.abs(g.damage(p,200,e,'physical')-200/1.6)<1e-8);
});
test('Mjollnir shield hits the source plus four visible nearby units and cannot recursively proc',()=>{
 const {g,p,e,c}=equipped('mjollnir');g._random=()=>0;assert.equal(g.useItem(0,p).ok,true);
 const extras=Array.from({length:5},(_,n)=>g._unit('creep',e.team,p.x+200+n*20,p.y,{maxHp:1000,armor:0,magicResistance:0}));g.entities.push(...extras);
 g.damage(p,10,e,'pure');assert.equal(e.hp,3775);assert.equal(c.hp,4000);assert.equal(extras.filter(x=>x.hp===775).length,4);assert.equal(extras[4].hp,1000);
 const hp=e.hp;g.time=2;g.damage(p,10,e,'pure',{reflected:true});assert.equal(e.hp,hp);
});

test('Mute blocks item use while preserving passive pierce, armor block and status flags remain exact',()=>{
 const {g,p,e}=equipped('mjollnir');p.statuses.mute={id:'mute',startedAt:0,until:10,muted:true};g._random=()=>0;
 assert.equal(g.useItem(0,p).ok,false);assert.equal(trueStrike(g,p,e),true);
 p.statuses.raw={startedAt:0,until:10,slowPct:10};assert.equal(hasStatusFlag(g,p,'invisible'),false);assert.equal(g.canSee(e,p),true);
});
test('Magic item procs use spell amplification/lifesteal while mana burn and cleave remain attack damage',()=>{
 const {g,p,e,c}=equipped('monkey_king_bar','ogre_magi');p.spellAmp=50;p.spellLifesteal=20;p.hp=100;g._random=()=>0;
 trueStrike(g,p,e);afterAttack(g,p,e,{damage:0,itemAttackProcs:[...p.itemAttackProcs]},0);assert.equal(e.hp,3895);assert.equal(p.hp,121);
 p.inventory=['diffusal_blade','diffusal_blade','bfury','quelling_blade'];p.inventoryMeta=[];g._refreshHero(p);p.spellAmp=50;p.spellLifesteal=20;p.hp=100;e.mana=100;c.x=p.x+300;c.y=p.y;p.angle=0;
 assert.equal(attackModifiers(g,p,c,{damage:100}).damage,110);afterAttack(g,p,e,{damage:100},0);assert.equal(e.mana,60);assert.equal(e.hp,3855);assert.equal(c.hp,3960);assert.equal(p.hp,100);
});
test('Revenant Brooch snapshots one proc roll and uses 80% of attack damage as amplified magic',()=>{
 const {g,p,e}=equipped('revenants_brooch','ogre_magi');g._random=()=>0;p.spellAmp=50;p.hp=100;
 const result=attackModifiers(g,p,e,{damage:100});assert.equal(result.damage,100);assert.equal(result.broochDamage,80);g._random=()=>.99;
 afterAttack(g,p,e,result,0);assert.equal(e.hp,3880);assert.equal(p.hp,118);
});
test('Orb of Corrosion uses target attack type and its armor reduction expires after three seconds',()=>{
 const {g,p,e}=equipped('orb_of_corrosion','ogre_magi');afterAttack(g,p,e,{damage:0},0);
 assert.equal(e.statuses['itemSlow:orb_of_corrosion'].slowPct,16);assert.equal(g.combatStats(e).armor,-2);g.time=3.01;assert.equal(g.combatStats(e).armor,0);
});
test('Echo Sabre slows both attacks and shares its five-second proc cooldown with Harpoon',()=>{
 const {g,p,e}=equipped('echo_sabre','ogre_magi');p.inventory.push('harpoon');g._refreshHero(p);
 afterAttack(g,p,e,{damage:0},0);assert.equal(p.echoSecondAttack,true);assert.ok(p.inventoryMeta.every(m=>m.echoReadyAt===5));
 g.time=.2;afterAttack(g,p,e,{damage:0},0);assert.equal(p.echoSecondAttack,false);assert.equal(e.statuses['itemSlow:echo_sabre'].until,1);
});
test('Dominator preserves innate regen, awards capture bounty, locks after damage and kills its unit on sale',()=>{
 const {g,p,e,c}=equipped('helm_of_the_dominator');Object.assign(c,{goldMin:40,goldMax:40,xpBounty:50,hpRegen:3,manaRegen:2});g._random=()=>0;const gold=p.gold,xp=p.xp;
 assert.equal(g.useItem(0,c).ok,true);assert.equal(c.hpRegen,15);assert.equal(c.manaRegen,6);assert.equal(p.gold,gold+20);assert.equal(p.xp,xp+25);
 const enemy=g._unit('creep',e.team,p.x+100,p.y,{name:'Test creep',maxHp:1000});g.entities.push(enemy);g.damage(c,10,e,'pure');p.itemCooldowns={};p.inventoryMeta[0].cooldownRemaining=0;
 assert.equal(g.useItem(0,enemy).ok,false);g.time=3;assert.equal(g.useItem(0,enemy).ok,true);assert.equal(c.dead,true);
 Object.assign(p,BASES[p.team]);assert.equal(sellItem(g,p,'inventory',0).ok,true);assert.equal(enemy.dead,true);
});
test('Overlord grants the higher bounty and skill level; captured stomp hits enemies rather than allies',()=>{
 const {g,p,e}=equipped('helm_of_the_overlord');const neutral=g._makeNeutral('centaur_khan',{x:p.x+100,y:p.y},{id:'test',x:p.x,y:p.y});g._random=()=>0;const gold=p.gold,bounty=neutral.goldMin;
 assert.equal(g.useItem(0,neutral).ok,true);assert.equal(p.gold,gold+bounty);assert.equal(neutral.abilityLevelBonus,1);const hp=e.hp,ownHp=p.hp;g._index();g._neutralAbility(neutral,e);
 assert.equal(hp-e.hp,50);assert.equal(p.hp,ownHp);const before=e.gold;g.damage(neutral,99999,e,'pure');assert.equal(e.gold,before+250);
});
test('Radiance illusions burn for 35 per second, use the strongest aura once and stop on expiry',()=>{
 const {g,p,e}=equipped('radiance');const clones=illusion(g,p,2,5,28,300);p.inventory=[];p.inventoryMeta=[];g._refreshHero(p);tickWorld(g,1);
 assert.equal(e.hp,3965);assert.equal(e.itemAura.radiance.dps,35);p.inventory=['radiance'];p.inventoryMeta=[];g._refreshHero(p);tickWorld(g,1);assert.equal(e.hp,3905);
 p.inventoryMeta[0].mode='off';clones.forEach(c=>{c.dead=true;c.hp=0;});tickWorld(g,1);assert.equal(e.hp,3905);assert.equal(e.itemAura.radiance,undefined);
});
test('Smoke works from backpack, covers controlled units, resists true sight and spreads once per friend',()=>{
 const {g,p,e,c}=equipped('smoke_of_deceit');e.x=p.x+2000;c.x=p.x+1500;c.team=p.team;assert.equal(moveItem(g,p,'inventory',0,'backpack',0).ok,true);const clone=illusion(g,p,1,60,28,300)[0];
 assert.equal(useItem(g,p,0,p,'backpack').ok,true);assert.ok(clone.statuses['itemBuff:smoke_of_deceit']);e.trueSight=3000;assert.equal(g.canSee(e,p),false);
 c.ownerId=p.id;c.x=p.x+200;tickWorld(g,.1);assert.ok(c.statuses['itemBuff:smoke_of_deceit']);delete c.statuses['itemBuff:smoke_of_deceit'];tickWorld(g,.1);assert.equal(c.statuses['itemBuff:smoke_of_deceit'],undefined);
 attackModifiers(g,p,e,{damage:0});assert.equal(p.statuses['itemBuff:smoke_of_deceit'],undefined);
});
test('Shiva expands at 400 units per second, follows its caster and damages each enemy once',()=>{
 const {g,p,e}=equipped('shivas_guard');e.x=p.x+500;e.radius=0;assert.equal(g.useItem(0,p).ok,true);assert.equal(e.hp,4000);
 g.time=1;tickWorld(g,1);assert.equal(e.hp,4000);p.x+=100;g.time=1.01;tickWorld(g,.01);assert.equal(e.hp,3775);
 g.time=2;tickWorld(g,.99);assert.equal(e.hp,3775);assert.equal(e.statuses['itemSlow:shivas_guard'].slowPct,40);
});
test('Harpoon waits for its projectile, pulls ranged units by 35%, brings melee targets into range and supports trees',()=>{
 for(const hero of ['crystal_maiden','ogre_magi']){
  const {g,p,e}=equipped('harpoon',hero);e.x=p.x+600;const start=p.x;assert.equal(g.useItem(0,e).ok,true);g.time=.29;tickWorld(g,.29);assert.equal(p.forcedMotion,undefined);
  g.time=.3;tickWorld(g,.01);assert.equal(e.statuses['itemSlow:harpoon'],undefined,'the slow belongs to Echo Strike, not Draw Forth');
  const endGap=e.forcedMotion.to.x-p.forcedMotion.to.x;assert.ok(Math.abs(p.forcedMotion.to.x-start-210)<1e-6);assert.ok(Math.abs(endGap-(p.range<=300?Math.max(100,p.range):180))<1e-6);
 }
 const {g,p}=equipped('harpoon');const tree={x:p.x+300,y:p.y};plantTree(g,tree);assert.equal(g.useItem(0,tree).ok,true);g.time=.15;tickWorld(g,.15);assert.ok(p.forcedMotion);assert.ok(Math.hypot(p.forcedMotion.to.x-tree.x,p.forcedMotion.to.y-tree.y)<100);
});
