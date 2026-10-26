-- =====================================================================
-- MIGRASI 0030 — NIBP v2: KELISTRIKAN TIDAK DINILAI (26 Okt 2026)
-- Supabase : qr-label-kalibrasi (PRODUKSI) — keputusan Ridhwan 19.02: "listrik itu ditiadakan khusus nibp … hanya fisik fungsi
-- dan pembacaannya saja. fisik 10, kelistrikan 40, kinerja 50. kalau tidak ada listrik ya hanya fisik dan fungsi saja"
--
-- Bahasa awam: formulir LKK NIBP versi 2 = versi 1, kecuali nilai kelistrikan TIDAK dihitung (bukan diberi penuh 40).
-- Nilai maksimum = fisik & fungsi 10 + kinerja 50 = 60; Laik Pakai bila keduanya memenuhi. Versi 1 dinonaktifkan
-- (dicek: belum ada LKK yang memakainya). Tidak ada tabel/kolom lama yang diubah, tidak ada baris dihapus.
-- =====================================================================

-- ===== BLOK 1 — BACKUP =====
create table backup.b20261026_tera_device_templates_0030 as table public.tera_device_templates;
select count(*) as template_tersalin from backup.b20261026_tera_device_templates_0030;

-- ===== BLOK 2 — PERUBAHAN =====
begin;
update public.tera_device_templates set aktif = false where kode_alat = 'nibp' and versi = 1 and aktif;
insert into public.tera_device_templates (kode_alat, nama, versi, kop, definition, aktif) values
  ('nibp', 'Non Invasive Blood Pressure (NIBP)', 2, 'NON_KAN', '{"tipe":"pompa","kode_alat":"nibp","nama":"Non Invasive Blood Pressure (NIBP)","versi":2,"sumber":"Master_NIBP_terisi.xlsx (26 Okt 2026) + KMK-MK-075.0; alat standar NIBP Simulator + termohigrometer; kelistrikan tidak dinilai (fisik 10 + kinerja 50); guard band |koreksi| + U95 ≤ 8 mmHg","metode":"KMK-MK-075.0","kop":"NON_KAN","keselamatan_listrik":"tidak_ada","identitas":{"resolusi":{"satuan":"mmHg","pilihan":[1]},"jenisSkala":[],"jenisTetap":"Digital"},"identitasBidang":[{"id":"merek","label":"Merk Pabrik","jenis":"teks","maksPanjang":80},{"id":"tipe","label":"Tipe","jenis":"teks","maksPanjang":80},{"id":"noSeri","label":"No. Seri","jenis":"teks","maksPanjang":80},{"id":"rentangUkur","label":"Rentang Ukur (mis. 0 - 300 mmHg)","jenis":"teks","maksPanjang":40},{"id":"resolusi","label":"Resolusi","jenis":"angka","satuan":"mmHg"},{"id":"tanggalPenerimaan","label":"Tanggal penerimaan barang kalibrasi","jenis":"tanggal"},{"id":"ruang","label":"Ruangan","jenis":"teks","maksPanjang":80}],"standar":[{"peran":"nibp","judul":"NIBP Simulator","parameter":["tekanan_mmhg"],"wajib":true},{"peran":"termohigrometer","judul":"Termohigrometer","parameter":["suhu_c","kelembaban_rh"],"wajib":true,"hanyaRekomendasi":true}],"fisik":[{"id":"badan","judul":"Badan dan Permukaan / Enclosure and its Surfaces"},{"id":"kontrol","judul":"Kontrol dan Indikator / Control and indicator"},{"id":"kabel","judul":"Kabel dan Aksesori / Wire and acessories"}],"pilihanFisik":{"fisik":["Baik","Tidak Baik"],"fungsi":["Berfungsi","Tidak Berfungsi"]},"listrik":[],"nibp":{"titik":[{"id":"s1_systole","label":"Systole","setting":60},{"id":"s1_map","label":"MAP","setting":40},{"id":"s1_diastole","label":"Diastole","setting":30},{"id":"s2_systole","label":"Systole","setting":120},{"id":"s2_map","label":"MAP","setting":93},{"id":"s2_diastole","label":"Diastole","setting":80},{"id":"s3_systole","label":"Systole","setting":150},{"id":"s3_map","label":"MAP","setting":117},{"id":"s3_diastole","label":"Diastole","setting":100},{"id":"s4_systole","label":"Systole","setting":200},{"id":"s4_map","label":"MAP","setting":167},{"id":"s4_diastole","label":"Diastole","setting":150}],"pengulangan":6,"minimalUlangan":4,"toleransi":8,"satuan":"mmHg","driftPersen":0.1,"derajatBebas":{"sertifikat":60,"resolusi":50,"drift":50},"pembagiResolusi":{"Analog":2.449489742783178,"Digital":1.7320508075688772},"desimalCetak":2,"minimalPersenTitik":0.7},"skor":{"fisik":{"minimalPersen":0.7,"nilai":10},"listrik":{"nilai":40},"kinerja":{"nilai":50},"laikBila":{"banding":">=","batas":90},"listrikBilaTidakDiuji":"tidak_dihitung"},"alatTercakup":["NIBP","Non Invasive Blood Pressure","Tensimeter Digital","Tensi Digital","Sphygmomanometer Digital","Non Invasive Sphygmomanometer Otomatis"],"sertifikat":{"tata_letak":"report_all_nibp","halaman":3}}'::jsonb, true);
commit;

-- ===== BLOK 3 — CEK (harapan: semua true) =====
select 'v2 aktif, v1 nonaktif' cek,
       (select count(*) = 1 from public.tera_device_templates where kode_alat='nibp' and aktif and versi=2)
       and (select count(*) = 0 from public.tera_device_templates where kode_alat='nibp' and aktif and versi<>2) hasil
union all select 'v2 = v1 + skor.listrikBilaTidakDiuji tidak_dihitung (definisi cocok kolom)',
       (select (b.definition - 'versi' - 'sumber' - 'skor') = (a.definition - 'versi' - 'sumber' - 'skor')
               and (b.definition->'skor') - 'listrikBilaTidakDiuji' = a.definition->'skor'
               and b.definition->'skor'->>'listrikBilaTidakDiuji' = 'tidak_dihitung' and (b.definition->>'versi')::int = 2
          from public.tera_device_templates a, public.tera_device_templates b
         where a.kode_alat='nibp' and a.versi=1 and b.kode_alat='nibp' and b.versi=2)
union all select 'isi template lain tidak berubah',
       (select count(*) = 0 from public.tera_device_templates t join backup.b20261026_tera_device_templates_0030 b using (id) where t.definition <> b.definition)
union all select 'tidak ada LKK di nibp v1',
       (select count(*) = 0 from public.tera_lkk where template_kode='nibp' and template_versi=1);

-- ===== BLOK 4 — BATALKAN (hanya bila ada masalah DAN belum ada LKK nibp v2) =====
-- select count(*) from public.tera_lkk where template_kode = 'nibp' and template_versi = 2;  -- harus 0
-- begin;
-- update public.tera_device_templates set aktif = false where kode_alat = 'nibp' and versi = 2;
-- update public.tera_device_templates set aktif = true  where kode_alat = 'nibp' and versi = 1;
-- commit;
