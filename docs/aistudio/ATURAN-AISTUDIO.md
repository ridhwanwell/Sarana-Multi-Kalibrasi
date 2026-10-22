# ATURAN KERJA AI STUDIO — Tera SMK (WAJIB)
Ringkasan aturan dari `CLAUDE.md` untuk pengerjaan di Google AI Studio. Aturan lengkap tetap di `CLAUDE.md`; bila ragu, `CLAUDE.md` yang berlaku. Hasil kerja akan diaudit Claude baris demi baris — kode yang melanggar aturan di bawah akan **dibuang**, bukan diperbaiki.

## 1. Berkomunikasi dengan Ridhwan
- Ridhwan lulusan D3 Teknologi Elektromedis, paham kalibrasi alat kesehatan, **bukan programmer**, sering memakai iPhone.
- Bahasa Indonesia sederhana; istilah teknis dijelaskan dengan perumpamaan dunia kalibrasi/elektromedis.
- Satu langkah kecil per giliran. Akhiri setiap giliran dengan: **Yang berubah · Cara mengecek · Langkah berikutnya · Perlu konfirmasi**.
- Bila tidak jelas: **tanya dulu**, jangan menebak. Jangan menambah fitur yang tidak diminta.
- Jujur soal hasil uji: tulis yang belum diuji sebagai "belum diuji", jangan mengklaim lulus tanpa menjalankan.

## 2. Batas yang TIDAK boleh dilanggar
1. **Jangan ubah rumus** di `src/tera/shared/hitung.ts` dan **jangan ubah objek template v1** di `src/tera/shared/templates/sphygmomanometer.ts`. Butuh field baru → template **versi 2** terpisah.
2. **Database produksi tidak disentuh.** Tidak ada kunci Supabase di AI Studio. Perubahan database = file `supabase/migrations/NNNN_nama.sql` dengan 4 blok **BACKUP · PERUBAHAN · CEK · BATALKAN**, berlabel "BELUM DIJALANKAN". Aturan SQL:
   - Data Tera di tabel berawalan `tera_`. Tabel lama **hanya boleh ditambah kolom** — dilarang hapus/ganti nama kolom/tabel, ubah tipe, hapus baris, `TRUNCATE`, `DROP` tabel lama, `DELETE` tanpa `WHERE` jelas.
   - RLS aktif; tabel Tera tanpa policy browser, hak hanya `service_role`; fungsi `security definer` wajib `set search_path = ''` dan dicabut dari `public/anon/authenticated`.
   - Riwayat (`tera_audit_log`) append-only. Baris `labels` hanya diubah lewat alur ACC Tera.
3. **Website lama tidak boleh rusak.** Jangan merapikan/memformat ulang/mendesain ulang modul lain (SPH, label, keuangan, aset, ASPAK, Selia lama). Sentuh file lama hanya di titik sambung (1–3 baris: daftar rute, pasang komponen) dan jelaskan di laporan.
4. **Format link QR & rute publik** (`/sertifikat/…`, `/scan/…`, `/verifikasi/…`, `/cert/…`, `/label/…`, `/`) tidak berubah. Domain/pengalihan/pengaturan Vercel tidak diubah.
5. **Rahasia** (kunci service role, token Google) tidak pernah ada di kode atau chat; tidak ada variabel `VITE_` berisi rahasia.
6. **Offline-first & tanpa kehilangan data** (CLAUDE.md 5): setiap isian langsung tersimpan ke IndexedDB; tidak ada tombol Upload; tidak ada fungsi hapus LKK; data perangkat tidak dihapus sebelum 🟢; jangan ubah `teraDb.ts`/`mesinKirim.ts` kecuali benar-benar perlu (jelaskan di laporan).
7. **Kop dilewati** (keputusan 19 Okt 2026): jangan menempel/menggambar kop sertifikat maupun kop surat; sisakan area kosong + opsi `pakaiKop`.
8. Data uji hanya **BO `999`** (`is_test = true`). Jangan pakai nama RS/teknisi sungguhan di kode atau uji.
9. Teknologi tetap: Vite + React + TypeScript + Tailwind + React Router + Express + Supabase + `pdf-lib`. **Jangan** mengganti ke Next.js/Firebase/Google Sheets, **jangan** memanggil Gemini API dari aplikasi, **jangan** menambah `metadata.json`/struktur khas AI Studio ke repo. Paket npm baru hanya bila perlu + alasan.
10. Server Express berjalan sebagai ESM di Vercel: **impor relatif di file server wajib berakhiran `.js`** (ada uji penjaga `npm run test:tera:impor`).

