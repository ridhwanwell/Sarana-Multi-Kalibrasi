-- =====================================================================
-- MIGRASI 0007 — TEMPLATE ALAT & TABEL TITIK KALIBRATOR (TAHAP 4.2)
-- Supabase : qr-label-kalibrasi (PRODUKSI)
-- Dibuat   : 19 Oktober 2026 (Tahap 4.2 Tera SMK)
-- Disetujui: (menunggu "lanjutkan" dari Ridhwan)
-- Dijalankan: (belum)
-- Uji kering: 19 Okt 2026 ±14.25 WIB di produksi, dibungkus DO + RAISE (pasti batal; dicek: tabel & fungsi tidak ada setelahnya).
--             CEK 8/8 true; perilaku 8/8: ubah isi template ditolak · ubah "aktif" boleh · dua versi aktif ditolak ·
--             kop JSON ≠ kolom ditolak · ubah titik kalibrator ditolak · titik rusak ditolak · kalibrator fiktif ditolak ·
--             nilai baru = baris baru (lama dinonaktifkan).
-- Kalibrator: CAL-037 dipilih karena sama persis dengan Master (Digital Pressure Meter CONTECT MS200, SN 24080200005,
--             sert. YK.05.02/E.IX/7560/2026). CAL-006 (Vital Sign Simulator) adalah unit fisik yang sama dengan nama lain.
--
-- Isi (SEMUA BARU — aset_kalibrator & tabel lama lain TIDAK diubah, hanya dirujuk):
--   1. tera_device_templates  : "buku resep" tiap jenis alat (template JSON, PRD Lampiran C).
--                               Satu versi = satu baris yang TIDAK bisa diubah isinya; versi baru = baris baru.
--                               Hanya satu versi aktif per jenis alat.
--   2. tera_calibrator_points : tabel koreksi & U95 dari sertifikat kalibrator (+ drift), per kalibrator
--                               (aset_kalibrator) & per parameter. Nilai baru = baris baru, yang lama dinonaktifkan
--                               (LKK lama tetap memakai snapshot-nya sendiri, CLAUDE.md 9.3).
--   3. Isi awal: template Sphygmomanometer v1 (= src/tera/shared/templates/sphygmomanometer.ts, uji 58/58)
--                + titik kalibrator CAL-037 Digital Pressure Meter CONTECT MS200 (Master v12, sheet Calibrator 1).
--
-- Pengaman (sama dengan 0004/0005):
--   - RLS aktif TANPA policy & tanpa GRANT ke anon/authenticated → hanya server (service role).
--   - service_role hanya boleh SELECT/INSERT/UPDATE (tidak ada DELETE).
--   - Trigger menolak perubahan isi (definition / points) setelah disimpan; yang boleh diubah hanya "aktif".
-- =====================================================================


-- =====================================================================
-- BLOK 1 — BACKUP
-- Tidak ada tabel lama yang diubah → tidak ada data yang perlu disalin.
-- Pastikan nama baru belum terpakai & kalibrator CAL-037 ada (harapan: false, false, false, true).
-- =====================================================================
select to_regclass('public.tera_device_templates')  is not null as tabel_template_sudah_ada,
       to_regclass('public.tera_calibrator_points') is not null as tabel_titik_sudah_ada,
       exists (select 1 from pg_proc where proname = 'tera_kunci_isi_template') as fungsi_kunci_sudah_ada,
       exists (select 1 from public.aset_kalibrator where id = 'CAL-037' and deleted_at is null) as cal_037_ada;


-- =====================================================================
-- BLOK 2 — PERUBAHAN
-- =====================================================================
begin;

