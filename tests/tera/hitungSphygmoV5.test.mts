// Uji mesin hitung Sphygmomanometer TEMPLATE VERSI 3 terhadap golden v5 (Master_sphygmomanometer.xlsx 25 Okt 2026).
// Jalankan: npm run test:tera:hitung-v5
// Fixture = angka saja dari _referensi/sphygmo-v5/ yang diisi lalu dihitung ulang penuh LibreOffice (3 kasus):
//   1. isian Master_Sphygmomanometer_isi.xlsx (angka di Sertifikat_Sphygmomanometer.pdf)
//   2. kalibrator berkoreksi (interpolasi di nilai bacaan) + bocor tepat 15 (< 15 → Tidak Laik)
//   3. Digital resolusi 1, banyak titik lewat batas → Tidak Laik Pakai
import { readFileSync } from 'node:fs';
import { hitungLkk, kalibratorPada, type TitikKalibrator } from '../../src/tera/shared/hitung.ts';
import { TEMPLATE_SPHYGMOMANOMETER_V3 as T } from '../../src/tera/shared/templates/sphygmomanometer.ts';

let lulus = 0, gagal = 0;
const cek = (n: string, ok: boolean, d = '') => { ok ? lulus++ : gagal++; if (!ok || process.env.RINCI) console.log((ok ? '✅ ' : '❌ ') + n + (ok ? '' : '  — ' + d)); };
const sama = (a: number | null, b: number | null, tol = 1e-9) => a !== null && b !== null && Math.abs(a - b) <= tol;
const fx = JSON.parse(readFileSync(new URL('./fixtures/sphygmo-golden-v5.json', import.meta.url), 'utf8'));

for (const kasus of fx.kasus) {
  const h = hitungLkk(T, kasus.data, kasus.kalibrator);
  let ok = 0;
  for (const e of kasus.harapan.titik) {
    const a = h.kinerja.tekanan.titik.find((t) => t.titik === e.titik && t.arah === e.arah)!;
    const banding: [string, number | null, number][] = [
      ['rata-rata', a.rataRata, e.rataRata], ['koreksi', a.koreksi, e.koreksi], ['u Tipe A', a.uTipeA, e.uTipeA],
      ['u sertifikat', a.uSertifikat, e.uSertifikat], ['u zero', a.uZero, e.uZero], ['u resolusi', a.uResolusi, e.uResolusi],
      ['u drift', a.uDrift, e.uDrift], ['uc', a.uc, e.uc], ['v eff', a.vEff, e.vEff], ['k', a.k, e.k],
      ['U95', a.u95, e.u95], ['U95 laporan', a.u95Laporan, e.u95Laporan],
    ];
    const salah = banding.filter(([, x, y]) => !sama(x, y)).map(([k, x, y]) => `${k} ${x} ≠ ${y}`);
    if (a.u95Cetak !== e.u95Cetak) salah.push(`U95 cetak ${a.u95Cetak} ≠ ${e.u95Cetak}`);
    if (a.hasil !== e.hasil) salah.push(`hasil ${a.hasil} ≠ ${e.hasil}`);
    cek(`${kasus.nama} ${e.titik} ${e.arah}`, salah.length === 0, salah.join('; '));
    if (!salah.length) ok++;
  }
  console.log(`${kasus.nama}: ${ok}/${kasus.harapan.titik.length} titik × 14 angka sama dengan Excel`);
  const s = Object.fromEntries(h.skor.rincian.map((r) => [r.dari, r.nilai]));
  const H = kasus.harapan;
  cek(`${kasus.nama} bocor ${h.ujiAmbang.bocor.hasil}`, sama(h.ujiAmbang.bocor.nilaiUkur, H.bocor.selisih) && h.ujiAmbang.bocor.hasil === H.bocor.hasil);
  cek(`${kasus.nama} laju buang`, h.ujiAmbang.lajuBuang.hasil === H.lajuBuang.hasil);
  cek(`${kasus.nama} skor fisik ${s.fisik}`, s.fisik === H.skor.fisik);
  cek(`${kasus.nama} skor bocor ${s.bocor}`, s.bocor === H.skor.bocor);
  cek(`${kasus.nama} skor laju buang + akurasi`, s.lajuBuang + s.tekanan === H.skor.lajuBuangDanAkurasi);
  cek(`${kasus.nama} peringatan U95 > 1,5`, (h.peringatan.length > 0) === H.peringatanU95);
  cek(`${kasus.nama} total ${h.skor.total}`, h.skor.total === H.skor.total);
  cek(`${kasus.nama} kesimpulan ${h.kesimpulan}`, h.kesimpulan === H.kesimpulan);
  cek(`${kasus.nama} tidak ada kekurangan data`, h.kurang.length === 0, h.kurang.join(', '));
}

// Angka yang tercetak di contoh Sertifikat_Sphygmomanometer.pdf (Ridhwan, 25 Okt 2026), kasus 1
{
  const k1 = fx.kasus[0];
  const t = hitungLkk(T, k1.data, k1.kalibrator).kinerja.tekanan.titik;
  const cetak = t.map((x) => `${x.titik}${x.arah[0]}:${x.u95Cetak}`).join(' ');
  cek('U95 cetak = contoh PDF (1,09 1,09 1,1 1,1 1,12 1,1 1,12 1,1 1,12 1,12 1,16 1,11)',
    cetak === '0n:1.09 0t:1.09 50n:1.1 50t:1.1 100n:1.12 100t:1.1 150n:1.12 150t:1.1 200n:1.12 200t:1.12 250n:1.16 250t:1.11', cetak);
  const kor = t.map((x) => (Math.round(x.koreksi! * 100) / 100).toFixed(2)).join(' ');
  cek('koreksi = contoh PDF', kor === '0.13 0.40 0.27 -0.27 0.53 0.13 0.73 0.27 0.53 0.00 0.60 0.13', kor);
}

// Kasus tepi interpolasi (aturan Excel ±0,5 di luar tabel)
{
  const tabel: TitikKalibrator[] = [0, 50, 100].map((t) => ({ titik: t, koreksiNaik: t / 100, koreksiTurun: 0, u95Naik: 0.5 + t / 1000, u95Turun: 0.5, driftNaik: 0, driftTurun: 0 }));
  cek('bacaan di antara titik → interpolasi', sama(kalibratorPada(tabel, 75, 'naik')!.koreksi, 0.75) && sama(kalibratorPada(tabel, 75, 'naik')!.u95, 0.575));
  cek('bacaan −0,4 → titik pertama', sama(kalibratorPada(tabel, -0.4, 'naik')!.koreksi, 0));
  cek('bacaan −0,6 → tidak dihitung (#N/A)', kalibratorPada(tabel, -0.6, 'naik') === null);
  cek('bacaan 100,5 → titik terakhir; 100,6 → tidak dihitung', sama(kalibratorPada(tabel, 100.5, 'naik')!.koreksi, 1) && kalibratorPada(tabel, 100.6, 'naik') === null);
  cek('tabel 1 titik → tidak dihitung', kalibratorPada(tabel.slice(0, 1), 0, 'naik') === null);
}

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
