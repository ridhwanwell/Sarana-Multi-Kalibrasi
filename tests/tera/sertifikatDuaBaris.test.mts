// Uji isian "Tempat" 2 baris (Ridhwan 26 Okt 2026): nama RS kepanjangan TIDAK dikecilkan, dipecah 2 baris,
// isi halaman di bawahnya turun satu baris; teks kaki tetap. Berlaku untuk semua sertifikat (Sphygmo, Infusion, Syringe).
// Jalankan: npm run test:tera:sertifikat-dua-baris   (opsional KOP_NON_KAN=/jalur/kop.pdf, KELUAR=/folder → PDF uji)
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { TATA_LETAK_SPHYGMOMANOMETER } from '../../src/tera/pdf/tataLetakSphygmo.ts';
import { TATA_LETAK_INFUSION_PUMP } from '../../src/tera/pdf/tataLetakPompa.ts';
import { TATA_LETAK_SYRINGE_PUMP } from '../../src/tera/pdf/tataLetakSyringe.ts';
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
] as [string, TataLetak, string][]) {
  const def = tl.duaBaris?.[2];
  cek(`${nama}: tata letak punya "tempat" 2 baris`, !!def && def.k === 'tempat');
  const isian: Record<string, string> = Object.fromEntries(kunciIsian(tl).map((k) => [k, 'X']));
  isian.ruang = 'FISIOTERAPI'; isian.teknisi = 'Teknisi Uji';

  // Nama pendek: tidak berubah sama sekali
  const pendek = susun(tl, { ...isian, tempat: PENDEK })[1];
  const r0 = terapkanDuaBaris(pendek, tl, f);
  cek(`${nama}: nama pendek → 1 baris, tidak ada geseran`, r0.dy === 0 && r0.h === pendek);

  // Nama panjang: 2 baris, ukuran huruf asli, yang di bawah turun, kaki & kolom kanan baris Tempat tetap
  const hal = susun(tl, { ...isian, tempat: PANJANG })[1];
  const asliTempat = hal.teks.find((t) => t.kunci === 'tempat')!;
  const { h, dy } = terapkanDuaBaris(hal, tl, f);
  const baris = h.teks.filter((t) => t.kunci === 'tempat');
  cek(`${nama}: nama panjang → 2 baris`, dy > 0 && baris.length === 2 && `${baris[0].teks} ${baris[1].teks}` === PANJANG, JSON.stringify(baris.map((b) => b.teks)));
  cek(`${nama}: ukuran huruf tidak dikecilkan`, baris.every((b) => b.ukuran === asliTempat.ukuran && b.tanpaKecil));
  cek(`${nama}: baris 1 muat di kolom`, f.r.widthOfTextAtSize(baris[0].teks, baris[0].ukuran) <= (asliTempat.batas ?? 548.2) - asliTempat.x);
  cek(`${nama}: baris 2 tepat satu baris di bawah`, Math.abs(baris[1].y - asliTempat.y - dy) < 1e-9);
  const ruangA = hal.teks.find((t) => t.kunci === 'ruang')!, ruangB = h.teks.find((t) => t.kunci === 'ruang')!;
  cek(`${nama}: Ruangan ikut turun`, Math.abs(ruangB.y - ruangA.y - dy) < 1e-9);
  const tglA = hal.teks.find((t) => t.kunci === 'tanggalPelaksanaan')!, tglB = h.teks.find((t) => t.kunci === 'tanggalPelaksanaan')!;
  cek(`${nama}: Tanggal (sebaris Tempat) tetap`, tglA.y === tglB.y);
  const kakiA = hal.teks.filter((t) => t.y >= def!.sampai), kakiB = h.teks.filter((t) => t.y >= def!.sampai);
  cek(`${nama}: teks kaki tetap`, kakiA.length === kakiB.length);
  cek(`${nama}: isi turun tidak menembus kaki`, h.teks.filter((t) => t.y < def!.sampai + dy).every((t) => t.y < 760));

  // PDF lengkap dengan templat (kop opsional)
  const templat = readFileSync(new URL(`../../public/tera/sertifikat/${berkas}`, import.meta.url));
  const doc = await PDFDocument.create();
  const ff = { r: await doc.embedFont(StandardFonts.Helvetica), b: await doc.embedFont(StandardFonts.HelveticaBold), i: await doc.embedFont(StandardFonts.HelveticaOblique) };
  const kop = process.env.KOP_NON_KAN && existsSync(process.env.KOP_NON_KAN) ? readFileSync(process.env.KOP_NON_KAN) : null;
  await gambarSertifikat(doc, tl, { ...isian, tempat: PANJANG }, ff, kop, null, templat);
  const bytes = await doc.save();
  cek(`${nama}: PDF 3 halaman`, (await PDFDocument.load(bytes)).getPageCount() === 3);
  if (process.env.KELUAR) {
    mkdirSync(process.env.KELUAR, { recursive: true });
    writeFileSync(`${process.env.KELUAR}/dua-baris-${berkas.replace('templat-', '')}`, bytes);
  }
}

console.log(`${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
