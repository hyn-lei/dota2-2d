// Extracted from Valve NPC definitions (SteamTracking mirror); see docs/research/units-sources.md.
// radius is the source selection RingRadius, NOT an inferred collision radius.
// Values are base definitions; runtime upgrades and building class modifiers are separate.
import { UNIT_EXTRAS, ABILITY_EXTRAS } from './unit-extras.js';

export const BUILDING_STATS = {
  "tower1": {
    "sourceId": "npc_dota_goodguys_tower1_mid",
    "name": "一塔",
    "nameEn": "Tier 1 Tower",
    "maxHp": 1800,
    "hpRegen": 0,
    "damageMin": 88,
    "damageMax": 92,
    "damage": 90,
    "armor": 12,
    "magicResistance": 0,
    "range": 700,
    "speed": 0,
    "baseAttackTime": 0.9,
    "baseAttackSpeed": 110,
    "attackInterval": 0.8181818181818182,
    "xpBounty": 0,
    "goldMin": 0,
    "goldMax": 0,
    "bounty": 0,
    "radius": 130,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_TOWER",
    "ancient": false,
    "attackType": "ranged",
    "abilities": [
      "creep_siege"
    ]
  },
  "tower2": {
    "sourceId": "npc_dota_goodguys_tower2_mid",
    "name": "二塔",
    "nameEn": "Tier 2 Tower",
    "maxHp": 2500,
    "hpRegen": 0,
    "damageMin": 170,
    "damageMax": 174,
    "damage": 172,
    "armor": 16,
    "magicResistance": 0,
    "range": 700,
    "speed": 0,
    "baseAttackTime": 0.9,
    "baseAttackSpeed": 110,
    "attackInterval": 0.8181818181818182,
    "xpBounty": 0,
    "goldMin": 0,
    "goldMax": 0,
    "bounty": 0,
    "radius": 130,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_TOWER",
    "ancient": false,
    "attackType": "ranged",
    "abilities": [
      "backdoor_protection",
      "creep_siege"
    ]
  },
  "tower3": {
    "sourceId": "npc_dota_goodguys_tower3_mid",
    "name": "三塔",
    "nameEn": "Tier 3 Tower",
    "maxHp": 2500,
    "hpRegen": 0,
    "damageMin": 170,
    "damageMax": 174,
    "damage": 172,
    "armor": 16,
    "magicResistance": 0,
    "range": 700,
    "speed": 0,
    "baseAttackTime": 0.9,
    "baseAttackSpeed": 110,
    "attackInterval": 0.8181818181818182,
    "xpBounty": 0,
    "goldMin": 0,
    "goldMax": 0,
    "bounty": 0,
    "radius": 130,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_TOWER",
    "ancient": false,
    "attackType": "ranged",
    "abilities": [
      "backdoor_protection_in_base",
      "creep_siege"
    ]
  },
  "tower4": {
    "sourceId": "npc_dota_goodguys_tower4",
    "name": "四塔",
    "nameEn": "Tier 4 Tower",
    "maxHp": 2600,
    "hpRegen": 0,
    "damageMin": 170,
    "damageMax": 174,
    "damage": 172,
    "armor": 21,
    "magicResistance": 0,
    "range": 700,
    "speed": 0,
    "baseAttackTime": 0.9,
    "baseAttackSpeed": 110,
    "attackInterval": 0.8181818181818182,
    "xpBounty": 0,
    "goldMin": 0,
    "goldMax": 0,
    "bounty": 0,
    "radius": 130,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_TOWER",
    "ancient": false,
    "attackType": "ranged",
    "abilities": [
      "backdoor_protection_in_base",
      "creep_siege"
    ],
    "armorPerStandingBarracks": 4
  },
  "barracksMelee": {
    "sourceId": "npc_dota_goodguys_melee_rax_mid",
    "name": "近战兵营",
    "nameEn": "Melee Barracks",
    "maxHp": 2200,
    "hpRegen": 5,
    "damageMin": 0,
    "damageMax": 0,
    "damage": 0,
    "armor": 15,
    "magicResistance": 0,
    "range": 0,
    "speed": 0,
    "baseAttackTime": 0,
    "baseAttackSpeed": 100,
    "attackInterval": 0,
    "xpBounty": 0,
    "goldMin": 0,
    "goldMax": 0,
    "bounty": 0,
    "radius": 220,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_BARRACKS",
    "ancient": false,
    "attackType": "none",
    "abilities": [
      "backdoor_protection_in_base",
      "creep_siege"
    ]
  },
  "barracksRanged": {
    "sourceId": "npc_dota_goodguys_range_rax_mid",
    "name": "远程兵营",
    "nameEn": "Ranged Barracks",
    "maxHp": 1300,
    "hpRegen": 0,
    "damageMin": 0,
    "damageMax": 0,
    "damage": 0,
    "armor": 9,
    "magicResistance": 0,
    "range": 0,
    "speed": 0,
    "baseAttackTime": 0,
    "baseAttackSpeed": 100,
    "attackInterval": 0,
    "xpBounty": 0,
    "goldMin": 0,
    "goldMax": 0,
    "bounty": 0,
    "radius": 220,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_BARRACKS",
    "ancient": false,
    "attackType": "none",
    "abilities": [
      "backdoor_protection_in_base",
      "creep_siege"
    ]
  },
  "ancient": {
    "sourceId": "npc_dota_goodguys_fort",
    "name": "遗迹",
    "nameEn": "Ancient",
    "maxHp": 4500,
    "hpRegen": 12,
    "damageMin": 0,
    "damageMax": 0,
    "damage": 0,
    "armor": 23,
    "magicResistance": 0,
    "range": 0,
    "speed": 0,
    "baseAttackTime": 0,
    "baseAttackSpeed": 100,
    "attackInterval": 0,
    "xpBounty": 0,
    "goldMin": 0,
    "goldMax": 0,
    "bounty": 0,
    "radius": 350,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_BUILDING",
    "ancient": false,
    "attackType": "none",
    "abilities": [
      "backdoor_protection_in_base",
      "creep_siege"
    ]
  },
  "fountain": {
    "sourceId": "dota_fountain",
    "name": "泉水",
    "nameEn": "Fountain",
    "maxHp": 500,
    "hpRegen": 0,
    "damageMin": 290,
    "damageMax": 310,
    "damage": 300,
    "armor": 0,
    "magicResistance": 0,
    "range": 1200,
    "speed": 0,
    "baseAttackTime": 0.15,
    "baseAttackSpeed": 100,
    "attackInterval": 0.15,
    "xpBounty": 0,
    "goldMin": 0,
    "goldMax": 0,
    "bounty": 0,
    "radius": 220,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_TOWER",
    "ancient": false,
    "attackType": "ranged",
    "abilities": [
      "creep_siege"
    ],
    "invulnerable": true
  },
  "filler": {
    "sourceId": "npc_dota_goodguys_fillers",
    "name": "????",
    "nameEn": "Base Filler Building",
    "maxHp": 1000,
    "hpRegen": 0,
    "damageMin": 0,
    "damageMax": 0,
    "damage": 0,
    "armor": 10,
    "magicResistance": 0,
    "range": 0,
    "speed": 0,
    "baseAttackTime": 0,
    "baseAttackSpeed": 100,
    "attackInterval": 0,
    "xpBounty": 0,
    "goldMin": 68,
    "goldMax": 68,
    "bounty": 68,
    "radius": 100,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_FILLER",
    "ancient": false,
    "attackType": "none",
    "abilities": [
      "backdoor_protection_in_base",
      "creep_siege"
    ]
  }
};

