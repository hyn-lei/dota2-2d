// Generated from Valve 7.41f datafeed + shipped hero KV. See docs/research/abilities-sources.md.
export const ABILITIES={
  "axe": [
    {
      "id": "axe_berserkers_call",
      "sourceID": 5007,
      "name": "狂战士之吼",
      "key": "Q",
      "icon": "roar",
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
          18,
          22,
          26,
          30
        ],
        "damage_per_second": [
          12,
          16,
          20,
          24
        ],
        "speed_bonus": [],
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
        "helix_lifesteal": [],
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
          20,
          25,
          30
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
      "color": "#8ebcca",
      "kind": "active",
      "maxLevel": 3,
      "requiredLevels": [
        6,
        12,
        18
      ],
      "cooldowns": [
        100,
        95,
        90
      ],
      "manaCosts": [
        200,
        400,
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
          110,
          180,
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
          200,
          400,
          600
        ],
        "AbilityCooldown": [
          100,
          95,
          90
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
        "bonus_movespeed": [],
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
        ]
      },
      "scaling": {},
      "description": "舞起具有破坏性力量的剑刃风暴，使主宰获得减益免疫状态，魔法抗性提升80%，并且每0.2秒对主宰周围的敌方单位造成伤害。旋转结束时施加强驱散效果。",
      "damageType": "magical"
    },
    {
      "id": "juggernaut_healing_ward",
      "sourceID": 5029,
      "name": "治疗守卫",
      "key": "W",
      "icon": "heal",
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
        "blade_dance_lifesteal": []
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
        ]
      },
      "scaling": {},
      "description": "主宰挥剑跃向敌方目标单位，随后再以更短的攻击频率斩击该单位和附近的其它敌方单位。主宰在无敌斩期间无敌。\n\n驱散类型：弱驱散",
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
        "min_execute_threshold": [],
        "max_execute_threshold": [],
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
          -25
        ],
        "focusfire_fire_on_the_move": [
          1
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
      "description": "风行者受风的引领，攻击敌方单位或建筑的攻击速度增加350/425/500，但是攻击力降低。不过次级物品效果的额外伤害不会降低。",
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
        "movespeed_slow": [],
        "movespeed_slow_duration": [],
        "pierces_armor": [],
        "AbilityCastRange": [
          150
        ],
        "AbilityCharges": [],
        "AbilityChargeRestoreTime": [],
        "AbilityCooldown": [
          13,
          10,
          7,
          4
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
        550,
        700,
        850,
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
          550,
          700,
          850,
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
        475,
        600
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
          475,
          600
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
        70,
        85,
        100,
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
          70,
          130,
          190,
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
          70,
          85,
          100,
          115
        ],
        "AbilityCooldown": [
          11,
          10,
          9,
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
          5,
          6,
          7,
          8
        ],
        "burn_damage": [
          20,
          30,
          40,
          50
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
  ]
};
export const INNATES={
  "axe": {
    "id": "axe_one_man_army",
    "sourceID": 1166,
    "name": "一人之军",
    "key": "",
    "icon": "aura",
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
      "name": "+85 狂战士之吼范围",
      "effects": [
        {
          "abilityId": "axe_berserkers_call",
          "field": "radius",
          "value": 85,
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
      "name": "+50 极寒领域伤害",
      "effects": [
        {
          "abilityId": "crystal_maiden_freezing_field",
          "field": "damage",
          "value": 50,
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
      "id": "special_bonus_unique_juggernaut",
      "sourceID": 6105,
      "index": 5,
      "requiredLevel": 20,
      "name": "+120 剑刃风暴每秒伤害",
      "effects": [
        {
          "abilityId": "juggernaut_blade_fury",
          "field": "blade_fury_damage",
          "value": 120,
          "operation": 0
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
      "name": "-10% 集中火力降低攻击力",
      "effects": [
        {
          "abilityId": "windrunner_focusfire",
          "field": "focusfire_damage_reduction",
          "value": 10,
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
      "name": "+75 潮汐使者攻击力",
      "effects": [
        {
          "abilityId": "kunkka_tidebringer",
          "field": "damage_bonus",
          "value": 75,
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
      "id": "special_bonus_spell_aoe_100",
      "sourceID": 1446,
      "index": 6,
      "requiredLevel": 25,
      "name": "+100 技能作用范围",
      "effects": [
        {
          "stat": "spellAoE",
          "value": 100,
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
      "name": "+2/0.01 傻福力量提供魔法/魔法恢复",
      "effects": [
        {
          "abilityId": "ogre_magi_dumb_luck",
          "field": "mana_per_str",
          "value": 2,
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
      "id": "special_bonus_strength_30",
      "sourceID": 6708,
      "index": 4,
      "requiredLevel": 20,
      "name": "+30 力量",
      "effects": [
        {
          "stat": "strength",
          "value": 30,
          "operation": 0
        }
      ]
    },
    {
      "id": "special_bonus_unique_ogre_magi_2",
      "sourceID": 6707,
      "index": 5,
      "requiredLevel": 20,
      "name": "+175 火焰爆轰伤害",
      "effects": [
        {
          "abilityId": "ogre_magi_fireblast",
          "field": "fireblast_damage",
          "value": 175,
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
  ]
};
