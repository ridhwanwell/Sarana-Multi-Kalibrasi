/**
 * MESIN HITUNG POMPA INFUS / SYRINGE (Tahap 6, PRD F5) — satu kode untuk tablet (offline) dan server.
 *
 * Perumpamaan: sama seperti kalkulator budget ketidakpastian Sphygmo, tetapi untuk alat yang diuji dengan
 * IDA (aliran + penyumbatan) dan ESA (keselamatan listrik). Mesin TIDAK tahu nama alat; semua angka
 * (titik ukur, toleransi, bobot skor) datang dari TEMPLATE, nilai kalibrator dari SNAPSHOT kalibrator.
 *
 * Sumber rumus: Master_Infusion_Pump.xlsx (26 Okt 2026) — sheet Ketidakpastian, View Report, Calibrator 1.
 * Keputusan Ridhwan 26 Okt 2026 yang MENGGANTIKAN perilaku Excel:
 *  - Fisik & Fungsi: semua kotak (Baik pada kolom Fisik, Berfungsi pada kolom Fungsi) dihitung, ≥ 70 % = nilai penuh
 *    (Excel lama hanya menghitung kata "Baik" sehingga kolom Fungsi tidak pernah terhitung).
 *  - Titik uji aliran di bawah 250 mL/h (di dalam rentang kalibrasi IDA); titik 400 dihapus.
 *  - Batas penyumbatan: |nilai| + U95 ≤ batas (Excel lama memakai "<" di keputusan, "≤" di teks).
 *
 * Rumus yang sama dengan Excel:
 *  - Tiap bacaan run dikoreksi tabel kalibrator (interpolasi linier di nilai bacaan; di bawah titik pertama = koreksi
 *    pertama; di atas/sama dengan titik terakhir = koreksi terakhir).
 *  - Rata-rata = AVERAGE(run terkoreksi), Koreksi = rata-rata − setting
 *  - u Tipe A = STDEV.S(run terkoreksi)/√n, derajat kebebasan n − 1
 *  - U sertifikat = MAKS dari dua titik tabel yang mengapit rata-rata bacaan MENTAH; u = U/2 (dof 60)
 *  - u resolusi = resolusi × 0,5 / pembagi (Digital √3, Analog √6), dof 50
 *  - u drift = (10 % × U sertifikat)/√3, dof 50
 *  - uc = √Σu²; veff = uc⁴ / Σ(uᵢ⁴/vᵢ); k = polinom veff; U95 = k × uc
 *  - Aliran Laik bila |koreksi| + U95 ≤ setting × 10 %
 *  - Listrik: bacaan + koreksi ESA; U = MAKS dari dua titik yang mengapit nilai terkoreksi
 *  - Skor: fisik&fungsi 10 + listrik (semua lulus) 40 + kinerja 50 (≥ 70 % titik aliran Laik DAN penyumbatan Laik); Laik Pakai bila ≥ 90
 */
import { bandingkan, bulatExcel, faktorKDariVeff, rataRata, stdevS, type Banding, type JenisSkala } from './hitung.js';

// ───────────────────────────── Bentuk template ─────────────────────────────

export interface UjiListrikPompa {
  id: string;
  judul: string;
  satuan: string;
  /** Kunci tabel ESA di snapshot kalibrator. */
  kalibrator: string;
  /** sekitar: |x − nominal| + U ≤ batas · maksimum: |x| + U ≤ batas · minimum: x − U ≥ batas */
  uji: { jenis: 'sekitar'; nominal: number; batas: number } | { jenis: 'maksimum'; batas: number } | { jenis: 'minimum'; batas: number };
  /** Di bawah titik pertama tabel: 'ujung' = koreksi titik pertama; 'proporsional' = koreksi × x / titik pertama (arus bocor). */
  diBawahTabel: 'ujung' | 'proporsional';
  /** Tulisan toleransi di sertifikat. */
  toleransiTeks: string;
}