export const NEUTRAL_UNITS = {
  "kobold": {
    "sourceId": "npc_dota_neutral_kobold",
    "name": "狗头人",
    "nameEn": "Kobold",
    "maxHp": 240,
    "hpRegen": 0.5,
    "damageMin": 15,
    "damageMax": 16,
    "damage": 15.5,
    "armor": 0,
    "magicResistance": 0,
    "range": 100,
    "speed": 290,
    "baseAttackTime": 2,
    "baseAttackSpeed": 200,
    "attackInterval": 1,
    "xpBounty": 14,
    "goldMin": 3,
    "goldMax": 5,
    "bounty": 4,
    "radius": 40,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": false,
    "attackType": "melee",
    "abilities": [
      "kobold_tunneler_prospecting",
      "neutral_upgrade"
    ]
  },
  "kobold_tunneler": {
    "sourceId": "npc_dota_neutral_kobold_tunneler",
    "name": "狗头人士兵",
    "nameEn": "Kobold Soldier",
    "maxHp": 325,
    "hpRegen": 0.5,
    "damageMin": 22,
    "damageMax": 23,
    "damage": 22.5,
    "armor": 1,
    "magicResistance": 0,
    "range": 100,
    "speed": 270,
    "baseAttackTime": 2,
    "baseAttackSpeed": 200,
    "attackInterval": 1,
    "xpBounty": 17,
    "goldMin": 12,
    "goldMax": 14,
    "bounty": 13,
    "radius": 40,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": false,
    "attackType": "melee",
    "abilities": [
      "kobold_disarm",
      "neutral_upgrade"
    ]
  },
  "kobold_taskmaster": {
    "sourceId": "npc_dota_neutral_kobold_taskmaster",
    "name": "狗头人长官",
    "nameEn": "Kobold Foreman",
    "maxHp": 400,
    "hpRegen": 0.5,
    "damageMin": 24,
    "damageMax": 26,
    "damage": 25,
    "armor": 2,
    "magicResistance": 0,
    "range": 110,
    "speed": 330,
    "baseAttackTime": 2,
    "baseAttackSpeed": 200,
    "attackInterval": 1,
    "xpBounty": 30,
    "goldMin": 19,
    "goldMax": 21,
    "bounty": 20,
    "radius": 50,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": false,
    "attackType": "melee",
    "abilities": [
      "kobold_taskmaster_speed_aura",
      "neutral_upgrade"
    ]
  },
  "centaur_outrunner": {
    "sourceId": "npc_dota_neutral_centaur_outrunner",
    "name": "半人马猎手",
    "nameEn": "Centaur Courser",
    "maxHp": 350,
    "hpRegen": 0.5,
    "damageMin": 18,
    "damageMax": 20,
    "damage": 19,
    "armor": 1,
    "magicResistance": 0,
    "range": 100,
    "speed": 320,
    "baseAttackTime": 2,
    "baseAttackSpeed": 150,
    "attackInterval": 1.3333333333333333,
    "xpBounty": 32,
    "goldMin": 16,
    "goldMax": 18,
    "bounty": 17,
    "radius": 60,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": false,
    "attackType": "melee",
    "abilities": [
      "mudgolem_cloak_aura",
      "neutral_upgrade"
    ]
  },
  "centaur_khan": {
    "sourceId": "npc_dota_neutral_centaur_khan",
    "name": "半人马征服者",
    "nameEn": "Centaur Conqueror",
    "maxHp": 1100,
    "hpRegen": 1,
    "damageMin": 49,
    "damageMax": 55,
    "damage": 52,
    "armor": 4,
    "magicResistance": 0,
    "range": 100,
    "speed": 320,
    "baseAttackTime": 2,
    "baseAttackSpeed": 135,
    "attackInterval": 1.4814814814814814,
    "xpBounty": 90,
    "goldMin": 54,
    "goldMax": 60,
    "bounty": 57,
    "radius": 80,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": false,
    "attackType": "melee",
    "abilities": [
      "centaur_khan_war_stomp",
      "neutral_upgrade"
    ]
  },
  "fel_beast": {
    "sourceId": "npc_dota_neutral_fel_beast",
    "name": "魔能之魂",
    "nameEn": "Fell Spirit",
    "maxHp": 400,
    "hpRegen": 0.5,
    "damageMin": 14,
    "damageMax": 15,
    "damage": 14.5,
    "armor": 1,
    "magicResistance": 0,
    "range": 100,
    "speed": 350,
    "baseAttackTime": 2,
    "baseAttackSpeed": 135,
    "attackInterval": 1.4814814814814814,
    "xpBounty": 26,
    "goldMin": 16,
    "goldMax": 18,
    "bounty": 17,
    "radius": 35,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": false,
    "attackType": "melee",
    "abilities": [
      "fel_beast_haunt",
      "neutral_upgrade"
    ]
  },
  "polar_furbolg_champion": {
    "sourceId": "npc_dota_neutral_polar_furbolg_champion",
    "name": "熊怪",
    "nameEn": "Hellbear",
    "maxHp": 700,
    "hpRegen": 0.5,
    "damageMin": 39,
    "damageMax": 44,
    "damage": 41.5,
    "armor": 3,
    "magicResistance": 0,
    "range": 100,
    "speed": 320,
    "baseAttackTime": 2,
    "baseAttackSpeed": 135,
    "attackInterval": 1.4814814814814814,
    "xpBounty": 66,
    "goldMin": 30,
    "goldMax": 38,
    "bounty": 34,
    "radius": 50,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": false,
    "attackType": "melee",
    "abilities": [
      "centaur_khan_endurance_aura",
      "furbolg_enrage_attack_speed",
      "neutral_upgrade"
    ]
  },
  "polar_furbolg_ursa_warrior": {
    "sourceId": "npc_dota_neutral_polar_furbolg_ursa_warrior",
    "name": "熊怪粉碎者",
    "nameEn": "Hellbear Smasher",
    "maxHp": 950,
    "hpRegen": 1,
    "damageMin": 49,
    "damageMax": 55,
    "damage": 52,
    "armor": 4,
    "magicResistance": 0,
    "range": 100,
    "speed": 320,
    "baseAttackTime": 2,
    "baseAttackSpeed": 135,
    "attackInterval": 1.4814814814814814,
    "xpBounty": 90,
    "goldMin": 62,
    "goldMax": 66,
    "bounty": 64,
    "radius": 70,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": false,
    "attackType": "melee",
    "abilities": [
      "polar_furbolg_ursa_warrior_thunder_clap",
      "furbolg_enrage_damage",
      "neutral_upgrade"
    ]
  },
  "warpine_raider": {
    "sourceId": "npc_dota_neutral_warpine_raider",
    "name": "邪松劫掠者",
    "nameEn": "Warpine Raider",
    "maxHp": 850,
    "hpRegen": 2.5,
    "damageMin": 39,
    "damageMax": 41,
    "damage": 40,
    "armor": 6,
    "magicResistance": 0.3,
    "range": 100,
    "speed": 310,
    "baseAttackTime": 2,
    "baseAttackSpeed": 150,
    "attackInterval": 1.3333333333333333,
    "xpBounty": 76,
    "goldMin": 48,
    "goldMax": 50,
    "bounty": 49,
    "radius": 60,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": false,
    "attackType": "melee",
    "abilities": [
      "warpine_raider_seed_shot",
      "neutral_upgrade"
    ]
  },
  "mud_golem": {
    "sourceId": "npc_dota_neutral_mud_golem",
    "name": "泥土傀儡",
    "nameEn": "Mud Golem",
    "maxHp": 750,
    "hpRegen": 0.5,
    "damageMin": 24,
    "damageMax": 26,
    "damage": 25,
    "armor": 0,
    "magicResistance": 0.3,
    "range": 100,
    "speed": 310,
    "baseAttackTime": 2,
    "baseAttackSpeed": 150,
    "attackInterval": 1.3333333333333333,
    "xpBounty": 32,
    "goldMin": 19,
    "goldMax": 21,
    "bounty": 20,
    "radius": 60,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": false,
    "attackType": "melee",
    "abilities": [
      "mud_golem_hurl_boulder",
      "mud_golem_rock_destroy",
      "neutral_upgrade"
    ]
  },
  "mud_golem_split": {
    "sourceId": "npc_dota_neutral_mud_golem_split",
    "name": "碎土傀儡",
    "nameEn": "Shard Golem",
    "maxHp": 250,
    "hpRegen": 0.5,
    "damageMin": 10,
    "damageMax": 14,
    "damage": 12,
    "armor": 0,
    "magicResistance": 0.33,
    "range": 100,
    "speed": 310,
    "baseAttackTime": 2,
    "baseAttackSpeed": 150,
    "attackInterval": 1.3333333333333333,
    "xpBounty": 18,
    "goldMin": 6,
    "goldMax": 10,
    "bounty": 8,
    "radius": 60,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": false,
    "attackType": "melee",
    "abilities": [
      "mud_golem_hurl_boulder",
      "neutral_upgrade"
    ]
  },
  "ogre_mauler": {
    "sourceId": "npc_dota_neutral_ogre_mauler",
    "name": "食人魔拳手",
    "nameEn": "Ogre Bruiser",
    "maxHp": 800,
    "hpRegen": 0.5,
    "damageMin": 22,
    "damageMax": 24,
    "damage": 23,
    "armor": 1,
    "magicResistance": 0,
    "range": 100,
    "speed": 270,
    "baseAttackTime": 2,
    "baseAttackSpeed": 150,
    "attackInterval": 1.3333333333333333,
    "xpBounty": 32,
    "goldMin": 22,
    "goldMax": 26,
    "bounty": 24,
    "radius": 60,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": false,
    "attackType": "melee",
    "abilities": [
      "ogre_bruiser_ogre_smash",
      "neutral_upgrade"
    ]
  },
  "ogre_magi": {
    "sourceId": "npc_dota_neutral_ogre_magi",
    "name": "食人魔冰霜法师",
    "nameEn": "Ogre Frostmage",
    "maxHp": 600,
    "hpRegen": 0.5,
    "damageMin": 18,
    "damageMax": 20,
    "damage": 19,
    "armor": 0,
    "magicResistance": 0,
    "range": 100,
    "speed": 270,
    "baseAttackTime": 2,
    "baseAttackSpeed": 150,
    "attackInterval": 1.3333333333333333,
    "xpBounty": 48,
    "goldMin": 28,
    "goldMax": 32,
    "bounty": 30,
    "radius": 60,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": false,
    "attackType": "melee",
    "abilities": [
      "ogre_magi_frost_armor",
      "neutral_upgrade"
    ]
  },
  "giant_wolf": {
    "sourceId": "npc_dota_neutral_giant_wolf",
    "name": "巨狼",
    "nameEn": "Giant Wolf",
    "maxHp": 500,
    "hpRegen": 0.5,
    "damageMin": 15,
    "damageMax": 17,
    "damage": 16,
    "armor": 1,
    "magicResistance": 0,
    "range": 90,
    "speed": 350,
    "baseAttackTime": 2,
    "baseAttackSpeed": 125,
    "attackInterval": 1.6,
    "xpBounty": 40,
    "goldMin": 18,
    "goldMax": 22,
    "bounty": 20,
    "radius": 45,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": false,
    "attackType": "melee",
    "abilities": [
      "giant_wolf_intimidate",
      "neutral_upgrade"
    ]
  },
  "alpha_wolf": {
    "sourceId": "npc_dota_neutral_alpha_wolf",
    "name": "头狼",
    "nameEn": "Alpha Wolf",
    "maxHp": 600,
    "hpRegen": 0.5,
    "damageMin": 27,
    "damageMax": 29,
    "damage": 28,
    "armor": 3,
    "magicResistance": 0,
    "range": 90,
    "speed": 350,
    "baseAttackTime": 2,
    "baseAttackSpeed": 150,
    "attackInterval": 1.3333333333333333,
    "xpBounty": 60,
    "goldMin": 32,
    "goldMax": 34,
    "bounty": 33,
    "radius": 70,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": false,
    "attackType": "melee",
    "abilities": [
      "alpha_wolf_critical_strike",
      "alpha_wolf_command_aura",
      "neutral_upgrade"
    ]
  },
  "wildkin": {
    "sourceId": "npc_dota_neutral_wildkin",
    "name": "枭兽",
    "nameEn": "Wildwing",
    "maxHp": 350,
    "hpRegen": 0.5,
    "damageMin": 18,
    "damageMax": 20,
    "damage": 19,
    "armor": 2,
    "magicResistance": 0,
    "range": 128,
    "speed": 300,
    "baseAttackTime": 2,
    "baseAttackSpeed": 150,
    "attackInterval": 1.3333333333333333,
    "xpBounty": 26,
    "goldMin": 16,
    "goldMax": 18,
    "bounty": 17,
    "radius": 50,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": false,
    "attackType": "melee",
    "abilities": [
      "enraged_wildkin_tornado",
      "neutral_upgrade"
    ]
  },
  "enraged_wildkin": {
    "sourceId": "npc_dota_neutral_enraged_wildkin",
    "name": "枭兽撕裂者",
    "nameEn": "Wildwing Ripper",
    "maxHp": 950,
    "hpRegen": 0.5,
    "damageMin": 50,
    "damageMax": 56,
    "damage": 53,
    "armor": 4,
    "magicResistance": 0,
    "range": 128,
    "speed": 320,
    "baseAttackTime": 2,
    "baseAttackSpeed": 150,
    "attackInterval": 1.3333333333333333,
    "xpBounty": 90,
    "goldMin": 58,
    "goldMax": 64,
    "bounty": 61,
    "radius": 50,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": false,
    "attackType": "melee",
    "abilities": [
      "enraged_wildkin_hurricane",
      "enraged_wildkin_toughness_aura",
      "neutral_upgrade"
    ]
  },
  "satyr_soulstealer": {
    "sourceId": "npc_dota_neutral_satyr_soulstealer",
    "name": "萨特心智窃取者",
    "nameEn": "Satyr Mindstealer",
    "maxHp": 600,
    "hpRegen": 0.5,
    "damageMin": 21,
    "damageMax": 23,
    "damage": 22,
    "armor": 2,
    "magicResistance": 0,
    "range": 100,
    "speed": 270,
    "baseAttackTime": 2,
    "baseAttackSpeed": 125,
    "attackInterval": 1.6,
    "xpBounty": 46,
    "goldMin": 18,
    "goldMax": 22,
    "bounty": 20,
    "radius": 50,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": false,
    "attackType": "melee",
    "abilities": [
      "satyr_soulstealer_mana_burn",
      "forest_troll_high_priest_mana_aura",
      "neutral_upgrade"
    ]
  },
  "satyr_hellcaller": {
    "sourceId": "npc_dota_neutral_satyr_hellcaller",
    "name": "萨特苦难使者",
    "nameEn": "Satyr Tormenter",
    "maxHp": 1100,
    "hpRegen": 1,
    "damageMin": 49,
    "damageMax": 55,
    "damage": 52,
    "armor": 2,
    "magicResistance": 0,
    "range": 100,
    "speed": 290,
    "baseAttackTime": 2,
    "baseAttackSpeed": 150,
    "attackInterval": 1.3333333333333333,
    "xpBounty": 90,
    "goldMin": 60,
    "goldMax": 66,
    "bounty": 63,
    "radius": 60,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": false,
    "attackType": "melee",
    "abilities": [
      "satyr_hellcaller_shockwave",
      "satyr_hellcaller_unholy_aura",
      "neutral_upgrade"
    ]
  },
  "satyr_trickster": {
    "sourceId": "npc_dota_neutral_satyr_trickster",
    "name": "萨特放逐者",
    "nameEn": "Satyr Banisher",
    "maxHp": 300,
    "hpRegen": 0.5,
    "damageMin": 10,
    "damageMax": 12,
    "damage": 11,
    "armor": 0,
    "magicResistance": 0,
    "range": 280,
    "speed": 300,
    "baseAttackTime": 2,
    "baseAttackSpeed": 125,
    "attackInterval": 1.6,
    "xpBounty": 24,
    "goldMin": 12,
    "goldMax": 14,
    "bounty": 13,
    "radius": 50,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": false,
    "attackType": "ranged",
    "abilities": [
      "satyr_trickster_purge",
      "neutral_upgrade"
    ]
  },
  "jungle_stalker": {
    "sourceId": "npc_dota_neutral_jungle_stalker",
    "name": "远古潜行者",
    "nameEn": "Ancient Jungle Stalker",
    "maxHp": 1600,
    "hpRegen": 0.5,
    "damageMin": 46,
    "damageMax": 64,
    "damage": 55,
    "armor": 3,
    "magicResistance": 0.5,
    "range": 128,
    "speed": 320,
    "baseAttackTime": 1.35,
    "baseAttackSpeed": 100,
    "attackInterval": 1.35,
    "xpBounty": 95,
    "goldMin": 36,
    "goldMax": 49,
    "bounty": 42.5,
    "radius": 50,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": true,
    "attackType": "melee",
    "abilities": []
  },
  "elder_jungle_stalker": {
    "sourceId": "npc_dota_neutral_elder_jungle_stalker",
    "name": "远古长者潜行者",
    "nameEn": "Ancient Elder Jungle Stalker",
    "maxHp": 2000,
    "hpRegen": 0.5,
    "damageMin": 56,
    "damageMax": 78,
    "damage": 67,
    "armor": 5,
    "magicResistance": 0.5,
    "range": 100,
    "speed": 320,
    "baseAttackTime": 1.35,
    "baseAttackSpeed": 100,
    "attackInterval": 1.35,
    "xpBounty": 124,
    "goldMin": 108,
    "goldMax": 121,
    "bounty": 114.5,
    "radius": 60,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": true,
    "attackType": "melee",
    "abilities": []
  },
  "prowler_acolyte": {
    "sourceId": "npc_dota_neutral_prowler_acolyte",
    "name": "远古潜行者侍僧",
    "nameEn": "Ancient Prowler Acolyte",
    "maxHp": 750,
    "hpRegen": 0.5,
    "damageMin": 33,
    "damageMax": 38,
    "damage": 35.5,
    "armor": 11,
    "magicResistance": 0,
    "range": 100,
    "speed": 270,
    "baseAttackTime": 2,
    "baseAttackSpeed": 135,
    "attackInterval": 1.4814814814814814,
    "xpBounty": 95,
    "goldMin": 37,
    "goldMax": 43,
    "bounty": 40,
    "radius": 70,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": true,
    "attackType": "melee",
    "abilities": [
      "spawnlord_aura",
      "neutral_upgrade"
    ]
  },
  "prowler_shaman": {
    "sourceId": "npc_dota_neutral_prowler_shaman",
    "name": "远古潜行者萨满",
    "nameEn": "Ancient Prowler Shaman",
    "maxHp": 1400,
    "hpRegen": 0.5,
    "damageMin": 59,
    "damageMax": 65,
    "damage": 62,
    "armor": 12,
    "magicResistance": 0,
    "range": 100,
    "speed": 300,
    "baseAttackTime": 2,
    "baseAttackSpeed": 135,
    "attackInterval": 1.4814814814814814,
    "xpBounty": 124,
    "goldMin": 76,
    "goldMax": 80,
    "bounty": 78,
    "radius": 80,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": true,
    "attackType": "melee",
    "abilities": [
      "spawnlord_master_stomp",
      "spawnlord_master_freeze",
      "neutral_upgrade"
    ]
  },
  "rock_golem": {
    "sourceId": "npc_dota_neutral_rock_golem",
    "name": "远古岩石傀儡",
    "nameEn": "Ancient Rock Golem",
    "maxHp": 800,
    "hpRegen": 0.5,
    "damageMin": 22,
    "damageMax": 24,
    "damage": 23,
    "armor": 4,
    "magicResistance": 0.3,
    "range": 100,
    "speed": 270,
    "baseAttackTime": 2,
    "baseAttackSpeed": 150,
    "attackInterval": 1.3333333333333333,
    "xpBounty": 95,
    "goldMin": 37,
    "goldMax": 43,
    "bounty": 40,
    "radius": 60,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": true,
    "attackType": "melee",
    "abilities": [
      "ancient_rock_golem_weakening_aura",
      "neutral_upgrade"
    ]
  },
  "granite_golem": {
    "sourceId": "npc_dota_neutral_granite_golem",
    "name": "远古花岗岩傀儡",
    "nameEn": "Ancient Granite Golem",
    "maxHp": 1500,
    "hpRegen": 1.5,
    "damageMin": 80,
    "damageMax": 84,
    "damage": 82,
    "armor": 8,
    "magicResistance": 0.3,
    "range": 128,
    "speed": 270,
    "baseAttackTime": 2,
    "baseAttackSpeed": 150,
    "attackInterval": 1.3333333333333333,
    "xpBounty": 124,
    "goldMin": 76,
    "goldMax": 80,
    "bounty": 78,
    "radius": 60,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": true,
    "attackType": "melee",
    "abilities": [
      "granite_golem_hp_aura",
      "neutral_upgrade"
    ]
  },
  "ice_shaman": {
    "sourceId": "npc_dota_neutral_ice_shaman",
    "name": "远古寒冰萨满",
    "nameEn": "Ancient Ice Shaman",
    "maxHp": 1500,
    "hpRegen": 0.5,
    "damageMin": 58,
    "damageMax": 62,
    "damage": 60,
    "armor": 3,
    "magicResistance": 0.3,
    "range": 500,
    "speed": 290,
    "baseAttackTime": 2,
    "baseAttackSpeed": 135,
    "attackInterval": 1.4814814814814814,
    "xpBounty": 124,
    "goldMin": 76,
    "goldMax": 80,
    "bounty": 78,
    "radius": 90,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": true,
    "attackType": "ranged",
    "abilities": [
      "ice_shaman_incendiary_bomb",
      "neutral_upgrade"
    ]
  },
  "frostbitten_golem": {
    "sourceId": "npc_dota_neutral_frostbitten_golem",
    "name": "远古霜害傀儡",
    "nameEn": "Ancient Frostbitten Golem",
    "maxHp": 900,
    "hpRegen": 2,
    "damageMin": 29,
    "damageMax": 31,
    "damage": 30,
    "armor": 7,
    "magicResistance": 0.3,
    "range": 100,
    "speed": 300,
    "baseAttackTime": 2,
    "baseAttackSpeed": 150,
    "attackInterval": 1.3333333333333333,
    "xpBounty": 95,
    "goldMin": 37,
    "goldMax": 43,
    "bounty": 40,
    "radius": 60,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": true,
    "attackType": "melee",
    "abilities": [
      "frostbitten_golem_time_warp_aura",
      "neutral_upgrade"
    ]
  },
  "big_thunder_lizard": {
    "sourceId": "npc_dota_neutral_big_thunder_lizard",
    "name": "远古雷肤兽",
    "nameEn": "Ancient Thunderhide",
    "maxHp": 1700,
    "hpRegen": 0.5,
    "damageMin": 60,
    "damageMax": 65,
    "damage": 62.5,
    "armor": 3,
    "magicResistance": 0.3,
    "range": 300,
    "speed": 270,
    "baseAttackTime": 2,
    "baseAttackSpeed": 120,
    "attackInterval": 1.6666666666666667,
    "xpBounty": 124,
    "goldMin": 76,
    "goldMax": 80,
    "bounty": 78,
    "radius": 90,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": true,
    "attackType": "ranged",
    "abilities": [
      "big_thunder_lizard_slam",
      "big_thunder_lizard_frenzy",
      "neutral_upgrade"
    ]
  },
  "small_thunder_lizard": {
    "sourceId": "npc_dota_neutral_small_thunder_lizard",
    "name": "远古岚肤兽",
    "nameEn": "Ancient Rumblehide",
    "maxHp": 800,
    "hpRegen": 0.5,
    "damageMin": 32,
    "damageMax": 34,
    "damage": 33,
    "armor": 3,
    "magicResistance": 0.5,
    "range": 300,
    "speed": 270,
    "baseAttackTime": 1.8,
    "baseAttackSpeed": 100,
    "attackInterval": 1.8,
    "xpBounty": 95,
    "goldMin": 42,
    "goldMax": 49,
    "bounty": 45.5,
    "radius": 70,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": true,
    "attackType": "ranged",
    "abilities": [
      "big_thunder_lizard_wardrums_aura",
      "neutral_upgrade"
    ]
  },
  "gnoll_assassin": {
    "sourceId": "npc_dota_neutral_gnoll_assassin",
    "name": "鹰身刺客",
    "nameEn": "Vhoul Assassin",
    "maxHp": 400,
    "hpRegen": 0.5,
    "damageMin": 25,
    "damageMax": 27,
    "damage": 26,
    "armor": 1,
    "magicResistance": 0,
    "range": 500,
    "speed": 270,
    "baseAttackTime": 2,
    "baseAttackSpeed": 125,
    "attackInterval": 1.6,
    "xpBounty": 30,
    "goldMin": 16,
    "goldMax": 18,
    "bounty": 17,
    "radius": 40,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": false,
    "attackType": "ranged",
    "abilities": [
      "gnoll_assassin_envenomed_weapon",
      "creep_piercing",
      "neutral_upgrade"
    ]
  },
  "ghost": {
    "sourceId": "npc_dota_neutral_ghost",
    "name": "幽魂",
    "nameEn": "Ghost",
    "maxHp": 500,
    "hpRegen": 0.5,
    "damageMin": 38,
    "damageMax": 43,
    "damage": 40.5,
    "armor": 2,
    "magicResistance": 0,
    "range": 400,
    "speed": 320,
    "baseAttackTime": 2,
    "baseAttackSpeed": 165,
    "attackInterval": 1.2121212121212122,
    "xpBounty": 42,
    "goldMin": 23,
    "goldMax": 25,
    "bounty": 24,
    "radius": 45,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": false,
    "attackType": "ranged",
    "abilities": [
      "ghost_frost_attack",
      "creep_piercing",
      "neutral_upgrade"
    ]
  },
  "dark_troll": {
    "sourceId": "npc_dota_neutral_dark_troll",
    "name": "丘陵巨魔",
    "nameEn": "Hill Troll",
    "maxHp": 500,
    "hpRegen": 0.5,
    "damageMin": 24,
    "damageMax": 27,
    "damage": 25.5,
    "armor": 0,
    "magicResistance": 0,
    "range": 250,
    "speed": 270,
    "baseAttackTime": 2,
    "baseAttackSpeed": 150,
    "attackInterval": 1.3333333333333333,
    "xpBounty": 42,
    "goldMin": 17,
    "goldMax": 19,
    "bounty": 18,
    "radius": 60,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": false,
    "attackType": "ranged",
    "abilities": [
      "dark_troll_warlord_ensnare",
      "creep_piercing",
      "neutral_upgrade"
    ]
  },
  "dark_troll_warlord": {
    "sourceId": "npc_dota_neutral_dark_troll_warlord",
    "name": "黑暗巨魔召唤法师",
    "nameEn": "Dark Troll Summoner",
    "maxHp": 1100,
    "hpRegen": 0.5,
    "damageMin": 40,
    "damageMax": 45,
    "damage": 42.5,
    "armor": 4,
    "magicResistance": 0,
    "range": 250,
    "speed": 300,
    "baseAttackTime": 2,
    "baseAttackSpeed": 150,
    "attackInterval": 1.3333333333333333,
    "xpBounty": 90,
    "goldMin": 40,
    "goldMax": 46,
    "bounty": 43,
    "radius": 60,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": false,
    "attackType": "ranged",
    "abilities": [
      "dark_troll_warlord_raise_dead",
      "neutral_upgrade"
    ]
  },
  "forest_troll_berserker": {
    "sourceId": "npc_dota_neutral_forest_troll_berserker",
    "name": "丘陵巨魔狂战士",
    "nameEn": "Hill Troll Berserker",
    "maxHp": 500,
    "hpRegen": 0.5,
    "damageMin": 28,
    "damageMax": 37,
    "damage": 32.5,
    "armor": 1,
    "magicResistance": 0,
    "range": 500,
    "speed": 270,
    "baseAttackTime": 2,
    "baseAttackSpeed": 125,
    "attackInterval": 1.6,
    "xpBounty": 28,
    "goldMin": 18,
    "goldMax": 20,
    "bounty": 19,
    "radius": 50,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": false,
    "attackType": "ranged",
    "abilities": [
      "berserker_troll_break",
      "creep_piercing",
      "neutral_upgrade"
    ]
  },
  "forest_troll_high_priest": {
    "sourceId": "npc_dota_neutral_forest_troll_high_priest",
    "name": "丘陵巨魔牧师",
    "nameEn": "Hill Troll Priest",
    "maxHp": 450,
    "hpRegen": 0.5,
    "damageMin": 28,
    "damageMax": 34,
    "damage": 31,
    "armor": 0,
    "magicResistance": 0,
    "range": 600,
    "speed": 290,
    "baseAttackTime": 2,
    "baseAttackSpeed": 125,
    "attackInterval": 1.6,
    "xpBounty": 28,
    "goldMin": 18,
    "goldMax": 20,
    "bounty": 19,
    "radius": 50,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": false,
    "attackType": "ranged",
    "abilities": [
      "forest_troll_high_priest_heal",
      "forest_troll_high_priest_heal_amp_aura",
      "creep_piercing",
      "neutral_upgrade"
    ]
  },
  "harpy_scout": {
    "sourceId": "npc_dota_neutral_harpy_scout",
    "name": "鹰身女妖侦察者",
    "nameEn": "Harpy Scout",
    "maxHp": 400,
    "hpRegen": 0.5,
    "damageMin": 28,
    "damageMax": 34,
    "damage": 31,
    "armor": 1,
    "magicResistance": 0,
    "range": 300,
    "speed": 280,
    "baseAttackTime": 2,
    "baseAttackSpeed": 125,
    "attackInterval": 1.6,
    "xpBounty": 26,
    "goldMin": 14,
    "goldMax": 16,
    "bounty": 15,
    "radius": 50,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": false,
    "attackType": "ranged",
    "abilities": [
      "harpy_scout_take_off",
      "creep_piercing",
      "neutral_upgrade"
    ]
  },
  "harpy_storm": {
    "sourceId": "npc_dota_neutral_harpy_storm",
    "name": "鹰身女妖风暴巫师",
    "nameEn": "Harpy Stormcrafter",
    "maxHp": 500,
    "hpRegen": 0.5,
    "damageMin": 30,
    "damageMax": 36,
    "damage": 33,
    "armor": 2,
    "magicResistance": 0,
    "range": 450,
    "speed": 310,
    "baseAttackTime": 2,
    "baseAttackSpeed": 125,
    "attackInterval": 1.6,
    "xpBounty": 42,
    "goldMin": 25,
    "goldMax": 27,
    "bounty": 26,
    "radius": 50,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": false,
    "attackType": "ranged",
    "abilities": [
      "harpy_storm_chain_lightning",
      "creep_piercing",
      "neutral_upgrade"
    ]
  },
  "black_drake": {
    "sourceId": "npc_dota_neutral_black_drake",
    "name": "远古黑蜉蝣",
    "nameEn": "Ancient Black Drake",
    "maxHp": 950,
    "hpRegen": 0.5,
    "damageMin": 20,
    "damageMax": 22,
    "damage": 21,
    "armor": 2,
    "magicResistance": 0.25,
    "range": 300,
    "speed": 350,
    "baseAttackTime": 2,
    "baseAttackSpeed": 120,
    "attackInterval": 1.6666666666666667,
    "xpBounty": 95,
    "goldMin": 37,
    "goldMax": 43,
    "bounty": 40,
    "radius": 70,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": true,
    "attackType": "ranged",
    "abilities": [
      "black_drake_magic_amplification_aura",
      "neutral_upgrade"
    ]
  },
  "black_dragon": {
    "sourceId": "npc_dota_neutral_black_dragon",
    "name": "远古黑龙",
    "nameEn": "Ancient Black Dragon",
    "maxHp": 2000,
    "hpRegen": 2,
    "damageMin": 62,
    "damageMax": 68,
    "damage": 65,
    "armor": 4,
    "magicResistance": 0.3,
    "range": 300,
    "speed": 300,
    "baseAttackTime": 2,
    "baseAttackSpeed": 135,
    "attackInterval": 1.4814814814814814,
    "xpBounty": 124,
    "goldMin": 76,
    "goldMax": 80,
    "bounty": 78,
    "radius": 70,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": true,
    "attackType": "ranged",
    "abilities": [
      "black_dragon_fireball",
      "black_dragon_splash_attack",
      "black_dragon_dragonhide_aura",
      "neutral_upgrade"
    ]
  },
  "tadpole": {
    "sourceId": "npc_dota_neutral_tadpole",
    "name": "蝌蚪",
    "nameEn": "Pollywog",
    "maxHp": 400,
    "hpRegen": 0.5,
    "damageMin": 19,
    "damageMax": 21,
    "damage": 20,
    "armor": 1,
    "magicResistance": 0,
    "range": 100,
    "speed": 270,
    "baseAttackTime": 2,
    "baseAttackSpeed": 125,
    "attackInterval": 1.6,
    "xpBounty": 30,
    "goldMin": 17,
    "goldMax": 19,
    "bounty": 18,
    "radius": 40,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": false,
    "attackType": "melee",
    "abilities": [
      "frogmen_riverborn_aura",
      "neutral_upgrade"
    ]
  },
  "froglet": {
    "sourceId": "npc_dota_neutral_froglet",
    "name": "沼泽幼蛙",
    "nameEn": "Boglet",
    "maxHp": 700,
    "hpRegen": 0.5,
    "damageMin": 22,
    "damageMax": 24,
    "damage": 23,
    "armor": 2,
    "magicResistance": 0,
    "range": 100,
    "speed": 290,
    "baseAttackTime": 2,
    "baseAttackSpeed": 150,
    "attackInterval": 1.3333333333333333,
    "xpBounty": 42,
    "goldMin": 25,
    "goldMax": 29,
    "bounty": 27,
    "radius": 60,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": false,
    "attackType": "melee",
    "abilities": [
      "frogmen_arm_of_the_deep",
      "frogmen_riverborn_aura",
      "neutral_upgrade"
    ]
  },
  "grown_frog": {
    "sourceId": "npc_dota_neutral_grown_frog",
    "name": "巨蛙",
    "nameEn": "Croaker",
    "maxHp": 900,
    "hpRegen": 0.5,
    "damageMin": 41,
    "damageMax": 46,
    "damage": 43.5,
    "armor": 3,
    "magicResistance": 0,
    "range": 100,
    "speed": 300,
    "baseAttackTime": 2,
    "baseAttackSpeed": 135,
    "attackInterval": 1.4814814814814814,
    "xpBounty": 55,
    "goldMin": 37,
    "goldMax": 41,
    "bounty": 39,
    "radius": 50,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": false,
    "attackType": "melee",
    "abilities": [
      "frogmen_tendrils_of_the_deep",
      "frogmen_riverborn_aura",
      "neutral_upgrade"
    ]
  },
  "ancient_frog": {
    "sourceId": "npc_dota_neutral_ancient_frog",
    "name": "远古巨蛙",
    "nameEn": "Ancient Croaker",
    "maxHp": 1250,
    "hpRegen": 2,
    "damageMin": 60,
    "damageMax": 64,
    "damage": 62,
    "armor": 5,
    "magicResistance": 0.3,
    "range": 100,
    "speed": 300,
    "baseAttackTime": 2,
    "baseAttackSpeed": 150,
    "attackInterval": 1.3333333333333333,
    "xpBounty": 104,
    "goldMin": 53,
    "goldMax": 56,
    "bounty": 54.5,
    "radius": 60,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": true,
    "attackType": "melee",
    "abilities": [
      "frogmen_congregation_of_the_deep",
      "frogmen_riverborn_aura",
      "neutral_upgrade"
    ]
  },
  "froglet_mage": {
    "sourceId": "npc_dota_neutral_froglet_mage",
    "name": "沼泽法师学徒",
    "nameEn": "Marshmage Apprentice",
    "maxHp": 700,
    "hpRegen": 0.5,
    "damageMin": 24,
    "damageMax": 27,
    "damage": 25.5,
    "armor": 2,
    "magicResistance": 0,
    "range": 250,
    "speed": 290,
    "baseAttackTime": 2,
    "baseAttackSpeed": 150,
    "attackInterval": 1.3333333333333333,
    "xpBounty": 42,
    "goldMin": 25,
    "goldMax": 29,
    "bounty": 27,
    "radius": 60,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": false,
    "attackType": "ranged",
    "abilities": [
      "frogmen_water_bubble_small",
      "frogmen_riverborn_aura",
      "neutral_upgrade"
    ]
  },
  "grown_frog_mage": {
    "sourceId": "npc_dota_neutral_grown_frog_mage",
    "name": "沼泽法师",
    "nameEn": "Marshmage",
    "maxHp": 900,
    "hpRegen": 0.5,
    "damageMin": 40,
    "damageMax": 45,
    "damage": 42.5,
    "armor": 3,
    "magicResistance": 0,
    "range": 250,
    "speed": 300,
    "baseAttackTime": 2,
    "baseAttackSpeed": 150,
    "attackInterval": 1.3333333333333333,
    "xpBounty": 55,
    "goldMin": 37,
    "goldMax": 41,
    "bounty": 39,
    "radius": 50,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": false,
    "attackType": "ranged",
    "abilities": [
      "frogmen_water_bubble_medium",
      "frogmen_riverborn_aura",
      "neutral_upgrade"
    ]
  },
  "ancient_frog_mage": {
    "sourceId": "npc_dota_neutral_ancient_frog_mage",
    "name": "远古沼泽法师",
    "nameEn": "Ancient Marshmage",
    "maxHp": 1250,
    "hpRegen": 2,
    "damageMin": 58,
    "damageMax": 62,
    "damage": 60,
    "armor": 5,
    "magicResistance": 0.3,
    "range": 500,
    "speed": 300,
    "baseAttackTime": 2,
    "baseAttackSpeed": 135,
    "attackInterval": 1.4814814814814814,
    "xpBounty": 104,
    "goldMin": 53,
    "goldMax": 56,
    "bounty": 54.5,
    "radius": 60,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_HERO",
    "ancient": true,
    "attackType": "ranged",
    "abilities": [
      "frogmen_water_bubble_large",
      "frogmen_riverborn_aura",
      "neutral_upgrade"
    ]
  }
};

