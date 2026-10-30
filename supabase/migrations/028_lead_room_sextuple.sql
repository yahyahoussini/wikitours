-- 028 — a lead can ask for the six-bed room (chambre sextuple / الغرفة السداسية)
--
-- Why this exists
-- ---------------
-- 027 gave offer_tiers a price_sextuple, and the departure page renders the
-- six-bed room — as the default room when it is the cheapest (the Ramadan 2027
-- 32-day programme, from 24.900 DH). The booking selector now offers it too, so
-- a visitor can pick it, and the reservation form posts room_type = 'sextuple'.
-- leads.room_type still carries the check from 003, which stops at 'quint'.
--
-- Until this is applied nothing is lost: src/app/api/lead/route.js retries a
-- refused six-bed lead with room_type NULL and writes « Chambre souhaitée :
-- sextuple » into its message. After it, the room is stored in its column.

alter table public.leads
  drop constraint if exists leads_room_type_check;

alter table public.leads
  add constraint leads_room_type_check
    check (room_type is null or room_type in ('double', 'triple', 'quad', 'quint', 'sextuple'));
