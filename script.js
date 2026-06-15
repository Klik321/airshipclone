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

  // ---------- Balloon-design gallery: category filter + lightbox ----------
  var bdGrid = document.getElementById('bdGrid');
  if (bdGrid) {
    var items = Array.prototype.slice.call(bdGrid.querySelectorAll('.bd__item'));
    var filters = Array.prototype.slice.call(document.querySelectorAll('.bd__filter'));
    var countEl = document.getElementById('bdCount');
    var activeCat = 'all';

    // currently-visible items (drives the lightbox sequence)
    function visible() {
      return items.filter(function (el) { return !el.classList.contains('is-hidden'); });
    }
    function applyFilter(cat) {
      activeCat = cat;
      items.forEach(function (el) {
        el.classList.toggle('is-hidden', cat !== 'all' && el.getAttribute('data-cat') !== cat);
      });
      filters.forEach(function (b) { b.classList.toggle('is-active', b.getAttribute('data-cat') === cat); });
      if (countEl) {
        var n = visible().length;
        countEl.textContent = (cat === 'all' ? 'כל הקטגוריות' : cat) + ' · ' + n + ' תמונות';
      }
    }
    filters.forEach(function (b) {
      b.addEventListener('click', function () { applyFilter(b.getAttribute('data-cat')); });
    });
    applyFilter('all');

    // Lightbox (navigates within the active filter only)
    var lb = document.getElementById('lightbox');
    var lbImg = lb ? lb.querySelector('img') : null;
    var seq = [], cur = 0;
    function openLb(el) {
      seq = visible(); cur = seq.indexOf(el);
      var img = el.querySelector('img');
      lbImg.src = img.getAttribute('src'); lbImg.alt = img.getAttribute('alt') || '';
      lb.classList.add('is-open'); document.body.style.overflow = 'hidden';
    }
    function closeLb() { lb.classList.remove('is-open'); document.body.style.overflow = ''; }
    function step(d) {
      if (!seq.length) return;
      cur = (cur + d + seq.length) % seq.length;
      var img = seq[cur].querySelector('img');
      lbImg.src = img.getAttribute('src'); lbImg.alt = img.getAttribute('alt') || '';
    }
    items.forEach(function (el) {
      el.addEventListener('click', function () { if (lb) openLb(el); });
    });
    if (lb) {
      lb.querySelector('.lightbox__close').addEventListener('click', closeLb);
      lb.querySelector('.lightbox__nav--prev').addEventListener('click', function (e) { e.stopPropagation(); step(-1); });
      lb.querySelector('.lightbox__nav--next').addEventListener('click', function (e) { e.stopPropagation(); step(1); });
      lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
      document.addEventListener('keydown', function (e) {
        if (!lb.classList.contains('is-open')) return;
        if (e.key === 'Escape') closeLb();
        else if (e.key === 'ArrowRight') step(-1);   // RTL: right = previous
        else if (e.key === 'ArrowLeft') step(1);
      });
    }
  }
})();
