-- =====================================================================
-- MIGRASI 0028 — KESELAMATAN LISTRIK v2: FISIK & FUNGSI IKUT MENENTUKAN (26 Okt 2026)
-- Supabase : qr-label-kalibrasi (PRODUKSI) — permintaan Ridhwan "fisik fungsi ikut menentukan juga lah" (18.13)
--
-- Bahasa awam: formulir LKK Keselamatan Listrik versi 2 = versi 1 + satu aturan: alat baru LAIK PAKAI bila kotak fisik &
-- fungsi yang Baik/Berfungsi minimal 70 % (sama dengan aturan pompa) DAN semua uji listrik yang berlaku Laik.
-- Versi 1 dinonaktifkan (dicek: belum ada LKK yang memakainya). Tidak ada tabel/kolom lama yang diubah, tidak ada baris dihapus.
-- =====================================================================

-- ===== BLOK 1 — BACKUP =====
create table backup.b20261026_tera_device_templates_0028 as table public.tera_device_templates;
select count(*) as template_tersalin from backup.b20261026_tera_device_templates_0028;

-- ===== BLOK 2 — PERUBAHAN =====
begin;
update public.tera_device_templates set aktif = false where kode_alat = 'keselamatan_listrik' and versi = 1 and aktif;
insert into public.tera_device_templates (kode_alat, nama, versi, kop, definition, aktif) values
  ('keselamatan_listrik', 'Keselamatan Listrik', 2, 'NON_KAN', '{"tipe":"pompa","kode_alat":"keselamatan_listrik","nama":"Keselamatan Listrik","versi":2,"sumber":"Master_Keselamatan_Listrik_terisi.xlsx (26 Okt 2026) + KMK-MK-002.0 (klasifikasi & batas SNI IEC 62353) + KMK-MK-003.0 (guard band w = U); fisik & fungsi ≥ 70 % ikut kesimpulan","metode":"KMK-MK-002.0","kop":"NON_KAN","keselamatan_listrik":"wajib","identitas":{"resolusi":{"satuan":"","pilihan":[]},"jenisSkala":[],"jenisTetap":"Digital"},"identitasBidang":[{"id":"namaAlat","label":"Nama Alat","jenis":"teks","maksPanjang":80},{"id":"merek","label":"Merk Pabrik","jenis":"teks","maksPanjang":80},{"id":"tipe","label":"Tipe","jenis":"teks","maksPanjang":80},{"id":"noSeri","label":"No. Seri","jenis":"teks","maksPanjang":80},{"id":"tanggalPenerimaan","label":"Tanggal penerimaan barang kalibrasi","jenis":"tanggal"},{"id":"ruang","label":"Ruangan","jenis":"teks","maksPanjang":80}],"standar":[{"peran":"esa","judul":"Electrical Safety Analyzer (ESA)","parameter":["tegangan_v","resistansi_ohm","isolasi_mohm","arus_bocor_ua"],"wajib":true},{"peran":"termohigrometer","judul":"Termohigrometer","parameter":["suhu_c","kelembaban_rh"],"wajib":true,"hanyaRekomendasi":true}],"fisik":[{"id":"badan","judul":"Badan dan Permukaan / Enclosure and its Surfaces"},{"id":"kontrol","judul":"Kontrol dan Indikator / Control and indicator"},{"id":"kabel","judul":"Kabel dan Aksesori / Wire and acessories"}],"pilihanFisik":{"fisik":["Baik","Tidak Baik"],"fungsi":["Berfungsi","Tidak Berfungsi"]},"klasifikasi":[{"id":"kelas","label":"Kelas proteksi","pilihan":["Kelas I","Kelas II"]},{"id":"tipeAP","label":"Tipe bagian yang diaplikasikan (AP)","pilihan":["Tidak ada","Tipe B","Tipe BF","Tipe CF"]},{"id":"kabelPE","label":"Kabel catu daya / cara ukur resistansi PE","pilihan":["Tidak dapat dilepas","Dapat dilepas - bersama kabel","Dapat dilepas - tanpa kabel","Kabel catu daya saja","Instalasi permanen","Kotak kontak multipel"],"wajibBila":{"klasifikasi":"kelas","nilai":["Kelas I"]}},{"id":"metodeBocor","label":"Metode arus bocor peralatan","pilihan":["Alternatif","Langsung","Diferensial"]}],"ketidakpastianListrik":"gum","listrik":[{"id":"tegangan","judul":"Tegangan Catu Daya / Mains Voltage","satuan":"V","kalibrator":"tegangan","uji":{"jenis":"sekitar","nominal":220,"batas":22},"diBawahTabel":"ujung","toleransiTeks":"220 ±10 %","masukKesimpulan":false,"kaliU":0,"teksHasil":["Dalam rentang","Di luar rentang"]},{"id":"resistansi_pembumian","judul":"Resistansi Pembumian Protektif / Protective Earth Resistance","satuan":"Ω","kalibrator":"resistansi","uji":{"jenis":"maksimum","batas":{"menurut":["kabelPE"],"nilai":{"Tidak dapat dilepas":0.3,"Dapat dilepas - bersama kabel":0.3,"Dapat dilepas - tanpa kabel":0.2,"Kabel catu daya saja":0.1,"Instalasi permanen":0.3,"Kotak kontak multipel":0.5}}},"diBawahTabel":"ujung","toleransiTeks":"≤ 0,3","berlakuBila":{"klasifikasi":"kelas","nilai":["Kelas I"]}},{"id":"resistansi_isolasi","judul":"Isolasi Resistansi / Insulation of Resistance","satuan":"MΩ","kalibrator":"isolasi","uji":{"jenis":"minimum","batas":2,"tegas":true},"diBawahTabel":"ujung","toleransiTeks":"> 2"},{"id":"arus_bocor_peralatan","judul":"Arus Bocor Peralatan / Equipment Leakage Current","satuan":"µA","kalibrator":"arus_bocor","uji":{"jenis":"maksimum","batas":{"menurut":["metodeBocor","kelas"],"nilai":{"Alternatif|Kelas I":1000,"Alternatif|Kelas II":500,"Langsung|Kelas I":500,"Langsung|Kelas II":100,"Diferensial|Kelas I":500,"Diferensial|Kelas II":100}}},"diBawahTabel":"proporsional","toleransiTeks":"≤ 500"},{"id":"arus_bocor_ap","judul":"Arus Bocor Bagian yang Diaplikasikan / Applied Part Leakage Current","satuan":"µA","kalibrator":"arus_bocor","uji":{"jenis":"maksimum","batas":{"menurut":["tipeAP"],"nilai":{"Tipe BF":5000,"Tipe CF":50}}},"diBawahTabel":"proporsional","toleransiTeks":"≤ 5000","berlakuBila":{"klasifikasi":"tipeAP","nilai":["Tipe BF","Tipe CF"]}}],"alatTercakup":["Kelistrikan","Pengujian Keselamatan Listrik","Deferensial Blood Cell Counter","Differential Blood Cell Counter","Fudus Camera","Fundus Camera","Lampu X-Ray","Laser Mata","Laser Therapy","Lens Meter","Lithotipter","Lithotripter","Bio Safety Cabinet","Mesin Phacoemulsifikasi","Mesin URS Lithoclast","Microwave Diathermy","Perimetry","Phaco","Photometer","Refraksi Subjektif","Retina Laser","Rotary Microtome","Scaller","Spectophotometer","Spectrophotometer","Surgical System Drill","SWD/Shortwave Diathermy","ESWT/Electro Shortwave teraphy","ESWT","Timpanometer","Tissue Embedding","Tissue Processor","Tonometer","Tonometer Schiot","Tonoscope","Trial set","Ultra Sonic Scaler","Ultraviolet Therapy","URF","Urine Analyzer","Urodinamic","Uroflow","VO2 Max"],"sertifikat":{"tata_letak":"report_all_keselamatan_listrik","halaman":3},"fisikWajib":{"minimalPersen":0.7}}'::jsonb, true);
