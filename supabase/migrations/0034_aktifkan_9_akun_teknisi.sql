-- =====================================================================
-- MIGRASI 0034 — AKTIFKAN 9 AKUN TEKNISI @tera.smk (beri baris profiles role 'teknisi')
-- Supabase : qr-label-kalibrasi (PRODUKSI)
-- Dibuat   : 28 Oktober 2026
-- Disetujui: (menunggu "lanjutkan" Ridhwan)
--
-- Masalah: 9 akun @tera.smk (dibuat 18 Okt) belum punya baris di public.profiles,
-- sehingga login ditolak "Akun belum diaktifkan, hubungi Admin Utama".
-- Isi: menambah baris profiles (role = 'teknisi') HANYA untuk akun @tera.smk yang
-- belum punya profil. Akun kantor, kata sandi, dan segel "wajib ganti kata sandi"
-- TIDAK disentuh. Baris yang sudah ada (ridhwan@tera.smk) TIDAK diubah.
-- Dijalankan dari SQL Editor / sambungan server (auth.uid() kosong) sehingga
-- trigger trg_prevent_profile_role_escalation mengizinkan role 'teknisi'.
-- =====================================================================


-- =====================================================================
-- BLOK 1 — BACKUP (salinan profiles sebelum diubah)
-- =====================================================================
create table backup.b20261028_34_profiles as table public.profiles;
alter table backup.b20261028_34_profiles enable row level security;
revoke all on backup.b20261028_34_profiles from public, anon, authenticated;

select count(*) as salinan from backup.b20261028_34_profiles;


-- =====================================================================
-- BLOK 2 — PERUBAHAN
-- =====================================================================
insert into public.profiles (id, email, role)
select u.id, lower(u.email), 'teknisi'
  from auth.users u
 where lower(u.email) like '%@tera.smk'
   and not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;


-- =====================================================================
-- BLOK 3 — CEK (semua harus true)
-- =====================================================================
select 'semua akun @tera.smk punya profil teknisi' as cek,
       not exists (
         select 1 from auth.users u
           left join public.profiles p on p.id = u.id
          where lower(u.email) like '%@tera.smk'
            and (p.id is null or p.role is distinct from 'teknisi')
       ) as hasil
union all
select 'tepat 9 profil baru',
       (select count(*) from public.profiles) - (select count(*) from backup.b20261028_34_profiles) = 9
union all
select 'profil lama tidak berubah',
       not exists (
         select 1 from backup.b20261028_34_profiles b
           join public.profiles p on p.id = b.id
          where p.role is distinct from b.role or p.email is distinct from b.email
       )
union all
select 'segel wajib ganti sandi tetap ada pada 9 akun baru',
       (select count(*) from auth.users u
         where lower(u.email) like '%@tera.smk'
           and u.id not in (select id from backup.b20261028_34_profiles)
           and u.raw_app_meta_data->>'must_change_password' = 'true') = 9;


-- =====================================================================
-- BLOK 4 — BATALKAN (hanya bila ada masalah): hapus HANYA profil yang ditambah migrasi ini
-- =====================================================================
-- delete from public.profiles p
--  where lower(p.email) like '%@tera.smk'
--    and not exists (select 1 from backup.b20261028_34_profiles b where b.id = p.id);
