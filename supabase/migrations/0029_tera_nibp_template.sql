-- =====================================================================
-- MIGRASI 0029 — TEMPLATE NIBP v1 (Non Invasive Blood Pressure) (26 Okt 2026)
-- Supabase : qr-label-kalibrasi (PRODUKSI) — permintaan Ridhwan "Lanjutkan NIBP menggunakan kalibrator NIBP SIMULATOR dan thermohygro saja"
--
-- Bahasa awam: menambah SATU baris "formulir kosong" LKK baru (nibp v1) ke tabel template Tera SMK. Isinya dari
-- Master_NIBP_terisi.xlsx: 4 setting × Systole/MAP/Diastole, 4–6 bacaan, batas |koreksi| + U95 ≤ 8 mmHg, skor 10/40/50
-- (tanpa uji listrik = nilai listrik penuh), Laik Pakai ≥ 90. Alat standar: NIBP Simulator (CAL-037, sertifikat
-- YK.05.02/E.IX/7560/2026) + termohigrometer — datanya SUDAH ada di tera_calibrator_points dan sama dengan sertifikat,
-- jadi tidak diubah. Tidak ada tabel/kolom lama yang diubah, tidak ada baris yang dihapus.
-- =====================================================================

-- ===== BLOK 1 — BACKUP =====
create table backup.b20261026_tera_device_templates_0029 as table public.tera_device_templates;
select count(*) as template_tersalin from backup.b20261026_tera_device_templates_0029;

-- ===== BLOK 2 — PERUBAHAN =====
begin;
insert into public.tera_device_templates (kode_alat, nama, versi, kop, definition, aktif) values
  ('nibp', 'Non Invasive Blood Pressure (NIBP)', 1, 'NON_KAN', '{"tipe":"pompa","kode_alat":"nibp","nama":"Non Invasive Blood Pressure (NIBP)","versi":1,"sumber":"Master_NIBP_terisi.xlsx (26 Okt 2026) + KMK-MK-075.0; alat standar NIBP Simulator + termohigrometer (tanpa uji listrik); guard band |koreksi| + U95 ≤ 8 mmHg","metode":"KMK-MK-075.0","kop":"NON_KAN","keselamatan_listrik":"tidak_ada","identitas":{"resolusi":{"satuan":"mmHg","pilihan":[1]},"jenisSkala":[],"jenisTetap":"Digital"},"identitasBidang":[{"id":"merek","label":"Merk Pabrik","jenis":"teks","maksPanjang":80},{"id":"tipe","label":"Tipe","jenis":"teks","maksPanjang":80},{"id":"noSeri","label":"No. Seri","jenis":"teks","maksPanjang":80},{"id":"rentangUkur","label":"Rentang Ukur (mis. 0 - 300 mmHg)","jenis":"teks","maksPanjang":40},{"id":"resolusi","label":"Resolusi","jenis":"angka","satuan":"mmHg"},{"id":"tanggalPenerimaan","label":"Tanggal penerimaan barang kalibrasi","jenis":"tanggal"},{"id":"ruang","label":"Ruangan","jenis":"teks","maksPanjang":80}],"standar":[{"peran":"nibp","judul":"NIBP Simulator","parameter":["tekanan_mmhg"],"wajib":true},{"peran":"termohigrometer","judul":"Termohigrometer","parameter":["suhu_c","kelembaban_rh"],"wajib":true,"hanyaRekomendasi":true}],"fisik":[{"id":"badan","judul":"Badan dan Permukaan / Enclosure and its Surfaces"},{"id":"kontrol","judul":"Kontrol dan Indikator / Control and indicator"},{"id":"kabel","judul":"Kabel dan Aksesori / Wire and acessories"}],"pilihanFisik":{"fisik":["Baik","Tidak Baik"],"fungsi":["Berfungsi","Tidak Berfungsi"]},"listrik":[],"nibp":{"titik":[{"id":"s1_systole","label":"Systole","setting":60},{"id":"s1_map","label":"MAP","setting":40},{"id":"s1_diastole","label":"Diastole","setting":30},{"id":"s2_systole","label":"Systole","setting":120},{"id":"s2_map","label":"MAP","setting":93},{"id":"s2_diastole","label":"Diastole","setting":80},{"id":"s3_systole","label":"Systole","setting":150},{"id":"s3_map","label":"MAP","setting":117},{"id":"s3_diastole","label":"Diastole","setting":100},{"id":"s4_systole","label":"Systole","setting":200},{"id":"s4_map","label":"MAP","setting":167},{"id":"s4_diastole","label":"Diastole","setting":150}],"pengulangan":6,"minimalUlangan":4,"toleransi":8,"satuan":"mmHg","driftPersen":0.1,"derajatBebas":{"sertifikat":60,"resolusi":50,"drift":50},"pembagiResolusi":{"Analog":2.449489742783178,"Digital":1.7320508075688772},"desimalCetak":2,"minimalPersenTitik":0.7},"skor":{"fisik":{"minimalPersen":0.7,"nilai":10},"listrik":{"nilai":40},"kinerja":{"nilai":50},"laikBila":{"banding":">=","batas":90}},"alatTercakup":["NIBP","Non Invasive Blood Pressure","Tensimeter Digital","Tensi Digital","Sphygmomanometer Digital","Non Invasive Sphygmomanometer Otomatis"],"sertifikat":{"tata_letak":"report_all_nibp","halaman":3}}'::jsonb, true);
commit;

-- ===== BLOK 3 — CEK (harapan: semua true) =====
select 'template nibp v1 aktif, Non-KAN' cek,
       (select count(*) = 1 from public.tera_device_templates where kode_alat='nibp' and versi=1 and aktif and kop='NON_KAN') hasil
union all select 'definisi cocok kolom; 12 titik, 6 bacaan (min 4), ±8 mmHg; tanpa uji listrik',
       (select definition->>'kode_alat'='nibp' and (definition->>'versi')::int=1 and definition->>'kop'='NON_KAN'
               and jsonb_array_length(definition->'nibp'->'titik')=12 and (definition->'nibp'->>'pengulangan')::int=6
               and (definition->'nibp'->>'minimalUlangan')::int=4 and (definition->'nibp'->>'toleransi')::numeric=8
               and jsonb_array_length(definition->'listrik')=0 and definition->>'keselamatan_listrik'='tidak_ada'
          from public.tera_device_templates where kode_alat='nibp' and versi=1)
union all select 'template lain tidak berubah',
       (select count(*) = 0 from public.tera_device_templates t join backup.b20261026_tera_device_templates_0029 b using (id) where t.definition <> b.definition or t.aktif <> b.aktif)
union all select 'NIBP Simulator CAL-037 (tekanan_mmhg) aktif = sertifikat 7560/2026 (U 0,58–0,61)',
       (select count(*) = 1 from public.tera_calibrator_points where aset_kalibrator_id='CAL-037' and parameter='tekanan_mmhg' and aktif
          and nomor_sertifikat='YK.05.02/E.IX/7560/2026' and points->0->>'u95Naik'='0.58' and points->6->>'u95Naik'='0.61');

-- ===== BLOK 4 — BATALKAN (hanya bila ada masalah DAN belum ada LKK nibp) =====
-- select count(*) from public.tera_lkk where template_kode = 'nibp';   -- harus 0 sebelum membatalkan
-- update public.tera_device_templates set aktif = false where kode_alat = 'nibp' and versi = 1;
-- (template terkunci trigger tera_device_templates_kunci: tidak dihapus, cukup dinonaktifkan)
