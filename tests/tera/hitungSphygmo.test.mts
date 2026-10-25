// Uji mesin hitung Sphygmomanometer terhadap golden file v4 (Master revisi 22 Okt 2026, PRD F5.5).
// Jalankan: npm run test:tera:hitung
// Fixture = angka saja (tanpa nama RS/teknisi) dari _referensi/sphygmo-v4/*.xlsx yang dihitung ulang penuh (3 kasus).
import { readFileSync } from 'node:fs';
import { hitungLkk, kalibratorDi, bulatExcel, type TitikKalibrator, type DataLkk } from '../../src/tera/shared/hitung.ts';
import { TEMPLATE_SPHYGMOMANOMETER_V2 as T } from '../../src/tera/shared/templates/sphygmomanometer.ts';

let lulus = 0, gagal = 0;
const cek = (n: string, ok: boolean, d = '') => { ok ? lulus++ : gagal++; if (!ok || process.env.RINCI) console.log((ok ? '✅ ' : '❌ ') + n + (ok ? '' : '  — ' + d)); };
const sama = (a: number | null, b: number | null, tol = 1e-9) => a !== null && b !== null && Math.abs(a - b) <= tol;

const fx = JSON.parse(readFileSync(new URL('./fixtures/sphygmo-golden-v4.json', import.meta.url), 'utf8'));

for (const kasus of fx.kasus) {
  const h = hitungLkk(T, kasus.data, kasus.kalibrator);
  const hs = h.kinerja.tekanan.titik;
  let ok = 0;
  for (const e of kasus.harapan.titik) {
    const a = hs.find((t) => t.titik === e.titik && t.arah === e.arah)!;
    const n = `${kasus.nama} ${e.titik} ${e.arah}`;
    const banding: [string, number | null, number][] = [
      ['rata-rata', a.rataRata, e.rataRata], ['koreksi', a.koreksi, e.koreksi], ['u Tipe A', a.uTipeA, e.uTipeA],
      ['u zero', a.uZero, e.uZero], ['u resolusi', a.uResolusi, e.uResolusi], ['uc', a.uc, e.uc], ['v eff', a.vEff, e.vEff], ['k', a.k, e.k],
      ['U95', a.u95, e.u95], ['U95 laporan', a.u95Laporan, e.u95Laporan],
    ];
    const salah = banding.filter(([, x, y]) => !sama(x, y)).map(([k, x, y]) => `${k} ${x} ≠ ${y}`);
    if (a.u95Cetak !== e.u95Cetak) salah.push(`U95 cetak ${a.u95Cetak} ≠ ${e.u95Cetak}`);
    if (a.hasil !== e.hasil) salah.push(`hasil ${a.hasil} ≠ ${e.hasil}`);
    cek(n, salah.length === 0, salah.join('; '));
    if (!salah.length) ok++;
  }
  console.log(`${kasus.nama}: ${ok}/${kasus.harapan.titik.length} titik × 12 angka sama dengan Excel`);
  const s = Object.fromEntries(h.skor.rincian.map((r) => [r.dari, r.nilai]));
  const H = kasus.harapan;
  cek(`${kasus.nama} bocor`, sama(h.ujiAmbang.bocor.nilaiUkur, H.bocor.selisih) && h.ujiAmbang.bocor.hasil === H.bocor.hasil);
  cek(`${kasus.nama} laju buang`, h.ujiAmbang.lajuBuang.hasil === H.lajuBuang.hasil);
  cek(`${kasus.nama} skor fisik ${s.fisik}`, s.fisik === H.skor.fisik);
  cek(`${kasus.nama} skor bocor`, s.bocor === H.skor.bocor);
  cek(`${kasus.nama} skor laju buang + akurasi`, s.lajuBuang + s.tekanan === H.skor.lajuBuangDanAkurasi);
  cek(`${kasus.nama} peringatan U95 > 1,5`, (h.peringatan.length > 0) === H.peringatanU95);
  cek(`${kasus.nama} total ${h.skor.total}`, h.skor.total === H.skor.total);
  cek(`${kasus.nama} kesimpulan ${h.kesimpulan}`, h.kesimpulan === H.kesimpulan);
  cek(`${kasus.nama} tidak ada kekurangan data`, h.kurang.length === 0, h.kurang.join(', '));
}

