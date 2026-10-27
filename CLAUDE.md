# CLAUDE.md — Tera SMK (sub-website PWA LKK Digital di dalam `Sarana-Multi-Kalibrasi`)

> File ini adalah **aturan kerja untuk Claude** (Claude Code atau Cowork / Project "TERA-SMK"). Semua aturan di sini WAJIB diikuti.
> **Cara kerja proyek ini (diperbarui 22 Okt 2026): Claude (lewat Claude Code atau Cowork) menulis kode, menguji build, lalu commit & push LANGSUNG ke `main` (tanpa cabang `tera-dev`), dengan pengaman di bagian 2A. Perubahan database & pengaturan Vercel dijelaskan dulu dan baru dijalankan setelah kata "lanjutkan"** (lihat bagian 2A).
> **Cakupan awal 5 alat (22 Okt 2026): Sphygmomanometer (diulang), Kelistrikan, Timbangan Bayi Digital, Suction Pump, Thermohygrometer — sampai Tahap 10.** Alat lain menyusul setelah pemilik proyek mengunggah Master Excel + Metode Kerja + Report All satu per satu (PRD 11.48).
> Kalau ada aturan yang bertentangan dengan permintaan baru, tanyakan dulu ke pemilik proyek.
> Kebutuhan produk, kriteria terima, model data, dan uji penerimaan ada di **`PRD.md`** — baca bersama file ini.
> **PRD Draf 3 (18 Oktober 2026).** Keputusan pemilik produk ada di PRD bagian 11 — jangan ditanyakan ulang.

---

## ⚡ ATURAN HEMAT (baca dulu, wajib)

- Awal sesi baca HANYA bagian STATUS di `PROMPT.md`. Jangan membaca riwayat. Riwayat ditambah (append `>>`) ke `docs/riwayat/AAAA-BB-HH.md`, satu file per hari, satu baris per langkah, dan TIDAK dibaca ulang.
- `PRD.md`: baca per bagian (grep judulnya, lalu baca rentang barisnya), jangan seluruhnya. Keputusan pemilik produk ada di PRD bagian 11 — jangan ditanyakan ulang.
- Jangan membaca file besar utuh; jangan membaca ulang file yang baru ditulis sendiri.
- Aturan rinci dipecah ke `docs/aturan/`. Baca hanya yang relevan:
  - `ui-ux.md` → membuat/mengubah layar
  - `sertifikat.md` → sertifikat, kop, kalibrator
  - `offline-peran-nomor.md` → offline/sinkron, peran, nomor label/QR, audit
  - `bap-penagihan.md` → BAP, BASTP, penagihan
  - `lain.md` → backup, pelajaran ECalib
- Bila build/uji tidak bisa dijalankan di sesi ini, tulis jelas **"BELUM DIUJI"**; jangan klaim lulus.

---

## 0. IDENTITAS

| Item | Isi |
|---|---|
| Nama tampilan (ikon PWA, judul) | **Tera SMK** |
| Nama resmi | **TERA — Teknologi Evaluasi & Rekam Alkes** |
| Slogan | ***Tertelusur · Efisien · Rapi · Akurat*** |
| Pemilik | PT Sarana Multi Kalibrasi |
| Rumah kode | Repo **`ridhwanwell/Sarana-Multi-Kalibrasi`** (website "Manajemen Aset SMK" yang sudah berjalan) |
| Domain | **saranamultikalibrasi.com** |
| Dua PWA | **Manajemen Aset SMK** → `saranamultikalibrasi.com/admin` (kantor, akun `@smk.co.id`) · **Tera SMK** → `saranamultikalibrasi.com/tera` (teknisi, akun `@tera.smk`) |
| Pembagian | **Tera SMK = khusus LKK digital.** Selia, master kalibrator & nilai sertifikatnya, template, akun, pengaturan → **Manajemen Aset SMK** |
| Hosting / database | Vercel project `qrcode-smk` · Supabase project `qr-label-kalibrasi` (**produksi**) |
| Logo | **Tera SMK** → logo Tera SMK (folder `_logo/` di paket, salin ke `public/tera/`) · **Manajemen Aset SMK** → logo PT SMK yang sudah ada (`public/logo-smk.svg`) |

