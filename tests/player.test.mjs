import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../assets/terrain.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const make=()=>({dataset:{},events:{},value:0,textContent:'',disabled:true,classList:{add(){},remove(){},toggle(){}},setAttribute(k,v){this[k]=v},addEventListener(k,v){this.events[k]=v}});
const nodes=Object.fromEntries(['film','play','scrub','load-status','time'].map(k=>['#'+k,make()]));
const screen=make(),label=make(),icon=make(),docEvents={};
const captions=[...html.matchAll(/data-from="([^"]+)" data-to="([^"]+)"/g)].map(m=>Object.assign(make(),{dataset:{from:m[1],to:m[2]}}));
let mediaCallbacks=new Map(),serial=0,seekCalls=0,mobile=false;
const video=Object.assign(make(),{
 src:'',readyState:0,seeking:false,_time:0,duration:433/24,ended:false,
 get currentTime(){return this._time},
 set currentTime(t){seekCalls++;this.seeking=true;setImmediate(()=>{this._time=t;this.seeking=false;this.events.seeked?.()})},
 videoWidth:3840,videoHeight:2160,
 load(){this.readyState=0;if(this.src)setImmediate(()=>{this.videoWidth=this.src.includes('1080')?1920:3840;this.videoHeight=this.videoWidth*9/16;this.readyState=1;this.events.loadedmetadata?.();assert.equal(nodes['#play'].disabled,false,'metadata-only preload still allows user-initiated playback');this.readyState=2;this.events.loadeddata?.()})},
 removeAttribute(k){if(k==='src')this.src=''},
 async play(){this.ended=false;this.events.play?.()},pause(){this.events.pause?.()},
 requestVideoFrameCallback(f){mediaCallbacks.set(++serial,f);return serial},cancelVideoFrameCallback(id){mediaCallbacks.delete(id)},
 advance(t){this._time=t;const callbacks=[...mediaCallbacks.values()];mediaCallbacks.clear();callbacks.forEach(f=>f(0,{mediaTime:t}));if(t>=this.duration){this.ended=true;this.events.ended?.()}}
});
nodes['#canvas']=video;
nodes['#film'].getBoundingClientRect=()=>({top:0});nodes['#film'].offsetHeight=5000;
nodes['#play'].querySelector=s=>s==='.play-label'?label:icon;
const reduced={matches:false,addEventListener(k,v){this.change=v}};
const sandbox={document:{hidden:false,body:make(),querySelector:s=>s==='.screen'?screen:nodes[s],querySelectorAll:()=>captions,addEventListener:(k,v)=>docEvents[k]=v},matchMedia:q=>q.includes('reduce')?reduced:{matches:mobile},innerHeight:720,addEventListener(){},requestAnimationFrame:setImmediate,cancelAnimationFrame:clearImmediate};
vm.runInNewContext(source,sandbox);
const settle=async()=>{for(let i=0;i<5;i++)await new Promise(setImmediate)};
await settle();assert(video.src.endsWith('terrain-4k.mp4'));assert.equal(screen.dataset.resolution,'3840×2160');assert.equal(nodes['#play'].disabled,false);
for(const value of [0,150,420,550,1000,280,970,0]){
 nodes['#scrub'].value=value;nodes['#scrub'].events.input();await settle();
 assert(Math.abs(+screen.dataset.frame-value*.432)<=1,'scrub displays the requested frame in either direction');
 assert.equal(captions.filter(c=>c['aria-hidden']==='false').length,1,'each part has content');
}
const before=seekCalls;let last;
for(let i=0;i<80;i++){last=(i*173)%1001;nodes['#scrub'].value=last;nodes['#scrub'].events.input()}
await settle();assert(seekCalls-before<=3,'rapid inputs coalesce to the latest media seek');assert(Math.abs(video.currentTime-last/1000*18)<.001);
nodes['#scrub'].value=1000;nodes['#scrub'].events.input();await settle();
await nodes['#play'].events.click();await settle();assert.equal(nodes['#play']['aria-pressed'],'true');assert.equal(video.currentTime,0);
video.advance(2.5);assert.equal(+nodes['#scrub'].value,139);
video.advance(433/24);assert.equal(+nodes['#scrub'].value,1000);assert.equal(label.textContent,'Replay the film');assert.equal(mediaCallbacks.size,0);
await nodes['#play'].events.click();sandbox.document.hidden=true;docEvents.visibilitychange();assert.equal(mediaCallbacks.size,0);assert.equal(nodes['#play']['aria-pressed'],'false');
reduced.matches=true;reduced.change();assert.equal(video.src,'','reduced motion releases the video source');
mobile=true;reduced.matches=false;reduced.change();await settle();assert(video.src.endsWith('terrain-1080.mp4'));assert.equal(screen.dataset.resolution,'1920×1080');
console.log('PASS: native 4K/1080 source selection; bidirectional and coalesced seeking; caption coverage; frame-synced playback; replay; hidden-page pause; reduced-motion resource release');
