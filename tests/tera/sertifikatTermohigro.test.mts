// Uji sertifikat Thermohygrometer: isian dari LKK (angka Excel contoh), kelengkapan kunci tata letak, dua tabel 7 titik (Pembacaan Standar 1 desimal,
// Koreksi 2 desimal, U95 1 desimal = PDF contoh Master_Thermohygrometer.pdf), titik tak dinilai "-", aturan teks, PDF 3 halaman di atas kertas cetak.
// Jalankan: npm run test:tera:sertifikat-termohigro   (opsional KOP_NON_KAN=/jalur/KOP_SERTIF_NON_KAN.pdf, KELUAR=/folder → PDF uji)
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { TEMPLATE_TERMOHIGRO as T } from '../../src/tera/shared/templates/termohigrometer.ts';
import { buatJejakHitung } from '../../src/tera/shared/jejak.ts';
import { daftarStandar, jepretStandar, susunPilihan, type KalibratorMin } from '../../src/tera/shared/isian.ts';
import { TATA_LETAK_TERMOHIGRO as TL } from '../../src/tera/pdf/tataLetakTermohigro.ts';
import { susun, kunciIsian } from '../../src/tera/pdf/susunSertifikat.ts';
import { isianTermohigro } from '../../src/tera/pdf/formatSertifikatPompa.ts';
import { gambarSertifikat } from '../../src/tera/pdf/renderSertifikat.ts';

let lulus = 0, gagal = 0;
const cek = (n: string, ok: boolean, d = '') => { ok ? lulus++ : gagal++; if (!ok || process.env.RINCI) console.log((ok ? '✅ ' : '❌ ') + n + (ok ? '' : '  — ' + d)); };

const fx = JSON.parse(readFileSync(new URL('./fixtures/termohigro-golden-v1.json', import.meta.url), 'utf8'));
const baris = (asetId: string, nama: string, model: string, nomorSeri: string, sert: string | null, tertelusur: string, parameter: string, tabel: any[]): KalibratorMin & { points: any[] } => ({
  asetId, nama, merk: 'X', model, nomorSeri, parameter, nomorSertifikat: sert, tertelusur, tanggalKalibrasi: null, berlakuSampai: null, rekomendasi: false,
  points: tabel.map((t) => ({ titik: t.titik, koreksiNaik: t.koreksi, koreksiTurun: t.koreksi, u95Naik: t.u95, u95Turun: t.u95 })),
});
// Climatic Chamber (CAL-048): angka SEMENTARA master (Calibrator 1) — koreksi 0, U 1 °C / 4 %RH, tanpa sertifikat
const CH = (p: string, t: any[]) => baris('CAL-048', 'Climatic Chamber', 'BJPX-HT100BII', 'BJPXII100250700047B', null, 'BIOBASE SCIENTIFIC', p, t);
const HTC = (p: string, t: any[]) => ({ ...baris('CAL-027', 'Digital Thermohygrometer', 'HTC-1', 'PK-0069-SMK', 'YK.05.02/E.IX/5376/2026', 'LK-110-IDN', p, t), rekomendasi: true });
const master = [
  CH('suhu_c', [{ titik: 15, koreksi: 0, u95: 1 }, { titik: 45, koreksi: 0, u95: 1 }]), CH('kelembaban_rh', [{ titik: 30, koreksi: 0, u95: 4 }, { titik: 90, koreksi: 0, u95: 4 }]),
  // HTC-1 asli (migrasi 0019, sertifikat YK.05.02/E.IX/5376/2026)
  HTC('suhu_c', [14.7, 18.3, 23.6, 27.8, 31.4].map((titik, i) => ({ titik, koreksi: [0.6, 1.4, 1.2, 1.7, 3.3][i], u95: 0.5 }))),
  HTC('kelembaban_rh', [46, 54, 64, 72, 79].map((titik, i) => ({ titik, koreksi: [-7, -5, -5, -4, 0][i], u95: 2.2 }))),
];
const snapshot: Record<string, unknown> = {};
for (const d of daftarStandar(T)) snapshot[d.peran] = jepretStandar(d, susunPilihan(d, master as any).find((x) => x.kunci === (d.peran === 'chamber' ? 'CAL-048' : 'CAL-027')) as any, (k: any) => JSON.parse(JSON.stringify(k)));
const FISIK = { badan: { fisik: 'Baik', fungsi: 'Berfungsi' }, kontrol: { fisik: 'Baik', fungsi: 'Berfungsi' } };
const ctx = { bo: 'UJI-2610-003', noLabel: 'SMK/KAL/2610/003', namaAlat: T.nama, namaRs: 'RSUD Contoh Surakarta (DATA UJI COBA)', alamatRs: 'Jl. Contoh No. 1, Banjarsari, Surakarta', teknisi: 'Junior Yudha Pamungkas, S.Tr.T.', tanggalKalibrasi: '2026-10-27', tanggalTerbit: '2026-10-28', penandatangan: { nama: 'Hafizh Pasifianto Utomo, S.Tr.T.', jabatan: 'Manajer Teknik', jabatanEn: 'Technical Manager' } };
const termoDari = (suhu: any[], rh: any[]) => {
  const o: Record<string, number[]> = {};
  suhu.forEach((b) => (o[`suhu_${b.setting}`] = b.bacaan)); rh.forEach((b) => (o[`rh_${b.setting}`] = b.bacaan));
  return o;
};
const lkkDari = (termo: any) => {
  const data: any = {
    identitas: { merek: 'HTC', tipe: 'HTC-1', noSeri: 'SIM-0001', rentangUkur: '10 ~ 99 %', resolusi: 0.1, jenisSkala: 'Digital', tanggalPenerimaan: '2026-10-26', ruang: 'Ruang Kalibrasi' },
    lingkungan: { suhuAwal: 25, suhuAkhir: 25.2, rhAwal: 60, rhAkhir: 61 }, fisik: FISIK, termo,
  };
  const jejak = buatJejakHitung(T, data, snapshot) as any;
  return { data, jejak, snapshot: snapshot as any };
};

