// Uji "jejak hitung": semua komponen budget tertulis, sama dengan golden Excel v4, deterministik, aman untuk data kosong/rusak.
// Jalankan: npx tsx tests/tera/jejak.test.mts
import { readFileSync } from 'node:fs';
import { buatJejakHitung, titikDariSnapshot, VERSI_MESIN_HITUNG } from '../../src/tera/shared/jejak.ts';
import { jsonKanonik } from '../../src/tera/shared/segel.ts';
import { TEMPLATE_SPHYGMOMANOMETER_V2 as T } from '../../src/tera/shared/templates/sphygmomanometer.ts';

let lulus = 0, gagal = 0;
const cek = (n: string, ok: boolean, d = '') => { ok ? lulus++ : gagal++; if (!ok || process.env.RINCI) console.log((ok ? '✅ ' : '❌ ') + n + (ok ? '' : '  — ' + d)); };
const sama = (a: number | null, b: number | null) => a !== null && b !== null && Math.abs(a - b) <= 1e-9;

const fx = JSON.parse(readFileSync(new URL('./fixtures/sphygmo-golden-v4.json', import.meta.url), 'utf8'));
const KOMPONEN = ['rataRata', 'koreksi', 'uTipeA', 'uSertifikat', 'uZero', 'uResolusi', 'uc', 'vEff', 'k', 'u95', 'u95Laporan'] as const;

for (const kasus of fx.kasus) {
  const snap = { tekanan: { asetId: 'CAL-037', nama: 'Digital Pressure Meter', nomorSertifikat: 'X', berlakuSampai: '2027-01-01', points: kasus.kalibrator } };
  const j = buatJejakHitung(T, kasus.data, snap)!;
  cek(`${kasus.nama} jejak ada`, !!j);
  cek(`${kasus.nama} versi template & mesin tertulis`, j.template.kode === T.kode_alat && j.template.versi === T.versi && j.mesinHitung === VERSI_MESIN_HITUNG);
  cek(`${kasus.nama} identitas kalibrator tertulis`, j.kalibrator?.asetId === 'CAL-037' && j.kalibrator.jumlahTitik === kasus.kalibrator.length);
  cek(`${kasus.nama} aturan tertulis (toleransi, derajat bebas, skor)`, j.aturan.kinerja.tekanan.toleransi === 4 && j.aturan.kinerja.tekanan.derajatBebas.tipeA === 5 && j.aturan.skor.laikBila.batas === 70);
  let ok = 0;
  for (const e of kasus.harapan.titik) {
    const a = j.hasil.kinerja.tekanan.titik.find((t) => t.titik === e.titik && t.arah === e.arah)!;
    const salah = KOMPONEN.filter((k) => !sama((a as any)[k], e[k]));
    if (a.uDrift === null) salah.push('uDrift' as any);
    if (!salah.length) ok++; else cek(`${kasus.nama} ${e.titik} ${e.arah}`, false, salah.join(','));
  }
  cek(`${kasus.nama} ${ok}/${kasus.harapan.titik.length} titik: 12 komponen tertulis = Excel`, ok === kasus.harapan.titik.length);
  cek(`${kasus.nama} kesimpulan = Excel`, j.lengkap && j.kesimpulan === kasus.harapan.kesimpulan, `${j.kesimpulan} vs ${kasus.harapan.kesimpulan}`);
  const j2 = buatJejakHitung(T, JSON.parse(JSON.stringify(kasus.data)), snap)!;
  cek(`${kasus.nama} deterministik (data sama → jejak sama persis)`, jsonKanonik(j) === jsonKanonik(j2));
  cek(`${kasus.nama} aman jadi JSON kanonik (tanpa NaN)`, (() => { try { jsonKanonik(j); return true; } catch { return false; } })());
}

// Data kosong / rusak: tidak melempar, kesimpulan belum final.
for (const [n, d, s] of [
  ['kosong', {}, null], ['null', null, null], ['rusak', { kinerja: 'x', identitas: 5 }, { tekanan: { points: 'x' } }],
  ['snapshot tanpa titik', {}, { tekanan: { points: [{ titik: 'a' }] } }],
] as const) {
  let j: ReturnType<typeof buatJejakHitung> = null, galat = false;
  try { j = buatJejakHitung(T, d as any, s as any); } catch { galat = true; }
  cek(`data ${n}: tidak melempar galat`, !galat && !!j);
  cek(`data ${n}: belum lengkap, kesimpulan null`, !!j && !j.lengkap && j.kesimpulan === null);
  cek(`data ${n}: bisa disegel JSON`, !!j && (() => { try { jsonKanonik(j); return true; } catch { return false; } })());
}
cek('titikDariSnapshot membuang baris rusak', titikDariSnapshot({ points: [{ titik: 0, koreksiNaik: 0, koreksiTurun: 0, u95Naik: 1, u95Turun: 1 }, { titik: 'x' }] }).length === 1);

console.log(`\nJejak hitung: ${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
