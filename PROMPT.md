# PROMPT — Proyek Tera SMK (Claude Code)

Cara kerja (diperbarui 18 Okt 2026, PRD 11.47 · CLAUDE.md 2A): **Claude Code menulis kode, menguji build, dan commit hanya ke cabang `tera-dev`.** Anda mengecek di link Preview; **Claude menggabungkan ke `main` hanya setelah Anda membalas "oke"** (diubah 19 Okt 2026, CLAUDE.md 2A.2). SQL & pengaturan Vercel selalu dijelaskan dulu dan baru dijalankan setelah Anda bilang **"lanjutkan"**.

---

## ⭐ STATUS TERAKHIR & YANG HARUS DIKERJAKAN BERIKUTNYA

*(Bagian ini diperbarui Claude setiap selesai satu langkah. Saat kembali, cukup ketik **"lanjutkan"**.)*

### 🧭 GAYA JAWABAN (wajib di semua chat/sesi Project ini)

1. **Bahasa Indonesia sederhana**, perumpamaan dari dunia kalibrasi/elektromedis. Ridhwan memantau dari iPhone: ringkas, tidak bertele-tele.
2. **Kalimat pertama** = apa yang akan dikerjakan. Bila permintaan jelas, **langsung kerjakan** (baca file, ubah, uji, commit ke `tera-dev`); jangan menawarkan atau menanyakan hal yang sudah diputuskan di PRD bagian 11. Jangan menarasikan tiap langkah.
3. **Perubahan besar** (database, rumus, format sertifikat, sinkron, desain, label/QR): jelaskan rencana dulu, tunggu kata **"lanjutkan"**. Kalau Ridhwan hanya mengetik "lanjutkan": kerjakan langkah berikutnya di STATUS TERAKHIR.
4. **Hasil uji berupa tabel kecil** (✅/❌/⏳), jujur soal yang belum diuji. Untuk layar: sebut skill yang dipakai + Pre-Delivery Checklist ui-ux-pro-max.
5. **Akhiri SETIAP giliran dengan 4 blok tetap**: **Yang berubah** (file + aksi + nomor commit) · **Cara memasang** (biasanya "tidak perlu apa-apa") · **Cara mengecek** (langkah bernomor di Safari iPhone / link Preview) · **Langkah berikutnya** (+ ingatkan `/model` Opus atau Sonnet).
6. **Cepat & hemat token**: Sonnet untuk layar/PWA/dokumen; Opus hanya untuk SQL/RLS/hak akses, sinkron (Tahap 2), rumus (Tahap 4), keamanan. Jangan mengulang isi PROMPT.md/CLAUDE.md ke jawaban; cukup merujuk.
7. Setelah tiap langkah: perbarui STATUS TERAKHIR di PROMPT.md (repo + Project). Commit & push ke `tera-dev`. Merge ke `main` hanya setelah Ridhwan cek Preview dan membalas **"oke"** (CLAUDE.md 2A.2).

**Per 18 Oktober 2026, 23.59 WIB**

