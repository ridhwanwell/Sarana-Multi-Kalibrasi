// Uji bantuan mengisi BACAAN KINERJA (Enter-pindah, "= Sama", tempel banyak angka, tanda salinan) di Chromium sungguhan,
// memakai layar Thermohygrometer (84 kotak bacaan). Jalankan: npm run test:tera:layar-salin
// Router/ikon/login/apiFetch ditiru (stub); SinkronProvider, LayarLkk, teraDb, masterLokal, isian, lingkungan
// dan tera-tema.css adalah kode ASLI.
// (butuh paket "playwright" & Chromium; tidak ikut build Vercel)
import { chromium, type Page } from 'playwright';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { readFile, mkdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { TEMPLATE_TERMOHIGRO_V1 as TPL } from '../../src/tera/shared/templates/termohigrometer.ts';
const NAMA = 'Thermohygrometer';

const akar = fileURLToPath(new URL('../../', import.meta.url));
const ASAL = 'http://localhost:9994';
const keluar = process.env.TERA_FOTO_DIR || '';

const ikon = ['AlertCircle','Building2','Camera','Check','ChevronLeft','ChevronRight','Circle','ClipboardCheck','Clock','Download','Eye','EyeOff','FlaskConical','Info','Keyboard','LayoutDashboard','Loader2','Lock','Minus','ChevronDown','LogOut','Pencil','Plus','RefreshCw','Smartphone','Tag','Upload','User','WifiOff','X'];
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

const plugin = {
  name: 'stub',
  setup(b: any) {
    b.onResolve({ filter: /^lucide-react$/ }, () => ({ path: 'lucide', namespace: 'stub' }));
    b.onResolve({ filter: /^react-router-dom$/ }, () => ({ path: 'router', namespace: 'stub' }));
    b.onResolve({ filter: /lib\/AuthContext$/ }, () => ({ path: 'auth', namespace: 'stub' }));
    b.onResolve({ filter: /lib\/apiClient$/ }, () => ({ path: 'api', namespace: 'stub' }));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, (a: any) => ({
      contents: a.path === 'lucide' ? `import React from 'react';\n${stubIkon}` : a.path === 'router' ? stubRouter : a.path === 'auth' ? stubAuth : stubApi,
      loader: 'js', resolveDir: akar,
    }));
  },
};
const masuk = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import * as db from './src/tera/data/teraDb';
import * as master from './src/tera/data/masterLokal';
import { SinkronProvider } from './src/tera/SinkronKonteks';
import { LayarLkk } from './src/tera/LayarLkk';
window.tera = db;
window.master = master;
let akarReact = null;
window.pasang = () => {
  if (akarReact) akarReact.unmount();
  document.getElementById('app').innerHTML = '';
  akarReact = createRoot(document.getElementById('app'));
  akarReact.render(React.createElement(SinkronProvider, null, React.createElement('main', { className: 't-main', style: { padding: 16 } }, React.createElement(LayarLkk))));
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
const util = `button,input{border:0;background:transparent;color:inherit;margin:0;font:inherit}button{cursor:pointer}.mt-1{margin-top:4px}.mt-2{margin-top:8px}.mt-3{margin-top:12px}.mt-4{margin-top:16px}.mt-6{margin-top:24px}.mt-px{margin-top:1px}.flex{display:flex}.items-center{align-items:center}.gap-2{gap:8px}.shrink-0{flex-shrink:0}.min-w-0{min-width:0}.truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.text-\\[15px\\]{font-size:15px}.font-semibold{font-weight:600}ul,ol,dl,dd,p,h1,h2,h3{margin:0;padding:0;list-style:none}*,::before,::after{box-sizing:border-box}a{color:inherit}button{font-family:inherit}svg{display:inline-block;fill:none;stroke:currentColor;stroke-width:2}body{margin:0;font-family:Inter,system-ui,sans-serif;background:var(--t-bg);color:var(--t-text)}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}`;
const HTML = `<!doctype html><html class="tera-aktif"><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><style>${css}\n${util}</style><body><div id=app class="tera-root"></div><script>window.__name=(f)=>f</script><script>${h.outputFiles[0].text}</script>`;

let lulus = 0, gagal = 0;
const cek = (n: string, ok: boolean, d = '') => { ok ? lulus++ : gagal++; console.log((ok ? 'LULUS ' : 'GAGAL ') + n + (ok ? '' : '  ' + d)); };
if (keluar) await mkdir(keluar, { recursive: true });

const br = await chromium.launch();
const NAMA_RS = 'Rumah Sakit Umum Daerah Dr. Soetomo Kabupaten Sangat Panjang Sekali Namanya Tidak Muat Satu Baris Di Layar Kecil';
const JADWAL = (namaRs = 'RS Uji Solo') => ({
  jadwalId: 'j1', bo: '095', namaRs, kota: 'Solo', tanggalMulai: '2026-10-20', tanggalSelesai: '2026-10-22',
  labelAwal: '095.0001', labelAkhir: '095.0010', cadanganAwal: '095.0011', cadanganAkhir: '095.0015',
  alatPo: [{ ref: 'A', nama: NAMA, jumlah: 6, urutAwal: 1, urutAkhir: 6 }],
  versi: 1, isTest: false, pushedAt: '2026-10-19T01:00:00Z', dicabut: false,
});


const baris = (asetId: string, nama: string, parameter: string, tabel: { titik: number; koreksi: number; u95: number }[], extra: any = {}) => ({
  pointsId: 'p-' + asetId + parameter, kode: asetId, asetId, nama, merk: 'Merk', model: 'Model', nomorSeri: 'SN-' + asetId, parameter, satuan: '',
  nomorSertifikat: 'SK-' + asetId, tertelusur: 'SNSU - BSN', tanggalKalibrasi: '2026-02-03', berlakuSampai: '2027-01-30', sumber: 'uji', diubahPada: '2026-10-01', budget: null, rekomendasi: false,
  points: tabel.map((t) => ({ titik: t.titik, koreksiNaik: t.koreksi, koreksiTurun: t.koreksi, u95Naik: t.u95, u95Turun: t.u95 })), ...extra,
});
const SUHU = [15, 20, 25, 30, 35, 40, 45].map((titik) => ({ titik, koreksi: 0, u95: 1 }));
const RH = [30, 40, 50, 60, 70, 80, 90].map((titik) => ({ titik, koreksi: 0, u95: 4 }));
const MASTER = [
  baris('CAL-048', 'Climatic Chamber', 'suhu_c', SUHU, { namaTampil: 'Climatic Chamber' }),
  baris('CAL-048', 'Climatic Chamber', 'kelembaban_rh', RH, { namaTampil: 'Climatic Chamber' }),
  baris('CAL-027', 'Thermohygrometer HTC-1', 'suhu_c', [{ titik: 20, koreksi: 0.1, u95: 0.3 }, { titik: 30, koreksi: 0.2, u95: 0.3 }, { titik: 40, koreksi: 0.1, u95: 0.3 }], { rekomendasi: true }),
  baris('CAL-027', 'Thermohygrometer HTC-1', 'kelembaban_rh', [{ titik: 40, koreksi: 1, u95: 2 }, { titik: 60, koreksi: 1, u95: 2 }, { titik: 80, koreksi: 1, u95: 2 }], { rekomendasi: true }),
];

interface Opsi { lebar?: number; tinggi?: number; gelap?: boolean; namaRs?: string }

async function layar(o: Opsi = {}): Promise<{ p: Page; id: string }> {
  const ctx = await br.newContext({ viewport: { width: o.lebar ?? 390, height: o.tinggi ?? 844 }, colorScheme: o.gelap ? 'dark' : 'light' });
  await ctx.route(`${ASAL}/**`, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: HTML }));
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('  [error]', e.message));
  await p.goto(ASAL + '/');
  await p.waitForFunction(() => (window as any).siap);
  const id = await p.evaluate(async ({ jd, kal, tpl }) => {
    const w = window as any;
    w.__user = { id: 'u-t', fullName: 'Teknisi Uji, A.Md.', role: 'teknisi' };
    w.__api = async (u: string) => u.startsWith('/api/tera/jadwal')
      ? new Response(JSON.stringify({ jadwal: [jd] }), { status: 200, headers: { 'content-type': 'application/json' } })
      : new Response('{}', { status: 503 });
    await w.master.simpanMasterServer({ kalibrator: kal, template: [tpl] });
    const l = await w.tera.buatLkk({ pemilik: 'u-t', bo: '095', noLabel: '095.0001', templateKode: tpl.kode_alat, templateVersi: tpl.versi, tanggalKalibrasi: '2026-10-20', jadwalId: 'j1', poItemRef: 'A', data: {} });
    w.__params = { id: l.id };
    w.pasang();
    return l.id as string;
  }, { jd: JADWAL(o.namaRs), kal: MASTER, tpl: TPL });
  await p.waitForFunction(() => !!document.querySelector('.t-lkk-layar, .t-kosong'), null, { timeout: 8000 });
  return { p, id };
}
const bacaLkk = (p: Page, id: string) => p.evaluate(async (i) => (await (window as any).tera.ambilLkk(i)) as any, id);
const tunggu = async (p: Page, fn: () => boolean, ms = 5000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await p.evaluate(fn)) return true; await p.waitForTimeout(60); }
  return false;
};
const geser = (p: Page) => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
const teks = (p: Page) => p.evaluate(() => document.body.innerText);
const ke = async (p: Page, nomor: number) => { await p.getByRole('button', { name: new RegExp(`^Bagian ${nomor},`) }).click(); await p.waitForTimeout(30); };
const dataTersimpan = async (p: Page, id: string, f: (l: any) => boolean, ms = 3000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (f(await bacaLkk(p, id))) return true; await p.waitForTimeout(80); }
  return false;
};



