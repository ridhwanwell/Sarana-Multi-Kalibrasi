/**
 * MESIN KIRIM TERA SMK (Tahap 2.3, PRD F4.5–F4.9 · CLAUDE.md 5)
 *
 * Perumpamaan: kurir kantor yang rajin. Tanpa disuruh (tidak ada tombol Upload), ia mengecek
 * laci antrean: saat aplikasi dibuka, saat sinyal kembali, saat LKK baru selesai, dan berkala.
 * Gagal? Ia menunggu makin lama (5 s → 15 s → 1 m → 5 m → 15 m) lalu mencoba lagi.
 * Hanya memberi cap 🟢 bila tanda terima kantor cocok dengan segel paket.
 * Kiriman yang DITOLAK dengan alasan (nomor ganda, sudah dikunci Penyelia) tidak diulang terus:
 * LKK ditandai merah dan menunggu teknisi memperbaikinya. Data tidak pernah dihapus.
 *
 * Juga mencadangkan DRAFT ke server (maks tiap 60 detik, dan saat aplikasi disembunyikan).
 */
import {
  bukaDb, daftarOutbox, ambilLkk, ubahStatusKirim, pulihkanYangTerputus,
  draftPerluDicadangkan, catatDraftTercadang, paketDari, paketDraftDari, ringkasan,
  type Ringkasan,
} from './teraDb';
import { segelDraft, bolehHijau, type TandaTerima } from '../shared/segel';

export const JEDA_GAGAL_MS = [5_000, 15_000, 60_000, 300_000, 900_000];
export const BATAS_WAKTU_MS = 20_000;
export const JEDA_CADANG_DRAFT_MS = 60_000;
const JEDA_BERKALA_MS = 30_000;
const MAKS_PARALEL = 3;

/** Cara mengirim: diganti saat uji; aslinya memakai apiFetch (token login). */
export type Pengirim = (path: string, body: unknown, opsi: { signal: AbortSignal; keepalive?: boolean }) => Promise<Response>;

export interface OpsiMesin {
  pemilik: string;
  kirim: Pengirim;
  /** Dipanggil setiap ringkasan berubah (untuk chip 🟡🔵🟢 & penjaga logout). */
  onRingkasan?: (r: Ringkasan) => void;
  /** Catat error ke server (opsional). */
  onError?: (pesan: string, konteks?: Record<string, unknown>) => void;
  /** Untuk uji: percepat jeda. */
  skalaWaktu?: number;
  sekarang?: () => number;
}

export interface MesinKirim {
  dorong: () => void;                 // "ada yang baru, cek antrean sekarang"
  cadangkanDraftSekarang: () => Promise<void>;
  berhenti: () => void;
  segarkanRingkasan: () => Promise<Ringkasan>;
}

const jedaUntuk = (percobaan: number, skala: number) => {
  const dasar = JEDA_GAGAL_MS[Math.min(percobaan, JEDA_GAGAL_MS.length) - 1] ?? JEDA_GAGAL_MS[0];
  // acakan ±20% agar 10 tablet tidak menyerbu server di detik yang sama
  return Math.round(dasar * (0.8 + Math.random() * 0.4) * skala);
};

