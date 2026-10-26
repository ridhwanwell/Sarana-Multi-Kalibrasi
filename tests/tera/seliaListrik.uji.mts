// Uji layar SELIA untuk LKK KESELAMATAN LISTRIK di Chromium sungguhan.
// SeliaTeraLkk + SeliaTeraPompa + SeliaTeraEditor = kode ASLI; ikon/AuthContext/apiFetch ditiru.
// Jalankan: npm run test:tera:selia-listrik
import { chromium } from 'playwright';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { TEMPLATE_KESELAMATAN_LISTRIK_V1 as TPL } from '../../src/tera/shared/templates/keselamatanListrik.ts';
import { buatJejakHitung } from '../../src/tera/shared/jejak.ts';
import { daftarStandar, jepretStandar, susunPilihan } from '../../src/tera/shared/isian.ts';

const akar = fileURLToPath(new URL('../../', import.meta.url));
const ASAL = 'http://localhost:9992';
const fx = JSON.parse(readFileSync(new URL('./fixtures/listrik-golden-v1.json', import.meta.url), 'utf8'));
const K = fx.kasus[0];

const baris = (asetId: string, nama: string, parameter: string, tabel: any[]) => ({
  asetId, nama, merk: 'M', model: 'T', nomorSeri: '1', parameter, nomorSertifikat: 'SK', tertelusur: 'KAN', tanggalKalibrasi: '2026-01-30', berlakuSampai: '2027-01-30', rekomendasi: false,
  points: tabel.map((t) => ({ titik: t.titik, koreksiNaik: t.koreksi, koreksiTurun: t.koreksi, u95Naik: t.u95, u95Turun: t.u95 })),
});
const L = K.kalibrator.listrik;
const master: any[] = [
  baris('CAL-042', 'Electrical Safety Analyzer', 'tegangan_v', L.tegangan), baris('CAL-042', 'Electrical Safety Analyzer', 'resistansi_ohm', L.resistansi),
  baris('CAL-042', 'Electrical Safety Analyzer', 'isolasi_mohm', L.isolasi), baris('CAL-042', 'Electrical Safety Analyzer', 'arus_bocor_ua', L.arus_bocor),
  { ...baris('CAL-027', 'Thermohygrometer HTC-1', 'suhu_c', [{ titik: 20, koreksi: 0.1, u95: 0.3 }]), rekomendasi: true },
  { ...baris('CAL-027', 'Thermohygrometer HTC-1', 'kelembaban_rh', [{ titik: 40, koreksi: 1, u95: 2 }]), rekomendasi: true },
];
const snapshot: any = {};
for (const d of daftarStandar(TPL as any)) { const p = susunPilihan(d, master as any); snapshot[d.peran] = jepretStandar(d, p[0] as any, (x: any) => JSON.parse(JSON.stringify(x))); }
const FISIK = { badan: { fisik: 'Baik', fungsi: 'Berfungsi' }, kontrol: { fisik: 'Baik', fungsi: 'Berfungsi' }, kabel: { fisik: 'Baik', fungsi: 'Berfungsi' } };
const data = {
  identitas: { namaAlat: 'ESWT', merek: 'BTL', tipe: 'Curapuls 970', noSeri: 'ESWT-1', tanggalPenerimaan: '2026-10-26', ruang: 'Fisioterapi' },
  lingkungan: { suhuAwal: 25, suhuAkhir: 25, rhAwal: 50, rhAkhir: 50 }, fisik: FISIK,
  // Tipe B → arus bocor AP tidak berlaku
  klasifikasi: { kelas: 'Kelas I', tipeAP: 'Tipe B', kabelPE: 'Dapat dilepas - bersama kabel', metodeBocor: 'Langsung' },
  listrik: { tegangan: 221.5, resistansi_pembumian: 0.12, resistansi_isolasi: 250, arus_bocor_peralatan: 45 },
};
const jejak = buatJejakHitung(TPL as any, data, snapshot);
const detail = {
  lkk: { id: '11111111-1111-4111-8111-111111111111', bo: '999', noLabel: '999.0012', status: 'submitted', jadwalId: 'j', tanggalKalibrasi: '2026-10-26', alatTambahan: true, jumlahTitik: 0, clientVersion: 3, isTest: true, checksum: 'x', diterimaAt: '2026-10-26T01:00:00Z', templateKode: TPL.kode_alat, templateVersi: TPL.versi, namaAlat: 'ESWT', revisi: 0, accOlehNama: null, accAt: null, namaRs: 'RS UJI TERA (DATA UJI)', kota: 'Solo', teknisi: 'Ridhwan' },
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

cek('judul memuat ESWT + nomor label', /ESWT/.test(t) && /999\.0012/.test(t));
cek('identitas: Nama Alat ESWT, template keselamatan_listrik v1', /Nama Alat/.test(t) && t.includes('keselamatan_listrik v1'), t.slice(0, 600));
cek('listrik: klasifikasi tampil', /Kelas proteksi/.test(t) && /Tipe B\b/.test(t) && /Langsung/.test(t), t.slice(0, 1500));
cek('listrik: 5 baris; AP "Tidak berlaku"; tegangan tidak ikut kesimpulan', (await p.locator('#b-listrik').locator('xpath=..').locator('tbody tr').count()) === 5 && /Tidak berlaku untuk klasifikasi/.test(t) && /tidak ikut kesimpulan/.test(t));
cek('listrik: batas menurut klasifikasi (≤ 0,3; ≤ 500; > 2)', /≤ 0,3/.test(t) && /≤ 500/.test(t) && /> 2/.test(t));
cek('tidak ada bagian Aliran / Penyumbatan', await p.locator('#b-aliran').count() === 0 && await p.locator('#b-sumbat').count() === 0);
cek('penomoran: Alat standar 5, Kesimpulan 6, Pratinjau 7', /5\. Alat standar/.test(t) && /6\. Kesimpulan/.test(t) && /7\. Pratinjau sertifikat/.test(t), (t.match(/\d\. [A-Z][a-z]+/g) || []).join('|'));
cek('kesimpulan: Laik Pakai', /Laik Pakai/.test(t));
cek('tanpa geser samping di layar HP', !(await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)));

