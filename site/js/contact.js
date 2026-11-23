/* Contact section: form validation, a front-end-only "sent" state,
   and the striped-ribbon backdrop. Nothing is submitted anywhere yet. */
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- validation + sent state ---------- */
  var form = document.getElementById('form-contact');
  var sent = document.getElementById('sent'), title = document.getElementById('form-title');
  function check(el) {
    var ok = el.checkValidity();
    var min = +el.getAttribute('minlength') || 0;
    if (min && el.value.trim().length < min) ok = false;   // minlength alone isn't checked for every input path
    el.closest('.field').classList.toggle('invalid', !ok);
    return ok;
  }
  if (form) {
    form.addEventListener('input', function (e) {
      var f = e.target.closest('.field');
      if (f && f.classList.contains('invalid')) check(e.target);
    });
    form.addEventListener('blur', function (e) {
      if (e.target.matches('input, textarea') && e.target.value) check(e.target);
    }, true);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var first = null;
      Array.prototype.forEach.call(form.querySelectorAll('input, textarea'), function (el) { if (!check(el) && !first) first = el; });
      if (first) { first.focus(); return; }
      form.hidden = title.hidden = true; sent.hidden = false; sent.focus();   // front end only: nothing is sent anywhere yet
      form.reset();
    });
    document.getElementById('sent-again').addEventListener('click', function () {
      sent.hidden = true; form.hidden = title.hidden = false; form.querySelector('input').focus();
    });
  }

  /* ---------- striped ribbon backdrop ---------- */
  // A flat band of parallel stripes folded into a Z, poster-style: a light band runs in from the left,
  // folds down into a bronze diagonal, then folds again into a light band running out to the right.
  // At each fold the diagonal stripes pass under the bands, so the folds read as a woven lattice.
  var canvas = document.getElementById('contact-lines');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var progress = reduced ? 1 : 0, started = false;

  // the shape, in a 400 x 500 design box
  var N = 9;
  function lerp(a, b, f) { return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; }
  function pt(a, b, i) { return lerp(a, b, i / (N - 1)); }
  var E0 = [262, 26], E1 = [362, 134];      // first fold (top right): where the top band's stripes end
  var S0 = [44, 352], S1 = [196, 492];      // second fold (bottom left): where the bottom band's stripes start
  var TOP_DIR = [1, -0.035], BOT_DIR = [1, -0.2];

  var CREAM = [207, 192, 179], BRONZE = [190, 140, 100];   // light bands in pale taupe, the fold in bronze

  function unit(v) { var l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; }
  // a stripe from P to Q, its ends cut along the given edge directions
  function stripe(P, Q, eP, eQ, w, f) {
    var d = unit([Q[0] - P[0], Q[1] - P[1]]), n = [-d[1], d[0]];
    function edge(e) {
      e = unit(e); var k = e[0] * n[0] + e[1] * n[1];
      if (Math.abs(k) < 0.15) k = k < 0 ? -0.15 : 0.15;
      return [e[0] * (w / 2) / k, e[1] * (w / 2) / k];
    }
    var a = edge(eP), b = edge(eQ), Qf = lerp(P, Q, f);
    var bf = lerp(a, b, f);
    ctx.beginPath();
    ctx.moveTo(P[0] - a[0], P[1] - a[1]); ctx.lineTo(Qf[0] - bf[0], Qf[1] - bf[1]);
    ctx.lineTo(Qf[0] + bf[0], Qf[1] + bf[1]); ctx.lineTo(P[0] + a[0], P[1] + a[1]);
    ctx.closePath(); ctx.fill();
  }
  function stage(p, a, b) { return Math.max(0, Math.min(1, (p - a) / (b - a))); }

  function draw() {
    var r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = r.width * dpr; canvas.height = r.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, r.width, r.height);
    var W = r.width, H = r.height, wide = W > 960;
    if (W < 10 || H < 10) return;   // not laid out yet
    // place the design box: the left half on desktop, the top-right corner on phones
    var sc = wide ? Math.min(W * 0.46 / 400, H * 0.96 / 500) : Math.min(W * 0.62 / 400, 0.6);
    var ox = wide ? 0 : W - 380 * sc, oy = wide ? (H - 500 * sc) / 2 : 12;
    var alpha = wide ? 1 : 0.4;   // quieter on phones, where the text sits over it
    ctx.save(); ctx.translate(ox, oy); ctx.scale(sc, sc);
    var w = 8.5, far = (W / sc) + 200;   // stripe width in design units; how far the bands run off the edges

    var pTop = stage(progress, 0, 0.45), pDia = stage(progress, 0.3, 0.75), pBot = stage(progress, 0.6, 1);
    var fold1 = [E1[0] - E0[0], E1[1] - E0[1]], fold2 = [S1[0] - S0[0], S1[1] - S0[1]];

    // the diagonal first, so the bands lie over it at the folds
    for (var i = 0; i < N; i++) {
      var E = pt(E0, E1, i), S = pt(S0, S1, i);
      var g = ctx.createLinearGradient(E[0], E[1], S[0], S[1]);
      g.addColorStop(0, 'rgba(' + BRONZE + ',' + (0.17 * alpha).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + BRONZE + ',' + (0.11 * alpha).toFixed(3) + ')');
      ctx.fillStyle = g;
      if (pDia > 0) stripe(E, S, fold1, fold2, w, pDia);
    }
    // top band: in from beyond the left edge to the first fold
    for (var t = 0; t < N; t++) {
      var Et = pt(E0, E1, t), run = Et[0] + 200 + ox / sc, St = [Et[0] - TOP_DIR[0] * run, Et[1] - TOP_DIR[1] * run];   // from beyond the left edge
      var gt = ctx.createLinearGradient(St[0], 0, Et[0], 0);
      gt.addColorStop(0, 'rgba(' + CREAM + ',' + (0.06 * alpha).toFixed(3) + ')');
      gt.addColorStop(1, 'rgba(' + CREAM + ',' + (0.2 * alpha).toFixed(3) + ')');
      ctx.fillStyle = gt;
      var lag = stage(pTop, t * 0.04, 0.68 + t * 0.04);
      if (lag > 0) stripe(St, Et, [0, 1], fold1, w, lag);
    }
    // bottom band: from the second fold out to the right, fading as it goes
    for (var b = 0; b < N; b++) {
      var Sb = pt(S0, S1, b), Eb = [Sb[0] + BOT_DIR[0] * far, Sb[1] + BOT_DIR[1] * far];
      var gb = ctx.createLinearGradient(Sb[0], 0, Sb[0] + 520, 0);
      gb.addColorStop(0, 'rgba(' + CREAM + ',' + (0.2 * alpha).toFixed(3) + ')');
      gb.addColorStop(1, 'rgba(' + CREAM + ',0)');
      ctx.fillStyle = gb;
      var lb = stage(pBot, b * 0.04, 0.68 + b * 0.04);
      if (lb > 0) stripe(Sb, Eb, fold2, [0, 1], w, lb);
    }
    ctx.restore();

    // keep the copy readable: soften the stripes behind the intro text
    var intro = document.querySelector('.contact-intro');
    if (intro && wide) {
      var ir = intro.getBoundingClientRect(), x0 = ir.left - r.left, x1 = ir.right - r.left, pad = 60;
      var fade = ctx.createLinearGradient(x0 - pad, 0, x1 + pad, 0);
      var depth = 0.8;
      fade.addColorStop(0, 'rgba(0,0,0,0)');
      fade.addColorStop(pad / (x1 - x0 + 2 * pad), 'rgba(0,0,0,' + depth + ')');
      fade.addColorStop(1 - pad / (x1 - x0 + 2 * pad), 'rgba(0,0,0,' + depth + ')');
      fade.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = fade;
      ctx.fillRect(x0 - pad, ir.top - r.top - pad, x1 - x0 + 2 * pad, ir.height + 2 * pad);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  function animate() {
    var t0 = performance.now();
    (function step(now) {
      progress = Math.min(1, (now - t0) / 2200);
      progress = 1 - Math.pow(1 - progress, 3);
      draw();
      if (progress < 1) requestAnimationFrame(step);
    })(t0);
  }
  new ResizeObserver(draw).observe(canvas);
  if (!reduced) {
    progress = 1; draw(); // complete at rest; replay the draw-in once when the section comes into view
    new IntersectionObserver(function (e, obs) {
      if (e[0].isIntersecting && !started) { started = true; progress = 0; animate(); obs.disconnect(); }
    }, { threshold: 0.25 }).observe(canvas);
  }
})();
