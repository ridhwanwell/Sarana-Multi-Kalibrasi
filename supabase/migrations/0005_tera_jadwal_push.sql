-- =====================================================================
-- MIGRASI 0005 — "FOTOKOPI JADWAL" UNTUK TERA SMK (TAHAP 3: PUSH JADWAL)
-- Supabase : qr-label-kalibrasi (PRODUKSI)
-- Dibuat   : 19 Oktober 2026 (Tahap 3.1 Tera SMK)
-- Disetujui: Ridhwan ("lanjutkan" setelah penjelasan awam, 19 Okt 2026 05.16 WIB)
-- Dijalankan: 19 Okt 2026 ±05.18 WIB oleh Claude lewat sambungan Supabase (apply_migration
--             "tera_0005_jadwal_push", blok 2 tanpa begin/commit karena dibungkus otomatis).
--             CEK 9/9 true (jadwal_kalibrasi = 32 kolom, tidak berubah; angka 33 di draf awal salah hitung).
--             Uji perilaku (dibatalkan otomatis, tabel kembali kosong) 8/8: push v1 · push ulang v2 tetap 1 baris ·
--             cabut v3 · cabut dua kali = tidak_ada_yang_dicabut · push setelah cabut aktif lagi v4 ·
--             BO 999 tanpa is_test ditolak · label beda BO ditolak · cadangan setengah terisi ditolak · tanpa teknisi ditolak.
--
-- Isi (SEMUA BARU, tidak ada tabel lama yang disentuh — jadwal_kalibrasi TIDAK diubah):
--   1. tera_jadwal_push            : fotokopi jadwal yang di-"Push ke Tera SMK"
--                                    (1 baris aktif per jadwal; push ulang = baris yang sama, versi naik)
--   2. fungsi public.tera_push_jadwal(...)  : simpan fotokopi, naikkan versi, aktifkan lagi bila pernah dicabut
--   3. fungsi public.tera_cabut_jadwal(...) : tarik jadwal dari tablet (LKK yang sudah ada tidak terhapus)
--
-- Pengaman (sama dengan 0004):
--   - RLS aktif TANPA policy & tanpa GRANT ke anon/authenticated → hanya server (service role).
--   - Kedua fungsi hanya boleh dipanggil service_role; search_path dikosongkan.
--   - BO 999 wajib is_test = true (dicegah database).
--   - Hanya mode_sertifikat 'tera' yang boleh punya fotokopi (mode manual = alur lama, tanpa fotokopi).
--   - Kolom label cadangan: keduanya terisi atau keduanya kosong.
-- =====================================================================


-- =====================================================================
-- BLOK 1 — BACKUP
-- Tidak ada tabel lama yang diubah, jadi tidak ada data yang perlu disalin.
-- Cukup pastikan nama tabel/fungsi baru belum terpakai (harapan: semua false).
-- =====================================================================
select to_regclass('public.tera_jadwal_push') is not null as tabel_push_sudah_ada,
       exists (select 1 from pg_proc where proname = 'tera_push_jadwal')  as fungsi_push_sudah_ada,
       exists (select 1 from pg_proc where proname = 'tera_cabut_jadwal') as fungsi_cabut_sudah_ada;


-- =====================================================================
-- BLOK 2 — PERUBAHAN
-- =====================================================================
begin;