// ── Kasus tepi (bukan dari Excel) ──
const kal0: TitikKalibrator[] = T.kinerja[0].titik.map((t) => ({ titik: t, koreksiNaik: 0, koreksiTurun: 0, u95Naik: 0.1, u95Turun: 0.1, driftNaik: 0, driftTurun: 0 }));
const dataDasar = (): DataLkk => ({
  identitas: { resolusi: 2, jenisSkala: 'Analog' },
  fisik: Object.fromEntries(T.fisik.map((f) => [f.id, { fisik: 'Baik', fungsi: 'Baik' }])),
  fisikTambahan: Object.fromEntries(T.fisikTambahan!.map((f) => [f.id, 'Baik'])),
  bocor: { bacaan: 245 }, lajuBuang: { waktu: 6 },
  kinerja: { tekanan: Object.fromEntries(T.kinerja[0].titik.map((t) => [String(t), { naik: [t, t, t], turun: [t, t, t] }])) },
});

{ const h = hitungLkk(T, dataDasar(), kal0);
  const t0 = h.kinerja.tekanan.titik[0];
  cek('alat sempurna → Laik Pakai 100', h.kesimpulan === 'Laik Pakai' && h.skor.total === 100);
  cek('U95 ≈ 0,83 (k dari veff ≈ 2,01) dilaporkan 1 (CMC)', t0.k !== null && t0.k > 2 && t0.k < 2.03 && t0.u95 !== null && t0.u95 < 1 && t0.u95Laporan === 1 && t0.u95Cetak === 1); }

{ const d = dataDasar(); (d.kinerja!.tekanan['100'] as any).naik = [96.5, 96.5, 96.5];
  const t = hitungLkk(T, d, kal0).kinerja.tekanan.titik.find((x) => x.titik === 100 && x.arah === 'naik')!;
  cek('U5: koreksi −3,5 + U95 1 = 4,5 → Tidak Laik (rumus lama |C+U| = 2,5 → Laik)', t.hasil === 'Tidak Laik', `${t.koreksi} ${t.u95Laporan}`); }

{ const d = dataDasar(); for (const t of ['50', '100', '150', '200']) (d.kinerja!.tekanan[t] as any).naik = [Number(t) + 5, Number(t) + 5, Number(t) + 5];
  const h = hitungLkk(T, d, kal0);
  cek('akurasi gagal (8/12 < 70 %), total pas 70 → Laik Pakai (keputusan Ridhwan 22 Okt: ≥ 70)', h.skor.total === 70 && h.kesimpulan === 'Laik Pakai', `${h.skor.total} ${h.kesimpulan}`); }

{ const d = dataDasar(); d.bocor = { bacaan: 235 };
  const h = hitungLkk(T, d, kal0);
  cek('bocor tepat 15 mmHg → Laik (≤ 15)', h.ujiAmbang.bocor.hasil === 'Laik');
  d.bocor = { bacaan: 234 };
  cek('bocor 16 mmHg → Tidak Laik', hitungLkk(T, d, kal0).ujiAmbang.bocor.hasil === 'Tidak Laik'); }

{ const d = dataDasar(); for (const t of ['50', '100', '150', '200']) (d.kinerja!.tekanan[t] as any).naik = [Number(t) + 5, Number(t) + 5, Number(t) + 5];
  d.bocor = { bacaan: 200 };
  const h = hitungLkk(T, d, kal0);
  cek('total 40 → Tidak Laik Pakai', h.skor.total === 40 && h.kesimpulan === 'Tidak Laik Pakai', `${h.skor.total}`); }

{ let h; let galat = '';
  try { h = hitungLkk(T, {}, []); } catch (e) { galat = String(e); }
  cek('LKK kosong tidak error', !!h && !galat, galat);
  cek('LKK kosong → semua titik "-", nilai null', !!h && h.kinerja.tekanan.titik.every((t) => t.hasil === '-' && t.u95 === null && t.rataRata === null));
  cek('LKK kosong → daftar kekurangan berbahasa awam', !!h && h.kurang.includes('Resolusi alat belum diisi') && h.kurang.includes('Kalibrator belum dipilih'));
  cek('LKK kosong → Tidak Laik Pakai (belum boleh Selesai)', !!h && h.kesimpulan === 'Tidak Laik Pakai'); }

{ const d = dataDasar(); (d.kinerja!.tekanan['150'] as any).turun = [150, null, 150];
  const h = hitungLkk(T, d, kal0); const t = h.kinerja.tekanan.titik.find((x) => x.titik === 150 && x.arah === 'turun')!;
  cek('satu run kosong → titik itu "-", lainnya tetap dihitung', t.hasil === '-' && h.kinerja.tekanan.jumlahDinilai === 11); }

