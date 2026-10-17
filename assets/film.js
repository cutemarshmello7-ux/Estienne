import * as THREE from 'three';
import {SVGLoader} from './vendor/SVGLoader.js';
import {RoomEnvironment} from './vendor/RoomEnvironment.js';
import {clamp,mix,smooth,sampleTimeline,springStep,stops} from './motion.js';

const stage=document.querySelector('.stage'), sequence=document.getElementById('sequence');
const mount=document.getElementById('render'), play=document.getElementById('play');
const playLabel=play.querySelector('.play-label'),playIcon=play.querySelector('.play-icon');
const chapters=[...document.querySelectorAll('.chapter')],nav=[...document.querySelectorAll('[data-chapter]')];
const swatches=[...document.querySelectorAll('[data-paper]')],note=document.querySelector('.object-note');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const notes=['01 — Cotton, before anything else.','02 — A mark made by light.','03 — A passing reflection.','04 — A fine line of oxblood.','05 — The whole impression.'];
const palettes={
 ivory:{paper:'#eee6d6',foil:'#c0a16a',ink:'#706252'},
 stone:{paper:'#aaa397',foil:'#e6d7b2',ink:'#413c35'},
 ink:{paper:'#303033',foil:'#d6d5cf',ink:'#cac6bc'}
};
let renderer,scene,camera,card,logo,paper,edge,logoMaterial,envelope,envelopeMat,signature,signatureMat;
let target=0,shown=0,velocity=0,playing=false,raf=0,last=0,visible=true,loaded=false;
let top=0,range=1,mobile=false,current=-1,palette='ivory',paletteDirty=false;
let px=0,py=0,tx=0,ty=0;
const paperTarget=new THREE.Color(palettes.ivory.paper),foilTarget=new THREE.Color(palettes.ivory.foil);
const inkTarget=new THREE.Color(palettes.ivory.ink);
const paperColor=paperTarget.clone(),foilColor=foilTarget.clone(),inkColor=inkTarget.clone();
const aim=new THREE.Vector3(),paintColor=new THREE.Color('#742a2a'),rawEdge=new THREE.Color('#c7bdab');
function request(){if(!raf&&loaded&&visible&&!document.hidden)raf=requestAnimationFrame(tick)}
function transport(){
 playLabel.textContent=playing?'Pause film':shown>.995?'Replay film':'Play the film';
 playIcon.textContent=playing?'Ⅱ':'▷';
 play.setAttribute('aria-label',playing?'Pause the card film':shown>.995?'Replay the card film':'Play the card film');
}
function stop(){playing=false;transport()}
function measure(){
 if(!renderer)return;
 const w=stage.clientWidth,h=stage.clientHeight;mobile=w<=650;
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1.65:1.8));
 renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
 top=sequence.getBoundingClientRect().top+scrollY;range=Math.max(1,sequence.offsetHeight-h);
 request();
}
function onScroll(){
 const next=clamp((scrollY-top)/range);
 if(playing)return;
 target=next;request();
}
function userScroll(){if(playing){stop();target=clamp((scrollY-top)/range);request()}}
function updateCopy(p){
 const i=p<.15?0:p<.36?1:p<.59?2:p<.82?3:4;
 if(i===current)return;current=i;
 chapters.forEach((el,j)=>{el.classList.toggle('active',i===j);el.setAttribute('aria-hidden',String(i!==j))});
 nav.forEach((el,j)=>{if(i===j)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current')});
 note.textContent=notes[i];
}
function makeSignature(){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;
 const ctx=canvas.getContext('2d');ctx.clearRect(0,0,1024,256);
 ctx.fillStyle='#ffffff';ctx.font='500 55px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
 const word='ESTIENNE',tracking=17,total=ctx.measureText(word).width+(word.length-1)*tracking;
 let x=(1024-total)/2;ctx.textAlign='left';
 for(const letter of word){ctx.fillText(letter,x,92);x+=ctx.measureText(letter).width+tracking}
 ctx.font='italic 34px Georgia';ctx.textAlign='center';ctx.fillText('Modern print studio',512,169);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 signatureMat=new THREE.MeshStandardMaterial({map:texture,color:inkColor,transparent:true,opacity:0,roughness:.65,metalness:.3,depthWrite:false});
 signature=new THREE.Mesh(new THREE.PlaneGeometry(3.2,.8),signatureMat);signature.position.set(1.83,-1.55,.043);card.add(signature);
}
function envelopeModel(){
 envelopeMat=new THREE.MeshStandardMaterial({color:'#d8cebc',roughness:1,transparent:true,opacity:0,depthWrite:false});
 envelope=new THREE.Group();
 const base=new THREE.Mesh(new THREE.BoxGeometry(9,5.9,.045),envelopeMat);base.receiveShadow=true;base.castShadow=true;envelope.add(base);
 const foldGeometry=new THREE.BufferGeometry();
 foldGeometry.setAttribute('position',new THREE.Float32BufferAttribute([-4.48,2.94,.026,0,-.25,.026,4.48,2.94,.026],3));
 foldGeometry.computeVertexNormals();
 const foldMat=envelopeMat.clone();foldMat.color.set('#e1d8c6');foldMat.side=THREE.DoubleSide;
 const fold=new THREE.Mesh(foldGeometry,foldMat);envelope.add(fold);envelope.userData.fold=foldMat;
 envelope.position.set(2.6,-.4,-.45);envelope.rotation.z=.13;envelope.scale.setScalar(mobile?.74:1);scene.add(envelope);
}
async function init(){
 try{
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setClearColor('#eeeae2');renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.VSMShadowMap;
  mount.appendChild(renderer.domElement);
  scene=new THREE.Scene();scene.background=new THREE.Color('#eeeae2');
  camera=new THREE.PerspectiveCamera(33,1,.1,100);
  const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);
  const environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.5;
  room.dispose();pmrem.dispose();
  scene.add(new THREE.HemisphereLight('#fff6e8','#a19888',.7));
  const key=new THREE.DirectionalLight('#fff4df',2.2);key.position.set(-3,6,10);key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:.1,far:35});
  key.shadow.bias=-.0002;key.shadow.normalBias=.015;key.shadow.radius=5;key.shadow.blurSamples=8;scene.add(key);
  const rim=new THREE.DirectionalLight('#ffffff',.65);rim.position.set(7,-1,4);scene.add(rim);
  const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshBasicMaterial({color:'#eeeae2',toneMapped:false}));
  backdrop.position.z=-1.6;scene.add(backdrop);
  const shadowCatcher=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.ShadowMaterial({color:'#5c4936',opacity:.10}));
  shadowCatcher.position.z=-1.59;shadowCatcher.receiveShadow=true;scene.add(shadowCatcher);
  const [texture,svgText]=await Promise.all([
   new THREE.TextureLoader().loadAsync(new URL('./cotton-paper.webp',import.meta.url).href),
   fetch(new URL('./estienne-monogram.svg',import.meta.url)).then(r=>{if(!r.ok)throw Error('Logo unavailable');return r.text()})
  ]);
  texture.colorSpace=THREE.NoColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(2.5,2.5);
  texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  paper=new THREE.MeshPhysicalMaterial({color:paperColor,roughness:.87,bumpMap:texture,bumpScale:.012,envMapIntensity:.65});
  edge=new THREE.MeshStandardMaterial({color:rawEdge,roughness:.93});
  card=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(8.5,5.5,.075),[edge,edge,edge,edge,paper,paper]);
  body.castShadow=true;body.receiveShadow=true;card.add(body);scene.add(card);
  const svg=new SVGLoader().parse(svgText.replace('fill="currentColor"','fill="#000000"'));
  const shapes=svg.paths.flatMap(path=>SVGLoader.createShapes(path));
  if(!shapes.length)throw Error('Logo geometry unavailable');
  const geometry=new THREE.ExtrudeGeometry(shapes,{depth:.55,bevelEnabled:true,bevelThickness:.19,bevelSize:.16,bevelSegments:3,steps:1,curveSegments:12});
  geometry.computeBoundingBox();const bounds=geometry.boundingBox,center=bounds.getCenter(new THREE.Vector3());
  geometry.translate(-center.x,-center.y,0);
  const scale=2.55/(bounds.max.y-bounds.min.y);
  logoMaterial=new THREE.MeshPhysicalMaterial({color:paperColor,metalness:0,roughness:.85,bumpMap:texture,bumpScale:.003,envMapIntensity:1.2});
  logo=new THREE.Mesh(geometry,logoMaterial);logo.scale.set(scale,-scale,scale);logo.position.set(-1.8,.12,.04);
  logo.castShadow=true;logo.receiveShadow=true;card.add(logo);
  envelopeModel();makeSignature();measure();
  loaded=true;document.body.classList.add('ready');play.disabled=false;
  shown=target=clamp((scrollY-top)/range);transport();renderFrame(shown,0);
  addEventListener('resize',measure);
  new ResizeObserver(measure).observe(stage);
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();stop();cancelAnimationFrame(raf);raf=0});
  renderer.domElement.addEventListener('webglcontextrestored',request);
  request();
 }catch(error){
  console.error('Card film:',error);
  document.body.classList.add('render-error');
  document.querySelector('.render-message').textContent='The interactive 3D view could not load. Please reload to try again.';
  play.disabled=true;
 }
}
function renderFrame(p,dt){
 const v=sampleTimeline(p),emboss=mix(.6,1,smooth(.03,.28,p)),foil=smooth(.36,.51,p);
 const colorRate=reduced.matches?1:1-Math.exp(-dt*8);
 paperColor.lerp(paperTarget,colorRate);foilColor.lerp(foilTarget,colorRate);inkColor.lerp(inkTarget,colorRate);
 paper.color.copy(paperColor);logoMaterial.color.copy(paperColor).multiplyScalar(.96).lerp(foilColor,foil);
 logoMaterial.metalness=foil*.94;logoMaterial.roughness=mix(.89,.29,foil);
 logoMaterial.bumpScale=mix(.003,.0008,foil);
 logo.visible=emboss>.001;logo.scale.z=(2.55/86.658)*Math.max(.001,emboss);
 signatureMat.color.copy(inkColor).lerp(foilColor,foil*.55);signatureMat.opacity=smooth(.4,.54,p);
 edge.color.copy(rawEdge).lerp(paintColor,smooth(.59,.73,p));
 px=mix(px,tx,colorRate);py=mix(py,ty,colorRate);
 if(reduced.matches){
  card.rotation.set(.03,-.07,-.04);card.position.set(mobile?0:2.3,mobile?2.3:0,.15);
  card.scale.setScalar(mobile?.74:1);camera.position.set(0,.7,mobile?27:17);
  aim.set(0,0,0);
 }else{
  const inertia=clamp(velocity*-.09,-.035,.035);
  card.rotation.set(v.r[0]+py*.025,v.r[1]+px*.04,v.r[2]+inertia);
  card.position.set(mobile?0:v.o[0],v.o[1]+(mobile?2.3:0),v.o[2]);card.scale.setScalar(v.s*(mobile?.74:1));
  camera.position.set(mobile?v.c[0]*.22:v.c[0],mobile?v.c[1]*.4:v.c[1],mobile?v.c[2]*1.1+10:v.c[2]);
  aim.set(mobile?0:v.a[0],mobile?.25:v.a[1],v.a[2]);
 }
 camera.lookAt(aim);
 const reveal=smooth(.79,.98,p);
 envelope.visible=reveal>.001;envelopeMat.opacity=reveal;envelope.userData.fold.opacity=reveal;
 envelope.position.set(mobile?.2:2.6,mix(-1.7,-.4,reveal)+(mobile?2.3:0),-.45);
 envelope.rotation.z=.13;envelope.scale.setScalar(mobile?.74:1);
 stage.style.setProperty('--progress',p);
 updateCopy(p);renderer.render(scene,camera);
 paletteDirty=["r","g","b"].some(k=>Math.abs(paperColor[k]-paperTarget[k])>.0008||Math.abs(foilColor[k]-foilTarget[k])>.0008);
}
function tick(now){
 raf=0;if(!loaded||!visible||document.hidden)return;
 const dt=Math.min(.05,last?(now-last)/1000:1/60);last=now;
 if(playing){target=clamp(target+dt/26);if(target>=1)playing=false}
 if(reduced.matches){shown=target;velocity=0}
 else{
  const next=springStep(shown,velocity,target,dt,9);
  shown=clamp(next.value);velocity=next.velocity;
  if(Math.abs(shown-target)<.000015&&Math.abs(velocity)<.00015){shown=target;velocity=0}
 }
 renderFrame(shown,dt);transport();
 if(playing||shown!==target||paletteDirty||Math.abs(px-tx)>.001||Math.abs(py-ty)>.001)request();
 else last=0;
}
play.addEventListener('click',()=>{
 if(!loaded)return;
 if(playing)stop();
 else{if(shown>.995){target=shown=velocity=0}playing=true;last=0;transport();request()}
});
nav.forEach((button,i)=>button.addEventListener('click',()=>{
 stop();target=stops[i];
 window.scrollTo({top:top+range*target,behavior:reduced.matches?'instant':'smooth'});request();
}));
swatches.forEach(button=>button.addEventListener('click',()=>{
 palette=button.dataset.paper;
 swatches.forEach(el=>el.setAttribute('aria-pressed',String(el===button)));
 paperTarget.set(palettes[palette].paper);foilTarget.set(palettes[palette].foil);inkTarget.set(palettes[palette].ink);
 paletteDirty=true;request();
}));
stage.addEventListener('pointermove',event=>{
 if(event.pointerType!=='mouse'||reduced.matches)return;
 const r=stage.getBoundingClientRect();tx=(event.clientX/r.width-.5)*2;ty=((event.clientY-r.top)/r.height-.5)*2;request();
});
stage.addEventListener('pointerleave',()=>{tx=ty=0;request()});
addEventListener('scroll',onScroll,{passive:true});
addEventListener('wheel',userScroll,{passive:true});
addEventListener('touchstart',userScroll,{passive:true});
addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key))userScroll()});
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){stop();cancelAnimationFrame(raf);raf=0;last=0}else request();
});
new IntersectionObserver(entries=>{
 visible=entries[0].isIntersecting;
 if(visible)request();else{stop();cancelAnimationFrame(raf);raf=0;last=0}
},{threshold:0}).observe(stage);
reduced.addEventListener('change',()=>{
 stop();play.hidden=reduced.matches;tx=ty=0;request();
});
play.hidden=reduced.matches;
init();

