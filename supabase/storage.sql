-- ============================================================================
-- Wiki Tours / Bab Makkah — storage.sql
-- Bucket `public-images`: public READ, authenticated WRITE.
-- Size/mime limits are enforced twice: here (defence in depth) and in the
-- upload route (magic-byte sniffing + per-kind limits, LAWS §8).
-- The route-level limits are stricter per kind (image 4MB / pdf 10MB);
-- the bucket cap is the global maximum (video 15MB).
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'public-images',
  'public-images',
  true,
  15728640, -- 15 MB (the largest allowed kind: mp4)
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Anyone may read (the bucket is public; this covers direct API reads too).
drop policy if exists "public read public-images" on storage.objects;
create policy "public read public-images" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'public-images');

-- Only authenticated admins may write. In practice uploads go through the
-- server route (service role), but this keeps the bucket usable from the
-- Supabase dashboard and future admin tooling.
drop policy if exists "authenticated insert public-images" on storage.objects;
create policy "authenticated insert public-images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'public-images');

drop policy if exists "authenticated update public-images" on storage.objects;
create policy "authenticated update public-images" on storage.objects
  for update to authenticated
  using (bucket_id = 'public-images')
  with check (bucket_id = 'public-images');

drop policy if exists "authenticated delete public-images" on storage.objects;
create policy "authenticated delete public-images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'public-images');
