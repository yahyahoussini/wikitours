import { getSettings } from '@/lib/data/settings';

/**
 * Third-party measurement, entirely admin-driven (LAWS §4): GA4 (linked to
 * Google Ads), Meta Pixel and TikTok Pixel render ONLY when their id is set
 * in settings. When the consent banner is enabled, the pixel loaders wait
 * for the wt_consent=1 cookie (or the banner's grant call) — the first-party
 * beacon and server events are unaffected. IDs are whitelisted to [\w:-]
 * so an admin typo can never inject script.
 */
const safe = (v) => (typeof v === 'string' && /^[\w:-]{1,60}$/.test(v.trim()) ? v.trim() : null);

export default async function TrackingScripts() {
  const settings = await getSettings();
  const ga4 = safe(settings?.ga4_id);
  const ads = safe(settings?.google_ads_id);
  const label = safe(settings?.google_ads_lead_label);
  const meta = safe(settings?.meta_pixel_id);
  const tiktok = safe(settings?.tiktok_pixel_id);
  if (!ga4 && !meta && !tiktok) return null;

  const cfg = JSON.stringify({ ga4, ads, label, meta, tiktok, gate: !!settings?.consent_banner_enabled });

  const js = `(function(){
var C=${cfg};window.__wtMkt=C;var loaded=false;
function load(){if(loaded)return;loaded=true;
if(C.ga4){var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id='+C.ga4;document.head.appendChild(s);
window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments);};
gtag('js',new Date());gtag('config',C.ga4);
if(C.ads)gtag('config',C.ads,{allow_enhanced_conversions:true});}
if(C.meta){!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init',C.meta);fbq('track','PageView');}
if(C.tiktok){!function(w,d,t){w.TiktokAnalyticsObject=t;var q=w[t]=w[t]||[];q.methods=['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie'];q.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<q.methods.length;i++)q.setAndDefer(q,q.methods[i]);q.load=function(e,n){var r='https://analytics.tiktok.com/i18n/pixel/events.js';q._i=q._i||{};q._i[e]=[];q._i[e]._u=r;q._t=q._t||{};q._t[e]=+new Date;q._o=q._o||{};q._o[e]=n||{};var o=d.createElement('script');o.type='text/javascript';o.async=!0;o.src=r+'?sdkid='+e+'&lib='+t;var a=d.getElementsByTagName('script')[0];a.parentNode.insertBefore(o,a)}}(window,document,'ttq');
window.ttq.load(C.tiktok);window.ttq.page();}
}
window.__wtConsentGrant=load;
if(!C.gate||/(?:^|; )wt_consent=1/.test(document.cookie))load();
})();`;

  // eslint-disable-next-line react/no-danger -- IDs whitelisted above
  return <script id="wt-mkt" dangerouslySetInnerHTML={{ __html: js }} />;
}
