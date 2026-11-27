/* Who we are, hero: a quiet field of gold bars seen from above at an angle,
   drawn in dark bronze. One bar, just under the title, is lit in gold and
   catches a slow sheen. The field is drawn once; only the lit bar animates. */
(function () {
  'use strict';
  var canvas = document.getElementById('hero-gold');
  if (!canvas) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ctx = canvas.getContext('2d');
  var field = document.createElement('canvas'), fctx = field.getContext('2d');      // bars behind the lit one
  var fore = document.createElement('canvas'), gctx = fore.getContext('2d');       // bars in front of it
  var W = 0, H = 0, dpr = 1, s = 40, lit = null, running = false, t0 = 0, appear = reduced ? 1 : 0;

  // bar size in world units (s = one unit in px); iso projection
  var A = 2.2, B = 1.05, HT = 0.42, IN = 0.2, SX = 2.75, SY = 1.65;   // a square grid with clear gaps, so no bar touches another
  function iso(x, y, z, ox, oy) { return [ox + (x - y) * 0.866 * s, oy + (x + y) * 0.5 * s - z * s]; }
  function faces(X, Y, ox, oy) {
    var b = [[X, Y], [X + A, Y], [X + A, Y + B], [X, Y + B]].map(function (p) { return iso(p[0], p[1], 0, ox, oy); });
    var tp = [[X + IN, Y + IN], [X + A - IN, Y + IN], [X + A - IN, Y + B - IN], [X + IN, Y + B - IN]].map(function (p) { return iso(p[0], p[1], HT, ox, oy); });
    return {
      top: tp,
      right: [b[1], b[2], tp[2], tp[1]],     // the long end facing +x
      front: [b[3], b[2], tp[2], tp[3]],     // the long side facing +y
      c: iso(X + A / 2, Y + B / 2, HT, ox, oy)
    };
  }
  function poly(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); }
  function smooth(a, b, v) { var x = Math.max(0, Math.min(1, (v - a) / (b - a))); return x * x * (3 - 2 * x); }

  var bars = [];
  function layout() {
    bars = [];
    s = W > 720 ? Math.max(26, Math.min(48, W / 26)) : Math.max(32, W / 10.5);   // phones: larger bars
    var ox = W / 2, oy = H * 0.1;
    var span = Math.ceil((W + H) / (s * 1.2)) + 4;
    for (var gx = -span; gx <= span; gx++) {
      for (var gy = -span; gy <= span; gy++) {
        var X = gx * SX, Y = gy * SY;  // neat rows and columns, like a vault floor
        var f = faces(X, Y, ox, oy);
        if (f.c[0] < -s * 3 || f.c[0] > W + s * 3 || f.c[1] < -s * 2 || f.c[1] > H + s * 3) continue;
        bars.push({ X: X, Y: Y, f: f, d: X + Y });
      }
    }
    bars.sort(function (p, q) { return p.d - q.d; });     // back to front
    // the lit bar: the one closest to a point just under the title
    // phones: the title sits low and left, so the lit bar moves up and right, clear of it
    var tx = W > 720 ? W / 2 : W * 0.6, ty = H * (W > 760 ? 0.72 : W > 720 ? 0.68 : 0.5), best = 1e9;
    lit = null;
    bars.forEach(function (b) { var d = Math.hypot(b.f.c[0] - tx, b.f.c[1] - ty); if (d < best) { best = d; lit = b; } });
  }

  function drawField() {
    field.width = fore.width = canvas.width; field.height = fore.height = canvas.height;
    [fctx, gctx].forEach(function (c) { c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H); });
    bars.forEach(function (b) {
      if (b === lit) return;
      var c = b.d > lit.d ? gctx : fctx;   // keep the painter's order around the lit bar
      var cx = b.f.c[0], cy = b.f.c[1];
      // brighter low in the hero and near the lit bar; faint behind the title and at the edges
      var near = 1 - smooth(0, Math.max(W, H) * 0.62, Math.hypot(cx - lit.f.c[0], (cy - lit.f.c[1]) * 1.3));
      var a = (0.18 + 0.82 * smooth(H * 0.18, H * 0.85, cy)) * (0.25 + 0.75 * near);
      if (a < 0.02) return;
      c.globalAlpha = a;
      // no outlines: the faces read by their shading alone (lit top, darker sides)
      poly(c, b.f.front); c.fillStyle = '#17110c'; c.fill();
      poly(c, b.f.right); c.fillStyle = '#0e0a07'; c.fill();
      poly(c, b.f.top);   c.fillStyle = '#2a1f15'; c.fill();
    });
    fctx.globalAlpha = 1; gctx.globalAlpha = 1;
  }

  function drawLit(t) {
    if (!lit) return;
    var f = lit.f, k = appear;
    // warm glow on the floor around it
    var g = ctx.createRadialGradient(f.c[0], f.c[1] + s * 0.3, 0, f.c[0], f.c[1] + s * 0.3, s * 5.5);
    var pulse = reduced ? 1 : 0.85 + 0.15 * Math.sin(t * 1.2);
    g.addColorStop(0, 'rgba(232,184,110,' + (0.32 * k * pulse).toFixed(3) + ')');
    g.addColorStop(0.45, 'rgba(174,128,88,' + (0.12 * k).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(174,128,88,0)');
    ctx.fillStyle = g; ctx.fillRect(f.c[0] - s * 6, f.c[1] - s * 6, s * 12, s * 12);

    ctx.globalAlpha = k;
    var gf = ctx.createLinearGradient(f.front[0][0], f.front[2][1], f.front[0][0], f.front[0][1]);
    gf.addColorStop(0, '#d9a85a'); gf.addColorStop(1, '#8c5f2a');
    poly(ctx, f.front); ctx.fillStyle = gf; ctx.fill();
    var gr = ctx.createLinearGradient(f.right[3][0], f.right[3][1], f.right[1][0], f.right[1][1]);
    gr.addColorStop(0, '#a87436'); gr.addColorStop(1, '#5e3d1b');
    poly(ctx, f.right); ctx.fillStyle = gr; ctx.fill();
    var gt = ctx.createLinearGradient(f.top[0][0], f.top[0][1], f.top[2][0], f.top[2][1]);
    gt.addColorStop(0, '#fbe7bd'); gt.addColorStop(0.55, '#e9bf74'); gt.addColorStop(1, '#c48f45');
    poly(ctx, f.top); ctx.fillStyle = gt; ctx.fill();

    // a slow sheen travelling along the top face
    if (!reduced) {
      var p = (t % 5.5) / 5.5;
      if (p < 0.45) {
        var q = p / 0.45, x0 = f.top[0][0] + (f.top[2][0] - f.top[0][0]) * (q * 1.6 - 0.3);
        ctx.save(); poly(ctx, f.top); ctx.clip();
        var sh = ctx.createLinearGradient(x0 - s * 0.9, 0, x0 + s * 0.9, 0);
        sh.addColorStop(0, 'rgba(255,248,232,0)'); sh.addColorStop(0.5, 'rgba(255,248,232,.75)'); sh.addColorStop(1, 'rgba(255,248,232,0)');
        ctx.fillStyle = sh; ctx.fillRect(x0 - s, f.top[1][1] - s, s * 2, s * 3); ctx.restore();
      }
    }
    ctx.lineWidth = 1; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(255,236,200,.7)';
    poly(ctx, f.top); ctx.stroke();
    ctx.strokeStyle = 'rgba(232,184,110,.5)'; poly(ctx, f.front); ctx.stroke(); poly(ctx, f.right); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function frame(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(field, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawLit(t);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(fore, 0, 0);          // bars nearer the viewer pass in front of the lit one
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function size() {
    var r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    if (W < 10 || H < 10) return;
    canvas.width = W * dpr; canvas.height = H * dpr;
    layout(); drawField(); frame(t0);
  }
  function loop(now) {
    if (!running) return;
    requestAnimationFrame(loop);
    var t = now / 1000; t0 = t;
    if (appear < 1) appear = Math.min(1, appear + 0.012);   // the bar lights up after the title arrives
    frame(t);
  }

  window.__goldFrame = function () { appear = 1; frame(t0 + 1); };   // review helper
  new ResizeObserver(size).observe(canvas);
  size();
  if (!reduced) {
    new IntersectionObserver(function (e) {
      var vis = e[0].isIntersecting;
      if (vis && !running) { running = true; requestAnimationFrame(loop); }
      if (!vis) running = false;
    }).observe(canvas);
  }
})();
