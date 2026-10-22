/**
 * MESIN HITUNG LKK — satu kode untuk tablet (offline) dan server (Selia & PDF) (Tahap 4.1, PRD F5).
 *
 * Perumpamaan: ini "kalkulator budget ketidakpastian" yang sama persis di saku teknisi dan di meja
 * penyelia. Mesin TIDAK tahu nama alat; semua angka (titik ukur, toleransi, bobot skor, pembagi
 * resolusi) datang dari TEMPLATE alat. Nilai kalibrator datang dari SNAPSHOT kalibrator di LKK
 * ("fotokopi sertifikat" yang dijepret ke LKK, CLAUDE.md 9.3).
 *
 * Aturan umum:
 *  - Fungsi murni, tanpa jaringan/database → bisa jalan offline dan diuji dengan golden file.
 *  - Data belum lengkap TIDAK error: nilai = null (layar menampilkan "-"), hasil = '-'.
 *  - Angka tidak dibulatkan di tengah hitungan (sama seperti Excel); pembulatan hanya untuk cetak.
 *
 * Rumus (Master Sphygmomanometer revisi 22 Okt 2026, _referensi/sphygmo-v4/ — menggantikan versi 19 Okt):
 *  - Pembacaan standar terkoreksi = bacaan + koreksi kalibrator (per titik & arah)
 *  - Rata-rata = AVERAGE(run), Koreksi = rata-rata − setting
 *  - u Tipe A ('selisih_maks_dari_nol') = selisih terbesar antar-run, setelah tiap run dikurangi run
 *    yang sama di titik nol, dibagi √3 (Ketidakpastian!N:Q). Cara lama ('stdev') = STDEV.S/√n tetap tersedia.
 *  - u sertifikat = U95 kalibrator / 2
 *  - u zero error = selisih terbesar |turun − naik| per run di titik nol / √3 (dipakai di semua titik)
 *  - u resolusi = resolusi × 0,5 / pembagi (Analog √6, Digital √3)
 *  - u drift = 0,5 × drift / √3
 *  - uc = √Σu²; veff = uc⁴ / Σ(uᵢ⁴/vᵢ); k = polinom veff (Ketidakpastian!AM) atau k tetap
 *  - U95 = k × uc; U95 laporan = batas minimum (≤ 1 → 1), dipakai juga untuk keputusan (sama seperti Excel)
 *  - Titik Laik bila |koreksi| + U95 laporan ≤ toleransi
 *  - Fisik: butir utama (2 kotak per baris) + butir tambahan MK 90.7.7 (1 kotak) dibagi SEMUA kotak
 *  - Kesimpulan dari skor (Laik Pakai bila total ≥ 70, keputusan Ridhwan 22 Okt 2026)
 */

// ───────────────────────────── Bentuk template ─────────────────────────────

export type Banding = '<' | '<=' | '>' | '>=';
export type JenisSkala = 'Analog' | 'Digital';

export interface KinerjaNaikTurun {
  id: string;
  jenis: 'naik_turun_berulang';
  judul: string;
  satuan: string;
  /** Setting alat (UUT). Titik pertama wajib titik nol (dipakai untuk zero error). */
  titik: number[];
  /** Jumlah run per arah. */
  pengulangan: number;
  k: number;
  /** U95 ≤ nilai ini dilaporkan sebagai nilai ini (CMC). null = tanpa batas. */
  u95MinimumLaporan: number | null;
  /** Cara menghitung u Tipe A. */
  tipeA: 'stdev' | 'selisih_maks_dari_nol';
  /** 'tetap' = pakai k; 'veff' = k dari derajat kebebasan efektif (Welch–Satterthwaite + polinom Excel). */
  kMetode: 'tetap' | 'veff';
  /** Derajat kebebasan tiap komponen (Ketidakpastian!R, W, Z, AC, AH). Dipakai bila kMetode = 'veff'. */
  derajatBebas: { tipeA: number; sertifikat: number; zero: number; resolusi: number; drift: number };
  /** Peringatan bila U95 laporan melebihi nilai ini (MK 090 butir 90.10.3: 1,5). null = tanpa. */
  u95Maksimum: number | null;
  /** Pembagi resolusi per jenis skala (Analog √6 segitiga, Digital √3 persegi). */
  pembagiResolusi: Record<JenisSkala, number>;
  toleransi: number;
  /** Desimal U95 di sertifikat (Report All: ROUND(...,2)). */
  desimalCetak: number;
}

