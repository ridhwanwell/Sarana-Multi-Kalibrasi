-- =====================================================================
-- MIGRASI 0021 — PERBAIKAN ACC (25 Okt 2026)
-- Supabase : qr-label-kalibrasi (PRODUKSI)
--
-- Bahasa awam: tombol ACC selalu gagal ("Server tidak merespons") karena di dalam fungsi tera_acc_lkk ada dua hal
-- bernama "kode" (kolom tabel penandatangan dan wadah kode verifikasi), database bingung memilih. Perbaikan: kolom
-- ditulis lengkap (ts.kode). Isi fungsi lainnya SAMA PERSIS dengan 0020. Tidak ada tabel/kolom yang diubah.
-- =====================================================================

-- BLOK 1 — BACKUP (isi fungsi saat ini disalin ke tabel catatan)
create table if not exists backup.b20261025_fungsi_0021 as
  select 'tera_acc_lkk'::text as nama, pg_get_functiondef('public.tera_acc_lkk'::regproc) as isi;

-- BLOK 2 — PERUBAHAN
begin;
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
  select * into s from public.tera_signatories ts where ts.kode = 'manajer_teknik' and ts.aktif;
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

-- BLOK 3 — CEK (harapan: true, true)
select position('ts.kode' in pg_get_functiondef('public.tera_acc_lkk'::regproc)) > 0 as kode_jelas,
       position('boleh_acc' in pg_get_functiondef('public.tera_acc_lkk'::regproc)) = 0 as acc_tanpa_blokir;

-- BLOK 4 — BATALKAN (hanya bila ada masalah): jalankan isi kolom "isi" dari backup.b20261025_fungsi_0021.
-- select isi from backup.b20261025_fungsi_0021 where nama = 'tera_acc_lkk';
