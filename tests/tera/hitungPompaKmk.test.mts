// Uji mesin hitung pompa versi KMK (Infusion v4, Syringe v3) — 5 pengulangan & titik contoh KMK-MK-053.0/095.0,
// aturan keputusan guard band w = U menurut KMK-MK-003.0 (Lulus bila hasil < AL = TL − U → |koreksi| + U95 ≤ toleransi).
// Jalankan: npm run test:tera:hitung-pompa-kmk
//
// ANGKA (rata-rata, koreksi, u Tipe A … U95, nilai listrik terukur) = Excel Master yang dihitung ulang LibreOffice
// dengan 5 bacaan (fixture *-golden-kmk.json, dibuat tools/tera/buat_golden_pompa.py … infusion_kmk|syringe_kmk).
// VONIS: listrik & penyumbatan = vonis Excel (rumusnya sama); aliran = |koreksi| + U95 ≤ 10 % setting — untuk Infusion
// harus SAMA dengan vonis Excel; untuk Syringe Excel memakai toleransi/3 sebagai pengganti U, jadi dihitung di sini.
import { readFileSync } from 'node:fs';
import { hitungPompa, type KalibratorPompa, type TemplatePompaKinerja as TemplatePompa } from '../../src/tera/shared/hitungPompa.ts';
import { TEMPLATE_INFUSION_PUMP_V3, TEMPLATE_INFUSION_PUMP_V4 } from '../../src/tera/shared/templates/infusionPump.ts';
import { TEMPLATE_SYRINGE_PUMP_V2, TEMPLATE_SYRINGE_PUMP_V3 } from '../../src/tera/shared/templates/syringePump.ts';

let lulus = 0, gagal = 0;
const cek = (n: string, ok: boolean, d = '') => { ok ? lulus++ : gagal++; if (!ok || process.env.RINCI) console.log((ok ? '✅ ' : '❌ ') + n + (ok ? '' : '  — ' + d)); };
const sama = (a: number | null, b: number | null, tol = 1e-7) => a !== null && b !== null && Math.abs(a - b) <= tol;

for (const [nama, T, berkas] of [
  ['Infusion v4', TEMPLATE_INFUSION_PUMP_V4, 'infusion-golden-kmk.json'],
  ['Syringe v3', TEMPLATE_SYRINGE_PUMP_V3, 'syringe-golden-kmk.json'],
] as [string, TemplatePompa, string][]) {
  const infus = T.kode_alat === 'infusion_pump';
  cek(`${nama}: template KMK (5 pengulangan, guard band w = U bawaan, aliran U95, occlusion <)`, T.kinerja.pengulangan === 5 && T.aturanKeputusan === undefined && (T.kinerja.aturanAliran ?? 'u95') === 'u95' && T.kinerja.sumbat.banding === '<');
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
      const kmk = Math.abs(e.koreksi) + e.u95 <= Math.abs(e.setting * 0.1) ? 'Laik' : 'Tidak Laik';
      cek(`${nama} ${kasus.nama} aliran ${e.setting}: vonis |C|+U95 ≤ MPE ${kmk}`, a.hasil === kmk, `${a.hasil}`);
      if (infus) cek(`${nama} ${kasus.nama} aliran ${e.setting}: vonis = Excel Infusion`, a.hasil === e.hasil, `${a.hasil}/${e.hasil}`);
      cek(`${nama} ${kasus.nama} aliran ${e.setting}: U95 ≤ ⅓ toleransi (KMK-MK-003.0 Contoh 2; diperiksa pada bacaan normal)`, e.u95 <= Math.abs(e.setting * 0.1) / 3 || kasus.nama !== 'laik-lengkap', `U95 ${e.u95}`);
      if (kmk !== e.hasil) bedaExcel++;
      if (kmk === 'Laik') laik++;
    });

    const s = H.sumbat, b = h.sumbat;
    cek(`${nama} ${kasus.nama} penyumbatan: angka = Excel`, sama(b.rataRata, s.rataRata) && sama(b.u95, s.u95) && sama(b.uTipeA, s.uTipeA));
    const sumbatKmk = s.hasil;
    cek(`${nama} ${kasus.nama} penyumbatan: vonis = Excel ${sumbatKmk}`, b.hasil === sumbatKmk && sumbatKmk === (Math.abs(s.rataRata) + s.u95 < 20 ? 'Laik' : 'Tidak Laik'), `${b.hasil}`);

    let semuaListrik = true;
    for (const [id, e] of Object.entries<any>(H.listrik)) {
      const a = h.listrik[id];
      const v = e.hasil;
      if (v !== 'Laik') semuaListrik = false;
      cek(`${nama} ${kasus.nama} listrik ${id}: terukur, U & vonis = Excel ${v}`, sama(a.terukur, e.terukur, 1e-9) && sama(a.u95, e.u95, 1e-9) && a.hasil === v, `${a.terukur}/${e.terukur} ${a.hasil}`);
    }

    const kotak = Object.values<any>(kasus.data.fisik).flatMap((x) => [x.fisik === 'Baik', x.fungsi === 'Berfungsi']);
    const nFisik = kotak.filter(Boolean).length / kotak.length >= 0.7 ? 10 : 0;
    const nKinerja = laik / H.aliran.length >= 0.7 && sumbatKmk === 'Laik' ? 50 : 0;
    const total = nFisik + (semuaListrik ? 40 : 0) + nKinerja;
    cek(`${nama} ${kasus.nama}: skor ${total} & kesimpulan`, h.skor.total === total && h.kesimpulan === (total >= 90 ? 'Laik Pakai' : 'Tidak Laik Pakai'), `${h.skor.total}`);
  }
  // Syringe: harus ada kasus pembeda (Excel toleransi/3 vs U95 sebenarnya); Infusion: harus nol beda
  cek(`${nama}: beda vonis aliran dengan Excel = ${bedaExcel} (${infus ? 'harus 0' : 'harus > 0'})`, infus ? bedaExcel === 0 : bedaExcel > 0);
}

// Versi keliru (Infusion v3 / Syringe v2, nonaktif, tanpa LKK) tetap dihitung apa adanya (template tidak boleh berubah makna)
for (const [T, berkas] of [[TEMPLATE_INFUSION_PUMP_V3, 'infusion'], [TEMPLATE_SYRINGE_PUMP_V2, 'syringe']] as [TemplatePompa, string][]) {
  const fx = JSON.parse(readFileSync(new URL(`./fixtures/${berkas}-golden-kmk.json`, import.meta.url), 'utf8'));
  const k = fx.kasus.find((x: any) => x.nama === 'koreksi-8persen-semua');
  const h = hitungPompa(T, k.data, k.kalibrator);
  cek(`${T.kode_alat} v${T.versi} (keliru, nonaktif): tetap |C| ≤ MPE`, h.aliran.titik.every((t, i) => t.hasil === (Math.abs(k.harapan.aliran[i].koreksi) <= k.harapan.aliran[i].setting * 0.1 ? 'Laik' : 'Tidak Laik')));
}

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
