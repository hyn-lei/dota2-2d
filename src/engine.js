import { WORLD, BASES, LANES, HEROES, ITEMS, TEAM_COLORS } from './data.js';
import { BUILDING_LAYOUT, CAMP_LAYOUT, TEAM_LANES, LANE_SPAWNS, MAP_OBJECTIVES } from './map-data.js';
import { calculateHeroStats, physicalDamageMultiplier, magicalDamageMultiplier, XP_TO_NEXT } from './hero-stats.js';
import { BUILDING_STATS, NEUTRAL_UNITS, CAMP_GROUPS, LANE_CREEPS, RULES, ROSHAN, NEUTRAL_ABILITIES, getFloodedCampGroup } from './unit-data.js';
import { Navigator } from './navigation.js';
import * as Progression from './progression.js';
import * as Skills from './hero-runtime.js';
import { talentStats } from './ability-data.js';
import * as Inventory from './inventory.js';
import * as ItemRuntime from './item-runtime.js';
import * as Courier from './courier.js';
import { attackVisualFields } from './combat-visuals.js';
import * as Bots from './bot-ai.js';

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
const alive = e => !e.dead && e.hp > 0;
const building = e => ['tower','barracks','ancient','fountain','filler'].includes(e?.kind);
const fighter = e => ['hero','creep','neutral','summon','illusion'].includes(e?.kind);

/** Deterministic game state. Positions use Source world units; time is real seconds. */
export class Game {
  constructor({ hero = 'juggernaut', difficulty = 'normal', seed = 42 } = {}) {
    this.time = 0;
    this.status = 'playing';
    this.paused = false;
    this.winner = null;
    this.score = [0, 0];
    this.entities = [];
    this.effects = [];
    this.pendingSpells = [];
    this.feed = [];
    this.wave = 0;
    this.nextWave = 0;
    this.difficulty = difficulty;
    this.seed = seed >>> 0;
    this.serial = 0;
    this.keyboard = { x:0, y:0 };
    this.grid = new Map();
    this.navigation=new Navigator(undefined,undefined,BUILDING_LAYOUT);
    this.camps = CAMP_LAYOUT.map(c=>({...c, spawnCount:0, blocked:false, nextSpawn:60}));
    this.nextNeutralSpawn = 60;
    this.nextBuildingCheck=0;
    this.selectedId = null;
    this.heroChoice = HEROES[hero] ? hero : 'juggernaut';
    this._makeHero(this.heroChoice, 0, 1, true, 0);
    const choices = Object.keys(HEROES);
    const allies = choices.length >= 5 ? choices.filter(id=>id!==this.heroChoice) : choices;
    for (let i = 0; i < 4; i++) this._makeHero(allies[i % allies.length], 0, [0,2,1,0][i], false, i + 1);
    for (let i = 0; i < 5; i++) this._makeHero(choices[(i + 1) % choices.length], 1, [0,1,2,1,2][i], false, i);
    for(const h of [...this.entities])if(h.kind==='hero')Courier.ensureCourier(this,h);
    for (const layout of BUILDING_LAYOUT) {
      const key=layout.kind==='tower'?`tower${layout.tier}`:layout.kind==='barracks'?`barracks${layout.barracksType==='melee'?'Melee':'Ranged'}`:layout.kind;
      const stats=BUILDING_STATS[key];
      this.entities.push(this._unit(layout.kind,layout.team,layout.x,layout.y,{
        ...layout,...stats,id:this._id(layout.kind),baseArmor:stats.armor,
        selectionRadius:stats.radius,radius:Math.max(...layout.bounds)/2,
        name:layout.kind==='tower'?`${['天辉','夜魇'][layout.team]} ${layout.tier===4?'基地': ['上路','中路','下路'][layout.lane]} ${layout.tier} 塔`:stats.name
      }));
    }
    this.selectedId=this.player.id;
    this._buildingArmor();
    this.roshanPit=1;
    this.roshanRespawnAt=0;
    this._spawnRoshan();
  }

  get player() { return this.entities.find(e => e.isPlayer); }
  get selected() { return this.entities.find(e=>e.id===this.selectedId) || this.player; }
  get courier() { return Courier.ensureCourier(this,this.player); }
  courierCommand(command) { return Courier.courierCommand(this,this.player,command); }
  buyWithCourier(id) { return Courier.buyWithCourier(this,this.player,id); }
  selectEntity(id) { if(this.entities.some(e=>e.id===id)) this.selectedId=id; }

  _id(prefix) { return `${prefix}-${++this.serial}`; }

