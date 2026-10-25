// Uji LAYAR "Isi LKK" pompa versi KMK (Infusion v3 / Syringe v2: 5 pengulangan, titik contoh KMK) di Chromium sungguhan.
// Jalankan: ALAT=infusion|syringe npm run test:tera:layar-pompa-kmk
// Router/ikon/login/apiFetch ditiru (stub); SinkronProvider, LayarLkk, teraDb, masterLokal, isian, lingkungan
// dan tera-tema.css adalah kode ASLI.
// Jalankan: npm run test:tera:layar-syringe   (butuh paket "playwright" & Chromium; tidak ikut build Vercel)
import { chromium, type Page } from 'playwright';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { readFile, mkdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { TEMPLATE_SYRINGE_PUMP_V2 } from '../../src/tera/shared/templates/syringePump.ts';
import { TEMPLATE_INFUSION_PUMP_V3 } from '../../src/tera/shared/templates/infusionPump.ts';
const INFUS = process.env.ALAT === 'infusion';
const TPL = INFUS ? TEMPLATE_INFUSION_PUMP_V3 : TEMPLATE_SYRINGE_PUMP_V2;
const NAMA = TPL.nama;

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


const fx = JSON.parse(readFileSync(new URL(`./fixtures/${INFUS ? 'infusion' : 'syringe'}-golden-kmk.json`, import.meta.url), 'utf8'));
const K = fx.kasus[0];
const baris = (asetId: string, nama: string, parameter: string, tabel: { titik: number; koreksi: number; u95: number }[], extra: any = {}) => ({
  pointsId: 'p-' + asetId + parameter, kode: asetId, asetId, nama, merk: 'Merk', model: 'Model', nomorSeri: 'SN-' + asetId, parameter, satuan: '',
  nomorSertifikat: 'SK-' + asetId, tertelusur: 'SNSU - BSN', tanggalKalibrasi: '2026-02-03', berlakuSampai: '2027-01-30', sumber: 'uji', diubahPada: '2026-10-01', budget: null, rekomendasi: false,
  points: tabel.map((t) => ({ titik: t.titik, koreksiNaik: t.koreksi, koreksiTurun: t.koreksi, u95Naik: t.u95, u95Turun: t.u95 })), ...extra,
});
const MASTER = [
  baris('CAL-030', 'Infusion Device Analyzer', 'aliran_mlh', K.kalibrator.aliran), baris('CAL-030', 'Infusion Device Analyzer', 'tekanan_psi', K.kalibrator.tekanan),
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
cek(`header: ${NAMA}, nomor stiker, RS`, t.includes(NAMA) && /095\.0001/.test(t) && /RS Uji Solo/.test(t), t.slice(0, 200));
cek('7 penanda bagian, termasuk Keselamatan listrik', await p.getByRole('button', { name: /^Bagian \d,/ }).count() === 7 && await p.getByRole('button', { name: /^Bagian 4, Keselamatan listrik/ }).count() === 1, await p.getByRole('button', { name: /^Bagian \d,/ }).allInnerTexts().then((x) => x.join('|')));
cek('alat standar tunggal terpilih otomatis (IDA, ESA, termohigrometer)', await dataTersimpan(p, id, (l) => l.calibratorSnapshot?.ida?.asetId === 'CAL-030' && l.calibratorSnapshot?.esa?.asetId === 'CAL-042' && l.calibratorSnapshot?.termohigrometer?.asetId === 'CAL-027'));
let l = await bacaLkk(p, id);
cek('snapshot IDA 2 tabel, ESA 4 tabel', Object.keys(l.calibratorSnapshot.ida.tabel).length === 2 && Object.keys(l.calibratorSnapshot.esa.tabel).length === 4, JSON.stringify(Object.keys(l.calibratorSnapshot.ida?.tabel || {})));
cek('tanpa geser samping', !(await geser(p)));
await p.fill('#iden-merek', 'Terumo'); await p.fill('#iden-tipe', 'TE-LM'); await p.fill('#iden-noSeri', 'SN1');
await p.locator('#iden-rentangUkur').pressSequentially('1 - 999');
t = await teks(p);
cek('identitas mengikuti Excel: label Merk Pabrik/No. Seri; TANPA "Jenis skala"; resolusi bukan pilihan', /Merk Pabrik/.test(t) && /No\. Seri/.test(t) && /Tanggal penerimaan barang kalibrasi/.test(t) && !/Jenis skala/.test(t) && await p.getByRole('radio', { name: /mL\/h|Digital|Analog/ }).count() === 0, t.slice(0, 500));
await p.locator('#iden-resolusi').pressSequentially('0,1');
cek('resolusi diisi bebas & tersimpan sebagai angka', await dataTersimpan(p, id, (x) => x.data.identitas?.resolusi === 0.1));
await p.fill('#iden-tanggalPenerimaan', '2026-10-19'); await p.fill('#iden-ruang', 'ICU');

// ---------- 2. Lingkungan ----------
await ke(p, 2);
await p.locator('#ling-suhu-awal').pressSequentially('25'); await p.fill('#ling-suhu-akhir', '25'); await p.fill('#ling-rh-awal', '50'); await p.fill('#ling-rh-akhir', '50');

// ---------- 3. Fisik & fungsi ----------
await ke(p, 3);
t = await teks(p);
cek('fisik: 3 butir tampil; bawaan Baik & Berfungsi tersimpan', /Badan dan Permukaan/.test(t) && /Kontrol dan Indikator/.test(t) && /Kabel dan Aksesori/.test(t)
  && await dataTersimpan(p, id, (x) => x.data.fisik?.badan?.fisik === 'Baik' && x.data.fisik?.badan?.fungsi === 'Berfungsi' && x.data.fisik?.kabel?.fungsi === 'Berfungsi'), t.slice(0, 500));
cek('fisik: tanpa geser samping', !(await geser(p)));

// ---------- 4. Keselamatan listrik ----------
await ke(p, 4);
t = await teks(p);
cek('listrik: 4 butir tampil dengan batas', /Tegangan Catu Daya/.test(t) && /Resistansi Pembumian/.test(t) && /Isolasi Resistansi/.test(t) && /Arus Bocor Pembumian/.test(t) && /≤ 500/.test(t), t.slice(0, 600));
cek('listrik: sebelum diisi hasil "-"', (await p.getByRole('status', { name: /^Hasil Tegangan/ }).innerText()).includes('-'));
for (const [k, v] of Object.entries(K.data.listrik as Record<string, number>)) await p.fill(`#listrik-${k}`, String(v).replace('.', ','));
cek('listrik: tersimpan sebagai angka', await dataTersimpan(p, id, (x) => x.data.listrik?.tegangan === 221.5 && x.data.listrik?.resistansi_pembumian === 0.12 && x.data.listrik?.arus_bocor === 45));
cek('listrik: keempat butir menampilkan LAIK', await tunggu(p, () => document.querySelectorAll('[aria-label^="Hasil "]').length >= 4 && Array.from(document.querySelectorAll('[aria-label^="Hasil "]')).every((e) => /LAIK/.test((e as HTMLElement).innerText) && !/TIDAK/.test((e as HTMLElement).innerText))), (await teks(p)).slice(0, 900));
cek('listrik: tanpa geser samping', !(await geser(p)));

// ---------- 5. Kinerja ----------
await ke(p, 5);
for (const s of TPL.kinerja.titikAliran) {
  const run = K.data.aliran[String(s)] as number[];
  for (let i = 0; i < run.length; i++) await p.fill(`#aliran-${s}-${i}`, String(run[i]).replace('.', ','));
}
await p.fill('#sumbat-setting', '100');
for (let i = 0; i < TPL.kinerja.pengulangan; i++) await p.fill(`#sumbat-${i}`, String(K.data.sumbat.bacaan[i]).replace('.', ','));
cek('kinerja: data aliran & penyumbatan tersimpan', await dataTersimpan(p, id, (x) => x.data.aliran?.['10']?.length === 5 && x.data.aliran?.['50']?.[0] === K.data.aliran['50'][0] && x.data.sumbat?.bacaan?.length === 5 && x.data.sumbat?.bacaan?.[4] === K.data.sumbat.bacaan[4]));
cek('kinerja: 5 setting + penyumbatan menampilkan hasil LAIK', await tunggu(p, () => { const h = Array.from(document.querySelectorAll('[aria-label^="Hasil setting"], [aria-label="Hasil penyumbatan"]')) as HTMLElement[]; return h.length === 6 && h.every((e) => /Rata-rata/.test(e.innerText) && /LAIK/.test(e.innerText) && !/TIDAK/.test(e.innerText)); }), (await teks(p)).slice(0, 1200));
cek('kinerja: tepat 5 kotak bacaan per setting (KMK), tidak ada kotak ke-6', await p.evaluate(() => !!document.getElementById('aliran-10-4') && !document.getElementById('aliran-10-5') && !!document.getElementById('sumbat-4') && !document.getElementById('sumbat-5')));
cek('kinerja: tanpa geser samping', !(await geser(p)));
cek('kinerja: kotak angka ≥ 16 px & ≥ 48 px tinggi', await p.evaluate(() => { const e = document.getElementById('aliran-10-0') as HTMLInputElement; const c = getComputedStyle(e); return parseFloat(c.fontSize) >= 16 && e.getBoundingClientRect().height >= 47.5; }));

// ---------- 6. Kesimpulan & ringkasan ----------
await ke(p, 6);
t = await teks(p);
cek('kesimpulan: LAIK PAKAI + skor 100', /LAIK PAKAI/.test(t) && !/TIDAK LAIK PAKAI/.test(t) && /100/.test(t), t.slice(0, 700));
await ke(p, 7);
t = await teks(p);
cek('ringkasan: merek, nomor seri, aliran tampil; tombol Selesai ada', /Terumo/.test(t) && /SN1/.test(t) && /Selesai/.test(t), t.slice(0, 900));
cek('ringkasan: tidak ada kekurangan', !/Belum lengkap/.test(t) || /Semua bagian lengkap/.test(t), t.slice(0, 900));
cek('ringkasan: tanpa geser samping', !(await geser(p)));
await p.context().close();

// ---------- 7. Nilai TIDAK LAIK: tekanan penyumbatan melewati batas ----------
({ p, id } = await layar());
await dataTersimpan(p, id, (x) => !!x.calibratorSnapshot?.ida && !!x.calibratorSnapshot?.esa && !!x.calibratorSnapshot?.termohigrometer);
await p.waitForTimeout(500);
await p.evaluate(async (i) => { const w = window as any; const x = await w.tera.ambilLkk(i); x.data = { ...x.data, sumbat: { setting: 100, bacaan: [30, 30, 30, 30, 30, 30] } }; await w.tera.tx(['lkk'], 'readwrite', (s: any) => { s.lkk.put(x); }); w.pasang(); }, id);
await p.waitForSelector('.t-lkk-layar');
await ke(p, 5);
cek('penyumbatan 30 psi → TIDAK LAIK', await tunggu(p, () => /TIDAK LAIK/.test((document.querySelector('[aria-label="Hasil penyumbatan"]') as HTMLElement | null)?.innerText || '')), await p.evaluate(() => (document.querySelector('[aria-label="Hasil penyumbatan"]') as HTMLElement | null)?.innerText || 'tidak ada'));
await p.context().close();

// ---------- 8. Kasus terburuk: nama RS sangat panjang, huruf 200 %, tablet landscape ----------
({ p, id } = await layar({ lebar: 360, tinggi: 740, namaRs: NAMA_RS }));
await ke(p, 5);
await p.addStyleTag({ content: 'body{zoom:2}' });
await p.waitForTimeout(150);
cek('huruf 200 %: bagian Kinerja tanpa geser samping', !(await geser(p)));
await ke(p, 4);
cek('huruf 200 %: bagian Listrik tanpa geser samping', !(await geser(p)));
await p.context().close();
({ p, id } = await layar({ lebar: 1180, tinggi: 820 }));
await ke(p, 5);
await p.fill('#aliran-10-0', '1,1');
await p.setViewportSize({ width: 820, height: 1180 });
await p.waitForTimeout(150);
cek('tablet diputar: isian bacaan tetap ada', await p.evaluate(() => (document.getElementById('aliran-10-0') as HTMLInputElement).value === '1,1') && await dataTersimpan(p, id, (x) => x.data.aliran?.['10']?.[0] === 1.1));
cek('tablet: tanpa geser samping', !(await geser(p)));
await p.context().close();

await br.close();
console.log(`\n${lulus} lulus, ${gagal} gagal`);
if (gagal) process.exit(1);
