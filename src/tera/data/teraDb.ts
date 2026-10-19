/**
 * BUKU LKK DI PERANGKAT — IndexedDB `tera_smk` (Tahap 2.3, PRD F4 · CLAUDE.md 5)
 *
 * Perumpamaan: buku LKK yang dibawa teknisi ke lapangan. Setiap isian langsung tertulis
 * (auto-save). Halaman yang sudah "Selesai" difotokopi ke laci ANTREAN KIRIM (outbox).
 * Halaman TIDAK PERNAH dirobek dari buku — modul ini memang tidak menyediakan fungsi hapus LKK.
 *
 * Ditulis langsung di atas IndexedDB (tanpa pustaka) supaya bisa diuji di Chromium dan tidak
 * menambah paket. Satu transaksi = utuh atau tidak sama sekali.
 *
 * Laci:
 *  - lkk        : semua LKK milik akun yang login (draft & sudah selesai)
 *  - outbox     : antrean kirim, 1 baris = 1 LKK utuh (kunci = lkkId)
 *  - meta       : catatan kecil (pemilik buku, waktu tarik data terakhir, dst.)
 *  - jadwal, template, kalibrator : disiapkan sekarang, diisi Tahap 3–4
 */
import { segelLkk, segelDraft, BO_UJI, type PaketLkk, type PaketDraft } from '../shared/segel';

export const NAMA_DB = 'tera_smk';
export const VERSI_DB = 1;

/** draft = sedang diisi · tersimpan = 🟡 · mengirim = 🔵 · diterima = 🟢 · ditolak = merah (perlu perbaikan) */
export type SyncState = 'draft' | 'tersimpan' | 'mengirim' | 'diterima' | 'ditolak';

export interface LkkLokal {
  id: string;
  pemilik: string;                    // user id akun yang membuat
  bo: string | null;
  noLabel: string | null;
  templateKode: string | null;
  templateVersi: number | null;
  tanggalKalibrasi: string | null;
  alatTambahan: boolean;
  poItemRef: string | null;
  jadwalId: string | null;
  data: Record<string, unknown>;
  results: Record<string, unknown> | null;
  calibratorSnapshot: Record<string, unknown> | null;
  isTest: boolean;

  syncState: SyncState;
  statusServer: string | null;        // submitted / returned / approved / ... (dari server)
  clientVersion: number;              // versi kiriman "Selesai" (0 = belum pernah)
  checksum: string | null;            // segel versi kiriman terakhir
  jumlahTitik: number | null;
  alasanDitolak: string | null;

  draftVersion: number;               // naik setiap auto-save
  draftBackedUpVersion: number;       // versi draft yang sudah tercadang di server
  draftBackupAt: string | null;

  dibuatAt: string;
  diubahAt: string;
  diterimaAt: string | null;
}

export interface OutboxItem {
  lkkId: string;
  clientVersion: number;
  percobaan: number;
  berikutnyaAt: number;               // ms epoch: kapan boleh dicoba lagi
  berhenti: boolean;                  // true = ditolak server, tunggu perbaikan teknisi
  errorTerakhir: string | null;
  dibuatAt: string;
}

export class TeraDbError extends Error {}

// ---------------------------------------------------------------------------
// Buka buku
// ---------------------------------------------------------------------------
let dbJanji: Promise<IDBDatabase> | null = null;

