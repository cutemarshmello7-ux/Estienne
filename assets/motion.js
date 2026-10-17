export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const mix=(a,b,t)=>a+(b-a)*t;
export const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t)};
export const stops=[0,.28,.5,.7,1];
// A single C1-continuous camera route. Interior knots never restart an ease.
const keys=[
 {p:0,c:[2.6,1.5,9.4],a:[.1,0,0],r:[-.18,-.3,-.12],o:[2.3,-.05,0],s:1.18},
 {p:.22,c:[1.4,.7,13.8],a:[0,0,0],r:[.1,.16,-.075],o:[2.35,.04,0],s:1},
 {p:.44,c:[-.5,1.5,13.6],a:[.1,0,0],r:[-.08,-.15,.08],o:[2.3,.1,.1],s:1},
 {p:.66,c:[3.5,-1.6,11.5],a:[.25,0,0],r:[.95,-.1,-.12],o:[2.3,.1,.05],s:1.03},
 {p:.82,c:[.7,1,16],a:[0,0,0],r:[.15,.14,.02],o:[2.3,-.02,.2],s:.98},
 {p:1,c:[0,1,17.5],a:[0,0,0],r:[.04,-.08,-.065],o:[2.2,.05,.4],s:1}
];
function component(i,k,j){return j===undefined?keys[i][k]:keys[i][k][j]}
function tangent(i,k,j){
 if(i===0||i===keys.length-1)return 0;
 return (component(i+1,k,j)-component(i-1,k,j))/(keys[i+1].p-keys[i-1].p);
}
export function sampleTimeline(progress){
 const p=clamp(progress);let i=0;
 while(i<keys.length-2&&p>keys[i+1].p)i++;
 const a=keys[i],b=keys[i+1],span=b.p-a.p,t=(p-a.p)/span,t2=t*t,t3=t2*t;
 const h00=2*t3-3*t2+1,h10=t3-2*t2+t,h01=-2*t3+3*t2,h11=t3-t2;
 const value=(k,j)=>h00*component(i,k,j)+h10*span*tangent(i,k,j)+h01*component(i+1,k,j)+h11*span*tangent(i+1,k,j);
 const out={s:value('s')};
 for(const k of ['c','a','r','o'])out[k]=[0,1,2].map(j=>value(k,j));
 return out;
}
// Exact critically damped spring integration, independent of refresh rate.
export function springStep(value,velocity,target,dt,omega=10){
 const d=value-target,c=velocity+omega*d,e=Math.exp(-omega*dt);
 return {value:target+(d+c*dt)*e,velocity:(velocity-omega*c*dt)*e};
}

