import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/engine.js';
import { botProfile,resetBotTiming } from '../src/bot-ai.js';
import * as Skills from '../src/hero-runtime.js';
import * as Inventory from '../src/inventory.js';
import * as ItemRuntime from '../src/item-runtime.js';

function arena(difficulty='hell',hero='ogre_magi',enemies=['juggernaut']){
  const g=new Game({difficulty,seed:17}),bot=g._makeHero(hero,1,0,false,0);
  const opponents=enemies.map((id,i)=>g._makeHero(id,0,i%3,true,i));
  for(const [i,h] of [bot,...opponents].entries())Object.assign(h,{
    x:10400+i*250,y:10400,isHuman:h.team===0,aiTimer:h.team===1?0:Infinity,
    abilityLevels:[0,0,0,0],skillPoints:0,talentPoints:0,gold:0,mana:0,
    hpRegen:0,manaRegen:0,attackCooldown:999,botShop:{nextAt:Infinity,needsShop:false}
  });
  g.entities=[bot,...opponents];g.nextWave=Infinity;g.nextNeutralSpawn=Infinity;g.roshanRespawnAt=Infinity;
  for(const c of g.camps)c.nextSpawn=Infinity;
  g._index();return {g,bot,opponents};
}
function equip(g,h,items){h.inventory=items;Inventory.ensureInventory(h);g._refreshHero(h);h.mana=h.maxMana;}

test('hell acquires a newly visible enemy faster than hard without changing hero economy',()=>{
  function acquisition(difficulty){
    const {g,bot,opponents:[enemy]}=arena(difficulty,'axe');
    g.entities=[bot];g._index();g._botTick(bot,0);
    g.entities.push(enemy);g._index();
    for(let i=0;i<12;i++){g.time+=.01;g._botTick(bot,.01);if(bot.targetId===enemy.id)return g.time;}
    return Infinity;
  }
  const hard=acquisition('hard'),hell=acquisition('hell');
  assert.ok(hell<=.03&&hell<hard*.6,`hard=${hard}, hell=${hell}`);
  const stats=difficulty=>new Game({difficulty,seed:17}).entities.filter(h=>h.kind==='hero').map(h=>[h.heroId,h.team,h.maxHp,h.maxMana,h.damage,h.armor,h.gold]);
  assert.deepEqual(stats('hell'),stats('hard'));
});

test('invalid difficulty keeps normal decisions and allied hard bots keep their own profile',()=>{
  const {g,bot}=arena('unknown');
  assert.equal(botProfile(g,bot),botProfile({difficulty:'normal'},bot));
  bot.team=0;bot.aiDifficulty='hard';
  assert.equal(botProfile({difficulty:'hell'},bot),botProfile({difficulty:'hard'},{team:1}));
});

test('hell uses the real Scepter cast point when deciding whether a visible teleport can still be interrupted',()=>{
 for(const remaining of [.3,.4]){
  const {g,bot,opponents:[wounded,channeler]}=arena('hell','ogre_magi',['juggernaut','crystal_maiden']);
  equip(g,bot,['ultimate_scepter']);Object.assign(bot,{abilityLevels:[1,0,0,0],mana:1000,speed:0});
  wounded.hp=wounded.maxHp*.1;wounded.speed=0;Object.assign(channeler,{x:bot.x+320,speed:0,mana:200});
  const anchor=g._unit('tower',0,18000,18000,{maxHp:1800,range:700,tier:1,lane:1,attackCooldown:999});g.entities.push(anchor);
  channeler.tp=['tpscroll'];channeler.tpMeta=[Inventory.createMeta(channeler,'tpscroll')];
  assert.ok(ItemRuntime.useItem(g,channeler,0,anchor,'tp').ok);
  g.time=channeler.itemChannel.until-remaining;g._index();g._botTick(bot,0);
  if(remaining===.3){
   assert.equal(bot.targetId,wounded.id,'the real .3375s cast cannot interrupt a teleport with .3s left');
  }else{
   assert.equal(bot.targetId,channeler.id);assert.ok(bot.castPhase.executeAt<channeler.itemChannel.until);
   g.step(.41);assert.equal(channeler.itemChannel,null);assert.ok(g.isStunned(channeler));assert.ok(channeler.x<12000);
  }
 }
});

