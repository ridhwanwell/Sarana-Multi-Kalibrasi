# PRD SERAH-TERIMA — Tera SMK, sisa Tahap 4 (+ Tahap 5 opsional)
**Untuk:** Google AI Studio (Build mode) · **Disusun:** Claude, 19 Oktober 2026 · **Pemilik produk:** Ridhwan (PT Sarana Multi Kalibrasi)
**Hasil kerja AI Studio akan DIAUDIT Claude** sebelum masuk ke cabang `tera-dev` dan sebelum menyentuh database produksi.

> Baca juga (urut): `docs/aistudio/ATURAN-AISTUDIO.md` (aturan kerja WAJIB) → `docs/aistudio/SPEK-REPORT-ALL-SPHYGMO.md` (isi & tata letak sertifikat per sel, diekstrak dari Excel — **pakai ini, jangan menebak dari Excel**) → `CLAUDE.md` (aturan proyek lengkap) → `PRD.md` (PRD induk, keputusan bagian 11 sudah DIKUNCI) → `PROMPT.md` bagian "STATUS TERAKHIR" → `docs/tahap4-u95-sphygmomanometer.md` (keputusan rumus).
> Bila dokumen ini bertentangan dengan `CLAUDE.md`/`PRD.md`, yang menang **CLAUDE.md/PRD.md**, kecuali 3 pengecualian di bagian 2.3.

---

## 1. Konteks singkat

**Tera SMK** = PWA LKK digital (Lembar Kerja Kalibrasi) di dalam website PT SMK yang **sudah dipakai produksi** (± 3.900 label QR aktif menempel di alat rumah sakit). Repo `ridhwanwell/qrcode-smk`: Vite + React 19 + TypeScript + Tailwind v4, server Express (`server.ts` → `src/server/app.ts`, dijalankan Vercel serverless, **ESM: impor relatif server WAJIB berakhiran `.js`**), Supabase (database **produksi**), React Router v7.

Dua PWA di satu domain `saranamultikalibrasi.com`:
- **Tera SMK** `/tera/*` — teknisi (`@tera.smk`, role `teknisi`), **offline-first**, Android + Chrome.
- **Manajemen Aset SMK** `/admin/*` — kantor (role `admin_utama`, `admin_teknik`, `admin_keuangan`, `hanya_sph`). Selia, ACC, BAP/BASTP ada di sini.
- Halaman publik scan QR (`/sertifikat/:noLabel`, `/scan/…`, `/verifikasi/…`, `/cert/…`, `/label/…`, `/`) = `src/pages/PublicScanPage.tsx` — **tidak boleh rusak, format link tidak boleh berubah**.

Alat percontohan: **Sphygmomanometer** (tensimeter), kop **Non-KAN**, metode KMK-MK-090.0.

### 1.1 Yang SUDAH ADA & BERFUNGSI (pakai ulang, JANGAN dibuat ulang / diubah perilakunya)

