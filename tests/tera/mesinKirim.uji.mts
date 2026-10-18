// Uji MESIN KIRIM Tera SMK di Chromium sungguhan (IndexedDB + Web Crypto + Web Locks) — Tahap 2.3.
// Server tiruan memakai aturan yang sama dengan fungsi database tera_terima_lkk & segel yang sama.
// Jalankan: npm run test:tera:sinkron   (butuh paket "playwright" & Chromium; tidak ikut build Vercel)
import { chromium, type Page, type BrowserContext } from 'playwright';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { segelLkk, segelDraft } from '../../src/tera/shared/segel.ts';

const akar = fileURLToPath(new URL('../../', import.meta.url));
const hasilBuild = await build({
  stdin: {
    contents: "import * as db from './src/tera/data/teraDb'; import { mulaiMesinKirim } from './src/tera/data/mesinKirim'; (window as any).tera = { ...db, mulaiMesinKirim };",
    resolveDir: akar, loader: 'ts',
  },
  bundle: true, format: 'esm', target: 'es2022', write: false, external: ['../../lib/apiClient'],
});
const JS = hasilBuild.outputFiles[0].text;
const ASAL = 'http://localhost:9999';
const HTML = `<!doctype html><meta charset=utf-8><script>window.__name=(f)=>f</script><script type=module>${JS}; window.siap = true;</script>`;

// ---------- server tiruan: aturan sama dengan tera_terima_lkk ----------
const server = { lkk: new Map<string, any>(), draft: new Map<string, any>(), mode: 'normal' as 'normal' | 'mati' | '503' | 'lambat' | 'segel_palsu', diterimaTotal: 0, tolakLabel: 0 };
async function tangani(path: string, body: any) {
  if (path.endsWith('/api/tera/draft')) {
    const { checksum } = await segelDraft(body.paket);
    if (checksum !== body.checksum) return { status: 422, json: { hasil: 'ditolak' } };
    const lama = server.draft.get(body.paket.id);
    if (!lama || body.paket.clientVersion > lama.clientVersion) server.draft.set(body.paket.id, body.paket);
    return { status: 200, json: { hasil: 'dicadangkan' } };
  }
  const p = body.paket;
  const s = await segelLkk(p);
  if (s.checksum !== body.checksum || s.jumlahTitik !== body.jumlahTitik) return { status: 422, json: { hasil: 'ditolak_segel' } };
  const lama = server.lkk.get(p.id);
  const terima = () => ({ status: 200, json: { hasil: 'diterima', checksum: server.mode === 'segel_palsu' ? 'f'.repeat(64) : s.checksum, jumlahTitik: s.jumlahTitik, clientVersion: p.clientVersion, status: 'submitted' } });
  if (lama && lama.clientVersion === p.clientVersion && lama.checksum === s.checksum)
    return { status: 200, json: { hasil: 'sudah_diterima', checksum: server.mode === 'segel_palsu' ? 'f'.repeat(64) : s.checksum, jumlahTitik: s.jumlahTitik, clientVersion: p.clientVersion, status: lama.status } };
  if (lama && lama.status !== 'submitted' && lama.status !== 'returned') return { status: 409, json: { hasil: 'ditolak_terkunci', alasan: 'LKK sudah diperiksa Penyelia.' } };
  const ganda = [...server.lkk.values()].some((x) => x.noLabel === p.noLabel && x.id !== p.id);
  if (ganda) { server.tolakLabel++; return { status: 409, json: { hasil: 'ditolak_label_ganda', alasan: `Nomor stiker ${p.noLabel} sudah dipakai LKK lain.` } }; }
  server.lkk.set(p.id, { ...p, checksum: s.checksum, status: lama?.status ?? 'submitted' });
  server.diterimaTotal++;
  return terima();
}

