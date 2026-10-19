// Uji LAYAR Beranda & Detail RS Tera SMK di Chromium sungguhan — Tahap 3.4b.
// Router/ikon/login/apiFetch ditiru (stub) agar tidak perlu paket tambahan; SinkronProvider, HalamanJadwal,
// TeraKerangka, jadwalLokal, teraDb dan tera-tema.css adalah kode ASLI.
// Jalankan: npm run test:tera:jadwal-layar   (butuh paket "playwright" & Chromium; tidak ikut build Vercel)
import { chromium, type Page } from 'playwright';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { readFile, mkdir } from 'node:fs/promises';

const akar = fileURLToPath(new URL('../../', import.meta.url));
const ASAL = 'http://localhost:9996';
const keluar = process.env.TERA_FOTO_DIR || '';

const ikon = ['AlertCircle','Building2','Camera','Check','ChevronLeft','ChevronRight','Circle','ClipboardCheck','Clock','Download','Eye','EyeOff','FlaskConical','Info','Keyboard','LayoutDashboard','Loader2','Lock','LogOut','Pencil','Plus','RefreshCw','Smartphone','Tag','Upload','User','WifiOff','X'];
const stubIkon = ikon.map((n) => `export const ${n} = (p) => React.createElement('svg', { 'data-ikon': '${n}', width: p.size || 24, height: p.size || 24, className: p.className, 'aria-hidden': 'true' });`).join('\n');
const stubRouter = `
import React from 'react';
export const Link = ({ to, children, ...r }) => React.createElement('a', { href: to, ...r }, children);
export const NavLink = Link;
export const Outlet = () => null;
export const useLocation = () => ({ pathname: '/tera/' });
export const useParams = () => (window.__params || {});
export const useNavigate = () => (to) => { window.__navigasi = to; };
`;
const stubAuth = `
export const useAuth = () => ({ user: window.__user, isOnline: true, logout: async () => {} });
`;
const stubApi = `export const apiFetch = (u, o) => window.__api(u, o);`;

