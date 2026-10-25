// Uji LAYAR "Mulai LKK" (nomor stiker) di Chromium sungguhan — Tahap 4.3b (PRD F3.1–F3.4).
// Router/ikon/login/apiFetch/pemindai kamera ditiru (stub); SinkronProvider, HalamanJadwal, MulaiLkk, teraDb,
// masterLokal, nomorLabel, labelParser dan tera-tema.css adalah kode ASLI.
// Jalankan: npm run test:tera:mulai-lkk   (butuh paket "playwright" & Chromium; tidak ikut build Vercel)
import { chromium, type Page } from 'playwright';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { readFile, mkdir } from 'node:fs/promises';

const akar = fileURLToPath(new URL('../../', import.meta.url));
const ASAL = 'http://localhost:9995';
const keluar = process.env.TERA_FOTO_DIR || '';

const ikon = ['FileDown','AlertCircle','Building2','Camera','Check','ChevronLeft','ChevronRight','Circle','ClipboardCheck','Clock','Download','Eye','EyeOff','FlaskConical','Info','Keyboard','LayoutDashboard','Loader2','Lock','LogOut','Pencil','Plus','RefreshCw','Smartphone','Tag','Upload','User','WifiOff','X'];
const stubIkon = ikon.map((n) => `export const ${n} = (p) => React.createElement('svg', { 'data-ikon': '${n}', width: p.size || 24, height: p.size || 24, className: p.className, 'aria-hidden': 'true', viewBox: '0 0 24 24' }, React.createElement('circle', { cx: 12, cy: 12, r: 8 }));`).join('\n');
const stubRouter = `
import React from 'react';
export const Link = ({ to, children, ...r }) => React.createElement('a', { href: to, ...r }, children);
export const NavLink = Link;
export const Outlet = () => null;
export const useLocation = () => ({ pathname: '/tera/' });
export const useParams = () => (window.__params || {});
export const useNavigate = () => (to) => { window.__navigasi = to; };
`;
const stubAuth = `export const useAuth = () => ({ user: window.__user, isOnline: true, logout: async () => {} });`;
const stubApi = `export const apiFetch = (u, o) => window.__api(u, o);`;
// Pemindai tiruan: window.__scan(teks) = "kamera membaca QR"; window.__kameraTolak = izin kamera ditolak
const stubQr = `
export const Html5QrcodeSupportedFormats = { QR_CODE: 0 };
export class Html5Qrcode {
  constructor(id) { this.id = id; window.__pemindaiAktif = (window.__pemindaiAktif || 0) + 1; }
  async start(_k, _o, saatBaca) {
    if (window.__kameraTolak) { const e = new Error('Permission denied'); e.name = 'NotAllowedError'; throw e; }
    document.getElementById(this.id).innerHTML = '<video></video>';
    window.__scan = (t) => saatBaca(t);
  }
  async stop() { window.__pemindaiAktif--; window.__scan = null; }
  clear() {}
}`;

