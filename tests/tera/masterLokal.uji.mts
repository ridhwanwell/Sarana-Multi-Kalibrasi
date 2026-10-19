// Uji TEMPLATE & KALIBRATOR DI PERANGKAT Tera SMK di Chromium sungguhan — Tahap 4.3a (PRD F4.10, CLAUDE.md 9.3/9.4).
// Jalankan: npm run test:tera:master   (butuh paket "playwright" & Chromium; tidak ikut build Vercel)
import { chromium } from 'playwright';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const akar = fileURLToPath(new URL('../../', import.meta.url));
const ASAL = 'http://localhost:9996';

const h = await build({
  stdin: { contents: "import * as db from './src/tera/data/teraDb'; import * as m from './src/tera/data/masterLokal'; (window as any).tera = { ...db, ...m };", resolveDir: akar, loader: 'ts' },
  bundle: true, format: 'esm', target: 'es2022', write: false,
});
const HTML = `<!doctype html><meta charset=utf-8><script>window.__name=(f)=>f</script><script type=module>${h.outputFiles[0].text}; window.siap = true;</script>`;

let lulus = 0, gagal = 0;
const cek = (n: string, ok: boolean, d = '') => { ok ? lulus++ : gagal++; console.log((ok ? 'LULUS ' : 'GAGAL ') + n + (ok ? '' : '  ' + d)); };

const br = await chromium.launch();
const ctx = await br.newContext();
await ctx.route(`${ASAL}/**`, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: HTML }));
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('  [error]', e.message));
await p.goto(ASAL + '/');
await p.waitForFunction(() => (window as any).siap);

const o: any = await p.evaluate(async () => {
  const t = (window as any).tera; const o: Record<string, any> = {};
  const P = [0, 50, 100].map((x) => ({ titik: x, koreksiNaik: 0, koreksiTurun: 0, u95Naik: 0.1, u95Turun: 0.1, driftNaik: 0, driftTurun: 0 }));
  const K = (extra: any = {}) => ({ pointsId: 'p1', asetId: 'CAL-037', kode: 'MS200', nama: 'Pressure Meter', parameter: 'tekanan_mmhg', satuan: 'mmHg',
    nomorSertifikat: 'X/1', tertelusur: 'LK-110', tanggalKalibrasi: '2026-03-04', berlakuSampai: '2027-03-04', points: P, sumber: 'uji', diubahPada: '2026-10-19', ...extra });
  const tplKode = (await t.templateTerbaru('sphygmomanometer'));

  // 1. Belum pernah tarik → template bawaan kode, kalibrator kosong
  o.bawaan = [tplKode?.versi, tplKode?.toleransi ?? tplKode?.kinerja?.[0]?.toleransi];
  o.kalKosong = (await t.daftarKalibrator()).length;

  // 2. Kiriman server: template v2 + kalibrator sah + kalibrator rusak dibuang
  const v2 = { ...tplKode, versi: 2, nama: 'Sphygmomanometer' };
  const sv = (body: any, status = 200) => async () => new Response(JSON.stringify(body), { status });
  o.tarik1 = await t.tarikMaster(sv({ template: [{ kodeAlat: 'sphygmomanometer', versi: 2, definition: v2 }, { definition: { kode_alat: 'rusak' } }],
    kalibrator: [K(), K({ asetId: 'CAL-X', points: [{ titik: 'nol' }] }), K({ asetId: 'CAL-Y', berlakuSampai: null, points: [{ titik: 0, koreksiNaik: 0, koreksiTurun: 0, u95Naik: 0.2, u95Turun: 0.2 }] })] }));
  o.terbaru = (await t.templateTerbaru('sphygmomanometer')).versi;
  o.v1Masih = (await t.templateVersi('sphygmomanometer', 1))?.versi;
  o.kal = (await t.daftarKalibrator('tekanan_mmhg')).map((k: any) => k.asetId);

  // 3. Isi template versi sama tidak bisa ditimpa
  await t.tarikMaster(sv({ template: [{ definition: { ...v2, nama: 'PALSU' } }], kalibrator: [K()] }));
  o.namaTetap = (await t.templateVersi('sphygmomanometer', 2)).nama;

  // 4. Daftar kalibrator diganti utuh (CAL-Y dinonaktifkan di server)
  o.kalSetelah = (await t.daftarKalibrator()).map((k: any) => k.asetId);

  // 5. Server gagal / offline → tidak ada yang berubah
  o.gagal503 = await t.tarikMaster(sv({ error: 'x' }, 503));
  o.gagalJaringan = await t.tarikMaster(async () => { throw new TypeError('Failed to fetch'); });
  o.gagalBentuk = await t.tarikMaster(sv({ template: 'x' }));
  o.batasWaktu = await t.tarikMaster((sig: AbortSignal) => new Promise((_, rej) => sig.addEventListener('abort', () => rej(new DOMException('a', 'AbortError')))), 200);
  o.kalTetap = (await t.daftarKalibrator()).length;

  // 6. Expired terhadap tanggal pelaksanaan
  const k = (await t.daftarKalibrator())[0];
  o.st = [t.statusKalibrator(k, '2027-03-04'), t.statusKalibrator(k, '2027-03-05'), t.statusKalibrator({ berlakuSampai: null }, '2030-01-01')];

  // 7. Snapshot = salinan lepas (ubah master tidak mengubah snapshot)
  const snap = t.buatSnapshot(k); k.points[0].u95Naik = 99;
  o.snap = [snap.asetId, snap.points[0].u95Naik, !!snap.dijepretAt, 'diambilAt' in snap];

  // 8. LKK di laci lkk tidak tersentuh
  const l = await t.buatLkk({ pemilik: 'u1', bo: '999' });
  await t.tarikMaster(sv({ template: [], kalibrator: [] }));
  o.lkkAman = !!(await t.ambilLkk(l.id));
  o.kalKosongLagi = (await t.daftarKalibrator()).length;
  return o;
});