export interface UjiAmbang {
  id: string;
  jenis: 'selisih_setting' | 'nilai';
  judul: string;
  satuan: string;
  /** Untuk 'selisih_setting': selisih = setting − bacaan. */
  setting?: number;
  banding: Banding;
  batas: number;
}

export type ItemSkor =
  | { dari: 'fisik'; minimalPersen: number; nilai: number }
  | { dari: 'uji_ambang'; id: string; nilai: number }
  | { dari: 'kinerja'; id: string; minimalPersen: number; nilai: number };

export interface TemplateAlat {
  kode_alat: string;
  nama: string;
  versi: number;
  sumber: string;
  metode: string;
  kop: 'KAN' | 'NON_KAN';
  keselamatan_listrik: 'tidak_ada' | 'wajib' | 'pilihan';
  identitas: { resolusi: { satuan: string; pilihan: number[] }; jenisSkala: JenisSkala[] };
  fisik: { id: string; judul: string }[];
  /** Butir tambahan satu kotak (MK 090 butir 90.7.7); data.fisikTambahan[id]. Opsional. */
  fisikTambahan?: { id: string; judul: string }[];
  /** Pilihan isian fisik & fungsi; yang pertama = "baik". */
  pilihanFisik: [string, string];
  ujiAmbang: UjiAmbang[];
  kinerja: KinerjaNaikTurun[];
  skor: { item: ItemSkor[]; laikBila: { banding: Banding; batas: number } };
  sertifikat: { tata_letak: string; halaman: number };
}

// ───────────────────────────── Bentuk data LKK ─────────────────────────────

export type Angka = number | null | undefined;

export interface DataLkk {
  identitas?: { resolusi?: Angka; jenisSkala?: string | null };
  fisik?: Record<string, { fisik?: string | null; fungsi?: string | null }>;
  fisikTambahan?: Record<string, string | null>;
  /** Uji ambang: per id, isian `bacaan` (selisih_setting) atau `waktu`/`nilai`. */
  [ujiId: string]: unknown;
  kinerja?: Record<string, Record<string, { naik?: Angka[]; turun?: Angka[] }>>;
}

/** Satu baris tabel sertifikat kalibrator (snapshot). */
export interface TitikKalibrator {
  titik: number;
  koreksiNaik: number; koreksiTurun: number;
  u95Naik: number; u95Turun: number;
  driftNaik?: number; driftTurun?: number;
}

// ───────────────────────────── Hasil ─────────────────────────────

export type Vonis = 'Laik' | 'Tidak Laik' | '-';

export interface HasilTitik {
  titik: number;
  arah: 'naik' | 'turun';
  rataRata: number | null;
  koreksi: number | null;
  uTipeA: number | null;
  uSertifikat: number | null;
  uZero: number | null;
  uResolusi: number | null;
  uDrift: number | null;
  uc: number | null;
  vEff: number | null;
  k: number | null;
  u95: number | null;
  u95Laporan: number | null;
  u95Cetak: number | null;
  hasil: Vonis;
}

export interface HasilLkk {
  fisik: { jumlahBaik: number; jumlahItem: number; nilai: number };
  ujiAmbang: Record<string, { nilaiUkur: number | null; hasil: Vonis }>;
  kinerja: Record<string, { titik: HasilTitik[]; jumlahLaik: number; jumlahDinilai: number; u95Melebihi: boolean }>;
  skor: { rincian: { dari: string; nilai: number }[]; total: number };
  kesimpulan: 'Laik Pakai' | 'Tidak Laik Pakai';
  /** Peringatan untuk penyelia (bukan kekurangan data), mis. U95 melebihi 1,5 mmHg. */
  peringatan: string[];
  /** Pesan kekurangan data (bahasa awam), untuk ringkasan sebelum "Selesai". */
  kurang: string[];
}

