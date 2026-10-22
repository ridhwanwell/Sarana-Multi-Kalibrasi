-- 0011: Riwayat perubahan LKK (tak bisa diubah/dihapus) + fungsi KEMBALIKAN & ACC (Tahap 4.4b-2).
-- Tabel baru berawalan tera_; tera_lkk hanya DITAMBAH 4 kolom (tabel Tera sendiri). Tabel lama (labels dll.) tidak disentuh.
-- Pola akses = tabel tera_ lain: RLS aktif tanpa kebijakan; fungsi hanya boleh dipanggil server (service role).
-- STATUS: DIJALANKAN 22 Okt 2026 setelah "lanjutkan" (lihat PROMPT.md).

-- ===== BLOK 1: BACKUP =====
create table if not exists backup.b20261022_tera_lkk_sebelum_0011 as table public.tera_lkk;

-- ===== BLOK 2: PERUBAHAN =====
begin;

alter table public.tera_lkk
  add column if not exists acc_oleh      uuid,
  add column if not exists acc_oleh_nama text,
  add column if not exists acc_at        timestamptz,
  add column if not exists revisi        integer not null default 0;

create table public.tera_lkk_riwayat (
  id         bigint generated always as identity primary key,
  lkk_id     uuid        not null references public.tera_lkk(id) on delete restrict,
  aksi       text        not null check (aksi in ('kembalikan','acc','buka_koreksi','acc_ulang','ubah_nilai','tandai_diperiksa')),
  oleh       uuid        not null,
  oleh_nama  text,
  alasan     text,
  kolom      text,
  nilai_lama jsonb,
  nilai_baru jsonb,
  status_dari text,
  status_ke   text,
  client_version integer,
  dibuat_at  timestamptz not null default now()
);
comment on table public.tera_lkk_riwayat is 'Riwayat perubahan LKK: siapa, kapan, apa, alasan. Hanya bisa ditambah; UPDATE/DELETE/TRUNCATE ditolak.';
alter table public.tera_lkk_riwayat enable row level security;
create index tera_lkk_riwayat_lkk_idx on public.tera_lkk_riwayat (lkk_id, dibuat_at);

create function public.tera_riwayat_tak_berubah() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'Riwayat LKK tidak boleh diubah atau dihapus.';
end $$;
create trigger tera_riwayat_tak_berubah_baris before update or delete on public.tera_lkk_riwayat
  for each row execute function public.tera_riwayat_tak_berubah();
create trigger tera_riwayat_tak_berubah_semua before truncate on public.tera_lkk_riwayat
  for each statement execute function public.tera_riwayat_tak_berubah();

-- KEMBALIKAN ke teknisi (alasan wajib)
create function public.tera_kembalikan_lkk(p_id uuid, p_user uuid, p_nama text, p_alasan text)
returns jsonb language plpgsql set search_path = '' as $$
declare v public.tera_lkk%rowtype;
begin
  if p_alasan is null or length(btrim(p_alasan)) < 3 then
    return jsonb_build_object('hasil','ditolak','alasan','Alasan pengembalian wajib diisi (min. 3 huruf).');
  end if;
  select * into v from public.tera_lkk where id = p_id for update;
  if not found then return jsonb_build_object('hasil','ditolak','alasan','LKK tidak ditemukan.'); end if;
  if v.status = 'returned' then
    return jsonb_build_object('hasil','sudah_dikembalikan','status',v.status);
  end if;
  if v.status not in ('submitted','under_review') then
    return jsonb_build_object('hasil','ditolak','status',v.status,'alasan','LKK berstatus '||v.status||', tidak bisa dikembalikan.');
  end if;
  update public.tera_lkk set status = 'returned', updated_at = now() where id = p_id;
  insert into public.tera_lkk_riwayat (lkk_id, aksi, oleh, oleh_nama, alasan, status_dari, status_ke, client_version)
  values (p_id, 'kembalikan', p_user, p_nama, btrim(p_alasan), v.status, 'returned', v.client_version);
  return jsonb_build_object('hasil','dikembalikan','status','returned');
end $$;

-- ACC (ditolak bila belum diperiksa server / ada penanda yang memblokir)
create function public.tera_acc_lkk(p_id uuid, p_user uuid, p_nama text)
returns jsonb language plpgsql set search_path = '' as $$
declare v public.tera_lkk%rowtype; p public.tera_lkk_pemeriksaan%rowtype;
begin
  select * into v from public.tera_lkk where id = p_id for update;
  if not found then return jsonb_build_object('hasil','ditolak','alasan','LKK tidak ditemukan.'); end if;
  if v.status = 'approved' then
    return jsonb_build_object('hasil','sudah_acc','status',v.status);
  end if;
  if v.status not in ('submitted','under_review') then
    return jsonb_build_object('hasil','ditolak','status',v.status,'alasan','LKK berstatus '||v.status||', tidak bisa di-ACC.');
  end if;
  select * into p from public.tera_lkk_pemeriksaan where lkk_id = p_id and client_version = v.client_version;
  if not found then
    return jsonb_build_object('hasil','ditolak','alasan','LKK belum diperiksa server. Tunggu sebentar lalu coba lagi.');
  end if;
  if not p.boleh_acc then
    return jsonb_build_object('hasil','ditolak','alasan','Masih ada penanda merah yang memblokir ACC. Kembalikan ke teknisi untuk diperbaiki.','penanda',p.penanda);
  end if;
  update public.tera_lkk
     set status = 'approved', acc_oleh = p_user, acc_oleh_nama = p_nama, acc_at = now(), updated_at = now()
   where id = p_id;
  insert into public.tera_lkk_riwayat (lkk_id, aksi, oleh, oleh_nama, status_dari, status_ke, client_version)
  values (p_id, case when v.revisi > 0 then 'acc_ulang' else 'acc' end, p_user, p_nama, v.status, 'approved', v.client_version);
  return jsonb_build_object('hasil','acc','status','approved','revisi',v.revisi);
end $$;

-- Hanya server (service role) yang boleh memanggil
revoke all on function public.tera_kembalikan_lkk(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.tera_acc_lkk(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.tera_riwayat_tak_berubah() from public, anon, authenticated;

commit;

-- ===== BLOK 3: CEK (harapan: semuanya true; kebijakan = 0) =====
select
  to_regclass('public.tera_lkk_riwayat') is not null as tabel_ada,
  (select relrowsecurity from pg_class where oid = 'public.tera_lkk_riwayat'::regclass) as rls,
  (select count(*) from pg_policies where schemaname='public' and tablename='tera_lkk_riwayat') as kebijakan,
  (select count(*) = 4 from information_schema.columns where table_schema='public' and table_name='tera_lkk' and column_name in ('acc_oleh','acc_oleh_nama','acc_at','revisi')) as kolom_ada,
  (select count(*) = 2 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname='public' and p.proname in ('tera_kembalikan_lkk','tera_acc_lkk')) as fungsi_ada,
  (select count(*) = 2 from pg_trigger where tgrelid = 'public.tera_lkk_riwayat'::regclass and not tgisinternal) as pelindung_ada;

-- ===== BLOK 4: BATALKAN (hanya bila ada masalah; tabel riwayat masih kosong saat dibuat) =====
-- drop function public.tera_acc_lkk(uuid, uuid, text);
-- drop function public.tera_kembalikan_lkk(uuid, uuid, text, text);
-- drop table public.tera_lkk_riwayat;   -- (ikut menghapus trigger)
-- drop function public.tera_riwayat_tak_berubah();
-- alter table public.tera_lkk drop column acc_oleh, drop column acc_oleh_nama, drop column acc_at, drop column revisi;
