// Uji KONDISI LINGKUNGAN (Tahap 4.3c, PRD-TAHAP4-LKK 3.2). Jalankan: npm run test:tera:lingkungan
// Angka acuan = Master Sphygmomanometer v12 (Calibrator 2) yang dihitung ulang dengan numpy.polyfit.
import { BATAS_LINGKUNGAN_BAWAAN, bulatNaikExcel, diLuarBatas, formatAngka, hitungLingkungan, regresiKuadrat, uraiKetikan } from '../../src/tera/shared/lingkungan.ts';

let lulus = 0, gagal = 0;
const cek = (n: string, ok: boolean, d = '') => { ok ? lulus++ : gagal++; if (!ok || process.env.RINCI) console.log((ok ? '✅ ' : '❌ ') + n + (ok ? '' : '  — ' + d)); };
const dekat = (a: number, b: number, t = 1e-9) => Math.abs(a - b) <= t;

const baris = (titik: number, k: number, u: number) => ({ titik, koreksiNaik: k, koreksiTurun: k, u95Naik: u, u95Turun: u });
const SUHU = [baris(15, 0.3, 0.5), baris(20, 0.3, 0.5), baris(25, 0.4, 0.5), baris(30, 0.5, 0.5), baris(35, 0.6, 0.5)];
const RH = [baris(40, -7.8, 3.1), baris(50, -7.3, 3.1), baris(60, -5.7, 3.1), baris(70, -3.1, 3.1), baris(80, 0.5, 3.1)];

// Suhu: isian 27,7 & 27 → rata 27,35 → 27,8 ± 0,5
{
  const h = hitungLingkungan(SUHU, 27.7, 27, 1)!;
  cek('suhu: rata-rata bacaan 27,35', !!h && dekat(h.rataBacaan, 27.35));
  cek('suhu: koefisien a', !!h && dekat(h.koefisien.a, 0.000544203536, 1e-10), String(h?.koefisien.a));
  cek('suhu: koefisien b', !!h && dekat(h.koefisien.b, -0.011936543731, 1e-10), String(h?.koefisien.b));
  cek('suhu: koefisien c', !!h && dekat(h.koefisien.c, 0.343687156250, 1e-9), String(h?.koefisien.c));
  cek('suhu: terkoreksi mentah 27,7742991747', !!h && dekat(h.terkoreksiMentah, 27.7742991747, 1e-8), String(h?.terkoreksiMentah));
  cek('suhu: dibulatkan ke atas 27,8', h?.terkoreksi === 27.8, String(h?.terkoreksi));
  cek('suhu: U95 0,5', h?.u95 === 0.5);
}
// %RH: isian 56 & 59 → rata 57,5 → 53 ± 3,1
{
  const h = hitungLingkungan(RH, 56, 59, 0)!;
  cek('RH: rata-rata bacaan 57,5', !!h && dekat(h.rataBacaan, 57.5));
  cek('RH: koefisien a', !!h && dekat(h.koefisien.a, 0.002907688668, 1e-10), String(h?.koefisien.a));
  cek('RH: koefisien b', !!h && dekat(h.koefisien.b, -0.153682799104, 1e-9), String(h?.koefisien.b));
  cek('RH: koefisien c', !!h && dekat(h.koefisien.c, -5.927445258155, 1e-8), String(h?.koefisien.c));
  cek('RH: terkoreksi mentah 52,3493394523', !!h && dekat(h.terkoreksiMentah, 52.3493394523, 1e-7), String(h?.terkoreksiMentah));
  cek('RH: dibulatkan ke atas 53', h?.terkoreksi === 53, String(h?.terkoreksi));
  cek('RH: U95 3,1', h?.u95 === 3.1);
}

// Data kurang → null, tidak error
cek('isian awal kosong → null', hitungLingkungan(SUHU, null, 27, 1) === null && hitungLingkungan(SUHU, undefined, 27, 1) === null);
cek('isian akhir kosong → null', hitungLingkungan(SUHU, 27, null, 1) === null);
cek('isian bukan angka → null', hitungLingkungan(SUHU, 'x' as any, 27, 1) === null && hitungLingkungan(SUHU, NaN, 27, 1) === null);
cek('tabel kosong / null / bukan larik → null', hitungLingkungan([], 27, 27, 1) === null && hitungLingkungan(null, 27, 27, 1) === null && hitungLingkungan({} as any, 27, 27, 1) === null);
cek('tabel < 3 titik → null', hitungLingkungan(SUHU.slice(0, 2), 27, 27, 1) === null);
cek('tabel rusak (ada baris tanpa angka) tidak membuat crash', (() => { try { return hitungLingkungan([...SUHU, { titik: 'a' } as any, null as any], 27, 27, 1) !== null; } catch { return false; } })());
cek('semua titik sama (tidak bisa dibuat garis) → null', hitungLingkungan([baris(20, 0.3, 0.5), baris(20, 0.3, 0.5), baris(20, 0.3, 0.5)], 20, 20, 1) === null);

