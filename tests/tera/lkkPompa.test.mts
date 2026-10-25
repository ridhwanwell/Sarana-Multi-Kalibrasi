// Uji lapisan LKK pompa (Tahap 6.3a): salinan sertifikat IDA/ESA → tabel mesin hitung, kelengkapan isian,
// jejak hitung, pemeriksa server. Jalankan: npm run test:tera:lkk-pompa
import { readFileSync } from 'node:fs';
import { hitungPompa, type KalibratorPompa } from '../../src/tera/shared/hitungPompa.ts';
import { TEMPLATE_INFUSION_PUMP_V1 as T, TEMPLATE_INFUSION_PUMP_V2 as T2 } from '../../src/tera/shared/templates/infusionPump.ts';
import { buatJejakHitung } from '../../src/tera/shared/jejak.ts';
import { daftarBagian, daftarStandar, jepretStandar, opsiFisik, periksaIsian, susunPilihan, type KalibratorMin } from '../../src/tera/shared/isian.ts';
import { kalibratorDariSnapshot, SUMBER_TABEL } from '../../src/tera/shared/lkkPompa.ts';
import { periksaPaketServer } from '../../src/tera/shared/periksaServer.ts';

let lulus = 0, gagal = 0;
const cek = (n: string, ok: boolean, d = '') => { ok ? lulus++ : gagal++; if (!ok || process.env.RINCI) console.log((ok ? '✅ ' : '❌ ') + n + (ok ? '' : '  — ' + d)); };
const fx = JSON.parse(readFileSync(new URL('./fixtures/infusion-golden-v1.json', import.meta.url), 'utf8'));
const kasus = fx.kasus[0];
const kal = kasus.kalibrator as KalibratorPompa;

// Baris master seperti dikirim /api/tera/master (titik berbentuk naik = turun)
const baris = (asetId: string, nama: string, parameter: string, tabel: { titik: number; koreksi: number; u95: number }[]): KalibratorMin & { points: any[] } => ({
  asetId, nama, merk: 'Fluke', model: 'X', nomorSeri: '1', parameter, nomorSertifikat: 'YK.05.02/E.IX/6908/2026', tertelusur: 'SNSU - BSN',
  tanggalKalibrasi: '2026-02-03', berlakuSampai: '2027-01-30', rekomendasi: false,
  points: tabel.map((t) => ({ titik: t.titik, koreksiNaik: t.koreksi, koreksiTurun: t.koreksi, u95Naik: t.u95, u95Turun: t.u95 })),
});
const master = [
  baris('CAL-030', 'Infuse Device Analyzer', 'aliran_mlh', kal.aliran), baris('CAL-030', 'Infuse Device Analyzer', 'tekanan_psi', kal.tekanan),
  baris('CAL-042', 'Electrical Safety Analyzer', 'tegangan_v', kal.listrik.tegangan), baris('CAL-042', 'Electrical Safety Analyzer', 'resistansi_ohm', kal.listrik.resistansi),
  baris('CAL-042', 'Electrical Safety Analyzer', 'isolasi_mohm', kal.listrik.isolasi), baris('CAL-042', 'Electrical Safety Analyzer', 'arus_bocor_ua', kal.listrik.arus_bocor),
  { ...baris('CAL-027', 'Digital Thermohygrometer', 'suhu_c', [{ titik: 20, koreksi: 0.1, u95: 0.3 }]), rekomendasi: true },
  { ...baris('CAL-027', 'Digital Thermohygrometer', 'kelembaban_rh', [{ titik: 40, koreksi: 1, u95: 2 }]), rekomendasi: true },
];
const jepret = (k: any) => JSON.parse(JSON.stringify(k));

// Teknisi memilih alat standar → snapshot
const snapshot: Record<string, unknown> = {};
for (const d of daftarStandar(T)) {
  const pilihan = susunPilihan(d, master as any);
  cek(`standar ${d.peran}: tepat satu pilihan lengkap`, pilihan.length === 1 && pilihan[0].lengkap, JSON.stringify(pilihan.map((p) => [p.kunci, p.lengkap])));
  snapshot[d.peran] = jepretStandar(d, pilihan[0] as any, jepret);
}
cek('snapshot IDA berbentuk multi dengan 2 tabel', (snapshot.ida as any).jenis === 'multi' && Object.keys((snapshot.ida as any).tabel).join() === 'aliran_mlh,tekanan_psi');
cek('snapshot ESA berbentuk multi dengan 4 tabel', Object.keys((snapshot.esa as any).tabel).length === 4);
cek('snapshot termohigrometer tetap bentuk suhu/kelembaban', !!(snapshot.termohigrometer as any).suhu && !!(snapshot.termohigrometer as any).kelembaban);
cek('semua nama tabel punya sumber', Object.keys(SUMBER_TABEL).length === 6);

