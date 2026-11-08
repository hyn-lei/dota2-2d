import test from 'node:test';
import assert from 'node:assert/strict';
import {BINDINGS_KEY,defaultBindings,loadBindings,saveBindings,getBindings,validateBindings,coreBinding,skillKey,itemKey,extraKey,shopKey} from '../src/keybindings.js';
const storage=()=>{const values=new Map();return {getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};};
test('ASDF skills and QWERTY items coexist, persist, and replace original actions',()=>{
 const store=storage(),bindings={skills:['A','S','D','F'],items:['Q','W','E','R','T','Y']};loadBindings(store);
 assert.equal(saveBindings(bindings,store).ok,true);
 for(let i=0;i<4;i++){assert.equal(skillKey(i),bindings.skills[i]);assert.deepEqual(coreBinding(bindings.skills[i]),{type:'skill',index:i});}
 for(let i=0;i<6;i++){assert.equal(itemKey(i),bindings.items[i]);assert.deepEqual(coreBinding(bindings.items[i]),{type:'item',index:i});}
 assert.equal(coreBinding('1'),null);assert.equal(shopKey(),'Tab');assert.equal(extraKey('D'),'Z');assert.equal(extraKey('T'),'X');
 assert.deepEqual(loadBindings(store),{skills:['a','s','d','f'],items:['q','w','e','r','t','y']});
 const copy=getBindings();copy.skills[0]='x';assert.equal(skillKey(0),'A');
});
test('invalid, duplicated, reserved, or corrupt bindings cannot replace working preferences',()=>{
 const store=storage();loadBindings(store);
 assert.ok(validateBindings({skills:['q','w','e','r'],items:['q','2','3','4','5','6']}).includes('重复'));
 for(const key of ['Escape','ArrowLeft',' ','Shift','b','g','h','m','p','u','<']){const value=defaultBindings();value.skills[0]=key;assert.equal(saveBindings(value,store).ok,false);}
 assert.deepEqual(getBindings(),defaultBindings());
 for(const value of ['{bad','{}','{"skills":null}',JSON.stringify({skills:['a','a','d','f'],items:['q','w','e','r','t','y']})]){store.setItem(BINDINGS_KEY,value);assert.deepEqual(loadBindings(store),defaultBindings());}
 const blocked={setItem(){throw new Error();}};assert.equal(saveBindings({skills:['a','s','d','f'],items:['1','2','3','4','5','6']},blocked).ok,false);assert.deepEqual(getBindings(),defaultBindings());
});
test('extra abilities always retain distinct free keys and restoring defaults restores original inputs',()=>{
 const store=storage();loadBindings(store);saveBindings({skills:['z','x','c','v'],items:['d','t','j','k','l','o']},store);
 assert.notEqual(extraKey('D'),extraKey('T'));assert.equal(coreBinding(extraKey('D')),null);assert.equal(coreBinding(extraKey('T')),null);
 assert.equal(saveBindings(defaultBindings(),store).ok,true);assert.equal(extraKey('D'),'D');assert.equal(extraKey('T'),'T');assert.equal(shopKey(),'F / Tab');
});