| Modul | File | Fungsi penting |
|---|---|---|
| Mesin hitung (dipakai tablet & server) | `src/tera/shared/hitung.ts` | `hitungLkk(template, data, titikKalibrator) → HasilLkk` (rata-rata, koreksi, u Tipe A, u zero, u resolusi, uc, U95, U95 laporan, U95 cetak, Laik/Tidak Laik per titik, skor, kesimpulan, daftar `kurang`). **Sudah lolos uji golden 59/59. Rumus TIDAK boleh diubah.** |
| Template Sphygmomanometer v1 | `src/tera/shared/templates/sphygmomanometer.ts` | Titik 0–250 mmHg, 3 pengulangan naik/turun, toleransi ±4, bocor < 15 mmHg, laju buang ≤ 10 s, skor 10/30/30/30, Laik bila total > 70. **Objek v1 TIDAK boleh diubah** (sudah tersimpan identik di database, ada uji penjaga). |
| Aturan nomor stiker | `src/tera/shared/nomorLabel.ts` | `cekNomorLabel`, `nomorDariKetikan`, `templateUntukAlat`, `tanggalLokal` |
| Segel paket | `src/tera/shared/segel.ts` | checksum SHA-256 JSON kanonik, `BO_UJI = '999'` |
| Buku LKK di perangkat (IndexedDB `tera_smk`) | `src/tera/data/teraDb.ts` | `buatLkk`, `ambilLkk`, `daftarLkk`, `simpanIsian(id, ubahan)` (**auto-save**), `bolehDiubah`, `tandaiSelesai(id)` (segel + antrean kirim, 🟡), `kekuranganUntukKirim`. **Tidak ada fungsi hapus LKK — memang disengaja.** |
| Kirim otomatis | `src/tera/data/mesinKirim.ts`, `src/tera/SinkronKonteks.tsx` | 🟡 → 🔵 → 🟢, coba ulang bertahap, cadangan draft. `useSinkron()` memberi `daftar`, `jadwal`, `dorong()`, dll. |
| Template & kalibrator di perangkat | `src/tera/data/masterLokal.ts` | `templateTerbaru`, `templateVersi`, `daftarTemplateTerbaru`, `daftarKalibrator(parameter)`, `statusKalibrator(k, tanggalPelaksanaan)` (`berlaku`/`expired`/`belum_bersertifikat`), `buatSnapshot(k)` |
| Jadwal di perangkat | `src/tera/data/jadwalLokal.ts` | `hitungAlatPo`, `JadwalLokal` |
| Layar yang ada | `src/tera/TeraApp.tsx` (rute), `TeraKerangka.tsx` (header, tab, Beranda/LKK/Akun, `BarisLkk`, `ChipSync`), `HalamanJadwal.tsx` (Beranda RS, Detail RS + tombol **Mulai LKK**), `MulaiLkk.tsx` (scan/ketik stiker → LKK draft), `tera-tema.css` (token Ocean + mode gelap) | |
| Server Tera | `src/server/teraSyncRoutes.ts` (`POST /api/tera/lkk`, `POST /api/tera/draft`, `GET /api/tera/lkk?sejak=`, `POST /api/tera/log`), `teraJadwalRoutes.ts` (push jadwal), `teraMasterRoutes.ts` (`GET /api/tera/master`) | Middleware `requireAuthTera`, `requireRole([...])` di `src/middleware/auth.ts`; klien server `supabaseAdmin` |
| Selia lama (Manajemen Aset) | `src/components/SeliaDashboard.tsx`, `PostCalibrationSeliaManager.tsx` | Alur lama berbasis Excel/Drive — **tetap jalan**; Selia Tera SMK ditambahkan di sampingnya |
| Uji | `tests/tera/*.mts` (`npm run test:tera:*`) | Uji layar memakai Chromium + esbuild + stub (lihat `tests/tera/mulaiLkk.uji.mts` sebagai pola) |

### 1.2 Database (produksi — TIDAK ada akses langsung dari AI Studio)
Tabel Tera yang sudah ada (migrasi `supabase/migrations/0001`–`0007`, baca file-nya untuk kolom persis):
`tera_lkk` (status: `submitted`/`under_review`/`returned`/`approved`/`correction_open`; kolom `data`, `results`, `calibrator_snapshot`, `checksum`, `client_version`, `is_test`, `teknisi_user_id`, …) · `tera_sync_receipts` · `tera_sync_conflicts` · `tera_error_logs` · `tera_lkk_drafts` · `tera_jadwal_push` · `tera_device_templates` · `tera_calibrator_points`. Semua: RLS aktif tanpa policy, hanya `service_role` (server) yang boleh membaca/menulis. Fungsi: `tera_terima_lkk(...)`, `tera_simpan_draft(...)`, `tera_push_jadwal`, `tera_cabut_jadwal`.
Tabel lama yang relevan: `labels` (kolom `no_label`, `status`, `pdf_source`, `pdf_url`, `pdf_drive_url`, `verify_code`, …), `jadwal_kalibrasi`, `teknisi`, `rumah_sakit`, `aset_kalibrator`, `profiles`, `dokumen_bap`.

---

## 2. Ruang lingkup

### 2.1 FASE A — WAJIB (sisa Tahap 4, alat Sphygmomanometer)
| Langkah | Isi |
|---|---|
| **A1 (4.3c)** | Layar isi LKK bagian 1–3: kerangka bagian, Identitas alat + pilih kalibrator, Kondisi lingkungan, Pemeriksaan fisik & fungsi |
| **A2 (4.3d)** | Bagian Kinerja (hitung langsung), Kesimpulan, Ringkasan & **Selesai**; LKK dikembalikan → bisa diperbaiki |
| **A3 (4.4)** | **Selia Tera SMK** di Manajemen Aset: daftar per RS/BO, detail, edit + riwayat, kembalikan, ACC — + **migrasi `0008`** (SQL saja, TIDAK dijalankan) |
| **A4 (4.5)** | **PDF sertifikat** Sphygmomanometer di server, sama persis Report All v12 — **TANPA kop** (lihat 2.3) — + QR tanda tangan elektronik |
| **A5 (4.6)** | Label QR ↔ PDF Tera (versi terbaru), halaman verifikasi e-sign, salinan Google Drive (opsional, di belakang variabel lingkungan) |
| **A6 (4.7)** | **Buka koreksi** pasca-ACC (khusus Developer) → ACC ulang → PDF revisi, nomor sama |
| **A7 (4.8)** | Uji ujung-ke-ujung (otomatis) + daftar uji manual untuk Ridhwan |

