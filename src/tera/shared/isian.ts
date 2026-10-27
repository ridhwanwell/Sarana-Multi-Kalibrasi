/**
 * ATURAN ISIAN LKK — bagian, kolom identitas, alat standar, kelengkapan (Tahap 4.3c, PRD-TAHAP4-LKK A1).
 *
 * Perumpamaan: daftar periksa di sampul lembar kerja. Layar membaca daftar ini; angka & batas
 * datang dari TEMPLATE alat bila ada, bila belum ada dipakai nilai bawaan Master v12 / PRD Lampiran C.
 * Fungsi murni (tanpa jaringan/database): dipakai layar teknisi sekarang, Selia & server nanti.
 *
 * Bentuk data LKK (PRD-TAHAP4-LKK bagian 3): data.identitas / data.lingkungan / data.fisik,
 * `tanggalKalibrasi` (tanggal pelaksanaan) dan `calibratorSnapshot.{tekanan,stopwatch,termohigrometer}`.
 */
import type { TemplateAlat } from './hitung.js';
import type { TemplatePompa } from './hitungPompa.js';
import { adalahTemplatePompa, kurangPompa } from './lkkPompa.js';
import { BATAS_LINGKUNGAN_BAWAAN, diLuarBatas, type BatasLingkungan } from './lingkungan.js';

// ───────────────────────────── Bagian layar ─────────────────────────────

export type BagianId = 'identitas' | 'lingkungan' | 'fisik' | 'keselamatan' | 'kinerja' | 'kesimpulan' | 'ringkasan';

export interface DefBagian { id: BagianId; nama: string; /** false = layarnya dibuka di langkah pengerjaan berikutnya */ tersedia: boolean }

/** Urutan CLAUDE.md 13.5. Keselamatan listrik hanya bila template memintanya. */
export function daftarBagian(tpl: Pick<TemplateAlat, 'keselamatan_listrik'> | Pick<TemplatePompa, 'keselamatan_listrik' | 'tipe'>): DefBagian[] {
  // Pompa (Infusion/Syringe): bagian Keselamatan listrik sudah ada layarnya (Tahap 6.3).
  const listrikAda = adalahTemplatePompa(tpl);
  // Keselamatan Listrik saja (template pompa tanpa kinerja): tidak ada bagian Kinerja
  const adaKinerja = !(adalahTemplatePompa(tpl) && !(tpl as TemplatePompa).kinerja && !(tpl as TemplatePompa).nibp && !(tpl as TemplatePompa).termo);
  return [
    { id: 'identitas', nama: 'Identitas alat', tersedia: true },
    { id: 'lingkungan', nama: 'Kondisi lingkungan', tersedia: true },
    { id: 'fisik', nama: 'Fisik & fungsi', tersedia: true },
    ...(tpl.keselamatan_listrik !== 'tidak_ada' ? [{ id: 'keselamatan' as const, nama: 'Keselamatan listrik', tersedia: listrikAda }] : []),
    ...(adaKinerja ? [{ id: 'kinerja' as const, nama: 'Kinerja', tersedia: true }] : []),
    { id: 'kesimpulan', nama: 'Kesimpulan', tersedia: true },
    { id: 'ringkasan', nama: 'Ringkasan & Selesai', tersedia: true },
  ];
}

// ───────────────────────────── Kolom identitas ─────────────────────────────

export type JenisBidang = 'teks' | 'angka' | 'tanggal' | 'resolusi' | 'skala';
export interface BidangIdentitas { id: string; label: string; jenis: JenisBidang; satuan?: string; maksPanjang?: number }

/**
 * Urutan Master v12 sheet "Input 1" baris 15–25 (Merk, Tipe, No.Seri, Rentang Ukur, Resolusi, Jenis,
 * Tanggal penerimaan, Ruangan). Nama alat, tempat (RS), tanggal pelaksanaan & teknisi tampil dari sumber lain.
 * Template boleh menimpa lewat `identitasBidang` (versi 2 nanti); versi 1 memakai daftar ini.
 */
export const BIDANG_IDENTITAS_BAWAAN: BidangIdentitas[] = [
  { id: 'merek', label: 'Merek', jenis: 'teks', maksPanjang: 80 },
  { id: 'tipe', label: 'Tipe', jenis: 'teks', maksPanjang: 80 },
  { id: 'noSeri', label: 'Nomor seri', jenis: 'teks', maksPanjang: 80 },
  { id: 'rentangUkur', label: 'Rentang ukur', jenis: 'angka', satuan: 'mmHg' },
  { id: 'resolusi', label: 'Resolusi', jenis: 'resolusi', satuan: 'mmHg' },
  { id: 'jenisSkala', label: 'Jenis skala', jenis: 'skala' },
  { id: 'tanggalPenerimaan', label: 'Tanggal penerimaan alat', jenis: 'tanggal' },
  { id: 'ruang', label: 'Ruangan', jenis: 'teks', maksPanjang: 80 },
];

