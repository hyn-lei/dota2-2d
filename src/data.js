import { calculateHeroStats } from './hero-stats.js';
import { ABILITIES, abilityAt } from './ability-data.js';
export { WORLD, BASES, LANES } from './map-data.js';
export { ITEMS } from './item-data.js';
export const TEAM_COLORS = ['#8abb81', '#e47563', '#d3b77c'];
export const HEROES = {
  juggernaut: {
    id:'juggernaut',name:'剑圣',en:'JUGGERNAUT',title:'最后的面具',role:'近战 / 核心',attribute:'敏捷',
    description:'剑锋所至，战局由你改写。以剑刃风暴切入战场，在无敌斩的刀光中收割敌人。',
    color:'#d88051',portrait:'assets/juggernaut.jpg',render:'assets/juggernaut.png'
  },
  crystal_maiden: {
    id:'crystal_maiden',name:'水晶室女',en:'CRYSTAL MAIDEN',title:'冰雪的意志',role:'远程 / 法师',attribute:'智力',
    description:'让寒霜成为战场的边界。冻结敌人的脚步，用极寒领域掌控每一次团战。',
    color:'#84c7d7',portrait:'assets/crystal_maiden.jpg',render:'assets/crystal_maiden.png'
  },
  windranger: {
    id:'windranger',name:'风行者',en:'WINDRANGER',title:'随风而行',role:'远程 / 游走',attribute:'敏捷',
    description:'穿越林间的风，也是精准致命的箭。保持距离，寻找角度，让每一次出手命中要害。',
    color:'#97b972',portrait:'assets/windranger.jpg',render:'assets/windranger.png'
  },
  axe: {
    id:'axe',name:'斧王',en:'AXE',title:'战场的征服者',role:'近战 / 先锋',attribute:'力量',
    description:'冲入敌阵，让所有锋芒朝向自己。以怒吼牵制敌人，用巨斧终结残血目标。',
    color:'#c66e57',portrait:'assets/axe.jpg',render:'assets/axe.png'
  },
  ogre_magi: {
    id:'ogre_magi',name:'食人魔魔法师',en:'OGRE MAGI',title:'傻福眷顾的双头魔法师',role:'近战 / 辅助 / 控制',attribute:'力量',
    description:'两个脑袋，一份好运。用火焰爆轰和引燃控制敌人，以嗜血术强化友军，让多重施法放大每一次机会。',
    color:'#ee9f54',portrait:'assets/ogre_magi_portrait.png',render:'assets/ogre_magi.png'
  },
  kunkka: {
    id:'kunkka',name:'昆卡',en:'KUNKKA',title:'纵横四海的舰队统帅',role:'近战 / 控制',attribute:'力量',
    description:'潮汐听从号令，幽灵舰队破浪而来。用 X 标记锁定归途，让洪流与炮火准时抵达。',
    color:'#729fbc',portrait:'assets/kunkka.jpg',render:'assets/kunkka.png'
  }
};
const attributeNames={strength:'力量',agility:'敏捷',intelligence:'智力',universal:'全才'};
for(const hero of Object.values(HEROES)) {
  hero.skills=ABILITIES[hero.id].map((s,i)=>({...s,...abilityAt(hero.id,i,1)}));
  const stats=calculateHeroStats(hero.id);
  Object.assign(hero,{...stats,id:hero.id,hp:stats.maxHp,mana:stats.maxMana,attribute:attributeNames[stats.primaryAttribute]});
}
