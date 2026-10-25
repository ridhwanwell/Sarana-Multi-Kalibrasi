-- =====================================================================
-- MIGRASI 0020 — PENYELIA BISA MENGEDIT ISIAN LKK; ACC TIDAK DIBLOKIR PENANDA (Tahap 4.7f, 25 Okt 2026)
-- Supabase : qr-label-kalibrasi (PRODUKSI)
-- Permintaan Ridhwan 25 Okt 2026 19.01: "tidak ada pemblokiran ACC", "selia bisa mengedit ... setiap perubahan tidak
-- perlu ada catatan, kamu memberi catatan internal". Termasuk persetujuan "lanjutkan saja sampai tahap 4 selesai".
--
-- Bahasa awam:
--   1. Fungsi baru tera_ubah_lkk: dipanggil server saat Penyelia/Developer menyimpan suntingan isian LKK
--      (identitas, lingkungan, fisik, uji, bacaan kinerja, tanggal). Isian & hasil hitung (dihitung ulang server)
--      diganti; SETIAP kolom yang berubah dicatat otomatis di riwayat (siapa, kapan, nilai lama → baru) tanpa alasan.
--      Hanya untuk LKK yang sudah diterima & belum ACC (atau sedang "Koreksi dibuka").
--   2. tera_acc_lkk: pemeriksaan "masih ada penanda merah" & "belum diperiksa server" DIHAPUS — ACC tidak diblokir.
--      Bagian lain fungsi SAMA PERSIS dengan 0017 (salinan lama ada di BLOK 4).
-- Tabel lama TIDAK disentuh; tidak ada kolom/tabel baru.
-- =====================================================================

-- =====================================================================
-- BLOK 1 — BACKUP
-- =====================================================================
create table backup.b20261025_tera_lkk_0020 as table public.tera_lkk;
select count(*) as lkk_tersalin from backup.b20261025_tera_lkk_0020;

-- =====================================================================
-- BLOK 2 — PERUBAHAN
-- =====================================================================
begin;

create or replace function public.tera_ubah_lkk(
  p_id uuid, p_user uuid, p_nama text, p_data jsonb, p_results jsonb, p_tanggal date, p_perubahan jsonb
) returns jsonb
language plpgsql
set search_path to ''
as $function$
declare v public.tera_lkk%rowtype; e jsonb; n int := 0;
begin
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    return jsonb_build_object('hasil','ditolak','alasan','Isian LKK tidak sah.');
  end if;
  if p_perubahan is null or jsonb_typeof(p_perubahan) <> 'array' or jsonb_array_length(p_perubahan) = 0 then
    return jsonb_build_object('hasil','tidak_berubah');
  end if;
  if jsonb_array_length(p_perubahan) > 1000 then
    return jsonb_build_object('hasil','ditolak','alasan','Terlalu banyak perubahan sekaligus.');
  end if;
  select * into v from public.tera_lkk where id = p_id for update;
  if not found then return jsonb_build_object('hasil','ditolak','alasan','LKK tidak ditemukan.'); end if;
  if v.status not in ('submitted','under_review','correction_open') then
    return jsonb_build_object('hasil','ditolak','status',v.status,
      'alasan', case when v.status = 'approved' then 'LKK sudah ACC dan terkunci. Developer perlu membuka koreksi dulu.'
                     else 'LKK berstatus '||v.status||', tidak bisa diubah Penyelia.' end);
  end if;

  update public.tera_lkk
     set data = p_data, results = p_results, tanggal_kalibrasi = p_tanggal, updated_at = now()
   where id = p_id;

  for e in select * from jsonb_array_elements(p_perubahan) loop
    insert into public.tera_lkk_riwayat (lkk_id, aksi, oleh, oleh_nama, kolom, nilai_lama, nilai_baru, client_version)
    values (p_id, 'ubah_nilai', p_user, p_nama, left(coalesce(e ->> 'kolom', '-'), 200), e -> 'lama', e -> 'baru', v.client_version);
    n := n + 1;
  end loop;

  return jsonb_build_object('hasil','diubah','jumlah',n,'status',v.status);
end $function$;

revoke all on function public.tera_ubah_lkk(uuid, uuid, text, jsonb, jsonb, date, jsonb) from public, anon, authenticated;
grant execute on function public.tera_ubah_lkk(uuid, uuid, text, jsonb, jsonb, date, jsonb) to service_role;

create or replace function public.tera_acc_lkk(p_id uuid, p_user uuid, p_nama text)
 returns jsonb
 language plpgsql
 set search_path to ''
as $function$
declare v public.tera_lkk%rowtype; s public.tera_signatories%rowtype;
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
  -- (0020) Tidak ada lagi pemblokiran oleh penanda / hasil periksa server — keputusan Ridhwan 25 Okt 2026.
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
-- BLOK 3 — CEK (harapan: semua kolom true)
-- =====================================================================
select
  exists (select 1 from pg_proc where proname = 'tera_ubah_lkk') as fungsi_ubah_ada,
  not has_function_privilege('authenticated', 'public.tera_ubah_lkk(uuid, uuid, text, jsonb, jsonb, date, jsonb)', 'execute') as ubah_tertutup_untuk_browser,
  position('boleh_acc' in pg_get_functiondef('public.tera_acc_lkk'::regproc)) = 0 as acc_tanpa_blokir,
  (select count(*) from public.tera_lkk) = (select count(*) from backup.b20261025_tera_lkk_0020) as jumlah_lkk_sama;

-- =====================================================================
-- BLOK 4 — BATALKAN (hanya bila ada masalah)
-- =====================================================================
-- begin;
-- drop function if exists public.tera_ubah_lkk(uuid, uuid, text, jsonb, jsonb, date, jsonb);
-- -- tera_acc_lkk versi 0017: jalankan ulang definisi tera_acc_lkk dari supabase/migrations/0017_tera_pdf_koreksi.sql
-- -- (sama dengan di atas, ditambah sesudah cek status:)
-- --   select * into p from public.tera_lkk_pemeriksaan where lkk_id = p_id and client_version = v.client_version;
-- --   if not found then return jsonb_build_object('hasil','ditolak','alasan','LKK belum diperiksa server. Tunggu sebentar lalu coba lagi.'); end if;
-- --   if not p.boleh_acc then return jsonb_build_object('hasil','ditolak','alasan','Masih ada penanda merah yang memblokir ACC. Kembalikan ke teknisi untuk diperbaiki.','penanda',p.penanda); end if;
-- -- Isi LKK yang sudah disunting dikembalikan dari backup bila perlu (per LKK, dengan WHERE id = ...):
-- -- update public.tera_lkk t set data = b.data, results = b.results, tanggal_kalibrasi = b.tanggal_kalibrasi
-- --   from backup.b20261025_tera_lkk_0020 b where t.id = b.id and t.id = '<id LKK>';
-- commit;
