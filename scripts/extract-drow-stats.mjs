import fs from 'node:fs';
import { HERO_STATS } from '../src/hero-data.js';
// Drow's KV inherits unspecified base values from the tracked base hero script.
function parse(text){const tokens=[...text.replace(/\/\/[^\n]*/g,'').matchAll(/"((?:\\.|[^"\\])*)"|([{}])/g)].map(m=>m[2]||m[1]);let i=0;function obj(){const out={};while(i<tokens.length){const k=tokens[i++];if(k==='}')return out;const v=tokens[i++];out[k]=v==='{'?obj():v;}return out;}return obj();}
const kv=parse(fs.readFileSync('docs/research/heroes/npc_dota_hero_drow_ranger.txt','utf8')).DOTAHeroes.npc_dota_hero_drow_ranger;
const base=parse(fs.readFileSync('docs/research/heroes/npc_dota_hero_base.txt','utf8')).DOTAHeroes;
const defaults=base.npc_dota_hero_base||base;
const n=(key,fallback)=>Number(kv[key]??defaults[key]??fallback);
const stats={id:'drow_ranger',dotaId:6,primaryAttribute:'agility',baseStrength:n('AttributeBaseStrength'),strengthGain:n('AttributeStrengthGain'),baseAgility:n('AttributeBaseAgility'),agilityGain:n('AttributeAgilityGain'),baseIntelligence:n('AttributeBaseIntelligence'),intelligenceGain:n('AttributeIntelligenceGain'),baseHealth:n('StatusHealth',120),baseMana:n('StatusMana',75),baseHealthRegen:n('StatusHealthRegen',.25),baseManaRegen:n('StatusManaRegen',0),baseDamageMin:n('AttackDamageMin'),baseDamageMax:n('AttackDamageMax'),baseArmor:n('ArmorPhysical'),baseAttackTime:n('AttackRate'),attackPoint:n('AttackAnimationPoint'),projectileSpeed:n('ProjectileSpeed'),baseAttackSpeed:n('BaseAttackSpeed'),moveSpeed:n('MovementSpeed'),range:n('AttackRange'),visionDay:n('VisionDaytimeRange',1800),visionNight:n('VisionNighttimeRange',800),baseMagicResistance:n('MagicalResistance',25)/100};
const feed=JSON.parse(fs.readFileSync('docs/research/heroes/6.json','utf8')).result.data.heroes[0];
for(const [key,value]of Object.entries(stats))if(typeof value==='number'&&!Number.isFinite(value))throw Error(`Invalid ${key}`);
if(stats.range!==feed.attack_range||stats.projectileSpeed!==feed.projectile_speed||stats.baseAgility!==feed.agi_base)throw Error('Drow KV/feed mismatch');
const path='src/hero-data.js',text=fs.readFileSync(path,'utf8'),start=text.indexOf('export const HERO_STATS');
fs.writeFileSync(path,text.slice(0,start).replace(/export const DROW_DATA_META = Object\.freeze\([\s\S]*?\);\s*/, '')+`export const DROW_DATA_META = Object.freeze(${JSON.stringify({patch:'7.41f',retrieved:'2026-11-06',trackingCommit:'3f630cc18bfa63f63b3ce259be52209d922558c3',source:'https://www.dota2.com/datafeed/herodata?language=english&hero_id=6'},null,2)});\n\nexport const HERO_STATS = Object.freeze(${JSON.stringify({...HERO_STATS,drow_ranger:stats},null,2)});\n`);
console.log('Extracted Drow base stats, attack point and projectile speed.');
