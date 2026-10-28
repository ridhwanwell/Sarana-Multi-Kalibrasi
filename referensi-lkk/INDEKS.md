# referensi-lkk — bahan acuan per alat (DATA UJI, bukan data pelanggan)

Folder ini sengaja ada di repo agar Claude hanya membaca bahan **alat yang disebut Ridhwan** (`/buatkanlkk <nama alat>`), tanpa membaca semuanya.
Isi hanya Master Excel (kosong & contoh terisi) berisi **data uji**. **Sertifikat kalibrator asli TIDAK di sini** — tetap di Project knowledge TERA-SMK.
Bukan bagian aplikasi: tidak di `public/` atau `src/`, tidak ikut build.

## Susunan
```
referensi-lkk/<nama_alat>/
  master_kosong.xlsx        Master Excel (rumus, belum diisi)
  master_terisi.xlsx        Master Excel contoh isi (sumber golden)
  sertifikat_contoh.pdf     PDF sertifikat hasil Report All (acuan tampilan)
```
`<nama_alat>` = huruf kecil, tanpa spasi, pakai garis bawah (mis. `timbangan_dewasa_mekanik`, `ventilator`).

## Cara pakai
1. Ridhwan mengunggah 3 file ke folder alatnya (GitHub web: Add file → Upload files), lalu mengetik `/buatkanlkk <nama alat>`.
2. Claude membaca HANYA folder itu, membedah Excel dengan skrip, mencari sertifikat kalibrator di Project knowledge, lalu membangun alat sampai selesai.
3. Setelah jadi, ubah status di tabel bawah.

## Status alat
Status: `belum` (file belum ada) · `sedang` (dikerjakan) · `jadi` (sudah di produksi)

| Alat | Template | Status | Catatan |
|---|---|---|---|
| Sphygmomanometer | v3 | jadi | dibuat sebelum folder ini; bahan ada di Project/_referensi lokal |
| Infusion Pump | v4 | jadi | idem |
| Syringe Pump | v3 | jadi | idem |
| Keselamatan Listrik | v2 | jadi | idem |
| NIBP | v2 | jadi | idem |
| Thermohygrometer | v1 | jadi | idem |

Alat baru ditambahkan di tabel ini saat folder alatnya dibuat.
