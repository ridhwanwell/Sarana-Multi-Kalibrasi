-- =====================================================================
-- DATA UJI 0006 — JADWAL UJI "RS UJI TERA" (BO 999) UNTUK TAHAP 3.5 TERA SMK
-- Supabase : qr-label-kalibrasi (PRODUKSI)
-- Dibuat   : 19 Oktober 2026 (Tahap 3.5)
-- Persetujuan: Ridhwan "setuju BO 999" (19 Okt 2026 12.40) untuk MEMBUAT jadwal uji ini di tabel
--              produksi jadwal_kalibrasi. Skrip belum dijalankan; menunggu "lanjutkan" untuk isi konkret ini.
--
-- Perumpamaan: selembar surat tugas LATIHAN yang diselipkan di map surat tugas asli. Tertulis jelas
-- "DATA UJI", nomor BO 999 (nomor yang tidak pernah dipakai RS sungguhan), dan akan dicabut lagi
-- (dihapus lunak) setelah uji selesai. Tidak ada baris lama yang diubah. Tidak ada kolom/tabel baru.
--
-- Isi baris uji (bentuknya sama dengan jadwal nyata di database):
--   id            SCH-UJI-TERA-999
--   RS            "RS UJI TERA (DATA UJI)", Surakarta, BO 999
--   stiker utama  999.0001 – 999.0010 ; cadangan 999.0011 – 999.0015
--   mode          modeSertifikat = 'tera' (supaya tombol Push muncul)
--   alat PO       Sphygmomanometer (6 unit, 999.0001–0006) + Timbangan Bayi Digital (4 unit, 999.0007–0010)
--   teknisi       TECH-011 Ridhwan Nur Yudianto (akun ridhwan@tera.smk) — tanpa pendamping
--   nilai         kontrak 0, tanpa SPH/PO/BAP/BASTP/penagihan (tidak boleh masuk dokumen sungguhan)
--
-- Pengaman:
--   - Hanya MENAMBAH 1 baris dengan id tetap; bila id sudah ada, INSERT gagal (tidak menimpa).
--   - Trigger lama (isi_kolom_otomatis/transisi) mengisi kolom turunan seperti biasa.
--   - BO 999 sudah dijaga di tabel Tera (tera_jadwal_push wajib is_test), dan Push otomatis menandai is_test.
-- =====================================================================


-- =====================================================================
-- BLOK 1 — BACKUP
-- Tidak ada baris lama yang diubah, jadi tidak ada salinan tabel (tabel salinan di schema public
-- malah terbuka lewat API). Cukup catat kondisi sekarang. Harapan: id_sudah_ada = false, jumlah_baris = 2.
-- =====================================================================
select exists (select 1 from public.jadwal_kalibrasi where id = 'SCH-UJI-TERA-999') as id_sudah_ada,
       (select count(*) from public.jadwal_kalibrasi)                               as jumlah_baris,
       (select count(*) from information_schema.columns
         where table_schema='public' and table_name='jadwal_kalibrasi')              as jumlah_kolom;


-- =====================================================================
-- BLOK 2 — PERUBAHAN
-- =====================================================================
insert into public.jadwal_kalibrasi (id, updated_by, data)
values (
  'SCH-UJI-TERA-999',
  'claude-uji-tera',
  jsonb_build_object(
    'id',                     'SCH-UJI-TERA-999',
    'notes',                  'DATA UJI TERA SMK (BO 999). Jangan ditagih, jangan masuk BAP/BASTP. Akan dihapus setelah uji selesai.',
    'poDate',                 'Senin, 19 Oktober 2026',
    'status',                 'Dijadwalkan',
    'endDate',                '2026-10-23',
    'labelEnd',               '999.0010',
    'priority',               'Rendah',
    'createdAt',              '2026-10-19',
    'hospitalId',             'RS-UJI-TERA',
    'labelRange',             '999.0001 s/d 999.0010',
    'labelStart',             '999.0001',
    'hospitalPic',            '-',
    'hospitalCity',           'Surakarta',
    'hospitalCode',           '999',
    'hospitalName',           'RS UJI TERA (DATA UJI)',
    'contractValue',          0,
    'hospitalPhone',          '-',
    'marketingName',          '-',
    'scheduledDate',          '2026-10-20',
    'estimatedHours',         8,
    'hospitalAddress',        '-',
    'hospitalPicRole',        '-',
    'progressPercent',        0,
    'workOrderNumber',        '999/SMK-SPK/X/2026',
    'leadTechnicianId',       'TECH-011',
    'poContractNumber',       'UJI-999',
    'labelSequenceStart',     1,
    'leadTechnicianName',     'Ridhwan Nur Yudianto',
    'remindersSentCount',     0,
    'supportTechnicianIds',   '[]'::jsonb,
    'assignedCalibratorIds',  '[]'::jsonb,
    'supportTechnicianNames', '[]'::jsonb,
    'assignedCalibratorNames','[]'::jsonb,
    'seliaItems',             '[]'::jsonb,
    'targetDevices',          jsonb_build_array(
      jsonb_build_object('id', 'dev-uji-tensi', 'name', 'Sphygmomanometer', 'room', '-', 'notes', 'Data uji',
                         'status', 'Pending', 'quantity', 6, 'brandModel', '-', 'serialNumber', '-',
                         'labelNumber', '999.0001 s/d 999.0006', 'labelSequenceStart', 1, 'labelSequenceEnd', 6),
      jsonb_build_object('id', 'dev-uji-timbangan', 'name', 'Timbangan Bayi Digital', 'room', '-', 'notes', 'Data uji',
                         'status', 'Pending', 'quantity', 4, 'brandModel', '-', 'serialNumber', '-',
                         'labelNumber', '999.0007 s/d 999.0010', 'labelSequenceStart', 7, 'labelSequenceEnd', 10)
    ),
    -- kunci baru Tahap 3 (diabaikan modul lama)
    'modeSertifikat',         'tera',
    'labelCadanganAwal',      '999.0011',
    'labelCadanganAkhir',     '999.0015'
  )
);


