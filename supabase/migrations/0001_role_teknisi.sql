-- =====================================================================
-- MIGRASI 0001 — ROLE TEKNISI (Tahap 1.1 Tera SMK)
-- Supabase : qr-label-kalibrasi (PRODUKSI)
-- Dibuat   : 18 Oktober 2026
-- Disetujui: Ridhwan ("lanjutkan", 18 Okt 2026 22.35 WIB)
--
-- Isi:
--   1. Role 'teknisi' ditambahkan ke daftar role resmi (4 role lama tetap).
--   2. Kolom baru teknisi.user_id (penghubung akun login @tera.smk ke data teknisi)
--      + diisi untuk 10 akun yang sudah dibuat.
--   3. Hak berlebih di tabel profiles dicabut dari pengguna login (P2):
--      INSERT, DELETE, TRUNCATE, REFERENCES, TRIGGER. SELECT & UPDATE kolom
--      full_name/avatar_url tetap (browser hanya membaca profil).
--   4. Pengaturan 'general' -> publicBaseUrl = https://saranamultikalibrasi.com (P5).
--
-- SENGAJA TIDAK dilakukan: membuat baris profiles untuk akun @tera.smk.
-- Itu dilakukan setelah pemisahan role di server (Tahap 1.2) aktif.
--
-- Jalankan blok demi blok, berurutan: 1 BACKUP -> 2 PERUBAHAN -> 3 CEK.
-- Blok 4 BATALKAN hanya bila ada masalah.
-- =====================================================================


-- =====================================================================
-- BLOK 1 — BACKUP
-- Salinan disimpan di skema 'backup' (tidak dibuka ke internet/Data API).
-- =====================================================================
create schema if not exists backup;
revoke all on schema backup from public, anon, authenticated;

create table backup.b20261018_profiles as table public.profiles;
create table backup.b20261018_teknisi  as table public.teknisi;
create table backup.b20261018_settings as table public.settings;

alter table backup.b20261018_profiles enable row level security;
alter table backup.b20261018_teknisi  enable row level security;
alter table backup.b20261018_settings enable row level security;
revoke all on all tables in schema backup from public, anon, authenticated;

-- Hasil yang diharapkan: jumlah baris salinan = jumlah baris asli
select 'profiles' tabel, (select count(*) from public.profiles) asli, (select count(*) from backup.b20261018_profiles) salinan
union all select 'teknisi', (select count(*) from public.teknisi), (select count(*) from backup.b20261018_teknisi)
union all select 'settings', (select count(*) from public.settings), (select count(*) from backup.b20261018_settings);


-- =====================================================================
-- BLOK 2 — PERUBAHAN (satu transaksi: berhasil semua atau tidak sama sekali)
-- =====================================================================
begin;

-- 1. Role resmi: 4 role lama + 'teknisi'
alter table public.profiles drop constraint chk_profiles_official_role;
alter table public.profiles add constraint chk_profiles_official_role
  check (role = any (array['admin_utama','admin_teknik','admin_keuangan','hanya_sph','teknisi']::text[]));

-- 2. Kolom penghubung akun login -> data teknisi
alter table public.teknisi
  add column user_id uuid references auth.users(id) on delete set null;
comment on column public.teknisi.user_id is
  'Akun login Tera SMK (@tera.smk) milik teknisi ini. Satu akun = satu teknisi.';
create unique index ux_teknisi_user_id on public.teknisi (user_id) where user_id is not null;

update public.teknisi t
   set user_id = u.id
  from (values
          ('TECH-005', 'ari@tera.smk'),     -- Ahmad Fajar Ariyanto
          ('TECH-009', 'alin@tera.smk'),    -- Ardhiany Mayliana Wiyono
          ('TECH-006', 'aziz@tera.smk'),    -- Aziz Arrayya
          ('TECH-010', 'esak@tera.smk'),    -- Muhammad Esak Muhandis
          ('TECH-003', 'hafizh@tera.smk'),  -- Hafizh Pasifianto Utomo
          ('TECH-004', 'junior@tera.smk'),  -- Junior Yudha Pamungkas
          ('TECH-011', 'ridhwan@tera.smk'), -- Ridhwan Nur Yudianto
          ('TECH-007', 'rizky@tera.smk'),   -- Rizki Adi Nugroho
          ('TECH-002', 'sheva@tera.smk'),   -- Sheva Maresca Pramuningtyas
          ('TECH-001', 'shifa@tera.smk')    -- Shifa Zalza Billa
       ) m(teknisi_id, email)
  join auth.users u on lower(u.email) = m.email
 where t.id = m.teknisi_id
   and t.user_id is null;

