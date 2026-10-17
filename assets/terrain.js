const film = document.querySelector('#film');
const screen = document.querySelector('.screen');
const video = document.querySelector('#canvas');
const play = document.querySelector('#play');
const label = play.querySelector('.play-label');
const icon = play.querySelector('.play-icon');
const scrub = document.querySelector('#scrub');
const status = document.querySelector('#load-status');
const captions = [...document.querySelectorAll('.caption')];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const sources = {master:'assets/film/terrain-4k.mp4',mobile:'assets/film/terrain-1080.mp4'};
const duration = 18;
const clamp = n => Math.max(0,Math.min(1,n));
let progress = 0, playing = false, frameCallback = 0, scrollPending = false, desiredTime = null;
function sync(time) {
  progress = clamp(time/duration);
  scrub.value = Math.round(progress*1000);
  document.querySelector('#time').textContent = `00:${String(Math.floor(progress*duration)).padStart(2,'0')} / 00:18`;
  screen.dataset.frame = Math.round(progress*432);
  captions.forEach(el => {
    const active = progress >= +el.dataset.from && progress < +el.dataset.to;
    el.classList.toggle('active',active); el.setAttribute('aria-hidden',String(!active));
  });
  if (!playing) label.textContent = progress >= .999 ? 'Replay the film' : 'Play the film';
}
function cancelTracking() {
  if (!frameCallback) return;
  if (video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(frameCallback);
  else cancelAnimationFrame(frameCallback);
  frameCallback = 0;
}
function track() {
  if (!playing) return;
  if (video.requestVideoFrameCallback) {
    frameCallback = video.requestVideoFrameCallback((now,metadata) => { frameCallback = 0; sync(metadata.mediaTime); track(); });
  } else {
    frameCallback = requestAnimationFrame(() => { frameCallback = 0; sync(video.currentTime); track(); });
  }
}
function setPlaying(value) {
  playing = value; cancelTracking();
  play.setAttribute('aria-pressed',String(value));
  icon.textContent = value ? 'Ⅱ' : '▷';
  label.textContent = value ? 'Pause the film' : progress >= .999 ? 'Replay the film' : 'Play the film';
  if (value) track();
}
function stop() { video.pause(); setPlaying(false); }
function applySeek() {
  if (desiredTime === null || video.readyState < 1 || video.seeking) return;
  const time = Math.min(desiredTime,Number.isFinite(video.duration) ? Math.max(0,video.duration-1/24) : duration);
  if (Math.abs(video.currentTime-time) > .0001) video.currentTime = time;
}
function seek(p) {
  stop(); desiredTime = clamp(p)*duration; sync(desiredTime); applySeek();
}
video.addEventListener('loadedmetadata',() => {
  screen.dataset.resolution = `${video.videoWidth}×${video.videoHeight}`;
  play.disabled = false;
  applySeek();
});
video.addEventListener('loadeddata',() => {
  screen.classList.add('ready'); play.disabled = false; status.textContent = '';
  if (desiredTime === null) sync(video.currentTime);
});
video.addEventListener('seeked',() => {
  if (desiredTime !== null && Math.abs(video.currentTime-desiredTime)>1/48) { applySeek(); return; }
  sync(video.currentTime);
});
video.addEventListener('play',() => setPlaying(true));
video.addEventListener('pause',() => setPlaying(false));
video.addEventListener('ended',() => { desiredTime = null; setPlaying(false); sync(duration); });
video.addEventListener('timeupdate',() => { if (playing && !video.requestVideoFrameCallback) sync(video.currentTime); });
video.addEventListener('error',() => { stop(); play.disabled = true; status.textContent = 'The film could not load. Reload to try again.'; });
play.addEventListener('click',async () => {
  if (playing) return stop();
  desiredTime = null;
  if (progress >= .999 || video.ended) { video.currentTime = 0; sync(0); }
  try { await video.play(); }
  catch { setPlaying(false); status.textContent = 'Tap play to start the film.'; }
});
scrub.addEventListener('input',() => seek(+scrub.value/1000));
function scrollPosition() {
  if (playing || reduced.matches) return;
  const box = film.getBoundingClientRect();
  seek(clamp(-box.top/(film.offsetHeight-innerHeight)));
}
addEventListener('scroll',() => {
  if (scrollPending) return; scrollPending = true;
  requestAnimationFrame(() => { scrollPending = false; scrollPosition(); });
},{passive:true});
for (const event of ['wheel','touchstart']) addEventListener(event,() => { if (playing) stop(); },{passive:true});
document.addEventListener('visibilitychange',() => { if (document.hidden) stop(); });
function init() {
  stop(); document.body.classList.toggle('reduced',reduced.matches);
  if (reduced.matches) {
    desiredTime = null; video.removeAttribute('src'); video.load(); screen.classList.remove('ready'); return;
  }
  desiredTime = progress*duration;
  video.src = matchMedia('(max-width: 650px)').matches ? sources.mobile : sources.master;
  video.load(); sync(desiredTime);
}
reduced.addEventListener('change',init);
init();