-- =====================================================================
-- BLOK 3 — CEK (harapan: semua kolom "hasil" = true)
-- =====================================================================
select 'baris uji ada & belum dihapus' as cek,
       exists (select 1 from public.jadwal_kalibrasi where id='SCH-UJI-TERA-999' and deleted_at is null) as hasil
union all
select 'tabel kini 3 baris (2 lama tidak berubah + 1 uji)',
       (select count(*) from public.jadwal_kalibrasi) = 3
union all
select 'kolom turunan terisi trigger (nama RS, SPK, label, teknisi utama, prioritas)',
       exists (select 1 from public.jadwal_kalibrasi
                where id='SCH-UJI-TERA-999'
                  and nama_rs='RS UJI TERA (DATA UJI)' and nomor_spk='999/SMK-SPK/X/2026'
                  and label_awal='999.0001' and label_akhir='999.0010'
                  and id_teknisi_utama='TECH-011' and kota='Surakarta' and prioritas='Rendah')
union all
select 'sumber = web (bukan transisi)',
       exists (select 1 from public.jadwal_kalibrasi where id='SCH-UJI-TERA-999' and sumber='web')
union all
select 'jadwal_kalibrasi tetap 32 kolom',
       (select count(*) from information_schema.columns where table_schema='public' and table_name='jadwal_kalibrasi') = 32
union all
select 'dua jadwal lama tidak tersentuh (updated_by bukan claude-uji-tera)',
       (select count(*) from public.jadwal_kalibrasi where id <> 'SCH-UJI-TERA-999' and coalesce(updated_by,'') = 'claude-uji-tera') = 0
union all
select '2 jenis alat PO, total 10 unit',
       (select count(*) from jsonb_array_elements(data->'targetDevices')) = 2
       and (select sum((x->>'quantity')::int) from jsonb_array_elements(data->'targetDevices') x) = 10
  from public.jadwal_kalibrasi where id='SCH-UJI-TERA-999'
union all
select 'teknisi TECH-011 tertaut ke akun ridhwan@tera.smk',
       exists (select 1 from public.teknisi t join auth.users u on u.id = t.user_id
                where t.id='TECH-011' and u.email='ridhwan@tera.smk');


-- =====================================================================
-- BLOK 4 — BATALKAN / BERSIHKAN
-- (a) SETELAH UJI SELESAI (cara biasa): hapus lunak jadwal uji + cabut fotokopinya di Tera.
--     Baris tidak hilang dari database (deleted_at terisi), sama seperti tombol Hapus di website.
-- (b) BILA SALAH BUAT dan Push BELUM dilakukan: hapus baris uji itu saja (WHERE jelas, 1 baris).
-- Keduanya dijalankan hanya bila perlu.
-- =====================================================================
-- (a) begin;
-- update public.jadwal_kalibrasi set deleted_at = now(), deleted_by = 'claude-uji-tera' where id = 'SCH-UJI-TERA-999';
-- update public.tera_jadwal_push set dicabut_at = coalesce(dicabut_at, now()) where jadwal_id = 'SCH-UJI-TERA-999';
-- commit;
--
-- (b) delete from public.jadwal_kalibrasi where id = 'SCH-UJI-TERA-999' and sumber = 'web' and updated_by = 'claude-uji-tera';
