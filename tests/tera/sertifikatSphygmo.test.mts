// Uji sertifikat Sphygmomanometer (4.5): isian lengkap, aturan teks, penyusunan halaman, dan pembuatan PDF 3 halaman di atas kop.
// Jalankan: npx tsx tests/tera/sertifikatSphygmo.test.mts   (PDF diuji dengan font standar; font Carlito dipasang di server)
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { TEMPLATE_SPHYGMOMANOMETER as T } from '../../src/tera/shared/templates/sphygmomanometer.ts';
import { buatJejakHitung } from '../../src/tera/shared/jejak.ts';
import { TATA_LETAK_SPHYGMOMANOMETER as TL } from '../../src/tera/pdf/tataLetakSphygmo.ts';
import { susun, kunciIsian } from '../../src/tera/pdf/susunSertifikat.ts';
import { isianSphygmomanometer, tanggalPanjang, tambahSetahun, koma, komaBebas } from '../../src/tera/pdf/formatSertifikat.ts';
import { gambarSertifikat } from '../../src/tera/pdf/renderSertifikat.ts';

let lulus = 0, gagal = 0;
const cek = (n: string, ok: boolean, d = '') => { ok ? lulus++ : gagal++; if (!ok || process.env.RINCI) console.log((ok ? '✅ ' : '❌ ') + n + (ok ? '' : '  — ' + d)); };

const fx = JSON.parse(readFileSync(new URL('./fixtures/sphygmo-golden-v4.json', import.meta.url), 'utf8'));
const kal = fx.kasus[0].kalibrator;
const data: any = {
  identitas: { merek: 'ABN', tipe: 'Aneroid Desk Type', noSeri: 'AN2410087', rentangUkur: 300, resolusi: 2, jenisSkala: 'Analog', tanggalPenerimaan: '2026-10-19', ruang: 'KIA' },
  lingkungan: { suhuAwal: 27.7, suhuAkhir: 27, rhAwal: 56, rhAkhir: 59 },
  fisik: { badan: { fisik: 'Baik', fungsi: 'Baik' }, level_cairan: { fisik: 'Baik', fungsi: 'Baik' }, tabung_selang: { fisik: 'Baik', fungsi: 'Baik' } },
  fisikTambahan: { gauge: 'Baik', konektor: 'Baik', label: 'Baik', manset: 'Baik', titik_nol: 'Baik' },
  bocor: { bacaan: 245 }, lajuBuang: { waktu: 7 },
  kinerja: { tekanan: Object.fromEntries([0, 50, 100, 150, 200, 250].map((t) => [String(t), { naik: [t, t + 1, t], turun: [t, t, t + 1] }])) },
};
const titikTh = [{ titik: 20, koreksiNaik: 0.1, koreksiTurun: 0.1, u95Naik: 0.2, u95Turun: 0.2 }, { titik: 25, koreksiNaik: 0, koreksiTurun: 0, u95Naik: 0.2, u95Turun: 0.2 }, { titik: 30, koreksiNaik: -0.1, koreksiTurun: -0.1, u95Naik: 0.2, u95Turun: 0.2 }];
const rhTh = [{ titik: 40, koreksiNaik: 0.8, koreksiTurun: 0.8, u95Naik: 1.5, u95Turun: 1.5 }, { titik: 50, koreksiNaik: 0.5, koreksiTurun: 0.5, u95Naik: 1.5, u95Turun: 1.5 }, { titik: 60, koreksiNaik: 0, koreksiTurun: 0, u95Naik: 1.5, u95Turun: 1.5 }, { titik: 70, koreksiNaik: -0.5, koreksiTurun: -0.5, u95Naik: 1.5, u95Turun: 1.5 }];
const snap: any = {
  tekanan: { asetId: 'CAL-037', nama: 'Digital Pressure Meter', model: 'MS200', nomorSeri: '24080200005', nomorSertifikat: 'YK.05.02/E.IX/7560/2026', tertelusur: 'LK-110-IDN (BPFK Jakarta)', berlakuSampai: '2027-03-04', points: kal },
  stopwatch: { asetId: 'CAL-011', nama: 'Stopwatch', model: 'HS-70W', nomorSeri: 'J211Q01', nomorSertifikat: 'S.23 017 460', tertelusur: 'LK-032-IDN', points: [], sumber: 'NILAI SEMENTARA (karangan)' },
  termohigrometer: { asetId: 'CAL-027', nama: 'Digital Thermohygrometer', model: 'HTC-2', nomorSeri: 'AK-00040-SMK', nomorSertifikat: 'C.250501008', tertelusur: 'LK-242-IDN', suhu: { points: titikTh }, kelembaban: { points: rhTh } },
};
const jejak = buatJejakHitung(T, data, snap) as any;
const ctx = { bo: '200', noLabel: '200.0012', namaAlat: 'Sphygmomanometer', namaRs: 'Puskesmas Banjarsari', alamatRs: 'Jl. Kapten Piere Tendean No. 12, Banjarsari, Kota Surakarta, Jawa Tengah', teknisi: 'Junior Yudha Pamungkas, S.Tr.T.', tanggalKalibrasi: '2026-10-22', tanggalTerbit: '2026-10-23', penandatangan: { nama: 'Hafizh Pasifianto Utomo, S.Tr.T.', jabatan: 'Manajer Teknik', jabatanEn: 'Technical Manager' } };
const aturan = { toleransiTekanan: T.kinerja[0].toleransi, ambangBocor: 15, ambangLaju: 10 };
const isi = isianSphygmomanometer({ data, jejak, snapshot: snap }, ctx, aturan);

