/**
 * TATA LETAK SERTIFIKAT — Keselamatan Listrik (Report All), 3 halaman A4. DIHASILKAN oleh tools/tera/buat_templat_pompa.py
 * dari PDF cetakan Excel Ridhwan (Master_Keselamatan_Listrik_terisi.pdf, 26 Okt 2026). Hanya posisi ISIAN (j:'f') yang disimpan;
 * semua teks tetap, garis & kotak biru ada di kertas cetak templat-keselamatan-listrik.pdf. Jangan diedit tangan.
 */
import type { TataLetak } from './susunSertifikat.js';

export const TATA_LETAK_KESELAMATAN_LISTRIK: TataLetak = {
  kode: 'report_all_keselamatan_listrik',
  halaman: 3,
  ukuran: { lebar: 595.2756, tinggi: 841.8898 },
  biru: [],
  kotak: {},
  // Tempat/Tanggal/Ruangan/Teknisi kepanjangan → 2 baris (ukuran huruf sama), isi di bawahnya turun (Ridhwan 26 Okt 2026)
  duaBaris: { 2: { baris: [{ k: ['tempat', 'tanggalPelaksanaan'], dari: 254.48 }, { k: ['ruang', 'teknisi'], dari: 269.42 }], sampai: 750, jarak: 12.2 } },
  teks: {
    1: [
      {j:"f",x:145.81,y:176.42,f:"r",s:9.96,a:"l",k:"nomorOrder",m:292},
      {j:"f",x:398.44,y:176.42,f:"r",s:9.96,a:"l",k:"nomorSertifikat"},
      {j:"f",x:145.81,y:213.62,f:"r",s:9.96,a:"l",k:"tanggalTerbit",m:292},
      {j:"f",x:398.44,y:213.62,f:"r",s:9.96,a:"l",k:"kalibrasiUlang"},
      {j:"f",x:145.81,y:294.88,f:"r",s:9.96,a:"l",k:"namaPelanggan"},
      {j:"f",x:145.81,y:321.04,f:"r",s:9.96,a:"l",k:"alamatPelanggan"},
      {j:"f",x:145.81,y:401.92,f:"r",s:9.96,a:"l",k:"namaAlat",m:292},
      {j:"f",x:398.44,y:401.92,f:"r",s:9.96,a:"l",k:"noSeri"},
      {j:"f",x:145.81,y:438.15,f:"r",s:9.96,a:"l",k:"merek",m:292},
      {j:"f",x:145.81,y:474.41,f:"r",s:9.96,a:"l",k:"tipe",m:292},
      {j:"f",x:196.36,y:523.01,f:"r",s:9.96,a:"l",k:"tanggalPenerimaan"},
      {j:"f",x:44.88,y:679.99,f:"r",s:11.04,a:"l",k:"penandatanganNama"},
      {j:"f",x:44.88,y:695.1,f:"b",s:11.04,a:"l",k:"penandatanganJabatan"},
      {j:"f",x:44.52,y:706.86,f:"i",s:8.04,a:"l",k:"penandatanganJabatanEn"}
    ],
    2: [
      {j:"f",x:145.81,y:129.61,f:"r",s:9.96,a:"l",k:"nomorOrder",m:292},
      {j:"f",x:398.44,y:129.61,f:"r",s:9.96,a:"l",k:"nomorSertifikat"},
      {j:"f",x:44.76,y:189.84,f:"r",s:9,a:"l",k:"kalibrator1"},
      {j:"f",x:44.76,y:202.2,f:"r",s:9,a:"l",k:"kalibrator2"},
      {j:"f",x:145.81,y:249.48,f:"r",s:9.96,a:"l",k:"tempat",m:292},
      {j:"f",x:398.44,y:249.48,f:"r",s:9.96,a:"l",k:"tanggalPelaksanaan"},
      {j:"f",x:145.81,y:264.72,f:"r",s:9.96,a:"l",k:"ruang",m:292},
      {j:"f",x:398.44,y:264.72,f:"r",s:9.96,a:"l",k:"teknisi"},
      {j:"f",x:192.89,y:314.06,f:"r",s:9.96,a:"r",k:"suhuRuang"},
      {j:"f",x:445.46,y:314.06,f:"r",s:9.96,a:"r",k:"rhRuang"},
      {j:"f",x:397.09,y:403.46,f:"r",s:9.96,a:"c",k:"fisik1"},
      {j:"f",x:498.17,y:403.46,f:"r",s:9.96,a:"c",k:"fungsi1"},
      {j:"f",x:397.09,y:417.98,f:"r",s:9.96,a:"c",k:"fisik2"},
      {j:"f",x:498.17,y:417.98,f:"r",s:9.96,a:"c",k:"fungsi2"},
      {j:"f",x:397.09,y:432.5,f:"r",s:9.96,a:"c",k:"fisik3"},
      {j:"f",x:498.17,y:432.5,f:"r",s:9.96,a:"c",k:"fungsi3"}
    ],
    3: [
      {j:"f",x:145.81,y:129.61,f:"r",s:9.96,a:"l",k:"nomorOrder",m:292},
      {j:"f",x:398.44,y:129.61,f:"r",s:9.96,a:"l",k:"nomorSertifikat"},
      {j:"f",x:422.4,y:263.04,f:"r",s:9.96,a:"c",k:"listrik0"},
      {j:"f",x:472.55,y:263.04,f:"r",s:9.96,a:"c",k:"tol0"},
      {j:"f",x:422.4,y:282.48,f:"r",s:9.96,a:"c",k:"listrik1"},
      {j:"f",x:472.55,y:282.48,f:"r",s:9.96,a:"c",k:"tol1"},
      {j:"f",x:422.4,y:301.95,f:"r",s:9.96,a:"c",k:"listrik2"},
      {j:"f",x:472.55,y:301.95,f:"r",s:9.96,a:"c",k:"tol2"},
      {j:"f",x:422.4,y:321.38,f:"r",s:9.96,a:"c",k:"listrik3"},
      {j:"f",x:472.55,y:321.38,f:"r",s:9.96,a:"c",k:"tol3"},
      {j:"f",x:422.4,y:340.82,f:"r",s:9.96,a:"c",k:"listrik4"},
      {j:"f",x:472.55,y:340.82,f:"r",s:9.96,a:"c",k:"tol4"},
      {j:"f",x:145.93,y:397.1,f:"b",s:11.04,a:"l",k:"kesimpulan",u:1}
    ],
  },
};
