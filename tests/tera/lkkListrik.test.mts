// Uji lapisan LKK KESELAMATAN LISTRIK: snapshot ESA → tabel, bagian layar (tanpa Kinerja), kelengkapan (klasifikasi,
// uji tidak berlaku), jejak hitung, pemeriksa server, pemetaan nama alat PO → template, pembersih template di perangkat.
// Jalankan: npm run test:tera:lkk-listrik
import { readFileSync } from 'node:fs';
import { TEMPLATE_KESELAMATAN_LISTRIK_V1 as T } from '../../src/tera/shared/templates/keselamatanListrik.ts';
import { TEMPLATE_INFUSION_PUMP_V4 } from '../../src/tera/shared/templates/infusionPump.ts';
import { buatJejakHitung } from '../../src/tera/shared/jejak.ts';
import { daftarBagian, daftarStandar, jepretStandar, periksaIsian, susunPilihan, type KalibratorMin } from '../../src/tera/shared/isian.ts';
import { periksaPaketServer } from '../../src/tera/shared/periksaServer.ts';
import { templateUntukAlat } from '../../src/tera/shared/nomorLabel.ts';
import { bersihkanTemplate } from '../../src/tera/data/masterLokal.ts';

let lulus = 0, gagal = 0;
const cek = (n: string, ok: boolean, d = '') => { ok ? lulus++ : gagal++; if (!ok || process.env.RINCI) console.log((ok ? '✅ ' : '❌ ') + n + (ok ? '' : '  — ' + d)); };
const fx = JSON.parse(readFileSync(new URL('./fixtures/listrik-golden-v1.json', import.meta.url), 'utf8'));
const kal = fx.kasus[0].kalibrator.listrik;

const baris = (asetId: string, nama: string, parameter: string, tabel: { titik: number; koreksi: number; u95: number }[]): KalibratorMin & { points: any[] } => ({
  asetId, nama, merk: 'Fluke', model: 'ESA-612', nomorSeri: '6181067', parameter, nomorSertifikat: 'YK.05.02/E.IX/5369/2026', tertelusur: 'LK-110-IDN',
  tanggalKalibrasi: '2026-01-30', berlakuSampai: '2027-01-30', rekomendasi: false,
  points: tabel.map((t) => ({ titik: t.titik, koreksiNaik: t.koreksi, koreksiTurun: t.koreksi, u95Naik: t.u95, u95Turun: t.u95 })),
});
const master = [
  baris('CAL-042', 'Electrical Safety Analyzer', 'tegangan_v', kal.tegangan), baris('CAL-042', 'Electrical Safety Analyzer', 'resistansi_ohm', kal.resistansi),
  baris('CAL-042', 'Electrical Safety Analyzer', 'isolasi_mohm', kal.isolasi), baris('CAL-042', 'Electrical Safety Analyzer', 'arus_bocor_ua', kal.arus_bocor),
  { ...baris('CAL-027', 'Digital Thermohygrometer', 'suhu_c', [{ titik: 20, koreksi: 0.1, u95: 0.3 }]), rekomendasi: true },
  { ...baris('CAL-027', 'Digital Thermohygrometer', 'kelembaban_rh', [{ titik: 40, koreksi: 1, u95: 2 }]), rekomendasi: true },
];
const snapshot: Record<string, unknown> = {};
for (const d of daftarStandar(T)) {
  const p = susunPilihan(d, master as any);
  cek(`standar ${d.peran}: satu pilihan lengkap`, p.length === 1 && p[0].lengkap);
  snapshot[d.peran] = jepretStandar(d, p[0] as any, (k: any) => JSON.parse(JSON.stringify(k)));
}
cek('standar hanya ESA + termohigrometer (tanpa IDA)', daftarStandar(T).map((d) => d.peran).join() === 'esa,termohigrometer');

const b = daftarBagian(T).map((x) => x.id);
cek('bagian: identitas → lingkungan → fisik → keselamatan → kesimpulan → ringkasan (tanpa Kinerja)', b.join() === 'identitas,lingkungan,fisik,keselamatan,kesimpulan,ringkasan', b.join());
cek('pompa tetap punya bagian Kinerja', daftarBagian(TEMPLATE_INFUSION_PUMP_V4).some((x) => x.id === 'kinerja'));

