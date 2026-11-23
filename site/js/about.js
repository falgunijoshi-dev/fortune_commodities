/* Who we are: header state, scroll reveals, word-by-word statement, the journey line,
   venture spotlight and the other-business accordion. */
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

  /* ---------- other businesses: click a name to open its story; one open at a time ---------- */
  var toggles = Array.prototype.slice.call(document.querySelectorAll('.v-toggle'));
  function setOpen(btn, open) {
    btn.setAttribute('aria-expanded', String(open));
    btn.closest('.venture').classList.toggle('open', open);
  }
  toggles.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      toggles.forEach(function (b) { if (b !== btn) setOpen(b, false); });
      setOpen(btn, open);
    });
  });
})();