// ───────────────────────────── Fungsi dasar ─────────────────────────────

const angka = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

export const rataRata = (x: number[]): number => x.reduce((a, b) => a + b, 0) / x.length;

/** STDEV.S Excel (simpangan baku sampel, n − 1). */
export function stdevS(x: number[]): number {
  if (x.length < 2) return 0;
  const m = rataRata(x);
  return Math.sqrt(x.reduce((a, b) => a + (b - m) ** 2, 0) / (x.length - 1));
}

/** Faktor cakupan dari derajat kebebasan efektif (polinom di Ketidakpastian!AM). */
export function faktorKDariVeff(v: number): number | null {
  if (!Number.isFinite(v) || v <= 0) return null;
  return 1.95996 + 2.37356 / v + 2.818745 / v ** 2 + 2.546662 / v ** 3 + 1.7861829 / v ** 4 + 0.245458 / v ** 5 + 1.000764 / v ** 6;
}

export function bandingkan(nilai: number, banding: Banding, batas: number): boolean {
  switch (banding) {
    case '<': return nilai < batas;
    case '<=': return nilai <= batas;
    case '>': return nilai > batas;
    case '>=': return nilai >= batas;
  }
}

/** Pembulatan seperti ROUND Excel (setengah menjauhi nol), tahan galat biner 0,005. */
export function bulatExcel(x: number, desimal: number): number {
  const f = 10 ** desimal;
  const y = Math.abs(x) * f;
  const r = Math.round(y + 1e-9 * Math.max(1, y));
  return (Math.sign(x) * r) / f;
}

/**
 * Nilai kalibrator di satu titik: cocok persis, atau interpolasi linier di antara dua titik
 * terdekat (PRD F5.3). Di luar rentang → titik ujung terdekat. Tabel kosong → null.
 */
export function kalibratorDi(tabel: TitikKalibrator[], titik: number, arah: 'naik' | 'turun') {
  if (!tabel.length) return null;
  const urut = [...tabel].sort((a, b) => a.titik - b.titik);
  const ambil = (t: TitikKalibrator) => ({
    koreksi: arah === 'naik' ? t.koreksiNaik : t.koreksiTurun,
    u95: arah === 'naik' ? t.u95Naik : t.u95Turun,
    drift: (arah === 'naik' ? t.driftNaik : t.driftTurun) ?? 0,
  });
  const persis = urut.find((t) => t.titik === titik);
  if (persis) return ambil(persis);
  if (titik <= urut[0].titik) return ambil(urut[0]);
  if (titik >= urut[urut.length - 1].titik) return ambil(urut[urut.length - 1]);
  const i = urut.findIndex((t) => t.titik > titik);
  const a = ambil(urut[i - 1]), b = ambil(urut[i]);
  const p = (titik - urut[i - 1].titik) / (urut[i].titik - urut[i - 1].titik);
  const lerp = (x: number, y: number) => x + (y - x) * p;
  return { koreksi: lerp(a.koreksi, b.koreksi), u95: lerp(a.u95, b.u95), drift: lerp(a.drift, b.drift) };
}

// ───────────────────────────── Kinerja naik-turun ─────────────────────────────

function runLengkap(v: Angka[] | undefined, n: number): number[] | null {
  if (!Array.isArray(v) || v.length < n) return null;
  const x = v.slice(0, n).map(angka);
  return x.every((a): a is number => a !== null) ? x : null;
}

