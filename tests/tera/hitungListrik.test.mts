// Uji mesin hitung KESELAMATAN LISTRIK = Excel Master_Keselamatan_Listrik_terisi.xlsx (dihitung ulang LibreOffice,
// fixture listrik-golden-v1.json dibuat tools/tera/buat_golden_listrik.py). Guard band per kasus = Input 2!M17.
// Jalankan: npm run test:tera:hitung-listrik
import { readFileSync } from 'node:fs';
import { hitungPompa, type KalibratorPompa, type TemplatePompa } from '../../src/tera/shared/hitungPompa.ts';
import { TEMPLATE_KESELAMATAN_LISTRIK_V1 as T, TEMPLATE_KESELAMATAN_LISTRIK_V2 as T2, TEMPLATE_KESELAMATAN_LISTRIK } from '../../src/tera/shared/templates/keselamatanListrik.ts';

let lulus = 0, gagal = 0;
const cek = (n: string, ok: boolean, d = '') => { ok ? lulus++ : gagal++; if (!ok || process.env.RINCI) console.log((ok ? '✅ ' : '❌ ') + n + (ok ? '' : '  — ' + d)); };
const sama = (a: number | null | undefined, b: number | null | undefined, tol = 1e-9) => a != null && b != null && Math.abs(a - b) <= tol;

const FISIK = { badan: { fisik: 'Baik', fungsi: 'Berfungsi' }, kontrol: { fisik: 'Baik', fungsi: 'Berfungsi' }, kabel: { fisik: 'Baik', fungsi: 'Berfungsi' } };
const fx = JSON.parse(readFileSync(new URL('./fixtures/listrik-golden-v1.json', import.meta.url), 'utf8'));

cek('template tanpa kinerja & skor, U95 cara GUM, 4 klasifikasi', !T.kinerja && !T.skor && T.ketidakpastianListrik === 'gum' && T.klasifikasi?.length === 4);
cek('guard band bawaan w = U (KMK-MK-003.0) kecuali tegangan', T.listrik.every((u) => (u.id === 'tegangan' ? u.kaliU === 0 : u.kaliU === undefined)));

for (const k of fx.kasus) {
  // Template mengikuti guard band kasus (Excel Input 2!M17); template sebenarnya w = 1
  const tpl: TemplatePompa = { ...T, listrik: T.listrik.map((u) => (u.id === 'tegangan' ? u : { ...u, kaliU: k.guardBand })) };
  const h = hitungPompa(tpl, { ...k.data, fisik: FISIK }, { aliran: [], tekanan: [], listrik: k.kalibrator.listrik } as KalibratorPompa);
  cek(`${k.nama}: lengkap`, h.kurang.length === 0, h.kurang.join(', '));
  for (const [id, e] of Object.entries<any>(k.harapan.listrik)) {
    const a = h.listrik[id];
    const tidakBerlaku = e.hasil === 'Tidak berlaku';
    if (tidakBerlaku) {
      cek(`${k.nama} ${id}: tidak berlaku`, a.berlaku === false && a.hasil === '-' && a.terukur === null && a.toleransiTeks === '-', JSON.stringify(a));
      continue;
    }
    cek(`${k.nama} ${id}: terukur = Excel`, sama(a.terukur, e.terukur), `${a.terukur} ≠ ${e.terukur}`);
    cek(`${k.nama} ${id}: U95 = Excel`, sama(a.u95, e.u95, 1e-12), `${a.u95} ≠ ${e.u95}`);
    cek(`${k.nama} ${id}: batas & tulisan toleransi = Excel`, a.batas === e.batas && a.toleransiTeks === e.toleransi, `${a.batas}/${a.toleransiTeks} ≠ ${e.batas}/${e.toleransi}`);
    const harap = id === 'tegangan' ? (e.hasil === 'Dalam rentang' ? 'Laik' : 'Tidak Laik') : e.hasil;
    cek(`${k.nama} ${id}: vonis = Excel (${e.hasil})`, a.hasil === harap, a.hasil);
  }
  cek(`${k.nama}: kesimpulan = Excel (${k.harapan.kesimpulan})`, h.kesimpulan === k.harapan.kesimpulan, h.kesimpulan);
}

