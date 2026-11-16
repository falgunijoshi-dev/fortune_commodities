/* Two halves of one globe.
   Dome (hero): the solid upper half. Land as warm dots, trading hubs that pulse,
   and price arcs that travel from each hub and converge on Dubai.
   Bowl (below the statement): the lower half as a wireframe, with the three
   markets the firm trades converging on the arbitrage desk at the pole. */
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
  var FONT_COND = tok('font-condensed') || 'sans-serif';
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
  function setup(canvas, draw) {
    var ctx = canvas.getContext('2d');
    var state = { w: 0, h: 0, dpr: 1, visible: true, t0: performance.now() };
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

  function drawDome(ctx, s, time) {
    var W = s.w, H = s.h; ctx.clearRect(0, 0, W, H);
    if (W < 20 || H < 20) return;
    var R = W * 0.43, cx = W / 2, cy = H / 2;
    // Turn the globe so Dubai faces the viewer, then sway gently either side.
    var rot = -55.3 * D2R + Math.sin(time * 0.05) * 0.55;
    var tilt = 0.18; // a little of the northern hemisphere tipped toward us

    // atmosphere halo
    var halo = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.22);
    halo.addColorStop(0, rgba(C.amber, 0));
    halo.addColorStop(0.28, rgba(C.champagne, 0.30));
    halo.addColorStop(0.36, rgba(C.amber, 0.16));
    halo.addColorStop(1, rgba(C.ember, 0));
    ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H);

    // body
    var body = ctx.createRadialGradient(cx - R * 0.25, cy - R * 0.55, R * 0.1, cx, cy, R);
    body.addColorStop(0, tok('globe-body-1'));
    body.addColorStop(0.55, tok('globe-body-2'));
    body.addColorStop(1, tok('globe-body-3'));
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = body; ctx.fill();

    // limb light
    var limb = ctx.createLinearGradient(0, cy - R, 0, cy);
    limb.addColorStop(0, rgba(C.champagne, 0.85));
    limb.addColorStop(0.5, rgba(C.amber, 0.35));
    limb.addColorStop(1, rgba(C.amber, 0));
    ctx.beginPath(); ctx.arc(cx, cy, R - 0.5, Math.PI, Math.PI * 2);
    ctx.lineWidth = 1.5; ctx.strokeStyle = limb; ctx.stroke();

    // land dots
    var pts = s.land || (s.land = landPoints(1.25));
    var base = Math.max(0.9, W / 900);
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i], q = project(p[0], p[1], rot, tilt);
      if (q.z <= 0.02) continue;
      var light = Math.max(0, -q.y * 0.55 + q.z * 0.6 - q.x * 0.15); // lit from the top
      var tw = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(time * 1.3 + p[2] * 40);
      var a = Math.min(1, 0.12 + light * 0.75 + tw * 0.08);
      var col = mix(C.dotLo, C.dotHi, Math.min(1, light * 0.9));
      ctx.fillStyle = rgba(col, a);
      var r = base * (0.55 + q.z * 0.6);
      ctx.fillRect(cx + q.x * R - r, cy + q.y * R - r, r * 2, r * 2);
    }

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
  var MARKETS = [
    { label: 'Foreign exchange', lat: -18, lon: -42 },
    { label: 'Precious metals', lat: -14, lon: 0 },
    { label: 'Commodities', lat: -18, lon: 42 }
  ];

  function drawBowl(ctx, s, time) {
    var W = s.w, H = s.h; ctx.clearRect(0, 0, W, H);
    if (W < 20 || H < 20) return;
    var R = W * 0.44, cx = W / 2, cy = H / 2;
    var rot = reduced ? 0 : time * 0.035;
    var tilt = -0.42; // seen from above: the equator becomes an ellipse

    function line(pts, front, back, width) {
      for (var k = 1; k < pts.length; k++) {
        var a = pts[k - 1], b = pts[k];
        var z = (a.z + b.z) / 2;
        ctx.beginPath(); ctx.moveTo(cx + a.x * R, cy + a.y * R); ctx.lineTo(cx + b.x * R, cy + b.y * R);
        ctx.strokeStyle = z > 0 ? rgba(front[0], front[1] * (0.35 + 0.65 * z)) : rgba(back[0], back[1]);
        ctx.lineWidth = width; ctx.stroke();
      }
    }

    // inner glow of the bowl
    var g = ctx.createRadialGradient(cx, cy + R * 0.35, 0, cx, cy + R * 0.2, R);
    g.addColorStop(0, rgba(C.ember, 0.16)); g.addColorStop(0.6, rgba(C.bronze800, 0.08)); g.addColorStop(1, rgba(C.bronze800, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

    // parallels (lower hemisphere)
    for (var lat = -75; lat <= 0; lat += 15) {
      var pts = [];
      for (var lon = 0; lon <= 360; lon += 4) pts.push(project(lat, lon, rot, tilt));
      var eq = lat === 0;
      line(pts, [eq ? C.lineHi : C.line, eq ? 0.75 : 0.42], [C.lineDim, eq ? 0.22 : 0.1], eq ? 1.4 : 1);
    }
    // meridians
    for (var m = 0; m < 360; m += 15) {
      var mp = [];
      for (var la = 0; la >= -90; la -= 3) mp.push(project(la, m, rot, tilt));
      line(mp, [C.line, 0.38], [C.lineDim, 0.08], 1);
    }
    // three slow orbits crossing the bowl, like price paths
    [[0.55, 0.8], [-0.7, 1.9], [0.3, 3.4]].forEach(function (o, i) {
      var inc = o[0], ph = o[1] + (reduced ? 0 : time * (0.05 + i * 0.015));
      var pts = [];
      for (var a = 0; a <= 360; a += 3) {
        var t = a * D2R;
        var v = [Math.cos(t), Math.sin(t) * Math.sin(inc), Math.sin(t) * Math.cos(inc)];
        var cr = Math.cos(ph), sr = Math.sin(ph);
        var x = v[0] * cr - v[2] * sr, z = v[0] * sr + v[2] * cr, y = v[1];
        var ll = toLatLon([x, y, z]);
        if (ll[0] > 2) { if (pts.length > 1) line(pts, [C.lineHi, 0.4], [C.lineDim, 0.1], 1.2); pts = []; continue; }
        pts.push(project(ll[0], ll[1], 0, tilt));
      }
      if (pts.length > 1) line(pts, [C.lineHi, 0.4], [C.lineDim, 0.1], 1.2);
    });

    // markets converging on the arbitrage desk at the pole
    var pole = project(-90, 0, 0, tilt), PX = cx + pole.x * R, PY = cy + pole.y * R;
    MARKETS.forEach(function (mk, i) {
      var spread = W < 800 ? 0.62 : 1; // pull the outer labels in on phones so they stay on screen
      var q = project(mk.lat, mk.lon * spread, 0, tilt), X = cx + q.x * R, Y = cy + q.y * R;
      // converging line with a pulse travelling down to the pole
      var lg = ctx.createLinearGradient(X, Y, PX, PY);
      lg.addColorStop(0, rgba(C.bronze300, 0.0)); lg.addColorStop(1, rgba(C.warmHi, 0.75));
      ctx.beginPath(); ctx.moveTo(X, Y); ctx.quadraticCurveTo((X + PX) / 2, Y + (PY - Y) * 0.75, PX, PY);
      ctx.strokeStyle = lg; ctx.lineWidth = 1.2; ctx.stroke();
      var t = reduced ? 0.5 : (time * 0.22 + i * 0.33) % 1;
      var mx = (X + PX) / 2, my = Y + (PY - Y) * 0.75;
      var bx = (1 - t) * (1 - t) * X + 2 * (1 - t) * t * mx + t * t * PX;
      var by = (1 - t) * (1 - t) * Y + 2 * (1 - t) * t * my + t * t * PY;
      ctx.beginPath(); ctx.arc(bx, by, 2.2, 0, Math.PI * 2); ctx.fillStyle = rgba(C.warmHi, 0.9); ctx.fill();
      node(X, Y, 7, mk.label, false);
    });
    node(PX, PY, 10, 'Arbitrage desk', true);

    function node(X, Y, r, label, main) {
      var halo = ctx.createRadialGradient(X, Y, 0, X, Y, r * 5);
      halo.addColorStop(0, rgba(C.warm, main ? 0.45 : 0.3)); halo.addColorStop(1, rgba(C.warm, 0));
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(X, Y, r * 5, 0, Math.PI * 2); ctx.fill();
      // angular marker: a diamond, echoing the logo's cut lines
      ctx.save(); ctx.translate(X, Y); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = rgba(main ? C.bronze500 : C.bronze800, 1); ctx.fillRect(-r / 1.4, -r / 1.4, r * 1.41, r * 1.41);
      ctx.strokeStyle = rgba(C.warmHi, 0.9); ctx.lineWidth = 1; ctx.strokeRect(-r / 1.4, -r / 1.4, r * 1.41, r * 1.41);
      ctx.restore();
      var fs = Math.max(12, Math.min(15, W / 90));
      ctx.font = '500 ' + fs + 'px ' + FONT_COND;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillStyle = rgba(main ? C.cream : C.text, 0.95);
      ctx.fillText(main ? label.toUpperCase() : label, X, main ? Y + r + 26 : Y - r - 10);
    }
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
