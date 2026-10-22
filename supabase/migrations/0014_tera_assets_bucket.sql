-- 0014 — Bucket privat `tera-assets` untuk KOP sertifikat resmi (PDF). Tahap 4.5b, 22 Okt 2026.
-- Perumpamaan: laci terkunci di kantor untuk kertas kop resmi. Hanya server (service role) yang boleh membukanya;
-- tidak ada akses publik, tidak menyentuh tabel lama, tidak ada data pelanggan.
-- Isi (diunggah Ridhwan lewat Supabase → Storage → tera-assets): kop/KOP_SERTIF_NON_KAN.pdf, kop/KOP_SERTIF_KAN.pdf.
-- Font Carlito (lisensi OFL) bersifat publik → ada di repo: public/tera/fonts/.

-- ===== BLOK 1: BACKUP (keadaan awal; bucket baru, tidak ada data yang diubah) =====
-- select id, public, file_size_limit, allowed_mime_types from storage.buckets order by id;
--   hasil awal 22 Okt 2026: hanya `documents` (publik) dan `internal-documents` (privat); `tera-assets` BELUM ada.

-- ===== BLOK 2: PERUBAHAN =====
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tera-assets', 'tera-assets', false, 5242880, array['application/pdf'])
on conflict (id) do nothing;
-- Sengaja TANPA policy storage.objects: anon/authenticated tidak bisa membaca; service role (server) melewati RLS.

-- ===== BLOK 3: CEK =====
-- select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'tera-assets';
--   diharapkan: 1 baris, public = false, 5242880, {application/pdf}
-- select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname ilike '%tera-assets%';
--   diharapkan: 0

-- ===== BLOK 4: BATALKAN (hanya bila bucket masih kosong) =====
-- delete from storage.buckets where id = 'tera-assets';