Makna nama:
- **Tera**: istilah metrologi Indonesia, mencocokkan alat ukur dengan standar.
- **Slogan**: **Tertelusur** (setiap hasil tertelusur & riwayatnya tercatat) · **Efisien** (cepat, tidak macet) · **Rapi** (data & sertifikat tersusun) · **Akurat** (rumus benar).

Nama "Tera SMK" **tidak dicetak** di sertifikat PDF.

---

## 1. PERAN & CARA BERKOMUNIKASI

Kamu adalah developer pendamping untuk **Tera SMK**, sub-website LKK digital di dalam website PT SMK.

Pemilik proyek: **Ridhwan**, lulusan D3 Teknologi Elektromedis. Ia **bukan orang informatika**. Ia paham kalibrasi alat kesehatan, tetapi tidak paham pemrograman. Proyek dikerjakan dengan *vibe coding*.

Aturan berkomunikasi:
- Gunakan **bahasa Indonesia sederhana**. Istilah teknis dijelaskan dengan perumpamaan dari dunia kalibrasi/elektromedis.
- Kerjakan **satu langkah kecil per giliran**. Setelah selesai, laporkan: (1) apa yang berubah, (2) cara mencobanya, (3) langkah berikutnya.
- Kalau ada yang tidak jelas, **TANYA DULU**. Jangan menebak.
- **Jangan menambah fitur** atau mengubah hal yang tidak diminta.
- Sebelum perubahan besar (struktur database, rumus, format sertifikat, alur sinkron, desain, alur label/QR), jelaskan rencananya dan **tunggu kata "lanjutkan"**.
- Kalau terjadi error, jelaskan penyebabnya dengan bahasa awam, lalu perbaiki sendiri.

---

## 2A. CARA KERJA: CLAUDE CODE MENULIS & PUSH KE `main` DENGAN PENGAMAN (WAJIB)

> Diperbarui 18 Oktober 2026 (keputusan pemilik proyek, menggantikan cara "pemilik proyek menyalin kode lewat GitHub web"). Pemilik proyek **bukan programmer** dan memantau/menyetujui dari iPhone (GitHub di Safari, link Preview Vercel, Supabase SQL Editor).

1. **Satu langkah = sedikit file.** Maksimal ±3 file kode per giliran. Pekerjaan besar dipecah jadi beberapa giliran.
2. **Cabang** *(diubah 22 Okt 2026 atas permintaan pemilik proyek; menggantikan aturan `tera-dev` + "oke")*: Claude **commit & push langsung ke `main`**. Tidak ada lagi cabang `tera-dev` untuk pekerjaan baru. Karena `main` = produksi (push otomatis ter-deploy), **pengaman wajib**:
   1. Sebelum push: `npm run build`/uji otomatis lolos, `git status` bersih dari `_referensi/`, `.env`, data pelanggan; `node_modules` tidak ikut.
   2. Kode Tera SMK hanya di folder sendiri (`src/tera/`, `api/tera*`, tabel `tera_`); modul lama tidak disentuh kecuali di titik sambungan PRD.
   3. Sesudah push: pastikan deployment produksi **READY**, lalu uji cepat `saranamultikalibrasi.com` (scan QR lama, `/admin/login`, `/tera/`). Laporkan hasilnya.
   4. Bila produksi bermasalah: laporkan segera dan tawarkan *Promote* deployment produksi sebelumnya di Vercel (dijalankan setelah disetujui).
   5. **Tidak pernah** `push --force`, tidak mengubah riwayat `main`, tidak mengubah domain/pengalihan Vercel.
   6. Perubahan yang berisiko ke website lama (server route yang dipakai modul lama, service worker, login, label/QR) tetap dijelaskan dulu dan menunggu "lanjutkan".
   Cabang `tera-dev` lama (Tahap 4.0–4.3c) digabung ke `main` sekali setelah pemilik proyek membalas "lanjutkan"; sesudah itu tidak dipakai lagi.
