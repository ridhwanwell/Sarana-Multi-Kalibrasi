# Tahap 3 — Push jadwal ke Tera SMK (rancangan)

> Draf 19 Okt 2026. PRD F2.1–F2.5. **Belum ada kode dan belum ada perubahan database.**
> Status: menunggu "lanjutkan" Ridhwan untuk langkah 3.1 (migrasi).

## 1. Perumpamaan
Jadwal di Manajemen Aset = **surat tugas asli** di kantor. "Push ke Tera SMK" = **memfotokopi surat tugas itu dan mengirimkannya ke map teknisi yang ditugaskan**. Fotokopi disimpan di tabel baru `tera_jadwal_push`; surat asli (`jadwal_kalibrasi`) tidak disentuh. Kantor mengubah jadwal lalu Push lagi = fotokopi baru bernomor versi lebih tinggi yang menimpa fotokopi lama di map teknisi (LKK yang sudah diisi tidak hilang).

## 2. Fakta dari database (SELECT saja, 19 Okt)
- `jadwal_kalibrasi` menyimpan seluruh isi di kolom JSON `data`. Kunci yang dipakai: `hospitalName`, `hospitalCity`, `leadTechnicianId`, `supportTechnicianIds[]` (id teks seperti `TECH-003`), `labelStart`/`labelEnd` (mis. `095.0001`–`095.0167`), `targetDevices[]` (`id`, `name`, `quantity`, `labelSequenceStart/End`, `sphItemId`), `scheduledDate`, `endDate`.
- `teknisi.user_id` (uuid) sudah menautkan teknisi ke akun `@tera.smk` (Tahap 1.1). Jadi "teknisi yang ditugaskan" = lead + pendamping, diterjemahkan ke `user_id`.
- BO = 3 angka depan `labelStart`.
- Website lama hanya menulis JSON; kolom baru di tabel lama tidak akan terisi. Karena itu **tidak ada kolom baru di `jadwal_kalibrasi`** — kolom cadangan & mode sertifikat disimpan sebagai **kunci JSON baru** (`labelCadanganAwal`, `labelCadanganAkhir`, `modeSertifikat`) yang diabaikan modul lama.

## 3. Tabel baru (migrasi `0005_tera_jadwal_push.sql`, 4 blok, tunggu "lanjutkan")
`tera_jadwal_push`: `id` uuid · `jadwal_id` text (satu baris aktif per jadwal) · `bo` char(3) · `nama_rs` · `kota` · `tanggal_mulai/selesai` · `label_awal/akhir` · `label_cadangan_awal/akhir` (boleh kosong) · `mode_sertifikat` (`tera`) · `alat_po` jsonb (ringkas: `ref`, `nama`, `jumlah`, `urutAwal`, `urutAkhir`) · `teknisi_user_ids` uuid[] (+ indeks GIN) · `versi` int (naik tiap push ulang) · `is_test` · `pushed_by` · `pushed_at` · `dicabut_at`.
Pola keamanan sama dengan 0004: RLS aktif tanpa policy, tanpa hak untuk anon/authenticated; semua lewat server (service role). Fungsi `tera_push_jadwal(...)` (security invoker, `search_path=''`) agar upsert + naik versi atomik. Backup tidak perlu (tabel baru), blok BATALKAN tetap ditulis.

## 4. Server
- `POST /api/tera/push` — role `admin_teknik` & `admin_utama`. Menerima **hanya `jadwalId`**; server membaca jadwal sendiri dari database (bukan percaya kiriman browser), lalu memeriksa: mode = `tera`; BO 3 angka; rentang utama dan cadangan satu BO, cadangan sesudah utama & tidak tumpang tindih; ada ≥ 1 teknisi yang punya akun (bila ada teknisi tanpa akun → peringatan jelas, bukan gagal diam-diam); nomor label tidak bentrok dengan LKK `tera_lkk` lain. Hasil: versi baru.
- `POST /api/tera/push/cabut` — menarik jadwal dari tablet (`dicabut_at`); LKK yang sudah ada tetap.
- `GET /api/tera/jadwal?sejak=` — role teknisi/admin_utama. Hanya baris yang `user_id`-nya ada di `teknisi_user_ids` (F2.5, dicek di server). Mengembalikan juga jadwal yang dicabut agar tablet bisa menyembunyikannya.
- Endpoint lama tidak diubah; teknisi tetap ditolak di semuanya (R3 audit).

## 5. Form penjadwalan (satu-satunya modul lama yang disentuh, sesuai PRD)
`ScheduleFormModal.tsx` + panel jadwal: tambah **Rentang label cadangan** (diusulkan otomatis dari label berstatus "Cadangan Laik Pakai" di folder BO itu; bisa diubah), **Mode sertifikat** (Terintegrasi Tera SMK / Manual link Google Drive; bawaan = Manual, jadi alur lama tidak berubah), dan tombol **Push ke Tera SMK** (hanya mode Terintegrasi; menampilkan versi & waktu push terakhir). Perubahan minimal; tidak ada perapian kode lain.

## 6. Di tablet teknisi
- Mesin tarik jadwal (di samping mesin kirim): saat aplikasi dibuka, `online`, dan berkala; simpan ke laci `jadwal` di IndexedDB; versi lebih lama tidak menimpa yang lebih baru.
- **Beranda** = daftar RS aktif dari jadwal lokal (nama RS · BO · tanggal). **Detail RS** = daftar alat PO (nama · PO · dikerjakan · sisa; "dikerjakan" dihitung dari LKK lokal via `poItemRef`) + tombol "+ Alat tambahan" (aktif di Tahap 4 saat template ada). Layar baru memakai ui-ux-pro-max + uji break-ui (nama RS panjang, 0 alat, 200 alat).
- Jadwal yang dicabut/selesai disembunyikan dari Beranda, LKK-nya tetap di perangkat.

## 7. Urutan (satu langkah per giliran)
1. **3.1** Migrasi `0005` (jelaskan → "lanjutkan" → jalankan → CEK).
2. **3.2** Server push + tarik jadwal + uji (`npm run test:tera:push`).
3. **3.3** Form penjadwalan: label cadangan, mode sertifikat, tombol Push.
4. **3.4** Tablet: tarik jadwal + Beranda RS + Detail RS.
5. **3.5** Uji F2 dengan jadwal uji BO 999 (jadwal contoh "RS UJI TERA" dibuat lewat form, ditandai uji, dihapus lunak setelah selesai — **perlu persetujuan Ridhwan** karena tabel jadwal adalah data produksi).

## 8. Hal yang perlu keputusan Ridhwan
- Jadwal uji BO 999 di tabel produksi `jadwal_kalibrasi` (langkah 3.5): setuju? (Alternatif: uji hanya dengan baris di `tera_jadwal_push` yang dibuat Claude, tanpa menyentuh jadwal produksi; tetapi form & tombol Push tidak teruji ujung ke ujung.)
