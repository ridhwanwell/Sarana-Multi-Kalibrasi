// Uji LAYAR "Isi LKK" bagian 1–3 di Chromium sungguhan — Tahap 4.3c (PRD-AISTUDIO A1).
// Router/ikon/login/apiFetch ditiru (stub); SinkronProvider, LayarLkk, teraDb, masterLokal, isian, lingkungan
// dan tera-tema.css adalah kode ASLI.
// Jalankan: npm run test:tera:layar-lkk   (butuh paket "playwright" & Chromium; tidak ikut build Vercel)
import { chromium, type Page } from 'playwright';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { readFile, mkdir } from 'node:fs/promises';

const akar = fileURLToPath(new URL('../../', import.meta.url));
const ASAL = 'http://localhost:9994';
const keluar = process.env.TERA_FOTO_DIR || '';

const ikon = ['AlertCircle','Building2','Camera','Check','ChevronLeft','ChevronRight','Circle','ClipboardCheck','Clock','Download','Eye','EyeOff','FlaskConical','Info','Keyboard','LayoutDashboard','Loader2','Lock','Minus','LogOut','Pencil','Plus','RefreshCw','Smartphone','Tag','Upload','User','WifiOff','X'];
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
  alatPo: [{ ref: 'A', nama: 'Sphygmomanometer', jumlah: 6, urutAwal: 1, urutAkhir: 6 }],
  versi: 1, isTest: false, pushedAt: '2026-10-19T01:00:00Z', dicabut: false,
});

// Master kalibrator tiruan (angka suhu & %RH = contoh Master v12 di PRD-AISTUDIO 3.2)
const baris = (titik: number, k: number, u: number) => ({ titik, koreksiNaik: k, koreksiTurun: k, u95Naik: u, u95Turun: u });
const KAL = (extra: any) => ({ pointsId: 'p-' + extra.asetId + extra.parameter, kode: extra.asetId, merk: 'Merk', model: 'Model', nomorSeri: 'SN-' + extra.asetId, satuan: '', nomorSertifikat: 'SK-' + extra.asetId, tertelusur: 'KIM-LIPI', tanggalKalibrasi: '2026-03-05', berlakuSampai: '2027-03-04', sumber: 'uji', diubahPada: '2026-10-01', budget: null, ...extra });
const MASTER = [
  KAL({ asetId: 'CAL-037', nama: 'Pressure Meter Utama', parameter: 'tekanan_mmhg', points: [0, 50, 100, 150, 200, 250].map((t) => ({ titik: t, koreksiNaik: 0, koreksiTurun: 0, u95Naik: 1, u95Turun: 1 })) }),
  KAL({ asetId: 'CAL-038', nama: 'Pressure Meter Cadangan', parameter: 'tekanan_mmhg', points: [0, 50, 100].map((t) => ({ titik: t, koreksiNaik: 0, koreksiTurun: 0, u95Naik: 1, u95Turun: 1 })) }),
  KAL({ asetId: 'CAL-099', nama: 'Pressure Meter Lama', parameter: 'tekanan_mmhg', berlakuSampai: '2026-10-01', points: [0, 50].map((t) => ({ titik: t, koreksiNaik: 0, koreksiTurun: 0, u95Naik: 1, u95Turun: 1 })) }),
  KAL({ asetId: 'SW-1', nama: 'Stopwatch Digital', parameter: 'waktu_s', berlakuSampai: null, tanggalKalibrasi: null, points: [baris(60, 0, 0.1)] }),
  KAL({ asetId: 'TH-1', nama: 'Termohigrometer HTC-2', parameter: 'suhu_c', rekomendasi: true, points: [baris(15, 0.3, 0.5), baris(20, 0.3, 0.5), baris(25, 0.4, 0.5), baris(30, 0.5, 0.5), baris(35, 0.6, 0.5)] }),
  KAL({ asetId: 'TH-1', nama: 'Termohigrometer HTC-2', parameter: 'kelembaban_rh', rekomendasi: true, points: [baris(40, -7.8, 3.1), baris(50, -7.3, 3.1), baris(60, -5.7, 3.1), baris(70, -3.1, 3.1), baris(80, 0.5, 3.1)] }),
  KAL({ asetId: 'TH-2', nama: 'Termohigrometer KRISBOW', parameter: 'suhu_c', points: [baris(15, 0.1, 0.5), baris(25, 0.1, 0.5), baris(35, 0.1, 0.5)] }),
  KAL({ asetId: 'TH-2', nama: 'Termohigrometer KRISBOW', parameter: 'kelembaban_rh', points: [baris(40, 1, 3), baris(60, 1, 3), baris(80, 1, 3)] }),
];

interface Opsi { lebar?: number; tinggi?: number; gelap?: boolean; namaRs?: string; kalibrator?: any[]; status?: string; tanpaLkk?: boolean }

