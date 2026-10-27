// Uji isian 2 baris (Ridhwan 26 Okt 2026): Tempat / Tanggal / Ruangan / Teknisi kepanjangan TIDAK dikecilkan (ukuran huruf
// sama dengan isian lain), dipecah 2 baris, isi halaman di bawahnya turun satu baris; teks kaki tetap. Berlaku untuk semua sertifikat (Sphygmo, Infusion, Syringe, NIBP, Keselamatan Listrik, Thermohygrometer).
// Jalankan: npm run test:tera:sertifikat-dua-baris   (opsional KOP_NON_KAN=/jalur/kop.pdf, KELUAR=/folder → PDF uji)
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { TATA_LETAK_SPHYGMOMANOMETER } from '../../src/tera/pdf/tataLetakSphygmo.ts';
import { TATA_LETAK_INFUSION_PUMP } from '../../src/tera/pdf/tataLetakPompa.ts';
import { TATA_LETAK_SYRINGE_PUMP } from '../../src/tera/pdf/tataLetakSyringe.ts';
import { TATA_LETAK_NIBP } from '../../src/tera/pdf/tataLetakNibp.ts';
import { TATA_LETAK_KESELAMATAN_LISTRIK } from '../../src/tera/pdf/tataLetakListrik.ts';
import { TATA_LETAK_TERMOHIGRO } from '../../src/tera/pdf/tataLetakTermohigro.ts';
import { susun, kunciIsian, type TataLetak } from '../../src/tera/pdf/susunSertifikat.ts';
import { gambarSertifikat, pecahBaris, terapkanDuaBaris } from '../../src/tera/pdf/renderSertifikat.ts';

let lulus = 0, gagal = 0;
const cek = (n: string, ok: boolean, d = '') => { ok ? lulus++ : gagal++; if (!ok || process.env.RINCI) console.log((ok ? '✅ ' : '❌ ') + n + (ok ? '' : '  — ' + d)); };

const PANJANG = 'Rumah Sakit Umum PKU Muhammadiyah Jatinom';
const PENDEK = 'RSUD Contoh';
const ukur = (s: string) => s.length * 5; // ukuran sederhana untuk uji pecah kata
cek('pecah 2 baris per kata', JSON.stringify(pecahBaris('aaa bbb ccc ddd', 40, ukur)) === JSON.stringify(['aaa bbb', 'ccc ddd']));
cek('sisa kata ikut baris kedua (maks 2)', pecahBaris('aaa bbb ccc ddd eee fff', 40, ukur).length === 2);
cek('satu kata tidak dipecah', pecahBaris('aaaaaaaaaaaaaa', 40, ukur).length === 1);

const doc0 = await PDFDocument.create();
const f = { r: await doc0.embedFont(StandardFonts.Helvetica), b: await doc0.embedFont(StandardFonts.HelveticaBold), i: await doc0.embedFont(StandardFonts.HelveticaOblique) };

