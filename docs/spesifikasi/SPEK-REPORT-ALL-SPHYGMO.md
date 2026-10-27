# SPESIFIKASI SERTIFIKAT — Report All Sphygmomanometer (Master v12 + keputusan T6–T8)
**Untuk:** langkah A4 di `PRD-TAHAP4-LKK.md`. Diekstrak Claude langsung dari sheet **Report All** file `Master_Sphygmomanometer_golden_1_v3.xlsx` (data anonim "RS CONTOH", BO 999), 20 Okt 2026.
Tujuan: AI Studio **tidak perlu menebak isi Excel**. PDF wajib mengikuti tabel di bawah: urutan, teks, ukuran huruf, tebal/miring, rata, garis, lebar kolom, tinggi baris.

## 1. Halaman
| Item | Nilai |
|---|---|
| Kertas | **A4 portrait** |
| Skala cetak Excel | 95 % (`fitToWidth = 1`) — terapkan sebagai faktor skala seluruh isi bila diperlukan agar lebar A–J pas dengan area cetak |
| Margin (inci → mm) | kiri 0,590 in = **15,0 mm** · kanan 0,433 in = **11,0 mm** · atas 1,299 in = **33,0 mm** · bawah 1,142 in = **29,0 mm** · header 13,0 mm · footer 20,0 mm |
| Area cetak | `A1:J93` |
| Pemisah halaman | sesudah baris **30** dan sesudah baris **56** → Hal. 1 = baris 1–30, Hal. 2 = baris 31–56, Hal. 3 = baris 57–93 |
| Kaki halaman (semua halaman, rata kanan) | Baris 1: **`Halaman {p} dari {n}`** (Arial tebal 9 pt → pakai **Carlito tebal 9**) · Baris 2: `Sertifikat ini tidak boleh diperbanyak, kecuali seluruhnya, tanpa izin tertulis terlebih dahulu dari PT. Sarana Multi Kalibrasi` (10 pt biasa) |
| Kop | **DILEWATI** (keputusan 19 Okt 2026). Margin atas 33 mm & bawah 29 mm adalah ruang kop: biarkan kosong, jangan geser isi. Opsi `pakaiKop` untuk nanti |
| Font | Excel memakai Calibri → PDF memakai **Carlito** (ukuran identik). Arial di kaki halaman → Carlito juga (tidak membundel font Microsoft) |

## 2. Kolom & baris
Lebar kolom Excel (satuan "karakter"): A–E = **9,17** · F–J = **13,0**. Konversi ke point: `lebar_pt ≈ (karakter × 7 + 5) × 0,75` lalu **skalakan seluruh kolom agar total A–J = lebar area cetak** (210 − 15 − 11 = 184 mm).
Tinggi baris (point, sebelum skala 95 %):

`1:36.0 · 2:36.0 · 3:20.45 · 4:18.0 · 5:20.45 · 6:10.5 · 7:20.1 · 8:36.0 · 9:27.0 · 10:27.0 · 11:16.7 · 12:36.0 · 13:18.0 · 14:19.5 · 15:18.0 · 16:19.5 · 17:18.0 · 18:19.5 · 19:15.75 · 20:16.5 · 21:15.0 · 22:40.5 · 23:27.0 · 24:15.75 · 25:15.75 · 26:15.75 · 27:15.75 · 28:15.0 · 29:15.75 · 30:15.75 · 31:16.5 · 32:11.25 · 33:20.1 · 34:15.75 · 35:15.75 · 36:15.75 · 37:15.75 · 38:20.1 · 39:15.0 · 40:15.75 · 41:15.75 · 42:20.1 · 43:15.0 · 44:15.0 · 45:11.25 · 46:20.1 · 47:15.75 · 48:30.75 · 49:15.75 · 50:15.75 · 51:15.75 · 52:20.1 · 53:15.75 · 54:107.25 · 55:15.0 · 56:99.0 · 57:16.5 · 58:11.25 · 59:20.1 · 60:24.95 · 61:6.0 · 62:20.1 · 63:42.95 · 64:12.0 · 65:17.45 · 66:15.75 · 67:6.0 · 68:15.75 · 69:39.0 · 70:17.45 · 71:15.75 · 72:15.0 · 73:20.1 · 74:44.45 · 75:20.25 · 76:12.75 · 77:17.45 · 78:17.45 · 79:17.45 · 80:17.45 · 81:17.45 · 82:17.45 · 83:15.75 · 84:15.0 · 85:16.5 · 86:11.25 · 87:6.0 · 88:15.75 · 89:15.75 · 90:59.1 · 91:6.0 · 92:15.75 · 93:18.75`

