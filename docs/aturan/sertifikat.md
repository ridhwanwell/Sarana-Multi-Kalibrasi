> Dipindah apa adanya dari CLAUDE.md §9 (27 Okt 2026). Baca hanya bila: menyentuh sertifikat, kop, atau kalibrator.

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
