/**
 * ATURAN NOMOR STIKER (Tahap 4.3b, PRD F3.2–F3.4 · CLAUDE.md 7)
 *
 * Perumpamaan: petugas gudang yang mencocokkan nomor seri di stiker dengan daftar jatah RS itu.
 * Fungsi murni (tanpa jaringan/penyimpanan) supaya bisa diuji dan dipakai ulang oleh server nanti.
 *
 * Format nomor = `BBB.NNNN` (BBB = nomor BO, NNNN = alat ke-berapa).
 * Aturan (F3.3): harus satu BO dengan jadwal · di dalam rentang utama / cadangan jadwal itu ·
 * belum dipakai di perangkat ini. Alat tambahan (F3.4) wajib memakai stiker cadangan.
 */

export type RentangLabel = { awal: string; akhir: string };

export type HasilCekNomor =
  | { ok: true; nomor: string; jenis: 'utama' | 'cadangan' }
  | { ok: false; pesan: string };

const POLA = /^(\d{3})\.(\d{4})$/;

/** Pecah "095.0012" → { bo: '095', urut: 12 }; bentuk lain → null. */
export function pecahNomor(nomor: string | null | undefined): { bo: string; urut: number } | null {
  const m = POLA.exec(String(nomor ?? '').trim());
  return m ? { bo: m[1], urut: Number(m[2]) } : null;
}

/**
 * Ubah ketikan teknisi menjadi nomor lengkap. BO sudah terisi otomatis (F3.2): ketik 4 angka saja.
 * Ketikan lengkap ("095.0012", "0950012", "095-0012") juga diterima. Selain itu → null.
 */
export function nomorDariKetikan(bo: string, ketikan: string): string | null {
  const t = String(ketikan ?? '').trim();
  if (/^\d{4}$/.test(t)) return `${bo}.${t}`;
  const m = /^(\d{3})[.\-_/ ]?(\d{4})$/.exec(t);
  return m ? `${m[1]}.${m[2]}` : null;
}

const dalam = (n: { bo: string; urut: number }, r: RentangLabel | null | undefined): boolean => {
  const a = pecahNomor(r?.awal), b = pecahNomor(r?.akhir);
  return !!a && !!b && a.bo === n.bo && b.bo === n.bo && n.urut >= a.urut && n.urut <= b.urut;
};

export interface MasukanCekNomor {
  nomor: string | null | undefined;
  bo: string;
  utama: RentangLabel | null;
  cadangan: RentangLabel | null;
  /** Nomor yang sudah dipakai LKK di perangkat ini. */
  dipakai: ReadonlySet<string>;
  /** 'tambahan' = alat di luar PO → wajib stiker cadangan. */
  mode: 'po' | 'tambahan';
}

export function cekNomorLabel(m: MasukanCekNomor): HasilCekNomor {
  const n = pecahNomor(m.nomor);
  if (!n) return { ok: false, pesan: 'Nomor stiker harus berbentuk 3 angka, titik, 4 angka (contoh 095.0012).' };
  const nomor = `${n.bo}.${String(n.urut).padStart(4, '0')}`;
  if (n.bo !== m.bo) return { ok: false, pesan: `Stiker ini milik BO ${n.bo}, bukan BO ${m.bo} (jadwal rumah sakit ini).` };

  const diUtama = dalam(n, m.utama), diCadangan = dalam(n, m.cadangan);
  if (m.mode === 'tambahan') {
    if (!m.cadangan) return { ok: false, pesan: 'Jadwal ini tidak punya stiker cadangan. Hubungi Admin Teknik.' };
    if (!diCadangan) {
      return { ok: false, pesan: diUtama
        ? `Alat tambahan harus memakai stiker cadangan (${m.cadangan.awal} – ${m.cadangan.akhir}), bukan stiker utama.`
        : `Nomor ${nomor} di luar rentang stiker cadangan (${m.cadangan.awal} – ${m.cadangan.akhir}).` };
    }
  } else if (!diUtama && !diCadangan) {
    const rentang = [m.utama && `${m.utama.awal} – ${m.utama.akhir}`, m.cadangan && `cadangan ${m.cadangan.awal} – ${m.cadangan.akhir}`].filter(Boolean).join(' · ');
    return { ok: false, pesan: `Nomor ${nomor} di luar rentang stiker jadwal ini${rentang ? ` (${rentang})` : ''}.` };
  }
  if (m.dipakai.has(nomor)) return { ok: false, pesan: `Nomor stiker ${nomor} sudah dipakai LKK lain di perangkat ini.` };
  return { ok: true, nomor, jenis: diUtama ? 'utama' : 'cadangan' };
}

const rapikan = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

/** Template untuk nama alat PO (nama ASPAK). Sama persis setelah huruf kecil & spasi dirapikan. */
export function templateUntukAlat<T extends { nama: string }>(namaAlat: string, templates: readonly T[]): T | null {
  const x = rapikan(namaAlat);
  // Nama template dulu; lalu nama alat lain yang memakai template itu (Keselamatan Listrik: ESWT, Fundus Camera, ...)
  return templates.find((t) => rapikan(t.nama) === x)
    ?? templates.find((t) => {
      const lain = (t as { alatTercakup?: unknown }).alatTercakup;
      return Array.isArray(lain) && lain.some((n) => typeof n === 'string' && rapikan(n) === x);
    })
    ?? null;
}

/** Tanggal lokal perangkat YYYY-MM-DD (tanggal pelaksanaan bawaan). */
export function tanggalLokal(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