### 2.2 FASE B — OPSIONAL (Tahap 5), kerjakan HANYA setelah Fase A selesai & diaudit
BAP & BASTP otomatis dari LKK (PRD F10.1–F10.9) + sambungan penagihan (F11) — **TANPA kop surat** (lihat 2.3).

### 2.3 Pengecualian yang diputuskan pemilik produk (19 Okt 2026)
1. **Kop sertifikat (KAN/Non-KAN) dan kop surat BAP/BASTP DILEWATI dulu.** Jangan menempel/menggambar kop. Sediakan **ruang kosong setinggi area kop asli** (posisi isi tetap sama dengan Report All) dan satu titik sambung `lapisanKop?: (halaman) => void` / opsi `pakaiKop: false` agar kop bisa ditambahkan belakangan tanpa menggeser isi.
2. Database **tidak** diubah oleh AI Studio. Semua perubahan database ditulis sebagai file `supabase/migrations/0008_….sql` (dst.) dengan **4 blok: BACKUP, PERUBAHAN, CEK, BATALKAN**. Claude yang mengaudit & menjalankan setelah Ridhwan setuju.
3. Pekerjaan dilakukan di **repo salinan pribadi** (bukan repo produksi). Claude memindahkan hasil yang lolos audit ke `tera-dev`.

### 2.4 DI LUAR lingkup (jangan dikerjakan)
Alat selain Sphygmomanometer · pemindai AI & highlight (Tahap 7) · menu pengaturan lengkap (Tahap 8) · backup mingguan (Tahap 9) · desain ulang modul lama · mengubah domain/pengalihan/Vercel · mengubah halaman login · menambah fungsi hapus LKK.

---

## 3. Bentuk data LKK (kontrak — JANGAN diubah tanpa alasan tertulis)

`LkkLokal.data` (disimpan apa adanya ke `tera_lkk.data`; `hitungLkk` membaca `identitas`, `fisik`, `bocor`, `lajuBuang`, `kinerja`):

```jsonc
{
  "identitas": {                 // = Master v12 sheet "Input 1" baris 14–27
    "merek": "ABN",              // Merk Pabrik (E15)
    "tipe": "…",                 // Tipe (E16)
    "noSeri": "…",               // No.Seri (E17)
    "rentangUkur": 300,          // Rentang Ukur (E18), satuan mmHg
    "resolusi": 2,               // Resolusi (E19), pilihan template [2, 1] mmHg
    "jenisSkala": "Analog",      // Jenis (E20): "Analog" | "Digital"
    "tanggalPenerimaan": "2026-01-30",  // Tanggal penerimaan barang kalibrasi (E23)
    "ruang": "KIA"               // Ruangan (E25)
    // Nama alat (E14) = template.nama/ASPAK; Tempat (E24) = nama RS dari jadwal; Tanggal (E26) = LkkLokal.tanggalKalibrasi;
    // Teknisi (E27) = akun yang login (nama + gelar dari master `teknisi`) — TIDAK diketik teknisi
  },
  "lingkungan": { "suhuAwal": 27.7, "suhuAkhir": 27, "rhAwal": 56, "rhAkhir": 59 },  // Input 1 G38/I38 (°C) & G39/I39 (%RH)
  "fisik": {
    "badan":         { "fisik": "Baik", "fungsi": "Baik" },
    "level_cairan":  { "fisik": "Baik", "fungsi": "Baik" },
    "tabung_selang": { "fisik": "Baik", "fungsi": "Tidak Baik" }
  },
  "bocor":     { "bacaan": 245 },     // bacaan 60 detik dari setting 250 mmHg; selisih = 250 − bacaan
  "lajuBuang": { "waktu": 6.2 },      // detik
  "kinerja": {
    "tekanan": {
      "0":   { "naik": [0, 0, 0],       "turun": [0, 0, 0] },
      "50":  { "naik": [50, 50, 52],    "turun": [50, 50, 50] },
      "100": { "naik": [100, 100, 100], "turun": [102, 100, 100] }
      // … 150, 200, 250 — kunci = titik template (string), 3 run per arah
    }
  },
  "catatan": "teks bebas (opsional)"
}
```
- `LkkLokal.calibratorSnapshot` = **tiga** "fotokopi sertifikat" (Report All baris 35–37 mencetak ketiganya):
  ```jsonc
  { "tekanan": <buatSnapshot(pressure meter)>,        // wajib; hitungLkk(template, data, calibratorSnapshot.tekanan.points)
    "stopwatch": <buatSnapshot(stopwatch)> | null,     // untuk laju buang; hanya dicetak (tanpa koreksi)
    "termohigrometer": <buatSnapshot(termohigrometer)> | null }  // untuk kondisi ruangan (bagian 3.2)
  ```
  Bentuk ini belum dipakai LKK mana pun, jadi aman ditetapkan sekarang. **`hitungLkk` dipanggil dengan `snapshot.tekanan.points`**, bukan master.
