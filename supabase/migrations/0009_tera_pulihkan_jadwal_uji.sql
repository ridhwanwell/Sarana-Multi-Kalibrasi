-- 0009: pulihkan jadwal uji BO 999 (SCH-UJI-TERA-999) + Push-nya, khusus untuk uji LKK Tera SMK.
-- Hanya menyentuh 2 baris uji (is_test). Data asli tidak tersentuh.

-- ===== BLOK 1: BACKUP =====
create table if not exists backup.b20261022_jadwal_uji_999 as
  select * from public.jadwal_kalibrasi where id = 'SCH-UJI-TERA-999';
create table if not exists backup.b20261022_tera_push_uji_999 as
  select * from public.tera_jadwal_push where jadwal_id = 'SCH-UJI-TERA-999';

-- ===== BLOK 2: PERUBAHAN =====
begin;
update public.jadwal_kalibrasi
   set deleted_at = null, deleted_by = null
 where id = 'SCH-UJI-TERA-999' and deleted_at is not null;
update public.tera_jadwal_push
   set dicabut_at = null, dicabut_by = null
 where jadwal_id = 'SCH-UJI-TERA-999' and bo = '999' and is_test and dicabut_at is not null;
commit;

-- ===== BLOK 3: CEK (harapan: jadwal_aktif = true, push_aktif = true, teknisi_ok = true) =====
select
  (select deleted_at is null from public.jadwal_kalibrasi where id = 'SCH-UJI-TERA-999') as jadwal_aktif,
  (select dicabut_at is null from public.tera_jadwal_push where jadwal_id = 'SCH-UJI-TERA-999') as push_aktif,
  (select 'eadbc292-23b6-4dc0-9429-57544e806851' = any (teknisi_user_ids::text[]) from public.tera_jadwal_push where jadwal_id = 'SCH-UJI-TERA-999') as teknisi_ok;

-- ===== BLOK 4: BATALKAN (hanya bila ada masalah) =====
-- update public.jadwal_kalibrasi set deleted_at = '2026-10-19 06:19:54.825355+00', deleted_by = 'claude-uji-tera' where id = 'SCH-UJI-TERA-999';
-- update public.tera_jadwal_push set dicabut_at = '2026-10-19 06:18:15.568233+00', dicabut_by = 'f05c88d7-3754-4db9-b105-5619dd4ae53f' where jadwal_id = 'SCH-UJI-TERA-999';
