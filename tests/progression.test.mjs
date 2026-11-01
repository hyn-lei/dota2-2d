import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const moduleURL=new URL('../src/progression.js',import.meta.url);
async function api(){assert.ok(fs.existsSync(moduleURL),'progression module must exist');return import(moduleURL);}
const hero=()=>({heroId:'kunkka',level:1});
test('normal ranks require 1/3/5/7 and consume exactly one point',async()=>{
 const p=await api(),h=hero();p.initializeProgression(h);
 assert.equal(h.skillPoints,1);assert.equal(p.learnAbility(h,0).ok,true);assert.equal(p.learnAbility(h,1).ok,false);
 h.level=2;p.grantLevelPoints(h,1);assert.equal(p.learnAbility(h,0).ok,false);assert.equal(h.skillPoints,1);
 h.level=3;p.grantLevelPoints(h,2);assert.equal(p.learnAbility(h,0).ok,true);
 h.level=7;p.grantLevelPoints(h,3);assert.equal(p.learnAbility(h,0).ok,true);assert.equal(p.learnAbility(h,0).ok,true);assert.equal(p.learnAbility(h,0).ok,false);
});
test('ultimate ranks require 6/12/18 and rejected requests are atomic',async()=>{
 const p=await api(),h=hero();p.initializeProgression(h);h.skillPoints=20;
 for(const [blocked,allowed,rank]of [[5,6,1],[11,12,2],[17,18,3]]){h.level=blocked;const n=h.skillPoints;assert.equal(p.learnAbility(h,3).ok,false);assert.equal(h.skillPoints,n);h.level=allowed;assert.equal(p.learnAbility(h,3).ok,true);assert.equal(h.abilityLevels[3],rank);}
 assert.equal(p.learnAbility(h,3).ok,false);assert.equal(p.learnAbility(h,99).ok,false);
});
test('talent tiers are exclusive until their later unlock levels',async()=>{
 const p=await api(),h=hero();p.initializeProgression(h);h.skillPoints=20;h.talentPoints=8;h.level=9;
 assert.equal(p.learnTalent(h,0).ok,false);h.level=10;assert.equal(p.learnTalent(h,0).ok,true);assert.equal(p.learnTalent(h,1).ok,false);
 h.level=27;p.grantLevelPoints(h,26);assert.ok(h.talents.includes(1));assert.equal(p.learnTalent(h,1).ok,false);
});
test('attribute levels start at two, require two additional hero levels and cap at seven',async()=>{
 const p=await api(),h=hero();p.initializeProgression(h);h.skillPoints=20;assert.equal(p.learnAttributes(h).ok,false);
 for(let rank=1;rank<=7;rank++){h.level=rank*2;assert.equal(p.learnAttributes(h).ok,true);assert.equal(p.learnAttributes(h).ok,false);}
 assert.equal(h.attributeBonusLevel,7);
});
test('bots spend only legal points and finish a complete rank and talent build by thirty',async()=>{
 const p=await api();for(const heroId of ['axe','juggernaut','kunkka','windranger','crystal_maiden','ogre_magi']){
  const h={heroId,level:1};p.initializeProgression(h);p.autoLearn(h);assert.equal(h.abilityLevels.reduce((a,b)=>a+b,0),1);assert.equal(h.abilityLevels[3],0);
  for(let n=2;n<=30;n++){h.level=n;p.grantLevelPoints(h,n-1);p.autoLearn(h);assert.ok(h.skillPoints>=0);}
  assert.deepEqual(h.abilityLevels,[4,4,4,3]);assert.equal(h.talents.length,8);assert.equal(h.attributeBonusLevel,7);assert.equal(h.skillPoints,0);
 }
});