type TemplateLonggar = Partial<{ identitasBidang: BidangIdentitas[]; lingkungan: BatasLingkungan; standar: DefStandar[] }>;
const longgar = (t: unknown): TemplateLonggar => (t && typeof t === 'object' ? (t as TemplateLonggar) : {});

export function bidangIdentitas(tpl: TemplateAlat | TemplatePompa): BidangIdentitas[] {
  const b = longgar(tpl).identitasBidang;
  return Array.isArray(b) && b.length ? b : BIDANG_IDENTITAS_BAWAAN;
}

export function batasLingkungan(tpl: TemplateAlat | TemplatePompa): BatasLingkungan {
  const b = longgar(tpl).lingkungan;
  const sah = (x: any) => x && Number.isFinite(x.min) && Number.isFinite(x.maks) && x.min < x.maks;
  return b && sah(b.suhu) && sah(b.rh) ? b : BATAS_LINGKUNGAN_BAWAAN;
}

// ───────────────────────────── Alat standar ─────────────────────────────

export type PeranStandar = 'tekanan' | 'stopwatch' | 'termohigrometer' | 'ida' | 'esa' | 'nibp' | 'chamber';

export interface DefStandar {
  peran: PeranStandar;
  judul: string;
  /** Parameter kalibrator di master; termohigrometer = 2 parameter dari aset yang sama. */
  parameter: string[];
  wajib: boolean;
  /** T9 (Ridhwan 20 Okt 2026): bila ada yang ditandai rekomendasi, hanya itu yang ditawarkan. */
  hanyaRekomendasi?: boolean;
}

/** Tiga baris "fotokopi sertifikat" yang dicetak Report All baris 35–37. */
export const STANDAR_BAWAAN: DefStandar[] = [
  { peran: 'tekanan', judul: 'Pressure meter (alat ukur tekanan)', parameter: ['tekanan_mmhg'], wajib: true },
  { peran: 'stopwatch', judul: 'Stopwatch', parameter: ['waktu_s'], wajib: true },
  { peran: 'termohigrometer', judul: 'Termohigrometer', parameter: ['suhu_c', 'kelembaban_rh'], wajib: true, hanyaRekomendasi: true },
];

export function daftarStandar(tpl: TemplateAlat | TemplatePompa): DefStandar[] {
  const s = longgar(tpl).standar;
  return Array.isArray(s) && s.length ? s : STANDAR_BAWAAN;
}

/** Bagian kalibrator yang dibutuhkan di sini (KalibratorLokal memenuhinya). */
export interface KalibratorMin {
  asetId: string; parameter: string; nama: string;
  merk: string | null; model: string | null; nomorSeri: string | null; nomorSertifikat: string | null;
  tertelusur: string | null; tanggalKalibrasi: string | null; berlakuSampai: string | null;
  rekomendasi?: boolean;
}

export interface PilihanStandar<K extends KalibratorMin = KalibratorMin> {
  /** = asetId */
  kunci: string;
  nama: string;
  merk: string | null; model: string | null; nomorSeri: string | null; nomorSertifikat: string | null;
  berlakuSampai: string | null;
  rekomendasi: boolean;
  /** Semua parameter yang dibutuhkan peran ini ada di master. */
  lengkap: boolean;
  baris: K[];
}

/** Berlaku sampai paling awal dari seluruh baris (satu sertifikat bisa punya 2 baris: suhu & kelembaban). */
const berlakuTerawal = (baris: { berlakuSampai: string | null }[]): string | null => {
  const t = baris.map((b) => b.berlakuSampai).filter((x): x is string => !!x).sort();
  return t[0] ?? null;
};

