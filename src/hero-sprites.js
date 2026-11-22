import {HERO_SPRITES} from './hero-sprite-data.js';

let atlas;
const weaponPaths=new Map();
function pathsFor(sprite){
 let paths=weaponPaths.get(sprite);if(paths)return paths;
 const weapon=new Path2D(),body=new Path2D();body.rect(-200,-200,400,400);
 for(const path of [weapon,body]){sprite.weapon.polygon.forEach(([x,y],i)=>i?path.lineTo(x,y):path.moveTo(x,y));path.closePath();}
 paths={weapon,body};weaponPaths.set(sprite,paths);return paths;
}
function insidePolygon(x,y,polygon){
 let inside=false;
 for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const [xi,yi]=polygon[i],[xj,yj]=polygon[j];
  if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
 }
 return inside;
}
export function heroSpriteScale(hero,time){
 const bloodlust=hero.statuses?.ogreBloodlust;
 return 2.05*(bloodlust?.until>time?1+(bloodlust.modelScale||0)/100:1);
}
export function heroSpriteLabelHeight(hero,time){
 return (hero.heroId==='weaver'?55:(HERO_SPRITES[hero.heroId]?.worldHeight||54)+1)*heroSpriteScale(hero,time);
}
export function heroSpriteContainsPoint(hero,point,time,pose=null){
 if(hero.kind!=='hero'&&hero.kind!=='illusion')return false;
 const sprite=HERO_SPRITES[hero.heroId];if(!sprite)return false;
 const scale=heroSpriteScale(hero,time),padding=4/scale;
 let x=(point.x-hero.x)/scale,y=(point.y-hero.y)/scale;
 if(Math.cos(hero.angle??(hero.team?2.3:-.7))>0)x=-x;
 if(pose){const dx=x-pose.x,dy=y-4,cos=Math.cos(pose.rotation),sin=Math.sin(pose.rotation);x=(dx*cos+dy*sin)/pose.scaleX;y=4+(-dx*sin+dy*cos)/pose.scaleY;}
 if(Math.abs(x-(sprite.offsetX||0))<=sprite.worldWidth/2+padding&&y>=sprite.top-padding&&y<=sprite.top+sprite.worldHeight+padding)return true;
 if(sprite.weapon&&pose?.weaponRotation){const [px,py]=sprite.weapon.pivot,dx=x-px,dy=y-py,cos=Math.cos(pose.weaponRotation),sin=Math.sin(pose.weaponRotation);return insidePolygon(px+dx*cos+dy*sin,py-dx*sin+dy*cos,sprite.weapon.polygon);}
 return false;
}

export function loadHeroSprites(){
 if(!atlas&&typeof Image!=='undefined'){
  atlas=new Image();atlas.decoding='async';atlas.src='/assets/hero-sprites.png';
 }
 return atlas;
}

export function drawHeroSprite(c,hero,angle,pose=null){
 const sprite=HERO_SPRITES[hero.heroId],image=loadHeroSprites();
 if(!sprite||!image?.complete||!image.naturalWidth)return false;
 c.save();
 // Keep the full character upright; turning changes its facing, as for Weaver.
 c.rotate(-angle-Math.PI/2);
 if(Math.cos(angle)>0)c.scale(-1,1);
 if(pose){c.translate(pose.x,4);c.rotate(pose.rotation);c.scale(pose.scaleX,pose.scaleY);c.translate(0,-4);}
 const draw=()=>c.drawImage(image,sprite.x,sprite.y,sprite.width,sprite.height,
  -sprite.worldWidth/2+(sprite.offsetX||0),sprite.top,sprite.worldWidth,sprite.worldHeight);
 if(sprite.weapon&&pose?.weaponRotation){
  const paths=pathsFor(sprite),[px,py]=sprite.weapon.pivot;
  c.save();c.clip(paths.body,'evenodd');draw();c.restore();
  c.save();c.translate(px,py);c.rotate(pose.weaponRotation);c.translate(-px,-py);c.clip(paths.weapon);draw();c.restore();
 }else draw();
 c.restore();return true;
}
