/* What we do, hero: fine bronze lines fan in from both edges and meet at one point,
   the logo's idea of markets converging. Once drawn, the meeting point drifts slowly
   on its own (phones included); on desktop it also leans a little toward the pointer.
   Phones (720px and below): the title sits low and left, so the lines meet higher up, clear of it. */
(function () {
  'use strict';
  var canvas = document.getElementById('hero-lines');
  if (!canvas) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var css = getComputedStyle(document.documentElement);
  var line = css.getPropertyValue('--bronze-600').trim(), hi = css.getPropertyValue('--bronze-200').trim();
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, progress = reduced ? 1 : 0, t0 = 0, running = false;
  var lean = { x: 0, y: 0 }, leanTarget = { x: 0, y: 0 };
  var focus = { x: 0.5, y: 0.74 };

  function base() { return W > 720 ? { x: 0.5, y: 0.74 } : { x: 0.5, y: 0.44 }; }
  function hexA(hex, a) {
    var n = parseInt(hex.replace('#', ''), 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a.toFixed(3) + ')';
  }
  function size() {
    var r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var b = base(); focus.x = b.x; focus.y = b.y;
    draw();
  }
  function draw() {
    if (W < 40 || H < 40) return;
    ctx.clearRect(0, 0, W, H);
    var fx = focus.x * W, fy = focus.y * H, n = W < 720 ? 11 : 17;
    var e = 1 - Math.pow(1 - progress, 3);
    for (var side = -1; side <= 1; side += 2) {
      var x0 = side < 0 ? 0 : W;
      for (var i = 0; i < n; i++) {
        var y0 = H * (0.06 + 0.9 * i / (n - 1));
        var x1 = x0 + (fx - x0) * e, y1 = y0 + (fy - y0) * e;
        var g = ctx.createLinearGradient(x0, y0, fx, fy);
        var a = 0.05 + 0.2 * (1 - Math.abs(i - (n - 1) / 2) / ((n - 1) / 2));
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(0.55, hexA(line, a));
        g.addColorStop(1, hexA(hi, a * 1.6));
        ctx.strokeStyle = g; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
    }
    if (e > 0.95) { // the meeting point
      var halo = ctx.createRadialGradient(fx, fy, 0, fx, fy, 40);
      halo.addColorStop(0, hexA(hi, 0.35)); halo.addColorStop(1, hexA(hi, 0));
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(fx, fy, 40, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(fx, fy); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = hi; ctx.fillRect(-3.5, -3.5, 7, 7); ctx.restore();
    }
  }
  function loop(now) {
    if (!running) return;
    if (!t0) t0 = now;
    var t = (now - t0) / 1000;
    progress = Math.min(1, t / 1.8);
    // a slow figure-of-eight drift, eased in once the lines have met
    var k = Math.min(1, Math.max(0, t - 1.8) / 2);
    var b = base(), ax = W > 720 ? 0.05 : 0.12, ay = W > 720 ? 0.03 : 0.05;
    lean.x += (leanTarget.x - lean.x) * 0.06; lean.y += (leanTarget.y - lean.y) * 0.06;
    focus.x = b.x + k * ax * Math.sin(t * 0.35) + lean.x;
    focus.y = b.y + k * ay * Math.sin(t * 0.7) + lean.y;
    draw();
    requestAnimationFrame(loop);
  }

  new ResizeObserver(size).observe(canvas);
  if (!reduced) {
    var hero = canvas.parentNode;
    hero.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var r = hero.getBoundingClientRect();
      leanTarget.x = ((e.clientX - r.left) / r.width - 0.5) * 0.14;
      leanTarget.y = ((e.clientY - r.top) / r.height - 0.5) * 0.06;
    });
    hero.addEventListener('pointerleave', function () { leanTarget.x = 0; leanTarget.y = 0; });
    new IntersectionObserver(function (en) {
      var vis = en[0].isIntersecting;
      if (vis && !running) { running = true; requestAnimationFrame(loop); }
      if (!vis) running = false;
    }).observe(hero);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(size);
})();