-- 1) Template alat -----------------------------------------------------
create table public.tera_device_templates (
  id           uuid primary key default gen_random_uuid(),
  kode_alat    text not null check (kode_alat ~ '^[a-z0-9_]+$'),
  nama         text not null check (length(trim(nama)) > 0),
  versi        integer not null check (versi >= 1),
  kop          text not null check (kop in ('KAN', 'NON_KAN')),
  definition   jsonb not null check (jsonb_typeof(definition) = 'object'),
  aktif        boolean not null default true,
  dibuat_oleh  uuid references public.profiles(id) on delete restrict,
  dibuat_pada  timestamptz not null default now(),
  constraint tera_device_templates_versi_uniq unique (kode_alat, versi),
  -- isi JSON harus cocok dengan kolomnya (tidak bisa "resep A berlabel B")
  constraint tera_device_templates_cocok_ck check (
    definition->>'kode_alat' = kode_alat
    and definition->>'versi' = versi::text
    and definition->>'kop' = kop
  )
);
comment on table public.tera_device_templates is 'Tera SMK: template JSON per jenis alat (PRD F5.1). Isi tidak bisa diubah; versi baru = baris baru; satu versi aktif per kode_alat.';
create unique index tera_device_templates_satu_aktif on public.tera_device_templates (kode_alat) where aktif;
create index tera_device_templates_dibuat_oleh_idx on public.tera_device_templates (dibuat_oleh);

-- 2) Titik kalibrator ---------------------------------------------------
create table public.tera_calibrator_points (
  id                 uuid primary key default gen_random_uuid(),
  aset_kalibrator_id text not null references public.aset_kalibrator(id) on delete restrict,
  parameter          text not null check (parameter ~ '^[a-z0-9_]+$'),   -- mis. tekanan_mmhg
  satuan             text not null,
  nomor_sertifikat   text,                    -- null/'-' = belum bersertifikat (CLAUDE.md 9.2)
  tertelusur         text,
  tanggal_kalibrasi  date,
  berlaku_sampai     date,                    -- null = belum bersertifikat → tidak diblokir (9.4)
  -- [{titik, koreksiNaik, koreksiTurun, u95Naik, u95Turun, driftNaik?, driftTurun?}, ...] (hitung.ts TitikKalibrator)
  points             jsonb not null check (
                       jsonb_typeof(points) = 'array'
                       and jsonb_array_length(points) between 1 and 500
                       and not jsonb_path_exists(points,
                         '$[*] ? (!(@.titik.type() == "number" && @.koreksiNaik.type() == "number" && @.koreksiTurun.type() == "number"
                                    && @.u95Naik.type() == "number" && @.u95Turun.type() == "number"
                                    && @.u95Naik >= 0 && @.u95Turun >= 0))')
                     ),
  budget             jsonb,                   -- rincian budget kalibrator (opsional)
  sumber             text not null,           -- sertifikat / datasheet / jurnal + referensi (9.2a)
  aktif              boolean not null default true,
  diubah_oleh        uuid references public.profiles(id) on delete restrict,
  diubah_pada        timestamptz not null default now()
);
comment on table public.tera_calibrator_points is 'Tera SMK: tabel koreksi & U95 sertifikat kalibrator per aset_kalibrator & parameter. Isi tidak bisa diubah; nilai baru = baris baru; satu baris aktif per kalibrator+parameter.';
create unique index tera_calibrator_points_satu_aktif on public.tera_calibrator_points (aset_kalibrator_id, parameter) where aktif;
create index tera_calibrator_points_kalibrator_idx on public.tera_calibrator_points (aset_kalibrator_id);
create index tera_calibrator_points_diubah_oleh_idx on public.tera_calibrator_points (diubah_oleh);

-- 3) Kunci isi: setelah disimpan, hanya kolom "aktif" yang boleh berubah ------
create or replace function public.tera_kunci_isi_template()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_table_name = 'tera_device_templates' then
    if (new.kode_alat, new.nama, new.versi, new.kop, new.definition, new.dibuat_oleh, new.dibuat_pada)
       is distinct from (old.kode_alat, old.nama, old.versi, old.kop, old.definition, old.dibuat_oleh, old.dibuat_pada) then
      raise exception 'Isi template tidak boleh diubah. Buat versi baru.' using errcode = 'check_violation';
    end if;
  else
    if (new.aset_kalibrator_id, new.parameter, new.satuan, new.nomor_sertifikat, new.tertelusur, new.tanggal_kalibrasi,
        new.berlaku_sampai, new.points, new.budget, new.sumber, new.diubah_oleh, new.diubah_pada)
       is distinct from (old.aset_kalibrator_id, old.parameter, old.satuan, old.nomor_sertifikat, old.tertelusur, old.tanggal_kalibrasi,
        old.berlaku_sampai, old.points, old.budget, old.sumber, old.diubah_oleh, old.diubah_pada) then
      raise exception 'Nilai kalibrator tidak boleh diubah. Simpan baris baru lalu nonaktifkan yang lama.' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;
