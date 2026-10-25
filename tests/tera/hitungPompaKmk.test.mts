// Uji mesin hitung pompa versi KMK (Infusion v3, Syringe v2) — keputusan Ridhwan 26 Okt 2026 "ikuti KMK semuanya".
// Jalankan: npm run test:tera:hitung-pompa-kmk
//
// ANGKA (rata-rata, koreksi, u Tipe A … U95, nilai listrik terukur) = Excel Master yang dihitung ulang LibreOffice
// dengan 5 bacaan (fixture *-golden-kmk.json, dibuat tools/tera/buat_golden_pompa.py … infusion_kmk|syringe_kmk).
// VONIS dihitung di sini dengan aturan KMK-MK-053.0/095.0 butir 10.1 (guard band C + |U| ≤ MPE + w, w = U → |C| ≤ MPE),
// occlusion < 20 psi (butir 9.2), listrik langsung dibanding ambang SNI IEC 62353 — BUKAN vonis Excel lama.
import { readFileSync } from 'node:fs';
import { hitungPompa, type KalibratorPompa, type TemplatePompa } from '../../src/tera/shared/hitungPompa.ts';
import { TEMPLATE_INFUSION_PUMP_V3 } from '../../src/tera/shared/templates/infusionPump.ts';
import { TEMPLATE_SYRINGE_PUMP_V2 } from '../../src/tera/shared/templates/syringePump.ts';

let lulus = 0, gagal = 0;
const cek = (n: string, ok: boolean, d = '') => { ok ? lulus++ : gagal++; if (!ok || process.env.RINCI) console.log((ok ? '✅ ' : '❌ ') + n + (ok ? '' : '  — ' + d)); };
const sama = (a: number | null, b: number | null, tol = 1e-7) => a !== null && b !== null && Math.abs(a - b) <= tol;

const vonisListrik = (id: string, x: number) =>
  id === 'tegangan' ? Math.abs(x - 220) <= 22 : id === 'resistansi_pembumian' ? Math.abs(x) <= 0.3 : id === 'resistansi_isolasi' ? x >= 2 : Math.abs(x) <= 500;

for (const [nama, T, berkas] of [
  ['Infusion v3', TEMPLATE_INFUSION_PUMP_V3, 'infusion-golden-kmk.json'],
  ['Syringe v2', TEMPLATE_SYRINGE_PUMP_V2, 'syringe-golden-kmk.json'],
] as [string, TemplatePompa, string][]) {
  cek(`${nama}: template KMK (5 pengulangan, guard band, occlusion <)`, T.kinerja.pengulangan === 5 && T.aturanKeputusan === 'guardband_w_u' && T.kinerja.sumbat.banding === '<');
  const fx = JSON.parse(readFileSync(new URL(`./fixtures/${berkas}`, import.meta.url), 'utf8'));
  let bedaExcel = 0;
  for (const kasus of fx.kasus) {
    cek(`${nama} ${kasus.nama}: titik = template`, JSON.stringify(kasus.titikAliran) === JSON.stringify(T.kinerja.titikAliran));
    const h = hitungPompa(T, kasus.data, kasus.kalibrator as KalibratorPompa);
    const H = kasus.harapan;
    cek(`${nama} ${kasus.nama}: tidak ada isian kurang`, h.kurang.length === 0, h.kurang.join(', '));

    let laik = 0;
    H.aliran.forEach((e: any, i: number) => {
      const a = h.aliran.titik[i];
      const angka: [string, number | null, number][] = [['rata-rata', a.rataRata, e.rataRata], ['koreksi', a.koreksi, e.koreksi], ['u Tipe A', a.uTipeA, e.uTipeA],
        ['u sertifikat', a.uSertifikat, e.uSertifikat], ['u resolusi', a.uResolusi, e.uResolusi], ['u drift', a.uDrift, e.uDrift], ['uc', a.uc, e.uc], ['v eff', a.vEff, e.vEff], ['k', a.k, e.k], ['U95', a.u95, e.u95]];
      const salah = angka.filter(([, x, y]) => !sama(x, y)).map(([k, x, y]) => `${k} ${x} ≠ ${y}`);
      cek(`${nama} ${kasus.nama} aliran ${e.setting}: 10 angka = Excel`, salah.length === 0, salah.join('; '));
      const kmk = Math.abs(e.koreksi) <= Math.abs(e.setting * 0.1) ? 'Laik' : 'Tidak Laik';
      cek(`${nama} ${kasus.nama} aliran ${e.setting}: vonis KMK ${kmk}`, a.hasil === kmk, `${a.hasil}`);
      if (kmk !== e.hasil) bedaExcel++;
      if (kmk === 'Laik') laik++;
    });

    const s = H.sumbat, b = h.sumbat;
    cek(`${nama} ${kasus.nama} penyumbatan: angka = Excel`, sama(b.rataRata, s.rataRata) && sama(b.u95, s.u95) && sama(b.uTipeA, s.uTipeA));
    const sumbatKmk = Math.abs(s.rataRata) < 20 ? 'Laik' : 'Tidak Laik';
    cek(`${nama} ${kasus.nama} penyumbatan: vonis KMK ${sumbatKmk}`, b.hasil === sumbatKmk, `${b.hasil}`);

    let semuaListrik = true;
    for (const [id, e] of Object.entries<any>(H.listrik)) {
      const a = h.listrik[id];
      const v = vonisListrik(id, e.terukur) ? 'Laik' : 'Tidak Laik';
      if (v !== 'Laik') semuaListrik = false;
      if (v !== e.hasil) bedaExcel++;
      cek(`${nama} ${kasus.nama} listrik ${id}: terukur & U = Excel, vonis KMK ${v}`, sama(a.terukur, e.terukur, 1e-9) && sama(a.u95, e.u95, 1e-9) && a.hasil === v, `${a.terukur}/${e.terukur} ${a.hasil}`);
    }

    const kotak = Object.values<any>(kasus.data.fisik).flatMap((x) => [x.fisik === 'Baik', x.fungsi === 'Berfungsi']);
    const nFisik = kotak.filter(Boolean).length / kotak.length >= 0.7 ? 10 : 0;
    const nKinerja = laik / H.aliran.length >= 0.7 && sumbatKmk === 'Laik' ? 50 : 0;
    const total = nFisik + (semuaListrik ? 40 : 0) + nKinerja;
    cek(`${nama} ${kasus.nama}: skor ${total} & kesimpulan`, h.skor.total === total && h.kesimpulan === (total >= 90 ? 'Laik Pakai' : 'Tidak Laik Pakai'), `${h.skor.total}`);
  }
  // Kasus pembeda harus benar-benar ada (kalau tidak, uji ini tidak membuktikan apa-apa)
  cek(`${nama}: ada vonis KMK yang berbeda dari vonis Excel lama (${bedaExcel})`, bedaExcel > 0);
}

// Template lama tidak berubah perilakunya (LKK lama tetap sama)
{
  const fx = JSON.parse(readFileSync(new URL('./fixtures/infusion-golden-kmk.json', import.meta.url), 'utf8'));
  const k = fx.kasus.find((x: any) => x.nama === 'koreksi-8persen-semua');
  const lama = { ...TEMPLATE_INFUSION_PUMP_V3, aturanKeputusan: undefined };
  const h = hitungPompa(lama, k.data, k.kalibrator);
  cek('tanpa aturanKeputusan: vonis tetap cara Excel lama (|C| + U95 ≤ MPE)', h.aliran.titik.every((t, i) => t.hasil === k.harapan.aliran[i].hasil));
}

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
