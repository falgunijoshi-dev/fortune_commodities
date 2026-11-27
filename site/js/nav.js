/* Header navigation.
   Desktop: a bronze rule glides under the link you point at and returns to the current page's link.
   Phones (860px and below): the links open as a full-screen menu behind the Menu button. */
(function () {
  'use strict';
  var btn = document.querySelector('.nav-toggle'), nav = document.getElementById('main-nav');
  if (!btn || !nav) return;
  var ink = nav.querySelector('.nav-ink');
  var links = Array.prototype.slice.call(nav.querySelectorAll('a'));
  var current = nav.querySelector('a[aria-current="page"]');

  /* ---------- gliding rule ---------- */
  function moveInk(a) {
    if (!ink) return;
    if (!a) { ink.style.opacity = '0'; return; }
    ink.style.width = a.offsetWidth + 'px';
    ink.style.transform = 'translateX(' + a.offsetLeft + 'px)';
    ink.style.opacity = '1';
  }
  links.forEach(function (a) {
    a.addEventListener('mouseenter', function () { moveInk(a); });
    a.addEventListener('focus', function () { moveInk(a); });
  });
  nav.addEventListener('mouseleave', function () { moveInk(current); });
  nav.addEventListener('focusout', function (e) { if (!nav.contains(e.relatedTarget)) moveInk(current); });
  // place it on the current page without sliding in from the left
  function settle() {
    if (!ink) return;
    ink.style.transition = 'none'; moveInk(current);
    void ink.offsetWidth; ink.style.transition = '';
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);
  settle();

  /* ---------- phone menu ---------- */
  function set(open) {
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    nav.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
  }
  btn.addEventListener('click', function (e) { e.stopPropagation(); set(btn.getAttribute('aria-expanded') !== 'true'); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a') || e.target === nav) set(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { set(false); btn.focus(); }
  });
  window.addEventListener('resize', function () { if (window.innerWidth > 860) set(false); settle(); });
})();
