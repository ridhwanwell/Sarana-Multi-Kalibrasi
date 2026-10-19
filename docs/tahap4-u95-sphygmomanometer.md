# Tahap 4 · Langkah 4.0 — Tinjauan budget U95 Sphygmomanometer (PRD 11.45)

> 19 Okt 2026. Status: **usulan, menunggu persetujuan Ridhwan**. Belum ada rumus yang diubah.
> Sumber: `Master Sphygmomanometer.xlsx` (Drive, folder "Master LKK baru", 30 Sep 2026), sheet *Ketidakpastian* baris 37–42.
> File Excel tidak di-commit (repo publik).

## 1. Masalah
U95 di sertifikat Sphygmomanometer **4,1–6,6 mmHg**, padahal toleransi MK **±3 mmHg**. Ketidakpastian lebih lebar dari toleransi membuat hasil "LAIK" sulit dipertanggungjawabkan.

## 2. Rumus Master sekarang (per titik ukur, naik & turun dihitung terpisah)
| Komponen | Rumus Master | Distribusi / derajat bebas |
|---|---|---|
| Pengulangan (Repeat) | selisih **terbesar** antar 3 run (dikoreksi nol) ÷ √3 | persegi, **v = 5** |
| Sertifikat standar | U95 sertifikat ÷ 2 | normal, v = 60 |
| Zero error / histeresis | selisih terbesar naik–turun di titik 0 ÷ √3 (dipakai di semua titik) | persegi, v = 50 |
| Resolusi | resolusi × 0,5 ÷ √6 (Analog) / ÷ √3 (Digital) | segitiga, v = 50 |
| Drift standar | 0,5 × drift ÷ √3 | persegi, v = 50 |
| Gabungan | √Σu² | |
| Faktor cakupan k | **dihitung dari Veff (Welch–Satterthwaite)** | |
| Tampil di sertifikat | bila U95 ≤ 1 → "1" (CMC KAN 1 mmHg) | |

## 3. Penyebab U95 membesar (dibuktikan dengan hitungan, resolusi 2 mmHg analog, U95 standar 0,1)
| 3 bacaan di satu titik | Master: k | Master: U95 | Aturan proyek (CLAUDE.md 9.4): U95 |
|---|---|---|---|
| 100 / 100 / 100 | 2,01 | 0,83 | 0,82 |
| 100 / 102 / 100 | 2,42 | 2,96 | 1,57 |
| 100 / 102 / 98 | 2,52 | **5,92** | 2,45 |
| 100 / 104 / 100 | 2,52 | **5,92** | 2,79 |
| 100 / 104 / 98 | 2,55 | 8,89 | 3,62 |

Dua penyebab, saling memperkuat:
1. **Pengulangan dihitung dari selisih terbesar ÷ √3**, bukan simpangan baku (Tipe A = STDEV.S/√n seperti di CLAUDE.md 9.4). Satu run yang meleset 2–4 mmHg (wajar untuk jarum analog bergaris 2 mmHg) langsung menggandakan komponen ini.
2. **Derajat bebas pengulangan dipatok 5**, sehingga ketika komponen pengulangan dominan, Veff ≈ 5 dan **k ≈ 2,5** (bukan 2). CLAUDE.md 9.4 menetapkan **k = 2**.

## 4. Usulan (menunggu persetujuan)
- **U1** Pengulangan = **STDEV.S(3 run) / √3** (Tipe A, sesuai CLAUDE.md 9.4).
- **U2** **k = 2 tetap** (sesuai CLAUDE.md 9.4); Veff tidak lagi dipakai.
- **U3** Komponen lain **dipertahankan persis seperti Master** (sertifikat ÷ 2, zero error ÷ √3, resolusi ÷ √6 analog / ÷ √3 digital, drift, batas tampil 1 mmHg). Bila nanti ingin diubah, dibahas terpisah.
- **U4** Usulan diterapkan ke **template JSON dan golden file** (CLAUDE.md 16.4) — golden file diperbarui supaya uji "sama dengan Excel" tetap berlaku.
- Keputusan LAIK/TIDAK LAIK **tidak berubah** (tetap dari koreksi terhadap toleransi MK, persis Excel).

Catatan jujur: walau dengan usulan, alat yang pembacaannya berselisih ±4 mmHg antar-run tetap bisa ber-U95 > 3 mmHg. Itu gambaran nyata alatnya, bukan salah rumus.

## 5. Yang masih dibutuhkan
- 2 golden file (`Master_Sphygmomanometer_golden_1.xlsx`, `…_golden_2.xlsx`, PRD E7) untuk menghitung ulang angka nyata sebelum/sesudah.
- Konfirmasi bahwa `Master Sphygmomanometer.xlsx` di Drive (30 Sep) = **Master v12**.
