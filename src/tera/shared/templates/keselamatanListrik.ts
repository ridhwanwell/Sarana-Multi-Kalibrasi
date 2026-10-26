/**
 * TEMPLATE KESELAMATAN LISTRIK (Tahap 6, PRD F5.1) — alat yang hanya diuji keselamatan listriknya ("JUST ELECTRICAL").
 *
 * Data murni (disimpan apa adanya ke tera_device_templates.definition). Sumber: Master_Keselamatan_Listrik_terisi.xlsx
 * (26 Okt 2026, dari Ridhwan) — Input 1, Input 2 (klasifikasi KMK-MK-002), View Report, Ketidakpastian, Report All.
 * Nilai kalibrator ESA TIDAK di sini, tetapi di snapshot kalibrator LKK (tabel yang sama dengan pompa).
 *
 * Keluarga mesin = pompa (tipe 'pompa', tanpa kinerja): satu ESA, tabel koreksi & aturan yang sama.
 * Sama dengan Excel:
 *  - batas menurut klasifikasi: resistansi PE (cara ukur, Kelas II tidak berlaku), arus bocor peralatan (kelas × metode),
 *    arus bocor bagian yang diaplikasikan (Tipe BF 5000 / Tipe CF 50 µA; Tidak ada / Tipe B tidak berlaku), isolasi > 2 MΩ;
 *  - U95 = k(veff = 60) × U sertifikat ESA / 2 (Ketidakpastian!Y17:Y21);
 *  - tegangan catu daya hanya "Dalam/Di luar rentang" 220 ±10 %, tidak ikut kesimpulan;
 *  - kesimpulan Laik Pakai bila semua uji yang berlaku Laik (View Report!C18) — v1: fisik & fungsi tidak ikut (seperti Excel);
 *    v2: fisik & fungsi ≥ 70 % ikut menentukan (keputusan Ridhwan).
 * Beda dengan Excel: guard band w = U (KMK-MK-003.0; keputusan Ridhwan "ikuti KMK semuanya") = Input 2!M17 diisi 1.
 */
import type { TemplatePompa } from '../hitungPompa.js';

const KELAS = ['Kelas I', 'Kelas II'];
const TIPE_AP = ['Tidak ada', 'Tipe B', 'Tipe BF', 'Tipe CF'];
const KABEL_PE = ['Tidak dapat dilepas', 'Dapat dilepas - bersama kabel', 'Dapat dilepas - tanpa kabel', 'Kabel catu daya saja', 'Instalasi permanen', 'Kotak kontak multipel'];
const METODE = ['Alternatif', 'Langsung', 'Diferensial'];

// View Report!P12 — batas resistansi pembumian protektif (Ω) menurut cara ukur
const BATAS_PE: Record<string, number> = {
  'Tidak dapat dilepas': 0.3, 'Dapat dilepas - bersama kabel': 0.3, 'Dapat dilepas - tanpa kabel': 0.2,
  'Kabel catu daya saja': 0.1, 'Instalasi permanen': 0.3, 'Kotak kontak multipel': 0.5,
};
// View Report!P14 — batas arus bocor peralatan (µA): Alternatif 1000 (Kelas I) / 500 (Kelas II); Langsung & Diferensial 500 / 100
const BATAS_BOCOR: Record<string, number> = {};
for (const m of METODE) for (const k of KELAS) BATAS_BOCOR[`${m}|${k}`] = m === 'Alternatif' ? (k === 'Kelas I' ? 1000 : 500) : (k === 'Kelas I' ? 500 : 100);