export interface KinerjaPompa {
  /** Setting alat (mL/h). */
  titikAliran: number[];
  pengulangan: number;
  /** Toleransi aliran = setting × persen (± 10 %). */
  toleransiAliranPersen: number;
  /** Penyumbatan: batas (psi), resolusi tetap IDA (psi), setting bawaan (mL/h). */
  sumbat: { batas: number; banding: Banding; resolusiTetap: number; settingBawaan: number };
  /** Drift standar = persen × U sertifikat. */
  driftPersen: number;
  derajatBebas: { sertifikat: number; resolusi: number; drift: number };
  pembagiResolusi: Record<JenisSkala, number>;
  desimalCetak: number;
  minimalPersenAliran: number;
}

export interface TemplatePompa {
  /** Penanda jenis template: mesin & layar memilih cabang pompa dari sini. */
  tipe: 'pompa';
  kode_alat: string;
  nama: string;
  versi: number;
  sumber: string;
  metode: string;
  kop: 'KAN' | 'NON_KAN';
  keselamatan_listrik: 'wajib';
  /** v2 (26 Okt 2026): resolusi diisi bebas oleh teknisi (pilihan kosong), jenis skala tidak ditanyakan → `jenisTetap` (Digital, persegi √3). */
  identitas: { resolusi: { satuan: string; pilihan: number[] }; jenisSkala: JenisSkala[]; jenisTetap?: JenisSkala };
  /** Kolom identitas layar (menimpa bawaan Sphygmo yang bersatuan mmHg). */
  identitasBidang: { id: string; label: string; jenis: 'teks' | 'angka' | 'tanggal' | 'resolusi' | 'skala'; satuan?: string; maksPanjang?: number }[];
  /** Alat standar yang dipilih teknisi; tiap alat membawa beberapa tabel (parameter) sekaligus. */
  standar: { peran: string; judul: string; parameter: string[]; wajib: boolean; hanyaRekomendasi?: boolean }[];
  fisik: { id: string; judul: string }[];
  /** [baik, tidak baik] untuk kolom Fisik dan [berfungsi, tidak berfungsi] untuk kolom Fungsi. */
  pilihanFisik: { fisik: [string, string]; fungsi: [string, string] };
  listrik: UjiListrikPompa[];
  kinerja: KinerjaPompa;
  skor: { fisik: { minimalPersen: number; nilai: number }; listrik: { nilai: number }; kinerja: { nilai: number }; laikBila: { banding: Banding; batas: number } };
  sertifikat: { tata_letak: string; halaman: number };
}

// ───────────────────────────── Data & kalibrator ─────────────────────────────

export type Angka = number | null | undefined;

export interface DataPompa {
  identitas?: { resolusi?: Angka; jenisSkala?: string | null };
  fisik?: Record<string, { fisik?: string | null; fungsi?: string | null }>;
  /** Hasil ukur ESA per id uji listrik. */
  listrik?: Record<string, Angka>;
  /** Bacaan standar IDA per setting aliran (kunci = setting sebagai teks), pengulangan kali. */
  aliran?: Record<string, Angka[]>;
  sumbat?: { setting?: Angka; bacaan?: Angka[] };
}

/** Satu baris sertifikat kalibrator: titik = bacaan alat standar (urut naik). */
export interface TitikKoreksi { titik: number; koreksi: number; u95: number }

export interface KalibratorPompa {
  /** IDA: aliran (mL/h). */
  aliran: TitikKoreksi[];
  /** IDA: tekanan penyumbatan (psi). */
  tekanan: TitikKoreksi[];
  /** ESA: kunci = UjiListrikPompa.kalibrator. */
  listrik: Record<string, TitikKoreksi[]>;
}

// ───────────────────────────── Hasil ─────────────────────────────

export type Vonis = 'Laik' | 'Tidak Laik' | '-';

export interface HasilBudget {
  rataRata: number | null;
  koreksi: number | null;
  uTipeA: number | null;
  uSertifikat: number | null;
  uResolusi: number | null;
  uDrift: number | null;
  uc: number | null;
  vEff: number | null;
  k: number | null;
  u95: number | null;
  u95Cetak: number | null;
}

export interface HasilAliran extends HasilBudget { setting: number; toleransi: number; hasil: Vonis }

