// Difficulty changes decisions and timing only; hero stats and purchases use
// the same runtime and economy as player-controlled heroes.
export const DIFFICULTIES=Object.freeze([
  {id:'easy',name:'休闲',description:'较宽松的反应与战斗判断，适合熟悉英雄和地图。'},
  {id:'normal',name:'标准',description:'均衡的对线、战斗和支援判断。'},
  {id:'hard',name:'挑战',description:'更快反应，积极使用技能、物品和安全走位。'},
  {id:'nightmare',name:'疯狂',description:'共享可见战况、集火与控制衔接，及时应对战斗威胁。'},
  {id:'hell',name:'炼狱',description:'在疯狂基础上增加持续施法反制、技能保护识别和预测走位。'}
].map(Object.freeze));

export const BOT_DIFFICULTY=Object.freeze({
  easy:Object.freeze({reaction:.35,jitter:.06,awareness:1100,lead:.45,advantage:1.85,tier:1,advanced:false,master:false,macroInterval:1.2}),
  normal:Object.freeze({reaction:.18,jitter:.035,awareness:1250,lead:.75,advantage:1.65,tier:2,advanced:false,master:false,macroInterval:1.2}),
  hard:Object.freeze({reaction:.08,jitter:.015,awareness:1450,lead:1,advantage:1.5,tier:3,advanced:false,master:false,macroInterval:1.2}),
  nightmare:Object.freeze({reaction:.03,jitter:.005,awareness:2000,lead:1.15,advantage:1.3,tier:4,advanced:true,master:false,macroInterval:.2}),
  hell:Object.freeze({reaction:.02,jitter:.002,awareness:2000,lead:1.2,advantage:1.25,tier:5,advanced:true,master:true,macroInterval:.15})
});

export const normalizeDifficulty=value=>typeof value==='string'&&Object.hasOwn(BOT_DIFFICULTY,value)?value:'normal';
export const botProfile=(g,h)=>BOT_DIFFICULTY[h.team===1?normalizeDifficulty(g.difficulty):h.aiDifficulty==='hard'?'hard':'normal'];
