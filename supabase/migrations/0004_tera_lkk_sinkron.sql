-- =====================================================================
-- MIGRASI 0004 — GUDANG SERVER UNTUK LKK TERA SMK (TAHAP 2: OFFLINE & SINKRON)
-- Supabase : qr-label-kalibrasi (PRODUKSI)
-- Dibuat   : 19 Oktober 2026 (Tahap 2.1 Tera SMK)
-- Disetujui: Ridhwan ("lanjutkan" + draft ikut dicadangkan, 19 Okt 2026 04.36 WIB)
-- Dijalankan: 19 Okt 2026 ±04.40 WIB oleh Claude lewat sambungan Supabase (apply_migration
--             "tera_0004_lkk_sinkron", blok 2 tanpa begin/commit karena dibungkus otomatis).
--             CEK 7/7 true. Uji perilaku (BO 999, dibatalkan otomatis): diterima · kirim ulang = sudah_diterima ·
--             nomor ganda = ditolak_label_ganda · versi lama = ditolak_versi_lama · LKK ACC = ditolak_terkunci ·
--             draft = dicadangkan · tabel kembali kosong.
--
-- Isi (SEMUA TABEL BARU, tidak ada tabel lama yang disentuh):
--   1. tera_lkk            : LKK yang sudah dikirim teknisi (1 baris = 1 LKK utuh)
--   2. tera_sync_receipts  : "tanda terima" tiap kiriman yang diterima utuh (dasar status hijau)
--   3. tera_sync_conflicts : kiriman yang DITOLAK karena LKK sudah dikunci Penyelia (salinan disimpan, F4.13)
--   4. tera_error_logs     : catatan error/macet dari perangkat teknisi (F13 / CLAUDE.md 12)
--   4b. tera_lkk_drafts    : CADANGAN draft LKK (belum "Selesai") — fotokopi berkala ke server,
--                            TIDAK masuk Selia, tidak dicek nomor ganda (permintaan Ridhwan 19 Okt 04.36)
--   5. fungsi public.tera_terima_lkk(...) : satu pintu penerimaan paket, utuh-atau-tidak-sama-sekali
--   6. fungsi public.tera_simpan_draft(...): simpan cadangan draft (versi baru menimpa versi lama, tidak sebaliknya)
--
-- Pengaman:
--   - Semua tabel RLS aktif TANPA policy & tanpa GRANT ke anon/authenticated
--     → browser tidak bisa membaca/menulis langsung; hanya server (service role),
--       sama seperti tabel lama (audit-fase0 bagian 9.2).
--   - Fungsi penerima hanya boleh dipanggil service role.
--   - Data uji BO 999 wajib is_test = true (dicegah database).
--   - Nomor label HARUS unik (diubah 19 Okt 2026 atas permintaan Ridhwan): LKK kedua dengan nomor
--     yang sama DITOLAK, salinannya disimpan di tera_sync_conflicts, data teknisi tetap aman di perangkat.
-- =====================================================================


-- =====================================================================
-- BLOK 1 — BACKUP
-- Tidak ada tabel lama yang diubah, jadi tidak ada data yang perlu disalin.
-- Cukup pastikan nama tabel/fungsi baru belum terpakai (harapan: semua false).
-- =====================================================================
select to_regclass('public.tera_lkk')            is not null as tera_lkk_sudah_ada,
       to_regclass('public.tera_sync_receipts')  is not null as receipts_sudah_ada,
       to_regclass('public.tera_sync_conflicts') is not null as conflicts_sudah_ada,
       to_regclass('public.tera_error_logs')     is not null as error_logs_sudah_ada,
       to_regclass('public.tera_lkk_drafts')     is not null as drafts_sudah_ada,
       exists (select 1 from pg_proc where proname = 'tera_terima_lkk') as fungsi_sudah_ada;


-- =====================================================================
-- BLOK 2 — PERUBAHAN
-- =====================================================================
begin;

