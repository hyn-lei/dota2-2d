// Generated from Valve 7.42 datafeed + shipped hero KV. See docs/research/abilities-sources.md.
export const ABILITIES={
  "axe": [
    {
      "id": "axe_berserkers_call",
      "sourceID": 5007,
      "name": "狂战士之吼",
      "key": "Q",
      "icon": "roar",
      "image": "assets/abilities/axe_berserkers_call.png",
      "color": "#9dc0be",
      "kind": "active",
      "maxLevel": 4,
      "requiredLevels": [
        1,
        3,
        5,
        7
      ],
      "cooldowns": [
        18,
        16,
        14,
        12
      ],
      "manaCosts": [
        90,
        100,
        110,
        120
      ],
      "castRanges": [
        0
      ],
      "castPoints": [
        0.3
      ],
      "channelTimes": [
        0
      ],
      "durations": [
        0
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "radius": [
          315
        ],
        "bonus_armor": [
          12,
          13,
          14,
          15
        ],
        "duration": [
          2.1,
          2.4,
          2.7,
          3
        ],
        "applies_battle_hunger": [
          0
        ],
        "AbilityCastPoint": [
          0.3
        ],
        "AbilityManaCost": [
          90,
          100,
          110,
          120
        ],
        "AbilityCooldown": [
          18,
          16,
          14,
          12
        ],
        "bonus_attack_speed": [
          0
        ]
      },
      "scaling": {},
      "description": "斧王嘲讽附近的敌方单位，强迫他们攻击自己，同时获得额外护甲。",
      "damageType": "magical"
    },
    {
      "id": "axe_battle_hunger",
      "sourceID": 5008,
      "name": "战斗饥渴",
      "key": "W",
      "icon": "hunger",
      "image": "assets/abilities/axe_battle_hunger.png",
      "color": "#99bda0",
      "kind": "active",
      "maxLevel": 4,
      "requiredLevels": [
        1,
        3,
        5,
        7
      ],
      "cooldowns": [
        20,
        15,
        10,
        5
      ],
      "manaCosts": [
        50,
        60,
        70,
        80
      ],
      "castRanges": [
        600,
        700,
        800,
        900
      ],
      "castPoints": [
        0.3,
        0.3,
        0.3,
        0.3
      ],
      "channelTimes": [
        0
      ],
      "durations": [
        0
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "duration": [
          12
        ],
        "slow": [
          16,
          19,
          22,
          25
        ],
        "damage_per_second": [
          12,
          16,
          20,
          24
        ],
        "speed_bonus": [
          0
        ],
        "should_stack": [
          0
        ],
        "AbilityCastRange": [
          600,
          700,
          800,
          900
        ],
        "AbilityCastPoint": [
          0.3
        ],
        "AbilityManaCost": [
          50,
          60,
          70,
          80
        ],
        "AbilityCooldown": [
          20,
          15,
          10,
          5
        ]
      },
      "scaling": {},
      "description": "激怒一个敌方单位，使他受到持续伤害，直到他杀死一个单位或者持续时间结束。敌人只要背朝斧王还将被减速。",
      "damageType": "pure"
    },
    {
      "id": "axe_counter_helix",
      "sourceID": 5009,
      "name": "反击螺旋",
      "key": "E",
      "icon": "helix",
      "image": "assets/abilities/axe_counter_helix.png",
      "color": "#d1b47e",
      "kind": "passive",
      "maxLevel": 4,
      "requiredLevels": [
        1,
        3,
        5,
        7
      ],
      "cooldowns": [
        0.3
      ],
      "manaCosts": [
        0
      ],
      "castRanges": [
        0
      ],
      "castPoints": [
        0
      ],
      "channelTimes": [
        0
      ],
      "durations": [
        0
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "damage": [
          100,
          120,
          140,
          160
        ],
        "radius": [
          275
        ],
        "trigger_attacks": [
          7,
          6,
          5,
          4
        ],
        "debuff_duration": [
          0
        ],
        "damage_reduction": [
          0
        ],
        "max_stacks": [
          0
        ],
        "attacks_increase_counter": [
          0
        ],
        "helix_lifesteal": [
          0
        ],
        "AbilityCooldown": [
          0.3
        ]
      },
      "scaling": {},
      "description": "受到一定次数攻击后，斧王就会做出螺旋反击，对附近所有敌方单位造成纯粹伤害。",
      "damageType": "pure"
    },
    {
      "id": "axe_culling_blade",
      "sourceID": 5010,
      "name": "淘汰之刃",
      "key": "R",
      "icon": "axe",
      "image": "assets/abilities/axe_culling_blade.png",
      "color": "#8ebcca",
      "kind": "active",
      "maxLevel": 3,
      "requiredLevels": [
        6,
        12,
        18
      ],
      "cooldowns": [
        80,
        75,
        70
      ],
      "manaCosts": [
        100,
        125,
        150
      ],
      "castRanges": [
        175
      ],
      "castPoints": [
        0.3
      ],
      "channelTimes": [
        0
      ],
      "durations": [
        0
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "damage": [
          275,
          375,
          475
        ],
        "speed_bonus": [
          25
        ],
        "armor_bonus": [
          10,
          15,
          20
        ],
        "speed_duration": [
          6
        ],
        "speed_aoe": [
          900
        ],
        "charge_speed": [
          1200
        ],
        "armor_per_stack": [
          1,
          1.5,
          2
        ],
        "AbilityCastRange": [
          175
        ],
        "AbilityCastPoint": [
          0.3
        ],
        "AbilityManaCost": [
          100,
          125,
          150
        ],
        "AbilityCooldown": [
          80,
          75,
          70
        ]
      },
      "scaling": {},
      "description": "斧王洞察到弱点并出击，造成纯粹伤害。淘汰之刃击杀敌方英雄时将重置冷却时间，而附近所有友军单位获得移动速度和护甲加成。\n\n每当斧王通过淘汰之刃击杀敌方英雄，他的战刃就会浸满鲜血，获得永久叠加效果，每层都会提供护甲加成。",
      "damageType": "pure"
    }
  ],
  "crystal_maiden": [
    {
      "id": "crystal_maiden_crystal_nova",
      "sourceID": 5126,
      "name": "冰霜新星",
      "key": "Q",
      "icon": "snow",
      "image": "assets/abilities/crystal_maiden_crystal_nova.png",
      "color": "#9dc0be",
      "kind": "active",
      "maxLevel": 4,
      "requiredLevels": [
        1,
        3,
        5,
        7
      ],
      "cooldowns": [
        11,
        10,
        9,
        8
      ],
      "manaCosts": [
        115,
        135,
        155,
        175
      ],
      "castRanges": [
        700
      ],
      "castPoints": [
        0.3,
        0.3,
        0.3,
        0.3
      ],
      "channelTimes": [
        0
      ],
      "durations": [
        0
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "radius": [
          425
        ],
        "movespeed_slow": [
          -20,
          -30,
          -40,
          -50
        ],
        "attackspeed_slow": [
          -30,
          -45,
          -60,
          -75
        ],
        "duration": [
          4
        ],
        "vision_duration": [
          6
        ],
        "nova_damage": [
          110,
          160,
          210,
          260
        ],
        "AbilityCastRange": [
          700
        ],
        "AbilityCastPoint": [
          0.3
        ],
        "AbilityManaCost": [
          115,
          135,
          155,
          175
        ],
        "AbilityCooldown": [
          11,
          10,
          9,
          8
        ],
        "physical_barrier_amount": [
          0
        ],
        "physical_barrier_self_amount": [
          0
        ],
        "physical_barrier_duration": [
          0
        ]
      },
      "scaling": {},
      "description": "召唤具有破坏性的冰爆，降低目标区域内的敌人的移动速度。",
      "damageType": "magical"
    },
    {
      "id": "crystal_maiden_frostbite",
      "sourceID": 5127,
      "name": "冰封禁制",
      "key": "W",
      "icon": "crystal",
      "image": "assets/abilities/crystal_maiden_frostbite.png",
      "color": "#99bda0",
      "kind": "active",
      "maxLevel": 4,
      "requiredLevels": [
        1,
        3,
        5,
        7
      ],
      "cooldowns": [
        9,
        8,
        7,
        6
      ],
      "manaCosts": [
        125,
        135,
        145,
        155
      ],
      "castRanges": [
        600
      ],
      "castPoints": [
        0.3,
        0.3,
        0.3,
        0.3
      ],
      "channelTimes": [
        0
      ],
      "durations": [
        0
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "damage_per_second": [
          100
        ],
        "duration": [
          1.5,
          2,
          2.5,
          3
        ],
        "creep_multiplier": [
          4
        ],
        "tick_interval": [
          0.25
        ],
        "AbilityCastRange": [
          600
        ],
        "AbilityCastPoint": [
          0.3
        ],
        "AbilityManaCost": [
          125,
          135,
          145,
          155
        ],
        "AbilityCooldown": [
          9,
          8,
          7,
          6
        ]
      },
      "scaling": {},
      "description": "操控冰霜包围一个敌方单位，禁止移动和攻击，并持续造成伤害。对非远古的普通单位施放将造成4倍伤害。",
      "damageType": "magical"
    },
    {
      "id": "crystal_maiden_brilliance_aura",
      "sourceID": 5128,
      "name": "奥术光环",
      "key": "E",
      "icon": "aura",
      "image": "assets/abilities/crystal_maiden_brilliance_aura.png",
      "color": "#d1b47e",
      "kind": "passive",
      "maxLevel": 4,
      "requiredLevels": [
        1,
        3,
        5,
        7
      ],
      "cooldowns": [
        0
      ],
      "manaCosts": [
        0
      ],
      "castRanges": [
        0
      ],
      "castPoints": [
        0
      ],
      "channelTimes": [
        0
      ],
      "durations": [
        0
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "base_mana_regen": [
          0.4,
          0.6,
          0.8,
          1
        ],
        "proximity_mana_regen_tooltip": [
          1.2,
          1.8,
          2.4,
          3
        ],
        "mana_regen_amp": [
          20,
          40,
          60,
          80
        ],
        "proximity_bonus_factor": [
          3
        ],
        "proximity_bonus_radius": [
          1200
        ]
      },
      "scaling": {},
      "description": "地图上所有友方单位获得额外魔法恢复。水晶室女附近1200范围内友军获得更高的魔法恢复。水晶室女被动获得魔法恢复增强。",
      "damageType": "magical"
    },
    {
      "id": "crystal_maiden_freezing_field",
      "sourceID": 5129,
      "name": "极寒领域",
      "key": "R",
      "icon": "storm",
      "image": "assets/abilities/crystal_maiden_freezing_field.png",
      "color": "#8ebcca",
      "kind": "active",
      "maxLevel": 3,
      "requiredLevels": [
        6,
        12,
        18
      ],
      "cooldowns": [
        110,
        100,
        90
      ],
      "manaCosts": [
        250,
        425,
        600
      ],
      "castRanges": [
        0
      ],
      "castPoints": [
        0
      ],
      "channelTimes": [
        10
      ],
      "durations": [
        10
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "radius": [
          810
        ],
        "explosion_radius": [
          320
        ],
        "explosion_interval_tooltip": [
          0.1
        ],
        "num_explosions": [
          100
        ],
        "movespeed_slow": [
          -40
        ],
        "attack_slow": [
          -80,
          -120,
          -160
        ],
        "slow_duration": [
          1
        ],
        "explosion_min_dist": [
          195
        ],
        "explosion_max_dist": [
          785
        ],
        "damage": [
          130,
          190,
          250
        ],
        "frostbite_delay": [
          -1
        ],
        "shard_bonus_explosion": [
          0
        ],
        "shard_self_movement_speed_slow_pct": [
          0
        ],
        "can_move": [
          0
        ],
        "AbilityChannelTime": [
          10
        ],
        "AbilityDuration": [
          10
        ],
        "AbilityManaCost": [
          250,
          425,
          600
        ],
        "AbilityCooldown": [
          110,
          100,
          90
        ],
        "AbilityCastPoint": [
          0
        ],
        "self_cast_range_bonus": [
          0
        ],
        "aoe_bonus": [
          0
        ]
      },
      "scaling": {},
      "description": "持续施法 - 以水晶室女为中心召唤100次随机冰爆轰炸敌人，将其减速并造成大量伤害。持续10秒。",
      "damageType": "magical"
    }
  ],
  "juggernaut": [
    {
      "id": "juggernaut_blade_fury",
      "sourceID": 5028,
      "name": "剑刃风暴",
      "key": "Q",
      "icon": "spin",
      "image": "assets/abilities/juggernaut_blade_fury.png",
      "color": "#9dc0be",
      "kind": "active",
      "maxLevel": 4,
      "requiredLevels": [
        1,
        3,
        5,
        7
      ],
      "cooldowns": [
        30,
        26,
        22,
        18
      ],
      "manaCosts": [
        110
      ],
      "castRanges": [
        0
      ],
      "castPoints": [
        0,
        0,
        0,
        0
      ],
      "channelTimes": [
        0
      ],
      "durations": [
        0
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "blade_fury_damage": [
          85,
          115,
          145,
          175
        ],
        "blade_fury_damage_tick": [
          0.2
        ],
        "blade_fury_radius": [
          260
        ],
        "duration": [
          5
        ],
        "bonus_movespeed": [
          0
        ],
        "scepter_attack_damage_pct": [
          0
        ],
        "immunity_resist": [
          80
        ],
        "AbilityManaCost": [
          110
        ],
        "AbilityCooldown": [
          30,
          26,
          22,
          18
        ],
        "movement_slow": [
          0
        ],
        "can_crit": [
          0
        ],
        "blade_fury_outer_radius": [
          0
        ]
      },
      "scaling": {},
      "description": "舞起具有破坏性力量的剑刃风暴，使主宰获得减益免疫状态，魔法抗性提升80%，并且每0.2秒对主宰周围的敌方单位造成伤害。旋转开始和结束时施加弱驱散效果。\n\n驱散类型：弱驱散",
      "damageType": "magical"
    },
    {
      "id": "juggernaut_healing_ward",
      "sourceID": 5029,
      "name": "治疗守卫",
      "key": "W",
      "icon": "heal",
      "image": "assets/abilities/juggernaut_healing_ward.png",
      "color": "#99bda0",
      "kind": "active",
      "maxLevel": 4,
      "requiredLevels": [
        1,
        3,
        5,
        7
      ],
      "cooldowns": [
        60
      ],
      "manaCosts": [
        120
      ],
      "castRanges": [
        350
      ],
      "castPoints": [
        0.3,
        0.3,
        0.3,
        0.3
      ],
      "channelTimes": [
        0
      ],
      "durations": [
        18,
        20,
        22,
        24
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "healing_ward_heal_amount": [
          2,
          3,
          4,
          5
        ],
        "healing_ward_aura_radius": [
          400
        ],
        "healing_ward_movespeed_tooltip": [
          325
        ],
        "healing_ward_bonus_health": [
          0
        ],
        "healing_ward_hits_to_kill_tooltip": [
          1
        ],
        "AbilityCastRange": [
          350
        ],
        "AbilityDuration": [
          18,
          20,
          22,
          24
        ],
        "AbilityCastPoint": [
          0.3
        ],
        "AbilityManaCost": [
          120
        ],
        "AbilityCooldown": [
          60
        ]
      },
      "scaling": {},
      "description": "召唤一个治疗守卫，按周围友军单位最大生命值的一定比例治疗他们。治疗守卫可以移动，移动速度为325。持续18/20/22/24秒。",
      "damageType": "magical"
    },
    {
      "id": "juggernaut_blade_dance",
      "sourceID": 5027,
      "name": "剑舞",
      "key": "E",
      "icon": "swords",
      "image": "assets/abilities/juggernaut_blade_dance.png",
      "color": "#d1b47e",
      "kind": "passive",
      "maxLevel": 4,
      "requiredLevels": [
        1,
        3,
        5,
        7
      ],
      "cooldowns": [
        0
      ],
      "manaCosts": [
        0
      ],
      "castRanges": [
        0
      ],
      "castPoints": [
        0
      ],
      "channelTimes": [
        0
      ],
      "durations": [
        0
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "blade_dance_crit_chance": [
          35
        ],
        "blade_dance_crit_mult": [
          140,
          160,
          180,
          200
        ],
        "blade_dance_lifesteal": [
          0
        ]
      },
      "scaling": {},
      "description": "主宰有一定概率在攻击时触发致命一击。",
      "damageType": "magical"
    },
    {
      "id": "juggernaut_omni_slash",
      "sourceID": 5030,
      "name": "无敌斩",
      "key": "R",
      "icon": "swords",
      "image": "assets/abilities/juggernaut_omni_slash.png",
      "color": "#8ebcca",
      "kind": "active",
      "maxLevel": 3,
      "requiredLevels": [
        6,
        12,
        18
      ],
      "cooldowns": [
        120
      ],
      "manaCosts": [
        200,
        275,
        350
      ],
      "castRanges": [
        450
      ],
      "castPoints": [
        0.3,
        0.3,
        0.3
      ],
      "channelTimes": [
        0
      ],
      "durations": [
        0
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "attack_rate_multiplier": [
          1.4
        ],
        "bonus_damage": [
          25,
          30,
          35
        ],
        "bonus_attack_speed": [
          40
        ],
        "duration": [
          3,
          3.25,
          3.5
        ],
        "omni_slash_radius": [
          425
        ],
        "AbilityCastRange": [
          450
        ],
        "AbilityCastPoint": [
          0.3
        ],
        "AbilityManaCost": [
          200,
          275,
          350
        ],
        "AbilityCooldown": [
          120
        ],
        "dispel": [
          0
        ]
      },
      "scaling": {},
      "description": "主宰挥剑跃向敌方目标单位，对其进行斩击。主宰会持续跃向附近的随机敌人（包括之前斩击过的敌人），直到持续时间结束或附近没有敌人。跃击频率取决于主宰的攻击速度。主宰在无敌斩期间为无敌，并拥有更高的攻击速度。\n\n驱散类型：弱驱散",
      "damageType": "physical"
    }
  ],
  "windranger": [
    {
      "id": "windrunner_shackleshot",
      "sourceID": 5130,
      "name": "束缚击",
      "key": "Q",
      "icon": "target",
      "image": "assets/abilities/windrunner_shackleshot.png",
      "color": "#9dc0be",
      "kind": "active",
      "maxLevel": 4,
      "requiredLevels": [
        1,
        3,
        5,
        7
      ],
      "cooldowns": [
        16,
        14,
        12,
        10
      ],
      "manaCosts": [
        70,
        80,
        90,
        100
      ],
      "castRanges": [
        800
      ],
      "castPoints": [
        0.15
      ],
      "channelTimes": [
        0
      ],
      "durations": [
        0
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "fail_stun_duration": [
          0.6
        ],
        "stun_duration": [
          1.75,
          2.25,
          2.75,
          3.25
        ],
        "shackle_distance": [
          575
        ],
        "arrow_speed": [
          1650
        ],
        "shackle_count": [
          1
        ],
        "shackle_angle": [
          23
        ],
        "bonus_damage_per_hero": [
          0
        ],
        "bonus_damage_per_other_pct": [
          0
        ],
        "damage_buff_duration": [
          0,
          0,
          0,
          0
        ],
        "AbilityCastRange": [
          800
        ],
        "AbilityCastPoint": [
          0.15
        ],
        "AbilityManaCost": [
          70,
          80,
          90,
          100
        ],
        "AbilityCooldown": [
          16,
          14,
          12,
          10
        ]
      },
      "scaling": {},
      "description": "将目标束缚在正对其后的一个敌方单位或树上。若目标后面没有其它敌方单位或树木，则眩晕时间减少至0.6秒。",
      "damageType": "magical"
    },
    {
      "id": "windrunner_powershot",
      "sourceID": 5131,
      "name": "强力击",
      "key": "W",
      "icon": "arrow",
      "image": "assets/abilities/windrunner_powershot.png",
      "color": "#99bda0",
      "kind": "active",
      "maxLevel": 4,
      "requiredLevels": [
        1,
        3,
        5,
        7
      ],
      "cooldowns": [
        12,
        11,
        10,
        9
      ],
      "manaCosts": [
        90,
        100,
        110,
        120
      ],
      "castRanges": [
        3000
      ],
      "castPoints": [
        0
      ],
      "channelTimes": [
        1
      ],
      "durations": [
        0
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "powershot_damage": [
          170,
          270,
          370,
          470
        ],
        "slow": [
          22,
          28,
          34,
          40
        ],
        "slow_duration": [
          3
        ],
        "damage_reduction": [
          15
        ],
        "arrow_width": [
          125
        ],
        "arrow_range": [
          3000
        ],
        "arrow_speed": [
          3000
        ],
        "tree_width": [
          50
        ],
        "vision_radius": [
          400
        ],
        "vision_duration": [
          3.34
        ],
        "min_execute_threshold": [
          0
        ],
        "max_execute_threshold": [
          0
        ],
        "AbilityCastRange": [
          3000
        ],
        "AbilityChannelTime": [
          1
        ],
        "AbilityManaCost": [
          90,
          100,
          110,
          120
        ],
        "AbilityCooldown": [
          12,
          11,
          10,
          9
        ]
      },
      "scaling": {},
      "description": "持续施法 - 风行者为她的弓蓄力，射出一支强力的箭矢，最长可蓄力1秒，其间可以打断蓄力，蓄力时间越长，箭矢伤害越高。这支箭会对穿过的所有敌方单位造成伤害和减速效果，并破坏树木。每伤害一个单位，箭矢的伤害和减速效果都会降低。",
      "damageType": "magical"
    },
    {
      "id": "windrunner_windrun",
      "sourceID": 5132,
      "name": "风行",
      "key": "E",
      "icon": "wind",
      "image": "assets/abilities/windrunner_windrun.png",
      "color": "#d1b47e",
      "kind": "active",
      "maxLevel": 4,
      "requiredLevels": [
        1,
        3,
        5,
        7
      ],
      "cooldowns": [
        14,
        13,
        12,
        11
      ],
      "manaCosts": [
        50
      ],
      "castRanges": [
        0
      ],
      "castPoints": [
        0.3,
        0.3,
        0.3,
        0.3
      ],
      "channelTimes": [
        0
      ],
      "durations": [
        3,
        4,
        5,
        6
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "movespeed_bonus_pct": [
          50
        ],
        "evasion_pct_tooltip": [
          100
        ],
        "AbilityDuration": [
          3,
          4,
          5,
          6
        ],
        "AbilityCastPoint": [
          0.3
        ],
        "AbilityManaCost": [
          50
        ],
        "AbilityCooldown": [
          14,
          13,
          12,
          11
        ],
        "cannot_be_dispelled": [
          0
        ]
      },
      "scaling": {},
      "description": "提升移动速度，并闪避一切物理攻击。",
      "damageType": "magical"
    },
    {
      "id": "windrunner_focusfire",
      "sourceID": 5133,
      "name": "集中火力",
      "key": "R",
      "icon": "target",
      "image": "assets/abilities/windrunner_focusfire.png",
      "color": "#8ebcca",
      "kind": "active",
      "maxLevel": 3,
      "requiredLevels": [
        6,
        12,
        18
      ],
      "cooldowns": [
        50,
        40,
        30
      ],
      "manaCosts": [
        75,
        100,
        125
      ],
      "castRanges": [
        600
      ],
      "castPoints": [
        0
      ],
      "channelTimes": [
        0
      ],
      "durations": [
        20,
        20,
        20
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "bonus_attack_speed": [
          350,
          425,
          500
        ],
        "attacks_per_second": [
          0,
          0,
          0
        ],
        "focusfire_damage_reduction": [
          -18
        ],
        "focusfire_fire_on_the_move": [
          1
        ],
        "focusfire_attack_effectiveness": [
          75
        ],
        "process_procs": [
          1
        ],
        "is_unfocused": [
          0
        ],
        "cooldown_reduction_per_kill": [],
        "bonus_range": [
          0
        ],
        "unfocused_cancel_initial_cooldown": [
          0.5
        ],
        "AbilityCastRange": [
          600
        ],
        "AbilityDuration": [
          20
        ],
        "AbilityManaCost": [
          75,
          100,
          125
        ],
        "AbilityCooldown": [
          50,
          40,
          30
        ]
      },
      "scaling": {},
      "description": "风行者受风的引领，攻击敌方单位或建筑的攻击速度增加350/425/500，但是攻击力和物品威力降低。",
      "damageType": "magical"
    }
  ],
  "kunkka": [
    {
      "id": "kunkka_torrent",
      "sourceID": 5031,
      "name": "洪流",
      "key": "Q",
      "icon": "torrent",
      "image": "assets/abilities/kunkka_torrent.png",
      "color": "#9dc0be",
      "kind": "active",
      "maxLevel": 4,
      "requiredLevels": [
        1,
        3,
        5,
        7
      ],
      "cooldowns": [
        16,
        14,
        12,
        10
      ],
      "manaCosts": [
        90
      ],
      "castRanges": [
        1300
      ],
      "castPoints": [
        0.4
      ],
      "channelTimes": [
        0
      ],
      "durations": [
        0
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "radius": [
          250
        ],
        "movespeed_bonus": [
          -40
        ],
        "slow_duration": [
          1,
          2,
          3,
          4
        ],
        "stun_duration": [
          1.4
        ],
        "delay": [
          1.6
        ],
        "torrent_damage": [
          110,
          180,
          250,
          320
        ],
        "damage_tick_interval": [
          0.2
        ],
        "AbilityCastRange": [
          1300
        ],
        "AbilityCastPoint": [
          0.4
        ],
        "AbilityManaCost": [
          90
        ],
        "AbilityCooldown": [
          16,
          14,
          12,
          10
        ],
        "percent_instant": [
          0
        ]
      },
      "scaling": {},
      "description": "召唤喷涌的洪流，短暂延迟后，将敌人冲上天，造成伤害、眩晕和减速。",
      "damageType": "magical"
    },
    {
      "id": "kunkka_tidebringer",
      "sourceID": 5032,
      "name": "潮汐使者",
      "key": "W",
      "icon": "tide",
      "image": "assets/abilities/kunkka_tidebringer.png",
      "color": "#99bda0",
      "kind": "autocast",
      "maxLevel": 4,
      "requiredLevels": [
        1,
        3,
        5,
        7
      ],
      "cooldowns": [
        13,
        10,
        7,
        4
      ],
      "manaCosts": [
        0
      ],
      "castRanges": [
        150
      ],
      "castPoints": [
        0,
        0,
        0,
        0
      ],
      "channelTimes": [
        0
      ],
      "durations": [
        0
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "cleave_starting_width": [
          150
        ],
        "cleave_ending_width": [
          500,
          550,
          600,
          650
        ],
        "cleave_distance": [
          650,
          775,
          900,
          1025
        ],
        "damage_bonus": [
          35,
          70,
          105,
          140
        ],
        "cleave_damage": [
          150
        ],
        "movespeed_slow": [
          0
        ],
        "movespeed_slow_duration": [
          0
        ],
        "pierces_armor": [
          0
        ],
        "AbilityCastRange": [
          150
        ],
        "AbilityCharges": [
          0
        ],
        "AbilityChargeRestoreTime": [
          0
        ],
        "AbilityCooldown": [
          13,
          10,
          7,
          4
        ],
        "cooldown_reduction_per_hero_hit": [
          0
        ]
      },
      "scaling": {},
      "description": "昆卡的传奇之剑使他的下一次攻击附加额外的攻击力并在前方造成大范围的分裂攻击伤害。",
      "damageType": "physical"
    },
    {
      "id": "kunkka_x_marks_the_spot",
      "sourceID": 5033,
      "name": "X标记",
      "key": "E",
      "icon": "xmark",
      "image": "assets/abilities/kunkka_x_marks_the_spot.png",
      "color": "#d1b47e",
      "kind": "active",
      "maxLevel": 4,
      "requiredLevels": [
        1,
        3,
        5,
        7
      ],
      "cooldowns": [
        24,
        20,
        16,
        12
      ],
      "manaCosts": [
        50
      ],
      "castRanges": [
        675,
        750,
        875,
        1000
      ],
      "castPoints": [
        0.4,
        0.4,
        0.4,
        0.4
      ],
      "channelTimes": [
        0
      ],
      "durations": [
        0
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "duration": [
          3
        ],
        "allied_duration": [
          6
        ],
        "fow_range": [
          400
        ],
        "fow_duration": [
          5.94
        ],
        "rum_allies_radius": [
          0
        ],
        "buff_duration": [
          0
        ],
        "movespeed_bonus": [
          15
        ],
        "ghostship_absorb": [
          35
        ],
        "AbilityCastRange": [
          675,
          750,
          875,
          1000
        ],
        "AbilityCastPoint": [
          0.4
        ],
        "AbilityManaCost": [
          50
        ],
        "AbilityCooldown": [
          24,
          20,
          16,
          12
        ],
        "ally_ms": [
          0
        ],
        "ally_armor": [
          0
        ]
      },
      "scaling": {},
      "description": "对友方或敌方英雄使用，用 X 标记他们当前位置，数秒后将他们送回 X 标记处。在技能持续时间内，昆卡可以手动触发送回。对友方英雄使用后持续时间加倍。",
      "damageType": "magical"
    },
    {
      "id": "kunkka_ghostship",
      "sourceID": 5035,
      "name": "幽灵船",
      "key": "R",
      "icon": "ship",
      "image": "assets/abilities/kunkka_ghostship.png",
      "color": "#8ebcca",
      "kind": "active",
      "maxLevel": 3,
      "requiredLevels": [
        6,
        12,
        18
      ],
      "cooldowns": [
        90,
        80,
        70
      ],
      "manaCosts": [
        125,
        175,
        225
      ],
      "castRanges": [
        1000
      ],
      "castPoints": [
        0.3
      ],
      "channelTimes": [
        0
      ],
      "durations": [
        0
      ],
      "damages": [
        350,
        450,
        550
      ],
      "values": {
        "tooltip_delay": [
          3.1
        ],
        "ghostship_distance": [
          2000
        ],
        "ghostship_width": [
          450
        ],
        "stun_duration": [
          1.2
        ],
        "ghostship_speed": [
          650
        ],
        "rum_factor": [
          2
        ],
        "fleet_interval": [
          0
        ],
        "fleet_count": [
          0
        ],
        "fire_cannons": [
          0
        ],
        "cannon_ball_damage_pct": [
          0
        ],
        "cannon_ball_distance": [
          0
        ],
        "cannon_ball_speed": [
          0
        ],
        "cannon_count": [
          0
        ],
        "cannon_ball_radius": [
          0
        ],
        "num_cannon_volleys": [
          3
        ],
        "cannon_fire_interval": [
          0
        ],
        "forward_cannon_count": [
          0
        ],
        "base_cannon_rotation": [
          20
        ],
        "rotation_per_cannon": [
          12
        ],
        "initial_cannon_offset": [
          -150
        ],
        "distance_between_cannons": [
          75
        ],
        "AbilityDamage": [
          350,
          450,
          550
        ],
        "AbilityCastRange": [
          1000
        ],
        "AbilityCastPoint": [
          0.3
        ],
        "AbilityManaCost": [
          125,
          175,
          225
        ],
        "AbilityCooldown": [
          90,
          80,
          70
        ]
      },
      "scaling": {},
      "description": "召唤一艘幽灵船驶过战场，直到撞成粉碎，残骸周围的敌人将会因撞击受到伤害并眩晕。被幽灵船碰到的友军会获得2倍效果的统帅朗姆酒。",
      "damageType": "magical"
    }
  ],
  "ogre_magi": [
    {
      "id": "ogre_magi_fireblast",
      "sourceID": 5438,
      "name": "火焰爆轰",
      "key": "Q",
      "icon": "fire",
      "image": "assets/abilities/ogre_magi_fireblast.png",
      "color": "#9dc0be",
      "kind": "active",
      "maxLevel": 4,
      "requiredLevels": [
        1,
        3,
        5,
        7
      ],
      "cooldowns": [
        14,
        12,
        10,
        8
      ],
      "manaCosts": [
        85,
        95,
        105,
        115
      ],
      "castRanges": [
        525
      ],
      "castPoints": [
        0.45
      ],
      "channelTimes": [
        0
      ],
      "durations": [
        0
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "stun_duration": [
          1.2
        ],
        "multicast_delay": [
          0.6
        ],
        "fireblast_damage": [
          100,
          150,
          200,
          250
        ],
        "fireblast_proc": [],
        "bonus_cast_speed": [
          0
        ],
        "AbilityCastRange": [
          525
        ],
        "AbilityCastPoint": [
          0.45
        ],
        "AbilityManaCost": [
          85,
          95,
          105,
          115
        ],
        "AbilityCooldown": [
          14,
          12,
          10,
          8
        ]
      },
      "scaling": {},
      "description": "以一波火焰轰击一个敌方单位，造成伤害并使目标眩晕。",
      "damageType": "magical",
      "targetTeam": "DOTA_UNIT_TARGET_TEAM_ENEMY",
      "targetType": "DOTA_UNIT_TARGET_HERO | DOTA_UNIT_TARGET_BASIC",
      "targetFlags": "",
      "notes": [
        "触发多重施法时，两次火焰爆轰之间有%multicast_delay%秒的间隔。"
      ]
    },
    {
      "id": "ogre_magi_ignite",
      "sourceID": 5439,
      "name": "引燃",
      "key": "W",
      "icon": "fire",
      "image": "assets/abilities/ogre_magi_ignite.png",
      "color": "#99bda0",
      "kind": "active",
      "maxLevel": 4,
      "requiredLevels": [
        1,
        3,
        5,
        7
      ],
      "cooldowns": [
        17
      ],
      "manaCosts": [
        80,
        90,
        100,
        110
      ],
      "castRanges": [
        700,
        800,
        900,
        1000
      ],
      "castPoints": [
        0.35
      ],
      "channelTimes": [
        0
      ],
      "durations": [
        0
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "duration": [
          7
        ],
        "burn_damage": [
          10,
          25,
          40,
          55
        ],
        "slow_movement_speed_pct": [
          -25
        ],
        "projectile_speed": [
          1000
        ],
        "multicast_delay": [
          0.6
        ],
        "ignite_multicast_aoe": [
          1400
        ],
        "AbilityCastRange": [
          700,
          800,
          900,
          1000
        ],
        "AbilityCastPoint": [
          0.35
        ],
        "AbilityManaCost": [
          80,
          90,
          100,
          110
        ],
        "AbilityCooldown": [
          17
        ]
      },
      "scaling": {},
      "description": "使目标和另一个随机单位浸透在挥发性化学物质中，导致其瞬间被火焰吞噬。目标处在极度痛苦之中，受到伤害并且移动缓慢。",
      "damageType": "magical",
      "targetTeam": "DOTA_UNIT_TARGET_TEAM_ENEMY",
      "targetType": "DOTA_UNIT_TARGET_HERO | DOTA_UNIT_TARGET_BASIC",
      "targetFlags": "",
      "notes": [
        "多重施法将使此技能有几率对%ignite_multicast_aoe%范围内的随机敌方单位进行多次施放。",
        "引燃现在击中已受到作用的单位后会增加持续时间。"
      ]
    },
    {
      "id": "ogre_magi_bloodlust",
      "sourceID": 5440,
      "name": "嗜血术",
      "key": "E",
      "icon": "roar",
      "image": "assets/abilities/ogre_magi_bloodlust.png",
      "color": "#d1b47e",
      "kind": "autocast",
      "maxLevel": 4,
      "requiredLevels": [
        1,
        3,
        5,
        7
      ],
      "cooldowns": [
        20,
        18,
        16,
        14
      ],
      "manaCosts": [
        40,
        50,
        60,
        70
      ],
      "castRanges": [
        650
      ],
      "castPoints": [
        0.45
      ],
      "channelTimes": [
        0
      ],
      "durations": [
        0
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "modelscale": [
          25
        ],
        "bonus_movement_speed": [
          6,
          8,
          10,
          12
        ],
        "bonus_attack_speed": [
          35,
          50,
          65,
          80
        ],
        "self_bonus": [
          40,
          60,
          80,
          100
        ],
        "duration": [
          30
        ],
        "multicast_bloodlust_aoe": [
          700
        ],
        "AbilityCastRange": [
          650
        ],
        "AbilityCastPoint": [
          0.45
        ],
        "AbilityManaCost": [
          40,
          50,
          60,
          70
        ],
        "AbilityCooldown": [
          20,
          18,
          16,
          14
        ]
      },
      "scaling": {},
      "description": "激起一个友方单位的狂暴，增加其移动和攻击速度。对食人魔魔法师自身施放时攻击速度加成更高。可以对防御塔施放。",
      "damageType": "magical",
      "targetTeam": "DOTA_UNIT_TARGET_TEAM_FRIENDLY",
      "targetType": "DOTA_UNIT_TARGET_HERO | DOTA_UNIT_TARGET_BASIC | DOTA_UNIT_TARGET_BUILDING",
      "targetFlags": "DOTA_UNIT_TARGET_FLAG_INVULNERABLE",
      "notes": [
        "触发多重施法时，%multicast_bloodlust_aoe%范围内的友方单位将随机获得嗜血术效果。"
      ]
    },
    {
      "id": "ogre_magi_multicast",
      "sourceID": 5441,
      "name": "多重施法",
      "key": "R",
      "icon": "aura",
      "image": "assets/abilities/ogre_magi_multicast.png",
      "color": "#8ebcca",
      "kind": "passive",
      "maxLevel": 3,
      "requiredLevels": [
        6,
        12,
        18
      ],
      "cooldowns": [
        0
      ],
      "manaCosts": [
        0
      ],
      "castRanges": [
        0
      ],
      "castPoints": [
        0
      ],
      "channelTimes": [
        0
      ],
      "durations": [
        0
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "multicast_2_times": [
          75
        ],
        "multicast_3_times": [
          0,
          30,
          30
        ],
        "multicast_4_times": [
          0,
          0,
          15
        ],
        "strength_for_one_pct": [
          16
        ],
        "one_tooltip": [
          1
        ]
      },
      "scaling": {},
      "description": "使食人魔魔法师在单次施法中有概率多次施放同一技能和物品。每16点力量提升1%多重施法几率。",
      "damageType": "magical",
      "targetFlags": "",
      "notes": [
        "只有指向性技能和物品有几率触发多重施法。",
        "指向性技能和物品额外对食人魔周围一定作用范围内敌人和中立生物生效。火焰爆轰和未精通的火焰爆轰将对同个目标生效多次。"
      ]
    }
  ],
  "drow_ranger": [
    {
      "id": "drow_ranger_frost_arrows",
      "sourceID": 5019,
      "name": "霜冻之箭",
      "key": "Q",
      "icon": "snow",
      "image": "assets/abilities/drow_ranger_frost_arrows.png",
      "color": "#9dc0be",
      "kind": "autocast",
      "maxLevel": 4,
      "requiredLevels": [
        1,
        3,
        5,
        7
      ],
      "cooldowns": [
        0,
        0,
        0,
        0
      ],
      "manaCosts": [
        9,
        10,
        11,
        12
      ],
      "castRanges": [
        625
      ],
      "castPoints": [
        0,
        0,
        0,
        0
      ],
      "channelTimes": [
        0
      ],
      "durations": [
        1.5
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "frost_arrows_movement_speed": [
          -15,
          -25,
          -35,
          -45
        ],
        "damage": [
          12,
          18,
          24,
          30
        ],
        "shard_regen_reduction_pct_per_stack": [
          0
        ],
        "shard_bonus_damage_per_stack": [
          0
        ],
        "shard_stack_duration": [
          0
        ],
        "shard_burst_radius": [
          0
        ],
        "shard_burst_damage_per_stack": [
          0
        ],
        "shard_burst_move_slow_pct": [
          0
        ],
        "shard_burst_slow_duration": [
          0
        ],
        "shard_max_stacks": [
          0
        ],
        "AbilityCastRange": [
          625
        ],
        "AbilityDuration": [
          1.5
        ],
        "AbilityManaCost": [
          9,
          10,
          11,
          12
        ]
      },
      "scaling": {},
      "description": "卓尔游侠在箭矢中附上冰冻效果，减缓敌人的移动速度并造成额外伤害。持续1.5秒。",
      "damageType": "physical",
      "targetTeam": "DOTA_UNIT_TARGET_TEAM_ENEMY",
      "targetType": "DOTA_UNIT_TARGET_HERO | DOTA_UNIT_TARGET_BASIC",
      "targetFlags": "",
      "notes": [
        "减速的持续时间在下一支冰箭射中后刷新。"
      ]
    },
    {
      "id": "drow_ranger_wave_of_silence",
      "sourceID": 5632,
      "name": "狂风",
      "key": "W",
      "icon": "wind",
      "image": "assets/abilities/drow_ranger_wave_of_silence.png",
      "color": "#99bda0",
      "kind": "active",
      "maxLevel": 4,
      "requiredLevels": [
        1,
        3,
        5,
        7
      ],
      "cooldowns": [
        18,
        16,
        14,
        12
      ],
      "manaCosts": [
        55
      ],
      "castRanges": [
        900
      ],
      "castPoints": [
        0.25
      ],
      "channelTimes": [
        0
      ],
      "durations": [
        0
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "wave_speed": [
          2000
        ],
        "wave_width": [
          250
        ],
        "silence_duration": [
          3,
          4,
          5,
          6
        ],
        "knockback_distance_max": [
          450
        ],
        "knockback_duration": [
          0.6,
          0.7,
          0.8,
          0.9
        ],
        "knockback_duration_min": [
          0.4
        ],
        "wave_length": [
          900
        ],
        "bonus_movespeed": [
          0
        ],
        "gust_reveals_invis": [
          1
        ],
        "AbilityCastRange": [
          900
        ],
        "AbilityCastPoint": [
          0.25
        ],
        "AbilityManaCost": [
          55
        ],
        "AbilityCooldown": [
          18,
          16,
          14,
          12
        ],
        "knockback_height": [
          0
        ],
        "miss_chance": [
          0
        ]
      },
      "scaling": {},
      "description": "释放一阵狂风，沉默敌方单位并将其击退，同时使隐身敌人显形。击退距离与敌人和卓尔游侠的距离成反比。",
      "damageType": "magical",
      "targetFlags": "",
      "notes": []
    },
    {
      "id": "drow_ranger_multishot",
      "sourceID": 343,
      "name": "数箭齐发",
      "key": "E",
      "icon": "arrow",
      "image": "assets/abilities/drow_ranger_multishot.png",
      "color": "#d1b47e",
      "kind": "active",
      "maxLevel": 4,
      "requiredLevels": [
        1,
        3,
        5,
        7
      ],
      "cooldowns": [
        24,
        21,
        18,
        15
      ],
      "manaCosts": [
        70,
        85,
        100,
        115
      ],
      "castRanges": [
        0
      ],
      "castPoints": [
        0
      ],
      "channelTimes": [
        1.75
      ],
      "durations": [
        0
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "wave_count": [
          3
        ],
        "arrow_count_per_wave": [
          4
        ],
        "arrow_damage_pct": [
          80,
          100,
          120,
          140
        ],
        "arrow_width": [
          90
        ],
        "arrow_speed": [
          1300
        ],
        "arrow_range_multiplier": [
          1
        ],
        "arrow_range_base": [
          475
        ],
        "arrow_angle": [
          50
        ],
        "bypass_block": [
          1
        ],
        "multishot_movespeed": [
          35
        ],
        "AbilityChannelTime": [
          1.75
        ],
        "AbilityManaCost": [
          70,
          85,
          100,
          115
        ],
        "AbilityCooldown": [
          24,
          21,
          18,
          15
        ]
      },
      "scaling": {},
      "description": "持续施法 - 卓尔游侠在最多1.75秒内不断地射出阵阵箭矢，对卓尔游侠攻击距离 + 475的距离内击中的敌人造成额外伤害，并施加霜冻之箭效果。卓尔游侠在施放数箭齐发时可以缓慢移动和使用物品。",
      "damageType": "physical",
      "targetTeam": "DOTA_UNIT_TARGET_TEAM_ENEMY",
      "targetType": "DOTA_UNIT_TARGET_HERO | DOTA_UNIT_TARGET_BASIC",
      "targetFlags": "",
      "notes": [
        "箭矢的基础伤害无视减益免疫。",
        "霜冻之箭的额外伤害和减速效果不无视减益免疫。"
      ]
    },
    {
      "id": "drow_ranger_marksmanship",
      "sourceID": 5022,
      "name": "射手天赋",
      "key": "R",
      "icon": "target",
      "image": "assets/abilities/drow_ranger_marksmanship.png",
      "color": "#8ebcca",
      "kind": "passive",
      "maxLevel": 3,
      "requiredLevels": [
        6,
        12,
        18
      ],
      "cooldowns": [
        0
      ],
      "manaCosts": [
        0
      ],
      "castRanges": [
        0
      ],
      "castPoints": [
        0
      ],
      "channelTimes": [
        0
      ],
      "durations": [
        0
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "chance": [
          30,
          35,
          40
        ],
        "bonus_damage": [
          60,
          75,
          90
        ],
        "disable_range": [
          300
        ]
      },
      "scaling": {},
      "description": "卓尔游侠的战斗经验使她有概率发出极其精准高效的箭矢。箭矢将穿透敌人的防御，无视他们的基础护甲。如果300范围内有敌方英雄，本技能没有效果。",
      "damageType": "physical",
      "targetTeam": "DOTA_UNIT_TARGET_TEAM_ENEMY",
      "targetType": "DOTA_UNIT_TARGET_HERO | DOTA_UNIT_TARGET_BASIC",
      "targetFlags": "",
      "notes": [
        "射手天赋的触发效果拥有克敌机先。"
      ]
    }
  ],
  "chen": [
    {
      "id": "chen_penitence",
      "sourceID": 5328,
      "name": "赎罪",
      "key": "Q",
      "icon": "target",
      "image": "assets/abilities/chen_penitence.png",
      "color": "#9dc0be",
      "kind": "active",
      "maxLevel": 4,
      "requiredLevels": [
        1,
        3,
        5,
        7
      ],
      "cooldowns": [
        20,
        17,
        14,
        11
      ],
      "manaCosts": [
        80,
        90,
        100,
        110
      ],
      "castRanges": [
        800
      ],
      "castPoints": [
        0.3,
        0.3,
        0.3,
        0.3
      ],
      "channelTimes": [
        0
      ],
      "durations": [
        0
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "duration": [
          5,
          6,
          7,
          8
        ],
        "speed": [
          1400
        ],
        "bonus_movement_speed": [
          -12,
          -18,
          -24,
          -30
        ],
        "bonus_attack_speed": [
          20,
          40,
          60,
          80
        ],
        "damage": [
          60,
          120,
          180,
          240
        ],
        "AbilityCastRange": [
          800
        ],
        "AbilityCastPoint": [
          0.3
        ],
        "AbilityManaCost": [
          80,
          90,
          100,
          110
        ],
        "AbilityCooldown": [
          20,
          17,
          14,
          11
        ],
        "self_attack_range_bonus": [
          0
        ]
      },
      "scaling": {},
      "description": "对敌方单位造成伤害，并使其移动变慢，友军攻击他时攻速提升。",
      "damageType": "pure",
      "targetTeam": "DOTA_UNIT_TARGET_TEAM_ENEMY",
      "targetType": "DOTA_UNIT_TARGET_HERO | DOTA_UNIT_TARGET_BASIC",
      "targetFlags": "",
      "notes": []
    },
    {
      "id": "chen_holy_persuasion",
      "sourceID": 5330,
      "name": "神圣劝化",
      "key": "W",
      "icon": "aura",
      "image": "assets/abilities/chen_holy_persuasion.png",
      "color": "#99bda0",
      "kind": "active",
      "maxLevel": 4,
      "requiredLevels": [
        1,
        3,
        5,
        7
      ],
      "cooldowns": [
        15
      ],
      "manaCosts": [
        110,
        130,
        150,
        170
      ],
      "castRanges": [
        600
      ],
      "castPoints": [
        0.3
      ],
      "channelTimes": [
        0
      ],
      "durations": [
        0
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "max_units": [
          1,
          2,
          3,
          4
        ],
        "level_req": [
          3,
          4,
          5,
          6
        ],
        "gold_pct": [
          25,
          50,
          75,
          100
        ],
        "creep_ability_level": [
          0
        ],
        "unsummon_time": [
          3
        ],
        "unsummon_cooldown_reduction": [
          12
        ],
        "teleport_delay": [
          6,
          5,
          4,
          3
        ],
        "AbilityCastRange": [
          600
        ],
        "AbilityCastPoint": [
          0.3
        ],
        "AbilityManaCost": [
          110,
          130,
          150,
          170
        ],
        "AbilityCooldown": [
          15
        ],
        "current_hp_pct_tooltip": [
          0
        ]
      },
      "scaling": {},
      "description": "陈控制住敌方小兵或者中立生物，并获得其击杀金钱的一定百分比。陈自己的单位如果在3秒内未受到伤害可以在全地图范围内成为技能的目标，施放后取消劝化。对陈自身施放神圣劝化会把他控制的所有非英雄单位在一定延迟后传送到他身边。受到来自敌方英雄或其单位的伤害会中止传送。",
      "damageType": "magical",
      "targetTeam": "DOTA_UNIT_TARGET_TEAM_BOTH",
      "targetFlags": "",
      "notes": [
        "如果达到劝化生物的数量上限后再劝化生物，最早劝化的单位将立即死亡。",
        "拥有阿哈利姆魔晶后可以对远古中立生物施放本技能。",
        "劝化时单位的魔法恢复至满魔。"
      ]
    },
    {
      "id": "chen_divine_favor",
      "sourceID": 7306,
      "name": "神力恩泽",
      "key": "E",
      "icon": "heal",
      "image": "assets/abilities/chen_divine_favor.png",
      "color": "#d1b47e",
      "kind": "active",
      "maxLevel": 4,
      "requiredLevels": [
        1,
        3,
        5,
        7
      ],
      "cooldowns": [
        20,
        18,
        16,
        14
      ],
      "manaCosts": [
        75
      ],
      "castRanges": [
        1200
      ],
      "castPoints": [
        0.2
      ],
      "channelTimes": [
        0
      ],
      "durations": [
        0
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "heal_rate": [
          1.5,
          3,
          4.5,
          6
        ],
        "aura_radius": [
          1200
        ],
        "duration": [
          6
        ],
        "bonus_armor": [
          5,
          10,
          15,
          20
        ],
        "heal_amp": [
          5,
          10,
          15,
          20
        ],
        "creep_bonus": [
          1
        ],
        "AbilityCastRange": [
          1200
        ],
        "AbilityCastPoint": [
          0.2
        ],
        "AbilityManaCost": [
          75
        ],
        "AbilityCooldown": [
          20,
          18,
          16,
          14
        ],
        "armor": [
          0
        ]
      },
      "scaling": {},
      "description": "被动提供光环，提供生命恢复加成。可以主动对友军施放，提供护甲加成，以及治疗和生命恢复增强。\n\n对陈施放后，陈控制的所有单位都会获得增益效果。",
      "damageType": "magical",
      "targetTeam": "DOTA_UNIT_TARGET_TEAM_FRIENDLY",
      "targetType": "DOTA_UNIT_TARGET_HERO | DOTA_UNIT_TARGET_BASIC",
      "targetFlags": "DOTA_UNIT_TARGET_FLAG_NOT_MAGIC_IMMUNE_ALLIES",
      "notes": []
    },
    {
      "id": "chen_hand_of_god",
      "sourceID": 5331,
      "name": "上帝之手",
      "key": "R",
      "icon": "heal",
      "image": "assets/abilities/chen_hand_of_god.png",
      "color": "#8ebcca",
      "kind": "active",
      "maxLevel": 3,
      "requiredLevels": [
        6,
        12,
        18
      ],
      "cooldowns": [
        150,
        130,
        110
      ],
      "manaCosts": [
        200,
        300,
        400
      ],
      "castRanges": [
        0
      ],
      "castPoints": [
        0.3,
        0.3,
        0.3
      ],
      "channelTimes": [
        0
      ],
      "durations": [
        0
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "heal_amount": [
          200,
          300,
          400
        ],
        "hot_duration": [
          10
        ],
        "heal_per_second": [
          20,
          30,
          40
        ],
        "ancient_creeps_scepter": [
          0
        ],
        "does_purge": [],
        "full_heal_on_chen_and_creeps": [],
        "debuff_immune_radius": [
          0
        ],
        "debuff_immune_resist": [
          0
        ],
        "nearby_hot_boost": [
          0
        ],
        "AbilityChannelTime": [
          0
        ],
        "AbilityCastPoint": [
          0.3
        ],
        "AbilityManaCost": [
          200,
          300,
          400
        ],
        "AbilityCooldown": [
          150,
          130,
          110
        ]
      },
      "scaling": {},
      "description": "治疗地图上的所有友军英雄以及陈控制的所有单位。一开始先施加高额治疗，在之后10秒内持续进行小额治疗。",
      "damageType": "magical",
      "targetFlags": "",
      "notes": [
        "可以治疗无敌和被隐藏/放逐友军。"
      ]
    }
  ],
  "chaos_knight": [
    {
      "id": "chaos_knight_chaos_bolt",
      "sourceID": 5426,
      "name": "混乱之箭",
      "key": "Q",
      "icon": "fire",
      "image": "assets/abilities/chaos_knight_chaos_bolt.png",
      "color": "#9dc0be",
      "kind": "active",
      "maxLevel": 4,
      "requiredLevels": [
        1,
        3,
        5,
        7
      ],
      "cooldowns": [
        13,
        12,
        11,
        10
      ],
      "manaCosts": [
        110
      ],
      "castRanges": [
        600
      ],
      "castPoints": [
        0.4,
        0.4,
        0.4,
        0.4
      ],
      "channelTimes": [
        0
      ],
      "durations": [
        0
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "chaos_bolt_speed": [
          900
        ],
        "stun_min": [
          1.25,
          1.5,
          1.75,
          2
        ],
        "stun_max": [
          1.75,
          2.25,
          2.75,
          3.25
        ],
        "damage_min": [
          90,
          120,
          150,
          180
        ],
        "damage_max": [
          155,
          240,
          325,
          410
        ],
        "fake_bolt_distance": [
          675
        ],
        "illusion_duration": [
          0
        ],
        "illusion_effectiveness": [
          0
        ],
        "illusion_damage_reduction_pct": [
          0
        ],
        "AbilityCastRange": [
          600
        ],
        "AbilityCastPoint": [
          0.4
        ],
        "AbilityManaCost": [
          110
        ],
        "AbilityCooldown": [
          13,
          12,
          11,
          10
        ],
        "bounce_range_pct": [
          0
        ]
      },
      "scaling": {},
      "description": "对目标单位投掷一支神秘的能量箭。造成随机时间的眩晕和随机的伤害。",
      "damageType": "magical"
    },
    {
      "id": "chaos_knight_reality_rift",
      "sourceID": 5427,
      "name": "实相裂隙",
      "key": "W",
      "icon": "xmark",
      "image": "assets/abilities/chaos_knight_reality_rift.png",
      "color": "#99bda0",
      "kind": "active",
      "maxLevel": 4,
      "requiredLevels": [
        1,
        3,
        5,
        7
      ],
      "cooldowns": [
        15,
        12,
        9,
        6
      ],
      "manaCosts": [
        50
      ],
      "castRanges": [
        600,
        650,
        700,
        750
      ],
      "castPoints": [
        0.25
      ],
      "channelTimes": [
        0
      ],
      "durations": [
        0
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "pull_distance": [
          300,
          350,
          400,
          450
        ],
        "armor_reduction": [
          4,
          5,
          6,
          7
        ],
        "duration": [
          6
        ],
        "pierces_immunity": [
          0
        ],
        "AbilityCastRange": [
          600,
          650,
          700,
          750
        ],
        "AbilityCastPoint": [
          0.25
        ],
        "AbilityManaCost": [
          50
        ],
        "AbilityCooldown": [
          15,
          12,
          9,
          6
        ],
        "additional_debuff_duration_percent": [
          0
        ],
        "additional_debuff_duration_tooltip": [
          0
        ]
      },
      "scaling": {},
      "description": "将混沌骑士及混沌骑士的幻象和目标单位传送到混沌骑士与目标连线上的一点。降低敌方单位的护甲，持续6秒。",
      "damageType": "magical"
    },
    {
      "id": "chaos_knight_chaos_strike",
      "sourceID": 5428,
      "name": "混沌一击",
      "key": "E",
      "icon": "swords",
      "image": "assets/abilities/chaos_knight_chaos_strike.png",
      "color": "#d1b47e",
      "kind": "passive",
      "maxLevel": 4,
      "requiredLevels": [
        1,
        3,
        5,
        7
      ],
      "cooldowns": [
        0
      ],
      "manaCosts": [
        0
      ],
      "castRanges": [
        0
      ],
      "castPoints": [
        0
      ],
      "channelTimes": [
        0
      ],
      "durations": [
        0
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "chance": [
          33.33
        ],
        "crit_min": [
          120
        ],
        "crit_max": [
          150,
          190,
          230,
          270
        ],
        "lifesteal": [
          30,
          40,
          50,
          60
        ],
        "creep_multiplier": [
          1
        ]
      },
      "scaling": {},
      "description": "混沌骑士和他的幻象在攻击时有几率造成威力不一的致命一击，并且触发时具有吸血效果。",
      "damageType": "magical"
    },
    {
      "id": "chaos_knight_phantasm",
      "sourceID": 5429,
      "name": "混沌之军",
      "key": "R",
      "icon": "swords",
      "image": "assets/abilities/chaos_knight_phantasm.png",
      "color": "#8ebcca",
      "kind": "active",
      "maxLevel": 3,
      "requiredLevels": [
        6,
        12,
        18
      ],
      "cooldowns": [
        85,
        80,
        75
      ],
      "manaCosts": [
        100,
        200,
        300
      ],
      "castRanges": [
        0
      ],
      "castPoints": [
        0.4,
        0.4,
        0.4
      ],
      "channelTimes": [
        0
      ],
      "durations": [
        0
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "images_count": [
          3
        ],
        "illusion_effectiveness": [
          100
        ],
        "illusion_duration": [
          30
        ],
        "outgoing_damage": [
          -40,
          -20,
          0
        ],
        "outgoing_damage_tooltip": [
          60,
          80,
          100
        ],
        "incoming_damage": [
          250
        ],
        "incoming_damage_tooltip": [
          350
        ],
        "invuln_duration": [
          0.5
        ],
        "vision_radius": [
          400
        ],
        "bonus_illusion_chance": [
          0
        ],
        "bonus_illusion_count": [
          0
        ],
        "AbilityCastPoint": [
          0.4
        ],
        "AbilityManaCost": [
          100,
          200,
          300
        ],
        "AbilityCooldown": [
          85,
          80,
          75
        ],
        "magic_resistance": [
          0
        ]
      },
      "scaling": {},
      "description": "从其他维度召唤若干个混沌骑士的幻象。幻象继承60/80/100%攻击力，但是承受350%伤害。\n驱散类型：弱驱散",
      "damageType": "magical"
    }
  ],
  "weaver": [
    {
      "id": "weaver_the_swarm",
      "sourceID": 5289,
      "name": "虫群",
      "key": "Q",
      "icon": "aura",
      "image": "assets/abilities/weaver_the_swarm.png",
      "color": "#9dc0be",
      "kind": "active",
      "maxLevel": 4,
      "requiredLevels": [
        1,
        3,
        5,
        7
      ],
      "cooldowns": [
        44,
        36,
        28,
        20
      ],
      "manaCosts": [
        110,
        105,
        100,
        95
      ],
      "castRanges": [
        3000
      ],
      "castPoints": [
        0.3,
        0.3,
        0.3,
        0.3
      ],
      "channelTimes": [
        0
      ],
      "durations": [
        0
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "damage": [
          18,
          23,
          28,
          33
        ],
        "attack_rate": [
          1.2,
          1.05,
          0.9,
          0.75
        ],
        "count": [
          12
        ],
        "armor_reduction": [
          1
        ],
        "duration": [
          16
        ],
        "destroy_attacks": [
          3,
          4,
          4,
          5
        ],
        "radius": [
          100
        ],
        "speed": [
          750
        ],
        "spawn_radius": [
          300
        ],
        "shard_cooldown_reduction": [
          0
        ],
        "AbilityCastRange": [
          3000
        ],
        "AbilityCastPoint": [
          0.3
        ],
        "AbilityManaCost": [
          110,
          105,
          100,
          95
        ],
        "AbilityCooldown": [
          44,
          36,
          28,
          20
        ]
      },
      "scaling": {},
      "description": "编织者放出12只编织者幼虫，每只幼虫都会紧紧缠住它遇到的敌人，攻击敌人并削弱他们的护甲，直到幼虫被杀死。",
      "damageType": "physical",
      "targetFlags": "",
      "notes": [
        "甲虫抓住目标后将一直留在目标身上，除非甲虫被击杀或持续时间结束。",
        "甲虫免疫技能，拥有3/4/4/5格生命。非英雄单位和幻象对甲虫造成25%伤害。",
        "幼虫提供视野。"
      ],
      "valuePercentages": {}
    },
    {
      "id": "weaver_shukuchi",
      "sourceID": 5290,
      "name": "缩地",
      "key": "W",
      "icon": "wind",
      "image": "assets/abilities/weaver_shukuchi.png",
      "color": "#99bda0",
      "kind": "active",
      "maxLevel": 4,
      "requiredLevels": [
        1,
        3,
        5,
        7
      ],
      "cooldowns": [
        15,
        12,
        9,
        6
      ],
      "manaCosts": [
        65
      ],
      "castRanges": [
        0
      ],
      "castPoints": [
        0,
        0,
        0,
        0
      ],
      "channelTimes": [
        0
      ],
      "durations": [
        0
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "damage": [
          100,
          130,
          160,
          190
        ],
        "speed": [
          200,
          230,
          260,
          290
        ],
        "radius": [
          175
        ],
        "fade_time": [
          0.25
        ],
        "duration": [
          4
        ],
        "geminate_attack_mark_duration": [
          0
        ],
        "min_movespeed_override": [
          550
        ],
        "shukuchi_attack_mark_radius": [
          0
        ],
        "shukuchi_attack_delay": [
          0
        ],
        "AbilityManaCost": [
          65
        ],
        "AbilityCooldown": [
          15,
          12,
          9,
          6
        ]
      },
      "scaling": {},
      "description": "编织者进入隐身身，达到移动速度上限，在穿过敌方单位时还将造成伤害。",
      "damageType": "magical",
      "targetFlags": "",
      "notes": [
        "每次施放的技能只能对相同单位造成一次伤害。"
      ],
      "valuePercentages": {}
    },
    {
      "id": "weaver_geminate_attack",
      "sourceID": 5291,
      "name": "连击",
      "key": "E",
      "icon": "swords",
      "image": "assets/abilities/weaver_geminate_attack.png",
      "color": "#d1b47e",
      "kind": "autocast",
      "maxLevel": 4,
      "requiredLevels": [
        1,
        3,
        5,
        7
      ],
      "cooldowns": [
        9,
        7,
        5,
        3
      ],
      "manaCosts": [
        0
      ],
      "castRanges": [
        425
      ],
      "castPoints": [
        0
      ],
      "channelTimes": [
        0
      ],
      "durations": [
        0
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "delay": [
          0.25
        ],
        "extra_attack": [
          1
        ],
        "bonus_damage": [
          20,
          35,
          50,
          65
        ],
        "bonus_potency": [
          15
        ],
        "shard_beetle_search_range": [
          0
        ],
        "AbilityCastRange": [
          425
        ],
        "AbilityCooldown": [
          9,
          7,
          5,
          3
        ]
      },
      "scaling": {},
      "description": "允许编织者立刻发动额外攻击。额外攻击拥有额外伤害和物品威力。",
      "damageType": "physical",
      "targetTeam": "DOTA_UNIT_TARGET_TEAM_ENEMY",
      "targetType": "DOTA_UNIT_TARGET_HERO | DOTA_UNIT_TARGET_BASIC | DOTA_UNIT_TARGET_BUILDING | DOTA_UNIT_TARGET_OTHER",
      "targetFlags": "DOTA_UNIT_TARGET_FLAG_MAGIC_IMMUNE_ENEMIES",
      "notes": [
        "第二次攻击将在编织者第一次攻击的0.25秒后发出，并且没有距离限制。",
        "额外伤害仅对连击的攻击有效，初始攻击没有额外伤害。"
      ],
      "valuePercentages": {
        "bonus_potency": true
      }
    },
    {
      "id": "weaver_time_lapse",
      "sourceID": 5292,
      "name": "时光倒流",
      "key": "R",
      "icon": "xmark",
      "image": "assets/abilities/weaver_time_lapse.png",
      "color": "#8ebcca",
      "kind": "active",
      "maxLevel": 3,
      "requiredLevels": [
        6,
        12,
        18
      ],
      "cooldowns": [
        70,
        55,
        40
      ],
      "manaCosts": [
        150,
        75,
        0
      ],
      "castRanges": [
        0
      ],
      "castPoints": [
        0.3,
        0.3,
        0.3,
        0.3
      ],
      "channelTimes": [
        0
      ],
      "durations": [
        0
      ],
      "damages": [
        0,
        0,
        0,
        0
      ],
      "values": {
        "AbilityCastPoint": [
          0.3
        ],
        "AbilityManaCost": [
          150,
          75,
          0
        ],
        "AbilityCooldown": [
          70,
          55,
          40
        ]
      },
      "scaling": {},
      "description": "编织者回到五秒前的时间点，获得当时的生命值和魔法值。不影响冷却时间、金钱和经验。\n\n驱散类型：强驱散",
      "damageType": "magical",
      "targetFlags": "",
      "notes": [
        "能够移除编织者身上大部分的负面状态。",
        "时光倒流可以躲避攻击和技能弹道。"
      ],
      "valuePercentages": {}
    }
  ]
};
export const INNATES={
  "axe": {
    "id": "axe_one_man_army",
    "sourceID": 1166,
    "name": "一人之军",
    "key": "",
    "icon": "aura",
    "image": "assets/abilities/axe_one_man_army.png",
    "color": "#b9c19a",
    "kind": "innate",
    "maxLevel": 1,
    "requiredLevels": [
      1,
      3,
      5,
      7
    ],
    "cooldowns": [
      0
    ],
    "manaCosts": [
      0
    ],
    "castRanges": [
      0
    ],
    "castPoints": [
      0
    ],
    "channelTimes": [
      0
    ],
    "durations": [
      0
    ],
    "damages": [
      0,
      0,
      0,
      0
    ],
    "values": {
      "armor_pct_as_strength": [
        50
      ],
      "current_max_str_bonus": [
        0
      ],
      "radius": [
        700
      ],
      "bonus_linger_duration": [
        3
      ]
    },
    "scaling": {},
    "description": "只要斧王附近700范围内没有友方英雄，他就会获得50%自身护甲值的力量加成。这个效果在接近一名友军后会在3秒内消失。",
    "damageType": "magical"
  },
  "crystal_maiden": {
    "id": "crystal_maiden_glacial_guard",
    "sourceID": 1735,
    "name": "冰川护体",
    "key": "",
    "icon": "aura",
    "image": "assets/abilities/crystal_maiden_glacial_guard.png",
    "color": "#b9c19a",
    "kind": "innate",
    "maxLevel": 1,
    "requiredLevels": [
      1,
      3,
      5,
      7
    ],
    "cooldowns": [
      0
    ],
    "manaCosts": [
      0
    ],
    "castRanges": [
      0
    ],
    "castPoints": [
      0
    ],
    "channelTimes": [
      0
    ],
    "durations": [
      0
    ],
    "damages": [
      0,
      0,
      0,
      0
    ],
    "values": {
      "mana_multiplier": [
        30
      ],
      "barrier_duration": [
        8
      ]
    },
    "scaling": {
      "mana_multiplier": 2
    },
    "description": "水晶室女消耗在她技能上的一部分魔法会转化为物理护盾。",
    "damageType": "magical"
  },
  "juggernaut": {
    "id": "juggernaut_bladeform",
    "sourceID": 1210,
    "name": "剑心犹在",
    "key": "",
    "icon": "aura",
    "image": "assets/abilities/juggernaut_bladeform.png",
    "color": "#b9c19a",
    "kind": "innate",
    "maxLevel": 1,
    "requiredLevels": [
      1,
      3,
      5,
      7
    ],
    "cooldowns": [
      0
    ],
    "manaCosts": [
      0
    ],
    "castRanges": [
      0
    ],
    "castPoints": [
      0
    ],
    "channelTimes": [
      0
    ],
    "durations": [
      0
    ],
    "damages": [
      0,
      0,
      0,
      0
    ],
    "values": {
      "max_stacks": [
        10
      ],
      "stack_gain_time": [
        2
      ],
      "agi_bonus_pct_per_stack": [
        2.5
      ],
      "movement_speed_pct_per_stack": [
        1
      ],
      "linger_duration": [
        2
      ]
    },
    "scaling": {
      "agi_bonus_pct_per_stack": 0.1
    },
    "description": "主宰未受到伤害时每2秒获得一层剑心的叠加层数。每层叠加效果提供基础敏捷和移动速度加成。叠加效果在受到任何伤害时会粘滞2秒后再消失。",
    "damageType": "magical"
  },
  "windranger": {
    "id": "windrunner_tailwind",
    "sourceID": 1742,
    "name": "一路顺风",
    "key": "",
    "icon": "aura",
    "image": "assets/abilities/windrunner_tailwind.png",
    "color": "#b9c19a",
    "kind": "innate",
    "maxLevel": 1,
    "requiredLevels": [
      1,
      3,
      5,
      7
    ],
    "cooldowns": [
      0
    ],
    "manaCosts": [
      0
    ],
    "castRanges": [
      0
    ],
    "castPoints": [
      0
    ],
    "channelTimes": [
      0
    ],
    "durations": [
      0
    ],
    "damages": [
      0,
      0,
      0,
      0
    ],
    "values": {
      "movespeed_bonus": [
        35
      ],
      "duration": [
        2.5
      ],
      "max_movespeed": [
        600
      ],
      "applies_on_attack": [
        0
      ],
      "undispellable": [
        0
      ]
    },
    "scaling": {},
    "description": "施放技能会召唤一阵顺风，向风行者提供短时间的移动速度爆发。移动速度加成在顺风持续时间的半途开始逐渐衰减。\n\n被动提升风行者的移动速度上限。",
    "damageType": "magical"
  },
  "kunkka": {
    "id": "kunkka_admirals_rum",
    "sourceID": 1452,
    "name": "统帅朗姆酒",
    "key": "",
    "icon": "aura",
    "image": "assets/abilities/kunkka_admirals_rum.png",
    "color": "#b9c19a",
    "kind": "innate",
    "maxLevel": 1,
    "requiredLevels": [
      1,
      3,
      5,
      7
    ],
    "cooldowns": [
      50.5
    ],
    "manaCosts": [
      0
    ],
    "castRanges": [
      0
    ],
    "castPoints": [
      0
    ],
    "channelTimes": [
      0
    ],
    "durations": [
      0
    ],
    "damages": [
      0,
      0,
      0,
      0
    ],
    "values": {
      "damage_threshold": [
        65
      ],
      "ghostship_absorb": [
        18
      ],
      "buff_duration": [
        5
      ],
      "movespeed_bonus": [
        7.75
      ],
      "AbilityCooldown": [
        50.5
      ]
    },
    "scaling": {
      "movespeed_bonus": 0.25,
      "AbilityCooldown": -0.5
    },
    "description": "如果昆卡受到来自敌方英雄、建筑或肉山的伤害会使他的生命低于65%临界值，那么他会浸在统帅朗姆酒中，获得移动速度加成，并且延后承受即将受到的18%伤害，持续5秒。",
    "damageType": "magical"
  },
  "ogre_magi": {
    "id": "ogre_magi_dumb_luck",
    "sourceID": 1115,
    "name": "傻福",
    "key": "",
    "icon": "aura",
    "image": "assets/abilities/ogre_magi_dumb_luck.png",
    "color": "#b9c19a",
    "kind": "innate",
    "maxLevel": 1,
    "requiredLevels": [
      1,
      3,
      5,
      7
    ],
    "cooldowns": [
      0
    ],
    "manaCosts": [
      0
    ],
    "castRanges": [
      0
    ],
    "castPoints": [
      0
    ],
    "channelTimes": [
      0
    ],
    "durations": [
      0
    ],
    "damages": [
      0,
      0,
      0,
      0
    ],
    "values": {
      "mana_per_str": [
        6
      ],
      "mana_regen_per_str": [
        0.02
      ],
      "level_one_ability_points": [
        1
      ],
      "level_two_ability_points": [
        1
      ],
      "required_level_reduction": [
        0
      ]
    },
    "scaling": {},
    "description": "食人魔魔法师的智力值上限为0。他通过力量来获得魔法和魔法恢复。",
    "damageType": "none",
    "targetFlags": "",
    "notes": []
  },
  "drow_ranger": {
    "id": "drow_ranger_trueshot",
    "sourceID": 1205,
    "name": "精准光环",
    "key": "",
    "icon": "aura",
    "image": "assets/abilities/drow_ranger_trueshot.png",
    "color": "#b9c19a",
    "kind": "innate",
    "maxLevel": 1,
    "requiredLevels": [
      1,
      3,
      5,
      7
    ],
    "cooldowns": [
      0
    ],
    "manaCosts": [
      0
    ],
    "castRanges": [
      0
    ],
    "castPoints": [
      0
    ],
    "channelTimes": [
      0
    ],
    "durations": [
      0
    ],
    "damages": [
      0,
      0,
      0,
      0
    ],
    "values": {
      "radius": [
        1200
      ],
      "trueshot_agi_bonus": [
        10
      ],
      "trueshot_agi_bonus_allies_pct": [
        50
      ]
    },
    "scaling": {
      "trueshot_agi_bonus": 1
    },
    "description": "卓尔游侠根据她自身的当前敏捷和英雄等级获得敏捷加成。附近远程英雄获得50%敏捷加成。",
    "damageType": "magical",
    "targetFlags": "",
    "notes": []
  },
  "chen": {
    "id": "chen_zealot",
    "sourceID": 1755,
    "name": "狂热者",
    "key": "",
    "icon": "aura",
    "image": "assets/abilities/chen_zealot.png",
    "color": "#b9c19a",
    "kind": "innate",
    "maxLevel": 1,
    "requiredLevels": [
      1,
      3,
      5,
      7
    ],
    "cooldowns": [
      60
    ],
    "manaCosts": [
      0
    ],
    "castRanges": [
      0
    ],
    "castPoints": [
      0.3
    ],
    "channelTimes": [
      0
    ],
    "durations": [
      0
    ],
    "damages": [
      0,
      0,
      0,
      0
    ],
    "values": {
      "zealots": [
        1
      ],
      "health_min": [
        400
      ],
      "movement_speed_bonus": [
        5
      ],
      "damage_bonus": [
        5
      ],
      "damage": [
        0
      ],
      "bonus_hp": [
        0
      ],
      "AbilityCastPoint": [
        0.3
      ],
      "AbilityCooldown": [
        60
      ]
    },
    "scaling": {
      "AbilityCooldown": -1,
      "health_min": 50,
      "movement_speed_bonus": 2,
      "damage_bonus": 2,
      "damage": 2
    },
    "description": "被动为陈控制下的非英雄单位提供额外生命值、攻击力和移动速度。陈可以祝圣他控制下的单位，将其转化为祝圣狂热者，使其获得额外基础攻击力和殉道技能。祝圣狂热者不再被秒杀非英雄单位的技能秒杀。主动使用本技能会使当前祝圣狂热者复活。比赛开始时会有一个近战线上小兵作为祝圣狂热者。",
    "damageType": "magical",
    "targetFlags": "",
    "notes": [
      "同一时间只能存在一个狂热者。"
    ]
  },
  "chaos_knight": {
    "id": "chaos_knight_armageddon",
    "sourceID": 1910,
    "name": "天劫前进",
    "key": "",
    "icon": "aura",
    "image": "assets/abilities/chaos_knight_armageddon.png",
    "color": "#b9c19a",
    "kind": "innate",
    "maxLevel": 1,
    "requiredLevels": [
      1,
      3,
      5,
      7
    ],
    "cooldowns": [
      30
    ],
    "manaCosts": [
      50
    ],
    "castRanges": [
      0
    ],
    "castPoints": [
      0.4
    ],
    "channelTimes": [
      0
    ],
    "durations": [
      0
    ],
    "damages": [
      0,
      0,
      0,
      0
    ],
    "values": {
      "speed_per_second": [
        5
      ],
      "drain_rate_multiplier": [
        4
      ],
      "think_interval": [
        0.1
      ],
      "max_bonus_speed": [
        20
      ],
      "charge_speed_multiplier": [
        2
      ],
      "current_max_charge_speed": [
        0
      ],
      "charge_accel_time": [
        0.5
      ],
      "charge_decel_time": [
        0.5
      ],
      "illusion_radius": [
        1300
      ],
      "turn_rate": [
        25
      ],
      "hit_radius": [
        150
      ],
      "formation_spacing": [
        130
      ],
      "formation_jitter": [
        60
      ],
      "formation_width": [
        100
      ],
      "run_animation_rate": [
        1.8
      ],
      "max_charge_time": [
        1
      ],
      "windup_turn_rate": [
        120
      ],
      "attack_while_charging": [
        1
      ],
      "jump_distance": [
        500
      ],
      "jump_height": [
        160
      ],
      "AbilityCastPoint": [
        0.4
      ],
      "AbilityManaCost": [
        50
      ],
      "AbilityCooldown": [
        30
      ]
    },
    "scaling": {
      "max_bonus_speed": 2
    },
    "description": "混沌骑士每持续移动一秒并且不停下或攻击，天劫就会获得移动速度加成。加成效果在停下时会逐渐消失，攻击则会失去加成。混沌骑士的混沌之军至少有一个存活时，天劫前进可以主动使用，跨越地形冲锋，在释放前提升至最大速度。混沌骑士及其幻象会攻击冲过的单位。",
    "damageType": "physical"
  },
  "weaver": {
    "id": "weaver_threads_of_fate",
    "sourceID": 1754,
    "name": "命运之线",
    "key": "",
    "icon": "aura",
    "image": "assets/abilities/weaver_threads_of_fate.png",
    "color": "#b9c19a",
    "kind": "innate",
    "maxLevel": 1,
    "requiredLevels": [
      1,
      3,
      5,
      7
    ],
    "cooldowns": [
      0
    ],
    "manaCosts": [
      0
    ],
    "castRanges": [
      0
    ],
    "castPoints": [
      0
    ],
    "channelTimes": [
      0
    ],
    "durations": [
      0
    ],
    "damages": [
      0,
      0,
      0,
      0
    ],
    "values": {
      "thread_setup_distance": [
        700
      ],
      "thread_setup_time": [
        1.25
      ],
      "established_thread_duration": [
        6
      ],
      "established_thread_break_distance": [
        890
      ],
      "damage_per_thread_hero": [
        10
      ],
      "death_linger_duration": [
        5
      ],
      "slow_duration": [
        0.4
      ],
      "slow_percent": [
        100
      ],
      "damage_per_thread_creep": [
        0
      ]
    },
    "scaling": {
      "established_thread_break_distance": 10
    },
    "description": "每当编织者的攻击或技能对敌方英雄造成伤害后，如果编织者在他们700范围内停留达到1.25秒，他就会织出命运之线，短暂减速敌人并把他们与编织者相连。命运之线持续期间，敌人每6秒会被再次减速。每织出一条命运之线就会使编织者获得攻击力加成。",
    "damageType": "magical",
    "targetFlags": "",
    "notes": [],
    "valuePercentages": {
      "damage_per_thread_hero": true,
      "slow_percent": true
    }
  }
};
export const TALENTS={
  "axe": [
    {
      "id": "special_bonus_unique_axe_culling_blade_speed_duration",
      "sourceID": 1189,
      "index": 0,
      "requiredLevel": 10,
      "name": "+3秒 淘汰之刃斩杀后效果",
      "effects": [
        {
          "abilityId": "axe_culling_blade",
          "field": "speed_duration",
          "value": 3,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_axe_8",
      "sourceID": 9401,
      "index": 1,
      "requiredLevel": 10,
      "name": "每个战斗饥渴+8% 移速",
      "effects": [
        {
          "abilityId": "axe_battle_hunger",
          "field": "speed_bonus",
          "value": 8,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_axe",
      "sourceID": 6102,
      "index": 2,
      "requiredLevel": 15,
      "name": "+8 战斗饥渴每秒伤害",
      "effects": [
        {
          "abilityId": "axe_battle_hunger",
          "field": "damage_per_second",
          "value": 8,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_axe_7",
      "sourceID": 974,
      "index": 3,
      "requiredLevel": 15,
      "name": "+10 狂战士之吼护甲",
      "effects": [
        {
          "abilityId": "axe_berserkers_call",
          "field": "bonus_armor",
          "value": 10,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_strength_15",
      "sourceID": 6145,
      "index": 4,
      "requiredLevel": 20,
      "name": "+15 力量",
      "effects": [
        {
          "stat": "strength",
          "value": 15,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_axe_4",
      "sourceID": 6991,
      "index": 5,
      "requiredLevel": 20,
      "name": "+40 反击螺旋伤害",
      "effects": [
        {
          "abilityId": "axe_counter_helix",
          "field": "damage",
          "value": 40,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_axe_2",
      "sourceID": 6608,
      "index": 6,
      "requiredLevel": 25,
      "name": "+70 狂战士之吼范围",
      "effects": [
        {
          "abilityId": "axe_berserkers_call",
          "field": "radius",
          "value": 70,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_axe_5",
      "sourceID": 562,
      "index": 7,
      "requiredLevel": 25,
      "name": "+150 淘汰之刃伤害",
      "effects": [
        {
          "abilityId": "axe_culling_blade",
          "field": "damage",
          "value": 150,
          "operation": 0
        }
      ]
    }
  ],
  "crystal_maiden": [
    {
      "id": "special_bonus_hp_200",
      "sourceID": 5959,
      "index": 0,
      "requiredLevel": 10,
      "name": "+200 生命",
      "effects": [
        {
          "stat": "maxHp",
          "value": 200,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_intelligence_12",
      "sourceID": 5926,
      "index": 1,
      "requiredLevel": 10,
      "name": "+12 智力",
      "effects": [
        {
          "stat": "intelligence",
          "value": 12,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_crystal_maiden_frostbite_castrange",
      "sourceID": 956,
      "index": 2,
      "requiredLevel": 15,
      "name": "+100 冰封禁制施法距离",
      "effects": [
        {
          "abilityId": "crystal_maiden_frostbite",
          "field": "AbilityCastRange",
          "value": 100,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_crystal_maiden_5",
      "sourceID": 7654,
      "index": 3,
      "requiredLevel": 15,
      "name": "-4.5秒 冰霜新星冷却",
      "effects": [
        {
          "abilityId": "crystal_maiden_crystal_nova",
          "field": "AbilityCooldown",
          "value": 4.5,
          "operation": 2
        }
      ]
    },
    {
      "id": "special_bonus_unique_crystal_maiden_glacial_guard_mana_multiplier",
      "sourceID": 1786,
      "index": 4,
      "requiredLevel": 20,
      "name": "+20% 冰川护体魔法转为护盾",
      "effects": [
        {
          "abilityId": "crystal_maiden_glacial_guard",
          "field": "mana_multiplier",
          "value": 20,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_crystal_maiden_3",
      "sourceID": 6520,
      "index": 5,
      "requiredLevel": 20,
      "name": "+45 极寒领域伤害",
      "effects": [
        {
          "abilityId": "crystal_maiden_freezing_field",
          "field": "damage",
          "value": 45,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_crystal_maiden_1",
      "sourceID": 6072,
      "index": 6,
      "requiredLevel": 25,
      "name": "+1秒 冰封禁制持续时间",
      "effects": [
        {
          "abilityId": "crystal_maiden_frostbite",
          "field": "duration",
          "value": 1,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_crystal_maiden_2",
      "sourceID": 6234,
      "index": 7,
      "requiredLevel": 25,
      "name": "+300 冰霜新星伤害",
      "effects": [
        {
          "abilityId": "crystal_maiden_crystal_nova",
          "field": "nova_damage",
          "value": 300,
          "operation": 0
        }
      ]
    }
  ],
  "juggernaut": [
    {
      "id": "special_bonus_unique_juggernaut_5",
      "sourceID": 628,
      "index": 0,
      "requiredLevel": 10,
      "name": "-12秒 治疗守卫冷却",
      "effects": [
        {
          "abilityId": "juggernaut_healing_ward",
          "field": "AbilityCooldown",
          "value": 12,
          "operation": 2
        }
      ]
    },
    {
      "id": "special_bonus_unique_juggernaut_3",
      "sourceID": 7021,
      "index": 1,
      "requiredLevel": 10,
      "name": "-1秒 剑心效果获得间隔",
      "effects": [
        {
          "abilityId": "juggernaut_bladeform",
          "field": "stack_gain_time",
          "value": 1,
          "operation": 2
        }
      ]
    },
    {
      "id": "special_bonus_unique_juggernaut_omnislash_cooldown",
      "sourceID": 1787,
      "index": 2,
      "requiredLevel": 15,
      "name": "-15秒 无敌斩冷却",
      "effects": [
        {
          "abilityId": "juggernaut_omni_slash",
          "field": "AbilityCooldown",
          "value": 15,
          "operation": 2
        }
      ]
    },
    {
      "id": "special_bonus_unique_juggernaut_blade_fury_movespeed",
      "sourceID": 1192,
      "index": 3,
      "requiredLevel": 15,
      "name": "剑刃风暴期间+45 移动速度",
      "effects": [
        {
          "abilityId": "juggernaut_blade_fury",
          "field": "bonus_movespeed",
          "value": 45,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_juggernaut_4",
      "sourceID": 7394,
      "index": 4,
      "requiredLevel": 20,
      "name": "+15% 剑舞致命一击伤害",
      "effects": [
        {
          "abilityId": "juggernaut_blade_dance",
          "field": "blade_dance_crit_mult",
          "value": 15,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_juggernaut_blade_fury_cooldown",
      "sourceID": 1150,
      "index": 5,
      "requiredLevel": 20,
      "name": "-3秒 剑刃风暴冷却",
      "effects": [
        {
          "abilityId": "juggernaut_blade_fury",
          "field": "AbilityCooldown",
          "value": 3,
          "operation": 2
        }
      ]
    },
    {
      "id": "special_bonus_unique_juggernaut_omnislash_duration",
      "sourceID": 1013,
      "index": 6,
      "requiredLevel": 25,
      "name": "+1秒 无敌斩持续时间",
      "effects": [
        {
          "abilityId": "juggernaut_omni_slash",
          "field": "duration",
          "value": 1,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_juggernaut_blade_dance_lifesteal",
      "sourceID": 915,
      "index": 7,
      "requiredLevel": 25,
      "name": "+40% 剑舞吸血",
      "effects": [
        {
          "abilityId": "juggernaut_blade_dance",
          "field": "blade_dance_lifesteal",
          "value": 40,
          "operation": 0
        }
      ]
    }
  ],
  "windranger": [
    {
      "id": "special_bonus_unique_windranger_powershot_slow",
      "sourceID": 1195,
      "index": 0,
      "requiredLevel": 10,
      "name": "+1秒 强力击减速",
      "effects": [
        {
          "abilityId": "windrunner_powershot",
          "field": "slow_duration",
          "value": 1,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_windranger_4",
      "sourceID": 6992,
      "index": 1,
      "requiredLevel": 10,
      "name": "+0.75秒 风行持续时间",
      "effects": [
        {
          "abilityId": "windrunner_windrun",
          "field": "AbilityDuration",
          "value": 0.75,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_windranger_5",
      "sourceID": 6993,
      "index": 2,
      "requiredLevel": 15,
      "name": "+40 一路顺风最高移速",
      "effects": [
        {
          "abilityId": "windrunner_tailwind",
          "field": "max_movespeed",
          "value": 40,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_windranger_3",
      "sourceID": 6562,
      "index": 3,
      "requiredLevel": 15,
      "name": "-15% 强力击减少效果",
      "effects": [
        {
          "abilityId": "windrunner_powershot",
          "field": "damage_reduction",
          "value": 15,
          "operation": 2
        }
      ]
    },
    {
      "id": "special_bonus_unique_windranger_6",
      "sourceID": 7062,
      "index": 4,
      "requiredLevel": 20,
      "name": "+0.75秒 束缚击眩晕",
      "effects": [
        {
          "abilityId": "windrunner_shackleshot",
          "field": "stun_duration",
          "value": 0.75,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_windranger_8",
      "sourceID": 7889,
      "index": 5,
      "requiredLevel": 20,
      "name": "-8% 集中火力降低攻击力",
      "effects": [
        {
          "abilityId": "windrunner_focusfire",
          "field": "focusfire_damage_reduction",
          "value": 8,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_windranger_7",
      "sourceID": 7888,
      "index": 6,
      "requiredLevel": 25,
      "name": "强力击斩杀16%血量下敌方英雄",
      "effects": [
        {
          "abilityId": "windrunner_powershot",
          "field": "min_execute_threshold",
          "value": 10,
          "operation": 0
        },
        {
          "abilityId": "windrunner_powershot",
          "field": "max_execute_threshold",
          "value": 16,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_windranger_2",
      "sourceID": 6413,
      "index": 7,
      "requiredLevel": 25,
      "name": "集中火力击杀后减16秒冷却",
      "effects": [
        {
          "abilityId": "windrunner_focusfire",
          "field": "cooldown_reduction_per_kill",
          "value": 16,
          "operation": 0
        }
      ]
    }
  ],
  "kunkka": [
    {
      "id": "special_bonus_unique_kunkka_rum_duration",
      "sourceID": 1792,
      "index": 0,
      "requiredLevel": 10,
      "name": "+1秒 统帅朗姆酒持续时间",
      "effects": [
        {
          "abilityId": "kunkka_admirals_rum",
          "field": "buff_duration",
          "value": 1,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_kunkka_tidebringer_slow",
      "sourceID": 1015,
      "index": 1,
      "requiredLevel": 10,
      "name": "潮汐使者施加1秒60%减速",
      "effects": [
        {
          "abilityId": "kunkka_tidebringer",
          "field": "movespeed_slow",
          "value": 60,
          "operation": 2
        },
        {
          "abilityId": "kunkka_tidebringer",
          "field": "movespeed_slow_duration",
          "value": 1,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_kunkka_7",
      "sourceID": 766,
      "index": 2,
      "requiredLevel": 15,
      "name": "+25% 洪流伤害/升空时间",
      "effects": [
        {
          "abilityId": "kunkka_torrent",
          "field": "stun_duration",
          "value": 25,
          "operation": 3
        },
        {
          "abilityId": "kunkka_torrent",
          "field": "torrent_damage",
          "value": 25,
          "operation": 3
        }
      ]
    },
    {
      "id": "special_bonus_unique_kunkka_2",
      "sourceID": 6385,
      "index": 3,
      "requiredLevel": 15,
      "name": "+80 潮汐使者攻击力",
      "effects": [
        {
          "abilityId": "kunkka_tidebringer",
          "field": "damage_bonus",
          "value": 80,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_kunkka_torrent_cooldown",
      "sourceID": 1175,
      "index": 4,
      "requiredLevel": 20,
      "name": "-4秒 洪流冷却",
      "effects": [
        {
          "abilityId": "kunkka_torrent",
          "field": "AbilityCooldown",
          "value": 4,
          "operation": 2
        }
      ]
    },
    {
      "id": "special_bonus_unique_kunkka_4",
      "sourceID": 6667,
      "index": 5,
      "requiredLevel": 20,
      "name": "+80% 潮汐使者分裂伤害",
      "effects": [
        {
          "abilityId": "kunkka_tidebringer",
          "field": "cleave_damage",
          "value": 80,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_spell_aoe_75",
      "sourceID": 1445,
      "index": 6,
      "requiredLevel": 25,
      "name": "+75 技能作用范围",
      "effects": [
        {
          "stat": "spellAoE",
          "value": 75,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_kunkka_tidebringer_armor_pierce",
      "sourceID": 1793,
      "index": 7,
      "requiredLevel": 25,
      "name": "潮汐使者无视25%护甲",
      "effects": [
        {
          "abilityId": "kunkka_tidebringer",
          "field": "pierces_armor",
          "value": 25,
          "operation": 0
        }
      ]
    }
  ],
  "ogre_magi": [
    {
      "id": "special_bonus_unique_ogre_magi_4",
      "sourceID": 403,
      "index": 0,
      "requiredLevel": 10,
      "name": "+10 引燃燃烧伤害",
      "effects": [
        {
          "abilityId": "ogre_magi_ignite",
          "field": "burn_damage",
          "value": 10,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_ogre_magi_dumb_luck_mana",
      "sourceID": 1181,
      "index": 1,
      "requiredLevel": 10,
      "name": "+3/0.01 傻福力量提供魔法/魔法恢复",
      "effects": [
        {
          "abilityId": "ogre_magi_dumb_luck",
          "field": "mana_per_str",
          "value": 3,
          "operation": 0
        },
        {
          "abilityId": "ogre_magi_dumb_luck",
          "field": "mana_regen_per_str",
          "value": 0.01,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_attack_damage_80",
      "sourceID": 442,
      "index": 2,
      "requiredLevel": 15,
      "name": "+80 攻击力",
      "effects": [
        {
          "stat": "damage",
          "value": 80,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_ogre_magi",
      "sourceID": 6183,
      "index": 3,
      "requiredLevel": 15,
      "name": "+20/35 嗜血术/自身攻速",
      "effects": [
        {
          "abilityId": "ogre_magi_bloodlust",
          "field": "bonus_attack_speed",
          "value": 20,
          "operation": 0
        },
        {
          "abilityId": "ogre_magi_bloodlust",
          "field": "self_bonus",
          "value": 35,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_strength_25",
      "sourceID": 5984,
      "index": 4,
      "requiredLevel": 20,
      "name": "+25 力量",
      "effects": [
        {
          "stat": "strength",
          "value": 25,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_ogre_magi_2",
      "sourceID": 6707,
      "index": 5,
      "requiredLevel": 20,
      "name": "+125 火焰爆轰伤害",
      "effects": [
        {
          "abilityId": "ogre_magi_fireblast",
          "field": "fireblast_damage",
          "value": 125,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_ogre_magi_3",
      "sourceID": 7030,
      "index": 6,
      "requiredLevel": 25,
      "name": "攻击有17%几率触发火焰爆轰",
      "effects": [
        {
          "abilityId": "ogre_magi_fireblast",
          "field": "fireblast_proc",
          "value": 17,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_ogre_magi_multicast_chance",
      "sourceID": 1829,
      "index": 7,
      "requiredLevel": 25,
      "name": "+10% 多重施法几率",
      "effects": [
        {
          "abilityId": "ogre_magi_multicast",
          "field": "multicast_2_times",
          "value": 10,
          "operation": 0
        },
        {
          "abilityId": "ogre_magi_multicast",
          "field": "multicast_3_times",
          "value": 10,
          "operation": 0
        },
        {
          "abilityId": "ogre_magi_multicast",
          "field": "multicast_4_times",
          "value": 10,
          "operation": 0
        }
      ]
    }
  ],
  "drow_ranger": [
    {
      "id": "special_bonus_unique_drow_ranger_7",
      "sourceID": 580,
      "index": 0,
      "requiredLevel": 10,
      "name": "-18% 霜冻之箭魔法消耗",
      "effects": [
        {
          "abilityId": "drow_ranger_frost_arrows",
          "field": "AbilityManaCost",
          "value": 18,
          "operation": 4
        }
      ]
    },
    {
      "id": "special_bonus_unique_drow_ranger_2",
      "sourceID": 6209,
      "index": 1,
      "requiredLevel": 10,
      "name": "+1 数箭齐发每波箭矢",
      "effects": [
        {
          "abilityId": "drow_ranger_multishot",
          "field": "arrow_count_per_wave",
          "value": 1,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_attack_range_75",
      "sourceID": 6027,
      "index": 2,
      "requiredLevel": 15,
      "name": "+75 攻击距离",
      "effects": [
        {
          "stat": "attackRange",
          "value": 75,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_drow_ranger_6",
      "sourceID": 486,
      "index": 3,
      "requiredLevel": 15,
      "name": "-6秒 数箭齐发冷却",
      "effects": [
        {
          "abilityId": "drow_ranger_multishot",
          "field": "AbilityCooldown",
          "value": 6,
          "operation": 2
        }
      ]
    },
    {
      "id": "special_bonus_unique_drow_ranger_gust_selfmovespeed",
      "sourceID": 1088,
      "index": 4,
      "requiredLevel": 20,
      "name": "50% 狂风自身移速加成",
      "effects": [
        {
          "abilityId": "drow_ranger_wave_of_silence",
          "field": "bonus_movespeed",
          "value": 50,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_drow_ranger_1",
      "sourceID": 6202,
      "index": 5,
      "requiredLevel": 20,
      "name": "+25% 数箭齐发伤害",
      "effects": [
        {
          "abilityId": "drow_ranger_multishot",
          "field": "arrow_damage_pct",
          "value": 25,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_drow_ranger_3",
      "sourceID": 6280,
      "index": 6,
      "requiredLevel": 25,
      "name": "+8% 射手天赋几率",
      "effects": [
        {
          "abilityId": "drow_ranger_marksmanship",
          "field": "chance",
          "value": 8,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_drow_ranger_8",
      "sourceID": 739,
      "index": 7,
      "requiredLevel": 25,
      "name": "+2 数箭齐发波数",
      "effects": [
        {
          "abilityId": "drow_ranger_multishot",
          "field": "wave_count",
          "value": 2,
          "operation": 0
        }
      ]
    }
  ],
  "chen": [
    {
      "id": "special_bonus_unique_chen_11",
      "sourceID": 841,
      "index": 0,
      "requiredLevel": 10,
      "name": "+75 赎罪伤害",
      "effects": [
        {
          "abilityId": "chen_penitence",
          "field": "damage",
          "value": 75,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_chen_zealot",
      "sourceID": 1818,
      "index": 1,
      "requiredLevel": 10,
      "name": "祝圣狂热者获得+25%生命/攻击力",
      "effects": [
        {
          "abilityId": "chen_zealot",
          "field": "damage",
          "value": 25,
          "operation": 3
        },
        {
          "abilityId": "chen_zealot",
          "field": "bonus_hp",
          "value": 25,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_chen_5",
      "sourceID": 7869,
      "index": 2,
      "requiredLevel": 15,
      "name": "+12% 狂热者控制单位攻击力/技能增强",
      "effects": [
        {
          "abilityId": "chen_zealot",
          "field": "damage_bonus",
          "value": 12,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_chen_8",
      "sourceID": 529,
      "index": 3,
      "requiredLevel": 15,
      "name": "+15% 赎罪减速",
      "effects": [
        {
          "abilityId": "chen_penitence",
          "field": "bonus_movement_speed",
          "value": 15,
          "operation": 2
        }
      ]
    },
    {
      "id": "special_bonus_unique_chen_divine_favor_healing",
      "sourceID": 1653,
      "index": 4,
      "requiredLevel": 20,
      "name": "+15% 神力恩泽治疗增强",
      "effects": [
        {
          "abilityId": "chen_divine_favor",
          "field": "heal_amp",
          "value": 15,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_chen_4",
      "sourceID": 6535,
      "index": 5,
      "requiredLevel": 20,
      "name": "+1300 狂热者控制单位最低生命",
      "effects": [
        {
          "abilityId": "chen_zealot",
          "field": "health_min",
          "value": 1300,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_chen_12",
      "sourceID": 952,
      "index": 6,
      "requiredLevel": 25,
      "name": "上帝之手施加强驱散",
      "effects": [
        {
          "abilityId": "chen_hand_of_god",
          "field": "does_purge",
          "value": 1,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_chen_2",
      "sourceID": 6260,
      "index": 7,
      "requiredLevel": 25,
      "name": "上帝之手治愈陈和他的单位",
      "effects": [
        {
          "abilityId": "chen_hand_of_god",
          "field": "full_heal_on_chen_and_creeps",
          "value": 1,
          "operation": 5
        }
      ]
    }
  ],
  "chaos_knight": [
    {
      "id": "special_bonus_unique_chaos_knight_6",
      "sourceID": 871,
      "index": 0,
      "requiredLevel": 10,
      "name": "+30% 混沌一击吸血",
      "effects": [
        {
          "abilityId": "chaos_knight_chaos_strike",
          "field": "lifesteal",
          "value": 30,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_chaos_knight_2",
      "sourceID": 6618,
      "index": 1,
      "requiredLevel": 10,
      "name": "+225 实相裂隙牵引距离",
      "effects": [
        {
          "abilityId": "chaos_knight_reality_rift",
          "field": "pull_distance",
          "value": 225,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_chaos_knight_8",
      "sourceID": 872,
      "index": 2,
      "requiredLevel": 15,
      "name": "-3秒 混乱之箭冷却",
      "effects": [
        {
          "abilityId": "chaos_knight_chaos_bolt",
          "field": "AbilityCooldown",
          "value": 3,
          "operation": 2
        }
      ]
    },
    {
      "id": "special_bonus_strength_10",
      "sourceID": 6137,
      "index": 3,
      "requiredLevel": 15,
      "name": "+10 力量",
      "effects": [
        {
          "stat": "strength",
          "value": 10,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_chaos_knight_3",
      "sourceID": 6619,
      "index": 4,
      "requiredLevel": 20,
      "name": "+0.6秒 混乱之箭最短/最长眩晕",
      "effects": [
        {
          "abilityId": "chaos_knight_chaos_bolt",
          "field": "stun_min",
          "value": 0.6,
          "operation": 0
        },
        {
          "abilityId": "chaos_knight_chaos_bolt",
          "field": "stun_max",
          "value": 0.6,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_chaos_knight",
      "sourceID": 6133,
      "index": 5,
      "requiredLevel": 20,
      "name": "实相裂隙无视减益免疫",
      "effects": [
        {
          "abilityId": "chaos_knight_reality_rift",
          "field": "pierces_immunity",
          "value": 1,
          "operation": 5
        }
      ]
    },
    {
      "id": "special_bonus_unique_chaos_knight_5",
      "sourceID": 510,
      "index": 6,
      "requiredLevel": 25,
      "name": "+10% 混沌一击几率",
      "effects": [
        {
          "abilityId": "chaos_knight_chaos_strike",
          "field": "chance",
          "value": 10,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_chaos_knight_7",
      "sourceID": 870,
      "index": 7,
      "requiredLevel": 25,
      "name": "-125% 混沌之军幻象承受伤害",
      "effects": [
        {
          "abilityId": "chaos_knight_phantasm",
          "field": "incoming_damage",
          "value": 125,
          "operation": 2
        },
        {
          "abilityId": "chaos_knight_phantasm",
          "field": "incoming_damage_tooltip",
          "value": 125,
          "operation": 2
        }
      ]
    }
  ],
  "weaver": [
    {
      "id": "special_bonus_unique_weaver_shukuchi_movespeed",
      "sourceID": 1817,
      "index": 0,
      "requiredLevel": 10,
      "name": "+50 缩地移动速度",
      "effects": [
        {
          "abilityId": "weaver_shukuchi",
          "field": "min_movespeed_override",
          "value": 50,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_weaver_threads_of_fate_damage",
      "sourceID": 1929,
      "index": 1,
      "requiredLevel": 10,
      "name": "+5% 命运之线每根伤害",
      "effects": [
        {
          "abilityId": "weaver_threads_of_fate",
          "field": "damage_per_thread_hero",
          "value": 5,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_weaver_1",
      "sourceID": 6200,
      "index": 2,
      "requiredLevel": 15,
      "name": "+90 缩地伤害",
      "effects": [
        {
          "abilityId": "weaver_shukuchi",
          "field": "damage",
          "value": 90,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_weaver_4",
      "sourceID": 6989,
      "index": 3,
      "requiredLevel": 15,
      "name": "+1 虫群生命格数",
      "effects": [
        {
          "abilityId": "weaver_the_swarm",
          "field": "destroy_attacks",
          "value": 1,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_weaver_2",
      "sourceID": 6131,
      "index": 4,
      "requiredLevel": 20,
      "name": "+60 连击额外伤害",
      "effects": [
        {
          "abilityId": "weaver_geminate_attack",
          "field": "bonus_damage",
          "value": 60,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_weaver_3",
      "sourceID": 6988,
      "index": 5,
      "requiredLevel": 20,
      "name": "+0.5 虫群削弱护甲",
      "effects": [
        {
          "abilityId": "weaver_the_swarm",
          "field": "armor_reduction",
          "value": 0.5,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_weaver_6",
      "sourceID": 796,
      "index": 6,
      "requiredLevel": 25,
      "name": "-3秒 缩地冷却",
      "effects": [
        {
          "abilityId": "weaver_shukuchi",
          "field": "AbilityCooldown",
          "value": 3,
          "operation": 2
        }
      ]
    },
    {
      "id": "special_bonus_unique_weaver_5",
      "sourceID": 6990,
      "index": 7,
      "requiredLevel": 25,
      "name": "+1 连击",
      "effects": [
        {
          "abilityId": "weaver_geminate_attack",
          "field": "extra_attack",
          "value": 1,
          "operation": 0
        }
      ]
    }
  ]
};
