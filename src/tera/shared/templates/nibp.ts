/**
 * TEMPLATE NIBP — Non Invasive Blood Pressure / tensimeter digital (Tahap 6, PRD F5.1).
 *
 * Data murni (disimpan apa adanya ke tera_device_templates.definition). Sumber: Master_NIBP_terisi.xlsx (26 Okt 2026,
 * dari Ridhwan) + KMK-MK-075.0. Nilai NIBP Simulator & termohigrometer di snapshot kalibrator LKK (tera_calibrator_points).
 *
 * Keputusan Ridhwan 26 Okt 2026 18.40: alat standar HANYA NIBP Simulator + termohigrometer → tanpa uji keselamatan listrik
 * (Excel View Report AE3: tanpa uji listrik = nilai listrik penuh 40; Report All tidak mencetak tabel listrik).
 * Sama dengan Excel: 4 setting × Systole/MAP/Diastole (60/40/30, 120/93/80, 150/117/100, 200/167/150 mmHg), ≤ 6 bacaan
 * (minimal 4), toleransi ±8 mmHg, guard band |koreksi| + U95 ≤ 8 (AE8 = 2), MAP ikut dinilai (AE9 = 1), skor 10/40/50,
 * Laik Pakai ≥ 90, kinerja penuh bila ≥ 70 % titik Laik.
 * Beda dengan Excel (keputusan Ridhwan untuk semua alat): fisik & fungsi menghitung SEMUA kotak (Baik + Berfungsi) ≥ 70 %.
 */
import type { TemplatePompa } from '../hitungPompa.js';

const SET: [number, number, number][] = [[60, 40, 30], [120, 93, 80], [150, 117, 100], [200, 167, 150]];
const LABEL = ['Systole', 'MAP', 'Diastole'];

export const TEMPLATE_NIBP_V1: TemplatePompa = {
  tipe: 'pompa',
  kode_alat: 'nibp',
  nama: 'Non Invasive Blood Pressure (NIBP)',
  versi: 1,
  sumber: 'Master_NIBP_terisi.xlsx (26 Okt 2026) + KMK-MK-075.0; alat standar NIBP Simulator + termohigrometer (tanpa uji listrik); guard band |koreksi| + U95 ≤ 8 mmHg',
  metode: 'KMK-MK-075.0',
  kop: 'NON_KAN',
  keselamatan_listrik: 'tidak_ada',
  // Input 1!E19 resolusi (1 mmHg bawaan), E20 jenis (Digital, √3)
  identitas: { resolusi: { satuan: 'mmHg', pilihan: [1] }, jenisSkala: [], jenisTetap: 'Digital' },
  identitasBidang: [
    { id: 'merek', label: 'Merk Pabrik', jenis: 'teks', maksPanjang: 80 },
    { id: 'tipe', label: 'Tipe', jenis: 'teks', maksPanjang: 80 },
    { id: 'noSeri', label: 'No. Seri', jenis: 'teks', maksPanjang: 80 },
    { id: 'rentangUkur', label: 'Rentang Ukur (mis. 0 - 300 mmHg)', jenis: 'teks', maksPanjang: 40 },
    { id: 'resolusi', label: 'Resolusi', jenis: 'angka', satuan: 'mmHg' },
    { id: 'tanggalPenerimaan', label: 'Tanggal penerimaan barang kalibrasi', jenis: 'tanggal' },
    { id: 'ruang', label: 'Ruangan', jenis: 'teks', maksPanjang: 80 },
  ],
  // Input 1!A29:I32 — NIBP Simulator (tabel tekanan) + termohigrometer (rekomendasi)
  standar: [
    { peran: 'nibp', judul: 'NIBP Simulator', parameter: ['tekanan_mmhg'], wajib: true },
    { peran: 'termohigrometer', judul: 'Termohigrometer', parameter: ['suhu_c', 'kelembaban_rh'], wajib: true, hanyaRekomendasi: true },
  ],
  fisik: [
    { id: 'badan', judul: 'Badan dan Permukaan / Enclosure and its Surfaces' },
    { id: 'kontrol', judul: 'Kontrol dan Indikator / Control and indicator' },
    { id: 'kabel', judul: 'Kabel dan Aksesori / Wire and acessories' },
  ],
  pilihanFisik: { fisik: ['Baik', 'Tidak Baik'], fungsi: ['Berfungsi', 'Tidak Berfungsi'] },
  listrik: [],
  // Input 2!B24:I35 + Ketidakpastian!C31:AA42 + View Report!L19:L30, AE2:AE12
  nibp: {
    titik: SET.flatMap((s, i) => s.map((v, j) => ({ id: `s${i + 1}_${LABEL[j].toLowerCase()}`, label: LABEL[j], setting: v }))),
    pengulangan: 6,
    minimalUlangan: 4,
    toleransi: 8,
    satuan: 'mmHg',
    driftPersen: 0.1,
    derajatBebas: { sertifikat: 60, resolusi: 50, drift: 50 },
    pembagiResolusi: { Analog: Math.sqrt(6), Digital: Math.sqrt(3) },
    desimalCetak: 2,
    minimalPersenTitik: 0.7,
  },
  skor: {
    fisik: { minimalPersen: 0.7, nilai: 10 },
    listrik: { nilai: 40 },
    kinerja: { nilai: 50 },
    laikBila: { banding: '>=', batas: 90 },
  },
  // Nama alat PO lain yang memakai LKK ini (ASPAK "Tensimeter Digital", katalog SPH "Tensi Digital")
  alatTercakup: ['NIBP', 'Non Invasive Blood Pressure', 'Tensimeter Digital', 'Tensi Digital', 'Sphygmomanometer Digital', 'Non Invasive Sphygmomanometer Otomatis'],
  sertifikat: { tata_letak: 'report_all_nibp', halaman: 3 },
};

/**
 * VERSI 2 (26 Okt 2026 19.02, keputusan Ridhwan): NIBP tidak memakai tegangan AC 220 V, jadi kelistrikan DITIADAKAN dari
 * penilaian (bukan diberi nilai penuh 40). Nilai = fisik & fungsi 10 + kinerja 50 (maks 60); Laik Pakai ≥ 90 % dari 60
 * → harus fisik & fungsi lolos (≥ 70 % kotak) DAN kinerja lolos (≥ 70 % titik). Angka hitungan lain sama dengan v1.
 */
export const TEMPLATE_NIBP_V2: TemplatePompa = {
  ...TEMPLATE_NIBP_V1,
  versi: 2,
  sumber: 'Master_NIBP_terisi.xlsx (26 Okt 2026) + KMK-MK-075.0; alat standar NIBP Simulator + termohigrometer; kelistrikan tidak dinilai (fisik 10 + kinerja 50); guard band |koreksi| + U95 ≤ 8 mmHg',
  skor: { ...TEMPLATE_NIBP_V1.skor!, listrikBilaTidakDiuji: 'tidak_dihitung' },
};

export const TEMPLATE_NIBP = TEMPLATE_NIBP_V2;
