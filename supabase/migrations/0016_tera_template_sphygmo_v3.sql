-- =====================================================================
-- MIGRASI 0016 — TEMPLATE SPHYGMOMANOMETER VERSI 3 + NILAI KALIBRATOR CAL-037 (TAHAP 4, 25 Okt 2026)
-- Supabase : qr-label-kalibrasi (PRODUKSI)
-- Dibuat   : 25 Oktober 2026 (Tera SMK) — dijalankan HANYA setelah Ridhwan membalas "lanjutkan"
-- Alasan   : Master_sphygmomanometer.xlsx terbaru dari Ridhwan (25 Okt 2026, _referensi/sphygmo-v5/):
--            koreksi kalibrator dicari di nilai bacaan, u Tipe A = STDEV(run − run titik nol)/√n dengan derajat
--            kebebasan n − 1, bocor < 15, skor akurasi dibagi 12 data. Isi template = src/tera/shared/templates/
--            sphygmomanometer.ts (TEMPLATE_SPHYGMOMANOMETER_V3, uji golden v5: 70 lulus).
--            Nilai kalibrator tekanan (CONTECT MS200, s/n 24080200005, sertifikat YK.05.02/E.IX/7560/2026) mengikuti
--            sheet "Calibrator 1" Master terbaru: 7 titik 0–300 mmHg, koreksi 0, U95 0,58–0,61, drift = koreksi/2 = 0,
--            tanggal kalibrasi 3 Feb 2026.
--
-- Isi (TIDAK ada tabel lama yang diubah; aset_kalibrator tidak disentuh):
--   - Template v3 = BARIS BARU di tera_device_templates; v2 hanya dinonaktifkan (isi v2 tidak berubah, LKK lama tetap v2).
--   - tera_calibrator_points CAL-037 / tekanan_mmhg: baris lama DINONAKTIFKAN (isinya tetap), baris baru disimpan.
--     LKK yang sudah ada TIDAK berubah (memakai snapshot-nya).
-- =====================================================================

-- =====================================================================
-- BLOK 1 — BACKUP (harapan: template 2 baris, titik kalibrator 1 baris)
-- =====================================================================
create table backup.b20261025_tera_device_templates as table public.tera_device_templates;
create table backup.b20261025_tera_calibrator_points as table public.tera_calibrator_points;
select (select count(*) from backup.b20261025_tera_device_templates) as template_tersalin,
       (select count(*) from backup.b20261025_tera_calibrator_points where aset_kalibrator_id = 'CAL-037') as cal037_tersalin;

-- =====================================================================
-- BLOK 2 — PERUBAHAN
-- =====================================================================
begin;

update public.tera_device_templates
   set aktif = false
 where kode_alat = 'sphygmomanometer' and versi = 2 and aktif;