// ---------- Bantuan mengisi bacaan ----------
const aktifId = (p: Page) => p.evaluate(() => (document.activeElement as HTMLElement | null)?.id || '');
const nilaiKotak = (p: Page, kid: string) => p.locator('#' + kid).inputValue();
const tempel = (p: Page, kid: string, isi: string) => p.evaluate(({ kid, isi }) => {
  const el = document.getElementById(kid)!; el.focus();
  const dt = new DataTransfer(); dt.setData('text', isi);
  el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
}, { kid, isi });

let { p, id } = await layar();
await p.waitForFunction(() => /RS Uji Solo/.test(document.body.innerText), null, { timeout: 8000 });
await p.fill('#iden-resolusi', '0,1'); await p.getByRole('radio', { name: 'Digital' }).click();
await p.locator('[role="radiogroup"][aria-labelledby="std-chamber"] button', { hasText: 'Climatic Chamber' }).click();
await ke(p, 4);
cek('semua 84 kotak bacaan kinerja bertanda bantuan (identitas/fisik tidak)', await p.locator('input[data-baca="1"]').count() === 84 && await p.locator('#iden-merek[data-baca]').count() === 0);
cek('tombol bantuan belum tampil sebelum kotak diisi', await p.locator('.t-salin-bar').count() === 0);