/** Pilihan alat untuk satu peran, dari daftar kalibrator di perangkat. */
export function susunPilihan<K extends KalibratorMin>(def: DefStandar, semua: K[]): PilihanStandar<K>[] {
  const per = new Map<string, K[]>();
  for (const k of semua) {
    if (!def.parameter.includes(k.parameter)) continue;
    const l = per.get(k.asetId) ?? [];
    l.push(k);
    per.set(k.asetId, l);
  }
  let hasil: PilihanStandar<K>[] = [...per.entries()].map(([asetId, baris]) => {
    const p = baris[0];
    return {
      kunci: asetId, nama: p.nama, merk: p.merk, model: p.model, nomorSeri: p.nomorSeri,
      nomorSertifikat: p.nomorSertifikat, berlakuSampai: berlakuTerawal(baris),
      rekomendasi: baris.some((b) => b.rekomendasi === true),
      lengkap: def.parameter.every((pr) => baris.some((b) => b.parameter === pr)),
      baris,
    };
  });
  if (def.hanyaRekomendasi && hasil.some((h) => h.rekomendasi)) hasil = hasil.filter((h) => h.rekomendasi);
  return hasil.sort((a, b) => Number(b.rekomendasi) - Number(a.rekomendasi) || a.nama.localeCompare(b.nama));
}

export type StatusBerlaku = 'berlaku' | 'expired' | 'belum_bersertifikat';

/** CLAUDE.md 9.4: expired bila tanggal pelaksanaan SESUDAH tanggal berlaku; tanggal kosong = belum bersertifikat (tidak diblokir). */
export function statusBerlaku(berlakuSampai: string | null | undefined, tanggalPelaksanaan: string | null | undefined): StatusBerlaku {
  if (!berlakuSampai || !/^\d{4}-\d{2}-\d{2}/.test(berlakuSampai)) return 'belum_bersertifikat';
  const hari = typeof tanggalPelaksanaan === 'string' && /^\d{4}-\d{2}-\d{2}/.test(tanggalPelaksanaan) ? tanggalPelaksanaan.slice(0, 10) : new Date().toISOString().slice(0, 10);
  return hari > berlakuSampai.slice(0, 10) ? 'expired' : 'berlaku';
}

type Peta = Record<string, any>;

/** "Fotokopi sertifikat" untuk satu pilihan. `jepret` = buatSnapshot (masterLokal). Termohigrometer: dua tabel dalam satu salinan. */
export function jepretStandar<K extends KalibratorMin>(def: DefStandar, p: PilihanStandar<K>, jepret: (k: K) => Peta): Peta {
  if (def.parameter.length === 1) {
    const k = p.baris.find((b) => b.parameter === def.parameter[0]);
    return jepret(k as K);
  }
  if (def.peran !== 'termohigrometer') {
    // Alat standar berparameter banyak (IDA, ESA): satu salinan membawa semua tabelnya (lihat shared/lkkPompa.ts)
    const induk = p.baris[0];
    const tabel: Peta = {};
    for (const pr of def.parameter) {
      const b = p.baris.find((x) => x.parameter === pr);
      if (b) tabel[pr] = jepret(b);
    }
    return {
      jenis: 'multi', asetId: p.kunci, nama: induk.nama, merk: induk.merk, model: induk.model, nomorSeri: induk.nomorSeri,
      nomorSertifikat: induk.nomorSertifikat, tertelusur: induk.tertelusur, tanggalKalibrasi: induk.tanggalKalibrasi,
      berlakuSampai: p.berlakuSampai, tabel, dijepretAt: new Date().toISOString(),
    };
  }
  const lawan = def.parameter.map((pr) => p.baris.find((b) => b.parameter === pr));
  const [suhu, kelembaban] = lawan;
  const induk = p.baris[0];
  return {
    jenis: 'termohigrometer', asetId: p.kunci, nama: induk.nama, merk: induk.merk, model: induk.model, nomorSeri: induk.nomorSeri,
    nomorSertifikat: induk.nomorSertifikat, tertelusur: induk.tertelusur, tanggalKalibrasi: induk.tanggalKalibrasi,
    berlakuSampai: p.berlakuSampai,
    suhu: suhu ? jepret(suhu) : null, kelembaban: kelembaban ? jepret(kelembaban) : null,
    dijepretAt: new Date().toISOString(),
  };
}

/** Tabel koreksi di snapshot termohigrometer, untuk `hitungLingkungan`. */
export const tabelSuhu = (snap: Peta | null | undefined) => (Array.isArray(snap?.suhu?.points) ? snap!.suhu.points : null);
export const tabelRh = (snap: Peta | null | undefined) => (Array.isArray(snap?.kelembaban?.points) ? snap!.kelembaban.points : null);

// ───────────────────────────── Kelengkapan ─────────────────────────────

export interface IsiKerja {
  data: Peta;
  /** Tanggal pelaksanaan (LkkLokal.tanggalKalibrasi). */
  tanggal: string | null;
  snapshot: Peta | null;
}