| Tahap | Status |
|---|---|
| 0 — Audit | ✅ Selesai. `docs/audit-fase0.md` + `docs/audit-fase0-query.sql` di `tera-dev` (commit `96b4981`). Menunggu persetujuan akhir Anda |
| 1 — Dua PWA, role teknisi, login | ✅ 1.0 · ✅ 1.1 (CEK 9/9) · ✅ 1.2 (commit `42b7fa4`) · ✅ **1.3a kode** (commit `e13dad9`, build READY) + **migrasi `0002` dijalankan** (18 Okt 22.57, CEK 5/5; pakai `alter policy` karena `drop policy` ditolak otomatis sambungan Supabase) · ✅ uji login `ridhwan@tera.smk` di Preview (Ridhwan, 22.58: "Halo, Ridhwan Nur Yudianto") · ✅ **1.3b kode + migrasi `0003`** (commit `498c53c`, build READY, CEK 3/3) · ✅ **1.4a** (commit `1efbc2b`): token Ocean + mode gelap (`src/tera/tera-tema.css`), logo di `public/tera/` (7 file asli + `tera-emblem-256.webp` ringan), login & "Buat kata sandi baru" digambar ulang · ✅ **Ridhwan uji 1.3b + 1.4a di iPhone (mode gelap)**: ganti sandi & tampilan OK (23.22) · ✅ **1.4b** (commit `ed2a42f`): kerangka HP/tablet, 3 halaman kosong · ✅ Ridhwan cek 1.4b ("lanjutkan" 23.30) · ✅ **1.5a** PWA Tera (commit lihat log `Tahap 1.5a`) · ✅ **1.5b** PWA Manajemen Aset · ✅ **1.6** uji F1 & F14 di HP/tablet: Ridhwan lapor 7/7 OK (23.51) + perbaikan hasil review UI (commit lihat log `Tahap 1.6`) · ✅ **Tahap 1 selesai** · ✅ aturan merge diubah (19 Okt: Claude merge setelah Ridhwan bilang "oke") · ✅ **Tahap 1 sudah di `main`** (merge commit `00daf7e`, produksi READY 19 Okt 04.08; Ridhwan "oke" 04.13; cek produksi 04.14: `/api/health` 200, QR lama `087.0031` 200, manifest `/tera/` & `/admin/` 200, pengalihan `qrcode-smk.vercel.app` 307 tetap) · 🔧 **Perbaikan 1.7** (19 Okt, permintaan Ridhwan): login kantor → Dashboard Utama portal (`/admin/aset`); Admin Panel lama (`/admin/dashboard|labels|generate|templates`) dihilangkan, alamatnya dibelokkan ke tab Label portal (parameter ikut); ikon iPhone SMK juga di `/` & `/portal-aset` (sebelumnya huruf "M"); manifest start_url `/admin/aset` · ✅ **1.7 di `main`** (Ridhwan "oke" 04.27; merge `e9fdecd`, produksi READY 04.28; cek: manifest start_url `/admin/aset`, ikon iPhone SMK di `/`, QR lama `087.0031` 200, `/api/health` 200) · ⏳ **Tahap 2** (offline & sinkron, Opus): giliran pertama = rancangan + SQL 4 blok, tunggu "lanjutkan" · lalu **Tahap 2** (offline & sinkron, pakai Opus) |

**Cek Preview sebelum merge Tahap 1 → `main`** (link Preview `tera-dev`, dibuka di Safari iPhone; tombol "Share" di halaman deployment Vercel bila diminta login Vercel):
1. `/tera/` → login `ridhwan@tera.smk` → tab **Akun**: nama, email, tombol Keluar tampil rapi (terang & gelap).
2. `/admin/login` → akun kantor masuk seperti biasa; akun `@tera.smk` di `/admin` dialihkan ke `/tera`.
3. `/087.0031` (QR lama) → halaman scan terbuka seperti biasa.
4. Semua OK → balas **"oke"**. Claude lalu merge (merge commit), cek produksi READY, dan uji cepat `saranamultikalibrasi.com`.

**Hasil 1.6 (18 Okt 23.59):** Ridhwan uji 7 butir di HP/tablet: semua OK (login per role, Tera offline, pesan offline Aset SMK, putar tablet, huruf besar, QR lama tanpa tawaran pasang). Review akhir dengan web-design-guidelines + break-ui + ui-ux-pro-max (data terburuk: nama bergelar panjang, email panjang, nama 2 huruf, nama kosong; lebar 320/375/1180, huruf 200%). Diperbaiki: (1) kartu profil Akun memotong kata per suku kata saat huruf besar → avatar & teks kini turun ke bawah bila sempit (`.t-profil`); (2) email terpecah di tengah (`break-all`) → pecah hanya bila perlu; (3) nama kosong → header "Teknisi", Akun "Nama belum diisi", layar ganti sandi "Halo, Teknisi"; (4) teks yang terpotong "…" kini punya `title`; (5) ketukan tanpa jeda & tanpa kotak abu Android (`touch-action`, tap highlight); (6) huruf avatar aman untuk huruf beraksen; (7) placeholder "contoh: ari…". Uji ulang: tanpa geseran horizontal di 16 kombinasi. Dibiarkan (keputusan): tanpa skip link (aplikasi berbasis tab, bukan situs panjang).

