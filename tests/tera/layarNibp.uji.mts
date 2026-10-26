// Uji LAYAR "Isi LKK" NIBP di Chromium sungguhan: tanpa Keselamatan listrik, 4 setting × Systole/MAP/Diastole, minimal 4 bacaan,
// Selesai benar-benar bisa ditekan. Jalankan: npm run test:tera:layar-nibp
// Router/ikon/login/apiFetch ditiru (stub); SinkronProvider, LayarLkk, teraDb, masterLokal, isian, lingkungan
// dan tera-tema.css adalah kode ASLI.
// (butuh paket "playwright" & Chromium; tidak ikut build Vercel)
import { chromium, type Page } from 'playwright';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { readFile, mkdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { TEMPLATE_NIBP_V1 as TPL } from '../../src/tera/shared/templates/nibp.ts';
const NAMA = 'Tensimeter Digital';

const akar = fileURLToPath(new URL('../../', import.meta.url));
const ASAL = 'http://localhost:9993';
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


const fx = JSON.parse(readFileSync(new URL('./fixtures/nibp-golden-v1.json', import.meta.url), 'utf8'));
const K = fx.kasus[0];
const baris = (asetId: string, nama: string, parameter: string, tabel: { titik: number; koreksi: number; u95: number }[], extra: any = {}) => ({
  pointsId: 'p-' + asetId + parameter, kode: asetId, asetId, nama, merk: 'Merk', model: 'Model', nomorSeri: 'SN-' + asetId, parameter, satuan: '',
  nomorSertifikat: 'SK-' + asetId, tertelusur: 'SNSU - BSN', tanggalKalibrasi: '2026-02-03', berlakuSampai: '2027-01-30', sumber: 'uji', diubahPada: '2026-10-01', budget: null, rekomendasi: false,
  points: tabel.map((t) => ({ titik: t.titik, koreksiNaik: t.koreksi, koreksiTurun: t.koreksi, u95Naik: t.u95, u95Turun: t.u95 })), ...extra,
});
const MASTER = [
  baris('CAL-037', 'Digital Pressure Meter', 'tekanan_mmhg', K.kalibrator.nibp, { namaTampil: 'NIBP Simulator' }),
  baris('CAL-027', 'Thermohygrometer HTC-1', 'suhu_c', [{ titik: 20, koreksi: 0.1, u95: 0.3 }, { titik: 30, koreksi: 0.2, u95: 0.3 }], { rekomendasi: true }),
  baris('CAL-027', 'Thermohygrometer HTC-1', 'kelembaban_rh', [{ titik: 40, koreksi: 1, u95: 2 }, { titik: 80, koreksi: 1, u95: 2 }], { rekomendasi: true }),
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


// ---------- 1. Pembukaan ----------
let { p, id } = await layar();
await p.waitForFunction(() => /RS Uji Solo/.test(document.body.innerText), null, { timeout: 8000 });
let t = await teks(p);
cek('header: nama alat NIBP, nomor stiker, RS', /Non Invasive Blood Pressure/.test(await p.locator('h1').innerText()) && /095\.0001/.test(t), t.slice(0, 200));
const nb = await p.getByRole('button', { name: /^Bagian \d,/ }).allInnerTexts();
cek('6 bagian: TANPA Keselamatan listrik, Kinerja bagian 4', nb.length === 6 && await p.getByRole('button', { name: /Keselamatan listrik/ }).count() === 0 && await p.getByRole('button', { name: /^Bagian 4, Kinerja/ }).count() === 1, nb.join('|'));
cek('alat standar terpilih otomatis: NIBP Simulator & termohigrometer (tanpa ESA/IDA)', await dataTersimpan(p, id, (l) => l.calibratorSnapshot?.nibp?.asetId === 'CAL-037' && l.calibratorSnapshot?.termohigrometer?.asetId === 'CAL-027' && !l.calibratorSnapshot?.esa && !l.calibratorSnapshot?.ida));
cek('resolusi bawaan 1 mmHg', await dataTersimpan(p, id, (l) => l.data?.identitas?.resolusi === 1));
await p.fill('#iden-merek', 'Omron'); await p.fill('#iden-tipe', 'HEM-7120'); await p.fill('#iden-noSeri', 'SN1'); await p.fill('#iden-rentangUkur', '0 - 300 mmHg');
await p.fill('#iden-tanggalPenerimaan', '2026-10-19'); await p.fill('#iden-ruang', 'Poli');
await ke(p, 2);
await p.locator('#ling-suhu-awal').pressSequentially('25'); await p.fill('#ling-suhu-akhir', '25'); await p.fill('#ling-rh-awal', '50'); await p.fill('#ling-rh-akhir', '50');
await ke(p, 3);

// ---------- 4. Kinerja NIBP ----------
await ke(p, 4);
t = await teks(p);
cek('kinerja: 4 kartu setting × 3 (Systole/MAP/Diastole) × 6 kotak', await p.locator('[id^="nibp-"]').count() === 72 && /Setting 1 · 60 \/ 40 \/ 30/.test(t) && /Setting 4 · 200 \/ 167 \/ 150/.test(t), t.slice(0, 600));
cek('kinerja: batas |koreksi| + U95 ≤ 8 mmHg tertulis', /U95 ≤ 8 mmHg/.test(t));
for (const [tid, run] of Object.entries(K.data.nibp as Record<string, number[]>)) {
  for (let i = 0; i < run.length; i++) await p.fill(`#nibp-${tid}-${i}`, String(run[i]));
}
cek('bacaan tersimpan sebagai angka di data.nibp', await dataTersimpan(p, id, (x) => x.data.nibp?.s1_systole?.[1] === 61 && x.data.nibp?.s4_diastole?.[5] === 149));
cek('hasil Systole 60: U95 1,14 & LAIK (sama dengan sertifikat Excel)', await tunggu(p, () => { const e = document.querySelector('[aria-label="Hasil Systole 60"]') as HTMLElement | null; return !!e && /U95 1,14/.test(e.innerText) && /LAIK/.test(e.innerText) && !/TIDAK/.test(e.innerText); }), await p.evaluate(() => (document.querySelector('[aria-label="Hasil Systole 60"]') as HTMLElement | null)?.innerText || '-'));
cek('hasil MAP 40: koreksi -0,33', await tunggu(p, () => /Koreksi -0,33/.test((document.querySelector('[aria-label="Hasil MAP 40"]') as HTMLElement | null)?.innerText || '')));
cek('titik laik 12 dari 12', /12 dari 12/.test(await teks(p)));
cek('kinerja: tanpa geser samping (HP)', !(await geser(p)));

// ---------- 5. Kesimpulan & ringkasan & Selesai ----------
await ke(p, 5);
t = await teks(p);
cek('kesimpulan: LAIK PAKAI, skor 100', /LAIK PAKAI/.test(t) && !/TIDAK LAIK PAKAI/.test(t) && /Skor 100 dari 100/.test(t), t.slice(0, 700));
await ke(p, 6);
t = await teks(p);
cek('ringkasan: NIBP 12 dari 12 titik laik, alat standar NIBP Simulator', /NIBP\s+12 dari 12 titik laik/.test(t) && /Digital Pressure Meter|NIBP Simulator/.test(t), t.slice(0, 1200));
cek('ringkasan: tanpa Aliran/Penyumbatan/Keselamatan', !/Aliran|Penyumbatan|Tegangan Catu/.test(t));
cek('ringkasan: TIDAK ada daftar "masih kurang"', !/masih kurang/.test(t) && !/Tombol Selesai aktif setelah/.test(t), t.slice(0, 1200));
await p.getByRole('button', { name: /^Selesai$/ }).click();
cek('Selesai → konfirmasi', await tunggu(p, () => /Selesaikan LKK ini\?/.test(document.body.innerText)));
await p.getByRole('button', { name: /Ya, selesai/ }).click();
cek('Ya, selesai → LKK disegel & masuk antrean', await tunggu(p, () => /LKK selesai/.test(document.body.innerText)) && await dataTersimpan(p, id, (x) => ['tersimpan', 'mengirim', 'diterima'].includes(x.syncState) && x.results?.lengkap === true && x.results?.kesimpulan === 'Laik Pakai'));
await p.context().close();

// ---------- 6. Bacaan 4 saja boleh; 3 bacaan → kurang; bias +7 → TIDAK LAIK ----------
({ p, id } = await layar());
await p.waitForTimeout(400);
await p.evaluate(async ({ i, nibp }) => { const w = window as any; const x = await w.tera.ambilLkk(i); x.data = { ...x.data, nibp }; await w.tera.tx(['lkk'], 'readwrite', (s: any) => { s.lkk.put(x); }); w.pasang(); },
  { i: id, nibp: Object.fromEntries(Object.entries(K.data.nibp as Record<string, number[]>).map(([k, v]) => [k, k === 's1_systole' ? v.slice(0, 3) : v.slice(0, 4)])) });
await p.waitForSelector('.t-lkk-layar');
await ke(p, 4);
cek('3 bacaan Systole 60 → "Ulangan kurang", titik lain (4 bacaan) dinilai', await tunggu(p, () => /Ulangan kurang dari 4/.test((document.querySelector('[aria-label="Hasil Systole 60"]') as HTMLElement | null)?.innerText || '') && /LAIK/.test((document.querySelector('[aria-label="Hasil MAP 40"]') as HTMLElement | null)?.innerText || '')));
await p.waitForTimeout(400);
await p.evaluate(async ({ i, nibp }) => { const w = window as any; const x = await w.tera.ambilLkk(i);
  x.data = { ...x.data, nibp, identitas: { merek: 'Omron', tipe: 'HEM', noSeri: 'SN', rentangUkur: '0 - 300', resolusi: 1, tanggalPenerimaan: '2026-10-19', ruang: 'Poli' }, lingkungan: { suhuAwal: 25, suhuAkhir: 25, rhAwal: 50, rhAkhir: 50 } };
  await w.tera.tx(['lkk'], 'readwrite', (s: any) => { s.lkk.put(x); }); w.pasang(); },
  { i: id, nibp: Object.fromEntries((TPL.nibp!.titik).map((tt) => [tt.id, [0, 1, -1, 1, 0, -1].map((d) => tt.setting + 7 + d)])) });
await p.waitForSelector('.t-lkk-layar');
await ke(p, 5);
cek('bias +7 mmHg (|7|+1,14 > 8) → TIDAK LAIK PAKAI + alasan NIBP', await tunggu(p, () => /TIDAK LAIK PAKAI/.test(document.body.innerText) && /NIBP: 0 dari 12/.test(document.body.innerText)), (await teks(p)).slice(0, 700));
await p.context().close();

// ---------- 7. Kasus terburuk: nama RS panjang, huruf 200 %, tablet landscape ----------
({ p, id } = await layar({ lebar: 360, tinggi: 740, namaRs: NAMA_RS }));
await ke(p, 4);
await p.addStyleTag({ content: 'body{zoom:2}' });
await p.waitForTimeout(150);
cek('huruf 200 %: Kinerja NIBP tanpa geser samping', !(await geser(p)));
await p.context().close();
({ p, id } = await layar({ lebar: 1180, tinggi: 820, gelap: true }));
await ke(p, 4);
await p.fill('#nibp-s2_map-0', '93');
await p.setViewportSize({ width: 820, height: 1180 });
await p.waitForTimeout(200);
cek('tablet diputar: isian tetap ada', await p.inputValue('#nibp-s2_map-0') === '93');
cek('tablet (gelap): tanpa geser samping', !(await geser(p)));
await p.context().close();

await br.close();
console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