const plugin = {
  name: 'stub',
  setup(b: any) {
    b.onResolve({ filter: /^lucide-react$/ }, () => ({ path: 'lucide', namespace: 'stub' }));
    b.onResolve({ filter: /^react-router-dom$/ }, () => ({ path: 'router', namespace: 'stub' }));
    b.onResolve({ filter: /^html5-qrcode$/ }, () => ({ path: 'qr', namespace: 'stub' }));
    b.onResolve({ filter: /lib\/AuthContext$/ }, () => ({ path: 'auth', namespace: 'stub' }));
    b.onResolve({ filter: /lib\/apiClient$/ }, () => ({ path: 'api', namespace: 'stub' }));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, (a: any) => ({
      contents: a.path === 'lucide' ? `import React from 'react';\n${stubIkon}` : a.path === 'router' ? stubRouter : a.path === 'auth' ? stubAuth : a.path === 'qr' ? stubQr : stubApi,
      loader: 'js', resolveDir: akar,
    }));
  },
};
const masuk = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import * as db from './src/tera/data/teraDb';
import { SinkronProvider } from './src/tera/SinkronKonteks';
import { HalamanDetailRs } from './src/tera/HalamanJadwal';
window.tera = db;
let akarReact = null;
window.pasang = () => {
  if (akarReact) akarReact.unmount();
  document.getElementById('app').innerHTML = '';
  akarReact = createRoot(document.getElementById('app'));
  akarReact.render(React.createElement(SinkronProvider, null, React.createElement('main', { className: 't-main', style: { padding: 16 } }, React.createElement(HalamanDetailRs))));
};
window.siap = true;
`;
const h = await build({
  stdin: { contents: masuk, resolveDir: akar, loader: 'tsx' },
  bundle: true, format: 'iife', target: 'es2022', write: false, jsx: 'automatic',
  nodePaths: ['/opt/npm-tools/node_modules'], plugins: [plugin],
  define: { 'process.env.NODE_ENV': '"development"' },
});
const css = await readFile(akar + 'src/tera/tera-tema.css', 'utf8');
const util = `button,input{border:0;background:transparent;color:inherit;margin:0;font:inherit}button{cursor:pointer}.mt-1{margin-top:4px}.mt-2{margin-top:8px}.mt-3{margin-top:12px}.mt-4{margin-top:16px}.mt-6{margin-top:24px}.mt-0\\.5{margin-top:2px}.flex{display:flex}.items-center{align-items:center}.gap-2{gap:8px}.shrink-0{flex-shrink:0}.min-w-0{min-width:0}.truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.text-\\[15px\\]{font-size:15px}.font-semibold{font-weight:600}ul,ol,dl,dd,p,h1,h2{margin:0;padding:0;list-style:none}*,::before,::after{box-sizing:border-box}a{color:inherit}button{font-family:inherit}svg{display:inline-block;fill:none;stroke:currentColor;stroke-width:2}body{margin:0;font-family:Inter,system-ui,sans-serif;background:var(--t-bg);color:var(--t-text)}`;
const HTML = `<!doctype html><html class="tera-aktif"><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><style>${css}\n${util}</style><body><div id=app class="tera-root"></div><script>window.__name=(f)=>f</script><script>${h.outputFiles[0].text}</script>`;

let lulus = 0, gagal = 0;
const cek = (n: string, ok: boolean, d = '') => { ok ? lulus++ : gagal++; console.log((ok ? 'LULUS ' : 'GAGAL ') + n + (ok ? '' : '  ' + d)); };
if (keluar) await mkdir(keluar, { recursive: true });

const br = await chromium.launch();
const NAMA_RS = 'Rumah Sakit Umum Daerah Dr. Soetomo Kabupaten Sangat Panjang Sekali Namanya Tidak Muat Satu Baris Di Layar Kecil';
const J = (extra: any = {}) => ({
  jadwalId: 'j1', bo: '095', namaRs: 'RS Uji Solo', kota: 'Solo', tanggalMulai: '2026-10-20', tanggalSelesai: '2026-10-22',
  labelAwal: '095.0001', labelAkhir: '095.0010', cadanganAwal: '095.0011', cadanganAkhir: '095.0015',
  alatPo: [{ ref: 'A', nama: 'Sphygmomanometer', jumlah: 6, urutAwal: 1, urutAkhir: 6 }, { ref: 'B', nama: 'Timbangan Bayi Digital', jumlah: 4, urutAwal: 7, urutAkhir: 10 }],
  versi: 1, isTest: false, pushedAt: '2026-10-19T01:00:00Z', dicabut: false, ...extra,
});

async function halaman(lebar: number, tinggi: number, jadwal: any, gelap = false): Promise<Page> {
  const ctx = await br.newContext({ viewport: { width: lebar, height: tinggi }, colorScheme: gelap ? 'dark' : 'light' });
  await ctx.route(`${ASAL}/**`, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: HTML }));
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('  [error]', e.message));
  await p.goto(ASAL + '/');
  await p.waitForFunction(() => (window as any).siap);
  await p.evaluate((jd) => {
    (window as any).__user = { id: 'u-t', fullName: 'Teknisi Uji', role: 'teknisi' };
    (window as any).__params = { id: 'j1' };
    (window as any).__api = async (u: string) => u.startsWith('/api/tera/jadwal')
      ? new Response(JSON.stringify({ jadwal: [jd] }), { status: 200, headers: { 'content-type': 'application/json' } })
      : new Response('{}', { status: 503 });
    (window as any).pasang();
  }, jadwal);
  await p.waitForFunction(() => /Alat PO/.test(document.body.innerText) && /Sphygmomanometer/.test(document.body.innerText), null, { timeout: 8000 });
  return p;
}
const geser = (p: Page) => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
const teksSheet = (p: Page) => p.evaluate(() => (document.querySelector('.t-lembar') as HTMLElement | null)?.innerText || '');
const adaSheet = (p: Page) => p.evaluate(() => !!document.querySelector('.t-lembar'));
const semuaLkk = (p: Page) => p.evaluate(async () => (await (window as any).tera.daftarLkk('u-t')) as any[]);
const tunggu = async (p: Page, fn: () => boolean, ms = 6000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await p.evaluate(fn)) return true; await p.waitForTimeout(80); }
  return false;
};
const bukaMulai = async (p: Page, urut = 0) => { await p.getByRole('button', { name: /Mulai LKK/ }).nth(urut).click(); await p.waitForSelector('.t-lembar'); };
const ketik = async (p: Page, isi: string) => {
  await p.fill('#t-empat-angka', isi);
  await p.getByRole('button', { name: /Periksa nomor/ }).click();
  // pemeriksaan membaca penyimpanan perangkat (asinkron): tunggu hasilnya — konfirmasi atau pesan galat
  await p.waitForFunction(() => !!document.querySelector('.t-konfirmasi') || !!document.querySelector('#t-galat-nomor .t-pesan-error'), null, { timeout: 5000 });
};
const hariIni = () => { const d = new Date(), z = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; };

// ---------- 1. Detail RS: tombol per alat ----------
let p = await halaman(390, 800, J());
let teks = await p.evaluate(() => document.body.innerText);
cek('2 jenis alat PO, tiap alat punya satu tombol "Mulai LKK"', await p.getByRole('button', { name: /Mulai LKK/ }).count() === 2);
cek('tombol "Mulai LKK" ≥ 48 px tinggi', await p.evaluate(() => [...document.querySelectorAll('.t-alat-aksi button')].every((b) => b.getBoundingClientRect().height >= 48)));

// ---------- 2. alat tanpa template ----------
await bukaMulai(p, 1).catch(() => {});
cek('alat tanpa template (Timbangan Bayi Digital) → tidak membuka lembar, pesan jelas', !(await adaSheet(p)) && /Template untuk alat ini belum tersedia/.test(await p.evaluate(() => document.body.innerText)));

// ---------- 3. alur ketik manual ----------
await p.getByRole('button', { name: /Mulai LKK/ }).first().click();
await p.waitForSelector('.t-lembar');
teks = await teksSheet(p);
cek('lembar: judul, nama alat, BO, nama RS', /Nomor stiker alat/.test(teks) && /Sphygmomanometer/.test(teks) && /BO 095/.test(teks) && /RS Uji Solo/.test(teks), teks.slice(0, 300));
cek('lembar: rentang utama & cadangan terlihat', /095\.0001 – 095\.0010/.test(teks) && /cadangan 095\.0011 – 095\.0015/.test(teks), teks);
cek('lembar: tombol "Scan stiker" utama & kolom ketik manual (BO terisi 095.)', /Scan stiker/.test(teks) && /095\./.test(teks) && await p.locator('#t-empat-angka').count() === 1);
cek('aksesibilitas: role dialog, aria-modal, judul berlabel, fokus di judul', await p.evaluate(() => { const d = document.querySelector('.t-lembar')!; return d.getAttribute('role') === 'dialog' && d.getAttribute('aria-modal') === 'true' && !!document.getElementById(d.getAttribute('aria-labelledby')!) && document.activeElement?.id === 'judul-mulai-lkk'; }));
cek('tanpa geser samping (390 px)', !(await geser(p)));
await ketik(p, '12');
teks = await teksSheet(p);
cek('ketikan salah → pesan di bawah kotak, kotak bertanda galat', /Ketik 4 angka/.test(teks) && await p.evaluate(() => document.querySelector('.t-kotak')!.getAttribute('data-error') === 'true'));
await p.fill('#t-empat-angka', '0099');
cek('mengetik lagi → pesan galat hilang', !/Ketik 4 angka/.test(await teksSheet(p)));
await p.getByRole('button', { name: /Periksa nomor/ }).click();
await p.waitForSelector('#t-galat-nomor .t-pesan-error');
cek('di luar rentang → pesan menyebut rentang', /di luar rentang stiker jadwal ini/.test(await teksSheet(p)));
await ketik(p, '200.0001');
cek('BO lain (ketik lengkap) → "milik BO 200"', /milik BO 200, bukan BO 095/.test(await teksSheet(p)));
await ketik(p, '0001');
await p.waitForSelector('.t-konfirmasi');
teks = await teksSheet(p);
cek('konfirmasi: nomor besar + pertanyaan "sudah sesuai dengan stiker di alat?"', /095\.0001/.test(teks) && /Nomor stiker 095\.0001 — sudah sesuai dengan stiker di alat\?/.test(teks), teks);
cek('konfirmasi: nomor besar (≥ 32 px) & angka tabular', await p.evaluate(() => { const e = document.querySelector('.t-konfirmasi-nomor') as HTMLElement; const c = getComputedStyle(e); return parseFloat(c.fontSize) >= 32 && c.fontVariantNumeric.includes('tabular'); }));
cek('belum ada LKK dibuat sebelum dikonfirmasi', (await semuaLkk(p)).length === 0);
await p.getByRole('button', { name: /Ubah nomor/ }).click();
cek('"Ubah nomor" kembali ke langkah nomor tanpa membuat LKK', /Nomor stiker alat/.test(await teksSheet(p)) && (await semuaLkk(p)).length === 0);
await ketik(p, '0001');
await p.waitForSelector('.t-konfirmasi');
await p.getByRole('button', { name: /Ya, sesuai/ }).dblclick();      // ketuk dobel tidak boleh membuat dua LKK
await tunggu(p, () => !document.querySelector('.t-lembar'));
let lkk = await semuaLkk(p);
cek('ketuk dobel → tetap 1 LKK', lkk.length === 1, String(lkk.length));
const a = lkk[0] || {};
cek('LKK terbentuk: nomor, BO, template & versi, tanggal hari ini, draft', a.noLabel === '095.0001' && a.bo === '095' && a.templateKode === 'sphygmomanometer' && a.templateVersi === 3 && a.tanggalKalibrasi === hariIni() && a.syncState === 'draft', JSON.stringify(a));
cek('LKK PO: bukan alat tambahan, terkait item PO "A" dan jadwal j1, bukan data uji', a.alatTambahan === false && a.poItemRef === 'A' && a.jadwalId === 'j1' && a.isTest === false);
cek('lembar tertutup lalu langsung pindah ke layar isi LKK (/tera/lkk/<id>)', !(await adaSheet(p)) && (await p.evaluate(() => (window as any).__navigasi)) === `/tera/lkk/${encodeURIComponent(a.id)}`, String(await p.evaluate(() => (window as any).__navigasi)));
cek('baris LKK di Detail RS menjadi tautan ke layar isi LKK', await tunggu(p, () => !!document.querySelector('a.t-lkk-baris[href^="/tera/lkk/"]')));
cek('angka Detail RS naik: dikerjakan 1, sisa 5 (≤ 6 detik)', await tunggu(p, () => /PO 6 · dikerjakan 1 · sisa 5/.test(document.body.innerText)));

// ---------- 4. nomor sudah dipakai ----------
await bukaMulai(p, 0);
await ketik(p, '0001');
cek('nomor yang sudah jadi LKK → ditolak', /sudah dipakai LKK lain di perangkat ini/.test(await teksSheet(p)));
await p.keyboard.press('Escape');
cek('Esc menutup lembar tanpa membuat LKK', !(await adaSheet(p)) && (await semuaLkk(p)).length === 1);

// ---------- 5. alur scan ----------
await bukaMulai(p, 0);
await p.getByRole('button', { name: /Scan stiker/ }).click();
await p.waitForFunction(() => !!(window as any).__scan);
cek('scan: tampilan kamera + tombol "Ketik manual" selalu terlihat', /Scan stiker/.test(await teksSheet(p)) && await p.getByRole('button', { name: /Ketik manual/ }).isVisible());
await p.evaluate(() => (window as any).__scan('https://contoh.com/halaman-biasa'));
const adaSaran = await tunggu(p, () => /bukan stiker kalibrasi/.test(document.querySelector('.t-lembar')?.textContent || ''));
const kameraMasihJalan = (await p.evaluate(() => typeof (window as any).__scan)) === 'function';
cek('QR bukan stiker → saran, kamera tetap jalan', adaSaran && kameraMasihJalan, `saran=${adaSaran} kamera=${kameraMasihJalan} :: ${(await teksSheet(p)).slice(0, 200)}`);
await p.evaluate(() => (window as any).__scan('https://saranamultikalibrasi.com/sertifikat/200.0012'));
await tunggu(p, () => /milik BO 200/.test(document.querySelector('.t-lembar')?.textContent || ''));
cek('scan stiker BO lain → kembali ke langkah nomor dengan pesan jelas; kamera berhenti', /milik BO 200, bukan BO 095/.test(await teksSheet(p)) && await tunggu(p, () => (window as any).__pemindaiAktif === 0));
await p.getByRole('button', { name: /Scan stiker/ }).click();
await p.waitForFunction(() => !!(window as any).__scan);
await p.evaluate(() => (window as any).__scan('https://saranamultikalibrasi.com/sertifikat/095.0002'));
await p.waitForSelector('.t-konfirmasi');
cek('scan stiker benar (dari alamat QR) → konfirmasi 095.0002; kamera berhenti', /095\.0002/.test(await teksSheet(p)) && await tunggu(p, () => (window as any).__pemindaiAktif === 0));
await p.getByRole('button', { name: /Ya, sesuai/ }).click();
await tunggu(p, () => !document.querySelector('.t-lembar'));
lkk = await semuaLkk(p);
cek('LKK kedua dari scan tersimpan (2 LKK)', lkk.length === 2 && lkk.some((l: any) => l.noLabel === '095.0002'));

// ---------- 6. izin kamera ditolak ----------
await p.evaluate(() => { (window as any).__kameraTolak = true; });
await bukaMulai(p, 0);
await p.getByRole('button', { name: /Scan stiker/ }).click();
await tunggu(p, () => /Izin kamera ditolak/.test(document.querySelector('.t-lembar')?.textContent || ''));
cek('izin kamera ditolak → pesan jelas, tombol Ketik manual tetap ada', /Izin kamera ditolak/.test(await teksSheet(p)) && await p.getByRole('button', { name: /Ketik manual/ }).isVisible());
await p.getByRole('button', { name: /Ketik manual/ }).click();
await ketik(p, '0003');
await p.waitForSelector('.t-konfirmasi');
cek('dari kamera yang ditolak → ketik manual tetap bisa lanjut', /095\.0003/.test(await teksSheet(p)));
await p.getByRole('button', { name: /^Tutup$/ }).click();
cek('tombol Tutup menutup tanpa membuat LKK', !(await adaSheet(p)) && (await semuaLkk(p)).length === 2);
await p.evaluate(() => { (window as any).__kameraTolak = false; });

// ---------- 7. alat tambahan ----------
await p.getByRole('button', { name: /Alat tambahan/ }).click();
await p.waitForSelector('.t-lembar');
teks = await teksSheet(p);
cek('alat tambahan: pilih jenis alat dulu (daftar template)', /Pilih jenis alat tambahan/.test(teks) && /Sphygmomanometer/.test(teks) && /Non-KAN/.test(teks), teks);
await p.locator('.t-pilihan-isi').first().click();
teks = await teksSheet(p);
cek('alat tambahan: langkah nomor, rentang hanya stiker cadangan', /Nomor stiker alat/.test(teks) && /alat tambahan/.test(teks) && /Stiker cadangan 095\.0011 – 095\.0015/.test(teks) && !/Utama/.test(teks), teks);
await ketik(p, '0004');
cek('alat tambahan: stiker utama ditolak, menyebut cadangan', /harus memakai stiker cadangan \(095\.0011 – 095\.0015\)/.test(await teksSheet(p)));
await ketik(p, '0012');
await p.waitForSelector('.t-konfirmasi');
cek('alat tambahan: konfirmasi menampilkan chip "Stiker cadangan"', /Stiker cadangan/.test(await p.evaluate(() => document.querySelector('.t-konfirmasi')!.textContent || '')));
await p.getByRole('button', { name: /Ya, sesuai/ }).click();
await tunggu(p, () => !document.querySelector('.t-lembar'));
lkk = await semuaLkk(p);
const t = lkk.find((l: any) => l.noLabel === '095.0012') || {};
cek('LKK tambahan: alatTambahan = true, tanpa item PO, template benar', t.alatTambahan === true && t.poItemRef === null && t.templateKode === 'sphygmomanometer' && t.jadwalId === 'j1', JSON.stringify(t));
cek('alat tambahan tidak mengurangi jatah PO (dikerjakan tetap 2, sisa 4)', await tunggu(p, () => /PO 6 · dikerjakan 2 · sisa 4/.test(document.body.innerText)));
if (keluar) await p.screenshot({ path: `${keluar}/detail-390-sesudah.png`, fullPage: true });
await p.context().close();

// ---------- 8. jadwal tanpa cadangan ----------
p = await halaman(390, 800, J({ cadanganAwal: null, cadanganAkhir: null }));
await p.getByRole('button', { name: /Alat tambahan/ }).click();
cek('tanpa stiker cadangan: tidak membuka lembar, pesan jelas', !(await adaSheet(p)) && /tidak punya stiker cadangan/.test(await p.evaluate(() => document.body.innerText)));
await p.context().close();

// ---------- 9. data terburuk: nama RS & alat sangat panjang, huruf besar; HP kecil, tablet, gelap ----------
const NAMA_ALAT = 'Sphygmomanometer';
for (const [lebar, tinggi, gelap, nama] of [[320, 640, false, '320'], [390, 800, true, '390-gelap'], [820, 1180, false, 'tablet-portrait'], [1180, 820, false, 'tablet-landscape']] as const) {
  p = await halaman(lebar, tinggi, J({ namaRs: NAMA_RS }), gelap);
  await bukaMulai(p, 0);
  const ok1 = !(await geser(p)) && await p.evaluate(() => { const l = document.querySelector('.t-lembar') as HTMLElement; return l.scrollWidth <= l.clientWidth + 1; });
  const tombolOk = await p.evaluate(() => [...document.querySelectorAll('.t-lembar button')].every((b) => { const r = b.getBoundingClientRect(); return r.height >= 47.5 && r.width >= 47.5; }));
  cek(`${nama}: lembar tanpa geser samping, semua tombol ≥ 48 px (nama RS 100+ huruf)`, ok1 && tombolOk, `${ok1} ${tombolOk}`);
  await p.waitForTimeout(350);   // animasi naik selesai
  const dalamLayar = await p.evaluate(() => { const r = document.querySelector('.t-lembar')!.getBoundingClientRect(); return r.left >= -0.5 && r.right <= window.innerWidth + 0.5 && r.bottom <= window.innerHeight + 0.5; });
  cek(`${nama}: lembar utuh di dalam layar`, dalamLayar);
  if (keluar) await p.screenshot({ path: `${keluar}/lembar-${nama}.png` });
  await ketik(p, '0005');
  await p.waitForSelector('.t-konfirmasi');
  const ok2 = !(await geser(p)) && await p.evaluate(() => { const l = document.querySelector('.t-lembar') as HTMLElement; return l.scrollWidth <= l.clientWidth + 1; });
  cek(`${nama}: langkah konfirmasi juga tanpa geser samping`, ok2);
  if (keluar) await p.screenshot({ path: `${keluar}/konfirmasi-${nama}.png` });
  await p.context().close();
}

// ---------- 10. huruf diperbesar 200 % ----------
p = await halaman(360, 740, J({ namaRs: NAMA_RS }));
await p.addStyleTag({ content: 'html{font-size:200% !important} .t-lembar{font-size:200%}' });
await bukaMulai(p, 0);
cek('huruf 200 %: lembar dapat digulir, tanpa geser samping', !(await geser(p)));
await p.context().close();

await br.close();
console.log(`\n${lulus} lulus, ${gagal} gagal`);
if (gagal) process.exit(1);
void NAMA_ALAT;
