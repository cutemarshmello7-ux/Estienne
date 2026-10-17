import assert from 'node:assert/strict';
import {sampleTimeline,springStep} from '../assets/motion.js';
for(let n=0;n<=1000;n++){
 const p=n/1000,v=sampleTimeline(p);
 for(const k of ['c','a','r','o'])assert(v[k].every(Number.isFinite));
 assert(v.c[2]>8&&v.c[2]<19);assert(v.s>.9&&v.s<1.3);assert(v.r.every(x=>Math.abs(x)<1.25));
}
for(const p of [.22,.44,.66,.82]){
 const e=1e-6,left=sampleTimeline(p-e),center=sampleTimeline(p),right=sampleTimeline(p+e);
 for(const k of ['c','a','r','o'])for(let j=0;j<3;j++){
  const a=(center[k][j]-left[k][j])/e,b=(right[k][j]-center[k][j])/e;
  assert(Math.abs(a-b)<.01,'Camera velocity changes abruptly at '+p+' / '+k);
 }
}
function run(hz){let s={value:0,velocity:0};for(let i=0;i<hz;i++)s=springStep(s.value,s.velocity,1,1/hz);return s}
assert(Math.abs(run(60).value-run(144).value)<1e-10);
assert(Math.abs(run(60).velocity-run(144).velocity)<1e-10);
console.log('PASS: 1,001 camera samples, continuous velocity at every join, identical spring motion at 60/144 Hz.');

