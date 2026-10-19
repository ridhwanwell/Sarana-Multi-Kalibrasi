/**
 * FOTOKOPI JADWAL — aturan pembuatan "surat tugas" yang dikirim ke tablet (Tahap 3.2).
 *
 * Perumpamaan: petugas administrasi memeriksa surat tugas asli (jadwal_kalibrasi) sebelum
 * difotokopi. Fungsi di sini MURNI (tanpa database) supaya bisa diuji tanpa server: server
 * mengambil baris jadwal, baris teknisi, dan push milik BO yang sama, lalu memanggil `susunPush`.
 * Hasilnya: bahan untuk fungsi database tera_push_jadwal, atau alasan penolakan berbahasa awam.
 *
 * Kunci JSON jadwal yang dibaca (dibuat modul penjadwalan; kunci cadangan & mode baru di Tahap 3.3):
 *   labelStart/labelEnd, labelCadanganAwal/labelCadanganAkhir, modeSertifikat ('tera' | 'manual_drive'),
 *   leadTechnicianId, supportTechnicianIds[], hospitalName, hospitalCity, scheduledDate, endDate,
 *   targetDevices[] { id, sphItemId?, name, quantity, labelSequenceStart, labelSequenceEnd }
 */
import { BO_UJI, POLA_LABEL, POLA_TANGGAL } from './segel.js';

export interface JadwalBaris {
  id: string;
  deleted_at?: string | null;
  label_awal?: string | null;
  label_akhir?: string | null;
  nama_rs?: string | null;
  kota?: string | null;
  tanggal_mulai?: string | null;
  tanggal_selesai?: string | null;
  data: Record<string, any> | null;
}

export interface TeknisiBaris {
  id: string;
  nama?: string | null;
  user_id: string | null;
  deleted_at?: string | null;
}

/** Push aktif milik jadwal LAIN pada BO yang sama (untuk mendeteksi rentang label bentrok). */
export interface PushLain {
  jadwal_id: string;
  label_awal: string;
  label_akhir: string;
  label_cadangan_awal: string | null;
  label_cadangan_akhir: string | null;
}

export interface AlatPo {
  ref: string;
  nama: string;
  jumlah: number;
  urutAwal: number | null;
  urutAkhir: number | null;
}

export interface BahanPush {
  p_jadwal_id: string;
  p_bo: string;
  p_nama_rs: string;
  p_kota: string | null;
  p_tanggal_mulai: string | null;
  p_tanggal_selesai: string | null;
  p_label_awal: string;
  p_label_akhir: string;
  p_cadangan_awal: string | null;
  p_cadangan_akhir: string | null;
  p_alat_po: AlatPo[];
  p_teknisi_user_ids: string[];
  p_is_test: boolean;
}

export type HasilSusun =
  | { ok: true; bahan: BahanPush; peringatan: string[] }
  | { ok: false; alasan: string };

const urutDari = (label: string) => Number.parseInt(label.slice(4), 10);
const bagianBo = (label: string) => label.slice(0, 3);

const teks = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const tanggal = (v: unknown): string | null => {
  const t = teks(v);
  if (!t) return null;
  const d = t.slice(0, 10);
  return POLA_TANGGAL.test(d) && !Number.isNaN(new Date(d + 'T00:00:00Z').getTime()) ? d : null;
};
const bulat = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 1_000_000 ? v : null);

function rentang(awal: string, akhir: string) {
  return { a: urutDari(awal), b: urutDari(akhir) };
}
const beririsan = (x: { a: number; b: number }, y: { a: number; b: number }) => x.a <= y.b && y.a <= x.b;

