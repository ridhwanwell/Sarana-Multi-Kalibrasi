/**
 * "Jejak hitung" — catatan tertulis SEMUA angka perhitungan satu LKK (Tera SMK, Tahap 4.3d).
 *
 * Perumpamaan: ini lembar "Ketidakpastian" di Excel yang ikut dicetak dan disimpan bersama LKK. Selama ini
 * hasil hitung hanya dihitung ulang saat dilihat; sekarang setiap komponen (rata-rata, koreksi, u Tipe A,
 * u sertifikat, u zero, u resolusi, u drift, uc, v efektif, k, U95) + aturan yang dipakai + versi template
 * + kesimpulan Laik/Tidak Laik ditulis ke kolom `results`, ikut checksum paket, dan ikut dibekukan saat ACC.
 *
 * Murni (tanpa React/IndexedDB), sama di tablet dan server. Isinya DETERMINISTIK: data yang sama → jejak
 * yang sama persis (tidak ada jam/acak), sehingga server bisa menghitung ulang dan membandingkan.
 * Tidak pernah melempar galat pada data kosong/rusak (hasilnya `lengkap: false`).
 */
import { hitungLkk, type DataLkk, type HasilLkk, type TemplateAlat, type TitikKalibrator } from './hitung.js';
import { hitungPompa, type HasilPompa, type TemplatePompa } from './hitungPompa.js';
import { adalahTemplatePompa, dataPompa, kalibratorDariSnapshot } from './lkkPompa.js';

/** Naik bila rumus/susunan jejak berubah. Dicatat di setiap jejak. */
export const VERSI_MESIN_HITUNG = 1;
export const SKEMA_JEJAK = 1;

type Peta = Record<string, any>;

const angka = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Tabel koreksi/U95/drift dari "fotokopi" kalibrator. Baris yang rusak dibuang (tidak pernah melempar galat). */
export function titikDariSnapshot(snap: Peta | null | undefined): TitikKalibrator[] {
  const p = snap?.points;
  if (!Array.isArray(p)) return [];
  const hasil: TitikKalibrator[] = [];
  for (const t of p) {
    if (![t?.titik, t?.koreksiNaik, t?.koreksiTurun, t?.u95Naik, t?.u95Turun].every(angka)) continue;
    hasil.push({
      titik: t.titik, koreksiNaik: t.koreksiNaik, koreksiTurun: t.koreksiTurun, u95Naik: t.u95Naik, u95Turun: t.u95Turun,
      ...(angka(t.driftNaik) ? { driftNaik: t.driftNaik } : {}), ...(angka(t.driftTurun) ? { driftTurun: t.driftTurun } : {}),
    });
  }
  return hasil;
}

export interface JejakHitung {
  skema: number;
  mesinHitung: number;
  template: { kode: string; versi: number; metode: string };
  /** Alat standar yang dipakai hitungan (identitas saja; tabel lengkapnya ada di calibrator_snapshot). */
  kalibrator: { peran: string; asetId: string | null; nama: string | null; nomorSertifikat: string | null; berlakuSampai: string | null; jumlahTitik: number } | null;
  /** Masukan non-bacaan yang dipakai rumus. */
  masukan: { resolusi: number | null; jenisSkala: string | null };
  /** Aturan template yang dipakai (disalin, supaya jejak bisa dibaca tanpa template). */
  aturan: {
    kinerja: Record<string, Pick<TemplateAlat['kinerja'][number], 'toleransi' | 'tipeA' | 'koreksiPada' | 'kMetode' | 'derajatBebas' | 'u95MinimumLaporan' | 'u95Maksimum' | 'pembagiResolusi' | 'desimalCetak' | 'k'>>;
    ujiAmbang: TemplateAlat['ujiAmbang'];
    skor: TemplateAlat['skor'];
  };
  hasil: HasilLkk;
  /** true = semua isian yang dibutuhkan hitungan ada (hasil.kurang kosong). Bila false, kesimpulan BELUM final. */
  lengkap: boolean;
  /** Kesimpulan yang dipakai teknisi untuk memilih stiker; null selama data belum lengkap. */
  kesimpulan: 'Laik Pakai' | 'Tidak Laik Pakai' | null;
}

/** Bersihkan nilai agar aman jadi JSON (NaN/Infinity → null). Semua angka di HasilLkk sudah terbatas; ini sabuk pengaman. */
function aman<T>(x: T): T {
  return JSON.parse(JSON.stringify(x, (_k, v) => (typeof v === 'number' && !Number.isFinite(v) ? null : v)));
}

/** Jejak hitung pompa (Infusion/Syringe): isi sama maksudnya dengan JejakHitung, rumusnya dari hitungPompa.ts. */
export interface JejakPompa {
  skema: number;
  mesinHitung: number;
  jenis: 'pompa';
  template: { kode: string; versi: number; metode: string };
  kalibrator: Record<string, { asetId: string | null; nama: string | null; nomorSertifikat: string | null; berlakuSampai: string | null; jumlahTabel: number } | null>;
  masukan: { resolusi: number | null; jenisSkala: string | null };
  aturan: { kinerja: TemplatePompa['kinerja']; listrik: TemplatePompa['listrik']; skor: TemplatePompa['skor'] };
  hasil: HasilPompa;
  lengkap: boolean;
  kesimpulan: 'Laik Pakai' | 'Tidak Laik Pakai' | null;
}