// ROUNDUP Excel (menjauhi nol, tahan galat titik-desimal)
cek('ROUNDUP: 27,77 → 27,8', bulatNaikExcel(27.77, 1) === 27.8);
cek('ROUNDUP: 27,8 tepat tetap 27,8 (bukan 27,9)', bulatNaikExcel(27.8, 1) === 27.8 && bulatNaikExcel(27.8000000000001, 1) === 27.8);
cek('ROUNDUP: 52,35 → 53 (0 desimal)', bulatNaikExcel(52.35, 0) === 53);
cek('ROUNDUP: negatif menjauhi nol (-1,21 → -1,3)', bulatNaikExcel(-1.21, 1) === -1.3);
cek('ROUNDUP: 0 tetap 0', bulatNaikExcel(0, 1) === 0);

// Batas lingkungan (T15: 15–35 °C, 15–90 %RH)
cek('batas bawaan = 15–35 °C dan 15–90 %RH', BATAS_LINGKUNGAN_BAWAAN.suhu.min === 15 && BATAS_LINGKUNGAN_BAWAAN.suhu.maks === 35 && BATAS_LINGKUNGAN_BAWAAN.rh.min === 15 && BATAS_LINGKUNGAN_BAWAAN.rh.maks === 90);
const b = BATAS_LINGKUNGAN_BAWAAN;
cek('batas: tepat di tepi diterima (15, 35, 90)', !diLuarBatas(15, b.suhu) && !diLuarBatas(35, b.suhu) && !diLuarBatas(90, b.rh) && !diLuarBatas(15, b.rh));
cek('batas: di luar ditolak (14,9 · 35,1 · 91 · 14)', diLuarBatas(14.9, b.suhu) && diLuarBatas(35.1, b.suhu) && diLuarBatas(91, b.rh) && diLuarBatas(14, b.rh));
cek('batas: kosong/bukan angka bukan "di luar batas"', !diLuarBatas(null, b.suhu) && !diLuarBatas(undefined, b.suhu) && !diLuarBatas('x', b.suhu));

// Ketikan angka Indonesia
cek('format: 27.5 → "27,5"; null → ""', formatAngka(27.5) === '27,5' && formatAngka(null) === '' && formatAngka(53) === '53');
cek('ketik "27,5" → 27,5', (() => { const u = uraiKetikan('27,5'); return u.bersih === '27,5' && u.nilai === 27.5; })());
cek('ketik "27.5" (titik) → koma', (() => { const u = uraiKetikan('27.5'); return u.bersih === '27,5' && u.nilai === 27.5; })());
cek('ketik "27," (belum selesai) → 27, tampil tetap "27,"', (() => { const u = uraiKetikan('27,'); return u.bersih === '27,' && u.nilai === 27; })());
cek('ketik huruf dibuang ("2a7x" → 27)', (() => { const u = uraiKetikan('2a7x'); return u.bersih === '27' && u.nilai === 27; })());
cek('dua koma → koma kedua dibuang', (() => { const u = uraiKetikan('2,7,5'); return u.bersih === '2,75' && u.nilai === 2.75; })());
cek('minus di depan boleh; minus di tengah dibuang', (() => { const u = uraiKetikan('-3,5'); const v = uraiKetikan('3-5'); return u.nilai === -3.5 && v.bersih === '35'; })());
cek('kosong / "-" / "," → nilai null', uraiKetikan('').nilai === null && uraiKetikan('-').nilai === null && uraiKetikan(',').nilai === null);

// Regresi: garis lurus sempurna → a = 0
{
  const r = regresiKuadrat([{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 }, { x: 3, y: 7 }])!;
  cek('regresi: data lurus y=2x+1 → a≈0, b≈2, c≈1', !!r && dekat(r.a, 0, 1e-9) && dekat(r.b, 2, 1e-9) && dekat(r.c, 1, 1e-9), JSON.stringify(r));
}

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
