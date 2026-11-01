// Generated from Valve 7.41f feed and shipped hero KV; see docs/hero-upgrades-sources.md.
export const UPGRADE_EFFECTS={
  "axe": {
    "axe_berserkers_call": {
      "scepter": [],
      "shard": [
        {
          "field": "applies_battle_hunger",
          "operation": "add",
          "values": [
            1
          ]
        }
      ],
      "scepterDescription": "",
      "shardDescription": "狂战士之吼会对作用下单位施加战斗饥渴。"
    },
    "axe_battle_hunger": {
      "scepter": [],
      "shard": [
        {
          "field": "should_stack",
          "operation": "set",
          "values": [
            1
          ]
        }
      ],
      "scepterDescription": "",
      "shardDescription": "多个战斗饥渴效果可以叠加在单个目标身上。"
    },
    "axe_counter_helix": {
      "scepter": [
        {
          "field": "AbilityCooldown",
          "operation": "add",
          "values": [
            -0.3
          ]
        },
        {
          "field": "debuff_duration",
          "operation": "add",
          "values": [
            6
          ]
        },
        {
          "field": "damage_reduction",
          "operation": "add",
          "values": [
            12
          ]
        },
        {
          "field": "max_stacks",
          "operation": "add",
          "values": [
            5
          ]
        },
        {
          "field": "attacks_increase_counter",
          "operation": "set",
          "values": [
            1
          ]
        }
      ],
      "shard": [],
      "scepterDescription": "反击螺旋现在对击中的敌人施加一个可叠加的负面效果，使其对斧王造成的攻击伤害减少。反击螺旋不再具有冷却时间，并且斧王的攻击也会计入触发记数。",
      "shardDescription": ""
    }
  },
  "crystal_maiden": {
    "crystal_maiden_freezing_field": {
      "scepter": [
        {
          "field": "frostbite_delay",
          "operation": "add",
          "values": [
            3
          ]
        },
        {
          "field": "shard_bonus_explosion",
          "operation": "add",
          "values": [
            20
          ]
        },
        {
          "field": "shard_self_movement_speed_slow_pct",
          "operation": "add",
          "values": [
            -75
          ]
        },
        {
          "field": "can_move",
          "operation": "add",
          "values": [
            1
          ]
        }
      ],
      "shard": [],
      "scepterDescription": "使自身在极寒领域期间可以移动、施法和攻击。仍然可以被敌人打断。在此期间移动速度降低%shard_self_movement_speed_slow_pct%%%。冰爆总数提升%shard_bonus_explosion%%%。对极寒领域内停留超过%frostbite_delay%秒的所有单位都会施加冰封禁制。",
      "shardDescription": ""
    }
  },
  "juggernaut": {
    "juggernaut_healing_ward": {
      "scepter": [],
      "shard": [
        {
          "field": "healing_ward_heal_amount",
          "operation": "add",
          "values": [
            1.5
          ]
        },
        {
          "field": "healing_ward_bonus_health",
          "operation": "add",
          "values": [
            1
          ]
        },
        {
          "field": "healing_ward_hits_to_kill_tooltip",
          "operation": "add",
          "values": [
            1
          ]
        }
      ],
      "scepterDescription": "",
      "shardDescription": "提升守卫的治疗量和生命值。"
    }
  },
  "windranger": {
    "windrunner_tailwind": {
      "scepter": [
        {
          "field": "duration",
          "operation": "add",
          "values": [
            1
          ]
        },
        {
          "field": "applies_on_attack",
          "operation": "add",
          "values": [
            1
          ]
        },
        {
          "field": "undispellable",
          "operation": "add",
          "values": [
            1
          ]
        }
      ],
      "shard": [],
      "scepterDescription": "攻击也会提供顺风效果。顺风的持续时间更长，并且不可驱散。",
      "shardDescription": ""
    }
  },
  "kunkka": {
    "kunkka_ghostship": {
      "scepter": [
        {
          "field": "fleet_interval",
          "operation": "set",
          "values": [
            2.5
          ]
        },
        {
          "field": "fleet_count",
          "operation": "set",
          "values": [
            2
          ]
        },
        {
          "field": "fire_cannons",
          "operation": "set",
          "values": [
            1
          ]
        },
        {
          "field": "cannon_ball_damage_pct",
          "operation": "set",
          "values": [
            40
          ]
        },
        {
          "field": "cannon_ball_distance",
          "operation": "set",
          "values": [
            1200
          ]
        },
        {
          "field": "cannon_ball_speed",
          "operation": "set",
          "values": [
            1400
          ]
        },
        {
          "field": "cannon_count",
          "operation": "set",
          "values": [
            4
          ]
        },
        {
          "field": "cannon_ball_radius",
          "operation": "set",
          "values": [
            100
          ]
        },
        {
          "field": "cannon_fire_interval",
          "operation": "set",
          "values": [
            0.78
          ]
        }
      ],
      "shard": [],
      "scepterDescription": "幽灵船在目标地点以%fleet_interval%秒的间隔产生%fleet_count%艘船组成的舰队。每艘船现在还会从左舷和右舷发射%num_cannon_volleys%波炮弹，穿过敌人时造成%cannon_ball_damage_pct%%%幽灵船伤害。",
      "shardDescription": ""
    }
  },
  "ogre_magi": {
    "ogre_magi_fireblast": {
      "scepter": [
        {
          "field": "AbilityCooldown",
          "operation": "add",
          "values": [
            -1
          ]
        },
        {
          "field": "bonus_cast_speed",
          "operation": "add",
          "values": [
            25
          ]
        }
      ],
      "shard": [],
      "scepterDescription": "很精通的火焰爆轰，冷却时间减少%bonus_AbilityCooldown%秒，施法速度提升%bonus_cast_speed%%%。",
      "shardDescription": ""
    }
  }
};
export const EXTRA_ABILITIES={
  "axe": [],
  "crystal_maiden": [
    {
      "id": "crystal_maiden_crystal_clone",
      "sourceID": 953,
      "name": "冰晶克隆",
      "key": "D",
      "icon": "crystal",
      "color": "#a6ced4",
      "kind": "active",
      "maxLevel": 1,
      "requiredLevels": [],
      "upgrade": "shard",
      "cooldowns": [
        12
      ],
      "manaCosts": [
        150
      ],
      "castRanges": [
        4294967295
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
        "hop_distance": [
          275
        ],
        "hop_duration": [
          0.3
        ],
        "clone_duration": [
          5
        ],
        "frostbite_radius": [
          450
        ],
        "anim_delay": [
          0.02
        ],
        "clone_health": [
          150
        ],
        "AbilityCastRange": [
          -1
        ],
        "AbilityManaCost": [
          150
        ],
        "AbilityCooldown": [
          12
        ]
      },
      "description": "向一个方向滑行，在原地制造一个自身的冰晶克隆，并且躲避多种飞行过程中的攻击和技能弹道。如果克隆受到了足量伤害，或者超过一定时间都会碎裂，对附近450范围内敌人施加冰封禁制。克隆体也可以被水晶室女自身的技能摧毁。",
      "damageType": "magical"
    }
  ],
  "juggernaut": [
    {
      "id": "juggernaut_swift_slash",
      "sourceID": 419,
      "name": "迅风斩",
      "key": "D",
      "icon": "swords",
      "color": "#a6ced4",
      "kind": "active",
      "maxLevel": 1,
      "requiredLevels": [],
      "upgrade": "scepter",
      "cooldowns": [
        25
      ],
      "manaCosts": [
        150
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
        "duration": [
          1
        ],
        "AbilityCastRange": [
          450
        ],
        "AbilityCastPoint": [
          0.3
        ],
        "AbilityManaCost": [
          150
        ],
        "AbilityCooldown": [
          25
        ]
      },
      "description": "发动一次短时间的无敌斩，持续1秒。",
      "damageType": "physical"
    }
  ],
  "windranger": [
    {
      "id": "windrunner_gale_force",
      "sourceID": 652,
      "name": "狂风之力",
      "key": "D",
      "icon": "wind",
      "color": "#a6ced4",
      "kind": "active",
      "maxLevel": 1,
      "requiredLevels": [],
      "upgrade": "shard",
      "cooldowns": [
        25
      ],
      "manaCosts": [
        125
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
        "duration": [
          3
        ],
        "wind_strength": [
          240
        ],
        "radius": [
          900
        ],
        "AbilityCastRange": [
          1200
        ],
        "AbilityCastPoint": [
          0.2
        ],
        "AbilityManaCost": [
          125
        ],
        "AbilityCooldown": [
          25
        ]
      },
      "description": "以矢量为目标。召唤出一阵强风，将目标区域内所有敌人朝目标方向推去。",
      "damageType": "magical"
    }
  ],
  "kunkka": [
    {
      "id": "kunkka_tidal_wave",
      "sourceID": 605,
      "name": "潮汐波",
      "key": "D",
      "icon": "torrent",
      "color": "#a6ced4",
      "kind": "active",
      "maxLevel": 1,
      "requiredLevels": [],
      "upgrade": "shard",
      "cooldowns": [
        12
      ],
      "manaCosts": [
        75
      ],
      "castRanges": [
        1050
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
        "speed": [
          700
        ],
        "radius": [
          750
        ],
        "damage": [
          180
        ],
        "duration": [
          1
        ],
        "wave_distance_tooltip": [
          1800
        ],
        "knockback_distance": [
          600
        ],
        "AbilityCastRange": [
          1050
        ],
        "AbilityCastPoint": [
          0.2
        ],
        "AbilityManaCost": [
          75
        ],
        "AbilityCooldown": [
          12
        ]
      },
      "description": "释放一道在昆卡身后出现的潮汐波。造成 180 点伤害，并将敌人沿着波浪拖拽 600 距离。敌人被拖拽时无法攻击。",
      "damageType": "magical"
    }
  ],
  "ogre_magi": [
    {
      "id": "ogre_magi_unrefined_fireblast",
      "sourceID": 5466,
      "name": "未精通的火焰爆轰",
      "key": "D",
      "icon": "torrent",
      "color": "#a6ced4",
      "kind": "active",
      "maxLevel": 1,
      "requiredLevels": [],
      "upgrade": "scepter",
      "cooldowns": [
        7
      ],
      "manaCosts": [
        400
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
        "scepter_mana": [
          35
        ],
        "base_damage": [
          150
        ],
        "str_multiplier": [
          1.5
        ],
        "AbilityCastRange": [
          525
        ],
        "AbilityCastPoint": [
          0.45
        ],
        "AbilityManaCost": [
          400
        ],
        "AbilityCooldown": [
          7
        ]
      },
      "description": "操控一波火焰轰击一个敌方单位，造成150 + 1.5倍食人魔力量的伤害并使目标眩晕。魔法消耗为食人魔魔法师当前魔法的35%。",
      "damageType": "magical"
    },
    {
      "id": "ogre_magi_smash",
      "sourceID": 648,
      "name": "烈火护盾",
      "key": "T",
      "icon": "torrent",
      "color": "#a6ced4",
      "kind": "active",
      "maxLevel": 1,
      "requiredLevels": [],
      "upgrade": "shard",
      "cooldowns": [
        15
      ],
      "manaCosts": [
        50
      ],
      "castRanges": [
        600
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
        "damage": [
          160
        ],
        "attacks": [
          3
        ],
        "duration": [
          25
        ],
        "multicast_fireshield_aoe": [
          1000
        ],
        "projectile_speed": [
          1400
        ],
        "damage_absorb_pct": [
          85
        ],
        "AbilityCastRange": [
          600
        ],
        "AbilityCastPoint": [
          0.2
        ],
        "AbilityManaCost": [
          50
        ],
        "AbilityCooldown": [
          15
        ]
      },
      "description": "创造一个围绕友军目标的护盾，吸收接下来3次来自敌方英雄攻击的一定百分比伤害。吸收伤害后向攻击者发射火球。可以对防御塔施放。",
      "damageType": "magical"
    }
  ]
};
