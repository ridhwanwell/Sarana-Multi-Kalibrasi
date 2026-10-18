-- =====================================================================
-- MIGRASI 0003 — SEGEL "WAJIB GANTI KATA SANDI" UNTUK AKUN @tera.smk
-- Supabase : qr-label-kalibrasi (PRODUKSI)
-- Dibuat   : 18 Oktober 2026 (Tahap 1.3b Tera SMK)
-- Disetujui: Ridhwan ("lanjutkan", 18 Okt 2026 23.02 WIB)
--
-- Isi: menambah tanda app_metadata.must_change_password = true pada 10 akun
-- @tera.smk. app_metadata hanya bisa diubah server (bukan browser).
-- Kata sandi, email, dan akun kantor @smk.co.id TIDAK disentuh.
-- Segel dilepas otomatis oleh server (POST /api/tera/ganti-sandi) setelah
-- teknisi membuat kata sandi baru.
-- =====================================================================


-- =====================================================================
-- BLOK 1 — BACKUP (hanya id, email, app_metadata akun @tera.smk)
-- =====================================================================
create table backup.b20261018_03_tera_app_meta as
  select id, email, raw_app_meta_data
    from auth.users
   where lower(email) like '%@tera.smk';
alter table backup.b20261018_03_tera_app_meta enable row level security;
revoke all on backup.b20261018_03_tera_app_meta from public, anon, authenticated;

select count(*) as salinan from backup.b20261018_03_tera_app_meta;   -- harapan: 10


-- =====================================================================
-- BLOK 2 — PERUBAHAN
-- =====================================================================
update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
                           || jsonb_build_object('must_change_password', true)
 where lower(email) like '%@tera.smk';


-- =====================================================================
-- BLOK 3 — CEK
-- =====================================================================
select '10 akun @tera.smk bersegel' cek,
       (select count(*) from auth.users
         where lower(email) like '%@tera.smk'
           and (raw_app_meta_data->>'must_change_password')::boolean is true) = 10 hasil,
       'true' harapan
union all
select 'akun kantor tidak bersegel',
       not exists (select 1 from auth.users
                    where lower(email) not like '%@tera.smk'
                      and raw_app_meta_data ? 'must_change_password'), 'true'
union all
select 'isi app_metadata lama tetap (provider dll.)',
       not exists (select 1 from auth.users u join backup.b20261018_03_tera_app_meta b on b.id = u.id
                    where (u.raw_app_meta_data - 'must_change_password')
                          is distinct from (coalesce(b.raw_app_meta_data, '{}'::jsonb) - 'must_change_password')), 'true';


-- HASIL DIJALANKAN 18 Okt 2026 ±23.06 WIB (oleh Claude lewat sambungan Supabase, atas izin Ridhwan):
--   BACKUP : 10 akun
--   CEK    : 3 dari 3 = true


-- =====================================================================
-- BLOK 4 — BATALKAN (hanya bila ada masalah)
-- =====================================================================
-- update auth.users
--    set raw_app_meta_data = raw_app_meta_data - 'must_change_password'
--  where lower(email) like '%@tera.smk';


-- =====================================================================
-- CATATAN DEVELOPER — teknisi LUPA kata sandi (sampai menu Tahap 8 ada):
-- 1. Supabase -> Authentication -> Users -> akun itu -> reset/atur kata sandi sementara.
-- 2. Pasang segel lagi (ganti EMAIL):
--    update auth.users
--       set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
--                               || jsonb_build_object('must_change_password', true)
--     where lower(email) = 'EMAIL@tera.smk';
-- =====================================================================
