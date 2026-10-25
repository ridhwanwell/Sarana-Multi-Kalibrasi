/**
 * DATA BAP & BASTP (Tahap 5.2) — murni: dari jadwal + Push + LKK yang sudah DITERIMA SERVER → isian BAP/BASTP.
 *
 * Perumpamaan: rekap akhir pekerjaan di RS. Volume PO dari surat pesanan (Push), realisasi = lembar LKK yang sudah
 * masuk kantor (🟢, termasuk TIDAK LAIK), sisa = PO − realisasi. Alat tambahan = baris sendiri (tanpa tulisan tambahan).
 *
 * Aturan (CLAUDE.md 11 + keputusan Ridhwan 25 Okt 2026):
 *  - Nomor BAP = BO: `BBB/SMK/BAP/<romawi>/<tahun>`; No. Order BASTP `BBB/SMK-BO/<romawi>-<tahun>`; romawi & tahun = tanggal UNDUH.
 *  - Keterangan BAP dihitung dari sisa (Selesai/Batal) di susunBapBastp.ts.
 *  - Data uji (is_test) hanya boleh di BO 999; BO sungguhan membuang semua LKK is_test.
 *  - Nama ketua tim & petugas = nama + gelar (gelarTeknisi.ts), di BAP maupun BASTP.
 *  - Kota/Kab. & alamat dari data RS di jadwal (nanti mengikuti alamat RS masing-masing).
 */
import { bulanRomawi, tanggalPendek, type DataBap, type DataBastp, type BarisBap, type BarisBastp } from '../pdf/susunBapBastp.js';
import { namaDenganGelar } from './gelarTeknisi.js';

/** Status LKK yang berarti "sudah diterima server" (draft tidak pernah ada di tera_lkk). */
export const STATUS_DITERIMA = ['submitted', 'under_review', 'returned', 'approved', 'correction_open'] as const;

export interface JadwalBap {
  nama_rs: string | null; kota: string | null; nomor_po: string | null; tanggal_po: string | null;
  nama_teknisi_utama: string | null; data: Record<string, any> | null;
}
export interface PushBap { bo: string; is_test: boolean; alat_po: { ref: string; nama: string; jumlah: number }[] }
export interface LkkBap {
  no_label: string; status: string; is_test: boolean; alat_tambahan: boolean; po_item_ref: string | null;
  template_kode: string; tanggal_kalibrasi: string | null; teknisi_user_id: string | null;
  data: Record<string, any> | null; results: Record<string, any> | null;
}
export interface BahanDataBap {
  jadwal: JadwalBap; push: PushBap; lkk: LkkBap[];
  /** nama alat katalog per kode template (untuk alat tambahan) */
  namaTemplate: Record<string, string>;
  /** nama teknisi (tanpa gelar) per user_id — dari master `teknisi`, cadangan profiles.full_name */
  namaTeknisi: Record<string, string>;
  /** tanggal unduh (sudah waktu Jakarta), 'YYYY-MM-DD' */
  tanggalUnduh: string;
}

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const POLA_TGL = /^(\d{4})-(\d{2})-(\d{2})/;

/** 'YYYY-MM-DD' → Date pukul 00.00 waktu lokal (hari/tanggal tidak bergeser karena zona waktu). */
export function keTanggal(s: string | null | undefined): Date | null {
  const m = POLA_TGL.exec(String(s ?? ''));
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}
/** "Senin, 5 Oktober 2026" (format Tanggal PO di BAP contoh). Teks lain dibiarkan apa adanya. */
export function tanggalPo(s: string | null | undefined): string {
  const d = keTanggal(s);
  if (!d) return String(s ?? '').trim();
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}
/** Hanya LKK yang boleh masuk dokumen: sudah diterima server; is_test hanya untuk BO 999. */
export function lkkSah(push: PushBap, lkk: LkkBap[]): LkkBap[] {
  const uji = push.bo === '999';
  return lkk.filter((l) => (STATUS_DITERIMA as readonly string[]).includes(l.status) && (uji || !l.is_test));
}

const teks = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim());
const urutLabel = (a: LkkBap, b: LkkBap) => a.no_label.localeCompare(b.no_label, 'en', { numeric: true });

export function nomorDokumen(bo: string, tanggalUnduh: string) {
  const d = keTanggal(tanggalUnduh) ?? new Date();
  const r = bulanRomawi(d), th = d.getFullYear();
  return { nomorBap: `${bo}/SMK/BAP/${r}/${th}`, noOrder: `${bo}/SMK-BO/${r}-${th}` };
}

function ketuaTim(j: JadwalBap): string {
  return namaDenganGelar(teks(j.data?.leadTechnicianName) || teks(j.nama_teknisi_utama));
}
function namaRs(j: JadwalBap): string { return teks(j.data?.hospitalName) || teks(j.nama_rs); }

