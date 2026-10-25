// Uji sertifikat Syringe Pump: isian dari LKK (angka golden Excel), kelengkapan kunci tata letak, aturan teks, tanggal, dan PDF 3 halaman.
// Jalankan: npm run test:tera:sertifikat-syringe   (opsional KOP_NON_KAN=/jalur/KOP_SERTIF_NON_KAN.pdf, KELUAR=/folder → tulis PDF uji & isian.json)
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { TEMPLATE_SYRINGE_PUMP_V1 as T } from '../../src/tera/shared/templates/syringePump.ts';
import { buatJejakHitung } from '../../src/tera/shared/jejak.ts';
import { daftarStandar, jepretStandar, susunPilihan, type KalibratorMin } from '../../src/tera/shared/isian.ts';
import { TATA_LETAK_SYRINGE_PUMP as TL } from '../../src/tera/pdf/tataLetakSyringe.ts';
import { susun, kunciIsian } from '../../src/tera/pdf/susunSertifikat.ts';
import { isianPompa, tambahHari } from '../../src/tera/pdf/formatSertifikatPompa.ts';
import { gambarSertifikat } from '../../src/tera/pdf/renderSertifikat.ts';

let lulus = 0, gagal = 0;
const cek = (n: string, ok: boolean, d = '') => { ok ? lulus++ : gagal++; if (!ok || process.env.RINCI) console.log((ok ? '✅ ' : '❌ ') + n + (ok ? '' : '  — ' + d)); };

const fx = JSON.parse(readFileSync(new URL('./fixtures/syringe-golden-v1.json', import.meta.url), 'utf8'));
const kasus = fx.kasus[0]; const kal = kasus.kalibrator;
const baris = (asetId: string, nama: string, model: string, nomorSeri: string, sert: string, tertelusur: string, parameter: string, tabel: any[]): KalibratorMin & { points: any[] } => ({
  asetId, nama, merk: 'X', model, nomorSeri, parameter, nomorSertifikat: sert, tertelusur, tanggalKalibrasi: '2026-02-03', berlakuSampai: '2027-02-03', rekomendasi: false,
  points: tabel.map((t) => ({ titik: t.titik, koreksiNaik: t.koreksi, koreksiTurun: t.koreksi, u95Naik: t.u95, u95Turun: t.u95 })),
});
const IDA = (p: string, t: any[]) => baris('CAL-030', 'Infusion Device Analyzer', 'IDA-1S', '6732052', 'YK.05.02/E.IX/6908/2026', 'SNSU - BSN (Badan Standardisasi Nasional)', p, t);
const ESA = (p: string, t: any[]) => baris('CAL-042', 'Electrical Safety Analyzer', 'ESA-612', '6181067', 'YK.05.02/E.IX/5369/2026', 'LK-110-IDN (BPFK Jakarta)', p, t);
const HTC = (p: string, t: any[]) => ({ ...baris('CAL-027', 'Digital Thermohygrometer', 'HTC-2', 'AK-00040-SMK', 'C.250501008', 'LK-242-IDN (PT X)', p, t), rekomendasi: true });
const master = [
  IDA('aliran_mlh', kal.aliran), IDA('tekanan_psi', kal.tekanan),
  ESA('tegangan_v', kal.listrik.tegangan), ESA('resistansi_ohm', kal.listrik.resistansi), ESA('isolasi_mohm', kal.listrik.isolasi), ESA('arus_bocor_ua', kal.listrik.arus_bocor),
  HTC('suhu_c', [{ titik: 20, koreksi: 0.1, u95: 0.3 }, { titik: 25, koreksi: 0, u95: 0.3 }, { titik: 30, koreksi: -0.1, u95: 0.3 }]), HTC('kelembaban_rh', [{ titik: 40, koreksi: 0.8, u95: 2 }, { titik: 50, koreksi: 0.5, u95: 2 }, { titik: 60, koreksi: 0, u95: 2 }]),
];
const snapshot: Record<string, unknown> = {};
for (const d of daftarStandar(T)) snapshot[d.peran] = jepretStandar(d, susunPilihan(d, master as any)[0] as any, (k: any) => JSON.parse(JSON.stringify(k)));

