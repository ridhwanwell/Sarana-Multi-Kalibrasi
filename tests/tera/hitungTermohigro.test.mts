// Uji mesin hitung Thermohygrometer = Master_Thermohygrometer.xlsx (Excel contoh isi, dihitung ulang karena nilai tersimpan basi;
// fixture termohigro-golden-v1.json dibuat tools/tera/buat_golden_termohigro.py) + angka cetak PDF contoh Master_Thermohygrometer.pdf.
// Tabel standar = Calibrator 1 (angka SEMENTARA master: koreksi 0, U 1 °C / 4 %RH). Tidak ada MK Kemenkes (keputusan Ridhwan 27 Okt 2026).
// Jalankan: npm run test:tera:hitung-termohigro
import { readFileSync } from 'node:fs';
import { hitungPompa, type KalibratorPompa } from '../../src/tera/shared/hitungPompa.ts';
import { TEMPLATE_TERMOHIGRO as T } from '../../src/tera/shared/templates/termohigrometer.ts';

let lulus = 0, gagal = 0;
const cek = (n: string, ok: boolean, d = '') => { ok ? lulus++ : gagal++; if (!ok || process.env.RINCI) console.log((ok ? '✅ ' : '❌ ') + n + (ok ? '' : '  — ' + d)); };
const sama = (a: number | null | undefined, b: number | null | undefined, tol = 1e-9) => a != null && b != null && Math.abs(a - b) <= tol;

const fx = JSON.parse(readFileSync(new URL('./fixtures/termohigro-golden-v1.json', import.meta.url), 'utf8'));
const FISIK = { badan: { fisik: 'Baik', fungsi: 'Berfungsi' }, kontrol: { fisik: 'Baik', fungsi: 'Berfungsi' } };
const kal = (): KalibratorPompa => ({
  aliran: [], tekanan: [], listrik: {},
  termo: {
    suhu_c: [{ titik: 15, koreksi: fx.tabelStandar.suhu_c.koreksi, u95: fx.tabelStandar.suhu_c.u95 }, { titik: 45, koreksi: fx.tabelStandar.suhu_c.koreksi, u95: fx.tabelStandar.suhu_c.u95 }],
    kelembaban_rh: [{ titik: 30, koreksi: fx.tabelStandar.kelembaban_rh.koreksi, u95: fx.tabelStandar.kelembaban_rh.u95 }, { titik: 90, koreksi: fx.tabelStandar.kelembaban_rh.koreksi, u95: fx.tabelStandar.kelembaban_rh.u95 }],
  },
});
const dataDari = (suhu: any[], rh: any[], resolusi = fx.resolusi) => {
  const termo: Record<string, number[]> = {};
  suhu.forEach((b) => (termo[`suhu_${b.setting}`] = b.bacaan));
  rh.forEach((b) => (termo[`rh_${b.setting}`] = b.bacaan));
  return { identitas: { resolusi, jenisSkala: 'Digital' }, fisik: FISIK, termo };
};

// Angka cetak PDF contoh (halaman 3): Pembacaan Standar (1 desimal), Koreksi (2 desimal), U95 (1 desimal)
const PDF = {
  suhu: { std: [15.0, 20.0, 24.9, 30.0, 35.1, 39.9, 45.0], kor: [-0.03, -0.02, -0.08, -0.02, 0.07, -0.07, 0.03], u: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0] },
  rh: { std: [30.2, 39.8, 50.4, 60.3, 70.0, 80.2, 89.9], kor: [0.17, -0.17, 0.42, 0.25, 0.0, 0.17, -0.08], u: [4.1, 4.1, 4.1, 4.0, 4.1, 4.1, 4.1] },
};
const bulat = (x: number, d: number) => Math.round((x + Number.EPSILON * Math.sign(x)) * 10 ** d) / 10 ** d;

cek('template: suhu 15–45 (7 titik) & RH 30–90 (7 titik), 6 bacaan, ±1 °C & ±5 %RH, tanpa listrik, tanpa kinerja aliran',
  JSON.stringify(T.termo!.parameter.map((p) => p.titik.map((t) => t.setting))) === JSON.stringify([[15, 20, 25, 30, 35, 40, 45], [30, 40, 50, 60, 70, 80, 90]])
  && T.termo!.pengulangan === 6 && T.termo!.parameter[0].toleransi === 1 && T.termo!.parameter[1].toleransi === 5 && T.listrik.length === 0 && !T.kinerja && !T.nibp);