const plugin = {
  name: 'stub',
  setup(b: any) {
    b.onResolve({ filter: /^lucide-react$/ }, () => ({ path: 'lucide', namespace: 'stub' }));
    b.onResolve({ filter: /^react-router-dom$/ }, () => ({ path: 'router', namespace: 'stub' }));
    b.onResolve({ filter: /^html5-qrcode$/ }, () => ({ path: 'qr', namespace: 'stub' }));
    b.onResolve({ filter: /lib\/AuthContext$/ }, () => ({ path: 'auth', namespace: 'stub' }));
    b.onResolve({ filter: /lib\/apiClient$/ }, () => ({ path: 'api', namespace: 'stub' }));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, (a: any) => ({
      contents: a.path === 'lucide' ? `import React from 'react';\n${stubIkon}` : a.path === 'router' ? stubRouter : a.path === 'auth' ? stubAuth : a.path === 'qr' ? 'export class Html5Qrcode {} export const Html5QrcodeSupportedFormats = {};' : stubApi,
      loader: 'js', resolveDir: akar,
    }));
  },
};
const masuk = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import * as db from './src/tera/data/teraDb';
import { SinkronProvider } from './src/tera/SinkronKonteks';
import { HalamanBeranda, HalamanDetailRs } from './src/tera/HalamanJadwal';
window.tera = db;
let akarReact = null;
window.pasang = (layar) => {
  if (akarReact) akarReact.unmount();
  document.getElementById('app').innerHTML = '';
  akarReact = createRoot(document.getElementById('app'));
  const L = layar === 'detail' ? HalamanDetailRs : HalamanBeranda;
  akarReact.render(React.createElement(SinkronProvider, null, React.createElement('main', { className: 't-main', style: { padding: 16 } }, React.createElement(L))));
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
const util = `.mt-2{margin-top:8px}.mt-3{margin-top:12px}.mt-4{margin-top:16px}.mt-6{margin-top:24px}.mt-1{margin-top:4px}.flex{display:flex}.items-center{align-items:center}.gap-2{gap:8px}.shrink-0{flex-shrink:0}.truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.text-\\[15px\\]{font-size:15px}.font-semibold{font-weight:600}ul,ol,dl,dd,p,h1,h2{margin:0;padding:0;list-style:none}*,::before,::after{box-sizing:border-box}a{color:inherit}svg{display:inline-block;fill:none;stroke:currentColor;stroke-width:2}body{margin:0;font-family:Inter,system-ui,sans-serif;background:var(--t-bg);color:var(--t-text)}`;
const HTML = `<!doctype html><html class="tera-aktif"><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><style>${css}\n${util}</style><body><div id=app class="tera-root"></div><script>window.__name=(f)=>f</script><script>${h.outputFiles[0].text}</script>`;

let lulus = 0, gagal = 0;
const cek = (n: string, ok: boolean, d = '') => { ok ? lulus++ : gagal++; console.log((ok ? 'LULUS ' : 'GAGAL ') + n + (ok ? '' : '  ' + d)); };
if (keluar) await mkdir(keluar, { recursive: true });

const br = await chromium.launch();
const J = (id: string, extra: any = {}) => ({
  jadwalId: id, bo: '095', namaRs: 'RS ' + id, kota: 'Solo', tanggalMulai: '2026-10-20', tanggalSelesai: '2026-10-22',
  labelAwal: '095.0001', labelAkhir: '095.0010', cadanganAwal: '095.0011', cadanganAkhir: '095.0015',
  alatPo: [{ ref: 'A', nama: 'Tensimeter', jumlah: 6, urutAwal: 1, urutAkhir: 6 }, { ref: 'B', nama: 'Timbangan Bayi', jumlah: 4, urutAwal: 7, urutAkhir: 10 }],
  versi: 1, isTest: false, pushedAt: '2026-10-19T01:00:00Z', dicabut: false, ...extra,
});

async function halaman(lebar: number, tinggi: number, gelap = false): Promise<Page> {
  const ctx = await br.newContext({ viewport: { width: lebar, height: tinggi }, colorScheme: gelap ? 'dark' : 'light' });
  await ctx.route(`${ASAL}/**`, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: HTML }));
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('  [error]', e.message));
  await p.goto(ASAL + '/');
  await p.waitForFunction(() => (window as any).siap);
  await p.evaluate(() => { (window as any).__user = { id: 'u-t', fullName: 'Teknisi Uji', role: 'teknisi' }; });
  return p;
}
/** api tiruan: GET /api/tera/jadwal membalas isi `jadwal` (atau gagal bila `mode` ≠ ok); lainnya 503. */
const atur = (p: Page, jadwal: any[], mode: 'ok' | 'offline' = 'ok') => p.evaluate(([jd, mode]) => {
  (window as any).__api = async (u: string) => {
    if (mode === 'offline') throw new TypeError('Failed to fetch');
    if (u.startsWith('/api/tera/jadwal')) return new Response(JSON.stringify({ jadwal: jd }), { status: 200, headers: { 'content-type': 'application/json' } });
    return new Response('{}', { status: 503 });
  };
}, [jadwal, mode] as const);
const tunggu = async (p: Page, fn: () => boolean, ms = 8000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await p.evaluate(fn)) return true; await p.waitForTimeout(100); }
  return false;
};
const geser = (p: Page) => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);

// ---------- 1. kosong + offline ----------
let p = await halaman(390, 800);
await atur(p, [], 'offline');
await p.evaluate(() => (window as any).pasang('beranda'));
await tunggu(p, () => /Belum ada jadwal/.test(document.body.innerText));
await tunggu(p, () => /Coba lagi/.test(document.body.innerText));
let teks = await p.evaluate(() => document.body.innerText);
cek('kosong: ajakan "Belum ada jadwal … Push"', /Belum ada jadwal/.test(teks) && /Push/.test(teks), teks.slice(0, 300));
cek('offline: pesan jelas + memakai jadwal di perangkat + tombol Coba lagi', /Tidak ada sambungan internet/.test(teks) && /jadwal yang sudah ada di perangkat/.test(teks) && /Coba lagi/.test(teks), teks.slice(0, 400));
const tinggiTombol = await p.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Coba lagi/.test(b.textContent || ''))!.getBoundingClientRect().height);
cek('tombol Coba lagi ≥ 48 px', tinggiTombol >= 48, String(tinggiTombol));
await p.context().close();

