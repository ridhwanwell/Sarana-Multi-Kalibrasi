// Uji JADWAL DI PERANGKAT Tera SMK di Chromium sungguhan — Tahap 3.4a (PRD F2.5).
// Jalankan: npm run test:tera:jadwal-lokal   (butuh paket "playwright" & Chromium; tidak ikut build Vercel)
import { chromium } from 'playwright';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const akar = fileURLToPath(new URL('../../', import.meta.url));
const ASAL = 'http://localhost:9997';

const h = await build({
  stdin: { contents: "import * as db from './src/tera/data/teraDb'; import * as jl from './src/tera/data/jadwalLokal'; (window as any).tera = { ...db, ...jl };", resolveDir: akar, loader: 'ts' },
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

const hasil = await p.evaluate(async () => {
const J = (id: string, extra: any = {}) => ({
  jadwalId: id, bo: '095', namaRs: 'RS ' + id, kota: 'Solo', tanggalMulai: '2026-10-20', tanggalSelesai: '2026-10-22',
  labelAwal: '095.0001', labelAkhir: '095.0010', cadanganAwal: '095.0011', cadanganAkhir: '095.0015',
  alatPo: [{ ref: 'A', nama: 'Tensimeter', jumlah: 6, urutAwal: 1, urutAkhir: 6 }, { ref: 'B', nama: 'Timbangan Bayi', jumlah: 4, urutAwal: 7, urutAkhir: 10 }],
  versi: 1, isTest: false, pushedAt: '2026-10-19T01:00:00Z', dicabut: false, ...extra,
});

  const t = (window as any).tera; const o: Record<string, any> = {};
  const U = 'u1', V = 'u2';

  // 1. simpan dua jadwal
  o.simpan1 = await t.simpanJadwalServer(U, [J('j1'), J('j2', { pushedAt: '2026-10-19T02:00:00Z' })]);
  o.aktif1 = (await t.daftarJadwalAktif(U)).map((x: any) => x.jadwalId);

  // 2. versi lebih lama / sama tidak menimpa
  o.lama = await t.simpanJadwalServer(U, [J('j1', { versi: 1, namaRs: 'RS LAMA' })]);
  o.namaSetelahLama = (await t.daftarJadwalAktif(U)).find((x: any) => x.jadwalId === 'j1').namaRs;

  // 3. versi baru menimpa
  o.baru = await t.simpanJadwalServer(U, [J('j1', { versi: 2, namaRs: 'RS BARU', alatPo: [{ ref: 'A', nama: 'Tensimeter', jumlah: 9, urutAwal: 1, urutAkhir: 9 }] })]);
  const j1 = (await t.daftarJadwalAktif(U)).find((x: any) => x.jadwalId === 'j1');
  o.j1baru = [j1.namaRs, j1.versi, j1.alatPo.length, j1.alatPo[0].jumlah];

  // 4. akun lain terpisah
  o.akunLain = (await t.daftarJadwalAktif(V)).length;
  await t.simpanJadwalServer(V, [J('j1', { namaRs: 'RS MILIK V' })]);
  o.namaU = (await t.daftarJadwalAktif(U)).find((x: any) => x.jadwalId === 'j1').namaRs;
  o.namaV = (await t.daftarJadwalAktif(V))[0].namaRs;

  // 5. data rusak dibuang, yang sah tetap tersimpan
  o.rusak = await t.simpanJadwalServer(U, [null, 5, { jadwalId: 'x' }, J('j3', { bo: '12' }), J('j4', { versi: 0 }), J('j5'), J('j6', { alatPo: [{ ref: 'Z' }, { ref: 'C', nama: 'Ok', jumlah: 2 }] })]);
  o.j6alat = (await t.daftarJadwalAktif(U)).find((x: any) => x.jadwalId === 'j6').alatPo.length;
  o.idAktif = (await t.daftarJadwalAktif(U)).map((x: any) => x.jadwalId).sort();

  // 6. LKK dibuat lalu jadwal dicabut: jadwal hilang dari daftar, LKK tetap
  const l1 = await t.buatLkk({ pemilik: U, bo: '095', noLabel: '095.0001', jadwalId: 'j1', poItemRef: 'A' });
  await t.simpanJadwalServer(U, [J('j1', { versi: 3, dicabut: true })]);
  o.setelahCabut = (await t.daftarJadwalAktif(U)).map((x: any) => x.jadwalId).includes('j1');
  o.lkkMasihAda = !!(await t.ambilLkk(l1.id));
  // push ulang setelah cabut (versi lebih tinggi) → aktif lagi
  await t.simpanJadwalServer(U, [J('j1', { versi: 4 })]);
  o.aktifLagi = (await t.daftarJadwalAktif(U)).map((x: any) => x.jadwalId).includes('j1');

  // 7. hitungan PO
  const lkk: any[] = [];
  const mk = async (no: string, ref: string | null, jid: string, tambahan = false) =>
    lkk.push(await t.buatLkk({ pemilik: U, bo: '095', noLabel: no, jadwalId: jid, poItemRef: ref, alatTambahan: tambahan }));
  await mk('095.0002', 'A', 'j1'); await mk('095.0003', 'A', 'j1'); await mk('095.0004', 'B', 'j1');
  await mk('095.0012', 'A', 'j1', true);           // alat tambahan: tidak masuk PO
  await mk('095.0020', 'A', 'j2');                  // jadwal lain
  await mk('095.0021', null, 'j1');                 // tanpa ref
  const semua = await t.daftarLkk(U);
  const jadwalJ1 = (await t.daftarJadwalAktif(U)).find((x: any) => x.jadwalId === 'j1');
  o.hitung = t.hitungAlatPo(jadwalJ1, semua).map((a: any) => [a.ref, a.jumlah, a.dikerjakan, a.sisa]);
  // dikerjakan melebihi PO → sisa 0, bukan negatif
  const kecil = { ...jadwalJ1, alatPo: [{ ref: 'A', nama: 'T', jumlah: 1, urutAwal: null, urutAkhir: null }] };
  o.sisaNol = t.hitungAlatPo(kecil, semua)[0].sisa;

  // 8. skala besar: 200 alat, nama sangat panjang
  const banyak = Array.from({ length: 200 }, (_, i) => ({ ref: 'R' + i, nama: 'Alat ' + 'panjang '.repeat(20) + i, jumlah: 3, urutAwal: null, urutAkhir: null }));
  await t.simpanJadwalServer(U, [J('jb', { namaRs: 'RS ' + 'Sangat Panjang '.repeat(15), alatPo: banyak })]);
  const jb = (await t.daftarJadwalAktif(U)).find((x: any) => x.jadwalId === 'jb');
  o.skala = [jb.alatPo.length, t.hitungAlatPo(jb, semua).length];
  o.tanpaAlat = (await t.simpanJadwalServer(U, [J('jk', { alatPo: [] })])) === 1;

  // 9. tarikJadwal
  const resp = (status: number, body: any) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  const sebelum = (await t.daftarJadwalAktif(U)).length;
  o.tOk = await t.tarikJadwal(U, async () => resp(200, { jadwal: [J('jt')] }));
  o.tOffline = await t.tarikJadwal(U, async () => { throw new TypeError('Failed to fetch'); });
  o.t403 = await t.tarikJadwal(U, async () => resp(403, { error: 'x' }));
  o.t503 = await t.tarikJadwal(U, async () => resp(503, { error: 'x' }));
  o.tAneh = await t.tarikJadwal(U, async () => resp(200, { aneh: true }));
  o.tTimeout = await t.tarikJadwal(U, (signal: AbortSignal) => new Promise((_, rej) => signal.addEventListener('abort', () => rej(Object.assign(new Error('a'), { name: 'AbortError' })))), 300);
  o.setelahGagal = (await t.daftarJadwalAktif(U)).length === sebelum + 1;
  return o;
});

cek('simpan 2 jadwal', hasil.simpan1 === 2 && hasil.aktif1.join() === 'j2,j1', JSON.stringify([hasil.simpan1, hasil.aktif1]));
cek('versi sama/lama tidak menimpa', hasil.lama === 0 && hasil.namaSetelahLama === 'RS j1', JSON.stringify([hasil.lama, hasil.namaSetelahLama]));
cek('versi lebih baru menimpa (nama, jumlah, daftar alat)', hasil.baru === 1 && hasil.j1baru.join() === 'RS BARU,2,1,9', hasil.j1baru.join());
cek('akun lain di tablet yang sama tidak saling menimpa', hasil.akunLain === 0 && hasil.namaU === 'RS BARU' && hasil.namaV === 'RS MILIK V', JSON.stringify([hasil.akunLain, hasil.namaU, hasil.namaV]));
cek('data rusak dibuang, yang sah tersimpan', hasil.rusak === 2 && hasil.idAktif.join() === 'j1,j2,j5,j6', JSON.stringify([hasil.rusak, hasil.idAktif]));
cek('alat rusak dibuang, alat sah tetap', hasil.j6alat === 1, String(hasil.j6alat));
cek('jadwal dicabut disembunyikan, LKK tetap ada', hasil.setelahCabut === false && hasil.lkkMasihAda === true, JSON.stringify([hasil.setelahCabut, hasil.lkkMasihAda]));
cek('push ulang sesudah cabut mengaktifkan lagi', hasil.aktifLagi === true);
cek('hitung PO: dikerjakan & sisa (tambahan/jadwal lain/tanpa ref tidak dihitung)', JSON.stringify(hasil.hitung) === JSON.stringify([['A', 6, 3, 3], ['B', 4, 1, 3]]), JSON.stringify(hasil.hitung));
cek('sisa tidak pernah negatif', hasil.sisaNol === 0, String(hasil.sisaNol));
cek('200 alat + nama RS sangat panjang tersimpan utuh', hasil.skala.join() === '200,200', hasil.skala.join());
cek('jadwal tanpa alat tersimpan (layar harus menangani kosong)', hasil.tanpaAlat === true);
cek('tarik jadwal berhasil', hasil.tOk.ok === true && hasil.tOk.berubah === 1, JSON.stringify(hasil.tOk));
cek('offline: gagal berpesan jelas, tidak melempar galat', hasil.tOffline.ok === false && /internet/i.test(hasil.tOffline.alasan), JSON.stringify(hasil.tOffline));
cek('403 / 503 / jawaban aneh: gagal berpesan', !hasil.t403.ok && !hasil.t503.ok && !hasil.tAneh.ok && /akses/i.test(hasil.t403.alasan) && /sibuk/i.test(hasil.t503.alasan), JSON.stringify([hasil.t403, hasil.t503, hasil.tAneh]));
cek('timeout: pesan "tidak merespons"', hasil.tTimeout.ok === false && /merespons/i.test(hasil.tTimeout.alasan), JSON.stringify(hasil.tTimeout));
cek('tarik yang gagal tidak mengubah jadwal di perangkat', hasil.setelahGagal === true);

await br.close();
console.log(`\n${lulus}/${lulus + gagal} lulus`);
process.exit(gagal ? 1 : 0);