cek('belum pernah tarik → template bawaan kode v1 (toleransi 4), kalibrator kosong', o.bawaan[0] === 1 && o.bawaan[1] === 4 && o.kalKosong === 0, JSON.stringify(o.bawaan));
cek('tarik: 1 template baru, kalibrator rusak dibuang (2 sah)', o.tarik1.ok && o.tarik1.templateBaru === 1 && o.tarik1.kalibrator === 2, JSON.stringify(o.tarik1));
cek('template terbaru = versi tertinggi (v2), v1 tetap bisa dibuka untuk LKK lama', o.terbaru === 2 && o.v1Masih === 1);
cek('kalibrator tersimpan per parameter', JSON.stringify(o.kal) === '["CAL-037","CAL-Y"]', JSON.stringify(o.kal));
cek('isi template versi yang sama tidak bisa ditimpa', o.namaTetap === 'Sphygmomanometer', o.namaTetap);
cek('daftar kalibrator diganti utuh (yang dinonaktifkan hilang)', JSON.stringify(o.kalSetelah) === '["CAL-037"]', JSON.stringify(o.kalSetelah));
cek('server 503 / offline / bentuk salah / batas waktu → pesan jelas, data tetap',
  !o.gagal503.ok && o.gagalJaringan.alasan === 'Tidak ada sambungan internet.' && o.gagalBentuk.alasan === 'Jawaban server tidak dikenali.'
  && o.batasWaktu.alasan === 'Server tidak merespons.' && o.kalTetap === 1, JSON.stringify([o.gagal503, o.gagalJaringan, o.batasWaktu]));
cek('expired dihitung dari tanggal pelaksanaan (hari terakhir masih berlaku), tanpa tanggal = belum bersertifikat',
  JSON.stringify(o.st) === '["berlaku","expired","belum_bersertifikat"]', JSON.stringify(o.st));
cek('snapshot = fotokopi lepas (ubah master tidak mengubah snapshot)', o.snap[0] === 'CAL-037' && o.snap[1] === 0.1 && o.snap[2] && !o.snap[3], JSON.stringify(o.snap));
cek('tarik master tidak menyentuh LKK; daftar kosong dari server = kosong juga', o.lkkAman && o.kalKosongLagi === 0);

await br.close();
console.log(`\n${lulus} lulus, ${gagal} gagal`);
if (gagal) process.exit(1);