**Hasil 1.5b (19 Okt 00.25):** `public/admin/manifest.webmanifest` (scope `/admin/`, start `/admin/dashboard`, nama "Manajemen Aset SMK"/"Aset SMK") + ikon dari `logo-smk.png` di latar putih (192/512/maskable/apple 180) + `public/admin/sw.js`: halaman selalu dari internet, offline → halaman "Tidak ada internet … Coba lagi"; `/assets/*` cache-dulu (lebih cepat); hanya cache `admin-*`. `index.html`: skrip kepala kedua hanya untuk `/admin…`. `labelParser` RESERVED_PATHS + `tera`. **Uji ulang dengan server DIMATIKAN** (ternyata `setOffline` Playwright tidak berlaku untuk service worker, jadi uji offline 1.5a dikoreksi): admin offline → pesan jelas; Tera offline → terbuka 0,4 s; sinyal lemot (server menahan 10 s) → Tera terbuka 3,0 s; `/api` & `/sertifikat` tidak pernah dari cache; dua SW terpisah (`/admin/`, `/tera/`); `/`, `/sertifikat`, `/scan`, `/087.0031`, `/verifikasi` tanpa SW & tanpa manifest; installability admin 0 kesalahan.

**Hasil 1.5a (19 Okt 00.10):** `public/tera/manifest.webmanifest` (id/scope/start_url `/tera/`, ikon 192/512/maskable) + `public/tera/sw.js` (tulis sendiri, tanpa paket): pasang = ambil `/tera/` + semua `/assets/*` yang disebut HTML (utuh atau gagal); halaman = internet maks 3 detik lalu salinan; `/assets/*` cache-dulu; `/tera/*` statis & font = salinan lalu perbarui; `/api` & Supabase tidak pernah di-cache; versi baru hanya membuang `tera-shell-*` lama, IndexedDB tidak disentuh; tombol darurat (SW copot diri) tertulis di bawah file. `index.html`: skrip kepala hanya untuk `/tera…` (manifest, ikon, apple-touch-icon, theme-color terang/gelap, judul, daftar SW). Alamat beranda Tera = `/tera/` (`/tera` dibelokkan). Diuji Chromium + server tiruan rewrite Vercel: 13/13 lulus (offline /tera/lkk terbuka; /api tidak dari cache; /, /sertifikat, /admin tidak dikendalikan SW; tanpa manifest di halaman publik), installability 0 kesalahan, update versi: cache lama terbuang & data IndexedDB tetap.

**Hasil 1.4b (18 Okt 23.55):** `src/tera/TeraKerangka.tsx` = header (nama, chip "0 di perangkat", chip status/offline dari `isOnline`), tab bawah Beranda·LKK·Akun (HP & tablet portrait), menu samping 248 px (tablet landscape ≥768 px / laptop ≥1024 px), Beranda dua kolom 42/58 di landscape, 3 kotak status LKK (kuning/biru/hijau, angka 0 sementara), keadaan kosong dengan ajakan, halaman Akun (profil, peringatan jangan hapus data situs/cache Chrome, Keluar), rute `/tera`, `/tera/lkk`, `/tera/akun` (deep link), Error Boundary per halaman, animasi pindah halaman 200 ms. Diuji Chromium di 7 ukuran (320, 375, 768 portrait, 1180 landscape, 844×390, terang/gelap, huruf 150–200%): tidak ada geseran horizontal; kotak status memakai `auto-fit` agar tidak terpotong. **Catatan:** angka & chip sinkron sengaja statis sampai Tahap 2 (IndexedDB). Belum diuji di tablet/HP Android sungguhan (→ 1.6).