export interface HasilPompa {
  fisik: { jumlahBaik: number; jumlahItem: number; nilai: number };
  listrik: Record<string, { terukur: number | null; u95: number | null; hasil: Vonis }>;
  aliran: { titik: HasilAliran[]; jumlahLaik: number; jumlahDinilai: number };
  sumbat: HasilBudget & { setting: number | null; batas: number; hasil: Vonis };
  skor: { rincian: { dari: string; nilai: number }[]; total: number };
  kesimpulan: 'Laik Pakai' | 'Tidak Laik Pakai';
  kurang: string[];
}

// ───────────────────────────── Fungsi tabel kalibrator ─────────────────────────────

const angka = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

const urut = (t: TitikKoreksi[]) => [...t].sort((a, b) => a.titik - b.titik);

/** Indeks titik terbesar ≤ x (Excel MATCH tipe 1). Dipanggil hanya bila x ≥ titik pertama. */
function cocok(t: TitikKoreksi[], x: number): number {
  let i = 0;
  for (let j = 0; j < t.length; j++) if (t[j].titik <= x) i = j;
  return i;
}

/** Koreksi di nilai bacaan x (Excel View Report!H10:H13, Ketidakpastian!E24). null bila tabel kosong. */
export function koreksiDi(tabel: TitikKoreksi[], x: number, diBawah: 'ujung' | 'proporsional' = 'ujung'): number | null {
  if (!tabel.length || !Number.isFinite(x)) return null;
  const t = urut(tabel), n = t.length;
  if (x < t[0].titik) return diBawah === 'proporsional' && t[0].titik !== 0 ? (t[0].koreksi * x) / t[0].titik : t[0].koreksi;
  if (x >= t[n - 1].titik) return t[n - 1].koreksi;
  const i = cocok(t, x);
  const lebar = Math.max(t[Math.min(i + 1, n - 1)].titik - t[i].titik, 1e-9);
  return t[i].koreksi + ((t[Math.min(i + 1, n - 1)].koreksi - t[i].koreksi) * (x - t[i].titik)) / lebar;
}

/** U95 sertifikat di x: ≤ titik pertama → titik pertama; ≥ titik terakhir → terakhir; selain itu MAKS dari dua titik yang mengapit. */
export function u95Di(tabel: TitikKoreksi[], x: number): number | null {
  if (!tabel.length || !Number.isFinite(x)) return null;
  const t = urut(tabel), n = t.length;
  if (x <= t[0].titik) return t[0].u95;
  if (x >= t[n - 1].titik) return t[n - 1].u95;
  const i = cocok(t, x);
  return Math.max(t[i].u95, t[Math.min(i + 1, n - 1)].u95);
}

/** U95 untuk hasil listrik: sama dengan Excel View Report!X10:X13 (dicari di nilai TERKOREKSI, ujung atas ikut MAKS dua titik terakhir). */
function u95Listrik(tabel: TitikKoreksi[], x: number): number | null {
  if (!tabel.length || !Number.isFinite(x)) return null;
  const t = urut(tabel), n = t.length;
  if (x <= t[0].titik) return t[0].u95;
  const i = cocok(t, x);
  return Math.max(t[i].u95, t[Math.min(i + 1, n - 1)].u95);
}

// ───────────────────────────── Budget satu titik ─────────────────────────────

function lengkapRun(v: Angka[] | undefined, n: number): number[] | null {
  if (!Array.isArray(v) || v.length < n) return null;
  const x = v.slice(0, n).map(angka);
  return x.every((a): a is number => a !== null) ? x : null;
}