async function perangkat(ctx: BrowserContext, nama: string): Promise<Page> {
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`  [${nama} error]`, e.message));
  return page;
}
async function pasangRute(ctx: BrowserContext) {
  await ctx.route(`${ASAL}/**`, async (route) => {
    const url = route.request().url();
    if (!url.includes('/api/')) return route.fulfill({ status: 200, contentType: 'text/html', body: HTML });
    if (server.mode === 'mati') return route.abort('internetdisconnected');
    if (server.mode === '503') return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"sibuk"}' });
    const body = JSON.parse(route.request().postData() || '{}');
    // simpan dulu, baru jawab (agar "jawaban hilang di jalan" bisa diuji)
    const h = await tangani(url, body);
    if (server.mode === 'lambat') await new Promise((r) => setTimeout(r, 1500));
    try { await route.fulfill({ status: h.status, contentType: 'application/json', body: JSON.stringify(h.json) }); } catch { /* halaman sudah ditutup */ }
  });
}
async function buka(page: Page, pemilik: string) {
  await page.goto(ASAL + '/tera/');
  await page.waitForFunction(() => (window as any).siap === true);
  await page.evaluate((pemilik) => {
    const t = (window as any).tera;
    (window as any).mesin = t.mulaiMesinKirim({
      pemilik, skalaWaktu: 0.01,
      kirim: (path: string, body: unknown, o: any) => fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: o.signal, keepalive: o.keepalive }),
    });
  }, pemilik);
}
const buatSelesai = (page: Page, pemilik: string, labels: string[]) => page.evaluate(async ({ pemilik, labels }) => {
  const t = (window as any).tera; const ids: string[] = [];
  for (const noLabel of labels) {
    const l = await t.buatLkk({ pemilik, bo: noLabel.slice(0, 3), noLabel, templateKode: 'UJI', templateVersi: 1, tanggalKalibrasi: '2026-10-19' });
    await t.simpanIsian(l.id, { data: { suhu: 24.5, titik_ukur: [{ s: 0, b: [0, 0] }, { s: 100, b: [100, 101] }] } });
    await t.tandaiSelesai(l.id); ids.push(l.id);
  }
  (window as any).mesin.dorong(); return ids;
}, { pemilik, labels });
const ringkas = (page: Page, pemilik: string) => page.evaluate((p) => (window as any).tera.ringkasan(p), pemilik);
async function tunggu(page: Page, pemilik: string, syarat: (r: any) => boolean, ms = 15000) {
  const akhir = Date.now() + ms; let r: any;
  while (Date.now() < akhir) { r = await ringkas(page, pemilik); if (syarat(r)) return r; await new Promise((x) => setTimeout(x, 150)); }
  return r;
}
let lulus = 0, gagal = 0;
const cek = (nama: string, ok: boolean, info = '') => { ok ? lulus++ : gagal++; console.log(`${ok ? '✅' : '❌'} ${nama}${info ? '  — ' + info : ''}`); };
const label = (n: number) => `999.${String(n).padStart(4, '0')}`;

const browser = await chromium.launch();
const U = 'teknisi-A';

