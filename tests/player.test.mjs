import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../assets/terrain.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const make=()=>({dataset:{},events:{},value:0,textContent:'',disabled:true,classList:{add(){},toggle(){}},setAttribute(k,v){this[k]=v},addEventListener(k,v){this.events[k]=v}});
const nodes=Object.fromEntries(['film','canvas','play','scrub','load-status','time'].map(k=>['#'+k,make()]));
const screen=make(),label=make(),closed=new Set(),created=new Set(),draws=[];
const captions=[...html.matchAll(/data-from="([^"]+)" data-to="([^"]+)"/g)].map(m=>Object.assign(make(),{dataset:{from:m[1],to:m[2]}}));
let paints=0;
const ctx={globalAlpha:1,fillRect(){paints++},drawImage(bitmap){assert(!closed.has(bitmap),'must never draw a closed bitmap');draws.push(this.globalAlpha)}};
nodes['#canvas'].getContext=()=>ctx;
nodes['#canvas'].getBoundingClientRect=()=>({width:1280,height:720});
nodes['#film'].getBoundingClientRect=()=>({top:0});nodes['#film'].offsetHeight=5000;
nodes['#play'].querySelector=()=>label;
const media={matches:false,addEventListener(k,v){this.change=v}};
const docEvents={},raf=new Map();let serial=0,now=0;
const sandbox={document:{hidden:false,body:make(),querySelector:s=>s==='.screen'?screen:nodes[s],querySelectorAll:()=>captions,addEventListener:(k,v)=>docEvents[k]=v},matchMedia:q=>q.includes('reduce')?media:{matches:false},devicePixelRatio:1,innerHeight:720,performance:{now:()=>now},addEventListener(){},requestAnimationFrame:f=>{raf.set(++serial,f);return serial},cancelAnimationFrame:i=>raf.delete(i),fetch:async url=>{const n=+url.match(/(\d+)\.webp/)[1];assert(n>=0&&n<=432);return {ok:true,blob:async()=>({n})}},createImageBitmap:async blob=>{await new Promise(setImmediate);const bitmap={width:960,height:540,close(){closed.add(this)}};created.add(bitmap);return bitmap}};
vm.runInNewContext(source,sandbox);
const settle=async()=>{for(let i=0;i<4;i++){await new Promise(setImmediate);const callbacks=[...raf.values()];raf.clear();callbacks.forEach(f=>f(now))}};
await settle();
for(const value of [0,280,710,1000,150,970,420,1000,0]){
 nodes['#scrub'].value=value;nodes['#scrub'].events.input();await settle();
 assert(+screen.dataset.decoded<=25,'decoded image memory remains bounded');
 assert(Math.abs(+screen.dataset.frame-value*.432)<=1,'scrub displays the requested frame in either direction');
 assert.equal(captions.filter(c=>c['aria-hidden']==='false').length,1,'each part of the film has content');
}
const beforeRapidPaints=paints;
for(let i=0;i<80;i++){nodes['#scrub'].value=(i*173)%1001;nodes['#scrub'].events.input()}
await settle();assert(+screen.dataset.decoded<=25,'rapid scrubbing does not leak bitmaps');
assert(paints-beforeRapidPaints<=2,'rapid updates and decode completions coalesce into display paints');
nodes['#scrub'].value=503;nodes['#scrub'].events.input();await settle();assert(draws.some(a=>a>0&&a<1),'fractional positions blend adjacent rendered frames');
nodes['#scrub'].value=1000;nodes['#scrub'].events.input();await settle();
nodes['#play'].events.click();assert.equal(nodes['#play']['aria-pressed'],'true');
const tick=[...raf.values()][0];raf.clear();now=18000;tick(now);await settle();
assert.equal(nodes['#scrub'].value,1000);assert.equal(label.textContent,'Replay the film');assert.equal(nodes['#play']['aria-pressed'],'false');
nodes['#play'].events.click();sandbox.document.hidden=true;docEvents.visibilitychange();assert.equal(raf.size,0,'hidden page stops playback');
media.matches=true;media.change();await settle();assert.equal(created.size,closed.size,'reduced motion releases all decoded images');
console.log('PASS: bidirectional and rapid scrubbing, bounded bitmap memory, complete captions, adjacent-frame blending, replay, hidden-page pause and reduced-motion cleanup');
