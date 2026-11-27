/* What we do, phones: a live market chart behind the title. A bronze price line with a soft
   area under it and quiet volume bars draws in from the left, then keeps ticking slowly:
   the line scrolls left as each new point forms at a glowing head. Purely decorative, no figures.
   The canvas only shows at 720px and below (what-we-do.css); elsewhere it stays idle. */
(function () {
  'use strict';
  var canvas = document.getElementById('hero-chart');
  if (!canvas) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var css = getComputedStyle(document.documentElement);
  var c300 = css.getPropertyValue('--bronze-300').trim() || '#cba07f';
  var c200 = css.getPropertyValue('--bronze-200').trim() || '#ddbfa4';
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, N = 34, vals = [], vols = [], f = 0, draw0 = reduced ? 1 : 0;
  var running = false, last = 0, t0 = 0, TICK = 1.6;   // seconds per new point

  function rgba(hex, a) {
    var n = parseInt(hex.replace('#', ''), 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  // a gently rising random walk that never leaves its band
  function next(v) {
    var drift = 0.012, pull = (0.55 - v) * 0.08;
    return Math.min(0.97, Math.max(0.03, v + drift * 0.4 + pull + (Math.random() - 0.5) * 0.16));
  }
  function seed() {
    vals = []; vols = [];
    var v = 0.22;
    for (var i = 0; i <= N; i++) { v = Math.min(0.97, Math.max(0.03, v + 0.02 + (Math.random() - 0.5) * 0.14)); vals.push(v); vols.push(0.25 + Math.random() * 0.75); }
  }
  function size() {
    var r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    if (W < 40 || H < 40) return;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }
  function draw() {
    if (W < 40 || H < 40) return;
    ctx.clearRect(0, 0, W, H);
    var step = (W * 0.84) / (N - 1), top = H * 0.24, band = H * 0.4, base = top + band + H * 0.06;
    var pts = [];
    for (var i = 0; i < N; i++) pts.push({ x: (i - f) * step, y: top + (1 - vals[i]) * band });
    // the head: the newest point forming between the last two values
    var hv = vals[N - 1] + (vals[N] - vals[N - 1]) * f;
    var head = { x: (N - 1) * step, y: top + (1 - hv) * band };
    pts[N - 1] = head;
    var clipX = draw0 * W;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, clipX, H); ctx.clip();

    // volume bars along the foot of the chart
    var bw = Math.max(2, step * 0.42);
    for (i = 0; i < N; i++) {
      var vh = vols[i] * H * 0.06, up = i === 0 || vals[i] >= vals[i - 1];
      ctx.fillStyle = rgba(c300, up ? 0.16 : 0.08);
      ctx.fillRect(pts[i].x - bw / 2, base - vh, bw, vh);
    }

    // the smoothed price path
    function path() {
      ctx.moveTo(pts[0].x, pts[0].y);
      for (var j = 1; j < pts.length - 1; j++) {
        var mx = (pts[j].x + pts[j + 1].x) / 2, my = (pts[j].y + pts[j + 1].y) / 2;
        ctx.quadraticCurveTo(pts[j].x, pts[j].y, mx, my);
      }
      ctx.lineTo(head.x, head.y);
    }
    // area under the line
    var g = ctx.createLinearGradient(0, top, 0, base);
    g.addColorStop(0, rgba(c300, 0.22)); g.addColorStop(1, rgba(c300, 0));
    ctx.beginPath(); path(); ctx.lineTo(head.x, base); ctx.lineTo(pts[0].x, base); ctx.closePath();
    ctx.fillStyle = g; ctx.fill();
    // the line, with a soft glow
    var lg = ctx.createLinearGradient(0, 0, head.x, 0);
    lg.addColorStop(0, rgba(c300, 0.15)); lg.addColorStop(0.6, rgba(c300, 0.6)); lg.addColorStop(1, rgba(c200, 0.95));
    ctx.beginPath(); path();
    ctx.strokeStyle = lg; ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
    ctx.shadowColor = rgba(c300, 0.6); ctx.shadowBlur = 10; ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

    if (draw0 > 0.97) {
      // a dashed level from the head to the edge, and the pulsing head
      ctx.setLineDash([3, 4]); ctx.strokeStyle = rgba(c300, 0.35); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(head.x + 8, head.y); ctx.lineTo(W, head.y); ctx.stroke(); ctx.setLineDash([]);
      var pulse = reduced ? 0.5 : (Math.sin(last * 2.4) + 1) / 2;
      var halo = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 18 + pulse * 10);
      halo.addColorStop(0, rgba(c200, 0.45)); halo.addColorStop(1, rgba(c200, 0));
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(head.x, head.y, 28, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c200; ctx.beginPath(); ctx.arc(head.x, head.y, 3, 0, Math.PI * 2); ctx.fill();
    }
  }
  function loop(now) {
    if (!running) return;
    if (!t0) t0 = now;
    var t = (now - t0) / 1000, dt = Math.min(0.1, t - last); last = t;
    if (draw0 < 1) { draw0 = Math.min(1, t / 2.2); draw0 = 1 - Math.pow(1 - draw0, 3); }
    else {
      f += dt / TICK;
      while (f >= 1) { f -= 1; vals.shift(); vols.shift(); vals.push(next(vals[vals.length - 1])); vols.push(0.25 + Math.random() * 0.75); }
    }
    draw();
    requestAnimationFrame(loop);
  }

  seed();
  new ResizeObserver(size).observe(canvas);
  if (!reduced) {
    var phone = window.matchMedia('(max-width: 720px)'), inView = false;
    function update() {
      var go = inView && phone.matches;
      if (go && !running) {
        running = true;
        requestAnimationFrame(function (n) {   // resume where it left off
          t0 = n - (draw0 < 1 ? 0 : 1e5); last = (n - t0) / 1000; loop(n);
        });
      }
      if (!go) running = false;
    }
    new IntersectionObserver(function (en) { inView = en[0].isIntersecting; update(); }).observe(canvas.parentNode.parentNode);
    phone.addEventListener('change', update);
  }
})();
