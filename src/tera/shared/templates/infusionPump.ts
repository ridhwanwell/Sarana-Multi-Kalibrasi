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
  tipe: 'pompa',
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
  // Input 1!A14:E25 — urutan kolom identitas. Rentang ukur di Excel berupa teks ("1 - 999").
  identitasBidang: [
    { id: 'merek', label: 'Merek', jenis: 'teks', maksPanjang: 80 },
    { id: 'tipe', label: 'Tipe', jenis: 'teks', maksPanjang: 80 },
    { id: 'noSeri', label: 'Nomor seri', jenis: 'teks', maksPanjang: 80 },
    { id: 'rentangUkur', label: 'Rentang ukur (mis. 1 - 999 mL/h)', jenis: 'teks', maksPanjang: 40 },
    { id: 'resolusi', label: 'Resolusi', jenis: 'resolusi', satuan: 'mL/h' },
    { id: 'jenisSkala', label: 'Jenis skala', jenis: 'skala' },
    { id: 'tanggalPenerimaan', label: 'Tanggal penerimaan alat', jenis: 'tanggal' },
    { id: 'ruang', label: 'Ruangan', jenis: 'teks', maksPanjang: 80 },
  ],
  // Input 1!A29:I34 — alat standar. IDA = aliran + penyumbatan; ESA = 4 tabel listrik; termohigrometer = HTC-1 (rekomendasi).
  standar: [
    { peran: 'ida', judul: 'Infusion Device Analyzer (IDA)', parameter: ['aliran_mlh', 'tekanan_psi'], wajib: true },
    { peran: 'esa', judul: 'Electrical Safety Analyzer (ESA)', parameter: ['tegangan_v', 'resistansi_ohm', 'isolasi_mohm', 'arus_bocor_ua'], wajib: true },
    { peran: 'termohigrometer', judul: 'Termohigrometer', parameter: ['suhu_c', 'kelembaban_rh'], wajib: true, hanyaRekomendasi: true },
  ],
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

/**
 * VERSI 2 (26 Okt 2026, permintaan Ridhwan): tampilan identitas mengikuti sheet "Input 1" (label & urutan Excel);
 * RESOLUSI diisi bebas oleh teknisi (bukan pilihan); JENIS SKALA tidak ditanyakan — pompa infus dihitung Digital
 * (persegi, ÷√3, hasil lebih hati-hati daripada Analog ÷√6). Rumus, toleransi, dan skor sama dengan versi 1.
 */
export const TEMPLATE_INFUSION_PUMP_V2: TemplatePompa = {
  ...TEMPLATE_INFUSION_PUMP_V1,
  versi: 2,
  sumber: 'Master_Infusion_Pump.xlsx (26 Okt 2026) + KMK-MK-053.0; identitas mengikuti Input 1, resolusi isian bebas, skala Digital tetap; fisik & fungsi semua kotak, aliran ≤ 200 mL/h, penyumbatan ≤ 20 psi',
  identitas: { resolusi: { satuan: 'mL/h', pilihan: [] }, jenisSkala: [], jenisTetap: 'Digital' },
  identitasBidang: [
    { id: 'merek', label: 'Merk Pabrik', jenis: 'teks', maksPanjang: 80 },
    { id: 'tipe', label: 'Tipe', jenis: 'teks', maksPanjang: 80 },
    { id: 'noSeri', label: 'No. Seri', jenis: 'teks', maksPanjang: 80 },
    { id: 'rentangUkur', label: 'Rentang Ukur (mis. 1 - 999 mL/h)', jenis: 'teks', maksPanjang: 40 },
    { id: 'resolusi', label: 'Resolusi', jenis: 'angka', satuan: 'mL/h' },
    { id: 'tanggalPenerimaan', label: 'Tanggal penerimaan barang kalibrasi', jenis: 'tanggal' },
    { id: 'ruang', label: 'Ruangan', jenis: 'teks', maksPanjang: 80 },
  ],
};

/**
 * VERSI 3 (26 Okt 2026, keputusan Ridhwan "ikuti KMK semuanya"): mengikuti KMK-MK-053.0 —
 *  - aturan keputusan guard band w = U (butir 53.10.1): aliran Laik bila |koreksi| ≤ 10 % setting; penyumbatan < 20 psi
 *    (butir 53.9.2); keselamatan listrik dibanding langsung dengan ambang SNI IEC 62353;
 *  - titik aliran contoh KMK 10/25/50/100/150 mL/h (butir 53.7.9.2), pengulangan 5 kali.
 * Rumus rata-rata, koreksi, U95 sama dengan Excel; identitas sama dengan versi 2.
 */
export const TEMPLATE_INFUSION_PUMP_V3: TemplatePompa = {
  ...TEMPLATE_INFUSION_PUMP_V2,
  versi: 3,
  sumber: 'KMK-MK-053.0 (aturan keputusan guard band w = U, titik 10/25/50/100/150 mL/h, 5 pengulangan, occlusion < 20 psi) + rumus ketidakpastian Master_Infusion_Pump.xlsx (26 Okt 2026)',
  kinerja: {
    ...TEMPLATE_INFUSION_PUMP_V2.kinerja,
    titikAliran: [10, 25, 50, 100, 150],
    pengulangan: 5,
    sumbat: { ...TEMPLATE_INFUSION_PUMP_V2.kinerja.sumbat, banding: '<' },
  },
  aturanKeputusan: 'guardband_w_u',
};

/**
 * VERSI 4 (26 Okt 2026 05.01, koreksi setelah KMK-MK-003.0 Pedoman Aturan Keputusan dibaca): aturan keputusan guard band
 * w = U yang benar — Lulus bila hasil di bawah AL = TL − U → aliran |koreksi| + U95 ≤ 10 % setting, penyumbatan
 * |rata-rata| + U95 < 20 psi, listrik terukur ± U dibanding ambang (sama dengan Excel Infusion Ridhwan).
 * Tetap dari v3 (KMK-MK-053.0): titik 10/25/50/100/150 mL/h, 5 pengulangan, occlusion "<".
 * v3 (tafsiran |C| ≤ MPE) dinonaktifkan; tidak pernah dipakai LKK.
 */
export const TEMPLATE_INFUSION_PUMP_V4: TemplatePompa = (() => {
  const { aturanKeputusan: _keliru, ...dasar } = TEMPLATE_INFUSION_PUMP_V3;
  return {
    ...dasar,
    versi: 4,
    sumber: 'KMK-MK-053.0 (titik 10/25/50/100/150 mL/h, 5 pengulangan, occlusion < 20 psi) + KMK-MK-003.0 (guard band w = U: |koreksi| + U95 ≤ toleransi) + rumus ketidakpastian Master_Infusion_Pump.xlsx (26 Okt 2026)',
  };
})();

export const TEMPLATE_INFUSION_PUMP = TEMPLATE_INFUSION_PUMP_V4;