- Parameter di `tera_calibrator_points`: `tekanan_mmhg` (sudah ada: CAL-037), `waktu_s` (stopwatch), `suhu_c` & `kelembaban_rh` (termohigrometer, 2 baris per alat). Kolom `points` wajib berbentuk `{titik, koreksiNaik, koreksiTurun, u95Naik, u95Turun}` (dicek database) → untuk alat satu arah isi **`koreksiNaik = koreksiTurun = koreksi`** dan **`u95Naik = u95Turun = U95`**; `titik` = pembacaan alat. Data stopwatch & 4 termohigrometer diambil dari sheet **Calibrator 1 baris 96–101** dan **Calibrator 2** Master v12 → tulis sebagai migrasi `0008_tera_kalibrator_lingkungan.sql` (4 blok, BELUM DIJALANKAN; `aset_kalibrator_id` dicari dari `aset_kalibrator.kode`/`nomor_seri`, **jangan mengarang id**; bila alat tidak ditemukan → tulis di laporan).

### 3.2 Kondisi ruangan (fungsi murni baru, mis. `src/tera/shared/lingkungan.ts`) — persis Master v12 "Calibrator 2"
1. `x = rata-rata(awal, akhir)` (suhu dan %RH dihitung terpisah).
2. Dari tabel sertifikat termohigrometer (snapshot): `X = titik + koreksi` (nilai **standar**), `Y = koreksi`. Cari regresi kuadrat terkecil orde 2 `Y = a·X² + b·X + c` (= `LINEST(Y, X^{1,2})` Excel).
3. `terkoreksi = x + (c + b·x + a·x²)`.
4. Bulatkan **ROUNDUP** Excel (menjauhi nol): suhu **1 desimal**, %RH **0 desimal**.
5. U95 = U95 sertifikat termohigrometer (baris pertama tabel: suhu 0,5 · %RH 3,1 pada contoh).
6. Cetak `( 27.8±0.5 )` dan `( 53±3.1 )`.
**Angka uji (wajib jadi test):** tabel suhu titik 15/20/25/30/35 koreksi 0,3/0,3/0,4/0,5/0,6 U95 0,5; tabel %RH titik 40/50/60/70/80 koreksi −7,8/−7,3/−5,7/−3,1/0,5 U95 3,1; isian suhu 27,7 & 27 → rata 27,35 → koefisien a = 0,000544203536, b = −0,011936543731, c = 0,343687156250 → 27,7742991747 → **27,8 ± 0,5**; isian %RH 56 & 59 → 57,5 → a = 0,002907688668, b = −0,153682799104, c = −5,927445258155 → 52,3493394523 → **53 ± 3,1**. Data kurang (tabel < 3 titik, isian kosong) → `null` / "-", tidak error.
**Batas lingkungan** (F3.8.1, pemblokir ACC): Master v12 **tidak memuat batas**. Pakai MK 090 bila tercantum; bila tidak, pakai PRD Lampiran C (suhu 15–35 °C, kelembaban 15–90 %RH) dan tulis **"PERLU KONFIRMASI RIDHWAN"**. Batas dicek terhadap nilai **terukur (awal & akhir)**.
- `LkkLokal.results` = `HasilLkk` dari `hitungLkk` (disimpan saat Selesai; server menghitung ulang dengan mesin yang sama).
- Isian angka: koma desimal Indonesia (`25,1`) diubah ke number; kosong = `null` (tidak error, tampil "-").
- **Field baru** (identitas tambahan, lingkungan, dll.) yang perlu masuk template → buat **template versi 2** (file baru / objek baru `TEMPLATE_SPHYGMOMANOMETER_V2`), biarkan v1 utuh, dan tulis migrasi SQL untuk menyimpan v2. Daftar field & batas lingkungan **diambil dari Master Sphygmomanometer v12 (sheet Input 1 & Report All) dan MK 090** — jangan mengarang; bila tidak ditemukan, pakai nilai PRD Lampiran C (suhu 15–35 °C, kelembaban 15–90 %RH) dan tulis **"PERLU KONFIRMASI RIDHWAN"** di laporan.

---

## 4. Kebutuhan rinci & kriteria terima

