/**
 * TEMPLATE & KALIBRATOR DI PERANGKAT (Tahap 4.3a, PRD F4.10 · CLAUDE.md 9.3, 9.4, 10)
 *
 * Perumpamaan: map "resep alat" dan map "fotokopi sertifikat kalibrator" di tas teknisi.
 *  - Template: versi yang sudah pernah diterima TIDAK pernah dibuang (LKK lama mungkin memakainya).
 *    Template bawaan kode dipakai bila perangkat belum pernah menerima dari server (offline pertama).
 *  - Kalibrator: daftar diganti utuh dengan daftar terbaru dari server (dalam 1 transaksi).
 *    LKK tidak terpengaruh, karena LKK menyimpan SNAPSHOT-nya sendiri saat kalibrator dipilih.
 *  - Kalibrator expired diperiksa di perangkat terhadap TANGGAL PELAKSANAAN LKK, tanpa internet.
 *
 * Modul ini tidak menyentuh laci `lkk`/`outbox`.
 */
import { minta, tx } from './teraDb';
import type { TemplateAlat, TitikKalibrator } from '../shared/hitung';
import type { TemplatePompa } from '../shared/hitungPompa';
import { TEMPLATE_SPHYGMOMANOMETER_V2, TEMPLATE_SPHYGMOMANOMETER_V3 } from '../shared/templates/sphygmomanometer';

/**
 * Template bawaan kode: CADANGAN bila perangkat belum pernah menerima template alat itu dari server.
 * Bila server sudah pernah mengirim template alat tsb, versi dari server yang dipakai (server = acuan Selia),
 * sehingga versi baru di kode tidak dipakai sebelum template itu ada di database.
 */
export const TEMPLATE_BAWAAN: TemplateApa[] = [TEMPLATE_SPHYGMOMANOMETER_V2, TEMPLATE_SPHYGMOMANOMETER_V3];

/** Template naik-turun (Sphygmo, timbangan) atau template pompa (Infusion/Syringe). */
export type TemplateApa = TemplateAlat | TemplatePompa;

export interface TemplateLokal { id: string; kodeAlat: string; versi: number; definition: TemplateApa; diambilAt: string }

export interface KalibratorLokal {
  id: string;                       // "<asetId>|<parameter>"
  pointsId: string;
  asetId: string;
  kode: string | null;
  nama: string;
  merk: string | null;
  model: string | null;
  nomorSeri: string | null;
  parameter: string;
  satuan: string;
  nomorSertifikat: string | null;
  tertelusur: string | null;
  tanggalKalibrasi: string | null;
  berlakuSampai: string | null;     // null = belum bersertifikat → tidak diblokir
  points: TitikKalibrator[];
  budget: unknown;
  sumber: string;
  diubahPada: string;
  diambilAt: string;
  /** T9 (Ridhwan 20 Okt 2026): alat yang direkomendasikan. Server belum mengirim → tidak ada. */
  rekomendasi?: boolean;
}

const teks = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);
const tanggal = (v: unknown): string | null => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

/** Template rusak dibuang (tidak boleh membuat layar crash). */
export function bersihkanTemplate(mentah: unknown): TemplateApa | null {
  const t = (mentah as any)?.definition ?? mentah;
  if (!t || typeof t !== 'object') return null;
  if (!teks(t.kode_alat) || !Number.isInteger(t.versi) || t.versi < 1 || !teks(t.nama)) return null;
  if (t.kop !== 'KAN' && t.kop !== 'NON_KAN') return null;
  if (t.tipe === 'pompa') {
    // Template pompa: bentuk berbeda (aliran + penyumbatan + listrik)
    if (!Array.isArray(t.fisik) || !Array.isArray(t.listrik) || !Array.isArray(t.standar) || !t.pilihanFisik?.fisik || !t.pilihanFisik?.fungsi) return null;
    if (t.kinerja) {
      if (!Array.isArray(t.kinerja.titikAliran) || !t.kinerja.titikAliran.every(num) || !t.kinerja.sumbat || !t.skor?.laikBila) return null;
    } else if (t.nibp) {
      // NIBP: titik tekanan (tanpa uji listrik)
      if (!Array.isArray(t.nibp.titik) || !t.nibp.titik.length || !t.nibp.titik.every((x: any) => num(x?.setting) && typeof x?.id === 'string') || !t.skor?.laikBila) return null;
    } else {
      // Keselamatan Listrik saja: wajib ada klasifikasi & minimal satu uji listrik
      if (!Array.isArray(t.klasifikasi) || !t.listrik.length) return null;
    }
    if (!t.identitas?.resolusi || !Array.isArray(t.identitas.resolusi.pilihan)) return null;
    return t as TemplatePompa;
  }
  if (!Array.isArray(t.fisik) || !Array.isArray(t.ujiAmbang) || !Array.isArray(t.kinerja)) return null;
  if (!t.skor || !Array.isArray(t.skor.item) || !t.skor.laikBila) return null;
  if (!t.identitas?.resolusi || !Array.isArray(t.identitas.resolusi.pilihan)) return null;
  for (const k of t.kinerja) if (!Array.isArray(k?.titik) || !k.titik.every(num) || !num(k.toleransi)) return null;
  return t as TemplateAlat;
}

