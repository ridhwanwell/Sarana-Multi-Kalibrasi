-- =====================================================================
-- MIGRASI 0002 — PROFIL TEKNISI HANYA MILIK SENDIRI (P6) + 1 AKUN UJI
-- Supabase : qr-label-kalibrasi (PRODUKSI)
-- Dibuat   : 18 Oktober 2026 (Tahap 1.3a Tera SMK)
-- Disetujui: Ridhwan (P6 "boleh" + "lanjutkan", 18 Okt 2026 22.51 WIB)
--
-- Isi:
--   1. Aturan RLS baca profil: role kantor tetap membaca semua profil (seperti
--      sekarang); akun lain (teknisi) hanya membaca profilnya sendiri.
--   2. Aktifkan 1 akun uji: ridhwan@tera.smk -> role 'teknisi'
--      (nama diambil dari data teknisi yang terhubung, TECH-011).
--
-- Aman bagi website lama (main): kode lama belum mengenal role 'teknisi',
-- jadi akun uji ditolak di sana ("Akun belum diaktifkan").
-- =====================================================================


-- =====================================================================
-- BLOK 1 — BACKUP
-- =====================================================================
create table backup.b20261018_02_profiles as table public.profiles;
alter table backup.b20261018_02_profiles enable row level security;
revoke all on backup.b20261018_02_profiles from public, anon, authenticated;

select (select count(*) from public.profiles) asli,
       (select count(*) from backup.b20261018_02_profiles) salinan;   -- harapan: sama (11 = 11)


-- =====================================================================
-- BLOK 2 — PERUBAHAN
-- =====================================================================
begin;

-- Aturan lama diubah DI TEMPAT (tanpa drop): isi syarat diganti, lalu diberi nama baru.
-- (Versi drop+create ditolak otomatis oleh sambungan Supabase; hasil akhirnya sama.)
alter policy "Users can read all profiles" on public.profiles
  using (
    id = (select auth.uid())
    or (select public.get_current_user_role())
       = any (array['admin_utama','admin_teknik','admin_keuangan','hanya_sph']::text[])
  );
alter policy "Users can read all profiles" on public.profiles
  rename to "Kantor baca semua, lainnya baca milik sendiri";

insert into public.profiles (id, email, full_name, role)
select u.id, u.email, t.nama, 'teknisi'
  from auth.users u
  join public.teknisi t on t.user_id = u.id
 where lower(u.email) = 'ridhwan@tera.smk'
on conflict (id) do nothing;

commit;


-- =====================================================================
-- BLOK 3 — CEK
-- =====================================================================
select 'aturan lama sudah diganti' cek,
       not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'Users can read all profiles')
       and exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'Kantor baca semua, lainnya baca milik sendiri') hasil,
       'true' harapan
union all
select 'akun uji ridhwan@tera.smk = teknisi',
       exists (select 1 from public.profiles p join auth.users u on u.id = p.id
                where lower(u.email) = 'ridhwan@tera.smk' and p.role = 'teknisi'), 'true'
union all
select 'hanya 1 profil teknisi',
       (select count(*) from public.profiles where role = 'teknisi') = 1, 'true'
union all
select '11 profil kantor tidak berubah',
       not exists (select 1 from backup.b20261018_02_profiles b
                     left join public.profiles p on p.id = b.id
                    where p.id is null or p.role is distinct from b.role), 'true'
union all
select 'nama profil uji', (select full_name = 'Ridhwan Nur Yudianto' from public.profiles where role = 'teknisi'), 'true';

-- HASIL DIJALANKAN 18 Okt 2026 ±22.57 WIB (oleh Claude lewat sambungan Supabase, atas izin Ridhwan):
--   BACKUP : profiles 11/11
--   CEK    : 5 dari 5 = true


-- =====================================================================
-- BLOK 4 — BATALKAN (hanya bila ada masalah)
-- =====================================================================
-- begin;
-- delete from public.profiles p using auth.users u
--  where u.id = p.id and lower(u.email) = 'ridhwan@tera.smk' and p.role = 'teknisi';
-- alter policy "Kantor baca semua, lainnya baca milik sendiri" on public.profiles using (true);
-- alter policy "Kantor baca semua, lainnya baca milik sendiri" on public.profiles
--   rename to "Users can read all profiles";
-- commit;
