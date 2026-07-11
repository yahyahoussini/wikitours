-- ============================================================================
-- Wiki Tours / Bab Makkah — seed.sql
-- Client's REAL poster data only (LAWS §10). Idempotent: safe to re-run.
-- Missing facts stay NULL so the corresponding UI sections hide.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SETTINGS (single row)
-- ----------------------------------------------------------------------------
insert into public.settings
  (id, default_locale, whatsapp_number, phone_1, phone_2, phone_3, email, community_count)
values
  (1, 'fr', '+212660655655', '0634845177', '0660655655', '0694139494',
   'contact@wikitours.ma', '925K')
on conflict (id) do update set
  default_locale = excluded.default_locale,
  whatsapp_number = excluded.whatsapp_number,
  phone_1 = excluded.phone_1,
  phone_2 = excluded.phone_2,
  phone_3 = excluded.phone_3,
  email = excluded.email,
  community_count = excluded.community_count;

-- ----------------------------------------------------------------------------
-- TEAM (real people from the agency deck — Prompt 2 §3). Roles ×3 languages.
-- The two "Encadrant Technique & Religieux" are the Bab Makkah trust anchors;
-- "Responsable Omra & Hajj" is the named human behind the booking card.
-- Photos arrive later via admin galleries (section renders regardless).
-- ----------------------------------------------------------------------------
insert into public.team_members
  (name, role_fr, role_ar, role_en, sort_order, is_published)
select v.name, v.role_fr, v.role_ar, v.role_en, v.sort_order, true
from (
  values
  ('Soumaya Guerssel',  'Directrice Générale',              'المديرة العامة',      'General Manager',           1),
  ('Abir Aitlho',       'Chef d''Agence',                   'رئيسة الوكالة',        'Agency Manager',            2),
  ('Aya Tahiri',        'Responsable Omra & Hajj',          'مسؤولة العمرة والحج',  'Umrah & Hajj Manager',      3),
  ('Mustapha Elkhaoui', 'Encadrant Technique & Religieux',  'مؤطر تقني وديني',      'Technical & Religious Guide', 4),
  ('Hassan Elasyly',    'Encadrant Technique & Religieux',  'مؤطر تقني وديني',      'Technical & Religious Guide', 5)
) as v(name, role_fr, role_ar, role_en, sort_order)
where not exists (
  select 1 from public.team_members t where t.name = v.name
);

-- ----------------------------------------------------------------------------
-- OCCASIONS (incl. Hijri months)
-- ----------------------------------------------------------------------------
insert into public.occasions (slug, name_fr, name_ar, name_en, sort_order, is_published)
values
  ('ete',                 'Été',                'الصيف',           'Summer',          1, true),
  ('mawlid',              'Mawlid',             'المولد النبوي',    'Mawlid',          2, true),
  ('ramadan',             'Ramadan',            'رمضان',           'Ramadan',         3, true),
  ('rajab',               'Rajab',              'رجب',             'Rajab',           4, false),
  ('chaabane',            'Chaâbane',           'شعبان',           'Sha''ban',        5, false),
  ('chawal',              'Chawal',             'شوال',            'Shawwal',         6, false),
  ('vacances-scolaires',  'Vacances scolaires', 'العطلة المدرسية',  'School holidays', 7, false)
on conflict (slug) do update set
  name_fr = excluded.name_fr,
  name_ar = excluded.name_ar,
  name_en = excluded.name_en,
  sort_order = excluded.sort_order,
  is_published = excluded.is_published;

-- ----------------------------------------------------------------------------
-- HOTELS (from the poster)
-- ----------------------------------------------------------------------------
insert into public.hotels
  (slug, name, city, distance_to_haram_m, stars, breakfast_included, is_published)
values
  ('abraj-al-kiswah',    'Abraj Al Kiswah',     'makkah',  900,  null, false, true),
  ('taj-park',           'Taj Park',            'makkah',  700,  null, false, true),
  ('swiss-international','Swiss International', 'makkah',  600,  null, true,  true),
  ('anjum',              'Anjum',               'makkah',  50,   5,    true,  true),
  ('makarem-madinah',    'Makarem Madinah',     'madinah', null, null, false, true)
on conflict (slug) do update set
  name = excluded.name,
  city = excluded.city,
  distance_to_haram_m = excluded.distance_to_haram_m,
  stars = excluded.stars,
  breakfast_included = excluded.breakfast_included,
  is_published = excluded.is_published;

