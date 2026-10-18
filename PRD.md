# PRD — Tera SMK
**Product Requirements Document · Sub-website PWA LKK Digital di dalam website PT Sarana Multi Kalibrasi (`qrcode-smk`)**

| | |
|---|---|
| Produk | **Tera SMK**: TERA, Teknologi Evaluasi & Rekam Alkes |
| Slogan | *Tertelusur · Efisien · Rapi · Akurat* |
| Pemilik produk | Ridhwan (Developer, PT SMK) |
| Dibangun dengan | **Claude Code** menulis kode, menguji build, dan commit ke cabang **`tera-dev`**; pemilik produk menyetujui & menggabungkan ke `main`; SQL dijalankan setelah persetujuan (CLAUDE.md 2A) |
| Rumah kode | Repo GitHub **`ridhwanwell/qrcode-smk`** · Vercel project **`qrcode-smk`** · Supabase project **`qr-label-kalibrasi`** |
| Dokumen pendamping | `CLAUDE.md` (aturan kerja & desain — WAJIB dibaca bersama PRD ini) |
| Acuan data | Paket **143 Master LKK v12** (`LKK-143_.zip`) |
| Domain | **saranamultikalibrasi.com** — dua PWA: **Manajemen Aset SMK** (`/admin`) & **Tera SMK** (`/tera`) |
| Status | **Draf 3 — Perencanaan (18 Oktober 2026)**. Belum ada kode. Mulai kerja hanya setelah pemilik produk bilang "lanjutkan". |

> **Cara membaca:** PRD ini menjelaskan **APA** yang dibangun dan **kapan dianggap selesai** (kriteria terima). **BAGAIMANA** bekerja, aturan desain, dan larangan ada di `CLAUDE.md`. Jika PRD dan CLAUDE.md bertentangan, **tanyakan ke pemilik produk**.

**Riwayat dokumen**

| Versi | Tanggal | Perubahan |
|---|---|---|
| Draf 1 | Oktober 2026 | Draf awal (aplikasi tablet Expo) |
| Draf 2 | 15 Oktober 2026 | Kalibrator expired, AI pra-penyeliaan, snapshot kalibrator, tanda tangan Manajer Teknik, koreksi pasca-ACC dengan izin Developer, backup terverifikasi |
| **Draf 3** | **18 Oktober 2026** | **Platform pindah ke PWA di dalam website `qrcode-smk` yang sudah berjalan.** Tambah: role Teknisi, push jadwal, nomor label scan/ketik, label cadangan & alat tambahan, dua mode sertifikat (Tera SMK / link Google Drive), kop KAN vs Non-KAN, BAP & BASTP otomatis, sambungan ke penagihan, aturan database tunggal, **dua PWA di satu domain** (Manajemen Aset SMK & Tera SMK). Semua keputusan Draf 2 tetap berlaku |

---

## 1. LATAR BELAKANG

PT SMK sudah punya website **Manajemen Aset SMK** (`qrcode-smk`) yang berisi: SPH, master RS & teknisi, penjadwalan kalibrasi, generate & cetak **label QR**, halaman publik scan QR, Selia, BAP, penagihan, aset kalibrator, dan keuangan. Yang sudah dipakai rutin: **generate label QR** (± 3.900 label).

Masalah yang tersisa:
1. **LKK masih di Excel** (143 file Master v12). Rumus rawan rusak, file tersebar.
2. **Sertifikat ke QR masih manual**: Excel → PDF halaman Report All → upload Google Drive → link ditautkan ke label. Lama dan rawan salah tautan.
3. **BAP/BASTP diisi manual**, realisasi tidak otomatis dari hasil lapangan, sehingga penagihan bisa tidak sesuai.
4. Aplikasi lama **ECalib_SMK** gagal: data hilang saat sinkron, rumus salah, format sertifikat berantakan, sering macet, tampilan sulit dibaca.

Website ini akan menjadi **dua PWA di satu domain `saranamultikalibrasi.com`**:
- **Manajemen Aset SMK** (`saranamultikalibrasi.com/admin`) — untuk kantor (Admin Utama, Admin Teknik, Keuangan, SPH).
- **Tera SMK** (`saranamultikalibrasi.com/tera`) — khusus teknisi.

**Tera SMK** adalah **sub-website PWA** di dalam `qrcode-smk` untuk teknisi mengisi LKK **tanpa sinyal**, lalu menyambung otomatis ke Selia → ACC → **sertifikat langsung muncul di QR** → BAP/BASTP → penagihan.

---

## 2. TUJUAN & UKURAN KEBERHASILAN

| # | Tujuan | Ukuran keberhasilan |
|---|---|---|
| G1 | Tidak ada data hilang | 0 LKK hilang pada uji sinkron (sinyal putus, tab/aplikasi ditutup paksa, HP mati, 50 LKK sekaligus) |
| G2 | Hitungan identik Excel | Selisih 0 (setelah pembulatan) untuk rata-rata, koreksi, U95, kesimpulan pada uji banding tiap alat |
| G3 | Sertifikat identik Report All | PDF cocok tata letak, teks, kop, dan jumlah halaman dengan PDF cetak Excel v12 |
| G4 | ACC → QR tanpa upload manual | Setelah ACC, QR di stiker menampilkan sertifikat dalam < 1 menit |
| G5 | BAP & tagihan sesuai lapangan | Realisasi BAP = jumlah alat yang benar-benar dikerjakan; tagihan mengikuti BAP |
| G6 | Cepat & stabil | Buka layar < 1 detik dari data lokal; 0 crash; tidak ada loading tanpa batas waktu |
| G7 | Mudah dipakai teknisi | Teknisi baru bisa mengisi 1 LKK tanpa pelatihan > 15 menit |
| G8 | Website lama tidak terganggu | 3.934 label lama tetap bisa di-scan **dari semua alamat lama**; modul SPH/label/penagihan tetap berjalan selama pengembangan |
| G9 | Dua aplikasi terpasang | Manajemen Aset SMK & Tera SMK bisa dipasang terpisah di layar utama (ikon & nama berbeda), satu domain |

---

## 3. PENGGUNA & PERAN

Website memakai kolom `profiles.role`. Empat role lama **tetap**, ditambah **satu role baru**.

| Role (`profiles.role`) | Sebutan di PRD | Siapa | Masuk ke | Kebutuhan utama |
|---|---|---|---|---|
| `admin_utama` | **Developer** | Ridhwan (rencana: hanya Ridhwan) | Manajemen Aset + Tera SMK | Semua fungsi, template, kalibrator, akun, buka koreksi pasca-ACC |
| `admin_teknik` | **Admin Teknik / Penyelia** | Saat ini 1 orang, bisa > 1 | Manajemen Aset (jadwal, label, **Selia**) | Push jadwal, menyelia, **mengedit** LKK, kembalikan, ACC, BAP/BASTP. **Tidak membuat LKK dari awal** |
| `admin_keuangan` | Admin Keuangan | — | Manajemen Aset (penagihan) | Invoice & kuitansi dari BAP |
| `hanya_sph` | Admin SPH | — | Manajemen Aset (SPH) | Membuat SPH |
| **`teknisi`** *(baru)* | **Teknisi** | Teknisi lapangan | **Hanya Tera SMK** | Isi LKK cepat di HP/tablet, tidak takut data hilang |
| *(data master)* | Penandatangan | Manajer Teknik **Hafizh Pasifianto Utomo, S.Tr.T.** | — | **QR tanda tangan elektronik** tercetak otomatis di sertifikat (F8.7) |

> Saat ini ada 4 akun `admin_utama`. Hak "Developer" melekat ke `admin_utama`, jadi **sebelum Tera SMK dipakai sungguhan, akun `admin_utama` dikurangi menjadi hanya Ridhwan** (keputusan 11).

Hak akses rinci: **Lampiran A**.

---

## 4. RUANG LINGKUP

### 4.1 Termasuk
- **Sub-website Tera SMK** (PWA) di dalam `qrcode-smk`, bisa dipasang di layar utama HP & tablet Android (Chrome).
- **Manajemen Aset SMK dijadikan PWA** juga (bisa dipasang di laptop/HP kantor), terpisah dari Tera SMK.
- Role baru `teknisi`; teknisi hanya bisa masuk Tera SMK.
- Mode offline penuh + sinkron otomatis ke Supabase.
- **Push jadwal** dari Admin Teknik ke Tera SMK (RS, daftar alat PO, teknisi, rentang label + label cadangan).
- Pengisian LKK berbasis **template** untuk alat Master v12 (bertahap), nomor label **scan QR atau ketik**.
- **Alat tambahan** di luar PO memakai label cadangan.
- Selia: periksa, edit, kembalikan, ACC; bantuan AI pra-penyeliaan.
- **PDF sertifikat** identik Report All v12, **kop KAN / Non-KAN** otomatis, **QR tanda tangan elektronik** Manajer Teknik.

**Pembagian aplikasi:** **Tera SMK hanya untuk LKK digital** (teknisi). Semua pekerjaan kantor — penjadwalan, label, **Selia**, BAP/BASTP, penagihan, **master kalibrator & nilai sertifikatnya**, template, akun, pengaturan — ada di **Manajemen Aset SMK**.
- **Dua mode sertifikat per BO**: *Terintegrasi Tera SMK* atau *Manual link Google Drive* (cara lama tetap ada).
- Salinan PDF ke **Google Drive** (opsional per ACC).
- **BAP & BASTP otomatis** dari hasil LKK, tersambung ke **penagihan** yang sudah ada.
- Riwayat perubahan (audit trail), koreksi pasca-ACC dengan izin Developer.
- Master kalibrator & sertifikatnya, budget ketidakpastian, snapshot.
- Backup mingguan terverifikasi, log error.

