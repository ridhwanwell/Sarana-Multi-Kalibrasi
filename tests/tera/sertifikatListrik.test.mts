// Uji sertifikat KESELAMATAN LISTRIK: isian dari LKK (angka golden Excel), kelengkapan kunci tata letak, uji tidak berlaku "-",
// toleransi menurut klasifikasi, Nama Alat dari isian teknisi, aturan teks, dan PDF 3 halaman di atas kertas cetak Report All.
// Jalankan: npm run test:tera:sertifikat-listrik   (opsional KOP_NON_KAN=/jalur/KOP_SERTIF_NON_KAN.pdf, KELUAR=/folder → PDF uji)
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { TEMPLATE_KESELAMATAN_LISTRIK_V1 as T } from '../../src/tera/shared/templates/keselamatanListrik.ts';
import { buatJejakHitung } from '../../src/tera/shared/jejak.ts';
import { daftarStandar, jepretStandar, susunPilihan, type KalibratorMin } from '../../src/tera/shared/isian.ts';
import { TATA_LETAK_KESELAMATAN_LISTRIK as TL } from '../../src/tera/pdf/tataLetakListrik.ts';
import { susun, kunciIsian } from '../../src/tera/pdf/susunSertifikat.ts';
import { isianListrik } from '../../src/tera/pdf/formatSertifikatPompa.ts';
import { gambarSertifikat } from '../../src/tera/pdf/renderSertifikat.ts';

let lulus = 0, gagal = 0;
const cek = (n: string, ok: boolean, d = '') => { ok ? lulus++ : gagal++; if (!ok || process.env.RINCI) console.log((ok ? '✅ ' : '❌ ') + n + (ok ? '' : '  — ' + d)); };

const fx = JSON.parse(readFileSync(new URL('./fixtures/listrik-golden-v1.json', import.meta.url), 'utf8'));
const kal = fx.kasus[0].kalibrator;
const baris = (asetId: string, nama: string, model: string, nomorSeri: string, sert: string, tertelusur: string, parameter: string, tabel: any[]): KalibratorMin & { points: any[] } => ({
  asetId, nama, merk: 'X', model, nomorSeri, parameter, nomorSertifikat: sert, tertelusur, tanggalKalibrasi: '2026-02-03', berlakuSampai: '2027-02-03', rekomendasi: false,
  points: tabel.map((t) => ({ titik: t.titik, koreksiNaik: t.koreksi, koreksiTurun: t.koreksi, u95Naik: t.u95, u95Turun: t.u95 })),
});
const ESA = (p: string, t: any[]) => baris('CAL-042', 'Electrical Safety Analyzer', 'ESA-612', '6181067', 'YK.05.02/E.IX/5369/2026', 'LK-110-IDN (BPFK Jakarta)', p, t);
const HTC = (p: string, t: any[]) => ({ ...baris('CAL-027', 'Digital Thermohygrometer', 'HTC-2', 'AK-00040-SMK', 'C.250501008', 'LK-242-IDN (PT X)', p, t), rekomendasi: true });
const master = [
  ESA('tegangan_v', kal.listrik.tegangan), ESA('resistansi_ohm', kal.listrik.resistansi), ESA('isolasi_mohm', kal.listrik.isolasi), ESA('arus_bocor_ua', kal.listrik.arus_bocor),
  HTC('suhu_c', [{ titik: 20, koreksi: 0.1, u95: 0.3 }, { titik: 25, koreksi: 0, u95: 0.3 }, { titik: 30, koreksi: -0.1, u95: 0.3 }]), HTC('kelembaban_rh', [{ titik: 40, koreksi: 0.8, u95: 2 }, { titik: 50, koreksi: 0.5, u95: 2 }, { titik: 60, koreksi: 0, u95: 2 }]),
];
const snapshot: Record<string, unknown> = {};
for (const d of daftarStandar(T)) snapshot[d.peran] = jepretStandar(d, susunPilihan(d, master as any)[0] as any, (k: any) => JSON.parse(JSON.stringify(k)));
const FISIK = { badan: { fisik: 'Baik', fungsi: 'Berfungsi' }, kontrol: { fisik: 'Baik', fungsi: 'Berfungsi' }, kabel: { fisik: 'Baik', fungsi: 'Berfungsi' } };
const ctx = { bo: 'UJI-2610-002', noLabel: 'SMK/KAL/2610/002', namaAlat: T.nama, namaRs: 'RSUD Contoh Surakarta (DATA UJI COBA)', alamatRs: 'Jl. Contoh No. 1, Banjarsari, Surakarta', teknisi: 'Junior Yudha Pamungkas, S.Tr.T.', tanggalKalibrasi: '2026-10-26', tanggalTerbit: '2026-10-30', penandatangan: { nama: 'Hafizh Pasifianto Utomo, S.Tr.T.', jabatan: 'Manajer Teknik', jabatanEn: 'Technical Manager' } };
const lkkDari = (k: any, namaAlat = 'ESWT/Electro Shortwave teraphy') => {
  const data: any = {
    identitas: { namaAlat, merek: 'BTL', tipe: 'Curapuls 970 (uji coba)', noSeri: 'ESWT-TEST-0001', tanggalPenerimaan: '2026-10-26', ruang: 'Ruang Fisioterapi' },
    lingkungan: { suhuAwal: 24.5, suhuAkhir: 24.8, rhAwal: 55, rhAkhir: 56 }, fisik: FISIK, klasifikasi: k.data.klasifikasi, listrik: k.data.listrik,
  };
  const jejak = buatJejakHitung(T, data, snapshot) as any;
  return { data, jejak, snapshot: snapshot as any };
};