-- ----------------------------------------------------------------------------
-- OFFERS — Omra Juillet 2026 (08 → 21/07/2026, Saudia, 14j/13n)
-- Real per-room price ladder from the poster (MAD / person).
-- Tier → hotel mapping follows the poster order (editable in admin).
-- ----------------------------------------------------------------------------
insert into public.offers
  (slug, occasion_id, hotel_makkah_id, hotel_madinah_id, tier_label,
   title_fr, title_ar, title_en,
   duration_days, duration_nights, airline, date_start, date_end,
   price_double, price_triple, price_quad, price_quint, starting_price,
   status, is_featured, land_only, is_published)
values
  ('omra-juillet-2026-economique',
   (select id from public.occasions where slug = 'ete'),
   (select id from public.hotels where slug = 'abraj-al-kiswah'),
   (select id from public.hotels where slug = 'makarem-madinah'),
   'economique',
   'Omra Juillet 2026 — Économique',
   'عمرة يوليو 2026 — اقتصادي',
   'Umrah July 2026 — Economy',
   14, 13, 'Saudia', date '2026-07-08', date '2026-07-21',
   17100, 16200, 15400, 14900, 14900,
   'open', true, false, true),

  ('omra-juillet-2026-confort',
   (select id from public.occasions where slug = 'ete'),
   (select id from public.hotels where slug = 'taj-park'),
   (select id from public.hotels where slug = 'makarem-madinah'),
   'confort',
   'Omra Juillet 2026 — Confort',
   'عمرة يوليو 2026 — كونفور',
   'Umrah July 2026 — Comfort',
   14, 13, 'Saudia', date '2026-07-08', date '2026-07-21',
   18300, 16800, 15900, null, 15900,
   'open', true, false, true),

  ('omra-juillet-2026-premium',
   (select id from public.occasions where slug = 'ete'),
   (select id from public.hotels where slug = 'swiss-international'),
   (select id from public.hotels where slug = 'makarem-madinah'),
   'premium',
   'Omra Juillet 2026 — Premium',
   'عمرة يوليو 2026 — بريميوم',
   'Umrah July 2026 — Premium',
   14, 13, 'Saudia', date '2026-07-08', date '2026-07-21',
   21200, 19700, 18900, null, 18900,
   'open', true, false, true),

  ('omra-juillet-2026-vip',
   (select id from public.occasions where slug = 'ete'),
   (select id from public.hotels where slug = 'anjum'),
   (select id from public.hotels where slug = 'makarem-madinah'),
   'vip',
   'Omra Juillet 2026 — VIP',
   'عمرة يوليو 2026 — VIP',
   'Umrah July 2026 — VIP',
   14, 13, 'Saudia', date '2026-07-08', date '2026-07-21',
   26900, 24200, 21900, null, 21900,
   'open', true, false, true)
on conflict (slug) do update set
  occasion_id = excluded.occasion_id,
  hotel_makkah_id = excluded.hotel_makkah_id,
  hotel_madinah_id = excluded.hotel_madinah_id,
  tier_label = excluded.tier_label,
  title_fr = excluded.title_fr,
  title_ar = excluded.title_ar,
  title_en = excluded.title_en,
  duration_days = excluded.duration_days,
  duration_nights = excluded.duration_nights,
  airline = excluded.airline,
  date_start = excluded.date_start,
  date_end = excluded.date_end,
  price_double = excluded.price_double,
  price_triple = excluded.price_triple,
  price_quad = excluded.price_quad,
  price_quint = excluded.price_quint,
  starting_price = excluded.starting_price,
  status = excluded.status,
  is_featured = excluded.is_featured,
  land_only = excluded.land_only,
  is_published = excluded.is_published;

-- ----------------------------------------------------------------------------
-- OFFERS — Omra Mawlid 2026 (16j/15n, +1000 MAD/room vs July)
-- Two departure windows → one offer row per tier per window.
-- Hotels not confirmed for Mawlid on the poster → left NULL (sections hide).
-- NOTE: poster headline "from 15 900" does not match confort quad + 1000
-- (= 16 900); starting_price is computed from the real room ladder —
-- flag for client confirmation.
-- ----------------------------------------------------------------------------
insert into public.offers
  (slug, occasion_id, tier_label,
   title_fr, title_ar, title_en,
   duration_days, duration_nights, date_start, date_end,
   price_double, price_triple, price_quad, starting_price,
   status, is_featured, land_only, is_published)