export interface Kurang {
  bagian: BagianId;
  teks: string;
  /** Merah: alat standar expired / lingkungan di luar batas — memblokir Selesai & ACC (CLAUDE.md 13.11). */
  merah?: boolean;
}

const teksIsi = (v: unknown) => typeof v === 'string' && v.trim().length > 0;
const tanggalSah = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(v + 'T00:00:00Z').getTime());
const angkaSah = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Status satu snapshot terhadap tanggal pelaksanaan (null = belum dipilih). */
export function statusSnapshot(snap: Peta | null | undefined, tanggal: string | null | undefined): StatusBerlaku | null {
  if (!snap || typeof snap !== 'object') return null;
  return statusBerlaku(snap.berlakuSampai ?? null, tanggal);
}

/**
 * Semua yang masih kurang di bagian 1–3. Bagian lain (kinerja, kesimpulan) ditambahkan langkah berikutnya.
 * Urutan = urutan layar. Tidak pernah melempar galat pada data kosong/rusak.
 */
/** Opsi dropdown fisik & fungsi. Sphygmo: satu pasang untuk keduanya; pompa: Baik/Tidak Baik dan Berfungsi/Tidak Berfungsi. */
export function opsiFisik(tpl: TemplateAlat | TemplatePompa): { fisik: [string, string]; fungsi: [string, string] } {
  const p = tpl.pilihanFisik as unknown;
  if (Array.isArray(p)) return { fisik: p as [string, string], fungsi: p as [string, string] };
  return p as { fisik: [string, string]; fungsi: [string, string] };
}

