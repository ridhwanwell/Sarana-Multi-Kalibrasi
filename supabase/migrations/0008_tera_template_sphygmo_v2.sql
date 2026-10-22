-- =====================================================================
-- MIGRASI 0008 — TEMPLATE SPHYGMOMANOMETER VERSI 2 (TAHAP 4.1b)
-- Supabase : qr-label-kalibrasi (PRODUKSI)
-- Dibuat   : 22 Oktober 2026 (Tera SMK) — BELUM DIJALANKAN (menunggu "lanjutkan" Ridhwan)
-- Alasan   : Master Sphygmomanometer disesuaikan Ridhwan (22 Okt 2026): u Tipe A cara baru, k dari derajat
--            kebebasan efektif, bocor ≤ 15, skor ≥ 70 = Laik, 5 butir fisik tambahan MK 090 butir 90.7.7.
--            Isi = src/tera/shared/templates/sphygmomanometer.ts (uji golden v4).
--
-- Isi (tidak ada tabel lama yang diubah):
--   - Template v2 = BARIS BARU di tera_device_templates (isi baris lama tidak boleh diubah, 0007).
--   - Baris v1 hanya dinonaktifkan (kolom "aktif"; hanya satu versi aktif per alat).
--   - LKK lama tetap sah: tiap LKK menyimpan nomor versi template yang dipakainya.
-- =====================================================================

-- =====================================================================
-- BLOK 1 — BACKUP (salinan isi tabel template ke skema backup; harapan: baris = 1 sebelum perubahan)
-- =====================================================================
create table backup.b20261022_tera_device_templates as table public.tera_device_templates;
select count(*) as baris_tersalin from backup.b20261022_tera_device_templates;

-- =====================================================================
-- BLOK 2 — PERUBAHAN
-- =====================================================================
begin;

update public.tera_device_templates
   set aktif = false
 where kode_alat = 'sphygmomanometer' and versi = 1 and aktif;

insert into public.tera_device_templates (kode_alat, nama, versi, kop, definition)
values ('sphygmomanometer', 'Sphygmomanometer', 2, 'NON_KAN',
'{"kode_alat":"sphygmomanometer","nama":"Sphygmomanometer","versi":2,"sumber":"Master_Sphygmomanometer_revisi.xlsx (22 Okt 2026) + MK 090; bocor ≤ 15, skor ≥ 70 = Laik (keputusan Ridhwan 22 Okt)","metode":"KMK-MK-090.0","kop":"NON_KAN","keselamatan_listrik":"tidak_ada","identitas":{"resolusi":{"satuan":"mmHg","pilihan":[2,1]},"jenisSkala":["Analog","Digital"]},"fisik":[{"id":"badan","judul":"Badan dan Permukaan"},{"id":"level_cairan","judul":"Level Cairan"},{"id":"tabung_selang","judul":"Tabung dan Selang"}],"fisikTambahan":[{"id":"gauge","judul":"Gauge/indikator (jarum turun lembut, skala bersih, kaca utuh)"},{"id":"konektor","judul":"Konektor"},{"id":"label","judul":"Label/plakat/stiker terbaca"},{"id":"manset","judul":"Manset (bagus, bersih, tidak sobek)"},{"id":"titik_nol","judul":"Titik nol (0 ± 1 mmHg)"}],"pilihanFisik":["Baik","Tidak Baik"],"ujiAmbang":[{"id":"bocor","jenis":"selisih_setting","judul":"Kebocoran Tekanan","satuan":"mmHg","setting":250,"banding":"<=","batas":15},{"id":"lajuBuang","jenis":"nilai","judul":"Laju Buang Cepat","satuan":"detik","banding":"<=","batas":10}],"kinerja":[{"id":"tekanan","jenis":"naik_turun_berulang","judul":"Akurasi Tekanan","satuan":"mmHg","titik":[0,50,100,150,200,250],"pengulangan":3,"k":2,"tipeA":"selisih_maks_dari_nol","kMetode":"veff","derajatBebas":{"tipeA":5,"sertifikat":60,"zero":50,"resolusi":50,"drift":50},"u95Maksimum":1.5,"u95MinimumLaporan":1,"pembagiResolusi":{"Analog":2.449489742783178,"Digital":1.7320508075688772},"toleransi":4,"desimalCetak":2}],"skor":{"item":[{"dari":"fisik","minimalPersen":0.7,"nilai":10},{"dari":"uji_ambang","id":"bocor","nilai":30},{"dari":"uji_ambang","id":"lajuBuang","nilai":30},{"dari":"kinerja","id":"tekanan","minimalPersen":0.7,"nilai":30}],"laikBila":{"banding":">=","batas":70}},"sertifikat":{"tata_letak":"report_all_sphygmomanometer_v12","halaman":3}}'::jsonb);

commit;

-- =====================================================================
-- BLOK 3 — CEK (harapan: semua kolom "hasil" = true)
-- =====================================================================
select 'v2 aktif, v1 nonaktif (tepat satu aktif)' cek,
       (select count(*) = 1 from public.tera_device_templates where kode_alat='sphygmomanometer' and aktif and versi = 2)
       and (select count(*) = 1 from public.tera_device_templates where kode_alat='sphygmomanometer' and not aktif and versi = 1) hasil
union all
select 'isi v1 tidak berubah (sama dengan salinan backup)',
       (select definition from public.tera_device_templates where kode_alat='sphygmomanometer' and versi = 1)
       = (select definition from backup.b20261022_tera_device_templates where kode_alat='sphygmomanometer' and versi = 1)
union all
select 'v2: NON_KAN, 6 titik, toleransi 4, bocor <= 15, ambang skor >= 70, 5 butir fisik tambahan',
       (select count(*) = 1 from public.tera_device_templates
         where kode_alat='sphygmomanometer' and versi=2 and kop='NON_KAN'
           and jsonb_array_length(definition->'kinerja'->0->'titik') = 6
           and (definition->'kinerja'->0->>'toleransi')::numeric = 4
           and definition->'ujiAmbang'->0->>'banding' = '<='
           and definition->'skor'->'laikBila'->>'banding' = '>='
           and jsonb_array_length(definition->'fisikTambahan') = 5);

-- =====================================================================
-- BLOK 4 — BATALKAN (hanya bila ada masalah; v2 tetap tersimpan tetapi nonaktif, v1 aktif lagi)
-- =====================================================================
-- begin;
-- update public.tera_device_templates set aktif = false where kode_alat = 'sphygmomanometer' and versi = 2;
-- update public.tera_device_templates set aktif = true  where kode_alat = 'sphygmomanometer' and versi = 1;
-- commit;
