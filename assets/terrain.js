const film = document.querySelector('#film');
const screen = document.querySelector('.screen');
const canvas = document.querySelector('#canvas');
const context = canvas.getContext('2d', { alpha: false });
const play = document.querySelector('#play');
const label = play.querySelector('.play-label');
const scrub = document.querySelector('#scrub');
const status = document.querySelector('#load-status');
const captions = [...document.querySelectorAll('.caption')];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const count = 433, duration = 18, blobs = new Map(), requests = new Map(), bitmaps = new Map(), decoding = new Map();
let progress = 0, target = 0, playing = false, start = 0, raf = 0, busy = 0, queue = [], generation = 0;
let drawPending = false;
const clamp = n => Math.max(0, Math.min(1, n));
const path = n => `assets/frames-v2/${String(n).padStart(4, '0')}.webp`;
async function fetchFrame(n) {
  if (blobs.has(n)) return blobs.get(n);
  if (requests.has(n)) return requests.get(n);
  const request = fetch(path(n)).then(r => {
    if (!r.ok) throw new Error('Frame unavailable');
    return r.blob();
  }).then(blob => { blobs.set(n, blob); return blob; }).finally(() => requests.delete(n));
  requests.set(n, request);
  return request;
}
async function decode(n) {
  if (bitmaps.has(n)) return bitmaps.get(n);
  if (decoding.has(n)) return decoding.get(n);
  const pending = decodeFrame(n).finally(() => decoding.delete(n));
  decoding.set(n, pending); return pending;
}
async function decodeFrame(n) {
  const blob = await fetchFrame(n);
  if (Math.abs(n - target) > 12 || reduced.matches) return null;
  const bitmap = await createImageBitmap(blob);
  if (Math.abs(n - target) > 12 || reduced.matches) { bitmap.close(); return null; }
  if (bitmaps.has(n)) bitmap.close(); else bitmaps.set(n, bitmap);
  for (const [i, image] of bitmaps) if (Math.abs(i - target) > 12) { image.close(); bitmaps.delete(i); }
  return bitmaps.get(n);
}
function requestDraw() {
  if (drawPending) return;
  drawPending = true;
  requestAnimationFrame(() => { drawPending = false; draw(); });
}
function draw() {
  if (reduced.matches || !bitmaps.size) return;
  const nearest = [...bitmaps.keys()].sort((a,b) => Math.abs(a-target)-Math.abs(b-target))[0];
  const position = progress*(count-1), lower = Math.floor(position), upper = Math.ceil(position);
  const blend = bitmaps.has(lower) && bitmaps.has(upper);
  const frame = bitmaps.get(blend ? lower : nearest);
  const box = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 1.5);
  const w = Math.round(box.width*dpr), h = Math.round(box.height*dpr);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  const contain = matchMedia('(max-width: 650px)').matches;
  const scale = (contain ? Math.min : Math.max)(w/frame.width, h/frame.height);
  context.fillStyle = '#d8d0c2'; context.fillRect(0,0,w,h);
  context.drawImage(frame,(w-frame.width*scale)/2,(h-frame.height*scale)/2,frame.width*scale,frame.height*scale);
  if (blend && upper !== lower) {
    context.globalAlpha = position-lower;
    context.drawImage(bitmaps.get(upper),(w-frame.width*scale)/2,(h-frame.height*scale)/2,frame.width*scale,frame.height*scale);
    context.globalAlpha = 1;
  }
  screen.classList.add('ready'); screen.dataset.frame = blend ? lower : nearest;
  screen.dataset.decoded = bitmaps.size;
  play.disabled = false;
  if (!playing) label.textContent = progress >= .999 ? 'Replay the film' : 'Play the film';
  status.textContent = '';
}
function show(p) {
  progress = clamp(p); target = Math.round(progress*(count-1));
  scrub.value = Math.round(progress*1000);
  document.querySelector('#time').textContent = `00:${String(Math.floor(progress*duration)).padStart(2,'0')} / 00:18`;
  captions.forEach(el => {
    const active = progress >= +el.dataset.from && progress < +el.dataset.to;
    el.classList.toggle('active', active); el.setAttribute('aria-hidden', String(!active));
  });
  requestDraw();
  decode(target).then(requestDraw).catch(() => { status.textContent = 'This moment could not load. Scrub to try again.'; });
  for (const n of [target+1,target-1,target+2,target-2]) if (n >= 0 && n < count) decode(n).then(requestDraw).catch(()=>{});
}
function stop() { playing = false; cancelAnimationFrame(raf); play.setAttribute('aria-pressed','false'); label.textContent = progress >= .999 ? 'Replay the film' : 'Play the film'; }
function tick(now) {
  if (!playing) return;
  show((now-start)/(duration*1000));
  if (progress >= 1) stop(); else raf = requestAnimationFrame(tick);
}
play.addEventListener('click', () => {
  if (playing) return stop();
  playing = true; if (progress >= .999) progress = 0;
  start = performance.now()-progress*duration*1000;
  label.textContent = 'Pause the film'; play.setAttribute('aria-pressed','true');
  raf = requestAnimationFrame(tick);
});
scrub.addEventListener('input', () => { stop(); show(+scrub.value/1000); });
let scrollPending = false;
function scrollPosition() {
  if (playing || reduced.matches) return;
  const box = film.getBoundingClientRect();
  show(clamp(-box.top/(film.offsetHeight-innerHeight)));
}
addEventListener('scroll', () => {
  if (scrollPending) return; scrollPending = true;
  requestAnimationFrame(() => { scrollPending = false; scrollPosition(); });
}, {passive:true});
for (const event of ['wheel','touchstart']) addEventListener(event, () => { if (playing) stop(); }, {passive:true});
addEventListener('resize', requestDraw);
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
function pump(token) {
  if (token !== generation || reduced.matches) return;
  while (busy < 4 && queue.length) {
    const n = queue.shift(); if (blobs.has(n)) continue;
    busy++;
    fetchFrame(n).catch(()=>{}).finally(() => { busy--; pump(generation); });
  }
}
function init() {
  generation++; stop();
  document.body.classList.toggle('reduced', reduced.matches);
  if (reduced.matches) {
    queue = []; for (const bitmap of bitmaps.values()) bitmap.close(); bitmaps.clear(); return;
  }
  show(progress);
  const order = new Set();
  for (const step of [32,16,8,4,2,1]) for (let i=0;i<count;i+=step) order.add(i);
  order.add(count-1); queue = [...order]; pump(generation);
}
reduced.addEventListener('change', init);
init();
