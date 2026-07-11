/* Wiki Tours motion utility — the ONE shared IntersectionObserver + tiny
   interaction helpers (no animation library). All actual animation lives in
   CSS; this only toggles classes and sets --p. Respects reduced-motion. */
(function () {
  var docEl = document.documentElement;
  docEl.classList.add('js-motion');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // B4 — staggered scroll-reveal (once per element, never re-triggers).
  var reveals = document.querySelectorAll('[data-reveal]');
  if (reduce || !('IntersectionObserver' in window)) {
    for (var i = 0; i < reveals.length; i++) reveals[i].classList.add('is-in');
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    reveals.forEach(function (el) {
      var p = el.parentElement;
      if (p) {
        var sibs = p.querySelectorAll(':scope > [data-reveal]');
        var idx = Array.prototype.indexOf.call(sibs, el);
        if (idx > 0) el.style.transitionDelay = idx * 70 + 'ms';
      }
      io.observe(el);
    });
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
})();
