// Uji PENYIMPANAN Tera SMK di Chromium sungguhan — Tahap 2.6 (F4.12 no. 7 memori penuh, no. 8 update versi).
// Jalankan: npm run test:tera:penyimpanan   (butuh paket "playwright" & Chromium; tidak ikut build Vercel)
import { chromium, type Page } from 'playwright';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const akar = fileURLToPath(new URL('../../', import.meta.url));
const ASAL = 'http://localhost:9998';

async function bundel(versiBaru: boolean): Promise<string> {
  const h = await build({
    stdin: { contents: "import * as db from './src/tera/data/teraDb'; import { mulaiMesinKirim } from './src/tera/data/mesinKirim'; (window as any).tera = { ...db, mulaiMesinKirim };", resolveDir: akar, loader: 'ts' },
    bundle: true, format: 'esm', target: 'es2022', write: false, external: ['../../lib/apiClient'],
    plugins: versiBaru ? [{
      name: 'versi-baru',
      setup(b) {
        b.onLoad({ filter: /teraDb\.ts$/ }, async (a) => {
          const { readFile } = await import('node:fs/promises');
          let t = await readFile(a.path, 'utf8');
          t = t.replace('export const VERSI_DB = 1;', 'export const VERSI_DB = 2;')
               .replace("if (!db.objectStoreNames.contains('outbox'))", "if (!db.objectStoreNames.contains('laci_baru_v2')) db.createObjectStore('laci_baru_v2', { keyPath: 'id' });\n      if (!db.objectStoreNames.contains('outbox'))");
          return { contents: t, loader: 'ts' };
        });
      },
    }] : [],
  });
  return h.outputFiles[0].text;
}
const html = (js: string) => `<!doctype html><meta charset=utf-8><script>window.__name=(f)=>f</script><script type=module>${js}; window.siap = true;</script>`;
const V1 = html(await bundel(false));
const V2 = html(await bundel(true));

let lulus = 0, gagal = 0;
const cek = (n: string, ok: boolean, d = '') => { ok ? lulus++ : gagal++; console.log((ok ? 'LULUS ' : 'GAGAL ') + n + (ok ? '' : '  ' + d)); };

const br = await chromium.launch();
const ctx = await br.newContext();
let versi = V1;
await ctx.route(`${ASAL}/**`, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: versi }));
const buka = async (): Promise<Page> => { const p = await ctx.newPage(); p.on('pageerror', (e) => console.log('  [error]', e.message)); await p.goto(ASAL + '/'); await p.waitForFunction(() => (window as any).siap); return p; };
const U = 'u-uji';

// ---- no. 7: memori penuh ----
const a = await buka();
await a.evaluate(async (U) => {
  const t = (window as any).tera;
  for (const n of ['999.0001', '999.0002']) { const l = await t.buatLkk({ pemilik: U, bo: '999', noLabel: n, templateKode: 'UJI', templateVersi: 1 }); await t.tandaiSelesai(l.id); }
  await t.buatLkk({ pemilik: U, bo: '999', noLabel: '999.0003' }); // draft yang masih diisi
}, U);
const sebelum = await a.evaluate(async (U) => (await (window as any).tera.daftarLkk(U)).length, U);
// Memori penuh: setiap tulis ditolak seperti QuotaExceededError
await a.evaluate(() => {
  (window as any).__asli = { put: IDBObjectStore.prototype.put, add: IDBObjectStore.prototype.add };
  const penuh = function () { throw new DOMException('quota', 'QuotaExceededError'); } as any;
  IDBObjectStore.prototype.put = penuh;
  IDBObjectStore.prototype.add = penuh;
});
const pesan = await a.evaluate(async (U) => {
  try { await (window as any).tera.buatLkk({ pemilik: U, bo: '999' }); return 'TIDAK ERROR'; } catch (e: any) { return e.message; }
}, U);
cek('memori penuh: pesan jelas untuk teknisi', pesan.includes('Memori perangkat penuh') && pesan.includes('tetap aman'), pesan);
const pesan2 = await a.evaluate(async (U) => {
  const t = (window as any).tera; const x = (await t.daftarLkk(U)).find((l: any) => l.syncState === 'draft');
  try { await t.simpanIsian(x.id, { data: { a: 1 } }); return 'TIDAK ERROR'; } catch (e: any) { return e.message; }
}, U);
cek('memori penuh: auto-save juga berpesan jelas', pesan2.includes('Memori perangkat penuh'), pesan2);
const sesudah = await a.evaluate(async (U) => (await (window as any).tera.daftarLkk(U)).length, U);
cek('memori penuh: LKK yang sudah ada tetap utuh', sesudah === sebelum && sebelum === 3, `${sebelum}→${sesudah}`);
await a.evaluate(() => { IDBObjectStore.prototype.put = (window as any).__asli.put; IDBObjectStore.prototype.add = (window as any).__asli.add; });
const pulih = await a.evaluate(async (U) => { const l = await (window as any).tera.buatLkk({ pemilik: U, bo: '999' }); return !!l.id; }, U);
cek('memori lega lagi: penyimpanan berjalan normal', pulih);

// ---- no. 8: update versi saat ada 🟡 ----
// Tab lama (versi 1) masih terbuka; versi baru (DB v2 + laci baru) dibuka di tab lain.
const hijauSebelum = await a.evaluate(async (U) => (await (window as any).tera.ringkasan(U)), U);
cek('sebelum update: 2 LKK 🟡 + 2 draft di perangkat', hijauSebelum.tersimpan === 2 && hijauSebelum.draft === 2, JSON.stringify(hijauSebelum));
versi = V2;
const b = await buka();
const info = await b.evaluate(async (U) => {
  const t = (window as any).tera; const db = await t.bukaDb();
  const r = await t.ringkasan(U); const ob = await t.daftarOutbox();
  return { versiDb: db.version, laci: [...db.objectStoreNames], r, outbox: ob.length };
}, U);
cek('update: database naik ke versi 2 tanpa macet (tab lama menutup diri)', info.versiDb === 2 && info.laci.includes('laci_baru_v2'), JSON.stringify(info));
cek('update: semua LKK 🟡, draft, dan antrean kirim masih ada', info.r.tersimpan === 2 && info.r.draft === 2 && info.outbox === 2, JSON.stringify(info));
// Setelah update, kurir versi baru mengirim LKK lama sampai hijau
const hasil = await b.evaluate(async (U) => {
  const t = (window as any).tera;
  const kirim = async (_p: string, body: any, _o: any) => {
    const { segelLkk } = await import('data:text/javascript,export const segelLkk=null') .catch(() => ({} as any));
    return new Response(JSON.stringify({ hasil: 'diterima', checksum: body.checksum, jumlahTitik: body.jumlahTitik, clientVersion: body.paket.clientVersion, status: 'submitted' }), { status: 200 });
  };
  const m = t.mulaiMesinKirim({ pemilik: U, kirim, skalaWaktu: 0.01 });
  for (let i = 0; i < 80; i++) { await new Promise((r) => setTimeout(r, 100)); if ((await t.ringkasan(U)).diterima === 2) break; }
  const r = await t.ringkasan(U); m.berhenti(); return r;
}, U);
cek('update: LKK lama terkirim 🟢 oleh versi baru', hasil.diterima === 2 && hasil.belumHijau === 0, JSON.stringify(hasil));

console.log(`\nLulus ${lulus}, gagal ${gagal}`);
await br.close();
process.exit(gagal ? 1 : 0);