### 4.2 Tidak termasuk (versi ini)
- Membangun ulang modul SPH, master RS, generate label, keuangan (sudah ada — hanya **disambungkan**).
- Notifikasi WhatsApp/email otomatis.
- Integrasi langsung ke alat kalibrator (Bluetooth/USB).
- Aplikasi native (APK/Expo) dan dukungan teknisi di iPhone/iPad.
- Tanda tangan elektronik tersertifikasi (BSrE); tanda tangan/paraf penyelia di sertifikat.
- Nomor faktur pajak resmi (Coretax DJP) — nomor "faktur" di website = nomor invoice internal.
- Deteksi data kembar / copy-paste antar-LKK oleh AI.

---

## 5. ALUR UTAMA (END-TO-END)

Tanda: ✅ sudah ada di website · ✏️ sudah ada, perlu disesuaikan · 🆕 dibangun baru.

```
✅ [Marketing]     Kirim daftar alat RS ke Admin SPH
✅ [Admin SPH]     Buat SPH (harga dari master tarif PT SMK) → Negosiasi → DEAL / Ditolak
✏️                 Saat DEAL: harga per alat DIBEKUKAN (snapshot) — dipakai juga untuk alat tambahan
✅ [Admin Teknik]  Penjadwalan RS: tanggal, teknisi, nomor BO (3 angka) & rentang label 200.0001–200.0050
🆕                 + rentang LABEL CADANGAN (mis. 200.0051–200.0070) + pilih MODE SERTIFIKAT:
                   (a) Terintegrasi Tera SMK   atau   (b) Manual link Google Drive (cara lama)
✅                 Generate & cetak label QR
🆕                 Tombol "Push ke Tera SMK" (hanya mode a)
                        │
🆕 [Teknisi]       Tera SMK (HP/tablet, OFFLINE): pilih RS → daftar alat PO → pilih alat
                   → SCAN QR stiker / ketik nomor label → isi LKK → hasil & LAIK/TIDAK LAIK otomatis
                   → "Selesai" → tersimpan 🟡 → terkirim otomatis saat ada sinyal 🔵 → 🟢
                   Alat di luar PO: tombol "+ Alat tambahan" memakai label cadangan
                        │
🆕 [Server]        Pemindaian AI di latar belakang → penanda KUNING / MERAH
                        │
✏️ [Penyelia]      Selia per RS/BO → Periksa ─┬→ Edit (tercatat) 
                                              ├→ Kembalikan ke teknisi (alasan) → revisi → kirim lagi
                                              └→ ACC → TERKUNCI → PDF sertifikat (kop KAN/Non-KAN)
🆕                 → PDF otomatis tertaut ke label → QR langsung menampilkan sertifikat
🆕                 → (opsional, default aktif) salinan PDF ke Google Drive
                        │
🆕 [Developer]     Sertifikat terbit ada kesalahan → "Buka koreksi" (alasan wajib) → betulkan → ACC ulang
                        │
✏️ [Admin Teknik]  BAP (No. = BO) & BASTP terisi OTOMATIS dari LKK → unduh PDF 2 rangkap
✏️ [Keuangan]      Invoice & kuitansi (No. = BO) dari realisasi BAP + harga SPH + PPN
```

---

## 6. KEBUTUHAN FUNGSIONAL

Format: **ID · Kebutuhan · Kriteria terima (KT)**.

### F0 · Pengaman Database Tunggal (WAJIB sebelum fitur apa pun)
Pengembangan dilakukan langsung di project Supabase produksi (keputusan pemilik produk, Supabase Pro). Karena itu:

| ID | Kebutuhan | Kriteria terima |
|---|---|---|
| F0.1 | Semua data Tera SMK di **tabel baru berawalan `tera_`** | Tidak ada tabel lama yang diubah strukturnya kecuali **menambah kolom** |
| F0.2 | **Dilarang** menghapus/mengganti nama kolom/tabel lama, dan dilarang mengubah baris `labels` lama di luar alur F9 | Ditinjau di setiap migrasi |
| F0.3 | **Backup** (dump skema + data tabel yang disentuh) **sebelum setiap migrasi** | File backup tercatat sebelum migrasi dijalankan |
| F0.4 | Semua migrasi diberikan sebagai SQL 4 blok (BACKUP · PERUBAHAN · CEK · BATALKAN) untuk dijalankan pemilik produk di Supabase SQL Editor, dan disimpan sebagai file bernomor | Ada di folder `supabase/migrations/` |
| F0.5 | **Data uji** memakai BO khusus **`999`** dan ditandai `is_test = true` | Data uji tidak muncul di laporan, BAP, penagihan sungguhan; bisa dihapus bersih |
| F0.6 | Tampilan baru diuji dulu di **Vercel Preview** dari cabang **`tera-dev`**, bukan langsung di website utama | Setiap tahap punya link preview sebelum digabung ke `main` |
| F0.7 | **Audit kode tanpa mengubah apa pun** (Fase 0): petakan modul, alur label/QR, API server, RLS, bucket penyimpanan | Laporan `docs/audit-fase0.md` disetujui pemilik produk |
| F0.9 | **File referensi perusahaan** (Master LKK, kop, contoh BAP/BASTP, sertifikat kalibrator, golden file) disimpan di `_referensi/` dan **tidak boleh masuk repo publik** | Selama repo publik: `_referensi/` ada di `.gitignore`; dicek sebelum setiap commit |
| F0.8 | Acuan struktur database = **database langsung** (bukan `supabase_schema.sql` di repo yang sudah usang) | Struktur diambil dari database saat audit |

### F1 · Login, Peran & Pintu Masuk Tera SMK
| ID | Kebutuhan | Kriteria terima |
|---|---|---|
| F1.1 | Login email + kata sandi (Supabase Auth, sama dengan website) | Sekali login online; setelah itu Tera SMK tetap bisa dibuka **offline** dengan sesi tersimpan |
| F1.2 | Role baru **`teknisi`** | Teknisi yang login **langsung diarahkan ke Tera SMK**; membuka halaman Manajemen Aset → ditolak (juga di server/RLS, bukan hanya disembunyikan) |
| F1.3 | Tera SMK di **`saranamultikalibrasi.com/tera`**, Manajemen Aset SMK di **`saranamultikalibrasi.com/admin`**, halaman publik scan QR tetap di alamat lama | Lihat F14 |
| F1.4 | **Hanya Developer** yang membuat akun, mengganti peran, menonaktifkan akun | Role lain ditolak di server; kunci *service role* tidak pernah ada di browser |
| F1.5 | Logout | Diblokir dengan pesan jelas bila masih ada LKK belum 🟢 |
| F1.6 | Akun teknisi terhubung ke data master **`teknisi`** (nama, gelar, nomor STR) | Nama teknisi di BASTP & sertifikat diambil dari master, bukan diketik |
| F1.7 | **Aturan email akun**: akun kantor **`@smk.co.id`** → Manajemen Aset SMK; akun teknisi **`@tera.smk`** → Tera SMK. Yang menentukan akses tetap **role** di server; email hanya penanda yang harus konsisten dengan role | Membuat akun `@tera.smk` dengan role selain `teknisi` (atau sebaliknya) → ditolak/diberi peringatan saat Developer membuat akun |
| F1.9 | Database saat ini **hanya mengizinkan 4 role** (aturan `chk_profiles_official_role`). Tahap 1 menambah `teknisi` ke aturan itu (satu-satunya perubahan aturan tabel lama, dengan backup & izin) | Sebelum Tahap 1, akun `@tera.smk` yang sudah dibuat di Supabase Auth **tidak bisa masuk ke mana pun** (aman) |
| F1.8 | Karena `@tera.smk` bukan alamat email sungguhan (tidak bisa menerima email), akun dibuat langsung oleh Developer (sudah aktif, tanpa email konfirmasi); **lupa kata sandi → direset Developer**; teknisi wajib mengganti kata sandi saat login pertama | Tidak ada fitur yang bergantung pada pengiriman email ke `@tera.smk` |

### F2 · Push Jadwal ke Tera SMK (Admin Teknik)
| ID | Kebutuhan | Kriteria terima |
|---|---|---|
| F2.1 | Di form penjadwalan yang sudah ada: tambah **rentang label cadangan** | Contoh: utama 200.0001–200.0050, cadangan 200.0051–200.0070; label cadangan tercetak bersama |
| F2.2 | Pilih **mode sertifikat per jadwal/BO**: **(a) Terintegrasi Tera SMK** atau **(b) Manual link Google Drive** | Mode (b) = alur lama tanpa perubahan; mode (a) mengaktifkan F2.3 dst |
| F2.3 | Tombol **"Push ke Tera SMK"** | RS, nomor BO, daftar alat PO (dari SPH deal), teknisi yang ditugaskan, rentang label & cadangan muncul di Tera SMK teknisi yang ditugaskan setelah sinkron |
| F2.4 | Ubah jadwal setelah push (tambah teknisi/cadangan) | Perubahan ikut turun ke tablet; LKK yang sudah diisi tidak terhapus |
| F2.5 | Hanya teknisi yang ditugaskan yang melihat RS tersebut | Dicek di server |