export function bukaDb(): Promise<IDBDatabase> {
  if (dbJanji) return dbJanji;
  dbJanji = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new TeraDbError('Perangkat tidak mendukung penyimpanan offline (IndexedDB).'));
      return;
    }
    const req = indexedDB.open(NAMA_DB, VERSI_DB);
    req.onupgradeneeded = () => {
      const db = req.result;
      // Hanya MENAMBAH laci. Naik versi nanti tidak boleh menghapus laci berisi LKK.
      if (!db.objectStoreNames.contains('lkk')) {
        const s = db.createObjectStore('lkk', { keyPath: 'id' });
        s.createIndex('pemilik', 'pemilik');
        s.createIndex('syncState', 'syncState');
      }
      if (!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox', { keyPath: 'lkkId' });
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'kunci' });
      for (const nama of ['jadwal', 'template', 'kalibrator']) {
        if (!db.objectStoreNames.contains(nama)) db.createObjectStore(nama, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      // Versi aplikasi baru di tab lain: tutup sambungan lama supaya upgrade tidak macet (data tetap)
      db.onversionchange = () => { db.close(); dbJanji = null; };
      resolve(db);
    };
    req.onerror = () => { dbJanji = null; reject(new TeraDbError(pesanIdb(req.error))); };
    req.onblocked = () => { /* tab lama masih terbuka; onsuccess menyusul setelah ditutup */ };
  });
  return dbJanji;
}

function pesanIdb(e: DOMException | null | undefined): string {
  if (e?.name === 'QuotaExceededError') {
    return 'Memori perangkat penuh. Hapus foto/video yang tidak perlu — data LKK yang sudah ada tetap aman.';
  }
  return e?.message || 'Penyimpanan perangkat gagal.';
}

/** Jalankan satu transaksi; selesai hanya bila SEMUA perubahan tertulis. */
async function tx<T>(
  laci: string[],
  mode: IDBTransactionMode,
  kerja: (stores: Record<string, IDBObjectStore>) => T | Promise<T>
): Promise<T> {
  const db = await bukaDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(laci, mode, { durability: 'strict' } as IDBTransactionOptions);
    const stores: Record<string, IDBObjectStore> = {};
    for (const n of laci) stores[n] = t.objectStore(n);
    let hasil: T;
    // Galat dari isi kerja (termasuk memori penuh yang langsung terlempar) dibuat berpesan jelas
    const gagal = (e: any) => {
      try { t.abort(); } catch { /* sudah selesai */ }
      reject(e?.name === 'QuotaExceededError' ? new TeraDbError(pesanIdb(e)) : e);
    };
    try { Promise.resolve(kerja(stores)).then((h) => { hasil = h; }, gagal); } catch (e) { gagal(e); }
    t.oncomplete = () => resolve(hasil);
    t.onabort = () => reject(new TeraDbError(pesanIdb(t.error)));
    t.onerror = () => { /* ditangani onabort */ };
  });
}

const minta = <T>(r: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });

const sekarang = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Pemilik buku: data satu akun tidak tercampur dengan akun lain di perangkat yang sama
// ---------------------------------------------------------------------------
export async function bacaMeta<T = unknown>(kunci: string): Promise<T | undefined> {
  return tx(['meta'], 'readonly', async (s) => (await minta(s.meta.get(kunci)))?.nilai as T | undefined);
}
export async function tulisMeta(kunci: string, nilai: unknown): Promise<void> {
  await tx(['meta'], 'readwrite', (s) => { s.meta.put({ kunci, nilai }); });
}

// ---------------------------------------------------------------------------
// LKK
// ---------------------------------------------------------------------------
export interface LkkBaru {
  pemilik: string;
  bo?: string | null;
  noLabel?: string | null;
  templateKode?: string | null;
  templateVersi?: number | null;
  tanggalKalibrasi?: string | null;
  alatTambahan?: boolean;
  poItemRef?: string | null;
  jadwalId?: string | null;
  data?: Record<string, unknown>;
}