{ const d = dataDasar(); (d.kinerja!.tekanan['0'] as any).turun = [1, 1, 1];
  const h = hitungLkk(T, d, kal0);
  cek('zero error dari titik 0 dipakai di semua titik', h.kinerja.tekanan.titik.every((t) => sama(t.uZero, 1 / Math.sqrt(3)))); }

{ const d = dataDasar(); d.fisik!.badan = { fisik: 'Baik ', fungsi: ' baik' };
  cek('"Baik " berspasi tetap dihitung baik (PRD 11.43)', hitungLkk(T, d, kal0).fisik.jumlahBaik === 11); }

{ const d = dataDasar(); d.fisik!.badan = { fisik: 'Tidak Baik', fungsi: 'Tidak Baik' };
  const h = hitungLkk(T, d, kal0);
  cek('fisik 9/11 = 82 % ≥ 70 % → skor fisik 10 (butir tambahan ikut dihitung)', h.fisik.nilai === 10 && h.fisik.jumlahItem === 11 && h.fisik.jumlahBaik === 9);
  const d2 = dataDasar(); d2.fisik!.badan = { fisik: 'Tidak Baik', fungsi: 'Tidak Baik' }; d2.fisikTambahan!.gauge = 'Tidak Baik'; d2.fisikTambahan!.konektor = 'Tidak Baik'; d2.fisikTambahan!.label = 'Tidak Baik';
  const h2 = hitungLkk(T, d2, kal0);
  cek('fisik 6/11 = 55 % < 70 % → skor fisik 0, total 90', h2.fisik.nilai === 0 && h2.skor.total === 90, `${h2.fisik.jumlahBaik} ${h2.skor.total}`);
  const d3 = dataDasar(); delete d3.fisikTambahan;
  cek('butir tambahan belum diisi → masuk daftar kekurangan', hitungLkk(T, d3, kal0).kurang.some((k) => k.includes('5 isian fisik'))); }

{ const d = dataDasar(); d.identitas!.jenisSkala = 'Digital'; d.identitas!.resolusi = 1;
  cek('Digital: resolusi ÷ √3', sama(hitungLkk(T, d, kal0).kinerja.tekanan.titik[0].uResolusi, 0.5 / Math.sqrt(3))); }

{ const tab: TitikKalibrator[] = [{ titik: 50, koreksiNaik: 0.2, koreksiTurun: -0.2, u95Naik: 0.1, u95Turun: 0.1 }, { titik: 100, koreksiNaik: 0.4, koreksiTurun: 0, u95Naik: 0.3, u95Turun: 0.1 }];
  const a = kalibratorDi(tab, 75, 'naik')!, b = kalibratorDi(tab, 100, 'turun')!, c = kalibratorDi(tab, 300, 'naik')!;
  cek('kalibrator: interpolasi linier 75 → koreksi 0,3 & U95 0,2', sama(a.koreksi, 0.3) && sama(a.u95, 0.2));
  cek('kalibrator: titik persis & di luar rentang = ujung', sama(b.koreksi, 0) && sama(c.koreksi, 0.4) && b.drift === 0); }

{ const d = dataDasar(); (d.lajuBuang as any).waktu = 10; d.bocor = { bacaan: 235 };
  const h = hitungLkk(T, d, kal0);
  cek('laju buang 10 detik → Laik (≤ 10), bocor 15 → Laik (≤ 15)', h.ujiAmbang.lajuBuang.hasil === 'Laik' && h.ujiAmbang.bocor.hasil === 'Laik'); }

cek('ROUND Excel: 2,345 → 2,35; 1,005 → 1,01; −2,345 → −2,35', bulatExcel(2.345, 2) === 2.35 && bulatExcel(1.005, 2) === 1.01 && bulatExcel(-2.345, 2) === -2.35);

{ const tJson = JSON.parse(JSON.stringify(T));
  const a = hitungLkk(T, fx.kasus[0].data, fx.kasus[0].kalibrator), b = hitungLkk(tJson, fx.kasus[0].data, fx.kasus[0].kalibrator);
  cek('template tetap benar setelah disimpan sebagai JSON (untuk database)', JSON.stringify(a) === JSON.stringify(b)); }


{ const sql = readFileSync(new URL('../../supabase/migrations/0008_tera_template_sphygmo_v2.sql', import.meta.url), 'utf8');
  const m = sql.match(/'(\{"kode_alat":"sphygmomanometer"[^']*)'::jsonb/);
  cek('isi template di migrasi 0008 = template di kode', !!m && JSON.stringify(JSON.parse(m[1])) === JSON.stringify(T)); }

console.log(`\n${lulus} lulus, ${gagal} gagal`);
if (gagal) process.exit(1);
