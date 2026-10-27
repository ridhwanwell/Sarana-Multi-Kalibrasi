-- =====================================================================
-- MIGRASI 0033 — BO 999 (DATA UJI): perpanjang label cadangan alat tambahan 999.0011–999.1000 (27 Okt 2026)
-- Supabase : qr-label-kalibrasi (PRODUKSI) — permintaan Ridhwan: "buatkan sampai 1000 tidak apa-apa karena hanya uji coba"
--
-- Bahasa awam: cadangan BO 999 (999.0011–0015) hampir habis. Hanya baris jadwal UJI BO 999 (is_test = true) di
-- tera_jadwal_push yang diubah: cadangan akhir jadi 999.1000, versi naik 1 supaya tablet mengambil jadwal baru saat sinkron.
-- Tidak ada label QR yang dibuat/diubah; BO sungguhan tidak disentuh.
-- Catatan: bila jadwal BO 999 di-Push ulang dari Manajemen Aset SMK, rentang cadangan kembali mengikuti isian jadwal di sana.
-- =====================================================================

-- ===== BLOK 1 — BACKUP =====
create table backup.b20261027_tera_jadwal_push_0033 as table public.tera_jadwal_push;
select count(*) as jadwal_tersalin from backup.b20261027_tera_jadwal_push_0033;

-- ===== BLOK 2 — PERUBAHAN =====
begin;
update public.tera_jadwal_push
   set label_cadangan_akhir = '999.1000', versi = versi + 1
 where bo = '999' and is_test and jadwal_id = 'SCH-UJI-TERA-999' and dicabut_at is null;
commit;

-- ===== BLOK 3 — CEK (harapan: semua true) =====
select 'BO 999 uji: cadangan 999.0011–999.1000, versi naik 1' cek,
       (select count(*) = 1 from public.tera_jadwal_push n join backup.b20261027_tera_jadwal_push_0033 b using (id)
         where n.jadwal_id='SCH-UJI-TERA-999' and n.label_cadangan_awal='999.0011' and n.label_cadangan_akhir='999.1000' and n.versi = b.versi + 1) hasil
union all select 'jadwal lain tidak berubah',
       (select count(*) = 0 from public.tera_jadwal_push n join backup.b20261027_tera_jadwal_push_0033 b using (id)
         where n.jadwal_id <> 'SCH-UJI-TERA-999' and (n.versi <> b.versi or n.label_cadangan_akhir is distinct from b.label_cadangan_akhir));

-- ===== BLOK 4 — BATALKAN =====
-- update public.tera_jadwal_push n set label_cadangan_akhir = b.label_cadangan_akhir, versi = n.versi + 1
--   from backup.b20261027_tera_jadwal_push_0033 b where n.id = b.id and n.jadwal_id = 'SCH-UJI-TERA-999';
