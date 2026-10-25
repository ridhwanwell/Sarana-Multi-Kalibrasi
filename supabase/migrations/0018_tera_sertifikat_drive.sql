-- =====================================================================
-- MIGRASI 0018 — CATATAN SALINAN GOOGLE DRIVE PER SERTIFIKAT (TAHAP 4.6c, 25 Okt 2026)
-- Supabase : qr-label-kalibrasi (PRODUKSI)
-- Dijalankan setelah Ridhwan membalas "lanjutkan saja sampai tahap 4 selesai" (25 Okt 2026).
--
-- Bahasa awam: tiap sertifikat terbit punya salinan TANPA kop di Google Drive (folder "SERTIFIKAT PT.SMK" → "BO – Nama RS").
-- Kolom baru mencatat: id file di Drive, status (menunggu / terkirim / gagal), pesan galat terakhir, kapan terakhir dicoba,
-- dan berapa kali dicoba. Gagal ke Drive TIDAK membatalkan ACC; server mencoba lagi otomatis.
-- Hanya MENAMBAH kolom di tabel Tera sendiri (tera_sertifikat). Tabel lama tidak disentuh.
-- =====================================================================

-- ===== BLOK 1 — BACKUP =====
create table backup.b20261025_tera_sertifikat_0018 as table public.tera_sertifikat;
select count(*) as sertifikat_tersalin from backup.b20261025_tera_sertifikat_0018;

-- ===== BLOK 2 — PERUBAHAN =====
begin;
alter table public.tera_sertifikat
  add column if not exists drive_file_id   text,
  add column if not exists drive_status    text check (drive_status in ('menunggu','terkirim','gagal')),
  add column if not exists drive_pesan     text,
  add column if not exists drive_dicoba_at timestamptz,
  add column if not exists drive_percobaan integer not null default 0;
commit;

-- ===== BLOK 3 — CEK (harapan: true, true) =====
select (select count(*) = 5 from information_schema.columns where table_schema='public' and table_name='tera_sertifikat'
         and column_name in ('drive_file_id','drive_status','drive_pesan','drive_dicoba_at','drive_percobaan')) as kolom_ada,
       (select count(*) from public.tera_sertifikat) = (select count(*) from backup.b20261025_tera_sertifikat_0018) as baris_sama;

-- ===== BLOK 4 — BATALKAN (hanya bila ada masalah; kolom baru milik Tera sendiri) =====
-- alter table public.tera_sertifikat drop column drive_file_id, drop column drive_status, drop column drive_pesan,
--   drop column drive_dicoba_at, drop column drive_percobaan;
