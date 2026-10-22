// Uji pemeriksa server (4.4a): hitung ulang = cocok; data diubah / jejak hilang / expired / lingkungan luar → penanda merah, ACC diblokir.
// Jalankan: npx tsx tests/tera/periksaServer.test.mts
import { readFileSync } from 'node:fs';
import { periksaPaketServer } from '../../src/tera/shared/periksaServer.ts';
import { buatJejakHitung } from '../../src/tera/shared/jejak.ts';
import { TEMPLATE_SPHYGMOMANOMETER as T } from '../../src/tera/shared/templates/sphygmomanometer.ts';

let lulus = 0, gagal = 0;
const cek = (n: string, ok: boolean, d = '') => { ok ? lulus++ : gagal++; if (!ok || process.env.RINCI) console.log((ok ? '✅ ' : '❌ ') + n + (ok ? '' : '  — ' + d)); };
const salin = <X,>(x: X): X => JSON.parse(JSON.stringify(x));

const fx = JSON.parse(readFileSync(new URL('./fixtures/sphygmo-golden-v4.json', import.meta.url), 'utf8'));
const kal = fx.kasus[0].kalibrator;
const dasar = () => ({
  data: {
    identitas: { merek: 'ABN', tipe: 'ABN-1', noSeri: '123', rentangUkur: 300, resolusi: 2, jenisSkala: 'Analog', tanggalPenerimaan: '2026-10-19', ruang: 'KIA' },
    lingkungan: { suhuAwal: 27.7, suhuAkhir: 27, rhAwal: 56, rhAkhir: 59 },
    fisik: { badan: { fisik: 'Baik', fungsi: 'Baik' }, level_cairan: { fisik: 'Baik', fungsi: 'Baik' }, tabung_selang: { fisik: 'Baik', fungsi: 'Baik' } },
    fisikTambahan: { gauge: 'Baik', konektor: 'Baik', label: 'Baik', manset: 'Baik', titik_nol: 'Baik' },
    bocor: { bacaan: 240 }, lajuBuang: { waktu: 8 },
    kinerja: { tekanan: Object.fromEntries([0, 50, 100, 150, 200, 250].map((t) => [String(t), { naik: [t, t + 1, t], turun: [t, t, t + 1] }])) },
  } as any,
  snapshot: {
    tekanan: { asetId: 'CAL-037', nama: 'DPM', nomorSertifikat: 'X', berlakuSampai: '2027-03-04', points: kal },
    stopwatch: { asetId: 'S1', berlakuSampai: null },
    termohigrometer: { asetId: 'T1', berlakuSampai: '2027-03-04', suhu: { points: [] }, kelembaban: { points: [] } },
  } as any,
});
const paket = (d = dasar()) => ({
  data: d.data, calibratorSnapshot: d.snapshot, tanggalKalibrasi: '2026-10-20', templateKode: T.kode_alat, templateVersi: T.versi,
  results: buatJejakHitung(T, d.data, d.snapshot) as any,
});

