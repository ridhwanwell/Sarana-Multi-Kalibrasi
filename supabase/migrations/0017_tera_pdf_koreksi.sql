-- =====================================================================
-- MIGRASI 0017 — PDF SERTIFIKAT TERSIMPAN, NAMA TAMPIL KALIBRATOR, BUKA KOREKSI (TAHAP 4.6c & 4.7, 25 Okt 2026)
-- Supabase : qr-label-kalibrasi (PRODUKSI)
-- Dijalankan setelah Ridhwan membalas "lanjutkan saja sampai tahap 4 selesai" (25 Okt 2026, 17.42).
--
-- Bahasa awam:
--   1. tera_sertifikat + 2 kolom: letak file PDF sertifikat (dengan kop) yang dibuat saat ACC, dan kapan dibuat.
--      Scan QR stiker membuka file ini. Tiap revisi punya file sendiri; file lama tidak dihapus.
--   2. tera_calibrator_points + 1 kolom "nama_tampil": nama alat standar yang tercetak di sertifikat bila berbeda
--      dengan nama di Manajemen Aset. CAL-037 → "NIBP Simulator" (keputusan Ridhwan 25 Okt; Manajemen Aset dirapikan nanti).
--   3. Fungsi baru tera_buka_koreksi: HANYA dipanggil server untuk Developer (admin_utama). Alasan wajib (kosong ditolak),
--      LKK yang sudah ACC → "Koreksi dibuka", nomor revisi naik, tercatat di riwayat (tidak bisa dihapus).
--   4. tera_kembalikan_lkk & tera_acc_lkk: boleh juga dipakai saat "Koreksi dibuka" (Kembalikan ke teknisi / ACC ulang).
--      Selain daftar status itu, isi fungsi SAMA PERSIS dengan sebelumnya (salinan lama ada di BLOK 4).
-- Tabel lama (labels, rumah_sakit, aset_kalibrator, dll.) TIDAK disentuh.
-- =====================================================================

-- =====================================================================
-- BLOK 1 — BACKUP
-- =====================================================================
create table backup.b20261025_tera_sertifikat as table public.tera_sertifikat;
create table backup.b20261025_tera_calibrator_points_0017 as table public.tera_calibrator_points;
select (select count(*) from backup.b20261025_tera_sertifikat) as sertifikat_tersalin,
       (select count(*) from backup.b20261025_tera_calibrator_points_0017) as titik_kalibrator_tersalin;

-- =====================================================================
-- BLOK 2 — PERUBAHAN
-- =====================================================================
begin;

alter table public.tera_sertifikat
  add column if not exists pdf_path      text,
  add column if not exists pdf_dibuat_at timestamptz;

alter table public.tera_calibrator_points
  add column if not exists nama_tampil text;
comment on column public.tera_calibrator_points.nama_tampil is 'Nama alat standar yang dicetak di sertifikat bila berbeda dengan aset_kalibrator.nama_alat. Kosong = pakai nama aset.';

update public.tera_calibrator_points
   set nama_tampil = 'NIBP Simulator'
 where aset_kalibrator_id = 'CAL-037' and parameter = 'tekanan_mmhg' and aktif;

create or replace function public.tera_buka_koreksi(p_id uuid, p_user uuid, p_nama text, p_alasan text)
 returns jsonb
 language plpgsql
 set search_path to ''
as $function$
declare v public.tera_lkk%rowtype;
begin
  if p_alasan is null or length(btrim(p_alasan)) < 5 then
    return jsonb_build_object('hasil','ditolak','alasan','Alasan koreksi wajib diisi (min. 5 huruf).');
  end if;
  select * into v from public.tera_lkk where id = p_id for update;
  if not found then return jsonb_build_object('hasil','ditolak','alasan','LKK tidak ditemukan.'); end if;
  if v.status = 'correction_open' then
    return jsonb_build_object('hasil','sudah_dibuka','status',v.status,'revisi',v.revisi);
  end if;
  if v.status <> 'approved' then
    return jsonb_build_object('hasil','ditolak','status',v.status,'alasan','Koreksi hanya bisa dibuka untuk LKK yang sudah ACC.');
  end if;
  update public.tera_lkk set status = 'correction_open', revisi = v.revisi + 1, updated_at = now() where id = p_id;
  insert into public.tera_lkk_riwayat (lkk_id, aksi, oleh, oleh_nama, alasan, status_dari, status_ke, client_version)
  values (p_id, 'buka_koreksi', p_user, p_nama, btrim(p_alasan), v.status, 'correction_open', v.client_version);
  return jsonb_build_object('hasil','dibuka','status','correction_open','revisi',v.revisi + 1);
