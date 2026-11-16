/* Technology: a procedural holographic wireframe city (canvas, simple perspective camera)
   with the seven modules pinned to buildings. Motion is kept calm: a slow camera drift,
   a few soft lights along the streets, and a building that lights up when its tag is hovered. */
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var css = getComputedStyle(document.documentElement);
  function tok(n) { return css.getPropertyValue(n).trim(); }
  function rgb(hex) { var n = parseInt(hex.replace('#', ''), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + Math.max(0, Math.min(1, a)).toFixed(3) + ')'; }

  /* header */
  var header = document.querySelector('.site-header');
  function onScroll() { header.classList.toggle('scrolled', window.scrollY > 24); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  var section = document.getElementById('city');
  var canvas = document.getElementById('city-canvas');
  var tagLayer = document.getElementById('city-tags');
  if (!section || !canvas) return;
  var ctx = canvas.getContext('2d');
  var COL = { edge: rgb(tok('--city-edge') || tok('--viz-line-hi')), face: rgb(tok('--city-face') || tok('--viz-line')), line: rgb(tok('--city-face') || tok('--viz-line')), hi: rgb(tok('--viz-line-hi')), glow: rgb(tok('--glow-champagne')), bronze: rgb(tok('--bronze-300')), warm: rgb(tok('--white')) };   // warm = the hover highlight

  /* ---------- the city (seeded, so it is the same on every visit) ---------- */
  var seed = 20150901;
  function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }

  var CENTER = { x: 0, z: 46 };
  function tower(x, z, w, d, h, steps) {
    var tiers = [], y = 0, cw = w, cd = d;
    for (var i = 0; i < steps.length; i++) {
      var top = h * steps[i];
      tiers.push({ w: cw, d: cd, y0: y, y1: top });
      y = top; cw *= 0.74; cd *= 0.74;
    }
    return { x: x, z: z, tiers: tiers, top: h, spire: 0, label: -1 };
  }

  // the modules sit on these buildings, spread across the skyline at different heights
  var LANDMARKS = [
    [-50, 40, 5.5, 26], [-28, 66, 6, 44], [-14, 20, 5, 12], [24, 78, 6, 58], [16, 26, 5.5, 22], [40, 56, 6, 36], [54, 22, 5, 14]
  ];
  var buildings = [];
  LANDMARKS.forEach(function (L, i) {
    var b = tower(L[0], L[1], L[2], L[2] * (0.8 + rnd() * 0.3), L[3], i % 2 ? [0.62, 0.86, 1] : [0.78, 1]);
    b.label = i; buildings.push(b);
  });
  // a signature stepped tower with a spire, a nod to the Dubai skyline
  var sig = tower(2, 74, 8, 8, 54, [0.28, 0.46, 0.62, 0.76, 0.88, 1]);
  sig.spire = 12; buildings.push(sig);

  function clear(x, z, r) {
    for (var i = 0; i < buildings.length; i++) {
      var b = buildings[i], s = b.tiers[0].w / 2 + r;
      if (Math.abs(b.x - x) < s + 2.5 && Math.abs(b.z - z) < s + 2.5) return false;
    }
    return true;
  }
  for (var gx = -10; gx <= 10; gx++) {
    for (var gz = -5; gz <= 12; gz++) {
      var x = gx * 7 + (rnd() - 0.5) * 1.6, z = CENTER.z + gz * 7 + (rnd() - 0.5) * 1.6;
      var dx = x - CENTER.x, dz = (z - CENTER.z) * 1.3;
      var dist2 = dx * dx + dz * dz;
      if (rnd() > 0.46 || dist2 > 4200) continue;
      var w = 2.6 + rnd() * 2.4;
      if (!clear(x, z, w / 2)) continue;
      var h = 4 + rnd() * 6 + 34 * Math.exp(-dist2 / 900) * (0.4 + rnd() * 0.8);
      var steps = rnd() < 0.5 ? [1] : rnd() < 0.6 ? [0.7, 1] : [0.55, 0.8, 1];
      buildings.push(tower(x, z, w, w * (0.75 + rnd() * 0.5), h, steps));
    }
  }

  /* ---------- camera ---------- */
  var W = 0, H = 0, dpr = 1, f = 1;
  var cam = { x: 0, y: 34, z: 0, yaw: 0, pitch: 0.24, cos: 1, sin: 0, pc: 1, ps: 0 };
  var R = 118, orbit = 0, parallax = 0, parallaxT = 0;
  function setCamera(a) {
    cam.x = CENTER.x + Math.sin(a) * R;
    cam.z = CENTER.z - Math.cos(a) * R;
    cam.yaw = -a; cam.cos = Math.cos(cam.yaw); cam.sin = Math.sin(cam.yaw);
    cam.pc = Math.cos(cam.pitch); cam.ps = Math.sin(cam.pitch);
  }
  var out = { x: 0, y: 0, z: 0 };
  function project(x, y, z) {
    var dx = x - cam.x, dy = y - cam.y, dz = z - cam.z;
    var x1 = dx * cam.cos - dz * cam.sin, z1 = dx * cam.sin + dz * cam.cos;
    var y2 = dy * cam.pc + z1 * cam.ps, z2 = -dy * cam.ps + z1 * cam.pc;
    if (z2 < 1) return null;
    out.x = W / 2 + x1 * f / z2; out.y = H * 0.77 - y2 * f / z2; out.z = z2;
    return out;
  }
  function seg(x0, y0, z0, x1, y1, z1) {
    var a = project(x0, y0, z0); if (!a) return;
    var ax = a.x, ay = a.y;
    var b = project(x1, y1, z1); if (!b) return;
    ctx.moveTo(ax, ay); ctx.lineTo(b.x, b.y);
  }
  function fade(z) { return Math.max(0.12, Math.min(1, (230 - z) / 130)); }

  /* ---------- drawing ---------- */
  var active = -1, t = 0;
  function drawGround() {
    ctx.lineWidth = 1;
    for (var zz = -80; zz < 150; zz += 10) {
      var a = fade(zz - cam.z) * 0.3;
      ctx.strokeStyle = rgba(COL.line, a);
      ctx.beginPath();
      for (var xx = -140; xx <= 140; xx += 3.5) seg(xx, 0, zz, xx, 0, zz + 10);   // lines running away from us
      for (var k = 0; k < 10; k += 3.5) seg(-140, 0, zz + k, 140, 0, zz + k);     // cross lines
      ctx.stroke();
    }
  }
  function drawBuilding(b) {
    var p = project(b.x, 0, b.z); if (!p) return;
    var depth = p.z, a = fade(depth) * 0.75;
    var lit = b.label >= 0 && b.label === active;
    var col = lit ? COL.warm : COL.edge;
    var detail = depth < 175;
    for (var i = 0; i < b.tiers.length; i++) {
      var tr = b.tiers[i], x0 = b.x - tr.w / 2, x1 = b.x + tr.w / 2, z0 = b.z - tr.d / 2, z1 = b.z + tr.d / 2;
      // facade: floor lines and mullions, faint
      if (detail) {
        ctx.strokeStyle = rgba(lit ? COL.warm : COL.face, (lit ? 0.55 : 0.32) * a);
        ctx.beginPath();
        var fh = 3.2;
        for (var y = tr.y0 + fh; y < tr.y1 - 0.2; y += fh) {
          seg(x0, y, z0, x1, y, z0); seg(x1, y, z0, x1, y, z1); seg(x1, y, z1, x0, y, z1); seg(x0, y, z1, x0, y, z0);
        }
        var cell = 2.2, n = Math.max(1, Math.round(tr.w / cell)), m = Math.max(1, Math.round(tr.d / cell));
        for (var k = 1; k < n; k++) { var xx = x0 + (x1 - x0) * k / n; seg(xx, tr.y0, z0, xx, tr.y1, z0); seg(xx, tr.y0, z1, xx, tr.y1, z1); }
        for (k = 1; k < m; k++) { var zz = z0 + (z1 - z0) * k / m; seg(x0, tr.y0, zz, x0, tr.y1, zz); seg(x1, tr.y0, zz, x1, tr.y1, zz); }
        ctx.stroke();
      }
      // structure: corners and the tier's top and bottom edges, brighter
      ctx.strokeStyle = rgba(col, (lit ? 1 : 0.7) * a);
      ctx.beginPath();
      seg(x0, tr.y0, z0, x0, tr.y1, z0); seg(x1, tr.y0, z0, x1, tr.y1, z0); seg(x1, tr.y0, z1, x1, tr.y1, z1); seg(x0, tr.y0, z1, x0, tr.y1, z1);
      var ys = [tr.y0, tr.y1];
      for (var j = 0; j < 2; j++) { var Y = ys[j]; seg(x0, Y, z0, x1, Y, z0); seg(x1, Y, z0, x1, Y, z1); seg(x1, Y, z1, x0, Y, z1); seg(x0, Y, z1, x0, Y, z0); }
      ctx.stroke();
    }
    if (b.spire) {
      ctx.strokeStyle = rgba(COL.glow, 0.8 * a); ctx.beginPath(); seg(b.x, b.top, b.z, b.x, b.top + b.spire, b.z); ctx.stroke();
    }
  }

  // soft lights travelling along a few streets
  var pulses = [];
  for (var q = 0; q < 6; q++) pulses.push({ x: (Math.floor(rnd() * 14) - 7) * 7 + 3.5, z: rnd() * 120, v: 5 + rnd() * 4, cross: rnd() < 0.4 });
  function drawPulses(dt) {
    pulses.forEach(function (p) {
      if (!reduced) p.z += p.v * dt;
      if (p.z > 130) p.z = -5;
      var x = p.cross ? -70 + ((p.z + 5) / 135) * 140 : p.x, z = p.cross ? CENTER.z + p.x * 0.6 : p.z;
      var s = project(x, 0.2, z); if (!s) return;
      var r = Math.max(2, 220 / s.z) * 1.4, a = fade(s.z) * 0.9;
      var g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
      g.addColorStop(0, rgba(COL.glow, a)); g.addColorStop(1, rgba(COL.glow, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill();
    });
  }

  /* ---------- tags ---------- */
  var names = Array.prototype.map.call(document.querySelectorAll('#rows .row-name'), function (n) { return n.textContent; });
  var tags = LANDMARKS.map(function (_, i) {
    var el = document.createElement('div');
    el.className = 'tag';
    el.innerHTML = '<i>' + ('0' + (i + 1)).slice(-2) + '</i><span></span>';
    el.lastChild.textContent = names[i] || '';
    el.addEventListener('pointerenter', function () { active = i; el.classList.add('active'); if (reduced) frame(0); });
    el.addEventListener('pointerleave', function () { active = -1; el.classList.remove('active'); if (reduced) frame(0); });
    tagLayer.appendChild(el);
    return el;
  });
  var LEAD = 26;
  function placeTags() {
    if (!tagLayer.offsetParent) return;
    buildings.forEach(function (b) {
      if (b.label < 0) return;
      var s = project(b.x, b.top + 0.6, b.z), el = tags[b.label];
      if (!s) { el.style.visibility = 'hidden'; return; }
      el.style.visibility = '';
      el.style.transform = 'translate(' + (s.x - el.offsetWidth / 2).toFixed(1) + 'px,' + (s.y - LEAD - el.offsetHeight).toFixed(1) + 'px)';
      // leader line and pin
      var lit = b.label === active;
      ctx.strokeStyle = rgba(lit ? COL.warm : COL.hi, lit ? 0.95 : 0.55); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x, s.y - LEAD); ctx.stroke();
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = rgba(lit ? COL.warm : COL.hi, 0.95); ctx.fillRect(-2.5, -2.5, 5, 5); ctx.restore();
    });
  }

  function frame(dt) {
    if (W < 40) return;
    setCamera(orbit + parallax);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    drawGround();
    drawPulses(dt);
    // far to near so near buildings sit on top
    buildings.sort(function (a, b) {
      var pa = project(a.x, 0, a.z), za = pa ? pa.z : 0, pb = project(b.x, 0, b.z), zb = pb ? pb.z : 0;
      return zb - za;
    });
    buildings.forEach(drawBuilding);
    ctx.globalCompositeOperation = 'source-over';
    placeTags();
  }

  function size() {
    var r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height; f = Math.max(W * 0.6, H * 0.95);
    canvas.width = W * dpr; canvas.height = H * dpr;
    frame(0);
  }

  var running = false, last = 0, skip = false;
  function loop(now) {
    if (!running) return;
    requestAnimationFrame(loop);
    skip = !skip; if (skip) return;            // ~30fps is plenty for a slow drift
    var dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
    t += dt;
    orbit = Math.sin(t * 0.14) * 0.3;          // a visible sway: about ±17°, one full swing every ~45s
    parallax += (parallaxT - parallax) * 0.04;
    frame(dt);
  }
  section.addEventListener('pointermove', function (e) {
    var r = section.getBoundingClientRect();
    parallaxT = ((e.clientX - r.left) / r.width - 0.5) * 0.06;
  });

  new ResizeObserver(size).observe(canvas);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(size);
  size();
  // tags fade in one after another once the city is on screen
  setTimeout(function () { tags.forEach(function (el, i) { setTimeout(function () { el.classList.add('shown'); }, i * 120); }); }, reduced ? 0 : 500);

  if (!reduced) {
    new IntersectionObserver(function (en) {
      var vis = en[0].isIntersecting;
      if (vis && !running) { running = true; last = 0; requestAnimationFrame(loop); }
      if (!vis) running = false;
    }).observe(section);
  }

  /* the phone list fades in like before */
  Array.prototype.forEach.call(document.querySelectorAll('.reveal'), function (el) { el.classList.add('in'); });
})();

