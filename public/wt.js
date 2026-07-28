/* Wiki Tours first-party beacon — no deps, never blocks rendering.
   Cookies: wt_vid (13 months) · wt_sid/wt_sla (30-min idle rotation) ·
   wt_ft (first-touch attribution, 30 days). Events batch to /api/t. */
(function () {
  if (window.wt) return;
  var D = document, N = navigator;

  // Staff opt-out: any browser that has opened the admin app carries wt_notrack
  // (set cross-subdomain by the middleware). Its visits to the public site are
  // never counted. A no-op wt is exposed so callers (LeadForm, pixels) don't break.
  if (/(?:^|; )wt_notrack=1/.test(D.cookie)) { window.wt = { track: function () {}, flush: function () {} }; return; }

  function get(k) {
    var m = D.cookie.match('(?:^|; )' + k + '=([^;]*)');
    return m ? m[1] : null;
  }
  function set(k, v, s) {
    D.cookie = k + '=' + v + '; path=/; max-age=' + s + '; SameSite=Lax';
  }
  function uuid() {
    return (crypto.randomUUID && crypto.randomUUID()) ||
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 3) | 8).toString(16);
      });
  }

  var vid = get('wt_vid'), nv = false;
  if (!vid) { vid = uuid(); nv = true; }
  set('wt_vid', vid, 34128000); // 13 months (395 d)

  var now = Date.now(), sid = get('wt_sid'), ns = false;
  if (!sid || now - (+get('wt_sla') || 0) > 1800000) { sid = uuid(); ns = true; }
  set('wt_sid', sid, 86400);
  set('wt_sla', now, 86400);

  var P = new URLSearchParams(location.search);
  var ft = get('wt_ft');
  if (!ft) {
    var o = {
      s: P.get('utm_source'), m: P.get('utm_medium'), c: P.get('utm_campaign'),
      t: P.get('utm_content'), g: P.get('gclid'), f: P.get('fbclid'),
      r: D.referrer || null
    };
    if (o.s || o.g || o.f || o.r) {
      ft = encodeURIComponent(JSON.stringify(o));
      set('wt_ft', ft, 2592000); // 30 d first-touch
    }
  }

  var q = [], timer = null;

  function flush() {
    if (!q.length) return;
    var body = JSON.stringify({
      h: '1', vid: vid, sid: sid, nv: nv, ns: ns,
      ft: ft ? JSON.parse(decodeURIComponent(ft)) : null,
      utm: { s: P.get('utm_source'), m: P.get('utm_medium'), c: P.get('utm_campaign') },
      ref: D.referrer || null, ev: q.splice(0)
    });
    nv = false; ns = false;
    try {
      fetch('/api/t', {
        method: 'POST', keepalive: true,
        headers: { 'content-type': 'application/json', 'x-wt': '1' },
        body: body
      });
    } catch (e) {
      N.sendBeacon && N.sendBeacon('/api/t', new Blob([body], { type: 'application/json' }));
    }
  }

  // Mirror funnel events to the ad pixels for platform optimization, using
  // the SAME ids as the first-party beacon. Guarded — pixels may be absent
  // (not configured / consent declined / blocked) and never block tracking.
  var MIRROR = {
    offer_view: function () {
      window.fbq && fbq('track', 'ViewContent');
      window.ttq && ttq.track && ttq.track('ViewContent');
    },
    form_start: function () {
      window.fbq && fbq('track', 'InitiateCheckout');
      window.ttq && ttq.track && ttq.track('InitiateCheckout');
    },
    whatsapp_click: function () {
      window.fbq && fbq('track', 'Contact');
      window.ttq && ttq.track && ttq.track('Contact');
    }
  };

  function track(t, meta) {
    q.push({
      t: t, p: location.pathname,
      o: (meta && meta.offer_id) || null,
      m: meta && meta.label ? { label: meta.label } : null,
      ts: Date.now()
    });
    if (MIRROR[t]) { try { MIRROR[t](); } catch (e) { /* never blocks */ } }
    set('wt_sla', Date.now(), 86400);
    clearTimeout(timer);
    timer = setTimeout(flush, 3000);
  }

  window.wt = { track: track, flush: flush };

  track('pageview');

  // <x data-wt-view="offers:<uuid>"> → offer_view
  var views = D.querySelectorAll('[data-wt-view]');
  for (var i = 0; i < views.length; i++) {
    var v = views[i].getAttribute('data-wt-view').split(':');
    if (v[0] === 'offers' && v[1]) track('offer_view', { offer_id: v[1] });
  }

  // <a data-wt="whatsapp_click|cta_click" data-wt-label data-wt-offer>
  // tel: links are auto-instrumented (tel_click) so no markup is needed —
  // unless the anchor already carries data-wt, which then wins.
  D.addEventListener('click', function (e) {
    var el = e.target && e.target.closest && e.target.closest('[data-wt]');
    if (el) {
      track(el.getAttribute('data-wt'), {
        label: el.getAttribute('data-wt-label') || undefined,
        offer_id: el.getAttribute('data-wt-offer') || undefined
      });
      flush(); // may navigate away — keepalive carries it
      return;
    }
    var tel = e.target && e.target.closest && e.target.closest('a[href^="tel:"]');
    if (tel) {
      track('tel_click', { label: tel.getAttribute('href').slice(4) });
      flush();
    }
  });

  // FAQ opens: any <details> on the page (capture — toggle doesn't bubble).
  D.addEventListener('toggle', function (e) {
    var d = e.target;
    if (!d || d.tagName !== 'DETAILS' || !d.open) return;
    var s = d.querySelector('summary');
    track('faq_expand', { label: (s && s.textContent || '').trim().slice(0, 120) || undefined });
  }, true);

  // Core Web Vitals — field data, no library, reported once on page hide.
  //   LCP  exact: last largest-contentful-paint entry.
  //   CLS  exact: the session-window algorithm Google itself uses (max burst,
  //        1s gap / 5s cap, ignoring shifts that follow real input).
  //   INP  approximated by the SLOWEST interaction. True INP is a high
  //        percentile across all interactions; on typical pages here the max is
  //        the same value or one bucket worse, so it errs pessimistic — never
  //        flattering. Treat it as a ceiling, not a exact score.
  (function vitals() {
    if (!('PerformanceObserver' in window)) return;
    var lcp = 0, cls = 0, inp = 0, burst = 0, entries = [];

    function obs(type, cb, opts) {
      try {
        var o = new PerformanceObserver(function (list) { list.getEntries().forEach(cb); });
        var init = { type: type, buffered: true };
        for (var k in opts) init[k] = opts[k];
        o.observe(init);
      } catch (e) { /* unsupported metric — never breaks the beacon */ }
    }

    obs('largest-contentful-paint', function (e) { lcp = e.startTime; });

    obs('layout-shift', function (e) {
      if (e.hadRecentInput) return;
      var first = entries[0], last = entries[entries.length - 1];
      if (entries.length && e.startTime - last.startTime < 1000 && e.startTime - first.startTime < 5000) {
        burst += e.value; entries.push(e);
      } else {
        burst = e.value; entries = [e];
      }
      if (burst > cls) cls = burst;
    });

    obs('event', function (e) {
      if (e.interactionId && e.duration > inp) inp = e.duration;
    }, { durationThreshold: 40 });

    // TTFB — Time To First Byte from the Navigation Timing entry (responseStart
    // relative to the request start). The server-response half of the load;
    // the admin p75 panel reads it alongside LCP/CLS/INP.
    var ttfb = 0;
    try {
      var nav = performance.getEntriesByType('navigation')[0];
      if (nav && nav.responseStart > 0) ttfb = nav.responseStart;
    } catch (e) { /* Navigation Timing L2 unsupported — skip TTFB */ }

    var sent = false;
    function report() {
      if (sent) return;
      sent = true;
      if (lcp) track('web_vital', { label: 'LCP:' + Math.round(lcp) });
      if (entries.length) track('web_vital', { label: 'CLS:' + cls.toFixed(3) });
      if (inp) track('web_vital', { label: 'INP:' + Math.round(inp) });
      if (ttfb) track('web_vital', { label: 'TTFB:' + Math.round(ttfb) });
      flush();
    }
    D.addEventListener('visibilitychange', function () { if (D.visibilityState === 'hidden') report(); });
    window.addEventListener('pagehide', report);
  })();

  D.addEventListener('visibilitychange', function () {
    if (D.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);
})();