## 3. Aturan isi
- Label berformat Excel `@ * :` = **label diikuti titik dua rata kanan di dalam selnya** (mis. `Nomor Order        :`).
- Baris Inggris di bawah label Indonesia: **8 pt miring** (CLAUDE.md 9.1).
- Angka tabel tekanan memakai **2 desimal** (`0.00`); bacaan bocor 1 desimal (`0.0`); waktu laju buang 2 desimal (`#,##0.00`). **Pemisah desimal**: ikuti PDF acuan dari Ridhwan (Excel acuan memakai titik) — **PERLU KONFIRMASI** bila acuan tidak jelas.
- Tanggal: `dd MMMM yyyy` bahasa Indonesia (mis. `30 Januari 2026`).
- Kondisi ruangan (C44/H44): teks persis `( 27.8±0.5 )` / `( 53±3.1 )` — tanpa spasi di sekitar ±. Nilai = hasil fungsi lingkungan (PRD bagian 3.2).
- D44 di Excel tertulis **`0C`** (salah ketik dari °C) — **PERLU KONFIRMASI**: cetak `°C` atau persis `0C`.
- Baris 83 sudah memakai keputusan T8: `Toleransi Akurasi Tekanan ± 4 mmHg`. Baris 66 sudah keputusan T7: `Toleransi kebocoran < 15 mmHg/min`.
- **Tanggal terbit (C5)**: di Excel = tanggal penerimaan + 1 hari (`'Input 1'!D10 = E23+1`). Di Tera SMK yang logis = **tanggal ACC** — **PERLU KONFIRMASI**; sementara pakai tanggal ACC dan tulis di laporan.
- **Kalibrasi ulang (H5)** = tanggal pelaksanaan + 12 bulan.
- Kotak "Nomor Order / Nomor Sertifikat" muncul di baris 31, 57, **dan 85**. Dengan pemisah halaman 30 & 56, kotak baris 85 jatuh di tengah halaman 3 — **cocokkan dengan PDF acuan**: bila acuan 4 halaman (pemisah juga sesudah baris 84), ikuti acuan dan laporkan.
- Baris 56 (Metode) menyebut "SNI IEC 62353:2014 untuk pengujian keselamatan listrik" walaupun Sphygmomanometer tidak diuji kelistrikan — teks ini **memang ada di Report All**, cetak apa adanya; catat di laporan sebagai temuan untuk Ridhwan.
- QR tanda tangan elektronik: di area **A24:B27** (antara "Disetujui oleh," baris 23 dan nama baris 28), kira-kira 22–25 mm persegi, rata kiri dengan teks.
- "Tera SMK" tidak dicetak. Tidak ada paraf penyelia.

## 4. Peta sel
Kolom **Garis**: K = kiri, Ka = kanan, A = atas, B = bawah; tanda `·` = garis rambut (*hair*, ±0,25 pt), tanpa tanda = garis tipis (*thin*, ±0,5 pt). Sel kosong yang hanya bergaris (bagian dari kotak/tabel) tidak dicantumkan satu-satu: garis kotak berlaku untuk seluruh sel gabungan/rentang baris itu (lihat contoh kotak Nomor Order baris 31–32: A31:B31 & F31:G31 garis tipis keliling; C31:E31 & H31:J31 rambut; baris 32 garis bawah rambut A–J).
`DATA:` = nilai dari LKK/snapshot (bukan teks tetap).