const l1 = lkkDari(termoDari(fx.suhu, fx.rh));
const isi = isianTermohigro(l1, ctx);
cek('jejak hitung lengkap & Laik Pakai', l1.jejak?.lengkap === true && l1.jejak?.kesimpulan === 'Laik Pakai', JSON.stringify(l1.jejak?.hasil?.kurang));
const hilang = kunciIsian(TL).filter((k) => !(k in isi));
cek('semua kunci tata letak dipenuhi', hilang.length === 0, hilang.join(','));
cek('tata letak 3 halaman, hanya isian, 56 isian tabel (2 × 7 × 4)', TL.halaman === 3 && Object.values(TL.teks).flat().every((o) => o.j === 'f') && kunciIsian(TL).filter((k) => /^[sr]\d_(alat|std|kor|u)$/.test(k)).length === 56);
cek('identitas: nama alat, rentang & resolusi bersatuan % (sama PDF acuan)', isi.namaAlat === 'Thermohygrometer' && isi.rentangUkur === '10 ~ 99' && isi.satuanRentang === '%' && isi.resolusi === '0,1' && isi.satuanResolusi === '%', JSON.stringify([isi.namaAlat, isi.rentangUkur, isi.satuanRentang, isi.resolusi, isi.satuanResolusi]));
cek('Diterbitkan = penerimaan + 1 hari; Kalibrasi Ulang +1 tahun', isi.tanggalTerbit === '27 Oktober 2026' && isi.kalibrasiUlang === '27 Oktober 2027', `${isi.tanggalTerbit} | ${isi.kalibrasiUlang}`);
cek('dua baris standar lengkap seperti PDF acuan: Climatic Chamber (Cert. Number: - , Traceability) & HTC-1', String(isi.kalibrator1) === 'Climatic Chamber  Tipe: BJPX-HT100BII  s/n: BJPXII100250700047B  Cert. Number: -  Traceability: BIOBASE SCIENTIFIC' && String(isi.kalibrator2).startsWith('Digital Thermohygrometer  Tipe: HTC-1  s/n: PK-0069-SMK  Cert. Number: YK.05.02/E.IX/5376/2026'), `${isi.kalibrator1} || ${isi.kalibrator2}`);
cek('tanpa isian pompa/listrik; hanya 2 baris fisik', !['kalibrator3', 'sumbatStd', 'a0_std', 'listrik0', 'tolSumbat', 'fisik3'].some((k) => k in isi) && 'fisik2' in isi && isi.fisik1 === 'Baik' && isi.fungsi2 === 'Berfungsi');
const kolom = (k: string, c: string) => Array.from({ length: 7 }, (_, i) => isi[`${k}${i}_${c}`]).join(' ');
// Angka cetak PDF contoh halaman 3
cek('SUHU Pembacaan Alat = 15 20 25 30 35 40 45', kolom('s', 'alat') === '15 20 25 30 35 40 45', kolom('s', 'alat'));
cek('SUHU Pembacaan Standar = 15,0 20,0 24,9 30,0 35,1 39,9 45,0', kolom('s', 'std') === '15,0 20,0 24,9 30,0 35,1 39,9 45,0', kolom('s', 'std'));
cek('SUHU Koreksi = -0,03 -0,02 -0,08 -0,02 0,07 -0,07 0,03', kolom('s', 'kor') === '-0,03 -0,02 -0,08 -0,02 0,07 -0,07 0,03', kolom('s', 'kor'));
cek('SUHU U95 = 1,0 (semua)', kolom('s', 'u') === Array(7).fill('1,0').join(' '), kolom('s', 'u'));
cek('RH Pembacaan Alat = 30 … 90', kolom('r', 'alat') === '30 40 50 60 70 80 90', kolom('r', 'alat'));
cek('RH Pembacaan Standar = 30,2 39,8 50,4 60,3 70,0 80,2 89,9', kolom('r', 'std') === '30,2 39,8 50,4 60,3 70,0 80,2 89,9', kolom('r', 'std'));
cek('RH Koreksi = 0,17 -0,17 0,42 0,25 0,00 0,17 -0,08', kolom('r', 'kor') === '0,17 -0,17 0,42 0,25 0,00 0,17 -0,08', kolom('r', 'kor'));
cek('RH U95 = 4,1 4,1 4,1 4,0 4,1 4,1 4,1', kolom('r', 'u') === '4,1 4,1 4,1 4,0 4,1 4,1 4,1', kolom('r', 'u'));
cek('kondisi ruangan berisi angka HTC-1 (bukan kosong "( ± )")', /^\( .+±.+ \)$/.test(String(isi.suhuRuang)) && /^\( .+±.+ \)$/.test(String(isi.rhRuang)), `${isi.suhuRuang} ${isi.rhRuang}`);
const kDerajat = kunciIsian(TL).filter((k) => k.startsWith('derajat'));
cek('simbol Celsius "°C" (bukan "0C"): 6 tempat (hlm 2 Suhu Ruang, hlm 3 judul + 4 kolom tabel suhu)', kDerajat.length === 6 && kDerajat.every((k) => isi[k] === '°C') && !JSON.stringify(isi).includes('0C'), kDerajat.join(','));
cek('kesimpulan Laik Pakai bergaris bawah', isi.kesimpulan === 'Laik Pakai' && susun(TL, isi)[2].teks.some((t) => t.garisBawah && t.teks === 'Laik Pakai'));