export const CAMP_GROUPS = {
  "small": [
    [
      {
        "unitId": "kobold",
        "count": 3
      },
      {
        "unitId": "kobold_tunneler",
        "count": 1
      },
      {
        "unitId": "kobold_taskmaster",
        "count": 1
      }
    ],
    [
      {
        "unitId": "gnoll_assassin",
        "count": 3
      }
    ],
    [
      {
        "unitId": "forest_troll_berserker",
        "count": 2
      },
      {
        "unitId": "forest_troll_high_priest",
        "count": 1
      }
    ],
    [
      {
        "unitId": "forest_troll_berserker",
        "count": 2
      },
      {
        "unitId": "kobold_taskmaster",
        "count": 1
      }
    ],
    [
      {
        "unitId": "fel_beast",
        "count": 2
      },
      {
        "unitId": "ghost",
        "count": 1
      }
    ],
    [
      {
        "unitId": "harpy_scout",
        "count": 2
      },
      {
        "unitId": "harpy_storm",
        "count": 1
      }
    ]
  ],
  "medium": [
    [
      {
        "unitId": "ogre_mauler",
        "count": 2
      },
      {
        "unitId": "ogre_magi",
        "count": 1
      }
    ],
    [
      {
        "unitId": "giant_wolf",
        "count": 2
      },
      {
        "unitId": "alpha_wolf",
        "count": 1
      }
    ],
    [
      {
        "unitId": "mud_golem",
        "count": 2
      }
    ],
    [
      {
        "unitId": "satyr_trickster",
        "count": 2
      },
      {
        "unitId": "satyr_soulstealer",
        "count": 2
      }
    ],
    [
      {
        "unitId": "centaur_outrunner",
        "count": 1
      },
      {
        "unitId": "centaur_khan",
        "count": 1
      }
    ]
  ],
  "large": [
    [
      {
        "unitId": "centaur_outrunner",
        "count": 2
      },
      {
        "unitId": "centaur_khan",
        "count": 1
      }
    ],
    [
      {
        "unitId": "dark_troll",
        "count": 2
      },
      {
        "unitId": "dark_troll_warlord",
        "count": 1
      }
    ],
    [
      {
        "unitId": "polar_furbolg_champion",
        "count": 1
      },
      {
        "unitId": "polar_furbolg_ursa_warrior",
        "count": 1
      }
    ],
    [
      {
        "unitId": "satyr_trickster",
        "count": 1
      },
      {
        "unitId": "satyr_soulstealer",
        "count": 1
      },
      {
        "unitId": "satyr_hellcaller",
        "count": 1
      }
    ],
    [
      {
        "unitId": "wildkin",
        "count": 2
      },
      {
        "unitId": "enraged_wildkin",
        "count": 1
      }
    ],
    [
      {
        "unitId": "warpine_raider",
        "count": 2
      }
    ]
  ],
  "ancient": [
    [
      {
        "unitId": "black_drake",
        "count": 2
      },
      {
        "unitId": "black_dragon",
        "count": 1
      }
    ],
    [
      {
        "unitId": "rock_golem",
        "count": 2
      },
      {
        "unitId": "granite_golem",
        "count": 1
      }
    ],
    [
      {
        "unitId": "small_thunder_lizard",
        "count": 2
      },
      {
        "unitId": "big_thunder_lizard",
        "count": 1
      }
    ],
    [
      {
        "unitId": "frostbitten_golem",
        "count": 2
      },
      {
        "unitId": "ice_shaman",
        "count": 1
      }
    ],
    [
      {
        "unitId": "prowler_acolyte",
        "count": 2
      },
      {
        "unitId": "prowler_shaman",
        "count": 1
      }
    ]
  ]
};