/* Technology hero: a dot-matrix field in perspective that rolls slowly like a data surface.
   Ripples spread from the pointer; a few bright packets run along the rows. */
(function () {
  'use strict';
  var canvas = document.getElementById('hero-wave');
  if (!canvas) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var css = getComputedStyle(document.documentElement);
  function rgb(n) { var h = parseInt(css.getPropertyValue(n).trim().replace('#', ''), 16); return [h >> 16 & 255, h >> 8 & 255, h & 255]; }
  var DOT = rgb('--bronze-300'), HI = rgb('--glow-champagne');
  var ctx = canvas.getContext('2d'), W = 0, H = 0, dpr = 1, t = 0, running = false, last = 0;
  var COLS = 64, ROWS = 26, SPACING = 2.2;
  var ripple = { x: 0, z: 18, t: -10 }, pointer = null;
  var packets = [];
  for (var i = 0; i < 5; i++) packets.push({ row: 4 + Math.floor(Math.random() * (ROWS - 6)), u: Math.random(), v: 0.04 + Math.random() * 0.05 });

  // camera: low and looking slightly down across the field
  var camY = 6, camZ = -6, pitch = 0.2, pc = Math.cos(pitch), ps = Math.sin(pitch), f = 1;
  function project(x, y, z) {
    var dy = y - camY, dz = z - camZ;
    var y2 = dy * pc + dz * ps, z2 = -dy * ps + dz * pc;
    if (z2 < 0.5) return null;
    return { x: W / 2 + x * f / z2, y: H * 0.5 - y2 * f / z2, z: z2 };
  }
  function height(x, z, time) {
    var h = Math.sin(x * 0.22 + time * 0.5) * 0.55 + Math.sin(z * 0.3 - time * 0.35) * 0.45 + Math.sin((x + z) * 0.12 + time * 0.25) * 0.4;
    var age = time - ripple.t;
    if (age > 0 && age < 6) { // a ring travelling out from where the pointer was
      var d = Math.hypot(x - ripple.x, z - ripple.z), front = age * 7;
      h += Math.exp(-Math.pow(d - front, 2) / 6) * 1.1 * (1 - age / 6);
    }
    return h;
  }
  function draw() {
    if (W < 40) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    var half = (COLS - 1) * SPACING / 2;
    for (var r = ROWS - 1; r >= 0; r--) {
      var z = 4 + r * SPACING;
      for (var c = 0; c < COLS; c++) {
        var x = -half + c * SPACING, p = project(x, height(x, z, t) - 3, z);
        if (!p || p.x < -10 || p.x > W + 10) continue;
        var near = Math.max(0, Math.min(1, 1 - (p.z - 4) / (ROWS * SPACING)));
        var size = Math.min(2.3, Math.max(0.7, 1.8 * f / p.z / 7));
        ctx.fillStyle = 'rgba(' + DOT[0] + ',' + DOT[1] + ',' + DOT[2] + ',' + (0.22 + 0.62 * near).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, 6.283); ctx.fill();
      }
    }
    // packets: bright dots running along a row
    packets.forEach(function (k) {
      var z = 4 + k.row * SPACING, x = -half + k.u * half * 2, p = project(x, height(x, z, t) - 3, z);
      if (!p) return;
      var rad = Math.max(4, 70 / p.z);
      var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
      g.addColorStop(0, 'rgba(' + HI[0] + ',' + HI[1] + ',' + HI[2] + ',0.9)'); g.addColorStop(1, 'rgba(' + HI[0] + ',' + HI[1] + ',' + HI[2] + ',0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI * 2); ctx.fill();
    });
  }
  function size() {
    var r = canvas.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height; f = Math.max(W * 0.55, H * 0.8);
    canvas.width = W * dpr; canvas.height = H * dpr; draw();
  }
  function loop(now) {
    if (!running) return;
    requestAnimationFrame(loop);
    var dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now; t += dt;
    packets.forEach(function (k) { k.u += k.v * dt; if (k.u > 1) { k.u = 0; k.row = 4 + Math.floor(Math.random() * (ROWS - 6)); } });
    draw();
  }
  var hero = canvas.parentNode;
  hero.addEventListener('pointermove', function (e) {
    if (reduced) return;
    var r = hero.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width - 0.5;
    var now = t;
    if (!pointer || now - ripple.t > 1.4) { // start a new ring at most every 1.4s, so it stays calm
      ripple.x = nx * (COLS * SPACING) * 0.6; ripple.z = 10 + (1 - (e.clientY - r.top) / r.height) * 30; ripple.t = now; pointer = true;
    }
  });
  new ResizeObserver(size).observe(canvas);
  if (reduced) { size(); return; }
  new IntersectionObserver(function (en) {
    var vis = en[0].isIntersecting;
    if (vis && !running) { running = true; last = 0; requestAnimationFrame(loop); }
    if (!vis) running = false;
  }).observe(hero);
  window.__waveFrame = function (sec) { t = sec || 4; draw(); };   // review helper
})();
