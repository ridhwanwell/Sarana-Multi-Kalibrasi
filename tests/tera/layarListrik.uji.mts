// Uji LAYAR "Isi LKK" KESELAMATAN LISTRIK di Chromium sungguhan: klasifikasi alat, uji tidak berlaku, tanpa Kinerja.
// Jalankan: npm run test:tera:layar-listrik
// Router/ikon/login/apiFetch ditiru (stub); SinkronProvider, LayarLkk, teraDb, masterLokal, isian, lingkungan
// dan tera-tema.css adalah kode ASLI.
// (butuh paket "playwright" & Chromium; tidak ikut build Vercel)
import { chromium, type Page } from 'playwright';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { readFile, mkdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { TEMPLATE_KESELAMATAN_LISTRIK_V1 as TPL } from '../../src/tera/shared/templates/keselamatanListrik.ts';
const NAMA = 'ESWT';

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


const fx = JSON.parse(readFileSync(new URL('./fixtures/listrik-golden-v1.json', import.meta.url), 'utf8'));
const K = fx.kasus[0];
const baris = (asetId: string, nama: string, parameter: string, tabel: { titik: number; koreksi: number; u95: number }[], extra: any = {}) => ({
  pointsId: 'p-' + asetId + parameter, kode: asetId, asetId, nama, merk: 'Merk', model: 'Model', nomorSeri: 'SN-' + asetId, parameter, satuan: '',
  nomorSertifikat: 'SK-' + asetId, tertelusur: 'SNSU - BSN', tanggalKalibrasi: '2026-02-03', berlakuSampai: '2027-01-30', sumber: 'uji', diubahPada: '2026-10-01', budget: null, rekomendasi: false,
  points: tabel.map((t) => ({ titik: t.titik, koreksiNaik: t.koreksi, koreksiTurun: t.koreksi, u95Naik: t.u95, u95Turun: t.u95 })), ...extra,
});
const MASTER = [
  baris('CAL-042', 'Electrical Safety Analyzer', 'tegangan_v', K.kalibrator.listrik.tegangan), baris('CAL-042', 'Electrical Safety Analyzer', 'resistansi_ohm', K.kalibrator.listrik.resistansi),
  baris('CAL-042', 'Electrical Safety Analyzer', 'isolasi_mohm', K.kalibrator.listrik.isolasi), baris('CAL-042', 'Electrical Safety Analyzer', 'arus_bocor_ua', K.kalibrator.listrik.arus_bocor),
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
    const l = await w.tera.buatLkk({ pemilik: 'u-t', bo: '095', noLabel: '095.0001', templateKode: tpl.kode_alat, templateVersi: tpl.versi, tanggalKalibrasi: '2026-10-20', jadwalId: 'j1', poItemRef: 'A', data: { identitas: { namaAlat: 'ESWT' } } });
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
cek('header: nama alat dari isian "Nama Alat" (ESWT), nomor stiker, RS', /ESWT/.test((await p.locator('h1').innerText())) && /095\.0001/.test(t) && /RS Uji Solo/.test(t), t.slice(0, 200));
cek('6 penanda bagian (tanpa Kinerja), Keselamatan listrik bagian 4', await p.getByRole('button', { name: /^Bagian \d,/ }).count() === 6 && await p.getByRole('button', { name: /^Bagian 4, Keselamatan listrik/ }).count() === 1 && await p.getByRole('button', { name: /Kinerja/ }).count() === 0, await p.getByRole('button', { name: /^Bagian \d,/ }).allInnerTexts().then((x) => x.join('|')));
cek('alat standar tunggal terpilih otomatis (ESA, termohigrometer; tanpa IDA)', await dataTersimpan(p, id, (l) => l.calibratorSnapshot?.esa?.asetId === 'CAL-042' && l.calibratorSnapshot?.termohigrometer?.asetId === 'CAL-027' && !l.calibratorSnapshot?.ida));
t = await teks(p);
cek('identitas: Jenis LKK = Keselamatan Listrik; Nama Alat terisi ESWT; tanpa Rentang/Resolusi', /Jenis LKK/.test(t) && /Keselamatan Listrik/.test(t) && await p.inputValue('#iden-namaAlat') === 'ESWT' && !/Rentang/.test(t) && !/Resolusi/.test(t), t.slice(0, 600));
await p.fill('#iden-merek', 'BTL'); await p.fill('#iden-tipe', 'Curapuls'); await p.fill('#iden-noSeri', 'SN1');
await p.fill('#iden-tanggalPenerimaan', '2026-10-19'); await p.fill('#iden-ruang', 'Fisioterapi');
cek('tanpa geser samping', !(await geser(p)));

// ---------- 2–3. Lingkungan, fisik ----------
await ke(p, 2);
await p.locator('#ling-suhu-awal').pressSequentially('25'); await p.fill('#ling-suhu-akhir', '25'); await p.fill('#ling-rh-awal', '50'); await p.fill('#ling-rh-akhir', '50');
await ke(p, 3);
cek('fisik: bawaan Baik & Berfungsi tersimpan', await dataTersimpan(p, id, (x) => x.data.fisik?.badan?.fisik === 'Baik' && x.data.fisik?.kabel?.fungsi === 'Berfungsi'));

// ---------- 4. Keselamatan listrik ----------
await ke(p, 4);
t = await teks(p);
cek('listrik: kartu Klasifikasi alat + 5 uji tampil', /Klasifikasi alat/.test(t) && /Tegangan Catu Daya/.test(t) && /Resistansi Pembumian/.test(t) && /Isolasi Resistansi/.test(t) && /Arus Bocor Peralatan/.test(t) && /Bagian yang Diaplikasikan/.test(t), t.slice(0, 900));
cek('listrik: cara ukur PE belum ditanya sebelum kelas dipilih', await p.locator('#klas-kabelPE').count() === 0);
cek('listrik: batas menunggu klasifikasi', /pilih klasifikasi dulu/.test(t));
await p.selectOption('#klas-kelas', 'Kelas I');
await p.waitForSelector('#klas-kabelPE');
await p.selectOption('#klas-kabelPE', 'Dapat dilepas - bersama kabel');
await p.selectOption('#klas-tipeAP', 'Tipe BF');
await p.selectOption('#klas-metodeBocor', 'Langsung');
cek('klasifikasi tersimpan', await dataTersimpan(p, id, (x) => x.data.klasifikasi?.kelas === 'Kelas I' && x.data.klasifikasi?.tipeAP === 'Tipe BF' && x.data.klasifikasi?.metodeBocor === 'Langsung' && x.data.klasifikasi?.kabelPE === 'Dapat dilepas - bersama kabel'));
for (const [k, v] of Object.entries(K.data.listrik as Record<string, number>)) await p.fill(`#listrik-${k}`, String(v).replace('.', ','));
cek('listrik: bacaan tersimpan sebagai angka', await dataTersimpan(p, id, (x) => x.data.listrik?.tegangan === 221.5 && x.data.listrik?.resistansi_pembumian === 0.12 && x.data.listrik?.arus_bocor_ap === 20));
t = await teks(p);
cek('listrik: batas menurut klasifikasi (≤ 0,3 Ω; ≤ 500 µA; ≤ 5000 µA; > 2 MΩ)', /≤ 0,3/.test(t) && /≤ 500\b/.test(t) && /≤ 5000/.test(t) && /> 2/.test(t), t.slice(0, 1200));
cek('listrik: tegangan "DALAM RENTANG", 4 uji lain LAIK', await tunggu(p, () => {
  const h = Array.from(document.querySelectorAll('[aria-label^="Hasil "]')) as HTMLElement[];
  return h.length === 5 && /DALAM RENTANG/.test(h[0].innerText) && h.slice(1).every((e) => /LAIK/.test(e.innerText) && !/TIDAK/.test(e.innerText));
}), (await teks(p)).slice(0, 1400));
cek('listrik: tanpa geser samping', !(await geser(p)));
cek('listrik: dropdown klasifikasi ≥ 48 px & 16 px', await p.evaluate(() => { const e = document.getElementById('klas-kelas') as HTMLSelectElement; const k = e.closest('.t-kotak') as HTMLElement; return parseFloat(getComputedStyle(e).fontSize) >= 16 && k.getBoundingClientRect().height >= 47.5; }));

// ---------- 5. Kesimpulan & ringkasan ----------
await ke(p, 5);
t = await teks(p);
cek('kesimpulan: LAIK PAKAI tanpa skor', /LAIK PAKAI/.test(t) && !/TIDAK LAIK PAKAI/.test(t) && !/Skor/.test(t), t.slice(0, 700));
await ke(p, 6);
t = await teks(p);
cek('ringkasan: alat ESWT, klasifikasi, tidak ada kekurangan', /ESWT/.test(t) && /Kelas I · Tipe BF/.test(t) && /Selesai/.test(t) && (!/Belum lengkap/.test(t) || /Semua bagian lengkap/.test(t)), t.slice(0, 1200));
cek('ringkasan: tanpa Aliran/Penyumbatan/Skor', !/Aliran|Penyumbatan|Skor/.test(t));

// ---------- 6. Kelas II + Tipe B: PE & AP tidak berlaku ----------
await ke(p, 4);
await p.selectOption('#klas-kelas', 'Kelas II');
await p.selectOption('#klas-tipeAP', 'Tipe B');
await p.waitForTimeout(150);
t = await teks(p);
cek('Kelas II: cara ukur PE hilang, PE & AP "Tidak berlaku", tanpa kotak isian', await p.locator('#klas-kabelPE').count() === 0 && (t.match(/Tidak berlaku/g) || []).length === 2 && await p.locator('#listrik-resistansi_pembumian').count() === 0 && await p.locator('#listrik-arus_bocor_ap').count() === 0, t.slice(0, 1400));
cek('Kelas II Langsung: batas arus bocor peralatan ≤ 100', /≤ 100\b/.test(t));
await p.fill('#listrik-arus_bocor_peralatan', '150');
await ke(p, 5);
cek('arus bocor 150 µA > 100 → TIDAK LAIK PAKAI + alasan', await tunggu(p, () => /TIDAK LAIK PAKAI/.test(document.body.innerText) && /Arus Bocor Peralatan/.test(document.body.innerText)), (await teks(p)).slice(0, 800));
await p.context().close();

// ---------- 7. Kasus terburuk: nama RS sangat panjang, huruf 200 %, tablet diputar ----------
({ p, id } = await layar({ lebar: 360, tinggi: 740, namaRs: NAMA_RS }));
await ke(p, 4);
await p.addStyleTag({ content: 'body{zoom:2}' });
await p.waitForTimeout(150);
cek('huruf 200 %: bagian Listrik tanpa geser samping', !(await geser(p)));
await p.context().close();
({ p, id } = await layar({ lebar: 1180, tinggi: 820 }));
await ke(p, 4);
await p.fill('#listrik-tegangan', '219,5');
await p.setViewportSize({ width: 820, height: 1180 });
await p.waitForTimeout(150);
cek('tablet diputar: isian tetap ada', await p.evaluate(() => (document.getElementById('listrik-tegangan') as HTMLInputElement).value === '219,5') && await dataTersimpan(p, id, (x) => x.data.listrik?.tegangan === 219.5));
cek('tablet: tanpa geser samping', !(await geser(p)));
await p.context().close();

await br.close();
console.log(`\n${lulus} lulus, ${gagal} gagal`);
if (gagal) process.exit(1);