export const FLOODED_CAMP_GROUPS = {
  "small": [
    {
      "unitId": "tadpole",
      "count": 3
    }
  ],
  "medium": [
    {
      "unitId": "froglet",
      "count": 2
    },
    {
      "unitId": "froglet_mage",
      "count": 1
    }
  ],
  "large": [
    {
      "unitId": "grown_frog",
      "count": 2
    },
    {
      "unitId": "grown_frog_mage",
      "count": 1
    }
  ],
  "ancient": [
    {
      "unitId": "ancient_frog",
      "count": 2
    },
    {
      "unitId": "ancient_frog_mage",
      "count": 1
    }
  ]
};

export const LANE_CREEPS = {
  "melee": {
    "sourceId": "npc_dota_creep_goodguys_melee",
    "name": "近战兵",
    "nameEn": "Melee Creep",
    "maxHp": 550,
    "hpRegen": 0.5,
    "damageMin": 19,
    "damageMax": 23,
    "damage": 21,
    "armor": 2,
    "magicResistance": 0,
    "range": 100,
    "speed": 325,
    "baseAttackTime": 1,
    "baseAttackSpeed": 100,
    "attackInterval": 1,
    "xpBounty": 57,
    "goldMin": 34,
    "goldMax": 39,
    "bounty": 36.5,
    "radius": 45,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_REGULAR",
    "ancient": false,
    "attackType": "melee",
    "abilities": [
      "creep_irresolute"
    ]
  },
  "ranged": {
    "sourceId": "npc_dota_creep_goodguys_ranged",
    "name": "远程兵",
    "nameEn": "Ranged Creep",
    "maxHp": 300,
    "hpRegen": 2,
    "damageMin": 21,
    "damageMax": 26,
    "damage": 23.5,
    "armor": 0,
    "magicResistance": 0,
    "range": 500,
    "speed": 325,
    "baseAttackTime": 1,
    "baseAttackSpeed": 100,
    "attackInterval": 1,
    "xpBounty": 69,
    "goldMin": 43,
    "goldMax": 52,
    "bounty": 47.5,
    "radius": 45,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_SMALL",
    "ancient": false,
    "attackType": "ranged",
    "abilities": [
      "creep_piercing"
    ]
  },
  "siege": {
    "sourceId": "npc_dota_goodguys_siege",
    "name": "攻城车",
    "nameEn": "Siege Creep",
    "maxHp": 935,
    "hpRegen": 0,
    "damageMin": 35,
    "damageMax": 46,
    "damage": 40.5,
    "armor": 0,
    "magicResistance": 0.8,
    "range": 690,
    "speed": 325,
    "baseAttackTime": 3,
    "baseAttackSpeed": 100,
    "attackInterval": 3,
    "xpBounty": 88,
    "goldMin": 59,
    "goldMax": 72,
    "bounty": 65.5,
    "radius": 80,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_SIEGE",
    "ancient": false,
    "attackType": "ranged",
    "abilities": [
      "creep_siege"
    ]
  },
  "superMelee": {
    "sourceId": "npc_dota_creep_goodguys_melee_upgraded",
    "name": "超级近战兵",
    "nameEn": "Super Melee Creep",
    "maxHp": 700,
    "hpRegen": 0.5,
    "damageMin": 41,
    "damageMax": 49,
    "damage": 45,
    "armor": 3,
    "magicResistance": 0,
    "range": 100,
    "speed": 325,
    "baseAttackTime": 1,
    "baseAttackSpeed": 100,
    "attackInterval": 1,
    "xpBounty": 25,
    "goldMin": 20,
    "goldMax": 26,
    "bounty": 23,
    "radius": 45,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_REGULAR",
    "ancient": false,
    "attackType": "melee",
    "abilities": [
      "creep_irresolute"
    ]
  },
  "superRanged": {
    "sourceId": "npc_dota_creep_goodguys_ranged_upgraded",
    "name": "超级远程兵",
    "nameEn": "Super Ranged Creep",
    "maxHp": 475,
    "hpRegen": 2,
    "damageMin": 46,
    "damageMax": 51,
    "damage": 48.5,
    "armor": 1,
    "magicResistance": 0,
    "range": 500,
    "speed": 325,
    "baseAttackTime": 1,
    "baseAttackSpeed": 100,
    "attackInterval": 1,
    "xpBounty": 22,
    "goldMin": 19,
    "goldMax": 25,
    "bounty": 22,
    "radius": 45,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_SMALL",
    "ancient": false,
    "attackType": "ranged",
    "abilities": [
      "creep_piercing"
    ]
  },
  "megaMelee": {
    "sourceId": "npc_dota_creep_goodguys_melee_upgraded_mega",
    "name": "超级近战兵（全破路）",
    "nameEn": "Mega Melee Creep",
    "maxHp": 700,
    "hpRegen": 0.5,
    "damageMin": 41,
    "damageMax": 49,
    "damage": 45,
    "armor": 3,
    "magicResistance": 0,
    "range": 100,
    "speed": 325,
    "baseAttackTime": 1,
    "baseAttackSpeed": 100,
    "attackInterval": 1,
    "xpBounty": 25,
    "goldMin": 20,
    "goldMax": 26,
    "bounty": 23,
    "radius": 45,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_REGULAR",
    "ancient": false,
    "attackType": "melee",
    "abilities": [
      "creep_irresolute"
    ],
    "requiresEngineUpgrade": true
  },
  "megaRanged": {
    "sourceId": "npc_dota_creep_goodguys_ranged_upgraded_mega",
    "name": "超级远程兵（全破路）",
    "nameEn": "Mega Ranged Creep",
    "maxHp": 475,
    "hpRegen": 2,
    "damageMin": 46,
    "damageMax": 51,
    "damage": 48.5,
    "armor": 1,
    "magicResistance": 0,
    "range": 500,
    "speed": 325,
    "baseAttackTime": 1,
    "baseAttackSpeed": 100,
    "attackInterval": 1,
    "xpBounty": 22,
    "goldMin": 19,
    "goldMax": 25,
    "bounty": 22,
    "radius": 45,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_SMALL",
    "ancient": false,
    "attackType": "ranged",
    "abilities": [
      "creep_piercing"
    ],
    "requiresEngineUpgrade": true
  },
  "flagbearer": {
    "sourceId": "npc_dota_creep_goodguys_flagbearer",
    "name": "旗手兵",
    "nameEn": "Flagbearer Creep",
    "maxHp": 550,
    "hpRegen": 0.5,
    "damageMin": 19,
    "damageMax": 23,
    "damage": 21,
    "armor": 2,
    "magicResistance": 0.4,
    "range": 100,
    "speed": 325,
    "baseAttackTime": 1,
    "baseAttackSpeed": 100,
    "attackInterval": 1,
    "xpBounty": 57,
    "goldMin": 34,
    "goldMax": 39,
    "bounty": 36.5,
    "radius": 45,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_REGULAR",
    "ancient": false,
    "attackType": "melee",
    "abilities": [
      "creep_irresolute",
      "flagbearer_creep_aura_effect"
    ]
  },
  "superSiege": {
    "sourceId": "npc_dota_goodguys_siege_upgraded",
    "name": "超级攻城车",
    "nameEn": "Super Siege Creep",
    "maxHp": 935,
    "hpRegen": 0,
    "damageMin": 51,
    "damageMax": 62,
    "damage": 56.5,
    "armor": 0,
    "magicResistance": 0.8,
    "range": 690,
    "speed": 325,
    "baseAttackTime": 3,
    "baseAttackSpeed": 100,
    "attackInterval": 3,
    "xpBounty": 88,
    "goldMin": 59,
    "goldMax": 72,
    "bounty": 65.5,
    "radius": 80,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_SIEGE",
    "ancient": false,
    "attackType": "ranged",
    "abilities": [
      "creep_siege"
    ]
  },
  "megaSiege": {
    "sourceId": "npc_dota_goodguys_siege_upgraded_mega",
    "name": "超级攻城车（全破路）",
    "nameEn": "Mega Siege Creep",
    "maxHp": 935,
    "hpRegen": 0,
    "damageMin": 51,
    "damageMax": 62,
    "damage": 56.5,
    "armor": 0,
    "magicResistance": 0.8,
    "range": 690,
    "speed": 325,
    "baseAttackTime": 3,
    "baseAttackSpeed": 100,
    "attackInterval": 3,
    "xpBounty": 88,
    "goldMin": 59,
    "goldMax": 72,
    "bounty": 65.5,
    "radius": 80,
    "radiusKind": "selectionRing",
    "hullName": "DOTA_HULL_SIZE_SIEGE",
    "ancient": false,
    "attackType": "ranged",
    "abilities": [
      "creep_siege"
    ],
    "requiresEngineUpgrade": true
  }
};