create trigger tera_device_templates_kunci before update on public.tera_device_templates
  for each row execute function public.tera_kunci_isi_template();
create trigger tera_calibrator_points_kunci before update on public.tera_calibrator_points
  for each row execute function public.tera_kunci_isi_template();
revoke all on function public.tera_kunci_isi_template() from public, anon, authenticated;

-- 4) Kunci pintu: RLS aktif, tanpa policy, tanpa hak untuk browser -------
alter table public.tera_device_templates  enable row level security;
alter table public.tera_calibrator_points enable row level security;
revoke all on public.tera_device_templates, public.tera_calibrator_points from public, anon, authenticated, service_role;
grant select, insert, update on public.tera_device_templates, public.tera_calibrator_points to service_role;

-- 5) Isi awal -----------------------------------------------------------
insert into public.tera_device_templates (kode_alat, nama, versi, kop, definition)
values ('sphygmomanometer', 'Sphygmomanometer', 1, 'NON_KAN',
'{"kode_alat":"sphygmomanometer","nama":"Sphygmomanometer","versi":1,"sumber":"Master Sphygmomanometer.xlsx (v12) + keputusan U95 & T6–T8 (ikut MK) 19 Okt 2026","metode":"KMK-MK-090.0","kop":"NON_KAN","keselamatan_listrik":"tidak_ada","identitas":{"resolusi":{"satuan":"mmHg","pilihan":[2,1]},"jenisSkala":["Analog","Digital"]},"fisik":[{"id":"badan","judul":"Badan dan Permukaan"},{"id":"level_cairan","judul":"Level Cairan"},{"id":"tabung_selang","judul":"Tabung dan Selang"}],"pilihanFisik":["Baik","Tidak Baik"],"ujiAmbang":[{"id":"bocor","jenis":"selisih_setting","judul":"Kebocoran Tekanan","satuan":"mmHg","setting":250,"banding":"<","batas":15},{"id":"lajuBuang","jenis":"nilai","judul":"Laju Buang Cepat","satuan":"detik","banding":"<=","batas":10}],"kinerja":[{"id":"tekanan","jenis":"naik_turun_berulang","judul":"Akurasi Tekanan","satuan":"mmHg","titik":[0,50,100,150,200,250],"pengulangan":3,"k":2,"u95MinimumLaporan":1,"pembagiResolusi":{"Analog":2.449489742783178,"Digital":1.7320508075688772},"toleransi":4,"desimalCetak":2}],"skor":{"item":[{"dari":"fisik","minimalPersen":0.7,"nilai":10},{"dari":"uji_ambang","id":"bocor","nilai":30},{"dari":"uji_ambang","id":"lajuBuang","nilai":30},{"dari":"kinerja","id":"tekanan","minimalPersen":0.7,"nilai":30}],"laikBila":{"banding":">","batas":70}},"sertifikat":{"tata_letak":"report_all_sphygmomanometer_v12","halaman":3}}'::jsonb);

insert into public.tera_calibrator_points
  (aset_kalibrator_id, parameter, satuan, nomor_sertifikat, tertelusur, tanggal_kalibrasi, berlaku_sampai, points, sumber)
