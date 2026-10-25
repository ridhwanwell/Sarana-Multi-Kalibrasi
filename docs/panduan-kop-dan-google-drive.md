# Panduan: unggah kop sertifikat & sambungkan Google Drive (Tera SMK)

Dua pekerjaan ini **dilakukan Developer (Ridhwan) sendiri**, karena butuh login ke Supabase / Google / Vercel.
Nilai rahasia (Client Secret, Refresh Token) **jangan pernah** ditempel di chat atau di kode — hanya di Vercel.

---

## A. Unggah file kop sertifikat (wajib, sekali saja)

Tanpa file ini, pratinjau di Selia menampilkan "File kop belum ada", dan sertifikat terbit belum bisa dibuka dari QR.

1. Buka **supabase.com** → masuk → pilih project **qr-label-kalibrasi**.
2. Menu kiri **Storage** → klik bucket **tera-assets**.
3. Klik **Create folder** → nama: `kop` (huruf kecil semua) → buka folder `kop`.
4. Klik **Upload files** → pilih dua file ini (nama harus PERSIS sama):
   - `KOP_SERTIF_NON_KAN.pdf`
   - `KOP_SERTIF_KAN.pdf`
5. Selesai. Cek: buka Manajemen Aset → Selia → pilih LKK Sphygmomanometer → **9. Pratinjau sertifikat** → **Tampilkan pratinjau (dengan kop)**.

Catatan: bucket ini privat (tidak bisa dibuka orang lain). Bila kop diganti, unggah ulang dengan nama yang sama (pilih *replace*).
Sertifikat yang SUDAH terbit tidak berubah (lembar aslinya sudah tersimpan).

---

## B. Sambungkan Google Drive (salinan sertifikat TANPA kop)

Hasilnya: tiap ACC, salinan PDF tanpa kop otomatis masuk ke folder Drive **SERTIFIKAT PT.SMK → "BO – Nama RS"**.
Sebelum disambungkan, ACC & QR tetap jalan normal; di Selia tertulis "belum tersambung".

### B1. Buat izin di Google Cloud (pakai akun ridhwanwell@gmail.com)
1. Buka **console.cloud.google.com** → pilih/buat project (mis. "Tera SMK").
2. **APIs & Services → Library** → cari **Google Drive API** → **Enable**.
3. **Google Auth Platform** (atau *OAuth consent screen*):
   - *Branding*: nama aplikasi `Tera SMK`, email dukungan = email Anda.
   - *Audience*: **External** → tekan **Publish app** sampai statusnya **In production**.
     (PENTING: status *Testing* membuat sambungan putus tiap 7 hari.)
   - *Data access*: tambahkan scope `https://www.googleapis.com/auth/drive`.
4. **Clients → Create client** → jenis **Web application** → nama `Tera SMK server`.
   - *Authorized redirect URIs*: `https://developers.google.com/oauthplayground`
   - Simpan. Catat **Client ID** dan **Client secret** (jangan dikirim ke chat).

### B2. Ambil Refresh Token
1. Buka **developers.google.com/oauthplayground**.
2. Klik ikon roda gigi (kanan atas) → centang **Use your own OAuth credentials** → tempel Client ID & Client secret.
3. Kotak kiri (Step 1) → ketik `https://www.googleapis.com/auth/drive` → **Authorize APIs**.
4. Login **ridhwanwell@gmail.com**. Bila muncul "Google hasn't verified this app": **Advanced → Go to Tera SMK** → **Allow**.
5. Step 2 → **Exchange authorization code for tokens** → salin nilai **Refresh token**.

### B3. Tempel di Vercel
1. **vercel.com** → project **qrcode-smk** → **Settings → Environment Variables**.
2. Tambah 3 variabel (Environment: **Production**):
   - `GOOGLE_OAUTH_CLIENT_ID` = Client ID
   - `GOOGLE_OAUTH_CLIENT_SECRET` = Client secret
   - `GOOGLE_OAUTH_REFRESH_TOKEN` = Refresh token
3. **Deployments** → deployment teratas → titik tiga → **Redeploy**.
4. Cek: Selia → LKK yang sudah ACC → kotak "Sertifikat terbit" → tulisan Drive berubah menjadi "terkirim" (atau tekan **Kirim ulang ke Drive**).

Bila suatu saat tertulis "Izin Google Drive kedaluwarsa atau dicabut": ulangi B2 lalu ganti nilai `GOOGLE_OAUTH_REFRESH_TOKEN` di Vercel, Redeploy.