create table public.tera_jadwal_push (
  id                   uuid primary key default gen_random_uuid(),
  jadwal_id            text not null,                         -- jadwal_kalibrasi.id (tanpa FK: modul lama tidak terikat)
  bo                   text not null check (bo ~ '^[0-9]{3}$'),
  nama_rs              text not null,
  kota                 text,
  tanggal_mulai        date,
  tanggal_selesai      date,
  label_awal           text not null check (label_awal  ~ '^[0-9]{3}\.[0-9]{4}$'),
  label_akhir          text not null check (label_akhir ~ '^[0-9]{3}\.[0-9]{4}$'),
  label_cadangan_awal  text check (label_cadangan_awal  ~ '^[0-9]{3}\.[0-9]{4}$'),
  label_cadangan_akhir text check (label_cadangan_akhir ~ '^[0-9]{3}\.[0-9]{4}$'),
  mode_sertifikat      text not null default 'tera' check (mode_sertifikat = 'tera'),
  alat_po              jsonb not null default '[]'::jsonb check (jsonb_typeof(alat_po) = 'array'),
  teknisi_user_ids     uuid[] not null check (cardinality(teknisi_user_ids) >= 1),
  versi                integer not null default 1 check (versi >= 1),
  is_test              boolean not null default false,
  pushed_by            uuid not null references public.profiles(id) on delete restrict,
  pushed_at            timestamptz not null default now(),
  dicabut_at           timestamptz,
  dicabut_by           uuid references public.profiles(id) on delete restrict,
  constraint tera_jadwal_push_jadwal_uniq unique (jadwal_id),
  constraint tera_jadwal_push_bo_label_ck check (
    left(label_awal, 3) = bo and left(label_akhir, 3) = bo
    and (label_cadangan_awal is null) = (label_cadangan_akhir is null)
    and (label_cadangan_awal is null or (left(label_cadangan_awal, 3) = bo and left(label_cadangan_akhir, 3) = bo))
  ),
  constraint tera_jadwal_push_uji_ck check (bo <> '999' or is_test)
);
comment on table public.tera_jadwal_push is 'Tera SMK: fotokopi jadwal yang di-Push ke tablet teknisi. Jadwal asli (jadwal_kalibrasi) tidak disentuh. versi naik tiap push ulang.';

-- Teknisi mencari "jadwal saya" → indeks array; daftar aktif → indeks parsial
create index tera_jadwal_push_teknisi_gin on public.tera_jadwal_push using gin (teknisi_user_ids);
create index tera_jadwal_push_aktif_idx   on public.tera_jadwal_push (pushed_at desc) where dicabut_at is null;
create index tera_jadwal_push_by_idx      on public.tera_jadwal_push (pushed_by);

-- Kunci pintu: RLS aktif, tanpa policy, tanpa hak untuk browser
alter table public.tera_jadwal_push enable row level security;
revoke all on public.tera_jadwal_push from public, anon, authenticated;
grant select, insert, update on public.tera_jadwal_push to service_role;