### F3 · Pengisian LKK (Teknisi)
| ID | Kebutuhan | Kriteria terima |
|---|---|---|
| F3.1 | Pilih **RS aktif** → tampil **daftar alat PO** (jumlah PO, sudah dikerjakan, sisa) → pilih jenis alat → LKK baru dari template | LKK baru langsung muncul dengan status 🟡 |
| F3.2 | **Nomor label**: tombol utama **"Scan stiker"** (kamera, offline); cadangan **"Ketik manual"** (BO sudah terisi, ketik 4 angka) | Nomor selalu format `BBB.NNNN` (4 angka belakang); hasil scan QR dari BO lain ditolak dengan pesan jelas |
| F3.3 | Validasi nomor label | Harus di dalam rentang utama/cadangan BO itu; belum dipakai di perangkat ini; tampil konfirmasi besar *"Nomor stiker 200.0012 — sudah sesuai dengan stiker di alat?"* |
| F3.4 | **Alat tambahan** (di luar PO): tombol **"+ Alat tambahan"** memakai label cadangan | LKK ditandai `alat_tambahan = true`; tidak mengurangi kuota PO; masuk BAP/BASTP & penagihan sebagai baris tambahan |
| F3.5 | Isian per bagian (langkah demi langkah): Identitas alat → Kondisi lingkungan → Fisik & fungsi → Keselamatan listrik (bila ada) → Kinerja → Kesimpulan → Ringkasan & Selesai | Bilah kemajuan bisa diketuk; bagian selesai bercentang |
| F3.6 | **Auto-save setiap isian** ke IndexedDB (bukan hanya saat "Selesai") | Tutup paksa tab/aplikasi di tengah isian → buka lagi → semua isian masih ada |
| F3.7 | Hitungan otomatis saat mengetik (F5) | Rata-rata, koreksi, U95, **LAIK/TIDAK LAIK otomatis**; data belum lengkap → "-" tanpa error |
| F3.8.1 | Validasi kondisi lingkungan | Suhu & kelembaban di luar batas ditolak dengan pesan di bawah kotak; koma desimal |
| F3.8.2 | **Proteksi kalibrator expired** (offline) terhadap **tanggal pelaksanaan** | Kalibrator expired abu-abu & tidak bisa dipilih; "Selesai" ditolak bila ada kalibrator expired; server tetap menerima tapi beri penanda merah & ACC ditolak; kalibrator belum bersertifikat (tanggal kosong) tidak diblokir |
| F3.9 | Keselamatan listrik sesuai jenis alat | Berbaterai: tidak ada bagian; berkabel: wajib; **Pacemaker**: Ya/Tidak |
| F3.10 | Tombol **"Selesai"** aktif bila semua wajib-isi lengkap & kesimpulan sudah terhitung | Ringkasan menampilkan yang belum lengkap |
| F3.11 | Setelah "Selesai", teknisi tidak bisa mengubah | Kecuali status "Dikembalikan untuk revisi" |
| F3.12 | Layar menyesuaikan **HP (portrait)** dan **tablet (portrait & landscape)** | Lihat CLAUDE.md 13.5 |

### F4 · Offline & Sinkronisasi PWA (PRIORITAS TERTINGGI)
| ID | Kebutuhan | Kriteria terima |
|---|---|---|
| F4.1 | Penyimpanan lokal **IndexedDB** sebagai sumber utama tampilan Tera SMK | Semua layar Tera SMK berfungsi dengan sinyal mati |
| F4.2 | **Izin penyimpanan permanen** (`navigator.storage.persist()`) + wajib **dipasang ke layar utama** | Bila izin tidak diberikan / belum dipasang: banner peringatan yang tidak bisa diabaikan |
| F4.3 | ID unik (UUID) dibuat di perangkat | Kirim ulang tidak membuat data dobel (idempoten) |
| F4.4 | **Antrean kirim (outbox)**: 1 LKK = 1 paket utuh + checksum | Server menolak paket tidak utuh; tidak ada LKK "setengah" |
| F4.5 | Status 🟡 → 🔵 → 🟢 | 🟢 hanya setelah server membalas konfirmasi berisi checksum & jumlah titik ukur yang cocok |
| F4.6 | Kirim **otomatis** tanpa tombol: saat sinyal kembali (event online), saat aplikasi dibuka, berkala selama aplikasi terbuka (jeda 5 s, 15 s, 1 m, 5 m, maks 15 m) | LKK yang gagal akhirnya 🟢 tanpa tindakan teknisi |
| F4.7 | **Background Sync** service worker dipakai **sebagai tambahan saja** (tidak diandalkan) | Sistem tetap benar walau Background Sync tidak berjalan |
| F4.8 | Data lokal tidak dihapus sebelum 🟢 | Terbukti pada uji F4.12 |
| F4.9 | Sinkron di latar belakang, **tidak mengunci layar**; timeout tiap permintaan (± 20 s) | Pesan: *"Server tidak merespons. Data aman di perangkat, akan dicoba lagi otomatis."* |
| F4.10 | Tarik data turun (jadwal, alat PO, template, kalibrator, LKK dikembalikan) | Perubahan Admin muncul di perangkat setelah sinkron |
| F4.11 | Tombol **"Backup ke file"** (JSON) + impor kembali oleh Developer | File bisa dipulihkan di perangkat lain |
| F4.12 | **Uji wajib**: sinyal putus di tengah kirim, tab/aplikasi ditutup paksa, HP mati/baterai habis, 50 LKK sekaligus, sinyal putus-sambung, **memori HP hampir penuh** | Semua skenario: 0 data hilang, 0 dobel |
| F4.13 | Konflik: LKK yang sudah dikunci Penyelia tidak bisa ditimpa kiriman teknisi | Kiriman ditolak dengan alasan jelas, salinan lokal disimpan untuk Developer |
| F4.14 | Nomor label ganda dalam satu BO (dari dua perangkat) | **Diterima**, diberi peringatan di Selia (tidak ditolak diam-diam) |
| F4.15 | Pembaruan versi aplikasi tidak boleh menghapus data lokal | Uji: update versi saat ada LKK 🟡 → data tetap |

### F5 · Mesin Hitung & Template
| ID | Kebutuhan | Kriteria terima |
|---|---|---|
| F5.1 | Setiap jenis alat = **1 template JSON** (Lampiran C), termasuk tanda **`kop: "KAN" / "NON_KAN"`** | Tidak ada layar/rumus khusus satu alat di kode |
| F5.2 | Rumus GUM: u_A = STDEV.S/√n; u_res; u_std = U95_kalibrator/2; drift; u_c = √Σu²; U95 = k·u_c (k=2); 2 angka penting | Sama dengan Excel v12 |
| F5.3 | Koreksi kalibrator dari tabel sertifikat (cocok persis / interpolasi linier, **sama seperti Excel**) | Uji banding lolos |
| F5.4 | Kesimpulan LAIK/TIDAK LAIK dari toleransi MK, termasuk aturan skor bila ada di Excel | Sama dengan Excel v12 |
| F5.5 | **Uji banding otomatis per alat** (golden file) | Test gagal bila ada selisih |
| F5.6 | Hitungan berjalan **offline** di perangkat & tidak membuat layar tersendat | Input terasa instan |

### F6 · Selia (Admin Teknik / Penyelia)
Selia memakai **halaman Selia yang sudah ada** di Manajemen Aset, ditingkatkan untuk memeriksa isian LKK.

| ID | Kebutuhan | Kriteria terima |
|---|---|---|
| F6.1 | Daftar LKK masuk, dikelompokkan per **RS & BO**, filter status/teknisi/tanggal | Menemukan LKK dalam < 3 klik |
| F6.2 | **Edit** isian LKK yang masuk (bukan membuat dari awal) | Setiap perubahan tercatat (F7) |
| F6.3 | Kembalikan untuk revisi + alasan wajib | Status 🟣; teknisi melihat alasan; setelah revisi, kirim lagi |
| F6.4 | **ACC** per LKK | Hanya bila lengkap & tanpa peringatan pemblokir (nomor ganda, kalibrator expired, lingkungan di luar batas); penanda AI lain ditandai *"Sudah saya periksa"*; nama penyelia = akun yang ACC; snapshot dibekukan; LKK terkunci |
| F6.5 | Peringatan nomor label ganda dalam satu BO | Muncul di daftar & sebelum ACC |
| F6.6 | **Kunci pasca-ACC + koreksi dengan izin Developer**: "Buka koreksi" (alasan wajib) → betulkan → ACC ulang → PDF versi baru, nomor sama; PDF lama disimpan "digantikan"; **QR otomatis menampilkan versi terbaru** | Database menolak perubahan LKK ACC tanpa "Buka koreksi"; semua tercatat |
| F6.7 | **Bantuan AI pra-penyeliaan** (asinkron setelah 🟢): kuning = mendekati batas toleransi (bawaan ≥ 80%); merah = melewati toleransi, lingkungan di luar batas, kalibrator expired, kemungkinan salah ketik. Warna ditentukan **perhitungan deterministik**; AI hanya membantu keterangan. Tidak mengubah data, tidak memutuskan LAIK, tidak memeriksa copy-paste | Penyelia sampai ke angka bermasalah ≤ 1 klik; pemindai mati → sinkron tetap 🟢 |

> Merah karena alat **melewati toleransi** bukan berarti data salah. Penyelia memastikan, lalu ACC tetap boleh (sertifikat TIDAK LAIK PAKAI).

### F7 · Riwayat Perubahan (Audit Trail)
| ID | Kebutuhan | Kriteria terima |
|---|---|---|
| F7.1 | Catat: siapa, kapan, LKK, kolom, nilai lama, nilai baru, alasan — termasuk "Buka koreksi", ACC ulang, "Sudah saya periksa" | Otomatis oleh trigger database |
| F7.2 | Tidak bisa diubah/dihapus siapa pun | Ditolak database |
| F7.3 | Tidak dicetak di sertifikat | Hanya di menu Riwayat |

### F8 · Sertifikat PDF
| ID | Kebutuhan | Kriteria terima |
|---|---|---|
| F8.1 | Tata letak **sama persis** Report All v12 per jenis alat | Dibandingkan berdampingan dengan PDF acuan (11.32): cocok |
| F8.2 | **Kop otomatis**: **KAN** hanya untuk **Timbangan Bayi Mekanik, Timbangan Bayi Digital, Timbangan Dewasa Mekanik** (di Master v12: *Timbangan Dewasa Analog*); semua alat lain **Non-KAN** | Ditentukan dari template (`kop`), bukan dipilih manual |
| F8.3 | Kop dipakai di **semua halaman** sertifikat | — |
| F8.4 | Kop ditempel sebagai **latar halaman** dari file PDF kop resmi; isi memakai font **Carlito** (ukuran identik Calibri) | Tidak ada font berlisensi Microsoft yang dibundel; posisi isi sama dengan Report All (tidak digeser demi kop, 11.38) |
| F8.5 | Kepala halaman: Nomor Order & Nomor Sertifikat setelah halaman sampul; "Halaman x dari y" | Sesuai Report All |
| F8.6 | **Aturan teks sertifikat** (CLAUDE.md 9.1) | Pemeriksaan kata terlarang otomatis lolos |
| F8.7 | **Tanda tangan = QR tanda tangan elektronik**: tanpa tanda tangan/paraf penyelia. Di halaman 1, pada ruang kosong di bawah "Disetujui oleh," dan **tepat di atas nama "Hafizh Pasifianto Utomo, S.Tr.T. — Manajer Teknik"**, dicetak **QR unik per sertifikat** | QR membuka halaman verifikasi resmi di `saranamultikalibrasi.com` yang menampilkan: nomor sertifikat, nama alat, merek/tipe/SN, RS, tanggal kalibrasi, hasil, **ditandatangani secara elektronik oleh Hafizh Pasifianto Utomo, S.Tr.T. (Manajer Teknik) pada tanggal & jam ACC**, nomor revisi, dan status (**Berlaku** / **Digantikan oleh revisi n**). QR tidak bisa dipalsukan dengan menebak nomor (memakai kode verifikasi). Data penandatangan dibekukan saat ACC. Bukan BSrE |
| F8.8 | Hemodialisa mengikuti format Nipro | Sesuai master |
| F8.9 | PDF dibuat di server setelah ACC, disimpan di bucket privat `tera-certificates` | Tautan PDF tersedia di detail LKK |
| F8.10 | "Tera SMK" tidak dicetak di sertifikat | — |

