/* Who we are: header state, scroll reveals, word-by-word statement, the journey line,
   venture spotlight and the converging-lines hero. */
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var css = getComputedStyle(document.documentElement);
  function tok(n) { return css.getPropertyValue(n).trim(); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  /* ---------- header ---------- */
  var header = document.querySelector('.site-header');
  function onScrollHeader() { header.classList.toggle('scrolled', window.scrollY > 24); }

  /* ---------- reveal on scroll ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
  Array.prototype.forEach.call(document.querySelectorAll('.reveal'), function (el) { io.observe(el); });

  /* ---------- statement: split into words that light up as it scrolls through ---------- */
  var statement = document.querySelector('[data-words]');
  var words = [];
  if (statement) {
    var text = statement.textContent.trim().split(/\s+/);
    statement.textContent = '';
    text.forEach(function (w, i) {
      var s = document.createElement('span'); s.className = 'w'; s.textContent = w;
      statement.appendChild(s);
      if (i < text.length - 1) statement.appendChild(document.createTextNode(' '));
      words.push(s);
    });
  }
  function onScrollWords() {
    if (!words.length) return;
    var r = statement.getBoundingClientRect(), vh = window.innerHeight;
    // fully lit by the time the statement's top reaches 30% of the viewport
    var p = clamp((vh * 0.88 - r.top) / (vh * 0.58), 0, 1);
    var n = Math.round(p * words.length);
    for (var i = 0; i < words.length; i++) words[i].classList.toggle('on', i < n);
  }

  /* ---------- journey line ---------- */
  var journey = document.getElementById('journey');
  var timeline = journey && journey.querySelector('.timeline');
  var stones = timeline ? Array.prototype.slice.call(timeline.querySelectorAll('.milestone')) : [];
  function onScrollJourney() {
    if (!timeline) return;
    var r = timeline.getBoundingClientRect(), vh = window.innerHeight;
    var p = clamp((vh * 0.85 - r.top) / (vh * 0.45), 0, 1);
    journey.style.setProperty('--p', p.toFixed(3));
    stones.forEach(function (s) {
      var at = parseFloat(s.style.getPropertyValue('--at')) || 0;
      s.classList.toggle('lit', p >= at - 0.02);
    });
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () { ticking = false; onScrollHeader(); onScrollWords(); onScrollJourney(); });
  }
  if (reduced) { words.forEach(function (w) { w.classList.add('on'); }); }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScrollHeader(); onScrollWords(); onScrollJourney();
  if (reduced && journey) { journey.style.setProperty('--p', 1); stones.forEach(function (s) { s.classList.add('lit'); }); }

  /* ---------- venture spotlight ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('.venture'), function (v) {
    v.addEventListener('pointermove', function (e) {
      var r = v.getBoundingClientRect();
      v.style.setProperty('--x', (e.clientX - r.left) + 'px');
      v.style.setProperty('--y', (e.clientY - r.top) + 'px');
    });
  });

  /* ---------- hero: lines fan in from both edges and meet beneath the title ---------- */
  var canvas = document.getElementById('hero-lines');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var line = tok('--bronze-600'), hi = tok('--bronze-200');
  var W = 0, H = 0, progress = reduced ? 1 : 0, t0 = 0;
  var focus = { x: 0.5, y: 0.74 }, target = { x: 0.5, y: 0.74 }, running = false;

  function size() {
    var r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
  function hexA(hex, a) {
    var n = parseInt(hex.replace('#', ''), 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a.toFixed(3) + ')';
  }
  function loop(now) {
    if (!running) return;
    if (!t0) t0 = now;
    progress = Math.min(1, (now - t0) / 1800);
    focus.x += (target.x - focus.x) * 0.06; focus.y += (target.y - focus.y) * 0.06;
    draw();
    requestAnimationFrame(loop);
  }
  new ResizeObserver(size).observe(canvas);
  if (!reduced) {
    var hero = canvas.parentNode;
    hero.addEventListener('pointermove', function (e) { // the meeting point leans gently toward the pointer
      var r = hero.getBoundingClientRect();
      target.x = 0.5 + ((e.clientX - r.left) / r.width - 0.5) * 0.18;
      target.y = 0.74 + ((e.clientY - r.top) / r.height - 0.5) * 0.08;
    });
    hero.addEventListener('pointerleave', function () { target.x = 0.5; target.y = 0.74; });
    new IntersectionObserver(function (en) {
      var vis = en[0].isIntersecting;
      if (vis && !running) { running = true; requestAnimationFrame(loop); }
      if (!vis) running = false;
    }).observe(hero);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(size);
})();