-- 3. Cabut hak berlebih di profiles (P2)
revoke insert, delete, truncate, references, trigger on public.profiles from authenticated;
revoke insert, delete, truncate, references, trigger on public.profiles from anon;

-- 4. Alamat resmi untuk QR label baru (P5)
insert into public.settings (key, value)
values ('general', '{"publicBaseUrl":"https://saranamultikalibrasi.com"}')
on conflict (key) do nothing;

commit;


-- =====================================================================
-- BLOK 3 — CEK (hasil yang diharapkan ditulis di kolom 'harapan')
-- =====================================================================
select 'role teknisi diizinkan' cek,
       pg_get_constraintdef(oid) like '%teknisi%' as hasil, 'true' harapan
  from pg_constraint where conname = 'chk_profiles_official_role'
union all
select 'teknisi terhubung akun', (count(user_id) = 10), 'true (10 dari 11)'
  from public.teknisi
union all
select 'profil @tera.smk belum dibuat',
       (select count(*) from public.profiles p join auth.users u on u.id = p.id where u.email like '%@tera.smk') = 0, 'true'
union all
select 'role lama tidak berubah',
       (select count(*) from public.profiles) = (select count(*) from backup.b20261018_profiles)
       and not exists (select 1 from public.profiles p join backup.b20261018_profiles b on b.id = p.id
                        where p.role is distinct from b.role), 'true'
union all
select 'profiles: authenticated hanya SELECT (+UPDATE kolom)',
       (select string_agg(privilege_type, ',' order by privilege_type) from information_schema.role_table_grants
         where table_schema = 'public' and table_name = 'profiles' and grantee = 'authenticated') = 'SELECT', 'true'
union all
select 'profiles: UPDATE full_name & avatar_url masih ada',
       (select count(*) from information_schema.column_privileges
         where table_schema = 'public' and table_name = 'profiles' and grantee = 'authenticated'
           and privilege_type = 'UPDATE' and column_name in ('full_name','avatar_url')) = 2, 'true'
union all
select 'settings general publicBaseUrl',
       (select value::jsonb->>'publicBaseUrl' from public.settings where key = 'general') = 'https://saranamultikalibrasi.com', 'true'
union all
select 'jumlah label tidak berubah (3934)', (select count(*) from public.labels) = 3934, 'true'
union all
select 'teknisi lama tidak berubah (selain user_id)',
       not exists (select 1 from public.teknisi t join backup.b20261018_teknisi b on b.id = t.id
                    where (t.data, t.nama, t.email, t.updated_at, t.deleted_at)
                          is distinct from (b.data, b.nama, b.email, b.updated_at, b.deleted_at)), 'true';

-- HASIL DIJALANKAN 18 Okt 2026 ±22.40 WIB (oleh Claude lewat sambungan Supabase, atas izin Ridhwan):
--   BACKUP : profiles 11/11, teknisi 11/11, settings 3/3
--   CEK    : 9 dari 9 = true


-- =====================================================================
-- BLOK 4 — BATALKAN (hanya bila ada masalah)
-- Syarat: belum ada profil dengan role 'teknisi' (dicek di baris pertama).
-- =====================================================================
-- begin;
-- do $$ begin
--   if exists (select 1 from public.profiles where role = 'teknisi') then
--     raise exception 'Masih ada profil role teknisi — hapus/ubah dulu sebelum membatalkan.';
--   end if;
-- end $$;
-- delete from public.settings
--  where key = 'general'
--    and not exists (select 1 from backup.b20261018_settings b where b.key = 'general');
-- grant insert, delete, truncate, references, trigger on public.profiles to authenticated;
-- drop index if exists public.ux_teknisi_user_id;
-- alter table public.teknisi drop column if exists user_id;
-- alter table public.profiles drop constraint chk_profiles_official_role;
-- alter table public.profiles add constraint chk_profiles_official_role
--   check (role = any (array['admin_utama','admin_teknik','admin_keuangan','hanya_sph']::text[]));
-- commit;
-- (Salinan di skema backup boleh disimpan; hapus nanti bila sudah tidak perlu.)