export function susunDataBap(b: BahanDataBap): DataBap {
  const { jadwal: j, push } = b;
  const lkk = lkkSah(push, b.lkk);
  const baris: BarisBap[] = push.alat_po.map((a) => {
    const realisasi = lkk.filter((l) => !l.alat_tambahan && l.po_item_ref === a.ref).length;
    const po = Math.max(0, Number(a.jumlah) || 0);
    return { nama: teks(a.nama), po, realisasi, sisa: Math.max(0, po - realisasi) };
  });
  // Alat tambahan: satu baris per jenis alat (nama katalog dari template), Volume PO 0, sisa 0.
  const tambahan = new Map<string, number>();
  for (const l of lkk.filter((x) => x.alat_tambahan)) {
    const nama = b.namaTemplate[l.template_kode] || l.template_kode;
    tambahan.set(nama, (tambahan.get(nama) ?? 0) + 1);
  }
  for (const [nama, n] of tambahan) baris.push({ nama, po: 0, realisasi: n, sisa: 0 });
  const { nomorBap } = nomorDokumen(push.bo, b.tanggalUnduh);
  return {
    nomorBap,
    namaPelanggan: namaRs(j),
    nomorPo: teks(j.nomor_po) || teks(j.data?.poContractNumber),
    tanggalPo: tanggalPo(j.tanggal_po ?? j.data?.poDate),
    alamat: teks(j.data?.hospitalAddress),
    kota: teks(j.data?.hospitalCity) || teks(j.kota),
    baris,
    tanggal: keTanggal(b.tanggalUnduh),
    ketuaTim: ketuaTim(j),
  };
}

export function susunDataBastp(b: BahanDataBap): DataBastp {
  const { jadwal: j, push } = b;
  const lkk = lkkSah(push, b.lkk).sort(urutLabel);
  const namaPo = new Map(push.alat_po.map((a) => [a.ref, teks(a.nama)]));
  let laik = 0, tidak = 0;
  const baris: BarisBastp[] = lkk.map((l) => {
    const id = (l.data?.identitas ?? {}) as Record<string, unknown>;
    const kes = teks(l.results?.kesimpulan);
    if (kes === 'Laik Pakai') laik++; else if (kes === 'Tidak Laik Pakai') tidak++;
    const tgl = keTanggal(l.tanggal_kalibrasi);
    const nama = (!l.alat_tambahan && l.po_item_ref && namaPo.get(l.po_item_ref)) || b.namaTemplate[l.template_kode] || l.template_kode;
    return {
      nama, merk: teks(id.merek) || '-', tipe: teks(id.tipe) || '-', noSeri: teks(id.noSeri) || '-',
      petugas: namaDenganGelar(b.namaTeknisi[l.teknisi_user_id ?? ''] ?? ''),
      tanggal: tgl ? tanggalPendek(tgl) : '', ruangan: teks(id.ruang), keterangan: kes,
    };
  });
  const { noOrder } = nomorDokumen(push.bo, b.tanggalUnduh);
  const alamat = [teks(j.data?.hospitalAddress), teks(j.data?.hospitalCity) || teks(j.kota)].filter((x) => x && x !== '-').join(', ');
  return {
    noOrder, namaCustomer: namaRs(j), telepon: teks(j.data?.hospitalPhone) || '-', alamat,
    ketuaTim: ketuaTim(j), baris, laikPakai: laik, tidakLaik: tidak,
  };
}

// ───────────────────────── REKAP (Excel, hanya Penyelia) ─────────────────────────
/** Satu baris FORM REKAP PEKERJAAN (contoh Ridhwan 25 Okt 2026): kolom sama dengan BASTP + No. Sertifikat (= nomor label). */
export interface BarisRekap {
  nama: string; merk: string; tipe: string; noSeri: string; petugas: string;
  tanggal: string | null; // 'YYYY-MM-DD' → ditulis sebagai tanggal Excel (dd/mm/yy)
  ruangan: string; keterangan: string; noSertifikat: string;
}

/** Isi rekap = LKK yang sama dengan BASTP (diterima server, urut nomor label); nama alat HURUF BESAR seperti contoh. */
export function susunDataRekap(b: BahanDataBap): BarisRekap[] {
  const lkk = lkkSah(b.push, b.lkk).sort(urutLabel);
  const t = susunDataBastp(b).baris; // urutan sama (lkkSah + urutLabel)
  return lkk.map((l, i) => ({
    nama: t[i].nama.toUpperCase(), merk: t[i].merk, tipe: t[i].tipe, noSeri: t[i].noSeri, petugas: t[i].petugas,
    tanggal: keTanggal(l.tanggal_kalibrasi) ? String(l.tanggal_kalibrasi).slice(0, 10) : null,
    ruangan: t[i].ruangan, keterangan: t[i].keterangan, noSertifikat: l.no_label,
  }));
}
