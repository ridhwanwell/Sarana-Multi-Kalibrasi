# CLAUDE.md — Tera SMK (sub-website PWA LKK Digital di dalam `qrcode-smk`)

> File ini adalah **aturan kerja untuk Claude** (Claude Code / Project "TERA-SMK"). Semua aturan di sini WAJIB diikuti.
> **Cara kerja proyek ini (diperbarui 18 Okt 2026): Claude (lewat Claude Code) menulis kode, menguji build, dan commit langsung ke cabang `tera-dev`. Claude boleh menggabungkan `tera-dev` ke `main` **hanya setelah pemilik proyek mengecek Preview dan membalas "oke"** (diubah 19 Okt 2026). Perubahan database & pengaturan Vercel dijelaskan dulu dan baru dijalankan setelah kata "lanjutkan"** (lihat bagian 2A).
> Kalau ada aturan yang bertentangan dengan permintaan baru, tanyakan dulu ke pemilik proyek.
> Kebutuhan produk, kriteria terima, model data, dan uji penerimaan ada di **`PRD.md`** — baca bersama file ini.
> **PRD Draf 3 (18 Oktober 2026).** Keputusan pemilik produk ada di PRD bagian 11 — jangan ditanyakan ulang.

---

## 0. IDENTITAS

| Item | Isi |
|---|---|
| Nama tampilan (ikon PWA, judul) | **Tera SMK** |
| Nama resmi | **TERA — Teknologi Evaluasi & Rekam Alkes** |
| Slogan | ***Tertelusur · Efisien · Rapi · Akurat*** |
| Pemilik | PT Sarana Multi Kalibrasi |
| Rumah kode | Repo **`ridhwanwell/qrcode-smk`** (website "Manajemen Aset SMK" yang sudah berjalan) |
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

## 2A. CARA KERJA: CLAUDE CODE MENULIS & COMMIT KE `tera-dev`, PEMILIK PROYEK MENYETUJUI (WAJIB)

> Diperbarui 18 Oktober 2026 (keputusan pemilik proyek, menggantikan cara "pemilik proyek menyalin kode lewat GitHub web"). Pemilik proyek **bukan programmer** dan memantau/menyetujui dari iPhone (GitHub di Safari, link Preview Vercel, Supabase SQL Editor).

1. **Satu langkah = sedikit file.** Maksimal ±3 file kode per giliran. Pekerjaan besar dipecah jadi beberapa giliran.
2. **Cabang** *(diubah 19 Okt 2026 atas permintaan pemilik proyek)*: semua pekerjaan dikerjakan, di-commit, dan di-push ke **`tera-dev`**. Claude **boleh** menggabungkan `tera-dev` ke **`main`**, tetapi dengan urutan wajib:
   1. Claude memastikan build Vercel `tera-dev` **READY**, lalu meminta pemilik proyek **mengecek link Preview** dengan daftar cek bernomor (apa yang dibuka, apa yang harus terlihat).
   2. Claude **menunggu balasan "oke"** yang jelas untuk penggabungan itu. Kata "lanjutkan" saja **bukan** izin merge; diam/tanpa jawaban juga bukan izin.
   3. Baru setelah "oke": merge `tera-dev` → `main` dengan *merge commit* (bukan squash, bukan force push), push, lalu cek deployment produksi READY dan uji cepat `saranamultikalibrasi.com` (scan QR lama, `/admin/login`, `/tera/`).
   4. Bila produksi bermasalah: laporkan segera dan tawarkan *Promote* deployment produksi sebelumnya di Vercel (dijalankan setelah disetujui).
   Claude **tidak pernah** commit langsung ke `main`, tidak pernah `push --force` ke `main`, dan tidak merge cabang lain selain `tera-dev`.
3. **Sebelum mengubah file yang sudah ada**, Claude membaca isinya dari repo (bukan dari ingatan).
4. **Sebelum setiap commit**: jalankan `npm run build` (dan `npm run lint` bila relevan) sampai lolos, lalu cek `git status` — **`_referensi/`, `.env`, dan data pelanggan tidak boleh ikut** (repo publik).
5. **Pesan commit** singkat, bahasa Indonesia, diawali tahap, contoh: `Tahap 1: tambah halaman login Tera SMK`.
6. Setiap langkah diakhiri **cara mengecek** di link Preview Vercel cabang `tera-dev` → apa yang harus terlihat. Bila build Vercel gagal, Claude membaca log build dan memperbaikinya.
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

Website `qrcode-smk` **sudah dipakai** (± 3.934 label QR aktif tertempel di alat rumah sakit). Tera SMK **ditambahkan** ke dalamnya, bukan menggantikannya.