test('hell Chaos Knight interrupts a visible Freezing Field before summoning or focusing a wounded enemy',()=>{
  const {g,bot,opponents:[wounded,maiden]}=arena('hell','chaos_knight',['juggernaut','crystal_maiden']);
  Object.assign(bot,{abilityLevels:[1,0,0,1],mana:1000,speed:0});
  Object.assign(wounded,{hp:wounded.maxHp*.2,speed:0});Object.assign(maiden,{abilityLevels:[0,0,0,1],mana:1000,speed:0});
  assert.ok(g._cast(maiden,3,maiden).ok);g.time=.2;Skills.tickHeroAbilities(g,maiden,.2);
  assert.ok(maiden.channel?.kind==='freezing');
  g._botTick(bot,0);
  assert.equal(bot.castPhase?.index,0,'save Phantasm until the dangerous channel is interrupted');
  assert.equal(bot.castPhase?.targetId,maiden.id);
  g.step(1.2);assert.equal(maiden.channel,null,'the actual Chaos Bolt must stop the channel');
});

test('hell preserves BKB against a nearby hero without an incoming spell threat',()=>{
  const {g,bot}=arena('hell','crystal_maiden');equip(g,bot,['black_king_bar']);
  g._botTick(bot,0);
  assert.equal(bot.inventoryMeta[0].cooldownRemaining,0);
  assert.equal(Skills.debuffImmune(g,bot),false);
});

for(const difficulty of ['nightmare','hell'])test(`${difficulty} activates owned BKB before a visible long-range Chaos Bolt arrives`,()=>{
  const {g,bot,opponents:[enemy]}=arena(difficulty,'crystal_maiden',['chaos_knight']);
  equip(g,bot,['black_king_bar']);equip(g,enemy,['aether_lens']);Object.assign(enemy,{x:bot.x+720,abilityLevels:[1,0,0,0],mana:1000});g._index();
  assert.ok(g._cast(enemy,0,bot).ok);g.time=.5;Skills.tickWorldAbilities(g);
  assert.ok(g.pendingSpells.some(s=>s.type==='chaos:bolt'&&s.targetId===bot.id));
  g._botTick(bot,0);
  assert.ok(Skills.debuffImmune(g,bot));assert.ok(bot.inventoryMeta[0].cooldownRemaining>0);
  g.step(.7);assert.equal(g.isStunned(bot),false,'BKB must prevent the real incoming stun');
});

test('hell dispels a real Orchid silence at healthy hit points with its owned Manta',()=>{
  const {g,bot,opponents:[enemy]}=arena('hell','drow_ranger',['ogre_magi']);
  equip(g,bot,['manta']);equip(g,enemy,['orchid']);
  assert.ok(ItemRuntime.useItem(g,enemy,0,bot).ok);assert.ok(Skills.hasStatusFlag(g,bot,'silenced'));
  g._botTick(bot,0);
  assert.equal(Skills.hasStatusFlag(g,bot,'silenced'),false);assert.ok(bot.inventoryMeta[0].cooldownRemaining>0);
});

test('hell keeps targeted Fireblast while Lotus Orb reflection is active',()=>{
  const {g,bot,opponents:[enemy]}=arena('hell','ogre_magi');
  Object.assign(bot,{abilityLevels:[1,0,0,0],mana:1000});equip(g,enemy,['lotus_orb']);
  assert.ok(ItemRuntime.useItem(g,enemy,0,enemy).ok);assert.ok(Skills.hasStatusFlag(g,enemy,'spellReflect'));
  g._botTick(bot,0);
  assert.ok(!bot.castPhase,'do not reflect a targeted stun back into the bot');assert.equal(bot.cooldowns[0],0);
  g.time=7;bot.aiTimer=0;g._botTick(bot,0);assert.equal(bot.castPhase?.index,0,'resume the spell once visible reflection expires');
});