// Tabel dari snapshot = tabel golden
const dari = kalibratorDariSnapshot(snapshot);
cek('tabel aliran dari snapshot = golden', JSON.stringify(dari.aliran) === JSON.stringify(kal.aliran));
cek('tabel tekanan dari snapshot = golden', JSON.stringify(dari.tekanan) === JSON.stringify(kal.tekanan));
cek('tabel listrik dari snapshot = golden', JSON.stringify(dari.listrik) === JSON.stringify(kal.listrik));
cek('snapshot kosong → tabel kosong, tidak crash', kalibratorDariSnapshot(null).aliran.length === 0 && kalibratorDariSnapshot({ ida: { tabel: { aliran_mlh: { points: 'rusak' } } } }).aliran.length === 0);

// LKK lengkap
const lingkungan = { suhuAwal: 24.5, suhuAkhir: 24.8, rhAwal: 55, rhAkhir: 56 };
const identitas = { merek: 'Terumo', tipe: 'TE-LM800', noSeri: 'INF-TEST-0001', rentangUkur: '1 - 999 mL/h', resolusi: 0.1, jenisSkala: 'Digital', tanggalPenerimaan: '2026-10-26', ruang: 'Melati' };
const data = { identitas, lingkungan, fisik: kasus.data.fisik, listrik: kasus.data.listrik, aliran: kasus.data.aliran, sumbat: kasus.data.sumbat };
const isi = { data, tanggal: '2026-10-26', snapshot };

cek('bagian: Keselamatan listrik tersedia untuk pompa', daftarBagian(T).find((b) => b.id === 'keselamatan')?.tersedia === true);
cek('opsi fisik/fungsi pompa berbeda', opsiFisik(T).fungsi[0] === 'Berfungsi' && opsiFisik(T).fisik[0] === 'Baik');
const kurang = periksaIsian(T, isi);
cek('LKK lengkap: tidak ada yang kurang', kurang.length === 0, JSON.stringify(kurang));

const jejak = buatJejakHitung(T, data, snapshot);
const langsung = hitungPompa(T, data as any, kal);
cek('jejak lengkap & kesimpulan sama dengan mesin langsung', !!jejak && jejak.lengkap && jejak.kesimpulan === langsung.kesimpulan && jejak.jenis === 'pompa');
cek('jejak deterministik (dua kali sama persis)', JSON.stringify(jejak) === JSON.stringify(buatJejakHitung(T, data, snapshot)));
cek('jejak mencatat identitas IDA & ESA', jejak?.kalibrator.ida?.nama === 'Infuse Device Analyzer' && jejak?.kalibrator.esa?.jumlahTabel === 4);

// Kekurangan terbaca per bagian
const sebagian = { ...isi, data: { ...data, listrik: { tegangan: 221.5 }, aliran: { '25': [25, 25] }, sumbat: { setting: 100, bacaan: [] } } };
const k2 = periksaIsian(T, sebagian);
cek('kurang: listrik 3 butir (bagian keselamatan)', k2.filter((k) => k.bagian === 'keselamatan').length === 3);
cek('kurang: aliran 5 titik + penyumbatan (bagian kinerja)', k2.filter((k) => k.bagian === 'kinerja').length === 5 + 1 - 0 && k2.some((k) => k.teks.startsWith('Penyumbatan')), JSON.stringify(k2.filter((k) => k.bagian === 'kinerja').map((k) => k.teks)));
cek('fisik kosong terbaca kurang', periksaIsian(T, { ...isi, data: { ...data, fisik: {} } }).filter((k) => k.bagian === 'fisik').length === T.fisik.length);
cek('fungsi memakai kata "Berfungsi" (bukan Baik)', periksaIsian(T, { ...isi, data: { ...data, fisik: { badan: { fisik: 'Baik', fungsi: 'Baik' }, kontrol: { fisik: 'Baik', fungsi: 'Berfungsi' }, kabel: { fisik: 'Baik', fungsi: 'Berfungsi' } } } }).filter((k) => k.bagian === 'fisik').length === 1);