-- 1) LKK ---------------------------------------------------------------
create table public.tera_lkk (
  id                   uuid primary key,                 -- dibuat DI PERANGKAT (kirim ulang = baris sama, tidak dobel)
  jadwal_id            text,                             -- jadwal_kalibrasi.id (diisi mulai Tahap 3; tanpa FK agar modul lama tidak terikat)
  bo                   text not null check (bo ~ '^[0-9]{3}$'),
  no_label             text not null check (no_label ~ '^[0-9]{3}\.[0-9]{4}$'),
  template_kode        text not null,
  template_versi       integer not null check (template_versi > 0),
  teknisi_user_id      uuid not null references public.profiles(id) on delete restrict,
  tanggal_kalibrasi    date,
  alat_tambahan        boolean not null default false,
  po_item_ref          text,
  status               text not null default 'submitted'
                       check (status in ('submitted','under_review','returned','approved','correction_open')),
  data                 jsonb not null,                   -- isian teknisi
  results              jsonb,                            -- hasil hitung (rata-rata, koreksi, U95, kesimpulan)
  calibrator_snapshot  jsonb,                            -- "fotokopi sertifikat kalibrator" (dipakai Tahap 4)
  checksum             text not null check (checksum ~ '^[0-9a-f]{64}$'),   -- SHA-256 paket
  jumlah_titik         integer not null check (jumlah_titik >= 0),
  client_version       integer not null check (client_version > 0),         -- naik tiap teknisi mengirim versi baru (revisi)
  is_test              boolean not null default false,
  client_updated_at    timestamptz,
  server_received_at   timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint tera_lkk_bo_cocok_label check (left(no_label, 3) = bo),
  constraint tera_lkk_bo_999_wajib_uji check (bo <> '999' or is_test)
);
comment on table public.tera_lkk is 'Tera SMK: LKK yang sudah dikirim teknisi (1 baris = 1 LKK utuh). Ditulis hanya lewat public.tera_terima_lkk().';

create index tera_lkk_teknisi_idx   on public.tera_lkk (teknisi_user_id, updated_at desc);
create unique index tera_lkk_no_label_uniq on public.tera_lkk (no_label);        -- 1 nomor stiker = 1 LKK (F4.14)
create index tera_lkk_jadwal_idx    on public.tera_lkk (jadwal_id) where jadwal_id is not null;
create index tera_lkk_status_idx    on public.tera_lkk (status) where status <> 'approved';

-- 2) Tanda terima ---------------------------------------------------------
create table public.tera_sync_receipts (
  id               bigint generated always as identity primary key,
  lkk_id           uuid not null references public.tera_lkk(id) on delete restrict,
  client_version   integer not null,
  checksum         text not null,
  jumlah_titik     integer not null,
  user_id          uuid not null references public.profiles(id) on delete restrict,
  diterima_pada    timestamptz not null default now(),
  unique (lkk_id, client_version)
);
comment on table public.tera_sync_receipts is 'Tera SMK: tanda terima kiriman LKK yang diterima utuh. Hijau di perangkat hanya bila checksum & jumlah titik di sini cocok.';
create index tera_sync_receipts_user_idx on public.tera_sync_receipts (user_id);

-- 3) Kiriman yang ditolak karena LKK sudah dikunci ---------------------------
create table public.tera_sync_conflicts (
  id            bigint generated always as identity primary key,
  lkk_id        uuid not null,                          -- tanpa FK: salinan tetap tersimpan apa pun kondisinya
  user_id       uuid not null references public.profiles(id) on delete restrict,
  alasan        text not null,
  status_server text,
  payload       jsonb not null,                         -- salinan utuh kiriman (untuk Developer)
  dibuat_pada   timestamptz not null default now()
);
comment on table public.tera_sync_conflicts is 'Tera SMK: kiriman teknisi yang ditolak (LKK sudah diperiksa/ACC). Salinan disimpan untuk Developer (F4.13). Tidak pernah dihapus.';
create index tera_sync_conflicts_lkk_idx  on public.tera_sync_conflicts (lkk_id);
create index tera_sync_conflicts_user_idx on public.tera_sync_conflicts (user_id);

