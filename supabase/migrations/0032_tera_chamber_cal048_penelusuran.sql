-- =====================================================================
-- MIGRASI 0032 — Climatic Chamber CAL-048: tambah "Traceability: BIOBASE SCIENTIFIC" (27 Okt 2026)
-- Supabase : qr-label-kalibrasi (PRODUKSI) — temuan Ridhwan: baris "Climatic Chamber" di sertifikat Thermohygrometer
--            tidak lengkap (tanpa Cert. Number & Traceability) dibanding PDF acuan Excel.
--
-- Bahasa awam: di migrasi 0031 angka sementara Climatic Chamber (koreksi 0, U ±1 °C / ±4 %RH) tersimpan tanpa kolom
-- "tertelusur", jadi sertifikat tidak bisa mencetak "Traceability: BIOBASE SCIENTIFIC" seperti PDF acuan. Baris titik kalibrator
-- tidak boleh diubah (hanya diganti): 2 baris lama CAL-048 dinonaktifkan, 2 baris baru dengan ANGKA YANG SAMA + tertelusur
-- 'BIOBASE SCIENTIFIC' ditambahkan. Nomor sertifikat tetap kosong (dicetak "Cert. Number: -" oleh aplikasi). Tidak ada baris
-- yang dihapus; kalibrator lain tidak disentuh. LKK yang sudah dibuat memegang salinan lama; untuk LKK uji, pilih ulang
-- Climatic Chamber di bagian Identitas agar salinannya diperbarui.
-- =====================================================================

-- ===== BLOK 1 — BACKUP =====
create table backup.b20261027_tera_calibrator_points_0032 as table public.tera_calibrator_points;
select count(*) filter (where aset_kalibrator_id = 'CAL-048' and aktif) as cal048_aktif_tersalin from backup.b20261027_tera_calibrator_points_0032;

-- ===== BLOK 2 — PERUBAHAN =====
begin;
update public.tera_calibrator_points set aktif = false
 where aset_kalibrator_id = 'CAL-048' and parameter in ('suhu_c', 'kelembaban_rh') and aktif;

insert into public.tera_calibrator_points
       (aset_kalibrator_id, parameter, satuan, nomor_sertifikat, tertelusur, tanggal_kalibrasi, berlaku_sampai, points, budget, sumber, aktif, diubah_pada)
select aset_kalibrator_id, parameter, satuan, null, 'BIOBASE SCIENTIFIC', null, null, points, budget, sumber, true, now()
  from backup.b20261027_tera_calibrator_points_0032
 where aset_kalibrator_id = 'CAL-048' and parameter in ('suhu_c', 'kelembaban_rh') and aktif;
commit;

-- ===== BLOK 3 — CEK (harapan: semua true) =====
select 'CAL-048: tepat 2 baris aktif (suhu_c & kelembaban_rh), tertelusur BIOBASE SCIENTIFIC' cek,
       (select count(*) = 2 from public.tera_calibrator_points where aset_kalibrator_id='CAL-048' and aktif and tertelusur='BIOBASE SCIENTIFIC' and parameter in ('suhu_c','kelembaban_rh')) hasil
union all select 'angka sama dengan sebelumnya (7 titik, koreksi 0, U 1 / 4)',
       (select count(*) = 2 from public.tera_calibrator_points n join backup.b20261027_tera_calibrator_points_0032 b
          on b.aset_kalibrator_id = n.aset_kalibrator_id and b.parameter = n.parameter and b.aktif and b.points = n.points
         where n.aset_kalibrator_id='CAL-048' and n.aktif)
union all select 'kalibrator lain tidak berubah (baris lama di luar CAL-048 identik)',
       (select count(*) = 0 from public.tera_calibrator_points t join backup.b20261027_tera_calibrator_points_0032 b using (id)
         where t.aset_kalibrator_id <> 'CAL-048' and (t.points <> b.points or t.aktif <> b.aktif))
union all select 'HTC-1 CAL-027 tetap 2 baris aktif',
       (select count(*) = 2 from public.tera_calibrator_points where aset_kalibrator_id='CAL-027' and aktif and parameter in ('suhu_c','kelembaban_rh'));

-- ===== BLOK 4 — BATALKAN (hanya bila ada masalah) =====
-- update public.tera_calibrator_points set aktif = false
--  where aset_kalibrator_id = 'CAL-048' and id not in (select id from backup.b20261027_tera_calibrator_points_0032);
-- update public.tera_calibrator_points t set aktif = b.aktif from backup.b20261027_tera_calibrator_points_0032 b
--  where t.id = b.id and t.aset_kalibrator_id = 'CAL-048';