export function bersihkanKalibrator(mentah: unknown, diambilAt: string): KalibratorLokal | null {
  const k = mentah as any;
  if (!k || typeof k !== 'object') return null;
  const asetId = teks(k.asetId), parameter = teks(k.parameter), pointsId = teks(k.pointsId);
  if (!asetId || !parameter || !pointsId) return null;
  if (!Array.isArray(k.points) || k.points.length === 0) return null;
  const points: TitikKalibrator[] = [];
  for (const p of k.points) {
    if (![p?.titik, p?.koreksiNaik, p?.koreksiTurun, p?.u95Naik, p?.u95Turun].every(num)) return null;
    points.push({
      titik: p.titik, koreksiNaik: p.koreksiNaik, koreksiTurun: p.koreksiTurun, u95Naik: p.u95Naik, u95Turun: p.u95Turun,
      ...(num(p.driftNaik) ? { driftNaik: p.driftNaik } : {}), ...(num(p.driftTurun) ? { driftTurun: p.driftTurun } : {}),
    });
  }
  return {
    id: `${asetId}|${parameter}`, pointsId, asetId,
    kode: teks(k.kode), nama: teks(k.nama) || asetId, merk: teks(k.merk), model: teks(k.model), nomorSeri: teks(k.nomorSeri),
    parameter, satuan: teks(k.satuan) || '',
    nomorSertifikat: teks(k.nomorSertifikat), tertelusur: teks(k.tertelusur),
    tanggalKalibrasi: tanggal(k.tanggalKalibrasi), berlakuSampai: tanggal(k.berlakuSampai),
    points: points.sort((a, b) => a.titik - b.titik), budget: k.budget ?? null,
    sumber: teks(k.sumber) || '-', diubahPada: String(k.diubahPada ?? ''), diambilAt,
    ...(k.rekomendasi === true ? { rekomendasi: true } : {}),
  };
}

/** Simpan kiriman server dalam SATU transaksi. Hasil: jumlah template baru & jumlah kalibrator. */
export async function simpanMasterServer(isi: { template?: unknown[]; kalibrator?: unknown[] }): Promise<{ templateBaru: number; kalibrator: number }> {
  const w = new Date().toISOString();
  const tpl = (Array.isArray(isi.template) ? isi.template : []).map(bersihkanTemplate).filter((x): x is TemplateApa => !!x);
  const kal = (Array.isArray(isi.kalibrator) ? isi.kalibrator : []).map((k) => bersihkanKalibrator(k, w)).filter((x): x is KalibratorLokal => !!x);
  return tx(['template', 'kalibrator'], 'readwrite', async (s) => {
    let templateBaru = 0;
    for (const t of tpl) {
      const id = `${t.kode_alat}@${t.versi}`;
      if (await minta(s.template.get(id))) continue;     // isi template tidak pernah berubah
      s.template.put({ id, kodeAlat: t.kode_alat, versi: t.versi, definition: t, diambilAt: w } satisfies TemplateLokal);
      templateBaru++;
    }
    if (Array.isArray(isi.kalibrator)) {                  // daftar kalibrator diganti utuh
      s.kalibrator.clear();
      for (const k of kal) s.kalibrator.put(k);
    }
    return { templateBaru, kalibrator: kal.length };
  });
}

/** Versi tertinggi tiap jenis alat: dari server bila ada; template bawaan kode hanya untuk alat yang belum pernah diterima. */
function pilihTerbaru(lokal: TemplateApa[]): Map<string, TemplateApa> {
  const per = new Map<string, TemplateApa>();
  const ambil = (t: TemplateApa) => { const lama = per.get(t.kode_alat); if (!lama || t.versi > lama.versi) per.set(t.kode_alat, t); };
  lokal.forEach(ambil);
  TEMPLATE_BAWAAN.filter((t) => !lokal.some((l) => l.kode_alat === t.kode_alat)).forEach(ambil);
  return per;
}