-- Simpan fotokopi (atau perbarui + naikkan versi). Hasil: {"hasil":"dipush","id":...,"versi":n}
create or replace function public.tera_push_jadwal(
  p_jadwal_id        text,
  p_bo               text,
  p_nama_rs          text,
  p_kota             text,
  p_tanggal_mulai    date,
  p_tanggal_selesai  date,
  p_label_awal       text,
  p_label_akhir      text,
  p_cadangan_awal    text,
  p_cadangan_akhir   text,
  p_alat_po          jsonb,
  p_teknisi_user_ids uuid[],
  p_is_test          boolean,
  p_oleh             uuid
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id    uuid;
  v_versi integer;
begin
  insert into public.tera_jadwal_push as t (
    jadwal_id, bo, nama_rs, kota, tanggal_mulai, tanggal_selesai,
    label_awal, label_akhir, label_cadangan_awal, label_cadangan_akhir,
    alat_po, teknisi_user_ids, is_test, pushed_by
  ) values (
    p_jadwal_id, p_bo, p_nama_rs, p_kota, p_tanggal_mulai, p_tanggal_selesai,
    p_label_awal, p_label_akhir, p_cadangan_awal, p_cadangan_akhir,
    coalesce(p_alat_po, '[]'::jsonb), p_teknisi_user_ids, coalesce(p_is_test, false), p_oleh
  )
  on conflict on constraint tera_jadwal_push_jadwal_uniq do update set
    bo = excluded.bo,
    nama_rs = excluded.nama_rs,
    kota = excluded.kota,
    tanggal_mulai = excluded.tanggal_mulai,
    tanggal_selesai = excluded.tanggal_selesai,
    label_awal = excluded.label_awal,
    label_akhir = excluded.label_akhir,
    label_cadangan_awal = excluded.label_cadangan_awal,
    label_cadangan_akhir = excluded.label_cadangan_akhir,
    alat_po = excluded.alat_po,
    teknisi_user_ids = excluded.teknisi_user_ids,
    is_test = excluded.is_test,
    pushed_by = excluded.pushed_by,
    pushed_at = now(),
    versi = t.versi + 1,
    dicabut_at = null,
    dicabut_by = null
  returning t.id, t.versi into v_id, v_versi;

  return jsonb_build_object('hasil', 'dipush', 'id', v_id, 'versi', v_versi);
end;
$$;

-- Tarik jadwal dari tablet (baris tetap ada; LKK yang sudah diisi tidak terhapus)
create or replace function public.tera_cabut_jadwal(p_jadwal_id text, p_oleh uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_versi integer;
begin
  update public.tera_jadwal_push
     set dicabut_at = now(), dicabut_by = p_oleh, versi = versi + 1
   where jadwal_id = p_jadwal_id and dicabut_at is null
   returning versi into v_versi;

  if v_versi is null then
    return jsonb_build_object('hasil', 'tidak_ada_yang_dicabut');
  end if;
  return jsonb_build_object('hasil', 'dicabut', 'versi', v_versi);
end;
$$;

revoke all on function public.tera_push_jadwal(text,text,text,text,date,date,text,text,text,text,jsonb,uuid[],boolean,uuid) from public, anon, authenticated;
grant execute on function public.tera_push_jadwal(text,text,text,text,date,date,text,text,text,text,jsonb,uuid[],boolean,uuid) to service_role;
revoke all on function public.tera_cabut_jadwal(text,uuid) from public, anon, authenticated;
grant execute on function public.tera_cabut_jadwal(text,uuid) to service_role;

commit;


-- =====================================================================
-- BLOK 3 — CEK (harapan: semua kolom "hasil" = true)
-- =====================================================================
select 'tabel push ada' cek,
       to_regclass('public.tera_jadwal_push') is not null hasil
union all
select 'RLS aktif',
       (select rowsecurity from pg_tables where schemaname='public' and tablename='tera_jadwal_push')
union all
select 'browser tidak punya hak apa pun di tabel push',
       not exists (select 1 from information_schema.role_table_grants
                    where table_schema='public' and table_name='tera_jadwal_push'
                      and grantee in ('anon','authenticated','PUBLIC'))
union all
select 'fungsi push hanya untuk service_role',
       not has_function_privilege('authenticated', 'public.tera_push_jadwal(text,text,text,text,date,date,text,text,text,text,jsonb,uuid[],boolean,uuid)', 'execute')
       and not has_function_privilege('anon', 'public.tera_push_jadwal(text,text,text,text,date,date,text,text,text,text,jsonb,uuid[],boolean,uuid)', 'execute')
union all
select 'fungsi cabut hanya untuk service_role',
       not has_function_privilege('authenticated', 'public.tera_cabut_jadwal(text,uuid)', 'execute')
       and not has_function_privilege('anon', 'public.tera_cabut_jadwal(text,uuid)', 'execute')
union all
select 'satu jadwal = satu baris (unik)',
       exists (select 1 from pg_constraint where conname='tera_jadwal_push_jadwal_uniq')
union all
select 'indeks pencarian teknisi ada',
       exists (select 1 from pg_indexes where schemaname='public' and indexname='tera_jadwal_push_teknisi_gin')
union all
select 'tabel lama tidak berubah (jadwal_kalibrasi masih 32 kolom lama)',
       (select count(*) from information_schema.columns where table_schema='public' and table_name='jadwal_kalibrasi') = 32;


-- =====================================================================
-- BLOK 4 — BATALKAN (hanya bila ada masalah; aman selama belum ada Push sungguhan)
-- =====================================================================
-- begin;
-- drop function if exists public.tera_cabut_jadwal(text,uuid);
-- drop function if exists public.tera_push_jadwal(text,text,text,text,date,date,text,text,text,text,jsonb,uuid[],boolean,uuid);
-- drop table if exists public.tera_jadwal_push;
-- commit;
