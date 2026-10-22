// Uji pemeriksa isian nilai kalibrator. Jalankan: npx tsx tests/tera/nilaiKalibrator.test.mts
import { bacaTitik } from '../../src/tera/shared/nilaiKalibrator.ts';
let lulus = 0, gagal = 0;
const cek = (n: string, ok: boolean, d = '') => { ok ? lulus++ : gagal++; if (!ok || process.env.RINCI) console.log((ok ? '✅ ' : '❌ ') + n + (ok ? '' : '  — ' + d)); };
const t = (titik: number, k = 0, u = 0.1, extra: any = {}) => ({ titik, koreksiNaik: k, koreksiTurun: k, u95Naik: u, u95Turun: u, ...extra });

cek('titik sah diurutkan naik', JSON.stringify(bacaTitik([t(50), t(0), t(25)]).titik?.map((x) => x.titik)) === '[0,25,50]');
cek('drift ikut bila ada', bacaTitik([t(0, 0, 0.1, { driftNaik: 0.2, driftTurun: 0.3 })]).titik?.[0].driftNaik === 0.2);
cek('drift kosong tidak ditulis', !('driftNaik' in (bacaTitik([t(0)]).titik?.[0] ?? {})));
cek('kosong ditolak', !!bacaTitik([]).salah && !!bacaTitik(null).salah && !!bacaTitik('x').salah);
cek('> 200 titik ditolak', !!bacaTitik(Array.from({ length: 201 }, (_, i) => t(i))).salah);
cek('titik kembar ditolak', /dua kali/.test(bacaTitik([t(10), t(10)]).salah ?? ''));
cek('U95 negatif ditolak', /negatif/.test(bacaTitik([t(0, 0, -0.1)]).salah ?? ''));
cek('teks bukan angka ditolak', !!bacaTitik([{ ...t(0), koreksiNaik: '0,1' }]).salah);
cek('NaN/Infinity ditolak', !!bacaTitik([t(NaN)]).salah && !!bacaTitik([t(0, Infinity)]).salah);
cek('drift bukan angka ditolak', !!bacaTitik([t(0, 0, 0.1, { driftNaik: 'a' })]).salah);
cek('koreksi negatif boleh', bacaTitik([t(0, -1.5)]).titik?.[0].koreksiNaik === -1.5);
cek('nilai objek lain ditolak', !!bacaTitik([null]).salah && !!bacaTitik([5]).salah);
console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
