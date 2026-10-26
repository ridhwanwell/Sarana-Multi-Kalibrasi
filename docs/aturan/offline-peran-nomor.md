> Dipindah apa adanya dari CLAUDE.md §5–8 (27 Okt 2026). Baca hanya bila: mengerjakan offline/sinkron, peran, nomor label/sertifikat/QR, atau audit trail.

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
13. Server **tidak menolak** LKK berisi kalibrator expired (data tidak boleh hilang): simpan, beri penanda merah, ACC ditolak. *(Diubah 25 Okt 2026 atas permintaan pemilik proyek: ACC **tidak diblokir** penanda apa pun — migrasi 0020. Pemblokiran kalibrator expired di tablet teknisi tetap.)*
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