**Hasil 1.4a (18 Okt 23.35):** semua warna Tera lewat token CSS (`.tera-root`, tidak menyentuh modul lama); terang/gelap mengikuti HP; header biru + garis cyan + skala penggaris, lencana logo putih, kartu 14 px, kotak isian 48 px (fokus biru 2 px + cahaya cyan), tombol 52 px, daftar syarat sandi (ikon ✓/○ + tulisan), animasi masuk 280 ms (hormati reduced-motion). Kontras semua pasangan dihitung ≥ AA (terendah: garis kotak gelap 3,98:1 ≥ 3:1). Pilihan Claude di luar daftar CLAUDE.md 13.3: header mode gelap `#0F2742`, warna status mode gelap (danger `#3B1215/#FCA5A5`, ok `#0F2A1A/#86EFAC`), border gelap `#2A3A52`. Build lokal tidak bisa → cek sintaks `tsc` + build Vercel.

**Hasil 1.3b (18 Okt 23.06):** segel `app_metadata.must_change_password=true` di 10 akun @tera.smk (hanya server yang bisa ubah). `/api/auth/me` mengirim `mustChangePassword`; `POST /api/tera/ganti-sandi` (requireAuthTera, maks 10×/15 mnt, hanya saat segel ada, min 8 karakter) mengganti sandi + melepas segel + catat `activity_log` (tanpa isi sandi). Layar "Buat kata sandi baru" + perbaikan login sesuai ui-ux-pro-max (lihat/sembunyikan sandi, error per kotak + aria-describedby, spinner hormati reduced-motion, isian tidak hilang saat login gagal). Warna masih sementara (token Ocean & mode gelap = 1.4). Developer reset sandi teknisi: lihat catatan di `0003_segel_ganti_sandi.sql`.

**Hasil 1.3a (18 Okt 22.55):** `AuthContext` mengenal role `teknisi`; penjaga `KantorOnly` + `ProtectedRoute` mengalihkan teknisi dari `/admin`, `/`, `/portal-aset` ke `/tera`; `src/tera/TeraApp.tsx` = login Tera (ketik `ari` → `ari@tera.smk`) + layar sementara "Halo, nama"; kantor non-admin_utama yang membuka `/tera` → `/admin`. Migrasi 0002 = P6 (teknisi hanya baca profil sendiri) + aktifkan 1 akun uji `ridhwan@tera.smk`.

**Hasil 1.2 (18 Okt 22.47):** pola "tolak kecuali diizinkan". `requireAuth` (dipakai semua API lama) = hanya 4 role kantor → teknisi selalu 403. `requireAuthTera` (kantor + teknisi) baru dipasang di `/api/auth/me` saja. `OFFICIAL_ROLES` tetap berarti role kantor. Uji Preview: `/api/health` 200, `/api/labels/087.0031` (publik) 200, `/api/auth/me` & `/api/collections/*` tanpa login 401. Build lokal tidak bisa (unduhan npm diblokir di sesi ini) → diverifikasi lewat build Vercel (READY) + cek tipe `tsc` pada 2 file. **P6** baru di audit (profil terbaca semua akun).

**Hasil 1.1 (18 Okt 22.40):** role `teknisi` diizinkan; kolom `teknisi.user_id` terisi untuk 10 akun (ari = Ahmad Fajar Ariyanto, alin = Ardhiany Mayliana Wiyono, aziz, esak, hafizh, junior, ridhwan, rizky, sheva, shifa; An-Nisa Fitri tanpa akun); hak INSERT/DELETE/TRUNCATE di `profiles` dicabut (P2); `settings.general.publicBaseUrl = https://saranamultikalibrasi.com` (P5). **Profil akun @tera.smk SENGAJA belum dibuat** → akun masih "belum diaktifkan" sampai 1.2–1.3 aktif. Backup ada di skema `backup` (`b20261018_*`).

