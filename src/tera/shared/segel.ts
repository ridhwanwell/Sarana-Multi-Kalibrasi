/**
 * SEGEL PAKET LKK — dipakai BERSAMA oleh perangkat teknisi (browser) dan server (Node).
 *
 * Perumpamaan: paket tercatat. Perangkat menghitung "segel" (SHA-256) dari isi LKK,
 * server menghitung ulang dari isi yang ia terima. Sama = paket utuh. Beda = ditolak,
 * perangkat tetap 🟡 dan mencoba lagi. Hijau 🟢 hanya bila tanda terima server
 * memuat segel & jumlah titik ukur yang SAMA dengan milik perangkat.
 *
 * Aturan (JANGAN diubah tanpa menaikkan VERSI_SEGEL, karena perangkat & server harus sama):
 *  - Isi disusun sebagai JSON kanonik: kunci objek diurutkan abjad di semua tingkat,
 *    nilai `undefined` dibuang, urutan array dipertahankan.
 *  - Angka harus terbatas (bukan NaN/Infinity) — kalau ada, paket dianggap rusak.
 *  - Jumlah titik ukur = banyaknya baris di `data.titik_ukur` (diisi mesin template Tahap 4).
 *
 * Tanpa pustaka tambahan: memakai Web Crypto (`crypto.subtle`) yang tersedia di browser
 * modern & Node 18+.
 */

export const VERSI_SEGEL = 1;

/** Isi satu LKK yang dikirim utuh (Selesai). */
export interface PaketLkk {
  id: string;                         // UUID dibuat di perangkat
  bo: string;                         // 3 angka
  noLabel: string;                    // BBB.NNNN
  templateKode: string;
  templateVersi: number;
  tanggalKalibrasi: string | null;    // YYYY-MM-DD
  alatTambahan: boolean;
  poItemRef: string | null;
  jadwalId: string | null;
  data: Record<string, unknown>;
  results: Record<string, unknown> | null;
  calibratorSnapshot: Record<string, unknown> | null;
  clientVersion: number;              // naik setiap teknisi mengirim versi baru (revisi)
}

/** Isi cadangan draft (belum Selesai). */
export interface PaketDraft {
  id: string;
  bo: string | null;
  noLabel: string | null;
  templateKode: string | null;
  data: Record<string, unknown>;
  clientVersion: number;              // naik setiap auto-save
}

export class SegelError extends Error {}

/** JSON kanonik: kunci urut abjad, undefined dibuang, angka wajib terbatas. */
export function jsonKanonik(nilai: unknown): string {
  return JSON.stringify(rapikan(nilai, 0));
}

function rapikan(v: unknown, kedalaman: number): unknown {
  if (kedalaman > 32) throw new SegelError('Isi LKK terlalu dalam bersarang.');
  if (v === null) return null;
  switch (typeof v) {
    case 'number':
      if (!Number.isFinite(v)) throw new SegelError('Ada angka tidak sah (NaN/Infinity) di isi LKK.');
      return Object.is(v, -0) ? 0 : v;
    case 'string':
    case 'boolean':
      return v;
    case 'object': {
      if (Array.isArray(v)) return v.map((x) => (x === undefined ? null : rapikan(x, kedalaman + 1)));
      const hasil: Record<string, unknown> = {};
      for (const k of Object.keys(v as object).sort()) {
        const isi = (v as Record<string, unknown>)[k];
        if (isi !== undefined) hasil[k] = rapikan(isi, kedalaman + 1);
      }
      return hasil;
    }
    default:
      // undefined di tingkat atas, function, symbol, bigint
      throw new SegelError(`Tipe data tidak didukung di isi LKK: ${typeof v}`);
  }
}

/**
 * Banyaknya titik ukur di isian: baris `data.titik_ukur` (bentuk lama) + SETIAP bacaan angka di
 * `data.kinerja[id][titik][naik|turun][urutan]` (bentuk template). Server memakai fungsi yang sama,
 * jadi LKK yang terkirim setengah (bacaan hilang) tidak akan lolos jadi 🟢.
 */