### F9 · Label QR & Sertifikat di QR
| ID | Kebutuhan | Kriteria terima |
|---|---|---|
| F9.1 | **Format link QR tidak berubah** (`/sertifikat/<no_label>` dan alamat lain yang sudah ada) | 3.934 label lama tetap bisa di-scan seperti sekarang |
| F9.2 | Mode (a) Terintegrasi: setelah ACC, label otomatis terisi PDF Tera SMK (`pdf_source = 'tera'`), status label mengikuti hasil (**Sertifikat Tertaut** / **Tidak Laik Pakai**) | QR menampilkan sertifikat < 1 menit setelah ACC, tanpa upload manual |
| F9.3 | Mode (b) Manual: alur lama — admin menautkan **link Google Drive** ke label | Tidak berubah dari sekarang |
| F9.4 | Saat ACC ada pilihan **"Simpan juga ke Google Drive"** (bawaan: aktif). PDF disalin ke Drive Ridhwan, folder per **BO – Nama RS**; link disimpan di `pdf_drive_url` | Bila Drive gagal: ACC tetap sukses, salinan Drive dicoba ulang otomatis & tercatat di log |
| F9.5 | Urutan tampilan QR: **PDF Tera SMK versi terbaru** → bila tidak ada, **link Google Drive** → bila tidak ada, *"Sertifikat belum terbit"* | Diuji dengan label mode a, mode b, dan label lama |
| F9.6 | Label tanpa LKK tetap bisa dibuat (generate label biasa) | Fitur generate label lama tetap ada |
| F9.7 | PDF sertifikat di bucket privat, ditampilkan lewat tautan bertanda tangan berumur pendek | Alamat file asli tidak bisa ditebak/diakses langsung |

### F10 · BAP & BASTP Otomatis
| ID | Kebutuhan | Kriteria terima |
|---|---|---|
| F10.1 | **Nomor BAP = nomor BO** (label 200 → BAP 200); nomor BASTP juga = BO (lihat 12.3); bulan romawi mengikuti **tanggal dokumen** | — |
| F10.2 | **BAP**: per jenis alat → Volume PO · Volume Realisasi · Volume Sisa · Keterangan; baris **alat tambahan** terpisah; baris TOTAL UNIT | Realisasi = jumlah LKK alat itu yang sudah **diterima server (🟢)**, termasuk yang TIDAK LAIK |
| F10.3 | Keterangan sisa: **"Belum selesai"** selama jadwal berjalan → otomatis **"Batal"** saat jadwal ditutup Admin Teknik | — |
| F10.4 | **BASTP** mengikuti contoh *BASTP Klinik Jantung Hasna Medika*: kepala (PT SMK, Laboratorium Kalibrasi, alamat & telepon), judul, **nama RS**, **No. Order** format `BBB/SMK-BO/<bulan romawi BO>-<tahun>` (contoh `033/SMK-BO/VIII-2026`), nama customer, telepon/fax, alamat lengkap; tabel: **No · Nama Alat · Merk · Tipe · No. Seri · Petugas (nama + gelar) · Tanggal Kalibrasi · Ruangan · Keterangan (Laik/Tidak Laik Pakai) · No. Sertifikat**; ringkasan **Jumlah Laik Pakai · Jumlah Tidak Laik Pakai · Total Alat**; tanda tangan pihak PT SMK (teknisi utama) & pihak customer | Diambil dari LKK, tidak diketik ulang; **maksimal 30 baris per halaman**, halaman berikutnya meneruskan; **alat tambahan di halaman terpisah bertanda "TAMBAHAN"**; baris diurutkan per nama alat lalu nomor sertifikat |
| F10.5 | Bisa diunduh **kapan saja** (sebelum atau sesudah pekerjaan selesai) sebagai PDF **2 rangkap** (instansi & kantor), kop surat resmi | — |
| F10.6 | Bagian "Pada hari ini … tanggal … bulan … tahun …" **terisi lengkap otomatis**, atau **kosong semua** (pilihan saat unduh) | Tidak setengah terisi |
| F10.7 | Teks tidak terpotong; nama alat dari **katalog yang ejaannya sudah dirapikan** | Diperiksa pada PDF uji |
| F10.8 | Penandatangan PT SMK di BAP/BASTP: **Hafizh Pasifianto Utomo** (data master); BAP/BASTP tetap ditandatangani basah di kertas | — |
| F10.9 | Mode (b) Manual: BAP tetap bisa diisi manual seperti sekarang | Alur lama tetap ada |

### F11 · Sambungan ke Penagihan (modul yang sudah ada)
| ID | Kebutuhan | Kriteria terima |
|---|---|---|
| F11.1 | Penagihan mengambil kuantitas dari **realisasi BAP** | Sudah ada; disambungkan ke BAP otomatis |
| F11.2 | Alat **TIDAK LAIK PAKAI tetap ditagih**; alat **Batal (sisa) tidak ditagih** | Contoh: PO 30, sisa 3 → DPP = 27 × harga |
| F11.3 | **Alat tambahan** ditagih dengan **harga dari SPH yang sudah DEAL** (snapshot), **bukan harga master** | Muncul sebagai baris penambah |
| F11.4 | **PPN dari data master** (saat ini **11%**), tidak ditulis di kode | Admin Keuangan/Developer bisa mengubah; tagihan lama tidak berubah |
| F11.5 | Nomor BO = nomor faktur penagihan (invoice internal) = nomor kuitansi | Sudah ada; dipertahankan |

### F12 · Menu Pengaturan di Manajemen Aset SMK (bukan di Tera SMK)
| ID | Kebutuhan | Kriteria terima |
|---|---|---|
| F12.1 | **Master kalibrator & nilai sertifikatnya** di menu **aset kalibrator Manajemen Aset SMK** yang sudah ada: memakai tabel **`aset_kalibrator`** (identitas, nomor sertifikat, tertelusur ke, jatuh tempo) + data baru: tabel koreksi & U95 (`tera_calibrator_points`). Setiap nilai wajib punya **sumber**: `sertifikat` / `datasheet pabrik` / `jurnal` / `perkiraan`, plus referensi (nomor sertifikat, judul & tautan datasheet/jurnal). Kalibrator yang **belum bersertifikat** diisi dari **datasheet/jurnal** (Tipe B) sampai sertifikat tersedia | Perubahan master hanya untuk LKK baru; snapshot dibekukan saat ACC; kalibrator yang pernah dipakai tidak bisa dihapus |
| F12.2 | Kelola **template LKK** (JSON) dengan versi | LKK selalu tahu versi template |
| F12.3 | Kelola **budget ketidakpastian** | Ikut masuk snapshot |
| F12.4 | Kelola **akun & peran** (termasuk teknisi `@tera.smk`), **penandatangan**, **pengaturan pemindai AI**, **PPN** | Hanya Developer (PPN juga Admin Keuangan) |
| F12.6 | Semua menu F12 berada di **Manajemen Aset SMK**; **Tera SMK tidak punya menu pengaturan** | Tera SMK hanya berisi LKK, sinkron, akun sendiri |
| F12.5 | Lihat log error, status backup, status salinan Google Drive | — |

### F13 · Backup & Log
| ID | Kebutuhan | Kriteria terima |
|---|---|---|
| F13.1 | Ekspor otomatis mingguan (data CSV/JSON + PDF) ke bucket privat `tera-backups` | Muncul tiap minggu |
| F13.2 | **Backup terverifikasi**: manifest (jumlah LKK & PDF, checksum) dicocokkan otomatis; gagal → ulang otomatis + status merah di menu Developer | Tidak ada backup gagal diam-diam |
| F13.3 | Simpan 12 backup terakhir; uji pulih bulanan otomatis | Hasil tampil di menu Developer |
| F13.4 | Log error & kejadian macet dari perangkat dikirim saat online | Terlihat di menu Developer |
| F13.5 | Panduan pemulihan `docs/pemulihan.md` | — |

