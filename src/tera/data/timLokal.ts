/**
 * PAPAN TIM DI PERANGKAT (28 Okt 2026, permintaan Ridhwan)
 *
 * Perumpamaan: papan tulis di posko lapangan. Tiap teknisi tetap memegang buku LKK-nya sendiri;
 * papan ini hanya mencatat "siapa sudah mengerjakan stiker nomor berapa". Isi LKK teman (angka
 * bacaan) tidak pernah ada di sini.
 *
 * Disalin dari server (GET /api/tera/tim) setiap ada sinyal dan disimpan di laci `meta`, jadi papan
 * tetap terbaca tanpa sinyal (dengan keterangan "diperbarui pukul …"). Modul ini tidak menyentuh LKK.
 */
import { bacaMeta, tulisMeta, type LkkLokal } from './teraDb';
import { hitungAlatPo, type JadwalLokal } from './jadwalLokal';

export interface LkkTeman {
  noLabel: string;
  templateKode: string | null;
  alatTambahan: boolean;
  poItemRef: string | null;
  /** draft = masih diisi (cadangan draft) · submitted · returned · approved · … */
  status: string;
  teknisiUserId: string;
  waktu: string | null;
}

export interface TimJadwal {
  jadwalId: string;
  anggota: { userId: string; nama: string }[];
  lkk: LkkTeman[];
}

export interface TimLokal { diambilAt: string; tim: TimJadwal[] }

const kunciTim = (pemilik: string) => `tim|${pemilik}`;
const teks = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);
const POLA_LABEL = /^[0-9]{3}\.[0-9]{4}$/;

/** Kiriman server diperiksa; baris rusak dibuang (tidak boleh membuat layar crash). */
export function bersihkanTim(mentah: unknown): TimJadwal[] {
  const daftar = Array.isArray((mentah as any)?.tim) ? (mentah as any).tim : [];
  const hasil: TimJadwal[] = [];
  for (const j of daftar) {
    const jadwalId = teks(j?.jadwalId);
    if (!jadwalId) continue;
    const anggota = (Array.isArray(j.anggota) ? j.anggota : [])
      .map((a: any) => ({ userId: teks(a?.userId), nama: teks(a?.nama) || 'Teknisi' }))
      .filter((a: any): a is { userId: string; nama: string } => !!a.userId);
    const lkk: LkkTeman[] = [];
    for (const l of Array.isArray(j.lkk) ? j.lkk : []) {
      const noLabel = teks(l?.noLabel), teknisiUserId = teks(l?.teknisiUserId);
      if (!noLabel || !POLA_LABEL.test(noLabel) || !teknisiUserId) continue;
      lkk.push({
        noLabel, teknisiUserId, templateKode: teks(l.templateKode), alatTambahan: l.alatTambahan === true,
        poItemRef: teks(l.poItemRef), status: teks(l.status) || 'submitted', waktu: teks(l.waktu),
      });
    }
    hasil.push({ jadwalId, anggota, lkk });
  }
  return hasil;
}

export async function bacaTim(pemilik: string): Promise<TimLokal | null> {
  if (!pemilik) return null;
  try { return (await bacaMeta<TimLokal>(kunciTim(pemilik))) ?? null; } catch { return null; }
}

/** Tarik papan tim. Gagal (offline/timeout) = diam, papan lama tetap dipakai. */
export async function tarikTim(
  pemilik: string,
  ambil: (signal: AbortSignal) => Promise<Response>,
  batasMs = 15000,
): Promise<TimLokal | null> {
  const kontrol = new AbortController();
  const jam = setTimeout(() => kontrol.abort(), batasMs);
  try {
    const res = await ambil(kontrol.signal);
    if (!res.ok) return null;
    const isi = await res.json().catch(() => null);
    if (!isi || !Array.isArray(isi.tim)) return null;
    const baru: TimLokal = { diambilAt: new Date().toISOString(), tim: bersihkanTim(isi) };
    await tulisMeta(kunciTim(pemilik), baru);
    return baru;
  } catch {
    return null;
  } finally {
    clearTimeout(jam);
  }
}