### A1 — Layar isi LKK, bagian 1–3 (`/tera/lkk/:id`)
| ID | Kebutuhan | Kriteria terima |
|---|---|---|
| A1.1 | Rute `/tera/lkk/:id` (deep link). `BarisLkk` di daftar & Detail RS menjadi tautan ke layar ini. Setelah "Ya, sesuai — mulai LKK" di `MulaiLkk`, langsung pindah ke layar ini | Muat ulang halaman = isian tetap ada (IndexedDB) |
| A1.2 | Kerangka bagian: **Identitas → Lingkungan → Fisik & fungsi → Kinerja → Kesimpulan → Ringkasan & Selesai** (tanpa Keselamatan listrik: template `keselamatan_listrik: 'tidak_ada'`). Bilah kemajuan "Bagian 3 dari 6 · Fisik" **bisa diketuk**; bagian lengkap bercentang hijau. Tombol **Kembali / Lanjut** menempel di bawah (safe area) | HP: 1 kolom; tablet landscape: daftar bagian kiri ±32 %, isian kanan (CLAUDE.md 13.5) |
| A1.3 | **Auto-save setiap isian** lewat `simpanIsian(id, { data })` (debounce ≤ 400 ms, simpan juga saat blur / pindah bagian / `visibilitychange`) | Tutup paksa tab di tengah isian → buka lagi → semua isian ada |
| A1.4 | Identitas (bagian 3, urutan seperti Master Input 1): merek, tipe, no. seri, rentang ukur (mmHg), **resolusi** (pilihan template `[2, 1]`, bawaan 2), **jenis skala** (Analog/Digital), tanggal penerimaan, ruangan, tanggal pelaksanaan (bawaan dari LKK, bisa diubah). Nama alat, tempat (RS) dan teknisi tampil baca-saja | Label selalu di atas kotak; kotak ≥ 48 px; font isian 16 px |
| A1.5 | **Pilih 3 alat standar**: pressure meter (`tekanan_mmhg`, wajib), stopwatch (`waktu_s`), termohigrometer (`suhu_c` + `kelembaban_rh` dari aset yang sama). Status `statusKalibrator(k, tanggalPelaksanaan)`: **expired → abu-abu, tidak bisa dipilih**, tulisan "Expired sejak …"; `belum_bersertifikat` boleh dipilih dengan keterangan. Saat dipilih → snapshot masuk `calibratorSnapshot.<peran>`. Bila tanggal pelaksanaan diubah sehingga salah satu snapshot jadi expired → peringatan merah & Selesai ditolak. Satu-satunya pilihan yang berlaku → terpilih otomatis | Uji: kalibrator berlaku s/d 2027-03-04, pelaksanaan 2027-03-05 → tidak bisa dipilih |
| A1.6 | Lingkungan: suhu awal/akhir (°C) & kelembaban awal/akhir (%RH). Tampilkan hasil terkoreksi `( 27,8 ± 0,5 ) °C` langsung (fungsi 3.2). Di luar batas → **ditolak** dengan pesan di bawah kotak saat pindah kotak (F3.8.1), `inputmode="decimal"`, koma desimal | Angka uji 3.2 lolos; nilai di luar batas → Selesai ditolak |
| A1.7 | Fisik & fungsi: 3 item template × 2 kolom (Fisik, Fungsi), pilihan **Baik / Tidak Baik** (tombol segmen ≥ 48 px, bukan dropdown kecil) | Data sama bentuknya dengan bagian 3 |
| A1.8 | LKK yang sudah dikirim (🟡/🔵/🟢, bukan `returned`) dibuka **baca-saja** (`bolehDiubah` false) dengan pesan jelas | Tidak ada kotak yang bisa diketik |