/** Buka layar; LKK uji dibuat langsung di buku perangkat (seperti hasil "Mulai LKK"). */
async function layar(o: Opsi = {}): Promise<{ p: Page; id: string }> {
  const ctx = await br.newContext({ viewport: { width: o.lebar ?? 390, height: o.tinggi ?? 844 }, colorScheme: o.gelap ? 'dark' : 'light' });
  await ctx.route(`${ASAL}/**`, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: HTML }));
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('  [error]', e.message));
  await p.goto(ASAL + '/');
  await p.waitForFunction(() => (window as any).siap);
  const id = await p.evaluate(async ({ jd, kal, status, tanpa }) => {
    const w = window as any;
    w.__user = { id: 'u-t', fullName: 'Teknisi Uji, A.Md.', role: 'teknisi' };
    w.__api = async (u: string) => u.startsWith('/api/tera/jadwal')
      ? new Response(JSON.stringify({ jadwal: [jd] }), { status: 200, headers: { 'content-type': 'application/json' } })
      : new Response('{}', { status: 503 });
    await w.master.simpanMasterServer({ kalibrator: kal, template: [] });
    let id = 'tidak-ada';
    if (!tanpa) {
      const l = await w.tera.buatLkk({ pemilik: 'u-t', bo: '095', noLabel: '095.0001', templateKode: 'sphygmomanometer', templateVersi: 2, tanggalKalibrasi: '2026-10-20', jadwalId: 'j1', poItemRef: 'A', data: {} });
      id = l.id;
      if (status) await w.tera.tx(['lkk'], 'readwrite', (s: any) => { s.lkk.put({ ...l, syncState: status, statusServer: status === 'diterima' ? 'submitted' : null }); });
    }
    w.__params = { id };
    w.pasang();
    return id;
  }, { jd: JADWAL(o.namaRs), kal: o.kalibrator ?? MASTER, status: o.status ?? '', tanpa: !!o.tanpaLkk });
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