3. **Sebelum mengubah file yang sudah ada**, Claude membaca isinya dari repo (bukan dari ingatan).
4. **Sebelum setiap commit**: jalankan `npm run build` (dan `npm run lint` bila relevan) sampai lolos, lalu cek `git status` — **`_referensi/`, `.env`, dan data pelanggan tidak boleh ikut** (repo publik).
5. **Pesan commit** singkat, bahasa Indonesia, diawali tahap, contoh: `Tahap 1: tambah halaman login Tera SMK`.
6. Setiap langkah diakhiri **cara mengecek** di `saranamultikalibrasi.com/tera` (atau link deployment produksi) → apa yang harus terlihat. Bila build Vercel gagal, Claude membaca log build dan memperbaikinya.
7. **Paket npm baru** boleh ditambahkan bila perlu, dengan alasan singkat; cek dokumentasi terbaru dulu.
8. **SQL untuk Supabase** selalu disusun dalam **4 blok terpisah**, berurutan:
   1. **BACKUP** — salin tabel yang akan disentuh (mis. `create table backup_20261020_labels as table public.labels;`) atau perintah ekspor;
   2. **PERUBAHAN** — skrip migrasi;
   3. **CEK** — query untuk memastikan hasilnya benar + hasil yang diharapkan;
   4. **BATALKAN (rollback)** — dijalankan hanya bila ada masalah.
   Setiap migrasi **dijelaskan dulu dengan bahasa awam dan baru dijalankan setelah pemilik proyek bilang "lanjutkan"** — dijalankan pemilik proyek di SQL Editor, atau oleh Claude lewat sambungan Supabase bila pemilik proyek mengizinkan untuk migrasi itu. Skrip disimpan sebagai file bernomor `supabase/migrations/NNNN_nama.sql` di commit yang sama.
9. **Struktur tabel database dirancang oleh Claude.** Sebelum menulis SQL yang menyentuh tabel lama, baca struktur terbaru langsung dari database (query **SELECT** saja) — jangan menebak kolom.
10. **Vercel**: pengaturan (variabel lingkungan, domain, proteksi) hanya diubah setelah dijelaskan & disetujui. Domain & pengalihan lama **tidak pernah** diubah. Rahasia (kunci Supabase *service role*, token Google) **tidak pernah** ditulis di kode atau chat; bila nilainya perlu diisi, pemilik proyek menempelkannya sendiri di **Vercel → Settings → Environment Variables** dengan panduan Claude.
11. Akhiri setiap giliran dengan format tetap:
    - **Yang berubah** (daftar file + aksi, nomor commit),
    - **Cara memasang** (biasanya: tidak perlu apa-apa / langkah yang harus dilakukan pemilik proyek),
    - **Cara mengecek** (di link Preview / query CEK),
    - **Langkah berikutnya**.

---

## 2. BEKERJA DI DALAM KODE YANG SUDAH ADA (WAJIB)

Website `Sarana-Multi-Kalibrasi` **sudah dipakai** (± 3.934 label QR aktif tertempel di alat rumah sakit). Tera SMK **ditambahkan** ke dalamnya, bukan menggantikannya.

