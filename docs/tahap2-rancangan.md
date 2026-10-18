# Rancangan Tahap 2 — Offline & Sinkron Tera SMK

| | |
|---|---|
| Tanggal | 19 Oktober 2026 |
| Acuan | PRD F4 (F4.1–F4.15), CLAUDE.md 5 & 12, Lampiran B.2 & B.5 |
| Status | **Menunggu persetujuan** ("lanjutkan") — belum ada SQL yang dijalankan |
| Migrasi | `supabase/migrations/0004_tera_lkk_sinkron.sql` (4 blok) |

> **Perumpamaan besar:** perangkat teknisi = **buku LKK di lapangan**, server = **arsip kantor**.
> Teknisi menulis di bukunya (tersimpan detik itu juga). Begitu ada sinyal, salinan **satu LKK utuh** dikirim
> seperti **paket tercatat** berisi **segel** (checksum). Kantor membuka paket, menghitung ulang segelnya,
> menyimpan, lalu mengirim **tanda terima**. Halaman di buku teknisi baru boleh ditandai 🟢 setelah tanda terima
> itu cocok dengan segel paket. Buku tidak pernah dirobek sebelum ada tanda terima.

---

## 1. Tiga status (tidak boleh berubah artinya)

| Chip | Arti | Kapan berubah |
|---|---|---|
| 🟡 **Tersimpan di perangkat** | Sudah aman di IndexedDB HP/tablet, belum terkirim | Setiap ketukan isian (auto-save) |
| 🔵 **Sedang dikirim** | Paket sedang dalam perjalanan | Saat mesin kirim mulai mengirim |
| 🟢 **Diterima server** | Server membalas tanda terima dengan **checksum & jumlah titik ukur yang SAMA** | Hanya setelah tanda terima dicocokkan |

Gagal kirim / timeout 20 detik → kembali 🟡, dicoba lagi otomatis. **Tidak ada tombol Upload.**

## 2. Di perangkat (IndexedDB, nama database `tera_smk`)

Disimpan lewat pustaka **Dexie** (pembungkus IndexedDB yang matang; versinya dicek di dokumentasi terbaru sebelum dipasang).
Terpisah total dari penyimpanan Manajemen Aset (awalan `tera_`, CLAUDE.md 3A.8).

| Laci | Isi | Catatan |
|---|---|---|
| `lkk` | Semua LKK milik teknisi: isian, hasil, status, `client_version`, `checksum`, `syncState` (🟡/🔵/🟢) | Sumber utama tampilan (F4.1) |
| `outbox` | Antrean kirim: `lkk_id`, versi, percobaan ke-, jadwal coba berikut, error terakhir | 1 baris = 1 LKK utuh |
| `meta` | Waktu tarik data terakhir, versi skema, akun pemilik data | Data tidak dicampur antar-akun |
| `jadwal`, `template`, `kalibrator` | Disiapkan sekarang, **diisi mulai Tahap 3–4** | |

Aturan keras:
1. **Auto-save tiap isian** (jeda 300 ms setelah berhenti mengetik, dan langsung saat pindah kotak/halaman ditutup).
2. **UUID dibuat di perangkat** saat LKK baru → kirim ulang tidak membuat data dobel (F4.3).
3. **Tidak ada perintah hapus LKK** sebelum 🟢 — termasuk saat versi aplikasi diperbarui (service worker tidak menyentuh IndexedDB, sudah dibuktikan di Tahap 1.5a).
4. **Logout diblokir** selama ada LKK belum 🟢 (CLAUDE.md 5.9).
5. Saat dibuka pertama: minta `navigator.storage.persist()`. Bila ditolak atau aplikasi belum dipasang ke layar utama → banner kuning yang tidak bisa ditutup.

## 3. Paket & segel (checksum)

- Isi paket = `{id, bo, no_label, template, tanggal, alat_tambahan, data, results, calibrator_snapshot, client_version}`.
- **Segel = SHA-256** dari isi paket yang disusun urut abjad (JSON kanonik), dihitung di perangkat **dan dihitung ulang di server** dengan kode yang sama.
- **Jumlah titik ukur** dihitung dari isian dan ikut dicocokkan.
- Segel tidak cocok → server menolak, perangkat tetap 🟡 dan mencatat error (tidak pernah "setengah masuk").

## 4. Mesin kirim (tanpa tombol)

Berjalan di latar belakang, **tidak mengunci layar**:
- Dipicu saat: aplikasi dibuka · sinyal kembali (`online`) · LKK baru selesai · berkala selama aplikasi terbuka.
- Jeda bila gagal: **5 s → 15 s → 1 m → 5 m → 15 m** (maks), ditambah acakan kecil supaya 10 tablet tidak menyerbu bersamaan.
- Satu LKK per permintaan (aman dengan batas Vercel 60 s / 4,5 MB), maks 3 berjalan bersamaan.
- Hanya satu tab yang menjadi "pengirim" (Web Locks), agar dua tab tidak mengirim LKK yang sama berbarengan.
- Background Sync service worker = **tambahan saja** (F4.7); sistem tetap benar tanpanya.

## 5. Di server

