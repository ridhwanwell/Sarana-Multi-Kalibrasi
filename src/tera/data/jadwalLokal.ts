/**
 * JADWAL DI PERANGKAT (Tahap 3.4a, PRD F2.5)
 *
 * Perumpamaan: map surat tugas di tas teknisi. Tiap kali ada sinyal, tablet menanyakan ke server
 * "ada surat tugas baru atau yang diganti?". Fotokopi bernomor versi lebih baru MENGGANTI yang lama;
 * fotokopi lama tidak pernah menimpa yang baru. Surat tugas yang dicabut kantor disembunyikan dari
 * daftar, tetapi LKK yang sudah diisi tetap ada di buku LKK.
 *
 * Aturan keras: modul ini TIDAK menyentuh laci `lkk`/`outbox` untuk menulis (hanya membaca LKK
 * untuk menghitung "dikerjakan"), jadi tarik jadwal tidak mungkin menghilangkan data LKK.
 */
import { minta, tx } from './teraDb';
import type { LkkLokal } from './teraDb';

export interface AlatPoLokal {
  ref: string;
  nama: string;
  jumlah: number;
  urutAwal: number | null;
  urutAkhir: number | null;
}

/** Bentuk satu jadwal dari GET /api/tera/jadwal. */
export interface JadwalDariServer {
  jadwalId: string;
  bo: string;
  namaRs: string;
  kota: string | null;
  tanggalMulai: string | null;
  tanggalSelesai: string | null;
  labelAwal: string;
  labelAkhir: string;
  cadanganAwal: string | null;
  cadanganAkhir: string | null;
  alatPo: AlatPoLokal[];
  versi: number;
  isTest: boolean;
  pushedAt: string;
  dicabut: boolean;
}

export interface JadwalLokal extends JadwalDariServer {
  /** Kunci laci: "<pemilik>|<jadwalId>" — dua akun di satu tablet tidak saling menimpa. */
  id: string;
  pemilik: string;
  diambilAt: string;
}

export const kunciJadwal = (pemilik: string, jadwalId: string) => `${pemilik}|${jadwalId}`;

const teks = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);

/** Periksa satu kiriman server; yang rusak dibuang (tidak boleh merusak jadwal lain). */
export function bersihkanJadwal(mentah: unknown): JadwalDariServer | null {
  const j = mentah as any;
  if (!j || typeof j !== 'object') return null;
  const jadwalId = teks(j.jadwalId);
  const bo = teks(j.bo);
  const namaRs = teks(j.namaRs);
  if (!jadwalId || !bo || !/^[0-9]{3}$/.test(bo) || !namaRs) return null;
  if (!Number.isInteger(j.versi) || j.versi < 1) return null;
  const alat: AlatPoLokal[] = [];
  for (const a of Array.isArray(j.alatPo) ? j.alatPo : []) {
    const ref = teks(a?.ref);
    const nama = teks(a?.nama);
    if (!ref || !nama || !Number.isFinite(a?.jumlah) || a.jumlah < 0) continue;
    alat.push({
      ref, nama, jumlah: Math.floor(a.jumlah),
      urutAwal: Number.isFinite(a?.urutAwal) ? a.urutAwal : null,
      urutAkhir: Number.isFinite(a?.urutAkhir) ? a.urutAkhir : null,
    });
  }
  return {
    jadwalId, bo, namaRs,
    kota: teks(j.kota),
    tanggalMulai: teks(j.tanggalMulai),
    tanggalSelesai: teks(j.tanggalSelesai),
    labelAwal: String(j.labelAwal ?? ''),
    labelAkhir: String(j.labelAkhir ?? ''),
    cadanganAwal: teks(j.cadanganAwal),
    cadanganAkhir: teks(j.cadanganAkhir),
    alatPo: alat,
    versi: j.versi,
    isTest: j.isTest === true,
    pushedAt: String(j.pushedAt ?? ''),
    dicabut: j.dicabut === true,
  };
}

