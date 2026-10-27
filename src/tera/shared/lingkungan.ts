/**
 * KONDISI LINGKUNGAN — suhu & kelembaban ruang kalibrasi (Tahap 4.3c, PRD-TAHAP4-LKK 3.2 · Master v12 "Calibrator 2").
 *
 * Perumpamaan: teknisi membaca termohigrometer di ruangan, lalu angka bacaan "dikoreksi" memakai
 * sertifikat termohigrometer itu (fotokopi sertifikatnya ada di snapshot LKK). Koreksi antar-titik
 * sertifikat dicari dengan garis lengkung (regresi kuadrat terkecil orde 2), persis `LINEST(Y, X^{1,2})` Excel:
 *   X = titik sertifikat + koreksinya (nilai STANDAR), Y = koreksinya.
 *   terkoreksi = x + (c + b·x + a·x²), x = rata-rata bacaan awal & akhir.
 *   dibulatkan KE ATAS (ROUNDUP Excel): suhu 1 desimal, %RH 0 desimal. U95 = U95 baris pertama sertifikat.
 *
 * Fungsi murni (tanpa jaringan/database): jalan offline di tablet dan dipakai ulang server.
 * Data kurang TIDAK error: hasilnya null (layar menampilkan "-").
 */
import type { TitikKalibrator } from './hitung.js';

export interface BatasLingkungan {
  suhu: { min: number; maks: number };
  rh: { min: number; maks: number };
}

/** PRD Lampiran C (T15, disetujui Ridhwan 20 Okt 2026): suhu 15–35 °C, kelembaban 15–90 %RH. */
export const BATAS_LINGKUNGAN_BAWAAN: BatasLingkungan = {
  suhu: { min: 15, maks: 35 },
  rh: { min: 15, maks: 90 },
};

const angka = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Excel ROUNDUP: menjauhi nol. Pembulatan 9 desimal dulu agar 27.8×10 = 278.00000000000006 tidak naik jadi 279. */
export function bulatNaikExcel(x: number, desimal: number): number {
  const f = 10 ** desimal;
  const mutlak = Math.ceil(Number((Math.abs(x) * f).toFixed(9)));
  return (x < 0 ? -mutlak : mutlak) / f;
}

export interface Regresi { a: number; b: number; c: number }

/** Regresi kuadrat terkecil Y = a·X² + b·X + c. Kurang dari 3 titik / titik kembar semua → null. */
export function regresiKuadrat(titik: { x: number; y: number }[]): Regresi | null {
  const n = titik.length;
  if (n < 3) return null;
  // Geser X ke sekitar rata-ratanya agar penjumlahan pangkat 4 tidak kehilangan ketelitian
  const pusat = titik.reduce((s, p) => s + p.x, 0) / n;
  let s1 = 0, s2 = 0, s3 = 0, s4 = 0, t0 = 0, t1 = 0, t2 = 0;
  for (const p of titik) {
    const u = p.x - pusat;
    s1 += u; s2 += u * u; s3 += u ** 3; s4 += u ** 4;
    t0 += p.y; t1 += u * p.y; t2 += u * u * p.y;
  }
  // [n s1 s2; s1 s2 s3; s2 s3 s4] · [c0 b0 a]ᵀ = [t0 t1 t2]ᵀ  (Y = a·u² + b0·u + c0)
  const m = [[n, s1, s2, t0], [s1, s2, s3, t1], [s2, s3, s4, t2]];
  for (let k = 0; k < 3; k++) {
    let p = k;
    for (let r = k + 1; r < 3; r++) if (Math.abs(m[r][k]) > Math.abs(m[p][k])) p = r;
    if (Math.abs(m[p][k]) < 1e-12) return null;
    [m[k], m[p]] = [m[p], m[k]];
    for (let r = k + 1; r < 3; r++) {
      const f = m[r][k] / m[k][k];
      for (let c = k; c < 4; c++) m[r][c] -= f * m[k][c];
    }
  }
  const a = m[2][3] / m[2][2];
  const b0 = (m[1][3] - m[1][2] * a) / m[1][1];
  const c0 = (m[0][3] - m[0][1] * b0 - m[0][2] * a) / m[0][0];
  if (![a, b0, c0].every(Number.isFinite)) return null;
  // Kembalikan ke X asli: Y = a(X−p)² + b0(X−p) + c0
  return { a, b: b0 - 2 * a * pusat, c: c0 - b0 * pusat + a * pusat * pusat };
}