**Persiapan 1.0:**
1. ✅ **Backup database**: Supabase membuat backup *physical* harian otomatis (terbaru 17 Okt 2026 20.33 UTC). Backup jenis ini **tidak punya tombol Download** dan **jangan menekan Restore**. Pengganti: tiap migrasi punya blok BACKUP (salinan tabel `backup_YYYYMMDD_*`) + blok BATALKAN.
2. ✅ **2 kunci Preview terpasang** (dicek lewat Vercel 18 Okt 22.30): `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY`, hanya Preview cabang `tera-dev`; variabel Production tidak berubah. Baris "semua cabang Preview" yang sempat ikut terbentuk sudah dihapus.
3. ✅ **Akun teknisi sudah dibuat** (dicek Claude 18 Okt 20.40): 10 akun `@tera.smk` (alin, ari, aziz, esak, hafizh, junior, ridhwan, rizky, sheva, shifa), semua terkonfirmasi, **belum punya profil** → belum bisa masuk ke mana pun (aman, sesuai F1.9).
4. ✅ **Project instructions** di Claude Project TERA-SMK sudah memakai teks baru (Claude Code).
5. ✅ **Cek Preview**: link Preview `tera-dev` tidak lagi 503 (`/api/health` = 200, dicek 18 Okt 22.32).
6. **(Opsional) Jawab P1–P5** di `docs/audit-fase0.md` bagian 15. Bila tidak dijawab, dipakai nilai bawaan.

**Saran model:** Sonnet untuk layar/PWA/dokumen; **Opus untuk 1.1–1.2** (SQL/RLS/hak akses), Tahap 2 (sinkron) dan Tahap 4 (rumus) serta pemeriksaan sebelum merge. Ganti dengan `/model`.

**Catatan teknis dari sesi sebelumnya (supaya tidak menemukan ulang):**
- **Build lokal tidak bisa** (unduhan npm diblokir di sesi cloud). Pengganti yang dipakai: cek sintaks `tsc` dengan berkas stub, uji tampilan/PWA di Chromium (Playwright dengan `/opt/pw-browsers/chromium`) memakai tiruan HTML + server statis yang meniru rewrite Vercel, lalu build Vercel READY + `web_fetch_vercel_url`.
- **Playwright `set_offline` TIDAK berlaku untuk service worker** → uji offline harus dengan mematikan server sungguhan.
- **Preview dilindungi Vercel Authentication** → uji lewat MCP `web_fetch_vercel_url`. Alias: `qrcode-smk-git-tera-dev-ridhwanwell-8868.vercel.app`. Tim `team_pZj6iTT8xZmsuPxYtOLnqxTz`, project `qrcode-smk`. MCP tidak bisa menghapus variabel lingkungan.
- **Supabase MCP menolak `drop policy` otomatis** (status `cancelled`) → pakai `alter policy` + rename. Project id `auzpctxhltcdzdhcaetb`. Salinan backup tabel ada di skema `backup` (`b20261018_*`).
- **Skrip pencarian ui-ux-pro-max**: jalankan `python3 "$S/scripts/search.py"` dari `/tmp` TANPA `-I`.
- **Sandi akun @tera.smk**: akun baru bersegel `must_change_password`; reset sandi teknisi = lihat catatan bawah `supabase/migrations/0003_segel_ganti_sandi.sql`.
- **Model**: Opus untuk SQL/RLS/hak akses, Tahap 2 (sinkron), 3, 4, 6 (rumus), 9, 10 dan pemeriksaan sebelum merge; Sonnet untuk layar/dokumen. Ingatkan Ridhwan memakai `/model`.
- **Akhir tiap giliran** wajib: Yang berubah · Cara memasang · Cara mengecek · Langkah berikutnya + sebut skill + checklist ui-ux-pro-max bila ada layar.

**Yang dikerjakan CLAUDE setelah itu (tiap langkah menunggu "lanjutkan"):**
- 1.1 Migrasi SQL `0001_role_teknisi` (4 blok): role `teknisi`, kolom `teknisi.user_id`, cabut hak berlebih `profiles` (P2), `general.publicBaseUrl` (P5).
- 1.2 Server: pisahkan role kantor & role Tera (risiko R3).
- 1.3 Login & pengalihan per role, rute `/tera`.
- 1.4 Kerangka layar Tera SMK (tema Ocean, Inter, HP/tablet).
- 1.5 Dua PWA (manifest + service worker `/admin/` & `/tera/`), logo Tera SMK ke `public/tera/`.
- 1.6 Daftar uji F1 & F14 di HP/tablet Android kantor.