  _random() {
    this.seed = (Math.imul(1664525, this.seed) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  _unit(kind, team, x, y, stats = {}) {
    const unit = {
      id:this._id(kind), kind, team, x, y, hp:100, maxHp:100, radius:18,
      damage:20, range:60, speed:150, armor:0, attackCooldown:0,
      attackInterval:1, attackFlash:0, dead:false, moving:false, angle:team ? 2.5 : -.6,
      targetId:null, destination:null, magicResistance:0, hpRegen:0, buffs:{}, statuses:{}, ...stats
    };
    unit.hp = unit.maxHp;
    return unit;
  }

  _makeHero(heroId, team, lane, isPlayer, index) {
    const data = HEROES[heroId], base = BASES[team], stats=calculateHeroStats(heroId,1,[]);
    const h = this._unit('hero', team, base.x + (isPlayer ? 0 : (index % 3 - 1) * 34), base.y + (isPlayer ? 0 : (index % 2) * 30 - 15), {
      ...stats, heroId, name:data.name, isPlayer, lane, mana:stats.maxMana, radius:24,
      level:1, xp:0, xpNext:XP_TO_NEXT[1] || 230, gold:600, inventory:[], kills:0, deaths:0,
      assists:0, lastHits:0, cooldowns:[0,0,0,0], respawnTimer:0, recallTimer:0,
      buffs:{}, xMark:null, pathIndex:1, aiTimer:index * .05, retreating:false, lastDamagers:{}
    });
    Progression.initializeProgression(h);
    Inventory.ensureInventory(h);
    h.tp=['tpscroll'];h.tpMeta=[Inventory.createMeta(h,'tpscroll')];
    this._refreshHero(h);
    if(!isPlayer)Progression.autoLearn(h);
    this.entities.push(h);
    return h;
  }

  _refreshHero(h) {
    const hp=h.hp, mana=h.mana, oldHp=h.maxHp, oldMana=h.maxMana;
    const bonus={...talentStats(h.heroId,h.talents||[]),allAttributes:(h.attributeBonusLevel||0)*2};
    bonus.strength=(bonus.strength||0)+(h.innateStrength||0);bonus.agility=(bonus.agility||0)+(h.innateAgility||0);
    Object.assign(h,calculateHeroStats(h.heroId,h.level,[...ItemRuntime.statItems(this,h),{stats:bonus}],h));
    h.hp=h.dead?0:clamp(hp+h.maxHp-oldHp,1,h.maxHp);
    h.mana=clamp(mana+h.maxMana-oldMana,0,h.maxMana);
  }

  setPaused(value) { this.paused = !!value; }

  skill(index,hero=this.player) { return Skills.skillOf(hero,index); }
  combatStats(unit,target=null) { return ItemRuntime.combatStats(this,unit,Skills.combatStats(this,unit,target),target); }
  extraAbilities(hero=this.player) { return Skills.extraAbilities(hero); }
  castExtra(id,point) { return Skills.castExtraAbility(this,this.player,id,point); }
  useItem(index,point,area='inventory') { return ItemRuntime.useItem(this,this.player,index,point,area); }
  itemState(index,area='inventory') { return ItemRuntime.itemState(this,this.player,index,area); }
  blockTargetSpell(caster,target,spell) { return ItemRuntime.blockTargetSpell(this,caster,target,spell); }
  onSpellCast(hero,spell) { ItemRuntime.onSpellCast(this,hero,spell); }
  onSpellTarget(hero,target,spell) { ItemRuntime.onSpellTarget(this,hero,target,spell); }
  onStatusExpired(unit,status) { ItemRuntime.expiredStatus(this,unit,status); }
  canSee(viewer,target) { return viewer.team===target.team||!Skills.hasStatusFlag(this,target,'invisible')||Skills.hasStatusFlag(this,target,'revealed')||this.entities.some(e=>alive(e)&&e.team===viewer.team&&((e.trueSight||0)>distance(e,target)||e.kind==='hero'&&ItemRuntime.statItems(this,e).some(i=>i.id==='gem')&&distance(e,target)<=900)); }
  isStunned(unit) { return Skills.isStunned(this,unit); }
  isRooted(unit) { return Skills.isRooted(this,unit); }
  canLearnAbility(index,hero=this.player) { return Progression.canLearnAbility(hero,index); }
  learnAbility(index) { return this._learn('learnAbility',index); }
  learnTalent(index) { return this._learn('learnTalent',index); }
  learnAttributes() { return this._learn('learnAttributes'); }
  _learn(method,index) {
    if(this.paused||this.status!=='playing')return {ok:false,reason:'当前无法分配技能点'};
    const result=Progression[method](this.player,index);
    if(result.ok)this._refreshHero(this.player);
    return result;
  }

  _canAct(hero = this.player) {
    if (this.status !== 'playing') return { ok:false, reason:'对局已经结束' };
    if (this.paused) return { ok:false, reason:'游戏已暂停' };
    if (!hero || hero.dead) return { ok:false, reason:'阵亡期间无法操作' };
    return { ok:true };
  }

  moveTo(x, y) {
    const p = this.player;
    if (!this._canAct().ok || this._tauntSource(p) || !Number.isFinite(x) || !Number.isFinite(y)) return;
    Skills.interruptCast(this,p,true);
    p.recallTimer = 0;
    p.targetId = null;
    p.explicitTarget = null;
    p.pickupTargetId = null;
    p.destination = this.navigation.nearestWalkable(this._point(x,y));
    p.navPath=null;
  }

  setMovement(x, y) {
    const length = Math.hypot(x, y);
    if (length && (!this._canAct().ok || this._tauntSource(this.player))) return;
    this.keyboard = length && Number.isFinite(length) ? {x:x / length, y:y / length} : {x:0, y:0};
    if (length && this.player && !this.player.dead) {
      Skills.interruptCast(this,this.player,true);
      this.player.recallTimer = 0;
      this.player.explicitTarget = null;
      this.player.targetId = null;
    }
  }

  attackTarget(id) {
    if (!this._canAct().ok || this._tauntSource(this.player)) return;
    const target = this.entities.find(e => e.id === id);
    if (!target || !alive(target) || target.team === this.player.team) return;
    Skills.interruptCast(this,this.player,true);
    this.player.recallTimer = 0;
    this.player.destination = null;
    this.player.explicitTarget = id;
    this.player.targetId = id;
    this.player.navPath=null;
  }

  _point(x, y) { return {x:clamp(x, 25, WORLD.width - 25), y:clamp(y, 25, WORLD.height - 25)}; }

  recall() {
    const check = this._canAct();
    if (!check.ok) return check;
    const p = this.player;
    if (this._tauntSource(p)) return {ok:false, reason:'嘲讽期间无法回城'};
    if(this.isStunned(p)||this.isRooted(p))return {ok:false,reason:'控制期间无法回城'};
    return this.useItem(0,BASES[p.team],'tp');
  }

  buy(itemId) { return this._buy(this.player, itemId); }
  purchaseQuote(itemId) { return Inventory.purchaseQuote(this,this.player,itemId); }
  moveItem(from,index,to,targetIndex) { return Inventory.moveItem(this,this.player,from,index,to,targetIndex); }
  sellItem(area,index) { return Inventory.sellItem(this,this.player,area,index); }
  collectStash() { return Inventory.collectStash(this,this.player); }
  queueItem(id,append=false) { return Inventory.queueItem(this,this.player,id,append); }
  buyQuick() { return Inventory.buyQuick(this,this.player); }
  setCombineLock(area,index,locked) { return Inventory.setCombineLock(this,this.player,area,index,locked); }
  disassembleItem(area,index) { return Inventory.disassembleItem(this,this.player,area,index); }
  dropItem(area,index,point) { return Inventory.dropItem(this,this.player,area,index,point); }
  pickupItem(id) { return Inventory.pickupItem(this,this.player,id); }

  _buy(h, itemId) {
    return Inventory.buyItem(this,h,itemId);
  }

  isProtected(e) {
    if (!e || e.dead) return false;
    if (e.kind==='fountain') return true;
    const towers=this.entities.filter(u=>u.kind==='tower'&&u.team===e.team);
    if (e.kind==='tower'&&e.tier<4) return towers.some(u=>alive(u)&&u.lane===e.lane&&u.tier<e.tier);
    if (e.kind==='barracks') return towers.some(u=>alive(u)&&u.lane===e.lane&&u.tier<=3);
    if ((e.kind==='tower'&&e.tier===4)||e.kind==='filler') return towers.filter(u=>u.tier===3).every(alive);
    if (e.kind==='ancient') return towers.some(u=>alive(u)&&u.tier===4);
    return false;
  }

  _buildingArmor() {
    for(const t of this.entities) if(t.kind==='tower'&&t.tier===4)
      t.armor=t.baseArmor+4*this.entities.filter(b=>b.kind==='barracks'&&b.team===t.team&&alive(b)).length;
  }

  damage(target, amount, source, type='physical', options={}) {
    if (!target || !alive(target) || this.status !== 'playing' || !Number.isFinite(amount) || amount <= 0) return 0;
    if (source && source.team === target.team) return 0;
    if (this.isProtected(target)||target.kind==='droppedItem') return 0;
    if(target.kind==='courier'){
      if(!options.attack||Skills.isInvulnerable(this,target))return 0;
      const hits=source?.kind==='hero'?(source.range>300?3:6):1;target.hp=Math.max(0,target.hp-hits);if(!target.hp)this._kill(target,source);return hits;
    }
    amount=ItemRuntime.outgoingDamage(this,source,amount,type,options);
    const stats=this.combatStats(target);
    let value = amount * (type==='pure'?1:type==='magical'?magicalDamageMultiplier(stats.magicResistance):physicalDamageMultiplier(stats.armor*(1-(options.armorIgnorePct||0)/100)));
    if (building(target) && type==='physical' && source) {
      const attackType=source.attackType || (source.kind==='hero'?'hero':'basic');
      value *= attackType==='siege'?2.5:attackType==='hero'?.5:attackType==='pierce'?.35:.7;
    }
    if(type==='physical'&&target.kind==='hero'){
      if(source?.abilities?.includes('creep_irresolute'))value*=.75;
      if(source?.attackType==='pierce')value*=.5;
    }
    if(type==='physical'&&source?.attackType==='pierce'&&target.kind==='creep'&&!target.siege)value*=1.5;
    if(target.backdoorActive)value*=.5;
    value=Skills.fireShieldDamage(this,target,value,source,options,type);
    value=Skills.incomingDamage(this,target,value,source,type);
    value=ItemRuntime.incomingDamage(this,target,value,source,type,options);
    value=Math.min(target.hp,value);
    target.hp = Math.max(0, target.hp - value);
    ItemRuntime.afterDamage(this,target,value,source,type,options);
    if(target.kind==='neutral' && source && source.team!==2) this._aggroCamp(target.campId,source);
    if (target.kind === 'hero') {
      if(!target.itemChannel)target.recallTimer = 0;
      target.lastDamagers ||= {};
      if (source?.kind === 'hero') target.lastDamagers[source.id] = this.time;
    }
    if (target.hp <= 0) this._kill(target, source);
    return value;
  }

  _kill(target, source) {
    if(target.dead)return;
    if(target.kind==='courier'){Courier.courierDied(this,target,source);return;}
    target.dead = true;
    target.hp = 0;
    target.moving = false;
    target.targetId = null;
    target.destination = null;
    target.deathTime = this.time;
    Skills.onUnitKilled(this,target,source);
    ItemRuntime.onDeath(this,target,source);
    if(building(target))this.navigation.updateBuildings(this.entities.filter(building));
    for (const hero of this.entities) if (hero.xMark?.targetId===target.id || hero===target) hero.xMark=null;
    this._effect('burst', target.x, target.y, {radius:target.radius * 2.5, color:TEAM_COLORS[target.team]||'#cdb28b', life:.7});
    if (target.kind === 'hero') {
      if(target.aegisUntil>this.time){
        target.aegisUntil=0;target.reincarnating=true;target.reincarnationPoint={x:target.x,y:target.y};
        target.respawnTimer=5;target.recallTimer=0;target.buffs={};
        this._feed(`${target.name}将在不朽之守护中重生`,target.team);return;
      }
      target.deaths++;
      target.respawnTimer = [0,12,15,18,21,24,26,28,30,32,34,36,44,46,48,50,52,54,65,70,75,80,85,90,95,100,100,100,100,100,100][target.level];
      target.recallTimer = 0;
      target.explicitTarget = null;
      target.buffs = {};
      if(source?.team===1-target.team) this.score[1-target.team]++;
      if (source?.kind === 'hero') {
        source.kills++;
        source.gold += 210 + target.level * 15;
      }
      for (const h of this.entities) if (h.kind === 'hero' && h.team !== target.team && h.id !== source?.id && target.lastDamagers[h.id] !== undefined && this.time - target.lastDamagers[h.id] < 8) {
        h.assists++;
        h.gold += 65;
      }
      this._feed(`${source?.name || (source?.kind === 'tower' ? '防御塔' : '军团')} 击败了 ${target.name}`, 1 - target.team);
    } else if (target.kind === 'creep' || target.kind==='neutral') {
      if (source?.kind === 'hero') {
        source.lastHits++;
        const gold=Math.floor((target.goldMin||0)+this._random()*((target.goldMax||target.goldMin||0)-(target.goldMin||0)+1));
        source.gold += gold;
        if (source.isPlayer) this._effect('text', target.x, target.y - 60, {text:`+${gold}`, color:'#ead077', life:.8});
      }
      if(target.isRoshan){
        this.roshanRespawnAt=this.time+480+this._random()*180;
        if(source?.kind==='hero'){source.aegisUntil=this.time+300;this._feed(`${source.name}击败肉山，获得不朽之守护`,source.team);}
      }
      if(target.unitId==='mud_golem'){
        const camp={id:target.campId,x:target.campCenter.x,y:target.campCenter.y};
        for(const dx of [-35,35])this._makeNeutral('mud_golem_split',{x:target.x+dx,y:target.y},camp);
      }
    } else if (target.kind === 'tower') {
      for (const h of this.entities) if (h.kind === 'hero' && h.team !== target.team) h.gold += 160;
      this._feed(`${target.name}已被摧毁`,1-target.team);
    } else if(target.kind==='barracks') {
      this._buildingArmor();
      this._feed(`${target.team?'夜魇':'天辉'} ${['上路','中路','下路'][target.lane]}${target.barracksType==='melee'?'近战':'远程'}兵营已摧毁，该路兵线升级`,1-target.team);
    } else if(target.kind==='filler') {
      if(source?.kind==='hero')source.gold+=target.bounty;
    } else if (target.kind === 'ancient') {
      this.winner = 1 - target.team;
      this.status = this.winner === 0 ? 'won' : 'lost';
      this._feed(`${target.team ? '夜魇' : '天辉'}远古遗迹已被摧毁`, this.winner);
    }
    if (fighter(target)) {
      const nearby = this.entities.filter(h => h.kind === 'hero' && alive(h) && h.team !== target.team && distance(h, target) < 1500);
      const xp = (target.kind === 'hero' ? 100 + target.level * 40 : target.xpBounty||0) / Math.max(1, nearby.length);
      for (const h of nearby) this._addXp(h, xp);
    }
  }

  _feed(text, team) {
    this.feed.unshift({text, team, time:this.time});
    this.feed.length = Math.min(this.feed.length, 5);
  }

  _addXp(h, amount) {
    h.xp += amount;
    while (h.xp >= h.xpNext && h.level < 30) {
      h.xp -= h.xpNext;
      const previousLevel=h.level++;
      Progression.grantLevelPoints(h,previousLevel);
      if(!h.isPlayer)Progression.autoLearn(h);
      h.xpNext = XP_TO_NEXT[h.level] || Infinity;
      this._refreshHero(h);
      this._effect('ring', h.x, h.y, {radius:65, color:'#ecd589', life:1});
    }
  }

  _effect(type, x, y, fields = {}) {
    const life = fields.life || .5;
    this.effects.push({id:this._id('fx'), type, x, y, startedAt:this.time, color:'#e9c884', ...fields, life, maxLife:life});
    if (this.effects.length > 250) this.effects.splice(0, this.effects.length - 250);
  }

  cast(index, targetPoint) { return this._cast(this.player, index, targetPoint); }

  _cast(h,index,point) { return Skills.castAbility(this,h,index,point); }
  toggleAutocast(index){
    const h=this.player,s=this.skill(index,h);if(s.kind!=='autocast'||!s.level||!this._canAct(h).ok)return {ok:false,reason:'当前不能切换自动施放'};
    if(h.heroId==='kunkka')return this._cast(h,index,h);
    h.autocast||={};h.autocast[index]=!h.autocast[index];return {ok:true,autocast:h.autocast[index]};
  }

  _spawnWave() {
    this.wave++;
    const time=(this.wave-1)*30,bountyUpgrades=Math.floor(time/450),upgrades=Math.min(30,bountyUpgrades);
    const meleeCount=3+[900,1800,2700].filter(t=>time>=t).length;
    const rangedCount=time>=2400?2:1;
    const types=[...Array(meleeCount).fill('melee'),...Array(rangedCount).fill('ranged')];
    if(time>=300&&time%300===0)types.push(...Array(1+[1800,3600].filter(t=>time>=t).length).fill('siege'));
    for (let team=0;team<2;team++)for(let lane=0;lane<3;lane++)for(let i=0;i<types.length;i++) {
      const type=types[i],upgrade=this.creepUpgrade(team,lane,type),base=LANE_SPAWNS[team][lane];
      const key=upgrade==='normal'?type:upgrade+type[0].toUpperCase()+type.slice(1);
      const flagbearer=type==='melee'&&i===0&&time>=120&&this.wave%2===1&&upgrade==='normal';
      const stats={...LANE_CREEPS[flagbearer?'flagbearer':key]};
      const maxUpgrades=upgrade==='mega'?30:upgrades;
      if(type!=='siege'){
        const superCreep=upgrade!=='normal';
        const hpGain=type==='melee'?(superCreep?19:12):(superCreep?18:12);
        const damageGain=type==='melee'?(superCreep?2:1):(superCreep?3:2);
        stats.maxHp+=hpGain*maxUpgrades;
        stats.damageMin+=damageGain*maxUpgrades;stats.damageMax+=damageGain*maxUpgrades;
        stats.damage=(stats.damageMin+stats.damageMax)/2;
        const goldGain=type==='melee'?(superCreep?1.5:1):(superCreep?6:3);
        stats.goldMin+=goldGain*bountyUpgrades;stats.goldMax+=goldGain*bountyUpgrades;
        if(type==='ranged'&&!superCreep)stats.xpBounty+=8*bountyUpgrades;
      }
      const position=this.navigation.nearestWalkable({x:base.x+(i%2?32:-32),y:base.y+Math.floor(i/2)*48});
      this.entities.push(this._unit('creep',team,position.x,position.y,{
        ...stats,lane,ranged:type!=='melee',siege:type==='siege',flagbearer,upgrade,
        attackType:type==='siege'?'siege':type==='ranged'?'pierce':'basic',
        selectionRadius:stats.radius,radius:type==='siege'?32:16,pathIndex:1,buffs:{}
      }));
    }
  }

  creepUpgrade(team,lane,type) {
    const barracks=this.entities.filter(e=>e.kind==='barracks'&&e.team===1-team);
    if(barracks.length===6&&barracks.every(e=>e.dead))return 'mega';
    const match=barracks.find(e=>e.lane===lane&&e.barracksType===(type==='siege'?'ranged':type));
    return match?.dead?'super':'normal';
  }

  _spawnCamps() {
    for(const camp of this.camps){
      const xs=camp.spawnBox.map(p=>p.x),ys=camp.spawnBox.map(p=>p.y);
      const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
      camp.blocked=this.entities.some(e=>alive(e)&&fighter(e)&&e.x>=minX&&e.x<=maxX&&e.y>=minY&&e.y<=maxY);
      camp.nextSpawn=this.nextNeutralSpawn+60;
      if(camp.blocked)continue;
      const groups=CAMP_GROUPS[camp.type];
      const group=camp.area==='flooded'?getFloodedCampGroup(camp,this.time):groups[Math.floor(this._random()*groups.length)];
      camp.spawnCount++;
      const count=group.reduce((n,u)=>n+u.count,0);let index=0;
      for(const {unitId,count:amount}of group)for(let i=0;i<amount;i++){
        const angle=index++/count*Math.PI*2,position=this.navigation.nearestWalkable({x:camp.x+Math.cos(angle)*90,y:camp.y+Math.sin(angle)*90});
        this._makeNeutral(unitId,position,camp);
      }
    }
  }

  _makeNeutral(unitId,position,camp) {
    const data=NEUTRAL_UNITS[unitId],growth=Math.min(30,Math.floor(this.time/450)),stats={...data};
    stats.maxHp+=30*growth;stats.damageMin+=3*growth;stats.damageMax+=3*growth;stats.damage+=3*growth;
    stats.armor+=.5*growth;stats.goldMin+=growth;stats.goldMax+=growth;stats.xpBounty+=5*growth;
    stats.attackSpeed=stats.baseAttackSpeed+5*growth;stats.attackInterval=stats.baseAttackTime*100/stats.attackSpeed;
    const unit=this._unit('neutral',2,position.x,position.y,{
      ...stats,unitId,campId:camp.id,home:{...position},campCenter:{x:camp.x,y:camp.y},
      selectionRadius:stats.radius,radius:stats.ancient?40:24,aggroUntil:0,returning:false,abilityCooldowns:{},buffs:{},
      attackType:stats.abilities?.includes('creep_piercing')?'pierce':'basic',mana:stats.maxMana||0
    });
    this.entities.push(unit);return unit;
  }

  _spawnRoshan() {
    const point=MAP_OBJECTIVES.npc_dota_roshan_spawner[this.time<900||Math.floor(this.time/300)%2===0?1:0];
    this.entities.push(this._unit('neutral',2,point.x,point.y,{
      ...ROSHAN,unitId:'roshan',isRoshan:true,campId:'roshan',home:{x:point.x,y:point.y},campCenter:{x:point.x,y:point.y},
      radius:80,selectionRadius:110,aggroUntil:0,returning:false,abilityCooldowns:{},buffs:{},attackType:'basic'
    }));
    this.roshanRespawnAt=Infinity;
  }

  _aggroCamp(campId,target) {
    if(!target||!alive(target))return;
    for(const e of this.entities)if(e.kind==='neutral'&&e.campId===campId&&alive(e)&&!e.returning){
      e.targetId=target.id;e.aggroUntil=this.time+7;
    }
  }

  _neutralTick(e,dt) {
    if(e.buffs.stunUntil>this.time)return;
    if(this._tauntedTick(e,dt))return;
    let target=this.entities.find(t=>t.id===e.targetId&&alive(t));
    if(target&&(this.time>e.aggroUntil||distance(e,e.campCenter)>(e.isRoshan?1000:1600))){e.returning=true;target=null;e.targetId=null;}
    if(e.returning){
      this._move(e,e.home,dt,12);
      if(distance(e,e.home)<80){e.returning=false;e.navPath=null;}
      return;
    }
    const daytime=Math.floor(this.time/300)%2===0;
    if(!target&&daytime){
      target=this._near(e,400).find(t=>fighter(t)&&t.team!==2&&t.kind!=='creep');
      if(target)this._aggroCamp(e.campId,target);
    }
    if(!target)return;
    this._neutralAbility(e,target);
    if(!this._attack(e,target))this._move(e,target,dt,e.range+target.radius-3);
  }

  _neutralAbility(e,target) {
    const value=(ability,key,fallback=0)=>{const v=ability.values?.[key];return Number(String(typeof v==='object'?v.value:v??fallback).split(' ')[0])||fallback;};
    for(const name of e.abilities||[]){
      const a=NEUTRAL_ABILITIES[name];
      if(!a||a.passive||(e.abilityCooldowns[name]||0)>this.time)continue;
      const manaCost=Number(String(a.manaCost||0).split(' ')[0]);
      if(manaCost>(e.mana||0))continue;
      const distanceToTarget=distance(e,target),radius=value(a,'radius',250);
      let used=false;
      if(['centaur_khan_war_stomp','polar_furbolg_ursa_warrior_thunder_clap','big_thunder_lizard_slam','roshan_slam','spawnlord_master_stomp'].includes(name)&&distanceToTarget<radius){
        for(const enemy of this._near(e,radius))if(fighter(enemy)&&enemy.team!==2){
          this.damage(enemy,Number(String(a.damage||0).split(' ')[0]),e,'magical');
          if(enemy.buffs){const stun=value(a,'hero_stun_duration',value(a,'stun_duration'));
            if(stun)enemy.buffs.stunUntil=this.time+stun;else enemy.buffs.slowUntil=this.time+value(a,'duration',2);}
        }
        this._effect('burst',e.x,e.y,{radius,life:.7,color:'#d6aa72'});used=true;
      }else if(['harpy_storm_chain_lightning','mud_golem_hurl_boulder','satyr_hellcaller_shockwave','satyr_soulstealer_mana_burn'].includes(name)&&distanceToTarget<=Number(a.castRange||600)){
        const amount=Number(String(a.damage||0).split(' ')[0])||value(a,'damage',value(a,'initial_damage'));
        if(name==='satyr_soulstealer_mana_burn'&&target.mana!==undefined){const burn=Math.min(target.mana,value(a,'mana_burn',100));target.mana-=burn;this.damage(target,burn,e,'magical');}
        else this.damage(target,amount,e,'magical');
        if(name==='mud_golem_hurl_boulder')target.buffs.stunUntil=this.time+value(a,'stun_duration',.6);
        this._effect('beam',e.x,e.y,{tx:target.x,ty:target.y,color:'#b9c8dc',life:.3});used=true;
      }
      if(used){e.mana=(e.mana||0)-manaCost;e.abilityCooldowns[name]=this.time+(Number(String(a.cooldown).split(' ')[0])||10);return;}
    }
  }

  _returnMark(h) { return Skills.returnMark(this,h); }
  _resolveDelayedSpells() { Skills.tickWorldAbilities(this); }

  step(dt) {
    if (this.paused || this.status !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
    let remaining = dt;
    while (remaining > 1e-8 && this.status === 'playing') {
      const delta = Math.min(.05, remaining);
      this._tick(delta);
      remaining -= delta;
    }
  }

  _tick(dt) {
    this.time += dt;
    ItemRuntime.tickWorld(this,dt);
    this._resolveDelayedSpells();
    if (this.time + 1e-7 >= this.nextWave) { this._spawnWave(); this.nextWave += RULES.laneWaveInterval; }
    if (this.time + 1e-7 >= this.nextNeutralSpawn) {this._spawnCamps();this.nextNeutralSpawn+=60;}
    if (this.time>=this.roshanRespawnAt) this._spawnRoshan();
    this.effects = this.effects.filter(fx => (fx.life = fx.startedAt==null ? fx.life-dt : fx.maxLife-(this.time-fx.startedAt)) > 0);
    this._index();
    if(this.time>=this.nextBuildingCheck){this._updateBackdoor();this.nextBuildingCheck=this.time+.25;}
    for (const e of this.entities) {
      e.attackCooldown = Math.max(0,e.attackCooldown - dt);
      e.attackFlash = Math.max(0,e.attackFlash - dt);
      e.moving = false;
      if(e.attackPhase)this._resolveOgreAttack(e);
      ItemRuntime.tickUnit(this,e,dt);
      if(alive(e))Skills.tickStatuses(this,e,dt);
      if (e.kind === 'hero') {
        e.gold += 100 / 60 * dt;
        e.cooldowns = e.cooldowns.map(c => Math.max(0,c - dt));
        if(!e.isPlayer)Bots.maintainBot(this,e);
        if (e.dead) {
          e.respawnTimer = Math.max(0,e.respawnTimer - dt);
          if (e.respawnTimer <= 1e-7) this._respawn(e);
          continue;
        }
        this._heroTick(e, dt);
      }
      if (!alive(e) || this.status !== 'playing') continue;
      if(e.kind!=='hero'){
        e.hp=Math.min(e.maxHp,e.hp+(e.hpRegen||0)*dt);
        if(e.backdoorActive){e.backdoorHealth=Math.max(e.backdoorHealth,e.hp);e.hp=Math.min(e.backdoorHealth,e.hp+90*dt);}
        if(e.maxMana)e.mana=Math.min(e.maxMana,(e.mana||0)+(e.manaRegen||0)*dt);
      }
      if (e.kind === 'tower'||e.kind==='fountain') this._towerTick(e);
      if (e.kind === 'creep') this._creepTick(e,dt);
      if (e.kind === 'neutral') this._neutralTick(e,dt);
      if (e.kind === 'ward') Skills.tickWard(this,e,dt);
    }
    Courier.tickCouriers(this,dt);
    // Keep persistent heroes/buildings for scoreboards; discarded creep corpses fade briefly.
    this.entities = this.entities.filter(e => !['creep','neutral','ward','droppedItem','illusion','summon'].includes(e.kind) || !e.dead || this.time - e.deathTime < 1.1);
  }

  _index() {
    this.grid.clear();
    for (const e of this.entities) if (alive(e)) {
      const key = `${Math.floor(e.x/500)},${Math.floor(e.y/500)}`;
      if (!this.grid.has(key)) this.grid.set(key,[]);
      this.grid.get(key).push(e);
    }
  }

  _updateBackdoor() {
    for(const team of [0,1]){
      const structures=this.entities.filter(e=>building(e)&&e.team===team&&alive(e)&&e.kind!=='fountain'&&!(e.kind==='tower'&&e.tier===1));
      const inBase=structures.filter(e=>!(e.kind==='tower'&&e.tier===2));
      const creeps=this.entities.filter(e=>e.kind==='creep'&&e.team===1-team&&alive(e));
      const baseInvaded=creeps.some(c=>inBase.some(b=>distance(c,b)<=900));
      for(const b of structures){
        const invaded=b.kind==='tower'&&b.tier===2?creeps.some(c=>distance(c,b)<=900):baseInvaded;
        if(invaded)b.backdoorUntil=this.time+15;
        const active=this.time>=(b.backdoorUntil||0);
        if(active&&!b.backdoorActive)b.backdoorHealth=b.hp;
        b.backdoorActive=active;
      }
    }
  }

  _near(e,radius) {
    const out = [];
    for (let x=Math.floor((e.x-radius)/500); x<=Math.floor((e.x+radius)/500); x++) {
      for (let y=Math.floor((e.y-radius)/500); y<=Math.floor((e.y+radius)/500); y++) {
        for (const unit of this.grid.get(`${x},${y}`) || []) if (unit !== e && alive(unit) && distance(e,unit) <= radius+unit.radius) out.push(unit);
      }
    }
    return out;
  }

  _chooseTarget(e, radius, heroPriority = false) {
    let target = null, score = Infinity;
    for (const unit of this._near(e,radius)) {
      if (unit.team === e.team || this.isProtected(unit)||unit.kind==='droppedItem'||!this.canSee(e,unit)) continue;
      if(unit.kind==='neutral'&&unit.targetId!==e.id&&unit.id!==e.explicitTarget)continue;
      let value = distance(e,unit) - unit.radius;
      if (heroPriority && unit.kind === 'hero') value -= 125;
      if (e.kind === 'tower' && unit.kind === 'creep') value -= 500;
      if (building(unit)) value += unit.kind==='filler'?600:70;
      if (value < score) { score = value; target = unit; }
    }
    return target;
  }

  _attack(e,target,options={}) {
    if(!target||!alive(target)||!alive(e)||this.isStunned(e)||Skills.hasStatusFlag(this,e,'disarmed')||!this.canSee(e,target)||
      (e.castPhase||e.channel||e.omnislash)&&!options.omni||Skills.isInvulnerable(this,target)||
      distance(e,target)>(this.combatStats(e,target).range||e.range)+target.radius+8||e.attackCooldown>0&&!options.attackReleased)return false;
    if(e.heroId==='ogre_magi'&&!options.attackReleased&&!options.omni){
      const stats=this.combatStats(e,target),duration=e.attackPoint*100/stats.attackSpeed;
      e.angle=Math.atan2(target.y-e.y,target.x-e.x);e.attackFlash=duration+.1;e.targetId=target.id;
      e.attackPhase={targetId:target.id,startedAt:this.time,executeAt:this.time+duration,options};e.attackCooldown=stats.attackInterval;return true;
    }
    e.angle=Math.atan2(target.y-e.y,target.x-e.x);e.attackFlash=.24;e.targetId=target.id;
    const targetStats=this.combatStats(target);
    const trueStrike=ItemRuntime.trueStrike(this,e,target);
    if(targetStats.evasion&&!trueStrike&&this._random()*100<targetStats.evasion){e.attackCooldown=this.combatStats(e,target).attackInterval;this._effect('text',target.x,target.y-40,{text:'MISS',life:.5,color:'#bfcdb1'});return true;}
    const result=ItemRuntime.attackModifiers(this,e,target,Skills.attackModifiers(this,e,target,options));e.attackCooldown=result.interval;
    let dealt=0;
    if(target.kind==='ward'){target.hitsRemaining--;target.hp=target.hitsRemaining;if(target.hp<=0)this._kill(target,e);}
    else dealt=this.damage(target,result.damage,e,'physical',{attack:true});
    Skills.afterAttack(this,e,target,result,dealt);
    ItemRuntime.afterAttack(this,e,target,result,dealt);
    this._effect(e.range>200?'projectile':'slash',e.x,e.y,attackVisualFields(e,target));
    return true;
  }

  _resolveOgreAttack(e){
    const phase=e.attackPhase,target=this.entities.find(t=>t.id===phase.targetId&&alive(t)),taunt=this._tauntSource(e);
    if(!alive(e)||!target||this.isStunned(e)||Skills.hasStatusFlag(this,e,'disarmed')||e.castPhase||e.channel||e.forcedMotion||taunt&&taunt.id!==target.id){e.attackPhase=null;e.attackCooldown=0;return;}
    if(phase.executeAt>this.time+1e-7)return;e.attackPhase=null;
    const elapsed=this.time-phase.startedAt;
    if(this._attack(e,target,{...phase.options,attackReleased:true}))e.attackCooldown=Math.max(0,e.attackCooldown-elapsed);else e.attackCooldown=0;
  }
  _move(e, point, dt, stop = 0) {
    if(e.attackPhase){e.attackPhase=null;e.attackCooldown=0;}
    if(this.isStunned(e)||this.isRooted(e)||(Skills.isInvulnerable(this,e)&&!Skills.hasStatusFlag(this,e,'canMoveInvulnerable')))return;
    const originalDistance=distance(e,point);
    if(originalDistance<=Math.max(3,stop))return;
    const goal=stop?{x:point.x+(e.x-point.x)/originalDistance*stop,y:point.y+(e.y-point.y)/originalDistance*stop}:point;
    if(!e.navPath||!e.navGoal||distance(e.navGoal,goal)>96||e.navIndex>=e.navPath.length){
      if(e.navRetryAt>this.time)return;
      e.navPath=this.navigation.findPath(e,goal);e.navIndex=0;e.navGoal={...goal};
      if(!e.navPath.length){e.navRetryAt=this.time+1;return;}
    }
    while(e.navIndex<e.navPath.length-1&&distance(e,e.navPath[e.navIndex])<8)e.navIndex++;
    const waypoint=e.navPath[e.navIndex];
    const d=distance(e,waypoint);
    if(d<3){e.navIndex++;return;}
    const speed = this.combatStats(e).speed;
    const amount = Math.min(speed * dt,d);
    const dx=(waypoint.x-e.x)/d,dy=(waypoint.y-e.y)/d;
    e.x = clamp(e.x+dx*amount,25,WORLD.width-25);
    e.y = clamp(e.y+dy*amount,25,WORLD.height-25);
    e.angle = Math.atan2(dy,dx);
    e.moving = amount > .05;
  }

  _followLane(e,dt) {
    const path=TEAM_LANES[e.team][e.lane];
    e.pathIndex=clamp(e.pathIndex??0,0,path.length-1);
    while(e.pathIndex<path.length-1&&distance(e,path[e.pathIndex])<140)e.pathIndex++;
    this._move(e,path[e.pathIndex],dt);
  }

  _creepTick(e,dt) {
    if (this.isStunned(e)) return;
    if (this._tauntedTick(e,dt)) return;
    const target = this._chooseTarget(e,600);
    e.targetId = target?.id || null;
    if (target) {
      if (!this._attack(e,target)) this._move(e,target,dt,e.range+target.radius-3);
    } else this._followLane(e,dt);
  }

  _towerTick(e) {
    const target = this._chooseTarget(e,e.range);
    e.targetId = target?.id || null;
    if (target) this._attack(e,target);
  }

  _tauntSource(e) {
    if (!e?.buffs || (e.buffs.tauntUntil || 0) <= this.time || !e.buffs.tauntSourceId) return null;
    return this.entities.find(source=>source.id===e.buffs.tauntSourceId && alive(source) && source.team!==e.team) || null;
  }

  _tauntedTick(e,dt) {
    const source=this._tauntSource(e);
    if (!source) return false;
    e.targetId=source.id;
    if (!this._attack(e,source)) this._move(e,source,dt,e.range+source.radius-3);
    return true;
  }

  _heroTick(h,dt) {
    Inventory.tickInventory(this,h);
    ItemRuntime.regenerate(this,h,h.hpRegen*dt);
    h.mana=Math.min(h.maxMana,h.mana+Skills.auraManaRegen(this,h)*dt);
    const ownBase=BASES[h.team];
    if(distance(h,ownBase)<1200){h.hp=Math.min(h.maxHp,h.hp+h.maxHp*.05*dt);h.mana=Math.min(h.maxMana,h.mana+(h.maxMana*.06+14)*dt);}
    if(h.dead)return;
    if(h.itemChannel||h.forcedMotion)return;
    const busy=Skills.tickHeroAbilities(this,h,dt);
    if(this.isStunned(h))return;
    if(this._tauntedTick(h,dt))return;
    if(busy){if(!h.isPlayer)Bots.tickBusyBot(this,h);return;}
    if(h.isPlayer)this._playerTick(h,dt);else this._botTick(h,dt);
  }

  _playerTick(h,dt) {
    if(h.pickupTargetId){
      const item=this.entities.find(e=>e.id===h.pickupTargetId&&!e.dead);
      if(!item)h.pickupTargetId=null;
      else if(distance(h,item)<=250){Inventory.pickupItem(this,h,item);h.pickupTargetId=null;h.destination=null;h.navPath=null;}
    }
    let target = h.explicitTarget ? this.entities.find(e => e.id === h.explicitTarget && alive(e)) : null;
    if (h.explicitTarget && !target) { h.explicitTarget = null; h.targetId = null; }
    if (this.keyboard.x || this.keyboard.y) {
      this._move(h,{x:h.x+this.keyboard.x*100,y:h.y+this.keyboard.y*100},dt);
    } else if (target) {
      if (!this._attack(h,target)) this._move(h,target,dt,h.range+target.radius-3);
    } else if (h.destination) {
      this._move(h,h.destination,dt);
      if (distance(h,h.destination)<3) h.destination = null;
    }
    if (!target) target = this._chooseTarget(h,h.range,true);
    h.targetId = target?.id || null;
    if (target) this._attack(h,target);
  }

  _botTick(h,dt) { Bots.tickBot(this,h,dt); }

  _respawn(h) {
    Object.assign(h,h.reincarnating?h.reincarnationPoint:BASES[h.team]);
    h.reincarnating=false;h.reincarnationPoint=null;h.navPath=null;
    h.dead = false; h.hp = h.maxHp; h.mana = h.maxMana;
    h.respawnTimer = 0; h.recallTimer = 0; h.attackCooldown = 0;
    h.targetId = null; h.explicitTarget = null; h.destination = null;
    h.xMark=null;
    h.buffs = {};h.statuses={};h.castPhase=null;h.channel=null;h.omnislash=null; h.lastDamagers = {}; h.retreating = false; h.pathIndex = 1;
    if (h.isPlayer) this.keyboard = {x:0,y:0};
    this._effect('heal',h.x,h.y,{radius:65,color:TEAM_COLORS[h.team],life:1});
  }
}