const k0 = fx.kasus[0];
const identitas = { namaAlat: 'ESWT', merek: 'BTL', tipe: 'Curapuls 970', noSeri: 'ESWT-TEST-0001', tanggalPenerimaan: '2026-10-26', ruang: 'Fisioterapi' };
const fisik = { badan: { fisik: 'Baik', fungsi: 'Berfungsi' }, kontrol: { fisik: 'Baik', fungsi: 'Berfungsi' }, kabel: { fisik: 'Baik', fungsi: 'Berfungsi' } };
const data = { identitas, lingkungan: { suhuAwal: 24.5, suhuAkhir: 24.8, rhAwal: 55, rhAkhir: 56 }, fisik, klasifikasi: k0.data.klasifikasi, listrik: k0.data.listrik };
const isi = { data, tanggal: '2026-10-26', snapshot };
const kurang = periksaIsian(T, isi);
cek('LKK lengkap: tidak ada yang kurang', kurang.length === 0, JSON.stringify(kurang));

const tanpaKlas = periksaIsian(T, { ...isi, data: { ...data, klasifikasi: {} } });
cek('klasifikasi kosong → 3 diminta di bagian keselamatan (cara ukur PE menunggu kelas)', tanpaKlas.filter((k) => k.bagian === 'keselamatan' && /belum dipilih/.test(k.teks)).length === 3, JSON.stringify(tanpaKlas));
const kelas2 = periksaIsian(T, { ...isi, data: { ...data, klasifikasi: { kelas: 'Kelas II', tipeAP: 'Tipe B', metodeBocor: 'Langsung' }, listrik: { tegangan: 220, resistansi_isolasi: 50, arus_bocor_peralatan: 20 } } });
cek('Kelas II + Tipe B: PE, cara ukur PE & AP tidak diminta', kelas2.length === 0, JSON.stringify(kelas2));
const tanpaNama = periksaIsian(T, { ...isi, data: { ...data, identitas: { ...identitas, namaAlat: '' } } });
cek('Nama Alat wajib', tanpaNama.some((k) => k.bagian === 'identitas' && /Nama Alat/.test(k.teks)));

const jejak = buatJejakHitung(T, data, snapshot);
cek('jejak: lengkap, kesimpulan = Excel', !!jejak && jejak.lengkap && jejak.kesimpulan === k0.harapan.kesimpulan, JSON.stringify(jejak?.hasil.kurang));
cek('jejak menyimpan klasifikasi & cara U95', JSON.stringify((jejak as any).masukan.klasifikasi) === JSON.stringify({ kelas: 'Kelas I', tipeAP: 'Tipe BF', kabelPE: 'Dapat dilepas - bersama kabel', metodeBocor: 'Langsung' }) && (jejak as any).aturan.ketidakpastianListrik === 'gum');
cek('jejak: tanpa aliran & skor', (jejak as any).hasil.aliran.titik.length === 0 && (jejak as any).aturan.kinerja === undefined);
cek('jejak deterministik', JSON.stringify(buatJejakHitung(T, data, snapshot)) === JSON.stringify(jejak));

const srv = periksaPaketServer(T, { templateKode: T.kode_alat, templateVersi: T.versi, data, results: jejak, calibratorSnapshot: snapshot, tanggalKalibrasi: '2026-10-26' } as any);
cek('server: jejak cocok, boleh ACC', srv.jejakCocok && srv.bolehAcc && srv.kesimpulanServer === k0.harapan.kesimpulan, JSON.stringify(srv.penanda));

// Nama alat PO → template
const daftar = [TEMPLATE_INFUSION_PUMP_V4, T];
cek('PO "ESWT" → Keselamatan Listrik', templateUntukAlat('ESWT', daftar)?.kode_alat === 'keselamatan_listrik');
cek('PO "  fundus   camera " → Keselamatan Listrik (huruf & spasi bebas)', templateUntukAlat('  fundus   camera ', daftar)?.kode_alat === 'keselamatan_listrik');
cek('PO "Infusion Pump" tetap Infusion Pump', templateUntukAlat('Infusion Pump', daftar)?.kode_alat === 'infusion_pump');
cek('PO tak dikenal → null', templateUntukAlat('Ventilator', daftar) === null);

// Template di perangkat
cek('template listrik lolos pembersih perangkat', bersihkanTemplate(JSON.parse(JSON.stringify(T)))?.kode_alat === 'keselamatan_listrik');
cek('template listrik tanpa klasifikasi ditolak', bersihkanTemplate({ ...JSON.parse(JSON.stringify(T)), klasifikasi: undefined }) === null);
cek('template pompa tetap lolos', bersihkanTemplate(JSON.parse(JSON.stringify(TEMPLATE_INFUSION_PUMP_V4)))?.kode_alat === 'infusion_pump');

console.log(`${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
