// Rebuild the complete current shop from retained Valve item data and shipped KV.
// node scripts/extract-full-items.mjs          deterministic, offline
// node scripts/extract-full-items.mjs --fetch  refresh official Chinese responses and missing PNGs
// node scripts/extract-full-items.mjs --hero-adjectives-only  update only playable hero traits
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { HERO_STATS } from '../src/hero-data.js';

const root = new URL('../', import.meta.url);
const research = new URL('docs/research/items/', root);
const full = new URL('full/', research);
const artRoot = 'https://cdn.akamai.steamstatic.com/apps/dota2/images/dota_react/items/';
const apiURL = id => `https://www.dota2.com/datafeed/itemdata?language=schinese&item_id=${id}`;
const stableIds = {
  boots:29, blade:3, vitality:61, arcane:23, armor:9, relic:54, branch:16,
  gauntlets:13, slippers:14, mantle:15, circlet:20, belt:17, elvenskin:18,
  robe:19, ogreaxe:21, bladealacrity:22, gloves:25, chainmail:4, protection:12,
  attackblade:2, claymore:5, demonedge:51, quarterstaff:10, mithril:8,
  pointbooster:60, energy:59, regenring:27, sobi:28, healthring:56, voidstone:57,
  diadem:1122, blitz_knuckles:485, hyperstone:55, ultimate_orb:24, ring_of_tarrasque:279,
  bracer:73, wraith_band:75, null_talisman:77, oblivion_staff:67, perseverance:69,
  soul_booster:129, recipe_bracer:72, recipe_wraith_band:74, recipe_null_talisman:76,
};
const byStableNumber = new Map(Object.entries(stableIds).map(([id, number]) => [number, id]));
const fields = {
  bonus_strength:'strength', bonus_str:'strength', bonus_agility:'agility',
  bonus_intellect:'intelligence', bonus_int:'intelligence', bonus_all_stats:'allAttributes',
  bonus_stats:'allAttributes', bonus_damage:'damage', bonus_armor:'armor',
  bonus_movement_speed:'speed', bonus_attack_speed:'attackSpeed', bonus_speed:'attackSpeed',
  bonus_health:'maxHp', bonus_hp:'maxHp', bonus_mana:'maxMana',
  bonus_health_regen:'hpRegen', bonus_hp_regen:'hpRegen', bonus_regen:'hpRegen',
  bonus_mana_regen:'manaRegen', bonus_mp_regen:'manaRegen',
  bonus_max_mana_percentage:'maxManaPercent', bonus_magical_armor:'magicResistance',
  bonus_spell_resist:'magicResistance', magic_resistance:'magicResistance',
  bonus_evasion:'evasion', evasion:'evasion', lifesteal_percent:'lifesteal',
  spell_lifesteal:'spellLifesteal', spell_amp:'spellAmp',
  movement_speed_percent_bonus:'moveSpeedPct', hp_regen_amp:'healthRegenAmp',
  mana_regen_multiplier:'manaRegenAmp', bonus_cooldown:'cooldownReduction',
  bonus_aoe:'spellAoE', aoe_bonus:'spellAoE', manacost_reduction:'manaCostReduction', cast_speed_pct:'castSpeed', slow_resistance:'slowResistance',
};
// These names are ambiguous across items: only map their verified permanent uses.
const extraFields = {
  helm_of_iron_will:{}, wind_lace:{movement_speed:'speed'}, enchanted_mango:{hp_regen:'hpRegen'},
  infused_raindrop:{mana_regen:'manaRegen'}, buckler:{armor:'armor'},
  ring_of_basilius:{mana_regen:'manaRegen'}, vladmir:{armor:'armor',mana_regen:'manaRegen'},
  headdress:{health_regen:'hpRegen'}, pipe:{health_regen:'hpRegen'},
  urn_of_shadows:{mana_regen:'manaRegen'}, essence_distiller:{mana_regen:'manaRegen'},
  arcane_boots:{bonus_movement:'speed',mana_regen:'manaRegen'},
  guardian_greaves:{bonus_movement:'speed',mana_regen:'manaRegen'},
  aether_lens:{cast_range_bonus:'castRange'},
  dagon:{cast_range_bonus:'castRange'}, dagon_2:{cast_range_bonus:'castRange'},
  dagon_3:{cast_range_bonus:'castRange'}, dagon_4:{cast_range_bonus:'castRange'},
  dagon_5:{cast_range_bonus:'castRange'},
  sange_and_yasha:{status_resistance:'statusResistance'},
  solar_crest:{self_movement_speed:'speed'},
  specialists_array:{agility:'agility',damage:'damage',all_stats:'allAttributes'},
  hydras_breath:{strength:'strength',agility:'agility',damage:'damage'},
  ristuls_devotion:{armor:'armor',mana_regen:'manaRegen'},
};
const excludedFields = {
  hurricane_pike:['bonus_attack_speed'], smoke_of_deceit:['bonus_movement_speed'],
  manta:['bonus_movement_speed'], rapier:['bonus_damage'],
  metamorphic_mandible:['bonus_movement_speed','bonus_armor','bonus_magic_resistance'],
  minotaur_horn:['bonus_spell_resist'],
  balmhook:['bonus_health_regen'],gunpowder_gauntlets:['bonus_damage'],
  ceremonial_robe:['magic_resistance'],idol_of_screeauk:['evasion','bonus_evasion','slow_resistance'],
};
const labels = {
  strength:'力量',agility:'敏捷',intelligence:'智力',allAttributes:'全属性',damage:'攻击力',
  armor:'护甲',speed:'移动速度',attackSpeed:'攻击速度',maxHp:'生命值',maxMana:'魔法值',
  hpRegen:'生命恢复/秒',manaRegen:'魔法恢复/秒',maxManaPercent:'最大魔法值',
  magicResistance:'魔法抗性',evasion:'闪避',lifesteal:'攻击吸血',spellLifesteal:'技能吸血',
  spellAmp:'技能增强',attackRange:'攻击距离',castRange:'施法距离',statusResistance:'状态抗性',
  spellAoE:'技能范围',manaCostReduction:'魔法消耗降低',castSpeed:'施法速度',slowResistance:'减速抗性',
  moveSpeedPct:'移动速度',healthRegenAmp:'生命恢复增强',manaRegenAmp:'魔法恢复增强',
  cooldownReduction:'冷却减少',
};
const percentageStats = new Set(['manaCostReduction','castSpeed','slowResistance','maxManaPercent','magicResistance','evasion','lifesteal','spellLifesteal','spellAmp','statusResistance','moveSpeedPct','healthRegenAmp','manaRegenAmp','cooldownReduction']);