/** LKK baru langsung tertulis di buku (🟡/draft) dengan UUID dari perangkat (F4.3). */
export async function buatLkk(isi: LkkBaru): Promise<LkkLokal> {
  const w = sekarang();
  const lkk: LkkLokal = {
    id: crypto.randomUUID(),
    pemilik: isi.pemilik,
    bo: isi.bo ?? null,
    noLabel: isi.noLabel ?? null,
    templateKode: isi.templateKode ?? null,
    templateVersi: isi.templateVersi ?? null,
    tanggalKalibrasi: isi.tanggalKalibrasi ?? null,
    alatTambahan: isi.alatTambahan ?? false,
    poItemRef: isi.poItemRef ?? null,
    jadwalId: isi.jadwalId ?? null,
    data: isi.data ?? {},
    results: null,
    calibratorSnapshot: null,
    isTest: isi.bo === BO_UJI,
    syncState: 'draft',
    statusServer: null,
    clientVersion: 0,
    checksum: null,
    jumlahTitik: null,
    alasanDitolak: null,
    draftVersion: 1,
    draftBackedUpVersion: 0,
    draftBackupAt: null,
    dibuatAt: w,
    diubahAt: w,
    diterimaAt: null,
  };
  await tx(['lkk'], 'readwrite', (s) => { s.lkk.add(lkk); });
  return lkk;
}

export async function ambilLkk(id: string): Promise<LkkLokal | undefined> {
  return tx(['lkk'], 'readonly', (s) => minta(s.lkk.get(id)) as Promise<LkkLokal | undefined>);
}

export async function daftarLkk(pemilik: string): Promise<LkkLokal[]> {
  const semua = await tx(['lkk'], 'readonly', (s) =>
    minta(s.lkk.index('pemilik').getAll(IDBKeyRange.only(pemilik))) as Promise<LkkLokal[]>);
  return semua.sort((a, b) => b.diubahAt.localeCompare(a.diubahAt));
}

/** Boleh diubah teknisi? Draft, ditolak (perbaiki), atau dikembalikan Penyelia. */
export function bolehDiubah(l: LkkLokal): boolean {
  if (l.syncState === 'draft' || l.syncState === 'ditolak') return true;
  return l.syncState === 'diterima' && l.statusServer === 'returned';
}

export type UbahanLkk = Partial<Pick<LkkLokal,
  'bo' | 'noLabel' | 'templateKode' | 'templateVersi' | 'tanggalKalibrasi' | 'alatTambahan'
  | 'poItemRef' | 'jadwalId' | 'data' | 'results' | 'calibratorSnapshot'>>;

/**
 * AUTO-SAVE: simpan isian SEKARANG (F3.6). Versi draft naik → ikut dicadangkan ke server.
 * Mengubah LKK yang ditolak / dikembalikan membuatnya kembali menjadi draft.
 */
export async function simpanIsian(id: string, ubahan: UbahanLkk): Promise<LkkLokal> {
  return tx(['lkk', 'outbox'], 'readwrite', async (s) => {
    const l = (await minta(s.lkk.get(id))) as LkkLokal | undefined;
    if (!l) throw new TeraDbError('LKK tidak ditemukan di perangkat.');
    if (!bolehDiubah(l)) throw new TeraDbError('LKK sudah dikirim dan tidak bisa diubah lagi.');
    const baru: LkkLokal = { ...l, ...ubahan };
    if ('bo' in ubahan) baru.isTest = ubahan.bo === BO_UJI;
    if (l.syncState !== 'draft') {
      // ditolak / dikembalikan → kembali ke draft; antrean lama yang berhenti dibuang (versi baru akan dikirim)
      baru.syncState = 'draft';
      baru.alasanDitolak = null;
      s.outbox.delete(id);
    }
    baru.draftVersion = l.draftVersion + 1;
    baru.diubahAt = sekarang();
    s.lkk.put(baru);
    return baru;
  });
}

/** Data minimal agar paket boleh disegel & dikirim. */
export function kekuranganUntukKirim(l: LkkLokal): string[] {
  const kurang: string[] = [];
  if (!l.bo || !/^[0-9]{3}$/.test(l.bo)) kurang.push('Nomor BO');
  if (!l.noLabel || !/^[0-9]{3}\.[0-9]{4}$/.test(l.noLabel)) kurang.push('Nomor stiker (BBB.NNNN)');
  else if (l.bo && l.noLabel.slice(0, 3) !== l.bo) kurang.push('Nomor stiker tidak sesuai BO');
  if (!l.templateKode) kurang.push('Jenis alat (template)');
  if (!l.templateVersi) kurang.push('Versi template');
  return kurang;
}