-- 4) Log error perangkat -----------------------------------------------------
create table public.tera_error_logs (
  id          bigint generated always as identity primary key,
  user_id     uuid references public.profiles(id) on delete set null,
  perangkat   text,
  versi_app   text,
  pesan       text not null check (length(pesan) <= 2000),
  konteks     jsonb,
  waktu       timestamptz not null default now()
);
comment on table public.tera_error_logs is 'Tera SMK: error & kejadian macet dari perangkat teknisi, dibaca Developer.';
create index tera_error_logs_waktu_idx on public.tera_error_logs (waktu desc);
create index tera_error_logs_user_idx  on public.tera_error_logs (user_id);

-- 4b) Cadangan draft ------------------------------------------------------------
create table public.tera_lkk_drafts (
  id                uuid primary key,                     -- = id LKK di perangkat
  teknisi_user_id   uuid not null references public.profiles(id) on delete restrict,
  bo                text check (bo is null or bo ~ '^[0-9]{3}$'),
  no_label          text,                                 -- boleh kosong / ganda: ini hanya cadangan
  template_kode     text,
  data              jsonb not null,
  checksum          text not null check (checksum ~ '^[0-9a-f]{64}$'),
  client_version    integer not null check (client_version > 0),
  is_test           boolean not null default false,
  client_updated_at timestamptz,
  dicadangkan_pada  timestamptz not null default now()
);
comment on table public.tera_lkk_drafts is 'Tera SMK: cadangan draft LKK (belum Selesai). Hanya untuk pemulihan bila perangkat bermasalah; tidak masuk Selia/BAP/tagihan. Ditulis hanya lewat public.tera_simpan_draft().';
create index tera_lkk_drafts_teknisi_idx on public.tera_lkk_drafts (teknisi_user_id, dicadangkan_pada desc);

-- Kunci pintu: RLS aktif, tanpa policy, tanpa hak untuk browser
alter table public.tera_lkk            enable row level security;
alter table public.tera_sync_receipts  enable row level security;
alter table public.tera_sync_conflicts enable row level security;
alter table public.tera_error_logs     enable row level security;
alter table public.tera_lkk_drafts     enable row level security;
revoke all on public.tera_lkk, public.tera_sync_receipts, public.tera_sync_conflicts, public.tera_error_logs, public.tera_lkk_drafts
  from public, anon, authenticated;
grant select, insert, update on public.tera_lkk, public.tera_sync_receipts, public.tera_sync_conflicts, public.tera_error_logs, public.tera_lkk_drafts
  to service_role;

