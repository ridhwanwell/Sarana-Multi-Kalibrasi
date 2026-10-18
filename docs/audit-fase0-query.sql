-- =====================================================================
-- AUDIT FASE 0 — QUERY CEK STRUKTUR DATABASE (HANYA MEMBACA)
-- Proyek  : Tera SMK di dalam qrcode-smk
-- Supabase: qr-label-kalibrasi (PRODUKSI)
-- Dibuat  : 18 Oktober 2026
--
-- SEMUA query di file ini hanya SELECT. Tidak ada yang mengubah,
-- menambah, atau menghapus data. Aman dijalankan kapan saja.
-- Cara pakai: Supabase -> SQL Editor -> New query -> tempel SATU blok
-- (dari "-- Q1" sampai sebelum "-- Q2") -> Run. Ulangi per blok.
-- Hasil dipakai sebagai "foto rontgen" database sebelum Tahap 1.
-- =====================================================================


-- Q1. Daftar tabel public + status RLS + kolom (tipe; tanda ! = wajib isi)
select c.relname                         as tabel,
       c.relrowsecurity                  as rls_aktif,
       (select string_agg(a.attname || ':' || format_type(a.atttypid, a.atttypmod)
                          || case when a.attnotnull then '!' else '' end,
                          ', ' order by a.attnum)
          from pg_attribute a
         where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped) as kolom
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r'
 order by 1;


-- Q2. Jumlah baris sebenarnya di tabel penting
select 'labels' as tabel, count(*) as jumlah from public.labels
union all select 'folder_label',       count(*) from public.folder_label
union all select 'jadwal_kalibrasi',   count(*) from public.jadwal_kalibrasi
union all select 'dokumen_sph',        count(*) from public.dokumen_sph
union all select 'dokumen_bap',        count(*) from public.dokumen_bap
union all select 'rumah_sakit',        count(*) from public.rumah_sakit
union all select 'teknisi',            count(*) from public.teknisi
union all select 'aset_kalibrator',    count(*) from public.aset_kalibrator
union all select 'kamus_nama_alat',    count(*) from public.kamus_nama_alat
union all select 'profiles',           count(*) from public.profiles
union all select 'activity_log',       count(*) from public.activity_log;


-- Q3. Aturan RLS (policy) di tabel public & storage
select schemaname, tablename, policyname, cmd, roles,
       qual       as syarat_baca_ubah,
       with_check as syarat_tulis
  from pg_policies
 where schemaname in ('public', 'storage')
 order by schemaname, tablename, policyname;


-- Q4. Hak akses tabel untuk pengguna browser (anon / authenticated)
--     Idealnya KOSONG, kecuali profiles (SELECT + UPDATE kolom tertentu).
select table_name, grantee,
       string_agg(privilege_type, ', ' order by privilege_type) as hak
  from information_schema.role_table_grants
 where table_schema = 'public' and grantee in ('anon', 'authenticated')
 group by 1, 2
 order by 1, 2;


-- Q5. Trigger yang terpasang (public, auth, storage)
select event_object_schema as skema, event_object_table as tabel,
       trigger_name, action_timing as kapan,
       string_agg(event_manipulation, '/') as peristiwa,
       max(action_statement) as fungsi
  from information_schema.triggers
 where event_object_schema in ('public', 'auth', 'storage')
 group by 1, 2, 3, 4
 order by 1, 2, 3;


-- Q6. Aturan tabel (CHECK, UNIQUE, FOREIGN KEY, PRIMARY KEY)
select conrelid::regclass as tabel, conname as nama_aturan,
       pg_get_constraintdef(oid) as isi_aturan
  from pg_constraint
 where connamespace = 'public'::regnamespace
   and contype in ('c', 'u', 'f', 'p')
 order by 1, 2;


-- Q7. Fungsi database (public & internal) + siapa yang boleh menjalankan
select n.nspname || '.' || p.proname as fungsi,
       p.prosecdef as security_definer,
       has_function_privilege('anon', p.oid, 'EXECUTE')          as anon_boleh,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as login_boleh
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname in ('public', 'internal')
 order by 1;


-- Q8. Bucket penyimpanan (Storage) + jumlah file
select b.id, b.public as publik, b.file_size_limit as batas_ukuran,
       b.allowed_mime_types as jenis_file,
       (select count(*) from storage.objects o where o.bucket_id = b.id) as jumlah_file
  from storage.buckets b
 order by 1;


-- Q9. Status label QR (termasuk "Cadangan Laik Pakai")
select status,
       count(*)                                                   as jumlah,
       count(*) filter (where qr_secured)                         as pakai_kode_qr,
       count(*) filter (where pdf_url is not null
                           or pdf_drive_url is not null)          as sudah_ada_sertifikat
  from public.labels
 group by status
 order by 2 desc;


-- Q10. Rentang "Cadangan Laik Pakai" per folder/BO
select folder, count(*) as jumlah, min(no_label) as awal, max(no_label) as akhir
  from public.labels
 where status = 'Cadangan Laik Pakai'
 group by folder
 order by folder;


-- Q11. Akun & role (tanpa kata sandi). Cek jumlah admin_utama & akun @tera.smk
select split_part(u.email, '@', 2) as domain,
       coalesce(p.role, '(belum ada profil)') as role,
       count(*) as jumlah
  from auth.users u
  left join public.profiles p on p.id = u.id
 group by 1, 2
 order by 1, 2;


-- Q12. Pastikan BO uji 999 masih kosong (harus 0 label)
select (select count(*) from public.labels where no_label like '999.%') as label_999,
       (select count(*) from public.folder_label where prefix = '999')  as folder_999;


-- Q13. Isi kunci JSON jadwal (kolom data) — untuk merancang Tahap 3
select distinct jsonb_object_keys(data) as kunci_json
  from public.jadwal_kalibrasi
 order by 1;
