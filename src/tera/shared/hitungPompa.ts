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
 *
 * ATURAN KEPUTUSAN (dikoreksi 26 Okt 2026 05.01 setelah membaca KMK-MK-003.0 Pedoman Aturan Keputusan):
 *   Guard band w = TL − AL (3.3.7), Lulus bila hasil < AL = TL − w (3.6.2.2), umumnya w = U (3.7.2, ILAC G8)
 *   →  |koreksi| + U95 ≤ toleransi. Ini perilaku BAWAAN mesin (tanpa `aturanKeputusan`) dan dipakai Infusion v4 / Syringe v3.
 *   Opsi 'guardband_w_u' = tafsiran KELIRU (U dianggap saling coret → |C| ≤ MPE) yang sempat dipasang di Infusion v3 /
 *   Syringe v2 selama ±10 menit (tanpa LKK). Dipertahankan HANYA supaya template versi itu tetap bisa dihitung ulang apa adanya.
 */
import { bandingkan, bulatExcel, faktorKDariVeff, rataRata, stdevS, type Banding, type JenisSkala } from './hitung.js';

// ───────────────────────────── Bentuk template ─────────────────────────────

/** Batas uji: angka tetap, atau tabel menurut klasifikasi alat (kunci = nilai klasifikasi `menurut` digabung "|"). */
export type BatasUji = number | { menurut: string[]; nilai: Record<string, number> };

export interface UjiListrikPompa {
  id: string;
  judul: string;
  satuan: string;
  /** Kunci tabel ESA di snapshot kalibrator. */
  kalibrator: string;
  /**
   * sekitar: |x − nominal| + w ≤ batas · maksimum: |x| + w ≤ batas · minimum: x − w ≥ batas (tegas: x − w > batas)
   * w = kaliU × U95 (guard band KMK-MK-003.0; bawaan kaliU = 1).
   */
  uji: { jenis: 'sekitar'; nominal: number; batas: number } | { jenis: 'maksimum'; batas: BatasUji } | { jenis: 'minimum'; batas: BatasUji; tegas?: boolean };
  /** Di bawah titik pertama tabel: 'ujung' = koreksi titik pertama; 'proporsional' = koreksi × x / titik pertama (arus bocor). */
  diBawahTabel: 'ujung' | 'proporsional';
  /** Tulisan toleransi di sertifikat (batas tetap). Batas menurut klasifikasi → tulisan dibuat dari batasnya. */
  toleransiTeks: string;
  /** Uji hanya berlaku bila klasifikasi tertentu bernilai salah satu dari `nilai` (selain itu "Tidak berlaku"). */
  berlakuBila?: { klasifikasi: string; nilai: string[] };
  /** false = hanya ditampilkan, tidak ikut kesimpulan (Keselamatan Listrik: tegangan catu daya). Bawaan true. */
  masukKesimpulan?: boolean;
  /** Pengali guard band w = kaliU × U95. Bawaan 1 (KMK-MK-003.0). 0 = keberterimaan sederhana. */
  kaliU?: number;
  /** Tulisan hasil di layar sebagai pengganti Laik/Tidak Laik, mis. ['Dalam rentang', 'Di luar rentang']. */
  teksHasil?: [string, string];
}

/** Klasifikasi alat yang dipilih teknisi (KMK-MK-002: kelas proteksi, tipe bagian yang diaplikasikan, ...). */
export interface KlasifikasiListrik { id: string; label: string; pilihan: string[]; /** Wajib hanya bila klasifikasi lain bernilai tertentu. */ wajibBila?: { klasifikasi: string; nilai: string[] } }

