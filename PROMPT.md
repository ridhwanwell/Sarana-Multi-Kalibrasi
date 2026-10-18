# PROMPT — Proyek Tera SMK (Claude Code)

Cara kerja (diperbarui 18 Okt 2026, PRD 11.47 · CLAUDE.md 2A): **Claude Code menulis kode, menguji build, dan commit hanya ke cabang `tera-dev`.** Anda menyetujui, mengecek di link Preview, dan menggabungkan ke `main` sendiri. SQL & pengaturan Vercel selalu dijelaskan dulu dan baru dijalankan setelah Anda bilang **"lanjutkan"**.

---

## ⭐ STATUS TERAKHIR & YANG HARUS DIKERJAKAN BERIKUTNYA

*(Bagian ini diperbarui Claude setiap selesai satu langkah. Saat kembali, cukup ketik **"lanjutkan"**.)*

**Per 18 Oktober 2026, 20.40 WIB**

| Tahap | Status |
|---|---|
| 0 — Audit | ✅ Selesai. `docs/audit-fase0.md` + `docs/audit-fase0-query.sql` di `tera-dev` (commit `96b4981`). Menunggu persetujuan akhir Anda |
| 1 — Dua PWA, role teknisi, login | ⏳ Berikutnya: giliran **1.0 Persiapan** |

**Yang perlu ANDA lakukan (sebaiknya dari laptop), berurutan — Claude memandu klik demi klik:**
1. **Unduh backup database**: Supabase → project *qr-label-kalibrasi* → Database → Backups → unduh yang terbaru, simpan di laptop/Drive (risiko R18).
2. **Isi 2 kunci untuk link Preview** (risiko R1): Vercel → project *qrcode-smk* → Settings → Environment Variables → tambah `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY`, target **Preview**, cabang **`tera-dev`**. Nilainya disalin dari Supabase → Project Settings → API. **Jangan tempel nilainya di chat.**
3. ✅ **Akun teknisi sudah dibuat** (dicek Claude 18 Okt 20.40): 10 akun `@tera.smk` (alin, ari, aziz, esak, hafizh, junior, ridhwan, rizky, sheva, shifa), semua terkonfirmasi, **belum punya profil** → belum bisa masuk ke mana pun (aman, sesuai F1.9).
4. **(Opsional) Jawab P1–P5** di `docs/audit-fase0.md` bagian 15. Bila tidak dijawab, dipakai nilai bawaan.

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
- Aku (Ridhwan) bukan programmer dan sering memantau dari iPhone. Kamu menulis kode, menjalankan build, dan commit + push HANYA ke cabang tera-dev. JANGAN pernah push ke main; aku sendiri yang menggabungkan ke main setelah bilang "lanjutkan".
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
Tahap [n] sudah aku cek di Preview dan sesuai. Pandu aku menggabungkan tera-dev ke main.
```