const h = hitungPompa(T, dataDari(fx.suhu, fx.rh), kal());
cek('contoh: lengkap (tidak ada yang kurang)', h.kurang.length === 0, h.kurang.join(', '));
for (const [id, daftar, p] of [['suhu', fx.suhu, PDF.suhu], ['rh', fx.rh, PDF.rh]] as const) {
  daftar.forEach((e: any, i: number) => {
    const a = h.termo![id].titik[i];
    cek(`${id} ${e.setting}: rata-rata, koreksi, uc, k, U95 = Excel`, sama(a.rataRata, e.pembacaanStandar) && sama(a.koreksi, e.koreksi) && sama(a.uTipeA, e.uA) && sama(a.uc, e.uc) && sama(a.vEff, e.veff, 1e-6) && sama(a.k, e.k) && sama(a.u95, e.u95),
      JSON.stringify(a));
    cek(`${id} ${e.setting}: cetak PDF = ${p.std[i]} | ${p.kor[i]} | ± ${p.u[i]}`,
      sama(bulat(a.pembacaanStandar!, 1), p.std[i]) && sama(bulat(a.koreksi!, 2), p.kor[i], 1e-9) && sama(a.u95Cetak, p.u[i]),
      `${bulat(a.pembacaanStandar!, 1)} | ${bulat(a.koreksi!, 2)} | ${a.u95Cetak}`);
    cek(`${id} ${e.setting}: Laik (|koreksi| ≤ toleransi)`, a.hasil === 'Laik');
  });
}
cek('contoh: skor fisik 10 + kinerja 90 = 100, Laik Pakai (sama dengan PDF contoh)', h.skor.total === 100 && h.kesimpulan === 'Laik Pakai', JSON.stringify(h.skor));

// Kurang bacaan → belum dinilai, kesimpulan Tidak Laik Pakai
const sedikit = dataDari(fx.suhu, fx.rh); sedikit.termo['suhu_15'] = sedikit.termo['suhu_15'].slice(0, 3);
const hs = hitungPompa(T, sedikit, kal());
cek('3 dari 6 bacaan: titik tidak dinilai & tercatat kurang', hs.termo!.suhu.titik[0].hasil === '-' && hs.kurang.some((x) => x.includes('15')), hs.kurang.join(', '));

// Banyak titik suhu di luar ±1 °C (> 30 %) → kinerja 0 → Tidak Laik Pakai
const buruk = JSON.parse(JSON.stringify(fx.suhu)).map((b: any, i: number) => (i < 3 ? { ...b, bacaan: b.bacaan.map((x: number) => x + 1.5) } : b));
const hb = hitungPompa(T, dataDari(buruk, fx.rh), kal());
cek('3 dari 7 titik suhu di luar ±1 °C (57 % Laik < 70 %): kinerja 0 → Tidak Laik Pakai', hb.termo!.suhu.jumlahLaik === 4 && hb.skor.rincian[1].nilai === 0 && hb.kesimpulan === 'Tidak Laik Pakai', JSON.stringify(hb.skor));

// Tepat 70 % Laik (5 dari 7 = 71 %) lolos; 1 titik ±5 %RH persis di batas tetap Laik (≤)
const dua = JSON.parse(JSON.stringify(fx.suhu)).map((b: any, i: number) => (i < 2 ? { ...b, bacaan: b.bacaan.map((x: number) => x + 1.5) } : b));
cek('2 dari 7 titik suhu di luar toleransi (71 % Laik): kinerja lolos → Laik Pakai', hitungPompa(T, dataDari(dua, fx.rh), kal()).kesimpulan === 'Laik Pakai');

// Fisik & fungsi: semua kotak ≥ 70 %
const rusak = { ...dataDari(fx.suhu, fx.rh), fisik: { badan: { fisik: 'Tidak Baik', fungsi: 'Tidak Berfungsi' }, kontrol: { fisik: 'Baik', fungsi: 'Berfungsi' } } };
const hf = hitungPompa(T, rusak, kal());
cek('fisik & fungsi 2 dari 4 kotak baik (50 %): nilai fisik 0 → total 90 → tetap Laik Pakai (ambang ≥ 90)', hf.skor.rincian[0].nilai === 0 && hf.skor.total === 90 && hf.kesimpulan === 'Laik Pakai', JSON.stringify(hf.skor));

// Belum ada alat standar / resolusi
const hk = hitungPompa(T, dataDari(fx.suhu, fx.rh, null as any), { aliran: [], tekanan: [], listrik: {} });
cek('tanpa Climatic Chamber & resolusi: dicatat kurang, tidak crash, Tidak Laik Pakai', hk.kurang.some((x) => x.includes('Climatic Chamber')) && hk.kurang.some((x) => x.includes('Resolusi')) && hk.kesimpulan === 'Tidak Laik Pakai', hk.kurang.join(', '));

console.log(`\nThermohygrometer hitung: ${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
