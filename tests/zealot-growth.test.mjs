import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine.js';
import {ZEALOT} from '../src/chen-data.js';
import {unitSkill,unitSkillIds} from '../src/unit-skills.js';
import {creatureActiveIds} from '../src/neutral-runtime.js';
import {ownedUnits} from '../src/controlled-units.js';
import {serializeMatch,parseMatch,restoreMatch} from '../src/game-save.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} should equal ${b}`);
function fixture(){
 const g=new Game({hero:'chen'}),p=g.player,z=ownedUnits(g,p).find(e=>e.zealot);
 g.entities=[p,z];g.nextWave=g.nextNeutralSpawn=g.roshanRespawnAt=Infinity;
 Object.assign(p,{x:6000,y:6000,hpRegen:0,attackCooldown:Infinity});Object.assign(z,{x:6080,y:6000,hpRegen:0,attackCooldown:0});g._index();
 return {g,p,z};
}
function levelTo(g,p,level){while(p.level<level)g._addXp(p,p.xpNext-p.xp);}
test('Growth is a visible permanent passive alongside Martyrdom and leaves the official unit definition unchanged',()=>{
 const {g,z}=fixture();assert.deepEqual(ZEALOT.abilities,['chen_martyrdom']);
 assert.deepEqual(unitSkillIds(z),['chen_martyrdom','chen_zealot_growth']);assert.deepEqual(creatureActiveIds(z),['chen_martyrdom']);
 const s=unitSkill(g,z,'chen_zealot_growth');assert.equal(s.name,'成长');assert.equal(s.passive,true);assert.equal(s.activeIndex,-1);
 assert.deepEqual(z.zealotGrowth,{level:1,stacks:0,damage:0,armor:0,magicResistancePct:0,attackSpeed:0});assert.equal(z.statuses.zealotGrowth.undispellable,true);
});
test('real Chen XP upgrades stack the requested bonuses once per new level and affect attacks and incoming magic damage',()=>{
 const {g,p,z}=fixture(),base=g.combatStats(z);
 levelTo(g,p,2);let s=g.combatStats(z);close(s.damage-base.damage,2);close(s.armor-base.armor,1);close(s.magicResistance-base.magicResistance,.02);close(s.attackSpeed-base.attackSpeed,10);
 levelTo(g,p,3);s=g.combatStats(z);close(s.damage-base.damage,5);close(s.armor-base.armor,2.5);close(s.magicResistance-base.magicResistance,.05);close(s.attackSpeed-base.attackSpeed,25);close(s.attackInterval,.8);
 const enemy=g._unit('creep',1,z.x+100,z.y,{maxHp:10000,armor:0,magicResistance:0,speed:0,range:0,attackCooldown:Infinity,abilities:[]});g.entities.push(enemy);g._index();
 assert.equal(g._attack(z,enemy,{attackReleased:true}),true);close(10000-enemy.hp,base.damage+5);
 const hp=z.hp;g.damage(z,100,enemy,'magical');close(hp-z.hp,95);
 for(let i=0;i<4;i++)g._refreshHero(p);assert.deepEqual(g.combatStats(z),s,'recalculating stats does not stack the same upgrade again');
});
test('Growth caps the bonuses at +400 attack speed, +50 armor and +60% magic resistance while damage keeps increasing',()=>{
 const {g,p,z}=fixture();
 for(const [level,damage,armor,mr,as]of [[10,54,27,54,270],[11,65,32.5,60,325],[12,77,38.5,60,385],[13,90,45,60,400],[14,104,50,60,400],[30,464,50,60,400]]){
  levelTo(g,p,level);const growth=z.zealotGrowth;assert.equal(growth.damage,damage);assert.equal(growth.armor,armor);assert.equal(growth.magicResistancePct,mr);assert.equal(growth.attackSpeed,as);
 }
 const combat=g.combatStats(z);close(combat.armor,z.armor+50);close(combat.attackSpeed,z.attackSpeed+400);close(combat.magicResistance,.6);
 const enemy=g._unit('creep',1,z.x+100,z.y,{maxHp:10000,speed:0});g.entities.push(enemy);const hp=z.hp;g.damage(z,100,enemy,'magical');close(hp-z.hp,40);
 const tip=unitSkill(g,z,'chen_zealot_growth');assert.ok(tip.rows.some(([k,v])=>k==='累计攻击伤害'&&v.includes('464')&&v.includes('无上限')));for(const cap of ['400','50','60%'])assert.ok(tip.description.includes(cap));
});
test('multiple level-ups in one XP grant and leveling while the Zealot is dead preserve capped growth on its replacement',()=>{
 const {g,p,z}=fixture();g._kill(z,null);g._addXp(p,1e8);assert.equal(p.level,30);
 g._respawn(p);const next=ownedUnits(g,p).find(e=>e.zealot);assert.notEqual(next.id,z.id);assert.deepEqual(next.zealotGrowth,{level:30,stacks:29,damage:464,armor:50,magicResistancePct:60,attackSpeed:400});
 assert.deepEqual(ZEALOT.abilities,['chen_martyrdom']);assert.equal(unitSkillIds(next).filter(id=>id==='chen_zealot_growth').length,1);
});
test('capped growth survives saves and repairs an older uncapped record without accumulating it again',()=>{
 const {g,p,z}=fixture();levelTo(g,p,14);const restored=restoreMatch(parseMatch(serializeMatch(g)));restored.paused=false;
 const copy=restored.entities.find(e=>e.id===z.id);assert.deepEqual(copy.zealotGrowth,z.zealotGrowth);const before=restored.combatStats(copy);restored.step(.2);assert.deepEqual(restored.combatStats(copy),before);
 Object.assign(copy.zealotGrowth,{armor:52,attackSpeed:520,magicResistancePct:104});restored._refreshHero(restored.player);
 assert.deepEqual(copy.zealotGrowth,{level:14,stacks:13,damage:104,armor:50,magicResistancePct:60,attackSpeed:400});assert.equal(unitSkillIds(copy).filter(id=>id==='chen_zealot_growth').length,1);
});