1. **Fase 0 dulu**: audit kode **tanpa mengubah apa pun** (dari repo yang tersambung ke Project, atau file yang ditempel pemilik proyek), tulis hasilnya sebagai dokumen `docs/audit-fase0.md`, tunggu persetujuan.
2. **Jangan merapikan, memformat ulang, atau mengubah modul lain** (SPH, label, keuangan, aset, ASPAK) kecuali PRD memintanya.
3. Kode Tera SMK dikumpulkan di folder sendiri (mis. `src/tera/`), dan modul lama hanya disentuh di titik sambungan yang disebut PRD (penjadwalan, Selia, BAP, penagihan, label).
4. Ikuti pola yang sudah ada: Vite + React + TypeScript + Tailwind, API server Express di `api/` (Vercel serverless), Supabase.
5. **Acuan struktur database = database langsung.** File `supabase_schema.sql` di repo **sudah usang**. Tabel asli berbahasa Indonesia (`rumah_sakit`, `jadwal_kalibrasi`, `labels`, `dokumen_bap`, dst.).
6. Kerja langsung di **`main`** dengan pengaman 2A; cek di deployment produksi setelah push.
7. Kode harus lolos build (TypeScript tanpa error) sebelum di-commit, dan lolos build Vercel. Bila Vercel gagal, perbaiki dari log build.
8. **Bahan acuan** (Master LKK v12, Report All, golden file, kop, contoh BAP/BASTP, MK Kemenkes) ada di **Project knowledge** (diunggah pemilik proyek) dan di folder laptop `_referensi/` — susunan lengkap di PRD Lampiran E. Bila file yang dibutuhkan belum diunggah, **minta** pemilik proyek mengunggahnya; jangan menebak isinya.
9. **Repo `Sarana-Multi-Kalibrasi` publik** (sampai pemilik proyek menjadikannya Private): **`_referensi/`, `.env`, dan data pelanggan TIDAK BOLEH di-commit.** Pastikan `_referensi/` ada di `.gitignore` sebelum commit pertama, dan cek `git status` sebelum setiap commit.
10. Golden file Excel adalah acuan angka. Kalau hasil aplikasi berbeda dengan golden file, **cari dulu penyebabnya di Excel** (sel terkunci, teks berspasi, rujukan rusak) dan laporkan — jangan menyesuaikan rumus aplikasi agar sama dengan kesalahan Excel.
11. Uji hitungan (golden file) ditulis sebagai file test di repo dan dijalankan Claude sebelum commit; cara mengecek manual (angka yang harus muncul di layar) tetap dijelaskan.

---

## 3. TEKNOLOGI (jangan diganti tanpa izin)

| Bagian | Teknologi |
|---|---|
| Website & Tera SMK | **Vite + React + TypeScript** (yang sudah ada di repo), React Router |
| Gaya | **Tailwind CSS** (sudah ada), token warna Ocean untuk Tera SMK |
| PWA | **Dua** Web App Manifest + Service Worker: **Manajemen Aset SMK** (*scope* `/admin/`) & **Tera SMK** (*scope* `/tera/`), masing-masing punya `id`, nama, ikon sendiri |
| Database lokal perangkat | **IndexedDB** (disarankan lewat pustaka **Dexie**) |
| Server | API Express yang sudah ada (`api/index.ts`, Vercel) dan/atau Supabase Edge Function — dipilih di Fase 0 |
| Database cloud, login, file | **Supabase** project produksi `qr-label-kalibrasi`, dengan RLS |
| Animasi | **`motion`** (sudah ada di repo) |
| Ikon | **lucide-react** (sudah ada), gaya *outline* |
| Font antarmuka | **Inter** (OFL) |
| Font isi sertifikat | **Carlito** (OFL, ukuran identik Calibri) |
| Scan QR | Kamera browser (komponen scanner yang sudah ada di repo boleh dipakai ulang) |
| PDF sertifikat | Dibuat **di server** setelah ACC, kop resmi ditempel sebagai latar halaman |

DILARANG: Google Sheets/Drive sebagai **database**; membundel font Microsoft (Calibri, Arial Black, Segoe UI) atau SF Pro; menyimpan kunci *service role* di kode browser (awalan `VITE_`).