/** Budget ketidakpastian satu titik (Ketidakpastian!K:AB). resolusiU = resolusi × 0,5 / pembagi. */
function budgetTitik(
  run: number[] | null, mentah: number[] | null, setting: number | null, tabel: TitikKoreksi[],
  uResolusi: number | null, k: KinerjaPompa, desimal: number, diBawah: 'ujung' | 'proporsional' = 'ujung',
): HasilBudget {
  const kosong: HasilBudget = { rataRata: null, koreksi: null, uTipeA: null, uSertifikat: null, uResolusi, uDrift: null, uc: null, vEff: null, k: null, u95: null, u95Cetak: null };
  if (!run || !mentah || setting === null || !tabel.length || uResolusi === null) return kosong;
  const terkoreksi: number[] = [];
  for (const x of mentah) {
    const c = koreksiDi(tabel, x, diBawah);
    if (c === null) return kosong;
    terkoreksi.push(x + c);
  }
  const n = terkoreksi.length;
  const rr = rataRata(terkoreksi);
  const uA = stdevS(terkoreksi) / Math.sqrt(n);
  const uSer = u95Di(tabel, rataRata(mentah));
  if (uSer === null) return kosong;
  const uStd = uSer / 2;
  const uDrift = (uSer * k.driftPersen) / Math.sqrt(3);
  const uc = Math.sqrt(uA ** 2 + uStd ** 2 + uResolusi ** 2 + uDrift ** 2);
  const vA = Math.max(1, n - 1);
  const d = k.derajatBebas;
  const bawah = uA ** 4 / vA + uStd ** 4 / d.sertifikat + uResolusi ** 4 / d.resolusi + uDrift ** 4 / d.drift;
  const vEff = uc > 0 && bawah > 0 ? uc ** 4 / bawah : null;
  const kk = vEff !== null ? faktorKDariVeff(vEff) : null;
  const u95 = kk !== null ? kk * uc : null;
  return { rataRata: rr, koreksi: rr - setting, uTipeA: uA, uSertifikat: uStd, uResolusi, uDrift, uc, vEff, k: kk, u95, u95Cetak: u95 === null ? null : bulatExcel(u95, desimal) };
}

// ───────────────────────────── LKK lengkap ─────────────────────────────

/** Jenis skala efektif: pilihan teknisi (template v1) atau nilai tetap template (v2: Digital). */
export function jenisSkalaPompa(tpl: TemplatePompa, data: DataPompa): JenisSkala | null {
  const js = tpl.identitas.jenisTetap ?? data.identitas?.jenisSkala;
  return js === 'Analog' || js === 'Digital' ? js : null;
}