export const RULES = {
  "laneWaveInterval": 30,
  "firstLaneWave": 0,
  "firstNeutralSpawn": 60,
  "campSpawnInterval": 60,
  "neutralUpgrade": {
    "interval": 450,
    "maxStacks": 30,
    "damage": 3,
    "attackSpeed": 5,
    "maxHp": 30,
    "armor": 0.5,
    "goldBounty": 1,
    "xpBounty": 5
  },
  "laneUpgradeInterval": 450,
  "meleeGoldPerUpgrade": 1,
  "flagbearerGoldPerUpgrade": 1,
  "floodedEvolutionInterval": 300,
  "floodedUnitsPerCamp": 3,
  "siegeExtraCountAt": [
    1800,
    3600
  ],
  "tower4ArmorPerStandingBarracks": 4,
  "roshanRespawnMin": 480,
  "roshanRespawnMax": 660,
  "roshanInitialPit": "top"
};

export const ROSHAN = {
  "sourceId": "npc_dota_roshan",
  "name": "肉山",
  "nameEn": "Roshan",
  "maxHp": 6000,
  "hpRegen": 20,
  "damageMin": 75,
  "damageMax": 75,
  "damage": 75,
  "armor": 30,
  "magicResistance": 0.55,
  "range": 150,
  "speed": 270,
  "baseAttackTime": 2,
  "baseAttackSpeed": 100,
  "attackInterval": 2,
  "xpBounty": 400,
  "goldMin": 200,
  "goldMax": 290,
  "bounty": 245,
  "radius": 110,
  "radiusKind": "selectionRing",
  "hullName": "DOTA_HULL_SIZE_HERO",
  "ancient": true,
  "attackType": "melee",
  "abilities": [
    "roshan_revengeroar",
    "roshan_slam",
    "roshan_inherent_buffs",
    "roshan_devotion",
    "roshan_bash",
    "roshan_spell_block",
    "roshan_grab_and_throw"
  ]
};