values
  ('omra-mawlid-2026-confort-19-aout',
   (select id from public.occasions where slug = 'mawlid'), 'confort',
   'Omra Mawlid 2026 — Confort (départ 19 août)',
   'عمرة المولد النبوي 2026 — كونفور (انطلاق 19 غشت)',
   'Umrah Mawlid 2026 — Comfort (19 Aug departure)',
   16, 15, date '2026-08-19', date '2026-09-03',
   19300, 17800, 16900, 16900,
   'open', false, false, true),

  ('omra-mawlid-2026-premium-19-aout',
   (select id from public.occasions where slug = 'mawlid'), 'premium',
   'Omra Mawlid 2026 — Premium (départ 19 août)',
   'عمرة المولد النبوي 2026 — بريميوم (انطلاق 19 غشت)',
   'Umrah Mawlid 2026 — Premium (19 Aug departure)',
   16, 15, date '2026-08-19', date '2026-09-03',
   22200, 20700, 19900, 19900,
   'open', false, false, true),

  ('omra-mawlid-2026-vip-19-aout',
   (select id from public.occasions where slug = 'mawlid'), 'vip',
   'Omra Mawlid 2026 — VIP (départ 19 août)',
   'عمرة المولد النبوي 2026 — VIP (انطلاق 19 غشت)',
   'Umrah Mawlid 2026 — VIP (19 Aug departure)',
   16, 15, date '2026-08-19', date '2026-09-03',
   27900, 25200, 22900, 22900,
   'open', false, false, true),

  ('omra-mawlid-2026-confort-24-aout',
   (select id from public.occasions where slug = 'mawlid'), 'confort',
   'Omra Mawlid 2026 — Confort (départ 24 août)',
   'عمرة المولد النبوي 2026 — كونفور (انطلاق 24 غشت)',
   'Umrah Mawlid 2026 — Comfort (24 Aug departure)',
   16, 15, date '2026-08-24', date '2026-09-08',
   19300, 17800, 16900, 16900,
   'open', false, false, true),

  ('omra-mawlid-2026-premium-24-aout',
   (select id from public.occasions where slug = 'mawlid'), 'premium',
   'Omra Mawlid 2026 — Premium (départ 24 août)',
   'عمرة المولد النبوي 2026 — بريميوم (انطلاق 24 غشت)',
   'Umrah Mawlid 2026 — Premium (24 Aug departure)',
   16, 15, date '2026-08-24', date '2026-09-08',
   22200, 20700, 19900, 19900,
   'open', false, false, true),

  ('omra-mawlid-2026-vip-24-aout',
   (select id from public.occasions where slug = 'mawlid'), 'vip',
   'Omra Mawlid 2026 — VIP (départ 24 août)',
   'عمرة المولد النبوي 2026 — VIP (انطلاق 24 غشت)',
   'Umrah Mawlid 2026 — VIP (24 Aug departure)',
   16, 15, date '2026-08-24', date '2026-09-08',
   27900, 25200, 22900, 22900,
   'open', false, false, true)
on conflict (slug) do update set
  occasion_id = excluded.occasion_id,
  tier_label = excluded.tier_label,
  title_fr = excluded.title_fr,
  title_ar = excluded.title_ar,
  title_en = excluded.title_en,
  duration_days = excluded.duration_days,
  duration_nights = excluded.duration_nights,
  date_start = excluded.date_start,
  date_end = excluded.date_end,
  price_double = excluded.price_double,
  price_triple = excluded.price_triple,
  price_quad = excluded.price_quad,
  starting_price = excluded.starting_price,
  status = excluded.status,
  is_featured = excluded.is_featured,
  land_only = excluded.land_only,
  is_published = excluded.is_published;

-- Ramadan 2027: occasion published above; offers await client pricing.

-- ----------------------------------------------------------------------------
-- FAQS — 6 trust questions (category 'confiance')
-- ----------------------------------------------------------------------------
insert into public.faqs
  (question_fr, question_ar, question_en, answer_fr, answer_ar, answer_en,
   category, sort_order, is_published)
