> Dipindah apa adanya dari CLAUDE.md §13 (27 Okt 2026). Baca hanya bila: membuat atau mengubah layar.

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
> **Diubah 25 Okt 2026 (pemilik proyek):** penanda mendekati/melewati batas **tidak ditampilkan** di layar Selia dan **tidak memblokir ACC**. Penyelia boleh **mengubah semua isian teknisi** langsung (tanpa alasan); setiap perubahan dicatat otomatis di riwayat internal (`tera_lkk_riwayat`, aksi `ubah_nilai`). Aturan di bawah ini berlaku lagi hanya bila pemilik proyek memintanya (Tahap 7).
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
