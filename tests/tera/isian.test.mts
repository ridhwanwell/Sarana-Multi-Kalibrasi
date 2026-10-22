// Uji ATURAN ISIAN LKK bagian 1–5 (Tahap 4.3c + 4.3d-2, PRD-AISTUDIO A1). Jalankan: npm run test:tera:isian
import { TEMPLATE_SPHYGMOMANOMETER as T } from '../../src/tera/shared/templates/sphygmomanometer.ts';
import {
  BIDANG_IDENTITAS_BAWAAN, STANDAR_BAWAAN, bagianLengkap, batasLingkungan, bidangIdentitas, daftarBagian, daftarStandar,
  jepretStandar, periksaIsian, statusBerlaku, statusSnapshot, susunPilihan, tabelRh, tabelSuhu,
} from '../../src/tera/shared/isian.ts';

let lulus = 0, gagal = 0;
const cek = (n: string, ok: boolean, d = '') => { ok ? lulus++ : gagal++; if (!ok || process.env.RINCI) console.log((ok ? '✅ ' : '❌ ') + n + (ok ? '' : '  — ' + d)); };

// ── Bagian
{
  const b = daftarBagian(T);
  cek('6 bagian: Identitas → Lingkungan → Fisik → Kinerja → Kesimpulan → Ringkasan', b.map((x) => x.id).join() === 'identitas,lingkungan,fisik,kinerja,kesimpulan,ringkasan', b.map((x) => x.id).join());
  cek('semua 6 bagian tersedia (sampai Ringkasan & Selesai)', b.every((x) => x.tersedia));
  const wajib = daftarBagian({ keselamatan_listrik: 'wajib' });
  cek('keselamatan listrik hanya bila template meminta (setelah Fisik)', wajib.map((x) => x.id).join() === 'identitas,lingkungan,fisik,keselamatan,kinerja,kesimpulan,ringkasan');
}
// ── Identitas & batas
cek('identitas bawaan = urutan Input 1 (8 kolom)', bidangIdentitas(T).map((b) => b.id).join() === 'merek,tipe,noSeri,rentangUkur,resolusi,jenisSkala,tanggalPenerimaan,ruang');
cek('template boleh menimpa kolom identitas', bidangIdentitas({ ...T, identitasBidang: [{ id: 'x', label: 'X', jenis: 'teks' }] } as any).length === 1);
cek('batas bawaan 15–35 °C & 15–90 %RH', JSON.stringify(batasLingkungan(T)) === '{"suhu":{"min":15,"maks":35},"rh":{"min":15,"maks":90}}');
cek('template boleh menimpa batas', batasLingkungan({ ...T, lingkungan: { suhu: { min: 18, maks: 28 }, rh: { min: 30, maks: 70 } } } as any).suhu.maks === 28);
cek('batas rusak di template diabaikan (tidak crash)', batasLingkungan({ ...T, lingkungan: { suhu: { min: 40, maks: 10 }, rh: 'x' } } as any).suhu.maks === 35);
cek('3 alat standar bawaan; termohigrometer hanya yang rekomendasi', daftarStandar(T).map((d) => d.peran).join() === 'tekanan,stopwatch,termohigrometer' && STANDAR_BAWAAN[2].hanyaRekomendasi === true);

// ── Masa berlaku (contoh PRD A1.5)
cek('berlaku s/d 2027-03-04, pelaksanaan 2027-03-05 → expired', statusBerlaku('2027-03-04', '2027-03-05') === 'expired');
cek('pelaksanaan tepat di tanggal berlaku → masih berlaku', statusBerlaku('2027-03-04', '2027-03-04') === 'berlaku');
cek('tanggal berlaku kosong → belum bersertifikat (tidak diblokir)', statusBerlaku(null, '2027-03-05') === 'belum_bersertifikat' && statusBerlaku('', '2027-03-05') === 'belum_bersertifikat');
cek('tanggal pelaksanaan kosong → memakai hari ini (tidak crash)', ['berlaku', 'expired'].includes(statusBerlaku('2027-03-04', null)));