export const NEUTRAL_ABILITIES = {
  "kobold_tunneler_prospecting": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_PASSIVE",
    "passive": true,
    "manaCost": "0",
    "cooldown": "0",
    "castRange": "0",
    "values": {
      "gpm_aura": {
        "value": "20 25 30 40"
      },
      "radius": {
        "value": "1200",
        "affected_by_aoe_increase": "1"
      }
    },
    "special": {}
  },
  "neutral_upgrade": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_PASSIVE",
    "passive": true,
    "manaCost": "0",
    "cooldown": "0",
    "castRange": "0",
    "values": {
      "max_level": "30",
      "increase_time": "450",
      "increase_damage": "3",
      "increase_aspd": "5",
      "increase_health": "30",
      "increase_armor": "0.5",
      "increase_gold": "1",
      "increase_xp": "5"
    },
    "special": {}
  },
  "kobold_disarm": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_PASSIVE",
    "passive": true,
    "manaCost": "0",
    "cooldown": "9.0",
    "castRange": "0",
    "values": {
      "duration": {
        "value": "3.0 3.5 4.0 5.0"
      }
    },
    "special": {}
  },
  "kobold_taskmaster_speed_aura": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_PASSIVE",
    "passive": true,
    "manaCost": "0",
    "cooldown": "0",
    "castRange": "0",
    "values": {
      "bonus_movement_speed": {
        "value": "12 13 14 16"
      },
      "radius": {
        "value": "1200",
        "affected_by_aoe_increase": "1"
      }
    },
    "special": {}
  },
  "mudgolem_cloak_aura": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_PASSIVE",
    "passive": true,
    "manaCost": "0",
    "cooldown": "0",
    "castRange": "0",
    "values": {
      "bonus_magical_armor": {
        "value": "10 12 14 16"
      },
      "bonus_magical_armor_creeps": {
        "value": "20 24 28 32"
      },
      "radius": {
        "value": "1200",
        "affected_by_aoe_increase": "1"
      }
    },
    "special": {}
  },
  "centaur_khan_war_stomp": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_NO_TARGET",
    "passive": false,
    "manaCost": "50",
    "cooldown": "12.0",
    "castRange": "0",
    "values": {
      "radius": {
        "value": "250",
        "affected_by_aoe_increase": "1"
      },
      "non_hero_stun_duration": "3.0",
      "hero_stun_duration": "1.6"
    },
    "special": {}
  },
  "fel_beast_haunt": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_UNIT_TARGET",
    "passive": false,
    "manaCost": "75",
    "cooldown": "15 13 11 7",
    "castRange": "600",
    "values": {
      "projectile_speed": "500 600 700 800",
      "duration": "3"
    },
    "special": {}
  },
  "centaur_khan_endurance_aura": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_PASSIVE",
    "passive": true,
    "manaCost": "0",
    "cooldown": "0",
    "castRange": "0",
    "values": {
      "bonus_attack_speed": {
        "value": "15 18 21 27"
      },
      "radius": {
        "value": "1200",
        "affected_by_aoe_increase": "1"
      }
    },
    "special": {}
  },
  "furbolg_enrage_attack_speed": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_PASSIVE",
    "passive": true,
    "manaCost": "0",
    "cooldown": "0",
    "castRange": "0",
    "values": {
      "bonus_aspd": {
        "value": "120"
      },
      "duration": {
        "value": "5"
      },
      "radius": {
        "value": "700",
        "affected_by_aoe_increase": "1"
      }
    },
    "special": {}
  },
  "polar_furbolg_ursa_warrior_thunder_clap": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_NO_TARGET",
    "passive": false,
    "manaCost": "50",
    "cooldown": "12.0 11.0 10.0 9.0",
    "castRange": "0",
    "values": {
      "radius": {
        "value": "300",
        "affected_by_aoe_increase": "1"
      },
      "movespeed_slow": "-25",
      "attackspeed_slow": "-25",
      "duration": "3.0"
    },
    "special": {}
  },
  "furbolg_enrage_damage": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_PASSIVE",
    "passive": true,
    "manaCost": "0",
    "cooldown": "0",
    "castRange": "0",
    "values": {
      "bonus_dmg_pct": {
        "value": "60"
      },
      "duration": {
        "value": "5"
      },
      "radius": {
        "value": "700",
        "affected_by_aoe_increase": "1"
      }
    },
    "special": {}
  },
  "warpine_raider_seed_shot": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_UNIT_TARGET | DOTA_ABILITY_BEHAVIOR_IGNORE_BACKSWING ",
    "passive": false,
    "manaCost": "100",
    "cooldown": "15",
    "castRange": "575",
    "values": {
      "damage": "80 95 110 125",
      "bounces": "4 6 8 12",
      "bounce_range": "500",
      "duration": "1",
      "slow": "100",
      "bounce_delay": "0.3"
    },
    "special": {}
  },
  "mud_golem_hurl_boulder": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_UNIT_TARGET",
    "passive": false,
    "manaCost": "0",
    "cooldown": "30",
    "castRange": "800",
    "values": {
      "damage": "75",
      "damage_creeps": "150",
      "duration": "0.5",
      "speed": "800"
    },
    "special": {}
  },
  "mud_golem_rock_destroy": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_PASSIVE",
    "passive": true,
    "manaCost": "0",
    "cooldown": "0",
    "castRange": "0",
    "values": {
      "radius": "250",
      "duration": "2",
      "movespeed": "-25",
      "shard_health": "250 280 310 370",
      "shard_damage": "12 16 20 28",
      "shard_duration": "60",
      "shard_amount": "2 2 3 3"
    },
    "special": {}
  },
  "ogre_bruiser_ogre_smash": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_POINT | DOTA_ABILITY_BEHAVIOR_CAN_SELF_CAST | DOTA_ABILITY_BEHAVIOR_DONT_RESUME_MOVEMENT",
    "passive": false,
    "manaCost": "0",
    "cooldown": "12.0",
    "castRange": "0",
    "values": {
      "radius": {
        "value": "200 210 220 230",
        "affected_by_aoe_increase": "1"
      },
      "damage": "200 250 300 400",
      "damage_pct": "8",
      "hero_stun_duration": "2.4"
    },
    "special": {}
  },
  "giant_wolf_intimidate": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_NO_TARGET",
    "passive": false,
    "manaCost": "50",
    "cooldown": "16.0",
    "castRange": "0",
    "values": {
      "radius": {
        "value": "300 350 400 500",
        "affected_by_aoe_increase": "1"
      },
      "damage_reduction": "60",
      "duration": "4.0"
    },
    "special": {}
  },
  "alpha_wolf_critical_strike": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_PASSIVE",
    "passive": true,
    "manaCost": "0",
    "cooldown": "0",
    "castRange": "0",
    "values": {
      "crit_chance": {
        "value": "20"
      },
      "crit_mult": {
        "value": "200 225 250 300"
      }
    },
    "special": {}
  },
  "alpha_wolf_command_aura": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_PASSIVE",
    "passive": true,
    "manaCost": "0",
    "cooldown": "0",
    "castRange": "0",
    "values": {
      "bonus_damage_pct": "20",
      "radius": {
        "value": "1200",
        "affected_by_aoe_increase": "1"
      }
    },
    "special": {}
  },
  "enraged_wildkin_tornado": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_POINT | DOTA_ABILITY_BEHAVIOR_CHANNELLED |DOTA_ABILITY_BEHAVIOR_UNIT_TARGET",
    "passive": false,
    "manaCost": "100",
    "cooldown": "40.0 36.0 32.0 26.0",
    "castRange": "500",
    "values": {
      "duration": "15.0",
      "linger_duration": "5.0",
      "tornado_base_movespeed": "125 140 155 185"
    },
    "special": {}
  },
  "enraged_wildkin_hurricane": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_UNIT_TARGET | DOTA_ABILITY_BEHAVIOR_VECTOR_TARGETING | DOTA_ABILITY_BEHAVIOR_DONT_RESUME_MOVEMENT | DOTA_ABILITY_BEHAVIOR_ROOT_DISABLES",
    "passive": false,
    "manaCost": "100",
    "cooldown": "30.0 28.0 26.0 22.0",
    "castRange": "400 500 600 750",
    "values": {
      "distance": {
        "value": "400"
      }
    },
    "special": {}
  },
  "enraged_wildkin_toughness_aura": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_PASSIVE",
    "passive": true,
    "manaCost": "0",
    "cooldown": "0",
    "castRange": "0",
    "values": {
      "bonus_armor": {
        "value": "3"
      },
      "radius": {
        "value": "1200",
        "affected_by_aoe_increase": "1"
      }
    },
    "special": {}
  },
  "satyr_soulstealer_mana_burn": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_UNIT_TARGET",
    "passive": false,
    "manaCost": "50",
    "cooldown": "18.0",
    "castRange": "600",
    "values": {
      "burn_amount": "20 25 30 35",
      "int_multiplier": "1 1.5 2 2.5"
    },
    "special": {}
  },
  "forest_troll_high_priest_mana_aura": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_PASSIVE",
    "passive": true,
    "manaCost": "0",
    "cooldown": "0",
    "castRange": "0",
    "values": {
      "mana_regen": {
        "value": "1.75"
      },
      "radius": {
        "value": "1200",
        "affected_by_aoe_increase": "1"
      },
      "allow_multiple": {
        "value": "0"
      }
    },
    "special": {}
  },
  "satyr_hellcaller_shockwave": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_UNIT_TARGET | DOTA_ABILITY_BEHAVIOR_POINT",
    "passive": false,
    "manaCost": "100",
    "cooldown": "8.0",
    "castRange": "700",
    "values": {
      "speed": "900",
      "radius_start": {
        "value": "180",
        "affected_by_aoe_increase": "1"
      },
      "radius_end": {
        "value": "200",
        "affected_by_aoe_increase": "1"
      },
      "distance": "1380"
    },
    "special": {}
  },
  "satyr_hellcaller_unholy_aura": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_PASSIVE",
    "passive": true,
    "manaCost": "0",
    "cooldown": "0",
    "castRange": "0",
    "values": {
      "health_regen": {
        "value": "3.0 5.0 7.0 11.0"
      },
      "radius": {
        "value": "1200",
        "affected_by_aoe_increase": "1"
      }
    },
    "special": {}
  },
  "satyr_trickster_purge": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_UNIT_TARGET",
    "passive": false,
    "manaCost": "120 115 110 100",
    "cooldown": "3.0",
    "castRange": "350 400 450 550",
    "values": {
      "purge_rate": {
        "value": "5"
      },
      "duration": {
        "value": "5"
      },
      "summon_damage": {
        "value": "400"
      }
    },
    "special": {}
  },
  "spawnlord_aura": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_PASSIVE",
    "passive": true,
    "manaCost": "0",
    "cooldown": "0",
    "castRange": "0",
    "values": {
      "lifesteal": {
        "value": "9 10 11 12"
      },
      "hp_regen": {
        "value": "9 10 11 12"
      },
      "radius": {
        "value": "1200",
        "affected_by_aoe_increase": "1"
      }
    },
    "special": {}
  },
  "spawnlord_master_stomp": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_NO_TARGET",
    "passive": false,
    "manaCost": "100",
    "cooldown": "12.0",
    "castRange": "0",
    "values": {
      "radius": {
        "value": "300",
        "affected_by_aoe_increase": "1"
      },
      "damage": {
        "value": "200"
      },
      "duration": {
        "value": "6"
      },
      "armor_reduction_pct": {
        "value": "50"
      }
    },
    "special": {}
  },
  "spawnlord_master_freeze": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_UNIT_TARGET | DOTA_ABILITY_BEHAVIOR_AUTOCAST | DOTA_ABILITY_BEHAVIOR_ATTACK",
    "passive": false,
    "manaCost": "0",
    "cooldown": "15",
    "castRange": "150",
    "values": {
      "duration": {
        "value": "1.2 1.3 1.4 1.5"
      },
      "damage": {
        "value": "100"
      },
      "tick_interval": {
        "value": "0.1"
      },
      "health_threshold_pct": {
        "value": "90"
      }
    },
    "special": {}
  },
  "ancient_rock_golem_weakening_aura": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_PASSIVE",
    "passive": true,
    "manaCost": "0",
    "cooldown": "0",
    "castRange": "0",
    "values": {
      "armor_reduction": "3 4 5 6",
      "radius": {
        "value": "1200",
        "affected_by_aoe_increase": "1"
      }
    },
    "special": {}
  },
  "granite_golem_hp_aura": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_PASSIVE",
    "passive": true,
    "manaCost": "0",
    "cooldown": "0",
    "castRange": "0",
    "values": {
      "bonus_hp": {
        "value": "16 17 18 19"
      },
      "radius": {
        "value": "1200",
        "affected_by_aoe_increase": "1"
      }
    },
    "special": {}
  },
  "ice_shaman_incendiary_bomb": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_UNIT_TARGET",
    "passive": false,
    "manaCost": "100 95 90 80",
    "cooldown": "30",
    "castRange": "700 725 750 800",
    "values": {
      "duration": "8",
      "burn_damage": "50",
      "building_damage_pct": "25"
    },
    "special": {}
  },
  "frostbitten_golem_time_warp_aura": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_PASSIVE",
    "passive": true,
    "manaCost": "0",
    "cooldown": "0",
    "castRange": "0",
    "values": {
      "bonus_cdr": "8 9 10 11",
      "radius": {
        "value": "1200",
        "affected_by_aoe_increase": "1"
      }
    },
    "special": {}
  },
  "big_thunder_lizard_slam": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_NO_TARGET",
    "passive": false,
    "manaCost": "150",
    "cooldown": "6.0",
    "castRange": "0",
    "values": {
      "radius": {
        "value": "350",
        "affected_by_aoe_increase": "1"
      },
      "movespeed_slow": "-60",
      "attack_slow_tooltip": "-60",
      "non_hero_duration": "4.0",
      "hero_duration": "2.0 2.25 2.5 3.0"
    },
    "special": {}
  },
  "big_thunder_lizard_frenzy": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_UNIT_TARGET",
    "passive": false,
    "manaCost": "75",
    "cooldown": "8.0",
    "castRange": "900",
    "values": {
      "attackspeed_bonus": {
        "value": "75"
      },
      "duration": {
        "value": "8"
      }
    },
    "special": {}
  },
  "big_thunder_lizard_wardrums_aura": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_PASSIVE",
    "passive": true,
    "manaCost": "0",
    "cooldown": "0",
    "castRange": "0",
    "values": {
      "speed_bonus": {
        "value": "25"
      },
      "accuracy": {
        "value": "40 43 46 51"
      },
      "radius": {
        "value": "1200",
        "affected_by_aoe_increase": "1"
      }
    },
    "special": {}
  },
  "gnoll_assassin_envenomed_weapon": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_PASSIVE",
    "passive": true,
    "manaCost": "0",
    "cooldown": "0",
    "castRange": "0",
    "values": {
      "damage_per_second": {
        "value": "0 20 40 80"
      },
      "non_hero_duration": {
        "value": "20"
      },
      "hero_duration": {
        "value": "2"
      },
      "regen_reduction": {
        "value": "75 80 85 90"
      }
    },
    "special": {}
  },
  "creep_piercing": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_PASSIVE",
    "passive": true,
    "manaCost": "0",
    "cooldown": "0",
    "castRange": "0",
    "values": {
      "creep_damage_bonus": "50",
      "hero_damage_penalty": "-50",
      "heavy_damage_penalty": "-50"
    },
    "special": {}
  },
  "ghost_frost_attack": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_PASSIVE",
    "passive": true,
    "manaCost": "0",
    "cooldown": "0",
    "castRange": "0",
    "values": {
      "movespeed_slow": {
        "value": "-25 -28 -31 -37"
      },
      "attackspeed_slow": {
        "value": "-25 -28 -31 -37"
      },
      "duration": {
        "value": "1.5"
      }
    },
    "special": {}
  },
  "berserker_troll_break": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_PASSIVE",
    "passive": true,
    "manaCost": "0",
    "cooldown": "10 9 8 6",
    "castRange": "0",
    "values": {
      "duration": {
        "value": "3"
      }
    },
    "special": {}
  },
  "forest_troll_high_priest_heal": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_UNIT_TARGET | DOTA_ABILITY_BEHAVIOR_DONT_RESUME_ATTACK | DOTA_ABILITY_BEHAVIOR_AUTOCAST",
    "passive": false,
    "manaCost": "60",
    "cooldown": "10 9 8 6",
    "castRange": "350 375 400 450",
    "values": {
      "health": {
        "value": "100"
      }
    },
    "special": {}
  },
  "forest_troll_high_priest_heal_amp_aura": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_PASSIVE",
    "passive": true,
    "manaCost": "0",
    "cooldown": "0",
    "castRange": "0",
    "values": {
      "heal_amp": {
        "value": "15"
      },
      "radius": {
        "value": "1200",
        "affected_by_aoe_increase": "1"
      }
    },
    "special": {}
  },
  "harpy_scout_take_off": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_NO_TARGET | DOTA_ABILITY_BEHAVIOR_TOGGLE | DOTA_ABILITY_BEHAVIOR_IGNORE_CHANNEL",
    "passive": false,
    "manaCost": "20",
    "cooldown": "10",
    "castRange": "0",
    "values": {
      "move_speed_penalty": {
        "value": "50 40 30 10"
      },
      "cost_per_second": {
        "value": "4"
      }
    },
    "special": {}
  },
  "harpy_storm_chain_lightning": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_UNIT_TARGET",
    "passive": false,
    "manaCost": "60",
    "cooldown": "4.0",
    "castRange": "900",
    "values": {
      "initial_damage": {
        "value": "120 170 220 270"
      },
      "jump_range": {
        "value": "500"
      },
      "jump_delay": {
        "value": "0.25"
      },
      "damage_percent_loss": {
        "value": "25.0 20.0 15.0 10.0"
      },
      "max_targets": {
        "value": "4"
      }
    },
    "special": {}
  },
  "black_drake_magic_amplification_aura": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_PASSIVE",
    "passive": true,
    "manaCost": "0",
    "cooldown": "0",
    "castRange": "0",
    "values": {
      "spell_amp": "5 6 7 9",
      "radius": {
        "value": "1200",
        "affected_by_aoe_increase": "1"
      }
    },
    "special": {}
  },
  "black_dragon_fireball": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_POINT | DOTA_ABILITY_BEHAVIOR_AOE",
    "passive": false,
    "manaCost": "200",
    "cooldown": "15",
    "castRange": "1000",
    "values": {
      "radius": {
        "value": "300",
        "affected_by_aoe_increase": "1"
      },
      "damage": "85",
      "duration": "8.0 9 10 12",
      "burn_interval": "0.5"
    },
    "special": {}
  },
  "black_dragon_splash_attack": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_PASSIVE",
    "passive": true,
    "manaCost": "0",
    "cooldown": "0",
    "castRange": "0",
    "values": {
      "range": {
        "value": "250",
        "affected_by_aoe_increase": "1"
      },
      "damage_percent": "100"
    },
    "special": {}
  },
  "black_dragon_dragonhide_aura": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_PASSIVE",
    "passive": true,
    "manaCost": "0",
    "cooldown": "0",
    "castRange": "0",
    "values": {
      "bonus_armor": {
        "value": "3"
      },
      "radius": {
        "value": "1200",
        "affected_by_aoe_increase": "1"
      }
    },
    "special": {}
  },
  "frogmen_riverborn_aura": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_PASSIVE",
    "passive": true,
    "manaCost": "0",
    "cooldown": "0",
    "castRange": "0",
    "values": {
      "bonus_movement_speed": {
        "value": "10 12 14 16"
      },
      "bonus_outgoing_damage": {
        "value": "10 12 14 16"
      },
      "radius": {
        "value": "1200",
        "affected_by_aoe_increase": "1"
      }
    },
    "special": {}
  },
  "frogmen_arm_of_the_deep": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_POINT | DOTA_ABILITY_BEHAVIOR_IGNORE_BACKSWING",
    "passive": false,
    "manaCost": "40",
    "cooldown": "16",
    "castRange": "275",
    "values": {
      "projectile_width": "100",
      "damage": "80 100 120 140",
      "duration": "0.8",
      "range": "275",
      "speed": "725",
      "neutral_shared_cooldown": "5.0"
    },
    "special": {}
  },
  "frogmen_tendrils_of_the_deep": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_POINT | DOTA_ABILITY_BEHAVIOR_IGNORE_BACKSWING",
    "passive": false,
    "manaCost": "50",
    "cooldown": "18",
    "castRange": "300",
    "values": {
      "projectile_width": "100",
      "damage": "120 140 160 180",
      "duration": "1.2",
      "range": "300",
      "speed": "725",
      "yaw_offset": "17",
      "neutral_shared_cooldown": "5.0"
    },
    "special": {}
  },
  "frogmen_congregation_of_the_deep": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_NO_TARGET",
    "passive": false,
    "manaCost": "70",
    "cooldown": "20",
    "castRange": "0",
    "values": {
      "projectile_width": "100",
      "damage": "250 275 300 325",
      "duration": "1.4",
      "range": {
        "value": "300",
        "affected_by_aoe_increase": "1"
      },
      "speed": "725",
      "projectile_count": "6",
      "neutral_shared_cooldown": "5.0"
    },
    "special": {}
  },
  "frogmen_water_bubble_small": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_UNIT_TARGET",
    "passive": false,
    "manaCost": "90",
    "cooldown": "16",
    "castRange": "550",
    "values": {
      "duration": "10",
      "damage_absorb": {
        "value": "100 120 140 160",
        "DamageTypeTooltip": "DAMAGE_TYPE_MAGICAL"
      }
    },
    "special": {}
  },
  "frogmen_water_bubble_medium": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_UNIT_TARGET",
    "passive": false,
    "manaCost": "100",
    "cooldown": "16",
    "castRange": "550",
    "values": {
      "duration": "10",
      "heal_pct": "50",
      "damage_absorb": {
        "value": "150 180 210 240",
        "DamageTypeTooltip": "DAMAGE_TYPE_MAGICAL"
      }
    },
    "special": {}
  },
  "frogmen_water_bubble_large": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_UNIT_TARGET",
    "passive": false,
    "manaCost": "110",
    "cooldown": "16",
    "castRange": "550",
    "values": {
      "duration": "10",
      "radius": {
        "value": "675",
        "affected_by_aoe_increase": "1"
      },
      "heal_pct": "50",
      "damage_absorb": {
        "value": "210 240 270 300",
        "DamageTypeTooltip": "DAMAGE_TYPE_MAGICAL"
      }
    },
    "special": {}
  },
  "creep_siege": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_PASSIVE",
    "passive": true,
    "manaCost": "0",
    "cooldown": "0",
    "castRange": "0",
    "values": {
      "bonus_building_damage": "150",
      "incoming_hero_damage_penalty": "-50",
      "incoming_basic_damage_penalty": "-30",
      "incoming_controlled_unit_penalty": "-40"
    },
    "special": {}
  },
  "backdoor_protection": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_PASSIVE",
    "passive": true,
    "manaCost": "0",
    "cooldown": "0",
    "castRange": "0",
    "values": {
      "radius": {
        "value": "900"
      },
      "activation_time": {
        "value": "15"
      },
      "regen_rate": {
        "value": "90"
      }
    },
    "special": {}
  },
  "backdoor_protection_in_base": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_PASSIVE",
    "passive": true,
    "manaCost": "0",
    "cooldown": "0",
    "castRange": "0",
    "values": {
      "activation_time": {
        "value": "15"
      },
      "regen_rate": {
        "value": "90"
      },
      "radius": {
        "value": "900"
      }
    },
    "special": {}
  },
  "creep_irresolute": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_PASSIVE",
    "passive": true,
    "manaCost": "0",
    "cooldown": "0",
    "castRange": "0",
    "values": {
      "hero_damage_penalty": "-25"
    },
    "special": {}
  },
  "flagbearer_creep_aura_effect": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_PASSIVE",
    "passive": true,
    "manaCost": "0",
    "cooldown": "0",
    "castRange": "0",
    "values": {
      "bonus_health_regen": "3",
      "radius": "700",
      "bonus_gold": "10",
      "bonus_xp": "3",
      "bonus_magic_resistance_per_interval": "4",
      "maximum_intervals": "15",
      "total_magic_resistance": {
        "dynamic_value": "true"
      }
    },
    "special": {}
  },
  "roshan_revengeroar": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_NO_TARGET | DOTA_ABILITY_BEHAVIOR_IGNORE_PSEUDO_QUEUE | DOTA_ABILITY_BEHAVIOR_IGNORE_SILENCE | DOTA_ABILITY_BEHAVIOR_IMMEDIATE",
    "passive": false,
    "manaCost": "0",
    "cooldown": "60.0",
    "castRange": "0",
    "values": {
      "radius": "600",
      "damage": "50",
      "damage_pct": "25",
      "duration": "12",
      "damage_growth": "10",
      "disarm_duration": "2",
      "windup_time": "0.5"
    },
    "special": {}
  },
  "roshan_slam": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_NO_TARGET",
    "passive": false,
    "manaCost": "0",
    "cooldown": "10.0",
    "castRange": "0",
    "values": {
      "radius": {
        "value": "350"
      },
      "slow_duration": {
        "value": "4"
      },
      "slow_amount": {
        "value": "50"
      },
      "damage": {
        "value": "70"
      },
      "damage_growth": {
        "value": "10"
      },
      "damage_bonus_creeps": {
        "value": "100"
      }
    },
    "special": {}
  },
  "roshan_inherent_buffs": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_HIDDEN | DOTA_ABILITY_BEHAVIOR_PASSIVE",
    "passive": true,
    "manaCost": "0",
    "cooldown": "0",
    "castRange": "0",
    "values": {
      "move_pits_bonus_speed_per_interrupt": "70",
      "move_pits_max_bonus_speed": "300",
      "move_pits_slow_resistance": "25"
    },
    "special": {}
  },
  "roshan_devotion": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_HIDDEN | DOTA_ABILITY_BEHAVIOR_PASSIVE",
    "passive": true,
    "manaCost": "0",
    "cooldown": "0",
    "castRange": "0",
    "values": {
      "radius": {
        "value": "5"
      },
      "slow_resistance": "25"
    },
    "special": {}
  },
  "roshan_bash": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_PASSIVE",
    "passive": true,
    "manaCost": "0",
    "cooldown": "0",
    "castRange": "0",
    "values": {
      "bash_chance": {
        "value": "15"
      },
      "bonus_damage": {
        "value": "50"
      },
      "stun_duration": {
        "value": "1.65"
      }
    },
    "special": {}
  },
  "roshan_spell_block": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_PASSIVE",
    "passive": true,
    "manaCost": "0",
    "cooldown": "15.0",
    "castRange": "0",
    "values": {
      "status_resistance": "25"
    },
    "special": {}
  },
  "roshan_grab_and_throw": {
    "behavior": "DOTA_ABILITY_BEHAVIOR_CHANNELLED  | DOTA_ABILITY_BEHAVIOR_UNIT_TARGET | DOTA_ABILITY_BEHAVIOR_AOE",
    "passive": false,
    "manaCost": "0",
    "cooldown": "1",
    "castRange": "400",
    "values": {
      "interval": "0.75",
      "ministun": "0.2",
      "cast_range": "300",
      "animation_rate": "1.5",
      "damage": "200",
      "damage_per_combo": "100",
      "damage_growth_curr_hp_pct": {
        "value": "0.5"
      },
      "channel_time": {
        "value": "0.84"
      },
      "max_knockback_distance": "1500",
      "knockback_duration": "0.8",
      "knockback_height": "100",
      "stun_duration": "1.0",
      "max_interrupt_count": "5"
    },
    "special": {}
  }
};

