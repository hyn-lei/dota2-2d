import test from 'node:test';
import assert from 'node:assert/strict';
import {Navigator} from '../src/navigation.js';

test('the 7.42 mid river channel permits a direct ground route through the new opening',()=>{
 const nav=new Navigator(undefined,[]);
 const from={x:9856,y:9792},to={x:9856,y:10112};
 assert.ok(nav.lineClear(from,to),'the current client opens this mid-river corridor');
 const route=nav.findPath(from,to);
 assert.deepEqual(route,[to]);
});

test('the 7.42 mid river cliff prevents the former straight ground route',()=>{
 const nav=new Navigator(undefined,[]),from={x:9984,y:9728},to={x:9984,y:9984};
 assert.equal(nav.lineClear(from,to),false,'the current client closes this former straight route');
 const destination=nav.nearestWalkable({x:9984,y:9792});
 assert.ok(Math.hypot(destination.x-9984,destination.y-9792)>=64,'ground orders must stop outside the new cliff');
});