insert into public.tera_device_templates (kode_alat, nama, versi, kop, definition)
values ('sphygmomanometer', 'Sphygmomanometer', 3, 'NON_KAN',
'{"kode_alat":"sphygmomanometer","nama":"Sphygmomanometer","versi":3,"sumber":"Master_sphygmomanometer.xlsx (25 Okt 2026) + MK 090; bocor < 15, skor ≥ 70 = Laik","metode":"KMK-MK-090.0","kop":"NON_KAN","keselamatan_listrik":"tidak_ada","identitas":{"resolusi":{"satuan":"mmHg","pilihan":[2,1]},"jenisSkala":["Analog","Digital"]},"fisik":[{"id":"badan","judul":"Badan dan Permukaan"},{"id":"level_cairan","judul":"Level Cairan"},{"id":"tabung_selang","judul":"Tabung dan Selang"}],"fisikTambahan":[{"id":"gauge","judul":"Gauge/indikator (jarum turun lembut, skala bersih, kaca utuh)"},{"id":"konektor","judul":"Konektor"},{"id":"label","judul":"Label/plakat/stiker terbaca"},{"id":"manset","judul":"Manset (bagus, bersih, tidak sobek)"},{"id":"titik_nol","judul":"Titik nol (0 ± 1 mmHg)"}],"pilihanFisik":["Baik","Tidak Baik"],"ujiAmbang":[{"id":"bocor","jenis":"selisih_setting","judul":"Kebocoran Tekanan","satuan":"mmHg","setting":250,"banding":"<","batas":15},{"id":"lajuBuang","jenis":"nilai","judul":"Laju Buang Cepat","satuan":"detik","banding":"<=","batas":10}],"kinerja":[{"id":"tekanan","jenis":"naik_turun_berulang","judul":"Akurasi Tekanan","satuan":"mmHg","titik":[0,50,100,150,200,250],"pengulangan":3,"k":2,"tipeA":"stdev_selisih_dari_nol","kMetode":"veff","derajatBebas":{"tipeA":"n-1","sertifikat":60,"zero":50,"resolusi":50,"drift":50},"u95Maksimum":1.5,"u95MinimumLaporan":1,"pembagiResolusi":{"Analog":2.449489742783178,"Digital":1.7320508075688772},"toleransi":4,"desimalCetak":2,"koreksiPada":"bacaan"}],"skor":{"item":[{"dari":"fisik","minimalPersen":0.7,"nilai":10},{"dari":"uji_ambang","id":"bocor","nilai":30},{"dari":"uji_ambang","id":"lajuBuang","nilai":30},{"dari":"kinerja","id":"tekanan","minimalPersen":0.7,"nilai":30,"pembagi":"semua"}],"laikBila":{"banding":">=","batas":70}},"sertifikat":{"tata_letak":"report_all_sphygmomanometer_v12","halaman":3}}'::jsonb);

-- Nilai kalibrator tidak boleh diubah di tempat (pemicu tera_kunci_isi_template): baris lama dinonaktifkan,
-- baris baru disimpan (sama seperti fungsi tera_simpan_nilai_kalibrator, migrasi 0013).
update public.tera_calibrator_points
   set aktif = false
 where aset_kalibrator_id = 'CAL-037' and parameter = 'tekanan_mmhg' and aktif;

insert into public.tera_calibrator_points
       (aset_kalibrator_id, parameter, satuan, nomor_sertifikat, tertelusur, tanggal_kalibrasi, berlaku_sampai, points, budget, sumber, aktif, diubah_pada)
select aset_kalibrator_id, parameter, satuan, nomor_sertifikat, tertelusur, date '2026-02-03', date '2027-02-03',
       '[{"titik": 0, "koreksiNaik": 0, "koreksiTurun": 0, "u95Naik": 0.58, "u95Turun": 0.58, "driftNaik": 0, "driftTurun": 0}, {"titik": 50, "koreksiNaik": 0, "koreksiTurun": 0, "u95Naik": 0.59, "u95Turun": 0.59, "driftNaik": 0, "driftTurun": 0}, {"titik": 100, "koreksiNaik": 0, "koreksiTurun": 0, "u95Naik": 0.59, "u95Turun": 0.59, "driftNaik": 0, "driftTurun": 0}, {"titik": 150, "koreksiNaik": 0, "koreksiTurun": 0, "u95Naik": 0.59, "u95Turun": 0.59, "driftNaik": 0, "driftTurun": 0}, {"titik": 200, "koreksiNaik": 0, "koreksiTurun": 0, "u95Naik": 0.59, "u95Turun": 0.59, "driftNaik": 0, "driftTurun": 0}, {"titik": 250, "koreksiNaik": 0, "koreksiTurun": 0, "u95Naik": 0.6, "u95Turun": 0.6, "driftNaik": 0, "driftTurun": 0}, {"titik": 300, "koreksiNaik": 0, "koreksiTurun": 0, "u95Naik": 0.61, "u95Turun": 0.61, "driftNaik": 0, "driftTurun": 0}]'::jsonb, budget,
       'Master_sphygmomanometer.xlsx 25 Okt 2026, sheet Calibrator 1 baris 20–26 (koreksi = aktual − pembacaan) & 87–93 (drift = koreksi/2); sertifikat YK.05.02/E.IX/7560/2026',
       true, now()
  from backup.b20261025_tera_calibrator_points
 where aset_kalibrator_id = 'CAL-037' and parameter = 'tekanan_mmhg' and aktif;