export function hitungNaikTurun(
  k: KinerjaNaikTurun,
  isian: Record<string, { naik?: Angka[]; turun?: Angka[] }> | undefined,
  kalibrator: TitikKalibrator[],
  resolusi: number | null,
  jenisSkala: JenisSkala | null,
): { titik: HasilTitik[]; jumlahLaik: number; jumlahDinilai: number; u95Melebihi: boolean } {
  const n = k.pengulangan;
  const terkoreksi = (titik: number, arah: 'naik' | 'turun'): number[] | null => {
    const run = runLengkap(isian?.[String(titik)]?.[arah], n);
    const kal = kalibratorDi(kalibrator, titik, arah);
    if (!run || !kal) return null;
    return run.map((x) => x + kal.koreksi);
  };

  // Zero error: dari titik nol (titik pertama), berlaku di semua titik.
  const nol = k.titik[0];
  const zNaik = terkoreksi(nol, 'naik'), zTurun = terkoreksi(nol, 'turun');
  const uZero = zNaik && zTurun
    ? Math.max(...zNaik.map((x, i) => Math.abs(zTurun[i] - x))) / Math.sqrt(3)
    : null;
  const uRes = resolusi !== null && jenisSkala !== null
    ? (resolusi * 0.5) / k.pembagiResolusi[jenisSkala]
    : null;

  const titik: HasilTitik[] = [];
  let jumlahLaik = 0, jumlahDinilai = 0, u95Melebihi = false;
  for (const t of k.titik) {
    for (const arah of ['naik', 'turun'] as const) {
      const x = terkoreksi(t, arah);
      const kal = kalibratorDi(kalibrator, t, arah);
      const rr = x ? rataRata(x) : null;
      const kor = rr !== null ? rr - t : null;
      let uA: number | null = null;
      if (x) {
        if (k.tipeA === 'stdev') uA = stdevS(x) / Math.sqrt(n);
        else {
          const z = arah === 'naik' ? zNaik : zTurun;
          if (z) {
            const d = x.map((v, i) => v - z[i]);
            let m = 0;
            for (let i = 0; i < d.length; i++) for (let j = i + 1; j < d.length; j++) m = Math.max(m, Math.abs(d[j] - d[i]));
            uA = m / Math.sqrt(3);
          }
        }
      }
      const uStd = kal ? kal.u95 / 2 : null;
      const uDrift = kal ? (0.5 * kal.drift) / Math.sqrt(3) : null;
      const lengkap = uA !== null && uStd !== null && uZero !== null && uRes !== null && uDrift !== null;
      const uc = lengkap ? Math.sqrt(uA! ** 2 + uStd! ** 2 + uZero! ** 2 + uRes! ** 2 + uDrift! ** 2) : null;
      let vEff: number | null = null, kk: number | null = k.k;
      if (k.kMetode === 'veff') {
        kk = null;
        if (lengkap && uc! > 0) {
          const v = k.derajatBebas;
          const bawah = uA! ** 4 / v.tipeA + uStd! ** 4 / v.sertifikat + uZero! ** 4 / v.zero + uRes! ** 4 / v.resolusi + uDrift! ** 4 / v.drift;
          if (bawah > 0) { vEff = uc! ** 4 / bawah; kk = faktorKDariVeff(vEff); }
        }
      }
      const u95 = uc !== null && kk !== null ? kk * uc : null;
      const u95Lap = u95 === null ? null
        : k.u95MinimumLaporan !== null && Math.abs(u95) <= k.u95MinimumLaporan ? k.u95MinimumLaporan : u95;
      let hasil: Vonis = '-';
      if (u95Lap !== null && k.u95Maksimum !== null && u95Lap > k.u95Maksimum) u95Melebihi = true;
      if (kor !== null && u95Lap !== null) {
        hasil = Math.abs(kor) + u95Lap <= k.toleransi ? 'Laik' : 'Tidak Laik';
        jumlahDinilai++;
        if (hasil === 'Laik') jumlahLaik++;
      }
      titik.push({
        titik: t, arah, rataRata: rr, koreksi: kor, uTipeA: uA, uSertifikat: uStd, uZero, uResolusi: uRes,
        uDrift, uc, vEff, k: kk, u95, u95Laporan: u95Lap, u95Cetak: u95Lap === null ? null : bulatExcel(u95Lap, k.desimalCetak), hasil,
      });
    }
  }
  return { titik, jumlahLaik, jumlahDinilai, u95Melebihi };
}

// ───────────────────────────── LKK lengkap ─────────────────────────────