// ---- Editor ----
await p.getByRole('button', { name: /Ubah isian/ }).click();
await p.waitForSelector('#ubah-listrik-tegangan', { timeout: 5000 });
cek('editor: klasifikasi (4 pilihan) + 5 kotak listrik, tanpa aliran/penyumbatan', await p.locator('[id^="ubah-klas-"]').count() === 4 && await p.locator('[id^="ubah-listrik-"]').count() === 5 && await p.locator('[id^="ubah-aliran-"]').count() === 0 && await p.locator('[id^="ubah-sumbat-"]').count() === 0);
await p.selectOption('#ubah-klas-tipeAP', 'Tipe CF');
await p.fill('#ubah-listrik-arus_bocor_ap', '12');
await p.locator('#ubah-listrik-arus_bocor_ap').press('Tab');
await p.getByRole('button', { name: /Simpan perubahan/ }).click();
await p.waitForFunction(() => (window as any).__kirim.length === 1, null, { timeout: 5000 });
const kirim = await p.evaluate(() => (window as any).__kirim[0]);
cek('simpan: Tipe CF & bacaan AP 12 terkirim; data lain utuh', kirim.data.klasifikasi.tipeAP === 'Tipe CF' && kirim.data.listrik.arus_bocor_ap === 12 && kirim.data.listrik.tegangan === 221.5 && kirim.data.identitas.namaAlat === 'ESWT', JSON.stringify(kirim.data.klasifikasi));
await br.close();
console.log(`\n${lulus} lulus, ${gagal} gagal`);
if (gagal) process.exit(1);
