/* Two halves of one globe.
   Dome (hero): the solid upper half. Land as warm dots, trading hubs that pulse,
   and price arcs that travel from each hub and converge on Dubai.
   Bowl (joined beneath it): the lower half as a wireframe; the five pillars
   sit on it in HTML. */
(function () {
  'use strict';

  var css = getComputedStyle(document.documentElement);
  function tok(name) { return css.getPropertyValue('--' + name).trim(); }
  function rgb(hex) {
    hex = hex.replace('#', '');
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')'; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t | 0, a[1] + (b[1] - a[1]) * t | 0, a[2] + (b[2] - a[2]) * t | 0]; }

  var C = {
    bronze600: rgb(tok('bronze-600')), bronze500: rgb(tok('bronze')), bronze300: rgb(tok('bronze-300')),
    bronze200: rgb(tok('bronze-200')), bronze800: rgb(tok('bronze-800')), champagne: rgb(tok('glow-champagne')),
    amber: rgb(tok('glow-amber')), ember: rgb(tok('glow-ember')), cream: rgb(tok('cream')),
    text: rgb(tok('neutral-800')), muted: rgb(tok('neutral-600')),
    dotLo: rgb(tok('viz-dot-lo')), dotHi: rgb(tok('viz-dot-hi')),
    line: rgb(tok('viz-line')), lineDim: rgb(tok('viz-line-dim')), lineHi: rgb(tok('viz-line-hi')),
    warm: rgb(tok('viz-warm')), warmHi: rgb(tok('viz-warm-hi'))
  };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var D2R = Math.PI / 180;

  /* ---------- sphere maths ---------- */
  // Unit vector for lat/lon, rotated by `rot` around the vertical axis and tilted by `tilt` around the x axis.
  function project(lat, lon, rot, tilt) {
    var la = lat * D2R, lo = lon * D2R + rot;
    var x = Math.cos(la) * Math.sin(lo);
    var y = -Math.sin(la);
    var z = Math.cos(la) * Math.cos(lo);
    var ct = Math.cos(tilt), st = Math.sin(tilt);
    return { x: x, y: y * ct - z * st, z: y * st + z * ct };
  }
  function toVec(lat, lon) {
    var la = lat * D2R, lo = lon * D2R;
    return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)];
  }
  function toLatLon(v) {
    var n = Math.hypot(v[0], v[1], v[2]);
    return [Math.asin(v[1] / n) / D2R, Math.atan2(v[0], v[2]) / D2R];
  }
  // Great-circle point between a and b at t (slerp).
  function slerp(a, b, t) {
    var d = Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
    if (d < 1e-6) return a;
    var s = Math.sin(d), wa = Math.sin((1 - t) * d) / s, wb = Math.sin(t * d) / s;
    return [a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb];
  }

  /* ---------- land points from the mask ---------- */
  function landPoints(step) {
    var M = window.LAND_MASK; if (!M) return [];
    var raw = atob(M.data), bits = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) bits[i] = raw.charCodeAt(i);
    function land(lat, lon) {
      var j = Math.floor((90 - lat) / M.step), k = Math.floor((lon + 180) / M.step);
      if (j < 0 || j >= M.h) return false;
      k = ((k % M.w) + M.w) % M.w;
      var n = j * M.w + k;
      return (bits[n >> 3] >> (7 - (n & 7))) & 1;
    }
    var pts = [];
    for (var lat = -60; lat <= 84; lat += step) {
      var ls = step / Math.max(0.2, Math.cos(lat * D2R)); // keep dots evenly spaced toward the poles
      for (var lon = -180; lon < 180; lon += ls) {
        if (land(lat, lon)) pts.push([lat, lon, Math.random()]);
      }
    }
    return pts;
  }

  /* ---------- canvas helper ---------- */
  var T0 = performance.now();   // one clock for both halves, so they turn as one globe
  function setup(canvas, draw) {
    var ctx = canvas.getContext('2d');
    var state = { w: 0, h: 0, dpr: 1, visible: true, t0: T0 };
    function resize() {
      var r = canvas.getBoundingClientRect();
      state.dpr = Math.min(window.devicePixelRatio || 1, 2);
      state.w = r.width; state.h = r.height;
      canvas.width = Math.round(r.width * state.dpr);
      canvas.height = Math.round(r.height * state.dpr);
      ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
      if (reduced) draw(ctx, state, 0);
    }
    new ResizeObserver(resize).observe(canvas);
    new IntersectionObserver(function (e) { state.visible = e[0].isIntersecting; }, { rootMargin: '200px' }).observe(canvas);
    resize();
    if (reduced) { draw(ctx, state, 0); return; }
    (function loop(now) {
      if (state.visible) draw(ctx, state, (now - state.t0) / 1000);
      requestAnimationFrame(loop);
    })(performance.now());
  }

  /* ================= DOME ================= */
  var HUBS = [
    { name: 'Dubai', lat: 25.2, lon: 55.3, home: true },
    { name: 'London', lat: 51.5, lon: -0.1 },
    { name: 'Zurich', lat: 47.4, lon: 8.5 },
    { name: 'Mumbai', lat: 19.1, lon: 72.9 },
    { name: 'Singapore', lat: 1.35, lon: 103.8 },
    { name: 'Hong Kong', lat: 22.3, lon: 114.2 },
    { name: 'Shanghai', lat: 31.2, lon: 121.5 },
    { name: 'New York', lat: 40.7, lon: -74.0 },
    { name: 'Chicago', lat: 41.9, lon: -87.6 },
    { name: 'Tokyo', lat: 35.7, lon: 139.7 }
  ];
  var dubai = toVec(HUBS[0].lat, HUBS[0].lon);
  var ARCS = HUBS.slice(1).map(function (h, i) {
    var a = toVec(h.lat, h.lon), pts = [];
    for (var s = 0; s <= 48; s++) {
      var t = s / 48, v = slerp(a, dubai, t), lift = 1 + Math.sin(t * Math.PI) * 0.12;
      var ll = toLatLon(v); pts.push([ll[0], ll[1], lift]);
    }
    return { pts: pts, speed: 0.10 + (i % 3) * 0.025, offset: i * 0.37 };
  });

  /* ---------- one globe, drawn in two canvases ----------
     Both canvases are the same size with the sphere's centre on the seam between them,
     so everything below is drawn identically in each and the halves line up exactly. */
  var TILT = 0.18; // a little of the northern hemisphere tipped toward us
  function globeRot(time) { return -55.3 * D2R + Math.sin(time * 0.05) * 0.55; }   // Dubai faces the viewer, swaying gently
  function smooth(a, b, v) { var x = Math.max(0, Math.min(1, (v - a) / (b - a))); return x * x * (3 - 2 * x); }

  function sphereBase(ctx, cx, cy, R) {
    // atmosphere: a soft glow that fades out from the edge
    var halo = ctx.createRadialGradient(cx, cy, R * 0.98, cx, cy, R * 1.16);
    halo.addColorStop(0, rgba(C.amber, 0.20));
    halo.addColorStop(0.2, rgba(C.amber, 0.12));
    halo.addColorStop(0.5, rgba(C.ember, 0.05));
    halo.addColorStop(0.8, rgba(C.ember, 0.015));
    halo.addColorStop(1, rgba(C.ember, 0));
    ctx.fillStyle = halo; ctx.fillRect(cx - R * 1.2, cy - R * 1.2, R * 2.4, R * 2.4);
    // body
    var body = ctx.createRadialGradient(cx - R * 0.25, cy - R * 0.55, R * 0.1, cx, cy, R);
    body.addColorStop(0, tok('globe-body-1'));
    body.addColorStop(0.55, tok('globe-body-2'));
    body.addColorStop(1, tok('globe-body-3'));
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = body; ctx.fill();
    // inner atmosphere: the edge brightens softly from inside
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
    var inner = ctx.createRadialGradient(cx, cy, R * 0.8, cx, cy, R);
    inner.addColorStop(0, rgba(C.amber, 0));
    inner.addColorStop(0.75, rgba(C.amber, 0.04));
    inner.addColorStop(1, rgba(C.champagne, 0.16));
    ctx.fillStyle = inner; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.restore();
  }

  // Latitude and longitude lines on the front of the sphere. `fade(y)` sets how strong
  // they are at a height on screen (-1 top, 0 the seam, 1 bottom).
  function graticule(ctx, cx, cy, R, rot, fade, time) {
    function run(pts, a0, w) {
      for (var k = 1; k < pts.length; k++) {
        var a = pts[k - 1], b = pts[k];
        if (a.z <= 0 || b.z <= 0) continue;
        var f = fade((a.y + b.y) / 2); if (f <= 0.01) continue;
        ctx.beginPath(); ctx.moveTo(cx + a.x * R, cy + a.y * R); ctx.lineTo(cx + b.x * R, cy + b.y * R);
        ctx.strokeStyle = rgba(C.line, a0 * f * (0.3 + 0.7 * (a.z + b.z) / 2)); ctx.lineWidth = w; ctx.stroke();
      }
    }
    var lines = [];
    for (var lat = -75; lat <= 75; lat += 15) {
      var pts = [];
      for (var lon = 0; lon <= 360; lon += 3) pts.push(project(lat, lon, rot, TILT));
      run(pts, lat === 0 ? 0.34 : 0.22, lat === 0 ? 1.1 : 0.9);   // kept light, so the globe stays calm
      lines.push({ pts: pts, ring: true });
    }
    for (var m = 0; m < 360; m += 15) {
      var mp = [];
      for (var la = 90; la >= -90; la -= 3) mp.push(project(la, m, rot, TILT));   // top to bottom
      run(mp, 0.2, 0.9);
      lines.push({ pts: mp, ring: false });
    }
    if (!reduced) glint(ctx, cx, cy, R, lines, fade, time);
  }

  // A soft light that travels along one line at a time, then moves on to another.
  var GLINT_PERIOD = 3.4;
  function glint(ctx, cx, cy, R, lines, fade, time) {
    var n = Math.floor(time / GLINT_PERIOD), p = (time % GLINT_PERIOD) / GLINT_PERIOD;
    lines = lines.filter(function (l) {                      // skip lines that are faded out at the top
      for (var i = 0; i < l.pts.length; i++) if (l.pts[i].z > 0 && fade(l.pts[i].y) > 0.5) return true;
      return false;
    });
    if (!lines.length) return;
    var line = lines[(n * 13 + 5) % lines.length];
    // only the part of the line on the front of the globe, in order
    var src = line.pts, front = [];
    if (line.ring) {
      var start = -1;
      for (var i = 0; i < src.length - 1; i++) if (src[i].z <= 0 && src[i + 1].z > 0) { start = i + 1; break; }
      if (start < 0) start = 0;
      for (var k = 0; k < src.length - 1; k++) { var q = src[(start + k) % (src.length - 1)]; if (q.z > 0) front.push(q); else if (front.length) break; }
    } else {
      for (var j = 0; j < src.length; j++) if (src[j].z > 0) front.push(src[j]);
    }
    if (front.length < 4) return;
    var env = Math.sin(Math.PI * p);                       // eases in and out along the way
    var len = front.length - 1, tail = len * 0.22;
    var head = p * (len + tail);
    ctx.save(); ctx.lineCap = 'round';
    ctx.shadowColor = rgba(C.amber, 0.9); ctx.shadowBlur = 10;
    for (var t = 1; t <= len; t++) {
      var d = head - t; if (d < 0 || d > tail) continue;
      var a = front[t - 1], b = front[t];
      var f = fade((a.y + b.y) / 2); if (f <= 0.01) continue;
      var k2 = 1 - d / tail;
      ctx.beginPath(); ctx.moveTo(cx + a.x * R, cy + a.y * R); ctx.lineTo(cx + b.x * R, cy + b.y * R);
      ctx.strokeStyle = rgba(C.warmHi, 0.85 * k2 * k2 * f * env); ctx.lineWidth = 1.6; ctx.stroke();
    }
    ctx.restore();
  }

  // Land as warm dots. `fade(y)` as above.
  function landDots(ctx, s, cx, cy, R, rot, time, fade) {
    var pts = s.land || (s.land = landPoints(1.25));
    var base = Math.max(0.9, s.w / 900);
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i], q = project(p[0], p[1], rot, TILT);
      if (q.z <= 0.02) continue;
      var f = fade(q.y); if (f <= 0.01) continue;
      var light = Math.max(0, -q.y * 0.55 + q.z * 0.6 - q.x * 0.15); // lit from the top
      var tw = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(time * 1.3 + p[2] * 40);
      var a = Math.min(1, 0.12 + light * 0.75 + tw * 0.08) * f;
      ctx.fillStyle = rgba(mix(C.dotLo, C.dotHi, Math.min(1, light * 0.9)), a);
      var r = base * (0.55 + q.z * 0.6);
      ctx.fillRect(cx + q.x * R - r, cy + q.y * R - r, r * 2, r * 2);
    }
  }

  // the top half shows the land; toward the seam it gives way to line art
  function domeLines(y) { return smooth(-0.55, 0.05, y); }
  function domeDots(y)  { return 1 - 0.85 * smooth(-0.15, 0.35, y); }

  function drawDome(ctx, s, time) {
    var W = s.w, H = s.h; ctx.clearRect(0, 0, W, H);
    if (W < 20 || H < 20) return;
    var R = W * 0.43, cx = W / 2, cy = H / 2;
    var rot = globeRot(time), tilt = TILT;
    sphereBase(ctx, cx, cy, R);
    graticule(ctx, cx, cy, R, rot, domeLines, time);
    landDots(ctx, s, cx, cy, R, rot, time, domeDots);

    // price arcs converging on Dubai
    ctx.lineCap = 'round';
    ARCS.forEach(function (arc) {
      var prev = null;
      for (var k = 0; k < arc.pts.length; k++) {
        var a = arc.pts[k], q = project(a[0], a[1], rot, tilt);
        var X = cx + q.x * R * a[2], Y = cy + q.y * R * a[2];
        if (prev && q.z > 0 && prev.z > 0) {
          ctx.beginPath(); ctx.moveTo(prev.X, prev.Y); ctx.lineTo(X, Y);
          ctx.strokeStyle = rgba(C.bronze300, 0.10 + 0.22 * q.z); ctx.lineWidth = 1; ctx.stroke();
        }
        prev = { X: X, Y: Y, z: q.z };
      }
      // the travelling pulse
      var t = reduced ? 0.6 : (time * arc.speed + arc.offset) % 1;
      var n = arc.pts.length - 1, head = t * n;
      for (var j = 0; j < 10; j++) {
        var idx = Math.floor(head - j * 0.9);
        if (idx < 0 || idx > n) continue;
        var b = arc.pts[idx], qq = project(b[0], b[1], rot, tilt);
        if (qq.z <= 0) continue;
        ctx.beginPath();
        ctx.arc(cx + qq.x * R * b[2], cy + qq.y * R * b[2], Math.max(0.6, 2.2 - j * 0.2), 0, Math.PI * 2);
        ctx.fillStyle = rgba(C.warmHi, (1 - j / 10) * 0.9 * qq.z); ctx.fill();
      }
    });

    // hubs
    HUBS.forEach(function (h, i) {
      var q = project(h.lat, h.lon, rot, tilt);
      if (q.z <= 0.05) return;
      var X = cx + q.x * R, Y = cy + q.y * R;
      var ph = reduced ? 0.3 : ((time * 0.45 + i * 0.13) % 1);
      var big = h.home ? 2 : 1;
      ctx.beginPath(); ctx.arc(X, Y, (4 + ph * 18) * big, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(C.warm, (1 - ph) * 0.5 * q.z); ctx.lineWidth = 1; ctx.stroke();
      var g = ctx.createRadialGradient(X, Y, 0, X, Y, 10 * big);
      g.addColorStop(0, rgba(C.warmHi, 0.95 * q.z)); g.addColorStop(1, rgba(C.warm, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X, Y, 10 * big, 0, Math.PI * 2); ctx.fill();
    });
  }

  /* ================= BOWL ================= */
  function drawBowl(ctx, s, time) {
    var W = s.w, H = s.h; ctx.clearRect(0, 0, W, H);
    if (W < 20 || H < 20) return;
    var R = W * 0.43, cx = W / 2, cy = H / 2;
    var rot = globeRot(time);
    sphereBase(ctx, cx, cy, R);
    graticule(ctx, cx, cy, R, rot, domeLines, time);   // same functions as the top half, so lines and dots carry across the seam
    landDots(ctx, s, cx, cy, R, rot, time, domeDots);
  }

  /* ---------- header state ---------- */
  var header = document.querySelector('.site-header');
  function onScroll() { header.classList.toggle('scrolled', window.scrollY > 24); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  function start() {
    var dome = document.getElementById('dome'), bowl = document.getElementById('bowl');
    if (dome) setup(dome, drawDome);
    if (bowl) setup(bowl, drawBowl);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
})();
