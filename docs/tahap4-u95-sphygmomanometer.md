# Tahap 4 · Langkah 4.0 — Tinjauan budget U95 Sphygmomanometer (PRD 11.45)

> 19 Okt 2026, ±14.30 WIB. **Versi 2 — dari zip LKK** (`Tera_SMK_1_Dokumen_Logo_Master.zip`), menggantikan versi 1 yang memakai salinan Google Drive.
> Status: **DISETUJUI Ridhwan 19 Okt 13.51** (K1 = 2 mmHg, K2 = 102, U1–U5 + U7 setuju, U6 = (b) ikut MK). Golden v2 sudah dibuat (bagian 6).
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

## 6. Keputusan & golden file versi 2 (19 Okt 2026, ±14.10)
Keputusan Ridhwan: **K1** resolusi 2 mmHg · **K2** D27 = 102 · **U1–U5 + U7** setuju · **U6 = (b)**: Laik Pakai bila total **> 70** (pas 70 = Tidak Laik).

File baru (tidak di-commit, ada di `_referensi/golden/`): `Master_Sphygmomanometer_golden_1_v2.xlsx`, `…_golden_2_v2.xlsx`. File asli tidak diubah. Dibuat dengan LibreOffice (bukan openpyxl), lalu dihitung ulang penuh. Kotak/gambar (5 drawing), sel gabungan, dan area cetak tetap sama.

| Sheet!sel | Sebelum | Sesudah | Keputusan |
|---|---|---|---|
| Input 1!E19 | 10 | 2 | K1 |
| Input 2!D27 (golden 2 saja) | 12 | 102 | K2 |
| Ketidakpastian!N37:O42 | selisih terbesar (dikoreksi nol) | `STDEV(run 1–3)` (= STDEV.S) | U1 |
| Ketidakpastian!AM37:AN42 | k dari Veff | 2 | U2 |
| Budget, 12 sel k | k dari Veff | 2 | U2 (budget ikut) |
| View Report!N/P/R/T 23–28 | `ABS(C+U)` | `ABS(C)+U` | U5 |
| View Report!C33 | `AE5>=AE6` | `AE5>AE6` | U6 |
| View Report!AD6 | Ambang Laik Pakai (≥) | (>) | U6 |

Kolom derajat bebas (vi = 5) & Veff dibiarkan (tidak dipakai lagi untuk k).

Hasil (dicek dengan skrip Python terpisah: selisih maks 5·10⁻¹⁵; Budget = Ketidakpastian di 12 blok):
| | U95 (mmHg) | Titik lolos | Skor | Kesimpulan |
|---|---|---|---|---|
| Golden 1 v2 | 0,82–2,79 (titik 0 tampil "1") | 9/12 (gagal: 100 turun, 150 naik ‑ koreksi 4,33, 150 turun) | 10+30+30+30 = 100 | Laik Pakai |
| Golden 2 v2 | 0,82–1,95 | 11/12 (gagal: 150 turun) | 100 | Laik Pakai |

Catatan: teks gabungan di Report All (mis. "( 27.8±0.5 )") memakai titik karena dihitung di LibreOffice berbahasa Inggris; di Excel Indonesia menjadi koma. Bukan perubahan rumus.

Berikutnya: template JSON Sphygmomanometer + mesin hitung bersama (perangkat & server) + test golden v2 (angka di tabel ini = target test).

## 7. Langkah 4.1 — template & mesin hitung (19 Okt 2026, ±14.40)
- `src/tera/shared/hitung.ts` — mesin hitung bersama (tablet & server), fungsi murni, rumus bagian 6.
- `src/tera/shared/templates/sphygmomanometer.ts` — template (data murni, siap disimpan ke `tera_device_templates`).
- `tests/tera/hitungSphygmo.test.mts` + `tests/tera/fixtures/sphygmo-golden-v2.json` (angka saja) — `npm run test:tera:hitung`: **58/58** (24 titik × 10 angka = Excel, skor & kesimpulan 2 golden; kasus tepi U5, U6, data kosong, run kosong, "Baik " berspasi, Digital, interpolasi kalibrator, ROUND Excel, template lewat JSON). Uji mutasi: toleransi diubah ke 3 → 15 uji gagal (test benar-benar menjaga).

Temuan baru (belum diubah, menunggu keputusan):
| # | Temuan | Excel sekarang | MK 090 |
|---|---|---|---|
| T6 | Batas laju buang | `< 10` detik | `≤ 10` detik (90.10.2) |
| T7 | Batas bocor | `≤ 15` mmHg | `< 15` mmHg (90.10.1) |
| T8 | Teks sertifikat Report All A83 | "Toleransi Akurasi Tekanan **± 3** mmHg" | ± 4 mmHg (View Report sudah ± 4) |

## 8. T6–T8 ikut MK & langkah 4.2 (19 Okt 2026, ±14.30)
Keputusan Ridhwan 14.05: **T6, T7, T8 ikut MK 090**.
- Template: bocor `< 15` mmHg, laju buang `≤ 10` detik. Golden **v3** (`_referensi/golden/*_v3.xlsx`, dari v2): View Report N10/P10 `<15`, N15/P15 `<=10`; teks Report All A66 "< 15", **A83 "± 4 mmHg"**, Input 2 G14, View Report A11/AD3/AD4. Angka hasil v3 = v2 (golden tidak tepat di batas). Fixture → `sphygmo-golden-v3.json`; uji 59/59 (+1 penjaga: isi template di SQL 0007 = template di kode).
- Migrasi `0007_tera_template_kalibrator.sql` (4 blok) ditulis & diuji kering (CEK 8/8, perilaku 8/8, dibatalkan). **Belum dijalankan — menunggu "lanjutkan".**
