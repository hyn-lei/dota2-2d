import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCoopServer } from '../server/coop-server.mjs';

const args=process.argv.slice(2);
const argument=name=>args.includes(name)?args[args.indexOf(name)+1]:undefined;
const root=process.env.STATIC_ROOT?resolve(process.env.STATIC_ROOT):fileURLToPath(new URL('..',import.meta.url));
const configuredPort=process.env.PORT??argument('--port');
let port=Number(configuredPort??5184);
const host=process.env.HOST??argument('--host')??'127.0.0.1';
if(!Number.isInteger(port)||port<0||port>65535)throw new Error('PORT must be an integer between 0 and 65535');
let service,address;
for(let retries=0;retries<=15;retries++){
  service=createCoopServer({root,host,port});
  try{address=await service.listen();break;}catch(error){await service.close();if(error.code!=='EADDRINUSE'||configuredPort!==undefined||retries===15)throw error;port++;}
}
console.log(`Ancient Front ready at http://${host}:${address.port}; cooperative WebSocket /ws/coop`);
for(const signal of ['SIGTERM','SIGINT']) process.once(signal,async()=>{await service.close();process.exit(0);});