1. **Fase 0 dulu**: audit kode **tanpa mengubah apa pun** (dari repo yang tersambung ke Project, atau file yang ditempel pemilik proyek), tulis hasilnya sebagai dokumen `docs/audit-fase0.md`, tunggu persetujuan.
2. **Jangan merapikan, memformat ulang, atau mengubah modul lain** (SPH, label, keuangan, aset, ASPAK) kecuali PRD memintanya.
3. Kode Tera SMK dikumpulkan di folder sendiri (mis. `src/tera/`), dan modul lama hanya disentuh di titik sambungan yang disebut PRD (penjadwalan, Selia, BAP, penagihan, label).
4. Ikuti pola yang sudah ada: Vite + React + TypeScript + Tailwind, API server Express di `api/` (Vercel serverless), Supabase.
5. **Acuan struktur database = database langsung.** File `supabase_schema.sql` di repo **sudah usang**. Tabel asli berbahasa Indonesia (`rumah_sakit`, `jadwal_kalibrasi`, `labels`, `dokumen_bap`, dst.).
6. Kerja di cabang **`tera-dev`**; cek di **Vercel Preview**; digabung ke `main` oleh Claude hanya setelah pemilik proyek membalas "oke" (lihat 2A).
7. Kode harus lolos build (TypeScript tanpa error) sebelum di-commit, dan lolos build Vercel. Bila Vercel gagal, perbaiki dari log build.
8. **Bahan acuan** (Master LKK v12, Report All, golden file, kop, contoh BAP/BASTP, MK Kemenkes) ada di **Project knowledge** (diunggah pemilik proyek) dan di folder laptop `_referensi/` — susunan lengkap di PRD Lampiran E. Bila file yang dibutuhkan belum diunggah, **minta** pemilik proyek mengunggahnya; jangan menebak isinya.
9. **Repo `qrcode-smk` publik** (sampai pemilik proyek menjadikannya Private): **`_referensi/`, `.env`, dan data pelanggan TIDAK BOLEH di-commit.** Pastikan `_referensi/` ada di `.gitignore` sebelum commit pertama, dan cek `git status` sebelum setiap commit.
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

## 5. MODE OFFLINE & SINKRONISASI — PRIORITAS TERTINGGI

Aplikasi lama pernah **kehilangan data** saat sinkron. **Ini tidak boleh terulang.**

1. **Setiap isian langsung disimpan** ke IndexedDB (auto-save per isian, bukan hanya saat "Selesai").
2. Setiap LKK punya **UUID yang dibuat di perangkat** (kirim ulang tidak membuat data dobel).
3. **Satu LKK dikirim utuh sebagai satu paket** + checksum. Tidak boleh ada LKK terkirim setengah.
4. Status: 🟡 **Tersimpan di perangkat** → 🔵 **Sedang dikirim** → 🟢 **Diterima server**. Hijau **HANYA** setelah server mengonfirmasi data utuh (checksum & jumlah titik ukur cocok).
5. Kirim **otomatis tanpa tombol**: saat sinyal kembali, saat aplikasi dibuka, dan berkala selama aplikasi terbuka, jeda makin lama tiap gagal (5 s, 15 s, 1 m, 5 m, maks 15 m).
6. **Background Sync** service worker hanya **tambahan**. Sistem harus tetap benar walau Background Sync tidak jalan.
7. Minta **izin penyimpanan permanen** (`navigator.storage.persist()`) dan wajibkan PWA **dipasang ke layar utama**. Kalau belum: banner peringatan yang jelas.
8. Data di perangkat **TIDAK BOLEH dihapus** sebelum hijau — termasuk saat **update versi** aplikasi/service worker.
9. Selama ada LKK belum hijau: peringatan tampil dan **logout diblokir**.
10. Tombol **"Backup ke file"** sebagai cadangan darurat. **Draft juga dicadangkan otomatis ke server** (`tera_lkk_drafts`, maks tiap 60 s & saat aplikasi ditutup) — cadangan saja, tidak masuk Selia (PRD F4.16).
11. **Tidak ada tombol Upload manual.**
12. Nomor label ganda: **ditolak** dengan pesan jelas *(diubah 19 Okt 2026 atas permintaan pemilik proyek)*. LKK-nya **tetap aman di perangkat** (chip merah, bisa diperbaiki), salinan kiriman disimpan di `tera_sync_conflicts`, mesin kirim berhenti mencoba ulang sampai nomor diperbaiki. Tidak boleh ada penolakan diam-diam.
13. Server **tidak menolak** LKK berisi kalibrator expired (data tidak boleh hilang): simpan, beri penanda merah, ACC ditolak.
14. Pemindaian AI berjalan **setelah** 🟢 dan terpisah dari sinkron.
15. **Uji wajib** sebelum tahap sinkron selesai: sinyal putus di tengah kirim, tab/aplikasi ditutup paksa, HP mati, ≥ 50 LKK sekaligus, sinyal putus-sambung, memori hampir penuh, update versi saat ada data 🟡.

Pesan untuk teknisi (pelatihan & tampil di aplikasi): **jangan "Hapus data situs/cache" Chrome** selama masih ada LKK belum hijau.

---

## 6. PERAN PENGGUNA

