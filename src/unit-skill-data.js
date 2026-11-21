// Generated from Valve client localization; run node scripts/generate-unit-skill-ui.mjs.
export const UNIT_SKILL_UI = {
  "miniboss_unyielding_shield": {
    "name": "刚强巨盾",
    "description": "被动提供持续恢复的全伤害护盾。护甲不会低于0。",
    "notes": [],
    "labels": {},
    "image": "assets/abilities/miniboss_unyielding_shield.png"
  },
  "miniboss_reflect": {
    "name": "反弹",
    "description": "所有的伤害都会反弹，均摊给1200范围内的攻击者以及其他所有英雄",
    "notes": [
      "这个技能造成的伤害被视为反弹伤害。反弹伤害不提供任何吸血，而且无法反弹。"
    ],
    "labels": {},
    "image": "assets/abilities/miniboss_reflect.png"
  },
  "miniboss_radiance": {
    "name": "闪耀",
    "description": "只要受到攻击或伤害就会每秒对%aura_radius%范围内所有单位造成%aura_damage%点伤害，持续%attack_timer_duration%秒。",
    "notes": [],
    "labels": {},
    "image": "assets/abilities/miniboss_radiance.png"
  },
  "miniboss_alleviation": {
    "name": "镇痛",
    "description": "痛苦魔方被消灭后留下一片青翠的山谷，使附近所有人的生命恢复提升，数值为各自最大生命值的%hp_restoration_pct%%%。",
    "notes": [],
    "labels": {},
    "image": "assets/abilities/miniboss_alleviation.png"
  },
  "miniboss_inherent_buffs": {
    "name": "miniboss_inherent_buffs",
    "description": "",
    "notes": [],
    "labels": {},
    "image": null
  },
  "necronomicon_warrior_mana_burn": {
    "name": "魔力损毁",
    "description": "每次攻击燃烧掉目标的魔法值，并造成相当于损毁魔法值一定百分比的伤害",
    "notes": [],
    "labels": {
      "burn_amount": "每次攻击损毁魔法：",
      "burn_damage_conversion": "%转换成伤害："
    },
    "image": "assets/abilities/necronomicon_warrior_mana_burn.png"
  },
  "necronomicon_warrior_last_will": {
    "name": "遗愿",
    "description": "对杀死死灵战士的单位造成伤害。",
    "notes": [],
    "labels": {
      "explosion": "伤害："
    },
    "image": "assets/abilities/necronomicon_warrior_last_will.png"
  },
  "creep_irresolute": {
    "name": "绵力",
    "description": "绵力单位对英雄单位造成的伤害会减少。",
    "notes": [],
    "labels": {
      "hero_damage_penalty": "%对英雄伤害降低："
    },
    "image": "assets/abilities/creep_irresolute.png"
  },
  "necronomicon_archer_purge": {
    "name": "净化",
    "description": "驱散敌人身上的有益状态，并且减缓其移动速度。\\n\\n驱散类型：弱驱散",
    "notes": [
      "减速效果起始时为100%%，然后持续减少至20%%。"
    ],
    "labels": {
      "duration": "持续时间："
    },
    "image": "assets/abilities/necronomicon_archer_purge.png"
  },
  "necronomicon_archer_aoe": {
    "name": "死灵射手光环",
    "description": "提升周围单位的移动速度。",
    "notes": [],
    "labels": {
      "radius": "作用范围：",
      "ms_bonus": "%移动速度加成："
    },
    "image": "assets/abilities/necronomicon_archer_aoe.png"
  },
  "creep_piercing": {
    "name": "穿刺",
    "description": "穿刺单位对非英雄、非坚锐单位造成额外伤害，对英雄和坚锐单位造成的伤害减少。",
    "notes": [],
    "labels": {
      "creep_damage_bonus": "%对非英雄额外伤害：",
      "hero_damage_penalty": "%对英雄伤害降低：",
      "heavy_damage_penalty": "%对坚锐单位伤害降低："
    },
    "image": "assets/abilities/creep_piercing.png"
  },
  "kobold_tunneler_prospecting": {
    "name": "淘金光环",
    "description": "狗头人擅长淘金，提升了周围友方英雄的每分钟金钱。",
    "notes": [],
    "labels": {
      "gpm_aura": "每分钟金钱：",
      "radius": "作用范围："
    },
    "image": "assets/abilities/kobold_tunneler_prospecting.png"
  },
  "neutral_upgrade": {
    "name": "野怪成长",
    "description": "野怪每%increase_time%秒成长一次，最多%max_level%次。金币奖励每%gold_interval%秒交替增加最小值和最大值。",
    "notes": [],
    "labels": {
      "max_level": "最多成长次数",
      "increase_time": "成长间隔 / 秒",
      "increase_damage": "每次攻击力",
      "increase_aspd": "每次攻击速度",
      "increase_health": "每次生命",
      "increase_armor": "每次护甲",
      "increase_gold": "每次成长金币奖励",
      "increase_gold_per_minute": "每分钟交替增加金币上下限",
      "gold_interval": "金币成长间隔 / 秒",
      "increase_xp": "每次经验奖励"
    },
    "image": null
  },
  "kobold_disarm": {
    "name": "偷窃武器",
    "description": "狗头人士兵向前发射一个弹道，对命中的敌人造成少量伤害并施加破坏效果",
    "notes": [],
    "labels": {
      "break_duration": "持续时间：",
      "base_damage": "伤害："
    },
    "image": "assets/abilities/kobold_disarm.png"
  },
  "kobold_taskmaster_speed_aura": {
    "name": "速度光环",
    "description": "狗头人长官残酷地追求效率，提高他和附近所有友军的移动速度。",
    "notes": [],
    "labels": {
      "bonus_movement_speed": "%移动速度提升：",
      "radius": "作用范围："
    },
    "image": "assets/abilities/kobold_taskmaster_speed_aura.png"
  },
  "mudgolem_cloak_aura": {
    "name": "魔抗光环",
    "description": "这个生物的魔抗光环保护它的友军。对非英雄单位的效果更强。",
    "notes": [],
    "labels": {
      "radius": "光环作用范围：",
      "bonus_magical_armor": "%魔法抗性（对英雄）：",
      "bonus_magical_armor_creeps": "%魔法抗性（非英雄）："
    },
    "image": "assets/abilities/mudgolem_cloak_aura.png"
  },
  "centaur_khan_war_stomp": {
    "name": "战争践踏",
    "description": "半人马征服者用强有力的蹄践踏地面，对附近敌人造成伤害并<font color='#2dd5e4'>眩晕</font>。英雄将从<font color='#2dd5e4'>眩晕</font>中更快苏醒。",
    "notes": [],
    "labels": {
      "radius": "作用范围：",
      "non_hero_stun_duration": "<font color='#2dd5e4'>眩晕</font>时间：",
      "hero_stun_duration": "英雄<font color='#2dd5e4'>眩晕</font>时间："
    },
    "image": "assets/abilities/centaur_khan_war_stomp.png"
  },
  "fel_beast_haunt": {
    "name": "烦扰",
    "description": "沉默目标单位",
    "notes": [],
    "labels": {
      "damage_per_second": "每秒伤害：",
      "radius": "作用范围：",
      "duration": "持续时间："
    },
    "image": "assets/abilities/fel_beast_haunt.png"
  },
  "centaur_khan_endurance_aura": {
    "name": "迅猛光环",
    "description": "可怕的地狱熊怪发起攻击更为迅捷，并鼓舞附近友军效仿。",
    "notes": [],
    "labels": {
      "bonus_attack_speed": "攻击速度提升：",
      "radius": "作用范围："
    },
    "image": "assets/abilities/centaur_khan_endurance_aura.png"
  },
  "furbolg_enrage_attack_speed": {
    "name": "临死之痛：神速",
    "description": "地狱熊怪阵亡时，附近所有友军进入狂暴状态，短时间内获得攻击速度。",
    "notes": [],
    "labels": {
      "bonus_aspd": "攻击速度：",
      "radius": "作用范围：",
      "duration": "持续时间："
    },
    "image": "assets/abilities/furbolg_enrage_attack_speed.png"
  },
  "polar_furbolg_ursa_warrior_thunder_clap": {
    "name": "雷霆一击",
    "description": "地狱熊怪粉碎者将它巨大的手掌猛烈拍合，发出震耳欲聋的冲击。冲击伤害附近敌人并掀倒他们。",
    "notes": [],
    "labels": {
      "radius": "作用范围：",
      "movespeed_slow": "%移动速度减缓：",
      "attackspeed_slow": "攻击速度降低：",
      "duration": "持续时间："
    },
    "image": "assets/abilities/polar_furbolg_ursa_warrior_thunder_clap.png"
  },
  "furbolg_enrage_damage": {
    "name": "临死之痛：神力",
    "description": "地狱熊怪阵亡时，附近所有友军进入暴走状态，短时间内获得攻击力。",
    "notes": [],
    "labels": {
      "bonus_dmg_pct": "%基础攻击力加成：",
      "radius": "作用范围：",
      "duration": "持续时间："
    },
    "image": "assets/abilities/furbolg_enrage_damage.png"
  },
  "warpine_raider_seed_shot": {
    "name": "雪球射击",
    "description": "向目标投掷一个雪球。雪球可以多次弹跳至附近的敌人和友军，对敌人造成伤害并使其被减速，同时治疗友军。",
    "notes": [],
    "labels": {
      "damage": "伤害/<font color='#07d738'>治疗</font>：",
      "bounces": "弹跳次数：",
      "bounce_range": "距离：",
      "slow": "%移动速度减缓：",
      "duration": "持续时间："
    },
    "image": "assets/abilities/warpine_raider_seed_shot.png"
  },
  "mud_golem_hurl_big_boulder": {
    "name": "投掷大巨石",
    "description": "向目标位置投掷一块巨石，造成少量伤害并眩晕击中的单位。",
    "notes": [],
    "labels": {
      "base_damage": "伤害：",
      "impact_radius": "作用范围：",
      "stun_duration": "<font color='#2dd5e4'>眩晕</font>时间："
    },
    "image": "assets/abilities/mud_golem_hurl_big_boulder.png"
  },
  "mud_golem_rock_destroy": {
    "name": "碎土傀儡",
    "description": "死亡时泥土傀儡会破碎成数个碎土傀儡。",
    "notes": [],
    "labels": {
      "shard_duration": "碎土傀儡持续时间：",
      "shard_damage": "碎土傀儡攻击力：",
      "shard_health": "碎土傀儡生命值："
    },
    "image": "assets/abilities/mud_golem_rock_destroy.png"
  },
  "mud_golem_hurl_boulder": {
    "name": "投石",
    "description": "向目标扔出一块石头，造成伤害和<font color='#2dd5e4'>眩晕</font>。",
    "notes": [],
    "labels": {
      "damage": "对英雄伤害：",
      "damage_creeps": "对非英雄伤害：",
      "duration": "<font color='#2dd5e4'>眩晕</font>时间："
    },
    "image": "assets/abilities/mud_golem_hurl_boulder.png"
  },
  "ogre_bruiser_ogre_smash": {
    "name": "食人魔重击！",
    "description": "食人魔缓慢蓄力并出击，对他前方所有单位造成%hero_stun_duration%秒<font color='#2dd5e4'>眩晕</font>和%damage% + %damage_pct%%%当前生命的伤害。",
    "notes": [],
    "labels": {
      "radius": "作用范围："
    },
    "image": "assets/abilities/ogre_bruiser_ogre_smash.png"
  },
  "giant_wolf_intimidate": {
    "name": "恫吓",
    "description": "巨狼凶猛的咆哮会降低周围所有敌人的攻击力。",
    "notes": [],
    "labels": {
      "damage_reduction": "%总攻击力降低：",
      "duration": "持续时间：",
      "radius": "作用范围："
    },
    "image": "assets/abilities/giant_wolf_intimidate.png"
  },
  "alpha_wolf_critical_strike": {
    "name": "致命一击",
    "description": "残忍的头狼抓住任何一个破绽攻击敌人的命脉，造成致命伤害。",
    "notes": [],
    "labels": {
      "crit_chance": "%致命一击概率：",
      "crit_mult": "%致命一击伤害："
    },
    "image": "assets/abilities/alpha_wolf_critical_strike.png"
  },
  "alpha_wolf_command_aura": {
    "name": "头狼光环",
    "description": "头狼无情的攻击造成额外伤害。在他的带头指挥下，周围友军的攻击也同样残忍无情。",
    "notes": [],
    "labels": {
      "bonus_damage_pct": "%攻击力加成：",
      "radius": "作用范围："
    },
    "image": "assets/abilities/alpha_wolf_command_aura.png"
  },
  "enraged_wildkin_tornado": {
    "name": "飓风",
    "description": "持续施法 - 枭兽召唤风之灵，创造一股有知觉的飓风供他驱使。飓风对附近的敌人造成减速和伤害。飓风是无敌的，可以随意移动。",
    "notes": [],
    "labels": {
      "duration": "最大持续施法时间：",
      "linger_duration": "持续施法后持续时间：",
      "base_movespeed": "飓风移动速度："
    },
    "image": "assets/abilities/enraged_wildkin_tornado.png"
  },
  "enraged_wildkin_hurricane": {
    "name": "风飑",
    "description": "枭兽撕裂者召唤风之灵，创造出一股强风，将一个单位向枭兽撕裂者选择的方向推去。",
    "notes": [],
    "labels": {
      "distance": "推行距离："
    },
    "image": "assets/abilities/enraged_wildkin_hurricane.png"
  },
  "enraged_wildkin_toughness_aura": {
    "name": "坚韧光环",
    "description": "枭兽撕裂者的狂怒使其对攻击麻木，并鼓舞附近的友军使他们能够承受更多攻击。",
    "notes": [],
    "labels": {
      "bonus_armor": "额外护甲：",
      "radius": "作用范围："
    },
    "image": "assets/abilities/enraged_wildkin_toughness_aura.png"
  },
  "satyr_soulstealer_mana_burn": {
    "name": "法力燃烧",
    "description": "萨特窃神者偷走敌人灵魂的一块碎片，燃烧掉目标的魔法值并造成等量伤害，数值为%burn_amount% + %int_multiplier%倍目标智力值。",
    "notes": [],
    "labels": {},
    "image": "assets/abilities/satyr_soulstealer_mana_burn.png"
  },
  "forest_troll_high_priest_mana_aura": {
    "name": "魔法光环",
    "description": "为周围所有友军提供额外的魔法恢复。",
    "notes": [],
    "labels": {
      "mana_regen": "魔法恢复：",
      "radius": "作用范围："
    },
    "image": "assets/abilities/forest_troll_high_priest_mana_aura.png"
  },
  "satyr_hellcaller_shockwave": {
    "name": "冲击波",
    "description": "萨特苦难使者撕开一条通向地狱的不稳定裂缝，产生一道直线穿过地面的冲击波，对击中的敌人造成伤害。",
    "notes": [],
    "labels": {
      "distance": "冲击距离："
    },
    "image": "assets/abilities/satyr_hellcaller_shockwave.png"
  },
  "satyr_hellcaller_unholy_aura": {
    "name": "邪恶光环",
    "description": "萨特苦难使者的恶魔之力让他散发出回复能量，提高他和附近友军的生命恢复能力。",
    "notes": [],
    "labels": {
      "health_regen": "生命恢复：",
      "radius": "作用范围："
    },
    "image": "assets/abilities/satyr_hellcaller_unholy_aura.png"
  },
  "satyr_trickster_purge": {
    "name": "净化",
    "description": "萨特放逐者通晓所有的诡计，让他能驱散友军身上的负面效果或者敌人身上的增益效果。\\n\\n驱散类型：弱驱散",
    "notes": [],
    "labels": {
      "duration": "持续时间："
    },
    "image": "assets/abilities/satyr_trickster_purge.png"
  },
  "spawnlord_aura": {
    "name": "潜行光环",
    "description": "向周围友军提供吸血和生命恢复。",
    "notes": [
      "The aura is stacking."
    ],
    "labels": {
      "lifesteal": "%吸血：",
      "hp_regen": "生命恢复："
    },
    "image": "assets/abilities/spawnlord_aura.png"
  },
  "spawnlord_master_stomp": {
    "name": "亵渎",
    "description": "重踩大地，对附近单位造成伤害，并且降低其%armor_reduction_pct%%%护甲。",
    "notes": [],
    "labels": {
      "radius": "作用范围：",
      "damage": "伤害：",
      "duration": "持续时间：",
      "armor_reduction_pct": "%基础护甲降低："
    },
    "image": "assets/abilities/spawnlord_master_stomp.png"
  },
  "spawnlord_master_freeze": {
    "name": "停滞",
    "description": "下一次攻击将使敌人停滞，将其缠绕并造成每秒%damage%点伤害。",
    "notes": [],
    "labels": {
      "duration": "停滞持续时间：",
      "damage": "停滞每秒伤害："
    },
    "image": "assets/abilities/spawnlord_master_freeze.png"
  },
  "ancient_rock_golem_weakening_aura": {
    "name": "弱化光环",
    "description": "岩石傀儡的形象富有压迫感，让敌人更难抵挡物理伤害。",
    "notes": [],
    "labels": {
      "armor_reduction": "护甲降低：",
      "radius": "作用范围："
    },
    "image": "assets/abilities/ancient_rock_golem_weakening_aura.png"
  },
  "granite_golem_hp_aura": {
    "name": "磐石光环",
    "description": "提高周围单位的生命值上限。",
    "notes": [],
    "labels": {
      "bonus_hp": "%额外生命值加成：",
      "radius": "作用范围："
    },
    "image": "assets/abilities/granite_golem_hp_aura.png"
  },
  "ice_shaman_incendiary_bomb": {
    "name": "冰火炸弹",
    "description": "寒冰萨满向一个敌方单位或建筑抛出一团蓝色火焰，持续造成伤害。",
    "notes": [],
    "labels": {
      "duration": "持续时间：",
      "burn_damage": "每秒伤害：",
      "building_damage_pct": "%对建筑伤害："
    },
    "image": "assets/abilities/ice_shaman_incendiary_bomb.png"
  },
  "frostbitten_golem_time_warp_aura": {
    "name": "时间扭曲光环",
    "description": "由于来自一个不同的纪元，霜害傀儡天生可以控制时间，使周围所有友军的技能冷却加快。",
    "notes": [],
    "labels": {
      "bonus_cdr": "%冷却时间减少：",
      "radius": "作用范围："
    },
    "image": "assets/abilities/frostbitten_golem_time_warp_aura.png"
  },
  "big_thunder_lizard_slam": {
    "name": "猛击",
    "description": "远古雷肤兽用他巨大的脚掌猛踏地面，产生%pulse_count%次震荡波，范围会逐次减少。每波对敌人造成伤害，并使其失去平衡，降低移动速度和攻击速度。英雄会更快地恢复平衡。",
    "notes": [],
    "labels": {
      "pulse_count": "震荡波数量：",
      "base_radius": "初始范围：",
      "radius_increment_per_pulse": "每波作用范围减少：",
      "movespeed_slow": "%移动速度减缓：",
      "attack_slow_tooltip": "攻击速度降低：",
      "non_hero_duration": "持续时间：",
      "hero_duration": "英雄持续时间："
    },
    "image": "assets/abilities/big_thunder_lizard_slam.png"
  },
  "big_thunder_lizard_frenzy": {
    "name": "暴怒",
    "description": "远古雷肤兽将一名友军变得狂热，提升其攻击速度。",
    "notes": [],
    "labels": {
      "attackspeed_bonus": "攻击速度提升：",
      "duration": "持续时间："
    },
    "image": "assets/abilities/big_thunder_lizard_frenzy.png"
  },
  "big_thunder_lizard_wardrums_aura": {
    "name": "战鼓光环",
    "description": "雷肤兽心跳的节奏提升了周围友军的攻击速度和必中率。",
    "notes": [],
    "labels": {
      "speed_bonus": "攻击速度加成：",
      "accuracy": "%必中提升：",
      "radius": "作用范围："
    },
    "image": "assets/abilities/big_thunder_lizard_wardrums_aura.png"
  },
  "gnoll_assassin_envenomed_weapon": {
    "name": "淬毒武器",
    "description": "豺狼人刺客用它自己调制的痛苦捕食者毒液来浸透它的武器，使敌人的天然恢复能力反过来使他们流失生命。英雄从中毒状态中恢复的更快。",
    "notes": [],
    "labels": {
      "non_hero_duration": "持续时间：",
      "hero_duration": "英雄中毒持续时间：",
      "regen_reduction": "%生命恢复降低："
    },
    "image": "assets/abilities/gnoll_assassin_envenomed_weapon.png"
  },
  "ghost_frost_attack": {
    "name": "寒霜攻击",
    "description": "鬼魂放出的诡异攻击，让敌人感受到刺骨的寒冷。",
    "notes": [],
    "labels": {
      "movespeed_slow": "%移动速度减缓：",
      "attackspeed_slow": "攻击速度降低：",
      "duration": "持续时间："
    },
    "image": "assets/abilities/ghost_frost_attack.png"
  },
  "forest_troll_high_priest_heal": {
    "name": "治疗",
    "description": "丘陵巨魔牧师对目标友军施放神圣祝福，恢复部分生命值。",
    "notes": [],
    "labels": {
      "amp_aura": "治疗增强光环",
      "amp_aura_heal_amp": "%治疗增强：",
      "amp_aura_radius": "作用范围：",
      "health": "回血量："
    },
    "image": "assets/abilities/forest_troll_high_priest_heal.png"
  },
  "forest_troll_high_priest_heal_amp_aura": {
    "name": "治疗增强光环",
    "description": "为周围所有友军提供额外的治疗增强。",
    "notes": [],
    "labels": {
      "heal_amp": "%治疗增强：",
      "radius": "作用范围："
    },
    "image": "assets/abilities/forest_troll_high_priest_heal_amp_aura.png"
  },
  "harpy_scout_take_off": {
    "name": "起飞",
    "description": "鹰身女妖侦察者以移动速度为代价获得飞行移动状态。开启时消耗魔法。",
    "notes": [],
    "labels": {
      "move_speed_penalty": "%移动速度惩罚：",
      "cost_per_second": "%每秒消耗最大魔法："
    },
    "image": "assets/abilities/harpy_scout_take_off.png"
  },
  "harpy_storm_chain_lightning": {
    "name": "连锁闪电",
    "description": "鹰身女妖风暴巫师对目标敌人释放一道高压闪电，造成伤害。闪电会在附近敌人之间跳跃，每次跳跃损失一些威力。",
    "notes": [],
    "labels": {
      "initial_damage": "初始伤害：",
      "jump_range": "跳跃范围：",
      "damage_percent_loss": "%每次跳跃后伤害减少：",
      "max_targets": "最大目标数："
    },
    "image": "assets/abilities/harpy_storm_chain_lightning.png"
  },
  "black_drake_magic_amplification_aura": {
    "name": "魔法增强光环",
    "description": "黑蜉蝣的凝视让敌人更难抵挡技能伤害。",
    "notes": [],
    "labels": {
      "spell_amp": "%受到技能伤害增加：",
      "radius": "作用范围："
    },
    "image": "assets/abilities/black_drake_magic_amplification_aura.png"
  },
  "black_dragon_fireball": {
    "name": "灼热俯冲",
    "description": "朝目标方向呈弧线飞行，随后折返回起始位置，沿途留下一道火焰轨迹。火焰持续燃烧%duration%秒，每秒对困在其中的敌人造成%damage%点伤害。",
    "notes": [
      "飞行持续%dive_duration%秒，并且无法被施法者取消。",
      "重叠的火焰区域不会叠加。"
    ],
    "labels": {
      "radius": "作用范围：",
      "damage": "每秒伤害：",
      "burn_interval": "燃烧间隔：",
      "duration": "持续时间：",
      "dive_length": "冲击长度：",
      "dive_width": "俯冲宽度："
    },
    "image": "assets/abilities/black_dragon_fireball.png"
  },
  "black_dragon_splash_attack": {
    "name": "溅射攻击",
    "description": "周围所有敌人都感受到黑龙的爆炸攻击。",
    "notes": [],
    "labels": {
      "range": "距离：",
      "damage_percent": "%伤害："
    },
    "image": "assets/abilities/black_dragon_splash_attack.png"
  },
  "black_dragon_dragonhide_aura": {
    "name": "龙肤光环",
    "description": "远古黑龙可怕的存在让附近的友军获得了额外护甲。这个光环效果多个叠加。",
    "notes": [],
    "labels": {
      "bonus_armor": "护甲加成：",
      "radius": "光环作用范围："
    },
    "image": "assets/abilities/black_dragon_dragonhide_aura.png"
  },
  "frogmen_riverborn_aura": {
    "name": "河生光环",
    "description": "只要青蛙处于水中，所有友军的移动速度和伤害输出都得到提升。",
    "notes": [],
    "labels": {
      "bonus_movement_speed": "%移动速度加成：",
      "bonus_outgoing_damage": "%伤害输出：",
      "radius": "作用范围："
    },
    "image": "assets/abilities/frogmen_riverborn_aura.png"
  },
  "frogmen_arm_of_the_deep": {
    "name": "深水武器",
    "description": "向目标方向放出一片触手，对敌人造成<font color='#2dd5e4'>眩晕</font>和伤害。",
    "notes": [],
    "labels": {
      "damage": "伤害：",
      "duration": "<font color='#2dd5e4'>眩晕</font>时间：",
      "range": "作用范围："
    },
    "image": "assets/abilities/frogmen_arm_of_the_deep.png"
  },
  "frogmen_tendrils_of_the_deep": {
    "name": "深水触须",
    "description": "向目标方向放出一片锥形的触手，对敌人造成<font color='#2dd5e4'>眩晕</font>和伤害。",
    "notes": [],
    "labels": {
      "damage": "伤害：",
      "duration": "<font color='#2dd5e4'>眩晕</font>时间：",
      "range": "作用范围："
    },
    "image": "assets/abilities/frogmen_tendrils_of_the_deep.png"
  },
  "frogmen_congregation_of_the_deep": {
    "name": "深水鱼群",
    "description": "向所有方向放出一片触手，对敌人造成<font color='#2dd5e4'>眩晕</font>和伤害。",
    "notes": [],
    "labels": {
      "damage": "伤害：",
      "duration": "<font color='#2dd5e4'>眩晕</font>时间：",
      "range": "作用范围："
    },
    "image": "assets/abilities/frogmen_congregation_of_the_deep.png"
  },
  "frogmen_water_bubble_small": {
    "name": "水泡泡（小）",
    "description": "制造一个<font color='#1278b9'>护盾</font>泡泡，保护目标免受魔法伤害，持续%duration%秒。",
    "notes": [],
    "labels": {
      "damage_absorb": "伤害吸收："
    },
    "image": "assets/abilities/frogmen_water_bubble_small.png"
  },
  "frogmen_water_bubble_medium": {
    "name": "水泡泡（中）",
    "description": "制造一个<font color='#1278b9'>护盾</font>泡泡，保护目标免受魔法伤害，持续%duration%秒。泡泡爆炸后目标会受到%heal_pct%%%数值的治疗效果。",
    "notes": [],
    "labels": {
      "damage_absorb": "伤害吸收："
    },
    "image": "assets/abilities/frogmen_water_bubble_medium.png"
  },
  "frogmen_water_bubble_large": {
    "name": "水泡泡（大）",
    "description": "制造一个<font color='#1278b9'>护盾</font>泡泡，保护目标免受魔法伤害，持续%duration%秒。泡泡爆炸后目标和范围内所有友军会受到%heal_pct%%%数值的治疗效果。",
    "notes": [],
    "labels": {
      "damage_absorb": "伤害吸收：",
      "radius": "范围："
    },
    "image": "assets/abilities/frogmen_water_bubble_large.png"
  },
  "radigull_eggstremism": {
    "name": "极蛋主义",
    "description": "狂海鸥会在其前方锥形区域内产下%egg_count%枚蛋。每枚蛋会在%fuse_duration%秒后爆炸，对附近的敌人造成伤害并使其沉默。",
    "notes": [],
    "labels": {
      "egg_count": "下蛋数量：",
      "egg_distance": "下蛋距离：",
      "fuse_duration": "爆炸延迟：",
      "damage": "伤害：",
      "radius": "作用范围：",
      "tooltip_egg_health": "蛋生命格数：",
      "slow": "%MOVEMENT SLOW:",
      "slow_duration": "<font color='#6db6e9'>沉默</font>持续时间："
    },
    "image": "assets/abilities/radigull_eggstremism.png"
  },
  "odobenus_blight": {
    "name": "海象之祸",
    "description": "海象步兵的攻击会侵蚀目标的防御，降低他们的护甲，持续%armor_reduction_duration%秒。",
    "notes": [],
    "labels": {
      "armor_reduction": "护甲降低：",
      "armor_reduction_duration": "持续时间："
    },
    "image": "assets/abilities/odobenus_blight.png"
  },
  "eimermole_miners_aura": {
    "name": "矿工光环",
    "description": "矿工鼠的守护存在使附近的敌人无法获得任何喘息的机会，减少他们获得的所有生命回复。",
    "notes": [],
    "labels": {
      "restoration_reduction": "%生命回复降低：",
      "radius": "半径范围："
    },
    "image": "assets/abilities/eimermole_miners_aura.png"
  },
  "eimermole_miners_slam": {
    "name": "矿工猛击",
    "description": "矿工鼠工头缓缓蓄力举起双手，然后在身前猛击地面%pulse_count%次。每次重击造成%damage%点伤害,并使目标减速%slow_pct%%%，持续%slow_duration%秒。",
    "notes": [],
    "labels": {
      "radius": "作用范围："
    },
    "image": "assets/abilities/eimermole_miners_slam.png"
  },
  "ogre_seal_flop": {
    "name": "海豹扑打",
    "description": "远古食人魔海豹向前扑打%max_bounces%次，每次落地时对区域内的敌人造成伤害并使其减速。",
    "notes": [],
    "labels": {
      "leap_distance": "跳跃距离：",
      "radius": "作用范围：",
      "flop_damage": "伤害：",
      "slow": "%移动速度减缓：",
      "slow_duration": "减速持续时间：",
      "max_bounces": "弹跳次数："
    },
    "image": "assets/abilities/ogre_seal_flop.png"
  },
  "ogre_seal_pup_disapproval_aura": {
    "name": "豹力光环",
    "description": "远古食人魔海豹幼崽凋零般的凝视会减慢附近敌人的速度。",
    "notes": [],
    "labels": {
      "movespeed_slow": "%移动速度减缓：",
      "radius": "作用范围："
    },
    "image": "assets/abilities/ogre_seal_pup_disapproval_aura.png"
  },
  "creep_siege": {
    "name": "坚锐",
    "description": "坚锐单位和建筑对其他坚锐单位和建筑造成额外伤害，并且受到其他单位的伤害变低。",
    "notes": [],
    "labels": {
      "bonus_building_damage": "%额外伤害：",
      "incoming_hero_damage_penalty": "%英雄攻击伤害降低：",
      "incoming_basic_damage_penalty": "%非英雄攻击伤害降低："
    },
    "image": "assets/abilities/creep_siege.png"
  },
  "backdoor_protection": {
    "name": "偷塔保护",
    "description": "只要附近没有敌方的小兵，建筑所受的伤害就会有一定的减免，而且会快速恢复生命值。",
    "notes": [],
    "labels": {
      "in_base": "偷塔保护"
    },
    "image": "assets/abilities/backdoor_protection.png"
  },
  "backdoor_protection_in_base": {
    "name": "偷塔保护",
    "description": "只要附近没有敌方的小兵，建筑所受的伤害就会有一定的减免，而且会快速恢复生命值。",
    "notes": [],
    "labels": {},
    "image": "assets/abilities/backdoor_protection_in_base.png"
  },
  "flagbearer_creep_aura_effect": {
    "name": "鼓舞光环",
    "description": "旗手鼓舞所有友方小兵，提供额外生命恢复和魔法抗性。",
    "notes": [
      "魔法抗性加成每7.5分钟升级一次，增加%bonus_magic_resistance_per_interval%%%，最高为%maximum_intervals%次升级。"
    ],
    "labels": {
      "bonus_health_regen": "生命恢复加成：",
      "radius": "作用范围：",
      "total_magic_resistance": "%魔法抗性加成："
    },
    "image": "assets/abilities/flagbearer_creep_aura_effect.png"
  },
  "roshan_revengeroar": {
    "name": "复仇咆哮",
    "description": "肉山在面对上次击杀他的队伍时，会发出一声愤怒的咆哮，全地图都可以听到，对%radius%范围内所有单位造成伤害，并且<font color='#afb912'>缴械</font>%disarm_duration%秒。被咆哮作用的单位受到的伤害将提高%disarm_duration%%%。",
    "notes": [],
    "labels": {
      "damage_growth": "每分钟伤害增加：",
      "damage": "伤害：",
      "duration": "伤害增加的负面状态持续时间："
    },
    "image": "assets/abilities/roshan_revengeroar.png"
  },
  "roshan_slam": {
    "name": "震击",
    "description": "肉山猛击地面，对周围的敌人造成伤害和减速。震击的伤害每分钟都会提升。震击对非英雄单位造成的伤害增加%damage_bonus_creeps%%%。",
    "notes": [],
    "labels": {
      "radius": "作用范围：",
      "slow_duration": "持续时间：",
      "slow_amount": "%移动速度减缓：",
      "damage": "伤害：",
      "damage_growth": "每分钟伤害增加："
    },
    "image": "assets/abilities/roshan_slam.png"
  },
  "roshan_inherent_buffs": {
    "name": "肉山固有属性",
    "description": "",
    "notes": [],
    "labels": {},
    "image": null
  },
  "roshan_devotion": {
    "name": "不朽之力",
    "description": "肉山拥有多个保护性技能，包括55%%魔法抗性，攻击它的幻象造成的伤害较低，以及随着时间推移增加自身的护甲。",
    "notes": [],
    "labels": {},
    "image": null
  },
  "roshan_bash": {
    "name": "重击",
    "description": "肉山的攻击有一定概率造成眩晕。",
    "notes": [],
    "labels": {
      "bash_chance": "%概率：",
      "bonus_damage": "额外伤害：",
      "stun_duration": "眩晕时间："
    },
    "image": "assets/abilities/roshan_bash.png"
  },
  "roshan_spell_block": {
    "name": "法术抵挡",
    "description": "肉山每15秒会抵抗一次指向性法术。另外负面状态效果降低25%。",
    "notes": [],
    "labels": {},
    "image": "assets/abilities/roshan_spell_block.png"
  },
  "roshan_grab_and_throw": {
    "name": "扔出",
    "description": "肉山在巢穴之间移动时，会把挡路的英雄抓起再猛地扔出去。英雄落地后会受到伤害，并被<font color='#2dd5e4'>眩晕</font>%stun_duration%秒。巢穴之间移动的每个周期内，每次肉山扔出英雄后扔出伤害都会增加。",
    "notes": [
      "英雄被肉山扔出的方向取决于他们和他之间的相对位置。"
    ],
    "labels": {
      "damage": "伤害：",
      "damage_per_combo": "每次扔出增加伤害：",
      "damage_growth_curr_hp_pct": "%每分钟提升目标生命值伤害：",
      "max_knockback_distance": "摔扔距离：",
      "stun_duration": "<font color='#2dd5e4'>眩晕</font>时间："
    },
    "image": "assets/abilities/roshan_grab_and_throw.png"
  },
  "ogre_magi_frost_armor": {
    "name": "寒冰盔甲",
    "description": "食人魔冰霜法师召唤一层看不见的冰气围住目标友方单位，提高它的护甲值并短暂减速任何胆敢攻击它的敌人。",
    "notes": [],
    "labels": {
      "armor_bonus": "护甲增益：",
      "duration": "持续时间：",
      "movespeed_slow": "%移动速度减缓：",
      "attackspeed_slow": "攻击速度降低：",
      "slow_duration": "减速持续时间："
    },
    "image": "assets/abilities/ogre_magi_frost_armor.png",
    "definition": {
      "passive": false,
      "manaCost": "40",
      "cooldown": "5",
      "castRange": "800",
      "castPoint": "0.56",
      "values": {
        "armor_bonus": "4 5 6 8",
        "duration": "45",
        "movespeed_slow": "-22 -24 -26 -30",
        "attackspeed_slow": "-22 -24 -26 -30",
        "slow_duration": "5"
      }
    }
  },
  "dark_troll_warlord_ensnare": {
    "name": "诱捕",
    "description": "黑暗巨魔捕手向一个敌人脚下扔出诱捕网，使他暂时无法移动，被网住的单位仍然可以攻击和使用技能。",
    "notes": [],
    "labels": {
      "duration": "持续时间："
    },
    "image": "assets/abilities/dark_troll_warlord_ensnare.png",
    "definition": {
      "passive": false,
      "manaCost": "75",
      "cooldown": "15",
      "castRange": "550 625 700 825",
      "castPoint": "0.3",
      "values": {
        "duration": "1.75",
        "net_speed": "1500"
      }
    }
  },
  "dark_troll_warlord_raise_dead": {
    "name": "亡灵复生",
    "description": "黑暗巨魔召唤法师搅动脚下的大地，从死亡巨魔的尸体中招出三个骷髅战士为他作战。",
    "notes": [],
    "labels": {
      "duration": "持续时间：",
      "skeletons_health": "骷髅战士生命值：",
      "skeletons_damage": "骷髅战士攻击力："
    },
    "image": "assets/abilities/dark_troll_warlord_raise_dead.png",
    "definition": {
      "passive": false,
      "manaCost": "50",
      "cooldown": "20",
      "castRange": "0",
      "castPoint": "0.3",
      "values": {
        "duration": "35",
        "skeletons_created": "3",
        "skeletons_health": "250 275 300 375",
        "skeletons_damage": "12 15 18 21"
      }
    }
  },
  "courier_return_to_base": {
    "name": "返回基地",
    "description": "命令信使返回基地",
    "notes": [],
    "labels": {},
    "image": "assets/abilities/courier_return_to_base.png"
  },
  "courier_transfer_items": {
    "name": "运送物品",
    "description": "将物品运送给英雄",
    "notes": [],
    "labels": {},
    "image": "assets/abilities/courier_transfer_items.png"
  },
  "courier_go_to_secretshop": {
    "name": "前往神秘商店",
    "description": "派信使前往本方的神秘商店",
    "notes": [],
    "labels": {},
    "image": "assets/abilities/courier_go_to_secretshop.png"
  },
  "courier_burst": {
    "name": "加速",
    "description": "信使的速度得到极大提升，持续%duration%秒",
    "notes": [],
    "labels": {
      "movement_speed": "%移速爆发："
    },
    "image": "assets/abilities/courier_burst.png"
  },
  "courier_shield": {
    "name": "护盾",
    "description": "在信使周围召唤一个护盾",
    "notes": [],
    "labels": {
      "duration": "持续时间："
    },
    "image": "assets/abilities/courier_shield.png"
  },
  "juggernaut_healing_ward": {
    "name": "治疗守卫",
    "description": "召唤一个治疗守卫，按周围友军单位最大生命值的一定比例<font color='#07d738'>治疗</font>他们。治疗守卫可以移动，移动速度为%healing_ward_movespeed_tooltip%。持续%abilityduration%秒。",
    "notes": [
      "可以控制治疗守卫。",
      "多个治疗守卫的效果不会叠加。"
    ],
    "labels": {
      "healing_ward_heal_amount": "%每秒最大生命值回复：",
      "healing_ward_aura_radius": "作用范围：",
      "healing_ward_hits_to_kill_tooltip": "生命格数："
    },
    "image": "assets/abilities/juggernaut_healing_ward.png"
  }
};
