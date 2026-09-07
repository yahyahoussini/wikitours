-- 018 — settings.postal_code for PostalAddress.postalCode.
--
-- The schema address is built from address_fr and had no way to emit a postal
-- code, so PostalAddress could never match the Google Business Profile address
-- component-by-component (Casablanca is the 20000 series). Admin-entered;
-- emitted only when set (LAW §10); never displayed as visible text.

alter table public.settings add column if not exists postal_code text;