// 1. Mode pesawat → 🟡 → sinyal kembali → 🟢
{
  const ctx = await browser.newContext(); await pasangRute(ctx); const p = await perangkat(ctx, 'HP-A');
  await buka(p, U);
  server.mode = 'mati';
  await buatSelesai(p, U, [1, 2, 3, 4, 5].map(label));
  let r = await tunggu(p, U, (r) => r.tersimpan === 5, 3000);
  cek('1a. sinyal mati: 5 LKK tetap 🟡 di perangkat', r.tersimpan === 5 && r.diterima === 0, JSON.stringify(r));
  server.mode = 'normal'; await p.evaluate(() => (window as any).mesin.dorong());
  r = await tunggu(p, U, (r) => r.diterima === 5);
  cek('1b. sinyal kembali: 5 LKK 🟢 otomatis tanpa tombol', r.diterima === 5 && r.belumHijau === 0, JSON.stringify(r));
  cek('1c. server menerima tepat 5 (0 dobel)', server.lkk.size === 5);

  // 2. Server sibuk (503) lalu pulih
  server.mode = '503';
  await buatSelesai(p, U, [6, 7].map(label));
  r = await tunggu(p, U, (r) => r.tersimpan === 2, 3000);
  cek('2a. server 503: tetap 🟡, tidak hilang', r.tersimpan === 2, JSON.stringify(r));
  server.mode = 'normal';
  r = await tunggu(p, U, (r) => r.diterima === 7);
  cek('2b. dicoba ulang otomatis (jeda bertahap) → 🟢', r.diterima === 7 && server.lkk.size === 7, JSON.stringify(r));

  // 3. Tanda terima palsu (segel tidak cocok) → TIDAK boleh hijau
  server.mode = 'segel_palsu';
  await buatSelesai(p, U, [label(8)]);
  r = await tunggu(p, U, (r) => r.tersimpan === 1, 3000);
  cek('3. tanda terima tidak cocok segel → tidak 🟢', r.diterima === 7 && r.belumHijau === 1, JSON.stringify(r));
  server.mode = 'normal';
  r = await tunggu(p, U, (r) => r.diterima === 8);
  cek('3b. setelah server benar → 🟢 (server tetap 8, 0 dobel)', r.diterima === 8 && server.lkk.size === 8, JSON.stringify(r));

  // 4. Auto-save & muat ulang: isian draft tetap ada
  const id = await p.evaluate(async (U) => { const t = (window as any).tera; const l = await t.buatLkk({ pemilik: U, bo: '999' }); await t.simpanIsian(l.id, { data: { catatan: 'setengah jalan', titik_ukur: [{ s: 1 }] } }); return l.id; }, U);
  await p.reload(); await p.waitForFunction(() => (window as any).siap === true);
  const isi = await p.evaluate((id) => (window as any).tera.ambilLkk(id), id);
  cek('4. muat ulang/tutup paksa: isian draft masih utuh', isi?.data?.catatan === 'setengah jalan');
  await buka(p, U);

  // 5. Cadangan draft ke server
  await p.evaluate(() => (window as any).mesin.cadangkanDraftSekarang());
  cek('5a. draft tercadang di server', server.draft.get(id)?.data?.catatan === 'setengah jalan');
  await p.evaluate(async (id) => { await (window as any).tera.simpanIsian(id, { data: { catatan: 'versi 2' } }); await (window as any).mesin.cadangkanDraftSekarang(); }, id);
  cek('5b. draft yang diubah → versi terbaru tercadang', server.draft.get(id)?.data?.catatan === 'versi 2');
  r = await ringkas(p, U);
  cek('5c. draft TIDAK ikut dikirim sebagai LKK', server.lkk.size === 8 && r.draft === 1, JSON.stringify(r));
  await ctx.close();
}

// 6. Tutup paksa di tengah kirim (server sudah menyimpan, jawaban hilang) → buka lagi → 🟢, 0 dobel
{
  const ctx = await browser.newContext(); await pasangRute(ctx);
  let p = await perangkat(ctx, 'HP-A2'); await buka(p, U);
  server.mode = 'lambat';
  await buatSelesai(p, U, [label(20)]);
  await tunggu(p, U, (r) => r.mengirim === 1, 3000);
  await p.close();                          // HP mati / aplikasi ditutup paksa saat 🔵
  server.mode = 'normal';
  p = await perangkat(ctx, 'HP-A2 (dibuka lagi)'); await buka(p, U);
  const r = await tunggu(p, U, (r) => r.diterima >= 1 && r.mengirim === 0 && r.tersimpan === 0);
  const jumlah20 = [...server.lkk.values()].filter((x) => x.noLabel === label(20)).length;
  cek('6. tutup paksa saat 🔵 → dibuka lagi → 🟢, server 1 (0 dobel)', r.diterima === 1 && jumlah20 === 1, JSON.stringify(r));
  await ctx.close();
}

// 7. 50 LKK sekaligus + sinyal putus-sambung
{
  const ctx = await browser.newContext(); await pasangRute(ctx); const p = await perangkat(ctx, 'HP-B'); const UB = 'teknisi-B';
  await buka(p, UB);
  const sebelum = server.lkk.size;
  const labels = Array.from({ length: 50 }, (_, i) => label(100 + i));
  const kerja = buatSelesai(p, UB, labels);
  for (let i = 0; i < 6; i++) { server.mode = i % 2 ? 'normal' : 'mati'; await new Promise((x) => setTimeout(x, 250)); }
  server.mode = 'normal'; await kerja;
  const r = await tunggu(p, UB, (r) => r.diterima === 50, 30000);
  cek('7. 50 LKK + sinyal putus-sambung → semua 🟢, server +50 (0 dobel, 0 hilang)', r.diterima === 50 && server.lkk.size - sebelum === 50, JSON.stringify(r));
  await ctx.close();
}

