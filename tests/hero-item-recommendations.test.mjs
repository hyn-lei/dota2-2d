import assert from 'node:assert/strict';
import test from 'node:test';
import {ITEM_BY_ID} from '../src/item-data.js';
import {heroItemRecommendations, shopRecommendationContext} from '../src/hero-item-recommendations.js';

const hero = (heroId,team=1) => ({
  kind:'hero',team,heroId,
  get inventory(){throw Error('The recommendation tried to read enemy items');},
  get statuses(){throw Error('The recommendation tried to read live enemy statuses');},
});
const group=(heroId,id,context)=>heroItemRecommendations(heroId,context).find(stage=>stage.id===id).items;

test('public enemy heroes suggest phase- and role-appropriate detection, control protection and armor responses',()=>{
  const player={heroId:'windranger',team:0,draftRole:'support'};
  const lineup=[hero('weaver'),hero('axe'),hero('chaos_knight'),hero('kunkka'),hero('chen',0)];
  const early=shopRecommendationContext(player,lineup,300);
  const late=shopRecommendationContext(player,lineup,1800);
  assert.equal(group(player.heroId,'situational',early)[0].id,'ward_sentry');
  assert.ok(group(player.heroId,'situational',late).some(i=>i.id==='lotus_orb'&&/定向/.test(i.reason)));

  const core=shopRecommendationContext({...player,draftRole:'carry'},lineup,1800);
  const options=group(player.heroId,'situational',core);
  assert.equal(options[0].id,'dust');
  assert.ok(options.some(i=>i.id==='black_king_bar'&&/控制/.test(i.reason)));
  assert.ok(options.some(i=>i.id==='assault'&&/护甲/.test(i.reason)));

  const covered=shopRecommendationContext({...player,draftRole:'carry'},lineup,1800,id=>id==='dust'||id==='black_king_bar');
  const ownedOptions=group(player.heroId,'situational',covered);
  assert.equal(ownedOptions[0].id,'assault','completed responses stay visible below open needs');
  assert.equal(ownedOptions.filter(i=>i.id==='black_king_bar').length,1);
});

test('Weaver recommendation values come from the item effects used by combat',()=>{
  const core=group('weaver','core');
  const desolator=core.find(i=>i.id==='desolator');
  const critical=core.find(i=>i.id==='greater_crit');
  const {corruption_armor}=ITEM_BY_ID.desolator.values;
  const {crit_chance,crit_multiplier}=ITEM_BY_ID.greater_crit.values;
  assert.ok(desolator.reason.includes(`${Math.abs(corruption_armor)} 点护甲`));
  assert.ok(critical.reason.includes(`${crit_chance}%`)&&critical.reason.includes(`${crit_multiplier}%`));
});

test('eligible current professional routes apply to the observed roles and fall back for other roles',()=>{
  const context=draftRole=>shopRecommendationContext({team:0,draftRole},[],0);
  const ckCarry=group('chaos_knight','core',context('carry'));
  const ckSupport=group('chaos_knight','core',context('support'));
  assert.ok(ckCarry.find(i=>i.id==='armlet')?.evidence?.sampleCount>=5);
  assert.equal(ckSupport.find(i=>i.id==='armlet')?.evidence,undefined);
  const windSupport=group('windranger','core',context('roamer'));
  const windCarry=group('windranger','core',context('carry'));
  assert.ok(windSupport.find(i=>i.id==='essence_distiller')?.evidence?.teamCount>=3);
  assert.equal(windCarry.find(i=>i.id==='essence_distiller')?.evidence,undefined);
  assert.equal(group('weaver','core',context('carry')).find(i=>i.id==='desolator').evidence?.sampleCount,undefined);
});

test('all ten heroes use current guide items in the documented roles while preserving fallback quantities',()=>{
  const routes={
    axe:['offlane','blade_mail'],chaos_knight:['carry','armlet'],chen:['support','mekansm'],
    crystal_maiden:['support','aghanims_shard'],drow_ranger:['carry','dragon_lance'],juggernaut:['carry','bfury'],
    kunkka:['mid','blade_mail'],ogre_magi:['support','pavise'],weaver:['carry','maelstrom'],windranger:['mid','maelstrom']
  };
  for(const [heroId,[draftRole,coreItem]] of Object.entries(routes)){
    const context=shopRecommendationContext({heroId,team:0,draftRole},[],0);
    const item=group(heroId,'core',context).find(i=>i.id===coreItem);
    assert.equal(item?.evidence?.patch,'7.42a',heroId);
    assert.ok(item.evidence.workshopId,`${heroId} has a verifiable guide link`);
    assert.ok(heroItemRecommendations(heroId,context).every(stage=>stage.items.every(i=>ITEM_BY_ID[i.id]?.purchasable)));
  }
  const support=shopRecommendationContext({heroId:'crystal_maiden',team:0,draftRole:'support'},[],0);
  assert.equal(group('crystal_maiden','early',support).find(item=>item.id==='ward_observer')?.quantity,2);
});
