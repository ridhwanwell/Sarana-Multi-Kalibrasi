/**
 * FORMAT SERTIFIKAT (Tahap 4.5) — "juru tulis": mengubah isi LKK (data, jejak hitung, fotokopi kalibrator)
 * menjadi tulisan yang dicetak di sertifikat Sphygmomanometer. Murni, tidak pernah melempar galat:
 * data yang belum ada menjadi kosong (dicetak "-").
 *
 * Aturan teks (CLAUDE.md 9.1): TIDAK mencetak "NILAI SEMENTARA", penanda Penyelia, atau nama "Tera SMK".
 */
import type { Isian } from './susunSertifikat.js';
import { hitungLingkungan } from '../shared/lingkungan.js';
import { titikDariSnapshot } from '../shared/jejak.js';

type Peta = Record<string, any>;

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const angka = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** "2026-10-22" (atau ISO lengkap) → "22 Oktober 2026". Tanggal rusak → "". */
export function tanggalPanjang(iso: unknown): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''));
  if (!m) return '';
  const bln = Number(m[2]);
  if (bln < 1 || bln > 12) return '';
  return `${Number(m[3])} ${BULAN[bln - 1]} ${m[1]}`;
}

/** Tambah 12 bulan pada tanggal (29 Feb → 28 Feb). Hasil "YYYY-MM-DD" atau "". */
export function tambahSetahun(iso: unknown): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''));
  if (!m) return '';
  const th = Number(m[1]) + 1, bl = Number(m[2]), hr = Number(m[3]);
  const terakhir = new Date(Date.UTC(th, bl, 0)).getUTCDate();
  return `${th}-${m[2]}-${String(Math.min(hr, terakhir)).padStart(2, '0')}`;
}

/** Angka berkoma Indonesia, desimal tetap (mis. 2 → "0,50"). -0 dirapikan. */
export function koma(n: unknown, desimal: number): string {
  if (!angka(n)) return '';
  const t = n.toFixed(desimal);
  return (Number(t) === 0 ? (0).toFixed(desimal) : t).replace('.', ',');
}
/** Angka berkoma tanpa nol di belakang (50 → "50", 1.5 → "1,5"). */
export function komaBebas(n: unknown, maksDesimal = 3): string {
  if (!angka(n)) return '';
  return String(Number(n.toFixed(maksDesimal))).replace('.', ',');
}

export interface KonteksSertifikat {
  /** Nomor BO */
  bo: string;
  /** Nomor label/sertifikat, mis. "200.0012" */
  noLabel: string;
  namaAlat: string;
  namaRs: string;
  alamatRs: string;
  teknisi: string;
  tanggalKalibrasi: string | null;
  /** Tanggal ACC (tanggal terbit). Null = pratinjau sebelum ACC. */
  tanggalTerbit: string | null;
  penandatangan: { nama: string; jabatan: string; jabatanEn: string };
}