for (const [nama, tl, berkas] of [
  ['Sphygmomanometer', TATA_LETAK_SPHYGMOMANOMETER, 'templat-sphygmomanometer.pdf'],
  ['Infusion Pump', TATA_LETAK_INFUSION_PUMP, 'templat-infusion-pump.pdf'],
  ['Syringe Pump', TATA_LETAK_SYRINGE_PUMP, 'templat-syringe-pump.pdf'],
  ['NIBP', TATA_LETAK_NIBP, 'templat-nibp.pdf'],
  ['Keselamatan Listrik', TATA_LETAK_KESELAMATAN_LISTRIK, 'templat-keselamatan-listrik.pdf'],
  ['Thermohygrometer', TATA_LETAK_TERMOHIGRO, 'templat-termohigro.pdf'],
] as [string, TataLetak, string][]) {
  const def = tl.duaBaris?.[2];
  cek(`${nama}: tata letak punya baris Tempat/Tanggal & Ruangan/Teknisi`, !!def && def.baris.length === 2 && def.baris[0].k.includes('tempat') && def.baris[1].k.includes('ruang'));
  const isian: Record<string, string> = Object.fromEntries(kunciIsian(tl).map((k) => [k, 'X']));
  isian.ruang = 'FISIOTERAPI'; isian.teknisi = 'Teknisi Uji';
  const ukuranSama = (h: any) => new Set(h.teks.filter((t: any) => ['tempat', 'ruang', 'tanggalPelaksanaan', 'teknisi'].includes(t.kunci)).map((t: any) => t.ukuran)).size === 1;

  // Nama pendek: tidak berubah sama sekali
  const pendek = susun(tl, { ...isian, tempat: PENDEK })[1];
  const r0 = terapkanDuaBaris(pendek, tl, f);
  cek(`${nama}: nama pendek → 1 baris, tidak ada geseran`, r0.pita.length === 0 && r0.h.teks.length === pendek.teks.length && r0.h.teks.every((t, i) => t.y === pendek.teks[i].y && t.teks === pendek.teks[i].teks));

  // Nama panjang: 2 baris, ukuran huruf asli, yang di bawah turun, kaki & kolom kanan baris Tempat tetap
  const hal = susun(tl, { ...isian, tempat: PANJANG })[1];
  const asliTempat = hal.teks.find((t) => t.kunci === 'tempat')!;
  const { h, pita } = terapkanDuaBaris(hal, tl, f);
  const dy = def!.jarak;
  const baris = h.teks.filter((t) => t.kunci === 'tempat');
  cek(`${nama}: nama panjang → 2 baris`, pita.length === 1 && baris.length === 2 && `${baris[0].teks} ${baris[1].teks}` === PANJANG, JSON.stringify(baris.map((b) => b.teks)));
  cek(`${nama}: ukuran huruf tidak dikecilkan & sama dengan Tanggal/Ruangan/Teknisi`, baris.every((b) => b.ukuran === asliTempat.ukuran && b.tanpaKecil) && ukuranSama(h));
  cek(`${nama}: Tempat dipecah SEBELUM kolom "Tanggal" (batas kanan x ≤ 292)`, (asliTempat.batas ?? 999) <= 292);
  cek(`${nama}: baris 1 muat di kolom`, f.r.widthOfTextAtSize(baris[0].teks, baris[0].ukuran) <= (asliTempat.batas ?? 548.2) - asliTempat.x);
  cek(`${nama}: baris 2 tepat satu baris di bawah`, Math.abs(baris[1].y - asliTempat.y - dy) < 1e-9);
  const ruangA = hal.teks.find((t) => t.kunci === 'ruang')!, ruangB = h.teks.find((t) => t.kunci === 'ruang')!;
  cek(`${nama}: Ruangan ikut turun`, Math.abs(ruangB.y - ruangA.y - dy) < 1e-9);
  const tglA = hal.teks.find((t) => t.kunci === 'tanggalPelaksanaan')!, tglB = h.teks.find((t) => t.kunci === 'tanggalPelaksanaan')!;
  cek(`${nama}: Tanggal (sebaris Tempat) tetap`, tglA.y === tglB.y);
  const kakiA = hal.teks.filter((t) => t.y >= def!.sampai), kakiB = h.teks.filter((t) => t.y >= def!.sampai);
  cek(`${nama}: teks kaki tetap`, kakiA.length === kakiB.length);
  cek(`${nama}: isi turun tidak menembus kaki`, h.teks.filter((t) => t.y < def!.sampai + dy).every((t) => t.y < 760));

  // Tempat DAN Ruangan & Teknisi panjang: dua baris meninggi → isi di bawah Ruangan turun 2 × jarak
  const semua = susun(tl, { ...isian, tempat: PANJANG, ruang: 'Instalasi Rehabilitasi Medik dan Fisioterapi Gedung B', teknisi: 'Muhammad Esak Muhandis Abdurrahman Wijaya, S.Tr.T.' })[1];
  const r2 = terapkanDuaBaris(semua, tl, f);
  const ruang2 = r2.h.teks.filter((t) => t.kunci === 'ruang'), tek2 = r2.h.teks.filter((t) => t.kunci === 'teknisi');
  cek(`${nama}: Ruangan & Teknisi panjang → 2 baris, ukuran sama`, r2.pita.length === 2 && ruang2.length === 2 && tek2.length === 2 && ukuranSama(r2.h), JSON.stringify([ruang2.map((t) => t.teks), tek2.map((t) => t.teks)]));
  cek(`${nama}: Ruangan turun 1 baris, Teknisi sebaris Ruangan`, Math.abs(ruang2[0].y - ruangA.y - dy) < 1e-9 && ruang2[0].y === tek2[0].y);
  const bawahA = semua.teks.find((t) => t.kunci === 'suhuRuang'), bawahB = r2.h.teks.find((t) => t.kunci === 'suhuRuang');
  cek(`${nama}: isi di bawah Ruangan turun 2 baris`, !!bawahA && !!bawahB && Math.abs(bawahB.y - bawahA.y - 2 * dy) < 1e-9);

  // PDF lengkap dengan templat (kop opsional)
  const templat = readFileSync(new URL(`../../public/tera/sertifikat/${berkas}`, import.meta.url));
  const doc = await PDFDocument.create();
  const ff = { r: await doc.embedFont(StandardFonts.Helvetica), b: await doc.embedFont(StandardFonts.HelveticaBold), i: await doc.embedFont(StandardFonts.HelveticaOblique) };
  const kop = process.env.KOP_NON_KAN && existsSync(process.env.KOP_NON_KAN) ? readFileSync(process.env.KOP_NON_KAN) : null;
  await gambarSertifikat(doc, tl, { ...isian, tempat: PANJANG, ruang: 'Instalasi Rehabilitasi Medik dan Fisioterapi Gedung B' }, ff, kop, null, templat);
  const bytes = await doc.save();
  cek(`${nama}: PDF ${tl.halaman} halaman`, (await PDFDocument.load(bytes)).getPageCount() === tl.halaman);
  if (process.env.KELUAR) {
    mkdirSync(process.env.KELUAR, { recursive: true });
    writeFileSync(`${process.env.KELUAR}/dua-baris-${berkas.replace('templat-', '')}`, bytes);
  }
}

console.log(`${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
