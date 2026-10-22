-- 0010: tabel catatan pemeriksaan server atas setiap LKK yang diterima (Tahap 4.4a-2).
-- Tabel BARU berawalan tera_; tabel lama tidak disentuh. Pola akses = tabel tera_ lain: RLS aktif tanpa kebijakan
-- (hanya server dengan kunci service role yang membaca/menulis).
-- STATUS: DRAF — belum dijalankan. Tunggu kata "lanjutkan" dari pemilik proyek.

-- ===== BLOK 1: BACKUP =====
-- Tabel baru, tidak ada data lama yang berubah. Cadangan tera_lkk tetap diambil sebagai pengaman:
create table if not exists backup.b20261022_tera_lkk_sebelum_0010 as table public.tera_lkk;

-- ===== BLOK 2: PERUBAHAN =====
begin;
create table public.tera_lkk_pemeriksaan (
  lkk_id           uuid        not null references public.tera_lkk(id) on delete restrict,
  client_version   integer     not null check (client_version > 0),
  mesin_hitung     integer     not null,
  jejak_cocok      boolean     not null,
  boleh_acc        boolean     not null,
  penanda          jsonb       not null default '[]'::jsonb,
  kesimpulan_server text,
  diperiksa_at     timestamptz not null default now(),
  primary key (lkk_id, client_version)
);
comment on table public.tera_lkk_pemeriksaan is
  'Hasil hitung ulang server atas jejak hitung tiap versi LKK. boleh_acc=false -> ACC ditolak (kalibrator expired, lingkungan luar batas, jejak beda).';
alter table public.tera_lkk_pemeriksaan enable row level security;
create index tera_lkk_pemeriksaan_blokir_idx on public.tera_lkk_pemeriksaan (lkk_id) where not boleh_acc;
commit;

-- ===== BLOK 3: CEK (harapan: ada = true, rls = true, kebijakan = 0) =====
select
  to_regclass('public.tera_lkk_pemeriksaan') is not null as ada,
  (select relrowsecurity from pg_class where oid = 'public.tera_lkk_pemeriksaan'::regclass) as rls,
  (select count(*) from pg_policies where schemaname='public' and tablename='tera_lkk_pemeriksaan') as kebijakan;

-- ===== BLOK 4: BATALKAN (hanya bila ada masalah; tabel baru masih kosong) =====
-- drop table public.tera_lkk_pemeriksaan;
