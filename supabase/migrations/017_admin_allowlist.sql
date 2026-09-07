-- 017 — RLS: `authenticated` is no longer synonymous with `admin`.
--
-- Until now every table carried:
--     create policy admin_full_access on public.<t>
--       for all to authenticated using (true) with check (true);
-- so ANY Supabase account could read/write leads (names, phones, IPs) and
-- settings (meta_capi_token, tiktok_events_token, indexnow_key) by calling
-- PostgREST directly with its own access token. The application-side allowlist
-- (src/lib/admin/authz.js) cannot stop that — it only guards the Next.js
-- surface — so the same rule has to exist in the database.
--
-- ============================ APPLY IN THIS ORDER ============================
-- STEP 1 first, on its own. STEP 3 deliberately ABORTS the migration if the
-- allowlist is empty, because rewriting the policies with nobody listed would
-- deny every admin write. Keep ADMIN_EMAILS (env) and this table in sync.
-- ============================================================================

-- ---- STEP 1: the allowlist -------------------------------------------------
create table if not exists public.admin_allowlist (
  email      text primary key,
  note       text,
  created_at timestamptz not null default now()
);

-- No anon/authenticated policy is created: nothing reads this through the API.
-- The service-role client (admin UI) bypasses RLS, and is_admin() below is
-- SECURITY DEFINER so it can read the table from inside another table's policy.
alter table public.admin_allowlist enable row level security;

-- >>> EDIT THIS LINE with the email of every admin account, then run STEP 1. <<<
-- insert into public.admin_allowlist (email, note)
--   values ('you@example.com', 'owner')
--   on conflict (email) do nothing;

-- ---- STEP 2: the predicate -------------------------------------------------
-- SECURITY DEFINER so the lookup is not itself filtered by admin_allowlist's
-- RLS (which would make it return false for everyone and lock the app out).
-- search_path is pinned: a SECURITY DEFINER function without it is a privilege
-- escalation vector.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_allowlist a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ---- STEP 3: guard, then rewrite every admin policy ------------------------
do $$
begin
  if not exists (select 1 from public.admin_allowlist) then
    raise exception
      'admin_allowlist is empty. Insert your admin email(s) first (STEP 1) — '
      'applying the policy rewrite now would deny every admin write.';
  end if;
end $$;

do $$
declare
  t record;
begin
  for t in
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
      and table_name <> 'admin_allowlist'
  loop
    execute format('drop policy if exists admin_full_access on public.%I', t.table_name);
    execute format(
      'create policy admin_full_access on public.%I
         for all to authenticated
         using (public.is_admin()) with check (public.is_admin())',
      t.table_name
    );
  end loop;
end;
$$;