### F14 · Dua PWA di Satu Domain
| ID | Kebutuhan | Kriteria terima |
|---|---|---|
| F14.1 | **Satu domain `saranamultikalibrasi.com`, satu Vercel project, satu kode** — dua PWA dengan *manifest* terpisah | Bisa memasang **dua ikon** di satu perangkat: "Manajemen Aset SMK" & "Tera SMK" |
| F14.2 | **Manajemen Aset SMK**: cakupan (*scope*) `/admin/`, mulai di dasbor; **Tera SMK**: cakupan `/tera/`, mulai di beranda teknisi | Membuka ikon Manajemen tidak masuk ke Tera SMK, dan sebaliknya |
| F14.3 | Login diarahkan sesuai role: `teknisi` → `/tera`; role kantor → `/admin`. Teknisi membuka `/admin` → ditolak & dialihkan | Dicek juga di server |
| F14.4 | **Manajemen Aset SMK**: bisa dipasang & cepat dibuka (cangkang aplikasi disimpan); data tetap butuh internet; saat offline tampil pesan jelas (bukan halaman putih). Antrean simpan yang sudah ada tetap dipakai | Uji: buka saat offline → pesan *"Anda sedang offline"* |
| F14.5 | **Tera SMK**: offline penuh (F4) | — |
| F14.6 | **Halaman publik scan QR** (`/sertifikat/…`, `/scan/…`, `/verifikasi/…`, `/cert/…`, `/label/…`) **tidak** termasuk PWA mana pun dan **tidak di-cache** service worker | Sertifikat yang baru di-ACC langsung terlihat saat scan |
| F14.7 | **Semua alamat lama tetap hidup**: `saranamultikalibrasi.com`, `www.` (dialihkan), `manajemen-aset-smk.vercel.app`, `qrcode-smk.vercel.app` & `smk-labelqr.vercel.app` (dialihkan) | Stiker lama dari alamat mana pun tetap membuka sertifikatnya |
| F14.8 | Label QR **baru** dicetak dengan alamat **`https://saranamultikalibrasi.com/sertifikat/…`** | Bawaan generator label |
| F14.9 | Ikon & nama berbeda: **Tera SMK = logo Tera SMK** (ikon sudah disiapkan di paket `_logo/`) · **Manajemen Aset SMK = logo PT SMK** | Mudah dibedakan di layar utama |

---

## 7. KEBUTUHAN NON-FUNGSIONAL

| Aspek | Target |
|---|---|
| Perangkat teknisi | HP & tablet **Android + Google Chrome** (versi terbaru). iPhone/iPad tidak didukung untuk teknisi |
| Kinerja | Buka layar < 1 s dari data lokal; hitungan instan; daftar 1.000+ LKK lancar (list virtual) |
| Kestabilan | 0 crash; error ditangkap & ditampilkan dalam bahasa awam |
| Jaringan | Semua permintaan punya timeout; tidak ada loading tanpa batas |
| Keamanan | RLS per peran; kunci rahasia hanya di server; data lokal hanya untuk akun yang login; PDF di bucket privat |
| Ukuran | PWA ringan; hanya font & aset yang dipakai |
| Tampilan Tera SMK | Sesuai `CLAUDE.md` 13 (Ocean, Inter, HP & tablet, kontras WCAG AA) |
| Website lama | Tidak ada fitur lama yang rusak; halaman publik scan QR tetap cepat |
| Bahasa | Antarmuka Bahasa Indonesia; sertifikat dwibahasa sesuai Report All |
| Kapasitas | ± 5.000 LKK/bulan |
| Pemindaian AI | Asinkron, tidak menambah waktu sinkron |

---

## 8. LAYAR (RINGKAS)

**Tera SMK (`/tera`, teknisi & Developer)**

| Layar | Isi utama |
|---|---|
| Login | Logo PT SMK, "Tera SMK", slogan kecil |
| Beranda | RS aktif yang ditugaskan, jumlah LKK di perangkat, status sinkron |
| Detail RS | Daftar alat PO (PO · dikerjakan · sisa), tombol "+ Alat tambahan", daftar LKK |
| Isi LKK | Scan/ketik nomor label, bilah kemajuan, isian per bagian, hasil langsung, LAIK/TIDAK LAIK |
| Ringkasan & Selesai | Kelengkapan, status, Selesai |
| Akun | Nama, status sinkron, izin penyimpanan, Backup ke file, Logout |

Tab bawah (HP): **Beranda · LKK · Akun**. Tablet landscape: menu samping + daftar + detail.

**Manajemen Aset (yang sudah ada, ditambah)**

| Layar | Peran | Tambahan |
|---|---|---|
| Penjadwalan | Admin Teknik | Label cadangan, mode sertifikat, tombol Push ke Tera SMK |
| Selia | Admin Teknik | Daftar & detail LKK, penanda AI, Edit / Kembalikan / ACC, pilihan salin ke Drive |
| BAP/BASTP | Admin Teknik | Terisi otomatis dari LKK, unduh PDF 2 rangkap |
| Penagihan | Admin Keuangan | Realisasi dari BAP otomatis, alat tambahan harga SPH |
| Aset Kalibrator (sudah ada, ditambah) | Developer | Nilai sertifikat kalibrator: koreksi, U95, berlaku sampai, sumber nilai (sertifikat/datasheet/jurnal) |
| Pengaturan | Developer | Template, budget, akun, penandatangan, AI, PPN, log, backup, Buka koreksi |

---

## 9. TAHAPAN (MENGIKUTI ALUR WORKFLOW)

Kerjakan berurutan; tiap tahap selesai bila **kriteria terima terpenuhi & pemilik produk bilang "lanjutkan"**.

| Tahap | Isi | Selesai bila |
|---|---|---|
| **0** | Pengaman & audit: audit kode tanpa ubah, backup, aturan migrasi, BO uji 999 | F0 lolos, `docs/audit-fase0.md` disetujui |
| **1** | **Dua PWA**: Manajemen Aset SMK (`/admin`) & Tera SMK (`/tera`) di `saranamultikalibrasi.com` (manifest, service worker, ikon); role `teknisi`, login & pengalihan per role, tema Ocean, tata letak HP/tablet | F1 & F14 lolos di laptop, HP & tablet kantor |
| **2** | Penyimpanan offline + sinkron + 🟡🔵🟢 + Backup ke file | **F4.12 lolos semua skenario** |
| **3** | Push jadwal: label cadangan, mode sertifikat, tombol Push, RS & alat PO muncul di Tera SMK | F2 lolos |
| **4** | **Alat percontohan Sphygmomanometer**: isi LKK (scan/ketik label, alat tambahan, kalibrator expired) → Selesai → Selia (edit/kembalikan/ACC) → **PDF Non-KAN** → **QR** + salinan Drive → koreksi pasca-ACC | F3, F5.5, F6.1–F6.6, F7, F8, F9 lolos untuk Sphygmomanometer; budget U95 sudah ditinjau & disetujui (11.45) |
| **5** | **BAP & BASTP otomatis** + sambungan ke penagihan | F10, F11 lolos dengan BO uji 999 |
| **6** | **Alat KAN pertama** (Timbangan Bayi Digital) untuk menguji kop KAN, lalu alat bertahap per kelompok: tekanan/aliran → suhu → kelistrikan/sinyal → volume/massa → cahaya → radiologi | Tiap alat lolos F5.5 & F8.1 |
| **7** | Pemindai AI pra-penyeliaan & highlight | F6.7 lolos |
| **8** | Menu pengaturan lengkap di Manajemen Aset SMK | F12 lolos |
| **9** | Backup mingguan terverifikasi + log | F13 lolos |
| **10** | Uji lapangan di HP & tablet kantor, kurangi akun `admin_utama` menjadi Ridhwan saja | Semua uji Lampiran D lolos |

---

## 10. RISIKO & MITIGASI

| Risiko | Mitigasi |
|---|---|
| Data LKK hilang di browser (memori penuh / "hapus data situs") | Izin penyimpanan permanen, wajib dipasang ke layar utama, kirim secepatnya, Backup ke file, pelatihan teknisi (CLAUDE.md 4) |
| Upload saat aplikasi tertutup tidak berjalan | Background Sync hanya tambahan; kirim utama saat aplikasi dibuka/online |
| Pengembangan merusak data produksi (3.934 label) | F0: tabel `tera_` terpisah, hanya tambah kolom, backup sebelum migrasi, Vercel Preview, BO uji 999 |
| Kode lama besar (± 58.000 baris) & belum dikenal | Fase 0 audit; perubahan kecil & terisolasi; jangan merapikan modul lain |
| Salah tautan sertifikat ke QR | Scan stiker + validasi rentang + konfirmasi; peringatan nomor ganda |
| Rumus beda dengan Excel | Template dari Master v12 + golden file per alat |
| PDF beda dengan Report All | Kop sebagai latar PDF + Carlito; banding dengan PDF acuan (11.32) |
| Nilai kalibrator dari datasheet kurang tepat | Sumber nilai dicatat; diganti nilai sertifikat saat tersedia; alat KAN wajib standar bersertifikat (11.37) |
| Kop KAN dipakai untuk alat di luar ruang lingkup | Kop ditentukan template, bukan pilihan manual; hanya 3 alat |
| Google Drive gagal / token kedaluwarsa | Drive hanya salinan; ACC & QR tidak bergantung pada Drive; coba ulang otomatis |
| Backup di project Supabase yang sama | Developer mengunduh salinan backup berkala ke luar Supabase |
| Pemilik produk bukan programmer | Langkah kecil, bahasa awam, minta "lanjutkan" sebelum perubahan besar |

---

## 11. KEPUTUSAN PEMILIK PRODUK — DIKUNCI

**Dari Draf 2 (tetap berlaku):**

| # | Keputusan |
|---|---|
| 11.1 | Sertifikat mengikuti **Report All v12 apa adanya** (kop, halaman, tabel) |
| 11.2 | **Hanya Developer** membuat & mengelola akun |
| 11.3 | Tanpa tanda tangan/paraf penyelia. Tanda tangan Manajer Teknik **Hafizh Pasifianto Utomo, S.Tr.T.** berupa **QR tanda tangan elektronik** unik per sertifikat, di atas nama beliau, halaman 1 *(diperbarui di Draf 3; sebelumnya gambar tanda tangan)* |
| 11.4 | Backup mingguan di Supabase Storage bucket terpisah, terverifikasi otomatis |
| 11.5 | LKK ACC dikunci; koreksi hanya setelah Developer "Buka koreksi" dengan alasan wajib; PDF versi baru nomor sama, PDF lama disimpan |
| 11.6 | Kalibrator expired diblokir di perangkat (terhadap tanggal pelaksanaan); kalibrator belum bersertifikat tidak diblokir |
| 11.7 | Snapshot kalibrator diambil saat dipilih, dibekukan saat ACC |
| 11.8 | AI pra-penyeliaan: kuning/merah, deterministik, ambang kuning bawaan 80% |

