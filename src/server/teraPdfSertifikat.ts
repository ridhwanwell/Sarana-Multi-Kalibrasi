/**
 * Tera SMK — PEMBUAT PDF SERTIFIKAT (dipakai bersama: pratinjau Selia, simpan saat ACC, halaman scan QR publik).
 *
 * Perumpamaan: satu mesin cetak di kantor. Kertas dasar = kop resmi (PDF di bucket privat `tera-assets/kop`, ditempel
 * apa adanya); isi dicetak dengan Carlito. Setelah ACC, satu lembar "asli" dicetak lalu disimpan di lemari arsip
 * (`tera-assets/sertifikat/...`) — scan QR stiker selalu mengambil lembar asli itu, bukan mencetak ulang.
 *
 * Aturan:
 *  - Sebelum ACC: tanggal terbit = hari ini, QR TTE = CONTOH.
 *  - Sesudah ACC: tanggal terbit = tanggal ACC, penandatangan = yang DIBEKUKAN di tera_sertifikat, QR = kode verifikasi.
 *  - PDF dengan kop hanya untuk Selia & QR; versi tanpa kop untuk Google Drive & komputer (isi sama persis).
 */
import QRCode from 'qrcode';
import { supabaseAdmin } from "./supabaseAdmin.js";
import { renderSertifikatPdf, type BahanPdf, type Tte } from "../tera/pdf/renderSertifikat.js";
import { TATA_LETAK_SPHYGMOMANOMETER } from "../tera/pdf/tataLetakSphygmo.js";
import { isianSphygmomanometer } from "../tera/pdf/formatSertifikat.js";

export const BUCKET_TERA = 'tera-assets';
const BASE_FONT = 'https://saranamultikalibrasi.com/tera/fonts';
export const URL_VERIFIKASI = 'https://saranamultikalibrasi.com/verifikasi';

/** Galat dengan pesan bahasa awam + kode HTTP yang pantas. */
export class GalatPdf extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Matriks QR (true = gelap) dari alamat; digambar sebagai kotak vektor di PDF. */
function matriksQr(url: string): boolean[][] {
  const q: any = (QRCode as any).create(url, { errorCorrectionLevel: 'M' });
  const n: number = q.modules.size;
  const ambil = (r: number, c: number) => (typeof q.modules.get === 'function' ? !!q.modules.get(r, c) : !!q.modules.data[r * n + c]);
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => ambil(r, c)));
}

let fontCache: { r: Uint8Array; b: Uint8Array; i: Uint8Array } | null = null;
async function ambilFont(sinyal: AbortSignal) {
  if (fontCache) return fontCache;
  const muat = async (nama: string) => {
    const r = await fetch(`${BASE_FONT}/${nama}`, { signal: sinyal });
    if (!r.ok) throw new Error(`font ${nama} HTTP ${r.status}`);
    const b = new Uint8Array(await r.arrayBuffer());
    if (b.byteLength < 10_000) throw new Error(`font ${nama} terlalu kecil`);
    return b;
  };
  const [r, b, i] = await Promise.all([muat('Carlito-Regular.ttf'), muat('Carlito-Bold.ttf'), muat('Carlito-Italic.ttf')]);
  fontCache = { r, b, i };
  return fontCache;
}

const tanggalJakarta = (d: Date | string) => new Date(new Date(d).getTime() + 7 * 3600_000).toISOString().slice(0, 10);

export interface SertifikatTercatat {
  kode_verifikasi: string; revisi: number; status: string; lkk_id: string; no_label: string;
  signatory_nama: string; signatory_jabatan: string; ditandatangani_at: string; pdf_path: string | null;
}

/**
 * Buat PDF sertifikat untuk satu LKK.
 * `sert` = baris tera_sertifikat (sesudah ACC) → TTE asli, tanggal & penandatangan beku. null → pratinjau (TTE CONTOH).
 */