export function parseValveKV(raw) {
  const tokens = [...raw.matchAll(/\/\/[^\n]*|"((?:\\.|[^"\\])*)"|([{}])/g)]
    .filter(match => !match[0].startsWith('//')).map(match => match[2] || match[1]);
  let cursor = 0;
  function parseObject() {
    const object = {};
    while (cursor < tokens.length) {
      const key = tokens[cursor++];
      if (key === '}') return object;
      const value = tokens[cursor++];
      object[key] = value === '{' ? parseObject() : value;
    }
    return object;
  }
  return parseObject();
}
async function readHeroAdjectives(){
 const base=parseValveKV(await readFile(new URL('docs/research/heroes/npc_dota_hero_base.txt',root),'utf8')).DOTAHeroes.npc_dota_hero_base;
 return Object.fromEntries(await Promise.all(Object.keys(HERO_STATS).map(async hero=>{
  const name=hero==='windranger'?'windrunner':hero,directory=hero==='weaver'?'weaver':'heroes';
  const raw=parseValveKV(await readFile(new URL(`docs/research/${directory}/npc_dota_hero_${name}.txt`,root),'utf8')).DOTAHeroes[`npc_dota_hero_${name}`];
  return [hero,Object.fromEntries(Object.entries({...base.Adjectives,...raw.Adjectives}).map(([key,value])=>[key,Number(value)]))];
 })));
}
function numbers(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) value = value.value;
  if (value === undefined || value === null || value === '') return [];
  const result = Array.isArray(value) ? value.map(Number) : String(value).trim().split(/\s+/).map(Number);
  return result.every(Number.isFinite) ? result : [];
}
function atLevel(value, level = 1, fallback = 0) {
  const sequence = numbers(value);
  return sequence[Math.min(level - 1, sequence.length - 1)] ?? fallback;
}
function enumValues(value = '') { return String(value).split('|').map(part => part.trim()).filter(Boolean); }
function plainText(html) {
  return String(html || '').replace(/<h\d[^>]*>/gi,'\n').replace(/<\/h\d>/gi,'：')
    .replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\n{3,}/g,'\n\n').trim();
}
function substitute(text, values, levels) {
  return text.replace(/%([a-zA-Z_][\w]*)%/g, (token, key) => {
    const field = Object.keys(values).find(candidate => candidate.toLowerCase() === key.toLowerCase()) || key;
    return levels[field]?.length > 1 ? levels[field].join('/') : values[field] ?? token;
  }).replace(/%%/g,'%');
}
async function limitedMap(entries, limit, run) {
  const result = new Array(entries.length);
  let cursor = 0;
  await Promise.all(Array.from({length: Math.min(limit, entries.length)}, async () => {
    while (cursor < entries.length) { const index = cursor++; result[index] = await run(entries[index], index); }
  }));
  return result;
}
async function get(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {signal:AbortSignal.timeout(30000)});
      if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) { if (attempt === 2) throw error; }
  }
}

