/**
 * TEMPLATE SYRINGE PUMP (Tahap 6, PRD F5.1).
 *
 * Data murni (bisa disimpan apa adanya ke tera_device_templates.definition).
 * Sumber: Master_Syringe_Pump_terisi.xlsx (26 Okt 2026, dari Ridhwan) + MK 095 (KMK-MK-095.0).
 * Nilai kalibrator (IDA & ESA) TIDAK di sini, tetapi di snapshot kalibrator LKK.
 *
 * Beda dengan Infusion Pump (semuanya mengikuti Excel Ridhwan):
 *  - titik aliran 1 / 5 / 10 / 25 / 50 mL/h;
 *  - Laik per titik aliran = |koreksi| + toleransi/3 ≤ toleransi (View Report L18:L22), bukan memakai U95;
 *  - penyumbatan: |rata-rata| + U95 < 20 psi (tegas "<", View Report L32).
 */
import type { TemplatePompa } from '../hitungPompa.js';
import { TEMPLATE_INFUSION_PUMP_V2 as INFUS } from './infusionPump.js';

export const TEMPLATE_SYRINGE_PUMP_V1: TemplatePompa = {
  ...INFUS,
  kode_alat: 'syringe_pump',
  nama: 'Syringe Pump',
  versi: 1,
  sumber: 'Master_Syringe_Pump_terisi.xlsx (26 Okt 2026) + KMK-MK-095.0; aliran 1–50 mL/h, Laik aliran |koreksi|+toleransi/3, penyumbatan < 20 psi',
  metode: 'KMK-MK-095.0',
  identitasBidang: INFUS.identitasBidang.map((b) => (b.id === 'rentangUkur' ? { ...b, label: 'Rentang Ukur (mis. 0,1 - 99,9 mL/h)' } : b)),
  kinerja: {
    ...INFUS.kinerja,
    titikAliran: [1, 5, 10, 25, 50],
    aturanAliran: 'sepertiga',
    sumbat: { batas: 20, banding: '<', resolusiTetap: 0.01, settingBawaan: 100 },
  },
  sertifikat: { tata_letak: 'report_all_syringe_pump', halaman: 3 },
};

/**
 * VERSI 2 (26 Okt 2026, keputusan Ridhwan "ikuti KMK semuanya"): mengikuti KMK-MK-095.0 —
 *  - aturan keputusan guard band w = U (butir 95.10.1): aliran Laik bila |koreksi| ≤ 10 % setting (bukan lagi toleransi/3);
 *    penyumbatan < 20 psi; keselamatan listrik dibanding langsung dengan ambang SNI IEC 62353;
 *  - titik aliran contoh KMK 10/25/50/75/100 mL/h (butir 95.7.9.2; titik 1 mL/h dibuang karena U95 IDA di sana
 *    lebih besar dari 1/3 toleransi), pengulangan 5 kali.
 */
export const TEMPLATE_SYRINGE_PUMP_V2: TemplatePompa = {
  ...TEMPLATE_SYRINGE_PUMP_V1,
  versi: 2,
  sumber: 'KMK-MK-095.0 (aturan keputusan guard band w = U, titik 10/25/50/75/100 mL/h, 5 pengulangan, occlusion < 20 psi) + rumus ketidakpastian Master_Syringe_Pump_terisi.xlsx (26 Okt 2026)',
  kinerja: {
    ...TEMPLATE_SYRINGE_PUMP_V1.kinerja,
    titikAliran: [10, 25, 50, 75, 100],
    pengulangan: 5,
    aturanAliran: 'u95',
  },
  aturanKeputusan: 'guardband_w_u',
};

/**
 * VERSI 3 (26 Okt 2026 05.01, koreksi setelah KMK-MK-003.0 Pedoman Aturan Keputusan dibaca): guard band w = U yang benar —
 * aliran |koreksi| + U95 ≤ 10 % setting (U95 sebenarnya, bukan toleransi/3; KMK-MK-095.0 "U = 1/3 MPE" = syarat U ≤ ⅓ toleransi,
 * lihat KMK-MK-003.0 Contoh 2), penyumbatan |rata-rata| + U95 < 20 psi, listrik terukur ± U dibanding ambang.
 * Tetap dari v2 (KMK-MK-095.0): titik 10/25/50/75/100 mL/h, 5 pengulangan. v2 dinonaktifkan; tidak pernah dipakai LKK.
 */
export const TEMPLATE_SYRINGE_PUMP_V3: TemplatePompa = (() => {
  const { aturanKeputusan: _keliru, ...dasar } = TEMPLATE_SYRINGE_PUMP_V2;
  return {
    ...dasar,
    versi: 3,
    sumber: 'KMK-MK-095.0 (titik 10/25/50/75/100 mL/h, 5 pengulangan, occlusion < 20 psi) + KMK-MK-003.0 (guard band w = U: |koreksi| + U95 ≤ toleransi) + rumus ketidakpastian Master_Syringe_Pump_terisi.xlsx (26 Okt 2026)',
  };
})();

export const TEMPLATE_SYRINGE_PUMP = TEMPLATE_SYRINGE_PUMP_V3;
