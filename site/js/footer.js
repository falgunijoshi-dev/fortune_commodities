/* Footer: the spread band (two price lines that meet at the pointer),
   the self-lit wordmark, a live Dubai clock, copy-to-clipboard and back-to-top. */
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var css = getComputedStyle(document.documentElement);
  function tok(n) { return css.getPropertyValue(n).trim(); }
  function hexA(hex, a) {
    var h = hex.replace('#', ''), n = parseInt(h, 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  /* ---------- the spread ---------- */
  var band = document.getElementById('spread');
  var canvas = document.getElementById('spread-lines');
  if (band && canvas) {
    var ctx = canvas.getContext('2d');
    var C = {
      ask: tok('--viz-line-hi'), bid: tok('--bronze-400'),
      grid: tok('--neutral-300'), champ: tok('--glow-champagne'), label: tok('--neutral-500')
    };
    var W = 0, H = 0, dpr = 1;
    var meet = { x: 0.72, y: 0.27 }, target = { x: 0.72, y: 0.27 };
    var touched = false, running = false, t0 = performance.now();

    function size() {
      var r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!running) draw(performance.now());
    }

    // smooth "market noise" built from drifting sines, so the lines look live
    function noise(x, t, seed) {
      return Math.sin(x * 0.011 + t * 0.55 + seed) * 0.55 +
             Math.sin(x * 0.029 - t * 0.85 + seed * 2.1) * 0.3 +
             Math.sin(x * 0.083 + t * 1.6 + seed * 3.7) * 0.15;
    }

    function draw(now) {
      var t = reduced ? 0 : (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      if (W < 40 || H < 40) return;
      var mobile = W < 760;
      var mx = meet.x * W, my = meet.y * H;
      var g0 = Math.min(H * 0.2, 120), g1 = g0 * 0.55;
      var amp = mobile ? 14 : 22;

      // faint terminal grid
      ctx.lineWidth = 1;
      ctx.strokeStyle = hexA(C.grid, 0.35);
      ctx.beginPath();
      for (var gy = 0.5; gy < H; gy += 48) { ctx.moveTo(0, gy); ctx.lineTo(W, gy); }
      ctx.stroke();
      ctx.strokeStyle = hexA(C.grid, 0.18);
      ctx.beginPath();
      for (var gx = (mx % 96) + 0.5; gx < W; gx += 96) { ctx.moveTo(gx, 0); ctx.lineTo(gx, H); }
      ctx.stroke();

      // the two price lines
      var step = 4, ask = [], bid = [];
      for (var x = 0; x <= W + step; x += step) {
        var left = x < mx;
        var d = left ? (mx - x) / Math.max(mx, 1) : (x - mx) / Math.max(W - mx, 1);
        var gap = (left ? g0 : g1) * Math.pow(Math.min(d, 1), 1.15);
        var env = Math.min(1, gap / g0 * 1.4);
        ask.push([x, my - gap - noise(x, t, 0.0) * amp * env]);
        bid.push([x, my + gap + noise(x, t, 4.2) * amp * env]);
      }

      // the spread itself, shaded on the left, fading out toward the meet
      var fill = ctx.createLinearGradient(0, 0, mx, 0);
      fill.addColorStop(0, hexA(C.bid, 0.10));
      fill.addColorStop(1, hexA(C.bid, 0.0));
      ctx.fillStyle = fill;
      ctx.beginPath();
      ask.forEach(function (p, i) { if (p[0] <= mx) (i ? ctx.lineTo : ctx.moveTo).call(ctx, p[0], p[1]); });
      for (var j = bid.length - 1; j >= 0; j--) if (bid[j][0] <= mx) ctx.lineTo(bid[j][0], bid[j][1]);
      ctx.closePath(); ctx.fill();

      function stroke(pts, color, w) {
        var g = ctx.createLinearGradient(0, 0, W, 0);
        g.addColorStop(0, hexA(color, 0.15));
        g.addColorStop(Math.max(0.01, meet.x - 0.02), hexA(color, 0.95));
        g.addColorStop(Math.min(0.99, meet.x + 0.15), hexA(color, 0.45));
        g.addColorStop(1, hexA(color, 0.1));
        ctx.strokeStyle = g; ctx.lineWidth = w; ctx.lineJoin = 'round';
        ctx.beginPath();
        pts.forEach(function (p, i) { (i ? ctx.lineTo : ctx.moveTo).call(ctx, p[0], p[1]); });
        ctx.stroke();
      }
      stroke(ask, C.ask, 1.5);
      stroke(bid, C.bid, 1.5);

      // pulses travelling along each line into the meet
      if (!reduced) {
        var k = (t * 0.22) % 1;
        [[ask, C.champ], [bid, C.champ]].forEach(function (L, n) {
          var f = (k + n * 0.5) % 1, idx = Math.floor(f * mx / step);
          var p = L[0][idx]; if (!p) return;
          var r = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], 10);
          r.addColorStop(0, hexA(L[1], 0.9)); r.addColorStop(1, hexA(L[1], 0));
          ctx.fillStyle = r; ctx.beginPath(); ctx.arc(p[0], p[1], 10, 0, Math.PI * 2); ctx.fill();
        });
      }

      // crosshair at the meet
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = hexA(C.ask, 0.28); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(mx + 0.5, 0); ctx.lineTo(mx + 0.5, H); ctx.stroke();
      ctx.setLineDash([]);

      // the meeting point: a bronze diamond with a breathing halo
      var breathe = reduced ? 0.5 : (Math.sin(t * 2.2) + 1) / 2;
      var halo = ctx.createRadialGradient(mx, my, 0, mx, my, 46 + breathe * 14);
      halo.addColorStop(0, hexA(C.champ, 0.35)); halo.addColorStop(1, hexA(C.champ, 0));
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(mx, my, 60, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(mx, my); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = C.champ; ctx.fillRect(-4.5, -4.5, 9, 9);
      ctx.strokeStyle = hexA(C.ask, 0.5); ctx.strokeRect(-9, -9, 18, 18);
      ctx.restore();

      // terminal labels
      ctx.font = '500 11px ' + tok('--font-condensed');
      ctx.textBaseline = 'middle';
      ctx.fillStyle = hexA(C.ask, 0.8);
      ctx.fillText('ASK', 10, ask[2][1] - 14);
      ctx.fillStyle = hexA(C.bid, 0.9);
      ctx.fillText('BID', 10, bid[2][1] + 14);
      var tag = 'SPREAD CLOSED';
      ctx.fillStyle = hexA(C.champ, 0.85);
      var tw = ctx.measureText(tag).width;
      var tx = mx + 16 + tw > W - 8 ? mx - 16 - tw : mx + 16;
      ctx.fillText(tag, tx, my - 18);
    }

    function loop(now) {
      if (!running) return;
      if (!touched) { // idle: the meet drifts slowly so the band never looks static
        var s = (now - t0) / 1000;
        target.x = 0.7 + Math.sin(s * 0.35) * 0.12;
        target.y = 0.27 + Math.sin(s * 0.5) * 0.04;
      }
      meet.x += (target.x - meet.x) * 0.08;
      meet.y += (target.y - meet.y) * 0.08;
      draw(now);
      requestAnimationFrame(loop);
    }

    function point(e) {
      var r = band.getBoundingClientRect(), c = canvas.getBoundingClientRect();
      var x = (e.clientX - c.left) / c.width, y = (e.clientY - r.top) / r.height;
      target.x = Math.min(0.94, Math.max(0.12, x));
      target.y = Math.min(0.4, Math.max(0.16, y));
      if (!touched) { touched = true; band.classList.add('touched'); }
      if (reduced) { meet.x = target.x; meet.y = target.y; draw(performance.now()); }
    }
    band.addEventListener('pointermove', point);
    band.addEventListener('pointerdown', point);

    new ResizeObserver(size).observe(canvas);
    if (!reduced) {
      new IntersectionObserver(function (e) {
        var vis = e[0].isIntersecting;
        if (vis && !running) { running = true; requestAnimationFrame(loop); }
        if (!vis) running = false;
      }).observe(band);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(size);
  }

  /* ---------- wordmark lit by a light that zig-zags across on its own ---------- */
  // The light runs left to right, then straight back right to left, without stopping,
  // weaving up and down through the letters as it goes.
  var mark = document.getElementById('wordmark');
  if (mark && !reduced) {
    var PASS = 7, ZIGS = 4, sweeping = false, start = 0;   // seconds per pass across the word; up-and-down turns per pass
    function ease(p) { return 0.5 - Math.cos(p * Math.PI) / 2; }      // soft turn at each end
    function tri(v) { var f = v - Math.floor(v); return f < 0.5 ? f * 2 : 2 - f * 2; }   // 0..1..0 zig-zag
    function sweep(now) {
      if (!sweeping) return;
      var r = mark.getBoundingClientRect(), t = (now - start) / 1000 / PASS;
      var leg = Math.floor(t), p = t - leg, e = ease(p);
      var u = leg % 2 ? 1 - e : e;                                   // forward, then back
      var x = 0.03 * r.width + u * 0.94 * r.width;          // turns on the first and last letters, never off the word
      var z = tri(u * ZIGS);                                         // the zig-zag, tied to position so both directions trace the same path
      z = z * z * (3 - 2 * z);                                       // round the points slightly
      var y = r.height * (0.3 + z * 0.55);
      mark.style.setProperty('--mx', x.toFixed(0) + 'px');
      mark.style.setProperty('--my', y.toFixed(0) + 'px');
      requestAnimationFrame(sweep);
    }
    new IntersectionObserver(function (e) {
      if (e[0].isIntersecting && !sweeping) { sweeping = true; start = performance.now(); mark.classList.add('lit'); requestAnimationFrame(sweep); }
      if (!e[0].isIntersecting) { sweeping = false; mark.classList.remove('lit'); }
    }).observe(mark);
  }

  /* ---------- Dubai clock ---------- */
  var clock = document.getElementById('dubai-time');
  if (clock) {
    var fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dubai', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    var tick = function () { clock.textContent = fmt.format(new Date()); };
    tick(); setInterval(tick, 1000);
  }

  /* ---------- copy email ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('.copy'), function (b) {
    b.addEventListener('click', function () {
      var text = b.getAttribute('data-copy');
      var done = function () {
        b.textContent = 'Copied'; b.classList.add('done');
        clearTimeout(b._t);
        b._t = setTimeout(function () { b.textContent = 'Copy'; b.classList.remove('done'); }, 1600);
      };
      // the textarea route works synchronously inside the click; the async API is the backup
      var ok = false;
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch (err) {}
      document.body.removeChild(ta);
      if (ok) done();
      else if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () {});
    });
  });

  /* ---------- back to top ---------- */
  var top = document.querySelector('.to-top');
  if (top) top.addEventListener('click', function (e) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  });
})();
