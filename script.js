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

  // ---------- Lead questionnaire → Google Sheet (via Apps Script) ----------
  // Paste your deployed Apps Script Web App URL here (ends with /exec).
  // Until then, the form gracefully falls back to a pre-filled WhatsApp message.
  var LEAD_ENDPOINT = '';

  var leadForm = document.getElementById('leadForm');
  if (leadForm) {
    var statusEl = document.getElementById('leadStatus');
    var submitBtn = leadForm.querySelector('.lead__submit');

    function setStatus(msg, kind) {
      if (!statusEl) return;
      statusEl.textContent = msg || '';
      statusEl.className = 'lead__status' + (kind ? ' is-' + kind : '');
    }
    function fieldEl(name) { return leadForm.querySelector('[name="' + name + '"]'); }
    function markInvalid(el, bad) { if (el) el.classList.toggle('is-invalid', !!bad); }

    function validate(data) {
      var ok = true;
      var need = leadForm.querySelector('input[name="need"]:checked');
      if (!need) ok = false;   // (radio chips have no single element to flag)
      var nameEl = fieldEl('name'), phoneEl = fieldEl('phone'), emailEl = fieldEl('email');
      var nameBad = !data.name;
      var phoneBad = (data.phone.replace(/\D/g, '').length < 7);
      var emailBad = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);
      markInvalid(nameEl, nameBad); markInvalid(phoneEl, phoneBad); markInvalid(emailEl, emailBad);
      return ok && !nameBad && !phoneBad && !emailBad;
    }

    function collect() {
      var need = leadForm.querySelector('input[name="need"]:checked');
      return {
        need: need ? need.value : '',
        solution: (fieldEl('solution') || {}).value || '',
        occasion: (fieldEl('occasion') || {}).value || '',
        name: ((fieldEl('name') || {}).value || '').trim(),
        phone: ((fieldEl('phone') || {}).value || '').trim(),
        email: ((fieldEl('email') || {}).value || '').trim(),
        notes: ((fieldEl('notes') || {}).value || '').trim(),
        source: 'airship-website',
        page: location.href
      };
    }

    function whatsappFallback(d) {
      var lines = [
        'פנייה חדשה מהאתר:',
        'שם: ' + d.name,
        'טלפון: ' + d.phone,
        'אימייל: ' + d.email,
        'סוג פנייה: ' + d.need,
        'פתרון: ' + (d.solution || '—'),
        'אירוע: ' + (d.occasion || '—'),
        d.notes ? 'הערות: ' + d.notes : ''
      ].filter(Boolean);
      return 'https://wa.me/972522315086?text=' + encodeURIComponent(lines.join('\n'));
    }

    leadForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = collect();
      if (!validate(data)) {
        setStatus('אנא מלאו שם, טלפון, אימייל תקין ובחרו מה אתם מחפשים.', 'err');
        return;
      }

      // No endpoint wired yet → hand off to WhatsApp so no lead is lost.
      if (!LEAD_ENDPOINT) {
        setStatus('מעבירים אתכם לוואטסאפ לשליחת הפנייה…', 'busy');
        window.open(whatsappFallback(data), '_blank', 'noopener');
        return;
      }

      setStatus('שולח…', 'busy');
      if (submitBtn) submitBtn.disabled = true;

      fetch(LEAD_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',                                  // Apps Script: fire-and-forget
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(data)
      }).then(function () {
        setStatus('תודה! הפנייה נשלחה ונחזור אליכם בהקדם. ✦', 'ok');
        leadForm.reset();
        leadForm.querySelectorAll('.is-invalid').forEach(function (el) { el.classList.remove('is-invalid'); });
      }).catch(function () {
        // network failure → don't lose the lead, offer WhatsApp
        setStatus('השליחה נכשלה. נסו שוב או שלחו בוואטסאפ.', 'err');
        window.open(whatsappFallback(data), '_blank', 'noopener');
      }).finally(function () {
        if (submitBtn) submitBtn.disabled = false;
      });
    });
  }
})();
