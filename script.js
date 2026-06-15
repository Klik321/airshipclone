// Airship – interactions (vanilla JS)
(function () {
  'use strict';

  var nav = document.getElementById('nav');
  var navLinks = document.getElementById('navLinks');
  var navToggle = document.getElementById('navToggle');
  var links = navLinks ? navLinks.querySelectorAll('a') : [];
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Current year in footer
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Shrink nav on scroll
  function onScroll() {
    if (window.scrollY > 24) nav.classList.add('is-scrolled');
    else nav.classList.remove('is-scrolled');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile menu toggle
  if (navToggle) {
    navToggle.addEventListener('click', function () {
      var open = navLinks.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      navToggle.setAttribute('aria-label', open ? 'סגירת תפריט' : 'פתיחת תפריט');
    });
    // Close menu when a link is tapped
    links.forEach(function (a) {
      a.addEventListener('click', function () {
        navLinks.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Scroll reveal via IntersectionObserver (staggered)
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !prefersReduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        // Stagger siblings inside the same grid/row
        var siblings = el.parentElement ? el.parentElement.querySelectorAll('.reveal') : [el];
        var idx = Array.prototype.indexOf.call(siblings, el);
        el.style.transitionDelay = Math.min(idx, 6) * 90 + 'ms';
        el.classList.add('is-visible');
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  // Active link highlighting based on section in view
  var sections = document.querySelectorAll('main section[id]');
  if ('IntersectionObserver' in window && links.length) {
    var byId = {};
    links.forEach(function (a) {
      var id = a.getAttribute('href');
      if (id && id.charAt(0) === '#') byId[id.slice(1)] = a;
    });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.id;
        links.forEach(function (a) { a.classList.remove('is-active'); });
        if (byId[id]) byId[id].classList.add('is-active');
      });
    }, { threshold: 0.5 });
    sections.forEach(function (s) { spy.observe(s); });
  }
})();
