/* Contact section: tabs, chips, validation, a front-end-only "sent" state,
   and the converging-lines backdrop. Nothing is submitted anywhere yet. */
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- tabs ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.contact .tab'));
  var ink = document.querySelector('.contact .tab-ink');
  var sent = document.getElementById('sent');

  function placeInk() {
    var on = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0];
    if (!on || !ink) return;
    ink.style.width = on.offsetWidth + 'px';
    ink.style.transform = 'translateX(' + on.offsetLeft + 'px)';
  }
  function select(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    sent.hidden = true;
    if (focus) tab.focus();
    placeInk();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { select(t); });
    t.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        select(tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length], true);
      }
    });
  });
  window.addEventListener('resize', placeInk);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeInk);
  placeInk();

  /* ---------- file name ---------- */
  var cv = document.getElementById('c-cv');
  if (cv) cv.addEventListener('change', function () {
    var f = cv.files && cv.files[0], wrap = cv.closest('.field');
    wrap.querySelector('.file-name').textContent = f ? f.name : 'PDF or Word, up to 5 MB';
    wrap.classList.toggle('has-file', !!f);
    if (f) wrap.classList.remove('invalid');
  });

  /* ---------- validation + sent state ---------- */
  function check(el) {
    var ok = el.checkValidity();
    if (el.type === 'file' && el.files && el.files[0] && el.files[0].size > 5 * 1024 * 1024) ok = false;
    el.closest('.field').classList.toggle('invalid', !ok);
    return ok;
  }
  Array.prototype.forEach.call(document.querySelectorAll('.enquiry'), function (form) {
    form.addEventListener('blur', function (e) {
      if (e.target.matches('.field input, .field textarea') && e.target.closest('.field').classList.contains('invalid')) check(e.target);
    }, true);
    form.addEventListener('input', function (e) {
      if (e.target.closest('.field') && e.target.closest('.field').classList.contains('invalid')) check(e.target);
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var fields = form.querySelectorAll('.field input, .field textarea'), first = null;
      Array.prototype.forEach.call(fields, function (el) { if (!check(el) && !first) first = el; });
      if (first) { first.focus(); return; }
      var careers = form.id === 'form-careers';
      document.getElementById('sent-text').textContent = careers
        ? 'Our team reviews every application and will be in touch if there is a fit.'
        : 'The right person on our team will reply to you directly.';
      form.hidden = true; sent.hidden = false; sent.focus();
      form.reset();
      Array.prototype.forEach.call(form.querySelectorAll('.file-field'), function (w) {
        w.classList.remove('has-file'); w.querySelector('.file-name').textContent = 'PDF or Word, up to 5 MB';
      });
    });
  });
  document.getElementById('sent-again').addEventListener('click', function () {
    var on = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0];
    select(on, true);
  });

  /* ---------- converging lines backdrop ---------- */
  var canvas = document.getElementById('contact-lines');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var css = getComputedStyle(document.documentElement);
  var line = css.getPropertyValue('--viz-line').trim();
  var hi = css.getPropertyValue('--bronze-200').trim();
  var progress = reduced ? 1 : 0, started = false;

  function draw() {
    var r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = r.width * dpr; canvas.height = r.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, r.width, r.height);
    var W = r.width, H = r.height;
    // lines run in from the left at about 16 degrees and meet behind the form panel
    var px = W > 960 ? W * 0.47 : W * 0.9, py = H * 0.5, t = Math.tan(16 * Math.PI / 180);
    var n = 18, gap = Math.max(12, H / 70);
    for (var s = -1; s <= 1; s += 2) {
      for (var i = 1; i <= n; i++) {
        var y0 = py + s * (i * gap + t * px);
        var x1 = px * progress, y1 = y0 + (py - y0) * progress;
        var a = (0.10 + 0.30 * (1 - i / n)) * (W > 960 ? 1 : 0.6);
        ctx.strokeStyle = line; ctx.globalAlpha = a; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
    }
    // the two highlighted price lines that close the spread
    ctx.globalAlpha = 0.7 * progress;
    for (var k = -1; k <= 1; k += 2) {
      var g = ctx.createLinearGradient(0, 0, px, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, hi);
      ctx.strokeStyle = g; ctx.lineWidth = 1.25;
      ctx.beginPath(); ctx.moveTo(px * 0.25, py + k * t * px * 0.75); ctx.lineTo(px * progress, py); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function animate() {
    var t0 = performance.now();
    (function step(now) {
      progress = Math.min(1, (now - t0) / 1400);
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