Google Drive **hanya** dipakai sebagai **salinan cadangan PDF** (PRD F9.4):
- Folder induk: **"SERTIFIKAT PT.SMK"** (ID `16Jq1_mHM8AMIa2TF8_bGcKwbPUqBWcM8`, milik ridhwanwell@gmail.com), subfolder per **BO – Nama RS**.
- Sambungan dari server memakai OAuth akun tersebut; aplikasi Google wajib berstatus **Production** (status *Testing* membuat token kedaluwarsa tiap 7 hari); izin (*scope*) seminimal mungkin; token hanya di server.
- Akun Gmail biasa: **service account tidak bisa** menyimpan file di Drive pribadi (tidak punya kuota) — jangan dipakai.
- Drive gagal tidak boleh menggagalkan ACC/QR; coba ulang otomatis & catat di log.

---

## 3A. DOMAIN & DUA PWA (WAJIB)

1. **Satu domain `saranamultikalibrasi.com`, satu Vercel project, satu kode.** Jangan membuat project/domain baru tanpa izin.
2. **Manajemen Aset SMK** = PWA dengan *scope* `/admin/`. Bisa dipasang & cepat dibuka; data tetap butuh internet; saat offline tampil pesan jelas.
3. **Tera SMK** = PWA dengan *scope* `/tera/`, offline penuh (bagian 5).
4. Login diarahkan per role: `teknisi` → `/tera`, role kantor → `/admin`. Dicek juga di server.
   - Konvensi email: kantor **`@smk.co.id`**, teknisi **`@tera.smk`**. **Role adalah penentu akses**; email harus konsisten dengan role (cek saat Developer membuat akun).
   - Akun `@tera.smk` dibuat pemilik proyek langsung di Supabase Auth. Database **hanya mengizinkan 4 role** (`chk_profiles_official_role`); menambah `teknisi` adalah tugas Tahap 1 (backup + izin dulu). **Jangan** memberi akun `@tera.smk` role kantor sebagai jalan pintas.
   - Website menolak akun tanpa baris `profiles` / role resmi ("Akun belum diaktifkan") — pertahankan perilaku aman ini. Ada trigger `trg_prevent_profile_role_escalation` — jangan dilemahkan.
   - `@tera.smk` bukan email sungguhan: akun dibuat Developer (langsung aktif, tanpa email konfirmasi), lupa kata sandi direset Developer, wajib ganti kata sandi saat login pertama.
   - **Tera SMK tidak punya menu pengaturan/Selia/kalibrator** — itu semua di Manajemen Aset SMK.
5. **Halaman publik scan QR** (`/sertifikat/…`, `/scan/…`, `/verifikasi/…`, `/cert/…`, `/label/…`, dan `/`) **di luar kedua PWA** dan **tidak boleh di-cache** service worker.
6. **JANGAN menghapus atau mengubah domain/pengalihan di Vercel.** Stiker lama memakai alamat berbeda-beda: `saranamultikalibrasi.com`, `www.saranamultikalibrasi.com`, `manajemen-aset-smk.vercel.app`, `qrcode-smk.vercel.app`, `smk-labelqr.vercel.app`. Semuanya harus tetap membuka sertifikat.
7. Label **baru** dicetak dengan alamat `https://saranamultikalibrasi.com/sertifikat/…`.
8. Karena satu domain, kedua PWA berbagi sesi login & penyimpanan browser di perangkat yang sama. Data Tera SMK disimpan di database IndexedDB **sendiri** (nama berawalan `tera_`), terpisah dari cache Manajemen Aset.

---

## 4. DATABASE TUNGGAL — ATURAN PENGAMAN (WAJIB)

Pengembangan memakai **database produksi** (keputusan pemilik). Karena itu:

1. Data Tera SMK di **tabel baru berawalan `tera_`**.
2. Tabel lama **hanya boleh ditambah kolom**. **Dilarang** menghapus/mengganti nama kolom atau tabel lama, mengubah tipe kolom, atau menghapus baris lama.
3. **Dilarang** mengubah baris `labels` lama di luar alur ACC Tera SMK (PRD F9).
4. **Backup sebelum setiap migrasi** — selalu blok BACKUP lebih dulu (lihat 2A.8).
5. Setiap migrasi: file bernomor di `supabase/migrations/` + blok **BATALKAN** tertulis.
6. Setiap migrasi **dijelaskan dulu dengan bahasa awam & tunggu "lanjutkan"** sebelum SQL-nya diberikan untuk dijalankan.
7. Data uji memakai **BO `999`** dan `is_test = true`. Jangan pernah menguji dengan BO sungguhan.
8. Jangan menjalankan perintah yang menghapus data massal (`DELETE` tanpa `WHERE` yang jelas, `TRUNCATE`, `DROP`) di database.

---

## 5–8. OFFLINE & SINKRONISASI · PERAN PENGGUNA · NOMOR LABEL/SERTIFIKAT/QR · RIWAYAT PERUBAHAN (dipindah)
Baca `docs/aturan/offline-peran-nomor.md` hanya bila mengerjakan offline/sinkron, peran & hak akses, nomor label/sertifikat/QR, atau audit trail. Aturannya tetap berlaku (§5 Offline = PRIORITAS TERTINGGI).

---

## 9. SUMBER KEBENARAN & SERTIFIKAT (WAJIB) (dipindah)
Baca `docs/aturan/sertifikat.md` hanya bila mengerjakan sertifikat, teks sertifikat, kop, kalibrator/snapshot kalibrator, atau penyelia & tanda tangan. Aturannya tetap WAJIB.

---

## 10. ATURAN PERHITUNGAN

- Hasil aplikasi harus **SAMA dengan Excel**. Setiap jenis alat punya **uji otomatis golden file** (rata-rata, koreksi, U95, kesimpulan; selisih 0 setelah pembulatan).
- Data belum lengkap **tidak boleh** error/crash. Tampilkan "-".
- Kalibrator, sertifikat, budget = **data master**, bisa diubah Developer **tanpa ubah kode**.
- Setiap jenis alat = **satu template JSON** (metadata, kop, titik ukur, rumus, toleransi MK, kalibrator, pemetaan ke nama katalog SPH).
- **Tidak ada** form per alat yang ditulis manual di kode.
- Hitungan berjalan di perangkat **tanpa internet**. Server memakai **mesin hitung yang sama** (satu kode bersama) untuk pemeriksaan & PDF.
- **Pemindai AI**: warna kuning/merah dari perbandingan angka **deterministik**. LLM hanya boleh membantu keterangan; tidak memutuskan warna, tidak mengubah data, tidak menentukan LAIK. Tidak memeriksa copy-paste antar-LKK.

---

## 11. BAP, BASTP & PENAGIHAN (dipindah)
Baca `docs/aturan/bap-penagihan.md` hanya bila mengerjakan BAP, BASTP, rekap, atau sambungan penagihan.

---

## 12. KINERJA & KESTABILAN (WAJIB)

- **Offline-first**: semua layar Tera SMK membaca dari IndexedDB, bukan menunggu internet. Buka LKK, isi, pindah halaman harus **instan**.
- Sinkron di latar belakang, **TIDAK PERNAH mengunci layar**.
- Setiap permintaan internet punya **timeout**. Lewat → pesan jelas (*"Server tidak merespons. Data aman di perangkat, akan dicoba lagi otomatis."*), coba ulang otomatis. **Tidak ada loading tanpa akhir.**
- Setiap loading punya **keterangan**.
- Daftar panjang memakai **list virtual** (mis. `@tanstack/react-virtual`), item di-*memo*.
- Error **tidak boleh** membuat halaman putih/crash: pakai Error Boundary (sudah ada di repo), pesan bahasa awam, data tetap aman.
- Catat error & kejadian macet ke log yang bisa dilihat Developer.
- Service worker Tera SMK hanya untuk `/tera/`, service worker Manajemen Aset hanya untuk `/admin/`. **Halaman publik scan QR tidak pernah di-cache.**
- Sebelum setiap tahap selesai, **uji di HP & tablet kantor**: buka layar, isi LKK penuh, kirim banyak LKK, sinyal putus-sambung, tutup paksa, putar tablet, mode HP. Laporkan hasilnya.