// 1. Enter pindah ke kotak berikutnya
await p.locator('#termo-suhu_15-0').click();
cek('tombol bantuan tampil saat kotak difokus', await p.locator('.t-salin-bar').count() === 1 && await p.getByRole('button', { name: /= Sama/ }).count() === 1);
await p.keyboard.type('24,9'); await p.keyboard.press('Enter');
cek('Enter → fokus pindah ke bacaan 2 (keyboard tetap terbuka)', await aktifId(p) === 'termo-suhu_15-1', await aktifId(p));
await p.keyboard.type('25,0');
cek('"Berikutnya ▸" pindah ke bacaan 3', await (async () => { await p.getByRole('button', { name: /Berikutnya/ }).click(); return (await aktifId(p)) === 'termo-suhu_15-2'; })(), await aktifId(p));
cek('"◂" kembali ke bacaan 2', await (async () => { await p.getByRole('button', { name: 'Kotak sebelumnya' }).click(); return (await aktifId(p)) === 'termo-suhu_15-1'; })(), await aktifId(p));
cek('tombol bantuan tidak mencuri fokus (kotak tetap aktif setelah ditekan)', (await aktifId(p)).startsWith('termo-'));

// 2. = Sama
await p.getByRole('button', { name: /Berikutnya/ }).click();           // ke bacaan 3 (kosong)
await p.getByRole('button', { name: /= Sama/ }).click();
cek('"= Sama": bacaan 3 = bacaan 2 (25) & pindah ke bacaan 4', await nilaiKotak(p, 'termo-suhu_15-2') === '25' && await aktifId(p) === 'termo-suhu_15-3', `${await nilaiKotak(p, 'termo-suhu_15-2')} / ${await aktifId(p)}`);
await p.getByRole('button', { name: /= Sama/ }).click();
cek('"= Sama" lagi: bacaan 4 = 25', await nilaiKotak(p, 'termo-suhu_15-3') === '25');
cek('tanda "= sama dgn sebelumnya" tampil di kotak hasil salinan, bukan di kotak yang diketik', (await p.locator('[data-salin="sama"]').count()) === 2 && await p.locator('#termo-suhu_15-0').evaluate((e) => !e.closest('.t-isian')!.querySelector('.t-tanda-salin')));
cek('data tersimpan: angka + data.salinan (tidak mengubah bentuk data.termo)', await dataTersimpan(p, id, (l) => JSON.stringify(l.data.termo?.suhu_15?.slice(0, 4)) === '[24.9,25,25,25]' && l.data.salinan?.['termo-suhu_15-2'] === 'sama' && l.data.salinan?.['termo-suhu_15-3'] === 'sama'), JSON.stringify((await bacaLkk(p, id)).data));
// kotak pertama: tidak ada "sebelumnya"
await p.locator('#termo-suhu_20-0').click();
await p.getByRole('button', { name: /= Sama/ }).click();
cek('"= Sama" di kotak pertama kelompok ditolak dengan pesan jelas', /kotak pertama/i.test(await p.locator('.t-salin-pesan').innerText()) && await nilaiKotak(p, 'termo-suhu_20-0') === '');
// Mengetik manual menghapus tanda
await p.locator('#termo-suhu_15-3').click(); await p.keyboard.press('Control+A'); await p.keyboard.type('25,1');
cek('mengetik manual di kotak bertanda menghapus tandanya', await tunggu(p, () => document.querySelectorAll('[data-salin="sama"]').length === 1) && await dataTersimpan(p, id, (l) => !l.data.salinan?.['termo-suhu_15-3'] && l.data.termo.suhu_15[3] === 25.1));

