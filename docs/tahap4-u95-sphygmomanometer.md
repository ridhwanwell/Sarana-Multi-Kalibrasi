# Tahap 4 · Langkah 4.0 — Tinjauan budget U95 Sphygmomanometer (PRD 11.45)

> 19 Okt 2026, ±14.30 WIB. **Versi 2 — dari zip LKK** (`Tera_SMK_1_Dokumen_Logo_Master.zip`), menggantikan versi 1 yang memakai salinan Google Drive.
> Status: **usulan, menunggu persetujuan Ridhwan**. Belum ada rumus yang diubah.
> Sumber: `_referensi/master-lkk-v12/Master Sphygmomanometer.xlsx`, `_referensi/golden/Master_Sphygmomanometer_golden_1.xlsx` & `_2.xlsx`, `_referensi/metode-mk/MK_090_SPHYGMOMANOMETER_NON_OTOMATIS.pdf` (hal. 405–407). File Excel/PDF tidak di-commit (repo publik).
> Cara hitung ulang: golden file dihitung ulang penuh dengan LibreOffice (`calculateAll`), lalu ditiru dengan skrip Python; hasil skrip = Excel sampai 4 angka (4,101 · 4,253 · 4,730 · 5,527 · 6,572 · 132,08).

## 1. Ringkasan
1. **Toleransi yang benar ±4 mmHg, bukan ±3** (MK 090 butir 90.10.3: "Toleransi akurasi tekanan ± 4 mmHg dengan U95 maksimum 1,5 mmHg"; Master v12 juga memakai 4). PRD 11.45 perlu dikoreksi.
2. **Penyebab utama U95 4,1–6,6 mmHg adalah isian Resolusi = 10 mmHg** di kedua golden file (`Input 1` E19), bukan terutama rumusnya. Dengan resolusi 10, komponen resolusi saja = 10 × 0,5 ÷ √6 = **2,04 mmHg** → U95 minimal **4,1 mmHg di semua titik**, walau 3 run identik. Akibatnya **0 dari 12 titik** bisa lolos (|koreksi| + U95 ≤ 4), seberapa pun bagus alatnya.
3. Rumus pengulangan Master (selisih terbesar ÷ √3, derajat bebas 5) tetap membuat U95 terlalu besar bila ada run yang meleset — sesuai temuan versi 1 — tetapi pengaruhnya kedua setelah resolusi.

## 2. Rumus Master v12 (sheet *Ketidakpastian* baris 37–42; golden = Master, rumus identik)
| Komponen | Rumus | Derajat bebas |
|---|---|---|
| Pengulangan | selisih terbesar antar 3 run (dikoreksi pembacaan titik 0) ÷ √3 | 5 |
| Sertifikat standar | U95 sertifikat ÷ 2 (0,10 / 0,09 mmHg) | 60 |
| Zero error | selisih terbesar naik–turun di titik 0 ÷ √3 | 50 |
| Resolusi UUT | resolusi × 0,5 ÷ √6 (Analog) / ÷ √3 (Digital) | 50 |
| Drift standar | 0,5 × drift ÷ √3 (drift sekarang 0) | 50 |
| k | dari Veff (Welch–Satterthwaite) — di golden k = 2,00–2,13 | |
| Keputusan per titik | `ABS(koreksi + U95) ≤ 4` → Laik | |
| Kesimpulan | skor fisik 10 + bocor 30 + laju buang 30 + akurasi 30 (≥ 70 % titik lolos); **≥ 70** → Laik Pakai | |

## 3. Hitung ulang dengan data golden (U95 terendah–tertinggi, titik lolos dari 12)
Skenario: **A** Master apa adanya · **B** usulan U1+U2 (STDEV.S/√3, k = 2) · **C** Master, resolusi 2 mmHg · **D** U1+U2 + resolusi 2 mmHg.