Endpoint baru di Express (berkas `src/server/teraRoutes.ts`, hanya role `teknisi` & `admin_utama`):

| Endpoint | Fungsi |
|---|---|
| `POST /api/tera/lkk` | Terima 1 paket → hitung ulang segel & jumlah titik → `tera_terima_lkk()` → balas tanda terima |
| `GET /api/tera/lkk?sejak=…` | Tarik turun LKK milik sendiri yang berubah (mis. "Dikembalikan untuk revisi") (F4.10) |
| `POST /api/tera/log` | Catat error perangkat (dibatasi jumlahnya) |

Isi migrasi `0004` (semua **tabel baru**, tabel lama tidak disentuh):

| Tabel | Perumpamaan | Isi |
|---|---|---|
| `tera_lkk` | Rak arsip LKK | 1 baris = 1 LKK utuh, id = UUID dari perangkat |
| `tera_sync_receipts` | Buku tanda terima | Tiap kiriman yang diterima utuh (dasar 🟢) |
| `tera_sync_conflicts` | Map "kiriman ditolak" | Kiriman yang datang setelah LKK dipegang Penyelia — **salinan disimpan**, tidak dibuang (F4.13) |
| `tera_error_logs` | Buku catatan gangguan | Error/macet dari perangkat, dibaca Developer |
| fungsi `tera_terima_lkk` | Petugas loket | Menyimpan LKK + tanda terima dalam **satu transaksi** (utuh atau tidak sama sekali) |

Pengaman di database:
- Semua tabel **RLS aktif tanpa izin untuk browser** — hanya server (pola sama dengan tabel lama).
- Kiriman ulang yang sama persis → jawaban "sudah diterima" (tidak dobel).
- Versi lama tidak bisa menimpa versi baru.
- LKK yang sudah **Diperiksa/ACC** tidak bisa ditimpa teknisi.
- **Nomor label ganda dalam satu BO diterima**, diberi tanda `label_ganda` untuk Selia (F4.14).
- BO `999` **wajib** `is_test = true` (dicegah database).

## 6. Backup ke file (F4.11)

Tombol **"Backup ke file"** di halaman Akun → satu file `.json` berisi semua LKK di perangkat + segelnya.
Impor kembali hanya oleh Developer (`admin_utama`), memakai jalur kirim yang sama (segel dicek, tidak dobel).

## 7. Urutan pengerjaan (satu giliran satu langkah)

| Langkah | Isi | Model |
|---|---|---|
| **2.1** | Jalankan migrasi `0004` (setelah "lanjutkan") | Opus |
| **2.2** | Server: `POST/GET /api/tera/lkk`, `/api/tera/log`, hitung segel bersama (`src/tera/shared/segel.ts`) | Opus |
| **2.3** | Perangkat: database `tera_smk` (Dexie), auto-save, outbox & mesin kirim | Opus |
| **2.4** | Layar: chip 🟡🔵🟢, angka "di perangkat", banner izin/pasang, blokir logout, Backup ke file | Sonnet |
| **2.5** | **Laci uji BO 999** (khusus Developer): buat 1–50 LKK contoh sekaligus untuk uji F4.12 — sebelum ada template Sphygmomanometer | Sonnet |
| **2.6** | Uji wajib F4.12 (Claude di Chromium + Ridhwan di HP/tablet), laporan tabel ✅/❌ | Opus |

## 8. Panduan uji F4.12 (dikerjakan Ridhwan di HP Android/iPhone di langkah 2.6)

Semua memakai **BO 999** dari laci uji. Hasil wajib: **0 data hilang, 0 dobel**.

1. **Mode pesawat**: buat 5 LKK uji → semua 🟡 → matikan mode pesawat → dalam ±1 menit semua 🟢.
2. **Sinyal putus di tengah kirim**: buat 20 LKK, nyalakan mode pesawat saat chip 🔵 muncul → matikan lagi → semua akhirnya 🟢, di server tetap 20.
3. **Tutup paksa**: buat LKK, ketik isian, langsung geser-tutup aplikasi → buka lagi → isian masih ada.
4. **HP mati**: buat 3 LKK dalam mode pesawat → matikan HP → nyalakan → buka aplikasi → semua 🟡 masih ada → nyalakan internet → 🟢.
5. **50 LKK sekaligus**: buat 50 LKK uji → semuanya 🟢, di server 50 (Claude cek dengan query).
6. **Sinyal putus-sambung**: nyala-matikan mode pesawat 5× selama pengiriman → hasil sama dengan no. 2.
7. **Memori hampir penuh**: (bila memungkinkan) isi HP sampai hampir penuh → aplikasi tetap menyimpan, atau memberi pesan jelas bila benar-benar penuh.
8. **Update versi saat ada 🟡**: buat LKK dalam mode pesawat → Claude merilis versi baru → buka aplikasi → LKK 🟡 tetap ada → kirim → 🟢.
9. **Logout diblokir**: saat ada 🟡, tekan Keluar → ditolak dengan pesan jelas.

Setelah uji, data BO 999 di server tetap bertanda `is_test` (tidak masuk BAP/tagihan).