export function hitungJumlahTitik(data: unknown): number {
  const d = data as { titik_ukur?: unknown; kinerja?: unknown } | null;
  let n = Array.isArray(d?.titik_ukur) ? d!.titik_ukur.length : 0;
  const kin = d?.kinerja;
  if (kin && typeof kin === 'object') {
    for (const per of Object.values(kin as Record<string, unknown>)) {
      if (!per || typeof per !== 'object') continue;
      for (const baris of Object.values(per as Record<string, unknown>)) {
        if (!baris || typeof baris !== 'object') continue;
        for (const arah of ['naik', 'turun'] as const) {
          const run = (baris as Record<string, unknown>)[arah];
          if (Array.isArray(run)) n += run.filter((x) => typeof x === 'number' && Number.isFinite(x)).length;
        }
      }
    }
  }
  return n;
}

async function sha256Hex(teks: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new SegelError('Perangkat tidak mendukung Web Crypto (perbarui browser).');
  const buf = await subtle.digest('SHA-256', new TextEncoder().encode(teks));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Bagian paket yang disegel — urutan/nama dikunci oleh VERSI_SEGEL. */
function isiSegelLkk(p: PaketLkk) {
  return {
    v: VERSI_SEGEL,
    jenis: 'lkk',
    id: p.id,
    bo: p.bo,
    noLabel: p.noLabel,
    templateKode: p.templateKode,
    templateVersi: p.templateVersi,
    tanggalKalibrasi: p.tanggalKalibrasi,
    alatTambahan: p.alatTambahan,
    poItemRef: p.poItemRef,
    jadwalId: p.jadwalId,
    data: p.data,
    results: p.results,
    calibratorSnapshot: p.calibratorSnapshot,
    clientVersion: p.clientVersion,
  };
}

function isiSegelDraft(p: PaketDraft) {
  return {
    v: VERSI_SEGEL,
    jenis: 'draft',
    id: p.id,
    bo: p.bo,
    noLabel: p.noLabel,
    templateKode: p.templateKode,
    data: p.data,
    clientVersion: p.clientVersion,
  };
}

export async function segelLkk(p: PaketLkk): Promise<{ checksum: string; jumlahTitik: number }> {
  return { checksum: await sha256Hex(jsonKanonik(isiSegelLkk(p))), jumlahTitik: hitungJumlahTitik(p.data) };
}

export async function segelDraft(p: PaketDraft): Promise<{ checksum: string }> {
  return { checksum: await sha256Hex(jsonKanonik(isiSegelDraft(p))) };
}

// ---------------------------------------------------------------------------
// Tanda terima dari server
// ---------------------------------------------------------------------------

export type HasilTerima =
  | 'diterima'
  | 'sudah_diterima'
  | 'ditolak_terkunci'
  | 'ditolak_versi_lama'
  | 'ditolak_label_ganda'
  | 'ditolak_segel';

export interface TandaTerima {
  hasil: HasilTerima;
  checksum?: string;
  jumlahTitik?: number;
  clientVersion?: number;
  status?: string;
  alasan?: string;
}

/**
 * Boleh 🟢? Hanya bila server bilang diterima/sudah_diterima DAN segel, jumlah titik,
 * serta versi di tanda terima SAMA dengan milik perangkat.
 */
export function bolehHijau(
  t: TandaTerima | null | undefined,
  milikPerangkat: { checksum: string; jumlahTitik: number; clientVersion: number }
): boolean {
  if (!t) return false;
  if (t.hasil !== 'diterima' && t.hasil !== 'sudah_diterima') return false;
  return (
    t.checksum === milikPerangkat.checksum &&
    t.jumlahTitik === milikPerangkat.jumlahTitik &&
    t.clientVersion === milikPerangkat.clientVersion
  );
}

// ---------------------------------------------------------------------------
// Pola isian bersama
// ---------------------------------------------------------------------------
export const POLA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const POLA_BO = /^[0-9]{3}$/;
export const POLA_LABEL = /^[0-9]{3}\.[0-9]{4}$/;
export const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;
export const POLA_CHECKSUM = /^[0-9a-f]{64}$/;
/** BO khusus uji — selalu dianggap data uji (CLAUDE.md 4.7). */
export const BO_UJI = '999';
