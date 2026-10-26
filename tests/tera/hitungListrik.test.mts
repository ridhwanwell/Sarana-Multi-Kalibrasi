// Uji mesin hitung KESELAMATAN LISTRIK = Excel Master_Keselamatan_Listrik_terisi.xlsx (dihitung ulang LibreOffice,
// fixture listrik-golden-v1.json dibuat tools/tera/buat_golden_listrik.py). Guard band per kasus = Input 2!M17.
// Jalankan: npm run test:tera:hitung-listrik
import { readFileSync } from 'node:fs';
import { hitungPompa, type KalibratorPompa, type TemplatePompa } from '../../src/tera/shared/hitungPompa.ts';
import { TEMPLATE_KESELAMATAN_LISTRIK_V1 as T } from '../../src/tera/shared/templates/keselamatanListrik.ts';

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
cek('fisik Tidak Baik tidak mengubah kesimpulan (Excel C18)', rusak.kesimpulan === 'Laik Pakai');

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