const data: any = {
  identitas: { merek: 'Terumo', tipe: 'TE-LM800 (uji coba)', noSeri: 'INF-TEST-0001', rentangUkur: '0,1 - 99,9 mL/h', resolusi: 0.01, tanggalPenerimaan: '2026-10-26', ruang: 'Ruang Perawatan Melati' },
  lingkungan: { suhuAwal: 24.5, suhuAkhir: 24.8, rhAwal: 55, rhAkhir: 56 },
  fisik: kasus.data.fisik, listrik: kasus.data.listrik, aliran: kasus.data.aliran, sumbat: kasus.data.sumbat,
};
const jejak = buatJejakHitung(T, data, snapshot) as any;
const ctx = { bo: 'UJI-2610-001', noLabel: 'SMK/KAL/2610/001', namaAlat: 'Syringe Pump', namaRs: 'RSUD Contoh Surakarta (DATA UJI COBA)', alamatRs: 'Jl. Contoh No. 1, Banjarsari, Surakarta', teknisi: 'Junior Yudha Pamungkas, S.Tr.T.', tanggalKalibrasi: '2026-10-26', tanggalTerbit: '2026-10-30', penandatangan: { nama: 'Hafizh Pasifianto Utomo, S.Tr.T.', jabatan: 'Manajer Teknik', jabatanEn: 'Technical Manager' } };
const isi = isianPompa({ data, jejak, snapshot: snapshot as any }, ctx);

cek('tambahHari lintas bulan/tahun', tambahHari('2026-10-31', 1) === '2026-11-01' && tambahHari('2026-12-31', 1) === '2027-01-01' && tambahHari('rusak', 1) === '');
const kunci = kunciIsian(TL);
const hilang = kunci.filter((k) => !(k in isi));
cek('semua kunci tata letak dipenuhi', hilang.length === 0, hilang.join(','));
cek('tata letak 3 halaman, tanpa teks tetap (semua dari templat)', TL.halaman === 3 && Object.values(TL.teks).flat().every((o) => o.j === 'f'));
cek('Diterbitkan = penerimaan + 1 hari; Kalibrasi Ulang +1 tahun', isi.tanggalTerbit === '27 Oktober 2026' && isi.kalibrasiUlang === '26 Oktober 2027', `${isi.tanggalTerbit} | ${isi.kalibrasiUlang}`);
cek('penerimaan kosong → tanggal terbit dari ACC', isianPompa({ data: { identitas: {} }, jejak: null, snapshot: null }, ctx).tanggalTerbit === '30 Oktober 2026');
cek('rentang ukur dipisah dari satuan', isi.rentangUkur === '0,1 - 99,9' && isi.satuanRentang === 'mL/h' && isi.resolusi === '0,01' && isi.satuanResolusi === 'mL/h', `${isi.rentangUkur}|${isi.satuanRentang}`);
cek('baris standar IDA', isi.kalibrator1 === 'Infusion Device Analyzer  Tipe: IDA-1S  s/n: 6732052  Cert. Number: YK.05.02/E.IX/6908/2026  Traceability: SNSU - BSN', String(isi.kalibrator1));
cek('baris standar ESA & HTC', String(isi.kalibrator2).endsWith('Traceability: LK-110-IDN') && String(isi.kalibrator3).includes('Tipe: HTC-2'), `${isi.kalibrator2} / ${isi.kalibrator3}`);
cek('lingkungan berformat', /^\( \d+,\d±\d+(,\d+)? \)$/.test(String(isi.suhuRuang)) && /^\( \d+±\d+(,\d+)? \)$/.test(String(isi.rhRuang)), `${isi.suhuRuang} ${isi.rhRuang}`);
cek('fisik & fungsi 3 butir', [1, 2, 3].every((i) => isi[`fisik${i}`] === 'Baik' && isi[`fungsi${i}`] === 'Berfungsi'));

