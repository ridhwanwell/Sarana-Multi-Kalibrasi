// Uji sertifikat NIBP: isian dari LKK (angka golden Excel), kelengkapan kunci tata letak, tabel 12 titik (alat 0 desimal,
// koreksi & U95 2 desimal = sertifikat Excel), titik tak dinilai "-", aturan teks, PDF 3 halaman di atas kertas cetak Report All.
// Jalankan: npm run test:tera:sertifikat-nibp   (opsional KOP_NON_KAN=/jalur/KOP_SERTIF_NON_KAN.pdf, KELUAR=/folder → PDF uji)
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { TEMPLATE_NIBP_V1 as T } from '../../src/tera/shared/templates/nibp.ts';
import { buatJejakHitung } from '../../src/tera/shared/jejak.ts';
import { daftarStandar, jepretStandar, susunPilihan, type KalibratorMin } from '../../src/tera/shared/isian.ts';
import { TATA_LETAK_NIBP as TL } from '../../src/tera/pdf/tataLetakNibp.ts';
import { susun, kunciIsian } from '../../src/tera/pdf/susunSertifikat.ts';
import { isianNibp } from '../../src/tera/pdf/formatSertifikatPompa.ts';
import { gambarSertifikat } from '../../src/tera/pdf/renderSertifikat.ts';

let lulus = 0, gagal = 0;
const cek = (n: string, ok: boolean, d = '') => { ok ? lulus++ : gagal++; if (!ok || process.env.RINCI) console.log((ok ? '✅ ' : '❌ ') + n + (ok ? '' : '  — ' + d)); };

const fx = JSON.parse(readFileSync(new URL('./fixtures/nibp-golden-v1.json', import.meta.url), 'utf8'));
const kal = fx.kasus[0].kalibrator;
const baris = (asetId: string, nama: string, model: string, nomorSeri: string, sert: string, tertelusur: string, parameter: string, tabel: any[]): KalibratorMin & { points: any[] } => ({
  asetId, nama, merk: 'X', model, nomorSeri, parameter, nomorSertifikat: sert, tertelusur, tanggalKalibrasi: '2026-02-03', berlakuSampai: '2027-02-03', rekomendasi: false,
  points: tabel.map((t) => ({ titik: t.titik, koreksiNaik: t.koreksi, koreksiTurun: t.koreksi, u95Naik: t.u95, u95Turun: t.u95 })),
});
const NIBP = (p: string, t: any[]) => baris('CAL-037', 'NIBP Simulator', 'MS200', '24080200005', 'YK.05.02/E.IX/7560/2026', 'LK-110-IDN', p, t);
const HTC = (p: string, t: any[]) => ({ ...baris('CAL-027', 'Digital Thermohygrometer', 'HTC-1', 'PK-0069-SMK', 'YK.05.02/E.IX/5376/2026', 'LK-110-IDN', p, t), rekomendasi: true });
const master = [
  NIBP('tekanan_mmhg', kal.nibp),
  HTC('suhu_c', [{ titik: 20, koreksi: 0.1, u95: 0.3 }, { titik: 25, koreksi: 0, u95: 0.3 }, { titik: 30, koreksi: -0.1, u95: 0.3 }]), HTC('kelembaban_rh', [{ titik: 40, koreksi: 0.8, u95: 2 }, { titik: 50, koreksi: 0.5, u95: 2 }, { titik: 60, koreksi: 0, u95: 2 }]),
];
const snapshot: Record<string, unknown> = {};
for (const d of daftarStandar(T)) snapshot[d.peran] = jepretStandar(d, susunPilihan(d, master as any)[0] as any, (k: any) => JSON.parse(JSON.stringify(k)));
const FISIK = { badan: { fisik: 'Baik', fungsi: 'Berfungsi' }, kontrol: { fisik: 'Baik', fungsi: 'Berfungsi' }, kabel: { fisik: 'Baik', fungsi: 'Berfungsi' } };
const ctx = { bo: 'UJI-2610-002', noLabel: 'SMK/KAL/2610/002', namaAlat: T.nama, namaRs: 'RSUD Contoh Surakarta (DATA UJI COBA)', alamatRs: 'Jl. Contoh No. 1, Banjarsari, Surakarta', teknisi: 'Junior Yudha Pamungkas, S.Tr.T.', tanggalKalibrasi: '2026-10-26', tanggalTerbit: '2026-10-30', penandatangan: { nama: 'Hafizh Pasifianto Utomo, S.Tr.T.', jabatan: 'Manajer Teknik', jabatanEn: 'Technical Manager' } };
const lkkDari = (nibp: any) => {
  const data: any = {
    identitas: { merek: 'Omron', tipe: 'HEM-7120 (uji coba)', noSeri: 'NIBP-TEST-0001', rentangUkur: '0 - 300 mmHg', resolusi: 1, tanggalPenerimaan: '2026-10-26', ruang: 'Ruang Perawatan Melati' },
    lingkungan: { suhuAwal: 24.5, suhuAkhir: 24.8, rhAwal: 55, rhAkhir: 56 }, fisik: FISIK, nibp,
  };
  const jejak = buatJejakHitung(T, data, snapshot) as any;
  return { data, jejak, snapshot: snapshot as any };
};
const ctx2 = { ...ctx, namaAlat: T.nama };

