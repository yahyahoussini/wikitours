# Meta descriptions — every page type, every locale

Generated from the build's prerendered HTML. Regenerate after changing the
`meta` block in `src/i18n/*.json` or `src/lib/page-seo.js`.

Authored templates replace the old `clampDesc(<body copy>)`, which sliced the
first paragraph at 155 characters and appended an ellipsis. Before this change
**24 of 78** measured URLs ended mid-sentence and **54 of 78** sat under 150.

The ceiling is **155**, not 160: `scripts/seo-audit.js:145` fails the build above
it, and it decodes HTML entities first, so `&#x27;` counts as one character.

| page type | locale | chars | differentiator | description |
|---|---|---|---|---|
| home | fr | 150 | licence + no-online-payment | Omra depuis le Maroc avec Bab Makka : hôtels proches du Haram, prix réels. Agence agréée ODV-25012. Aucun paiement en ligne, contrat signé à l'agence. |
| home | ar | 142 | licence + no-online-payment | العمرة من المغرب مع باب مكة: فنادق قريبة من الحرم وأسعار حقيقية لكل غرفة. وكالة مرخصة ODV-25012. دون أي أداء عبر الإنترنت، عقد موقّع بالوكالة. |
| home | en | 151 | licence + no-online-payment | Omra from Morocco with Bab Makka: hotels near the Haram, real per-room prices. Licensed agency ODV-25012. No online payment, contract signed in person. |
| bab-makka hub | fr | 153 | licence + no-online-payment | Tous nos départs Omra depuis Casablanca : gammes, hôtels et prix par chambre. Agence agréée ODV-25012. Aucun paiement en ligne, contrat signé à l'agence. |
| bab-makka hub | ar | 139 | licence + no-online-payment | جميع رحلات العمرة من الدار البيضاء: الفئات والفنادق والأسعار لكل غرفة. وكالة مرخصة ODV-25012. دون أي أداء عبر الإنترنت، عقد موقّع بالوكالة. |
| bab-makka hub | en | 146 | licence + no-online-payment | Every Omra departure from Casablanca: tiers, hotels and real room prices. Licensed agency ODV-25012. No online payment, contract signed in person. |
| departure /omra/{slug} | fr | 123 | price + no-online-payment | Omra 6 octobre 2026 : 14 nuits, vol Saudia, dès 12.300 MAD par personne. Aucun paiement en ligne, contrat signé à l'agence. |
| departure /omra/{slug} | ar | 143 | price | عمرة 6–20 أكتوبر 2026 مع السعودية (طيران مباشر): 15 يوماً، 4 فئات فنادق، قطار الحرمين، من 12.900 درهم للشخص. أثمنة حقيقية حسب الغرفة من المغرب. |
| departure /omra/{slug} | en | 147 | price | Umrah 6–20 October 2026 with Saudia (direct): 15 days, 4 hotel tiers, Al‑Haramain train, from 12,900 MAD/person. Real per-room prices from Morocco. |
| month lander | fr | 106 | licence | Omra octobre 2026 depuis le Maroc : départs, hôtels proches du Haram, prix réels. Agence agréée ODV-25012. |
| month lander | ar | 145 | licence + no-online-payment | عمرة أكتوبر 2026 من المغرب: الرحلات والفنادق القريبة من الحرم وأسعار حقيقية. وكالة مرخصة ODV-25012. دون أي أداء عبر الإنترنت، عقد موقّع بالوكالة. |
| month lander | en | 155 | licence + no-online-payment | Omra in October 2026 from Morocco: departures, hotels near the Haram, real prices. Licensed agency ODV-25012. No online payment, contract signed in person. |
| month lander (empty) | fr | 132 | licence | Omra janvier 2026 depuis le Maroc : aucun départ ouvert pour l'instant. Agence agréée ODV-25012. Réponse WhatsApp en moins de 5 min. |
| month lander (empty) | ar | 119 | licence | عمرة يناير 2026 من المغرب: لا توجد رحلة مفتوحة في الوقت الحالي. وكالة مرخصة ODV-25012. رد على واتساب في أقل من 5 دقائق. |
| month lander (empty) | en | 132 | licence | Omra in January 2026 from Morocco: no departure is open at the moment. Licensed agency ODV-25012. WhatsApp reply in under 5 minutes. |
| occasion lander | fr | 106 | licence | Omra Ramadan depuis le Maroc : hôtels proches du Haram et prix réels par chambre. Agence agréée ODV-25012. |
| occasion lander | ar | 141 | — | عمرة رمضان 2027 (≈ 7 فبراير – 8 مارس) من المغرب: فنادق قرب الحرم، فئات وأثمنة حقيقية حسب الغرفة، بداية الشهر أو العشر الأواخر. احجزوا مبكراً. |
| occasion lander | en | 147 | licence + no-online-payment | Ramadan Omra from Morocco: hotels near the Haram and real per-room prices. Licensed agency ODV-25012. No online payment, contract signed in person. |
| city page | fr | 150 | licence + price + no-online-payment | Omra depuis Casablanca dès 12.300 MAD. Agence agréée ODV-25012, contrat signé à l'agence, aucun paiement en ligne. Réponse WhatsApp en moins de 5 min. |
| city page | ar | 147 | licence + price + no-online-payment | عمرة من الدار البيضاء ابتداءً من 12.300 درهم. وكالة مرخصة ODV-25012، عقد موقّع بالوكالة، دون أي أداء عبر الإنترنت. رد على واتساب في أقل من 5 دقائق. |
| city page | en | 145 | licence + price + no-online-payment | Omra from Casablanca from 12.300 MAD. Licensed agency ODV-25012, contract signed in person, no online payment. WhatsApp reply in under 5 minutes. |
| hotel page | fr | 148 | no-online-payment | Anjum à La Mecque, à 50 m du Haram, dans nos programmes Omra. Aucun paiement en ligne, contrat signé à l'agence. Réponse WhatsApp en moins de 5 min. |
| hotel page | ar | 147 | — | احجز إقامتك في فندق أنجم مكة، على بُعد حوالي 100 متر من المسجد الحرام. فندق 5 نجوم يوفر غرفًا فاخرة، واي فاي مجاني، وخدمات راقية للمعتمرين والحجاج. |
| hotel page | en | 152 | — | Book your stay at Anjum Makkah Hotel, just 100 m from Al-Haram Mosque. Enjoy elegant rooms, free Wi-Fi, premium services, and a luxury Umrah experience. |
| guide pillar | fr | 129 | licence | Guide complet de l'Omra depuis le Maroc — le guide Omra de Bab Makka, écrit pour les pèlerins marocains. Agence agréée ODV-25012. |
| guide pillar | ar | 121 | licence | الدليل الشامل للعمرة انطلاقاً من المغرب — دليل العمرة من باب مكة، مكتوب خصيصاً للمعتمرين المغاربة. وكالة مرخصة ODV-25012. |
| guide pillar | en | 123 | licence | The complete Umrah guide from Morocco — the Bab Makka Omra guide, written for Moroccan pilgrims. Licensed agency ODV-25012. |
| guide child | fr | 134 | licence | Budget Omra : comprendre ce qui fait le prix — le guide Omra de Bab Makka, écrit pour les pèlerins marocains. Agence agréée ODV-25012. |
| guide child | ar | 115 | licence | ميزانية العمرة: فهم ما يصنع الثمن — دليل العمرة من باب مكة، مكتوب خصيصاً للمعتمرين المغاربة. وكالة مرخصة ODV-25012. |
| guide child | en | 121 | licence | Umrah budget: what drives the price — the Bab Makka Omra guide, written for Moroccan pilgrims. Licensed agency ODV-25012. |
| blog index | fr | 146 | licence + no-online-payment | Guides Omra & Hajj par l'équipe Bab Makka : documents, budget, hôtels. Agence agréée ODV-25012. Aucun paiement en ligne, contrat signé à l'agence. |
| blog index | ar | 132 | licence + no-online-payment | أدلة العمرة والحج من فريق باب مكة: الوثائق والميزانية والفنادق. وكالة مرخصة ODV-25012. دون أي أداء عبر الإنترنت، عقد موقّع بالوكالة. |
| blog index | en | 143 | licence + no-online-payment | Omra & Hajj guides from the Bab Makka team: documents, budget, hotels. Licensed agency ODV-25012. No online payment, contract signed in person. |
| blog post | fr | 148 | — | Combien coûte une Omra depuis le Maroc en 2026 ? Prix réels de nos départs de septembre à novembre, par gamme et type de chambre, pour bien choisir. |
| blog post | ar | 134 | — | كم تكلف العمرة من المغرب في 2026؟ الأسعار الحقيقية لرحلاتنا من شتنبر إلى نونبر، حسب الفئة ونوع الغرفة وما يشمله السعر، لتختاروا بوضوح. |
| blog post | en | 152 | — | How much does an Umrah from Morocco cost in 2026? Real prices of our September to November departures, by tier and room type, to choose with confidence. |
| agency page | fr | 137 | licence | Agence Omra à Casablanca, boulevard Abdelmoumen : programmes, hôtels, devis. Agence agréée ODV-25012. Réponse WhatsApp en moins de 5 min. |
| agency page | ar | 125 | licence | وكالة عمرة بالدار البيضاء، شارع عبد المومن: برامج وفنادق وعروض أسعار. وكالة مرخصة ODV-25012. رد على واتساب في أقل من 5 دقائق. |
| agency page | en | 139 | licence | Omra agency in Casablanca, boulevard Abdelmoumen: programmes, hotels, quotes. Licensed agency ODV-25012. WhatsApp reply in under 5 minutes. |
| hajj | fr | 143 | licence | Hajj depuis le Maroc : inscrivez votre intérêt, nous vous rappelons à l'ouverture. Agence agréée ODV-25012. Réponse WhatsApp en moins de 5 min. |
| hajj | ar | 118 | licence | الحج من المغرب: سجلوا اهتمامكم، ونتصل بكم فور الافتتاح الرسمي. وكالة مرخصة ODV-25012. رد على واتساب في أقل من 5 دقائق. |
| hajj | en | 134 | licence | Hajj from Morocco: register your interest and we call you when it opens. Licensed agency ODV-25012. WhatsApp reply in under 5 minutes. |
| voyages | fr | 146 | licence + no-online-payment | Voyages organisés depuis le Maroc : Istanbul, Bali, Thaïlande et plus. Agence agréée ODV-25012. Aucun paiement en ligne, contrat signé à l'agence. |
| voyages | ar | 131 | licence + no-online-payment | رحلات منظمة انطلاقاً من المغرب: إسطنبول وبالي وتايلاند وغيرها. وكالة مرخصة ODV-25012. دون أي أداء عبر الإنترنت، عقد موقّع بالوكالة. |
| voyages | en | 142 | licence + no-online-payment | Organised trips departing Morocco: Istanbul, Bali, Thailand and more. Licensed agency ODV-25012. No online payment, contract signed in person. |
| voyage detail | fr | 139 | price + no-online-payment | Voyage Istanbul été 2026 : 8 jours au départ de Casablanca, dès 10.900 MAD par personne. Aucun paiement en ligne, contrat signé à l'agence. |
| voyage detail | ar | 141 | price | إسطنبول 8 أيام / 7 ليالٍ من الدار البيضاء ابتداءً من 10 900 درهم. فنادق 3★ إلى 5★ مع الإفطار والتنقلات، انطلاقات أسبوعية في يوليوز وغشت 2026. |
| voyage detail | en | 147 | price | Istanbul 8 days / 7 nights from Casablanca from 10,900 MAD. 3★ to 5★ hotels with breakfast, transfers included, weekly departures July–August 2026. |
| avis | fr | 153 | licence + no-online-payment | Avis de pèlerins partis en Omra avec Bab Makka : vidéos et témoignages réels. Agence agréée ODV-25012. Aucun paiement en ligne, contrat signé à l'agence. |
| avis | ar | 131 | licence + no-online-payment | آراء معتمرين سافروا مع باب مكة: فيديوهات وشهادات حقيقية موثقة. وكالة مرخصة ODV-25012. دون أي أداء عبر الإنترنت، عقد موقّع بالوكالة. |
| avis | en | 149 | licence + no-online-payment | Reviews from pilgrims who travelled with Bab Makka: videos and testimonials. Licensed agency ODV-25012. No online payment, contract signed in person. |
| agrement | fr | 132 | licence + no-online-payment | Notre agrément : licence ODV-25012 du Ministère du Tourisme, affichée à l'agence. Aucun paiement en ligne, contrat signé à l'agence. |
| agrement | ar | 108 | licence + no-online-payment | ترخيصنا: رخصة ODV-25012 من وزارة السياحة، معروضة بمقر الوكالة. دون أي أداء عبر الإنترنت، عقد موقّع بالوكالة. |
| agrement | en | 123 | licence + no-online-payment | Our licence: ODV-25012 from the Ministry of Tourism, displayed at the agency. No online payment, contract signed in person. |
| contact | fr | 105 | — | Contactez Bab Makka à Casablanca : WhatsApp, téléphone ou formulaire. Réponse WhatsApp en moins de 5 min. |
| contact | ar | 144 | no-online-payment | تواصلوا مع باب مكة بالدار البيضاء: واتساب أو الهاتف أو الاستمارة. رد على واتساب في أقل من 5 دقائق. دون أي أداء عبر الإنترنت، عقد موقّع بالوكالة. |
| contact | en | 150 | no-online-payment | Contact Bab Makka in Casablanca: WhatsApp, phone or the enquiry form. WhatsApp reply in under 5 minutes. No online payment, contract signed in person. |
| omra-pas-cher | fr | 148 | licence + no-online-payment | Omra pas cher depuis le Maroc : chambres partagées et périodes hors pic. Agence agréée ODV-25012. Aucun paiement en ligne, contrat signé à l'agence. |
| omra-pas-cher | ar | 127 | licence + no-online-payment | عمرة في المتناول من المغرب: غرف مشتركة وفترات خارج الذروة. وكالة مرخصة ODV-25012. دون أي أداء عبر الإنترنت، عقد موقّع بالوكالة. |
| omra-pas-cher | en | 145 | licence + no-online-payment | Affordable Omra from Morocco: shared rooms and off-peak departure dates. Licensed agency ODV-25012. No online payment, contract signed in person. |
| hotels-omra | fr | 123 | no-online-payment | Nos hôtels à La Mecque et Médine, comparés par distance à pied du Haram. Aucun paiement en ligne, contrat signé à l'agence. |
| hotels-omra | ar | 135 | no-online-payment | فنادقنا بمكة والمدينة، مقارنة حسب مسافة المشي إلى الحرم. دون أي أداء عبر الإنترنت، عقد موقّع بالوكالة. رد على واتساب في أقل من 5 دقائق. |
| hotels-omra | en | 122 | no-online-payment | Our hotels in Makkah and Madinah, compared by walking distance to the Haram. No online payment, contract signed in person. |
| glossaire | fr | 100 | licence | Glossaire de l'Omra : ihram, tawaf, sa'i et 42 termes expliqués simplement. Agence agréée ODV-25012. |
| glossaire | ar | 82 | licence | معجم العمرة: الإحرام والطواف والسعي و42 مصطلحاً بشرح مبسّط. وكالة مرخصة ODV-25012. |
| glossaire | en | 91 | licence | Omra glossary: ihram, tawaf, sa'i and 42 terms explained simply. Licensed agency ODV-25012. |
| a-propos | fr | 155 | licence + no-online-payment | Wiki Tours International, agence de voyages marocaine à Casablanca depuis 2016. Agence agréée ODV-25012. Aucun paiement en ligne, contrat signé à l'agence. |
| a-propos | ar | 136 | licence + no-online-payment | ويكي تورز إنترناشيونال، وكالة أسفار مغربية بالدار البيضاء منذ 2016. وكالة مرخصة ODV-25012. دون أي أداء عبر الإنترنت، عقد موقّع بالوكالة. |
| a-propos | en | 149 | licence + no-online-payment | Wiki Tours International, a Moroccan travel agency in Casablanca since 2016. Licensed agency ODV-25012. No online payment, contract signed in person. |
| presse | fr | 106 | licence | Wiki Tours International et son service Omra Bab Makka dans les médias marocains. Agence agréée ODV-25012. |
| presse | ar | 134 | licence + no-online-payment | ويكي تورز إنترناشيونال وخدمتها باب مكة في وسائل الإعلام المغربية. وكالة مرخصة ODV-25012. دون أي أداء عبر الإنترنت، عقد موقّع بالوكالة. |
| presse | en | 147 | licence + no-online-payment | Wiki Tours International and its Bab Makka Omra service in Moroccan media. Licensed agency ODV-25012. No online payment, contract signed in person. |
| legal | fr | 96 | — | Politique de confidentialité de Wiki Tours International, agence de voyages agréée à Casablanca. |
| legal | ar | 80 | — | سياسة الخصوصية الخاصة بويكي تورز إنترناشيونال، وكالة أسفار مرخصة بالدار البيضاء. |
| legal | en | 83 | — | Privacy policy of Wiki Tours International, a licensed travel agency in Casablanca. |

## Notes

- Rows showing `—` under *differentiator* are **admin-authored** `seo_description`
  values that already fill the budget (141–152 chars), leaving no room to append
  a clause. Admin copy is kept verbatim (LAWS §4) rather than rewritten or cut.
  Clearing that field in /admin hands the page back to the template, which always
  carries price, licence or no-online-payment.
- **Data mismatch for /admin to fix:** the Anjum hotel's ar/en `seo_description`
  says 100 m from the Haram, while `hotels.distance_to_haram_m` says **50** — the
  figure the fr template renders. The admin copy has drifted from the data.
