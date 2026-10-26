-- =====================================================================
-- MIGRASI 0027 — TEMPLATE KESELAMATAN LISTRIK v1 (26 Okt 2026)
-- Supabase : qr-label-kalibrasi (PRODUKSI) — dijalankan setelah Ridhwan membalas "lanjutkan" (Keselamatan Listrik dari awal sampai sertifikat)
--
-- Bahasa awam: menambah SATU baris "formulir kosong" LKK baru (keselamatan_listrik v1) ke tabel template Tera SMK.
-- Isinya dari Master_Keselamatan_Listrik_terisi.xlsx: klasifikasi alat (Kelas I/II, Tipe B/BF/CF, cara ukur PE, metode
-- arus bocor) menentukan batas uji; U95 = k × U sertifikat ESA / 2; guard band w = U (KMK-MK-003.0); kesimpulan = semua
-- uji yang berlaku Laik. Data kalibrator ESA TIDAK berubah (sudah ada sejak pompa). Tidak ada tabel/kolom lama yang diubah,
-- tidak ada baris yang dihapus.
-- =====================================================================

-- ===== BLOK 1 — BACKUP =====
create table backup.b20261026_tera_device_templates_0027 as table public.tera_device_templates;
select count(*) as template_tersalin from backup.b20261026_tera_device_templates_0027;

-- ===== BLOK 2 — PERUBAHAN =====
begin;
insert into public.tera_device_templates (kode_alat, nama, versi, kop, definition, aktif) values
  ('keselamatan_listrik', 'Keselamatan Listrik', 1, 'NON_KAN', '{"tipe":"pompa","kode_alat":"keselamatan_listrik","nama":"Keselamatan Listrik","versi":1,"sumber":"Master_Keselamatan_Listrik_terisi.xlsx (26 Okt 2026) + KMK-MK-002.0 (klasifikasi & batas SNI IEC 62353) + KMK-MK-003.0 (guard band w = U)","metode":"KMK-MK-002.0","kop":"NON_KAN","keselamatan_listrik":"wajib","identitas":{"resolusi":{"satuan":"","pilihan":[]},"jenisSkala":[],"jenisTetap":"Digital"},"identitasBidang":[{"id":"namaAlat","label":"Nama Alat","jenis":"teks","maksPanjang":80},{"id":"merek","label":"Merk Pabrik","jenis":"teks","maksPanjang":80},{"id":"tipe","label":"Tipe","jenis":"teks","maksPanjang":80},{"id":"noSeri","label":"No. Seri","jenis":"teks","maksPanjang":80},{"id":"tanggalPenerimaan","label":"Tanggal penerimaan barang kalibrasi","jenis":"tanggal"},{"id":"ruang","label":"Ruangan","jenis":"teks","maksPanjang":80}],"standar":[{"peran":"esa","judul":"Electrical Safety Analyzer (ESA)","parameter":["tegangan_v","resistansi_ohm","isolasi_mohm","arus_bocor_ua"],"wajib":true},{"peran":"termohigrometer","judul":"Termohigrometer","parameter":["suhu_c","kelembaban_rh"],"wajib":true,"hanyaRekomendasi":true}],"fisik":[{"id":"badan","judul":"Badan dan Permukaan / Enclosure and its Surfaces"},{"id":"kontrol","judul":"Kontrol dan Indikator / Control and indicator"},{"id":"kabel","judul":"Kabel dan Aksesori / Wire and acessories"}],"pilihanFisik":{"fisik":["Baik","Tidak Baik"],"fungsi":["Berfungsi","Tidak Berfungsi"]},"klasifikasi":[{"id":"kelas","label":"Kelas proteksi","pilihan":["Kelas I","Kelas II"]},{"id":"tipeAP","label":"Tipe bagian yang diaplikasikan (AP)","pilihan":["Tidak ada","Tipe B","Tipe BF","Tipe CF"]},{"id":"kabelPE","label":"Kabel catu daya / cara ukur resistansi PE","pilihan":["Tidak dapat dilepas","Dapat dilepas - bersama kabel","Dapat dilepas - tanpa kabel","Kabel catu daya saja","Instalasi permanen","Kotak kontak multipel"],"wajibBila":{"klasifikasi":"kelas","nilai":["Kelas I"]}},{"id":"metodeBocor","label":"Metode arus bocor peralatan","pilihan":["Alternatif","Langsung","Diferensial"]}],"ketidakpastianListrik":"gum","listrik":[{"id":"tegangan","judul":"Tegangan Catu Daya / Mains Voltage","satuan":"V","kalibrator":"tegangan","uji":{"jenis":"sekitar","nominal":220,"batas":22},"diBawahTabel":"ujung","toleransiTeks":"220 ±10 %","masukKesimpulan":false,"kaliU":0,"teksHasil":["Dalam rentang","Di luar rentang"]},{"id":"resistansi_pembumian","judul":"Resistansi Pembumian Protektif / Protective Earth Resistance","satuan":"Ω","kalibrator":"resistansi","uji":{"jenis":"maksimum","batas":{"menurut":["kabelPE"],"nilai":{"Tidak dapat dilepas":0.3,"Dapat dilepas - bersama kabel":0.3,"Dapat dilepas - tanpa kabel":0.2,"Kabel catu daya saja":0.1,"Instalasi permanen":0.3,"Kotak kontak multipel":0.5}}},"diBawahTabel":"ujung","toleransiTeks":"≤ 0,3","berlakuBila":{"klasifikasi":"kelas","nilai":["Kelas I"]}},{"id":"resistansi_isolasi","judul":"Isolasi Resistansi / Insulation of Resistance","satuan":"MΩ","kalibrator":"isolasi","uji":{"jenis":"minimum","batas":2,"tegas":true},"diBawahTabel":"ujung","toleransiTeks":"> 2"},{"id":"arus_bocor_peralatan","judul":"Arus Bocor Peralatan / Equipment Leakage Current","satuan":"µA","kalibrator":"arus_bocor","uji":{"jenis":"maksimum","batas":{"menurut":["metodeBocor","kelas"],"nilai":{"Alternatif|Kelas I":1000,"Alternatif|Kelas II":500,"Langsung|Kelas I":500,"Langsung|Kelas II":100,"Diferensial|Kelas I":500,"Diferensial|Kelas II":100}}},"diBawahTabel":"proporsional","toleransiTeks":"≤ 500"},{"id":"arus_bocor_ap","judul":"Arus Bocor Bagian yang Diaplikasikan / Applied Part Leakage Current","satuan":"µA","kalibrator":"arus_bocor","uji":{"jenis":"maksimum","batas":{"menurut":["tipeAP"],"nilai":{"Tipe BF":5000,"Tipe CF":50}}},"diBawahTabel":"proporsional","toleransiTeks":"≤ 5000","berlakuBila":{"klasifikasi":"tipeAP","nilai":["Tipe BF","Tipe CF"]}}],"alatTercakup":["Kelistrikan","Pengujian Keselamatan Listrik","Deferensial Blood Cell Counter","Differential Blood Cell Counter","Fudus Camera","Fundus Camera","Lampu X-Ray","Laser Mata","Laser Therapy","Lens Meter","Lithotipter","Lithotripter","Bio Safety Cabinet","Mesin Phacoemulsifikasi","Mesin URS Lithoclast","Microwave Diathermy","Perimetry","Phaco","Photometer","Refraksi Subjektif","Retina Laser","Rotary Microtome","Scaller","Spectophotometer","Spectrophotometer","Surgical System Drill","SWD/Shortwave Diathermy","ESWT/Electro Shortwave teraphy","ESWT","Timpanometer","Tissue Embedding","Tissue Processor","Tonometer","Tonometer Schiot","Tonoscope","Trial set","Ultra Sonic Scaler","Ultraviolet Therapy","URF","Urine Analyzer","Urodinamic","Uroflow","VO2 Max"],"sertifikat":{"tata_letak":"report_all_keselamatan_listrik","halaman":3}}'::jsonb, true);
