import { Game } from '../src/engine.js';
export { coopAllyHeroIds } from '../src/engine.js';

export class CoopGame extends Game {
  constructor(humanHeroes, options = {}) {
    const fill=options.fillWithAI??false;
    if(typeof fill!=='boolean'||!Array.isArray(humanHeroes)||humanHeroes.length<(fill?1:5)||humanHeroes.length>5)throw new Error('Invalid human roster for cooperative mode');
    super({...options,difficulty:'nightmare',humanHeroes});
  }

  get player() {
    return this.entities.find(e => e.id === this.controlledHeroId && e.isHuman)
      || this.entities.find(e => e.isHuman) || super.player;
  }

  withActor(entityId, callback) {
    const actor = this.entities.find(e => e.id === entityId && e.isHuman && e.controller === 'human' && e.team === 0);
    if(!actor) return {ok:false,reason:'玩家英雄不存在'};
    const previous = this.controlledHeroId;
    this.controlledHeroId = actor.id;
    try {
      const result = callback(actor);
      if(result && typeof result.then === 'function') throw new Error('Actor commands must be synchronous');
      return result;
    } finally {
      this.controlledHeroId = previous;
    }
  }
}
