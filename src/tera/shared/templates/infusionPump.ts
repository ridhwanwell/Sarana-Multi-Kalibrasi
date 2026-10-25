/**
 * TEMPLATE INFUSION PUMP (Tahap 6, PRD F5.1).
 *
 * Data murni (bisa disimpan apa adanya ke tera_device_templates.definition).
 * Sumber: Master_Infusion_Pump.xlsx (26 Okt 2026, dari Ridhwan) + MK 053 (KMK-MK-053.0).
 * Nilai kalibrator (IDA & ESA) TIDAK di sini, tetapi di snapshot kalibrator LKK.
 *
 * Keputusan Ridhwan 26 Okt 2026: fisik & fungsi dihitung semua kotak; titik aliran 25/50/100/150/200 mL/h
 * (di bawah 250, dalam rentang kalibrasi IDA); batas penyumbatan ≤ 20 psi.
 */
import type { TemplatePompa } from '../hitungPompa.js';

export const TEMPLATE_INFUSION_PUMP_V1: TemplatePompa = {
  kode_alat: 'infusion_pump',
  nama: 'Infusion Pump',
  versi: 1,
  sumber: 'Master_Infusion_Pump.xlsx (26 Okt 2026) + KMK-MK-053.0; fisik & fungsi semua kotak, aliran ≤ 200 mL/h, penyumbatan ≤ 20 psi',
  metode: 'KMK-MK-053.0',
  kop: 'NON_KAN',
  keselamatan_listrik: 'wajib',
  identitas: {
    // Input 1!E19 (0,1 mL/h pada contoh); pilihan pertama = bawaan
    resolusi: { satuan: 'mL/h', pilihan: [0.1, 1, 0.01] },
    // Input 1!E20 + K21:M22 (Digital √3 persegi, Analog √6 segitiga)
    jenisSkala: ['Digital', 'Analog'],
  },
  // Input 1!B44:B46 — tiap butir dinilai Kondisi Fisik (Baik) dan Fungsi Alat (Berfungsi)
  fisik: [
    { id: 'badan', judul: 'Badan dan Permukaan / Enclosure and its Surfaces' },
    { id: 'kontrol', judul: 'Kontrol dan Indikator / Control and indicator' },
    { id: 'kabel', judul: 'Kabel dan Aksesori / Wire and acessories' },
  ],
  pilihanFisik: { fisik: ['Baik', 'Tidak Baik'], fungsi: ['Berfungsi', 'Tidak Berfungsi'] },
  // View Report!A10:L13 + P/R kolom toleransi (IEC 62353)
  listrik: [
    { id: 'tegangan', judul: 'Tegangan Catu Daya / Mains Voltage', satuan: 'V', kalibrator: 'tegangan', uji: { jenis: 'sekitar', nominal: 220, batas: 22 }, diBawahTabel: 'ujung', toleransiTeks: '220 ±10 %' },
    { id: 'resistansi_pembumian', judul: 'Resistansi Pembumian Protektif / Protective Earth Resistance', satuan: 'Ω', kalibrator: 'resistansi', uji: { jenis: 'maksimum', batas: 0.3 }, diBawahTabel: 'ujung', toleransiTeks: '≤ 0,3' },
    { id: 'resistansi_isolasi', judul: 'Isolasi Resistansi / Insulation of Resistance', satuan: 'MΩ', kalibrator: 'isolasi', uji: { jenis: 'minimum', batas: 2 }, diBawahTabel: 'ujung', toleransiTeks: '≥ 2' },
    { id: 'arus_bocor', judul: 'Arus Bocor Pembumian / Earth Leakage Current', satuan: 'µA', kalibrator: 'arus_bocor', uji: { jenis: 'maksimum', batas: 500 }, diBawahTabel: 'proporsional', toleransiTeks: '≤ 500' },
  ],
  kinerja: {
    titikAliran: [25, 50, 100, 150, 200],
    pengulangan: 6, // Input 2!E:J (I–VI)
    toleransiAliranPersen: 0.1, // "Toleransi Akurasi Flow Rate ± 10% mL/h (ECRI 488-20210322)"
    sumbat: { batas: 20, banding: '<=', resolusiTetap: 0.01, settingBawaan: 100 }, // "Toleransi Occlusion ≤20psi"
    driftPersen: 0.1, // Ketidakpastian!V = P × 10 %
    derajatBebas: { sertifikat: 60, resolusi: 50, drift: 50 }, // R24, U24, X24
    pembagiResolusi: { Analog: Math.sqrt(6), Digital: Math.sqrt(3) },
    desimalCetak: 2,
    minimalPersenAliran: 0.7, // View Report!AE4
  },
  skor: {
    // View Report!AE2:AE6 — ambang Laik Pakai ≥ 90
    fisik: { minimalPersen: 0.7, nilai: 10 },
    listrik: { nilai: 40 },
    kinerja: { nilai: 50 },
    laikBila: { banding: '>=', batas: 90 },
  },
  sertifikat: { tata_letak: 'report_all_infusion_pump', halaman: 3 },
};

export const TEMPLATE_INFUSION_PUMP = TEMPLATE_INFUSION_PUMP_V1;