| Data | A | B | C | D |
|---|---|---|---|---|
| Golden 1 | 4,10–6,57 · 0/12 | 4,08–4,88 · 0/12 | 0,83–5,92 · 7/12 | 0,82–2,79 · 9/12 |
| Golden 2 (D27 = 12, apa adanya) | 4,10–132 · 0/12 | 4,08–59 · 0/12 | 0,83–132 · 8/12 | 0,82–59 · 10/12 |
| Golden 2 bila D27 = 102 | 4,10–5,53 · 0/12 | 4,08–4,45 · 0/12 | 0,83–4,44 · 9/12 | 0,82–1,95 · 11/12 |

Arti: selama resolusi 10, perbaikan rumus (B) **tidak menolong** (tetap 0/12). Resolusi 2 (C) baru membuat angka masuk akal; ditambah U1+U2 (D) U95 turun ke 0,8–2,8 mmHg.

## 4. Temuan lain di golden file
| # | Temuan | Dampak |
|---|---|---|
| T1 | **Nilai tersimpan golden tidak dihitung ulang** (file disimpan tanpa recalculation). Contoh golden 1: skor fisik tersimpan 0, laju buang "-", kesimpulan "**Tidak Laik Pakai**"; setelah dihitung ulang: fisik 10, laju buang Laik, total 70 → "**Laik Pakai**" | Golden harus dibuka di Excel → hitung ulang (Ctrl+Alt+F9) → simpan, sebelum jadi acuan uji |
| T2 | **Golden 2 sel `Input 2` D27 masih 12** (PRD 12.7 belum dibetulkan) → rata-rata turun 100 mmHg = 71, koreksi −29, U95 132 | Perlu nilai yang benar dari Ridhwan |
| T3 | Keputusan titik memakai `ABS(koreksi + U95)`. Koreksi negatif "tertolong" oleh U95 (mis. koreksi −5, U95 1,5 → 3,5 → Laik) | Seharusnya `|koreksi| + U95 ≤ 4` (MK: C + \|U\| ≤ MPE) |
| T4 | Akurasi 0/12 lolos tetapi total tetap 70 → **Laik Pakai** (Master: ≥ 70). MK 90.12.1: Laik bila nilai **> 70**, Tidak Laik bila **< 70** (70 tidak disebut) | Alat yang akurasinya gagal semua tetap Laik — perlu keputusan |
| T5 | MK 90.10.3 menyebut **U95 maksimum 1,5 mmHg**; Master tidak memeriksanya | Usul: hanya penanda kuning di Selia (Tahap 7), tidak mengubah Laik |

Perbaikan PRD 11.43 sudah ada di golden: rujukan satu sel (`A1` bukan `A1:J1`) dan "Baik" tanpa spasi.

## 5. Usulan (menunggu persetujuan)
- **K1 (pertanyaan, paling penting)** Resolusi Sphygmomanometer di golden = **10 mmHg** — benar, atau seharusnya **2 mmHg** (skala jarum aneroid/air raksa umumnya bergaris 2 mmHg)? Bila 2, golden diperbaiki & di template resolusi wajib diisi teknisi dengan pilihan nilai umum.
- **K2 (pertanyaan)** Nilai benar golden 2 `Input 2` D27 (100 mmHg, Run I Turun) — 102?
- **U1** Pengulangan = **STDEV.S(3 run) ÷ √3** (CLAUDE.md 9.4).
- **U2** **k = 2 tetap**; Veff tidak dipakai.
- **U3** Komponen lain **persis Master** (sertifikat ÷ 2, zero error, resolusi ÷ √6/√3, drift, tampil "1" bila ≤ 1).
- **U4** Diterapkan ke **template JSON dan golden file** (golden dihitung ulang & disimpan, T1).
- **U5 (baru)** Keputusan titik = **|koreksi| + U95 ≤ 4 mmHg** (T3).
- **U6 (baru, pilih)** Total nilai tepat 70: **(a)** Laik seperti Master (≥ 70), atau **(b)** ikut MK (> 70 → akurasi wajib lolos).
- **U7 (baru)** U95 > 1,5 mmHg → penanda kuning di Selia (T5), tidak memengaruhi Laik.
