/**
 * LKK POMPA (Infusion Pump, Syringe Pump) — penghubung antara mesin hitung pompa dan alur LKK (Tahap 6.3a).
 *
 * Perumpamaan: petugas loket yang menerjemahkan "fotokopi sertifikat IDA/ESA" yang menempel di LKK menjadi
 * tabel yang dimengerti mesin hitung, lalu mengecek kelengkapan lembar kerja. Murni (tanpa React/jaringan),
 * sama di tablet dan server. Tidak pernah melempar galat pada data kosong/rusak.
 *
 * Bentuk "fotokopi sertifikat" untuk alat standar berparameter banyak (IDA: aliran + tekanan; ESA: 4 tabel):
 *   calibratorSnapshot.ida = { jenis:'multi', asetId, nama, ..., berlakuSampai, tabel: { aliran_mlh: <baris>, tekanan_psi: <baris> } }
 * <baris> = salinan satu baris tera_calibrator_points. Titik pompa memakai bentuk tabel yang sama dengan Sphygmo
 * (koreksiNaik = koreksiTurun, u95Naik = u95Turun) sehingga tabel database tidak perlu diubah.
 */
import type { DataPompa, KalibratorPompa, TemplatePompa, TitikKoreksi } from './hitungPompa.js';
import type { IsiKerja, Kurang } from './isian.js';

type Peta = Record<string, any>;

const angka = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export const adalahTemplatePompa = (t: unknown): t is TemplatePompa =>
  !!t && typeof t === 'object' && (t as Peta).tipe === 'pompa';

/** Nama tabel di mesin hitung → [peran alat standar, parameter di master kalibrator]. */
export const SUMBER_TABEL: Record<string, [string, string]> = {
  aliran: ['ida', 'aliran_mlh'],
  tekanan: ['ida', 'tekanan_psi'],
  tegangan: ['esa', 'tegangan_v'],
  resistansi: ['esa', 'resistansi_ohm'],
  isolasi: ['esa', 'isolasi_mohm'],
  arus_bocor: ['esa', 'arus_bocor_ua'],
};

/** Baris master (points) → tabel mesin hitung. Baris rusak dibuang. */
export function titikPompa(baris: Peta | null | undefined): TitikKoreksi[] {
  const p = baris?.points;
  if (!Array.isArray(p)) return [];
  const hasil: TitikKoreksi[] = [];
  for (const t of p) {
    const koreksi = angka(t?.koreksiNaik) ? t.koreksiNaik : t?.koreksi;
    const u95 = angka(t?.u95Naik) ? t.u95Naik : t?.u95;
    if (angka(t?.titik) && angka(koreksi) && angka(u95)) hasil.push({ titik: t.titik, koreksi, u95 });
  }
  return hasil.sort((a, b) => a.titik - b.titik);
}

/** Tabel satu parameter dari snapshot LKK. Kosong bila alat standar belum dipilih / datanya kurang. */
export function tabelPompa(snapshot: Peta | null | undefined, nama: string): TitikKoreksi[] {
  const sumber = SUMBER_TABEL[nama];
  if (!sumber) return [];
  return titikPompa(snapshot?.[sumber[0]]?.tabel?.[sumber[1]]);
}

export function kalibratorDariSnapshot(snapshot: Peta | null | undefined): KalibratorPompa {
  return {
    aliran: tabelPompa(snapshot, 'aliran'),
    tekanan: tabelPompa(snapshot, 'tekanan'),
    listrik: {
      tegangan: tabelPompa(snapshot, 'tegangan'),
      resistansi: tabelPompa(snapshot, 'resistansi'),
      isolasi: tabelPompa(snapshot, 'isolasi'),
      arus_bocor: tabelPompa(snapshot, 'arus_bocor'),
    },
  };
}

/** Salinan snapshot → data untuk mesin hitung (bentuk data LKK sudah sama dengan DataPompa). */
export const dataPompa = (data: unknown): DataPompa => (data && typeof data === 'object' ? (data as DataPompa) : {});

/**
 * Yang masih kurang di bagian Keselamatan listrik & Kinerja (bagian 1–3 diperiksa oleh `periksaIsian` bersama).
 * Urutan = urutan layar.
 */
export function kurangPompa(tpl: TemplatePompa, isi: IsiKerja): Kurang[] {
  const kurang: Kurang[] = [];
  const data = dataPompa(isi?.data);
  for (const u of tpl.listrik) {
    if (!angka(data.listrik?.[u.id])) kurang.push({ bagian: 'keselamatan', teks: `${u.judul} belum diisi` });
  }
  const n = tpl.kinerja.pengulangan;
  const lengkap = (v: unknown) => Array.isArray(v) && v.length >= n && v.slice(0, n).every(angka);
  for (const s of tpl.kinerja.titikAliran) {
    if (!lengkap(data.aliran?.[String(s)])) kurang.push({ bagian: 'kinerja', teks: `Aliran ${s} mL/h: ${n} bacaan belum lengkap` });
  }
  if (!lengkap(data.sumbat?.bacaan)) kurang.push({ bagian: 'kinerja', teks: `Penyumbatan: ${n} bacaan belum lengkap` });
  return kurang;
}