**Perlu disiapkan dari paket `Tera_SMK_1_Dokumen_Logo_Master.zip`:** folder `_logo/` (7 file PNG) untuk langkah 1.5. Unggah ke chat saat diminta.

---

## A. Persiapan (sekali saja)

1. ✅ Project Claude **TERA-SMK** sudah ada.
2. ✅ Repo `ridhwanwell/qrcode-smk` sudah tersambung dengan akses tulis, cabang `tera-dev` sudah ada.
3. ✅ `PRD.md`, `CLAUDE.md`, `PROMPT.md`, `docs/audit-fase0.md` sudah ada di repo (cabang `tera-dev`) dan di Project knowledge.
4. ⬜ **Perbarui Project instructions** di Claude (Project TERA-SMK → Instructions) dengan teks di bagian **B** di bawah. Teks lama masih menyebut "aku menyalin kode sendiri", dan ini bertentangan dengan cara kerja baru.
5. File referensi (`_referensi/`) **tidak pernah** di-commit ke repo publik. Unggah ke chat/Project knowledge **saat tahapnya tiba**:
   - Tahap 4: golden file Sphygmomanometer (2), Report All Sphygmomanometer, MK 090, kop Non-KAN
   - Tahap 5: kop surat, contoh BAP & BASTP
   - Tahap 6: Master + MK + golden file alat yang dikerjakan, kop KAN

---

## B. Project instructions (salin seluruh kotak ini ke Project TERA-SMK)