// Data kurang → tidak galat, kesimpulan belum final
const kosong = hitungPompa(T, {}, { aliran: [], tekanan: [], listrik: {} } as KalibratorPompa);
cek('data kosong: tanpa galat, daftar kurang berisi klasifikasi & kalibrator', kosong.kurang.includes('Kalibrator ESA belum dipilih') && kosong.kurang.includes('Kelas proteksi belum dipilih'), kosong.kurang.join(', '));
const kelas2 = hitungPompa(T, { klasifikasi: { kelas: 'Kelas II', tipeAP: 'Tipe B', metodeBocor: 'Langsung' } }, { aliran: [], tekanan: [], listrik: fx.kasus[0].kalibrator.listrik } as KalibratorPompa);
cek('Kelas II: cara ukur PE & bacaan PE / AP tidak diminta', !kelas2.kurang.some((x) => /PE|Pembumian|Applied/.test(x)), kelas2.kurang.join(', '));
// Fisik tidak ikut kesimpulan (seperti Excel)
const k0 = fx.kasus[0];
const rusak = hitungPompa(T, { ...k0.data, fisik: { ...FISIK, badan: { fisik: 'Tidak Baik', fungsi: 'Tidak Berfungsi' } } }, { aliran: [], tekanan: [], listrik: k0.kalibrator.listrik } as KalibratorPompa);
cek('fisik Tidak Baik tidak mengubah kesimpulan — v1 (Excel C18)', rusak.kesimpulan === 'Laik Pakai');

// v2 (Ridhwan 26 Okt 2026 18.13): fisik & fungsi ikut menentukan, minimal 70 % kotak Baik/Berfungsi
cek('template aktif = v2, hanya beda versi & fisikWajib 70 %', TEMPLATE_KESELAMATAN_LISTRIK === T2 && T2.versi === 2 && T2.fisikWajib?.minimalPersen === 0.7
  && JSON.stringify({ ...T2, versi: 1, sumber: '', fisikWajib: undefined }) === JSON.stringify({ ...T, sumber: '' }));
const kal0 = { aliran: [], tekanan: [], listrik: k0.kalibrator.listrik } as KalibratorPompa;
const fisikDengan = (n: number) => { // n kotak (dari 6) dibuat Tidak Baik / Tidak Berfungsi
  const f: any = JSON.parse(JSON.stringify(FISIK)); const kotak: [string, string][] = [['badan', 'fisik'], ['badan', 'fungsi'], ['kontrol', 'fisik'], ['kontrol', 'fungsi'], ['kabel', 'fisik'], ['kabel', 'fungsi']];
  kotak.slice(0, n).forEach(([i, kol]) => { f[i][kol] = kol === 'fisik' ? 'Tidak Baik' : 'Tidak Berfungsi'; });
  return f;
};
for (const k of fx.kasus) {
  const h1 = hitungPompa({ ...T, listrik: T.listrik.map((u) => (u.id === 'tegangan' ? u : { ...u, kaliU: k.guardBand })) }, { ...k.data, fisik: FISIK }, { aliran: [], tekanan: [], listrik: k.kalibrator.listrik } as KalibratorPompa);
  const h2 = hitungPompa({ ...T2, listrik: T2.listrik.map((u) => (u.id === 'tegangan' ? u : { ...u, kaliU: k.guardBand })) }, { ...k.data, fisik: FISIK }, { aliran: [], tekanan: [], listrik: k.kalibrator.listrik } as KalibratorPompa);
  cek(`v2 ${k.nama}: fisik baik semua → kesimpulan sama dengan Excel`, h2.kesimpulan === h1.kesimpulan && h2.kesimpulan === k.harapan.kesimpulan && h2.fisik.lolos === true);
}
for (const [n, harap] of [[0, 'Laik Pakai'], [1, 'Laik Pakai'], [2, 'Tidak Laik Pakai'], [6, 'Tidak Laik Pakai']] as [number, string][]) {
  const h = hitungPompa(T2, { ...k0.data, fisik: fisikDengan(n) }, kal0);
  cek(`v2: ${6 - n}/6 kotak baik (${Math.round(((6 - n) / 6) * 100)} %) → ${harap}`, h.kesimpulan === harap && h.fisik.lolos === (harap === 'Laik Pakai'), `${h.kesimpulan}`);
}
const gagalListrik = fx.kasus.find((x: any) => x.nama === 'isolasi-gagal');
cek('v2: fisik baik tetapi uji listrik gagal → Tidak Laik Pakai', hitungPompa(T2, { ...gagalListrik.data, fisik: FISIK }, { aliran: [], tekanan: [], listrik: gagalListrik.kalibrator.listrik } as KalibratorPompa).kesimpulan === 'Tidak Laik Pakai');

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
