// Uji layar SELIA untuk LKK pompa (Infusion Pump) di Chromium sungguhan — Tahap 6.4.
// SeliaTeraLkk + SeliaTeraPompa + SeliaTeraEditor = kode ASLI; ikon/AuthContext/apiFetch ditiru.
// Jalankan: npm run test:tera:selia-pompa
import { chromium } from 'playwright';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { TEMPLATE_INFUSION_PUMP_V2 as TPL } from '../../src/tera/shared/templates/infusionPump.ts';
import { buatJejakHitung } from '../../src/tera/shared/jejak.ts';
import { daftarStandar, jepretStandar, susunPilihan } from '../../src/tera/shared/isian.ts';

const akar = fileURLToPath(new URL('../../', import.meta.url));
const ASAL = 'http://localhost:9993';
const fx = JSON.parse(readFileSync(new URL('./fixtures/infusion-golden-v1.json', import.meta.url), 'utf8'));
const K = fx.kasus[0];

// ---- data LKK pompa lengkap (angka golden) + snapshot kalibrator, dihitung oleh mesin ASLI ----
const baris = (asetId: string, nama: string, parameter: string, tabel: any[]) => ({
  asetId, nama, merk: 'M', model: 'T', nomorSeri: '1', parameter, nomorSertifikat: 'SK', tertelusur: 'KAN', tanggalKalibrasi: '2026-01-30', berlakuSampai: '2027-01-30', rekomendasi: false,
  points: tabel.map((t) => ({ titik: t.titik, koreksiNaik: t.koreksi, koreksiTurun: t.koreksi, u95Naik: t.u95, u95Turun: t.u95 })),
});
const master: any[] = [
  baris('CAL-030', 'Infusion Device Analyzer', 'aliran_mlh', K.kalibrator.aliran), baris('CAL-030', 'Infusion Device Analyzer', 'tekanan_psi', K.kalibrator.tekanan),
  baris('CAL-042', 'Electrical Safety Analyzer', 'tegangan_v', K.kalibrator.listrik.tegangan), baris('CAL-042', 'Electrical Safety Analyzer', 'resistansi_ohm', K.kalibrator.listrik.resistansi),
  baris('CAL-042', 'Electrical Safety Analyzer', 'isolasi_mohm', K.kalibrator.listrik.isolasi), baris('CAL-042', 'Electrical Safety Analyzer', 'arus_bocor_ua', K.kalibrator.listrik.arus_bocor),
  { ...baris('CAL-027', 'Thermohygrometer HTC-1', 'suhu_c', [{ titik: 20, koreksi: 0.1, u95: 0.3 }]), rekomendasi: true },
  { ...baris('CAL-027', 'Thermohygrometer HTC-1', 'kelembaban_rh', [{ titik: 40, koreksi: 1, u95: 2 }]), rekomendasi: true },
];
const snapshot: any = {};
for (const d of daftarStandar(TPL as any)) { const p = susunPilihan(d, master as any); snapshot[d.peran] = jepretStandar(d, p[0] as any, (x: any) => JSON.parse(JSON.stringify(x))); }
const { jenisSkala: _j, ...iden } = K.data.identitas;
const data = { ...K.data, identitas: { ...iden, merek: 'Braun', tipe: 'Infusomat Space', noSeri: '56799', rentangUkur: '1 - 999 mL/h', resolusi: 1, tanggalPenerimaan: '2026-10-26', ruang: 'ICU' }, lingkungan: { suhuAwal: 25, suhuAkhir: 25, rhAwal: 50, rhAkhir: 50 } };
const jejak = buatJejakHitung(TPL as any, data, snapshot);
const detail = {
  lkk: { id: '11111111-1111-4111-8111-111111111111', bo: '999', noLabel: '999.0011', status: 'submitted', jadwalId: 'j', tanggalKalibrasi: '2026-10-26', alatTambahan: true, jumlahTitik: 0, clientVersion: 3, isTest: true, checksum: 'x', diterimaAt: '2026-10-26T01:00:00Z', templateKode: 'infusion_pump', templateVersi: 2, namaAlat: 'Infusion Pump', revisi: 0, accOlehNama: null, accAt: null, namaRs: 'RS UJI TERA (DATA UJI)', kota: 'Solo', teknisi: 'Ridhwan' },
  data, jejakHitung: jejak, calibratorSnapshot: snapshot, template: TPL,
  pemeriksaan: { clientVersion: 3, jejakCocok: true, bolehAcc: true, kesimpulanServer: jejak?.kesimpulan ?? null, penanda: [], diperiksaAt: '2026-10-26T01:00:01Z' },
  sertifikat: [], driveTersambung: false,
};

