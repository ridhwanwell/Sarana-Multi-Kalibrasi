-- 0015 — Tanda tangan elektronik (TTE) sertifikat Tera SMK (Tahap 4.6a), 22 Okt 2026.
-- Perumpamaan: buku register stempel. Tiap sertifikat yang di-ACC dicatat satu baris (kode verifikasi acak, siapa yang
-- menandatangani, kapan, status Berlaku/Digantikan). QR di sertifikat menunjuk ke kode ini. Hanya SERVER (service role) yang
-- boleh membaca/menulis; halaman publik memanggil fungsi tera_verifikasi_sertifikat lewat server dan hanya menerima data ringkas.
-- Tidak mengubah tabel lama. Satu-satunya fungsi yang diganti: tera_acc_lkk (milik Tera) — ditambah pencatatan sertifikat di
-- transaksi yang sama (ACC dan catatan TTE tidak mungkin terpisah). Isi lama fungsi ada di BLOK 4 untuk dikembalikan.

-- ===== BLOK 1: BACKUP =====
-- Tabel baru: tidak ada data yang diubah. Satu-satunya yang berubah adalah fungsi public.tera_acc_lkk: definisi LAMA disalin
-- utuh di BLOK 4 (BATALKAN). Tidak ada baris tera_lkk yang disentuh.

