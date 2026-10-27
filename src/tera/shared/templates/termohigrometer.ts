/**
 * TEMPLATE THERMOHYGROMETER — termohigrometer digital/analog (Tahap 6, PRD F5.1).
 *
 * Data murni (disimpan apa adanya ke tera_device_templates.definition). Sumber: Master_Thermohygrometer.xlsx (27 Okt 2026,
 * dari Ridhwan). KEPUTUSAN RIDHWAN 27 Okt 2026: TIDAK ADA MK Kemenkes untuk Thermohygrometer → semua mengikuti Master Excel
 * (bukan KMK-MK); tampilan sertifikat mengikuti PDF contoh Master_Thermohygrometer.pdf.
 *
 * Sama dengan Excel: suhu 15–45 °C (7 titik, langkah 5) dan kelembaban 30–90 %RH (7 titik, langkah 10), 6 bacaan alat standar per
 * titik (Input 2!E:J), toleransi ±1 °C (View Report!T8) dan ±5 %RH (T24), Laik per titik bila |koreksi| ≤ toleransi (tanpa U95),
 * skor fisik & fungsi 10 + kinerja 90 (kinerja penuh bila KEDUA parameter ≥ 70 % titik Laik), Laik Pakai ≥ 90.
 * Alat standar = Climatic Chamber (Calibrator 1) + termohigrometer HTC-1 untuk kondisi ruangan (Calibrator 2).
 * Beda dengan Excel (keputusan Ridhwan untuk semua alat): fisik & fungsi menghitung SEMUA kotak (Baik + Berfungsi) ≥ 70 %.
 */
import type { TemplatePompa } from '../hitungPompa.js';

const SUHU = [15, 20, 25, 30, 35, 40, 45];
const RH = [30, 40, 50, 60, 70, 80, 90];

export const TEMPLATE_TERMOHIGRO_V1: TemplatePompa = {
  tipe: 'pompa',
  kode_alat: 'termohigrometer',
  nama: 'Thermohygrometer',
  versi: 1,
  sumber: 'Master_Thermohygrometer.xlsx (27 Okt 2026), tanpa MK Kemenkes (keputusan Ridhwan); alat standar Climatic Chamber + termohigrometer HTC-1 (kondisi ruangan); toleransi ±1 °C & ±5 %RH tanpa U95; fisik 10 + kinerja 90',
  metode: 'SMK/MT-MK/049',
  kop: 'NON_KAN',
  keselamatan_listrik: 'tidak_ada',
  // Input 1!E19 resolusi (isian bebas), E20 jenis (Digital √3 / Analog √6)
  identitas: { resolusi: { satuan: '%', pilihan: [] }, jenisSkala: ['Digital', 'Analog'] },
  identitasBidang: [
    { id: 'merek', label: 'Merk Pabrik', jenis: 'teks', maksPanjang: 80 },
    { id: 'tipe', label: 'Tipe', jenis: 'teks', maksPanjang: 80 },
    { id: 'noSeri', label: 'No. Seri', jenis: 'teks', maksPanjang: 80 },
    { id: 'rentangUkur', label: 'Rentang Ukur (mis. 10 ~ 99)', jenis: 'teks', maksPanjang: 40 },
    { id: 'resolusi', label: 'Resolusi', jenis: 'angka', satuan: '%' },
    { id: 'jenisSkala', label: 'Jenis skala', jenis: 'skala' },
    { id: 'tanggalPenerimaan', label: 'Tanggal penerimaan barang kalibrasi', jenis: 'tanggal' },
    { id: 'ruang', label: 'Ruangan', jenis: 'teks', maksPanjang: 80 },
  ],
  // Input 1!A29:I33 — Climatic Chamber (suhu & kelembaban) + termohigrometer (rekomendasi, kondisi ruangan)
  standar: [
    { peran: 'chamber', judul: 'Climatic Chamber', parameter: ['suhu_c', 'kelembaban_rh'], wajib: true },
    { peran: 'termohigrometer', judul: 'Termohigrometer', parameter: ['suhu_c', 'kelembaban_rh'], wajib: true, hanyaRekomendasi: true },
  ],
  fisik: [
    { id: 'badan', judul: 'Badan dan Permukaan / Enclosure and its Surfaces' },
    { id: 'kontrol', judul: 'Kontrol dan Indikator / Control and indicator' },
  ],
  pilihanFisik: { fisik: ['Baik', 'Tidak Baik'], fungsi: ['Berfungsi', 'Tidak Berfungsi'] },
  listrik: [],
  // Input 2 + Ketidakpastian!C15:AB53 + View Report!L10:L32, T8, T24, AE2:AE6
  termo: {
    parameter: [
      { id: 'suhu', judul: 'SUHU / Temperature', satuan: '°C', tabel: 'suhu_c', toleransi: 1, titik: SUHU.map((v) => ({ id: `suhu_${v}`, setting: v })) },
      { id: 'rh', judul: 'KELEMBABAN / Humidity', satuan: '%RH', tabel: 'kelembaban_rh', toleransi: 5, titik: RH.map((v) => ({ id: `rh_${v}`, setting: v })) },
    ],
    pengulangan: 6,
    minimalUlangan: 6,
    driftPersen: 0.1,
    derajatBebas: { sertifikat: 60, resolusi: 50, drift: 50 },
    pembagiResolusi: { Analog: Math.sqrt(6), Digital: Math.sqrt(3) },
    desimalCetak: 1,
    minimalPersenTitik: 0.7,
  },
  skor: {
    fisik: { minimalPersen: 0.7, nilai: 10 },
    listrik: { nilai: 0 },
    kinerja: { nilai: 90 },
    laikBila: { banding: '>=', batas: 90 },
  },
  alatTercakup: ['Thermohygrometer', 'Termohigrometer', 'Hygrometer', 'Termohigro', 'Thermo Hygrometer', 'Higrometer'],
  sertifikat: { tata_letak: 'report_all_termohigro', halaman: 3 },
};

export const TEMPLATE_TERMOHIGRO = TEMPLATE_TERMOHIGRO_V1;