// Kasus 1 = sertifikat contoh Ridhwan (Kelas I, Tipe BF): 221,5 / 0,111 / 250 / 45,6 / 20,6 · Laik Pakai
const k1 = fx.kasus[0];
const l1 = lkkDari(k1);
const isi = isianListrik(l1, ctx);
cek('jejak hitung lengkap', l1.jejak?.lengkap === true, JSON.stringify(l1.jejak?.hasil?.kurang));
const hilang = kunciIsian(TL).filter((k) => !(k in isi));
cek('semua kunci tata letak dipenuhi', hilang.length === 0, hilang.join(','));
cek('tata letak 3 halaman, hanya isian (teks tetap dari templat)', TL.halaman === 3 && Object.values(TL.teks).flat().every((o) => o.j === 'f'));
cek('Nama Alat dari isian teknisi', isi.namaAlat === 'ESWT/Electro Shortwave teraphy', String(isi.namaAlat));
cek('Diterbitkan = penerimaan + 1 hari; Kalibrasi Ulang +1 tahun', isi.tanggalTerbit === '27 Oktober 2026' && isi.kalibrasiUlang === '26 Oktober 2027', `${isi.tanggalTerbit} | ${isi.kalibrasiUlang}`);
cek('dua baris standar: ESA & termohigrometer', String(isi.kalibrator1).startsWith('Electrical Safety Analyzer  Tipe: ESA-612') && String(isi.kalibrator1).endsWith('Traceability: LK-110-IDN') && String(isi.kalibrator2).includes('Tipe: HTC-2'), `${isi.kalibrator1} / ${isi.kalibrator2}`);
cek('tanpa isian pompa (rentang, resolusi, aliran, penyumbatan, standar ke-3)', !['rentangUkur', 'resolusi', 'kalibrator3', 'sumbatStd', 'a0_std', 'tolSumbat'].some((k) => k in isi));
cek('nilai terukur = contoh sertifikat Excel (221,5 · 0,111 · 250 · 45,6 · 20,6)', [isi.listrik0, isi.listrik1, isi.listrik2, isi.listrik3, isi.listrik4].join(' ') === '221,5 0,111 250 45,6 20,6', [isi.listrik0, isi.listrik1, isi.listrik2, isi.listrik3, isi.listrik4].join(' '));
cek('toleransi = Excel (220 ±10 % · ≤ 0,3 · > 2 · ≤ 500 · ≤ 5000)', [isi.tol0, isi.tol1, isi.tol2, isi.tol3, isi.tol4].join(' | ') === '220 ±10 % | ≤ 0,3 | > 2 | ≤ 500 | ≤ 5000', [isi.tol0, isi.tol1, isi.tol2, isi.tol3, isi.tol4].join(' | '));
cek('kesimpulan Laik Pakai bergaris bawah', isi.kesimpulan === 'Laik Pakai' && susun(TL, isi)[2].teks.some((t) => t.garisBawah && t.teks === 'Laik Pakai'));