**Baru di Draf 3 (18 Oktober 2026):**

| # | Keputusan |
|---|---|
| 11.9 | Platform: **PWA**, sebagai **sub-website Tera SMK di dalam `qrcode-smk`** (bukan aplikasi terpisah) |
| 11.10 | Teknisi memakai **HP dan tablet** (Android + Chrome) |
| 11.11 | Role lama tetap (`admin_utama`, `admin_teknik`, `admin_keuangan`, `hanya_sph`) + **role baru `teknisi`** yang hanya bisa masuk Tera SMK. `admin_utama` nantinya hanya Ridhwan |
| 11.12 | Penyelia/Admin Teknik saat ini 1 orang, bisa > 1; **hanya mengedit LKK, tidak mengisi dari awal** |
| 11.13 | Satu database Supabase (Pro) untuk pengembangan & produksi, dengan pengaman F0 |
| 11.14 | Nomor label **BBB.NNNN**: BBB = nomor BO, NNNN = alat ke-berapa (4 angka) |
| 11.15 | Nomor label diisi dengan **scan QR stiker** atau **ketik manual** |
| 11.16 | Alat tambahan memakai **label cadangan** yang dibawa teknisi (dicetak berlebih dari PO) |
| 11.17 | LAIK/TIDAK LAIK **dihitung otomatis** dari toleransi sesuai LKK v12 |
| 11.18 | **Batal** = sisa (PO − realisasi) |
| 11.19 | Alat **TIDAK LAIK tetap ditagih**; alat tambahan memakai **harga SPH**, bukan harga master |
| 11.20 | Label lama (3.934) tetap berfungsi; label baru bisa **terintegrasi Tera SMK** atau **manual link Google Drive**; tetap bisa membuat label tanpa LKK |
| 11.21 | Sertifikat tersimpan di QR **dan** disalin ke Google Drive (akun Ridhwan, sementara) sebagai cadangan |
| 11.22 | Kop **KAN** hanya: Timbangan Bayi Mekanik, Timbangan Bayi Digital, Timbangan Dewasa Mekanik. Alat lain **Non-KAN**. Kop di **semua halaman** |
| 11.23 | **Nomor BAP = nomor BO**; nomor faktur penagihan & kuitansi = nomor BO |
| 11.24 | PPN data master, saat ini **11%** |
| 11.25 | Nama tetap **Tera SMK** |
| 11.26 | Website yang sudah ada **dijadikan PWA juga**: ada **dua PWA** — **Manajemen Aset SMK** (kantor) & **Tera SMK** (teknisi) |
| 11.27 | Tetap memakai domain **saranamultikalibrasi.com** (`/admin` & `/tera`); semua alamat lama tetap hidup |
| 11.28 | **Tera SMK khusus LKK digital.** Selia, master kalibrator & nilai sertifikatnya, template, akun, dan pengaturan ada di **Manajemen Aset SMK** |
| 11.29 | Akun kantor `@smk.co.id` → Manajemen Aset SMK; akun teknisi `@tera.smk` → Tera SMK |
| 11.30 | Nilai kalibrator yang belum bersertifikat diambil dari **datasheet pabrik / jurnal**, dicatat sumbernya, diganti saat sertifikat ada |
| 11.31 | **Nama alat mengikuti nama ASPAK Kemenkes** (katalog, LKK, sertifikat, BAP, BASTP) |
| 11.32 | **Report All**: PDF Sphygmomanometer & Defibrillator dari pemilik produk menjadi acuan; untuk alat lain, PDF Report All **dibuat sendiri dari Master v12** lalu disetujui pemilik produk |
| 11.33 | Kop sertifikat memakai **file PDF kop yang sudah ada**, ditempel sebagai latar/watermark |
| 11.34 | Salinan Google Drive ke folder **"SERTIFIKAT PT.SMK"** milik ridhwanwell@gmail.com, subfolder per BO – RS |
| 11.35 | Akun **ridhwan@tera.smk** & **hafizh@tera.smk** = role `teknisi`. Akun `@tera.smk` khusus Tera SMK, akun `@smk.co.id` khusus Manajemen Aset. Akun `@tera.smk` dibuat pemilik produk langsung di Supabase Auth |
| 11.36 | Hanya **Developer** yang boleh mengubah nilai sertifikat kalibrator |
| 11.37 | Anak timbangan untuk alat KAN **sudah bersertifikat** — datanya sudah ada di Master v12 (sheet *Calibrator 1*: 10 kg F1 Cert. C.250502008; 20 kg M1 Cert. 510.64/2050; tertelusur LK-258-IDN) dan dimasukkan ke master kalibrator |
| 11.38 | Kop sertifikat yang menabrak teks kaki "Sertifikat ini tidak boleh diperbanyak…" dan kotak "Nomor Order" yang mepet kop **dibiarkan apa adanya** (memang begitu aslinya) — isi **tidak** digeser |
| 11.39 | **Format BASTP** mengikuti contoh *BASTP Klinik Jantung Hasna Medika Indramayu* (F10.4); dokumen tetap disebut **BASTP**; penandatangan pihak PT SMK = **teknisi utama** jadwal |
| 11.40 | **Alamat resmi PT SMK** (semua dokumen): **Jl. Kenari 3 No. A3, Ngipang, Kadipiro, Banjarsari, Kota Surakarta 57136, Jawa Tengah** — disimpan sebagai data master |
| 11.41 | **Golden file Sphygmomanometer**: 2 file Excel terisi dari pemilik produk (Laju Buang 6,5 & 6 detik), sudah diperbaiki: proteksi Input 2 dibuka, "Baik " berspasi dibetulkan, dropdown Baik/Tidak Baik, rujukan dua-sel → satu-sel |
| 11.42 | Repo `qrcode-smk` **publik** → file referensi perusahaan tidak boleh di-commit ke repo publik (Lampiran E) |
| 11.43 | Temuan Master Sphygmomanometer v12 yang **wajib ikut dibetulkan di template**: sel isian hijau ikut terkunci; "Baik " berspasi membuat skor fisik 0; U95 > toleransi (12.8) |
| 11.45 | **U95 Sphygmomanometer (4,1–6,6 mmHg) lebih besar dari toleransi ±3 mmHg** → budget ketidakpastian **ditinjau & dibetulkan di proyek website oleh Claude di Project website** pada awal Tahap 4, usulan perbaikan disetujui pemilik produk dulu |
| 11.46 | **Logo**: Tera SMK memakai **logo Tera SMK** (dari pemilik produk); Manajemen Aset SMK memakai **logo PT SMK** |
| 11.47 | **Memakai Claude Code** *(diubah 18 Okt 2026; sebelumnya: tanpa Claude Code, kode disalin manual)*. Claude commit & push **hanya ke `tera-dev`**; **`main` hanya digabung pemilik produk**; SQL & pengaturan Vercel dijelaskan dulu dan dijalankan setelah "lanjutkan"; **struktur tabel dirancang Claude** (CLAUDE.md 2A) |
| 11.44 | Repo `qrcode-smk` **tetap publik selama pengembangan**, dijadikan Private setelah koding selesai. Selama publik: `_referensi/`, `.env`, dan data pelanggan **wajib** dikecualikan lewat `.gitignore` (F0.9) |

---

## 12. PERTANYAAN TERBUKA (nilai bawaan dipakai bila tidak dijawab)

| # | Pertanyaan | Nilai bawaan |
|---|---|---|
| 12.1 | BAP/BASTP diunduh **siapa & di mana**: teknisi di lapangan (bisa tanpa sinyal) atau Admin Teknik di kantor? | Dari data server (butuh sinyal sebentar); tersedia untuk Admin Teknik **dan** teknisi yang ditugaskan |
| 12.2 | Alat tambahan yang **jenisnya tidak ada di SPH** — harganya dari mana? | Admin Keuangan mengisi harga manual dengan catatan, tercatat di riwayat |
| 12.3 | Nomor **BASTP** = nomor BO juga? | Ya, sama dengan BO |
| 12.4 | Label status **"Cadangan Laik Pakai"** (586 label) di database — artinya apa, dan apakah sama dengan label cadangan di Draf 3? | Dibahas di audit Fase 0 sebelum mengubah apa pun |
| 12.5 | Telepon kop berbeda: (0851) **1234570** vs (0851) **11234570**; "Kenari 3" vs "Kenari 03"; email kedua "**a**ptsaranamultikalibrasi" | Kop dipakai apa adanya dulu (11.33); diperbaiki belakangan |
| 12.6 | Nomor WhatsApp PT SMK: **(0851) 1123-4570** (kop sertifikat & BASTP) atau (0851) 1234570 (kop surat)? | (0851) 1123-4570 |
| 12.7 | Sel **D27 = 12** di file uji `Master_Sphygmomanometer_2.xlsx` (titik 100 mmHg, I Turun) — salah ketik? | Dibetulkan pemilik produk sebelum jadi golden file |
---

## LAMPIRAN A · HAK AKSES

| Aksi | Teknisi | Admin Teknik | Admin Keuangan | Admin SPH | Developer |
|---|:---:|:---:|:---:|:---:|:---:|
| Masuk Tera SMK | ✅ | ❌ | ❌ | ❌ | ✅ |
| Masuk Manajemen Aset | ❌ | ✅ | ✅ | ✅ (SPH saja) | ✅ |
| Isi LKK baru | ✅ | ❌ | ❌ | ❌ | ✅ |
| Ubah LKK sendiri (draft / dikembalikan) | ✅ | ❌ | ❌ | ❌ | ✅ |
| Edit LKK yang sudah dikirim (sebelum ACC) | ❌ | ✅ | ❌ | ❌ | ✅ |
| Kembalikan untuk revisi, ACC | ❌ | ✅ | ❌ | ❌ | ✅ |
| Ubah LKK yang sudah ACC (terkunci) | ❌ | ❌ | ❌ | ❌ | ❌ |
| Ubah LKK yang **dibuka untuk koreksi** | ❌ | ✅ | ❌ | ❌ | ✅ |
| **Buka koreksi** LKK ACC (alasan wajib) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Lihat & tandai penanda AI | ❌ | ✅ | ❌ | ❌ | ✅ |
| Penjadwalan, label, Push ke Tera SMK | ❌ | ✅ | ❌ | ❌ | ✅ |
| Unduh BAP/BASTP | ✅ (RS yang ditugaskan) | ✅ | ✅ | ❌ | ✅ |
| Penagihan, PPN | ❌ | ❌ | ✅ | ❌ | ✅ |
| Lihat riwayat perubahan | ❌ (milik sendiri) | ✅ | ❌ | ❌ | ✅ |
| Kalibrator & koreksi, template, budget, penandatangan, AI | ❌ | ❌ | ❌ | ❌ | ✅ |
| Kelola akun & peran | ❌ | ❌ | ❌ | ❌ | ✅ |
| Log & backup | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## LAMPIRAN B · MODEL DATA