/** Template terbaru untuk satu jenis alat. */
export async function templateTerbaru(kodeAlat: string): Promise<TemplateApa | null> {
  const lokal = (await tx(['template'], 'readonly', (s) => minta(s.template.getAll()) as Promise<TemplateLokal[]>)).map((t) => t.definition);
  return pilihTerbaru(lokal).get(kodeAlat) ?? null;
}

/** Semua jenis alat yang punya template (versi tertinggi tiap jenis). */
export async function daftarTemplateTerbaru(): Promise<TemplateApa[]> {
  const lokal = (await tx(['template'], 'readonly', (s) => minta(s.template.getAll()) as Promise<TemplateLokal[]>)).map((t) => t.definition);
  return [...pilihTerbaru(lokal).values()].sort((x, y) => x.nama.localeCompare(y.nama));
}

/** Template versi tertentu (untuk membuka LKK lama). */
export async function templateVersi(kodeAlat: string, versi: number): Promise<TemplateApa | null> {
  const t = (await tx(['template'], 'readonly', (s) => minta(s.template.get(`${kodeAlat}@${versi}`)))) as TemplateLokal | undefined;
  return t?.definition ?? TEMPLATE_BAWAAN.find((x) => x.kode_alat === kodeAlat && x.versi === versi) ?? null;
}

export async function daftarKalibrator(parameter?: string): Promise<KalibratorLokal[]> {
  const semua = await tx(['kalibrator'], 'readonly', (s) => minta(s.kalibrator.getAll()) as Promise<KalibratorLokal[]>);
  return semua.filter((k) => !parameter || k.parameter === parameter).sort((a, b) => (a.kode || a.nama).localeCompare(b.kode || b.nama));
}

export type StatusKalibrator = 'berlaku' | 'expired' | 'belum_bersertifikat';

/**
 * CLAUDE.md 9.4: expired bila tanggal pelaksanaan SESUDAH tanggal berlaku. Tanggal kosong
 * = belum bersertifikat → tidak diblokir. Tanggal pelaksanaan kosong → pakai hari ini.
 */
export function statusKalibrator(k: Pick<KalibratorLokal, 'berlakuSampai'>, tanggalPelaksanaan?: string | null): StatusKalibrator {
  if (!k.berlakuSampai) return 'belum_bersertifikat';
  const hari = tanggal(tanggalPelaksanaan) ?? new Date().toISOString().slice(0, 10);
  return hari > k.berlakuSampai ? 'expired' : 'berlaku';
}

/** "Fotokopi sertifikat" yang dijepret ke LKK saat kalibrator dipilih (CLAUDE.md 9.3). */
export function buatSnapshot(k: KalibratorLokal): Record<string, unknown> {
  const { id: _id, diambilAt: _d, ...isi } = k;
  return JSON.parse(JSON.stringify({ ...isi, dijepretAt: new Date().toISOString() }));
}

export type HasilTarikMaster = { ok: true; templateBaru: number; kalibrator: number } | { ok: false; alasan: string };

/** Tarik master dari server. Gagal tidak melempar galat dan tidak mengubah apa pun di perangkat. */
export async function tarikMaster(ambil: (signal: AbortSignal) => Promise<Response>, batasMs = 15000): Promise<HasilTarikMaster> {
  const kontrol = new AbortController();
  const jam = setTimeout(() => kontrol.abort(), batasMs);
  try {
    const res = await ambil(kontrol.signal);
    if (!res.ok) return { ok: false, alasan: res.status === 401 || res.status === 403 ? 'Akun tidak punya akses data master.' : 'Server sedang sibuk.' };
    const isi = await res.json().catch(() => null);
    if (!isi || !Array.isArray(isi.template) || !Array.isArray(isi.kalibrator)) return { ok: false, alasan: 'Jawaban server tidak dikenali.' };
    return { ok: true, ...(await simpanMasterServer(isi)) };
  } catch (e: any) {
    return { ok: false, alasan: e?.name === 'AbortError' ? 'Server tidak merespons.' : 'Tidak ada sambungan internet.' };
  } finally {
    clearTimeout(jam);
  }
}