// ── Pilihan alat
const kal = (o: any) => ({ asetId: 'A', parameter: 'tekanan_mmhg', nama: 'Alat A', merk: 'M', model: 'T', nomorSeri: '1', nomorSertifikat: 'S-1', tertelusur: 'KIM-LIPI', tanggalKalibrasi: '2026-03-05', berlakuSampai: '2027-03-04', points: [], ...o });
{
  const semua = [
    kal({ asetId: 'T1', parameter: 'suhu_c', nama: 'Termo 1', rekomendasi: true }), kal({ asetId: 'T1', parameter: 'kelembaban_rh', nama: 'Termo 1', rekomendasi: true }),
    kal({ asetId: 'T2', parameter: 'suhu_c', nama: 'Termo 2' }), kal({ asetId: 'T2', parameter: 'kelembaban_rh', nama: 'Termo 2' }),
    kal({ asetId: 'P1', parameter: 'tekanan_mmhg', nama: 'Pressure' }),
  ];
  const termo = STANDAR_BAWAAN[2];
  const p = susunPilihan(termo, semua);
  cek('termohigrometer: yang rekomendasi saja (T9)', p.length === 1 && p[0].kunci === 'T1' && p[0].rekomendasi && p[0].lengkap);
  cek('tanpa rekomendasi sama sekali → semua ditawarkan', susunPilihan(termo, semua.map((k) => ({ ...k, rekomendasi: false }))).length === 2);
  cek('hanya parameter peran itu yang dikelompokkan (tekanan tidak ikut termohigrometer)', susunPilihan(STANDAR_BAWAAN[0], semua).length === 1 && susunPilihan(STANDAR_BAWAAN[0], semua)[0].kunci === 'P1');
  cek('stopwatch kosong → daftar kosong, tidak crash', susunPilihan(STANDAR_BAWAAN[1], semua).length === 0);
  cek('hanya suhu tanpa kelembaban → tidak lengkap', susunPilihan(termo, [kal({ asetId: 'T3', parameter: 'suhu_c' })])[0].lengkap === false);
  cek('peran bukan hanyaRekomendasi tidak disaring', susunPilihan(STANDAR_BAWAAN[0], [kal({ asetId: 'P1', rekomendasi: true }), kal({ asetId: 'P2' })]).length === 2);
  cek('berlaku sampai satu pilihan = yang paling awal dari barisnya', susunPilihan(termo, [kal({ asetId: 'T4', parameter: 'suhu_c', berlakuSampai: '2027-01-01' }), kal({ asetId: 'T4', parameter: 'kelembaban_rh', berlakuSampai: '2026-12-01' })])[0].berlakuSampai === '2026-12-01');

  // Snapshot
  const jepret = (k: any) => ({ ...k, dijepretAt: 'x' });
  const sTekanan = jepretStandar(STANDAR_BAWAAN[0], susunPilihan(STANDAR_BAWAAN[0], semua)[0], jepret);
  cek('snapshot satu parameter = salinan baris itu', sTekanan.asetId === 'P1' && sTekanan.parameter === 'tekanan_mmhg');
  const sTermo = jepretStandar(termo, p[0], jepret);
  cek('snapshot termohigrometer memuat dua tabel (suhu & kelembaban)', sTermo.asetId === 'T1' && sTermo.suhu?.parameter === 'suhu_c' && sTermo.kelembaban?.parameter === 'kelembaban_rh');
  cek('tabelSuhu/tabelRh null bila snapshot kosong (tidak crash)', tabelSuhu(null) === null && tabelRh(undefined) === null && tabelSuhu({}) === null);
  cek('statusSnapshot: null bila belum dipilih', statusSnapshot(null, '2027-01-01') === null && statusSnapshot(sTermo, '2027-03-05') === 'expired');
}

