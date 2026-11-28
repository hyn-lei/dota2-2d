import {XP_TO_NEXT} from './hero-stats.js';
import {ITEM_BY_ID} from './item-data.js';
import {itemEntries} from './inventory.js';

const contributionWindow=20;
const rewardRadius=1500;
const shutdownGold=[0,0,0,60,100,150,210,280,360,450,550];
const recent=(g,time)=>Number.isFinite(time)&&time<=g.time&&g.time-time<=contributionWindow;
const inRange=(hero,victim)=>!hero.dead&&hero.hp>0&&Math.hypot(hero.x-victim.x,hero.y-victim.y)<rewardRadius;
const xpBeforeLevel=XP_TO_NEXT.map((_,level)=>XP_TO_NEXT.slice(0,level).reduce((sum,xp)=>sum+xp,0));

export function recordHeroContribution(g,target,source,positive=false){
 if(target?.kind!=='hero'||!source)return;
 const hero=g._combatOwner(source);
 if(hero?.kind!=='hero'||hero===target||(hero.team===target.team)!==positive)return;
 const ledger=positive?'lastBenefactors':'lastDamagers';
 target[ledger]||={};
 target[ledger][hero.id]=g.time;
}

export function heroNetWorth(g,heroes){
 const totals=new Map(heroes.map(hero=>[hero.id,hero.gold]));
 function count(id,meta){
  if(!meta||!totals.has(meta.ownerId))return;
  const item=ITEM_BY_ID[id];
  if(!item?.cost)return;
  const bundles=item.stackable&&item.charges>0?meta.charges/item.charges:1;
  totals.set(meta.ownerId,totals.get(meta.ownerId)+item.cost*bundles);
 }
 for(const unit of g.entities){
  if(unit.kind==='hero'||unit.kind==='courier'){
   for(const item of itemEntries(unit))count(item.id,item.meta);
  }else if(unit.kind==='droppedItem'&&!unit.dead)count(unit.itemId,unit.meta);
 }
 return totals;
}

export function heroDeathRewards(g,victim,source){
 const team=1-victim.team;
 if(source?.team!==team)return null;
 const heroes=g.entities.filter(e=>e.kind==='hero');
 const enemies=heroes.filter(hero=>hero.team===team);
 const contributors=enemies.filter(h=>recent(g,victim.lastDamagers?.[h.id]));
 const killer=source.kind==='hero'?source:contributors.length===1?contributors[0]:null;
 const participants=enemies.filter(h=>h===killer||contributors.includes(h)||inRange(h,victim));
 const firstBlood=!!killer&&!(g.firstBloodAwarded??heroes.some(hero=>hero.kills>0));
 const endsStreak=!!killer||contributors.length>0;
 const baseGold=100+10*victim.level+(endsStreak?shutdownGold[Math.min(10,victim.killStreak||0)]:0)+(firstBlood?135:0);
 const baseRecipients=killer?[killer]:contributors.length?contributors:enemies;
 const assistants=enemies.filter(h=>h!==killer&&(contributors.includes(h)||recent(g,killer?.lastBenefactors?.[h.id])));
 const xpRecipients=enemies.filter(h=>h===killer&&!h.dead||inRange(h,victim));
 const xp=Math.floor(100+((xpBeforeLevel[victim.level]||0)+(victim.level<30?victim.xp:0))*.13);
 let assistGold=0;
 if(participants.length){
  const totals=heroNetWorth(g,heroes);
  const winningWorth=enemies.reduce((sum,h)=>sum+totals.get(h.id),0);
  const losingWorth=heroes.reduce((sum,h)=>sum+(h.team===victim.team?totals.get(h.id):0),0);
  const difference=(losingWorth-winningWorth)/Math.max(1,winningWorth,losingWorth);
  assistGold=Math.floor((15+(50+totals.get(victim.id)*.037)/participants.length)*(1+difference));
 }
 return {team,killer,firstBlood,endsStreak,baseGold,baseRecipients,assistGold,participants,assistants,xp,xpRecipients};
}

export function awardHeroDeath(g,victim,awards){
 if(!awards)return;
 const {team,killer,firstBlood,endsStreak,baseGold,baseRecipients,assistGold,participants,assistants,xp,xpRecipients}=awards;
 g.score[team]++;
 if(firstBlood)g.firstBloodAwarded=true;
 if(killer){
  killer.kills++;
  killer.killStreak=(killer.killStreak||0)+1;
 }
 if(endsStreak)victim.killStreak=0;
 for(const hero of baseRecipients)hero.gold+=Math.floor(baseGold/baseRecipients.length);
 for(const hero of participants)hero.gold+=assistGold;
 for(const hero of assistants)hero.assists=(hero.assists||0)+1;
 for(const hero of xpRecipients)g._addXp(hero,xp/xpRecipients.length);
}
