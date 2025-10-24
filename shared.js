/* shared.js
   Shared animation helpers:
   - spawnBirds(canvasId, opts)
   - startGunnyServer(canvasId, opts)
   - specialEffect(containerElem, type, opts)
   - stopAllAnimations()
*/

/* Basic manager to hold running animation loops so pages can stop them when unloaded */
window.__DF = window.__DF || { loops: [], images: {} };

function createCanvasContext(containerSelectorOrElem){
  let container = (typeof containerSelectorOrElem === 'string') ? document.querySelector(containerSelectorOrElem) : containerSelectorOrElem;
  if(!container) return null;
  // if it's a canvas element return its context
  if(container.tagName && container.tagName.toLowerCase()==='canvas'){
    const c = container;
    const ctx = c.getContext('2d');
    function resize(){ c.width = c.clientWidth; c.height = c.clientHeight; }
    resize(); window.addEventListener('resize', resize);
    return { canvas: c, ctx, resize };
  }
  return null;
}

/* ---------- Birds animation ----------
   simply draws emojis or small shapes moving in sine waves
   opts: {count, colorEmoji}
*/
function spawnBirds(canvasId, opts={}) {
  const ctxInfo = createCanvasContext(document.getElementById(canvasId) || '#' + canvasId);
  if(!ctxInfo) return;
  const {canvas, ctx} = ctxInfo;
  const count = opts.count || 8;
  const birds = [];
  for(let i=0;i<count;i++){
    birds.push({
      x: Math.random()*canvas.width,
      y: Math.random()*canvas.height*0.5,
      speed: 0.4 + Math.random()*1.2,
      amp: 8 + Math.random()*22,
      phase: Math.random()*Math.PI*2,
      emoji: opts.emoji || '🐦',
      size: 22 + Math.random()*18
    });
  }

  let running = true;
  function frame(){
    if(!running) return;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    // subtle horizon hint
    // draw birds
    for(const b of birds){
      b.x += b.speed;
      b.phase += 0.02 * b.speed;
      b.y += Math.sin(b.phase) * 0.5;
      if(b.x > canvas.width + 60) b.x = -80;
      ctx.font = `${b.size}px serif`;
      ctx.fillText(b.emoji, b.x, b.y + (b.size*0.4));
    }
    requestAnimationFrame(frame);
  }
  frame();

  const id = '__birds_' + canvasId + '_' + Math.random().toString(36).slice(2,8);
  window.__DF.loops.push({id, stop: ()=> running = false});
  return id;
}