export interface KinerjaPompa {
  /** Setting alat (mL/h). */
  titikAliran: number[];
  pengulangan: number;
  /** Toleransi aliran = setting × persen (± 10 %). */
  toleransiAliranPersen: number;
  /**
   * Aturan Laik per titik aliran. 'u95' (bawaan, Infusion Pump) = |koreksi| + U95 ≤ toleransi.
   * 'sepertiga' (Syringe Pump, mengikuti Excel View Report L18:L22) = |koreksi| + toleransi/3 ≤ toleransi.
   */
  aturanAliran?: 'u95' | 'sepertiga';
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
  /** 'tidak_ada' = tanpa bagian Keselamatan listrik (NIBP: alat standar hanya NIBP Simulator & termohigrometer). */
  keselamatan_listrik: 'wajib' | 'tidak_ada';
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
  /**
   * Tidak ada pada template KESELAMATAN LISTRIK saja (kode keselamatan_listrik): alat lain yang hanya diuji ESA.
   * Tanpa kinerja: kesimpulan = semua uji listrik yang berlaku & masuk kesimpulan Laik (Excel View Report C18), tanpa skor.
   */
  kinerja?: KinerjaPompa;
  skor?: {
    fisik: { minimalPersen: number; nilai: number }; listrik: { nilai: number }; kinerja: { nilai: number }; laikBila: { banding: Banding; batas: number };
    /**
     * Alat tanpa uji listrik (listrik kosong). 'nilai_penuh' (bawaan, Excel NIBP AE3) = nilai listrik diberikan penuh;
     * 'tidak_dihitung' (NIBP v2, keputusan Ridhwan 26 Okt 2026 19.02) = listrik tidak ikut, nilai maksimum = fisik + kinerja
     * dan ambang laikBila (dari 100) diskalakan ke maksimum itu → Laik Pakai hanya bila fisik & fungsi DAN kinerja lolos.
     */
    listrikBilaTidakDiuji?: 'nilai_penuh' | 'tidak_dihitung';
  };
  /** Kinerja NIBP (tanpa `kinerja` aliran). Skor kinerja dari titik NIBP. */
  nibp?: KinerjaNibp;
  /** Klasifikasi alat untuk batas uji listrik (template Keselamatan Listrik). */
  klasifikasi?: KlasifikasiListrik[];
  /**
   * U95 hasil listrik. 'sertifikat' (bawaan, pompa) = U sertifikat ESA apa adanya.
   * 'gum' (Keselamatan Listrik, Excel sheet Ketidakpastian baris 17–21) = k(veff) × U/2 dengan veff = derajat bebas sertifikat (60).
   */
  ketidakpastianListrik?: 'sertifikat' | 'gum';
  /**
   * Tanpa kinerja (Keselamatan Listrik v2, keputusan Ridhwan 26 Okt 2026 18.13): fisik & fungsi ikut menentukan —
   * Laik Pakai hanya bila kotak Baik/Berfungsi ≥ minimalPersen DAN semua uji listrik yang berlaku Laik.
   */
  fisikWajib?: { minimalPersen: number };
  /** Nama alat di PO yang memakai template ini selain `nama` (template Keselamatan Listrik dipakai banyak jenis alat). */
  alatTercakup?: string[];
  sertifikat: { tata_letak: string; halaman: number };
  /**
   * Aturan keputusan. Kosong = guard band w = U sesuai KMK-MK-003.0 (|C| + U ≤ batas) — BENAR, dipakai template baru.
   * 'guardband_w_u' = tafsiran keliru (|C| ≤ MPE) di Infusion v3 / Syringe v2; jangan dipakai di template baru.
   */
  aturanKeputusan?: 'guardband_w_u';
}

/**
 * KINERJA NIBP (Non Invasive Blood Pressure, Master_NIBP_terisi.xlsx 26 Okt 2026, KMK-MK-075.0).
 * 12 titik = 4 setting × (Systole, MAP, Diastole) dari NIBP Simulator. Per titik ≤ `pengulangan` bacaan alat (minimal
 * `minimalUlangan`). Koreksi & U NIBP Simulator diambil DI SETTING (interpolasi linier antara dua titik sertifikat yang
 * mengapit; U = MAKS keduanya); setting di luar rentang sertifikat → "Di luar rentang" (tidak dinilai Laik).
 * Bacaan terkoreksi = bacaan − koreksi std; koreksi alat = setting − rata-rata; budget GUM seperti Ketidakpastian!J:AA.
 * Laik bila |koreksi| + U95 ≤ toleransi (guard band w = U, View Report AE8 = 2).
 */
