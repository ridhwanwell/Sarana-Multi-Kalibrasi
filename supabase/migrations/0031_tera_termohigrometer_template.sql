-- =====================================================================
-- MIGRASI 0031 — TEMPLATE THERMOHYGROMETER v1 + angka standar sementara Climatic Chamber CAL-048 (27 Okt 2026)
-- Supabase : qr-label-kalibrasi (PRODUKSI) — permintaan Ridhwan: ikuti Master_Thermohygrometer.xlsx (tanpa MK Kemenkes)
--
-- Bahasa awam: (1) menambah SATU baris "formulir kosong" LKK baru (termohigrometer v1) ke tabel template Tera SMK: suhu 15–45 °C
-- dan kelembaban 30–90 %RH (7 titik masing-masing), 6 bacaan per titik, batas koreksi ±1 °C / ±5 %RH, skor fisik 10 + kinerja 90,
-- Laik Pakai ≥ 90. (2) mengisi angka alat standar Climatic Chamber CAL-048 sesuai Calibrator 1 di Master Excel: koreksi 0, U ±1 °C
-- dan ±4 %RH. INI ANGKA SEMENTARA dari Excel (bukan dari sertifikat) — nanti diganti baris baru bila sertifikat chamber sudah ada
-- (baris lama dinonaktifkan, tidak dihapus). Data HTC-1 (CAL-027) untuk suhu/RH ruang SUDAH ada dan tidak diubah.
-- Tidak ada tabel/kolom lama yang diubah, tidak ada baris yang dihapus.
-- =====================================================================

-- ===== BLOK 1 — BACKUP =====
create table backup.b20261027_tera_device_templates_0031 as table public.tera_device_templates;
create table backup.b20261027_tera_calibrator_points_0031 as table public.tera_calibrator_points;
select (select count(*) from backup.b20261027_tera_device_templates_0031) as template_tersalin,
       (select count(*) from backup.b20261027_tera_calibrator_points_0031) as titik_kalibrator_tersalin;

-- ===== BLOK 2 — PERUBAHAN =====
begin;
insert into public.tera_device_templates (kode_alat, nama, versi, kop, definition, aktif) values
  ('termohigrometer', 'Thermohygrometer', 1, 'NON_KAN', '{"tipe":"pompa","kode_alat":"termohigrometer","nama":"Thermohygrometer","versi":1,"sumber":"Master_Thermohygrometer.xlsx (27 Okt 2026), tanpa MK Kemenkes (keputusan Ridhwan); alat standar Climatic Chamber + termohigrometer HTC-1 (kondisi ruangan); toleransi ±1 °C & ±5 %RH tanpa U95; fisik 10 + kinerja 90","metode":"SMK/MT-MK/049","kop":"NON_KAN","keselamatan_listrik":"tidak_ada","identitas":{"resolusi":{"satuan":"%","pilihan":[]},"jenisSkala":["Digital","Analog"]},"identitasBidang":[{"id":"merek","label":"Merk Pabrik","jenis":"teks","maksPanjang":80},{"id":"tipe","label":"Tipe","jenis":"teks","maksPanjang":80},{"id":"noSeri","label":"No. Seri","jenis":"teks","maksPanjang":80},{"id":"rentangUkur","label":"Rentang Ukur (mis. 10 ~ 99)","jenis":"teks","maksPanjang":40},{"id":"resolusi","label":"Resolusi","jenis":"angka","satuan":"%"},{"id":"jenisSkala","label":"Jenis skala","jenis":"skala"},{"id":"tanggalPenerimaan","label":"Tanggal penerimaan barang kalibrasi","jenis":"tanggal"},{"id":"ruang","label":"Ruangan","jenis":"teks","maksPanjang":80}],"standar":[{"peran":"chamber","judul":"Climatic Chamber","parameter":["suhu_c","kelembaban_rh"],"wajib":true},{"peran":"termohigrometer","judul":"Termohigrometer","parameter":["suhu_c","kelembaban_rh"],"wajib":true,"hanyaRekomendasi":true}],"fisik":[{"id":"badan","judul":"Badan dan Permukaan / Enclosure and its Surfaces"},{"id":"kontrol","judul":"Kontrol dan Indikator / Control and indicator"}],"pilihanFisik":{"fisik":["Baik","Tidak Baik"],"fungsi":["Berfungsi","Tidak Berfungsi"]},"listrik":[],"termo":{"parameter":[{"id":"suhu","judul":"SUHU / Temperature","satuan":"°C","tabel":"suhu_c","toleransi":1,"titik":[{"id":"suhu_15","setting":15},{"id":"suhu_20","setting":20},{"id":"suhu_25","setting":25},{"id":"suhu_30","setting":30},{"id":"suhu_35","setting":35},{"id":"suhu_40","setting":40},{"id":"suhu_45","setting":45}]},{"id":"rh","judul":"KELEMBABAN / Humidity","satuan":"%RH","tabel":"kelembaban_rh","toleransi":5,"titik":[{"id":"rh_30","setting":30},{"id":"rh_40","setting":40},{"id":"rh_50","setting":50},{"id":"rh_60","setting":60},{"id":"rh_70","setting":70},{"id":"rh_80","setting":80},{"id":"rh_90","setting":90}]}],"pengulangan":6,"minimalUlangan":6,"driftPersen":0.1,"derajatBebas":{"sertifikat":60,"resolusi":50,"drift":50},"pembagiResolusi":{"Analog":2.449489742783178,"Digital":1.7320508075688772},"desimalCetak":1,"minimalPersenTitik":0.7},"skor":{"fisik":{"minimalPersen":0.7,"nilai":10},"listrik":{"nilai":0},"kinerja":{"nilai":90},"laikBila":{"banding":">=","batas":90}},"alatTercakup":["Thermohygrometer","Termohigrometer","Hygrometer","Termohigro","Thermo Hygrometer","Higrometer"],"sertifikat":{"tata_letak":"report_all_termohigro","halaman":3}}'::jsonb, true);