/* ---------- Gunny server visualization ----------
   draws orbiting orbs representing server nodes, pulsing rings
   opts: {nodes}
*/
function startGunnyServer(canvasId, opts={}) {
  const ctxInfo = createCanvasContext(document.getElementById(canvasId) || '#' + canvasId);
  if(!ctxInfo) return;
  const {canvas, ctx} = ctxInfo;
  const nodes = opts.nodes || 5;
  const center = {x: canvas.width/2, y: canvas.height/2};
  const orbs = [];
  for(let i=0;i<nodes;i++){
    const angle = (i/nodes) * Math.PI*2;
    orbs.push({
      angle,
      radius: 60 + Math.random()*90,
      speed: 0.002 + Math.random()*0.006,
      size: 8 + Math.random()*10,
      hue: 180 + Math.random()*140
    });
  }

  let t = 0;
  let running = true;
  function frame(){
    if(!running) return;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    // central core
    ctx.save();
    ctx.translate(center.x, center.y);
    // pulsing core
    ctx.beginPath();
    ctx.arc(0,0,28 + Math.sin(t*0.02)*6, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(120,200,255,0.12)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,200,255,0.22)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // draw orbits and nodes
    for(const o of orbs){
      o.angle += o.speed * (1 + Math.sin(t*0.001)*0.3);
      const x = Math.cos(o.angle) * o.radius;
      const y = Math.sin(o.angle) * o.radius * 0.6;
      // orbit trail
      ctx.beginPath();
      ctx.ellipse(0, 0, o.radius, o.radius*0.6, 0, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(255,255,255,0.02)`;
      ctx.lineWidth = 1;
      ctx.stroke();
      // node
      ctx.beginPath();
      ctx.arc(x, y, o.size, 0, Math.PI*2);
      ctx.fillStyle = `hsl(${o.hue} 70% 60% / 0.95)`;
      ctx.fill();
      // small glow
      const g = ctx.createRadialGradient(x,y,0,x,y,o.size*3);
      g.addColorStop(0, `hsla(${o.hue},70%,60%,0.12)`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(x-o.size*3,y-o.size*3,o.size*6,o.size*6);
    }
    ctx.restore();

    t++;
    requestAnimationFrame(frame);
  }
  frame();
  const id = '__gunny_' + canvasId + '_' + Math.random().toString(36).slice(2,8);
  window.__DF.loops.push({id, stop: ()=> running = false});
  return id;
}

/* ---------- Special effects helper ----------
   containerElem: DOM element (container div) or selector (string)
   type: 'scrolls' | 'holo' | 'storm' | 'fireworks' | 'flowers'
*/
function specialEffect(containerElem, type, opts={}) {
  const container = (typeof containerElem === 'string') ? document.querySelector(containerElem) : containerElem;
  if(!container) return;
  // overlay canvas
  let overlay = container.querySelector('.df-overlay-canvas');
  if(!overlay){
    overlay = document.createElement('canvas');
    overlay.className = 'df-overlay-canvas';
    overlay.style.position = 'absolute';
    overlay.style.left = 0; overlay.style.top = 0; overlay.style.width = '100%'; overlay.style.height = '100%';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = 999;
    container.appendChild(overlay);
  }
  const c = overlay;
  const ctx = c.getContext('2d');
  function resize(){ c.width = c.clientWidth; c.height = c.clientHeight; }
  resize(); window.addEventListener('resize', resize);

  // particle list
  const particles = [];
  let running = true;
  let lifetime = opts.duration || 2000;

  function spawnParticle(x,y,ix){
    const p = {
      x, y,
      vx: (Math.random()-0.5) * 6 + (ix? ix*0.3:0),
      vy: (Math.random()-0.7) * 6 - 2,
      size: 6 + Math.random()*14,
      life: 60 + Math.random()*60,
      hue: Math.floor(Math.random()*60) + (type==='holo'?180:0)
    };
    particles.push(p);
  }

  // create effect-specific spawns
  const start = performance.now();
  function frame(){
    if(!running) return;
    ctx.clearRect(0,0,c.width,c.height);
    const now = performance.now();
    // effect behaviors
    if(type === 'scrolls'){
      // floating parchment rectangles
      for(let i=0;i<6;i++){
        const sx = (c.width*0.1) + i*(c.width*0.12) + Math.sin((now/800) + i)*10;
        const sy = c.height*0.7 - (Math.sin(now/700 + i)*60);
        ctx.save(); ctx.translate(sx, sy);
        ctx.fillStyle = 'rgba(255,240,200,0.95)';
        ctx.fillRect(-40, -22, 80, 44);
        ctx.strokeStyle = 'rgba(120,90,20,0.6)';
        ctx.strokeRect(-40, -22, 80, 44);
        ctx.restore();
      }
    } else if(type === 'holo'){
      // holographic rings
      ctx.save();
      ctx.translate(c.width/2, c.height/2);
      const ring = Math.abs(Math.sin(now/400))*120 + 20;
      for(let r=0;r<4;r++){
        ctx.beginPath();
        ctx.arc(0,0, ring + r*20, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(120,220,255,${0.08 + r*0.06})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
      // occasional sparks
      if(Math.random() > 0.6) spawnParticle(c.width/2 + (Math.random()-0.5)*80, c.height/2 + (Math.random()-0.5)*80);
    } else if(type === 'storm'){
      // lightning flashes
      if(Math.random() > 0.92) {
        ctx.fillStyle = 'rgba(200,220,255,0.22)'; ctx.fillRect(0,0,c.width,c.height);
      }
      // swirling particles (sword sparks)
      if(Math.random() > 0.85) spawnParticle(Math.random()*c.width, Math.random()*c.height);
    } else if(type === 'fireworks'){
      // trigger bursts across top half
      if(Math.random() > 0.95) {
        const x = Math.random()*c.width;
        const y = Math.random()*c.height*0.6;
        for(let i=0;i<28;i++) {
          const ang = Math.PI*2*(i/28);
          particles.push({
            x, y,
            vx: Math.cos(ang)*(2+Math.random()*6),
            vy: Math.sin(ang)*(2+Math.random()*6),
            size: 2 + Math.random()*4, life: 40 + Math.random()*60, hue: Math.random()*360
          });
        }
      }
    } else if(type === 'flowers'){
      // spawn soft petals rising up
      if(Math.random() > 0.8) spawnParticle(Math.random()*c.width, c.height + 20);
    }

    // update & draw particles
    for(let i=particles.length-1;i>=0;i--){
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.life--;
      if(p.life <= 0) particles.splice(i,1);
      else {
        ctx.beginPath();
        if(type === 'flowers') { ctx.fillStyle = 'rgba(255,160,200,0.92)'; ctx.ellipse(p.x,p.y,p.size,p.size*0.6,0,0,Math.PI*2); ctx.fill(); }
        else ctx.fillStyle = `hsl(${p.hue},80%,60%)`, ctx.fillRect(p.x,p.y,p.size,p.size);
      }
    }

    if(now - start < lifetime) requestAnimationFrame(frame);
    else { running = false; ctx.clearRect(0,0,c.width,c.height); if(overlay.parentNode) overlay.remove(); }
  }

  frame();
  return { stop: ()=> running = false };
}

/* ---------- Stop all animations helper ---------- */
function stopAllAnimations(){
  if(!window.__DF || !window.__DF.loops) return;
  for(const L of window.__DF.loops) try{ L.stop(); }catch(e){}
  window.__DF.loops = [];
}