test('hell breaks a real Linken sphere with Ignite and then lands Fireblast',()=>{
  const {g,bot,opponents:[enemy]}=arena('hell','ogre_magi');
  Object.assign(bot,{abilityLevels:[1,1,0,0],mana:1000,speed:0});equip(g,enemy,['sphere']);enemy.speed=0;
  g._botTick(bot,0);
  assert.equal(bot.castPhase?.index,1,'spend the secondary debuff to preserve the hard control');
  assert.equal(bot.cooldowns[0],0);
  g.step(1.2);
  assert.ok(enemy.inventoryMeta[0].cooldownRemaining>0,'the secondary projectile must consume the actual spell block');
  assert.ok(g.isStunned(enemy),'Fireblast must follow after the block is removed');assert.ok(bot.cooldowns[0]>0);
});

test('hell ranged bots make space before an observed approaching melee hero reaches them',()=>{
  const {g,bot,opponents:[enemy]}=arena('hell','drow_ranger');
  bot.attackCooldown=.8;enemy.x=bot.x+440;g._index();g._botTick(bot,0);
  g.time=.2;g._move(enemy,bot,.2,0);g._index();
  const before=Math.hypot(bot.x-enemy.x,bot.y-enemy.y);assert.ok(before>350);
  g._botTick(bot,.2);
  assert.ok(Math.hypot(bot.x-enemy.x,bot.y-enemy.y)>before,'create attack-cooldown space from the visible approach');
});

test('hell aims a newly ready Multishot ahead of motion observed before the skill was available',()=>{
  const {g,bot,opponents:[enemy]}=arena('hell','drow_ranger');
  enemy.x=bot.x+250;g._index();g._botTick(bot,0);
  g.time=1.2;g._move(enemy,{x:enemy.x+400,y:enemy.y+200},1.2,0);g._index();
  Object.assign(bot,{abilityLevels:[0,0,1,0],mana:1000});g._botTick(bot,1.2);
  assert.equal(bot.channel?.index,2);
  assert.ok(Math.atan2(bot.channel.dir.y,bot.channel.dir.x)>Math.atan2(enemy.y-bot.y,enemy.x-bot.x)+.001,'lead the visible sideways motion on the first available cast');
});

test('hell protects itself with real BKB when visible Chaos Bolt threatens its Freezing Field',()=>{
  const {g,bot,opponents:[enemy]}=arena('hell','crystal_maiden',['chaos_knight']);
  equip(g,bot,['black_king_bar']);Object.assign(bot,{abilityLevels:[0,0,0,1],mana:1000});
  equip(g,enemy,['aether_lens']);Object.assign(enemy,{x:bot.x+720,abilityLevels:[1,0,0,0],mana:1000});g._index();
  assert.ok(g._cast(bot,3,bot).ok);assert.ok(g._cast(enemy,0,bot).ok);g.time=.5;Skills.tickWorldAbilities(g);
  g._heroTick(bot,.01);
  assert.ok(Skills.debuffImmune(g,bot));assert.equal(bot.channel,null,'owned BKB follows the runtime channel-interruption rule');
});

test('hell keeps Frostbite for a real allied Chaos Bolt in flight after bot timing is reset',()=>{
  const {g,bot,opponents:[enemy]}=arena('hell','chaos_knight');
  const maiden=g._makeHero('crystal_maiden',1,1,false,1);
  Object.assign(bot,{abilityLevels:[1,0,0,0],mana:1000,speed:0});
  Object.assign(maiden,{x:bot.x+40,y:bot.y,abilityLevels:[0,1,0,0],mana:1000,speed:0,aiTimer:0,gold:0,skillPoints:0,talentPoints:0,attackCooldown:999,botShop:{nextAt:Infinity,needsShop:false}});
  Object.assign(enemy,{x:bot.x+400,speed:0});g.entities.push(maiden);g._index();
  assert.ok(g._cast(bot,0,enemy).ok);g.time=.5;Skills.tickWorldAbilities(g);resetBotTiming(g);
  assert.ok(g.pendingSpells.some(s=>s.type==='chaos:bolt'));g._botTick(maiden,0);
  assert.ok(!maiden.castPhase,'do not overlap a friendly control projectile after rebuilding plans');
  g.step(.6);assert.ok(g.isStunned(enemy));assert.equal(g.isRooted(enemy),false);
});