-- 5) Satu pintu penerimaan paket (utuh atau tidak sama sekali) -------------------
--    Hasil (jsonb):
--      {"hasil":"diterima"|"sudah_diterima"|"ditolak_terkunci"|"ditolak_versi_lama"|"ditolak_label_ganda", ...}
--    Pemeriksaan checksum & jumlah titik dihitung ULANG di server (Node) sebelum fungsi ini dipanggil;
--    fungsi ini menjaga urutan versi, kunci Penyelia, dan tanda terima dalam SATU transaksi.
create or replace function public.tera_terima_lkk(
  p_id uuid, p_user uuid, p_bo text, p_no_label text,
  p_template_kode text, p_template_versi integer,
  p_tanggal date, p_alat_tambahan boolean, p_po_item_ref text, p_jadwal_id text,
  p_data jsonb, p_results jsonb, p_calibrator_snapshot jsonb,
  p_checksum text, p_jumlah_titik integer, p_client_version integer,
  p_is_test boolean, p_client_updated_at timestamptz
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_lama  public.tera_lkk%rowtype;
  v_dup   boolean;
  v_con   text;
begin
  select * into v_lama from public.tera_lkk where id = p_id for update;

  if found then
    -- Kiriman ulang yang sama persis → jawab "sudah diterima" (idempoten, tidak dobel)
    if exists (select 1 from public.tera_sync_receipts r
                where r.lkk_id = p_id and r.client_version = p_client_version and r.checksum = p_checksum) then
      return jsonb_build_object('hasil','sudah_diterima','checksum',p_checksum,'jumlah_titik',p_jumlah_titik,
                                'client_version',p_client_version,'status',v_lama.status);
    end if;

    -- LKK milik teknisi lain tidak boleh ditimpa
    if v_lama.teknisi_user_id <> p_user then
      insert into public.tera_sync_conflicts (lkk_id, user_id, alasan, status_server, payload)
      values (p_id, p_user, 'LKK milik teknisi lain', v_lama.status, p_data);
      return jsonb_build_object('hasil','ditolak_terkunci','alasan','LKK ini milik teknisi lain.');
    end if;

    -- Sudah dipegang Penyelia → tolak, salinan disimpan (F4.13)
    if v_lama.status not in ('submitted','returned') then
      insert into public.tera_sync_conflicts (lkk_id, user_id, alasan, status_server, payload)
      values (p_id, p_user, 'LKK sudah diperiksa/ACC Penyelia', v_lama.status,
              jsonb_build_object('data',p_data,'results',p_results,'checksum',p_checksum,'client_version',p_client_version));
      return jsonb_build_object('hasil','ditolak_terkunci','status',v_lama.status,
                                'alasan','LKK sudah diperiksa Penyelia. Salinan Anda disimpan untuk Developer.');
    end if;

    -- Versi lebih lama dari yang sudah ada → abaikan (versi baru tidak boleh tertimpa versi lama)
    if p_client_version <= v_lama.client_version then
      return jsonb_build_object('hasil','ditolak_versi_lama','client_version_server',v_lama.client_version);
    end if;

    select exists (select 1 from public.tera_lkk where no_label = p_no_label and id <> p_id) into v_dup;
    if v_dup then
      insert into public.tera_sync_conflicts (lkk_id, user_id, alasan, status_server, payload)
      values (p_id, p_user, 'Nomor label sudah dipakai LKK lain', v_lama.status,
              jsonb_build_object('no_label',p_no_label,'data',p_data,'results',p_results,'checksum',p_checksum,'client_version',p_client_version));
      return jsonb_build_object('hasil','ditolak_label_ganda','no_label',p_no_label,
        'alasan','Nomor stiker '||p_no_label||' sudah dipakai LKK lain. Periksa nomor di stiker alat, perbaiki, lalu kirim lagi. Data Anda aman di perangkat.');
    end if;

    update public.tera_lkk set
      jadwal_id = p_jadwal_id, bo = p_bo, no_label = p_no_label,
      template_kode = p_template_kode, template_versi = p_template_versi,
      tanggal_kalibrasi = p_tanggal, alat_tambahan = p_alat_tambahan, po_item_ref = p_po_item_ref,
      status = 'submitted', data = p_data, results = p_results, calibrator_snapshot = p_calibrator_snapshot,
      checksum = p_checksum, jumlah_titik = p_jumlah_titik, client_version = p_client_version,
      is_test = p_is_test, client_updated_at = p_client_updated_at,
      server_received_at = now(), updated_at = now()
    where id = p_id;
  else
    select exists (select 1 from public.tera_lkk where no_label = p_no_label) into v_dup;
    if v_dup then
      insert into public.tera_sync_conflicts (lkk_id, user_id, alasan, status_server, payload)
      values (p_id, p_user, 'Nomor label sudah dipakai LKK lain', null,
              jsonb_build_object('no_label',p_no_label,'data',p_data,'results',p_results,'checksum',p_checksum,'client_version',p_client_version));
      return jsonb_build_object('hasil','ditolak_label_ganda','no_label',p_no_label,
        'alasan','Nomor stiker '||p_no_label||' sudah dipakai LKK lain. Periksa nomor di stiker alat, perbaiki, lalu kirim lagi. Data Anda aman di perangkat.');
    end if;

    insert into public.tera_lkk (id, jadwal_id, bo, no_label, template_kode, template_versi, teknisi_user_id,
      tanggal_kalibrasi, alat_tambahan, po_item_ref, status, data, results, calibrator_snapshot,
      checksum, jumlah_titik, client_version, is_test, client_updated_at)
    values (p_id, p_jadwal_id, p_bo, p_no_label, p_template_kode, p_template_versi, p_user,
      p_tanggal, p_alat_tambahan, p_po_item_ref, 'submitted', p_data, p_results, p_calibrator_snapshot,
      p_checksum, p_jumlah_titik, p_client_version, p_is_test, p_client_updated_at);
  end if;

  insert into public.tera_sync_receipts (lkk_id, client_version, checksum, jumlah_titik, user_id)
  values (p_id, p_client_version, p_checksum, p_jumlah_titik, p_user);

  return jsonb_build_object('hasil','diterima','checksum',p_checksum,'jumlah_titik',p_jumlah_titik,
                            'client_version',p_client_version,'status','submitted');

exception
  when unique_violation then
    -- Dua perangkat mengirim nomor yang sama di detik yang sama: yang kalah ditolak, bukan hilang.
    get stacked diagnostics v_con = constraint_name;
    if v_con = 'tera_lkk_no_label_uniq' then
      insert into public.tera_sync_conflicts (lkk_id, user_id, alasan, status_server, payload)
      values (p_id, p_user, 'Nomor label sudah dipakai LKK lain', null,
              jsonb_build_object('no_label',p_no_label,'data',p_data,'results',p_results,'checksum',p_checksum,'client_version',p_client_version));
      return jsonb_build_object('hasil','ditolak_label_ganda','no_label',p_no_label,
        'alasan','Nomor stiker '||p_no_label||' sudah dipakai LKK lain. Periksa nomor di stiker alat, perbaiki, lalu kirim lagi. Data Anda aman di perangkat.');
    end if;
    raise;   -- kiriman ulang LKK yang sama: perangkat mencoba lagi dan mendapat "sudah_diterima"
end;
$$;

revoke all on function public.tera_terima_lkk(uuid,uuid,text,text,text,integer,date,boolean,text,text,jsonb,jsonb,jsonb,text,integer,integer,boolean,timestamptz)
  from public, anon, authenticated;
grant execute on function public.tera_terima_lkk(uuid,uuid,text,text,text,integer,date,boolean,text,text,jsonb,jsonb,jsonb,text,integer,integer,boolean,timestamptz)
  to service_role;

-- 6) Simpan cadangan draft -------------------------------------------------------
create or replace function public.tera_simpan_draft(
  p_id uuid, p_user uuid, p_bo text, p_no_label text, p_template_kode text,
  p_data jsonb, p_checksum text, p_client_version integer, p_is_test boolean, p_client_updated_at timestamptz
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_lama public.tera_lkk_drafts%rowtype;
begin
  select * into v_lama from public.tera_lkk_drafts where id = p_id for update;
  if found then
    if v_lama.teknisi_user_id <> p_user then
      return jsonb_build_object('hasil','ditolak','alasan','Draft milik teknisi lain.');
    end if;
    if p_client_version <= v_lama.client_version then
      return jsonb_build_object('hasil','sudah_dicadangkan','client_version',v_lama.client_version,'checksum',v_lama.checksum);
    end if;
    update public.tera_lkk_drafts set
      bo = p_bo, no_label = p_no_label, template_kode = p_template_kode, data = p_data,
      checksum = p_checksum, client_version = p_client_version, is_test = p_is_test,
      client_updated_at = p_client_updated_at, dicadangkan_pada = now()
    where id = p_id;
  else
    insert into public.tera_lkk_drafts (id, teknisi_user_id, bo, no_label, template_kode, data, checksum,
      client_version, is_test, client_updated_at)
    values (p_id, p_user, p_bo, p_no_label, p_template_kode, p_data, p_checksum,
      p_client_version, p_is_test, p_client_updated_at);
  end if;
  return jsonb_build_object('hasil','dicadangkan','client_version',p_client_version,'checksum',p_checksum);
exception
  when unique_violation then
    return jsonb_build_object('hasil','coba_lagi');   -- dua kiriman draft yang sama di detik yang sama
end;
$$;

revoke all on function public.tera_simpan_draft(uuid,uuid,text,text,text,jsonb,text,integer,boolean,timestamptz)
  from public, anon, authenticated;
grant execute on function public.tera_simpan_draft(uuid,uuid,text,text,text,jsonb,text,integer,boolean,timestamptz)
  to service_role;

commit;


-- =====================================================================
-- BLOK 3 — CEK (harapan: semua kolom "hasil" = true)
-- =====================================================================
select 'lima tabel ada' cek,
       (select count(*) from pg_tables where schemaname='public'
          and tablename in ('tera_lkk','tera_sync_receipts','tera_sync_conflicts','tera_error_logs','tera_lkk_drafts')) = 5 hasil
union all
select 'RLS aktif di kelimanya',
       (select bool_and(rowsecurity) from pg_tables where schemaname='public'
          and tablename in ('tera_lkk','tera_sync_receipts','tera_sync_conflicts','tera_error_logs','tera_lkk_drafts'))
union all
select 'browser tidak punya hak apa pun',
       not exists (select 1 from information_schema.role_table_grants
                    where table_schema='public' and table_name like 'tera\_%'
                      and grantee in ('anon','authenticated','PUBLIC'))
union all
select 'fungsi penerima hanya untuk service_role',
       not has_function_privilege('authenticated', 'public.tera_terima_lkk(uuid,uuid,text,text,text,integer,date,boolean,text,text,jsonb,jsonb,jsonb,text,integer,integer,boolean,timestamptz)', 'execute')
       and not has_function_privilege('anon', 'public.tera_terima_lkk(uuid,uuid,text,text,text,integer,date,boolean,text,text,jsonb,jsonb,jsonb,text,integer,integer,boolean,timestamptz)', 'execute')
union all
select 'fungsi draft hanya untuk service_role',
       not has_function_privilege('authenticated', 'public.tera_simpan_draft(uuid,uuid,text,text,text,jsonb,text,integer,boolean,timestamptz)', 'execute')
       and not has_function_privilege('anon', 'public.tera_simpan_draft(uuid,uuid,text,text,text,jsonb,text,integer,boolean,timestamptz)', 'execute')
union all
select 'nomor label dijaga unik',
       exists (select 1 from pg_indexes where schemaname='public' and indexname='tera_lkk_no_label_uniq')
union all
select 'tabel lama tidak berubah (labels masih 3.934-an baris)',
       (select count(*) from public.labels) >= 3934;


-- =====================================================================
-- BLOK 4 — BATALKAN (hanya bila ada masalah; aman selama belum ada LKK sungguhan)
-- =====================================================================
-- begin;
-- drop function if exists public.tera_terima_lkk(uuid,uuid,text,text,text,integer,date,boolean,text,text,jsonb,jsonb,jsonb,text,integer,integer,boolean,timestamptz);
-- drop function if exists public.tera_simpan_draft(uuid,uuid,text,text,text,jsonb,text,integer,boolean,timestamptz);
-- drop table if exists public.tera_lkk_drafts;
-- drop table if exists public.tera_sync_receipts;
-- drop table if exists public.tera_sync_conflicts;
-- drop table if exists public.tera_error_logs;
-- drop table if exists public.tera_lkk;
-- commit;
