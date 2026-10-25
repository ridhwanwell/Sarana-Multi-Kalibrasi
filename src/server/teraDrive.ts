/**
 * Tera SMK — SALINAN SERTIFIKAT KE GOOGLE DRIVE (CLAUDE.md 3: Drive HANYA salinan cadangan PDF; PRD F9.4).
 *
 * Perumpamaan: setelah sertifikat asli disimpan di lemari arsip, satu fotokopi TANPA kop dikirim ke map Google Drive
 * "SERTIFIKAT PT.SMK" → subfolder "BO – Nama RS". Bila kurir (internet/Google) gagal, ACC tetap sah; fotokopi dikirim
 * ulang otomatis nanti (saat Selia membuka LKK itu, saat QR dibuka, atau lewat tombol "Kirim ulang ke Drive").
 *
 * Sambungan: OAuth akun ridhwanwell@gmail.com, token HANYA di server (env Vercel, tidak pernah di kode/chat):
 *   GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN (aplikasi Google berstatus Production).
 *   Opsional: TERA_DRIVE_FOLDER_ID (bawaan = folder "SERTIFIKAT PT.SMK").
 * Tanpa env ini fitur diam (status "belum tersambung"), tidak ada yang error.
 */
import { supabaseAdmin } from "./supabaseAdmin.js";
import { buatPdfLkk, type SertifikatTercatat } from "./teraPdfSertifikat.js";

const FOLDER_INDUK_BAWAAN = '16Jq1_mHM8AMIa2TF8_bGcKwbPUqBWcM8'; // "SERTIFIKAT PT.SMK" (CLAUDE.md 3)
const JEDA_ULANG_MS = [0, 60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000]; // makin lama tiap gagal (maks 1 jam)

export function driveTersambung(): boolean {
  return !!(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET && process.env.GOOGLE_OAUTH_REFRESH_TOKEN);
}

let tokenCache: { token: string; habis: number } | null = null;
async function tokenAkses(signal: AbortSignal): Promise<string> {
  if (tokenCache && tokenCache.habis > Date.now() + 60_000) return tokenCache.token;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
      refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN || '',
      grant_type: 'refresh_token',
    }).toString(),
  });
  const j: any = await r.json().catch(() => null);
  if (!r.ok || !j?.access_token) {
    // invalid_grant = token dicabut / kedaluwarsa (mis. aplikasi Google masih berstatus Testing)
    throw new Error(j?.error === 'invalid_grant'
      ? 'Izin Google Drive kedaluwarsa atau dicabut. Developer perlu membuat token baru (lihat panduan).'
      : `Google menolak login server (${j?.error || r.status}).`);
  }
  tokenCache = { token: j.access_token, habis: Date.now() + (Number(j.expires_in) || 3000) * 1000 };
  return tokenCache.token;
}

const kutip = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

async function google(url: string, init: RequestInit, signal: AbortSignal): Promise<any> {
  const token = await tokenAkses(signal);
  const r = await fetch(url, { ...init, signal, headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` } });
  const j: any = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`Google Drive menolak (${r.status}): ${j?.error?.message || 'tanpa keterangan'}`);
  return j;
}

/** Cari subfolder dengan nama persis di bawah induk; bila belum ada, buat. */
async function folderRs(nama: string, induk: string, signal: AbortSignal): Promise<string> {
  const q = `name = '${kutip(nama)}' and '${kutip(induk)}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const cari = await google(`https://www.googleapis.com/drive/v3/files?${new URLSearchParams({ q, fields: 'files(id,name)', pageSize: '5', supportsAllDrives: 'true', includeItemsFromAllDrives: 'true' })}`, { method: 'GET' }, signal);
  const ada = cari?.files?.[0]?.id;
  if (ada) return ada;
  const buat = await google('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: nama, mimeType: 'application/vnd.google-apps.folder', parents: [induk] }),
  }, signal);
  if (!buat?.id) throw new Error('Folder Drive tidak bisa dibuat.');
  return buat.id;
}

async function unggahPdf(nama: string, pdf: Uint8Array, folder: string, signal: AbortSignal): Promise<string> {
  const batas = `tera${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  const meta = JSON.stringify({ name: nama, parents: [folder], mimeType: 'application/pdf' });
  const awal = Buffer.from(`--${batas}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${batas}\r\nContent-Type: application/pdf\r\n\r\n`, 'utf8');
  const akhir = Buffer.from(`\r\n--${batas}--`, 'utf8');
  const body = Buffer.concat([awal, Buffer.from(pdf), akhir]);
  const j = await google('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id', {
    method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${batas}` }, body,
  }, signal);
  if (!j?.id) throw new Error('Google Drive tidak mengembalikan id file.');
  return j.id;
}