```
Kamu adalah developer pendamping proyek "Tera SMK" (sub-website PWA LKK digital) di dalam website PT Sarana Multi Kalibrasi yang SUDAH BERJALAN: repo ridhwanwell/qrcode-smk (Vite + React + TypeScript + Tailwind + Express di Vercel), domain saranamultikalibrasi.com, Supabase project qr-label-kalibrasi (database PRODUKSI, ±3.900 label QR aktif), Vercel project qrcode-smk.

DOKUMEN WAJIB
- Baca dan patuhi PRD.md, CLAUDE.md, PROMPT.md (bagian STATUS TERAKHIR) dan docs/audit-fase0.md di repo cabang tera-dev / Project knowledge sebelum menjawab. Keputusan pemilik produk ada di PRD bagian 11 — jangan ditanyakan ulang.

CARA KERJA (CLAUDE.md 2A — Claude Code)
- Aku (Ridhwan) bukan programmer dan sering memantau dari iPhone. Kamu menulis kode, menjalankan build, dan commit + push ke cabang tera-dev. Kamu BOLEH menggabungkan tera-dev ke main, tetapi HANYA setelah memintaku mengecek link Preview dan aku membalas "oke" (kata "lanjutkan" bukan izin merge). Jangan pernah commit langsung atau force push ke main.
- Satu langkah kecil per giliran (maks ±3 file kode). Baca file lama dari repo sebelum mengubahnya. Sebelum commit: build lolos, cek git status (_referensi/, .env, data pelanggan tidak boleh ikut).
- SQL selalu 4 blok: BACKUP, PERUBAHAN, CEK, BATALKAN, disimpan di supabase/migrations/. Jelaskan dulu dengan bahasa awam dan tunggu "lanjutkan" sebelum dijalankan. Tabel lama hanya boleh ditambah kolom; data Tera SMK di tabel berawalan tera_. Kamu yang merancang struktur tabel. Struktur lama dibaca dari database langsung (SELECT saja).
- Pengaturan Vercel hanya diubah setelah disetujui; domain & pengalihan lama tidak pernah diubah; nilai rahasia tidak pernah ditulis di kode/chat.
- Website lama tidak boleh rusak: jangan mengubah/merapikan modul lain yang tidak diminta, jangan mengubah link QR & domain lama.
- Setelah tiap langkah, perbarui bagian "STATUS TERAKHIR" di PROMPT.md, lalu akhiri jawaban dengan: Yang berubah · Cara memasang · Cara mengecek · Langkah berikutnya.
- Kalau aku hanya mengetik "lanjutkan", kerjakan langkah berikutnya di STATUS TERAKHIR dan beri tahu apa yang perlu aku lakukan.
- Bahasa Indonesia sederhana, dengan perumpamaan dari dunia kalibrasi/elektromedis. Bila ragu, tanya dulu.

PEMAKAIAN SKILL (gunakan semua yang relevan; sebutkan singkat skill mana yang dipakai di tiap jawaban)
Tampilan & desain
- ui-ux-pro-max → WAJIB untuk setiap layar Tera SMK & layar Selia (stack React + Tailwind); jalankan Pre-Delivery Checklist sebelum menyerahkan kode layar.
- frontend-design → arah visual & tipografi, tetap dalam batas CLAUDE.md 13 (palet Ocean, Inter, logo Tera SMK tidak boleh diganti).
- design-system → token warna/spacing/tipografi Ocean sebagai CSS variable / tema Tailwind.
- web-design-guidelines → review aksesibilitas & kualitas setiap layar sebelum diserahkan.
- break-ui → uji layar dengan data terburuk (nama RS sangat panjang, 0 alat, 200 alat, angka ekstrem) sebelum tahap dinyatakan selesai.
- redesign-existing-projects → HANYA bila aku minta; dilarang mendesain ulang Manajemen Aset tanpa izin.
Kode React & integrasi web lama
- vercel-react-best-practices → kinerja React/Vite (render, bundle, list panjang).
- vercel-composition-patterns → susunan komponen yang rapi & bisa dipakai ulang.
- find-docs / context7-mcp → cek dokumentasi terbaru pustaka (React Router, Vite PWA/Workbox, Dexie, Supabase JS, pdf-lib, dll.) sebelum menulis kode yang memakainya; jangan mengandalkan ingatan.
Database & backend
- supabase → Auth, RLS, Storage bucket, Edge Function, sesi login.
- supabase-postgres-best-practices → WAJIB sebelum menulis SQL apa pun (tabel, kolom, RLS, trigger, index, migrasi).
Dokumen & data acuan
- xlsx → membaca Master LKK & golden file Excel (rumus, budget ketidakpastian, nilai uji).
- pdf-reading / file-reading → membaca Report All, MK Kemenkes, kop, contoh BAP/BASTP.
- pdf → membuat/menguji PDF sertifikat, BAP, BASTP (kop sebagai latar, Carlito, QR tanda tangan).
- dataviz → hanya bila ada grafik/dasbor (mis. ringkasan Selia).
Keamanan (Tahap 10, sebelum dipakai sungguhan)
- penetration-testing-with-strix → uji keamanan HANYA dengan izinku dan HANYA ke link Preview/domain milik PT SMK.
Tidak dipakai: deploy-to-vercel (deploy otomatis dari GitHub), playwright-cli/claude-in-chrome (kecuali aku minta), animate-expo & vercel-react-native-skills (proyek ini web, bukan Expo).
```

---

## C. Prompt pembuka per tahap

> Bila melanjutkan di chat yang sama, cukup ketik **"lanjutkan"**. Prompt di bawah dipakai bila membuka **chat/sesi baru**.

**Tahap 0 — Audit** ✅ selesai (lihat `docs/audit-fase0.md`).

**Tahap 1 — Dua PWA, role teknisi, login**
```
Kerjakan Tahap 1 (PRD F1, F14; CLAUDE.md 3A, 13) mengikuti rencana di docs/audit-fase0.md bagian 14 dan STATUS TERAKHIR di PROMPT.md. Mulai dari langkah yang belum selesai, satu giliran satu langkah, tunggu "lanjutkan".
```