export function paketDari(l: LkkLokal, clientVersion: number): PaketLkk {
  return {
    id: l.id,
    bo: l.bo as string,
    noLabel: l.noLabel as string,
    templateKode: l.templateKode as string,
    templateVersi: l.templateVersi as number,
    tanggalKalibrasi: l.tanggalKalibrasi,
    alatTambahan: l.alatTambahan,
    poItemRef: l.poItemRef,
    jadwalId: l.jadwalId,
    data: l.data,
    results: l.results,
    calibratorSnapshot: l.calibratorSnapshot,
    clientVersion,
  };
}

export function paketDraftDari(l: LkkLokal): PaketDraft {
  return { id: l.id, bo: l.bo, noLabel: l.noLabel, templateKode: l.templateKode, data: l.data, clientVersion: l.draftVersion };
}

/** Nomor stiker sudah dipakai LKK lain di perangkat ini? (F3.3) */
export async function labelSudahDipakai(pemilik: string, noLabel: string, kecualiId?: string): Promise<boolean> {
  const semua = await daftarLkk(pemilik);
  return semua.some((l) => l.noLabel === noLabel && l.id !== kecualiId);
}

/**
 * "SELESAI": segel paket lalu taruh di antrean kirim — dalam SATU transaksi (🟡).
 * Segel dihitung di luar transaksi (Web Crypto bersifat async), lalu diperiksa ulang
 * bahwa isian tidak berubah di antaranya.
 */
export async function tandaiSelesai(id: string): Promise<LkkLokal> {
  const l = await ambilLkk(id);
  if (!l) throw new TeraDbError('LKK tidak ditemukan di perangkat.');
  if (l.syncState !== 'draft') throw new TeraDbError('LKK ini sudah dikirim.');
  const kurang = kekuranganUntukKirim(l);
  if (kurang.length) throw new TeraDbError('Belum lengkap: ' + kurang.join(', ') + '.');
  if (await labelSudahDipakai(l.pemilik, l.noLabel as string, l.id)) {
    throw new TeraDbError(`Nomor stiker ${l.noLabel} sudah dipakai LKK lain di perangkat ini.`);
  }

  const versi = l.clientVersion + 1;
  const segel = await segelLkk(paketDari(l, versi));

  return tx(['lkk', 'outbox'], 'readwrite', async (s) => {
    const kini = (await minta(s.lkk.get(id))) as LkkLokal | undefined;
    if (!kini || kini.draftVersion !== l.draftVersion || kini.syncState !== 'draft') {
      throw new TeraDbError('Isian berubah saat disimpan. Tekan Selesai sekali lagi.');
    }
    const w = sekarang();
    const baru: LkkLokal = {
      ...kini,
      syncState: 'tersimpan',
      clientVersion: versi,
      checksum: segel.checksum,
      jumlahTitik: segel.jumlahTitik,
      alasanDitolak: null,
      diubahAt: w,
    };
    s.lkk.put(baru);
    const item: OutboxItem = {
      lkkId: id, clientVersion: versi, percobaan: 0, berikutnyaAt: 0, berhenti: false, errorTerakhir: null, dibuatAt: w,
    };
    s.outbox.put(item);
    return baru;
  });
}

// ---------------------------------------------------------------------------
// Dipakai mesin kirim
// ---------------------------------------------------------------------------
export async function daftarOutbox(): Promise<OutboxItem[]> {
  return tx(['outbox'], 'readonly', (s) => minta(s.outbox.getAll()) as Promise<OutboxItem[]>);
}