// Flooded camp upgrades are per individual unit, not an instant whole-camp tier swap.
// 7.41: rim camps next to safe-lane T2 stop at hard; bounty-rune camps reach ancient.
export const FLOODED_EVOLUTION_LIMITS = {
  neutralcamp_good_11: 1, neutralcamp_evil_14: 1,
  neutralcamp_good_4: 2, neutralcamp_evil_6: 2,
  neutralcamp_good_14: 2, neutralcamp_evil_11: 2,
};
export function getFloodedCampGroup(camp, elapsedSeconds) {
  const start = camp.initialTier ?? (camp.type === 'flooded_small' || camp.type === 'small' ? 0 : 1);
  const limit = Math.min(3 - start, camp.maxUpgradeCount ?? FLOODED_EVOLUTION_LIMITS[camp.sourceId] ?? 2);
  const upgrades = Math.min(limit * 3, Math.max(0, Math.floor(elapsedSeconds / RULES.floodedEvolutionInterval)));
  const completed = Math.floor(upgrades / 3);
  const partial = upgrades % 3;
  const slots = [
    ['tadpole', 'tadpole', 'tadpole'],
    ['froglet', 'froglet', 'froglet_mage'],
    ['grown_frog', 'grown_frog', 'grown_frog_mage'],
    ['ancient_frog', 'ancient_frog', 'ancient_frog_mage'],
  ];
  const result = [];
  for (let i = 0; i < 3; i++) {
    const tier = Math.min(3, start + completed + (i < partial ? 1 : 0));
    const unitId = slots[tier][i];
    const existing = result.find(x => x.unitId === unitId);
    if (existing) existing.count++; else result.push({ unitId, count: 1 });
  }
  return result;
}
export function floodedTier(camp, elapsedSeconds) {
  const units = getFloodedCampGroup(camp, elapsedSeconds);
  const tiers = { tadpole: 0, froglet: 1, froglet_mage: 1, grown_frog: 2, grown_frog_mage: 2, ancient_frog: 3, ancient_frog_mage: 3 };
  return Math.min(...units.map(u => tiers[u.unitId]));
}

// Official 7.41 patch takes precedence over the mirrored flagbearer base KV.
LANE_CREEPS.flagbearer.sourceXpBounty = LANE_CREEPS.flagbearer.xpBounty;
LANE_CREEPS.flagbearer.xpBounty = 60;
for(const [key,extra]of Object.entries(UNIT_EXTRAS))Object.assign(NEUTRAL_UNITS[key],extra);
for(const [key,extra]of Object.entries(ABILITY_EXTRAS))Object.assign(NEUTRAL_ABILITIES[key],extra);
