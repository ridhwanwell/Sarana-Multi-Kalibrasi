-- 0012: nilai kalibrator SEMENTARA (karangan) untuk uji LKK Tera SMK — termohigrometer CAL-027 & stopwatch CAL-011.
-- Keputusan Ridhwan 22 Okt 2026: boleh karangan karena alatnya belum punya sertifikat; nilainya akan diganti sendiri.
-- Pengaman: kata "NILAI SEMENTARA" di kolom sumber -> pemeriksa server memblokir ACC untuk BO selain 999.
-- STATUS: DIJALANKAN 22 Okt 2026 setelah "lanjutkan".

-- ===== BLOK 1: BACKUP =====
create table if not exists backup.b20261022_tera_calibrator_points_sebelum_0012 as table public.tera_calibrator_points;

-- ===== BLOK 2: PERUBAHAN =====
begin;
insert into public.tera_calibrator_points (aset_kalibrator_id, parameter, satuan, nomor_sertifikat, tertelusur, tanggal_kalibrasi, berlaku_sampai, points, sumber, aktif)
values
 ('CAL-027','suhu_c','°C','YK.05.02/E.IX/5376/2026','LK-110-IDN (BPFK Jakarta)','2026-02-13','2027-02-13','[{"titik":15,"koreksiNaik":0.1,"koreksiTurun":0.1,"u95Naik":0.2,"u95Turun":0.2,"driftNaik":0,"driftTurun":0},{"titik":20,"koreksiNaik":0.1,"koreksiTurun":0.1,"u95Naik":0.2,"u95Turun":0.2,"driftNaik":0,"driftTurun":0},{"titik":25,"koreksiNaik":0.0,"koreksiTurun":0.0,"u95Naik":0.2,"u95Turun":0.2,"driftNaik":0,"driftTurun":0},{"titik":30,"koreksiNaik":-0.1,"koreksiTurun":-0.1,"u95Naik":0.2,"u95Turun":0.2,"driftNaik":0,"driftTurun":0},{"titik":35,"koreksiNaik":-0.1,"koreksiTurun":-0.1,"u95Naik":0.2,"u95Turun":0.2,"driftNaik":0,"driftTurun":0}]'::jsonb,'NILAI SEMENTARA (karangan untuk uji, BUKAN dari sertifikat) — diganti Ridhwan lewat halaman Nilai Kalibrator Tera',true),
 ('CAL-027','kelembaban_rh','%RH','YK.05.02/E.IX/5376/2026','LK-110-IDN (BPFK Jakarta)','2026-02-13','2027-02-13','[{"titik":30,"koreksiNaik":1.0,"koreksiTurun":1.0,"u95Naik":1.5,"u95Turun":1.5,"driftNaik":0,"driftTurun":0},{"titik":40,"koreksiNaik":0.8,"koreksiTurun":0.8,"u95Naik":1.5,"u95Turun":1.5,"driftNaik":0,"driftTurun":0},{"titik":50,"koreksiNaik":0.5,"koreksiTurun":0.5,"u95Naik":1.5,"u95Turun":1.5,"driftNaik":0,"driftTurun":0},{"titik":60,"koreksiNaik":0.0,"koreksiTurun":0.0,"u95Naik":1.5,"u95Turun":1.5,"driftNaik":0,"driftTurun":0},{"titik":70,"koreksiNaik":-0.5,"koreksiTurun":-0.5,"u95Naik":1.5,"u95Turun":1.5,"driftNaik":0,"driftTurun":0},{"titik":80,"koreksiNaik":-0.8,"koreksiTurun":-0.8,"u95Naik":1.5,"u95Turun":1.5,"driftNaik":0,"driftTurun":0}]'::jsonb,'NILAI SEMENTARA (karangan untuk uji, BUKAN dari sertifikat) — diganti Ridhwan lewat halaman Nilai Kalibrator Tera',true),
 ('CAL-011','waktu_s','detik','UJI-SEMENTARA-SW-001','SEMENTARA (karangan, uji)','2026-10-22','2027-10-22','[{"titik":60,"koreksiNaik":0.0,"koreksiTurun":0.0,"u95Naik":0.02,"u95Turun":0.02,"driftNaik":0,"driftTurun":0},{"titik":300,"koreksiNaik":0.01,"koreksiTurun":0.01,"u95Naik":0.02,"u95Turun":0.02,"driftNaik":0,"driftTurun":0},{"titik":600,"koreksiNaik":0.01,"koreksiTurun":0.01,"u95Naik":0.02,"u95Turun":0.02,"driftNaik":0,"driftTurun":0},{"titik":1800,"koreksiNaik":0.02,"koreksiTurun":0.02,"u95Naik":0.02,"u95Turun":0.02,"driftNaik":0,"driftTurun":0}]'::jsonb,'NILAI SEMENTARA (karangan untuk uji, BUKAN dari sertifikat) — diganti Ridhwan lewat halaman Nilai Kalibrator Tera',true);
commit;

-- ===== BLOK 3: CEK (harapan: baris_baru = 3, titik: 5 / 6 / 4, kalibrator_lama_utuh = true) =====
select
  (select count(*) from public.tera_calibrator_points where sumber like 'NILAI SEMENTARA%') as baris_baru,
  (select string_agg(parameter || ':' || jsonb_array_length(points)::text, ' / ' order by parameter) from public.tera_calibrator_points where sumber like 'NILAI SEMENTARA%') as titik,
  (select count(*) = 1 from public.tera_calibrator_points where aset_kalibrator_id = 'CAL-037' and parameter = 'tekanan_mmhg') as kalibrator_lama_utuh;

-- ===== BLOK 4: BATALKAN (hanya bila ada masalah) =====
-- delete from public.tera_calibrator_points where sumber like 'NILAI SEMENTARA%' and aset_kalibrator_id in ('CAL-027','CAL-011');