export async function generateFullItems({refresh = false} = {}) {
  await mkdir(full, {recursive:true});
  if (refresh) {
    for (const language of ['schinese','english']) {
      const payload = await get(`https://www.dota2.com/datafeed/itemlist?language=${language}`);
      if (!JSON.parse(payload).result?.data?.itemabilities?.length) throw new Error(`Empty ${language} item list`);
      await writeFile(new URL(`itemlist-${language}.json`, full), payload);
    }
  }
  const list = JSON.parse(await readFile(new URL('itemlist-schinese.json', full),'utf8')).result.data.itemabilities;
  const english = JSON.parse(await readFile(new URL('itemlist-english.json', full),'utf8')).result.data.itemabilities;
  const scripts = parseValveKV(await readFile(new URL('items.txt', research),'utf8')).DOTAAbilities;
  const listByName = new Map(list.map(item => [item.name, item]));
  const listByNumber = new Map(list.map(item => [item.id, item]));
  const englishByNumber = new Map(english.map(item => [item.id, item]));
  const stableId = item => byStableNumber.get(item.id) || item.name.replace(/^item_/, '');
  const purchasable = item => {
    const script = scripts[item.name];
    return !!script && script.ItemPurchasable !== '0' && script.IsObsolete !== '1'
      && item.neutral_item_tier === -1 && (script.ItemRecipe !== '1' || Number(script.ItemCost) > 0)
      && Number.isFinite(Number(script.ItemCost)) && item.name !== 'item_ward_dispenser';
  };
  const patches=JSON.parse(await readFile(new URL('docs/research/patches/7.42/patchnotes-english.json',root),'utf8'));
  const poolsNote=patches.neutral_items.find(entry=>entry.title==='Artifact Pools');
  const englishNames=new Map(english.map(item=>[item.name_english_loc?.toLowerCase(),item]));
  const pools={};let tier=0;
  for(const entry of poolsNote.ability_notes){
    const match=entry.note.match(/^Tier (\d)$/);if(match){tier=Number(match[1]);pools[tier]=[];}
    else if(entry.indent_level===2&&tier)pools[tier].push(entry.note.split(', ').map(name=>{
      const item=englishNames.get(name.toLowerCase())||englishNames.get(name.toLowerCase().replace(/gauntlets$/,'gauntlet'));if(!item)throw Error(`Unknown neutral artifact ${name}`);return stableId(item);
    }));
  }
  const artifactTier=new Map(Object.entries(pools).flatMap(([tier,groups])=>groups.flat().map(id=>[id,Number(tier)])));
  const enchIds=new Set(patches.neutral_items.filter(e=>e.ability_id>0&&listByNumber.get(e.ability_id)?.name.startsWith('item_enhancement_')).map(e=>e.ability_id));
  const legacy=JSON.parse((await readFile(new URL('full-catalog-manifest.json',research),'utf8'))).items;
  const legacyIds=new Set(legacy.map(i=>i.dotaId));
  const selected = list.filter(item => purchasable(item) || item.name === 'item_ward_dispenser' || legacyIds.has(item.id) || artifactTier.has(stableId(item)) || enchIds.has(item.id) || ['item_horn_of_battle_greater','item_roshans_banner','item_foragers_health','item_foragers_stats','item_foragers_mana','item_cheese','item_refresher_shard'].includes(item.name));
  const selectedNames = new Set(selected.map(item => item.name));
  for (const [id, number] of Object.entries(stableIds)) {
    if (!selected.some(item => item.id === number)) throw new Error(`Lost legacy identity ${id}:${number}`);
  }
  if (refresh) {
    await limitedMap(selected, 8, async item => {
      const payload = await get(apiURL(item.id));
      if (JSON.parse(payload).result?.data?.items?.[0]?.id !== item.id) throw new Error(`Empty item ${item.name}`);
      await writeFile(new URL(`${item.id}-schinese.json`, full),payload);
    });
  }
  const records = [];
  const sourceRecords = {};
  for (const item of selected) {
    const script = scripts[item.name];
    const official = JSON.parse(await readFile(new URL(`${item.id}-schinese.json`, full),'utf8')).result.data.items[0];
    if (official.id !== item.id || official.item_cost !== Number(script.ItemCost)) throw new Error(`API/KV identity or price mismatch: ${item.name}`);
    const id = stableId(item), level = Number(script.ItemBaseLevel || 1);
    const valueLevels = {}, values = {};
    for (const [key, value] of Object.entries(script.AbilityValues || {})) {
      const sequence = numbers(value);
      if (sequence.length) { values[key] = atLevel(sequence,level); if (sequence.length > 1) valueLevels[key] = sequence; }
    }
    for (const value of official.special_values) {
      const sequence = numbers(value.values_float);
      if (sequence.length) { values[value.name] = atLevel(sequence,level); if (sequence.length > 1) valueLevels[value.name] = sequence; }
    }
    for (const key of ['AbilityCastRange','AbilityCooldown','AbilityManaCost','AbilityHealthCost','AbilityCastPoint','AbilityChannelTime','AbilityCharges','AbilityChargeRestoreTime']) {
      if (script[key] !== undefined && values[key] === undefined) {
        values[key] = atLevel(script[key],level);
        const sequence = numbers(script[key]);
        if (sequence.length > 1) valueLevels[key] = sequence;
      }
    }
    const recipeOnly = script.ItemRecipe === '1';
    const stats = {};
    if (!recipeOnly) {
      for (const [key, stat] of Object.entries({...fields,...extraFields[id]})) {
        if (values[key] !== undefined && !excludedFields[id]?.includes(key) && values[key] !== 0) stats[stat] = values[key];
      }
      if (id === 'manta') stats.moveSpeedPct = values.bonus_movement_speed;
      if (id === 'rapier') stats.damage = values.bonus_damage_base;
    }
    const recipe = listByName.get(item.name.replace(/^item_/, 'item_recipe_'));
    let recipes = [];
    if (!recipeOnly && recipe?.recipes?.length) {
      recipes = recipe.recipes.map(entry => entry.items.map(number => {
        const part = listByNumber.get(number);
        if (!part || !selectedNames.has(part.name)) throw new Error(`${item.name}: missing recipe component ${number}`);
        return stableId(part);
      }));
      if (Number(scripts[recipe.name]?.ItemCost) > 0) recipes.forEach(parts => parts.push(stableId(recipe)));
      // The ward wrapper's other raw recipes merge existing charge stacks, not fresh purchases.
      if (id === 'ward_dispenser') recipes = [recipes[0]];
    }
    const secretShop = script.SecretShop === '1';
    const category = recipeOnly ? 'recipes' : recipes.length ? 'upgrades' : secretShop ? 'secret'
      : Object.keys(stats).some(key => ['strength','agility','intelligence','allAttributes'].includes(key)) ? 'attributes' : 'equipment';
    const statDescription = Object.entries(stats).map(([key,value]) => `${labels[key]} +${value}${percentageStats.has(key) ? '%' : ''}`).join(' · ');
    const resultItem = recipeOnly ? listByName.get(script.ItemResult) : null;
    const name = official.name_loc || item.name_loc || (resultItem ? `图纸（${resultItem.name_loc}）` : '');
    const en = englishByNumber.get(item.id)?.name_english_loc || item.name_english_loc || (resultItem ? `${resultItem.name_english_loc} Recipe` : '');
    const descriptionValues = item.name==='item_satanic'
      ? {...values,unholy_lifesteal_total_tooltip:values.lifesteal_percent+values.unholy_lifesteal_percent} : values;
    let description = substitute(plainText(official.desc_loc), descriptionValues, valueLevels)
      || (recipeOnly ? `用于合成${resultItem.name_loc}，不提供属性加成。` : '');
    if(enchIds.has(item.id)&&!description){
      const enhancementLabels={bonus_damage:'攻击力',armor:'护甲',movement_speed:'移动速度',movespeed:'移动速度',movespeed_pct:'移动速度（%）',bonus_mana:'魔法值',max_mana:'最大魔法值',bonus_attack_speed:'攻击速度',attack_speed:'攻击速度',mana_regen:'魔法恢复/秒',bonus_mana_regen:'魔法恢复/秒',health_regen:'生命恢复/秒',health_bonus:'生命值',magic_res:'魔法抗性（%）',manacost_reduction:'魔法消耗降低（%）',bonus_night_vision:'夜间视野',bonus_attack_range:'远程攻击距离',bonus_attack_range_melee:'近战攻击距离',lifesteal:'攻击吸血（%）',knockback_resist:'击退抗性（%）',health_restoration:'生命恢复增强（%）',bat_reduce:'基础攻击间隔降低（%）',intelligence_pct:'智力变化（%）',bonus_gpm:'每分钟金币',mana_reduction_pct:'最大魔法降低（%）',cast_range_bonus:'施法距离',hp_regen_reduce:'生命恢复/秒降低（最低0）',base_attack_damage:'基础攻击力（%）',status_resistance:'状态抗性（%）',bonus_potency:'物品威力（%）',primary_stat:'主属性',primary_stat_universal:'全才英雄全属性',debuff_amp:'减益持续时间（%）',spell_amp:'技能增强（%）',cooldown_reduction:'冷却减少（%）',incoming_damage:'承受伤害增加（%）',attack_lifesteal:'攻击吸血（%）',spell_lifesteal:'技能吸血（%）',max_health:'最大生命（%）',max_health_regen:'每秒最大生命恢复（%）',cast_speed:'施法速度（%）',vision_reduce:'视野降低（%）',evasion:'闪避（%）'};
      description=Object.entries(values).filter(([key])=>enhancementLabels[key]).map(([key,value])=>`${enhancementLabels[key]} ${valueLevels[key]?.join('/')||value}`).join('；');
    }
    const icon = stats.damage ? 'sword' : stats.armor ? 'shield' : stats.strength || stats.maxHp ? 'heart'
      : stats.speed || stats.agility ? 'boots' : stats.intelligence || stats.maxMana ? 'staff' : 'relic';
    const field = (key, apiValues, fallback = 0) => atLevel(script[key] ?? apiValues, level, fallback);
    const record = {
      id,dotaId:item.id,dotaName:item.name,name,en,
      icon,color:'#b7b79a',cost:official.item_cost,purchasable:purchasable(item),
      stats,values,valueLevels,description:[statDescription,description].filter(Boolean).join('\n'),
      activeDescription:description,notes:(official.notes_loc || []).map(note => substitute(plainText(note),values,valueLevels)),
      category,secretShop,image:`assets/items/${item.name.slice(5)}.png`,
      behaviors:enumValues(script.AbilityBehavior),targetTeam:script.AbilityUnitTargetTeam || '',
      targetType:script.AbilityUnitTargetType || '',targetFlags:enumValues(script.AbilityUnitTargetFlags),
      damageType:script.AbilityUnitDamageType || '',
      neutralTier:artifactTier.get(id)||0,enchantment:enchIds.has(item.id),
      curioFields:Object.entries(script.AbilityValues||{}).filter(([,field])=>['1','true'].includes(field?.apply_curio_bonus)).map(([key])=>key),
      potencyFields:Object.entries(script.AbilityValues||{}).filter(([,field])=>field?.apply_effectiveness==='1').map(([key])=>key),
      backpackUsable:script.ItemCanBeUsedWithoutInventory==='1'||id==='smoke_of_deceit',
      cooldown:field('AbilityCooldown',official.cooldowns),mana:field('AbilityManaCost',official.mana_costs),
      healthCost:field('AbilityHealthCost',official.health_costs),range:field('AbilityCastRange',official.cast_ranges),
      castPoint:field('AbilityCastPoint',official.cast_points),channelTime:field('AbilityChannelTime',official.channel_times),
      sharedCooldown:script.AbilitySharedCooldown || (id==='refresher_shard'?'refresher':''),
      charges:field('ItemInitialCharges',official.item_initial_charges),
      abilityCharges:field('AbilityCharges',values.AbilityCharges),
      chargeRestoreTime:field('AbilityChargeRestoreTime',values.AbilityChargeRestoreTime),
      requiresCharges:script.ItemRequiresCharges === '1',displayCharges:script.ItemDisplayCharges === '1',
      stackable:script.ItemStackable === '1',stackableMax:field('ItemStackableMax'),
      permanent:script.ItemPermanent !== '0',
      initialStock:field('ItemStockInitial',script.ItemStockMax),maxStock:field('ItemStockMax',official.item_stock_max),
      stockTime:field('ItemStockTime',official.item_stock_time),initialStockTime:field('ItemInitialStockTime'),
      disassemble:script.ItemDisassembleRule || 'DOTA_ITEM_DISASSEMBLE_NOT_POSSIBLE',
      killDrop:['gem','rapier'].includes(id),shareable:script.ItemShareability || 'ITEM_NOT_SHAREABLE',
      sellable:script.ItemSellable !== '0',backpackAllowed:script.AllowedInBackpack !== '0',
      droppable:script.ItemDroppable !== '0',level,
      ...(recipes.length ? {components:recipes[0],recipesAlternative:recipes.slice(1)} : {}),
      ...(recipeOnly ? {recipeOnly:true,recipeFor:stableId(listByName.get(script.ItemResult))} : {}),
      ...(['boots','power_treads','phase_boots','berserkers_sabatons','arcane_boots','guardian_greaves','tranquil_boots','boots_of_bearing','travel_boots','travel_boots_2'].includes(id) ? {movementGroup:'boots'} : {}),
      ...(script.IsObsolete==='1' ? {obsolete:true} : {}),
    };
    records.push(record);
    sourceRecords[item.name] = script;
  }
  const byId = new Map(records.map(item => [item.id,item]));
  for (const item of records.filter(item => item.components && item.purchasable)) {
    for (const parts of [item.components,...item.recipesAlternative]) {
      const cost = parts.reduce((sum,id) => sum + byId.get(id).cost, 0);
      if (cost !== item.cost) throw new Error(`${item.id}: recipe cost ${cost} != ${item.cost}`);
    }
  }
  await mkdir(new URL('assets/items/',root),{recursive:true});
  const icons = await limitedMap(records,8,async item => {
    const source = `${artRoot}${item.recipeOnly ? 'recipe' : item.dotaName.slice(5)}.png`;
    const file = new URL(item.image,root);
    let exists = true;
    try { await access(file); } catch { exists = false; }
    if (!exists) {
      if (!refresh) throw new Error(`Missing ${item.image}; run --fetch once.`);
      const buffer = await get(source);
      if (buffer.readUInt32BE(0) !== 0x89504e47) throw new Error(`Invalid official icon ${item.id}`);
      await writeFile(file,buffer);
    }
    const buffer = await readFile(file);
    return {id:item.id,file:item.image,source,sha256:createHash('sha256').update(buffer).digest('hex')};
  });
  const meta = {
    patch:'7.42',retrieved:'2026-11-21',source:apiURL('{id}'),
    scope:'Current purchasable main/secret shop items, paid recipes, all 48 active neutral artifacts, active enchantments, objective rewards and retained legacy identities.',
    purchasableCount:records.filter(item => item.purchasable).length,
    recordCount:records.length,recipeCount:records.filter(item => item.recipeOnly).length,
  };
  await writeFile(new URL('src/item-records.js',root),`// Generated by scripts/extract-full-items.mjs. See docs/item-catalog-complete.md.\nexport const ITEM_RECORDS = [\n${records.map(item => `  ${JSON.stringify(item)},`).join('\n')}\n];\nexport const ITEM_RECORDS_META = ${JSON.stringify(meta)};\n`);
  const neutralKV=parseValveKV(await readFile(new URL('742/neutral_items.txt',research),'utf8')).neutral_items;
  const seconds=s=>String(s).split(':').reduce((n,v)=>n*60+Number(v),0);
  const craftRules=Object.fromEntries(Object.entries(neutralKV.neutral_tiers).map(([tier,rule])=>[tier,{startTime:seconds(rule.start_time),cost:Number(rule.craft_cost),recraftCost:Number(rule.recraft_cost??rule.craft_cost),enhancements:Object.fromEntries(Object.entries(rule.enhancements).map(([attribute,options])=>[attribute,Object.fromEntries(Object.entries(options).map(([name,rank])=>[name.replace(/^item_/,''),Number(rank)]))]))}]));
  const adjectives=await readHeroAdjectives();
  await writeFile(new URL('src/item-neutral-data.js',root),`// Generated from Valve 7.42 artifact pools, hero adjectives and item snapshots.\nexport const NEUTRAL_ARTIFACT_POOLS = ${JSON.stringify(pools)};\nexport const NEUTRAL_ENCHANTMENTS = ${JSON.stringify(selected.filter(i=>enchIds.has(i.id)).map(i=>stableId(i)))};\nexport const NEUTRAL_CRAFT_RULES = ${JSON.stringify(craftRules)};\nexport const NEUTRAL_HERO_ADJECTIVES = ${JSON.stringify(adjectives)};\n`);
  await writeFile(new URL('full-items-script.json',research),JSON.stringify(sourceRecords,null,2)+'\n');
  await writeFile(new URL('snapshots.json',full),JSON.stringify({retrieved:meta.retrieved,patch:meta.patch,kv:{source:'https://raw.githubusercontent.com/SteamTracking/GameTracking-Dota2/76ab89451c1384c2e106b676258c6e9f72787e11/game/dota/pak01_dir/scripts/npc/items.txt',sha256:createHash('sha256').update(await readFile(new URL('items.txt',research))).digest('hex')},items:await Promise.all(records.map(async item=>({id:item.dotaId,name:item.dotaName,source:apiURL(item.dotaId),sha256:createHash('sha256').update(await readFile(new URL(`${item.dotaId}-schinese.json`,full))).digest('hex')})))},null,2)+'\n');
  await writeFile(new URL('full-icons.json',research),JSON.stringify({retrieved:meta.retrieved,items:icons},null,2)+'\n');
  await writeFile(new URL('full-catalog-manifest.json',research),JSON.stringify({...meta,items:records.map(({id,dotaId,dotaName,purchasable,cost,components,recipesAlternative}) => ({id,dotaId,dotaName,purchasable,cost,components,recipesAlternative})),excluded:list.filter(item=>!selectedNames.has(item.name)).map(item=>({id:item.id,name:item.name,reason:scripts[item.name]?.IsObsolete==='1'?'obsolete':scripts[item.name]?.ItemPurchasable==='0'?'not-purchasable':item.neutral_item_tier!==-1?'neutral':scripts[item.name]?.ItemRecipe==='1'?'automatic-recipe':'not-shop-item'}))},null,2)+'\n');
  console.log(`Generated ${meta.purchasableCount} purchasable entries, ${meta.recordCount} records, ${meta.recipeCount} paid recipes, ${icons.length} local icons.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(new URL(`file:///${process.argv[1].replaceAll('\\','/')}`))) {
  if(process.argv.includes('--hero-adjectives-only')){
    const file=new URL('src/item-neutral-data.js',root),data=await readFile(file,'utf8'),adjectives=await readHeroAdjectives();
    const pattern=/^export const NEUTRAL_HERO_ADJECTIVES = .*;$/m;
    if(!pattern.test(data))throw new Error('Missing generated hero adjective export');
    await writeFile(file,data.replace(pattern,`export const NEUTRAL_HERO_ADJECTIVES = ${JSON.stringify(adjectives)};`));
    console.log(`Updated neutral item traits for ${Object.keys(adjectives).length} playable heroes.`);
  }else await generateFullItems({refresh:process.argv.includes('--fetch')});
}