commit;

-- ===== BLOK 3 — CEK (harapan: semua true) =====
select 'v2 aktif, v1 nonaktif' cek,
       (select count(*) = 1 from public.tera_device_templates where kode_alat='keselamatan_listrik' and aktif and versi=2)
       and (select count(*) = 0 from public.tera_device_templates where kode_alat='keselamatan_listrik' and aktif and versi<>2) hasil
union all select 'v2 = v1 + fisikWajib 70 % (definisi cocok kolom)',
       (select (b.definition - 'versi' - 'sumber' - 'fisikWajib') = (a.definition - 'versi' - 'sumber')
               and b.definition->'fisikWajib'->>'minimalPersen' = '0.7' and (b.definition->>'versi')::int = 2 and b.definition->>'kode_alat'='keselamatan_listrik'
          from public.tera_device_templates a, public.tera_device_templates b
         where a.kode_alat='keselamatan_listrik' and a.versi=1 and b.kode_alat='keselamatan_listrik' and b.versi=2)
union all select 'isi template lain tidak berubah',
       (select count(*) = 0 from public.tera_device_templates t join backup.b20261026_tera_device_templates_0028 b using (id) where t.definition <> b.definition)
union all select 'tidak ada LKK di v1',
       (select count(*) = 0 from public.tera_lkk where template_kode='keselamatan_listrik' and template_versi=1);

-- ===== BLOK 4 — BATALKAN (hanya bila ada masalah DAN belum ada LKK v2) =====
-- select count(*) from public.tera_lkk where template_kode = 'keselamatan_listrik' and template_versi = 2;  -- harus 0
-- begin;
-- update public.tera_device_templates set aktif = false where kode_alat = 'keselamatan_listrik' and versi = 2;
-- update public.tera_device_templates set aktif = true  where kode_alat = 'keselamatan_listrik' and versi = 1;
-- commit;