| Role (`profiles.role`) | Sebutan | Masuk ke | Ringkas |
|---|---|---|---|
| `admin_utama` | **Developer** (Ridhwan) | Semua | Semua fungsi; satu-satunya yang mengelola akun & "Buka koreksi" |
| `admin_teknik` | **Admin Teknik / Penyelia** | Manajemen Aset | Jadwal, label, Push ke Tera SMK, **Selia: edit (bukan isi dari awal)**, kembalikan, ACC, BAP/BASTP |
| `admin_keuangan` | Admin Keuangan | Manajemen Aset | Penagihan, PPN |
| `hanya_sph` | Admin SPH | Manajemen Aset (SPH) | SPH |
| **`teknisi`** (baru) | **Teknisi** | **Hanya `/tera`** | Isi LKK; tidak bisa membuka Manajemen Aset |

- Pembatasan akses **wajib di server/RLS**, bukan hanya menyembunyikan menu.
- Teknisi hanya melihat jadwal & LKK yang ditugaskan kepadanya.

### Alur status LKK
```
Draft (Teknisi) → Selesai/Dikirim → 🟢 → [Pemindaian AI] → Diperiksa Penyelia ──→ ACC → PDF → QR (+ salinan Drive)
                                                 │                                 │
               Dikembalikan untuk revisi ← ──────┘                                 ▼
               → Teknisi memperbaiki → Dikirim lagi                    TERKUNCI (siapa pun)
                                                                       └→ Ada kesalahan? "Buka koreksi": HANYA Developer,
                                                                          alasan wajib → betulkan → ACC ulang → PDF versi baru
                                                                          (nomor sama), QR ikut versi baru, PDF lama disimpan
```

---

## 7. NOMOR LABEL, NOMOR SERTIFIKAT & QR

- Format: **`BBB.NNNN`**, contoh **`200.0012`**.
  - **BBB** = nomor **BO** (juga nomor BAP, BASTP, faktur penagihan, kuitansi).
  - **NNNN** = alat ke-berapa (4 angka). PO 50 alat → `200.0001`–`200.0050`.
- Teknisi membawa **label cadangan** (mis. `200.0051`–`200.0070`) untuk **alat tambahan**.
- Teknisi mengisi nomor dengan **Scan stiker** (utama) atau **Ketik manual** (BO terisi otomatis, ketik 4 angka). Wajib validasi: dalam rentang utama/cadangan BO itu, belum dipakai di perangkat, konfirmasi besar sebelum disimpan.
- **Format link QR TIDAK BOLEH diubah.** Ribuan stiker sudah tertempel. Halaman publik scan QR dan alamat-alamatnya (`/sertifikat/…`, `/scan/…`, dst.) dipertahankan.
- Urutan tampilan QR: PDF Tera SMK versi terbaru → link Google Drive → "Sertifikat belum terbit".
- Dua **mode sertifikat per BO**: **Terintegrasi Tera SMK** atau **Manual link Google Drive** (alur lama). Generate label tanpa LKK tetap tersedia.

---

## 8. RIWAYAT PERUBAHAN (AUDIT TRAIL)

- Setiap perubahan oleh Penyelia/Developer pada LKK yang sudah dikirim **dicatat**: siapa, kapan, kolom, nilai lama, nilai baru, alasan.
- Wajib tercatat juga: "Buka koreksi" (alasan wajib; kosong ditolak database), perubahan selama koreksi, ACC ulang, penandaan "Sudah saya periksa".
- Riwayat **tidak dicetak** di sertifikat, **tidak bisa dihapus/diubah** siapa pun.

---

## 9. SUMBER KEBENARAN & SERTIFIKAT (WAJIB)

1. **Master LKK v12** adalah acuan rumus, titik ukur, toleransi, kalibrator, dan ketidakpastian.
2. Sheet **"Report All"** adalah format sertifikat. PDF harus **SAMA PERSIS**: kop, urutan tabel, teks, kolom, gaya judul, jumlah halaman.
   - Umumnya 3–4 halaman; lebih panjang: Auto Chemistry Analyzer, Bone Mineral Densitometer, MRI, X Ray C Arm (4), Defibrillator dengan Patient Monitor (5), Inkubator Bayi & Inkubator Transport (6).
   - **Hemodialisa** mengikuti format **Nipro**.
   - Acuan tampilan: **PDF dari pemilik proyek** bila ada (sudah ada: Sphygmomanometer, Defibrillator — dicetak dari iPhone, teksnya tidak bisa diekstrak, pakai sebagai acuan visual). Untuk alat lain: **buat sendiri PDF Report All dari Master v12** (mis. lewat LibreOffice), lalu **tunjukkan ke pemilik proyek untuk disetujui** sebelum dijadikan acuan.
   - Nama alat mengikuti **nama ASPAK Kemenkes** (data ASPAK sudah ada di repo: `src/data/aspakAlatMaster.ts`).
3. Metode kerja: **MK Kemenkes (KMK HK.02.02/D/43649/2024)**.
4. Ketidakpastian **GUM**: Tipe A = STDEV.S/√n; Tipe B = resolusi, sertifikat kalibrator (U95/2), drift; gabungan √Σu²; diperluas k = 2; 2 angka penting.
5. **LAIK / TIDAK LAIK PAKAI** dihitung otomatis dari toleransi MK, persis Excel.
6. Keselamatan listrik: berbaterai tanpa tabel; berkabel selalu diuji; hanya **Pacemaker** punya pilihan Ya/Tidak. Judul: "Pengujian Keselamatan Listrik / *Testing of Electrical Safety*" (Defibrillator dkk.: "(IEC 62353)").