export interface HasilLingkungan {
  /** Rata-rata bacaan awal & akhir (belum dikoreksi). */
  rataBacaan: number;
  /** Nilai terkoreksi sebelum pembulatan. */
  terkoreksiMentah: number;
  /** Nilai terkoreksi, dibulatkan ke atas (suhu 1 desimal, %RH 0 desimal). */
  terkoreksi: number;
  /** U95 sertifikat termohigrometer (baris pertama tabel). */
  u95: number;
  koefisien: Regresi;
}

/**
 * Nilai lingkungan terkoreksi. `tabel` = titik sertifikat termohigrometer dari snapshot
 * (`koreksiNaik` = koreksi; alat satu arah: naik = turun). null bila data kurang.
 */
export function hitungLingkungan(
  tabel: TitikKalibrator[] | null | undefined,
  awal: unknown,
  akhir: unknown,
  desimal: number,
): HasilLingkungan | null {
  const a = angka(awal), z = angka(akhir);
  if (a === null || z === null || !Array.isArray(tabel)) return null;
  const baris = tabel.filter((t) => angka(t?.titik) !== null && angka(t?.koreksiNaik) !== null && angka(t?.u95Naik) !== null);
  const koef = regresiKuadrat(baris.map((t) => ({ x: t.titik + t.koreksiNaik, y: t.koreksiNaik })));
  if (!koef) return null;
  const x = (a + z) / 2;
  const mentah = x + (koef.c + koef.b * x + koef.a * x * x);
  if (!Number.isFinite(mentah)) return null;
  return { rataBacaan: x, terkoreksiMentah: mentah, terkoreksi: bulatNaikExcel(mentah, desimal), u95: baris[0].u95Naik, koefisien: koef };
}

/** Satu nilai terukur di luar batas ruang? (dicek terhadap bacaan awal & akhir, bukan hasil koreksi) */
export function diLuarBatas(nilai: unknown, batas: { min: number; maks: number }): boolean {
  const n = angka(nilai);
  return n !== null && (n < batas.min || n > batas.maks);
}

/** Angka Indonesia: koma desimal. 27.5 → "27,5". null → "". */
export function formatAngka(n: number | null | undefined): string {
  return typeof n === 'number' && Number.isFinite(n) ? String(n).replace('.', ',') : '';
}

/**
 * Ketikan teknisi → angka. Hanya digit, satu koma (titik dianggap koma), minus di depan.
 * `bersih` = teks yang boleh tampil di kotak; `nilai` = angka, atau null bila belum berupa angka utuh.
 */
export function uraiKetikan(mentah: string): { bersih: string; nilai: number | null } {
  let t = String(mentah ?? '').replace(/\./g, ',').replace(/[^0-9,\-]/g, '');
  const minus = t.startsWith('-');
  t = t.replace(/-/g, '');
  const i = t.indexOf(',');
  if (i >= 0) t = t.slice(0, i + 1) + t.slice(i + 1).replace(/,/g, '');
  const bersih = (minus ? '-' : '') + t;
  const angkaMurni = bersih.replace(',', '.');
  const nilai = /^-?\d+(\.\d+)?$/.test(angkaMurni) || /^-?\d+\.$/.test(angkaMurni) ? Number(angkaMurni) : null;
  return { bersih, nilai: nilai !== null && Number.isFinite(nilai) ? nilai : null };
}