end $function$;
revoke all on function public.tera_buka_koreksi(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.tera_buka_koreksi(uuid, uuid, text, text) to service_role;

CREATE OR REPLACE FUNCTION public.tera_kembalikan_lkk(p_id uuid, p_user uuid, p_nama text, p_alasan text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
  if v.status not in ('submitted','under_review','correction_open') then
    return jsonb_build_object('hasil','ditolak','status',v.status,'alasan','LKK berstatus '||v.status||', tidak bisa dikembalikan.');
  end if;
  update public.tera_lkk set status = 'returned', updated_at = now() where id = p_id;
  insert into public.tera_lkk_riwayat (lkk_id, aksi, oleh, oleh_nama, alasan, status_dari, status_ke, client_version)
  values (p_id, 'kembalikan', p_user, p_nama, btrim(p_alasan), v.status, 'returned', v.client_version);
  return jsonb_build_object('hasil','dikembalikan','status','returned');
end $function$;


CREATE OR REPLACE FUNCTION public.tera_acc_lkk(p_id uuid, p_user uuid, p_nama text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v public.tera_lkk%rowtype; p public.tera_lkk_pemeriksaan%rowtype; s public.tera_signatories%rowtype;
        rs text; nama_alat text; kode text; iden jsonb;
begin
  select * into v from public.tera_lkk where id = p_id for update;
  if not found then return jsonb_build_object('hasil','ditolak','alasan','LKK tidak ditemukan.'); end if;
  if v.status = 'approved' then
    return jsonb_build_object('hasil','sudah_acc','status',v.status);
  end if;
  if v.status not in ('submitted','under_review','correction_open') then
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


commit;

-- =====================================================================
-- BLOK 3 — CEK (harapan: semua kolom "hasil" = true)
-- =====================================================================
select 'kolom pdf_path & pdf_dibuat_at ada' cek,
       (select count(*) = 2 from information_schema.columns where table_schema='public' and table_name='tera_sertifikat' and column_name in ('pdf_path','pdf_dibuat_at')) hasil
union all
select 'CAL-037 aktif bernama tampil NIBP Simulator, isi titik tidak berubah',
       (select count(*) = 1 from public.tera_calibrator_points t join backup.b20261025_tera_calibrator_points_0017 b using (id)
         where t.aset_kalibrator_id='CAL-037' and t.aktif and t.nama_tampil = 'NIBP Simulator' and t.points = b.points)
union all
select 'baris sertifikat tidak berubah', (select count(*) = (select count(*) from backup.b20261025_tera_sertifikat) from public.tera_sertifikat)
union all
select 'buka koreksi hanya untuk service_role', not has_function_privilege('anon','public.tera_buka_koreksi(uuid,uuid,text,text)','execute')
       and not has_function_privilege('authenticated','public.tera_buka_koreksi(uuid,uuid,text,text)','execute')
union all
select 'ACC & Kembalikan menerima correction_open',
       pg_get_functiondef('public.tera_acc_lkk'::regproc) like '%correction_open%'
       and pg_get_functiondef('public.tera_kembalikan_lkk'::regproc) like '%correction_open%'
union all
select 'alasan kosong ditolak', (public.tera_buka_koreksi('00000000-0000-0000-0000-000000000000'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'cek', ' ') ->> 'hasil') = 'ditolak';

-- =====================================================================
-- BLOK 4 — BATALKAN (hanya bila ada masalah)
-- =====================================================================
-- begin;
-- drop function if exists public.tera_buka_koreksi(uuid, uuid, text, text);
-- (kolom baru dibiarkan; tidak dipakai bila kode dikembalikan) — lalu jalankan dua definisi LAMA berikut:
-- CREATE OR REPLACE FUNCTION public.tera_kembalikan_lkk(p_id uuid, p_user uuid, p_nama text, p_alasan text)
--  RETURNS jsonb
--  LANGUAGE plpgsql
--  SET search_path TO ''
-- AS $function$
-- declare v public.tera_lkk%rowtype;
-- begin
--   if p_alasan is null or length(btrim(p_alasan)) < 3 then
--     return jsonb_build_object('hasil','ditolak','alasan','Alasan pengembalian wajib diisi (min. 3 huruf).');
--   end if;
--   select * into v from public.tera_lkk where id = p_id for update;
--   if not found then return jsonb_build_object('hasil','ditolak','alasan','LKK tidak ditemukan.'); end if;
--   if v.status = 'returned' then
--     return jsonb_build_object('hasil','sudah_dikembalikan','status',v.status);
--   end if;
--   if v.status not in ('submitted','under_review') then
--     return jsonb_build_object('hasil','ditolak','status',v.status,'alasan','LKK berstatus '||v.status||', tidak bisa dikembalikan.');
--   end if;
--   update public.tera_lkk set status = 'returned', updated_at = now() where id = p_id;
--   insert into public.tera_lkk_riwayat (lkk_id, aksi, oleh, oleh_nama, alasan, status_dari, status_ke, client_version)
--   values (p_id, 'kembalikan', p_user, p_nama, btrim(p_alasan), v.status, 'returned', v.client_version);
--   return jsonb_build_object('hasil','dikembalikan','status','returned');
-- end $function$;
--
-- CREATE OR REPLACE FUNCTION public.tera_acc_lkk(p_id uuid, p_user uuid, p_nama text)
--  RETURNS jsonb
--  LANGUAGE plpgsql
--  SET search_path TO ''
-- AS $function$
-- declare v public.tera_lkk%rowtype; p public.tera_lkk_pemeriksaan%rowtype; s public.tera_signatories%rowtype;
--         rs text; nama_alat text; kode text; iden jsonb;
-- begin
--   select * into v from public.tera_lkk where id = p_id for update;
--   if not found then return jsonb_build_object('hasil','ditolak','alasan','LKK tidak ditemukan.'); end if;
--   if v.status = 'approved' then
--     return jsonb_build_object('hasil','sudah_acc','status',v.status);
--   end if;
--   if v.status not in ('submitted','under_review') then
--     return jsonb_build_object('hasil','ditolak','status',v.status,'alasan','LKK berstatus '||v.status||', tidak bisa di-ACC.');
--   end if;
--   select * into p from public.tera_lkk_pemeriksaan where lkk_id = p_id and client_version = v.client_version;
--   if not found then
--     return jsonb_build_object('hasil','ditolak','alasan','LKK belum diperiksa server. Tunggu sebentar lalu coba lagi.');
--   end if;
--   if not p.boleh_acc then
--     return jsonb_build_object('hasil','ditolak','alasan','Masih ada penanda merah yang memblokir ACC. Kembalikan ke teknisi untuk diperbaiki.','penanda',p.penanda);
--   end if;
--   select * into s from public.tera_signatories where kode = 'manajer_teknik' and aktif;
--   if not found then
--     return jsonb_build_object('hasil','ditolak','alasan','Data penandatangan (Manajer Teknik) belum ada. Hubungi Developer.');
--   end if;
--
--   update public.tera_lkk
--      set status = 'approved', acc_oleh = p_user, acc_oleh_nama = p_nama, acc_at = now(), updated_at = now()
--    where id = p_id;
--   insert into public.tera_lkk_riwayat (lkk_id, aksi, oleh, oleh_nama, status_dari, status_ke, client_version)
--   values (p_id, case when v.revisi > 0 then 'acc_ulang' else 'acc' end, p_user, p_nama, v.status, 'approved', v.client_version);
--
--   select j.nama_rs into rs from public.tera_jadwal_push j where j.jadwal_id = v.jadwal_id limit 1;
--   select t.nama into nama_alat from public.tera_device_templates t where t.kode_alat = v.template_kode and t.versi = v.template_versi limit 1;
--   iden := coalesce(v.data -> 'identitas', '{}'::jsonb);
--   kode := substr(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 1, 24);
--   update public.tera_sertifikat set status = 'digantikan' where lkk_id = p_id and status = 'berlaku';
--   insert into public.tera_sertifikat (lkk_id, revisi, kode_verifikasi, bo, no_label, signatory_nama, signatory_jabatan,
--                                       ditandatangani_oleh, ringkasan, is_test)
--   values (p_id, v.revisi, kode, v.bo, v.no_label, s.nama, s.jabatan, p_user,
--           jsonb_build_object(
--             'namaAlat', coalesce(nama_alat, v.template_kode),
--             'merek', iden ->> 'merek', 'tipe', iden ->> 'tipe', 'noSeri', iden ->> 'noSeri',
--             'namaRs', rs, 'tanggalKalibrasi', v.tanggal_kalibrasi,
--             'hasil', v.results ->> 'kesimpulan'),
--           v.is_test)
--   on conflict (lkk_id, revisi) do nothing;
--
--   return jsonb_build_object('hasil','acc','status','approved','revisi',v.revisi,'kodeVerifikasi',kode);
-- end $function$;
-- commit;