// Bias +1,5 pada 3 titik suhu → < 70 % Laik → Tidak Laik Pakai; titik dengan 3 bacaan → "-"
const buruk = JSON.parse(JSON.stringify(fx.suhu)).map((b: any, i: number) => (i < 3 ? { ...b, bacaan: b.bacaan.map((x: number) => x + 1.5) } : b));
const isi2 = isianTermohigro(lkkDari(termoDari(buruk, fx.rh)), ctx);
cek('3 titik suhu di luar ±1 °C: Tidak Laik Pakai', isi2.kesimpulan === 'Tidak Laik Pakai', String(isi2.kesimpulan));
const t3 = termoDari(fx.suhu, fx.rh); t3['suhu_15'] = t3['suhu_15'].slice(0, 3);
const isi3 = isianTermohigro(lkkDari(t3), ctx);
cek('titik dengan 3 bacaan dicetak "-"', isi3.s0_std === '-' && isi3.s0_kor === '-' && isi3.s0_u === '-' && isi3.s1_u === '1,0' && isi3.s0_alat === '15');
cek('tanpa tanda sementara / nama Tera SMK / kata terlarang', !/SEMENTARA|tera\s*smk|Tambahan|Additional|sesuai KMK terbaru|diperbarui|parameter baru/i.test(JSON.stringify(isi)));
const kosong = isianTermohigro({ data: null, jejak: null, snapshot: null }, { ...ctx, tanggalKalibrasi: null as any, tanggalTerbit: null as any });
cek('data kosong → semua kunci ada, tanpa galat', kunciIsian(TL).every((k) => k in kosong));

// PDF: kertas cetak Excel + kop (font standar; Carlito dipasang di server)
const templat = readFileSync(new URL('../../public/tera/sertifikat/templat-termohigro.pdf', import.meta.url));
cek('templat 3 halaman', (await PDFDocument.load(templat)).getPageCount() === 3);
const kopPath = process.env.KOP_NON_KAN;
const doc = await PDFDocument.create();
const f = { r: await doc.embedFont(StandardFonts.Helvetica), b: await doc.embedFont(StandardFonts.HelveticaBold), i: await doc.embedFont(StandardFonts.HelveticaOblique) };
const isiUji = JSON.parse(JSON.stringify(isi).replace(/[^\u0000-ÿ]/g, '?'));
await gambarSertifikat(doc, TL, isiUji, f, kopPath && existsSync(kopPath) ? readFileSync(kopPath) : null, null, templat);
const bytes = await doc.save();
cek('PDF 3 halaman A4', (await PDFDocument.load(bytes)).getPageCount() === 3);
if (process.env.KELUAR) {
  mkdirSync(process.env.KELUAR, { recursive: true });
  writeFileSync(`${process.env.KELUAR}/uji-termohigro.pdf`, bytes);
}
console.log(`${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
