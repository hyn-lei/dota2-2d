# Cooperative protocol v1

Transport: same-origin WebSocket `/ws/coop`. UTF-8 JSON messages. The server owns all state. Never accept an actor ID, state mutation, difficulty, AI substitute, or arbitrary method supplied by a client.

Client messages:

- `{type:'hello', token?:string}`: create random server identity or resume disconnected one. Reply `welcome` with token, clientId, lastCommandId. Reject a token already active.
- `{type:'create', name:string, heroId:string}`, `{type:'join',code:string,name:string,heroId:string}`.
- `{type:'chooseHero',heroId:string}`, `{type:'ready',ready:boolean}`, `{type:'start'}`, `{type:'leave'}`.
- `{type:'command',id:positiveInteger,action:string,args:array,slotGuards?:[{area,index,uid}]}`. Actor is the session's bound hero. IDs must exceed session.lastCommandId; welcome carries the counter across reconnect. Item mutations verify guard UID equals the current actor slot when a slot is involved; null can guard an empty destination. No command execution in lobby/disconnect pause/end.
- `{type:'ping',sentAt:number}` → `{type:'pong',sentAt:number}`.

Server messages:

- `{type:'welcome',token,clientId,lastCommandId}`.
- `{type:'room',room:{code,phase,hostId,capacity:5,members:[{clientId,name,heroId,ready,connected,heroEntityId}],reconnectDeadline?:number}}`. Phase lobby/playing/reconnecting/ended.
- `{type:'snapshot',frame,playerId,roomCode,state}`. State includes time,status,paused,winner,score,entities,effects,feed,wave,camps,pendingSpells visual projection,cutTrees as entries,plantedTrees,shopStocks. Entities contain `isHuman` on five Radiant heroes; only five Dire heroes have AI controllers. Human names and ownership included; tokens never included.
- `{type:'ack',id,result:{ok:boolean,reason?:string,...}}`: actual executed result. Client must await this before displaying purchase/learning success.
- `{type:'error',code,message}`: lobby/session/transport failure.
- `{type:'end',reason}`: aborted/timeout match; UI returns to lobby without writing a normal win/loss record.

Supported command actions: moveTo, setMovement, attackTarget, cast, castExtra, useItem, toggleAutocast, learnAbility, learnTalent, learnAttributes, recall, buy, moveItem, sellItem, collectStash, queueItem, clearQuickbuy, buyQuick, setCombineLock, disassembleItem, dropItem, pickupItem, courierCommand, buyWithCourier. All parameters pass action-specific validation. Points allow only finite x/y and optional direction x/y in world range, not entity objects. Inventory area/index validates against its actual slot count; client cannot access courier cargo via normal inventory mutation.

`useItem` arguments are `[index, point, area]` with a mandatory source slot guard; recall guards tp slot 0. `pickupItem` calls the authoritative `Game.pickupOrApproach(id)` wrapper to approach distant loot rather than writing a client-only pickup target.

Points may include `self:true`; the server resolves this to the authenticated actor, never a client-selected entity ID. Self Bloodlust and Fire Shield disambiguate overlapping allies. Large snapshots negotiate permessage-deflate, with no context takeover, a 1024-byte threshold and bounded compression concurrency.

Each socket has at most one snapshot send outstanding. Broadcasts skip stale intermediate states while that send is pending and project the current state on the next eligible broadcast. If the match finishes during a pending send, retain one terminal room/member reference and deliver the final state after drain only if that socket still owns the original connected seat. Control messages, including ACKs, do not request compression; they still follow an already queued frame and have no absolute WAN latency guarantee. The outgoing byte limit and transport-error disconnect remain in force.

Snapshot encoding preserves recursive Infinity/-Infinity through a dedicated numeric tag and restores it client-side. Commands use ordinary JSON plus strict validators; server must not trust numeric tags as command numbers. Exclude navPath/navGoal/skillCache/innateCache/botState/botShop and Map/cache objects except explicit cutTrees entries. Include pendingSpells identifiers/times needed by active projectile visuals, no AI plans or secrets.

Integration interfaces:

- `Game({hero,difficulty,seed,humanHeroes?:[{heroId,name,clientId}]})`: optional roster constructs exactly five Radiant `isPlayer:true,isHuman:true,controller:'human'` heroes from the outset, skips all bot learning/purchasing. Default constructor unchanged.
- `Game.clearMovement(hero)`: clear only affected hero input. `_playerTick` uses each hero's movement input, not a shared keyboard.
- `CoopGame.withActor(entityId,callback)`: synchronous try/finally actor context for reused Game player commands; no await inside. `game.player` resolves current actor or first human. `clearQuickbuy()` and approach-and-pickup action are authoritative wrappers.
- `createCoopServer({root,host,port,autoTick,reconnectMs,maxRooms,...})` returns service with server/manager/listen/close for tests and production. Root directory serves only index.html/src/assets. `scripts/server.mjs` starts it with source root in dev, static build root in production.

Defaults: 50ms simulation step, 100ms snapshots, 120000ms reconnect grace, max20 rooms, max120 connections, 8192-byte incoming messages, token-session/lobby expiry cleanup, bounded outgoing buffering. Lobby disconnect releases slot; match disconnect reserves slot and pauses entire game. Clear all held movements when pause starts. Guard old socket close events by socket identity, and heartbeat half-open connections. Limit creation/join/command rates. Production factories contain no debug HTTP endpoints.