### 9.1 Aturan teks sertifikat
- Tidak boleh memberi kesan sertifikat terdahulu tidak sesuai standar.
- **DILARANG** di judul/teks tabel: "Tambahan", "Additional", "sesuai KMK terbaru", "revisi", "diperbarui", "parameter baru", nomor KMK-MK di judul tabel.
- Judul tabel kinerja: **"Parameter Kinerja / *Performance Parameters*"**.
- Header: Indonesia **tebal**, di bawahnya Inggris *miring kecil (8 pt)*.
- Rujukan metode KMK cukup **satu kali** di paragraf "Alat ini dikalibrasi menggunakan metode KMK-MK-…".
- **Setiap teks baru yang tercetak di sertifikat wajib disetujui pemilik proyek dulu.**

### 9.2 Nilai sementara di Master v12 (diganti Developer tanpa ubah kode)
| Item | Sekarang | Nanti |
|---|---|---|
| U95 SpO2 & pulse rate, syringe 3 L, black body, manometer NeoPuff, radiometer UV, micrometer, SOLARMeter, Dialysis Reference Meter, mA X-ray | Spesifikasi pabrik / perkiraan | Nilai sertifikat |
| Koreksi Fetal Simulator 80 bpm (CTG) | Perkiraan −0,2 bpm | Bila sertifikat punya titik 80 bpm |
| Kalibrator belum bersertifikat | s/n, nomor sertifikat, ketertelusuran = "-" | Saat sertifikat dikirim |
| Kelompok blood bank | Kalibrator termokopel | Data logger suhu |
| Osiloskop | Belum dimiliki | Setelah dibeli |
| Ketidakpastian Kelistrikan, Glucose, TDS, Stadiometer, Vaporizer | Rusak (#REF!) sejak file asli | Dirapikan saat dibuat template |

### 9.3 Snapshot kalibrator
Perumpamaan: **fotokopi sertifikat kalibrator yang dijepret ke LKK**.
- Saat kalibrator dipilih, salinan lengkap (identitas, sertifikat, berlaku sampai, koreksi & U95, budget) disimpan ke `calibrator_snapshot`.
- Semua hitungan & PDF membaca **snapshot**, bukan master.
- Saat **ACC**, snapshot **dibekukan**. Perubahan master hanya untuk LKK baru.
- Kalibrator yang pernah dipakai tidak boleh dihapus, hanya dinonaktifkan.
- Master kalibrator memakai tabel **`aset_kalibrator`** yang sudah ada + `tera_calibrator_points` untuk koreksi & U95.

### 9.4 Kalibrator expired
- Diperiksa di perangkat (offline) terhadap **tanggal pelaksanaan** LKK.
- Expired → abu-abu, tidak bisa dipilih; "Selesai" ditolak. Server tetap menyimpan, penanda merah, ACC ditolak.
- Kalibrator belum bersertifikat (tanggal kosong) **tidak diblokir**.

### 9.5 Kop sertifikat (WAJIB)
- **Kop KAN** hanya untuk: **Timbangan Bayi Mekanik**, **Timbangan Bayi Digital**, **Timbangan Dewasa Mekanik** (di Master v12: *Timbangan Dewasa Analog*). **Semua alat lain: Kop Non-KAN.**
- Kop ditentukan oleh **template** (`kop: "KAN" | "NON_KAN"`), tidak pernah dipilih manual.
- Kop dipakai di **semua halaman**.
- Kop ditempel sebagai **latar halaman** dari file **PDF kop resmi** (disimpan di bucket `tera-assets`). Jangan menggambar ulang kop dengan kode.
- Isi sertifikat memakai **Carlito**.
- **Posisi isi tidak digeser** demi kop. Teks kaki yang bertumpuk dengan hiasan segitiga kiri bawah dan kotak "Nomor Order" yang mepet kop atas **memang begitu aslinya** — biarkan. Watermark SMK di tengah tetap di belakang isi.
- BAP/BASTP memakai **kop surat** resmi (PDF) dengan cara yang sama. Tata letak BASTP mengikuti contoh *BASTP Klinik Jantung Hasna Medika* (PRD F10.4): 30 baris/halaman, alat tambahan di halaman "TAMBAHAN".
- Alamat & telepon PT SMK di semua dokumen otomatis diambil dari **satu data master**. Alamat resmi: **Jl. Kenari 3 No. A3, Ngipang, Kadipiro, Banjarsari, Kota Surakarta 57136, Jawa Tengah**.

### 9.2a Nilai kalibrator tanpa sertifikat
- Diisi dari **datasheet pabrik / jurnal / sumber resmi lain**, dengan **sumber & referensi wajib dicatat** (judul, tautan, tanggal diambil).
- Cara memasukkannya ke budget mengikuti cara di Master v12 (jangan mengarang distribusi baru tanpa izin).
- Diganti nilai sertifikat begitu sertifikat tersedia (LKK lama tetap memakai snapshot).
- Alat **KAN** (3 timbangan) wajib memakai standar **bersertifikat**.
- Nilai kalibrator diubah lewat menu **aset kalibrator di Manajemen Aset SMK**, bukan di Tera SMK.

### 9.6 Penyelia & tanda tangan
- Nama penyelia diambil **otomatis dari akun yang meng-ACC**, tidak ditulis mati di kode.
- **Tidak ada** tanda tangan/paraf penyelia di PDF.
- Tanda tangan Manajer Teknik **Hafizh Pasifianto Utomo, S.Tr.T.** berupa **QR tanda tangan elektronik**, dicetak di ruang kosong di bawah "Disetujui oleh," **tepat di atas nama beliau di halaman 1**.
- QR **unik per sertifikat & per revisi**, berisi tautan ke halaman verifikasi resmi `saranamultikalibrasi.com` + **kode verifikasi acak** (tidak bisa ditebak dari nomor label).
- Halaman verifikasi menampilkan: nomor sertifikat, alat, merek/tipe/SN, RS, tanggal kalibrasi, hasil, "Ditandatangani secara elektronik oleh Hafizh Pasifianto Utomo, S.Tr.T. (Manajer Teknik)", tanggal & jam ACC, revisi, status **Berlaku** / **Digantikan**.
- Halaman verifikasi **tidak di-cache** service worker; boleh memakai ulang halaman publik `/verifikasi/…` yang sudah ada.
- Nama, gelar, jabatan = **data master** (`tera_signatories`), dibekukan saat ACC. Bukan BSrE. Tidak memakai gambar tanda tangan.

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

## 11. BAP, BASTP & PENAGIHAN

- **Nomor BAP = nomor BO** (BASTP juga, kecuali pemilik proyek memutuskan lain). Bulan romawi mengikuti **tanggal dokumen**.
- BAP: per jenis alat → Volume PO, Realisasi, Sisa, Keterangan; baris alat tambahan terpisah; TOTAL UNIT.
  - Realisasi = LKK alat itu yang sudah **🟢 diterima server**, termasuk TIDAK LAIK.
  - Keterangan sisa: **"Belum selesai"** selama jadwal berjalan → **"Batal"** saat jadwal ditutup.
- BASTP: per alat → nama, merek, tipe, SN, teknisi (nama + gelar dari master `teknisi`), tanggal kalibrasi, hasil.
- PDF **2 rangkap** (instansi & kantor). Kalimat tidak boleh terpotong. Bagian "hari/tanggal/bulan/tahun" terisi lengkap atau kosong semua.
- Nama alat dari **katalog yang ejaannya benar**.
- Penagihan: **TIDAK LAIK tetap ditagih**, **Batal tidak ditagih**, **alat tambahan memakai harga SPH yang sudah DEAL** (bukan harga master), **PPN dari data master** (saat ini 11%).
- Data `is_test` (BO 999) **tidak boleh** masuk BAP, BASTP, atau penagihan sungguhan.

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

## 13. DESAIN UI/UX (Tera SMK)

> **Gunakan skill `ui-ux-pro-max`** setiap membuat/mengubah tampilan (stack: web React + Tailwind) dan jalankan Pre-Delivery Checklist-nya sebelum menyerahkan kode layar.
> Keputusan di bagian ini (Ocean, Inter, tata letak) adalah **pilihan pemilik proyek** dan tidak boleh diganti rekomendasi skill.
> Bagian ini berlaku untuk **Tera SMK** dan **layar Selia** yang baru. Jangan mendesain ulang modul lain di Manajemen Aset.

### 13.1 Karakter
- **Flat Design modern**: bersih, padat, tanpa efek berat. Profesional, cepat, nyaman dipakai lama.
- Palet **"Ocean"** dari logo PT SMK (biru, cyan, abu/silver, putih).
- Animasi halus tapi **ringan** ("subtle", 3 dari 10).

### 13.2 Font
- **Inter** untuk semua teks antarmuka. Dilarang SF Pro / Segoe UI.
- Angka hasil ukur memakai **angka tabular** (`font-variant-numeric: tabular-nums`).

| Peran | Ukuran (px) | Tebal |
|---|---|---|
| Judul layar | 22 | 600 |
| Judul bagian | 17 | 600 |
| Teks isi / isian | 16 | 400 |
| Label & tombol | 14–15 | 500–600 |
| Keterangan | 13 | 400 |
| Minimum mutlak | 12 | — |

- Kotak isian minimal **16 px** (mencegah zoom otomatis di HP). Tinggi baris ±1,4–1,5×. Tata letak tidak rusak saat huruf diperbesar.

### 13.3 Warna — palet OCEAN
Dipakai lewat **token** (CSS variable / tema Tailwind), **tidak ditulis langsung** di komponen.

**Mode terang**
| Token | Hex | Pemakaian |
|---|---|---|
| `primary` | `#0B6FB3` | Header, tombol utama, link, tab aktif |
| `primaryPressed` | `#095C95` | Tombol utama saat ditekan |
| `onPrimary` | `#FFFFFF` | Teks di atas primary |
| `onPrimaryMuted` | `#E6F3FC` | Teks kecil di header |
| `accent` | `#29C5F6` | Garis bawah header, bilah kemajuan. **Hanya dekorasi, BUKAN teks** |
| `teal` | `#2DD4BF` | Ikon pendukung (teks teal pakai `#0F766E`) |
| `background` | `#EEF6FB` | Latar layar |
| `surface` | `#FFFFFF` | Kartu, panel, kotak isian |
| `text` | `#1E293B` | Teks utama |
| `textSecondary` | `#5B6B80` | Teks sekunder |
| `border` | `#D5DEE7` | Garis pemisah |
| `inputBorder` | `#7D8DA1` | Garis kotak isian |
| `focus` | `#0B6FB3` | Border isian aktif 2 px + cahaya cyan tipis |
| `silver` | `#B8C2CC` | Ikon nonaktif |
| `danger` | `#DC2626` | Hapus & error |

**Mode gelap**: `background #0B1220` · `surface #152033` · `text #E6EEF5` · `textSecondary #94A3B8` · `primary #3FA9F5` (teks di atasnya `#0B1220`) · `accent #29C5F6` · `inputBorder #6B7F99`.

Semua pasangan teks/latar minimal **WCAG AA** di kedua mode.

### 13.4 Warna status (JANGAN diubah)
| Status | Latar | Teks | Ikon |
|---|---|---|---|
| Tersimpan di perangkat | `#FEF3C7` | `#92400E` | jam |
| Sedang dikirim | `#DBEAFE` | `#1E40AF` | panah naik (beranimasi) |
| Diterima server | `#DCFCE7` | `#166534` | centang |
| Dikembalikan / revisi | `#EDE9FE` | `#5B21B6` | panah balik |
| Sudah ACC | `#0B6FB3` | `#FFFFFF` | segel |
| LAIK PAKAI | `#DCFCE7` | `#166534` | centang |
| TIDAK LAIK PAKAI | `#FEE2E2` | `#991B1B` (tebal) | tanda seru |

Status **selalu** chip **warna + ikon + tulisan**.

### 13.5 Tata letak — HP dan TABLET
Teknisi memakai **HP dan tablet**. Tampilan otomatis menyesuaikan lebar layar dan saat tablet diputar.

**HP (portrait, < 600 px)**
- Beranda: header biru (nama teknisi · jumlah "di perangkat" · status sinkron), garis cyan, daftar **RS aktif** satu kolom.
- Detail RS: daftar alat PO (PO · dikerjakan · sisa), tombol **"+ Alat tambahan"**, daftar LKK.
- Isi LKK: header (nama alat & nomor label), bilah kemajuan ("Bagian 3 dari 6 · Kinerja", bisa diketuk), kotak bacaan **2–3 per baris**, kotak hasil (Rata-rata · Koreksi · U95), chip LAIK/TIDAK LAIK, tombol **Kembali / Lanjut** menempel di bawah.
- Tab bawah: **Beranda · LKK · Akun**.

**Tablet portrait**: seperti HP, kotak bacaan **3 per baris**, jarak lebih lega.

**Tablet landscape**
- Beranda: menu samping kiri, daftar di tengah (±42%), ringkasan terpilih di kanan.
- Isi LKK: daftar bagian di kiri (±32%, centang hijau), isian di kanan **6 bacaan sebaris**, kotak hasil, Kembali / Lanjut.

**Umum**
- Urutan bagian LKK: **Identitas alat (nomor label) → Kondisi lingkungan → Pemeriksaan fisik & fungsi → Keselamatan listrik (bila ada) → Kinerja → Kesimpulan → Ringkasan & Selesai**.
- Memutar tablet / mengubah ukuran **TIDAK BOLEH** menghilangkan isian.
- Tombol aksi utama di **bawah / kanan bawah**.
- Hormati **safe area** (`env(safe-area-inset-*)`); daftar diberi jarak bawah agar tidak tertutup tombol/tab.
- Jarak kelipatan **4/8** (8 · 12 · 16 · 24 · 32).
- Layar **Selia** (laptop) memakai susunan landscape: daftar per RS/BO di kiri, detail LKK di kanan.

### 13.6 Komponen
- Sudut: kartu **14 px**, tombol & isian **12 px**, chip **pill**.
- Area sentuh minimal **48 × 48 px**; jarak antar-target ≥ 8 px.
- Umpan balik tekan 80–150 ms.
- **Kotak isian angka**: label selalu terlihat di atas; `inputmode="decimal"`; koma desimal Indonesia; border biru 2 px + cahaya cyan saat aktif; validasi saat pindah kotak, pesan error di bawah kotak.
- **Scan stiker**: tombol besar dengan ikon kamera; tampilan kamera penuh dengan bingkai bidik; tombol **"Ketik manual"** selalu terlihat; setelah terbaca → konfirmasi nomor dengan angka besar.
- Teks panjang (nama alat, RS) dipotong "…" dan **tidak menimpa** chip status; chip tidak menyusut.
- **Satu aksi utama per kartu**; aksi lain di menu titik tiga.
- **Hapus** terpisah, merah, wajib konfirmasi.
- **Dialog** hanya untuk aksi tak bisa dibatalkan (hapus, ACC, Buka koreksi). Selebihnya **toast** dengan "Batalkan".
- Ikon lucide-react *outline*, ukuran 16 / 20 / 24. **Tidak ada emoji sebagai ikon.**
- Tombol ikon tanpa tulisan wajib punya `aria-label`.
- Keadaan kosong berisi ajakan jelas, misal *"Belum ada jadwal. Hubungi Admin Teknik."*
- Kartu & latar **padat**: tidak transparan, tanpa bayangan tebal.

### 13.7 Animasi
- Tombol mengecil **0,97** saat ditekan; getar halus (`navigator.vibrate`, bila tersedia) untuk aksi penting.
- Daftar muncul **fade + geser 8–12 px**, 200–300 ms, jeda antar-item ±40 ms.
- Chip status berganti lembut; **centang beranimasi** saat "Diterima server".
- Ikon "Sedang dikirim" berdenyut pelan.
- Perpindahan halaman ≤ 300 ms; keluar lebih cepat dari masuk.
- Hanya animasikan **transform & opacity**.
- Tidak ada blur, bayangan berat, latar bergerak.
- Ikuti **`prefers-reduced-motion`**.

### 13.8 Aksesibilitas
- Kontras WCAG AA di mode terang & gelap.
- Urutan fokus keyboard/pembaca layar = urutan tampilan.
- Informasi tidak hanya lewat warna.
- Tombol nonaktif jelas terlihat nonaktif; lebih baik tetap aktif lalu memberi tahu apa yang kurang.

### 13.9 Logo & ikon PWA
- **Tera SMK memakai logo Tera SMK** (lingkaran roda gigi + huruf T + garis detak jantung, tulisan "TERA SMK"). File dari pemilik proyek ada di folder paket `_logo/` → **salin ke `public/tera/`** (logo boleh publik):
  - `tera-smk-logo-transparan.png` (logo lengkap, latar transparan) — layar login/splash & "Tentang aplikasi"
  - `tera-smk-logo-latar-putih.png` — dokumen/presentasi
  - `tera-smk-emblem-transparan.png` (lambang saja, persegi) — header kecil
  - `tera-icon-192.png`, `tera-icon-512.png`, `tera-icon-maskable-512.png`, `tera-apple-touch-icon-180.png` — **ikon PWA Tera SMK** (lambang di atas latar putih)
- **Manajemen Aset SMK memakai logo PT SMK** yang sudah ada di repo (`public/logo-smk.svg`, versi gelap `logo-smk-darkbg.svg`). Ikon PWA-nya dibuat dari logo itu di atas latar putih.
- Jangan ubah proporsi/warna logo. Logo Tera SMK berupa gambar (bukan vektor): pakai ukuran asli atau lebih kecil, jangan diperbesar.
- Desain ulang tampilan Manajemen Aset **tidak** termasuk; hanya dijadikan PWA.

### 13.10 Pemeriksaan sebelum menyerahkan setiap layar
- [ ] Tulisan tidak bertumpuk/terpotong di **HP, tablet portrait, tablet landscape**, termasuk huruf diperbesar
- [ ] Kontras AA di mode terang & gelap
- [ ] Area sentuh ≥ 48 px, ada umpan balik saat ditekan
- [ ] Tidak ada kartu/latar transparan atau efek berat
- [ ] Status memakai chip warna + ikon + tulisan
- [ ] Animasi halus, menghormati reduced motion
- [ ] Data tidak hilang saat tablet diputar / tab dimuat ulang
- [ ] Safe area dihormati
- [ ] Diuji langsung di HP & tablet kantor (Chrome Android)
- [ ] (Layar Selia) Highlight AI kuning/merah sesuai 13.11, tidak tampil di layar teknisi

### 13.11 Highlight AI pra-penyeliaan (layar Selia)
Hanya untuk Penyelia & Developer. Tidak tampil ke teknisi, tidak dicetak.

| Level | Kapan | Latar sel | Garis kiri (3 px) | Teks | Ikon | Label |
|---|---|---|---|---|---|---|
| **Kuning — Peringatan** | Hasil ukur **mendekati** batas toleransi (bawaan ≥ 80%, masih ≤ toleransi) atau pengulangan tidak konsisten | `#FEF3C7` | `#D97706` | `#92400E` | segitiga peringatan | "Mendekati batas" |
| **Merah — Eror/Kerusakan** | **Melewati** toleransi (alat tidak laik), lingkungan di luar kewajaran, kalibrator expired, kemungkinan salah ketik | `#FEE2E2` | `#DC2626` | `#991B1B` tebal | tanda seru dalam lingkaran | "Melewati batas" / "Lingkungan di luar batas" / "Kalibrator expired" / "Cek salah ketik" |

Mode gelap: kuning → latar `#3B2A0A`, garis `#F59E0B`, teks `#FCD34D`; merah → latar `#3B1215`, garis `#F87171`, teks `#FCA5A5`.

- Selalu warna + ikon + tulisan; keterangan: nilai, batas, selisih, sumber batas.
- Daftar LKK: chip jumlah penanda, merah dulu; filter "Ada penanda merah".
- Detail: sel ditandai; titik warna di daftar bagian; tombol **"Ke penanda berikutnya"**.
- Status pemindaian: chip abu "Sedang dipindai…", "Belum dipindai", "Gagal dipindai — dicoba lagi otomatis".
- **"Sudah saya periksa"** per penanda → tetap terlihat dengan centang.
- Merah karena **melewati toleransi** bukan error data: ACC tetap boleh setelah dipastikan. Yang memblokir ACC: kalibrator expired, lingkungan di luar batas, nomor label ganda.
- Muncul dengan fade 200 ms sekali; tidak berkedip.

---

## 14. BACKUP DATA

- Selain backup harian Supabase, **ekspor otomatis MINGGUAN** (data LKK CSV/JSON + PDF sertifikat) ke bucket privat **`tera-backups`**.
- **Terverifikasi**: manifest (jumlah LKK, jumlah PDF, checksum) dicocokkan otomatis; gagal → ulang otomatis + status **"Backup gagal"** merah di menu Developer + log.
- Simpan **12 backup terakhir**; uji pulih otomatis tiap bulan.
- Tidak boleh ada backup yang gagal diam-diam.
- Panduan pemulihan: `docs/pemulihan.md`.

---

## 15. PELAJARAN DARI APLIKASI LAMA (ECalib_SMK) — JANGAN DIULANG

| Masalah di ECalib | Aturan di Tera SMK |
|---|---|
| Database Google Sheets/Drive → data tidak terupload semua | Supabase + antrean sinkron dengan konfirmasi server |
| Tombol Upload manual + pilih akun Google | Sinkron otomatis, tanpa tombol Upload |
| Excel diolah di perangkat → berat, macet | Hitungan dari template JSON |
| Layar loading mengunci aplikasi | Sinkron di latar belakang + timeout + coba ulang |
| Form per alat ditulis manual → rumus salah | Semua alat dari template data |
| Kartu transparan, latar ramai, kontras rendah | Kartu & latar padat, palet Ocean, kontras AA |
| Banyak tombol kecil, Hapus di samping Edit | 1 aksi utama, Hapus terpisah + konfirmasi |
| Status hanya tulisan berwarna | Chip warna + ikon + tulisan |
| Popup bertumpuk | Dialog hanya untuk aksi tak bisa dibatalkan |
| Format sertifikat berantakan | PDF sama persis Report All, kop resmi |

---

## 16. URUTAN PENGERJAAN

Kerjakan satu per satu, tunggu kata **"lanjutkan"** di tiap tahap. Rincian & kriteria: PRD bagian 9.

0. **Pengaman & audit** tanpa mengubah kode (`docs/audit-fase0.md`), backup, aturan migrasi, BO uji 999.
1. **Dua PWA** di `saranamultikalibrasi.com`: Manajemen Aset SMK (`/admin`) & Tera SMK (`/tera`); role `teknisi`, login & pengalihan per role, tema Ocean, tata letak HP/tablet.
2. **Offline + sinkron** + 🟡🔵🟢 + Backup ke file. Uji semua skenario **SEBELUM** lanjut.
3. **Push jadwal**: label cadangan, mode sertifikat, tombol Push.
4. **Sphygmomanometer** lengkap: LKK (scan/ketik, alat tambahan) → Selia → ACC → PDF Non-KAN → QR + Drive → koreksi pasca-ACC. Wajib lolos "sama dengan Excel".
   - **Sebelum membuat template**: tinjau **budget ketidakpastian** Master Sphygmomanometer — U95 4,1–6,6 mmHg lebih besar dari toleransi ±3 mmHg (PRD 11.45). Jelaskan penyebabnya dengan bahasa awam, usulkan perbaikan, **tunggu persetujuan**, lalu terapkan ke template **dan** golden file.
   - Masukkan juga perbaikan Excel yang sudah ditemukan (PRD 11.43): sel isian tidak terkunci, teks "Baik" tanpa spasi + pilihan Baik/Tidak Baik, rujukan satu sel.
5. **BAP & BASTP otomatis** + sambungan penagihan.
6. **Timbangan Bayi Digital** (uji kop KAN), lalu alat bertahap: tekanan/aliran → suhu → kelistrikan/sinyal → volume/massa → cahaya → radiologi.
7. Pemindai AI & highlight.
8. Menu pengaturan lengkap di **Manajemen Aset SMK** (bukan di Tera SMK).
9. Backup mingguan terverifikasi + log.
10. Uji lapangan di HP & tablet kantor; kurangi akun `admin_utama` menjadi Ridhwan saja.
