import {HERO_SPRITES} from './hero-sprite-data.js';

let atlas;
export function heroSpriteContainsPoint(hero,point,time){
 if(hero.kind!=='hero'&&hero.kind!=='illusion')return false;
 const sprite=HERO_SPRITES[hero.heroId];if(!sprite)return false;
 const bloodlust=hero.statuses?.ogreBloodlust;
 const scale=2.05*(bloodlust?.until>time?1+(bloodlust.modelScale||0)/100:1),padding=4;
 return Math.abs(point.x-hero.x)<=sprite.worldWidth*scale/2+padding&&
  point.y>=hero.y+sprite.top*scale-padding&&point.y<=hero.y+(sprite.top+sprite.worldHeight)*scale+padding;
}

export function loadHeroSprites(){
 if(!atlas&&typeof Image!=='undefined'){
  atlas=new Image();atlas.decoding='async';atlas.src='/assets/hero-sprites.png';
 }
 return atlas;
}

export function drawHeroSprite(c,hero,angle){
 const sprite=HERO_SPRITES[hero.heroId],image=loadHeroSprites();
 if(!sprite||!image?.complete||!image.naturalWidth)return false;
 c.save();
 // Keep the full character upright; turning changes its facing, as for Weaver.
 c.rotate(-angle-Math.PI/2);
 if(Math.cos(angle)>0)c.scale(-1,1);
 c.drawImage(image,sprite.x,sprite.y,sprite.width,sprite.height,
  -sprite.worldWidth/2,sprite.top,sprite.worldWidth,sprite.worldHeight);
 c.restore();return true;
}
