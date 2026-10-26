> Dipindah apa adanya dari CLAUDE.md §11 (27 Okt 2026). Baca hanya bila: mengerjakan BAP, BASTP, atau penagihan.

## 11. BAP, BASTP & PENAGIHAN

- **Nomor BAP = nomor BO** (BASTP juga, kecuali pemilik proyek memutuskan lain). Bulan romawi mengikuti **tanggal dokumen**.
- BAP: per jenis alat → Volume PO, Realisasi, Sisa, Keterangan; baris alat tambahan terpisah; TOTAL UNIT.
  - Realisasi = LKK alat itu yang sudah **🟢 diterima server**, termasuk TIDAK LAIK.
  - Keterangan sisa: **"Belum selesai"** selama jadwal berjalan → **"Batal"** saat jadwal ditutup.
- BASTP: per alat → nama, merek, tipe, SN, teknisi (nama + gelar dari master `teknisi`), tanggal kalibrasi, hasil.
- PDF **2 rangkap** (instansi & kantor). Kalimat tidak boleh terpotong. Bagian "hari/tanggal/bulan/tahun" terisi lengkap atau kosong semua.
- Nama alat dari **katalog yang ejaannya benar**.
- Penagihan: **TIDAK LAIK tetap ditagih**, **Batal tidak ditagih**, **alat tambahan memakai harga SPH yang sudah DEAL** (bukan harga master), **PPN dari data master** (saat ini 11%).
- Data `is_test` (BO 999) **tidak boleh** masuk BAP, BASTP, atau penagihan sungguhan.
