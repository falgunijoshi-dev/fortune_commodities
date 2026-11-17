/* Home: fade text up as it scrolls into view, like the inner pages.
   Anything already on screen is shown straight away, and a fallback makes
   sure nothing stays hidden if the observer never fires. */
(function () {
  'use strict';
  var els = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (!els.length) return;
  if (!('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('in'); }); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
  els.forEach(function (el) { io.observe(el); });
  function showVisible() {
    els.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('in');
    });
  }
  setTimeout(showVisible, 2500);
  window.addEventListener('hashchange', function () { setTimeout(showVisible, 600); });
})();
