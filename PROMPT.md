# PROMPT — Proyek Tera SMK (Claude Code)

Cara kerja (diperbarui **22 Okt 2026**, PRD 11.48–11.50 · CLAUDE.md 2A): **Claude Code menulis kode, menguji build, lalu commit & push LANGSUNG ke `main`** (tanpa `tera-dev`, tanpa kata "oke" per merge), dengan pengaman: build/uji lolos dulu, cek produksi READY + uji cepat sesudah push, tawarkan *Promote* bila bermasalah, tidak pernah `push --force`. SQL & pengaturan Vercel tetap dijelaskan dulu dan baru dijalankan setelah Anda bilang **"lanjutkan"**. **Cakupan awal 5 alat**: Sphygmomanometer (diulang), Kelistrikan, Timbangan Bayi Digital, Suction Pump, Thermohygrometer — sampai Tahap 10.
---

## ⭐ STATUS TERAKHIR & YANG HARUS DIKERJAKAN BERIKUTNYA

*(Bagian ini diperbarui Claude setiap selesai satu langkah. Saat kembali, cukup ketik **"lanjutkan"**.)*

### 📍 STATUS BARU (disusun 27 Okt 2026 dari entri "BERIKUTNYA" & "Hasil 6.x"; riwayat lengkap ada di `docs/riwayat/`, jangan dibaca ulang)

**Tahap saat ini:** Tahap 6 (alat berikutnya) berjalan. Tahap 0–5 sudah dikerjakan (terakhir 5.4: sambungan BAP/BASTP ke Penagihan RS). Cara kerja: satu alat dikerjakan sampai akhir; pengecualian tetap = teks sertifikat baru & migrasi berisiko (tunggu "lanjutkan").

**Alat yang sudah jadi** (LKK tablet → Selia → ACC → sertifikat PDF Non-KAN → QR TTE; BAP/BASTP/Rekap ikut otomatis):
- Sphygmomanometer — template v3 (dari Excel sphygmo-v5)
- Infusion Pump — template v4
- Syringe Pump — template v3
- Keselamatan Listrik — template v2 (fisik & fungsi ≥ 70 % ikut menentukan)
- NIBP — template v2 (kelistrikan tidak dinilai, skor maks 60)
- Migrasi terakhir yang dijalankan: 0030.

**Langkah berikutnya:** alat ke-6 — menunggu Ridhwan menentukan dan mengunggah filenya (Master Excel + Excel contoh isi + PDF sertifikat contoh + data kalibrator). Jangan menebak isi master; minta filenya. Satu keluarga per chat. Setelah Tahap 6 selesai → Tahap 7 (Pemindai AI & highlight).

**Menunggu jawaban Ridhwan:**
1. Alat ke-6 yang mana. Suction Pump DITUNDA (LKK belum selesai dicek); Timbangan Bayi Digital & Thermohygrometer menyusul.
2. NIBP: di Excel (View Report AE2) skor fisik menghitung "Baik" di G:I ÷ 6 sehingga selalu 0; aplikasi memakai aturan "semua kotak". Sudah ditanyakan, belum ada jawaban tercatat.
3. Master Excel Syringe L18:L22: disarankan `ABS(F18)+N(I18)<=T18` (pakai U95, bukan T/3). Opsional, di file Excel Ridhwan.
4. Sphygmomanometer: baris "Tempat" belum punya batas kanan (RS bernama panjang bisa menimpa "Tanggal"). Belum dikerjakan; tawarkan bila diminta.

### 🧭 GAYA JAWABAN (wajib di semua chat/sesi Project ini)

1. **Bahasa Indonesia sederhana**, perumpamaan dari dunia kalibrasi/elektromedis. Ridhwan memantau dari iPhone: ringkas, tidak bertele-tele.
2. **Kalimat pertama** = apa yang akan dikerjakan. Bila permintaan jelas, **langsung kerjakan** (baca file, ubah, uji, commit & push ke `main`); jangan menawarkan atau menanyakan hal yang sudah diputuskan di PRD bagian 11. Jangan menarasikan tiap langkah.
3. **Perubahan besar** (database, rumus, format sertifikat, sinkron, desain, label/QR): jelaskan rencana dulu, tunggu kata **"lanjutkan"**. Kalau Ridhwan hanya mengetik "lanjutkan": kerjakan langkah berikutnya di STATUS TERAKHIR.
4. **Hasil uji berupa tabel kecil** (✅/❌/⏳), jujur soal yang belum diuji. Untuk layar: sebut skill yang dipakai + Pre-Delivery Checklist ui-ux-pro-max.
5. **Akhiri SETIAP giliran dengan 4 blok tetap**: **Yang berubah** (file + aksi + nomor commit) · **Cara memasang** (biasanya "tidak perlu apa-apa") · **Cara mengecek** (langkah bernomor di Safari iPhone / link Preview) · **Langkah berikutnya** (+ ingatkan `/model` Opus atau Sonnet).
6. **Cepat & hemat token**: Sonnet untuk layar/PWA/dokumen; Opus hanya untuk SQL/RLS/hak akses, sinkron (Tahap 2), rumus (Tahap 4), keamanan. Jangan mengulang isi PROMPT.md/CLAUDE.md ke jawaban; cukup merujuk.
7. Setelah tiap langkah: perbarui STATUS TERAKHIR di PROMPT.md (repo + Project). Commit & push ke `main` dengan pengaman CLAUDE.md 2A.2 (cek produksi READY sesudah push).
8. **ATURAN TETAP SERTIFIKAT (Ridhwan 26 Okt 2026 19.26):** di halaman 2, 3, dst. jarak kotak **Nomor Order / Nomor Sertifikat** ke baris e-mail kop **sama dengan Sphygmomanometer** = kotak Nomor Order di **y 112,91 pt** (acuan cetakan Excel 104,91 + geser 8 pt; `GESER = {2: 8.0, 3: 8.0}` di `tools/tera/buat_templat_pompa.py`). Jangan memakai geser lebih besar (24,7 pt dulu = terlalu jauh). Berlaku untuk setiap sertifikat alat baru.

