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

export const TEMPLATE_SYRINGE_PUMP = TEMPLATE_SYRINGE_PUMP_V1;