export interface SertDrive extends SertifikatTercatat {
  bo?: string; drive_file_id?: string | null; drive_status?: string | null; drive_dicoba_at?: string | null; drive_percobaan?: number | null;
}

/** Boleh dicoba sekarang? (sudah terkirim → tidak; gagal → tunggu jeda yang makin lama) */
export function waktunyaCobaDrive(s: SertDrive, paksa = false): boolean {
  if (!driveTersambung() || s.drive_status === 'terkirim' || s.drive_file_id) return false;
  if (paksa || !s.drive_dicoba_at) return true;
  const n = Math.min(Number(s.drive_percobaan) || 0, JEDA_ULANG_MS.length - 1);
  return Date.now() - new Date(s.drive_dicoba_at).getTime() >= JEDA_ULANG_MS[n];
}

/**
 * Kirim salinan TANPA kop satu sertifikat ke Drive. Tidak pernah melempar galat: hasil & pesan dicatat di tera_sertifikat
 * dan log server. Mengembalikan status akhir.
 */
export async function kirimKeDrive(s: SertDrive, signal: AbortSignal): Promise<{ status: 'terkirim' | 'gagal' | 'belum_tersambung'; pesan?: string }> {
  if (!driveTersambung()) return { status: 'belum_tersambung' };
  const catat = async (isi: Record<string, unknown>) => {
    const { error } = await supabaseAdmin.from('tera_sertifikat').update(isi).eq('kode_verifikasi', s.kode_verifikasi);
    if (error) console.error('[Tera/Drive] catat:', error.message);
  };
  try {
    const { data: l } = await supabaseAdmin.from('tera_lkk').select('bo, jadwal_id').eq('id', s.lkk_id).maybeSingle().abortSignal(signal);
    const { data: j } = (l as any)?.jadwal_id
      ? await supabaseAdmin.from('tera_jadwal_push').select('nama_rs').eq('jadwal_id', (l as any).jadwal_id).maybeSingle().abortSignal(signal)
      : { data: null };
    const bo = String((l as any)?.bo ?? s.bo ?? '').trim() || '-';
    const namaRs = String((j as any)?.nama_rs ?? '').trim() || 'Tanpa nama RS';
    const { pdf } = await buatPdfLkk(s.lkk_id, { denganKop: false, sert: s, signal });
    const induk = process.env.TERA_DRIVE_FOLDER_ID || FOLDER_INDUK_BAWAAN;
    const folder = await folderRs(`${bo} – ${namaRs}`.slice(0, 200), induk, signal);
    const nama = `Sertifikat-${s.no_label.replace(/[^0-9.]/g, '')}${s.revisi > 0 ? `-rev${s.revisi}` : ''}.pdf`;
    const id = await unggahPdf(nama, pdf, folder, signal);
    await catat({ drive_file_id: id, drive_status: 'terkirim', drive_pesan: null, drive_dicoba_at: new Date().toISOString(), drive_percobaan: (Number(s.drive_percobaan) || 0) + 1 });
    return { status: 'terkirim' };
  } catch (e: any) {
    const pesan = String(e?.name === 'AbortError' ? 'Batas waktu habis saat mengirim ke Google Drive.' : (e?.message || 'Gagal mengirim ke Google Drive.')).slice(0, 500);
    console.error('[Tera/Drive] gagal:', s.no_label, pesan);
    await catat({ drive_status: 'gagal', drive_pesan: pesan, drive_dicoba_at: new Date().toISOString(), drive_percobaan: (Number(s.drive_percobaan) || 0) + 1 });
    return { status: 'gagal', pesan };
  }
}