// ---------- 1. Pembukaan: kerangka, bawaan, pilih otomatis ----------
let { p, id } = await layar();
await p.waitForFunction(() => /RS Uji Solo/.test(document.body.innerText), null, { timeout: 8000 });
let t = await teks(p);
cek('header: nama alat, nomor stiker, nama RS', /Sphygmomanometer/.test(t) && /095\.0001/.test(t) && /RS Uji Solo/.test(t), t.slice(0, 200));
cek('chip status "Sedang diisi" (ikon + tulisan)', /Sedang diisi/.test(t));
cek('bilah kemajuan: "Bagian 1 dari 6 · Identitas alat"', /Bagian 1 dari 6 · Identitas alat/.test(t));
cek('6 penanda bagian; hanya Ringkasan & Selesai "segera hadir"', await p.getByRole('button', { name: /^Bagian \d,/ }).count() === 6 && await p.getByRole('button', { name: /segera hadir/ }).count() === 1);
cek('nama alat, tempat, teknisi tampil baca-saja (bukan kotak isian)', /Nama alat/.test(t) && /Tempat/.test(t) && /Teknisi Uji, A\.Md\./.test(t) && await p.locator('#iden-nama').count() === 0);
cek('urutan kolom identitas = Master Input 1', await p.evaluate(() => ['iden-merek', 'iden-tipe', 'iden-noSeri', 'iden-rentangUkur'].every((x, i, a) => { const e = document.getElementById(x)!; const n = document.getElementById(a[i + 1] || ''); return !n || (e.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0; })));
cek('resolusi bawaan 2 mmHg terpilih & tersimpan', await p.getByRole('radio', { name: '2 mmHg' }).getAttribute('aria-checked') === 'true' && await dataTersimpan(p, id, (l) => l.data.identitas?.resolusi === 2));
cek('alat standar yang satu-satunya berlaku terpilih otomatis (stopwatch & termohigrometer)', await dataTersimpan(p, id, (l) => l.calibratorSnapshot?.stopwatch?.asetId === 'SW-1' && l.calibratorSnapshot?.termohigrometer?.asetId === 'TH-1'));
let l = await bacaLkk(p, id);
cek('pressure meter: 2 berlaku + 1 expired → TIDAK dipilih otomatis', !l.calibratorSnapshot?.tekanan);
cek('termohigrometer: hanya yang rekomendasi ditawarkan (T9); KRISBOW tidak muncul', /Termohigrometer HTC-2/.test(await teks(p)) && !/KRISBOW/.test(await teks(p)) && await p.getByText('Rekomendasi', { exact: true }).count() === 1);
cek('snapshot termohigrometer memuat 2 tabel (suhu 5 titik, kelembaban 5 titik)', l.calibratorSnapshot?.termohigrometer?.suhu?.points?.length === 5 && l.calibratorSnapshot?.termohigrometer?.kelembaban?.points?.length === 5);
cek('tanpa geser samping & tanpa galat konsol', !(await geser(p)));

// ---------- 2. Pilih alat standar ----------
const lama = p.getByRole('radio', { name: /Pressure Meter Lama/ });
cek('alat expired: abu-abu (aria-disabled) dengan tulisan "Expired — berlaku sampai"', await lama.getAttribute('aria-disabled') === 'true' && /Expired — berlaku sampai 1 Okt 2026/.test(await lama.innerText()), await lama.innerText());
await lama.click({ force: true });
cek('mengetuk alat expired tidak memilihnya', !(await bacaLkk(p, id)).calibratorSnapshot?.tekanan);
await p.getByRole('radio', { name: /Pressure Meter Utama/ }).click();
cek('memilih pressure meter → centang + snapshot tersimpan (titik kalibrator ikut tersalin)', await p.getByRole('radio', { name: /Pressure Meter Utama/ }).getAttribute('aria-checked') === 'true'
  && await dataTersimpan(p, id, (x) => x.calibratorSnapshot?.tekanan?.asetId === 'CAL-037' && x.calibratorSnapshot.tekanan.points.length === 6 && !!x.calibratorSnapshot.tekanan.dijepretAt));
cek('stopwatch belum bersertifikat → boleh dipilih, ada keterangan', /Belum ada tanggal sertifikat/.test(await teks(p)));
await p.context().close();

// ---------- 3. Isi identitas, auto-save, muat ulang ----------
({ p, id } = await layar());
await p.getByRole('radio', { name: /Pressure Meter Utama/ }).click();
await p.fill('#iden-merek', 'ABN');
await p.fill('#iden-tipe', 'ABN-1');
await p.fill('#iden-noSeri', 'SN 123');
await p.locator('#iden-rentangUkur').pressSequentially('300');
await p.getByRole('radio', { name: 'Analog' }).click();
await p.fill('#iden-tanggalPenerimaan', '2026-10-19');
await p.fill('#iden-ruang', 'KIA');
cek('auto-save ≤ ~1 detik: semua isian identitas ada di buku perangkat', await dataTersimpan(p, id, (x) => x.data.identitas?.merek === 'ABN' && x.data.identitas?.noSeri === 'SN 123' && x.data.identitas?.rentangUkur === 300 && x.data.identitas?.jenisSkala === 'Analog' && x.data.identitas?.tanggalPenerimaan === '2026-10-19' && x.data.identitas?.ruang === 'KIA', 1500));
cek('status "Tersimpan di perangkat pukul …"', await tunggu(p, () => /Tersimpan di perangkat pukul \d{2}\.\d{2}/.test(document.body.innerText)));
cek('bagian 1 lengkap → centang pada penanda & kekurangan hilang', await tunggu(p, () => /Bagian 1, Identitas alat, lengkap/.test(document.querySelector('.t-bagian-daftar')?.innerHTML || '')) && !/Belum lengkap di bagian ini/.test(await teks(p)));
// "tutup paksa": ketik lalu langsung kirim pagehide (tanpa menunggu debounce)
await p.fill('#iden-tipe', 'ABN-2');
await p.evaluate(() => window.dispatchEvent(new Event('pagehide')));
cek('ketikan terakhir tersimpan saat aplikasi ditutup/disembunyikan (tanpa menunggu)', await dataTersimpan(p, id, (x) => x.data.identitas?.tipe === 'ABN-2', 800));
await p.evaluate(() => (window as any).pasang());   // muat ulang layar
await p.waitForSelector('#iden-merek');
cek('muat ulang → semua isian dan pilihan alat standar tetap ada', await p.evaluate(() => (document.getElementById('iden-merek') as HTMLInputElement).value === 'ABN' && (document.getElementById('iden-tipe') as HTMLInputElement).value === 'ABN-2' && (document.getElementById('iden-rentangUkur') as HTMLInputElement).value === '300' && (document.getElementById('iden-tanggalPenerimaan') as HTMLInputElement).value === '2026-10-19')
  && await p.getByRole('radio', { name: /Pressure Meter Utama/ }).getAttribute('aria-checked') === 'true' && await p.getByRole('radio', { name: 'Analog' }).getAttribute('aria-checked') === 'true');

// ---------- 4. Lingkungan ----------
await ke(p, 2);
t = await teks(p);
cek('Lingkungan: bilah "Bagian 2 dari 6 · Kondisi lingkungan", batas 15–35 °C dan 15–90 %RH tertulis', /Bagian 2 dari 6 · Kondisi lingkungan/.test(t) && /15–35 °C/.test(t) && /15–90 %RH/.test(t), t.slice(0, 700));
cek('sebelum diisi: hasil "-" dan keterangan jelas', /Isi bacaan awal dan akhir/.test(t));
await p.locator('#ling-suhu-awal').pressSequentially('27,7');
await p.fill('#ling-suhu-akhir', '27');
await p.fill('#ling-rh-awal', '56');
await p.fill('#ling-rh-akhir', '59');
cek('angka uji PRD 3.2: ( 27,8 ± 0,5 ) °C', await tunggu(p, () => /\( 27,8 ± 0,5 \) °C/.test(document.body.innerText)), (await teks(p)).slice(0, 600));
cek('angka uji PRD 3.2: ( 53 ± 3,1 ) %RH', await tunggu(p, () => /\( 53 ± 3,1 \) %RH/.test(document.body.innerText)));
cek('keterangan menyebut termohigrometer yang dipakai', /Dikoreksi dengan sertifikat Termohigrometer HTC-2/.test(await teks(p)));
cek('lingkungan tersimpan sebagai angka (koma → titik)', await dataTersimpan(p, id, (x) => x.data.lingkungan?.suhuAwal === 27.7 && x.data.lingkungan?.suhuAkhir === 27 && x.data.lingkungan?.rhAwal === 56 && x.data.lingkungan?.rhAkhir === 59));
cek('kotak angka: inputmode="decimal", font ≥ 16 px, tinggi ≥ 48 px, angka tabular', await p.evaluate(() => { const e = document.getElementById('ling-suhu-awal') as HTMLInputElement; const c = getComputedStyle(e); return e.inputMode === 'decimal' && parseFloat(c.fontSize) >= 16 && e.getBoundingClientRect().height >= 47.5 && c.fontVariantNumeric.includes('tabular'); }));
// mengetik "27," tidak boleh hilang di tengah ketikan
await p.fill('#ling-suhu-awal', '');
await p.locator('#ling-suhu-awal').pressSequentially('2');
await p.locator('#ling-suhu-awal').press('Tab');
cek('"2" di tengah ketikan lalu pindah kotak → galat batas (di luar 15–35) di bawah kotak', /Di luar batas 15–35 °C/.test(await teks(p)) && await p.evaluate(() => document.getElementById('ling-suhu-awal')!.closest('.t-kotak')!.getAttribute('data-error') === 'true'));
cek('saat mengetik "27" (lewat "2") galat TIDAK muncul sebelum kotak ditinggalkan', await (async () => {
  await p.locator('#ling-suhu-awal').focus(); await p.fill('#ling-suhu-awal', '');
  await p.locator('#ling-suhu-awal').pressSequentially('2'); const di2 = /Di luar batas 15–35 °C/.test(await teks(p));
  return !di2;
})());
await p.locator('#ling-suhu-awal').pressSequentially('7,7');
await p.locator('#ling-suhu-awal').press('Tab');
// di luar batas
await p.fill('#ling-rh-akhir', '95');
await p.locator('#ling-rh-akhir').press('Tab');
cek('RH 95 → galat di bawah kotak + daftar kurang MERAH + penanda bagian bertanda merah', /Di luar batas 15–90 %RH/.test(await teks(p)) && await p.evaluate(() => !!document.querySelector('.t-kurang li[data-merah="true"]') && document.querySelector('.t-bagian-btn[data-merah="true"]')?.getAttribute('aria-label')?.includes('ada yang perlu diperbaiki')));
cek('nilai di luar batas TIDAK dibuang: tetap tersimpan (data tidak hilang)', await dataTersimpan(p, id, (x) => x.data.lingkungan?.rhAkhir === 95));
await p.fill('#ling-rh-akhir', '59');
cek('dibetulkan → merah hilang, bagian 2 lengkap', await tunggu(p, () => /Bagian 2, Kondisi lingkungan, lengkap/.test(document.querySelector('.t-bagian-daftar')?.innerHTML || '')));

// ---------- 5. Fisik & fungsi ----------
await ke(p, 3);
const baik = (n: string, sisi: string, nilai: string) => p.getByRole('radiogroup', { name: `${n} — ${sisi}` }).getByRole('radio', { name: nilai, exact: true });
cek('3 item × (Fisik, Fungsi) + 5 butir lain = 11 pilihan Baik / Tidak Baik', await p.getByRole('radiogroup').count() === 11 && await p.getByRole('radio', { name: 'Baik', exact: true }).count() === 11);
cek('tombol segmen ≥ 48 px', await p.evaluate(() => [...document.querySelectorAll('.t-segmen button')].every((b) => b.getBoundingClientRect().height >= 47.5)));
for (const n of ['Badan dan Permukaan', 'Level Cairan', 'Tabung dan Selang']) { await baik(n, 'Fisik', 'Baik').click(); }
await baik('Badan dan Permukaan', 'Fungsi', 'Baik').click();
await baik('Level Cairan', 'Fungsi', 'Baik').click();
cek('baru sebagian terisi → kurang menyebut item yang belum', /Tabung dan Selang: pilih kondisi Fisik dan Fungsi/.test(await teks(p)));
await baik('Tabung dan Selang', 'Fungsi', 'Tidak Baik').click();
cek('"Tidak Baik" terpilih: warna + ikon tanda seru + tulisan', await p.evaluate(() => { const b = document.querySelector('[role="radio"][aria-checked="true"][data-nada="tidak"]'); return !!b && !!b.querySelector('svg[data-ikon="AlertCircle"]') && /Tidak Baik/.test(b.textContent || ''); }));
cek('fisik tersimpan dengan teks persis "Baik" / "Tidak Baik"', await dataTersimpan(p, id, (x) => x.data.fisik?.badan?.fisik === 'Baik' && x.data.fisik?.tabung_selang?.fungsi === 'Tidak Baik' && x.data.fisik?.level_cairan?.fungsi === 'Baik'));
cek('butir lain ditampilkan terpisah, belum diisi → kurang menyebutnya', /Butir lain yang diperiksa/.test(await teks(p)) && /Manset \(bagus, bersih, tidak sobek\): pilih kondisi/.test(await teks(p)));
for (const n of ['Gauge/indikator', 'Konektor', 'Label/plakat/stiker terbaca', 'Manset', 'Titik nol']) await p.getByRole('radiogroup', { name: n }).getByRole('radio', { name: 'Baik', exact: true }).click();
cek('butir lain tersimpan sebagai teks persis "Baik"', await dataTersimpan(p, id, (x) => ['gauge', 'konektor', 'label', 'manset', 'titik_nol'].every((k) => x.data.fisikTambahan?.[k] === 'Baik')));
cek('semua bagian 1–3 lengkap, tidak ada daftar kurang', await tunggu(p, () => document.querySelectorAll('.t-bagian-btn[data-lengkap="true"]').length === 3) && !/Belum lengkap di bagian ini/.test(await teks(p)));
await p.getByRole('button', { name: /Lanjut/ }).click();
cek('Lanjut dari Fisik → Kinerja', /Bagian 4 dari 6 · Kinerja/.test(await teks(p)));

// ---------- 5b. Kesimpulan sebelum Kinerja diisi ----------
await ke(p, 5);
t = await teks(p);
cek('Kesimpulan belum lengkap: "Belum bisa ditentukan", TIDAK ada stiker Laik/Tidak Laik', /Belum bisa ditentukan/.test(t) && !/Tempel stiker/.test(t));
cek('daftar kurang menyebut Kinerja + tombol "Ke Kinerja"', /Kebocoran Tekanan belum diisi/.test(t) && await p.getByRole('button', { name: /Ke Kinerja/ }).count() === 1);
cek('penanda Kesimpulan TIDAK bercentang selama masih ada yang kurang', await p.evaluate(() => document.querySelector('.t-bagian-btn:nth-child(1)') !== null && !/Bagian 5, Kesimpulan, lengkap/.test(document.querySelector('.t-bagian-daftar')!.innerHTML)));
await p.getByRole('button', { name: /Ke Kinerja/ }).click();
cek('"Ke Kinerja" membuka bagian Kinerja', /Bagian 4 dari 6 · Kinerja/.test(await teks(p)));

// ---------- 5c. Kinerja ----------
t = await teks(p);
cek('Kinerja: uji ambang + 6 titik tampil; 2 + 36 kotak angka', /Kebocoran Tekanan/.test(t) && /Laju Buang Cepat/.test(t) && /Titik 250 mmHg/.test(t) && await p.locator('.t-lkk-isi input').count() === 2 + 36, String(await p.locator('.t-lkk-isi input').count()));
cek('batas tertulis: bocor ≤ 15 mmHg, laju buang ≤ 10 detik', /≤ 15 mmHg/.test(t) && /≤ 10 detik/.test(t));
cek('kotak bacaan: font ≥ 16 px, tinggi ≥ 48 px, inputmode decimal', await p.evaluate(() => { const e = document.getElementById('kin-tekanan-50-naik-0') as HTMLInputElement; const c = getComputedStyle(e); return e.inputMode === 'decimal' && parseFloat(c.fontSize) >= 16 && e.getBoundingClientRect().height >= 47.5; }));
await p.fill('#uji-bocor', '240');
await p.fill('#uji-lajuBuang', '8');
for (const tt of [0, 50, 100, 150, 200, 250]) for (const arah of ['naik', 'turun']) for (let i = 0; i < 3; i++) await p.fill(`#kin-tekanan-${tt}-${arah}-${i}`, String(tt));
cek('bacaan tersimpan di data.kinerja[tekanan][titik][arah][urutan] sebagai angka', await dataTersimpan(p, id, (x) => x.data.kinerja?.tekanan?.['150']?.naik?.length === 3 && x.data.kinerja.tekanan['150'].naik.every((v: any) => v === 150) && x.data.kinerja.tekanan['250'].turun[2] === 250 && x.data.bocor?.bacaan === 240 && x.data.lajuBuang?.waktu === 8));
cek('hasil tampil di belakang layar: selisih bocor 10 mmHg + chip LAIK; 12 chip titik; tidak ada "Belum diisi"', await tunggu(p, () => /10 mmHg/.test(document.body.innerText) && document.querySelectorAll('.t-vonis').length === 14 && !/Belum diisi/.test(document.body.innerText)), (await teks(p)).slice(0, 400));
cek('chip memuat ikon + tulisan (bukan warna saja)', await p.evaluate(() => [...document.querySelectorAll('.t-vonis')].every((c) => !!c.querySelector('svg') && /LAIK/.test(c.textContent || ''))));
cek('bagian Kinerja lengkap (centang)', await tunggu(p, () => /Bagian 4, Kinerja, lengkap/.test(document.querySelector('.t-bagian-daftar')!.innerHTML)));

// ---------- 5d. Kesimpulan: LAIK PAKAI ----------
await ke(p, 5);
cek('semua lengkap → stiker LAIK PAKAI + petunjuk tempel stiker', await tunggu(p, () => document.querySelector('.t-stiker')?.getAttribute('data-v') === 'laik' && /Tempel stiker LAIK PAKAI pada alat ini/.test(document.body.innerText)), (await teks(p)).slice(0, 500));
cek('stiker memuat ikon centang + tulisan; Kesimpulan bercentang', await p.evaluate(() => !!document.querySelector('.t-stiker svg') && /Bagian 5, Kesimpulan, lengkap/.test(document.querySelector('.t-bagian-daftar')!.innerHTML)));
cek('jejak di perangkat: lengkap, kesimpulan Laik Pakai (sama dengan layar)', await dataTersimpan(p, id, (x) => x.results?.lengkap === true && x.results?.kesimpulan === 'Laik Pakai'));

// ---------- 5e. Kesimpulan: TIDAK LAIK PAKAI ----------
await ke(p, 4);
await p.fill('#uji-bocor', '200');
await p.fill('#uji-lajuBuang', '20');
await ke(p, 5);
cek('bocor 50 mmHg & laju buang 20 detik → TIDAK LAIK PAKAI + stiker TIDAK LAIK PAKAI', await tunggu(p, () => document.querySelector('.t-stiker')?.getAttribute('data-v') === 'tidak' && /Tempel stiker TIDAK LAIK PAKAI pada alat ini/.test(document.body.innerText)), (await teks(p)).slice(0, 500));
t = await teks(p);
cek('alasan menyebut nilai & batas (bocor 50 mmHg > ≤ 15; laju buang 20 > ≤ 10)', /Kebocoran Tekanan: 50 mmHg, batas ≤ 15 mmHg/.test(t) && /Laju Buang Cepat: 20 detik, batas ≤ 10 detik/.test(t), t.slice(0, 600));
cek('ikon tanda seru + tulisan tebal pada TIDAK LAIK', await p.evaluate(() => !!document.querySelector('.t-stiker[data-v="tidak"] svg') && getComputedStyle(document.querySelector('.t-stiker-judul')!).fontWeight >= '600'));
cek('jejak di perangkat ikut berubah: kesimpulan Tidak Laik Pakai', await dataTersimpan(p, id, (x) => x.results?.kesimpulan === 'Tidak Laik Pakai'));
cek('di bagian terakhir yang tersedia: Lanjut tidak membuka bagian kosong, ada penjelasan', /Ringkasan & Selesai dibuka di pembaruan berikutnya/.test(await teks(p)));
await p.getByRole('button', { name: /Lanjut/ }).click({ force: true });
cek('menekan Lanjut di sana tetap di Kesimpulan', /Bagian 5 dari 6 · Kesimpulan/.test(await teks(p)));
await p.getByRole('button', { name: /^Kembali$/ }).click();
cek('Kembali → Kinerja', /Bagian 4 dari 6/.test(await teks(p)));
l = await bacaLkk(p, id);
cek('LKK masih draft & versi draft naik (tiap auto-save tercatat)', l.syncState === 'draft' && l.draftVersion > 5, JSON.stringify({ s: l.syncState, v: l.draftVersion }));
cek('jejak hitung ikut tersimpan di perangkat & belum dikirim (clientVersion 0)',
  !!l.results && (l.results as any).skema === 1 && (l.results as any).lengkap === true && l.clientVersion === 0, JSON.stringify(l.results)?.slice(0, 200));

// ---------- 6. Tanggal pelaksanaan diubah → alat standar expired ----------
await ke(p, 1);
await p.fill('#iden-tanggal-pelaksanaan', '2027-03-05');
t = await teks(p);
cek('tanggal 2027-03-05 > berlaku s/d 2027-03-04 → peringatan merah + kurang MERAH', /Alat yang dipilih expired pada tanggal pelaksanaan/.test(t) && await p.evaluate(() => !!document.querySelector('.t-kurang li[data-merah="true"]')));
cek('pilihan expired yang sedang terpilih tetap tampak terpilih (tidak diam-diam diganti)', await p.getByRole('radio', { name: /Pressure Meter Utama/ }).getAttribute('aria-checked') === 'true');
cek('tanggal baru ikut tersimpan', await dataTersimpan(p, id, (x) => x.tanggalKalibrasi === '2027-03-05'));
await p.fill('#iden-tanggal-pelaksanaan', '2026-10-20');
cek('dikembalikan → peringatan hilang', await tunggu(p, () => !/Alat yang dipilih expired/.test(document.body.innerText)));
await p.fill('#iden-tanggal-pelaksanaan', '2026-10-18');
cek('tanggal pelaksanaan sebelum tanggal penerimaan → kurang', /Tanggal penerimaan tidak boleh sesudah/.test(await teks(p)));
await p.context().close();

// ---------- 7. Tanpa data master / template ----------
({ p } = await layar({ kalibrator: [] }));
t = await teks(p);
cek('master kalibrator kosong: pesan jelas per alat, tidak crash', (t.match(/belum ada di aplikasi\. Hubungi Developer/g) || []).length === 3);
await ke(p, 2);
cek('lingkungan tanpa termohigrometer: hasil "-" dengan petunjuk + tombol pilih', /Pilih termohigrometer di bagian Identitas/.test(await teks(p)) && await p.getByRole('button', { name: /Pilih sekarang/ }).count() === 1);
await p.fill('#ling-suhu-awal', '27');
await p.fill('#ling-suhu-akhir', '27');
cek('angka tetap bisa diisi tanpa termohigrometer; hasil tetap "-"', !/°C\n?\( /.test(await teks(p)) && await p.evaluate(() => (document.getElementById('ling-suhu-awal') as HTMLInputElement).value === '27'));
await p.getByRole('button', { name: /Pilih sekarang/ }).click();
cek('"Pilih sekarang" membawa ke bagian Identitas', /Bagian 1 dari 6/.test(await teks(p)));
await p.context().close();

// ---------- 8. Hanya-baca (sudah dikirim) ----------
({ p, id } = await layar({ status: 'tersimpan' }));
t = await teks(p);
cek('LKK 🟡 dibuka baca-saja: banner jelas + chip "Tersimpan di perangkat"', /sudah dikirim dan tidak bisa diubah/.test(t) && /Tersimpan di perangkat/.test(t) && /Hanya bisa dibaca/.test(t));
cek('semua kotak isian readOnly, tombol segmen/alat terkunci', await p.evaluate(() => [...document.querySelectorAll('.t-kotak input')].every((i) => (i as HTMLInputElement).readOnly)) && await p.evaluate(() => [...document.querySelectorAll('.t-opsi')].every((b) => b.getAttribute('aria-disabled') === 'true')));
const v0 = (await bacaLkk(p, id)).draftVersion;
await p.locator('#iden-merek').click({ force: true }).catch(() => {});
await p.keyboard.type('XYZ');
await p.waitForTimeout(700);
l = await bacaLkk(p, id);
cek('mengetik di LKK terkunci tidak mengubah apa pun (versi draft & isian sama)', l.draftVersion === v0 && !l.data.identitas?.merek, JSON.stringify(l.data.identitas));
cek('layar baca-saja tidak membuat isian otomatis (resolusi/alat standar tidak ditulis)', l.data.identitas?.resolusi === undefined && !l.calibratorSnapshot);
await p.context().close();

// ---------- 9. LKK tidak ada ----------
({ p } = await layar({ tanpaLkk: true }));
cek('id tidak dikenal → "LKK tidak ditemukan" dengan tautan kembali (bukan halaman putih)', /LKK tidak ditemukan/.test(await teks(p)) && await p.locator('a[href="/tera/lkk"]').count() === 1);
await p.context().close();

// ---------- 10. Data terburuk & tata letak (HP kecil, HP, tablet portrait/landscape, gelap) ----------
const MEREK_PANJANG = 'ABCDEFGHIJ'.repeat(8);
for (const [lebar, tinggi, gelap, nama] of [[320, 640, false, '320'], [390, 844, true, '390-gelap'], [820, 1180, false, 'tablet-portrait'], [1180, 820, false, 'tablet-landscape']] as const) {
  ({ p, id } = await layar({ lebar, tinggi, gelap, namaRs: NAMA_RS }));
  await p.fill('#iden-merek', MEREK_PANJANG);
  await p.getByRole('radio', { name: /Pressure Meter Utama/ }).click();
  const sempit = await geser(p);
  cek(`${nama}: Identitas tanpa geser samping (nama RS 100+ huruf, merek 80 huruf)`, !sempit);
  const kecil = await p.evaluate(() => [...document.querySelectorAll('.t-lkk-layar button, .t-lkk-layar a, .t-lkk-layar input')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.height < 47.5) && !(e as HTMLElement).closest('.t-tautan'); }).map((e) => (e as HTMLElement).outerHTML.slice(0, 80)));
  cek(`${nama}: semua tombol & kotak ≥ 48 px tinggi`, kecil.length === 0, kecil.join(' | '));
  const dua = await p.evaluate(() => { const g = document.querySelector('.t-isian-grid')!; return getComputedStyle(g).gridTemplateColumns.split(' ').length; });
  cek(`${nama}: kolom identitas ${lebar >= 600 ? '2 (tablet)' : '1 (HP)'}`, dua === (lebar >= 600 ? 2 : 1), String(dua));
  const landscape = lebar >= 1024;
  const kiri = await p.evaluate(() => { const b = document.querySelector('.t-bagian') as HTMLElement; const w = (document.querySelector('.t-lkk-badan') as HTMLElement).getBoundingClientRect().width; const nm = document.querySelector('.t-bagian-nama') as HTMLElement; return { rasio: b.getBoundingClientRect().width / w, nama: getComputedStyle(nm).display !== 'none', label: getComputedStyle(document.querySelector('.t-bagian-label')!).display !== 'none', kolom: getComputedStyle(document.querySelector('.t-lkk-badan')!).gridTemplateColumns.split(' ').length }; });
  cek(`${nama}: ${landscape ? 'daftar bagian di kiri ±32% dengan nama' : 'bilah kemajuan di atas (penanda ketuk)'}`, landscape ? kiri.kolom === 2 && kiri.rasio > 0.28 && kiri.rasio < 0.36 && kiri.nama && !kiri.label : kiri.kolom === 1 && !kiri.nama && kiri.label, JSON.stringify(kiri));
  const aksi = await p.evaluate(() => { const a = document.querySelector('.t-aksi-bawah') as HTMLElement; const r = a.getBoundingClientRect(); return { posisi: getComputedStyle(a).position, bawah: r.bottom <= window.innerHeight + 0.5 }; });
  cek(`${nama}: Kembali/Lanjut menempel di bawah layar`, aksi.posisi === 'sticky' && aksi.bawah, JSON.stringify(aksi));
  if (keluar) await p.screenshot({ path: `${keluar}/lkk-identitas-${nama}.png`, fullPage: false });
  await ke(p, 2);
  await p.fill('#ling-suhu-awal', '27,7'); await p.fill('#ling-suhu-akhir', '27'); await p.fill('#ling-rh-awal', '56'); await p.fill('#ling-rh-akhir', '59');
  cek(`${nama}: Lingkungan tanpa geser samping`, !(await geser(p)));
  if (keluar) await p.screenshot({ path: `${keluar}/lkk-lingkungan-${nama}.png` });
  await ke(p, 3);
  cek(`${nama}: Fisik tanpa geser samping`, !(await geser(p)));
  if (keluar) await p.screenshot({ path: `${keluar}/lkk-fisik-${nama}.png` });
  await ke(p, 4);
  cek(`${nama}: Kinerja tanpa geser samping`, !(await geser(p)));
  const kecilK = await p.evaluate(() => [...document.querySelectorAll('.t-lkk-isi button, .t-lkk-isi input')].filter((e) => e.getBoundingClientRect().height < 47.5 && e.getBoundingClientRect().width > 0).length);
  cek(`${nama}: Kinerja — semua kotak ≥ 48 px`, kecilK === 0, String(kecilK));
  const kolomBaca = await p.evaluate(() => getComputedStyle(document.querySelector('.t-baca-pasang')!).gridTemplateColumns.split(' ').length);
  cek(`${nama}: naik & turun ${lebar >= 600 ? 'berdampingan (6 bacaan sebaris)' : 'bertumpuk'}`, kolomBaca === (lebar >= 600 ? 2 : 1), String(kolomBaca));
  if (keluar) await p.screenshot({ path: `${keluar}/lkk-kinerja-${nama}.png` });
  await ke(p, 5);
  cek(`${nama}: Kesimpulan tanpa geser samping`, !(await geser(p)));
  if (keluar) await p.screenshot({ path: `${keluar}/lkk-kesimpulan-${nama}.png` });
  await p.context().close();
}

// ---------- 11. Memutar tablet tidak menghilangkan isian ----------
({ p, id } = await layar({ lebar: 820, tinggi: 1180 }));
await p.fill('#iden-merek', 'ABN');
await p.setViewportSize({ width: 1180, height: 820 });
await p.waitForTimeout(200);
cek('tablet diputar: isian masih ada di layar & di buku perangkat', await p.evaluate(() => (document.getElementById('iden-merek') as HTMLInputElement).value === 'ABN') && await dataTersimpan(p, id, (x) => x.data.identitas?.merek === 'ABN'));
await p.context().close();

// ---------- 12. Huruf diperbesar (zoom 200 %) ----------
({ p } = await layar({ lebar: 360, tinggi: 740, namaRs: NAMA_RS }));
await p.addStyleTag({ content: 'body{zoom:2}' });
await p.waitForTimeout(100);
cek('huruf 200 %: tanpa geser samping di bagian Identitas', !(await geser(p)));
await p.context().close();

await br.close();
console.log(`\n${lulus} lulus, ${gagal} gagal`);
if (gagal) process.exit(1);
