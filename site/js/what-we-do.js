/* What we do: core-area tabs driving a canvas chart (illustrative, generated data, no prices),
   time-range buttons, sparklines on the tabs, and the hidden Futures section. */
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var css = getComputedStyle(document.documentElement);
  function tok(n) { return css.getPropertyValue(n).trim(); }
  function rgb(hex) { var n = parseInt(hex.replace('#', ''), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  var COL = {
    up: rgb(tok('--positive')), down: rgb(tok('--negative')), grid: rgb(tok('--neutral-300')),
    bronze: rgb(tok('--bronze-300')), ice: rgb(tok('--viz-line-hi')), line: rgb(tok('--viz-line')), text: rgb(tok('--neutral-500'))
  };

  /* header */
  var header = document.querySelector('.site-header');
  function onScroll() { header.classList.toggle('scrolled', window.scrollY > 24); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* reveal, with fallbacks so content always shows */
  var reveals = document.querySelectorAll('.reveal');
  var io = new IntersectionObserver(function (en) {
    en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  Array.prototype.forEach.call(reveals, function (el) { io.observe(el); });
  setTimeout(function () { Array.prototype.forEach.call(reveals, function (el) { el.classList.add('in'); }); }, 2500);

  /* ---------- illustrative data ---------- */
  function prng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var TF = { '1D': 60, '1W': 70, '1M': 80, '1Y': 96 };
  var SPEC = {
    arb: { name: 'Arbitrage Trading', kind: 'spread', vol: 0.010, drift: 0.0006, seed: 11 },
    fx: { name: 'Foreign Exchange Trading', kind: 'candles', vol: 0.004, drift: 0.0002, seed: 23 },
    com: { name: 'Commodity Trading', kind: 'area', vol: 0.016, drift: -0.0004, seed: 37 },
    gold: { name: 'Gold Trading', kind: 'candles', vol: 0.011, drift: 0.0012, seed: 51 }
  };
  function series(key, tf) {
    var s = SPEC[key], r = prng(s.seed * 97 + tf.charCodeAt(1) * 13 + TF[tf]), n = TF[tf];
    var out = [], p = 100, spread = 0;
    for (var i = 0; i < n; i++) {
      var o = p, c = p * (1 + s.drift + (r() - 0.5) * 2 * s.vol + Math.sin(i / 9) * s.vol * 0.3);
      var h = Math.max(o, c) * (1 + r() * s.vol * 0.7), l = Math.min(o, c) * (1 - r() * s.vol * 0.7);
      spread = spread * 0.8 + (r() - 0.5) * 0.6;             // mean-reverting gap between two venues
      out.push({ o: o, h: h, l: l, c: c, v: 0.3 + r() * 0.7, b: c + spread * c * s.vol * 2.4, s: spread });
      p = c;
    }
    return out;
  }

  /* ---------- sparklines on the tabs ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('.area'), function (btn) {
    var d = series(btn.dataset.area, '1M'), min = Infinity, max = -Infinity;
    d.forEach(function (k) { min = Math.min(min, k.c); max = Math.max(max, k.c); });
    var path = d.map(function (k, i) { return (i ? 'L' : 'M') + (i / (d.length - 1) * 120).toFixed(1) + ' ' + (30 - (k.c - min) / (max - min || 1) * 28).toFixed(1); }).join(' ');
    btn.querySelector('path').setAttribute('d', path);
  });

  /* ---------- chart ---------- */
  var canvas = document.getElementById('chart');
  var ctx = canvas.getContext('2d');
  var nameEl = document.getElementById('chart-name');
  var legend = document.getElementById('chart-legend');
  var panel = document.getElementById('chart-panel');
  var state = { area: 'arb', tf: '1M', data: null, prog: 1, hover: -1, hy: 0 };
  var W = 0, H = 0, dpr = 1;

  function size() {
    var r = canvas.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height; canvas.width = W * dpr; canvas.height = H * dpr; draw();
  }
  function setLegend(kind) {
    var items = kind === 'spread' ? [['Venue A', COL.bronze], ['Venue B', COL.ice], ['Spread', COL.line]]
      : kind === 'area' ? [['Price', COL.ice]]
      : [['Up', COL.up], ['Down', COL.down], ['Volume', COL.line]];
    legend.innerHTML = items.map(function (it) { return '<span><i style="background:' + rgba(it[1], 1) + '"></i>' + it[0] + '</span>'; }).join('');
  }

  function draw() {
    if (W < 40 || !state.data) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    var d = state.data, kind = SPEC[state.area].kind, n = d.length;
    var padL = 16, padR = 16, padT = 18, padB = 14;
    var lowerH = kind === 'spread' ? H * 0.26 : kind === 'candles' ? H * 0.17 : 0;
    var top = padT, bottom = H - padB - lowerH - (lowerH ? 14 : 0);
    var x0 = padL, x1 = W - padR, step = (x1 - x0) / n;
    var shown = Math.max(1, Math.round(n * state.prog));

    // grid
    ctx.strokeStyle = rgba(COL.grid, 0.5); ctx.lineWidth = 1; ctx.beginPath();
    for (var g = 0; g <= 4; g++) { var gy = Math.round(top + (bottom - top) * g / 4) + 0.5; ctx.moveTo(x0, gy); ctx.lineTo(x1, gy); }
    for (var v = 0; v <= 8; v++) { var gx = Math.round(x0 + (x1 - x0) * v / 8) + 0.5; ctx.moveTo(gx, top); ctx.lineTo(gx, H - padB); }
    ctx.stroke();
    if (lowerH) { ctx.strokeStyle = rgba(COL.grid, 0.9); ctx.beginPath(); ctx.moveTo(x0, bottom + 7.5); ctx.lineTo(x1, bottom + 7.5); ctx.stroke(); }

    var min = Infinity, max = -Infinity;
    d.forEach(function (k) { min = Math.min(min, k.l, kind === 'spread' ? k.b : k.l); max = Math.max(max, k.h, kind === 'spread' ? k.b : k.h); });
    var pad = (max - min) * 0.08; min -= pad; max += pad;
    function Y(p) { return top + (1 - (p - min) / (max - min)) * (bottom - top); }
    function X(i) { return x0 + step * (i + 0.5); }

    if (kind === 'candles') {
      var bw = Math.max(2, step * 0.62), lb = bottom + 14, lh = lowerH - 4;
      for (var i = 0; i < shown; i++) {
        var k = d[i], up = k.c >= k.o, col = up ? COL.up : COL.down, cx = Math.round(X(i)) + 0.5, dim = state.hover >= 0 && state.hover !== i ? 0.55 : 1;
        ctx.strokeStyle = rgba(col, 0.9 * dim); ctx.beginPath(); ctx.moveTo(cx, Y(k.h)); ctx.lineTo(cx, Y(k.l)); ctx.stroke();
        var yo = Y(k.o), yc = Y(k.c);
        ctx.fillStyle = rgba(col, (up ? 0.85 : 0.9) * dim);
        ctx.fillRect(cx - bw / 2, Math.min(yo, yc), bw, Math.max(1, Math.abs(yc - yo)));
        ctx.fillStyle = rgba(col, 0.28 * dim);
        ctx.fillRect(cx - bw / 2, lb + lh * (1 - k.v), bw, lh * k.v);
      }
    } else if (kind === 'area') {
      ctx.beginPath();
      for (var j = 0; j < shown; j++) { var ax = X(j), ay = Y(d[j].c); j ? ctx.lineTo(ax, ay) : ctx.moveTo(ax, ay); }
      var lastX = X(shown - 1);
      ctx.strokeStyle = rgba(COL.ice, 0.95); ctx.lineWidth = 1.6; ctx.stroke();
      ctx.lineTo(lastX, bottom); ctx.lineTo(X(0), bottom); ctx.closePath();
      var gr = ctx.createLinearGradient(0, top, 0, bottom); gr.addColorStop(0, rgba(COL.ice, 0.22)); gr.addColorStop(1, rgba(COL.ice, 0));
      ctx.fillStyle = gr; ctx.fill(); ctx.lineWidth = 1;
    } else { // spread: two venues on top, the gap between them below
      [['c', COL.bronze], ['b', COL.ice]].forEach(function (L) {
        ctx.beginPath();
        for (var q = 0; q < shown; q++) { var lx = X(q), ly = Y(d[q][L[0]]); q ? ctx.lineTo(lx, ly) : ctx.moveTo(lx, ly); }
        ctx.strokeStyle = rgba(L[1], 0.95); ctx.lineWidth = 1.5; ctx.stroke();
      });
      ctx.lineWidth = 1;
      var mid = bottom + 14 + (lowerH - 4) / 2, smax = 0;
      d.forEach(function (k) { smax = Math.max(smax, Math.abs(k.s)); });
      ctx.strokeStyle = rgba(COL.grid, 0.9); ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(x0, mid + 0.5); ctx.lineTo(x1, mid + 0.5); ctx.stroke(); ctx.setLineDash([]);
      var sw = Math.max(2, step * 0.62);
      for (var m = 0; m < shown; m++) {
        var hgt = d[m].s / (smax || 1) * (lowerH / 2 - 6);
        ctx.fillStyle = rgba(hgt >= 0 ? COL.bronze : COL.ice, 0.55);
        ctx.fillRect(X(m) - sw / 2, hgt >= 0 ? mid - hgt : mid, sw, Math.abs(hgt));
      }
    }

    // last-value marker (no number: the data is illustrative)
    var last = d[shown - 1], ly2 = Y(kind === 'spread' ? last.c : last.c);
    ctx.setLineDash([2, 4]); ctx.strokeStyle = rgba(COL.bronze, 0.6); ctx.beginPath(); ctx.moveTo(x0, ly2 + 0.5); ctx.lineTo(x1, ly2 + 0.5); ctx.stroke(); ctx.setLineDash([]);
    ctx.save(); ctx.translate(X(shown - 1), ly2); ctx.rotate(Math.PI / 4); ctx.fillStyle = rgba(COL.bronze, 1); ctx.fillRect(-3.5, -3.5, 7, 7); ctx.restore();

    // crosshair
    if (state.hover >= 0 && state.prog >= 1) {
      var hx = Math.round(X(state.hover)) + 0.5;
      ctx.strokeStyle = rgba(COL.text, 0.7); ctx.setLineDash([3, 3]); ctx.beginPath();
      ctx.moveTo(hx, top); ctx.lineTo(hx, H - padB);
      if (state.hy > top && state.hy < bottom) { ctx.moveTo(x0, Math.round(state.hy) + 0.5); ctx.lineTo(x1, Math.round(state.hy) + 0.5); }
      ctx.stroke(); ctx.setLineDash([]);
    }
  }

  function animateIn() {
    if (reduced) { state.prog = 1; draw(); return; }
    var t0 = performance.now();
    (function step(now) {
      var p = Math.min(1, (now - t0) / 700); state.prog = 1 - Math.pow(1 - p, 3); draw();
      if (p < 1) requestAnimationFrame(step);
    })(t0);
    setTimeout(function () { state.prog = 1; draw(); }, 900); // safety if frames are throttled
  }
  function load() {
    state.data = series(state.area, state.tf);
    nameEl.textContent = SPEC[state.area].name;
    setLegend(SPEC[state.area].kind);
    animateIn();
  }

  /* tabs */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.area'));
  function select(btn, focus) {
    tabs.forEach(function (b) { var on = b === btn; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
    panel.setAttribute('aria-labelledby', btn.id);
    state.area = btn.dataset.area; state.hover = -1;
    if (focus) btn.focus();
    load();
  }
  /* phones (720px and below): the areas are cards; tapping one opens the chart right under it, tapping again closes it */
  var phone = window.matchMedia('(max-width: 720px)');
  var areasEl = document.querySelector('.areas');
  // the chart slides open and shut: height and opacity eased, the content lifting slightly as it arrives
  var anim = null, animTimer = 0, EASE = 'cubic-bezier(.22,.61,.36,1)';
  function slide(open, done) {
    if (anim) { anim.cancel(); anim = null; }
    clearTimeout(animTimer);
    if (reduced) { panel.classList.toggle('collapsed', !open); if (done) done(); return; }
    panel.classList.remove('collapsed');
    var h = panel.scrollHeight, dur = open ? 520 : 380;
    panel.style.overflow = 'hidden';
    anim = panel.animate(open
      ? [{ height: '0px', opacity: 0, transform: 'translateY(-8px)' }, { height: h + 'px', opacity: 1, transform: 'none' }]
      : [{ height: h + 'px', opacity: 1, transform: 'none' }, { height: '0px', opacity: 0, transform: 'translateY(-8px)' }],
      { duration: dur, easing: EASE, fill: 'forwards' });
    // settle on a timer rather than the finish event, which waits for a rendered frame
    animTimer = setTimeout(function () {
      if (anim) { anim.cancel(); anim = null; }
      panel.style.overflow = '';
      if (!open) panel.classList.add('collapsed');
      if (done) done();
    }, dur + 20);
  }
  function closeAll(done) {
    var wasOpen = tabs.some(function (t) { return t.getAttribute('aria-expanded') === 'true'; });
    tabs.forEach(function (t) { t.setAttribute('aria-expanded', 'false'); });
    if (wasOpen && !panel.classList.contains('collapsed')) slide(false, done);
    else { panel.classList.add('collapsed'); if (done) done(); }
  }
  function openCard(btn) {
    closeAll(function () {
      select(btn);
      tabs.forEach(function (t) { t.setAttribute('aria-expanded', String(t === btn)); });
      btn.insertAdjacentElement('afterend', panel);
      panel.classList.remove('collapsed');
      size();
      slide(true);
      setTimeout(function () { btn.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80);
    });
  }
  function setMode() {
    if (phone.matches) { tabs.forEach(function (t) { t.setAttribute('aria-expanded', 'false'); }); panel.classList.add('collapsed'); }
    else {
      tabs.forEach(function (t) { t.removeAttribute('aria-expanded'); });
      areasEl.insertAdjacentElement('afterend', panel);
      panel.classList.remove('collapsed');
      var cur = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0];
      select(cur);
    }
  }
  if (phone.addEventListener) phone.addEventListener('change', setMode); else phone.addListener(setMode);
  setMode();

  tabs.forEach(function (b, i) {
    b.addEventListener('click', function () {
      if (!phone.matches) { select(b); return; }
      if (b.getAttribute('aria-expanded') === 'true') closeAll(); else openCard(b);
    });
    b.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); select(tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length], true); }
    });
  });
  /* time range */
  Array.prototype.forEach.call(document.querySelectorAll('.tf button'), function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('.tf button').forEach(function (x) { x.classList.toggle('on', x === b); });
      state.tf = b.dataset.tf; load();
    });
  });
  /* crosshair */
  canvas.addEventListener('pointermove', function (e) {
    var r = canvas.getBoundingClientRect(), n = state.data.length;
    var i = Math.floor((e.clientX - r.left - 16) / ((r.width - 32) / n));
    state.hover = Math.max(0, Math.min(n - 1, i)); state.hy = e.clientY - r.top; draw();
  });
  canvas.addEventListener('pointerleave', function () { state.hover = -1; draw(); });

  window.__chartDone = function () { state.prog = 1; draw(); };   // review helper
  new ResizeObserver(size).observe(canvas);
  state.data = series(state.area, state.tf); setLegend('spread'); size();
  // draw the chart in when it first scrolls into view
  new IntersectionObserver(function (en, obs) { if (en[0].isIntersecting) { animateIn(); obs.disconnect(); } }, { threshold: 0.3 }).observe(canvas);

  /* ---------- futures toggle ---------- */
  var toggle = document.querySelector('.fut-toggle'), fut = document.getElementById('futures');
  toggle.addEventListener('click', function () {
    var open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    toggle.firstElementChild.textContent = open ? 'View Futures' : 'Hide Futures';
    if (!open) {
      fut.hidden = false;
      void fut.offsetHeight;          // let the closed state paint before opening
      fut.classList.add('open');
      setTimeout(function () { fut.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' }); }, 350);
    } else {
      fut.classList.remove('open');
      setTimeout(function () { if (toggle.getAttribute('aria-expanded') === 'false') fut.hidden = true; }, reduced ? 0 : 620);
    }
  });
})();
