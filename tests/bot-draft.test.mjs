import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/engine.js';
import { CoopGame } from '../server/coop-game.mjs';
import { HEROES } from '../src/data.js';
import { BOT_DRAFT_PROFILES, DRAFT_ROLES, DRAFT_HISTORY_LIMIT, draftMatch, draftRecord, appendDraftHistory } from '../src/bot-draft.js';
import { DRAFT_HISTORY_KEY, loadDraftHistory, storeDraftHistory } from '../src/draft-history.js';
import { serializeMatch, parseMatch, restoreMatch } from '../src/game-save.js';

const ids = Object.keys(HEROES);
const signature = list => [...list].sort().join(',');
const recordOf = (draft,count) => ({allies:draft.allies.slice(count).map(h=>h.heroId),enemies:draft.enemies.map(h=>h.heroId)});

function assertFormation(draft, humans) {
  assert.deepEqual(draft.allies.slice(0,humans.length).map(h=>h.heroId),humans);
  for (const team of [draft.allies,draft.enemies]) {
    assert.equal(team.length,5);
    assert.equal(new Set(team.map(h=>h.heroId)).size,5);
    assert.deepEqual([...new Set(team.map(h=>h.role))].sort(),[...DRAFT_ROLES].sort());
    assert.deepEqual([0,1,2].map(lane=>team.filter(h=>h.lane===lane).length),[2,1,2]);
    const ratings = team.map(h=>BOT_DRAFT_PROFILES[h.heroId]);
    assert.ok(ratings.reduce((total,p)=>total+p.frontline,0)>=2,'a frontline is required');
    assert.ok(ratings.reduce((total,p)=>total+p.control,0)>=3,'the team needs control');
    assert.ok(ratings.reduce((total,p)=>total+p.physical,0)>=3,'the team needs attack damage');
    assert.ok(ratings.reduce((total,p)=>total+p.spell,0)>=2,'the team needs spell damage');
    assert.ok(ratings.reduce((total,p)=>total+p.support,0)>=1,'the team needs support');
    assert.ok(team.some(h=>HEROES[h.heroId].range>200),'the team needs ranged coverage');
    for (const h of team) assert.ok(BOT_DRAFT_PROFILES[h.heroId].fits[DRAFT_ROLES.indexOf(h.role)]>=4,`${h.heroId} cannot fill ${h.role}`);
  }
  assert.notEqual(signature(draft.allies.map(h=>h.heroId)),signature(draft.enemies.map(h=>h.heroId)),'avoid identical mirrored rosters');
}

for (const count of [1,2,3,4,5]) test(`${count} locked humans retain their choices in complementary 2-1-2 formations`, () => {
  for (let offset=0; offset<ids.length; offset++) {
    const humans=Array.from({length:count},(_,i)=>ids[(offset+i)%ids.length]);
    assertFormation(draftMatch({humanHeroIds:humans,seed:offset*97}),humans);
  }
});

test('both teams change actual hero sets even when the seed repeats, for every player hero', () => {
  for (const human of ids) {
    let history=[],previous=null;
    const sets={allies:new Set(),enemies:new Set()},seen={allies:new Set(),enemies:new Set()};
    for (let round=0; round<48; round++) {
      const draft=draftMatch({humanHeroIds:[human],seed:42,history});assertFormation(draft,[human]);
      const record=recordOf(draft,1);
      for (const key of ['allies','enemies']) {
        const value=signature(record[key]);
        if (previous) assert.notEqual(value,signature(previous[key]),`${human}: ${key} repeated its previous hero set`);
        sets[key].add(value);record[key].forEach(id=>seen[key].add(id));
      }
      history=appendDraftHistory(history,record);previous=record;
      assert.ok(history.length<=DRAFT_HISTORY_LIMIT);
    }
    assert.ok(sets.allies.size>=7 && sets.enemies.size>=7,'rotation must offer more than two alternating presets');
    assert.deepEqual([...seen.allies].sort(),ids.filter(id=>id!==human).sort());
    assert.deepEqual([...seen.enemies].sort(),[...ids].sort());
  }
});

test('independent seeds expose a broad range of balanced teams and every AI hero', () => {
  const sets=[new Set(),new Set()],seen=[new Set(),new Set()];
  for (let seed=0; seed<200; seed++) {
    const draft=draftMatch({humanHeroIds:['juggernaut'],seed});assertFormation(draft,['juggernaut']);
    for (const [index,key] of ['allies','enemies'].entries()) {
      const list=recordOf(draft,1)[key];sets[index].add(signature(list));list.forEach(id=>seen[index].add(id));
    }
  }
  assert.ok(sets[0].size>=12);assert.ok(sets[1].size>=16);
  assert.equal(seen[0].size,ids.length-1);assert.equal(seen[1].size,ids.length);
});