| Sel (gabungan) | Isi | Huruf | Rata | Garis |
|---|---|---|---|---|
| A1:J1 | SERTIFIKAT KALIBRASI | 20 tebal | center/bottom bungkus |  |
| A2:J2 | Calibration Certificate | 14 miring | center/top bungkus |  |
| A3:B3 | Nomor Order | 10 tebal | left/center bungkus |  |
| C3:E3 | DATA: {nomorOrder} (format `BBB/SMK-BO/<romawi bulan>-<tahun>`) | 10 | left/center bungkus |  |
| F3:G3 | Nomor Sertifikat | 10 tebal | left/center bungkus |  |
| H3:J3 | DATA: {nomorSertifikat} (= nomor label `BBB.NNNN`) | 10 | left/center bungkus |  |
| A4:B4 | Order Number | 8 miring | left/top bungkus |  |
| F4:G4 | Certificate Number | 8 miring | left/top bungkus |  |
| A5:B5 | Diterbitkan Tanggal | 10 tebal | left/center |  |
| C5:E5 | DATA: {tanggalTerbit} — kosong bila tidak ada; format `dd MMMM yyyy` Indonesia | 10 | left/center bungkus |  |
| F5:G5 | Kalibrasi Ulang | 10 tebal | left/center |  |
| H5:J5 | DATA: {kalibrasiUlang} = tanggal pelaksanaan + 12 bulan (EDATE); kosong bila tanggal kosong | 10 | left/center bungkus |  |
| A6 | Issued Date | 8 miring | left/top bungkus |  |
| F6 | Recalibration | 8 miring | left/top |  |
| A8:D8 | Identitas Pemilik ⏎ Owner's Identification | 14 tebal garis-bawah | left/top bungkus |  |
| A9:B9 | Nama Pelanggan: ⏎ Designation | 12 tebal | left/top bungkus |  |
| C9:J9 | DATA: {namaPelanggan} (nama RS) | 10 | left/top |  |
| A10:B10 | Alamat: ⏎ Address | 12 tebal | left/top bungkus |  |
| C10:J11 | DATA: {alamatPelanggan} | 10 | left/top bungkus |  |
| A12:D12 | Identitas Instrumen ⏎ Instrument Identification | 14 tebal garis-bawah | left/top bungkus |  |
| A13:B13 | Nama Alat | 12 tebal | left/bottom bungkus |  |
| C13:E13 | DATA: {namaAlat} (nama ASPAK) | 10 | left/bottom |  |
| F13:G13 | Nomor Seri | 12 tebal | left/bottom bungkus |  |
| H13:J13 | DATA: {noSeri} | 10 | left/bottom |  |
| A14:B14 | Equipment Name | 8 miring | left/top bungkus |  |
| F14:G14 | Serial Number | 8 miring | left/top bungkus |  |
| A15:B15 | Merek Pabrik | 12 tebal | left/bottom bungkus |  |
| C15:E15 | DATA: {merek} | 10 | left/bottom |  |
| F15:G15 | Rentang Ukur | 12 tebal | left/bottom bungkus |  |
| H15 | DATA: {rentangUkur} (angka, rata kanan) | 10 | right/bottom |  |
| I15 | DATA: {satuanRentang} = mmHg | 10 | general/bottom |  |
| A16:B16 | Manufacturer | 8 miring | left/top bungkus |  |
| F16 | Range | 8 miring | left/top bungkus |  |
| A17:B17 | Tipe | 12 tebal | left/bottom bungkus |  |
| C17:E17 | DATA: {tipe} | 10 | left/bottom |  |
| F17:G17 | Resolusi | 12 tebal | left/bottom bungkus |  |
| H17 | DATA: {resolusi} (rata kanan) | 10 | right/bottom |  |
| I17 | DATA: mmHg | 10 | general/bottom |  |
| A18:B18 | Type | 8 miring | left/top bungkus |  |
| F18:G18 | Resolution | 8 miring | left/top bungkus |  |
| A20:C20 | Tanggal Penerimaan Kalibrasi | 11 tebal | left/center |  |
| D20:E20 | DATA: {tanggalPenerimaan} (`dd MMMM yyyy`) | 10 | left/center bungkus |  |
| A21 | Date of receipt calibration | 8 miring | general/top |  |
| A23:B23 | Disetujui oleh, ⏎ Approved by | 12 tebal | left/center bungkus |  |
| A28 | DATA: {penandatangan.nama} = Hafizh Pasifianto Utomo, S.Tr.T. (dari snapshot `tera_signatories`) | 11 | general/center |  |
| A29 | DATA: {penandatangan.jabatan} = Manajer Teknik (tebal) | 11 tebal | general/bottom |  |
| A30 | DATA: {penandatangan.jabatanEn} = Technical Manager (miring 8) | 8 miring | general/top |  |
| A31:B31 | Nomor Order : | 12 tebal | left/center bungkus | K Ka A B |
| C31:E31 | DATA: {nomorOrder} | 10 | left/center bungkus | K Ka A· |
| F31:G31 | Nomor Sertifikat : | 12 tebal | left/center bungkus | K Ka A B |
| H31:J31 | DATA: {nomorSertifikat} | 10 | left/center bungkus | K Ka· A· |
| A32:B32 | Order Number | 8 miring | general/top bungkus | K· B· |
| F32:G32 | Certificate Number | 8 miring | general/top bungkus | B· |
| A34 | Standar yang digunakan / Standards | 11 tebal garis-bawah | general/center |  |
| A35:J35 | DATA: Kalibrator 1: `{nama}  Type: {tipe}  s/n: {noSeri}  Cert. Number: {noSertifikat}  Traceability: {tertelusur}` (snapshot kalibrator tekanan) | 10 | left/center |  |
| A36:J36 | DATA: Kalibrator 1 baris kedua (Excel: blok kalibrator ke-2 di sheet Calibrator 1; kosong bila tidak dipakai — PERLU KONFIRMASI) | 10 | left/center |  |
| A37:J37 | DATA: Termohigrometer: format sama (snapshot kalibrator lingkungan); kosong bila tidak ada | 10 | left/center |  |
| A39 | Pelaksanaan Kalibrasi / Implementation of Calibration | 11 tebal garis-bawah | general/center |  |
| A40:B40 | Tempat / Place: | 11 tebal | left/center bungkus |  |
| C40:E40 | DATA: {tempat} = nama RS | 10 | left/center |  |
| F40:G40 | Tanggal / Date: | 11 tebal | left/center bungkus |  |
| H40:J40 | DATA: {tanggalPelaksanaan} (`dd MMMM yyyy`) | 10 | left/center |  |
| A41:B41 | Ruangan / Room: | 11 tebal | left/center bungkus |  |
| C41:E41 | DATA: {ruang} | 10 | left/center |  |
| F41:G41 | Teknisi / Technician: | 11 tebal | left/center bungkus |  |
| H41:J41 | DATA: {teknisi} (nama + gelar dari master `teknisi`) | 10 | left/center |  |
| A43 | Kondisi Ruangan / Environmental Condition | 11 tebal garis-bawah | general/center |  |
| A44 | Suhu Ruang: | 11 tebal | general/center |  |
| C44 | DATA: `( {suhuTerkoreksi} ± {u95Suhu} )` (lihat bagian 3) | 10 | right/center |  |
| D44 | 0C | 10 | left/center |  |
| F44 | Kelembaban Relatif: | 11 tebal | general/center |  |
| H44 | DATA: `( {rhTerkoreksi} ± {u95Rh} )` | 10 | right/center |  |
| I44 | %RH | 10 | left/center |  |
| A45 | Room Temperature | 8 miring | general/top |  |
| F45 | Relative Humidity | 8 miring | general/top |  |
| A47 | Kondisi Fisik dan Fungsi Alat / Physical Condition and Function of Equipment | 11 tebal | general/center |  |
| A48:F48 | Diskripsi / Description | 11 tebal | left/center bungkus | K Ka A B |
| G48:H48 | Kondisi Fisik                                     Physical Condition | 11 tebal | center/center bungkus | K Ka A B |
| I48:J48 | Fungsi Alat                                           Function of Equipment | 11 tebal | center/center bungkus | K Ka A B |
| A49 | Badan dan Permukaan / Enclosure and its Surfaces: | 10 | general/center | K· A B· |
| G49:H49 | DATA: fisik.badan.fisik | 10 | center/center | K· Ka· A B· |
| I49:J49 | DATA: fisik.badan.fungsi | 10 | center/center | Ka· A B· |
| A50 | Level (cairan, aneroid, digital) / Level (liquid, aneroid, digital): | 10 | general/center | K· A· B· |
| G50:H50 | DATA: fisik.level_cairan.fisik | 10 | center/center | K· Ka· A· B· |
| I50:J50 | DATA: fisik.level_cairan.fungsi | 10 | center/center | Ka· A· B· |
| A51 | Asesoris (manset, selang, bulp, tabung) / Accessories (cuff, tube, bulp, cylinder): | 10 | general/center | K· A· B· |
| G51:H51 | DATA: fisik.tabung_selang.fisik | 10 | center/center | K· Ka· A· B· |
| I51:J51 | DATA: fisik.tabung_selang.fungsi | 10 | center/center | Ka· A· B· |
| A53:E53 | Hasil Kalibrasi | 11 tebal garis-bawah | left/center |  |
| F53:J53 | Calibration Result | 8 miring garis-bawah | left/center |  |
| A54:E54 | Hasil kalibrasi ini merupakan ketidakpastian bentangan yang diperoleh dari sumber-sumber ketidakpastian tipe A dan B sesuai "JCGM 100:2008 GUM 1995 with minor corrections Evaluation of measurement data  Guide to the expression of uncertainty in measurement". Hasil ketidakpastian pengukuran mempunyai tingkat kepercayaan 95% dengan faktor cakupan (k) = 2. Hasil kalibrasi tertelusur ke Sistem Satuan Internasional (SI). | 10 | left/top bungkus |  |
| F54:J54 | The result of calibration is Expanded Uncertainty which referred to type A and B sources of uncertainty to "JCGM 100:2008 GUM 1995 with minor corrections Evaluation of measurement data  Guide to the expression of uncertainty in measurement". The result of uncertainty measurement having a confidence level (CL) of 95% with the coverage factor (k) of 2. The result of calibration is traceable to International System of Unit (SI). | 8 miring | left/top bungkus |  |
| A55:E55 | Metode | 10 tebal garis-bawah | left/center bungkus |  |
| F55:J55 | Method | 8 miring garis-bawah | left/center bungkus |  |
| A56:E56 | Alat ini dikalibrasi menggunakan metode KMK-MK-090.0 Metode Kerja Pengujian dan Kalibrasi Sphygmomanometer Non Otomatis, Keputusan Direktur Jenderal Pelayanan Kesehatan Nomor HK.02.02/D/43649/2024 tanggal 22 Juli 2024 tentang Metode Kerja Pengujian dan/atau Kalibrasi Alat Kesehatan, dan SNI IEC 62353:2014 untuk pengujian keselamatan listrik. | 10 | left/top bungkus |  |
| F56:J56 | This equipment is calibrated using method KMK-MK-090.0 Working Method for Testing and Calibration of Sphygmomanometer Non Otomatis, Decree of the Director General of Health Services No. HK.02.02/D/43649/2024 dated 22 July 2024 on Working Methods for Testing and/or Calibration of Medical Devices, and SNI IEC 62353:2014 for electrical safety testing. | 8 miring | left/top bungkus |  |
| A57:B57 | Nomor Order : | 12 tebal | left/center bungkus | K Ka A B |
| C57:E57 | DATA: {nomorOrder} | 10 | left/center bungkus | K Ka A· |
| F57:G57 | Nomor Sertifikat : | 12 tebal | left/center bungkus | K Ka A B |
| H57:J57 | DATA: {nomorSertifikat} | 10 | left/center bungkus | K Ka· A· |
| A58:B58 | Order Number | 8 miring | general/top bungkus | K· B· |
| F58:G58 | Certificate Number | 8 miring | general/top bungkus | B· |
| A60:J60 | HASIL KALIBRASI / Calibration Result | 16 tebal garis-bawah | center/center bungkus |  |
| A62 | Kebocoran Tekanan / Leak Pressure | 11 tebal | general/center |  |
| A63:B63 | Setting Alat ⏎ Equipment Setting | 11 tebal | center/center bungkus | K Ka A |
| C63:D63 | Pembacaan ⏎ Setelah 60 detik ⏎ Reading after 60 secon | 11 tebal | center/center bungkus | K Ka A |
| E63:F63 | Selisih Pembacaan ⏎ Difference Reading | 11 tebal | center/center bungkus | K Ka A |
| A64:B64 | mmHg | 10 | center/center bungkus | K Ka B |
| C64:D64 | mmHg | 10 | center/center bungkus | K Ka B |
| E64:F64 | mmHg | 10 | center/center bungkus | K Ka B |
| A65:B65 | DATA: setting bocor = 250 | 10 | center/center bungkus | K· Ka· A· B· |
| C65:D65 | DATA: bacaan setelah 60 s (format 0.0) | 10 | center/center bungkus | K· Ka· A· B· |
| E65:F65 | DATA: selisih = 250 − bacaan | 10 | center/center bungkus | K· Ka· A B· |
| A66 | Toleransi kebocoran < 15 mmHg/min | 10 tebal | left/top |  |
| A68 | Laju Buang Cepat / Exhaust Fast Rate | 11 tebal | left/center |  |
| A69:C69 | Setting Tekanan ⏎ Pressure Setting | 11 tebal | center/center bungkus | K Ka A B |
| D69:F69 | Waktu Drop / Drop Time ⏎ (≤ 10 detik) ⏎ detik | 11 tebal | center/center bungkus | K Ka A B |
| A70:C70 | 260 mmHg | 10 | center/center | K· Ka· A B· |
| D70:F70 | DATA: waktu laju buang (format 0.00) | 10 | center/center | K· Ka· A B· |
| A71 | Toleransi laju buang cepat ≤ 10 detik | 10 tebal | left/top |  |
| A73 | Akurasi Tekanan / Pressure Accurate | 11 tebal | general/center |  |
| A74:B75 | Pembacaan Alat ⏎ Equipment Reading | 11 tebal | center/center bungkus | K Ka A |
| C74:D74 | Pembacaan Standar ⏎ Standar Reading | 11 tebal | center/center bungkus | K Ka A B |
| E74:F74 | Koreksi / Correction | 11 tebal | center/center bungkus | K Ka A B |
| G74:H74 | Ketidakpastian ⏎ Uncertainty  ⏎ (95% CL) | 11 tebal | center/center bungkus | K Ka A B |
| C75 | Naik / Up | 8 tebal | center/center bungkus | K Ka A |
| D75 | Turun / Down | 8 tebal | center/center bungkus | K Ka A |
| E75 | Naik / Up | 8 tebal | center/center bungkus | K Ka A |
| F75 | Turun / Down | 8 tebal | center/center bungkus | K Ka A |
| G75 | Naik / Up | 8 tebal | center/center bungkus | K Ka A |
| H75 | Turun / Down | 8 tebal | center/center bungkus | K Ka A |
| A76:B76 | mmHg | 10 | center/center bungkus | K Ka B |
| C76 | mmHg | 10 | center/center bungkus | K Ka B |
| D76 | mmHg | 10 | center/center bungkus | K Ka B |
| E76 | mmHg | 10 | center/center bungkus | K Ka B |
| F76 | mmHg | 10 | center/center bungkus | K Ka B |
| G76 | ± mmHg | 10 | center/center bungkus | K B |
| H76 | ± mmHg | 10 | center/center bungkus | K Ka B |
| A77:B77 | DATA: titik[0] setting (0,50,100,150,200,250) | 10 | center/center bungkus | K· Ka· A B· |
| C77 | DATA: rataRata naik titik[0] (0.00) | 10 | center/center bungkus | K· Ka· A B· |
| D77 | DATA: rataRata turun titik[0] (0.00) | 10 | center/center bungkus | K· Ka· A B· |
| E77 | DATA: koreksi naik titik[0] (0.00) | 10 | center/center bungkus | K· Ka· A B· |
| F77 | DATA: koreksi turun titik[0] (0.00) | 10 | center/center bungkus | K· Ka· A B· |
| G77 | DATA: u95Cetak naik titik[0] (ROUND 2) | 10 | center/center bungkus | K· Ka· A |
| H77 | DATA: u95Cetak turun titik[0] (ROUND 2) | 10 | center/center bungkus | K· Ka· A |
| A78:B78 | DATA: titik[1] setting (0,50,100,150,200,250) | 10 | center/center bungkus | K· Ka· A· B· |
| C78 | DATA: rataRata naik titik[1] (0.00) | 10 | center/center bungkus | K· Ka· A· B· |
| D78 | DATA: rataRata turun titik[1] (0.00) | 10 | center/center bungkus | K· Ka· A· B· |
| E78 | DATA: koreksi naik titik[1] (0.00) | 10 | center/center bungkus | K· Ka· A· B· |
| F78 | DATA: koreksi turun titik[1] (0.00) | 10 | center/center bungkus | K· Ka· A· B· |
| G78 | DATA: u95Cetak naik titik[1] (ROUND 2) | 10 | center/center bungkus | K· Ka· A· B· |
| H78 | DATA: u95Cetak turun titik[1] (ROUND 2) | 10 | center/center bungkus | K· Ka· A· B· |
| A79:B79 | DATA: titik[2] setting (0,50,100,150,200,250) | 10 | center/center bungkus | K· Ka· A· B· |
| C79 | DATA: rataRata naik titik[2] (0.00) | 10 | center/center bungkus | K· Ka· A· B· |
| D79 | DATA: rataRata turun titik[2] (0.00) | 10 | center/center bungkus | K· Ka· A· B· |
| E79 | DATA: koreksi naik titik[2] (0.00) | 10 | center/center bungkus | K· Ka· A· B· |
| F79 | DATA: koreksi turun titik[2] (0.00) | 10 | center/center bungkus | K· Ka· A· B· |
| G79 | DATA: u95Cetak naik titik[2] (ROUND 2) | 10 | center/center bungkus | K· Ka· A· B· |
| H79 | DATA: u95Cetak turun titik[2] (ROUND 2) | 10 | center/center bungkus | K· Ka· A· B· |
| A80:B80 | DATA: titik[3] setting (0,50,100,150,200,250) | 10 | center/center bungkus | K· Ka· A· B· |
| C80 | DATA: rataRata naik titik[3] (0.00) | 10 | center/center bungkus | K· Ka· A· B· |
| D80 | DATA: rataRata turun titik[3] (0.00) | 10 | center/center bungkus | K· Ka· A· B· |
| E80 | DATA: koreksi naik titik[3] (0.00) | 10 | center/center bungkus | K· Ka· A· B· |
| F80 | DATA: koreksi turun titik[3] (0.00) | 10 | center/center bungkus | K· Ka· A· B· |
| G80 | DATA: u95Cetak naik titik[3] (ROUND 2) | 10 | center/center bungkus | K· Ka· A· B· |
| H80 | DATA: u95Cetak turun titik[3] (ROUND 2) | 10 | center/center bungkus | K· Ka· A· B· |
| A81:B81 | DATA: titik[4] setting (0,50,100,150,200,250) | 10 | center/center bungkus | K· Ka· A· B· |
| C81 | DATA: rataRata naik titik[4] (0.00) | 10 | center/center bungkus | K· Ka· A· B· |
| D81 | DATA: rataRata turun titik[4] (0.00) | 10 | center/center bungkus | K· Ka· A· B· |
| E81 | DATA: koreksi naik titik[4] (0.00) | 10 | center/center bungkus | K· Ka· A· B· |
| F81 | DATA: koreksi turun titik[4] (0.00) | 10 | center/center bungkus | K· Ka· A· B· |
| G81 | DATA: u95Cetak naik titik[4] (ROUND 2) | 10 | center/center bungkus | K· Ka· A· B· |
| H81 | DATA: u95Cetak turun titik[4] (ROUND 2) | 10 | center/center bungkus | K· Ka· A· B· |
| A82:B82 | DATA: titik[5] setting (0,50,100,150,200,250) | 10 | center/center bungkus | K· Ka· A· B· |
| C82 | DATA: rataRata naik titik[5] (0.00) | 10 | center/center bungkus | K· Ka· A· B· |
| D82 | DATA: rataRata turun titik[5] (0.00) | 10 | center/center bungkus | K· Ka· A· B· |
| E82 | DATA: koreksi naik titik[5] (0.00) | 10 | center/center bungkus | K· Ka· A· B· |
| F82 | DATA: koreksi turun titik[5] (0.00) | 10 | center/center bungkus | K· Ka· A· B· |
| G82 | DATA: u95Cetak naik titik[5] (ROUND 2) | 10 | center/center bungkus | K· Ka· A· B· |
| H82 | DATA: u95Cetak turun titik[5] (ROUND 2) | 10 | center/center bungkus | K· Ka· A· B· |
| A83 | Toleransi Akurasi Tekanan ± 4 mmHg | 10 tebal | left/top |  |
| A85:B85 | Nomor Order : | 12 tebal | left/center bungkus | K A B |
| C85:E85 | DATA: {nomorOrder} | 10 | left/center bungkus | K A· |
| F85:G85 | Nomor Sertifikat : | 12 tebal | left/center bungkus | K A B |
| H85:J85 | DATA: {nomorSertifikat} | 10 | left/center bungkus | K A· |
| A86:B86 | Order Number | 8 miring | general/top bungkus | K· B· |
| F86:G86 | Certificate Number | 8 miring | general/top bungkus | B· |
| A88 | Kesimpulan / Result: | 11 tebal garis-bawah | general/center |  |
| A89 | Alat dinyatakan : | 11 | left/center |  |
| C89 | DATA: {kesimpulan}: `Laik Pakai` / `Tidak Laik Pakai` (tebal, garis bawah) | 11 tebal garis-bawah | general/center |  |
| A90:J90 | Kriteria Laik Pakai/Tidak Laik Pakai mengacu pada KMK-MK-090.0 (Sphygmomanometer Non Otomatis), Keputusan Direktur Jenderal Pelayanan Kesehatan Nomor HK.02.02/D/43649/2024 tanggal 22 Juli 2024 tentang Metode Kerja Pengujian dan/atau Kalibrasi Alat Kesehatan. | 11 | left/top bungkus |  |
| A92:J92 | Sertifikat ini berlaku untuk alat dengan Nama, Merek, Tipe, dan Nomor Seri yang dinyatakan di atas. | 11 miring | left/top bungkus | B· |
| A93:J93 | ««««« Akhir Sertifikat / End of Certificate »»»»» | 8 tebal | center/center | A· |
