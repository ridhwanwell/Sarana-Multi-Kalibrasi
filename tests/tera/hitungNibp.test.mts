// Uji mesin hitung NIBP = Excel Master_NIBP_terisi.xlsx (dihitung ulang LibreOffice, fixture nibp-golden-v1.json dibuat
// tools/tera/buat_golden_nibp.py; uji listrik dikosongkan karena alat standar hanya NIBP Simulator + termohigrometer).
// Jalankan: npm run test:tera:hitung-nibp
// Catatan: skor fisik Excel (COUNTIF "Baik" di G:I / 6) selalu 0 karena kolom Fungsi berisi "Berfungsi"; aplikasi memakai
// keputusan Ridhwan (semua kotak Baik/Berfungsi ≥ 70 % → 10). Kesimpulan tetap sama karena ambang 90.
import { readFileSync } from 'node:fs';
import { hitungPompa, type KalibratorPompa } from '../../src/tera/shared/hitungPompa.ts';
import { TEMPLATE_NIBP_V1 as T, TEMPLATE_NIBP_V2 as T2, TEMPLATE_NIBP } from '../../src/tera/shared/templates/nibp.ts';

let lulus = 0, gagal = 0;
const cek = (n: string, ok: boolean, d = '') => { ok ? lulus++ : gagal++; if (!ok || process.env.RINCI) console.log((ok ? '✅ ' : '❌ ') + n + (ok ? '' : '  — ' + d)); };
const sama = (a: number | null | undefined, b: number | null | undefined, tol = 1e-9) => a != null && b != null && Math.abs(a - b) <= tol;

const FISIK = { badan: { fisik: 'Baik', fungsi: 'Berfungsi' }, kontrol: { fisik: 'Baik', fungsi: 'Berfungsi' }, kabel: { fisik: 'Baik', fungsi: 'Berfungsi' } };
const fx = JSON.parse(readFileSync(new URL('./fixtures/nibp-golden-v1.json', import.meta.url), 'utf8'));
const kal = (k: any) => ({ aliran: [], tekanan: [], listrik: {}, nibp: k.kalibrator.nibp } as KalibratorPompa);

cek('template: 12 titik = setting Excel, 6 bacaan (min 4), ±8 mmHg, tanpa uji listrik, tanpa kinerja aliran',
  JSON.stringify(T.nibp!.titik.map((t) => t.setting)) === JSON.stringify([60, 40, 30, 120, 93, 80, 150, 117, 100, 200, 167, 150])
  && T.nibp!.pengulangan === 6 && T.nibp!.minimalUlangan === 4 && T.nibp!.toleransi === 8 && T.listrik.length === 0 && !T.kinerja && T.keselamatan_listrik === 'tidak_ada');
cek('tabel NIBP Simulator di fixture = sertifikat YK.05.02/E.IX/7560/2026 (0,58…0,61 mmHg)', JSON.stringify(fx.kasus[0].kalibrator.nibp.map((t: any) => t.u95)) === JSON.stringify([0.58, 0.59, 0.59, 0.59, 0.59, 0.6, 0.61]));

for (const k of fx.kasus) {
  const h = hitungPompa(T, { ...k.data, fisik: FISIK }, kal(k));
  cek(`${k.nama}: lengkap`, h.kurang.length === 0, h.kurang.join(', '));
  k.harapan.titik.forEach((e: any, i: number) => {
    const a = h.nibp!.titik[i];
    const angka: [string, number | null, number | null][] = [['rata-rata', a.rataRata, e.rataRata], ['koreksi', a.koreksi, e.koreksi], ['u Tipe A', a.uTipeA, e.uTipeA],
      ['u sertifikat', a.uSertifikat, e.uSertifikat], ['u resolusi', a.uResolusi, e.uResolusi], ['u drift', a.uDrift, e.uDrift], ['uc', a.uc, e.uc],
      ['k', a.k, e.k], ['U95', a.u95, e.u95], ['koreksi std', a.koreksiStd, e.koreksiStd]];
    // veff tak hingga di Excel (semua bacaan sama → uA 0): dibandingkan hanya bila keduanya angka
    const salah = angka.filter(([, x, y]) => !sama(x, y)).map(([n, x, y]) => `${n} ${x} ≠ ${y}`);
    if (e.vEff != null) { if (!sama(a.vEff, e.vEff, 1e-6)) salah.push(`veff ${a.vEff} ≠ ${e.vEff}`); }
    cek(`${k.nama} ${e.id} (${e.setting}): angka = Excel`, salah.length === 0, salah.join('; '));
    cek(`${k.nama} ${e.id}: vonis = Excel (${e.hasil})`, a.hasil === e.hasil, a.hasil);
    cek(`${k.nama} ${e.id}: pembacaan alat = Excel`, sama(a.pembacaanAlat, e.cetakAlat));
  });
  const H = k.harapan.skor;
  cek(`${k.nama}: skor listrik ${H.listrik} & kinerja ${H.kinerja} = Excel; fisik 10 (semua kotak)`, h.skor.rincian[1].nilai === H.listrik && h.skor.rincian[2].nilai === H.kinerja && h.skor.rincian[0].nilai === 10, JSON.stringify(h.skor));
  cek(`${k.nama}: kesimpulan = Excel (${k.harapan.kesimpulan})`, h.kesimpulan === k.harapan.kesimpulan, h.kesimpulan);
}

