-- ============================================================================
-- 010 — bucket allow-list: add image/avif + video/webm.
-- The upload route (magic-byte sniffer) accepted both since day one, but the
-- bucket's allowed_mime_types rejected them → silent 500 on upload.
-- Keeps supabase/storage.sql in sync (canonical bucket definition).
-- ============================================================================

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif',
  'video/mp4', 'video/webm', 'application/pdf'
]
where id = 'public-images';