// ---------- 2. tarik jadwal → kartu RS (provider asli) ----------
p = await halaman(390, 800);
const NAMA_PANJANG = 'Rumah Sakit Umum Daerah Dr. Soetomo Kabupaten Sangat Panjang Sekali Namanya Tidak Muat Satu Baris Di Layar Kecil Sama Sekali';
await atur(p, [J('j1'), J('j2', { namaRs: NAMA_PANJANG, isTest: true, pushedAt: '2026-10-19T02:00:00Z' }), J('j3', { alatPo: [], pushedAt: '2026-10-19T00:00:00Z' }), J('j4', { dicabut: true, namaRs: 'RS DICABUT' })]);
await p.evaluate(() => (window as any).pasang('beranda'));
await tunggu(p, () => document.querySelectorAll('.t-rs-kartu').length >= 3);
teks = await p.evaluate(() => document.body.innerText);
const jumlahKartu = await p.evaluate(() => document.querySelectorAll('.t-rs-kartu').length);
cek('tarik jadwal: 3 RS tampil, yang dicabut tersembunyi', jumlahKartu === 3 && !/RS DICABUT/.test(teks), `${jumlahKartu}`);
cek('urutan: Push terbaru di atas', await p.evaluate(() => (document.querySelector('.t-rs-nama') as HTMLElement).innerText.startsWith('Rumah Sakit Umum')));
cek('kartu: BO · kota · tanggal · kemajuan', /BO 095/.test(teks) && /Solo/.test(teks) && /20 Okt 2026/.test(teks) && /0 dari 10 dikerjakan · sisa 10/.test(teks) && /Belum ada alat PO/.test(teks) && /data uji/.test(teks), teks.slice(0, 600));
cek('jadwal diperbarui pukul …', /Jadwal diperbarui pukul/.test(teks));
cek('tautan ke Detail RS benar', await p.evaluate(() => (document.querySelector('a.t-rs-kartu') as HTMLAnchorElement).getAttribute('href')) === '/tera/rs/' + encodeURIComponent('j2'));
cek('nama RS sangat panjang: dipotong ≤ 2 baris, tanpa geser samping', !(await geser(p)) && await p.evaluate(() => { const e = document.querySelector('.t-rs-nama') as HTMLElement; return e.getBoundingClientRect().height < 2 * 16 * 1.4 + 4; }));
const kecil = await p.evaluate(() => [...document.querySelectorAll('.t-rs-kartu')].every((a) => a.getBoundingClientRect().height >= 48));
cek('area sentuh kartu ≥ 48 px', kecil);
if (keluar) await p.screenshot({ path: `${keluar}/beranda-390-terang.png`, fullPage: true });
await p.context().close();

// ---------- 3. LKK di perangkat memengaruhi angka (dikerjakan/sisa) + pembaruan langsung ----------
p = await halaman(390, 800);
await atur(p, [J('j1')]);
await p.evaluate(async () => {
  const t = (window as any).tera;
  for (const [no, ref] of [['095.0001', 'A'], ['095.0002', 'A']]) await t.buatLkk({ pemilik: 'u-t', bo: '095', noLabel: no, jadwalId: 'j1', poItemRef: ref, templateKode: 'UJI', templateVersi: 1 });
});
await p.evaluate(() => (window as any).pasang('beranda'));
await tunggu(p, () => /2 dari 10 dikerjakan · sisa 8/.test(document.body.innerText));
cek('Beranda: 2 dari 10 dikerjakan (dari LKK di perangkat)', /2 dari 10 dikerjakan · sisa 8/.test(await p.evaluate(() => document.body.innerText)));
await p.evaluate(async () => { await (window as any).tera.buatLkk({ pemilik: 'u-t', bo: '095', noLabel: '095.0007', jadwalId: 'j1', poItemRef: 'B', templateKode: 'UJI', templateVersi: 1 }); });
cek('LKK baru → angka naik sendiri (≤ 6 detik)', await tunggu(p, () => /3 dari 10 dikerjakan · sisa 7/.test(document.body.innerText), 7000));
cek('ringkasan samping: total RS/PO/dikerjakan/sisa', await p.evaluate(() => { const t = document.querySelector('.t-ringkas-angka')?.textContent || ''; return /Rumah sakit1/.test(t) && /Alat PO10/.test(t) && /Dikerjakan3/.test(t) && /Sisa7/.test(t); }));