insert into public.tera_calibrator_points
       (aset_kalibrator_id, parameter, satuan, nomor_sertifikat, tertelusur, tanggal_kalibrasi, berlaku_sampai, points, budget, sumber, aktif, diubah_pada)
values
  ('CAL-048', 'suhu_c', '°C', null, null, null, null, '[{"titik": 15, "koreksiNaik": 0, "koreksiTurun": 0, "u95Naik": 1, "u95Turun": 1, "driftNaik": 0, "driftTurun": 0}, {"titik": 20, "koreksiNaik": 0, "koreksiTurun": 0, "u95Naik": 1, "u95Turun": 1, "driftNaik": 0, "driftTurun": 0}, {"titik": 25, "koreksiNaik": 0, "koreksiTurun": 0, "u95Naik": 1, "u95Turun": 1, "driftNaik": 0, "driftTurun": 0}, {"titik": 30, "koreksiNaik": 0, "koreksiTurun": 0, "u95Naik": 1, "u95Turun": 1, "driftNaik": 0, "driftTurun": 0}, {"titik": 35, "koreksiNaik": 0, "koreksiTurun": 0, "u95Naik": 1, "u95Turun": 1, "driftNaik": 0, "driftTurun": 0}, {"titik": 40, "koreksiNaik": 0, "koreksiTurun": 0, "u95Naik": 1, "u95Turun": 1, "driftNaik": 0, "driftTurun": 0}, {"titik": 45, "koreksiNaik": 0, "koreksiTurun": 0, "u95Naik": 1, "u95Turun": 1, "driftNaik": 0, "driftTurun": 0}]'::jsonb, null, 'Master_Thermohygrometer.xlsx Calibrator 1 (ANGKA SEMENTARA: koreksi 0, U 1 °C / 4 %RH, belum dari sertifikat); Climatic Chamber BIOBASE BJPX-HT100BII', true, now()),
  ('CAL-048', 'kelembaban_rh', '%RH', null, null, null, null, '[{"titik": 30, "koreksiNaik": 0, "koreksiTurun": 0, "u95Naik": 4, "u95Turun": 4, "driftNaik": 0, "driftTurun": 0}, {"titik": 40, "koreksiNaik": 0, "koreksiTurun": 0, "u95Naik": 4, "u95Turun": 4, "driftNaik": 0, "driftTurun": 0}, {"titik": 50, "koreksiNaik": 0, "koreksiTurun": 0, "u95Naik": 4, "u95Turun": 4, "driftNaik": 0, "driftTurun": 0}, {"titik": 60, "koreksiNaik": 0, "koreksiTurun": 0, "u95Naik": 4, "u95Turun": 4, "driftNaik": 0, "driftTurun": 0}, {"titik": 70, "koreksiNaik": 0, "koreksiTurun": 0, "u95Naik": 4, "u95Turun": 4, "driftNaik": 0, "driftTurun": 0}, {"titik": 80, "koreksiNaik": 0, "koreksiTurun": 0, "u95Naik": 4, "u95Turun": 4, "driftNaik": 0, "driftTurun": 0}, {"titik": 90, "koreksiNaik": 0, "koreksiTurun": 0, "u95Naik": 4, "u95Turun": 4, "driftNaik": 0, "driftTurun": 0}]'::jsonb, null, 'Master_Thermohygrometer.xlsx Calibrator 1 (ANGKA SEMENTARA: koreksi 0, U 1 °C / 4 %RH, belum dari sertifikat); Climatic Chamber BIOBASE BJPX-HT100BII', true, now());