export async function ubahStatusKirim(
  lkkId: string,
  clientVersion: number,
  ubah: (l: LkkLokal, o: OutboxItem | undefined) => { lkk?: Partial<LkkLokal>; outbox?: Partial<OutboxItem> | 'hapus' }
): Promise<void> {
  await tx(['lkk', 'outbox'], 'readwrite', async (s) => {
    const l = (await minta(s.lkk.get(lkkId))) as LkkLokal | undefined;
    const o = (await minta(s.outbox.get(lkkId))) as OutboxItem | undefined;
    // Abaikan jawaban untuk versi lama (teknisi sudah membuat versi baru)
    if (!l || l.clientVersion !== clientVersion) return;
    const h = ubah(l, o);
    if (h.lkk) s.lkk.put({ ...l, ...h.lkk });
    if (h.outbox === 'hapus') s.outbox.delete(lkkId);
    else if (h.outbox && o) s.outbox.put({ ...o, ...h.outbox });
  });
}

/** Setelah tab/HP mati di tengah kirim: 🔵 yang tertinggal dikembalikan ke 🟡. */
export async function pulihkanYangTerputus(): Promise<number> {
  return tx(['lkk'], 'readwrite', async (s) => {
    const macet = (await minta(s.lkk.index('syncState').getAll(IDBKeyRange.only('mengirim')))) as LkkLokal[];
    for (const l of macet) s.lkk.put({ ...l, syncState: 'tersimpan' });
    return macet.length;
  });
}

export async function draftPerluDicadangkan(pemilik: string): Promise<LkkLokal[]> {
  const semua = await daftarLkk(pemilik);
  return semua.filter((l) => (l.syncState === 'draft' || l.syncState === 'ditolak') && l.draftVersion > l.draftBackedUpVersion);
}

export async function catatDraftTercadang(id: string, versi: number): Promise<void> {
  await tx(['lkk'], 'readwrite', async (s) => {
    const l = (await minta(s.lkk.get(id))) as LkkLokal | undefined;
    if (!l || versi <= l.draftBackedUpVersion) return;
    s.lkk.put({ ...l, draftBackedUpVersion: versi, draftBackupAt: sekarang() });
  });
}

export { segelDraft };

// ---------------------------------------------------------------------------
// Ringkasan untuk layar & penjaga logout
// ---------------------------------------------------------------------------
export interface Ringkasan {
  draft: number;
  tersimpan: number;     // 🟡
  mengirim: number;      // 🔵
  diterima: number;      // 🟢
  ditolak: number;       // merah
  belumHijau: number;    // tersimpan + mengirim + ditolak  (logout diblokir bila > 0)
  draftBelumTercadang: number;
}

export async function ringkasan(pemilik: string): Promise<Ringkasan> {
  const semua = await daftarLkk(pemilik);
  const r: Ringkasan = { draft: 0, tersimpan: 0, mengirim: 0, diterima: 0, ditolak: 0, belumHijau: 0, draftBelumTercadang: 0 };
  for (const l of semua) {
    r[l.syncState]++;
    if (l.syncState === 'draft' && l.draftVersion > l.draftBackedUpVersion) r.draftBelumTercadang++;
  }
  r.belumHijau = r.tersimpan + r.mengirim + r.ditolak;
  return r;
}

/** Cadangan darurat (F4.11): seluruh isi buku milik akun ini sebagai satu file JSON. */
export async function eksporCadangan(pemilik: string): Promise<{ namaFile: string; isi: string }> {
  const lkk = await daftarLkk(pemilik);
  const w = sekarang();
  const isi = JSON.stringify({ format: 'tera-smk-backup', versi: 1, dibuatAt: w, pemilik, jumlah: lkk.length, lkk }, null, 2);
  return { namaFile: `tera-smk-backup-${w.slice(0, 19).replace(/[:T]/g, '-')}.json`, isi };
}