// 8. Nomor ganda dari dua tablet offline → satu 🟢, satu merah (data utuh) → perbaiki → 🟢
{
  const ctxA = await browser.newContext(); await pasangRute(ctxA); const a = await perangkat(ctxA, 'Tablet-A');
  const ctxB = await browser.newContext(); await pasangRute(ctxB); const b = await perangkat(ctxB, 'Tablet-B');
  await buka(a, 'T-A'); await buka(b, 'T-B');
  server.mode = 'mati';
  await buatSelesai(a, 'T-A', [label(500)]);
  const [idB] = await buatSelesai(b, 'T-B', [label(500)]);
  const [idA] = await a.evaluate(async () => (await (window as any).tera.daftarLkk('T-A')).map((l: any) => l.id));
  server.mode = 'normal';
  await a.evaluate(() => (window as any).mesin.dorong()); await b.evaluate(() => (window as any).mesin.dorong());
  const ra = await tunggu(a, 'T-A', (r) => r.diterima + r.ditolak === 1);
  const rb0 = await tunggu(b, 'T-B', (r) => r.diterima + r.ditolak === 1);
  const kalah = ra.ditolak === 1 ? { p: a, u: 'T-A', id: idA } : { p: b, u: 'T-B', id: idB };
  const lk = await kalah.p.evaluate((id) => (window as any).tera.ambilLkk(id), kalah.id);
  cek('8a. dua tablet, nomor sama: tepat satu 🟢 & satu merah, isian yang kalah utuh',
    ra.diterima + rb0.diterima === 1 && ra.ditolak + rb0.ditolak === 1 && lk.data?.suhu === 24.5, lk.alasanDitolak);
  const tolakSebelum = server.tolakLabel;
  await new Promise((x) => setTimeout(x, 1500));
  cek('8b. LKK yang ditolak TIDAK dikirim ulang terus-menerus', server.tolakLabel === tolakSebelum);
  await kalah.p.evaluate(async (id) => { const t = (window as any).tera; await t.simpanIsian(id, { noLabel: '999.0501' }); await t.tandaiSelesai(id); (window as any).mesin.dorong(); }, kalah.id);
  const rk = await tunggu(kalah.p, kalah.u, (r) => r.diterima === 1);
  cek('8c. nomor diperbaiki → 🟢; server punya 999.0500 & 999.0501 (0 dobel)', rk.diterima === 1 && rk.ditolak === 0
    && [...server.lkk.values()].filter((x) => x.noLabel === label(500) || x.noLabel === '999.0501').length === 2, JSON.stringify(rk));
  await ctxA.close(); await ctxB.close();
}

// 9. Data dua akun di satu perangkat tidak tercampur; LKK terkirim tidak bisa diubah
{
  const ctx = await browser.newContext(); await pasangRute(ctx); const p = await perangkat(ctx, 'HP-C'); await buka(p, 'X');
  const hasil = await p.evaluate(async () => {
    const t = (window as any).tera;
    await t.buatLkk({ pemilik: 'X', bo: '999' }); await t.buatLkk({ pemilik: 'Y', bo: '999' });
    const x = await t.daftarLkk('X'); const y = await t.daftarLkk('Y');
    const l = await t.buatLkk({ pemilik: 'X', bo: '999', noLabel: '999.0900', templateKode: 'UJI', templateVersi: 1 });
    await t.tandaiSelesai(l.id);
    let ditolakUbah = false; try { await t.simpanIsian(l.id, { data: { a: 1 } }); } catch { ditolakUbah = true; }
    let kurang = ''; const k = await t.buatLkk({ pemilik: 'X' }); try { await t.tandaiSelesai(k.id); } catch (e: any) { kurang = e.message; }
    return { x: x.length, y: y.length, ditolakUbah, kurang };
  });
  cek('9a. data akun X dan Y terpisah', hasil.x === 1 && hasil.y === 1);
  cek('9b. LKK yang sudah dikirim tidak bisa diubah teknisi', hasil.ditolakUbah);
  cek('9c. "Selesai" ditolak bila data wajib kurang (dengan daftar kekurangan)', hasil.kurang.startsWith('Belum lengkap'), hasil.kurang);
  await ctx.close();
}

await browser.close();
console.log(`\nLulus ${lulus}, gagal ${gagal}`); process.exit(gagal ? 1 : 0);