// ── Kelengkapan
const penuh = () => ({
  data: {
    identitas: { merek: 'ABN', tipe: 'ABN-1', noSeri: '123', rentangUkur: 300, resolusi: 2, jenisSkala: 'Analog', tanggalPenerimaan: '2026-10-19', ruang: 'KIA' },
    lingkungan: { suhuAwal: 27.7, suhuAkhir: 27, rhAwal: 56, rhAkhir: 59 },
    fisik: { badan: { fisik: 'Baik', fungsi: 'Baik' }, level_cairan: { fisik: 'Baik', fungsi: 'Baik' }, tabung_selang: { fisik: 'Baik', fungsi: 'Tidak Baik' } },
    fisikTambahan: { gauge: 'Baik', konektor: 'Baik', label: 'Baik', manset: 'Baik', titik_nol: 'Baik' },
    bocor: { bacaan: 240 }, lajuBuang: { waktu: 8 },
    kinerja: { tekanan: Object.fromEntries([0, 50, 100, 150, 200, 250].map((t) => [String(t), { naik: [t, t, t], turun: [t, t, t] }])) },
  } as any,
  tanggal: '2026-10-20',
  snapshot: {
    tekanan: { asetId: 'P1', berlakuSampai: '2027-03-04' },
    stopwatch: { asetId: 'S1', berlakuSampai: null },
    termohigrometer: { asetId: 'T1', berlakuSampai: '2027-03-04', suhu: { points: [] }, kelembaban: { points: [] } },
  } as any,
});
{
  cek('isian penuh & benar → tidak ada kekurangan', periksaIsian(T, penuh()).length === 0, JSON.stringify(periksaIsian(T, penuh())));
  const k0 = periksaIsian(T, { data: {}, tanggal: null, snapshot: null });
  cek('LKK kosong → semua bagian 1–3 punya kekurangan', ['identitas', 'lingkungan', 'fisik'].every((b) => !bagianLengkap(k0, b as any)));
  cek('LKK kosong: 8 identitas − resolusi/skala dihitung + tanggal + 3 alat standar', k0.filter((k) => k.bagian === 'identitas').length === 8 + 1 + 3, String(k0.filter((k) => k.bagian === 'identitas').length));
  cek('LKK kosong: 4 isian lingkungan, 3 item fisik + 5 butir lain', k0.filter((k) => k.bagian === 'lingkungan').length === 4 && k0.filter((k) => k.bagian === 'fisik').length === 3 + 5);
  cek('LKK kosong: kinerja = 2 uji ambang + 6 titik', k0.filter((k) => k.bagian === 'kinerja').length === 2 + 6, String(k0.filter((k) => k.bagian === 'kinerja').length));
  cek('kekurangan kosong bukan "merah"', k0.every((k) => !k.merah));
}
{
  const i = penuh(); i.snapshot.tekanan.berlakuSampai = '2026-10-19';
  const k = periksaIsian(T, i);
  cek('alat standar expired → kekurangan MERAH di Identitas', k.length === 1 && k[0].bagian === 'identitas' && k[0].merah === true && /expired/i.test(k[0].teks), JSON.stringify(k));
  const i2 = penuh(); i2.tanggal = '2026-10-18';
  cek('tanggal pelaksanaan dimundurkan sebelum tanggal penerimaan → kurang', periksaIsian(T, i2).some((x) => /penerimaan tidak boleh sesudah/.test(x.teks)));
}
{
  const i = penuh(); i.snapshot.stopwatch = null;
  cek('stopwatch belum dipilih → kurang (wajib)', periksaIsian(T, i).some((x) => /Stopwatch belum dipilih/.test(x.teks)));
  const i2 = penuh(); i2.snapshot.termohigrometer = { asetId: 'T1', berlakuSampai: null, suhu: { points: [] }, kelembaban: null };
  cek('termohigrometer tanpa tabel kelembaban → kurang', periksaIsian(T, i2).some((x) => /belum lengkap/.test(x.teks)));
  const i3 = penuh(); i3.snapshot.stopwatch = { asetId: 'S1', berlakuSampai: null };
  cek('stopwatch belum bersertifikat → TIDAK diblokir', periksaIsian(T, i3).length === 0);
}
{
  const i = penuh(); i.data.lingkungan.suhuAwal = 40; i.data.lingkungan.rhAkhir = 95;
  const k = periksaIsian(T, i);
  cek('lingkungan di luar batas → kekurangan MERAH berisi batas', k.length === 2 && k.every((x) => x.bagian === 'lingkungan' && x.merah) && /15–35 °C/.test(k[0].teks) && /15–90 %RH/.test(k[1].teks), JSON.stringify(k));
  const i2 = penuh(); i2.data.lingkungan.suhuAwal = 35; i2.data.lingkungan.rhAwal = 15;
  cek('tepat di batas diterima', periksaIsian(T, i2).length === 0);
  const i3 = penuh(); i3.data.lingkungan.suhuAwal = null;
  cek('isian lingkungan kosong → kurang (bukan merah)', (() => { const k = periksaIsian(T, i3); return k.length === 1 && !k[0].merah; })());
}
{
  const i = penuh(); i.data.fisik.badan = { fisik: 'Baik' };
  cek('fisik: salah satu sisi belum dipilih → kurang', periksaIsian(T, i).length === 1);
  const i2 = penuh(); i2.data.fisik.badan = { fisik: 'baik', fungsi: 'Baik ' };
  cek('fisik: teks bukan pilihan template (huruf kecil / spasi) ditolak — temuan T Excel', periksaIsian(T, i2).length === 1);
  const i3 = penuh(); i3.data.identitas.resolusi = 5;
  cek('resolusi di luar pilihan template → kurang', periksaIsian(T, i3).some((x) => /Resolusi belum dipilih/.test(x.teks)));
  const i4 = penuh(); i4.data.identitas.rentangUkur = 0;
  cek('rentang ukur 0 ditolak', periksaIsian(T, i4).some((x) => /lebih dari 0/.test(x.teks)));
  const i5 = penuh(); i5.data.identitas.merek = '   ';
  cek('teks hanya spasi dianggap kosong', periksaIsian(T, i5).some((x) => /Merek belum diisi/.test(x.teks)));
}
// ── Fisik butir lain & Kinerja
{
  const i = penuh(); delete i.data.fisikTambahan.manset;
  const k = periksaIsian(T, i);
  cek('butir fisik lain belum dipilih → kurang di Fisik', k.length === 1 && k[0].bagian === 'fisik' && /Manset/.test(k[0].teks), JSON.stringify(k));
  const i2 = penuh(); i2.data.fisikTambahan.gauge = 'baik';
  cek('butir fisik lain: teks bukan pilihan template ditolak', periksaIsian(T, i2).length === 1);
  const i3 = penuh(); delete i3.data.bocor;
  cek('bocor belum diisi → kurang di Kinerja', (() => { const k = periksaIsian(T, i3); return k.length === 1 && k[0].bagian === 'kinerja' && /Kebocoran/.test(k[0].teks); })());
  const i4 = penuh(); i4.data.lajuBuang = { waktu: null };
  cek('laju buang kosong → kurang di Kinerja', periksaIsian(T, i4).some((x) => x.bagian === 'kinerja' && /Laju Buang/.test(x.teks)));
  const i5 = penuh(); i5.data.kinerja.tekanan['100'].turun = [100, null, 100];
  cek('satu bacaan turun kosong → titik itu kurang (satu pesan)', (() => { const k = periksaIsian(T, i5); return k.length === 1 && /titik 100/.test(k[0].teks) && /turun/.test(k[0].teks) && !/naik/.test(k[0].teks); })());
  const i6 = penuh(); i6.data.kinerja.tekanan['50'].naik = [50, 50];
  cek('bacaan kurang dari jumlah pengulangan → kurang', periksaIsian(T, i6).length === 1);
  const i7 = penuh(); i7.data.kinerja = 'x';
  cek('data kinerja rusak tidak crash, semua titik kurang', periksaIsian(T, i7).filter((x) => x.bagian === 'kinerja').length === 6);
}
// ── Data rusak tidak membuat crash
cek('data null / angka / larik tidak melempar galat', (() => {
  try {
    periksaIsian(T, { data: null as any, tanggal: 5 as any, snapshot: 'x' as any });
    periksaIsian(T, { data: { identitas: 7, lingkungan: [], fisik: 'x' } as any, tanggal: null, snapshot: null });
    periksaIsian(T, undefined as any);
    return true;
  } catch (e) { console.log(e); return false; }
})());
cek('BIDANG_IDENTITAS_BAWAAN tidak berubah tak sengaja (8 kolom)', BIDANG_IDENTITAS_BAWAAN.length === 8);

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