### B.1 Tabel yang sudah ada (dipakai, hanya boleh **ditambah kolom**)
| Tabel | Dipakai untuk | Tambahan kolom (rencana) |
|---|---|---|
| `profiles` | Akun & role (`role` berupa teks) | — (nilai baru `teknisi`) |
| `teknisi` | Nama, jabatan, nomor STR | `user_id` (tautan ke akun) |
| `rumah_sakit`, `folder_label` | Master RS, prefix BO ↔ RS | — |
| `dokumen_sph` | SPH, harga deal (dalam `data`) | `harga_snapshot_at` bila perlu |
| `jadwal_kalibrasi` | Jadwal, teknisi, `label_awal`/`label_akhir`, nomor BAP/BASTP | `label_cadangan_awal`, `label_cadangan_akhir`, `mode_sertifikat` (`tera`/`manual_drive`), `pushed_at`, `ditutup_at` |
| `labels` | Label QR & tautan PDF | `tera_lkk_id`, `tera_pdf_version` (nilai baru `pdf_source = 'tera'`) |
| `dokumen_bap` | BAP/BASTP | `sumber` (`otomatis`/`manual`) |
| `aset_kalibrator` | Master kalibrator | — (koreksi & U95 di tabel baru) |
| `settings` | Pengaturan | kunci `ppn_persen`, `ai_ambang_kuning_persen` |
| `kamus_nama_alat` | Pemetaan nama alat SPH ↔ katalog | dipakai memetakan jenis alat PO ↔ template LKK |

### B.2 Tabel baru (`tera_`)
| Tabel | Kolom penting |
|---|---|
| `tera_device_templates` | id, kode_alat, nama, versi, `kop` (`KAN`/`NON_KAN`), `definition` (JSON, Lampiran C), aktif |
| `tera_calibrator_points` | id, aset_kalibrator_id, berlaku_sampai, `points` (JSON: titik, koreksi, U95), budget, diubah_oleh |
| `tera_lkk` | id (UUID dari perangkat), jadwal_id, bo (char 3), no_label (`BBB.NNNN`), template_id + versi, teknisi_id, tanggal_kalibrasi, `po_item_ref` (baris PO) / `alat_tambahan` (bool), status (`draft`/`submitted`/`under_review`/`returned`/`approved`/`correction_open`), `data`, `results`, `calibrator_snapshot`, `signatory_snapshot`, `snapshot_frozen_at`, revisi_ke, checksum, approved_by, approved_at, is_test, client_updated_at, server_received_at |
| `tera_lkk_returns` | id, lkk_id, alasan, oleh, waktu |
| `tera_lkk_corrections` | id, lkk_id, dibuka_oleh, alasan (wajib), dibuka_pada, di_acc_ulang_oleh, di_acc_ulang_pada |
| `tera_pdf_versions` | id, lkk_id, revisi_ke, pdf_path, drive_url, drive_status, status (`berlaku`/`digantikan`), dibuat_pada |
| `tera_ai_reviews` / `tera_ai_flag_acks` | Hasil pemindaian & penanda "sudah diperiksa" (append-only) |
| `tera_signatories` | nama, gelar, jabatan, aktif — saat ini **Hafizh Pasifianto Utomo, S.Tr.T.**, Manajer Teknik |
| `tera_esign` | id, lkk_id, revisi_ke, kode_verifikasi (acak), penandatangan (snapshot), ditandatangani_pada, status (`berlaku`/`digantikan`) — dasar QR tanda tangan elektronik |
| `tera_audit_log` | id, lkk_id, user_id, waktu, kolom, nilai_lama, nilai_baru, alasan — **append-only** |
| `tera_sync_receipts` | lkk_id, checksum, jumlah_titik, diterima_pada |
| `tera_error_logs` | perangkat, user_id, waktu, pesan, konteks |
| `tera_backup_runs` | waktu, manifest, status verifikasi, uji pulih |

### B.3 Penyimpanan (Supabase Storage)
| Bucket | Status | Isi |
|---|---|---|
| `internal-documents` | sudah ada, privat | dokumen internal lama |
| `documents` | sudah ada, **publik** | ditinjau di Fase 0 (jangan dipakai untuk sertifikat Tera SMK) |
| `tera-certificates` | baru, privat | PDF sertifikat Tera SMK |
| `tera-assets` | baru, privat | PDF kop KAN, kop Non-KAN, kop surat |
| `tera-backups` | baru, privat | backup mingguan |

### B.4 Aturan database
- RLS per peran (Lampiran A); teknisi hanya melihat jadwal & LKK yang ditugaskan.
- Trigger audit pada `tera_lkk`; `tera_audit_log` & `tera_ai_flag_acks` tanpa UPDATE/DELETE.
- Kunci pasca-ACC lewat trigger; perubahan hanya setelah fungsi Developer `buka_koreksi(lkk_id, alasan)`.
- Nomor label ganda dalam satu BO → **peringatan**, bukan penolakan.
- Penautan ke `labels` hanya oleh fungsi server saat ACC (bukan dari browser).
- Data `is_test = true` dikecualikan dari BAP, penagihan, dan laporan.

### B.5 Di perangkat (IndexedDB)
Salinan: jadwal yang ditugaskan, alat PO, template, kalibrator (+ berlaku_sampai), LKK milik teknisi (+ snapshot) + `outbox` (lkk_id, payload, checksum, percobaan, jadwal_berikut, status).

---

## LAMPIRAN C · CONTOH TEMPLATE JSON (Sphygmomanometer, ringkas)

```json
{
  "kode_alat": "sphygmomanometer",
  "nama": "Sphygmomanometer",
  "versi": 1,
  "sumber": "Master Sphygmomanometer.xlsx (v12)",
  "metode": "KMK-MK-090.0",
  "kop": "NON_KAN",
  "nama_katalog_sph": ["Tensi Manual", "Sphygmomanometer"],
  "keselamatan_listrik": "tidak_ada",
  "lingkungan": { "suhu": [15, 35], "kelembaban": [15, 90] },
  "bagian": [
    { "id": "identitas", "judul": "Identitas alat", "isian": ["merek", "tipe", "no_seri", "ruang"] },
    { "id": "fisik", "judul": "Pemeriksaan fisik & fungsi", "daftar_cek": ["Badan & permukaan", "Selang", "Manset", "Bulb & katup"] },
    {
      "id": "kinerja_tekanan",
      "judul": "Akurasi Tekanan / Pressure Accuracy",
      "satuan": "mmHg",
      "titik": [0, 50, 100, 150, 200, 250],
      "pengulangan": 6,
      "kalibrator": "digital_pressure_meter",
      "ketidakpastian": ["tipe_a", "resolusi", "sertifikat_kalibrator", "drift"],
      "toleransi": { "jenis": "abs", "nilai": 3, "uji": "abs(koreksi) + U95 <= toleransi" }
    }
  ],
  "sertifikat": { "tata_letak": "report_all_sphygmomanometer_v12", "halaman": 3 }
}
```

> Nilai di atas contoh bentuk saja. Angka sebenarnya **wajib diambil dari Master Sphygmomanometer v12** dan diverifikasi dengan uji banding.

---

## LAMPIRAN D · DAFTAR UJI PENERIMAAN AKHIR

**Offline & sinkron**
- [ ] Sinyal mati total selama mengisi 10 LKK → semua tersimpan 🟡
- [ ] Sinyal kembali → semua 🟢 tanpa tindakan teknisi
- [ ] Sinyal putus di tengah kirim → tidak ada data setengah, akhirnya 🟢
- [ ] Tutup paksa tab/aplikasi & matikan HP saat 🔵 → setelah hidup, tetap terkirim
- [ ] 50 LKK dikirim sekaligus → 50 🟢, 0 dobel
- [ ] Update versi aplikasi saat ada LKK 🟡 → data tetap
- [ ] Izin penyimpanan permanen aktif; banner muncul bila aplikasi belum dipasang ke layar utama
- [ ] Logout diblokir bila masih ada LKK belum 🟢; Backup ke file → impor di perangkat lain berhasil

**LKK & hitungan**
- [ ] Hitungan setiap alat = Excel v12 (golden file)
- [ ] Scan QR stiker mengisi nomor benar; QR dari BO lain ditolak; ketik manual di luar rentang ditolak
- [ ] Alat tambahan memakai label cadangan & masuk BAP sebagai baris tambahan
- [ ] Kalibrator expired tidak bisa dipilih; LKK yang memuatnya tidak bisa diselesaikan
- [ ] Putar tablet portrait ↔ landscape & pakai di HP → isian tidak hilang, tulisan tidak bertumpuk