// Data kosong total & tanpa kalibrator: tidak crash
const kosong = periksaIsian(T, { data: {}, tanggal: null, snapshot: null });
cek('data kosong: banyak kekurangan, tidak crash', kosong.length > 10);
const jKosong = buatJejakHitung(T, {}, null);
cek('jejak data kosong: tidak lengkap, kesimpulan null', !!jKosong && !jKosong.lengkap && jKosong.kesimpulan === null);
cek('data rusak (bukan objek) tidak crash', buatJejakHitung(T, 'rusak' as any, 5 as any) !== undefined);

// Alat standar expired memblokir
const expired = { ...isi, tanggal: '2027-02-01' };
cek('IDA expired pada tanggal pelaksanaan → merah', periksaIsian(T, expired).some((k) => k.merah && k.teks.includes('Infusion Device Analyzer')));

// Pemeriksa server
const paket = { data, results: jejak as any, calibratorSnapshot: snapshot, tanggalKalibrasi: '2026-10-26', templateKode: T.kode_alat, templateVersi: T.versi };
const ok = periksaPaketServer(T, paket);
cek('server: jejak cocok & boleh ACC', ok.jejakCocok && ok.bolehAcc && ok.penanda.length === 0, JSON.stringify(ok.penanda));
cek('server: kesimpulan server = kesimpulan mesin', ok.kesimpulanServer === langsung.kesimpulan);
const diubah = JSON.parse(JSON.stringify(jejak)); diubah.hasil.skor.total = 5;
const buruk = periksaPaketServer(T, { ...paket, results: diubah });
cek('server: jejak diubah → ditandai & ACC diblokir', !buruk.jejakCocok && !buruk.bolehAcc && buruk.penanda.some((p) => p.kode === 'jejak_beda'));
cek('server: tanpa jejak → ditandai', periksaPaketServer(T, { ...paket, results: null }).penanda.some((p) => p.kode === 'jejak_hilang'));
cek('server: template tidak dikenal → ditandai', periksaPaketServer(null, paket).penanda.some((p) => p.kode === 'template_rusak'));

// ── Template v2 (26 Okt 2026): tanpa jenis skala, resolusi isian bebas; hasil sama dengan v1 Digital ──
{
  const { jenisSkala: _x, ...idenV2 } = identitas as any;
  const dataV2 = { ...(data as any), identitas: idenV2 };
  const h1 = hitungPompa(T, data as any, kalibratorDariSnapshot(snapshot as any));
  const h2 = hitungPompa(T2, dataV2, kalibratorDariSnapshot(snapshot as any));
  cek('v2: tanpa jenis skala di data tetap lengkap & hasil = v1 Digital', h2.kurang.length === 0 && JSON.stringify(h1.skor) === JSON.stringify(h2.skor) && JSON.stringify(h1.aliran) === JSON.stringify(h2.aliran), h2.kurang.join(';'));
  const j2 = buatJejakHitung(T2, dataV2, snapshot as any) as any;
  cek('v2: jejak mencatat jenis skala efektif Digital', j2?.masukan?.jenisSkala === 'Digital' && j2.lengkap === true);
  const kurangV2 = periksaIsian(T2, { data: dataV2, snapshot: snapshot as any, tanggal: '2026-10-26' } as any);
  cek('v2: periksaIsian tidak meminta jenis skala; resolusi 0,3 (bebas) diterima', !kurangV2.some((k) => /skala/i.test(k.teks)) && !kurangV2.some((k) => /Resolusi/.test(k.teks)), JSON.stringify(kurangV2.slice(0, 4)));
  const tanpaRes = periksaIsian(T2, { data: { ...dataV2, identitas: { ...idenV2, resolusi: undefined } }, snapshot: snapshot as any, tanggal: '2026-10-26' } as any);
  cek('v2: resolusi kosong → diminta diisi', tanpaRes.some((k) => /Resolusi belum diisi/.test(k.teks)));
  const h3 = hitungPompa(T2, { ...dataV2, identitas: { ...idenV2, resolusi: 0.3 } }, kalibratorDariSnapshot(snapshot as any));
  cek('v2: resolusi bebas 0,3 dihitung (U95 aliran berubah dari 0,1)', h3.kurang.length === 0 && JSON.stringify(h3.aliran) !== JSON.stringify(h2.aliran));
  cek('v2: label identitas mengikuti Excel & tanpa Jenis', T2.identitasBidang.map((b) => b.label).join('|') === 'Merk Pabrik|Tipe|No. Seri|Rentang Ukur (mis. 1 - 999 mL/h)|Resolusi|Tanggal penerimaan barang kalibrasi|Ruangan');
}

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