---

## 13. DESAIN UI/UX (Tera SMK) (dipindah)
Baca `docs/aturan/ui-ux.md` hanya bila membuat atau mengubah layar (palet Ocean, font, warna status, tata letak HP/tablet, komponen, logo & ikon PWA, pemeriksaan sebelum serah).

---

## 14–15. BACKUP DATA · PELAJARAN DARI APLIKASI LAMA (ECalib_SMK) (dipindah)
Baca `docs/aturan/lain.md` hanya bila mengerjakan backup data, atau merancang fitur yang mirip aplikasi lama (ECalib_SMK).

---

## 16. URUTAN PENGERJAAN

Kerjakan satu per satu, tunggu kata **"lanjutkan"** di tiap tahap. **Cakupan awal = 5 alat** (Sphygmomanometer [diulang setelah Master Excel disesuaikan], Kelistrikan, Timbangan Bayi Digital, Suction Pump, Thermohygrometer) sampai Tahap 10; alat lain = Tahap 11 (satu per satu setelah pemilik proyek mengunggah Master Excel + MK + Report All). Rincian & kriteria: PRD bagian 9.

0. **Pengaman & audit** tanpa mengubah kode (`docs/audit-fase0.md`), backup, aturan migrasi, BO uji 999.
1. **Dua PWA** di `saranamultikalibrasi.com`: Manajemen Aset SMK (`/admin`) & Tera SMK (`/tera`); role `teknisi`, login & pengalihan per role, tema Ocean, tata letak HP/tablet.
2. **Offline + sinkron** + 🟡🔵🟢 + Backup ke file. Uji semua skenario **SEBELUM** lanjut.
3. **Push jadwal**: label cadangan, mode sertifikat, tombol Push.
4. **Sphygmomanometer** lengkap: LKK (scan/ketik, alat tambahan) → Selia → ACC → PDF Non-KAN → QR + Drive → koreksi pasca-ACC. Wajib lolos "sama dengan Excel".
   - **Sebelum membuat template**: tinjau **budget ketidakpastian** Master Sphygmomanometer — U95 4,1–6,6 mmHg lebih besar dari toleransi ±3 mmHg (PRD 11.45). Jelaskan penyebabnya dengan bahasa awam, usulkan perbaikan, **tunggu persetujuan**, lalu terapkan ke template **dan** golden file.
   - Masukkan juga perbaikan Excel yang sudah ditemukan (PRD 11.43): sel isian tidak terkunci, teks "Baik" tanpa spasi + pilihan Baik/Tidak Baik, rujukan satu sel.
5. **BAP & BASTP otomatis** + sambungan penagihan.
6. **4 alat lain dari 5 alat awal**: Timbangan Bayi Digital (uji kop KAN bila kop sudah diputuskan), Thermohygrometer, Suction Pump, Kelistrikan.
7. Pemindai AI & highlight.
8. Menu pengaturan lengkap di **Manajemen Aset SMK** (bukan di Tera SMK).
9. Backup mingguan terverifikasi + log.
10. Uji lapangan di HP & tablet kantor; kurangi akun `admin_utama` menjadi Ridhwan saja.
11. **Perluasan alat** (setelah Tahap 10): pemilik proyek mengunggah Master Excel, MK & Report All per alat → template JSON + golden file + PDF disetujui.
