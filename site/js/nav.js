/* Phone menu: the header's links collapse behind a Menu button below 860px. */
(function () {
  'use strict';
  var btn = document.querySelector('.nav-toggle'), nav = document.getElementById('main-nav');
  if (!btn || !nav) return;
  function set(open) { btn.setAttribute('aria-expanded', String(open)); nav.classList.toggle('open', open); }
  btn.addEventListener('click', function (e) { e.stopPropagation(); set(btn.getAttribute('aria-expanded') !== 'true'); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
  document.addEventListener('click', function (e) { if (!nav.contains(e.target)) set(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { set(false); btn.focus(); } });
  window.addEventListener('resize', function () { if (window.innerWidth > 860) set(false); });
})();