### A2 — Kinerja, Kesimpulan, Ringkasan & Selesai
| ID | Kebutuhan | Kriteria terima |
|---|---|---|
| A2.1 | Kinerja: per titik (0, 50, 100, 150, 200, 250) × arah **Naik** & **Turun** × 3 pembacaan. HP 2–3 kotak per baris, tablet portrait 3, tablet landscape 6 sebaris. Urutan fokus = urutan pengambilan data (naik 0→250 lalu turun 250→0, run 1–3) — "Enter/Next" pindah ke kotak berikutnya | Bisa diisi penuh hanya dengan keyboard angka |
| A2.2 | Di bawah tiap titik: **Rata-rata · Koreksi · U95** (U95 laporan, 2 desimal, tabular-nums) + chip **Laik / Tidak Laik** (warna + ikon + tulisan). Data kurang → "-" tanpa error | Angka = hasil `hitungLkk` (tidak ada rumus di komponen) |
| A2.3 | Uji **Kebocoran** (bacaan setelah 60 s dari 250 mmHg → tampil selisih & hasil) dan **Laju buang cepat** (detik → hasil) | Batas dari template (`< 15`, `≤ 10`) |
| A2.4 | Hitung ulang **instan** saat mengetik (memo per titik; jangan menghitung ulang seluruh layar bila tidak perlu) | Mengetik tidak tersendat di tablet murah |
| A2.5 | Kesimpulan: rincian skor (Fisik, Bocor, Laju buang, Akurasi), total, chip **LAIK PAKAI / TIDAK LAIK PAKAI** (CLAUDE.md 13.4) | = `hasil.skor` & `hasil.kesimpulan` |
| A2.6 | Ringkasan & Selesai: daftar kekurangan (gabungan `hasil.kurang` + `kekuranganUntukKirim` + identitas wajib + lingkungan + kalibrator expired) dengan tautan ke bagiannya. Tombol **Selesai** tetap terlihat; bila kurang → beri tahu apa yang kurang (jangan sekadar abu-abu) | Selesai = `simpanIsian(id, { data, results })` lalu `tandaiSelesai(id)`; status jadi 🟡 lalu otomatis 🟢 |
| A2.7 | **Dialog konfirmasi** sebelum Selesai ("Setelah dikirim, LKK tidak bisa diubah kecuali dikembalikan Penyelia") | Satu-satunya dialog di alur ini |
| A2.8 | LKK `returned` (dikembalikan Penyelia): alasan tampil di atas layar (chip ungu), bisa diedit, Selesai lagi → versi kiriman naik | Mesin kirim sudah mendukung (`bolehDiubah`) |
| A2.9 | Teknisi menarik status LKK dari server (`GET /api/tera/lkk?sejak=`) agar status `returned` + alasan & `approved` muncul di perangkat — perluas jawaban server bila alasan belum ikut | Tidak menimpa isian lokal yang lebih baru |

### A3 — Selia Tera SMK (Manajemen Aset) + migrasi `0008`
| ID | Kebutuhan | Kriteria terima |
|---|---|---|
| A3.1 | **Migrasi `0008_tera_selia.sql`** (4 blok, TIDAK dijalankan): `tera_audit_log` (append-only: lkk_id, user_id, waktu, kolom, nilai_lama, nilai_baru, alasan; UPDATE/DELETE ditolak trigger), `tera_lkk_returns`, `tera_signatories` (isi: Hafizh Pasifianto Utomo, S.Tr.T., Manajer Teknik), `tera_esign` (kode_verifikasi acak ≥ 10 karakter, unik), `tera_pdf_versions`, kolom tambahan di `tera_lkk` (approved_by, approved_at, signatory_snapshot, snapshot_frozen_at, revisi_ke, nomor_sertifikat bila perlu), **trigger kunci**: LKK `approved` tidak bisa diubah kecuali lewat fungsi `tera_buka_koreksi` (A6); fungsi server `tera_selia_ubah`, `tera_kembalikan`, `tera_acc`. Tabel lama **hanya ditambah kolom**. RLS aktif tanpa policy, hak hanya `service_role` | Ada blok CEK berisi query + hasil yang diharapkan; blok BATALKAN lengkap |
| A3.2 | Endpoint server (`src/server/teraSeliaRoutes.ts`, didaftarkan 1 baris di `app.ts`, hanya `admin_teknik` & `admin_utama`): daftar LKK (filter RS/BO, status, teknisi, tanggal; `is_test` bisa disaring), detail, ubah isian (alasan wajib → audit), kembalikan (alasan wajib), ACC | Server **menghitung ulang** dengan `hitung.ts` + snapshot; browser tidak pernah mengirim hasil hitung sebagai kebenaran |
| A3.3 | ACC ditolak bila: kalibrator expired pada tanggal pelaksanaan, lingkungan di luar batas, nomor label ganda, data belum lengkap. Merah karena **melewati toleransi** bukan pemblokir (sertifikat TIDAK LAIK PAKAI tetap terbit) | Pesan alasan jelas |
| A3.4 | Saat ACC: snapshot kalibrator & penandatangan **dibekukan**, nama penyelia = akun yang ACC, revisi_ke = 0, buat `tera_esign` | Teruji di uji server |
| A3.5 | Layar Selia: komponen baru `src/components/TeraSeliaPanel.tsx` dipasang **1 baris** di halaman Selia yang ada. Laptop landscape: daftar per RS/BO kiri, detail kanan; tampilan isian sama dengan layar teknisi (pakai ulang komponen tampilan bila bisa) + tombol **Edit**, **Kembalikan**, **ACC** (ACC & Kembalikan pakai dialog). Riwayat perubahan per LKK (baca-saja) | Gaya ikut CLAUDE.md 13 untuk layar Selia baru; modul lama tidak didesain ulang |