// 3. Tempel
await tempel(p, 'termo-suhu_20-0', '24,9 25,0 24,9\n24,9 25,0 24,9');
cek('tempel 6 angka (spasi + baris baru) → mengisi 6 kotak berurutan', await tunggu(p, () => (document.getElementById('termo-suhu_20-5') as HTMLInputElement).value === '24,9') && Number((await nilaiKotak(p, 'termo-suhu_20-1')).replace(',', '.')) === 25 && (await nilaiKotak(p, 'termo-suhu_20-2')) === '24,9');
cek('tempel: kotak hasil tempel bertanda "hasil tempel" & tersimpan di data', await p.locator('[data-salin="tempel"]').count() === 6 && await dataTersimpan(p, id, (l) => JSON.stringify(l.data.termo?.suhu_20) === '[24.9,25,24.9,24.9,25,24.9]' && l.data.salinan?.['termo-suhu_20-3'] === 'tempel'));
// Tabel yang melewati batas kelompok: 12 angka dari suhu_25-0 mengisi suhu_25 dan suhu_30
await tempel(p, 'termo-suhu_25-0', '25,1;25,0;24,9;25,0;25,1;25,0\t24,8 24,9 25,0 25,1 25,0 24,9');
cek('tempel 12 angka melewati batas titik → mengisi titik 25 dan titik 30', await tunggu(p, () => (document.getElementById('termo-suhu_30-5') as HTMLInputElement).value === '24,9') && await nilaiKotak(p, 'termo-suhu_25-0') === '25,1' && await nilaiKotak(p, 'termo-suhu_30-0') === '24,8');
// Tempel tidak valid: tidak ada yang berubah
const sebelum = await nilaiKotak(p, 'termo-suhu_35-0');
await tempel(p, 'termo-suhu_35-0', '24,9 abc 25');
cek('tempel berisi bukan angka ditolak seluruhnya (tidak ada kotak berubah)', (await nilaiKotak(p, 'termo-suhu_35-0')) === sebelum && (await nilaiKotak(p, 'termo-suhu_35-1')) === '');
cek('tempel ditolak: pesan jelas tampil', await tunggu(p, () => /bukan angka/.test(document.querySelector('.t-salin-pesan')?.textContent || '')));
// Satu angka = tempel biasa, tanpa tanda
await p.locator('#termo-suhu_35-0').click(); await p.keyboard.type('30,1');
cek('hasil dihitung sama seperti diketik: titik 20 → Rata-rata 24,93 & hasil tampil', await tunggu(p, () => { const e = document.querySelector('[aria-label="Hasil SUHU / Temperature 20"]') as HTMLElement | null; return !!e && /Rata-rata 24,93/.test(e.innerText); }), await p.evaluate(() => (document.querySelector('[aria-label="Hasil SUHU / Temperature 20"]') as HTMLElement | null)?.innerText || '-'));

