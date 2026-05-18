/* ============================================================================
   GridFleet cinematic.js -- shared scaffolding runtime.
   Per CLU's brief: < 8 KB gz, single rAF loop max (magnetic CTA only on
   desktop), Intersection Observer for scene transitions, reduced-motion
   guard, no per-page JS bundles depend on this.
   ============================================================================ */
(function () {
  'use strict';

  var doc = document;
  var win = window;
  var prefersReducedMotion = win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isFinePointer = win.matchMedia && win.matchMedia('(pointer: fine)').matches;

  // ---------- 1. Scene transitions (Intersection Observer) ----------
  // Markup: <section data-scene class="gf-scene"> -> adds .gf-scene--visible
  function initScenes() {
    var scenes = doc.querySelectorAll('[data-scene]');
    if (!scenes.length || !('IntersectionObserver' in win)) {
      // Fallback: no IO support, immediately reveal everything (no animation)
      for (var i = 0; i < scenes.length; i++) scenes[i].classList.add('gf-scene--visible');
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('gf-scene--visible');
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });

    for (var j = 0; j < scenes.length; j++) observer.observe(scenes[j]);
  }

  // ---------- 2. Magnetic CTA (desktop only, rAF-throttled) ----------
  // Markup: <a class="gf-cta gf-cta-magnetic" data-magnetic>...
  function initMagneticCTAs() {
    if (!isFinePointer || prefersReducedMotion) return;
    var ctas = doc.querySelectorAll('[data-magnetic]');
    if (!ctas.length) return;

    var raf = null;
    var pending = null;
    var maxTranslate = 6; // px

    function apply(el, dx, dy) {
      el.style.transform = 'translate3d(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px,0)';
    }
    function reset(el) {
      el.style.transform = '';
    }

    function attach(cta) {
      var rect = null;
      function onEnter() { rect = cta.getBoundingClientRect(); }
      function onMove(ev) {
        if (!rect) return;
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;
        var ratioX = (ev.clientX - cx) / (rect.width / 2);
        var ratioY = (ev.clientY - cy) / (rect.height / 2);
        var dx = Math.max(-1, Math.min(1, ratioX)) * maxTranslate;
        var dy = Math.max(-1, Math.min(1, ratioY)) * maxTranslate;
        pending = { cta: cta, dx: dx, dy: dy };
        if (!raf) {
          raf = win.requestAnimationFrame(function () {
            if (pending) apply(pending.cta, pending.dx, pending.dy);
            pending = null;
            raf = null;
          });
        }
      }
      function onLeave() {
        rect = null;
        if (raf) { win.cancelAnimationFrame(raf); raf = null; }
        reset(cta);
      }
      cta.addEventListener('mouseenter', onEnter);
      cta.addEventListener('mousemove', onMove);
      cta.addEventListener('mouseleave', onLeave);
      cta.addEventListener('blur', onLeave);
    }

    for (var k = 0; k < ctas.length; k++) attach(ctas[k]);
  }

  // ---------- 3. Cinematic cards (desktop only, CSS-var driven) ----------
  // Markup: <article data-cinematic-card>...
  // No animation loop: pointer events update CSS vars, CSS handles the easing.
  function initCinematicCards() {
    if (!isFinePointer || prefersReducedMotion) return;
    var cards = doc.querySelectorAll('[data-cinematic-card]');
    if (!cards.length) return;

    function attach(card) {
      function onMove(ev) {
        var rect = card.getBoundingClientRect();
        var px = (ev.clientX - rect.left) / rect.width;
        var py = (ev.clientY - rect.top) / rect.height;
        var ry = (px - 0.5) * 5;
        var rx = (0.5 - py) * 5;
        card.style.setProperty('--rx', rx.toFixed(2) + 'deg');
        card.style.setProperty('--ry', ry.toFixed(2) + 'deg');
        card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      }
      function onLeave() {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
        card.style.setProperty('--mx', '50%');
        card.style.setProperty('--my', '50%');
      }
      card.addEventListener('mousemove', onMove);
      card.addEventListener('mouseleave', onLeave);
      card.addEventListener('blur', onLeave);
    }

    for (var c = 0; c < cards.length; c++) attach(cards[c]);
  }

  // ---------- 4. Public snapshot hydration ----------
  // Optional file: /data/grid-snapshot.json. Only known public-safe fields are read.
  function initPublicSnapshot() {
    var root = doc.querySelector('[data-grid-snapshot]');
    if (!root || !win.fetch) return;

    function field(name) { return root.querySelector('[data-snapshot-field="' + name + '"]'); }
    function setText(name, value) {
      var el = field(name);
      if (!el) return;
      if (value === undefined || value === null || value === '') return;
      el.textContent = String(value).slice(0, 64);
    }
    function first(obj, keys) {
      for (var i = 0; i < keys.length; i++) {
        if (obj && obj[keys[i]] !== undefined && obj[keys[i]] !== null && obj[keys[i]] !== '') return obj[keys[i]];
      }
      return null;
    }
    function formatTime(value) {
      if (!value) return null;
      var date = new Date(value);
      if (isNaN(date.getTime())) return String(value).slice(0, 42);
      return 'Verified ' + date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }

    fetch('/data/grid-snapshot.json', { cache: 'no-store' })
      .then(function (res) { if (!res.ok) throw new Error('snapshot unavailable'); return res.json(); })
      .then(function (data) {
        var snap = (data && (data.public || data.grid || data.snapshot || data)) || {};
        var services = snap.services || snap.publicServices || {};
        var status = first(snap, ['statusLabel', 'publicStatus', 'fleetStatus', 'status']) || 'Snapshot loaded';
        var updated = formatTime(first(snap, ['updatedAt', 'generatedAt', 'timestamp', 'lastVerifiedAt']));
        setText('status', status);
        setText('verification', first(snap, ['verificationLabel', 'verification', 'evidenceLabel']) || 'Public JSON loaded');
        setText('services', first(snap, ['servicesVisible', 'publicServicesOnline', 'serviceCount', 'servicesOnline']));
        setText('checks', first(snap, ['checksReported', 'checks24h', 'verificationChecks24h', 'verifiedChecks']));
        setText('receipts', first(snap, ['receiptsAvailable', 'receiptCount', 'evidenceItems24h', 'publicReceipts']));
        setText('browser', first(services, ['browser', 'browserAutomation']) || first(snap, ['browserStatus']));
        setText('monitoring', first(services, ['monitoring', 'monitors']) || first(snap, ['monitoringStatus']));
        setText('receiptLayer', first(services, ['receiptLayer', 'receipts']) || first(snap, ['receiptLayerStatus']));
        var updatedEl = root.querySelector('[data-snapshot-updated]');
        if (updatedEl && updated) updatedEl.textContent = updated;
        var orb = root.querySelector('[data-snapshot-orb]');
        if (orb) {
          orb.classList.remove('is-warn');
          orb.classList.add(/degraded|pending|warn|blocked/i.test(status) ? 'is-warn' : 'is-live');
        }
      })
      .catch(function () {
        var updatedEl = root.querySelector('[data-snapshot-updated]');
        if (updatedEl) updatedEl.textContent = 'Snapshot feed pending';
        var orb = root.querySelector('[data-snapshot-orb]');
        if (orb) orb.classList.add('is-warn');
      });
  }

  // ---------- 5. boot ----------
  function boot() {
    initScenes();
    initMagneticCTAs();
    initCinematicCards();
    initPublicSnapshot();
  }
  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
