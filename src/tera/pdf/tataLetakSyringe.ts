/**
 * TATA LETAK SERTIFIKAT — Syringe Pump (Report All), 3 halaman A4. DIHASILKAN oleh tools/tera/buat_templat_pompa.py
 * dari PDF cetakan Excel Ridhwan (Master_Syringe_Pump_terisi.pdf, 26 Okt 2026). Hanya posisi ISIAN (j:'f') yang disimpan;
 * semua teks tetap, garis & kotak biru ada di kertas cetak templat-syringe-pump.pdf. Jangan diedit tangan.
 */
import type { TataLetak } from './susunSertifikat.js';

export const TATA_LETAK_SYRINGE_PUMP: TataLetak = {
  kode: 'report_all_syringe_pump',
  halaman: 3,
  ukuran: { lebar: 595.2756, tinggi: 841.8898 },
  biru: [],
  kotak: {},
  // Tempat/Tanggal/Ruangan/Teknisi kepanjangan → 2 baris (ukuran huruf sama), isi di bawahnya turun (Ridhwan 26 Okt 2026)
  duaBaris: { 2: { baris: [{ k: ['tempat', 'tanggalPelaksanaan'], dari: 242.8 }, { k: ['ruang', 'teknisi'], dari: 257.8 }], sampai: 750, jarak: 12.2 } },
  teks: {
    1: [
      {j:"f",x:145.81,y:176.42,f:"r",s:9.96,a:"l",k:"nomorOrder",m:292},
      {j:"f",x:398.44,y:176.42,f:"r",s:9.96,a:"l",k:"nomorSertifikat"},
      {j:"f",x:145.81,y:213.62,f:"r",s:9.96,a:"l",k:"tanggalTerbit",m:292},
      {j:"f",x:398.44,y:213.62,f:"r",s:9.96,a:"l",k:"kalibrasiUlang"},
      {j:"f",x:145.81,y:296.8,f:"r",s:9.96,a:"l",k:"namaPelanggan"},
      {j:"f",x:145.81,y:322.96,f:"r",s:9.96,a:"l",k:"alamatPelanggan"},
      {j:"f",x:145.81,y:401.92,f:"r",s:9.96,a:"l",k:"namaAlat",m:292},
      {j:"f",x:398.44,y:401.92,f:"r",s:9.96,a:"l",k:"noSeri"},
      {j:"f",x:145.81,y:438.15,f:"r",s:9.96,a:"l",k:"merek",m:292},
      {j:"f",x:445.45,y:438.15,f:"r",s:9.96,a:"r",k:"rentangUkur"},
      {j:"f",x:449,y:438.15,f:"r",s:9.96,a:"l",k:"satuanRentang"},
      {j:"f",x:145.81,y:474.41,f:"r",s:9.96,a:"l",k:"tipe",m:292},
      {j:"f",x:445.45,y:474.41,f:"r",s:9.96,a:"r",k:"resolusi"},
      {j:"f",x:449,y:474.41,f:"r",s:9.96,a:"l",k:"satuanResolusi"},
      {j:"f",x:196.36,y:523.01,f:"r",s:9.96,a:"l",k:"tanggalPenerimaan"},
      {j:"f",x:44.88,y:679.99,f:"r",s:11.04,a:"l",k:"penandatanganNama"},
      {j:"f",x:44.88,y:695.1,f:"b",s:11.04,a:"l",k:"penandatanganJabatan"},
      {j:"f",x:44.52,y:706.86,f:"i",s:8.04,a:"l",k:"penandatanganJabatanEn"}
    ],
    2: [
      {j:"f",x:145.81,y:112.91,f:"r",s:9.96,a:"l",k:"nomorOrder",m:292},
      {j:"f",x:398.44,y:112.91,f:"r",s:9.96,a:"l",k:"nomorSertifikat"},
      {j:"f",x:44.76,y:165.82,f:"r",s:9,a:"l",k:"kalibrator1"},
      {j:"f",x:44.76,y:178.18,f:"r",s:9,a:"l",k:"kalibrator2"},
      {j:"f",x:44.76,y:190.54,f:"r",s:9,a:"l",k:"kalibrator3"},
      {j:"f",x:145.81,y:237.82,f:"r",s:9.96,a:"l",k:"tempat",m:292},
      {j:"f",x:398.44,y:237.82,f:"r",s:9.96,a:"l",k:"tanggalPelaksanaan"},
      {j:"f",x:145.81,y:253.06,f:"r",s:9.96,a:"l",k:"ruang",m:292},
      {j:"f",x:398.44,y:253.06,f:"r",s:9.96,a:"l",k:"teknisi"},
      {j:"f",x:192.89,y:302.4,f:"r",s:9.96,a:"r",k:"suhuRuang"},
      {j:"f",x:445.46,y:302.4,f:"r",s:9.96,a:"r",k:"rhRuang"},
      {j:"f",x:397.09,y:391.8,f:"r",s:9.96,a:"c",k:"fisik1"},
      {j:"f",x:498.17,y:391.8,f:"r",s:9.96,a:"c",k:"fungsi1"},
      {j:"f",x:397.09,y:406.32,f:"r",s:9.96,a:"c",k:"fisik2"},
      {j:"f",x:498.17,y:406.32,f:"r",s:9.96,a:"c",k:"fungsi2"},
      {j:"f",x:397.09,y:420.84,f:"r",s:9.96,a:"c",k:"fisik3"},
      {j:"f",x:498.17,y:420.84,f:"r",s:9.96,a:"c",k:"fungsi3"}
    ],
    3: [
      {j:"f",x:145.81,y:112.91,f:"r",s:9.96,a:"l",k:"nomorOrder",m:292},
      {j:"f",x:398.44,y:112.91,f:"r",s:9.96,a:"l",k:"nomorSertifikat"},
      {j:"f",x:422.4,y:228.94,f:"r",s:9.96,a:"c",k:"listrik0"},
      {j:"f",x:422.4,y:248.38,f:"r",s:9.96,a:"c",k:"listrik1"},
      {j:"f",x:422.4,y:267.82,f:"r",s:9.96,a:"c",k:"listrik2"},
      {j:"f",x:422.4,y:287.29,f:"r",s:9.96,a:"c",k:"listrik3"},
      {j:"f",x:93.65,y:394.8,f:"r",s:9.96,a:"c",k:"a0_alat"},
      {j:"f",x:194.6,y:394.8,f:"r",s:9.96,a:"c",k:"a0_std"},
      {j:"f",x:295.7,y:394.8,f:"r",s:9.96,a:"c",k:"a0_kor"},
      {j:"f",x:396.7,y:394.8,f:"r",s:9.96,a:"c",k:"a0_u"},
      {j:"f",x:93.65,y:414.24,f:"r",s:9.96,a:"c",k:"a1_alat"},
      {j:"f",x:194.6,y:414.24,f:"r",s:9.96,a:"c",k:"a1_std"},
      {j:"f",x:295.7,y:414.24,f:"r",s:9.96,a:"c",k:"a1_kor"},
      {j:"f",x:396.7,y:414.24,f:"r",s:9.96,a:"c",k:"a1_u"},
      {j:"f",x:93.65,y:433.67,f:"r",s:9.96,a:"c",k:"a2_alat"},
      {j:"f",x:194.6,y:433.67,f:"r",s:9.96,a:"c",k:"a2_std"},
      {j:"f",x:295.7,y:433.67,f:"r",s:9.96,a:"c",k:"a2_kor"},
      {j:"f",x:396.7,y:433.67,f:"r",s:9.96,a:"c",k:"a2_u"},
      {j:"f",x:93.65,y:453.13,f:"r",s:9.96,a:"c",k:"a3_alat"},
      {j:"f",x:194.6,y:453.13,f:"r",s:9.96,a:"c",k:"a3_std"},
      {j:"f",x:295.7,y:453.13,f:"r",s:9.96,a:"c",k:"a3_kor"},
      {j:"f",x:396.7,y:453.13,f:"r",s:9.96,a:"c",k:"a3_u"},
      {j:"f",x:93.65,y:472.57,f:"r",s:9.96,a:"c",k:"a4_alat"},
      {j:"f",x:194.6,y:472.57,f:"r",s:9.96,a:"c",k:"a4_std"},
      {j:"f",x:295.7,y:472.57,f:"r",s:9.96,a:"c",k:"a4_kor"},
      {j:"f",x:396.7,y:472.57,f:"r",s:9.96,a:"c",k:"a4_u"},
      {j:"f",x:93.6,y:584.76,f:"r",s:9.96,a:"c",k:"sumbatSetting"},
      {j:"f",x:194.6,y:584.76,f:"r",s:9.96,a:"c",k:"sumbatStd"},
      {j:"f",x:396.7,y:584.76,f:"r",s:9.96,a:"c",k:"sumbatU"},
      {j:"f",x:145.93,y:644.43,f:"b",s:11.04,a:"l",k:"kesimpulan",u:1}
    ],
  },
};