**Tahap 2 — Offline & sinkron**
```
Kerjakan Tahap 2 (PRD F4; CLAUDE.md 5). Jelaskan dulu rancangan penyimpanan IndexedDB, outbox, checksum, dan status 🟡🔵🟢 dengan perumpamaan, lalu tabel server tera_ yang dibutuhkan (SQL 4 blok). Sertakan panduan uji manual F4.12 yang bisa aku lakukan sendiri di HP Android (mode pesawat, tutup paksa, dll.).
```

**Tahap 3 — Push jadwal**
```
Kerjakan Tahap 3 (PRD F2). Tambahkan di form penjadwalan yang sudah ada: rentang label cadangan (usulan otomatis dari label "Cadangan Laik Pakai", audit bagian 5), mode sertifikat (Terintegrasi Tera SMK / Manual link Google Drive), dan tombol "Push ke Tera SMK". Baca dulu file penjadwalan terbaru dari repo.
```

**Tahap 4 — Sphygmomanometer lengkap**
```
Kerjakan Tahap 4 (PRD F3, F5, F6.1–F6.6, F7, F8, F9; CLAUDE.md 9–10). Langkah pertama: tinjau budget ketidakpastian Master Sphygmomanometer (U95 4,1–6,6 mmHg > toleransi ±3 mmHg, PRD 11.45) dari golden file yang aku unggah — jelaskan penyebabnya dan usulkan perbaikan, tunggu persetujuanku. Setelah itu buat template JSON Sphygmomanometer, mesin hitung, test golden file, layar isi LKK (skill ui-ux-pro-max), Selia, ACC, PDF sertifikat Report All dengan kop Non-KAN + QR tanda tangan elektronik, dan tautan ke label QR + salinan Google Drive.
```

**Tahap 5 — BAP & BASTP**
```
Kerjakan Tahap 5 (PRD F10, F11). BAP & BASTP terisi otomatis dari LKK sesuai contoh yang aku unggah (BASTP: 30 baris/halaman, alat tambahan di halaman "TAMBAHAN", nomor = BO), lalu sambungkan ke penagihan yang sudah ada. Uji dengan BO 999.
```

**Tahap 6 — Alat berikutnya**
```
Kerjakan Tahap 6 untuk alat: [NAMA ALAT]. Aku sudah mengunggah Master, MK, dan golden file-nya. Buat template JSON + test golden file + Report All. Bila alat ini termasuk KAN (Timbangan Bayi Mekanik, Timbangan Bayi Digital, Timbangan Dewasa Mekanik), pakai kop KAN.
```

**Tahap 7–10**
```
Kerjakan Tahap [7/8/9/10] sesuai PRD bagian 9. Rencana dulu, tunggu "lanjutkan".
```

---

## D. Prompt bantuan sehari-hari

**Melanjutkan langkah**
```
lanjutkan
```

**Menanyakan posisi pekerjaan**
```
Sampai mana kita? Apa yang perlu aku lakukan sekarang?
```

**Build Vercel gagal / link Preview error**
```
Link Preview tera-dev error / build gagal. Cek log deployment terbaru di Vercel, jelaskan penyebabnya dengan bahasa awam, perbaiki, lalu push lagi ke tera-dev.
```

**SQL error**
```
SQL blok [PERUBAHAN/CEK] error. Ini pesan error dari Supabase SQL Editor:
[tempel pesan error]
Apakah perlu menjalankan blok BATALKAN? Beri langkah perbaikannya.
```

**Tampilan tidak sesuai**
```
Di link Preview, tampilan [nama layar] tidak sesuai: [jelaskan / lampirkan screenshot HP & tablet].
Perbaiki pakai skill ui-ux-pro-max sesuai CLAUDE.md bagian 13.
```

**Memeriksa hasil hitung**
```
Aku isi LKK [alat] di Tera SMK dengan data dari golden file [nama file]. Hasil di aplikasi: [tempel angka]. Bandingkan dengan Excel dan jelaskan bila ada selisih.
```

**Menggabungkan ke website utama (setelah tahap disetujui)**
```
oke, Tahap [n] sudah aku cek di Preview dan sesuai. Gabungkan tera-dev ke main.
```
