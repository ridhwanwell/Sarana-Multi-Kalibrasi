-- =====================================================================
-- MIGRASI 0019 — NILAI SERTIFIKAT ASLI TERMOHIGROMETER HTC-1 (CAL-027) (25 Okt 2026)
-- Supabase : qr-label-kalibrasi (PRODUKSI)
-- Dijalankan setelah Ridhwan mengirim sertifikat & LHU HTC-1 ("kelembapan tolong dibenarkan") dan membalas
-- "lanjutkan saja sampai tahap 4 selesai".
--
-- Bahasa awam: alat termohigrometer HTC-1 (s/n PK-0069-SMK, sertifikat YK.05.02/E.IX/5376/2026) selama ini memakai
-- angka SEMENTARA (karangan untuk uji). Diganti angka dari sertifikat BPAFK Jakarta:
--   Suhu (°C): penunjukan 14,7 / 18,3 / 23,6 / 27,8 / 31,4 → koreksi 0,6 / 1,4 / 1,2 / 1,7 / 3,3; U95 0,5
--   Kelembapan (%RH): penunjukan 46 / 54 / 64 / 72 / 79 → koreksi −7 / −5 / −5 / −4 / 0; U95 2,2
-- Baris lama tidak diubah (dikunci pemicu), hanya dinonaktifkan; baris baru disimpan. LKK lama memakai snapshot-nya sendiri.
-- =====================================================================

-- ===== BLOK 1 — BACKUP =====
create table backup.b20261025_tera_calibrator_points_0019 as table public.tera_calibrator_points;
select count(*) filter (where aset_kalibrator_id = 'CAL-027' and aktif) as cal027_aktif_tersalin from backup.b20261025_tera_calibrator_points_0019;

-- ===== BLOK 2 — PERUBAHAN =====
begin;
update public.tera_calibrator_points set aktif = false
 where aset_kalibrator_id = 'CAL-027' and parameter in ('suhu_c', 'kelembaban_rh') and aktif;

insert into public.tera_calibrator_points
       (aset_kalibrator_id, parameter, satuan, nomor_sertifikat, tertelusur, tanggal_kalibrasi, berlaku_sampai, points, budget, sumber, aktif, diubah_pada)
select aset_kalibrator_id, parameter, satuan, 'YK.05.02/E.IX/5376/2026', tertelusur, date '2026-02-13', date '2027-02-13',
       case parameter when 'suhu_c' then '[{"titik": 14.7, "koreksiNaik": 0.6, "koreksiTurun": 0.6, "u95Naik": 0.5, "u95Turun": 0.5, "driftNaik": 0, "driftTurun": 0}, {"titik": 18.3, "koreksiNaik": 1.4, "koreksiTurun": 1.4, "u95Naik": 0.5, "u95Turun": 0.5, "driftNaik": 0, "driftTurun": 0}, {"titik": 23.6, "koreksiNaik": 1.2, "koreksiTurun": 1.2, "u95Naik": 0.5, "u95Turun": 0.5, "driftNaik": 0, "driftTurun": 0}, {"titik": 27.8, "koreksiNaik": 1.7, "koreksiTurun": 1.7, "u95Naik": 0.5, "u95Turun": 0.5, "driftNaik": 0, "driftTurun": 0}, {"titik": 31.4, "koreksiNaik": 3.3, "koreksiTurun": 3.3, "u95Naik": 0.5, "u95Turun": 0.5, "driftNaik": 0, "driftTurun": 0}]'::jsonb else '[{"titik": 46, "koreksiNaik": -7, "koreksiTurun": -7, "u95Naik": 2.2, "u95Turun": 2.2, "driftNaik": 0, "driftTurun": 0}, {"titik": 54, "koreksiNaik": -5, "koreksiTurun": -5, "u95Naik": 2.2, "u95Turun": 2.2, "driftNaik": 0, "driftTurun": 0}, {"titik": 64, "koreksiNaik": -5, "koreksiTurun": -5, "u95Naik": 2.2, "u95Turun": 2.2, "driftNaik": 0, "driftTurun": 0}, {"titik": 72, "koreksiNaik": -4, "koreksiTurun": -4, "u95Naik": 2.2, "u95Turun": 2.2, "driftNaik": 0, "driftTurun": 0}, {"titik": 79, "koreksiNaik": 0, "koreksiTurun": 0, "u95Naik": 2.2, "u95Turun": 2.2, "driftNaik": 0, "driftTurun": 0}]'::jsonb end,
       budget, 'Sertifikat YK.05.02/E.IX/5376/2026 + Laporan Kalibrasi Thermohygrometer HTC-1 s/n PK-0069-SMK (BPAFK Jakarta, dikalibrasi 13 Feb 2026, terbit 19 Feb 2026); koreksi = nilai sebenarnya − penunjukan; U95 k=2', true, now()
  from backup.b20261025_tera_calibrator_points_0019
 where aset_kalibrator_id = 'CAL-027' and parameter in ('suhu_c', 'kelembaban_rh') and aktif;
commit;

-- ===== BLOK 3 — CEK (harapan: semua true) =====
select 'CAL-027: tepat 1 baris aktif per parameter, 5 titik, U95 0,5 & 2,2' cek,
       (select count(*) = 2 from public.tera_calibrator_points where aset_kalibrator_id='CAL-027' and aktif)
       and (select (points->0->>'u95Naik')::numeric = 0.5 and jsonb_array_length(points) = 5 and (points->4->>'koreksiNaik')::numeric = 3.3
              from public.tera_calibrator_points where aset_kalibrator_id='CAL-027' and parameter='suhu_c' and aktif)
       and (select (points->0->>'u95Naik')::numeric = 2.2 and (points->0->>'koreksiNaik')::numeric = -7
              from public.tera_calibrator_points where aset_kalibrator_id='CAL-027' and parameter='kelembaban_rh' and aktif) hasil
union all
select 'isi baris lama tidak berubah',
       (select count(*) = 0 from public.tera_calibrator_points t join backup.b20261025_tera_calibrator_points_0019 b using (id)
         where t.points <> b.points or (t.aktif <> b.aktif and t.aset_kalibrator_id <> 'CAL-027'));

-- ===== BLOK 4 — BATALKAN =====
-- begin;
-- update public.tera_calibrator_points set aktif = false
--  where aset_kalibrator_id = 'CAL-027' and id not in (select id from backup.b20261025_tera_calibrator_points_0019);
-- update public.tera_calibrator_points t set aktif = b.aktif from backup.b20261025_tera_calibrator_points_0019 b
--  where t.id = b.id and t.aset_kalibrator_id = 'CAL-027';
-- commit;
