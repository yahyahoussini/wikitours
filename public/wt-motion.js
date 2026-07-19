/* Wiki Tours motion utility — the ONE shared IntersectionObserver + tiny
   interaction helpers (no animation library). All actual animation lives in
   CSS; this only toggles classes and sets --p. Respects reduced-motion. */
(function () {
  var docEl = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Defer DOM mutations until after React hydration COMMITS. <HydrationSignal>
  // calls __wtMotionStart from useEffect — the only signal that cannot race
  // the hydration diff (a bare rAF fires after first paint, and a short timer
  // loses to slow dev hydration; both produced mismatch warnings). The 12s
  // timer is a pure crash rescue: if hydration never commits, [data-reveal]
  // content is CSS-hidden until is-in and must not be stranded invisible.
  var started = false;
  function start() {
    if (started) return;
    started = true;
    requestAnimationFrame(init);
  }
  window.__wtMotionStart = start;
  if (docEl.dataset.hydrated) start();
  else setTimeout(start, 12000);

  function init() {

  // B4 — staggered scroll-reveal (once per element, never re-triggers).
  var reveals = document.querySelectorAll('[data-reveal]');
  // [data-reveal] content is CSS-hidden until is-in. React REMOUNTS nodes when
  // lists re-render (the offers filter, client-side navigations) — those fresh
  // nodes were never observed, so without the MutationObserver below they
  // stayed invisible forever (the "filter twice → no offers" bug).
  if (reduce || !('IntersectionObserver' in window)) {
    for (var i = 0; i < reveals.length; i++) reveals[i].classList.add('is-in');
    var moPlain = new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        Array.prototype.forEach.call(m.addedNodes, function (node) {
          if (node.nodeType !== 1) return;
          if (node.hasAttribute && node.hasAttribute('data-reveal')) node.classList.add('is-in');
          if (node.querySelectorAll) {
            node.querySelectorAll('[data-reveal]').forEach(function (el) { el.classList.add('is-in'); });
          }
        });
      });
    });
    moPlain.observe(document.body, { childList: true, subtree: true });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    var setupReveal = function (el) {
      var p = el.parentElement;
      if (p) {
        var sibs = p.querySelectorAll(':scope > [data-reveal]');
        var idx = Array.prototype.indexOf.call(sibs, el);
        if (idx > 0) el.style.transitionDelay = idx * 70 + 'ms';
      }
      io.observe(el);
    };
    reveals.forEach(setupReveal);
    var mo = new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        Array.prototype.forEach.call(m.addedNodes, function (node) {
          if (node.nodeType !== 1) return;
          if (node.hasAttribute && node.hasAttribute('data-reveal') && !node.classList.contains('is-in')) {
            setupReveal(node);
          }
          if (node.querySelectorAll) {
            node.querySelectorAll('[data-reveal]:not(.is-in)').forEach(setupReveal);
          }
        });
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  // B10 — number counters (ease-out 1.2s, once on reveal). data-count holds
  // the final string; the leading number animates, prefix/suffix preserved.
  var counters = document.querySelectorAll('[data-count]');
  var parse = function (el) {
    var text = el.getAttribute('data-count');
    var m = text.match(/([\d.,]+)/);
    if (!m) return null;
    var numStr = m[1].replace(/[,\s]/g, '');
    return {
      text: text,
      target: parseFloat(numStr),
      decimals: (numStr.split('.')[1] || '').length,
      prefix: text.slice(0, m.index),
      suffix: text.slice(m.index + m[1].length),
    };
  };
  if (reduce || !('IntersectionObserver' in window)) {
    // leave the server-rendered final value in place
  } else {
    counters.forEach(function (el) {
      var d = parse(el);
      if (d) el.textContent = d.prefix + (0).toFixed(d.decimals) + d.suffix; // zero before reveal (off-screen)
    });
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        var d = parse(e.target);
        if (!d) return;
        var start = performance.now();
        var step = function (now) {
          var t = Math.min(1, (now - start) / 1200);
          var eased = 1 - Math.pow(1 - t, 3);
          e.target.textContent = d.prefix + (d.target * eased).toFixed(d.decimals) + d.suffix;
          if (t < 1) requestAnimationFrame(step);
          else e.target.textContent = d.text;
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  // B12 — scroll progress hairline (pages that render [data-progress]).
  var bar = document.querySelector('[data-progress]');
  if (bar && !reduce) {
    var tick = function () {
      var h = docEl.scrollHeight - docEl.clientHeight;
      bar.style.setProperty('--p', h > 0 ? docEl.scrollTop / h : 0);
    };
    addEventListener('scroll', tick, { passive: true });
    addEventListener('resize', tick, { passive: true });
    tick();
  }

  // B13 — weighted in-page anchor scrolling ("inertial" ease-out with a long
  // settle). Delegated, so it also covers content mounted after client-side
  // navigations. Honors each target's scroll-margin-top; a wheel/touch from
  // the user cancels the glide; reduced-motion keeps the instant jump.
  if (!reduce) {
    document.addEventListener('click', function (ev) {
      var a = ev.target && ev.target.closest && ev.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href').slice(1);
      var el = id && document.getElementById(id);
      if (!el) return;
      ev.preventDefault();
      var margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
      var startY = window.scrollY;
      var targetY = Math.min(
        el.getBoundingClientRect().top + startY - margin,
        docEl.scrollHeight - window.innerHeight,
      );
      var dist = targetY - startY;
      if (!dist) return;
      var dur = Math.min(1100, Math.max(550, Math.abs(dist) * 0.45));
      var t0 = performance.now();
      var cancelled = false;
      var cancel = function () { cancelled = true; };
      addEventListener('wheel', cancel, { once: true, passive: true });
      addEventListener('touchstart', cancel, { once: true, passive: true });
      var easeOutQuart = function (t) { return 1 - Math.pow(1 - t, 4); };
      var step = function (now) {
        if (cancelled) return;
        var p = Math.min(1, (now - t0) / dur);
        window.scrollTo(0, startY + dist * easeOutQuart(p));
        if (p < 1) requestAnimationFrame(step);
        else history.pushState(null, '', '#' + id);
      };
      requestAnimationFrame(step);
    });
  }

  // B7 — magnetic primary buttons (fine pointer only; hero + booking CTA).
  if (!reduce && matchMedia('(pointer:fine)').matches) {
    var mags = document.querySelectorAll('[data-magnetic]');
    mags.forEach(function (el) {
      el.style.transition = 'transform 150ms ease-out';
      el.addEventListener('pointermove', function (ev) {
        var r = el.getBoundingClientRect();
        var dx = (ev.clientX - (r.left + r.width / 2)) * 0.3;
        var dy = (ev.clientY - (r.top + r.height / 2)) * 0.3;
        dx = Math.max(-6, Math.min(6, dx));
        dy = Math.max(-6, Math.min(6, dy));
        el.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  }
})();