export function hitungLkk(tpl: TemplateAlat, data: DataLkk, kalibrator: TitikKalibrator[]): HasilLkk {
  const kurang: string[] = [];
  const resolusi = angka(data.identitas?.resolusi);
  const js = data.identitas?.jenisSkala;
  const jenisSkala: JenisSkala | null = js === 'Analog' || js === 'Digital' ? js : null;
  if (resolusi === null) kurang.push('Resolusi alat belum diisi');
  if (jenisSkala === null) kurang.push('Jenis skala (Analog/Digital) belum dipilih');
  if (!kalibrator.length) kurang.push('Kalibrator belum dipilih');

  // Fisik & fungsi: jumlah "baik" dibagi SEMUA kotak (sama seperti Excel COUNTIF/6). Spasi diabaikan.
  const baik = tpl.pilihanFisik[0].trim().toLowerCase();
  let jumlahBaik = 0, kosong = 0;
  for (const it of tpl.fisik) {
    for (const kol of ['fisik', 'fungsi'] as const) {
      const v = data.fisik?.[it.id]?.[kol];
      if (typeof v !== 'string' || !v.trim()) kosong++;
      else if (v.trim().toLowerCase() === baik) jumlahBaik++;
    }
  }
  let jumlahItem = tpl.fisik.length * 2;
  for (const it of tpl.fisikTambahan ?? []) {
    const v = data.fisikTambahan?.[it.id];
    if (typeof v !== 'string' || !v.trim()) kosong++;
    else if (v.trim().toLowerCase() === baik) jumlahBaik++;
    jumlahItem++;
  }
  if (kosong) kurang.push(`${kosong} isian fisik & fungsi belum diisi`);

  const ujiAmbang: HasilLkk['ujiAmbang'] = {};
  for (const u of tpl.ujiAmbang) {
    const isi = (data[u.id] ?? {}) as Record<string, unknown>;
    let nilaiUkur: number | null = null;
    if (u.jenis === 'selisih_setting') {
      const b = angka(isi.bacaan);
      nilaiUkur = b !== null && u.setting !== undefined ? u.setting - b : null;
    } else nilaiUkur = angka(isi.waktu ?? isi.nilai);
    if (nilaiUkur === null) kurang.push(`${u.judul} belum diisi`);
    ujiAmbang[u.id] = {
      nilaiUkur,
      hasil: nilaiUkur === null ? '-' : bandingkan(Math.abs(nilaiUkur), u.banding, u.batas) ? 'Laik' : 'Tidak Laik',
    };
  }

  const peringatan: string[] = [];
  const kinerja: HasilLkk['kinerja'] = {};
  for (const k of tpl.kinerja) {
    kinerja[k.id] = hitungNaikTurun(k, data.kinerja?.[k.id], kalibrator, resolusi, jenisSkala);
    if (kinerja[k.id].u95Melebihi && k.u95Maksimum !== null) peringatan.push(`${k.judul}: ketidakpastian (U95) melebihi ${k.u95Maksimum} ${k.satuan}`);
    const belum = kinerja[k.id].titik.filter((t) => t.hasil === '-').length;
    if (belum) kurang.push(`${k.judul}: ${belum} titik belum lengkap`);
  }

  const rincian: { dari: string; nilai: number }[] = [];
  for (const s of tpl.skor.item) {
    let nilai = 0;
    if (s.dari === 'fisik') nilai = jumlahBaik / jumlahItem >= s.minimalPersen ? s.nilai : 0;
    else if (s.dari === 'uji_ambang') nilai = ujiAmbang[s.id]?.hasil === 'Laik' ? s.nilai : 0;
    else {
      const h = kinerja[s.id];
      nilai = h && h.jumlahDinilai > 0 && h.jumlahLaik / h.jumlahDinilai >= s.minimalPersen ? s.nilai : 0;
    }
    rincian.push({ dari: s.dari === 'fisik' ? 'fisik' : s.id, nilai });
  }
  const total = rincian.reduce((a, b) => a + b.nilai, 0);
  const kesimpulan = bandingkan(total, tpl.skor.laikBila.banding, tpl.skor.laikBila.batas) ? 'Laik Pakai' : 'Tidak Laik Pakai';

  return { fisik: { jumlahBaik, jumlahItem, nilai: rincian.find((r) => r.dari === 'fisik')?.nilai ?? 0 }, ujiAmbang, kinerja, skor: { rincian, total }, kesimpulan, peringatan, kurang };
}