{
  const h = periksaPaketServer(T, paket());
  cek('LKK benar → jejak cocok, tanpa penanda, boleh ACC', h.jejakCocok && h.penanda.length === 0 && h.bolehAcc, JSON.stringify(h.penanda));
  cek('kesimpulan server terisi', h.kesimpulanServer === 'Laik Pakai' || h.kesimpulanServer === 'Tidak Laik Pakai');
}
{
  const p = paket(); p.results.hasil.kinerja.tekanan.titik[0].koreksi += 0.5;
  const h = periksaPaketServer(T, p);
  cek('angka hasil diubah → jejak_beda, ACC diblokir', !h.jejakCocok && h.penanda.some((x) => x.kode === 'jejak_beda') && !h.bolehAcc);
}
{
  const p = paket(); p.data = salin(p.data); p.data.kinerja.tekanan['100'].naik[0] = 130;
  const h = periksaPaketServer(T, p);
  cek('bacaan diubah tanpa hitung ulang → jejak_beda', !h.jejakCocok && h.penanda.some((x) => x.kode === 'jejak_beda'));
}
{
  const p = paket(); p.results = null;
  const h = periksaPaketServer(T, p);
  cek('tanpa jejak → jejak_hilang, ACC diblokir', h.penanda.some((x) => x.kode === 'jejak_hilang') && !h.bolehAcc);
}
{
  const p = paket(); p.calibratorSnapshot = salin(p.calibratorSnapshot); p.calibratorSnapshot.tekanan.berlakuSampai = '2026-10-19';
  p.results = buatJejakHitung(T, p.data, p.calibratorSnapshot) as any;
  const h = periksaPaketServer(T, p);
  cek('standar expired → standar_expired merah, ACC diblokir (data tetap diterima)', h.penanda.some((x) => x.kode === 'standar_expired' && x.blokirAcc) && !h.bolehAcc);
}
{
  const p = paket(); p.data = salin(p.data); p.data.lingkungan.suhuAwal = 60;
  p.results = buatJejakHitung(T, p.data, p.calibratorSnapshot) as any;
  const h = periksaPaketServer(T, p);
  cek('suhu di luar batas → lingkungan_luar merah', h.penanda.some((x) => x.kode === 'lingkungan_luar') && !h.bolehAcc);
}
{
  const p = paket(); p.data = salin(p.data); delete p.data.bocor;
  p.results = buatJejakHitung(T, p.data, p.calibratorSnapshot) as any;
  const h = periksaPaketServer(T, p);
  cek('isian wajib kosong → data_belum_lengkap', h.penanda.some((x) => x.kode === 'data_belum_lengkap') && !h.bolehAcc);
}
{
  const h = periksaPaketServer(null, paket());
  cek('template tidak ada → template_rusak, tidak crash', h.penanda.some((x) => x.kode === 'template_rusak') && !h.bolehAcc);
  const h2 = periksaPaketServer(T, { ...paket(), templateVersi: 99 });
  cek('versi template beda → ditandai', h2.penanda.some((x) => x.kode === 'template_rusak'));
  const h3 = periksaPaketServer(T, { data: null as any, results: null, calibratorSnapshot: null, tanggalKalibrasi: null, templateKode: T.kode_alat, templateVersi: T.versi });
  cek('data rusak total tidak melempar galat', h3.penanda.length > 0 && !h3.bolehAcc);
}
{
  const a = JSON.stringify(periksaPaketServer(T, paket())), b = JSON.stringify(periksaPaketServer(T, paket()));
  cek('deterministik (dua kali sama)', a === b);
}
{
  // Template yang dibaca server dari database (salinan baris v2) harus menghasilkan jejak SAMA dengan template di tablet
  const tplDb = JSON.parse(readFileSync(new URL('./fixtures/sphygmo-template-db-v2.json', import.meta.url), 'utf8'));
  const p = paket();
  const h = periksaPaketServer(tplDb, p);
  cek('template dari database v2 = template tablet (jejak cocok)', h.jejakCocok && h.bolehAcc, JSON.stringify(h.penanda));
}
{
  // Nilai kalibrator SEMENTARA: BO uji boleh ACC, BO sungguhan diblokir
  const p = paket(); p.calibratorSnapshot = salin(p.calibratorSnapshot); p.calibratorSnapshot.stopwatch.sumber = 'NILAI SEMENTARA (karangan untuk uji)';
  p.results = buatJejakHitung(T, p.data, p.calibratorSnapshot) as any;
  const uji = periksaPaketServer(T, { ...p, isTest: true });
  const nyata = periksaPaketServer(T, { ...p, isTest: false });
  cek('nilai sementara + BO uji → penanda tapi boleh ACC', uji.penanda.some((x) => x.kode === 'standar_sementara' && !x.blokirAcc) && uji.bolehAcc, JSON.stringify(uji.penanda));
  cek('nilai sementara + BO sungguhan → ACC diblokir', nyata.penanda.some((x) => x.kode === 'standar_sementara' && x.blokirAcc) && !nyata.bolehAcc);
  cek('tanpa nilai sementara → tidak ada penanda itu', !periksaPaketServer(T, paket()).penanda.some((x) => x.kode === 'standar_sementara'));
}
console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