test('four-human rooms rotate their single AI slot even after recent history exhausts the pool', () => {
  const humans=ids.slice(0,4);let history=[],previous=null;const seen=new Set();
  for (let round=0; round<24; round++) {
    const draft=draftMatch({humanHeroIds:humans,seed:0,history}),record=recordOf(draft,4);
    assertFormation(draft,humans);
    if (previous) assert.notEqual(record.allies[0],previous.allies[0]);
    seen.add(record.allies[0]);previous=record;history=appendDraftHistory(history,record);
  }
  assert.deepEqual([...seen].sort(),ids.slice(4).sort());
});

test('reordering saved hero IDs cannot bypass the repeat guard', () => {
  const first=draftMatch({seed:731}),previous=recordOf(first,1);
  const next=draftMatch({seed:731,history:[{allies:[...previous.allies].reverse(),enemies:[...previous.enemies].reverse()}]});
  const record=recordOf(next,1);
  assert.notEqual(signature(record.allies),signature(previous.allies));
  assert.notEqual(signature(record.enemies),signature(previous.enemies));
});

test('seeded game creation and saving preserve the actual draft, roles and combat random stream', () => {
  const previous=recordOf(draftMatch({seed:42}),1),config={hero:'drow_ranger',seed:731,draftHistory:[previous]};
  const a=new Game(config),b=new Game(config);
  assert.equal(a.seed,731,'drafting must not consume combat randomness');
  assert.equal(serializeMatch(a,0),serializeMatch(b,0));
  a.step(.25);
  const resumed=restoreMatch(parseMatch(serializeMatch(a,0)));
  assert.deepEqual(draftRecord(resumed),draftRecord(a));assert.equal(resumed.seed,a.seed);
  const heroes=g=>g.entities.filter(h=>h.kind==='hero').map(h=>[h.id,h.heroId,h.lane,h.draftRole]);
  assert.deepEqual(heroes(resumed),heroes(a));
});

test('single-player and cooperative game constructors both use the full draft', () => {
  let soloHistory=[],coopHistory=[];
  for (let round=0; round<8; round++) {
    const solo=new Game({seed:42,draftHistory:soloHistory});
    const coop=new CoopGame([{heroId:'juggernaut',clientId:'human',name:'Human'}],{fillWithAI:true,seed:42,draftHistory:coopHistory});
    for (const [game,history] of [[solo,soloHistory],[coop,coopHistory]]) {
      const record=draftRecord(game);
      if (history.length) for (const key of ['allies','enemies']) assert.notEqual(signature(record[key]),signature(history.at(-1)[key]));
      assert.equal(game.player.heroId,'juggernaut');assert.equal(game.entities.filter(h=>h.kind==='hero').length,10);
    }
    soloHistory=appendDraftHistory(soloHistory,draftRecord(solo));coopHistory=appendDraftHistory(coopHistory,draftRecord(coop));
  }
});

test('draft history survives a fresh storage reader and tolerates unavailable or corrupt browser storage', () => {
  const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
  let history=[];
  for (let round=0; round<10; round++) history=appendDraftHistory(history,recordOf(draftMatch({seed:round,history}),1));
  assert.equal(storeDraftHistory(storage,history),true);
  assert.deepEqual(loadDraftHistory(storage),history);assert.equal(history.length,DRAFT_HISTORY_LIMIT);
  const failing={getItem(){throw Error('disabled');},setItem(){throw Error('quota');}};
  assert.deepEqual(loadDraftHistory(failing,history),history);assert.equal(storeDraftHistory(failing,history),false);
  values.set(DRAFT_HISTORY_KEY,'broken');assert.deepEqual(loadDraftHistory(storage,history),history);
  values.set(DRAFT_HISTORY_KEY,JSON.stringify([{allies:['juggernaut'],enemies:['unknown']} ]));assert.deepEqual(loadDraftHistory(storage),[]);
});

test('injected drafts cannot replace a human, duplicate a hero or use invalid lane assignments', () => {
  const draft=draftMatch({seed:42});
  const altered=structuredClone(draft);altered.allies.reverse();assert.throws(()=>new Game({draft:altered}));
  const duplicate=structuredClone(draft);duplicate.enemies[1].heroId=duplicate.enemies[0].heroId;assert.throws(()=>new Game({draft:duplicate}));
  const badLane=structuredClone(draft);badLane.enemies[0].lane=1;assert.throws(()=>new Game({draft:badLane}));
});