-- ===== BLOK 2: PERUBAHAN =====
create table if not exists public.tera_signatories (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique,                 -- mis. 'manajer_teknik'
  nama text not null,
  jabatan text not null,
  jabatan_en text not null,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.tera_signatories enable row level security;   -- tanpa policy: hanya service role

insert into public.tera_signatories (kode, nama, jabatan, jabatan_en)
values ('manajer_teknik', 'Hafizh Pasifianto Utomo, S.Tr.T.', 'Manajer Teknik', 'Technical Manager')
on conflict (kode) do nothing;

create table if not exists public.tera_sertifikat (
  id uuid primary key default gen_random_uuid(),
  lkk_id uuid not null references public.tera_lkk(id),
  revisi integer not null default 0,
  kode_verifikasi text not null unique check (char_length(kode_verifikasi) = 24),
  bo text not null,
  no_label text not null,
  status text not null default 'berlaku' check (status in ('berlaku','digantikan')),
  signatory_nama text not null,              -- dibekukan saat ACC
  signatory_jabatan text not null,
  ditandatangani_at timestamptz not null default now(),
  ditandatangani_oleh uuid,                  -- penyelia yang meng-ACC
  ringkasan jsonb not null,                  -- alat, merek, tipe, SN, RS, tanggal kalibrasi, hasil (untuk halaman verifikasi)
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  unique (lkk_id, revisi)
);
create index if not exists tera_sertifikat_lkk_idx on public.tera_sertifikat (lkk_id);
create index if not exists tera_sertifikat_label_idx on public.tera_sertifikat (no_label);
alter table public.tera_sertifikat enable row level security;    -- tanpa policy: hanya service role

-- ACC + catat sertifikat TTE (menggantikan versi lama; perilaku ACC tidak berubah)
create or replace function public.tera_acc_lkk(p_id uuid, p_user uuid, p_nama text)
 returns jsonb
 language plpgsql
 set search_path to ''
as $function$
declare v public.tera_lkk%rowtype; p public.tera_lkk_pemeriksaan%rowtype; s public.tera_signatories%rowtype;
        rs text; nama_alat text; kode text; iden jsonb;
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
  select * into s from public.tera_signatories where kode = 'manajer_teknik' and aktif;
  if not found then
    return jsonb_build_object('hasil','ditolak','alasan','Data penandatangan (Manajer Teknik) belum ada. Hubungi Developer.');
  end if;

  update public.tera_lkk
     set status = 'approved', acc_oleh = p_user, acc_oleh_nama = p_nama, acc_at = now(), updated_at = now()
   where id = p_id;
  insert into public.tera_lkk_riwayat (lkk_id, aksi, oleh, oleh_nama, status_dari, status_ke, client_version)
  values (p_id, case when v.revisi > 0 then 'acc_ulang' else 'acc' end, p_user, p_nama, v.status, 'approved', v.client_version);

  -- TTE: revisi lama → Digantikan; catat revisi ini dengan kode acak (24 karakter hex dari 2 UUID acak)
  select j.nama_rs into rs from public.tera_jadwal_push j where j.jadwal_id = v.jadwal_id limit 1;
  select t.nama into nama_alat from public.tera_device_templates t where t.kode_alat = v.template_kode and t.versi = v.template_versi limit 1;
  iden := coalesce(v.data -> 'identitas', '{}'::jsonb);
  kode := substr(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 1, 24);
  update public.tera_sertifikat set status = 'digantikan' where lkk_id = p_id and status = 'berlaku';
  insert into public.tera_sertifikat (lkk_id, revisi, kode_verifikasi, bo, no_label, signatory_nama, signatory_jabatan,
                                      ditandatangani_oleh, ringkasan, is_test)
  values (p_id, v.revisi, kode, v.bo, v.no_label, s.nama, s.jabatan, p_user,
          jsonb_build_object(
            'namaAlat', coalesce(nama_alat, v.template_kode),
            'merek', iden ->> 'merek', 'tipe', iden ->> 'tipe', 'noSeri', iden ->> 'noSeri',
            'namaRs', rs, 'tanggalKalibrasi', v.tanggal_kalibrasi,
            'hasil', v.results ->> 'kesimpulan'),
          v.is_test)
  on conflict (lkk_id, revisi) do nothing;

  return jsonb_build_object('hasil','acc','status','approved','revisi',v.revisi,'kodeVerifikasi',kode);
end $function$;

-- Fungsi untuk halaman publik verifikasi (dipanggil SERVER saja; hanya data ringkas, tidak membocorkan isi LKK)
create or replace function public.tera_verifikasi_sertifikat(p_kode text)
 returns jsonb
 language sql
 stable
 set search_path to ''
as $$
  select case when s.id is null then jsonb_build_object('ditemukan', false) else jsonb_build_object(
    'ditemukan', true,
    'noLabel', s.no_label, 'bo', s.bo, 'revisi', s.revisi, 'status', s.status,
    'ditandatanganiOleh', s.signatory_nama, 'jabatan', s.signatory_jabatan, 'ditandatanganiAt', s.ditandatangani_at,
    'ringkasan', s.ringkasan, 'isTest', s.is_test) end
  from (select 1) x left join public.tera_sertifikat s on s.kode_verifikasi = p_kode
$$;

revoke all on function public.tera_verifikasi_sertifikat(text) from public, anon, authenticated;
grant execute on function public.tera_verifikasi_sertifikat(text) to service_role;

-- ===== BLOK 3: CEK =====
-- select count(*) from public.tera_signatories where kode='manajer_teknik' and aktif;                        -- 1
-- select relrowsecurity from pg_class where oid in ('public.tera_signatories'::regclass,'public.tera_sertifikat'::regclass); -- true, true
-- select count(*) from pg_policies where tablename in ('tera_signatories','tera_sertifikat');                 -- 0
-- select has_function_privilege('anon','public.tera_verifikasi_sertifikat(text)','execute');                  -- false
-- select public.tera_verifikasi_sertifikat('tidak-ada');                                                      -- {"ditemukan": false}
-- select pg_get_functiondef('public.tera_acc_lkk'::regproc) like '%tera_sertifikat%';                         -- true

-- ===== BLOK 4: BATALKAN (hanya bila belum ada sertifikat tercatat) =====
-- 4a. Kembalikan fungsi ACC lama:
-- create or replace function public.tera_acc_lkk(p_id uuid, p_user uuid, p_nama text)
--  returns jsonb language plpgsql set search_path to ''
-- as $function$
-- declare v public.tera_lkk%rowtype; p public.tera_lkk_pemeriksaan%rowtype;
-- begin
--   select * into v from public.tera_lkk where id = p_id for update;
--   if not found then return jsonb_build_object('hasil','ditolak','alasan','LKK tidak ditemukan.'); end if;
--   if v.status = 'approved' then return jsonb_build_object('hasil','sudah_acc','status',v.status); end if;
--   if v.status not in ('submitted','under_review') then
--     return jsonb_build_object('hasil','ditolak','status',v.status,'alasan','LKK berstatus '||v.status||', tidak bisa di-ACC.'); end if;
--   select * into p from public.tera_lkk_pemeriksaan where lkk_id = p_id and client_version = v.client_version;
--   if not found then return jsonb_build_object('hasil','ditolak','alasan','LKK belum diperiksa server. Tunggu sebentar lalu coba lagi.'); end if;
--   if not p.boleh_acc then
--     return jsonb_build_object('hasil','ditolak','alasan','Masih ada penanda merah yang memblokir ACC. Kembalikan ke teknisi untuk diperbaiki.','penanda',p.penanda); end if;
--   update public.tera_lkk set status = 'approved', acc_oleh = p_user, acc_oleh_nama = p_nama, acc_at = now(), updated_at = now() where id = p_id;
--   insert into public.tera_lkk_riwayat (lkk_id, aksi, oleh, oleh_nama, status_dari, status_ke, client_version)
--   values (p_id, case when v.revisi > 0 then 'acc_ulang' else 'acc' end, p_user, p_nama, v.status, 'approved', v.client_version);
--   return jsonb_build_object('hasil','acc','status','approved','revisi',v.revisi);
-- end $function$;
-- 4b. Hapus objek baru (hanya bila tera_sertifikat kosong):
-- drop function if exists public.tera_verifikasi_sertifikat(text);
-- drop table if exists public.tera_sertifikat;
-- drop table if exists public.tera_signatories;