export function susunPush(jadwal: JadwalBaris | null, teknisi: TeknisiBaris[], pushLain: PushLain[]): HasilSusun {
  if (!jadwal || jadwal.deleted_at) return { ok: false, alasan: 'Jadwal tidak ditemukan atau sudah dihapus.' };
  const d = jadwal.data || {};

  if (d.modeSertifikat !== 'tera') {
    return { ok: false, alasan: 'Jadwal ini bermode "Manual link Google Drive". Ubah mode sertifikat ke "Terintegrasi Tera SMK" dulu.' };
  }

  // --- label utama ---
  const labelAwal = teks(d.labelStart) ?? teks(jadwal.label_awal);
  const labelAkhir = teks(d.labelEnd) ?? teks(jadwal.label_akhir);
  if (!labelAwal || !labelAkhir || !POLA_LABEL.test(labelAwal) || !POLA_LABEL.test(labelAkhir)) {
    return { ok: false, alasan: 'Rentang label utama belum lengkap atau bukan format BBB.NNNN.' };
  }
  const bo = bagianBo(labelAwal);
  if (bagianBo(labelAkhir) !== bo) return { ok: false, alasan: 'Label awal dan akhir harus memakai nomor BO yang sama.' };
  const utama = rentang(labelAwal, labelAkhir);
  if (utama.a > utama.b) return { ok: false, alasan: 'Label awal lebih besar dari label akhir.' };

  // --- label cadangan (opsional, tapi harus lengkap bila diisi) ---
  const cadAwal = teks(d.labelCadanganAwal);
  const cadAkhir = teks(d.labelCadanganAkhir);
  let cad: { a: number; b: number } | null = null;
  if (cadAwal || cadAkhir) {
    if (!cadAwal || !cadAkhir) return { ok: false, alasan: 'Rentang label cadangan harus diisi awal dan akhirnya, atau dikosongkan semua.' };
    if (!POLA_LABEL.test(cadAwal) || !POLA_LABEL.test(cadAkhir)) return { ok: false, alasan: 'Label cadangan harus berformat BBB.NNNN.' };
    if (bagianBo(cadAwal) !== bo || bagianBo(cadAkhir) !== bo) return { ok: false, alasan: `Label cadangan harus memakai nomor BO yang sama (${bo}).` };
    cad = rentang(cadAwal, cadAkhir);
    if (cad.a > cad.b) return { ok: false, alasan: 'Label cadangan awal lebih besar dari akhir.' };
    if (beririsan(utama, cad)) return { ok: false, alasan: 'Rentang label cadangan tumpang tindih dengan label utama.' };
    if (cad.a < utama.a) return { ok: false, alasan: 'Label cadangan harus berada sesudah label utama.' };
  }

  // --- bentrok dengan jadwal lain pada BO yang sama ---
  for (const p of pushLain) {
    if (p.jadwal_id === jadwal.id || bagianBo(p.label_awal) !== bo) continue;
    const rentangLain = [rentang(p.label_awal, p.label_akhir)];
    if (p.label_cadangan_awal && p.label_cadangan_akhir) rentangLain.push(rentang(p.label_cadangan_awal, p.label_cadangan_akhir));
    for (const r of rentangLain) {
      if (beririsan(utama, r) || (cad && beririsan(cad, r))) {
        return { ok: false, alasan: `Rentang label bentrok dengan jadwal lain yang sudah di-Push (${p.jadwal_id}) pada BO ${bo}.` };
      }
    }
  }

  // --- alat PO ---
  const alatMentah: any[] = Array.isArray(d.targetDevices) ? d.targetDevices : [];
  const alat: AlatPo[] = [];
  for (const a of alatMentah) {
    const nama = teks(a?.name);
    const jumlah = bulat(a?.quantity);
    const ref = teks(a?.sphItemId) ?? teks(a?.id);
    if (!nama || jumlah === null || !ref) continue;
    alat.push({ ref, nama: nama.slice(0, 200), jumlah, urutAwal: bulat(a?.labelSequenceStart), urutAkhir: bulat(a?.labelSequenceEnd) });
  }
  if (alat.length === 0) return { ok: false, alasan: 'Daftar alat PO masih kosong. Isi alat di jadwal sebelum Push.' };

  // --- teknisi yang ditugaskan (utama + pendamping) ---
  const idDiminta = Array.from(new Set([
    teks(d.leadTechnicianId),
    ...(Array.isArray(d.supportTechnicianIds) ? d.supportTechnicianIds.map(teks) : []),
  ].filter((x): x is string => !!x)));
  if (idDiminta.length === 0) return { ok: false, alasan: 'Belum ada teknisi yang ditugaskan di jadwal ini.' };

  const peringatan: string[] = [];
  const userIds: string[] = [];
  for (const id of idDiminta) {
    const t = teknisi.find((x) => x.id === id && !x.deleted_at);
    if (!t) { peringatan.push(`Teknisi ${id} tidak ditemukan di master teknisi, tidak ikut di-Push.`); continue; }
    if (!t.user_id) { peringatan.push(`${t.nama || id} belum punya akun Tera SMK, jadwal tidak muncul di tabletnya.`); continue; }
    if (!userIds.includes(t.user_id)) userIds.push(t.user_id);
  }
  if (userIds.length === 0) return { ok: false, alasan: 'Tidak ada satu pun teknisi yang punya akun Tera SMK. Minta Developer membuat akunnya dulu.' };

  const namaRs = teks(d.hospitalName) ?? teks(jadwal.nama_rs);
  if (!namaRs) return { ok: false, alasan: 'Nama rumah sakit di jadwal kosong.' };

  return {
    ok: true,
    peringatan,
    bahan: {
      p_jadwal_id: jadwal.id,
      p_bo: bo,
      p_nama_rs: namaRs.slice(0, 200),
      p_kota: (teks(d.hospitalCity) ?? teks(jadwal.kota))?.slice(0, 120) ?? null,
      p_tanggal_mulai: tanggal(d.scheduledDate) ?? tanggal(jadwal.tanggal_mulai),
      p_tanggal_selesai: tanggal(d.endDate) ?? tanggal(jadwal.tanggal_selesai),
      p_label_awal: labelAwal,
      p_label_akhir: labelAkhir,
      p_cadangan_awal: cad ? cadAwal : null,
      p_cadangan_akhir: cad ? cadAkhir : null,
      p_alat_po: alat,
      p_teknisi_user_ids: userIds,
      p_is_test: bo === BO_UJI,
    },
  };
}