/**
 * Simpan jadwal kiriman server dalam SATU transaksi. Hanya yang versinya LEBIH BARU dari yang
 * sudah ada di perangkat yang ditulis. Mengembalikan jumlah jadwal yang berubah.
 */
export async function simpanJadwalServer(pemilik: string, daftar: unknown[]): Promise<number> {
  const bersih = daftar.map(bersihkanJadwal).filter((x): x is JadwalDariServer => !!x);
  if (bersih.length === 0) return 0;
  const w = new Date().toISOString();
  return tx(['jadwal'], 'readwrite', async (s) => {
    let berubah = 0;
    for (const j of bersih) {
      const id = kunciJadwal(pemilik, j.jadwalId);
      const lama = (await minta(s.jadwal.get(id))) as JadwalLokal | undefined;
      if (lama && lama.versi >= j.versi) continue;
      s.jadwal.put({ ...j, id, pemilik, diambilAt: w } satisfies JadwalLokal);
      berubah++;
    }
    return berubah;
  });
}

/** Jadwal aktif milik akun ini (yang dicabut disembunyikan), terbaru di atas. */
export async function daftarJadwalAktif(pemilik: string): Promise<JadwalLokal[]> {
  const semua = (await tx(['jadwal'], 'readonly', (s) => minta(s.jadwal.getAll()) as Promise<JadwalLokal[]>))
    .filter((j) => j.pemilik === pemilik && !j.dicabut);
  return semua.sort((a, b) => (b.pushedAt || '').localeCompare(a.pushedAt || ''));
}

export interface HitunganAlat extends AlatPoLokal {
  dikerjakan: number;
  sisa: number;
}

/**
 * PO · dikerjakan · sisa per jenis alat. "Dikerjakan" = LKK di perangkat untuk jadwal ini dengan
 * `poItemRef` yang sama (alat tambahan tidak dihitung ke PO). Sisa tidak pernah negatif.
 */
export function hitungAlatPo(jadwal: JadwalLokal, lkk: LkkLokal[]): HitunganAlat[] {
  const hitung = new Map<string, number>();
  for (const l of lkk) {
    if (l.jadwalId !== jadwal.jadwalId || l.alatTambahan || !l.poItemRef) continue;
    hitung.set(l.poItemRef, (hitung.get(l.poItemRef) || 0) + 1);
  }
  return jadwal.alatPo.map((a) => {
    const dikerjakan = hitung.get(a.ref) || 0;
    return { ...a, dikerjakan, sisa: Math.max(0, a.jumlah - dikerjakan) };
  });
}

export type HasilTarik =
  | { ok: true; berubah: number }
  | { ok: false; alasan: string };

/**
 * Tarik jadwal dari server. Gagal (offline, timeout, server sibuk) tidak melempar galat dan tidak
 * mengubah apa pun di perangkat — jadwal lama tetap bisa dipakai.
 */
export async function tarikJadwal(
  pemilik: string,
  ambil: (signal: AbortSignal) => Promise<Response>,
  batasMs = 15000
): Promise<HasilTarik> {
  const kontrol = new AbortController();
  const jam = setTimeout(() => kontrol.abort(), batasMs);
  try {
    const res = await ambil(kontrol.signal);
    if (!res.ok) return { ok: false, alasan: res.status === 401 || res.status === 403 ? 'Akun tidak punya akses jadwal.' : 'Server sedang sibuk.' };
    const isi = await res.json().catch(() => null);
    if (!isi || !Array.isArray(isi.jadwal)) return { ok: false, alasan: 'Jawaban server tidak dikenali.' };
    return { ok: true, berubah: await simpanJadwalServer(pemilik, isi.jadwal) };
  } catch (e: any) {
    return { ok: false, alasan: e?.name === 'AbortError' ? 'Server tidak merespons.' : 'Tidak ada sambungan internet.' };
  } finally {
    clearTimeout(jam);
  }
}