commit;

-- ===== BLOK 3 — CEK (harapan: semua true) =====
select 'template termohigrometer v1 aktif, Non-KAN' cek,
       (select count(*) = 1 from public.tera_device_templates where kode_alat='termohigrometer' and versi=1 and aktif and kop='NON_KAN') hasil
union all select 'definisi cocok kolom; 2 parameter × 7 titik, 6 bacaan, tanpa uji listrik',
       (select definition->>'kode_alat'='termohigrometer' and (definition->>'versi')::int=1
               and jsonb_array_length(definition->'termo'->'parameter')=2
               and jsonb_array_length(definition->'termo'->'parameter'->0->'titik')=7
               and jsonb_array_length(definition->'termo'->'parameter'->1->'titik')=7
               and (definition->'termo'->>'pengulangan')::int=6 and jsonb_array_length(definition->'listrik')=0
          from public.tera_device_templates where kode_alat='termohigrometer' and versi=1)
union all select 'template lain tidak berubah',
       (select count(*) = 0 from public.tera_device_templates t join backup.b20261027_tera_device_templates_0031 b using (id) where t.definition <> b.definition or t.aktif <> b.aktif)
union all select 'CAL-048 suhu 7 titik (koreksi 0, U 1) & kelembaban 7 titik (koreksi 0, U 4) aktif',
       (select count(*) = 2 from public.tera_calibrator_points where aset_kalibrator_id='CAL-048' and aktif and jsonb_array_length(points)=7)
       and (select points->0->>'u95Naik'='1' and points->6->>'koreksiNaik'='0' from public.tera_calibrator_points where aset_kalibrator_id='CAL-048' and parameter='suhu_c' and aktif)
       and (select points->0->>'u95Naik'='4' from public.tera_calibrator_points where aset_kalibrator_id='CAL-048' and parameter='kelembaban_rh' and aktif)
union all select 'HTC-1 CAL-027 tidak berubah (2 baris aktif)',
       (select count(*) = 2 from public.tera_calibrator_points where aset_kalibrator_id='CAL-027' and aktif and parameter in ('suhu_c','kelembaban_rh'))
union all select 'baris titik kalibrator lama tidak berubah',
       (select count(*) = 0 from public.tera_calibrator_points t join backup.b20261027_tera_calibrator_points_0031 b using (id) where t.points <> b.points or t.aktif <> b.aktif);

-- ===== BLOK 4 — BATALKAN (hanya bila ada masalah DAN belum ada LKK termohigrometer) =====
-- select count(*) from public.tera_lkk where template_kode = 'termohigrometer';   -- harus 0 sebelum membatalkan
-- update public.tera_device_templates set aktif = false where kode_alat = 'termohigrometer' and versi = 1;
-- update public.tera_calibrator_points set aktif = false
--  where aset_kalibrator_id = 'CAL-048' and id not in (select id from backup.b20261027_tera_calibrator_points_0031);
-- (template terkunci trigger tera_device_templates_kunci: tidak dihapus, cukup dinonaktifkan)