select v.question_fr, v.question_ar, v.question_en,
       v.answer_fr, v.answer_ar, v.answer_en,
       v.category, v.sort_order, v.is_published
from (
  values
  ($fr$Comment vérifier que Wiki Tours est une agence agréée ?$fr$,
   $ar$كيف أتأكد من أن ويكي تورز وكالة مرخصة؟$ar$,
   $en$How can I verify that Wiki Tours is a licensed agency?$en$,
   $fr$Notre numéro de licence d'agence de voyages est disponible sur simple demande et affiché à l'agence. Vous pouvez le vérifier auprès du Ministère du Tourisme du Maroc, et venir nous rencontrer sur place avant toute réservation.$fr$,
   $ar$رقم رخصتنا كوكالة أسفار متوفر عند الطلب ومعروض بمقر الوكالة. يمكنكم التحقق منه لدى وزارة السياحة المغربية، وزيارتنا شخصياً قبل أي حجز.$ar$,
   $en$Our travel agency license number is available on request and displayed at the agency. You can verify it with the Moroccan Ministry of Tourism, and visit us in person before any booking.$en$,
   'confiance', 1, true),

  ($fr$Comment se passe la réservation ?$fr$,
   $ar$كيف تتم عملية الحجز؟$ar$,
   $en$How does booking work?$en$,
   $fr$Vous envoyez une demande via le site ou WhatsApp. Notre équipe vous rappelle pour confirmer les détails (dates, chambre, documents), puis la réservation est finalisée à l'agence.$fr$,
   $ar$ترسلون طلبكم عبر الموقع أو واتساب، ثم يتصل بكم فريقنا لتأكيد التفاصيل (التواريخ، الغرفة، الوثائق)، ويُستكمل الحجز بمقر الوكالة.$ar$,
   $en$You send a request via the website or WhatsApp. Our team calls you back to confirm the details (dates, room, documents), then the booking is finalised at the agency.$en$,
   'confiance', 2, true),

  ($fr$Le paiement se fait-il en ligne ?$fr$,
   $ar$هل يتم الدفع عبر الإنترنت؟$ar$,
   $en$Is payment made online?$en$,
   $fr$Non. Aucun paiement n'est demandé sur ce site : votre réservation est une demande, pas un achat. Le règlement s'effectue directement auprès de l'agence, avec un reçu officiel.$fr$,
   $ar$لا. لا يُطلب أي أداء عبر هذا الموقع: حجزكم هو طلب وليس عملية شراء. يتم الأداء مباشرة لدى الوكالة مقابل وصل رسمي.$ar$,
   $en$No. No payment is requested on this website: your reservation is a request, not a purchase. Payment is made directly at the agency, with an official receipt.$en$,
   'confiance', 3, true),

  ($fr$Quels documents faut-il pour l'Omra ?$fr$,
   $ar$ما هي الوثائق المطلوبة للعمرة؟$ar$,
   $en$Which documents are needed for Umrah?$en$,
   $fr$Un passeport valide au moins 6 mois après la date de retour et des photos d'identité. Notre équipe s'occupe des démarches de visa et vous communique la liste complète lors de la confirmation.$fr$,
   $ar$جواز سفر صالح لمدة 6 أشهر على الأقل بعد تاريخ العودة وصور شخصية. يتكفل فريقنا بإجراءات التأشيرة ويوافيكم بالقائمة الكاملة عند التأكيد.$ar$,
   $en$A passport valid at least 6 months after the return date and identity photos. Our team handles the visa process and sends you the full list upon confirmation.$en$,
   'confiance', 4, true),

  ($fr$Que comprend le prix d'une offre Omra ?$fr$,
   $ar$ماذا يشمل ثمن عرض العمرة؟$ar$,
   $en$What does the price of an Umrah offer include?$en$,
   $fr$Les inclusions exactes sont listées sur la fiche de chaque offre (hôtels à La Mecque et Médine, vols, transferts, accompagnement selon l'offre). Ce qui n'y figure pas n'est pas inclus — n'hésitez pas à nous demander.$fr$,
   $ar$تُذكر التفاصيل الدقيقة في صفحة كل عرض (الفنادق بمكة والمدينة، الطيران، التنقلات، المرافقة حسب العرض). ما لم يُذكر فهو غير مشمول — لا تترددوا في سؤالنا.$ar$,
   $en$The exact inclusions are listed on each offer page (hotels in Makkah and Madinah, flights, transfers, accompaniment depending on the offer). Anything not listed is not included — feel free to ask us.$en$,
   'confiance', 5, true),

  ($fr$Puis-je visiter votre agence ?$fr$,
   $ar$هل يمكنني زيارة وكالتكم؟$ar$,
   $en$Can I visit your agency?$en$,
   $fr$Oui, et nous vous y encourageons. Nos coordonnées et horaires figurent sur la page contact ; vous pouvez aussi nous appeler ou nous écrire sur WhatsApp avant de passer.$fr$,
   $ar$نعم، بل ننصحكم بذلك. تجدون عنواننا وأوقات العمل في صفحة الاتصال؛ ويمكنكم الاتصال بنا أو مراسلتنا على واتساب قبل الزيارة.$ar$,
   $en$Yes, and we encourage it. Our address and opening hours are on the contact page; you can also call us or write to us on WhatsApp before coming.$en$,
   'confiance', 6, true)
) as v(question_fr, question_ar, question_en, answer_fr, answer_ar, answer_en,
       category, sort_order, is_published)
where not exists (
  select 1 from public.faqs f where f.question_fr = v.question_fr
);

-- ----------------------------------------------------------------------------
-- TIMELINE — 4 steps of the journey
-- ----------------------------------------------------------------------------
insert into public.timeline_items
  (title_fr, title_ar, title_en, body_fr, body_ar, body_en, sort_order, is_published)
select v.title_fr, v.title_ar, v.title_en, v.body_fr, v.body_ar, v.body_en,
       v.sort_order, v.is_published
from (
  values
  ($fr$Votre demande$fr$, $ar$طلبكم$ar$, $en$Your request$en$,
   $fr$Vous choisissez une offre et envoyez votre demande via le formulaire ou WhatsApp — sans aucun paiement en ligne.$fr$,
   $ar$تختارون العرض وترسلون طلبكم عبر الاستمارة أو واتساب — دون أي أداء عبر الإنترنت.$ar$,
   $en$You choose an offer and send your request via the form or WhatsApp — with no online payment.$en$,
   1, true),

  ($fr$Confirmation$fr$, $ar$التأكيد$ar$, $en$Confirmation$en$,
   $fr$Notre équipe vous contacte pour confirmer les dates, le type de chambre et les documents nécessaires.$fr$,
   $ar$يتصل بكم فريقنا لتأكيد التواريخ ونوع الغرفة والوثائق المطلوبة.$ar$,
   $en$Our team contacts you to confirm the dates, room type and required documents.$en$,
   2, true),

  ($fr$Préparation$fr$, $ar$الاستعداد$ar$, $en$Preparation$en$,
   $fr$Visa, billets et préparatifs : nous vous accompagnons pas à pas jusqu'au départ.$fr$,
   $ar$التأشيرة والتذاكر والاستعدادات: نرافقكم خطوة بخطوة حتى يوم السفر.$ar$,
   $en$Visa, tickets and preparations: we guide you step by step until departure.$en$,
   3, true),

  ($fr$Le voyage$fr$, $ar$الرحلة$ar$, $en$The journey$en$,
   $fr$Départ en groupe et séjour à La Mecque et Médine avec l'accompagnement Bab Makkah by Wiki Tours.$fr$,
   $ar$سفر جماعي وإقامة بمكة المكرمة والمدينة المنورة بمرافقة باب مكة من ويكي تورز.$ar$,
   $en$Group departure and stay in Makkah and Madinah with Bab Makkah by Wiki Tours accompaniment.$en$,
   4, true)
) as v(title_fr, title_ar, title_en, body_fr, body_ar, body_en, sort_order, is_published)
where not exists (
  select 1 from public.timeline_items t where t.title_fr = v.title_fr
);

-- ----------------------------------------------------------------------------
-- DESTINATIONS
-- ----------------------------------------------------------------------------
insert into public.destinations
  (slug, name_fr, name_ar, name_en, tagline_fr, tagline_ar, tagline_en,
   sort_order, is_published)
values
  ('la-mecque', 'La Mecque', 'مكة المكرمة', 'Makkah',
   $fr$La ville sainte, cœur de l'Omra$fr$, 'المدينة المقدسة، قلب العمرة', 'The holy city, heart of Umrah',
   1, true),
  ('medine', 'Médine', 'المدينة المنورة', 'Madinah',
   'La ville du Prophète', 'مدينة الرسول ﷺ', 'The city of the Prophet',
   2, true),
  ('jeddah', 'Djeddah', 'جدة', 'Jeddah',
   $fr$Porte d'entrée des Lieux Saints$fr$, 'بوابة الحرمين الشريفين', 'Gateway to the Holy Cities',
   3, true),
  ('taif', 'Taïf', 'الطائف', 'Taif',
   $fr$Escapade en altitude près de La Mecque$fr$, 'مرتفعات قريبة من مكة', 'Highland escape near Makkah',
   4, true)
on conflict (slug) do update set
  name_fr = excluded.name_fr,
  name_ar = excluded.name_ar,
  name_en = excluded.name_en,
  tagline_fr = excluded.tagline_fr,
  tagline_ar = excluded.tagline_ar,
  tagline_en = excluded.tagline_en,
  sort_order = excluded.sort_order,
  is_published = excluded.is_published;

-- ----------------------------------------------------------------------------
-- PILLAR ARTICLE — trust content, answer-first (LAWS §5)
-- ----------------------------------------------------------------------------
insert into public.articles
  (slug, category, author_name, published_at, is_published,
   title_fr, title_ar, title_en,
   excerpt_fr, excerpt_ar, excerpt_en,
   body_fr, body_ar, body_en)
values
  ('comment-verifier-agence-omra-agreee-maroc',
   'confiance', 'Wiki Tours International', now(), true,

   $fr$Comment vérifier qu'une agence Omra est agréée au Maroc$fr$,
   $ar$كيف تتحقق من أن وكالة العمرة مرخصة في المغرب$ar$,
   $en$How to verify that an Umrah agency is licensed in Morocco$en$,

   $fr$Pour vérifier qu'une agence Omra est agréée au Maroc : demandez son numéro de licence, vérifiez-le auprès du Ministère du Tourisme, confirmez l'adresse physique et exigez un reçu officiel pour tout paiement.$fr$,
   $ar$للتحقق من أن وكالة العمرة مرخصة في المغرب: اطلب رقم الرخصة، وتحقق منه لدى وزارة السياحة، وتأكد من وجود مقر فعلي، واطلب وصلاً رسمياً عند أي أداء.$ar$,
   $en$To verify that an Umrah agency is licensed in Morocco: ask for its license number, check it with the Ministry of Tourism, confirm the physical address and require an official receipt for any payment.$en$,

   $frbody$**Pour vérifier qu'une agence Omra est agréée au Maroc : demandez son numéro de licence d'agence de voyages, vérifiez-le auprès du Ministère du Tourisme, confirmez qu'elle dispose d'une adresse physique que vous pouvez visiter, et exigez un contrat et un reçu officiel pour tout paiement.** Une agence sérieuse vous donne ces informations sans hésiter.

## 1. Demandez le numéro de licence

Toute agence de voyages légale au Maroc détient une licence délivrée par le Ministère du Tourisme. Ce numéro doit être affiché à l'agence et communiqué sur simple demande. Si une agence refuse de le donner ou change de sujet, passez votre chemin.

## 2. Vérifiez auprès des autorités

Le Ministère du Tourisme tient la liste des agences de voyages autorisées. Pour le Hajj, la liste des agences habilitées est publiée chaque année par le Ministère des Habous et des Affaires Islamiques — une agence ne peut pas « vendre » le Hajj en dehors de ce cadre.

## 3. Exigez une adresse physique — et visitez-la

Une agence agréée a un local réel, avec des horaires d'ouverture et une équipe que vous pouvez rencontrer. Méfiez-vous des « agences » qui n'existent que sur les réseaux sociaux et ne donnent jamais d'adresse.

## 4. Repérez les signaux d'alerte

- Prix anormalement bas par rapport au marché ;
- Paiement demandé par virement vers un compte de particulier ;
- Aucun contrat, aucun reçu ;
- Page créée récemment, sans historique ni avis vérifiables ;
- Pression pour « payer aujourd'hui, sinon le prix monte ».

## 5. Le paiement : jamais en ligne à l'aveugle, toujours avec reçu

Une réservation sérieuse commence par une demande, pas par un paiement. Le règlement se fait à l'agence, contre un contrat et un reçu officiel qui mentionnent l'agence, le voyage et le montant.

## Chez Wiki Tours

Wiki Tours International applique exactement ces règles : notre licence est vérifiable — consultez [notre page agrément](/fr/agrement) — et nos offres, comme l'[Omra Juillet 2026](/fr/omra/omra-juillet-2026-economique), se réservent par demande, sans aucun paiement en ligne. Vous êtes toujours les bienvenus à l'agence.$frbody$,

   $arbody$**للتحقق من أن وكالة العمرة مرخصة في المغرب: اطلب رقم رخصة وكالة الأسفار، وتحقق منه لدى وزارة السياحة، وتأكد من وجود مقر فعلي يمكنك زيارته، واطلب عقداً ووصلاً رسمياً عند أي أداء.** الوكالة الجادة تقدم لك هذه المعلومات دون تردد.

## 1. اطلب رقم الرخصة

كل وكالة أسفار قانونية في المغرب تتوفر على رخصة مسلمة من وزارة السياحة. يجب أن يكون هذا الرقم معروضاً بالوكالة ومتاحاً عند الطلب. إذا رفضت الوكالة تقديمه، فابتعد عنها.

## 2. تحقق لدى الجهات الرسمية

تتوفر وزارة السياحة على لائحة وكالات الأسفار المرخصة. أما الحج، فتنشر وزارة الأوقاف والشؤون الإسلامية كل سنة لائحة الوكالات المؤهلة — ولا يمكن لأي وكالة «بيع» الحج خارج هذا الإطار.

## 3. اشترط وجود مقر فعلي — وقم بزيارته

الوكالة المرخصة لها محل حقيقي بأوقات عمل وفريق يمكنك لقاؤه. احذر من «وكالات» لا وجود لها إلا على مواقع التواصل ولا تقدم أي عنوان.

## 4. انتبه لعلامات الخطر

- أثمنة منخفضة بشكل غير طبيعي مقارنة بالسوق؛
- طلب الأداء بتحويل إلى حساب شخص عادي؛
- لا عقد ولا وصل؛
- صفحة حديثة الإنشاء بلا تاريخ ولا آراء موثوقة؛
- الضغط عليك «للدفع اليوم وإلا ارتفع الثمن».

## 5. الأداء: ليس عبر الإنترنت عشوائياً، ودائماً مقابل وصل

الحجز الجاد يبدأ بطلب، لا بأداء. يتم الأداء بمقر الوكالة مقابل عقد ووصل رسمي يذكر الوكالة والرحلة والمبلغ.

## في ويكي تورز

تطبق ويكي تورز إنترناشيونال هذه القواعد بالضبط: رخصتنا قابلة للتحقق — راجعوا [صفحة الترخيص](/ar/agrement) — وعروضنا، مثل [عمرة يوليو 2026](/ar/omra/omra-juillet-2026-economique)، تُحجز بطلب دون أي أداء عبر الإنترنت. ومرحباً بكم دائماً بمقر الوكالة.$arbody$,

   $enbody$**To verify that an Umrah agency is licensed in Morocco: ask for its travel agency license number, check it with the Ministry of Tourism, confirm it has a physical address you can visit, and require a contract and an official receipt for any payment.** A serious agency gives you this information without hesitation.

## 1. Ask for the license number

Every legal travel agency in Morocco holds a license issued by the Ministry of Tourism. The number must be displayed at the agency and given on request. If an agency refuses to share it, walk away.

## 2. Check with the authorities

The Ministry of Tourism keeps the list of authorised travel agencies. For Hajj, the list of accredited agencies is published every year by the Ministry of Habous and Islamic Affairs — no agency can "sell" Hajj outside that framework.

## 3. Require a physical address — and visit it

A licensed agency has real premises, opening hours and a team you can meet. Beware of "agencies" that only exist on social media and never give an address.

## 4. Watch for red flags

- Prices abnormally low compared to the market;
- Payment requested by transfer to a private individual's account;
- No contract, no receipt;
- A recently created page with no history or verifiable reviews;
- Pressure to "pay today or the price goes up".

## 5. Payment: never blindly online, always with a receipt

A serious booking starts with a request, not a payment. Payment happens at the agency, against a contract and an official receipt naming the agency, the trip and the amount.

## At Wiki Tours

Wiki Tours International applies exactly these rules: our license is verifiable — see [our license page](/en/agrement) — and our offers, such as [Umrah July 2026](/en/omra/omra-juillet-2026-economique), are booked by request, with no online payment whatsoever. You are always welcome at the agency.$enbody$)
on conflict (slug) do update set
  category = excluded.category,
  author_name = excluded.author_name,
  is_published = excluded.is_published,
  title_fr = excluded.title_fr,
  title_ar = excluded.title_ar,
  title_en = excluded.title_en,
  excerpt_fr = excluded.excerpt_fr,
  excerpt_ar = excluded.excerpt_ar,
  excerpt_en = excluded.excerpt_en,
  body_fr = excluded.body_fr,
  body_ar = excluded.body_ar,
  body_en = excluded.body_en;

-- ----------------------------------------------------------------------------
-- SERVICES (/voyages) — only the REAL confirmed item (LAWS §10): Omra & Hajj
-- under "Individuels", linking to Bab Makkah. Other services await client input.
-- ----------------------------------------------------------------------------
insert into public.services
  (slug, section, name_fr, name_ar, name_en, description_fr, description_ar, description_en, sort_order, is_published)
values
  ('omra-hajj', 'individuels',
   'Omra & Hajj — Bab Makkah', 'عمرة وحج — باب مكة', 'Umrah & Hajj — Bab Makkah',
   'Nos départs Omra et Hajj sont organisés par Bab Makkah, le service premium de Wiki Tours.',
   'رحلات العمرة والحج ينظمها باب مكة، الخدمة المتميزة لويكي تورز.',
   'Our Umrah and Hajj departures are organised by Bab Makkah, Wiki Tours'' premium service.',
   1, true)
on conflict (slug) do update set
  section = excluded.section,
  name_fr = excluded.name_fr,
  name_ar = excluded.name_ar,
  name_en = excluded.name_en,
  description_fr = excluded.description_fr,
  description_ar = excluded.description_ar,
  description_en = excluded.description_en,
  sort_order = excluded.sort_order,
  is_published = excluded.is_published;

-- ----------------------------------------------------------------------------
-- REDIRECTS — old-spelling migration: "Bab Makka" → canonical "Bab Makkah"
-- (LAWS §1: "Bab Makka" is only ever a redirect/secondary keyword). Bare +
-- per-locale so the middleware catches it before and after locale routing.
-- ----------------------------------------------------------------------------
insert into public.redirects (from_path, to_path, permanent, is_active)
values
  ('/bab-makka',    '/bab-makkah',    true, true),
  ('/fr/bab-makka', '/fr/bab-makkah', true, true),
  ('/ar/bab-makka', '/ar/bab-makkah', true, true),
  ('/en/bab-makka', '/en/bab-makkah', true, true)
on conflict (from_path) do update set
  to_path = excluded.to_path,
  permanent = excluded.permanent,
  is_active = excluded.is_active;

-- ----------------------------------------------------------------------------
-- KEYWORD CHECKS — 10 money queries to track (incl. AR + AI engines)
-- ----------------------------------------------------------------------------
insert into public.keyword_checks (keyword, engine, notes)
select v.keyword, v.engine, v.notes
from (
  values
  ('omra maroc',                                   'google',      'seed — requête cible'),
  ('prix omra 2026 maroc',                         'google',      'seed — requête cible'),
  ($fr$agence omra agréée maroc$fr$,               'google',      'seed — requête cible'),
  ('omra juillet 2026 maroc',                      'google',      'seed — requête cible'),
  ('omra mawlid 2026',                             'google',      'seed — requête cible'),
  ('bab makkah wiki tours',                        'google',      'seed — requête marque'),
  ('عمرة من المغرب 2026',                          'google',      'seed — requête cible AR'),
  ('وكالة عمرة مرخصة في المغرب',                   'google',      'seed — requête cible AR'),
  ($fr$meilleure agence omra agréée au maroc$fr$,  'chatgpt',     'seed — requête GEO/AEO'),
  ($fr$comment vérifier agence omra agréée maroc$fr$, 'ai_overview', 'seed — requête GEO/AEO')
) as v(keyword, engine, notes)
where not exists (
  select 1 from public.keyword_checks k
  where k.keyword = v.keyword and k.engine = v.engine
);