**Catatan teknis dari sesi sebelumnya (supaya tidak menemukan ulang):**
- **Build lokal tidak bisa** (unduhan npm diblokir di sesi cloud). Pengganti yang dipakai: cek sintaks `tsc` dengan berkas stub, uji tampilan/PWA di Chromium (Playwright dengan `/opt/pw-browsers/chromium`) memakai tiruan HTML + server statis yang meniru rewrite Vercel, lalu build Vercel READY + `web_fetch_vercel_url`.
- **Playwright `set_offline` TIDAK berlaku untuk service worker** → uji offline harus dengan mematikan server sungguhan.
- **Preview dilindungi Vercel Authentication** → uji lewat MCP `web_fetch_vercel_url`. Alias: `qrcode-smk-git-tera-dev-ridhwanwell-8868.vercel.app`. Tim `team_pZj6iTT8xZmsuPxYtOLnqxTz`, project `qrcode-smk`. MCP tidak bisa menghapus variabel lingkungan.
- **Supabase MCP menolak `drop policy` otomatis** (status `cancelled`) → pakai `alter policy` + rename. Project id `auzpctxhltcdzdhcaetb`. Salinan backup tabel ada di skema `backup` (`b20261018_*`).
- **Skrip pencarian ui-ux-pro-max**: jalankan `python3 "$S/scripts/search.py"` dari `/tmp` TANPA `-I`.
- **Sandi akun @tera.smk**: akun baru bersegel `must_change_password`; reset sandi teknisi = lihat catatan bawah `supabase/migrations/0003_segel_ganti_sandi.sql`.
- **Model**: Opus untuk SQL/RLS/hak akses, Tahap 2 (sinkron), 3, 4, 6 (rumus), 9, 10 dan pemeriksaan sebelum merge; Sonnet untuk layar/dokumen. Ingatkan Ridhwan memakai `/model`.
- **Akhir tiap giliran** wajib: Yang berubah · Cara memasang · Cara mengecek · Langkah berikutnya + sebut skill + checklist ui-ux-pro-max bila ada layar.

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
- Baca dan patuhi PRD.md, CLAUDE.md, PROMPT.md (bagian STATUS TERAKHIR) dan docs/audit-fase0.md di repo cabang main / Project knowledge sebelum menjawab. Keputusan pemilik produk ada di PRD bagian 11 — jangan ditanyakan ulang.

CARA KERJA (CLAUDE.md 2A — Claude Code)
- Aku (Ridhwan) bukan programmer dan sering memantau dari iPhone. Kamu menulis kode, menjalankan build/uji, lalu commit + push LANGSUNG ke cabang main (tanpa tera-dev; aku tidak perlu membalas "oke" per merge). Pengaman: build/uji lolos dulu; sesudah push cek deployment produksi READY + uji cepat (scan QR lama, /admin/login, /tera/) dan laporkan; bila produksi bermasalah, tawarkan Promote deployment sebelumnya; JANGAN PERNAH force push atau ubah riwayat main; kode Tera SMK hanya di folder/tabel sendiri (src/tera, api/tera*, tabel tera_).
- CAKUPAN AWAL 5 ALAT sampai Tahap 10: Sphygmomanometer (diulang setelah Master Excel-ku disesuaikan), Kelistrikan, Timbangan Bayi Digital, Suction Pump, Thermohygrometer. Alat lain menyusul satu per satu setelah aku mengunggah Master Excel + Metode Kerja + Report All; jangan membuat template alat di luar 5 itu tanpa file-nya, dan jangan menebak isi master — minta filenya.
- Satu langkah kecil per giliran (maks ±3 file kode). Baca file lama dari repo sebelum mengubahnya. Sebelum commit: build lolos, cek git status (_referensi/, .env, data pelanggan tidak boleh ikut).
- SQL selalu 4 blok: BACKUP, PERUBAHAN, CEK, BATALKAN, disimpan di supabase/migrations/. Jelaskan dulu dengan bahasa awam dan tunggu "lanjutkan" sebelum dijalankan. Tabel lama hanya boleh ditambah kolom; data Tera SMK di tabel berawalan tera_. Kamu yang merancang struktur tabel. Struktur lama dibaca dari database langsung (SELECT saja).
- Migrasi database & pengaturan Vercel tetap tunggu "lanjutkan"; perubahan berisiko ke website lama (route server yang dipakai modul lama, login, service worker, label/QR) juga dijelaskan dulu. Pengaturan Vercel hanya diubah setelah disetujui; domain & pengalihan lama tidak pernah diubah; nilai rahasia tidak pernah ditulis di kode/chat.
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