// ── format dasar
cek('tanggal panjang', tanggalPanjang('2026-10-22') === '22 Oktober 2026' && tanggalPanjang('') === '' && tanggalPanjang('2026-13-01') === '');
cek('kalibrasi ulang +1 tahun', tambahSetahun('2026-10-22') === '2027-10-22' && tambahSetahun('2028-02-29') === '2029-02-28');
cek('koma 2 desimal & -0', koma(0.5, 2) === '0,50' && koma(-0.001, 2) === '0,00' && koma(null, 2) === '');
cek('komaBebas', komaBebas(50) === '50' && komaBebas(1.5) === '1,5');

// ── isi
const kunci = kunciIsian(TL);
const hilang = kunci.filter((k) => !(k in isi));
cek('semua kunci isian tata letak dipenuhi', hilang.length === 0, hilang.join(','));
cek('toleransi dicetak ± 4', isi.toleransiAkurasi === 'Toleransi Akurasi Tekanan ± 4 mmHg', String(isi.toleransiAkurasi));
cek('kesimpulan dari jejak', isi.kesimpulan === jejak.kesimpulan && ['Laik Pakai', 'Tidak Laik Pakai'].includes(String(isi.kesimpulan)), String(isi.kesimpulan));
cek('kalibrator tanpa tanda sementara', !/SEMENTARA/i.test(JSON.stringify(isi)));
cek('tidak ada nama Tera SMK', !/tera\s*smk/i.test(JSON.stringify(isi)));
cek('baris kalibrator 1', isi.kalibrator1 === 'Digital Pressure Meter  Type: MS200  s/n: 24080200005  Cert. Number: YK.05.02/E.IX/7560/2026  Traceability: LK-110-IDN', String(isi.kalibrator1));
cek('tertelusur tanpa kurung', !String(isi.kalibrator3).includes('('));
cek('lingkungan berformat', /^\( \d+(,\d)?±\d+(,\d+)? \)$/.test(String(isi.suhuRuang)) && /^\( \d+±\d+(,\d+)? \)$/.test(String(isi.rhRuang)), `${isi.suhuRuang} ${isi.rhRuang}`);
cek('tabel 6 baris terisi', [0, 1, 2, 3, 4, 5].every((r) => isi[`r${r}_korNaik`] && isi[`r${r}_stdTurun`] && isi[`r${r}_uNaik`]), JSON.stringify(isi.r1_korNaik));
{
  const t = jejak.hasil.kinerja.tekanan.titik.find((x: any) => x.titik === 100 && x.arah === 'naik');
  cek('standar = titik + koreksi', isi.r2_stdNaik === koma(100 + t.koreksi, 2), `${isi.r2_stdNaik} vs ${t.koreksi}`);
}
cek('selisih bocor', isi.bocorSelisih === '5', String(isi.bocorSelisih));
cek('tanggal terbit & ulang', isi.tanggalTerbit === '23 Oktober 2026' && isi.kalibrasiUlang === '22 Oktober 2027');

// ── data kosong tidak membuat galat
const kosong = isianSphygmomanometer({ data: null, jejak: null, snapshot: null }, { ...ctx, tanggalKalibrasi: null, tanggalTerbit: null }, aturan);
cek('data kosong → semua kunci ada, tanpa galat', kunci.every((k) => k in kosong));

// ── susun
const hal = susun(TL, isi);
cek('3 halaman', hal.length === 3);
cek('biru hanya halaman 1', hal[0].biru.length === 4 && hal[1].biru.length === 0);
const semuaTeks = hal.flatMap((h) => h.teks.map((t) => t.teks)).join('\n');
cek('"Halaman 1 dari 3" tercetak', /Halaman\b.*1.*3|Page/.test(semuaTeks) && !semuaTeks.includes('{p}') && !semuaTeks.includes('{n}'));
cek('tidak ada kata terlarang (9.1)', !/Tambahan|Additional|sesuai KMK terbaru|revisi|diperbarui|parameter baru/i.test(semuaTeks.replace(/Toleransi Akurasi Tekanan/g, '')), '');
cek('garis bawah kesimpulan', hal[2].teks.some((t) => t.garisBawah && t.teks === isi.kesimpulan));
const kosongSusun = susun(TL, {});
cek('isian kosong tampil "-"', kosongSusun[0].teks.filter((t) => t.isian).every((t) => t.teks === '-'));

// ── PDF (kop resmi + font standar)
const kopPath = process.env.KOP_NON_KAN;
if (kopPath && existsSync(kopPath)) {
  const doc = await PDFDocument.create();
  const f = { r: await doc.embedFont(StandardFonts.Helvetica), b: await doc.embedFont(StandardFonts.HelveticaBold), i: await doc.embedFont(StandardFonts.HelveticaOblique) };
  const TLuji = JSON.parse(JSON.stringify(TL).replace(/[^\u0000-\u00FF]/g, '?')); // font standar tidak punya semua simbol
  await gambarSertifikat(doc, TLuji, isi, f, readFileSync(kopPath));
  const bytes = await doc.save();
  const cek2 = await PDFDocument.load(bytes);
  cek('PDF 3 halaman A4', cek2.getPageCount() === 3 && Math.abs(cek2.getPage(0).getWidth() - 595.2756) < 0.01);
  if (process.env.KELUAR) { mkdirSync(process.env.KELUAR, { recursive: true }); writeFileSync(`${process.env.KELUAR}/uji-sphygmo.pdf`, bytes); }
} else console.log('(lewati uji PDF: set KOP_NON_KAN=/jalur/KOP_SERTIF_NON_KAN.pdf)');

console.log(`${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