select 'CAL-037', 'tekanan_mmhg', 'mmHg', 'YK.05.02/E.IX/7560/2026', 'LK-110-IDN (BPFK Jakarta)', date '2026-03-04',
       k.jatuh_tempo_kalibrasi,
       '[{"titik":0,"koreksiNaik":0,"koreksiTurun":0,"u95Naik":0.1,"u95Turun":0.1,"driftNaik":0,"driftTurun":0},
         {"titik":50,"koreksiNaik":0,"koreksiTurun":0,"u95Naik":0.1,"u95Turun":0.1,"driftNaik":0,"driftTurun":0},
         {"titik":100,"koreksiNaik":0,"koreksiTurun":0,"u95Naik":0.1,"u95Turun":0.1,"driftNaik":0,"driftTurun":0},
         {"titik":150,"koreksiNaik":0,"koreksiTurun":0,"u95Naik":0.1,"u95Turun":0.1,"driftNaik":0,"driftTurun":0},
         {"titik":200,"koreksiNaik":0,"koreksiTurun":0,"u95Naik":0.09,"u95Turun":0.09,"driftNaik":0,"driftTurun":0},
         {"titik":250,"koreksiNaik":0,"koreksiTurun":0,"u95Naik":0.09,"u95Turun":0.09,"driftNaik":0,"driftTurun":0}]'::jsonb,
       'Master Sphygmomanometer.xlsx v12, sheet Calibrator 1 baris 20–25 (koreksi) & 87–92 (drift); sertifikat YK.05.02/E.IX/7560/2026'
  from public.aset_kalibrator k
 where k.id = 'CAL-037';

commit;


-- =====================================================================
-- BLOK 3 — CEK (harapan: semua kolom "hasil" = true)
-- =====================================================================
select 'dua tabel baru ada' cek,
       to_regclass('public.tera_device_templates') is not null and to_regclass('public.tera_calibrator_points') is not null hasil
union all
select 'RLS aktif di keduanya',
       (select bool_and(rowsecurity) from pg_tables where schemaname='public' and tablename in ('tera_device_templates','tera_calibrator_points'))
union all
select 'browser tidak punya hak apa pun',
       not exists (select 1 from information_schema.role_table_grants
                    where table_schema='public' and table_name in ('tera_device_templates','tera_calibrator_points')
                      and grantee in ('anon','authenticated','PUBLIC'))
union all
select 'server tidak bisa DELETE',
       not has_table_privilege('service_role','public.tera_device_templates','delete')
       and not has_table_privilege('service_role','public.tera_calibrator_points','delete')
union all
select 'template Sphygmomanometer v1 aktif (1 baris, NON_KAN, 6 titik, toleransi 4)',
       (select count(*) = 1 from public.tera_device_templates
         where kode_alat='sphygmomanometer' and versi=1 and aktif and kop='NON_KAN'
           and jsonb_array_length(definition->'kinerja'->0->'titik') = 6
           and (definition->'kinerja'->0->>'toleransi')::numeric = 4)
union all
select 'titik kalibrator CAL-037 aktif (6 titik, berlaku sampai = jatuh tempo aset)',
       (select count(*) = 1 from public.tera_calibrator_points p join public.aset_kalibrator k on k.id = p.aset_kalibrator_id
         where p.aset_kalibrator_id='CAL-037' and p.aktif and jsonb_array_length(p.points) = 6
           and p.berlaku_sampai is not distinct from k.jatuh_tempo_kalibrasi)
union all
select 'trigger kunci isi terpasang (2)',
       (select count(*) = 2 from pg_trigger where tgname in ('tera_device_templates_kunci','tera_calibrator_points_kunci'))
union all
select 'aset_kalibrator tidak berubah (masih 25 kolom, 57 baris)',
       (select count(*) = 25 from information_schema.columns where table_schema='public' and table_name='aset_kalibrator')
       and (select count(*) = 57 from public.aset_kalibrator);


-- =====================================================================
-- BLOK 4 — BATALKAN (hanya bila ada masalah; tabel lama tidak tersentuh)
-- =====================================================================
-- begin;
-- drop table if exists public.tera_calibrator_points;
-- drop table if exists public.tera_device_templates;
-- drop function if exists public.tera_kunci_isi_template();
-- commit;