const TERKIRIM = new Set(['submitted', 'returned', 'approved', 'acc', 'diterima']);
export const statusTeman = (s: string): string =>
  s === 'draft' ? 'sedang diisi' : s === 'approved' ? 'ACC' : s === 'returned' ? 'dikembalikan Selia' : TERKIRIM.has(s) ? 'terkirim' : s;

export interface KelompokTeman { userId: string; nama: string; lkk: LkkTeman[] }

export interface RingkasTim {
  /** LKK teman satu jadwal (nomor yang juga ada di perangkat ini tidak dihitung ulang). */
  teman: KelompokTeman[];
  /** PO yang dikerjakan seluruh tim (saya di perangkat ini + teman), per ref alat PO. */
  poTim: Map<string, number>;
  /** Total PO dikerjakan tim (semua jenis alat). */
  totalTim: number;
  /** Draft teman yang belum tahu jenis alat PO-nya (dihitung ke total, bukan per jenis). */
  poTanpaJenis: number;
}

/**
 * Gabungkan LKK saya (perangkat) dengan papan tim. Nomor label yang sudah ada di perangkat saya
 * tidak dihitung dua kali. Tidak pernah melempar galat.
 */
export function ringkasTim(jadwal: JadwalLokal, lkkSaya: LkkLokal[], tim: TimLokal | null): RingkasTim {
  const tj = tim?.tim.find((t) => t.jadwalId === jadwal.jadwalId);
  const milikSaya = new Set(lkkSaya.filter((l) => l.jadwalId === jadwal.jadwalId && l.noLabel).map((l) => l.noLabel as string));
  const poTim = new Map<string, number>();
  for (const a of hitungAlatPo(jadwal, lkkSaya)) poTim.set(a.ref, a.dikerjakan);
  let poTanpaJenis = 0;
  const per = new Map<string, Map<string, LkkTeman>>();
  for (const l of tj?.lkk ?? []) {
    if (milikSaya.has(l.noLabel)) continue;
    const m = per.get(l.teknisiUserId) ?? new Map<string, LkkTeman>();
    const lama = m.get(l.noLabel);
    // Satu nomor satu baris: yang terkirim mengalahkan draft
    if (!lama || (lama.status === 'draft' && l.status !== 'draft')) m.set(l.noLabel, l);
    per.set(l.teknisiUserId, m);
  }
  const terhitung = new Set<string>();
  for (const m of per.values()) for (const l of m.values()) {
    if (l.alatTambahan || terhitung.has(l.noLabel)) continue;
    terhitung.add(l.noLabel);
    if (l.poItemRef && poTim.has(l.poItemRef)) poTim.set(l.poItemRef, (poTim.get(l.poItemRef) || 0) + 1);
    else poTanpaJenis++;
  }
  const nama = new Map((tj?.anggota ?? []).map((a) => [a.userId, a.nama] as const));
  const teman: KelompokTeman[] = [...per.entries()]
    .map(([userId, m]) => ({ userId, nama: nama.get(userId) || 'Teknisi', lkk: [...m.values()].sort((a, b) => a.noLabel.localeCompare(b.noLabel)) }))
    .sort((a, b) => a.nama.localeCompare(b.nama));
  let totalTim = poTanpaJenis;
  for (const v of poTim.values()) totalTim += v;
  return { teman, poTim, totalTim, poTanpaJenis };
}

/** Nomor stiker ini sudah dipakai teman satu jadwal? (untuk peringatan saat mulai LKK) */
export function pemakaiNomor(tim: TimLokal | null, jadwalId: string, noLabel: string): { nama: string; status: string } | null {
  const tj = tim?.tim.find((t) => t.jadwalId === jadwalId);
  if (!tj) return null;
  const cocok = tj.lkk.filter((l) => l.noLabel === noLabel);
  if (!cocok.length) return null;
  const l = cocok.find((x) => x.status !== 'draft') ?? cocok[0];
  return { nama: tj.anggota.find((a) => a.userId === l.teknisiUserId)?.nama || 'teknisi lain', status: l.status };
}