// Kasus contoh Excel (sertifikat terisi Ridhwan): 60/40/30 … · koreksi MAP -0,33 · U95 1,14 / 1,09 · Laik Pakai
const l1 = lkkDari(fx.kasus[0].data.nibp);
const isi = isianNibp(l1, ctx2);
cek('jejak hitung lengkap', l1.jejak?.lengkap === true, JSON.stringify(l1.jejak?.hasil?.kurang));
const hilang = kunciIsian(TL).filter((k) => !(k in isi));
cek('semua kunci tata letak dipenuhi', hilang.length === 0, hilang.join(','));
cek('tata letak 3 halaman, hanya isian (teks tetap dari templat), 36 isian tabel NIBP', TL.halaman === 3 && Object.values(TL.teks).flat().every((o) => o.j === 'f') && kunciIsian(TL).filter((k) => /^n\d+_/.test(k)).length === 36);
cek('nama alat, rentang & resolusi bersatuan mmHg', isi.namaAlat === 'Non Invasive Blood Pressure (NIBP)' && isi.rentangUkur === '0 - 300' && isi.satuanRentang === 'mmHg' && isi.resolusi === '1' && isi.satuanResolusi === 'mmHg', JSON.stringify([isi.namaAlat, isi.rentangUkur, isi.satuanRentang, isi.resolusi, isi.satuanResolusi]));
cek('Diterbitkan = penerimaan + 1 hari; Kalibrasi Ulang +1 tahun', isi.tanggalTerbit === '27 Oktober 2026' && isi.kalibrasiUlang === '26 Oktober 2027');
cek('dua baris standar: NIBP Simulator & HTC-1', String(isi.kalibrator1).startsWith('NIBP Simulator  Tipe: MS200  s/n: 24080200005  Cert. Number: YK.05.02/E.IX/7560/2026') && String(isi.kalibrator2).includes('Tipe: HTC-1'), `${isi.kalibrator1} / ${isi.kalibrator2}`);
cek('tanpa isian pompa/listrik', !['kalibrator3', 'sumbatStd', 'a0_std', 'listrik0', 'tolSumbat'].some((k) => k in isi));
const kolom = (c: string) => Array.from({ length: 12 }, (_, i) => isi[`n${i}_${c}`]).join(' ');
cek('Pembacaan Alat = sertifikat Excel (60 40 30 120 93 80 150 117 100 200 167 150)', kolom('alat') === '60 40 30 120 93 80 150 117 100 200 167 150', kolom('alat'));
cek('Koreksi = sertifikat Excel (0,00 / MAP -0,33)', kolom('kor') === Array(4).fill('0,00 -0,33 0,00').join(' '), kolom('kor'));
cek('Ketidakpastian = sertifikat Excel (1,14 / MAP 1,09)', kolom('u') === Array(4).fill('1,14 1,09 1,14').join(' '), kolom('u'));
cek('kesimpulan Laik Pakai bergaris bawah', isi.kesimpulan === 'Laik Pakai' && susun(TL, isi)[2].teks.some((t) => t.garisBawah && t.teks === 'Laik Pakai'));

// Bias +7 → Tidak Laik Pakai; titik dengan 3 bacaan → "-"
const bias = fx.kasus.find((k: any) => k.nama === 'bias-plus-7-gagal');
const isi2 = isianNibp(lkkDari(bias.data.nibp), ctx2);
cek('bias +7: koreksi -7,00 & Tidak Laik Pakai', isi2.n0_kor === '-7,00' && isi2.kesimpulan === 'Tidak Laik Pakai', `${isi2.n0_kor} ${isi2.kesimpulan}`);
const isi3 = isianNibp(lkkDari({ ...fx.kasus[0].data.nibp, s1_systole: [60, 61, 59] }), ctx2);
cek('titik dengan 3 bacaan dicetak "-"', isi3.n0_alat === '-' && isi3.n0_kor === '-' && isi3.n0_u === '-' && isi3.n1_u === '1,09');
cek('tanpa tanda sementara / nama Tera SMK / kata terlarang', !/SEMENTARA|tera\s*smk|Tambahan|Additional|sesuai KMK terbaru|diperbarui|parameter baru/i.test(JSON.stringify(isi)));
const kosong = isianNibp({ data: null, jejak: null, snapshot: null }, { ...ctx2, tanggalKalibrasi: null as any, tanggalTerbit: null as any });
cek('data kosong → semua kunci ada, tanpa galat', kunciIsian(TL).every((k) => k in kosong));

// PDF: kertas cetak Excel + kop (font standar; Carlito dipasang di server)
const templat = readFileSync(new URL('../../public/tera/sertifikat/templat-nibp.pdf', import.meta.url));
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
  writeFileSync(`${process.env.KELUAR}/uji-nibp.pdf`, bytes);
}
console.log(`${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