## 3. Kode
- Kode Tera di `src/tera/` (tablet), `src/server/tera*.ts` / `src/server/tera/` (server), komponen Selia baru di `src/components/TeraSelia*.tsx`.
- Logika murni (hitung, aturan, susun PDF) dipisah dari layar supaya bisa diuji.
- TypeScript ketat, tanpa `any` baru bila bisa dihindari. Data kurang → `null`/"-", **tidak pernah crash**. Pakai Error Boundary yang ada.
- Setiap permintaan internet punya **timeout** dan pesan bahasa awam ("Server tidak merespons. Data aman di perangkat, akan dicoba lagi otomatis."). Tidak ada loading tanpa akhir; setiap loading ada keterangannya.
- Daftar panjang: list virtual atau `content-visibility`, item di-memo.

## 4. Tampilan (CLAUDE.md 13 — pilihan pemilik produk, jangan diganti)
- Flat modern, palet **Ocean** lewat token CSS di `src/tera/tera-tema.css` (`--t-primary` `#0B6FB3`, `--t-accent` `#29C5F6` hanya dekorasi, latar `#EEF6FB`, mode gelap sudah ada). **Tidak menulis hex langsung di komponen.**
- Font **Inter** untuk antarmuka; angka hasil ukur `tabular-nums` (kelas `.tabular`). Isian ≥ 16 px; judul layar 22/600, judul bagian 17/600, keterangan 13.
- Sudut kartu 14 px, tombol/isian 12 px, chip pill. **Area sentuh ≥ 48 × 48 px**, jarak ≥ 8 px. Kelipatan jarak 4/8.
- Status **selalu chip warna + ikon + tulisan** (warna status di CLAUDE.md 13.4 tidak boleh diubah).
- Kotak angka: label selalu di atas, `inputmode="decimal"`, koma desimal, fokus biru 2 px + cahaya cyan, galat di bawah kotak saat pindah kotak.
- Satu aksi utama per kartu; **Hapus** terpisah merah + konfirmasi; **dialog hanya untuk aksi tak bisa dibatalkan** (Selesai/kirim, ACC, Kembalikan, Buka koreksi); selebihnya toast/kabar.
- Ikon `lucide-react` outline 16/20/24, **tanpa emoji**; tombol ikon wajib `aria-label`.
- Animasi ringan: hanya `transform` & `opacity`, 200–300 ms, hormati `prefers-reduced-motion`. Tanpa blur, bayangan berat, kartu transparan.
- Tata letak: HP < 600 px satu kolom + tab bawah; tablet portrait 3 kotak bacaan/baris; tablet landscape daftar bagian kiri ±32 % + isian kanan 6 bacaan/baris. Memutar tablet **tidak menghilangkan isian**. Hormati `env(safe-area-inset-*)`.
- Lembar/dialog yang dirender lewat **portal ke `document.body` wajib diberi kelas `tera-root`** (kalau tidak, gaya `.tabular` & fokus hilang).
- Sebelum menyerahkan layar, cek: tidak bertumpuk/terpotong di 320/390/820/1180 px & huruf 200 %, kontras AA terang & gelap, sentuh ≥ 48 px, safe area, reduced motion, data tidak hilang saat muat ulang.

## 5. Sertifikat (CLAUDE.md 9)
- Report All v12 = format. **Sama persis**: urutan tabel, teks, kolom, gaya judul, jumlah halaman. Font isi **Carlito** (bukan Calibri). Nama alat ikut ASPAK.
- Dilarang di judul/teks tabel: "Tambahan", "Additional", "sesuai KMK terbaru", "revisi", "diperbarui", "parameter baru", nomor KMK-MK di judul tabel. Rujukan metode cukup sekali: "Alat ini dikalibrasi menggunakan metode KMK-MK-…".
- "Tera SMK" tidak dicetak. Tidak ada tanda tangan/paraf penyelia. QR e-sign Manajer Teknik (Hafizh Pasifianto Utomo, S.Tr.T.) di halaman 1.
- **Setiap teks baru yang tercetak wajib disetujui Ridhwan** → tulis di laporan, jangan diputuskan sendiri.

## 6. Sebelum menyatakan satu langkah selesai
- [ ] Uji baru ditulis & dijalankan; semua uji lama tetap lulus (sebut angkanya)
- [ ] Tidak ada file di `_referensi/`, `.env`, data pelanggan, kunci rahasia
- [ ] SQL (bila ada) 4 blok, berlabel BELUM DIJALANKAN
- [ ] Entri baru di `docs/aistudio/LAPORAN-AISTUDIO.md`