export async function buatPdfLkk(id: string, opsi: { denganKop: boolean; sert: SertifikatTercatat | null; signal: AbortSignal }): Promise<{ pdf: Uint8Array; nama: string; noLabel: string }> {
  const { signal } = opsi;
  const { data: r, error } = await supabaseAdmin.from('tera_lkk').select('*').eq('id', id).maybeSingle().abortSignal(signal);
  if (error) throw new Error(`lkk: ${error.message}`);
  if (!r) throw new GalatPdf(404, 'LKK tidak ditemukan.');
  if (r.template_kode !== 'sphygmomanometer') throw new GalatPdf(422, 'PDF untuk alat ini belum tersedia.');

  const [push, prof, tpl, ttd] = await Promise.all([
    r.jadwal_id ? supabaseAdmin.from('tera_jadwal_push').select('nama_rs, kota').eq('jadwal_id', r.jadwal_id).maybeSingle().abortSignal(signal) : Promise.resolve({ data: null, error: null }),
    supabaseAdmin.from('profiles').select('full_name').eq('id', r.teknisi_user_id).maybeSingle().abortSignal(signal),
    supabaseAdmin.from('tera_device_templates').select('nama, definition').eq('kode_alat', r.template_kode).eq('versi', r.template_versi).maybeSingle().abortSignal(signal),
    supabaseAdmin.from('tera_signatories').select('nama, jabatan, jabatan_en').eq('kode', 'manajer_teknik').eq('aktif', true).maybeSingle().abortSignal(signal),
  ]);
  if (push.error || prof.error || tpl.error || ttd.error) throw new Error(`pelengkap: ${push.error?.message ?? prof.error?.message ?? tpl.error?.message ?? ttd.error?.message}`);
  const namaRs = (push.data as any)?.nama_rs ?? '';
  const rs = namaRs
    ? await supabaseAdmin.from('rumah_sakit').select('alamat, kota').eq('nama_rs', namaRs).is('deleted_at', null).limit(1).abortSignal(signal)
    : { data: [], error: null };
  const alamat = [(rs.data as any)?.[0]?.alamat, (rs.data as any)?.[0]?.kota ?? (push.data as any)?.kota].filter(Boolean).join(', ');

  let kopBytes: Uint8Array | null = null;
  if (opsi.denganKop) {
    const kop = await supabaseAdmin.storage.from(BUCKET_TERA).download('kop/KOP_SERTIF_NON_KAN.pdf'); // Sphygmomanometer = Non-KAN (CLAUDE.md 9.5)
    if (kop.error || !kop.data) {
      console.error('[Tera/PDF] kop:', kop.error?.message);
      throw new GalatPdf(503, 'File kop sertifikat belum ada di penyimpanan (tera-assets/kop). Hubungi Developer.');
    }
    kopBytes = new Uint8Array(await kop.data.arrayBuffer());
  }
  const font = await ambilFont(signal);
  const bahan: BahanPdf = { fontR: font.r, fontB: font.b, fontI: font.i, kop: kopBytes };

  // Penandatangan: sesudah ACC memakai nama & jabatan yang dibekukan; sebelum ACC dari data master.
  const m = (ttd.data as any) ?? {};
  const s = opsi.sert;
  const penandatangan = {
    nama: s?.signatory_nama ?? m.nama ?? 'Hafizh Pasifianto Utomo, S.Tr.T.',
    jabatan: s?.signatory_jabatan ?? m.jabatan ?? 'Manajer Teknik',
    jabatanEn: m.jabatan_en ?? 'Technical Manager',
  };

  const def = (tpl.data as any)?.definition ?? {};
  const kin = (def.kinerja ?? []).find((k: any) => k.id === 'tekanan') ?? {};
  const uji = (def.ujiAmbang ?? []) as any[];
  const isian = isianSphygmomanometer(
    { data: r.data, jejak: r.results, snapshot: r.calibrator_snapshot },
    {
      bo: r.bo, noLabel: r.no_label, namaAlat: (tpl.data as any)?.nama ?? 'Sphygmomanometer', namaRs, alamatRs: alamat,
      teknisi: (prof.data as any)?.full_name ?? '', tanggalKalibrasi: r.tanggal_kalibrasi,
      tanggalTerbit: tanggalJakarta(s ? s.ditandatangani_at : new Date()), penandatangan,
    },
    { toleransiTekanan: Number(kin.toleransi) || 0, ambangBocor: Number(uji.find((u) => u.id === 'bocor')?.batas) || 0, ambangLaju: Number(uji.find((u) => u.id === 'lajuBuang')?.batas) || 0 },
  );
  const tte: Tte = s
    ? { kotak: matriksQr(`${URL_VERIFIKASI}/${s.kode_verifikasi}`), contoh: false }
    : { kotak: matriksQr(`${URL_VERIFIKASI}/CONTOH`), contoh: true };
  const pdf = await renderSertifikatPdf(TATA_LETAK_SPHYGMOMANOMETER, isian, bahan, tte);
  const noLabel = String(r.no_label);
  const nama = `Sertifikat-${noLabel.replace(/[^0-9.]/g, '')}${s && s.revisi > 0 ? `-rev${s.revisi}` : ''}${opsi.denganKop ? '' : '-tanpa-kop'}`;
  return { pdf, nama, noLabel };
}

