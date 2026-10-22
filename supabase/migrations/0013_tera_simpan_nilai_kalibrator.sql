-- 0013: fungsi "simpan nilai kalibrator sebagai versi baru" (halaman Nilai Kalibrator Tera, Manajemen Aset).
-- Isi baris tera_calibrator_points tidak boleh diubah (trigger tera_kunci_isi_template): menyimpan = baris BARU,
-- baris lama dinonaktifkan. Fungsi ini melakukannya utuh (nonaktifkan + tambah dalam satu transaksi, dikunci per alat+parameter).
-- Hanya fungsi baru; tidak ada tabel/data yang diubah. Hanya server (service role) yang boleh memanggil.
-- STATUS: DRAF — tunggu "lanjutkan".

-- ===== BLOK 1: BACKUP =====
create table if not exists backup.b20261022_tera_calibrator_points_sebelum_0013 as table public.tera_calibrator_points;

-- ===== BLOK 2: PERUBAHAN =====
begin;
create function public.tera_simpan_nilai_kalibrator(
  p_user uuid, p_aset text, p_parameter text, p_satuan text, p_nomor text, p_tertelusur text,
  p_tanggal date, p_berlaku date, p_points jsonb, p_sumber text)
returns jsonb language plpgsql set search_path = '' as $$
declare v_id uuid;
begin
  if p_sumber is null or length(btrim(p_sumber)) < 3 then
    return jsonb_build_object('hasil','ditolak','alasan','Sumber nilai wajib diisi.');
  end if;
  if not exists (select 1 from public.aset_kalibrator where id = p_aset and deleted_at is null) then
    return jsonb_build_object('hasil','ditolak','alasan','Alat kalibrator tidak ditemukan.');
  end if;
  perform pg_advisory_xact_lock(hashtext('tera_nilai_kalibrator:' || p_aset || ':' || p_parameter));
  update public.tera_calibrator_points set aktif = false where aset_kalibrator_id = p_aset and parameter = p_parameter and aktif;
  insert into public.tera_calibrator_points
    (aset_kalibrator_id, parameter, satuan, nomor_sertifikat, tertelusur, tanggal_kalibrasi, berlaku_sampai, points, sumber, aktif, diubah_oleh, diubah_pada)
  values (p_aset, p_parameter, p_satuan, nullif(btrim(p_nomor),''), nullif(btrim(p_tertelusur),''), p_tanggal, p_berlaku, p_points, btrim(p_sumber), true, p_user, now())
  returning id into v_id;
  return jsonb_build_object('hasil','disimpan','id',v_id);
end $$;
revoke all on function public.tera_simpan_nilai_kalibrator(uuid,text,text,text,text,text,date,date,jsonb,text) from public, anon, authenticated;
commit;

-- ===== BLOK 3: CEK (harapan: fungsi_ada = true, baris_aktif_tak_berubah = true) =====
select
  (select count(*) = 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname='public' and p.proname='tera_simpan_nilai_kalibrator') as fungsi_ada,
  (select count(*) = 4 from public.tera_calibrator_points where aktif) as baris_aktif_tak_berubah;

-- ===== BLOK 4: BATALKAN =====
-- drop function public.tera_simpan_nilai_kalibrator(uuid,text,text,text,text,text,date,date,jsonb,text);