// Data kurang / tepi
const k0 = fx.kasus[0];
const kosong = hitungPompa(T, {}, { aliran: [], tekanan: [], listrik: {} } as KalibratorPompa);
cek('data kosong: tanpa galat, kurang = kalibrator + 12 titik', kosong.kurang.includes('Kalibrator NIBP Simulator belum dipilih') && kosong.kurang.filter((x) => /minimal 4 bacaan/.test(x)).length === 12, kosong.kurang.join(' | '));
const tiga = hitungPompa(T, { identitas: { resolusi: 1 }, fisik: FISIK, nibp: { ...k0.data.nibp, s1_systole: [60, 61, 59] } }, kal(k0));
cek('3 bacaan → kurang & titik tidak dinilai', tiga.nibp!.titik[0].hasil === '-' && /Ulangan kurang/.test(String(tiga.nibp!.titik[0].catatan)) && tiga.kurang.length === 1);
const pendek = hitungPompa(T, { ...k0.data, fisik: FISIK }, { aliran: [], tekanan: [], listrik: {}, nibp: k0.kalibrator.nibp.slice(0, 4) } as KalibratorPompa);
cek('setting di luar rentang sertifikat (tabel s/d 150) → "Di luar rentang", tidak Laik', pendek.nibp!.titik[9].catatan === 'Di luar rentang' && pendek.nibp!.titik[9].hasil === '-' && pendek.nibp!.titik[0].hasil === 'Laik');
const rusak = hitungPompa(T, { ...k0.data, fisik: { ...FISIK, badan: { fisik: 'Tidak Baik', fungsi: 'Tidak Berfungsi' }, kontrol: { fisik: 'Tidak Baik', fungsi: 'Berfungsi' } } }, kal(k0));
cek('fisik 3/6 → skor fisik 0, total 90 → tetap Laik Pakai (ambang 90, sama dengan Excel)', rusak.skor.rincian[0].nilai === 0 && rusak.skor.total === 90 && rusak.kesimpulan === 'Laik Pakai');

// v2 (Ridhwan 26 Okt 2026 19.02): kelistrikan tidak dinilai; nilai = fisik 10 + kinerja 50 (maks 60), laik bila keduanya memenuhi
cek('template aktif = v2; beda dengan v1 hanya versi, sumber & listrikBilaTidakDiuji', TEMPLATE_NIBP === T2 && T2.versi === 2 && T2.skor?.listrikBilaTidakDiuji === 'tidak_dihitung'
  && JSON.stringify({ ...T2, versi: 1, sumber: '', skor: { ...T2.skor, listrikBilaTidakDiuji: undefined } }) === JSON.stringify({ ...T, sumber: '' }));
for (const k of fx.kasus) {
  const h1 = hitungPompa(T, { ...k.data, fisik: FISIK }, kal(k));
  const h2 = hitungPompa(T2, { ...k.data, fisik: FISIK }, kal(k));
  const kin = k.harapan.skor.kinerja;
  cek(`v2 ${k.nama}: angka titik sama dengan v1; skor ${10 + kin} dari 60 tanpa listrik; kesimpulan = Excel`,
    JSON.stringify(h2.nibp) === JSON.stringify(h1.nibp) && h2.skor.maks === 60 && h2.skor.total === 10 + kin && !h2.skor.rincian.some((r) => r.dari === 'listrik') && h2.kesimpulan === k.harapan.kesimpulan, JSON.stringify(h2.skor));
}
const rusak2 = hitungPompa(T2, { ...k0.data, fisik: { ...FISIK, badan: { fisik: 'Tidak Baik', fungsi: 'Tidak Berfungsi' }, kontrol: { fisik: 'Tidak Baik', fungsi: 'Berfungsi' } } }, kal(k0));
cek('v2: fisik 3/6 (gagal) + kinerja lolos → skor 50 dari 60 → TIDAK LAIK PAKAI', rusak2.skor.total === 50 && rusak2.kesimpulan === 'Tidak Laik Pakai');
const satu = hitungPompa(T2, { ...k0.data, fisik: { ...FISIK, badan: { fisik: 'Baik', fungsi: 'Tidak Berfungsi' } } }, kal(k0));
cek('v2: 1 kotak buruk (5/6 = 83 %) → tetap Laik Pakai', satu.skor.total === 60 && satu.kesimpulan === 'Laik Pakai');
const gagalKin = fx.kasus.find((x: any) => x.nama === 'bias-plus-7-gagal');
cek('v2: fisik baik + kinerja gagal → skor 10 dari 60 → Tidak Laik Pakai', (() => { const h = hitungPompa(T2, { ...gagalKin.data, fisik: FISIK }, kal(gagalKin)); return h.skor.total === 10 && h.kesimpulan === 'Tidak Laik Pakai'; })());

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