const KOLOM_SERT = 'kode_verifikasi, revisi, status, lkk_id, bo, no_label, signatory_nama, signatory_jabatan, ditandatangani_at, pdf_path, drive_file_id, drive_status, drive_dicoba_at, drive_percobaan';

export async function sertifikatDariKode(kode: string, signal: AbortSignal): Promise<SertifikatTercatat | null> {
  const { data, error } = await supabaseAdmin.from('tera_sertifikat').select(KOLOM_SERT).eq('kode_verifikasi', kode).maybeSingle().abortSignal(signal);
  if (error) throw new Error(`sertifikat: ${error.message}`);
  return (data as any) ?? null;
}

export async function sertifikatBerlakuLkk(lkkId: string, signal: AbortSignal): Promise<SertifikatTercatat | null> {
  const { data, error } = await supabaseAdmin.from('tera_sertifikat').select(KOLOM_SERT).eq('lkk_id', lkkId).eq('status', 'berlaku')
    .order('revisi', { ascending: false }).limit(1).abortSignal(signal);
  if (error) throw new Error(`sertifikat: ${error.message}`);
  return ((data as any[]) ?? [])[0] ?? null;
}

/**
 * Cetak lembar ASLI (dengan kop) satu sertifikat lalu simpan ke lemari arsip. Bila sudah tersimpan, tidak dicetak ulang.
 * Mengembalikan isi PDF. Dipanggil saat ACC dan (cadangan) saat QR dibuka tetapi file belum ada (mis. kop baru diunggah).
 */
export async function pdfAsliSertifikat(sert: SertifikatTercatat, signal: AbortSignal): Promise<{ pdf: Uint8Array; nama: string }> {
  const namaFile = `Sertifikat-${sert.no_label.replace(/[^0-9.]/g, '')}${sert.revisi > 0 ? `-rev${sert.revisi}` : ''}`;
  if (sert.pdf_path) {
    const ada = await supabaseAdmin.storage.from(BUCKET_TERA).download(sert.pdf_path);
    if (!ada.error && ada.data) return { pdf: new Uint8Array(await ada.data.arrayBuffer()), nama: namaFile };
    console.error('[Tera/PDF] arsip hilang, dicetak ulang:', sert.pdf_path, ada.error?.message);
  }
  const { pdf } = await buatPdfLkk(sert.lkk_id, { denganKop: true, sert, signal });
  const path = `sertifikat/${sert.lkk_id}/rev-${sert.revisi}-${sert.kode_verifikasi}.pdf`;
  const up = await supabaseAdmin.storage.from(BUCKET_TERA).upload(path, pdf, { contentType: 'application/pdf', upsert: true });
  if (up.error) {
    console.error('[Tera/PDF] simpan arsip:', up.error.message);
    return { pdf, nama: namaFile }; // tetap tampil; disimpan lagi pada kesempatan berikutnya
  }
  const { error } = await supabaseAdmin.from('tera_sertifikat').update({ pdf_path: path, pdf_dibuat_at: new Date().toISOString() })
    .eq('kode_verifikasi', sert.kode_verifikasi).abortSignal(signal);
  if (error) console.error('[Tera/PDF] catat arsip:', error.message);
  return { pdf, nama: namaFile };
}
