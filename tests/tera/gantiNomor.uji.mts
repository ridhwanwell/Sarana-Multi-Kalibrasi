// Uji GANTI NOMOR STIKER pada LKK yang ditolak server (Tahap 4.6a-3, CLAUDE.md 5.12).
// Jalankan: npm run test:tera:ganti-nomor   (butuh "playwright" & Chromium)
import { chromium } from 'playwright';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const akar = fileURLToPath(new URL('../../', import.meta.url));
const ASAL = 'http://localhost:9997';
const h = await build({
  stdin: { contents: "import * as db from './src/tera/data/teraDb'; (window as any).tera = db;", resolveDir: akar, loader: 'ts' },
  bundle: true, format: 'esm', target: 'es2022', write: false,
});
const html = `<!doctype html><meta charset=utf-8><script>window.__name=(f)=>f</script><script type=module>${h.outputFiles[0].text}; window.siap = true;</script>`;

let lulus = 0, gagal = 0;
const cek = (n: string, ok: boolean, d = '') => { ok ? lulus++ : gagal++; console.log((ok ? 'LULUS ' : 'GAGAL ') + n + (ok ? '' : '  ' + d)); };

const br = await chromium.launch();
const ctx = await br.newContext();
await ctx.route(`${ASAL}/**`, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: html }));
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('  [error]', e.message));
await p.goto(ASAL + '/');
await p.waitForFunction(() => (window as any).siap);

const hasil = await p.evaluate(async () => {
  const t = (window as any).tera;
  const U = 'u-ganti';
  const l = await t.buatLkk({ pemilik: U, bo: '999', noLabel: '999.0005', templateKode: 'UJI', templateVersi: 1, data: { identitas: { merek: 'ABN' } } });
  // server menolak (nomor ganda): LKK ditandai ditolak, antrean berhenti
  await t.ubahStatusKirim(l.id, 0, () => ({ lkk: { syncState: 'ditolak', alasanDitolak: 'Nomor label sudah dipakai LKK lain' }, outbox: 'hapus' }));
  const sebelum = await t.ambilLkk(l.id);
  const bolehSebelum = t.bolehDiubah(sebelum);
  await t.simpanIsian(l.id, { noLabel: '999.0009' });
  const sesudah = await t.ambilLkk(l.id);
  // LKK yang sudah hijau tetap tidak boleh diubah nomornya
  await t.ubahStatusKirim(l.id, 0, () => ({ lkk: { syncState: 'diterima', statusServer: 'submitted' } }));
  let ditolakSaatHijau = false;
  try { await t.simpanIsian(l.id, { noLabel: '999.0010' }); } catch { ditolakSaatHijau = true; }
  const akhir = await t.ambilLkk(l.id);
  return { bolehSebelum, sesudah, ditolakSaatHijau, akhirLabel: akhir.noLabel };
});

cek('LKK ditolak boleh diubah teknisi', hasil.bolehSebelum === true);
cek('nomor stiker berganti ke 999.0009', hasil.sesudah.noLabel === '999.0009', String(hasil.sesudah.noLabel));
cek('LKK kembali menjadi draft & alasan tolak dibersihkan', hasil.sesudah.syncState === 'draft' && hasil.sesudah.alasanDitolak === null);
cek('isian LKK tidak hilang saat nomor diganti', hasil.sesudah.data?.identitas?.merek === 'ABN');
cek('LKK hijau (diterima) tidak bisa ganti nomor', hasil.ditolakSaatHijau === true && hasil.akhirLabel === '999.0009');

await br.close();
console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