export function periksaIsian(tpl: TemplateAlat | TemplatePompa, isi: IsiKerja): Kurang[] {
  const kurang: Kurang[] = [];
  const data = isi?.data && typeof isi.data === 'object' ? isi.data : {};
  const iden = (data.identitas && typeof data.identitas === 'object' ? data.identitas : {}) as Peta;

  // 1. Identitas
  for (const b of bidangIdentitas(tpl)) {
    const v = iden[b.id];
    if (b.jenis === 'teks') { if (!teksIsi(v)) kurang.push({ bagian: 'identitas', teks: `${b.label} belum diisi` }); }
    else if (b.jenis === 'angka') {
      if (!angkaSah(v)) kurang.push({ bagian: 'identitas', teks: `${b.label} belum diisi` });
      else if (v <= 0) kurang.push({ bagian: 'identitas', teks: `${b.label} harus lebih dari 0` });
    }
    else if (b.jenis === 'tanggal') { if (!tanggalSah(v)) kurang.push({ bagian: 'identitas', teks: `${b.label} belum diisi` }); }
    else if (b.jenis === 'resolusi') { if (!angkaSah(v) || !tpl.identitas.resolusi.pilihan.includes(v)) kurang.push({ bagian: 'identitas', teks: `${b.label} belum dipilih` }); }
    else if (b.jenis === 'skala') { if (typeof v !== 'string' || !tpl.identitas.jenisSkala.includes(v as any)) kurang.push({ bagian: 'identitas', teks: `${b.label} belum dipilih` }); }
  }
  if (!tanggalSah(isi?.tanggal)) kurang.push({ bagian: 'identitas', teks: 'Tanggal pelaksanaan belum diisi' });
  else if (tanggalSah(iden.tanggalPenerimaan) && iden.tanggalPenerimaan > isi.tanggal) {
    kurang.push({ bagian: 'identitas', teks: 'Tanggal penerimaan tidak boleh sesudah tanggal pelaksanaan' });
  }
  for (const d of daftarStandar(tpl)) {
    const snap = isi?.snapshot?.[d.peran];
    const st = statusSnapshot(snap, isi?.tanggal);
    if (st === null) { if (d.wajib) kurang.push({ bagian: 'identitas', teks: `${d.judul} belum dipilih` }); }
    else if (st === 'expired') kurang.push({ bagian: 'identitas', teks: `${d.judul} expired pada tanggal pelaksanaan — pilih alat lain atau ubah tanggal`, merah: true });
    else if (d.peran === 'termohigrometer' && d.parameter.length > 1 && (!snap?.suhu || !snap?.kelembaban)) kurang.push({ bagian: 'identitas', teks: `Data ${d.judul.toLowerCase()} belum lengkap (suhu & kelembaban) — pilih alat lain atau hubungi Developer` });
    else if (d.peran !== 'termohigrometer' && d.parameter.length > 1 && d.parameter.some((pr) => !Array.isArray(snap?.tabel?.[pr]?.points) || snap.tabel[pr].points.length === 0)) kurang.push({ bagian: 'identitas', teks: `Data ${d.judul} belum lengkap (tabel koreksi kurang) — pilih alat lain atau hubungi Developer` });
  }

  // 2. Lingkungan
  const ling = (data.lingkungan && typeof data.lingkungan === 'object' ? data.lingkungan : {}) as Peta;
  const batas = batasLingkungan(tpl);
  const kolom: { id: string; nama: string; batas: { min: number; maks: number }; satuan: string }[] = [
    { id: 'suhuAwal', nama: 'Suhu awal', batas: batas.suhu, satuan: '°C' },
    { id: 'suhuAkhir', nama: 'Suhu akhir', batas: batas.suhu, satuan: '°C' },
    { id: 'rhAwal', nama: 'Kelembaban awal', batas: batas.rh, satuan: '%RH' },
    { id: 'rhAkhir', nama: 'Kelembaban akhir', batas: batas.rh, satuan: '%RH' },
  ];
  for (const k of kolom) {
    if (!angkaSah(ling[k.id])) kurang.push({ bagian: 'lingkungan', teks: `${k.nama} belum diisi` });
    else if (diLuarBatas(ling[k.id], k.batas)) kurang.push({ bagian: 'lingkungan', teks: `${k.nama} ${String(ling[k.id]).replace('.', ',')} ${k.satuan} di luar batas ${k.batas.min}–${k.batas.maks} ${k.satuan}`, merah: true });
  }

  // 3. Fisik & fungsi
  const fisik = (data.fisik && typeof data.fisik === 'object' ? data.fisik : {}) as Peta;
  for (const f of tpl.fisik) {
    const baris = fisik[f.id] ?? {};
    const opsi = opsiFisik(tpl);
    if (!(opsi.fisik as string[]).includes(baris.fisik) || !(opsi.fungsi as string[]).includes(baris.fungsi)) kurang.push({ bagian: 'fisik', teks: `${f.judul}: pilih kondisi Fisik dan Fungsi` });
  }
  const tambahan = (data.fisikTambahan && typeof data.fisikTambahan === 'object' ? data.fisikTambahan : {}) as Peta;
  const daftarTambahan = adalahTemplatePompa(tpl) ? [] : (tpl.fisikTambahan ?? []);
  for (const f of daftarTambahan) {
    if (typeof tambahan[f.id] !== 'string' || !(opsiFisik(tpl).fisik as string[]).includes(tambahan[f.id])) kurang.push({ bagian: 'fisik', teks: `${f.judul}: pilih kondisi` });
  }

  // Pompa: keselamatan listrik + aliran + penyumbatan (rumus di shared/hitungPompa.ts)
  if (adalahTemplatePompa(tpl)) return [...kurang, ...kurangPompa(tpl, isi)];

  // 5. Kinerja: uji ambang (bocor, laju buang, ...) lalu bacaan naik/turun tiap titik
  const tplNaikTurun = tpl as TemplateAlat;
  for (const u of tplNaikTurun.ujiAmbang) {
    const isiU = (data[u.id] && typeof data[u.id] === 'object' ? data[u.id] : {}) as Peta;
    const nilai = u.jenis === 'selisih_setting' ? isiU.bacaan : (isiU.waktu ?? isiU.nilai);
    if (!angkaSah(nilai)) kurang.push({ bagian: 'kinerja', teks: `${u.judul} belum diisi` });
  }
  const kin = (data.kinerja && typeof data.kinerja === 'object' ? data.kinerja : {}) as Peta;
  for (const k of tplNaikTurun.kinerja) {
    for (const t of k.titik) {
      const baris = (kin[k.id]?.[String(t)] ?? {}) as Peta;
      const arahKurang = (['naik', 'turun'] as const).filter((a) => {
        const run = baris[a];
        return !Array.isArray(run) || run.length < k.pengulangan || !run.slice(0, k.pengulangan).every(angkaSah);
      });
      if (arahKurang.length) kurang.push({ bagian: 'kinerja', teks: `${k.judul}: titik ${t} ${k.satuan} — bacaan ${arahKurang.join(' & ')} belum lengkap` });
    }
  }
  return kurang;
}

/** Bagian lengkap bila tidak ada kekurangan yang menunjuk ke bagian itu. */
export function bagianLengkap(kurang: Kurang[], id: BagianId): boolean {
  return !kurang.some((k) => k.bagian === id);
}
