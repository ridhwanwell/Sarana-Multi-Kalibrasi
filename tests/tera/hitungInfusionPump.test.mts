// Uji mesin hitung Infusion Pump terhadap golden v1 (Master_Infusion_Pump_terisi.xlsx 26 Okt 2026, dihitung ulang penuh LibreOffice).
// Jalankan: npm run test:tera:hitung-pompa
// Fixture dibuat oleh tools/tera/buat_golden_pompa.py (8 kasus: lulus, 1 titik gagal tetap ≥70 %, 3 titik gagal,
// listrik gagal, penyumbatan gagal, Analog, tepi tabel kalibrator, listrik di atas tabel).
// Fisik & fungsi memakai aturan BARU (semua kotak) — bukan dari Excel — jadi dibandingkan dengan hitungan tangan.
import { readFileSync } from 'node:fs';
import { hitungPompa, koreksiDi, u95Di, type KalibratorPompa } from '../../src/tera/shared/hitungPompa.ts';
import { TEMPLATE_INFUSION_PUMP_V1 as T } from '../../src/tera/shared/templates/infusionPump.ts';

let lulus = 0, gagal = 0;
const cek = (n: string, ok: boolean, d = '') => { ok ? lulus++ : gagal++; if (!ok || process.env.RINCI) console.log((ok ? '✅ ' : '❌ ') + n + (ok ? '' : '  — ' + d)); };
const sama = (a: number | null, b: number | null, tol = 1e-9) => a !== null && b !== null && Math.abs(a - b) <= tol;
const fx = JSON.parse(readFileSync(new URL('./fixtures/infusion-golden-v1.json', import.meta.url), 'utf8'));

for (const kasus of fx.kasus) {
  const tpl = { ...T, kinerja: { ...T.kinerja, titikAliran: kasus.titikAliran as number[] } };
  const kal = kasus.kalibrator as KalibratorPompa;
  const h = hitungPompa(tpl, kasus.data, kal);
  const H = kasus.harapan;
  let ok = 0;

  H.aliran.forEach((e: any, i: number) => {
    const a = h.aliran.titik[i];
    const banding: [string, number | null, number][] = [
      ['rata-rata', a.rataRata, e.rataRata], ['koreksi', a.koreksi, e.koreksi], ['u Tipe A', a.uTipeA, e.uTipeA],
      ['u sertifikat', a.uSertifikat, e.uSertifikat], ['u resolusi', a.uResolusi, e.uResolusi], ['u drift', a.uDrift, e.uDrift],
      ['uc', a.uc, e.uc], ['v eff', a.vEff, e.vEff], ['k', a.k, e.k], ['U95', a.u95, e.u95],
    ];
    const salah = banding.filter(([, x, y]) => !sama(x, y, 1e-7)).map(([k, x, y]) => `${k} ${x} ≠ ${y}`);
    if (a.hasil !== e.hasil) salah.push(`hasil ${a.hasil} ≠ ${e.hasil}`);
    cek(`${kasus.nama} aliran ${e.setting}`, salah.length === 0, salah.join('; '));
    if (!salah.length) ok++;
  });
  console.log(`${kasus.nama}: ${ok}/${H.aliran.length} titik aliran × 11 angka sama dengan Excel`);

  const s = H.sumbat, b = h.sumbat;
  const salahS = ([['rata-rata', b.rataRata, s.rataRata], ['u Tipe A', b.uTipeA, s.uTipeA], ['u sertifikat', b.uSertifikat, s.uSertifikat],
    ['uc', b.uc, s.uc], ['v eff', b.vEff, s.vEff], ['k', b.k, s.k], ['U95', b.u95, s.u95]] as [string, number | null, number][])
    .filter(([, x, y]) => !sama(x, y, 1e-7)).map(([k, x, y]) => `${k} ${x} ≠ ${y}`);
  if (b.hasil !== s.hasil) salahS.push(`hasil ${b.hasil} ≠ ${s.hasil}`);
  cek(`${kasus.nama} penyumbatan`, salahS.length === 0, salahS.join('; '));

  for (const [id, e] of Object.entries<any>(H.listrik)) {
    const a = h.listrik[id];
    cek(`${kasus.nama} listrik ${id}`, sama(a.terukur, e.terukur, 1e-9) && sama(a.u95, e.u95, 1e-9) && a.hasil === e.hasil,
      `terukur ${a.terukur}/${e.terukur} U ${a.u95}/${e.u95} ${a.hasil}/${e.hasil}`);
  }

  // Fisik: semua kotak (aturan baru). Hitung tangan dari data.
  const kotak = Object.values<any>(kasus.data.fisik).flatMap((x) => [x.fisik === 'Baik', x.fungsi === 'Berfungsi']);
  const baik = kotak.filter(Boolean).length;
  const nilaiFisik = baik / kotak.length >= 0.7 ? 10 : 0;
  cek(`${kasus.nama} fisik ${baik}/6`, h.fisik.jumlahBaik === baik && h.fisik.jumlahItem === 6 && h.fisik.nilai === nilaiFisik);
  const sk = Object.fromEntries(h.skor.rincian.map((r) => [r.dari, r.nilai]));
  cek(`${kasus.nama} skor listrik ${sk.listrik}`, sk.listrik === H.nilaiListrik);
  cek(`${kasus.nama} skor kinerja ${sk.kinerja}`, sk.kinerja === H.nilaiKinerja);
  const total = nilaiFisik + H.nilaiListrik + H.nilaiKinerja;
  cek(`${kasus.nama} total ${h.skor.total}`, h.skor.total === total);
  cek(`${kasus.nama} kesimpulan`, h.kesimpulan === (total >= 90 ? 'Laik Pakai' : 'Tidak Laik Pakai'));
  cek(`${kasus.nama} tidak ada isian kurang`, h.kurang.length === 0, h.kurang.join(', '));
}

// Fungsi tabel
const tb = [{ titik: 0, koreksi: 0, u95: 1 }, { titik: 10, koreksi: 1, u95: 3 }, { titik: 20, koreksi: -1, u95: 2 }];
cek('koreksi di antara titik (interpolasi)', sama(koreksiDi(tb, 5), 0.5) && sama(koreksiDi(tb, 15), 0));
cek('koreksi di atas titik terakhir = koreksi terakhir', sama(koreksiDi(tb, 99), -1));
cek('U95 = maks dua titik mengapit', u95Di(tb, 5) === 3 && u95Di(tb, 15) === 3 && u95Di(tb, 20) === 2 && u95Di(tb, 0) === 1);
cek('koreksi tabel kosong → null', koreksiDi([], 5) === null && u95Di([], 5) === null);

// Data belum lengkap → tidak ada vonis & daftar kurang terisi (tidak crash)
const kosong = hitungPompa(T, {}, fx.kasus[0].kalibrator);
cek('data kosong: kesimpulan Tidak Laik Pakai + ada daftar kurang', kosong.kesimpulan === 'Tidak Laik Pakai' && kosong.kurang.length > 0 && kosong.aliran.titik.every((t) => t.hasil === '-'));
const tanpaKal = hitungPompa(T, fx.kasus[0].data, { aliran: [], tekanan: [], listrik: {} });
cek('tanpa kalibrator: tidak crash, minta kalibrator', tanpaKal.kurang.some((k) => k.includes('Kalibrator IDA')) && tanpaKal.kurang.some((k) => k.includes('Kalibrator ESA')));

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