commit;

-- =====================================================================
-- BLOK 3 — CEK (harapan: semua kolom "hasil" = true)
-- =====================================================================
select 'v3 aktif, v2 & v1 nonaktif (tepat satu aktif)' cek,
       (select count(*) = 1 from public.tera_device_templates where kode_alat='sphygmomanometer' and aktif and versi = 3)
       and (select count(*) = 0 from public.tera_device_templates where kode_alat='sphygmomanometer' and aktif and versi <> 3) hasil
union all
select 'isi v1 & v2 tidak berubah',
       (select count(*) = 2 from public.tera_device_templates t join backup.b20261025_tera_device_templates b using (kode_alat, versi)
         where t.kode_alat = 'sphygmomanometer' and t.versi in (1, 2) and t.definition = b.definition)
union all
select 'v3: koreksi di bacaan, Tipe A stdev selisih nol, derajat n-1, bocor <, skor dibagi 12',
       (select count(*) = 1 from public.tera_device_templates
         where kode_alat='sphygmomanometer' and versi=3 and kop='NON_KAN'
           and definition->'kinerja'->0->>'koreksiPada' = 'bacaan'
           and definition->'kinerja'->0->>'tipeA' = 'stdev_selisih_dari_nol'
           and definition->'kinerja'->0->'derajatBebas'->>'tipeA' = 'n-1'
           and definition->'ujiAmbang'->0->>'banding' = '<'
           and definition->'skor'->'item'->3->>'pembagi' = 'semua'
           and (definition->'kinerja'->0->>'toleransi')::numeric = 4)
union all
select 'CAL-037: tepat satu baris aktif = 7 titik 0–300, U95 0,58 dan 0,61, berlaku 3 Feb 2027',
       (select count(*) = 1 from public.tera_calibrator_points where aset_kalibrator_id='CAL-037' and parameter='tekanan_mmhg' and aktif)
       and (select count(*) = 1 from public.tera_calibrator_points
         where aset_kalibrator_id='CAL-037' and parameter='tekanan_mmhg' and aktif
           and jsonb_array_length(points) = 7
           and (points->0->>'u95Naik')::numeric = 0.58 and (points->6->>'titik')::numeric = 300
           and (points->6->>'u95Turun')::numeric = 0.61 and berlaku_sampai = '2027-02-03')
union all
select 'baris kalibrator lama tidak berubah isinya (hanya CAL-037 lama jadi nonaktif)',
       (select count(*) = 0 from public.tera_calibrator_points t join backup.b20261025_tera_calibrator_points b using (id)
         where t.points <> b.points or t.berlaku_sampai is distinct from b.berlaku_sampai
            or (t.aktif <> b.aktif and t.aset_kalibrator_id <> 'CAL-037'));

-- =====================================================================
-- BLOK 4 — BATALKAN (hanya bila ada masalah; v3 tetap tersimpan tetapi nonaktif, v2 aktif lagi, CAL-037 kembali)
-- =====================================================================
-- begin;
-- update public.tera_device_templates set aktif = false where kode_alat = 'sphygmomanometer' and versi = 3;
-- update public.tera_device_templates set aktif = true  where kode_alat = 'sphygmomanometer' and versi = 2;
-- update public.tera_calibrator_points set aktif = false
--  where aset_kalibrator_id = 'CAL-037' and parameter = 'tekanan_mmhg'
--    and id not in (select id from backup.b20261025_tera_calibrator_points);
-- update public.tera_calibrator_points t set aktif = b.aktif
--   from backup.b20261025_tera_calibrator_points b
--  where t.id = b.id and t.aset_kalibrator_id = 'CAL-037';
-- commit;