// ---------- 4. Detail RS ----------
await p.evaluate(() => { (window as any).__params = { id: 'j1' }; (window as any).pasang('detail'); });
await tunggu(p, () => /Alat PO/.test(document.body.innerText) && /Tensimeter/.test(document.body.innerText));
teks = await p.evaluate(() => document.body.innerText);
cek('Detail: nama alat · PO · dikerjakan · sisa', /Tensimeter/.test(teks) && /PO 6 · dikerjakan 2 · sisa 4/.test(teks) && /PO 4 · dikerjakan 1 · sisa 3/.test(teks), teks.slice(0, 700));
cek('Detail: rentang stiker utama & cadangan', /095\.0001 – 095\.0010/.test(teks) && /095\.0011 – 095\.0015/.test(teks));
cek('Detail: daftar LKK RS ini (3)', await p.evaluate(() => document.querySelectorAll('.t-lkk-baris').length) === 3);
cek('Detail: tautan kembali ke Beranda', await p.evaluate(() => (document.querySelector('a.t-kembali') as HTMLAnchorElement).getAttribute('href')) === '/tera/');
await p.getByRole('button', { name: /Alat tambahan/ }).click();
cek('Detail: "+ Alat tambahan" membuka lembar pilih jenis alat (4.3b; uji lengkap di test:tera:mulai-lkk)', await tunggu(p, () => /Pilih jenis alat tambahan/.test(document.querySelector('.t-lembar')?.textContent || '')));
await p.keyboard.press('Escape');
// alat selesai → chip "Selesai"
await p.evaluate(async () => { const t = (window as any).tera; for (const n of ['095.0008', '095.0009', '095.0010']) await t.buatLkk({ pemilik: 'u-t', bo: '095', noLabel: n, jadwalId: 'j1', poItemRef: 'B', templateKode: 'UJI', templateVersi: 1 }); });
cek('alat terpenuhi → chip Selesai (ikon + tulisan)', await tunggu(p, () => { const c = [...document.querySelectorAll('.t-alat-baris')].find((e) => /Timbangan Bayi/.test(e.textContent || '')); return !!c && /Selesai/.test(c.textContent || '') && !!c.querySelector('svg[data-ikon="Check"]'); }, 7000));
cek('tanpa geser samping (390 px)', !(await geser(p)));
if (keluar) await p.screenshot({ path: `${keluar}/detail-390-terang.png`, fullPage: true });

// ---------- 5. jadwal tidak ada lagi ----------
await p.evaluate(() => { (window as any).__params = { id: 'tidak-ada' }; (window as any).pasang('detail'); });
await tunggu(p, () => /tidak ada lagi/.test(document.body.innerText));
cek('Detail jadwal yang ditarik: pesan jelas + LKK tetap aman', /Jadwal ini tidak ada lagi/.test(await p.evaluate(() => document.body.innerText)));
await p.context().close();

// ---------- 6. data terburuk: 200 alat, nama panjang, PO terlampaui ----------
for (const [lebar, tinggi, gelap] of [[320, 640, false], [390, 800, true], [1180, 820, false]] as const) {
  p = await halaman(lebar, tinggi, gelap);
  const banyak = Array.from({ length: 200 }, (_, i) => ({ ref: 'R' + i, nama: `Alat nomor ${i} ` + 'dengan nama yang sangat panjang sekali '.repeat(3), jumlah: 3, urutAwal: null, urutAkhir: null }));
  await atur(p, [J('jb', { namaRs: NAMA_PANJANG, alatPo: banyak })]);
  await p.evaluate(async () => {
    const t = (window as any).tera;
    for (let i = 0; i < 5; i++) await t.buatLkk({ pemilik: 'u-t', bo: '095', noLabel: `095.00${20 + i}`, jadwalId: 'jb', poItemRef: 'R0', templateKode: 'UJI', templateVersi: 1 });
    (window as any).__params = { id: 'jb' }; (window as any).pasang('detail');
  });
  const ok = await tunggu(p, () => document.querySelectorAll('.t-alat-baris').length === 200);
  cek(`${lebar}px${gelap ? ' gelap' : ''}: 200 alat tampil, tanpa geser samping`, ok && !(await geser(p)));
  cek(`${lebar}px${gelap ? ' gelap' : ''}: PO terlampaui → sisa 0, bukan negatif`, /PO 3 · dikerjakan 5 · sisa 0/.test(await p.evaluate(() => document.body.innerText)));
  if (keluar) await p.screenshot({ path: `${keluar}/detail-${lebar}${gelap ? '-gelap' : ''}.png` });
  if (lebar === 1180) {
    await p.evaluate(() => (window as any).pasang('beranda'));
    await tunggu(p, () => document.querySelectorAll('.t-rs-kartu').length === 1);
    cek('1180 px: Beranda dua kolom (daftar + ringkasan terlihat)', await p.evaluate(() => { const a = document.querySelector('.t-ringkasan') as HTMLElement; return getComputedStyle(a).display !== 'none' && a.getBoundingClientRect().width > 300; }));
    if (keluar) await p.screenshot({ path: `${keluar}/beranda-1180.png` });
  }
  await p.context().close();
}

await br.close();
console.log(`\n${lulus}/${lulus + gagal} lulus`);
process.exit(gagal ? 1 : 0);
