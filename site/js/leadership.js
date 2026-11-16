/* Leadership: a winding road built from puzzle pieces, drawn in line with a simple
   perspective camera. The front pieces are still being placed: two loose pieces carry
   the leader cards, and one piece hovers above its gap. Calm motion only. */
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var css = getComputedStyle(document.documentElement);
  function tok(n) { return css.getPropertyValue(n).trim(); }
  function rgb(hex) { var n = parseInt(hex.replace('#', ''), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + Math.max(0, Math.min(1, a)).toFixed(3) + ')'; }

  var header = document.querySelector('.site-header');
  function onScroll() { header.classList.toggle('scrolled', window.scrollY > 24); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  var section = document.getElementById('road');
  var canvas = document.getElementById('road-canvas');
  var cards = Array.prototype.slice.call(document.querySelectorAll('.leader'));
  if (!section || !canvas) return;
  var ctx = canvas.getContext('2d');
  var COL = { edge: rgb(tok('--bronze-300')), border: rgb(tok('--cream')), glow: rgb(tok('--glow-champagne')), dim: rgb(tok('--neutral-500')) };

  /* ---------- road geometry, in road coordinates (a = across in world units, v = along) ---------- */
  var RW = 22, COLS = 3, CW = RW / COLS, L = CW, ROWS = 56, VMAX = ROWS * L, T = 1.1;
  function amp(v) { return 8 + v * 0.25; }
  function xc(v) { return amp(v) * Math.sin(v * 0.011 + 0.4) - amp(0) * Math.sin(0.4); }
  function dxc(v) { return (xc(v + 0.5) - xc(v - 0.5)); }
  // road coords -> world (x, z), offsetting along the centre line's normal so curves keep their width
  function world(a, v, flat) {
    if (flat) return { x: xc(0) + a, z: v };          // loose pieces sit square to the viewer
    var d = dxc(v), len = Math.sqrt(1 + d * d);
    return { x: xc(v) + a / len, z: v - a * d / len };
  }

  // classic jigsaw knob, as a polyline along a unit edge
  var KNOB = [[0, 0], [0.32, 0], [0.40, -0.03], [0.38, 0.08], [0.33, 0.18], [0.38, 0.28], [0.50, 0.31], [0.62, 0.28], [0.67, 0.18], [0.62, 0.08], [0.60, -0.03], [0.68, 0], [1, 0]];
  var KNOB_PTS = (function () {
    var out = [], P = KNOB;
    for (var i = 0; i < P.length - 1; i++) {
      var p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
      for (var s = 0; s < 4; s++) {
        var t = s / 4, t2 = t * t, t3 = t2 * t;
        out.push([
          0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
        ]);
      }
    }
    out.push([1, 0]);
    return out;
  })();
  function edge(a0, v0, a1, v1, dir, knob) {
    if (!knob || !dir) return [[a0, v0], [a1, v1]];
    var dx = a1 - a0, dv = v1 - v0, len = Math.hypot(dx, dv), nx = -dv / len, nv = dx / len;
    return KNOB_PTS.map(function (p) { return [a0 + dx * p[0] + nx * p[1] * len * dir, v0 + dv * p[0] + nv * p[1] * len * dir]; });
  }
  function dirH(r, c) { return (r * 7 + c * 3) % 2 ? 1 : -1; }
  function dirV(r, k) { return (r * 5 + k * 11) % 2 ? 1 : -1; }
  function colA(k) { return -RW / 2 + k * CW; }
  function H(r, c, knob) { return edge(colA(c), r * L, colA(c + 1), r * L, (r === 0 || r === ROWS) ? 0 : dirH(r, c), knob); }
  function V(r, k, knob) { return edge(colA(k), r * L, colA(k), (r + 1) * L, (k === 0 || k === COLS) ? 0 : dirV(r, k), knob); }
  function piece(r, c) {
    var e = [].concat(H(r, c, true), V(r, c + 1, true), H(r + 1, c, true).reverse(), V(r, c, true).reverse());
    return e;
  }

  /* ---------- camera ---------- */
  var W = 0, Hh = 0, dpr = 1, f = 1;
  var cam = { x: 0, y: 22, z: -36, pc: Math.cos(0.24), ps: Math.sin(0.24) };
  var P = { x: 0, y: 0, z: 0 };
  function project(x, y, z) {
    var dx = x - cam.x, dy = y - cam.y, dz = z - cam.z;
    var y2 = dy * cam.pc + dz * cam.ps, z2 = -dy * cam.ps + dz * cam.pc;
    if (z2 < 1) return null;
    P.x = W / 2 + dx * f / z2; P.y = Hh * 0.56 - y2 * f / z2; P.z = z2;
    return P;
  }
  function pathRoad(pts, y, shiftA, shiftV, flat) {
    var first = true;
    for (var i = 0; i < pts.length; i++) {
      var w = world(pts[i][0] + (shiftA || 0), pts[i][1] + (shiftV || 0), flat), s = project(w.x, y, w.z);
      if (!s) continue;
      if (first) { ctx.moveTo(s.x, s.y); first = false; } else ctx.lineTo(s.x, s.y);
    }
  }
  function depthAt(v) { var w = world(0, v), s = project(w.x, 0, w.z); return s ? s.z : 1e9; }
  function fade(z) { return Math.max(0.08, Math.min(1, (480 - z) / 330)); }

  /* ---------- drawing ---------- */
  function drawRoad(reach) {
    var vEnd = Math.min(VMAX, reach);
    // surface
    ctx.beginPath();
    var left = [], right = [];
    for (var v = 2 * L; v <= vEnd; v += 2) { left.push([-RW / 2, v]); right.push([RW / 2, v]); }
    pathRoad(left.concat(right.reverse()), 0);
    ctx.closePath();
    var g = ctx.createLinearGradient(0, Hh * 0.3, 0, Hh * 0.85);
    g.addColorStop(0, rgba(COL.edge, 0.015)); g.addColorStop(1, rgba(COL.edge, 0.07));
    ctx.fillStyle = g; ctx.fill();

    // puzzle seams, row by row (rows 0 and 1 are drawn as loose pieces)
    for (var r = 2; r < ROWS; r++) {
      if (r * L > vEnd) break;
      var z = depthAt(r * L + L / 2), px = L * f / z;
      if (px < 2.5) break;
      var knob = px > 9, a = fade(z) * (px > 9 ? 0.6 : 0.4);
      ctx.strokeStyle = rgba(COL.edge, a); ctx.lineWidth = 1;
      ctx.beginPath();
      for (var c = 0; c < COLS; c++) { pathRoad(H(r, c, knob), 0); }
      for (var k = 1; k < COLS; k++) { pathRoad(V(r, k, knob), 0); }
      ctx.stroke();
    }
    // the road's edges, with a lower line for the slab's thickness
    [[-RW / 2], [RW / 2]].forEach(function (s) {
      var pts = [];
      for (var v2 = 2 * L; v2 <= vEnd; v2 += 2) pts.push([s[0], v2]);
      ctx.strokeStyle = rgba(COL.border, 0.75); ctx.lineWidth = 1.2; ctx.beginPath(); pathRoad(pts, 0); ctx.stroke();
      ctx.strokeStyle = rgba(COL.border, 0.22); ctx.lineWidth = 1; ctx.beginPath(); pathRoad(pts, -T); ctx.stroke();
    });
  }
  function drawPiece(r, c, y, sa, sv, alpha, fill, flat) {
    var pts = piece(r, c);
    ctx.beginPath(); pathRoad(pts, y - T, sa, sv, flat); ctx.closePath();
    ctx.strokeStyle = rgba(COL.border, 0.2 * alpha); ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); pathRoad(pts, y, sa, sv, flat); ctx.closePath();
    if (fill) { ctx.fillStyle = rgba(COL.edge, fill); ctx.fill(); }
    ctx.strokeStyle = rgba(COL.border, 0.85 * alpha); ctx.lineWidth = 1.2; ctx.stroke();
  }
  // loose front pieces: two carry the leaders, the middle one is still being lowered into place
  var LOOSE = [{ r: 0, c: 0, sa: -12, sv: 2 }, { r: 0, c: 2, sa: 12, sv: 2 }];
  function drawFront(t, appear) {
    drawPiece(1, 0, 0, 0, 0, appear, 0.06);
    drawPiece(1, 2, 0, 0, 0, appear, 0.06);
    // the gap the hovering piece belongs in
    ctx.setLineDash([3, 5]);
    ctx.beginPath(); pathRoad(piece(1, 1), 0); ctx.closePath();
    ctx.strokeStyle = rgba(COL.edge, 0.45 * appear); ctx.lineWidth = 1; ctx.stroke();
    ctx.setLineDash([]);
    var lift = 2.4 + (reduced ? 0 : Math.sin(t * 1.1) * 0.5);
    drawPiece(1, 1, lift, 0, 0, appear, 0.1);
    if (window.innerWidth > 900) LOOSE.forEach(function (p) { drawPiece(p.r, p.c, 0, p.sa, p.sv, appear, 0.08, true); });
  }
  // a soft light travelling up the road every few seconds
  function drawPulse(t) {
    if (reduced) return;
    var k = (t % 8) / 8, v = 2 * L + k * (VMAX * 0.7);
    var w = world(0, v), s = project(w.x, 0.2, w.z); if (!s) return;
    var r = Math.max(3, 900 / s.z), a = (1 - k) * 0.7 * fade(s.z);
    var g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
    g.addColorStop(0, rgba(COL.glow, a)); g.addColorStop(1, rgba(COL.glow, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill();
  }

  /* leader cards stand on the two loose pieces */
  var LEAD = 26;
  function placeCards() {
    var ring = window.innerWidth > 900;
    if (!ring) return;   // on small screens the cards sit below the road instead
    LOOSE.forEach(function (p, i) {
      var a = colA(p.c) + CW / 2 + p.sa, v = p.r * L + L / 2 + p.sv;
      var w = world(a, v, true), s = project(w.x, 0, w.z); if (!s) return;
      var sx = s.x, sy = s.y;
      // pin and leader line
      ctx.strokeStyle = rgba(COL.border, 0.7); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - LEAD); ctx.stroke();
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(Math.PI / 4); ctx.fillStyle = rgba(COL.edge, 1); ctx.fillRect(-3, -3, 6, 6); ctx.restore();
      var el = cards[i]; if (!el || !ring) return;
      el.style.transform = 'translate(' + (sx - el.offsetWidth / 2).toFixed(1) + 'px,' + (sy - LEAD - el.offsetHeight).toFixed(1) + 'px)';
    });
  }

  /* ---------- frame loop: draw the static road once, then only the moving bits ---------- */
  var base = document.createElement('canvas'), bctx = base.getContext('2d');
  var built = false, reach = reduced ? VMAX : 0, t = 0, running = false, last = 0, intro = 0;
  function frame() {
    if (W < 40) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, Hh);
    if (reach < VMAX) { drawRoad(reach); built = false; }
    else {
      if (!built) { // cache the finished road
        base.width = canvas.width; base.height = canvas.height;
        var keep = ctx; ctx = bctx; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, Hh); drawRoad(VMAX); ctx = keep;
        built = true;
      }
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(base, 0, 0); ctx.restore();
    }
    drawPulse(t);
    drawFront(t, Math.min(1, intro));
    placeCards();
  }
  function size() {
    var r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; Hh = r.height; f = Math.max(Hh * 1.05, W * 0.6);
    canvas.width = W * dpr; canvas.height = Hh * dpr;
    built = false; frame();
  }
  function loop(now) {
    if (!running) return;
    requestAnimationFrame(loop);
    var dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
    t += dt;
    if (reach < VMAX) reach = Math.min(VMAX, reach + dt * VMAX / 1.8);   // the road draws itself away from us
    intro = Math.min(1, intro + dt / 1.2);
    frame();
  }

  window.__roadDone = function () { reach = VMAX; intro = 1; frame(); };  // review helper: jump to the finished state
  new ResizeObserver(size).observe(canvas);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(size);
  if (reduced) intro = 1;
  size();
  setTimeout(function () { cards.forEach(function (el, i) { setTimeout(function () { el.classList.add('shown'); }, i * 180); }); }, reduced ? 0 : 900);
  if (!reduced) {
    new IntersectionObserver(function (en) {
      var vis = en[0].isIntersecting;
      if (vis && !running) { running = true; last = 0; requestAnimationFrame(loop); }
      if (!vis) running = false;
    }).observe(section);
  } else { reach = VMAX; frame(); }
})();
