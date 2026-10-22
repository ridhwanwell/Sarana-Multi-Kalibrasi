/**
 * TEMPLATE SPHYGMOMANOMETER (Tahap 4.1, PRD F5.1 / Lampiran C).
 *
 * Isinya data murni (bisa disimpan apa adanya ke tera_device_templates.definition).
 * Sumber angka (versi 2, 22 Okt 2026): Master_Sphygmomanometer_revisi.xlsx yang disesuaikan Ridhwan
 * (_referensi/sphygmo-v4/) + MK 090. Menggantikan versi 1 (Master v12 + keputusan U95 19 Okt). Nilai kalibrator TIDAK di sini, tetapi di snapshot kalibrator LKK.
 */
import type { TemplateAlat } from '../hitung.js';

export const TEMPLATE_SPHYGMOMANOMETER: TemplateAlat = {
  kode_alat: 'sphygmomanometer',
  nama: 'Sphygmomanometer',
  versi: 2,
  sumber: 'Master_Sphygmomanometer_revisi.xlsx (22 Okt 2026) + MK 090; bocor ≤ 15, skor ≥ 70 = Laik (keputusan Ridhwan 22 Okt)',
  metode: 'KMK-MK-090.0',
  kop: 'NON_KAN',
  keselamatan_listrik: 'tidak_ada',
  identitas: {
    // Input 1!E19 (golden v2 = 2 mmHg, K1). Pilihan pertama = bawaan.
    resolusi: { satuan: 'mmHg', pilihan: [2, 1] },
    // Input 1!E20 + K21:M22 (Digital √3 persegi, Analog √6 segitiga)
    jenisSkala: ['Analog', 'Digital'],
  },
  // Input 1!B43:B45 — tiap item dinilai Kondisi Fisik & Fungsi Alat (6 kotak)
  fisik: [
    { id: 'badan', judul: 'Badan dan Permukaan' },
    { id: 'level_cairan', judul: 'Level Cairan' },
    { id: 'tabung_selang', judul: 'Tabung dan Selang' },
  ],
  // Input 1!L43:P47 — butir tambahan MK 090 butir 90.7.7 (satu kotak, tanpa kolom fungsi)
  fisikTambahan: [
    { id: 'gauge', judul: 'Gauge/indikator (jarum turun lembut, skala bersih, kaca utuh)' },
    { id: 'konektor', judul: 'Konektor' },
    { id: 'label', judul: 'Label/plakat/stiker terbaca' },
    { id: 'manset', judul: 'Manset (bagus, bersih, tidak sobek)' },
    { id: 'titik_nol', judul: 'Titik nol (0 ± 1 mmHg)' },
  ],
  pilihanFisik: ['Baik', 'Tidak Baik'],
  ujiAmbang: [
    // View Report!N10 (22 Okt 2026): ABS(250 − bacaan 60 detik) ≤ 15 (keputusan Ridhwan: kurang dari atau sama dengan)
    { id: 'bocor', jenis: 'selisih_setting', judul: 'Kebocoran Tekanan', satuan: 'mmHg', setting: 250, banding: '<=', batas: 15 },
    // MK 90.10.2: waktu turun 260 → 15 mmHg ≤ 10 detik
    { id: 'lajuBuang', jenis: 'nilai', judul: 'Laju Buang Cepat', satuan: 'detik', banding: '<=', batas: 10 },
  ],
  kinerja: [
    {
      id: 'tekanan',
      jenis: 'naik_turun_berulang',
      judul: 'Akurasi Tekanan',
      satuan: 'mmHg',
      titik: [0, 50, 100, 150, 200, 250], // MK 090 butir 90.8.3
      pengulangan: 3,
      k: 2, // dipakai bila kMetode = 'tetap'
      tipeA: 'selisih_maks_dari_nol', // Ketidakpastian!N:Q
      kMetode: 'veff', // Ketidakpastian!AK:AN
      derajatBebas: { tipeA: 5, sertifikat: 60, zero: 50, resolusi: 50, drift: 50 }, // R37, W37, Z37, AC37, AH37
      u95Maksimum: 1.5, // MK 090 butir 90.10.3, View Report!AE8
      u95MinimumLaporan: 1, // Ketidakpastian!AQ: ≤ 1 → "1" (CMC KAN 1 mmHg)
      pembagiResolusi: { Analog: Math.sqrt(6), Digital: Math.sqrt(3) },
      toleransi: 4, // MK 090 butir 90.10.3: ± 4 mmHg
      desimalCetak: 2, // Report All G77: ROUND(…, 2)
    },
  ],
  skor: {
    // View Report AE2:AE5 (MK 090 butir 90.11.3)
    item: [
      { dari: 'fisik', minimalPersen: 0.7, nilai: 10 },
      { dari: 'uji_ambang', id: 'bocor', nilai: 30 },
      { dari: 'uji_ambang', id: 'lajuBuang', nilai: 30 },
      { dari: 'kinerja', id: 'tekanan', minimalPersen: 0.7, nilai: 30 },
    ],
    laikBila: { banding: '>=', batas: 70 }, // View Report!AE6 (22 Okt 2026): skor tepat 70 = Laik
  },
  sertifikat: { tata_letak: 'report_all_sphygmomanometer_v12', halaman: 3 },
};