// ---- bundel layar ----
const ikon = new Set<string>();
for (const f of ['SeliaTeraLkk', 'SeliaTeraEditor', 'SeliaTeraPompa']) {
  const t = readFileSync(akar + `src/components/${f}.tsx`, 'utf8');
  for (const m of t.matchAll(/import \{([^}]+)\} from 'lucide-react'/g)) m[1].split(',').map((x) => x.trim()).filter(Boolean).forEach((x) => ikon.add(x));
}
ikon.add('FileDown'); ikon.add('Folder'); ikon.add('FolderOpen');
const stubIkon = [...ikon].map((n) => `export const ${n} = (p) => React.createElement('svg', { 'data-ikon': '${n}', width: p.size || 16, height: p.size || 16, 'aria-hidden': 'true', viewBox: '0 0 24 24' }, React.createElement('circle', { cx: 12, cy: 12, r: 8 }));`).join('\n');
const plugin = {
  name: 'stub',
  setup(b: any) {
    b.onResolve({ filter: /^lucide-react$/ }, () => ({ path: 'lucide', namespace: 'stub' }));
    b.onResolve({ filter: /lib\/AuthContext$/ }, () => ({ path: 'auth', namespace: 'stub' }));
    b.onResolve({ filter: /lib\/apiClient$/ }, () => ({ path: 'api', namespace: 'stub' }));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, (a: any) => ({
      contents: a.path === 'lucide' ? `import React from 'react';\n${stubIkon}` : a.path === 'auth' ? `export const useAuth = () => ({ role: 'admin_teknik', user: { id: 'u' } });` : `export const apiFetch = (u, o) => window.__api(u, o);`,
      loader: 'js', resolveDir: akar,
    }));
  },
};
const masuk = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { SeliaTeraLkk } from './src/components/SeliaTeraLkk';
window.pasang = () => createRoot(document.getElementById('app')).render(React.createElement(SeliaTeraLkk, { lkkId: window.__id }));
window.siap = true;
`;
const h = await build({ stdin: { contents: masuk, resolveDir: akar, loader: 'tsx' }, bundle: true, format: 'iife', target: 'es2022', write: false, jsx: 'automatic', nodePaths: ['/opt/npm-tools/node_modules'], plugins: [plugin], define: { 'process.env.NODE_ENV': '"development"' } });
const util = `*,::before,::after{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,sans-serif}.overflow-x-auto{overflow-x:auto}table{border-collapse:collapse}.hidden,.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}.min-w-0{min-width:0}.grid{display:grid}.grid-cols-1{grid-template-columns:1fr}.grid-cols-2{grid-template-columns:1fr 1fr}.grid-cols-3{grid-template-columns:repeat(3,1fr)}.gap-3{gap:12px}.space-y-3>*+*{margin-top:12px}.space-y-6>*+*{margin-top:24px}.space-y-8>*+*{margin-top:32px}.flex{display:flex}.flex-wrap{flex-wrap:wrap}.break-words{overflow-wrap:anywhere}dl,dd,p,h2,h3,h4{margin:0}`;
const HTML = `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><style>${util}</style><body><div id=app></div><script>window.__name=(f)=>f</script><script>${h.outputFiles[0].text}</script>`;

let lulus = 0, gagal = 0;
const cek = (n: string, ok: boolean, d = '') => { ok ? lulus++ : gagal++; console.log((ok ? 'LULUS ' : 'GAGAL ') + n + (ok ? '' : '  ' + d)); };
cek('mesin: LKK uji golden lengkap & Laik Pakai', !!jejak && (jejak as any).lengkap === true && (jejak as any).kesimpulan === 'Laik Pakai', JSON.stringify((jejak as any)?.hasil?.kurang));

const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 390, height: 844 } });
await ctx.route(`${ASAL}/**`, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: HTML }));
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('  [error]', e.message));
await p.goto(ASAL + '/');
await p.waitForFunction(() => (window as any).siap);
await p.evaluate((det) => {
  const w = window as any; w.__id = det.lkk.id; w.__kirim = [];
  w.__api = async (u: string, o: any) => {
    if (u.endsWith('/ubah')) { w.__kirim.push(JSON.parse(o.body)); return new Response(JSON.stringify({ hasil: 'diubah', jumlah: 1, kesimpulan: 'Laik Pakai' }), { status: 200, headers: { 'content-type': 'application/json' } }); }
    return new Response(JSON.stringify(det), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  w.pasang();
}, detail as any);
await p.waitForSelector('#b-listrik', { timeout: 8000 });
let t = await p.evaluate(() => document.body.innerText);

cek('judul memuat Infusion Pump + nomor label', /Infusion Pump/.test(t) && /999\.0011/.test(t));
cek('identitas: label Excel (Merk Pabrik, Resolusi tanpa mmHg), template v2', /Merk Pabrik/.test(t) && /Resolusi/.test(t) && !/mmHg/.test(t) && /infusion_pump v2/.test(t), t.slice(0, 500));
cek('fisik: 3 butir dengan Baik / Berfungsi', /Badan dan Permukaan/.test(t) && /Berfungsi/.test(t));
cek('listrik: 4 butir + Laik semua', ['Tegangan Catu Daya', 'Resistansi Pembumian', 'Isolasi Resistansi', 'Arus Bocor Pembumian'].every((x) => t.includes(x)) && (await p.locator('#b-listrik').locator('xpath=..').locator('tbody tr').count()) === 4);
cek('aliran: 5 setting (25/50/100/150/200) di jejak hitung', await p.locator('#b-aliran').locator('xpath=..').locator('tbody tr').count() === 5);
cek('aliran: tiap baris menampilkan Rata-rata dan chip Laik', await p.evaluate(() => Array.from(document.querySelectorAll('#b-aliran ~ div tbody tr')).every((r) => /Laik/.test((r as HTMLElement).innerText))));
cek('penyumbatan: bacaan 9,8 … tampil + Laik', /9,8; 10,1; 9,9/.test(t) && await p.locator('#b-sumbat').locator('xpath=..').locator('text=/Laik/').count() >= 1);
cek('kesimpulan: Laik Pakai + rincian skor', /Laik Pakai/.test(t) && /Skor total/.test(t));
cek('tanpa geser samping di layar HP (tabel menggulir di dalam kotaknya)', !(await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)));
cek('tidak ada bagian Sphygmo yang salah muncul ("Uji lain", "naik")', !/Uji lain/.test(t) && !/\bnaik\b/i.test(t));

// ---- Editor ----
await p.getByRole('button', { name: /Ubah isian/ }).click();
await p.waitForSelector('#ubah-listrik-tegangan', { timeout: 5000 });
t = await p.evaluate(() => document.body.innerText);
cek('editor: kolom listrik (4), aliran (5×6), penyumbatan (6 + setting)', await p.locator('[id^="ubah-listrik-"]').count() === 4 && await p.locator('[id^="ubah-aliran-"]').count() === 30 && await p.locator('[id^="ubah-sumbat-"]').count() === 7);
cek('editor: resolusi kotak angka (bukan pilihan), tanpa Jenis skala', await p.locator('#ubah-iden-resolusi').count() === 1 && !/Jenis skala/.test(t));
cek('editor: fungsi memakai pilihan Berfungsi / Tidak Berfungsi', await p.evaluate(() => Array.from(document.querySelectorAll('#ubah-fungsi-badan option')).map((o) => (o as HTMLOptionElement).value).join('|')) === '|Berfungsi|Tidak Berfungsi');
await p.fill('#ubah-aliran-25-0', '25,4');
await p.locator('#ubah-aliran-25-0').press('Tab');
await p.getByRole('button', { name: /Simpan perubahan/ }).click();
await p.waitForFunction(() => (window as any).__kirim.length === 1, null, { timeout: 5000 });
const kirim = await p.evaluate(() => (window as any).__kirim[0]);
cek('simpan: bacaan 25,4 terkirim sebagai angka; data lain utuh', kirim.data.aliran['25'][0] === 25.4 && kirim.data.aliran['25'].length === 6 && kirim.data.listrik.tegangan === 221.5 && kirim.data.sumbat.bacaan.length === 6, JSON.stringify(kirim.data.aliran['25']));
await p.waitForSelector('#b-listrik');
cek('setelah simpan: lembar Selia tanpa geser samping (HP)', !(await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)));
await p.setViewportSize({ width: 195, height: 844 });   // setara huruf 200 % pada layar 390 px
await p.waitForTimeout(150);
cek('lembar Selia pada lebar setara zoom 200 %: tanpa geser samping di luar tabel', await p.evaluate(() => { const w = document.documentElement.clientWidth; return Array.from(document.querySelectorAll('body *')).every((e) => e.closest('.overflow-x-auto') || e.getBoundingClientRect().right <= w + 1 || getComputedStyle(e).position === 'absolute'); }));
await br.close();
console.log(`\n${lulus} lulus, ${gagal} gagal`);
if (gagal) process.exit(1);