function buatJejakPompa(tpl: TemplatePompa, data: unknown, snapshot: Peta | null | undefined): JejakPompa | null {
  try {
    const hasil = hitungPompa(tpl, dataPompa(data), kalibratorDariSnapshot(snapshot));
    const lengkap = hasil.kurang.length === 0;
    const iden = ((data as Peta | null)?.identitas ?? {}) as Peta;
    const identitasAlat = (peran: string) => {
      const s = snapshot?.[peran] as Peta | undefined;
      if (!s || typeof s !== 'object') return null;
      return {
        asetId: typeof s.asetId === 'string' ? s.asetId : null, nama: typeof s.nama === 'string' ? s.nama : null,
        nomorSertifikat: typeof s.nomorSertifikat === 'string' ? s.nomorSertifikat : null,
        berlakuSampai: typeof s.berlakuSampai === 'string' ? s.berlakuSampai : null,
        jumlahTabel: s.tabel && typeof s.tabel === 'object' ? Object.keys(s.tabel).length : 0,
      };
    };
    return aman({
      skema: SKEMA_JEJAK, mesinHitung: VERSI_MESIN_HITUNG, jenis: 'pompa' as const,
      template: { kode: tpl.kode_alat, versi: tpl.versi, metode: tpl.metode },
      kalibrator: { ida: identitasAlat('ida'), esa: identitasAlat('esa') },
      masukan: { resolusi: angka(iden.resolusi) ? iden.resolusi : null, jenisSkala: typeof iden.jenisSkala === 'string' ? iden.jenisSkala : null },
      aturan: { kinerja: tpl.kinerja, listrik: tpl.listrik, skor: tpl.skor },
      hasil, lengkap, kesimpulan: lengkap ? hasil.kesimpulan : null,
    });
  } catch {
    return null;
  }
}

/**
 * Susun jejak hitung. `peranKinerja` = peran alat standar yang tabelnya dipakai hitungan kinerja
 * (Sphygmomanometer: 'tekanan'). Mengembalikan null hanya bila template rusak.
 */
export function buatJejakHitung(tpl: TemplateAlat, data: DataLkk | Peta | null | undefined, snapshot: Peta | null | undefined, peranKinerja?: string): JejakHitung | null;
export function buatJejakHitung(tpl: TemplatePompa, data: Peta | null | undefined, snapshot: Peta | null | undefined): JejakPompa | null;
export function buatJejakHitung(tpl: TemplateAlat | TemplatePompa, data: DataLkk | Peta | null | undefined, snapshot: Peta | null | undefined, peranKinerja?: string): JejakHitung | JejakPompa | null;
export function buatJejakHitung(
  tpl: TemplateAlat | TemplatePompa,
  data: DataLkk | Peta | null | undefined,
  snapshot: Peta | null | undefined,
  peranKinerja = 'tekanan',
): JejakHitung | JejakPompa | null {
  if (adalahTemplatePompa(tpl)) return buatJejakPompa(tpl, data, snapshot);
  try {
    const snap = (snapshot?.[peranKinerja] ?? null) as Peta | null;
    const tabel = titikDariSnapshot(snap);
    const d = (data && typeof data === 'object' ? data : {}) as DataLkk;
    const hasil = hitungLkk(tpl, d, tabel);
    const lengkap = hasil.kurang.length === 0;
    const iden = (d.identitas ?? {}) as Peta;
    const kinerja: JejakHitung['aturan']['kinerja'] = {};
    for (const k of tpl.kinerja) {
      kinerja[k.id] = {
        toleransi: k.toleransi, tipeA: k.tipeA, ...(k.koreksiPada ? { koreksiPada: k.koreksiPada } : {}), kMetode: k.kMetode, derajatBebas: k.derajatBebas, u95MinimumLaporan: k.u95MinimumLaporan,
        u95Maksimum: k.u95Maksimum, pembagiResolusi: k.pembagiResolusi, desimalCetak: k.desimalCetak, k: k.k,
      };
    }
    return aman({
      skema: SKEMA_JEJAK,
      mesinHitung: VERSI_MESIN_HITUNG,
      template: { kode: tpl.kode_alat, versi: tpl.versi, metode: tpl.metode },
      kalibrator: snap ? {
        peran: peranKinerja, asetId: typeof snap.asetId === 'string' ? snap.asetId : null, nama: typeof snap.nama === 'string' ? snap.nama : null,
        nomorSertifikat: typeof snap.nomorSertifikat === 'string' ? snap.nomorSertifikat : null,
        berlakuSampai: typeof snap.berlakuSampai === 'string' ? snap.berlakuSampai : null, jumlahTitik: tabel.length,
      } : null,
      masukan: { resolusi: angka(iden.resolusi) ? iden.resolusi : null, jenisSkala: typeof iden.jenisSkala === 'string' ? iden.jenisSkala : null },
      aturan: { kinerja, ujiAmbang: tpl.ujiAmbang, skor: tpl.skor },
      hasil,
      lengkap,
      kesimpulan: lengkap ? hasil.kesimpulan : null,
    });
  } catch {
    return null;
  }
}
