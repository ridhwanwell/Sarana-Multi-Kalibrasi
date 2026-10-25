-- =====================================================================
-- MIGRASI 0023 — TEMPLATE INFUSION PUMP VERSI 2 (26 Okt 2026)
-- Supabase : qr-label-kalibrasi (PRODUKSI) — dijalankan HANYA setelah Ridhwan membalas "lanjutkan"
--
-- Bahasa awam: atas permintaan Ridhwan, kolom identitas Infusion Pump dibuat sama seperti sheet "Input 1" Excel:
--   • "Jenis skala" (Digital/Analog) DIHAPUS dari layar → pompa infus dihitung sebagai Digital (÷√3), sama seperti isi bawaan Excel
--   • "Resolusi" tidak lagi 3 tombol pilihan; teknisi mengetik sendiri angkanya (mL/h)
--   • label mengikuti Excel: Merk Pabrik, Tipe, No. Seri, Rentang Ukur, Resolusi, Tanggal penerimaan barang kalibrasi, Ruangan
-- Rumus, toleransi, skor sama dengan versi 1. Versi 1 hanya DINONAKTIFKAN (isi tidak berubah; LKK yang sudah dibuat tetap memakai v1).
-- Tidak ada tabel/kolom lama yang diubah.
-- =====================================================================

-- ===== BLOK 1 — BACKUP =====
create table backup.b20261026_tera_device_templates_0023 as table public.tera_device_templates;
select count(*) as template_tersalin from backup.b20261026_tera_device_templates_0023;

-- ===== BLOK 2 — PERUBAHAN =====
begin;
update public.tera_device_templates set aktif = false where kode_alat = 'infusion_pump' and versi = 1 and aktif;
insert into public.tera_device_templates (kode_alat, nama, versi, kop, definition, aktif)
values ('infusion_pump', 'Infusion Pump', 2, 'NON_KAN', '{"tipe":"pompa","kode_alat":"infusion_pump","nama":"Infusion Pump","versi":2,"sumber":"Master_Infusion_Pump.xlsx (26 Okt 2026) + KMK-MK-053.0; identitas mengikuti Input 1, resolusi isian bebas, skala Digital tetap; fisik & fungsi semua kotak, aliran ≤ 200 mL/h, penyumbatan ≤ 20 psi","metode":"KMK-MK-053.0","kop":"NON_KAN","keselamatan_listrik":"wajib","identitas":{"resolusi":{"satuan":"mL/h","pilihan":[]},"jenisSkala":[],"jenisTetap":"Digital"},"identitasBidang":[{"id":"merek","label":"Merk Pabrik","jenis":"teks","maksPanjang":80},{"id":"tipe","label":"Tipe","jenis":"teks","maksPanjang":80},{"id":"noSeri","label":"No. Seri","jenis":"teks","maksPanjang":80},{"id":"rentangUkur","label":"Rentang Ukur (mis. 1 - 999 mL/h)","jenis":"teks","maksPanjang":40},{"id":"resolusi","label":"Resolusi","jenis":"angka","satuan":"mL/h"},{"id":"tanggalPenerimaan","label":"Tanggal penerimaan barang kalibrasi","jenis":"tanggal"},{"id":"ruang","label":"Ruangan","jenis":"teks","maksPanjang":80}],"standar":[{"peran":"ida","judul":"Infusion Device Analyzer (IDA)","parameter":["aliran_mlh","tekanan_psi"],"wajib":true},{"peran":"esa","judul":"Electrical Safety Analyzer (ESA)","parameter":["tegangan_v","resistansi_ohm","isolasi_mohm","arus_bocor_ua"],"wajib":true},{"peran":"termohigrometer","judul":"Termohigrometer","parameter":["suhu_c","kelembaban_rh"],"wajib":true,"hanyaRekomendasi":true}],"fisik":[{"id":"badan","judul":"Badan dan Permukaan / Enclosure and its Surfaces"},{"id":"kontrol","judul":"Kontrol dan Indikator / Control and indicator"},{"id":"kabel","judul":"Kabel dan Aksesori / Wire and acessories"}],"pilihanFisik":{"fisik":["Baik","Tidak Baik"],"fungsi":["Berfungsi","Tidak Berfungsi"]},"listrik":[{"id":"tegangan","judul":"Tegangan Catu Daya / Mains Voltage","satuan":"V","kalibrator":"tegangan","uji":{"jenis":"sekitar","nominal":220,"batas":22},"diBawahTabel":"ujung","toleransiTeks":"220 ±10 %"},{"id":"resistansi_pembumian","judul":"Resistansi Pembumian Protektif / Protective Earth Resistance","satuan":"Ω","kalibrator":"resistansi","uji":{"jenis":"maksimum","batas":0.3},"diBawahTabel":"ujung","toleransiTeks":"≤ 0,3"},{"id":"resistansi_isolasi","judul":"Isolasi Resistansi / Insulation of Resistance","satuan":"MΩ","kalibrator":"isolasi","uji":{"jenis":"minimum","batas":2},"diBawahTabel":"ujung","toleransiTeks":"≥ 2"},{"id":"arus_bocor","judul":"Arus Bocor Pembumian / Earth Leakage Current","satuan":"µA","kalibrator":"arus_bocor","uji":{"jenis":"maksimum","batas":500},"diBawahTabel":"proporsional","toleransiTeks":"≤ 500"}],"kinerja":{"titikAliran":[25,50,100,150,200],"pengulangan":6,"toleransiAliranPersen":0.1,"sumbat":{"batas":20,"banding":"<=","resolusiTetap":0.01,"settingBawaan":100},"driftPersen":0.1,"derajatBebas":{"sertifikat":60,"resolusi":50,"drift":50},"pembagiResolusi":{"Analog":2.449489742783178,"Digital":1.7320508075688772},"desimalCetak":2,"minimalPersenAliran":0.7},"skor":{"fisik":{"minimalPersen":0.7,"nilai":10},"listrik":{"nilai":40},"kinerja":{"nilai":50},"laikBila":{"banding":">=","batas":90}},"sertifikat":{"tata_letak":"report_all_infusion_pump","halaman":3}}'::jsonb, true);
commit;

-- ===== BLOK 3 — CEK (harapan: semua true) =====
select 'v2 aktif, v1 nonaktif' cek,
       (select count(*) = 1 from public.tera_device_templates where kode_alat='infusion_pump' and versi=2 and aktif and kop='NON_KAN')
       and (select count(*) = 1 from public.tera_device_templates where kode_alat='infusion_pump' and versi=1 and not aktif) hasil
union all select 'isi v1 & template lain tidak berubah',
       (select count(*) = 0 from public.tera_device_templates t join backup.b20261026_tera_device_templates_0023 b using (id) where t.definition <> b.definition)
union all select 'v2 tanpa jenis skala, skala tetap Digital',
       (select definition->'identitas'->>'jenisTetap' = 'Digital' and not (definition::text like '%"Jenis skala"%') from public.tera_device_templates where kode_alat='infusion_pump' and versi=2);

-- ===== BLOK 4 — BATALKAN =====
-- begin;
-- alter table public.tera_device_templates disable trigger tera_device_templates_kunci;
-- delete from public.tera_device_templates where kode_alat='infusion_pump' and versi=2;
-- alter table public.tera_device_templates enable trigger tera_device_templates_kunci;
-- update public.tera_device_templates set aktif = true where kode_alat='infusion_pump' and versi=1;
-- commit;