**Selia, sertifikat & QR**
- [ ] Teknisi tidak bisa membuka Manajemen Aset; Admin Teknik tidak bisa membuat LKK dari awal
- [ ] Penyelia edit → tercatat; kembalikan → teknisi melihat alasan
- [ ] ACC → QR menampilkan sertifikat < 1 menit; salinan Drive muncul di folder BO – RS
- [ ] Drive dimatikan → ACC & QR tetap jalan, salinan Drive dicoba ulang
- [ ] Sphygmomanometer → kop Non-KAN; Timbangan Bayi Digital → kop KAN; kop di semua halaman
- [ ] PDF setiap alat = PDF cetak Excel v12; tidak ada kata terlarang (9.1); isi tidak menabrak hiasan kop
- [ ] QR tanda tangan elektronik di atas nama Manajer Teknik, halaman 1; scan → halaman verifikasi menampilkan penandatangan, waktu ACC, status Berlaku; setelah koreksi, QR lama menampilkan "Digantikan"; tidak ada paraf penyelia
- [ ] Buka koreksi tanpa alasan → ditolak; dengan alasan → ACC ulang → QR menampilkan versi baru, PDF lama tersimpan
- [ ] Ubah master kalibrator setelah ACC → sertifikat lama tidak berubah
- [ ] Label lama (contoh acak 20 dari 3.934) tetap bisa di-scan; label mode manual Drive tetap berjalan

**BAP, BASTP & penagihan**
- [ ] BAP nomor = BO; realisasi = LKK 🟢 (termasuk TIDAK LAIK); sisa "Belum selesai" → "Batal" saat jadwal ditutup
- [ ] BASTP berisi alat, merek, tipe, SN, teknisi + gelar, tanggal, hasil
- [ ] PDF BAP/BASTP 2 rangkap, teks tidak terpotong, tanggal terisi lengkap atau kosong semua
- [ ] Tagihan: PO 30, batal 3 → DPP 27 × harga SPH + PPN 11%; alat tambahan memakai harga SPH
- [ ] Data BO uji 999 tidak muncul di penagihan sungguhan

**Dua PWA & domain**
- [ ] Ikon "Manajemen Aset SMK" & "Tera SMK" bisa dipasang berdampingan di satu perangkat, masing-masing membuka aplikasinya sendiri
- [ ] Teknisi login → masuk Tera SMK; teknisi membuka `/admin` → ditolak
- [ ] Manajemen Aset SMK dibuka saat offline → pesan jelas, bukan halaman putih
- [ ] Stiker lama dengan alamat `smk-labelqr.vercel.app`, `qrcode-smk.vercel.app`, `manajemen-aset-smk.vercel.app`, `saranamultikalibrasi.com` semuanya tetap membuka sertifikat
- [ ] Sertifikat baru di-ACC langsung terlihat saat scan (halaman scan tidak ter-cache)

**Umum**
- [ ] Kontras WCAG AA; tidak ada loading tanpa batas; tidak ada crash
- [ ] Pemindai AI: kuning/merah sesuai; pemindai mati → sinkron tetap 🟢
- [ ] Backup mingguan lolos verifikasi; uji pulih berhasil

---

## LAMPIRAN E · DAFTAR FILE YANG DIBUTUHKAN & TEMPATNYA

> ⚠️ **Repo `qrcode-smk` saat ini PUBLIK** (bisa dibuka siapa pun). File perusahaan (Master LKK, sertifikat kalibrator, kop, BAP/BASTP berisi nama RS) **tidak boleh** di-commit ke repo publik. Pilih salah satu:
> **(A, disarankan)** jadikan repo **Private** di GitHub (Settings → General → Danger Zone → Change visibility), lalu file referensi boleh di folder `_referensi/` di dalam repo; atau
> **(B)** simpan semua file referensi di folder `_referensi/` yang **dikecualikan dari Git** (`.gitignore`), hanya ada di laptop.

### E.1 Susunan folder di laptop (folder repo `qrcode-smk`)
```
qrcode-smk/
├─ PRD.md                         ← dokumen ini
├─ CLAUDE.md                      ← aturan kerja Claude (Project website)
├─ .env                           ← kunci Supabase (TIDAK di-commit, sudah ada .gitignore)
├─ public/tera/                   ← logo & ikon Tera SMK (dari folder _logo/ di paket)
└─ _referensi/                    ← bahan acuan (lihat E.2)
   ├─ master-lkk-v12/             ← 143 file Master LKK v12 (isi LKK-143_.zip)
   ├─ report-all/                 ← PDF Report All acuan per alat
   ├─ golden/                     ← Excel terisi data nyata untuk uji "sama dengan Excel"
   ├─ kop/                        ← PDF kop sertifikat KAN, Non-KAN, kop surat
   ├─ dokumen-contoh/             ← contoh BAP & BASTP
   ├─ metode-mk/                  ← PDF MK Kemenkes (KMK HK.02.02/D/43649/2024)
   └─ kalibrator/                 ← sertifikat kalibrator (PDF) & datasheet/jurnal
```

### E.2 Daftar lengkap
**Status:** ✅ sudah ada (dikirim di chat) · ⏳ sedang disiapkan · ⬜ belum · ➖ tidak diperlukan lagi

| # | File | Nama file yang disarankan | Taruh di | Untuk tahap | Status |
|---|---|---|---|---|---|
| **Dokumen kerja** ||||||
| E1 | PRD.md | `PRD.md` | root repo | 0 | ✅ |
| E2 | CLAUDE.md | `CLAUDE.md` | root repo | 0 | ✅ |
| **Acuan LKK & sertifikat** ||||||
| E3 | 143 Master LKK v12 | isi `LKK-143_.zip` | `_referensi/master-lkk-v12/` | 4, 6 | ✅ |
| E4 | PDF Report All **Sphygmomanometer** | `Report_All_Sphygmomanometer.pdf` | `_referensi/report-all/` | 4 | ✅ |
| E5 | PDF Report All **Defibrillator** | `Report_All_Defibrillator.pdf` | `_referensi/report-all/` | 6 | ✅ |
| E6 | PDF Report All alat lain | dibuat Claude (Project website) dari Master v12, disetujui pemilik | `_referensi/report-all/` | 6 | ➖ dibuat otomatis |
| E7 | **Golden file Sphygmomanometer** (Excel terisi, sudah diperbaiki) — 2 file | `Master_Sphygmomanometer_golden_1.xlsx`, `…_golden_2.xlsx` | `_referensi/golden/` | 4 | ✅ (file _2: cek 12.7) |
| E8 | Golden file alat berikutnya (Timbangan Bayi Digital, dst.) | `Master_<Alat>_golden_1.xlsx` | `_referensi/golden/` | 6 | ⬜ menyusul per alat |
| E9 | PDF MK Kemenkes per alat | `MK_090_SPHYGMOMANOMETER_NON_OTOMATIS.pdf`, dst. | `_referensi/metode-mk/` | 4, 6 | ✅ sebagian ada di Project (MK 034–133); ⬜ MK 001–033 |
| **Kop & identitas** ||||||
| E10 | Kop sertifikat **Non-KAN** | `KOP_SERTIF_NON_KAN.pdf` | `_referensi/kop/` | 4 | ✅ |
| E11 | Kop sertifikat **KAN** | `KOP_SERTIF_KAN.pdf` | `_referensi/kop/` | 6 | ✅ |
| E12 | Kop surat (BAP/BASTP) | `KOP_SURAT.pdf` | `_referensi/kop/` | 5 | ✅ |
| E13 | Logo SMK vektor | `public/logo-smk.svg` | sudah di repo | 1 | ✅ |
| E14a | **Logo Tera SMK** (lengkap transparan, latar putih, lambang) + **ikon PWA** 192/512/maskable/apple | `_logo/` → salin ke `public/tera/` | `public/tera/` | 1 | ✅ |
| E14 | Logo KAN vektor resmi | `logo-kan.svg` | `_referensi/kop/` | — | ➖ tidak perlu (kop dipakai apa adanya) |
| E15 | Ikon PWA Manajemen Aset SMK | dibuat dari `logo-smk.svg` | `public/` | 1 | ➖ dibuat otomatis |
| E16 | Tanda tangan Manajer Teknik | — | — | — | ➖ diganti QR tanda tangan elektronik |
| **BAP, BASTP, penagihan** ||||||
| E17 | Contoh BAP | `CONTOH_BAP.pdf` | `_referensi/dokumen-contoh/` | 5 | ✅ |
| E18 | Contoh BASTP | `CONTOH_BASTP.xlsx` | `_referensi/dokumen-contoh/` | 5 | ✅ |
| E19 | Nama alat ASPAK | `src/data/aspakAlatMaster.ts` | sudah di repo | 5 | ✅ |
| **Kalibrator** ||||||
| E20 | Data sertifikat kalibrator (koreksi, U95, nomor sertifikat, ketertelusuran) | — | sudah ada di sheet *Calibrator 1/2* tiap Master v12 | 4, 6 | ✅ |
| E21 | PDF sertifikat kalibrator (bukti audit, opsional) | `CERT_<alat>_<nomor>.pdf` | `_referensi/kalibrator/` | — | ⬜ opsional |
| E22 | Datasheet/jurnal untuk kalibrator belum bersertifikat | dicarikan & dicatat sumbernya | `_referensi/kalibrator/` | 4, 6 | ➖ dicarikan Claude (Project website), disetujui pemilik |
| **Akun & sambungan** ||||||
| E23 | 10 akun `@tera.smk` di Supabase Auth (Auto Confirm) | — | Supabase | 1 | ⏳ dibuat pemilik produk |
| E24 | Folder Drive "SERTIFIKAT PT.SMK" | ID `16Jq1_mHM8AMIa2TF8_bGcKwbPUqBWcM8` | Google Drive | 4 | ✅ |
| E25 | Izin sambungan Google Drive (OAuth) | — | Google Cloud Console | 4 | ⬜ dipandu saat Tahap 4 |
| E26 | `.env` lokal (kunci Supabase) | `.env` | root repo (tidak di-commit) | 1 | ⬜ salin dari Vercel ke laptop — **jangan kirim ke chat** |
| **Keputusan yang masih ditunggu** ||||||
| E27 | Repo tetap publik selama pengembangan → **opsi B wajib**: `_referensi/` di `.gitignore`; jadikan Private setelah koding selesai | — | GitHub | 0 | ⬜ |
| E28 | Jawaban 12.6–12.7 | — | — | 4 | ⬜ (ada nilai bawaan) |