// Angka sama dengan jejak hitung (yang sudah sama dengan Excel di tes golden)
const h = jejak.hasil;
cek('listrik terukur dari jejak', isi.listrik0 === String(Number(h.listrik.tegangan.terukur.toFixed(3))).replace('.', ',') && !!isi.listrik3, JSON.stringify([isi.listrik0, isi.listrik3]));
cek('5 baris aliran terisi dari jejak', [0, 1, 2, 3, 4].every((i) => isi[`a${i}_std`] && isi[`a${i}_kor`] && isi[`a${i}_u`] && isi[`a${i}_alat`] === String(T.kinerja.titikAliran[i])));
cek('aliran 10 mL/h = angka jejak (2 desimal, koma)', isi.a2_std === h.aliran.titik[2].rataRata.toFixed(2).replace('.', ',') && isi.a2_u === h.aliran.titik[2].u95Cetak.toFixed(2).replace('.', ','), `${isi.a2_std} ${isi.a2_u}`);
cek('koreksi negatif memakai tanda minus', Object.keys(isi).some((k) => /^a\d_kor$/.test(k)) && [0, 1, 2, 3, 4].every((i) => String(isi[`a${i}_kor`]).startsWith(h.aliran.titik[i].koreksi < 0 ? '-' : '') ));
cek('penyumbatan', isi.sumbatSetting === '100,0' && isi.sumbatStd === h.sumbat.rataRata.toFixed(1).replace('.', ',') && isi.sumbatU === h.sumbat.u95Cetak.toFixed(2).replace('.', ','), JSON.stringify([isi.sumbatSetting, isi.sumbatStd, isi.sumbatU]));
cek('kesimpulan dari jejak', isi.kesimpulan === jejak.kesimpulan && ['Laik Pakai', 'Tidak Laik Pakai'].includes(String(isi.kesimpulan)), String(isi.kesimpulan));
cek('tanpa tanda sementara / nama Tera SMK / kata terlarang', !/SEMENTARA|tera\s*smk|Tambahan|Additional|sesuai KMK terbaru|diperbarui|parameter baru/i.test(JSON.stringify(isi)));

const kosong = isianPompa({ data: null, jejak: null, snapshot: null }, { ...ctx, tanggalKalibrasi: null, tanggalTerbit: null });
cek('data kosong → semua kunci ada, tanpa galat', kunci.every((k) => k in kosong));
const hal = susun(TL, kosong);
cek('isian kosong tampil "-"', hal.every((p) => p.teks.every((t) => t.isian && (t.teks === '-' || t.teks.length > 0))));
cek('garis bawah kesimpulan', susun(TL, isi)[2].teks.some((t) => t.garisBawah && t.teks === isi.kesimpulan));

// PDF: templat Excel + kop (font standar; font Carlito dipasang di server)
const templat = readFileSync(new URL('../../public/tera/sertifikat/templat-syringe-pump.pdf', import.meta.url));
cek('templat 3 halaman', (await PDFDocument.load(templat)).getPageCount() === 3);
const kopPath = process.env.KOP_NON_KAN;
const doc = await PDFDocument.create();
const f = { r: await doc.embedFont(StandardFonts.Helvetica), b: await doc.embedFont(StandardFonts.HelveticaBold), i: await doc.embedFont(StandardFonts.HelveticaOblique) };
const TLuji = JSON.parse(JSON.stringify(TL));
const isiUji = JSON.parse(JSON.stringify(isi).replace(/[^\u0000-ÿ]/g, '?'));
await gambarSertifikat(doc, TLuji, isiUji, f, kopPath && existsSync(kopPath) ? readFileSync(kopPath) : null, null, templat);
const bytes = await doc.save();
cek('PDF 3 halaman A4', (await PDFDocument.load(bytes)).getPageCount() === 3);
if (process.env.KELUAR) {
  mkdirSync(process.env.KELUAR, { recursive: true });
  writeFileSync(`${process.env.KELUAR}/uji-syringe.pdf`, bytes);
  writeFileSync(`${process.env.KELUAR}/isian-syringe.json`, JSON.stringify(susun(TL, isi), null, 1));
}
console.log(`${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