export function mulaiMesinKirim(opsi: OpsiMesin): MesinKirim {
  const skala = opsi.skalaWaktu ?? 1;
  const kini = opsi.sekarang ?? (() => Date.now());
  let hidup = true;
  let sedangJalan = false;
  let ulangSetelahIni = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let cadangTerakhir = 0;
  const lepas: Array<() => void> = [];

  const lapor = async () => {
    try {
      const r = await ringkasan(opsi.pemilik);
      opsi.onRingkasan?.(r);
      return r;
    } catch {
      return null;
    }
  };

  const catatError = (pesan: string, konteks?: Record<string, unknown>) => {
    try { opsi.onError?.(pesan, konteks); } catch { /* jangan sampai mengganggu kirim */ }
  };

  /** Kirim satu LKK: hijau, merah (ditolak beralasan), atau kembali 🟡 untuk dicoba lagi. */
  async function kirimSatu(lkkId: string, clientVersion: number, percobaan: number): Promise<void> {
    const l = await ambilLkk(lkkId);
    if (!l || l.clientVersion !== clientVersion || !l.checksum || l.jumlahTitik === null) return;

    await ubahStatusKirim(lkkId, clientVersion, () => ({ lkk: { syncState: 'mengirim' } }));
    await lapor();

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), BATAS_WAKTU_MS);
    let res: Response | null = null;
    let galat: string | null = null;
    try {
      res = await opsi.kirim('/api/tera/lkk', {
        paket: paketDari(l, clientVersion),
        checksum: l.checksum,
        jumlahTitik: l.jumlahTitik,
        clientUpdatedAt: l.diubahAt,
      }, { signal: ctrl.signal });
    } catch (e: any) {
      galat = e?.name === 'AbortError'
        ? 'Server tidak merespons. Data aman di perangkat, akan dicoba lagi otomatis.'
        : 'Tidak ada sinyal. Data aman di perangkat, akan dicoba lagi otomatis.';
    } finally {
      clearTimeout(t);
    }

    let isi: any = null;
    if (res) { try { isi = await res.json(); } catch { isi = null; } }

    // 🟢 hanya bila tanda terima cocok dengan segel, jumlah titik, dan versi milik perangkat
    if (res && res.ok && bolehHijau(isi as TandaTerima, { checksum: l.checksum, jumlahTitik: l.jumlahTitik, clientVersion })) {
      await ubahStatusKirim(lkkId, clientVersion, () => ({
        lkk: { syncState: 'diterima', statusServer: isi.status ?? 'submitted', diterimaAt: new Date().toISOString(), alasanDitolak: null },
        outbox: 'hapus',
      }));
      return;
    }

    // Ditolak dengan alasan jelas → merah, berhenti mengulang, data tetap di perangkat
    if (res && res.status === 409 && isi?.hasil && isi.hasil !== 'sudah_diterima') {
      const alasan: string = isi.alasan || 'Kiriman ditolak server.';
      await ubahStatusKirim(lkkId, clientVersion, () => ({
        lkk: { syncState: 'ditolak', alasanDitolak: alasan, statusServer: isi.status ?? null },
        outbox: { berhenti: true, errorTerakhir: alasan, percobaan: percobaan + 1 },
      }));
      catatError('LKK ditolak server', { lkkId, hasil: isi.hasil, alasan });
      return;
    }

    // Selain itu (sinyal hilang, timeout, 5xx, segel tidak cocok, sesi habis) → 🟡 lagi & coba nanti
    const pesan = galat
      ?? (res?.status === 401 ? 'Sesi login habis. Data aman di perangkat; akan dikirim setelah login ulang.'
        : res?.status === 403 ? (isi?.error || 'Akun belum diizinkan mengirim LKK.')
        : res?.ok ? 'Tanda terima server tidak cocok dengan segel. Akan dikirim ulang.'
        : (isi?.alasan || isi?.error || `Server membalas ${res?.status}. Data aman di perangkat.`));
    const ke = percobaan + 1;
    await ubahStatusKirim(lkkId, clientVersion, () => ({
      lkk: { syncState: 'tersimpan' },
      outbox: { percobaan: ke, berikutnyaAt: kini() + jedaUntuk(ke, skala), errorTerakhir: pesan },
    }));
    if (res && (res.status === 422 || (res.ok && !galat))) catatError('Segel/tanda terima tidak cocok', { lkkId, status: res.status });
  }

  async function putaran(): Promise<void> {
    if (!hidup) return;
    if (sedangJalan) { ulangSetelahIni = true; return; }
    sedangJalan = true;
    try {
      const siap = (await daftarOutbox())
        .filter((o) => !o.berhenti && o.berikutnyaAt <= kini())
        .sort((a, b) => a.berikutnyaAt - b.berikutnyaAt || a.dibuatAt.localeCompare(b.dibuatAt));
      // Maks 3 kiriman bersamaan
      let i = 0;
      const pekerja = async () => {
        while (hidup && i < siap.length) {
          const o = siap[i++];
          try { await kirimSatu(o.lkkId, o.clientVersion, o.percobaan); }
          catch (e: any) { catatError('Mesin kirim gagal menulis status', { lkkId: o.lkkId, pesan: String(e?.message || e) }); }
          await lapor();
        }
      };
      await Promise.all(Array.from({ length: Math.min(MAKS_PARALEL, siap.length) }, pekerja));

      if (kini() - cadangTerakhir >= JEDA_CADANG_DRAFT_MS * skala) await cadangkanDraft(false);
    } catch (e: any) {
      catatError('Putaran mesin kirim gagal', { pesan: String(e?.message || e) });
    } finally {
      sedangJalan = false;
      await lapor();
      if (ulangSetelahIni && hidup) { ulangSetelahIni = false; setTimeout(() => { void putaranTerkunci(); }, 0); }
      else jadwalkan();
    }
  }

  /** Atur putaran berikutnya: secepat antrean yang paling dulu boleh dicoba, maks tiap 30 detik. */
  async function jadwalkan() {
    if (!hidup) return;
    if (timer) clearTimeout(timer);
    let tunggu = JEDA_BERKALA_MS * skala;
    try {
      const o = (await daftarOutbox()).filter((x) => !x.berhenti);
      if (o.length) tunggu = Math.max(50, Math.min(tunggu, Math.min(...o.map((x) => x.berikutnyaAt)) - kini()));
    } catch { /* pakai jeda berkala */ }
    timer = setTimeout(() => { void putaranTerkunci(); }, tunggu);
  }

  /** Hanya SATU tab yang menjadi kurir (Web Locks); tab lain menunggu giliran. */
  async function putaranTerkunci() {
    const locks = (globalThis.navigator as any)?.locks;
    if (locks?.request) {
      await locks.request('tera_smk_kurir', { ifAvailable: true }, async (kunci: unknown) => {
        if (!kunci) { jadwalkan(); return; }   // tab lain sedang mengirim
        await putaran();
      });
    } else {
      await putaran();
    }
  }

  async function cadangkanDraft(keepalive: boolean) {
    cadangTerakhir = kini();
    const daftar = await draftPerluDicadangkan(opsi.pemilik);
    for (const l of daftar) {
      if (!hidup && !keepalive) return;
      const paket = paketDraftDari(l);
      try {
        const { checksum } = await segelDraft(paket);
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), BATAS_WAKTU_MS);
        try {
          const res = await opsi.kirim('/api/tera/draft', { paket, checksum, clientUpdatedAt: l.diubahAt },
            { signal: ctrl.signal, keepalive });
          if (res.ok) await catatDraftTercadang(l.id, paket.clientVersion);
        } finally {
          clearTimeout(t);
        }
      } catch {
        // cadangan gagal tidak mengganggu apa pun; dicoba lagi di putaran berikutnya
      }
    }
  }

  // --- Pemicu ---------------------------------------------------------------
  const dorong = () => { void putaranTerkunci(); };
  const saatOnline = () => dorong();
  const saatTampil = () => {
    if (document.visibilityState === 'visible') dorong();
    else void cadangkanDraft(true);            // aplikasi disembunyikan/ditutup → cadangkan draft segera
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('online', saatOnline);
    document.addEventListener('visibilitychange', saatTampil);
    window.addEventListener('pagehide', () => { void cadangkanDraft(true); });
    lepas.push(() => {
      window.removeEventListener('online', saatOnline);
      document.removeEventListener('visibilitychange', saatTampil);
    });
  }

  // Mulai: buka buku, pulihkan 🔵 yang terputus (HP mati / tab ditutup di tengah kirim), lalu kirim
  void (async () => {
    try {
      await bukaDb();
      await pulihkanYangTerputus();
    } catch (e: any) {
      catatError('Gagal membuka penyimpanan perangkat', { pesan: String(e?.message || e) });
    }
    await lapor();
    dorong();
  })();

  return {
    dorong,
    cadangkanDraftSekarang: () => cadangkanDraft(false),
    segarkanRingkasan: async () => (await lapor()) ?? ringkasan(opsi.pemilik),
    berhenti: () => {
      hidup = false;
      if (timer) clearTimeout(timer);
      lepas.forEach((f) => f());
    },
  };
}

/**
 * Pengirim asli: memakai apiFetch (token login, refresh sekali bila 401), TANPA coba-ulang
 * bawaan — jeda coba-ulang diatur mesin ini.
 */
export async function pengirimApi(path: string, body: unknown, opsi: { signal: AbortSignal; keepalive?: boolean }): Promise<Response> {
  const { apiFetch } = await import('../../lib/apiClient');
  return apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
    retries: 0,
    timeoutMs: BATAS_WAKTU_MS,
    signal: opsi.signal,
    keepalive: opsi.keepalive,
  });
}

/** Minta izin penyimpanan permanen (F4.2). true = dijamin tidak dihapus browser saat memori penuh. */
export async function mintaPenyimpananPermanen(): Promise<boolean> {
  try {
    const sm = (globalThis.navigator as any)?.storage;
    if (!sm?.persist) return false;
    if (await sm.persisted?.()) return true;
    return await sm.persist();
  } catch {
    return false;
  }
}