export const TEMPLATE_KESELAMATAN_LISTRIK_V1: TemplatePompa = {
  tipe: 'pompa',
  kode_alat: 'keselamatan_listrik',
  nama: 'Keselamatan Listrik',
  versi: 1,
  sumber: 'Master_Keselamatan_Listrik_terisi.xlsx (26 Okt 2026) + KMK-MK-002.0 (klasifikasi & batas SNI IEC 62353) + KMK-MK-003.0 (guard band w = U)',
  metode: 'KMK-MK-002.0',
  kop: 'NON_KAN',
  keselamatan_listrik: 'wajib',
  identitas: { resolusi: { satuan: '', pilihan: [] }, jenisSkala: [], jenisTetap: 'Digital' },
  // Input 1!A14:E25 — Nama Alat (daftar A52:A87, boleh diketik), Merk, Tipe, No. Seri; rentang & resolusi tidak dicetak.
  identitasBidang: [
    { id: 'namaAlat', label: 'Nama Alat', jenis: 'teks', maksPanjang: 80 },
    { id: 'merek', label: 'Merk Pabrik', jenis: 'teks', maksPanjang: 80 },
    { id: 'tipe', label: 'Tipe', jenis: 'teks', maksPanjang: 80 },
    { id: 'noSeri', label: 'No. Seri', jenis: 'teks', maksPanjang: 80 },
    { id: 'tanggalPenerimaan', label: 'Tanggal penerimaan barang kalibrasi', jenis: 'tanggal' },
    { id: 'ruang', label: 'Ruangan', jenis: 'teks', maksPanjang: 80 },
  ],
  // Input 1!A29:I33 — ESA (4 tabel) + termohigrometer (rekomendasi)
  standar: [
    { peran: 'esa', judul: 'Electrical Safety Analyzer (ESA)', parameter: ['tegangan_v', 'resistansi_ohm', 'isolasi_mohm', 'arus_bocor_ua'], wajib: true },
    { peran: 'termohigrometer', judul: 'Termohigrometer', parameter: ['suhu_c', 'kelembaban_rh'], wajib: true, hanyaRekomendasi: true },
  ],
  fisik: [
    { id: 'badan', judul: 'Badan dan Permukaan / Enclosure and its Surfaces' },
    { id: 'kontrol', judul: 'Kontrol dan Indikator / Control and indicator' },
    { id: 'kabel', judul: 'Kabel dan Aksesori / Wire and acessories' },
  ],
  pilihanFisik: { fisik: ['Baik', 'Tidak Baik'], fungsi: ['Berfungsi', 'Tidak Berfungsi'] },
  // Input 2!L13:M16 (pilihan = validasi data Excel)
  klasifikasi: [
    { id: 'kelas', label: 'Kelas proteksi', pilihan: KELAS },
    { id: 'tipeAP', label: 'Tipe bagian yang diaplikasikan (AP)', pilihan: TIPE_AP },
    { id: 'kabelPE', label: 'Kabel catu daya / cara ukur resistansi PE', pilihan: KABEL_PE, wajibBila: { klasifikasi: 'kelas', nilai: ['Kelas I'] } },
    { id: 'metodeBocor', label: 'Metode arus bocor peralatan', pilihan: METODE },
  ],
  ketidakpastianListrik: 'gum',
  // View Report!A11:L15 (IEC 62353)
  listrik: [
    { id: 'tegangan', judul: 'Tegangan Catu Daya / Mains Voltage', satuan: 'V', kalibrator: 'tegangan', uji: { jenis: 'sekitar', nominal: 220, batas: 22 }, diBawahTabel: 'ujung', toleransiTeks: '220 ±10 %', masukKesimpulan: false, kaliU: 0, teksHasil: ['Dalam rentang', 'Di luar rentang'] },
    { id: 'resistansi_pembumian', judul: 'Resistansi Pembumian Protektif / Protective Earth Resistance', satuan: 'Ω', kalibrator: 'resistansi', uji: { jenis: 'maksimum', batas: { menurut: ['kabelPE'], nilai: BATAS_PE } }, diBawahTabel: 'ujung', toleransiTeks: '≤ 0,3', berlakuBila: { klasifikasi: 'kelas', nilai: ['Kelas I'] } },
    { id: 'resistansi_isolasi', judul: 'Isolasi Resistansi / Insulation of Resistance', satuan: 'MΩ', kalibrator: 'isolasi', uji: { jenis: 'minimum', batas: 2, tegas: true }, diBawahTabel: 'ujung', toleransiTeks: '> 2' },
    { id: 'arus_bocor_peralatan', judul: 'Arus Bocor Peralatan / Equipment Leakage Current', satuan: 'µA', kalibrator: 'arus_bocor', uji: { jenis: 'maksimum', batas: { menurut: ['metodeBocor', 'kelas'], nilai: BATAS_BOCOR } }, diBawahTabel: 'proporsional', toleransiTeks: '≤ 500' },
    { id: 'arus_bocor_ap', judul: 'Arus Bocor Bagian yang Diaplikasikan / Applied Part Leakage Current', satuan: 'µA', kalibrator: 'arus_bocor', uji: { jenis: 'maksimum', batas: { menurut: ['tipeAP'], nilai: { 'Tipe BF': 5000, 'Tipe CF': 50 } } }, diBawahTabel: 'proporsional', toleransiTeks: '≤ 5000', berlakuBila: { klasifikasi: 'tipeAP', nilai: ['Tipe BF', 'Tipe CF'] } },
  ],
  // Input 1!A52:A87 — alat "just electrical" (nama PO yang memakai template ini)
  alatTercakup: [
    'Kelistrikan', 'Pengujian Keselamatan Listrik', 'Deferensial Blood Cell Counter', 'Differential Blood Cell Counter', 'Fudus Camera', 'Fundus Camera',
    'Lampu X-Ray', 'Laser Mata', 'Laser Therapy', 'Lens Meter', 'Lithotipter', 'Lithotripter', 'Bio Safety Cabinet', 'Mesin Phacoemulsifikasi',
    'Mesin URS Lithoclast', 'Microwave Diathermy', 'Perimetry', 'Phaco', 'Photometer', 'Refraksi Subjektif', 'Retina Laser', 'Rotary Microtome',
    'Scaller', 'Spectophotometer', 'Spectrophotometer', 'Surgical System Drill', 'SWD/Shortwave Diathermy', 'ESWT/Electro Shortwave teraphy', 'ESWT',
    'Timpanometer', 'Tissue Embedding', 'Tissue Processor', 'Tonometer', 'Tonometer Schiot', 'Tonoscope', 'Trial set', 'Ultra Sonic Scaler',
    'Ultraviolet Therapy', 'URF', 'Urine Analyzer', 'Urodinamic', 'Uroflow', 'VO2 Max',
  ],
  sertifikat: { tata_letak: 'report_all_keselamatan_listrik', halaman: 3 },
};

/**
 * VERSI 2 (26 Okt 2026 18.13, keputusan Ridhwan "fisik fungsi ikut menentukan juga"): Laik Pakai hanya bila kotak fisik
 * & fungsi Baik/Berfungsi ≥ 70 % (sama dengan aturan pompa) DAN semua uji listrik yang berlaku Laik. Selain itu sama dengan v1.
 */
export const TEMPLATE_KESELAMATAN_LISTRIK_V2: TemplatePompa = {
  ...TEMPLATE_KESELAMATAN_LISTRIK_V1,
  versi: 2,
  sumber: 'Master_Keselamatan_Listrik_terisi.xlsx (26 Okt 2026) + KMK-MK-002.0 (klasifikasi & batas SNI IEC 62353) + KMK-MK-003.0 (guard band w = U); fisik & fungsi ≥ 70 % ikut kesimpulan',
  fisikWajib: { minimalPersen: 0.7 },
};

export const TEMPLATE_KESELAMATAN_LISTRIK = TEMPLATE_KESELAMATAN_LISTRIK_V2;