test('a disabled hell bot keeps its channel and owned BKB untouched despite an incoming spell',()=>{
  const {g,bot,opponents:[enemy]}=arena('hell','crystal_maiden',['chaos_knight']);
  equip(g,bot,['black_king_bar']);Object.assign(bot,{abilityLevels:[0,0,0,1],mana:1000,aiTimer:Infinity});
  equip(g,enemy,['aether_lens']);Object.assign(enemy,{x:bot.x+720,abilityLevels:[1,0,0,0],mana:1000});g._index();
  assert.ok(g._cast(bot,3,bot).ok);assert.ok(g._cast(enemy,0,bot).ok);g.time=.5;Skills.tickWorldAbilities(g);
  g._heroTick(bot,.01);
  assert.equal(Skills.debuffImmune(g,bot),false);assert.equal(bot.inventoryMeta[0].cooldownRemaining,0);assert.equal(bot.channel?.kind,'freezing');
});

test('hell does not select or react to a hidden caster channel',()=>{
  const {g,bot,opponents:[visible,hidden]}=arena('hell','ogre_magi',['juggernaut','crystal_maiden']);
  Object.assign(bot,{abilityLevels:[1,0,0,0],mana:1000});equip(g,bot,['black_king_bar']);
  Object.assign(hidden,{abilityLevels:[0,0,0,1],mana:1000});assert.ok(g._cast(hidden,3,hidden).ok);
  Skills.addStatus(g,hidden,'concealed',{duration:8,positive:true,invisible:true});assert.equal(g.canSee(bot,hidden),false);
  g._botTick(bot,0);
  assert.equal(bot.targetId,visible.id);assert.equal(bot.castPhase?.targetId,visible.id);assert.equal(bot.inventoryMeta[0].cooldownRemaining,0);
});

for(const difficulty of ['nightmare','hell'])test(`${difficulty} keeps nonpiercing Fireblast against active BKB`,()=>{
  const {g,bot,opponents:[enemy]}=arena(difficulty,'ogre_magi');
  Object.assign(bot,{abilityLevels:[1,0,0,0],mana:1000});equip(g,enemy,['black_king_bar']);assert.ok(ItemRuntime.useItem(g,enemy,0,enemy).ok);
  g._botTick(bot,0);assert.ok(!bot.castPhase);assert.equal(bot.cooldowns[0],0);
});

test('hell Axe uses its real immunity-piercing Call against active BKB',()=>{
  const {g,bot,opponents:[enemy]}=arena('hell','axe');
  Object.assign(bot,{abilityLevels:[1,0,0,0],mana:1000,speed:0});enemy.x=bot.x+150;
  equip(g,enemy,['black_king_bar']);assert.ok(ItemRuntime.useItem(g,enemy,0,enemy).ok);g._index();
  g._botTick(bot,0);assert.equal(bot.castPhase?.index,0);
  g.step(.5);assert.ok(enemy.buffs.tauntUntil>g.time);assert.equal(enemy.buffs.tauntSourceId,bot.id);
});

test('hell interrupts an actually Frostbitten Freezing Field caster instead of waiting for its root to expire',()=>{
  const {g,bot,opponents:[enemy]}=arena('hell','ogre_magi',['crystal_maiden']);
  const ally=g._makeHero('crystal_maiden',1,1,false,1);
  Object.assign(bot,{abilityLevels:[1,0,0,0],mana:1000,speed:0});Object.assign(enemy,{abilityLevels:[0,0,0,1],mana:1000,speed:0});
  Object.assign(ally,{x:bot.x+40,y:bot.y,abilityLevels:[0,1,0,0],mana:1000,aiTimer:Infinity});g.entities.push(ally);g._index();
  assert.ok(g._cast(enemy,3,enemy).ok);assert.ok(g._cast(ally,1,enemy).ok);g.time=.4;Skills.tickWorldAbilities(g);
  assert.ok(g.isRooted(enemy));assert.equal(enemy.channel?.kind,'freezing');
  g._botTick(bot,0);assert.equal(bot.castPhase?.index,0,'Frostbite permits casting and must not prevent an interrupt');
  g.step(.5);assert.equal(enemy.channel,null);
});