export function hitungPompa(tpl: TemplatePompa, data: DataPompa, kal: KalibratorPompa): HasilPompa {
  const kurang: string[] = [];
  const kn = tpl.kinerja;
  const resolusi = angka(data.identitas?.resolusi);
  const jenisSkala = jenisSkalaPompa(tpl, data);
  if (resolusi === null) kurang.push('Resolusi alat belum diisi');
  if (jenisSkala === null) kurang.push('Jenis skala (Analog/Digital) belum dipilih');
  if (!kal.aliran.length || !kal.tekanan.length) kurang.push('Kalibrator IDA belum dipilih');
  if (tpl.listrik.some((u) => !(kal.listrik[u.kalibrator]?.length))) kurang.push('Kalibrator ESA belum dipilih');

  // Fisik & Fungsi: SEMUA kotak dihitung (keputusan Ridhwan 26 Okt 2026). Spasi & huruf besar diabaikan.
  const norm = (s: string) => s.trim().toLowerCase();
  let jumlahBaik = 0, kosong = 0;
  for (const it of tpl.fisik) {
    for (const [kol, baik] of [['fisik', tpl.pilihanFisik.fisik[0]], ['fungsi', tpl.pilihanFisik.fungsi[0]]] as const) {
      const v = data.fisik?.[it.id]?.[kol];
      if (typeof v !== 'string' || !v.trim()) kosong++;
      else if (norm(v) === norm(baik)) jumlahBaik++;
    }
  }
  const jumlahItem = tpl.fisik.length * 2;
  if (kosong) kurang.push(`${kosong} isian fisik & fungsi belum diisi`);

  // Keselamatan listrik
  const listrik: HasilPompa['listrik'] = {};
  for (const u of tpl.listrik) {
    const mentah = angka(data.listrik?.[u.id]);
    const tabel = kal.listrik[u.kalibrator] ?? [];
    let terukur: number | null = null, u95: number | null = null, hasil: Vonis = '-';
    if (mentah !== null && tabel.length) {
      terukur = mentah + (koreksiDi(tabel, mentah, u.diBawahTabel) ?? 0);
      u95 = u95Listrik(tabel, terukur);
      if (u95 !== null) {
        const q = u.uji;
        const lulus = q.jenis === 'sekitar' ? Math.abs(terukur - q.nominal) + u95 <= q.batas
          : q.jenis === 'maksimum' ? Math.abs(terukur) + u95 <= q.batas
          : terukur - u95 >= q.batas;
        hasil = lulus ? 'Laik' : 'Tidak Laik';
      }
    }
    if (mentah === null) kurang.push(`${u.judul} belum diisi`);
    listrik[u.id] = { terukur, u95, hasil };
  }

  // Aliran
  const uResAliran = resolusi !== null && jenisSkala !== null ? (resolusi * 0.5) / kn.pembagiResolusi[jenisSkala] : null;
  const aliran: HasilPompa['aliran'] = { titik: [], jumlahLaik: 0, jumlahDinilai: 0 };
  for (const s of kn.titikAliran) {
    const mentah = lengkapRun(data.aliran?.[String(s)], kn.pengulangan);
    const b = budgetTitik(mentah, mentah, s, kal.aliran, uResAliran, kn, kn.desimalCetak);
    const toleransi = Math.abs(s * kn.toleransiAliranPersen);
    let hasil: Vonis = '-';
    if (b.koreksi !== null && b.u95 !== null) {
      hasil = Math.abs(b.koreksi) + b.u95 <= toleransi ? 'Laik' : 'Tidak Laik';
      aliran.jumlahDinilai++;
      if (hasil === 'Laik') aliran.jumlahLaik++;
    } else kurang.push(`Aliran ${s} mL/h belum lengkap`);
    aliran.titik.push({ ...b, setting: s, toleransi, hasil });
  }

  // Penyumbatan (resolusi psi tetap, selalu pembagi √3 persegi seperti Excel Ketidakpastian!T37)
  const settingSumbat = angka(data.sumbat?.setting) ?? kn.sumbat.settingBawaan;
  const runSumbat = lengkapRun(data.sumbat?.bacaan, kn.pengulangan);
  const uResSumbat = (kn.sumbat.resolusiTetap * 0.5) / Math.sqrt(3);
  const bs = budgetTitik(runSumbat, runSumbat, 0, kal.tekanan, uResSumbat, kn, kn.desimalCetak);
  let hasilSumbat: Vonis = '-';
  if (bs.rataRata !== null && bs.u95 !== null) hasilSumbat = bandingkan(Math.abs(bs.rataRata) + bs.u95, kn.sumbat.banding, kn.sumbat.batas) ? 'Laik' : 'Tidak Laik';
  else kurang.push('Penyumbatan belum lengkap');
  const sumbat = { ...bs, koreksi: null, setting: settingSumbat, batas: kn.sumbat.batas, hasil: hasilSumbat };

  // Skor
  const sk = tpl.skor;
  const nFisik = jumlahBaik / jumlahItem >= sk.fisik.minimalPersen ? sk.fisik.nilai : 0;
  const semuaListrik = tpl.listrik.length > 0 && tpl.listrik.every((u) => listrik[u.id].hasil === 'Laik');
  const nListrik = semuaListrik ? sk.listrik.nilai : 0;
  const alirOk = aliran.jumlahDinilai > 0 && aliran.jumlahLaik / aliran.jumlahDinilai >= kn.minimalPersenAliran;
  const nKinerja = alirOk && hasilSumbat === 'Laik' ? sk.kinerja.nilai : 0;
  const rincian = [{ dari: 'fisik', nilai: nFisik }, { dari: 'listrik', nilai: nListrik }, { dari: 'kinerja', nilai: nKinerja }];
  const total = nFisik + nListrik + nKinerja;
  const kesimpulan = bandingkan(total, sk.laikBila.banding, sk.laikBila.batas) ? 'Laik Pakai' : 'Tidak Laik Pakai';

  return { fisik: { jumlahBaik, jumlahItem, nilai: nFisik }, listrik, aliran, sumbat, skor: { rincian, total }, kesimpulan, kurang };
}