commit;

-- ===== BLOK 3 — CEK (harapan: semua true) =====
select 'template keselamatan_listrik v1 aktif, Non-KAN' cek,
       (select count(*) = 1 from public.tera_device_templates where kode_alat='keselamatan_listrik' and versi=1 and aktif and kop='NON_KAN') hasil
union all select 'definisi cocok kolom (kode, versi, kop), tanpa kinerja, 4 klasifikasi, 5 uji listrik, U95 GUM',
       (select definition->>'kode_alat'='keselamatan_listrik' and (definition->>'versi')::int=1 and definition->>'kop'='NON_KAN'
               and not (definition ? 'kinerja') and jsonb_array_length(definition->'klasifikasi')=4 and jsonb_array_length(definition->'listrik')=5
               and definition->>'ketidakpastianListrik'='gum'
          from public.tera_device_templates where kode_alat='keselamatan_listrik' and versi=1)
union all select 'template lain tidak berubah',
       (select count(*) = 0 from public.tera_device_templates t join backup.b20261026_tera_device_templates_0027 b using (id) where t.definition <> b.definition or t.aktif <> b.aktif)
union all select 'kalibrator ESA lengkap (4 tabel)',
       (select count(distinct p.parameter) = 4 from public.tera_calibrator_points p join public.aset_kalibrator a on a.id=p.aset_kalibrator_id
          where a.model ilike 'ESA%' and p.parameter in ('tegangan_v','resistansi_ohm','isolasi_mohm','arus_bocor_ua'));

-- ===== BLOK 4 — BATALKAN (hanya bila ada masalah DAN belum ada LKK keselamatan_listrik) =====
-- select count(*) from public.tera_lkk where template_kode = 'keselamatan_listrik';   -- harus 0 sebelum membatalkan
-- update public.tera_device_templates set aktif = false where kode_alat = 'keselamatan_listrik' and versi = 1;
-- (template terkunci trigger tera_device_templates_kunci: tidak dihapus, cukup dinonaktifkan)