export interface KinerjaNibp {
  titik: { id: string; label: string; setting: number }[];
  pengulangan: number;
  minimalUlangan: number;
  /** MPE absolut (mmHg). */
  toleransi: number;
  satuan: string;
  driftPersen: number;
  derajatBebas: { sertifikat: number; resolusi: number; drift: number };
  pembagiResolusi: Record<JenisSkala, number>;
  desimalCetak: number;
  minimalPersenTitik: number;
}

/** Template pompa yang PASTI punya kinerja & skor (Infusion, Syringe). */
export type TemplatePompaKinerja = TemplatePompa & Required<Pick<TemplatePompa, 'kinerja' | 'skor'>>;

// ───────────────────────────── Data & kalibrator ─────────────────────────────

export type Angka = number | null | undefined;

export interface DataPompa {
  identitas?: { resolusi?: Angka; jenisSkala?: string | null };
  /** Pilihan klasifikasi alat (id KlasifikasiListrik → nilai). */
  klasifikasi?: Record<string, string | null | undefined>;
  fisik?: Record<string, { fisik?: string | null; fungsi?: string | null }>;
  /** Hasil ukur ESA per id uji listrik. */
  listrik?: Record<string, Angka>;
  /** Bacaan standar IDA per setting aliran (kunci = setting sebagai teks), pengulangan kali. */
  aliran?: Record<string, Angka[]>;
  sumbat?: { setting?: Angka; bacaan?: Angka[] };
  /** Bacaan alat NIBP per id titik (≤ pengulangan). */
  nibp?: Record<string, Angka[]>;
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
  /** NIBP Simulator: tekanan (mmHg), titik = setting simulator. */
  nibp?: TitikKoreksi[];
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

export interface HasilUjiListrik {
  terukur: number | null;
  u95: number | null;
  hasil: Vonis;
  /** false = uji tidak berlaku untuk klasifikasi alat ini (dicetak "-"). Tidak ada pada jejak lama = berlaku. */
  berlaku?: boolean;
  /** Batas yang dipakai (null = belum diketahui / tidak berlaku). */
  batas?: number | null;
  /** Tulisan toleransi sertifikat untuk alat ini. */
  toleransiTeks?: string;
}

export interface HasilNibp extends HasilBudget {
  id: string; label: string; setting: number;
  /** Jumlah bacaan yang terisi. */
  n: number;
  /** Koreksi & U sertifikat NIBP Simulator di setting (null = di luar rentang / tabel kosong). */
  koreksiStd: number | null;
  /** Rata-rata bacaan alat terkoreksi ("Pembacaan Alat" di sertifikat). */
  pembacaanAlat: number | null;
  /** 'Di luar rentang' / 'Ulangan kurang' bila tidak dinilai. */
  catatan: string | null;
  hasil: Vonis;
}

export interface HasilPompa {
  fisik: { jumlahBaik: number; jumlahItem: number; nilai: number; /** Keselamatan Listrik v2: fisik & fungsi memenuhi minimal persen */ lolos?: boolean };
  listrik: Record<string, HasilUjiListrik>;
  aliran: { titik: HasilAliran[]; jumlahLaik: number; jumlahDinilai: number };
  sumbat: HasilBudget & { setting: number | null; batas: number; hasil: Vonis };
  /** Hanya template NIBP. */
  nibp?: { titik: HasilNibp[]; jumlahLaik: number; jumlahDinilai: number };
  skor: { rincian: { dari: string; nilai: number }[]; total: number; /** Nilai maksimum bila bukan 100 (NIBP v2 tanpa listrik: 60). */ maks?: number };
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

/** Klasifikasi yang wajib dipilih (untuk kelengkapan): semua, kecuali yang `wajibBila`-nya tidak terpenuhi. */
export function klasifikasiWajib(tpl: TemplatePompa, data: DataPompa): KlasifikasiListrik[] {
  const kl = data.klasifikasi ?? {};
  return (tpl.klasifikasi ?? []).filter((k) => !k.wajibBila || k.wajibBila.nilai.includes(String(kl[k.wajibBila.klasifikasi] ?? '')));
}

/** Apakah uji listrik berlaku untuk klasifikasi alat ini. null = klasifikasi penentunya belum dipilih. */
export function ujiBerlaku(u: UjiListrikPompa, data: DataPompa): boolean | null {
  if (!u.berlakuBila) return true;
  const v = data.klasifikasi?.[u.berlakuBila.klasifikasi];
  if (typeof v !== 'string' || !v) return null;
  return u.berlakuBila.nilai.includes(v);
}

/** Batas uji untuk klasifikasi alat ini. null = klasifikasi penentunya belum dipilih / tidak ada di tabel. */
export function batasUji(b: BatasUji, data: DataPompa): number | null {
  if (typeof b === 'number') return b;
  const kunci = b.menurut.map((m) => String(data.klasifikasi?.[m] ?? '')).join('|');
  const n = b.nilai[kunci];
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

/** Tulisan toleransi sertifikat (Excel View Report I12:I15): "≤ 0,3", "> 2"; tidak berlaku / belum ada → "-". */
function teksToleransi(u: UjiListrikPompa, batas: number | null, berlaku: boolean | null): string {
  if (typeof u.uji.batas === 'number' && !u.berlakuBila) return u.toleransiTeks;
  if (berlaku === false || batas === null) return '-';
  const a = String(batas).replace('.', ',');
  return u.uji.jenis === 'minimum' ? `${u.uji.tegas ? '>' : '≥'} ${a}` : u.uji.jenis === 'maksimum' ? `≤ ${a}` : u.toleransiTeks;
}

export function hitungPompa(tpl: TemplatePompa, data: DataPompa, kal: KalibratorPompa): HasilPompa {
  const kurang: string[] = [];
  const kn = tpl.kinerja;
  const gb = tpl.aturanKeputusan === 'guardband_w_u';
  const resolusi = angka(data.identitas?.resolusi);
  const jenisSkala = jenisSkalaPompa(tpl, data);
  if (kn) {
    if (resolusi === null) kurang.push('Resolusi alat belum diisi');
    if (jenisSkala === null) kurang.push('Jenis skala (Analog/Digital) belum dipilih');
    if (!kal.aliran.length || !kal.tekanan.length) kurang.push('Kalibrator IDA belum dipilih');
  }
  if (tpl.listrik.some((u) => !(kal.listrik[u.kalibrator]?.length))) kurang.push('Kalibrator ESA belum dipilih');
  for (const k of klasifikasiWajib(tpl, data)) {
    const v = data.klasifikasi?.[k.id];
    if (typeof v !== 'string' || !k.pilihan.includes(v)) kurang.push(`${k.label} belum dipilih`);
  }

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
  const kFaktorGum = faktorKDariVeff(kn?.derajatBebas.sertifikat ?? 60);
  for (const u of tpl.listrik) {
    const mentah = angka(data.listrik?.[u.id]);
    const tabel = kal.listrik[u.kalibrator] ?? [];
    const berlaku = ujiBerlaku(u, data);
    const batas = u.uji.jenis === 'sekitar' ? u.uji.batas : batasUji(u.uji.batas, data);
    let terukur: number | null = null, u95: number | null = null, hasil: Vonis = '-';
    if (mentah !== null && tabel.length) {
      terukur = mentah + (koreksiDi(tabel, mentah, u.diBawahTabel) ?? 0);
      const uSer = u95Listrik(tabel, terukur);
      // Keselamatan Listrik (Excel Ketidakpastian!Y17:Y21): uc = U/2 (drift & resolusi kosong), veff = 60 → U95 = k × U/2
      u95 = uSer === null ? null : tpl.ketidakpastianListrik === 'gum' && kFaktorGum !== null ? kFaktorGum * (uSer / 2) : uSer;
      if (u95 !== null && berlaku === true && batas !== null) {
        const q = u.uji;
        // KMK-MK-003.0: guard band w = kaliU × U (bawaan 1); versi keliru pompa (gb) = 0
        const uu = gb ? 0 : (u.kaliU ?? 1) * u95;
        const lulus = q.jenis === 'sekitar' ? Math.abs(terukur - q.nominal) + uu <= batas
          : q.jenis === 'maksimum' ? Math.abs(terukur) + uu <= batas
          : q.tegas ? terukur - uu > batas : terukur - uu >= batas;
        hasil = lulus ? 'Laik' : 'Tidak Laik';
      }
    }
    if (berlaku !== false && mentah === null) kurang.push(`${u.judul} belum diisi`);
    listrik[u.id] = {
      terukur: berlaku === false ? null : terukur, u95: berlaku === false ? null : u95, hasil: berlaku === false ? '-' : hasil,
      ...(tpl.klasifikasi ? { berlaku: berlaku !== false, batas: berlaku === false ? null : batas, toleransiTeks: teksToleransi(u, batas, berlaku) } : {}),
    };
  }

  const fisikNilai = (sk: NonNullable<TemplatePompa['skor']>) => (jumlahBaik / jumlahItem >= sk.fisik.minimalPersen ? sk.fisik.nilai : 0);

  // ── NIBP: kinerja dari titik tekanan NIBP Simulator; skor fisik 10 + listrik 40 (tanpa uji listrik = 40, Excel AE3) + kinerja 50
  if (tpl.nibp) {
    const kn2 = tpl.nibp;
    const tabelStd = urut(kal.nibp ?? []);
    if (!tabelStd.length) kurang.push('Kalibrator NIBP Simulator belum dipilih');
    if (resolusi === null) kurang.push('Resolusi alat belum diisi');
    const uRes = resolusi !== null && jenisSkala !== null ? (resolusi * 0.5) / kn2.pembagiResolusi[jenisSkala] : null;
    const titik: HasilNibp[] = [];
    let jumlahLaik = 0;
    for (const t of kn2.titik) {
      const run = (data.nibp?.[t.id] ?? []).slice(0, kn2.pengulangan).map(angka).filter((x): x is number => x !== null);
      const n = run.length;
      const kosongB: HasilBudget = { rataRata: null, koreksi: null, uTipeA: null, uSertifikat: null, uResolusi: uRes, uDrift: null, uc: null, vEff: null, k: null, u95: null, u95Cetak: null };
      let b: HasilBudget = kosongB, koreksiStd: number | null = null, catatan: string | null = null, hasil: Vonis = '-';
      // Ketidakpastian!AC:AE — segmen sertifikat yang mengapit setting
      const nt = tabelStd.length;
      let uStdSer: number | null = null;
      if (nt >= 2) {
        if (t.setting < tabelStd[0].titik || t.setting > tabelStd[nt - 1].titik) catatan = 'Di luar rentang';
        else {
          const i = Math.min(cocok(tabelStd, t.setting), nt - 2);
          const a0 = tabelStd[i], a1 = tabelStd[i + 1];
          koreksiStd = a0.koreksi + ((a1.koreksi - a0.koreksi) * (t.setting - a0.titik)) / (a1.titik - a0.titik);
          uStdSer = Math.max(a0.u95, a1.u95);
        }
      }
      if (n < kn2.minimalUlangan) {
        if (n > 0) catatan = catatan ?? `Ulangan kurang dari ${kn2.minimalUlangan}`;
        kurang.push(`${t.label} ${t.setting} ${kn2.satuan}: minimal ${kn2.minimalUlangan} bacaan`);
      } else if (koreksiStd !== null && uStdSer !== null && uRes !== null) {
        const terkoreksi = run.map((x) => x - (koreksiStd as number));
        const rr = rataRata(terkoreksi);
        const uA = stdevS(terkoreksi) / Math.sqrt(n);
        const uStd = uStdSer / 2;
        const uDrift = (uStdSer * kn2.driftPersen) / Math.sqrt(3);
        const uc = Math.sqrt(uA ** 2 + uStd ** 2 + uRes ** 2 + uDrift ** 2);
        const d = kn2.derajatBebas;
        const bawah = uA ** 4 / (n - 1) + uStd ** 4 / d.sertifikat + uRes ** 4 / d.resolusi + uDrift ** 4 / d.drift;
        const vEff = uc > 0 && bawah > 0 ? uc ** 4 / bawah : null;
        const kk = vEff !== null ? faktorKDariVeff(vEff) : null;
        const u95 = kk !== null ? kk * uc : 0;
        b = { rataRata: rr, koreksi: t.setting - rr, uTipeA: uA, uSertifikat: uStd, uResolusi: uRes, uDrift, uc, vEff, k: kk, u95, u95Cetak: bulatExcel(u95, kn2.desimalCetak) };
        hasil = Math.abs(b.koreksi as number) + u95 <= kn2.toleransi ? 'Laik' : 'Tidak Laik';
        if (hasil === 'Laik') jumlahLaik++;
      }
      titik.push({ ...b, id: t.id, label: t.label, setting: t.setting, n, koreksiStd, pembacaanAlat: b.rataRata, catatan, hasil });
    }
    const sk = tpl.skor ?? { fisik: { minimalPersen: 0.7, nilai: 10 }, listrik: { nilai: 40 }, kinerja: { nilai: 50 }, laikBila: { banding: '>=' as Banding, batas: 90 } };
    const nFisik = fisikNilai(sk);
    // Tanpa uji listrik (alat berbaterai / hanya NIBP Simulator & termohigrometer) → nilai listrik penuh (Excel AE3)
    const tanpaListrik = tpl.listrik.length === 0 && sk.listrikBilaTidakDiuji === 'tidak_dihitung';
    const nListrik = tpl.listrik.length === 0 || tpl.listrik.every((u) => listrik[u.id].hasil === 'Laik') ? sk.listrik.nilai : 0;
    const nKinerja = kn2.titik.length > 0 && jumlahLaik / kn2.titik.length >= kn2.minimalPersenTitik ? sk.kinerja.nilai : 0;
    if (tanpaListrik) {
      // NIBP v2: hanya fisik & fungsi + kinerja; ambang (dari 100) diskalakan ke maksimum 60
      const maks = sk.fisik.nilai + sk.kinerja.nilai;
      const total2 = nFisik + nKinerja;
      return {
        fisik: { jumlahBaik, jumlahItem, nilai: nFisik }, listrik,
        aliran: { titik: [], jumlahLaik: 0, jumlahDinilai: 0 },
        sumbat: { rataRata: null, koreksi: null, uTipeA: null, uSertifikat: null, uResolusi: null, uDrift: null, uc: null, vEff: null, k: null, u95: null, u95Cetak: null, setting: null, batas: 0, hasil: '-' },
        nibp: { titik, jumlahLaik, jumlahDinilai: kn2.titik.length },
        skor: { rincian: [{ dari: 'fisik', nilai: nFisik }, { dari: 'kinerja', nilai: nKinerja }], total: total2, maks },
        kesimpulan: maks > 0 && bandingkan((total2 * 100) / maks, sk.laikBila.banding, sk.laikBila.batas) ? 'Laik Pakai' : 'Tidak Laik Pakai',
        kurang,
      };
    }
    const total = nFisik + nListrik + nKinerja;
    return {
      fisik: { jumlahBaik, jumlahItem, nilai: nFisik }, listrik,
      aliran: { titik: [], jumlahLaik: 0, jumlahDinilai: 0 },
      sumbat: { rataRata: null, koreksi: null, uTipeA: null, uSertifikat: null, uResolusi: null, uDrift: null, uc: null, vEff: null, k: null, u95: null, u95Cetak: null, setting: null, batas: 0, hasil: '-' },
      nibp: { titik, jumlahLaik, jumlahDinilai: kn2.titik.length },
      skor: { rincian: [{ dari: 'fisik', nilai: nFisik }, { dari: 'listrik', nilai: nListrik }, { dari: 'kinerja', nilai: nKinerja }], total },
      kesimpulan: bandingkan(total, sk.laikBila.banding, sk.laikBila.batas) ? 'Laik Pakai' : 'Tidak Laik Pakai',
      kurang,
    };
  }

  // ── Tanpa kinerja (Keselamatan Listrik saja): kesimpulan = semua uji yang berlaku & masuk kesimpulan Laik (Excel View Report C18)
  if (!kn) {
    const dinilai = tpl.listrik.filter((u) => u.masukKesimpulan !== false && listrik[u.id].berlaku !== false);
    const fisikOk = !tpl.fisikWajib || jumlahBaik / jumlahItem >= tpl.fisikWajib.minimalPersen;
    const laik = dinilai.length > 0 && dinilai.every((u) => listrik[u.id].hasil === 'Laik') && fisikOk;
    return {
      fisik: { jumlahBaik, jumlahItem, nilai: tpl.skor ? fisikNilai(tpl.skor) : 0, ...(tpl.fisikWajib ? { lolos: fisikOk } : {}) }, listrik,
      aliran: { titik: [], jumlahLaik: 0, jumlahDinilai: 0 },
      sumbat: { rataRata: null, koreksi: null, uTipeA: null, uSertifikat: null, uResolusi: null, uDrift: null, uc: null, vEff: null, k: null, u95: null, u95Cetak: null, setting: null, batas: 0, hasil: '-' },
      skor: { rincian: [], total: 0 },
      kesimpulan: laik ? 'Laik Pakai' : 'Tidak Laik Pakai',
      kurang,
    };
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
      const tambahan = kn.aturanAliran === 'sepertiga' ? toleransi / 3 : b.u95;
      // KMK: C + |U| ≤ MPE + w, w = U → |C| ≤ MPE
      hasil = Math.abs(b.koreksi) + (gb ? 0 : tambahan) <= toleransi ? 'Laik' : 'Tidak Laik';
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
  if (bs.rataRata !== null && bs.u95 !== null) hasilSumbat = bandingkan(Math.abs(bs.rataRata) + (gb ? 0 : bs.u95), kn.sumbat.banding, kn.sumbat.batas) ? 'Laik' : 'Tidak Laik';
  else kurang.push('Penyumbatan belum lengkap');
  const sumbat = { ...bs, koreksi: null, setting: settingSumbat, batas: kn.sumbat.batas, hasil: hasilSumbat };

  // Skor
  const sk = tpl.skor ?? { fisik: { minimalPersen: 0.7, nilai: 10 }, listrik: { nilai: 40 }, kinerja: { nilai: 50 }, laikBila: { banding: '>=' as Banding, batas: 90 } };
  const nFisik = fisikNilai(sk);
  const semuaListrik = tpl.listrik.length > 0 && tpl.listrik.every((u) => listrik[u.id].hasil === 'Laik');
  const nListrik = semuaListrik ? sk.listrik.nilai : 0;
  const alirOk = aliran.jumlahDinilai > 0 && aliran.jumlahLaik / aliran.jumlahDinilai >= kn.minimalPersenAliran;
  const nKinerja = alirOk && hasilSumbat === 'Laik' ? sk.kinerja.nilai : 0;
  const rincian = [{ dari: 'fisik', nilai: nFisik }, { dari: 'listrik', nilai: nListrik }, { dari: 'kinerja', nilai: nKinerja }];
  const total = nFisik + nListrik + nKinerja;
  const kesimpulan = bandingkan(total, sk.laikBila.banding, sk.laikBila.batas) ? 'Laik Pakai' : 'Tidak Laik Pakai';

  return { fisik: { jumlahBaik, jumlahItem, nilai: nFisik }, listrik, aliran, sumbat, skor: { rincian, total }, kesimpulan, kurang };
}