### A4 — PDF sertifikat Sphygmomanometer (server, setelah ACC)
| ID | Kebutuhan | Kriteria terima |
|---|---|---|
| A4.1 | `src/server/tera/pdfSertifikat.ts`: `pdf-lib` + `@pdf-lib/fontkit` (sudah ada di package.json) + font **Carlito** (OFL; file TTF ditaruh di `src/server/tera/fonts/`, lisensi OFL ikut). Fungsi murni `buatPdfSertifikat(lkk, hasil, snapshot, penandatangan, esign, opsi) → Uint8Array` | Bisa diuji tanpa database |
| A4.2 | Tata letak, urutan tabel, teks, kolom, gaya judul, jumlah halaman **sama persis Report All** Sphygmomanometer — ikuti **`docs/aistudio/SPEK-REPORT-ALL-SPHYGMO.md`** (peta sel lengkap) + PDF acuan dari Ridhwan untuk perbandingan visual. Nomor Order = `BBB/SMK-BO/<romawi bulan>-<tahun>` (PRD F10.4), Nomor Sertifikat = nomor label `BBB.NNNN`. Header: Indonesia **tebal**, Inggris *miring 8 pt* di bawahnya. Judul tabel kinerja: "Parameter Kinerja / *Performance Parameters*". U95 cetak 2 desimal (`u95Cetak`). Teks "± 4 mmHg" (keputusan T8) | Laporkan perbandingan berdampingan (gambar halaman PDF vs acuan) |
| A4.3 | **Tanpa kop** (2.3): area kop dikosongkan, posisi isi tetap; opsi `pakaiKop` disiapkan | — |
| A4.4 | **QR tanda tangan elektronik** di halaman 1, ruang kosong di bawah "Disetujui oleh," tepat di atas nama **Hafizh Pasifianto Utomo, S.Tr.T.** — Manajer Teknik. QR berisi `https://saranamultikalibrasi.com/verifikasi/e/<kode_verifikasi>` (atau pola lain yang **tidak** bentrok dengan rute publik lama — jelaskan pilihanmu). **Tidak ada** tanda tangan/paraf penyelia; nama penyelia dari akun yang ACC | Kode acak, tidak bisa ditebak dari nomor label |
| A4.5 | Pemeriksaan kata terlarang otomatis (CLAUDE.md 9.1: "Tambahan", "Additional", "sesuai KMK terbaru", "revisi", "diperbarui", "parameter baru", nomor KMK-MK di judul tabel) + "Tera SMK" tidak tercetak | Uji gagal bila ada |
| A4.6 | Setiap **teks baru** yang tercetak (tidak ada di Report All) → daftar di laporan "PERLU PERSETUJUAN RIDHWAN" | — |
| A4.7 | PDF disimpan di bucket **privat** `tera-certificates` (dibuat di migrasi), dibuka lewat signed URL berumur pendek | Alamat file asli tidak bisa ditebak |

### A5 — Label QR, verifikasi, Google Drive
| ID | Kebutuhan | Kriteria terima |
|---|---|---|
| A5.1 | Saat ACC (mode jadwal `tera`): baris `labels` untuk `no_label` itu ditautkan **oleh fungsi server** (`pdf_source = 'tera'`, `tera_lkk_id`, `tera_pdf_version`; status **Sertifikat Tertaut** / **Tidak Laik Pakai**). Label mode manual (Drive) tidak disentuh | Hanya kolom tambahan & alur ACC; baris label lain tidak berubah |
| A5.2 | `PublicScanPage`: urutan tampilan **PDF Tera versi terbaru → link Drive → "Sertifikat belum terbit"**. Perubahan sekecil mungkin; label lama tetap tampil persis seperti sekarang | Uji dengan label mode tera, mode drive, label lama |
| A5.3 | Halaman verifikasi e-sign: nomor sertifikat, alat, merek/tipe/SN, RS, tanggal kalibrasi, hasil, "Ditandatangani secara elektronik oleh Hafizh Pasifianto Utomo, S.Tr.T. (Manajer Teknik)", tanggal & jam ACC, revisi, status **Berlaku / Digantikan**. Tidak di-cache service worker | — |
| A5.4 | Salinan Google Drive (F9.4): hanya jalan bila variabel lingkungan Google ada (OAuth akun ridhwanwell@gmail.com, folder induk ID `16Jq1_mHM8AMIa2TF8_bGcKwbPUqBWcM8`, subfolder "BO – Nama RS"). Gagal → ACC tetap sukses, dicoba ulang & dicatat. **Jangan pakai service account.** Tanpa variabel → dilewati dengan log | Tidak ada rahasia di kode |