const SEBELUM_KURUNG = (s: unknown) => String(s ?? '').replace(/\s*\(.*$/, '').trim();

function barisKalibrator(snap: Peta | null | undefined, nama: string): string {
  if (!snap || typeof snap !== 'object') return '';
  const bagian = [
    String(snap.nama ?? nama),
    snap.model ? `Type: ${snap.model}` : '',
    snap.nomorSeri ? `s/n: ${snap.nomorSeri}` : '',
    snap.nomorSertifikat ? `Cert. Number: ${snap.nomorSertifikat}` : '',
    snap.tertelusur ? `Traceability: ${SEBELUM_KURUNG(snap.tertelusur)}` : '',
  ].filter(Boolean);
  return bagian.join('  ');
}

function lingkungan(snap: Peta | null | undefined, ling: Peta | undefined) {
  const suhu = hitungLingkungan(titikDariSnapshot(snap?.suhu), ling?.suhuAwal, ling?.suhuAkhir, 1);
  const rh = hitungLingkungan(titikDariSnapshot(snap?.kelembaban), ling?.rhAwal, ling?.rhAkhir, 0);
  return {
    suhuRuang: suhu ? `( ${komaBebas(suhu.terkoreksi, 1)}±${komaBebas(suhu.u95, 2)} )` : '',
    rhRuang: rh ? `( ${komaBebas(rh.terkoreksi, 0)}±${komaBebas(rh.u95, 2)} )` : '',
  };
}

/**
 * Susun isian sertifikat Sphygmomanometer. `lkk` = { data, jejak (kolom results), snapshot (calibrator_snapshot) }.
 * Tabel akurasi bertitik tetap 6 baris (0–250 mmHg) sesuai Report All; baris tanpa data dicetak "-".
 */
export function isianSphygmomanometer(
  lkk: { data: Peta | null; jejak: Peta | null; snapshot: Peta | null },
  k: KonteksSertifikat,
  aturan: { toleransiTekanan: number; ambangBocor: number; ambangLaju: number },
): Isian {
  const d = (lkk.data ?? {}) as Peta;
  const iden = (d.identitas ?? {}) as Peta;
  const snap = (lkk.snapshot ?? {}) as Peta;
  const hasil = (lkk.jejak?.hasil ?? {}) as Peta;
  const kin = (hasil.kinerja?.tekanan?.titik ?? []) as Peta[];
  const uji = (hasil.ujiAmbang ?? {}) as Peta;
  const ling = lingkungan(snap.termohigrometer, d.lingkungan);

  const s: Isian = {
    nomorOrder: k.bo,
    nomorSertifikat: k.noLabel,
    tanggalTerbit: tanggalPanjang(k.tanggalTerbit),
    kalibrasiUlang: tanggalPanjang(tambahSetahun(k.tanggalKalibrasi)),
    namaPelanggan: k.namaRs,
    alamatPelanggan: k.alamatRs,
    namaAlat: k.namaAlat,
    noSeri: String(iden.noSeri ?? ''),
    merek: String(iden.merek ?? ''),
    rentangUkur: komaBebas(iden.rentangUkur),
    satuanRentang: 'mmHg',
    tipe: String(iden.tipe ?? ''),
    resolusi: komaBebas(iden.resolusi),
    tanggalPenerimaan: tanggalPanjang(iden.tanggalPenerimaan),
    penandatanganNama: k.penandatangan.nama,
    penandatanganJabatan: k.penandatangan.jabatan,
    penandatanganJabatanEn: k.penandatangan.jabatanEn,
    kalibrator1: barisKalibrator(snap.tekanan, 'Pressure Meter'),
    kalibrator2: barisKalibrator(snap.stopwatch, 'Stopwatch'),
    kalibrator3: barisKalibrator(snap.termohigrometer, 'Digital Thermohygrometer'),
    tempat: k.namaRs,
    tanggalPelaksanaan: tanggalPanjang(k.tanggalKalibrasi),
    ruang: String(iden.ruang ?? ''),
    teknisi: k.teknisi,
    ...ling,
    fisik1: String(d.fisik?.badan?.fisik ?? ''), fungsi1: String(d.fisik?.badan?.fungsi ?? ''),
    fisik2: String(d.fisik?.level_cairan?.fisik ?? ''), fungsi2: String(d.fisik?.level_cairan?.fungsi ?? ''),
    fisik3: String(d.fisik?.tabung_selang?.fisik ?? ''), fungsi3: String(d.fisik?.tabung_selang?.fungsi ?? ''),
    bocorSetting: '250',
    bocorBacaan: komaBebas(d.bocor?.bacaan),
    bocorSelisih: komaBebas(uji.bocor?.nilaiUkur),
    lajuSetting: '260 mmHg',
    lajuWaktu: komaBebas(angka(d.lajuBuang?.waktu) ? d.lajuBuang.waktu : uji.lajuBuang?.nilaiUkur),
    toleransiAkurasi: `Toleransi Akurasi Tekanan ± ${komaBebas(aturan.toleransiTekanan)} mmHg`,
    kesimpulan: String(lkk.jejak?.kesimpulan ?? hasil.kesimpulan ?? ''),
  };

  // Tabel akurasi: titik 0..250, standar terkoreksi = titik + koreksi, U95 cetak
  [0, 50, 100, 150, 200, 250].forEach((titik, r) => {
    const naik = kin.find((t) => t.titik === titik && t.arah === 'naik');
    const turun = kin.find((t) => t.titik === titik && t.arah === 'turun');
    s[`r${r}_alat`] = String(titik);
    s[`r${r}_stdNaik`] = angka(naik?.koreksi) ? koma(titik + naik!.koreksi, 2) : '';
    s[`r${r}_stdTurun`] = angka(turun?.koreksi) ? koma(titik + turun!.koreksi, 2) : '';
    s[`r${r}_korNaik`] = koma(naik?.koreksi, 2);
    s[`r${r}_korTurun`] = koma(turun?.koreksi, 2);
    s[`r${r}_uNaik`] = komaBebas(naik?.u95Cetak, 2);
    s[`r${r}_uTurun`] = komaBebas(turun?.u95Cetak, 2);
  });
  return s;
}