// 4. Tahan ulang: data.salinan ikut tersimpan & tanda muncul lagi saat layar dibuka kembali
await p.evaluate(() => (window as any).pasang());
await p.waitForSelector('.t-lkk-layar'); await ke(p, 4);
cek('layar dibuka kembali: tanda salinan masih ada & angka utuh', await p.locator('[data-salin="tempel"]').count() >= 6 && await nilaiKotak(p, 'termo-suhu_20-5') === '24,9');
cek('tanpa geser samping (HP) dengan tombol bantuan tampil', await (async () => { await p.locator('#termo-suhu_40-0').click(); return !(await geser(p)); })());
const tinggiTombol = await p.evaluate(() => Math.min(...Array.from(document.querySelectorAll<HTMLElement>('.t-salin-tombol')).map((b) => b.getBoundingClientRect().height)));
cek('tombol bantuan ≥ 48 px (mudah ditekan di tablet)', tinggiTombol >= 47.5, String(tinggiTombol));
await p.context().close();

// ---------- Layar terkunci: tombol bantuan tidak ada ----------
({ p, id } = await layar());
await p.evaluate(async (i) => { const w = window as any; const x = await w.tera.ambilLkk(i); x.syncState = 'diterima'; await w.tera.tx(['lkk'], 'readwrite', (s: any) => { s.lkk.put(x); }); w.pasang(); }, id);
await p.waitForSelector('.t-lkk-layar'); await ke(p, 4);
await p.locator('#termo-suhu_15-0').click({ force: true });
cek('LKK terkunci (hanya baca): tidak ada tombol bantuan', await p.locator('.t-salin-bar').count() === 0);
await p.context().close();

await br.close();
console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