### A6 — Buka koreksi pasca-ACC
Hanya `admin_utama` (Developer). Alasan wajib (kosong ditolak database) → LKK `correction_open` → edit (diaudit) → ACC ulang → PDF revisi baru, **nomor sama**, PDF lama berstatus "digantikan", QR menampilkan versi terbaru, e-sign lama "Digantikan oleh revisi n". (PRD F6.6)

### A7 — Uji
- Uji otomatis baru (pola `tests/tera/*.uji.mts`, Chromium headless + esbuild + stub): layar A1/A2 (isi penuh, muat ulang, kalibrator expired, lingkungan di luar batas, Selesai, data terburuk: 320/390/820/1180 px, mode gelap, huruf 200 %), mesin Selia (fungsi murni), PDF (jumlah halaman, kata terlarang, angka = golden: pakai `tests/tera/fixtures/sphygmo-golden-v3.json`).
- **Semua uji lama tetap lulus**: `test:tera`, `test:tera:hitung` (59/59), `:nomor`, `:master`, `:mulai-lkk`, `:jadwal`, `:jadwal-layar`, `:jadwal-lokal`, `:sinkron`, `:penyimpanan`, `:impor`.
- Data uji hanya **BO `999`** (`is_test = true`).

### Fase B — BAP & BASTP (hanya setelah Fase A diaudit)
Ikuti PRD F10.1–F10.9 & F11 dan CLAUDE.md 11, **tanpa kop surat** (area kosong + `pakaiKop`). Realisasi = LKK 🟢 (termasuk TIDAK LAIK); alat tambahan baris/halaman terpisah "TAMBAHAN"; BASTP 30 baris/halaman; PDF 2 rangkap; `is_test` tidak masuk dokumen/penagihan sungguhan. Acuan: contoh BAP & *BASTP Klinik Jantung Hasna Medika*.

---

## 4A. Temuan di Master v12 (diperiksa Claude 20 Okt 2026) — keputusan milik Ridhwan, JANGAN diputuskan AI Studio
| No | Temuan | Yang dikerjakan AI Studio sementara |
|---|---|---|
| T9 | **Termohigrometer salah pasang di Excel.** Tabel pencarian `Input 1!L33:P36` bergeser satu baris: sertifikat yang **tercetak** HTC-2 / AK-00040-SMK / C.250501008 (2025), tetapi koreksi & U95 suhu/kelembaban yang **dipakai** berasal dari KRISBOW 0761-0823 / S.23017462 (2023). Blok data HTC-2 sendiri bernilai `#VALUE!` (tabel sertifikatnya belum lengkap) | Pakai data termohigrometer **yang dipilih teknisi sendiri** (snapshot), sesuai CLAUDE.md 2.10 (jangan meniru kesalahan Excel). Uji memakai angka bagian 3.2 |
| T10 | Regresi koreksi termohigrometer dibuat dengan X = nilai **standar** (bacaan + koreksi), tetapi dipakai pada **bacaan alat**. Selisih hasilnya kecil | Ikuti Excel apa adanya |
| T11 | Satuan suhu di Report All D44 tertulis `0C` (bukan °C) | Lihat SPEK bagian 3 |
| T12 | Tanggal terbit di Excel = tanggal penerimaan + 1 hari | Sementara: tanggal ACC |
| T13 | Kotak Nomor Order di baris 85 jatuh di tengah halaman 3 → mungkin aslinya 4 halaman | Cocokkan dengan PDF acuan |
| T14 | Paragraf Metode menyebut SNI IEC 62353 (keselamatan listrik) walau Sphygmomanometer tidak diuji kelistrikan | Cetak apa adanya |
| T15 | Batas suhu & kelembaban tidak ada di Master | Lihat bagian 3.2 |
| T16 | Format **Nomor Order** di sertifikat (contoh Excel hanya "CONTOH") | Pakai format PRD F10.4 `BBB/SMK-BO/<romawi>-<tahun>` |

Tulis jawaban/keputusan Ridhwan untuk T9–T16 di `LAPORAN-AISTUDIO.md` bila ia memberikannya.

## 5. Urutan kerja & laporan
1. Kerjakan **A1 → A7 berurutan**, satu langkah per giliran, ±3 file kode per giliran.
2. Setiap langkah: tulis kode + uji, jalankan uji, lalu tambahkan entri di **`docs/aistudio/LAPORAN-AISTUDIO.md`**: tanggal, langkah, file yang dibuat/diubah (dan alasan bila file lama diubah), hasil uji (angka lulus/gagal, jujur), SQL yang ditulis (belum dijalankan), keputusan yang kamu ambil sendiri, hal "PERLU KONFIRMASI RIDHWAN", dan teks sertifikat baru yang perlu disetujui.
3. Jangan lanjut ke Fase B sebelum Ridhwan menulis "lanjut Fase B".