// Kelas II, Tipe B: resistansi PE & AP tidak berlaku → "-"; batas bocor Alternatif Kelas II 500
const l2 = lkkDari(fx.kasus.find((k: any) => k.nama === 'kelas2-tipe-b-alternatif'));
const isi2 = isianListrik(l2, ctx);
cek('Kelas II / Tipe B: PE & AP dicetak "-"', isi2.listrik1 === '-' && isi2.tol1 === '-' && isi2.listrik4 === '-' && isi2.tol4 === '-', JSON.stringify([isi2.listrik1, isi2.tol1, isi2.listrik4, isi2.tol4]));
cek('arus bocor 300 → terukur interpolasi 3 desimal', isi2.listrik3 === '300,651' && isi2.tol3 === '≤ 500', `${isi2.listrik3} ${isi2.tol3}`);
// Tipe CF, kabel catu daya saja: batas 0,1 Ω & 50 µA → Tidak Laik Pakai
const l3 = lkkDari(fx.kasus.find((k: any) => k.nama === 'cf-ap-gagal-diferensial'));
const isi3 = isianListrik(l3, ctx);
cek('Tipe CF: batas ≤ 0,1 & ≤ 50, kesimpulan Tidak Laik Pakai', isi3.tol1 === '≤ 0,1' && isi3.tol4 === '≤ 50' && isi3.kesimpulan === 'Tidak Laik Pakai', `${isi3.tol1} ${isi3.tol4} ${isi3.kesimpulan}`);
// Nama Alat kosong → nama template
cek('Nama Alat kosong → nama dari konteks', isianListrik(lkkDari(k1, ''), ctx).namaAlat === 'Keselamatan Listrik');
cek('tanpa tanda sementara / nama Tera SMK / kata terlarang', !/SEMENTARA|tera\s*smk|Tambahan|Additional|sesuai KMK terbaru|diperbarui|parameter baru/i.test(JSON.stringify(isi)));
const kosong = isianListrik({ data: null, jejak: null, snapshot: null }, { ...ctx, tanggalKalibrasi: null as any, tanggalTerbit: null as any });
cek('data kosong → semua kunci ada, tanpa galat', kunciIsian(TL).every((k) => k in kosong));

// PDF: kertas cetak Excel + kop (font standar; Carlito dipasang di server)
const templat = readFileSync(new URL('../../public/tera/sertifikat/templat-keselamatan-listrik.pdf', import.meta.url));
cek('templat 3 halaman', (await PDFDocument.load(templat)).getPageCount() === 3);
const kopPath = process.env.KOP_NON_KAN;
const doc = await PDFDocument.create();
const f = { r: await doc.embedFont(StandardFonts.Helvetica), b: await doc.embedFont(StandardFonts.HelveticaBold), i: await doc.embedFont(StandardFonts.HelveticaOblique) };
const isiUji = JSON.parse(JSON.stringify(isi).replace(/[^\u0000-ÿ]/g, (c) => ({ '≤': '<=', '±': '±', 'Ω': 'Ohm', 'µ': 'µ' } as Record<string, string>)[c] ?? '?'));
await gambarSertifikat(doc, TL, isiUji, f, kopPath && existsSync(kopPath) ? readFileSync(kopPath) : null, null, templat);
const bytes = await doc.save();
cek('PDF 3 halaman A4', (await PDFDocument.load(bytes)).getPageCount() === 3);
if (process.env.KELUAR) {
  mkdirSync(process.env.KELUAR, { recursive: true });
  writeFileSync(`${process.env.KELUAR}/uji-keselamatan-listrik.pdf`, bytes);
}
console.log(`${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
