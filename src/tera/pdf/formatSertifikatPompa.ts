/**
 * FORMAT SERTIFIKAT POMPA (Infusion Pump; Syringe Pump kelak memakai juru tulis yang sama) — mengubah isi LKK
 * (data, jejak hitung, fotokopi kalibrator) menjadi tulisan di "kertas cetak" Report All (tataLetakPompa.ts).
 * Murni, tidak pernah melempar galat: data yang belum ada menjadi kosong (dicetak "-").
 *
 * Aturan teks (CLAUDE.md 9.1): tanpa "NILAI SEMENTARA", penanda Penyelia, atau nama "Tera SMK".
 * Tanggal (mengikuti Excel, keputusan Ridhwan 26 Okt 2026): Diterbitkan = tanggal penerimaan + 1 hari
 * (bila penerimaan kosong: tanggal terbit dari ACC); Kalibrasi Ulang = tanggal pelaksanaan + 1 tahun.
 */
import type { Isian } from './susunSertifikat.js';
import { hitungLingkungan } from '../shared/lingkungan.js';
import { titikDariSnapshot } from '../shared/jejak.js';
import { bulatExcel } from '../shared/hitung.js';
import { koma, komaBebas, tambahSetahun, tanggalPanjang, type KonteksSertifikat } from './formatSertifikat.js';

type Peta = Record<string, any>;

/** "2026-10-26" → "2026-10-27" (lintas bulan/tahun aman). Tanggal rusak → "". */
export function tambahHari(iso: unknown, hari: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''));
  if (!m) return '';
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + hari));
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

const SEBELUM_KURUNG = (s: unknown) => String(s ?? '').replace(/\s*\(.*$/, '').trim();

/** Satu baris "Standar yang digunakan": nama  Tipe: …  s/n: …  Cert. Number: …  Traceability: … (sama dengan Report All Excel). */
function barisStandar(snap: Peta | null | undefined, nama: string): string {
  if (!snap || typeof snap !== 'object') return '';
  return [
    String(snap.nama ?? nama),
    snap.model ? `Tipe: ${snap.model}` : '',
    snap.nomorSeri ? `s/n: ${snap.nomorSeri}` : '',
    snap.nomorSertifikat ? `Cert. Number: ${snap.nomorSertifikat}` : '',
    snap.tertelusur ? `Traceability: ${SEBELUM_KURUNG(snap.tertelusur)}` : '',
  ].filter(Boolean).join('  ');
}

/** Rentang ukur ditulis teknisi lengkap dengan satuan ("1 - 999 mL/h"); satuan dipisah ke kolomnya sendiri seperti di Excel. */
function pisahSatuan(teks: unknown, satuan: string): { nilai: string; satuan: string } {
  const t = String(teks ?? '').trim();
  const nilai = t.replace(new RegExp(`\\s*${satuan.replace('/', '\\/')}\\s*$`, 'i'), '').trim();
  return { nilai, satuan: nilai ? satuan : '' };
}

export function isianPompa(
  lkk: { data: Peta | null; jejak: Peta | null; snapshot: Peta | null },
  k: KonteksSertifikat,
): Isian {
  const d = (lkk.data ?? {}) as Peta;
  const iden = (d.identitas ?? {}) as Peta;
  const snap = (lkk.snapshot ?? {}) as Peta;
  const hasil = (lkk.jejak?.hasil ?? {}) as Peta;
  const aturan = (lkk.jejak?.aturan ?? {}) as Peta;
  const listrikDef = (aturan.listrik ?? []) as Peta[];
  const aliran = (hasil.aliran?.titik ?? []) as Peta[];
  const sumbat = (hasil.sumbat ?? {}) as Peta;
  const ling = (d.lingkungan ?? {}) as Peta;
  const suhu = hitungLingkungan(titikDariSnapshot(snap.termohigrometer?.suhu), ling.suhuAwal, ling.suhuAkhir, 1);
  const rh = hitungLingkungan(titikDariSnapshot(snap.termohigrometer?.kelembaban), ling.rhAwal, ling.rhAkhir, 0);
  const rentang = pisahSatuan(iden.rentangUkur, 'mL/h');
  const penerimaan = String(iden.tanggalPenerimaan ?? '');

  const s: Isian = {
    nomorOrder: k.bo,
    nomorSertifikat: k.noLabel,
    tanggalTerbit: tanggalPanjang(penerimaan ? tambahHari(penerimaan, 1) : k.tanggalTerbit),
    kalibrasiUlang: tanggalPanjang(tambahSetahun(k.tanggalKalibrasi)),
    namaPelanggan: k.namaRs,
    alamatPelanggan: k.alamatRs,
    namaAlat: k.namaAlat,
    noSeri: String(iden.noSeri ?? ''),
    merek: String(iden.merek ?? ''),
    rentangUkur: rentang.nilai,
    satuanRentang: rentang.satuan,
    tipe: String(iden.tipe ?? ''),
    resolusi: komaBebas(iden.resolusi),
    satuanResolusi: komaBebas(iden.resolusi) ? 'mL/h' : '',
    tanggalPenerimaan: tanggalPanjang(penerimaan),
    penandatanganNama: k.penandatangan.nama,
    penandatanganJabatan: k.penandatangan.jabatan,
    penandatanganJabatanEn: k.penandatangan.jabatanEn,
    kalibrator1: barisStandar(snap.ida, 'Infusion Device Analyzer'),
    kalibrator2: barisStandar(snap.esa, 'Electrical Safety Analyzer'),
    kalibrator3: barisStandar(snap.termohigrometer, 'Digital Thermohygrometer'),
    tempat: k.namaRs,
    tanggalPelaksanaan: tanggalPanjang(k.tanggalKalibrasi),
    ruang: String(iden.ruang ?? ''),
    teknisi: k.teknisi,
    suhuRuang: suhu ? `( ${komaBebas(suhu.terkoreksi, 1)}±${komaBebas(suhu.u95, 2)} )` : '',
    rhRuang: rh ? `( ${komaBebas(rh.terkoreksi, 0)}±${komaBebas(rh.u95, 2)} )` : '',
    // Penyumbatan: setting & bacaan standar
    sumbatSetting: koma(sumbat.setting, 1),
    sumbatStd: koma(sumbat.rataRata, 1),
    sumbatU: koma(sumbat.u95Cetak, 2),
    kesimpulan: String(lkk.jejak?.kesimpulan ?? hasil.kesimpulan ?? ''),
    // Teks tetap "Toleransi Occlusion <20psi" (KMK butir 9.2; hanya dipakai tata letak Infusion — di Excel tertulis "≤20psi")
    tolSumbat: '<20psi',
  };

  // Fisik & fungsi: tiga butir (badan, kontrol, kabel) — urutan = urutan template
  ['badan', 'kontrol', 'kabel'].forEach((id, i) => {
    s[`fisik${i + 1}`] = String(d.fisik?.[id]?.fisik ?? '');
    s[`fungsi${i + 1}`] = String(d.fisik?.[id]?.fungsi ?? '');
  });

  // Keselamatan listrik: nilai TERUKUR (sudah terkoreksi) per uji, urutan template
  for (let i = 0; i < 4; i++) {
    const id = String(listrikDef[i]?.id ?? ['tegangan', 'resistansi_pembumian', 'resistansi_isolasi', 'arus_bocor'][i]);
    s[`listrik${i}`] = komaBebas(hasil.listrik?.[id]?.terukur, 3);
  }

  // Aliran: pembacaan alat (setting), pembacaan standar (rata-rata terkoreksi), koreksi, ketidakpastian
  for (let i = 0; i < 5; i++) {
    const t = aliran[i];
    s[`a${i}_alat`] = komaBebas(t?.setting);
    s[`a${i}_std`] = koma(t?.rataRata, 2);
    s[`a${i}_kor`] = koma(t?.koreksi, 2);
    s[`a${i}_u`] = koma(t?.u95Cetak, 2);
  }
  return s;
}

/**
 * KESELAMATAN LISTRIK (Report All "SERTIFIKAT PENGUJIAN", tataLetakListrik.ts): identitas & lingkungan sama dengan pompa,
 * Nama Alat dari isian teknisi, dua baris standar (ESA, termohigrometer), tabel listrik 5 baris: nilai TERUKUR (terkoreksi)
 * + toleransi menurut klasifikasi alat. Uji yang tidak berlaku (Kelas II: resistansi PE; AP Tidak ada/Tipe B) dicetak "-".
 */
export function isianListrik(
  lkk: { data: Peta | null; jejak: Peta | null; snapshot: Peta | null },
  k: KonteksSertifikat,
): Isian {
  const dasar = isianPompa(lkk, k);
  const d = (lkk.data ?? {}) as Peta;
  const iden = (d.identitas ?? {}) as Peta;
  const snap = (lkk.snapshot ?? {}) as Peta;
  const hasil = (lkk.jejak?.hasil ?? {}) as Peta;
  const listrikDef = ((lkk.jejak?.aturan ?? {}) as Peta).listrik as Peta[] | undefined;
  const ID = ['tegangan', 'resistansi_pembumian', 'resistansi_isolasi', 'arus_bocor_peralatan', 'arus_bocor_ap'];
  const namaAlat = typeof iden.namaAlat === 'string' && iden.namaAlat.trim() ? iden.namaAlat.trim() : k.namaAlat;
  const s: Isian = {
    ...dasar,
    namaAlat,
    kalibrator1: barisStandar(snap.esa, 'Electrical Safety Analyzer'),
    kalibrator2: barisStandar(snap.termohigrometer, 'Digital Thermohygrometer'),
  };
  for (const kunci of ['rentangUkur', 'satuanRentang', 'resolusi', 'satuanResolusi', 'kalibrator3', 'sumbatSetting', 'sumbatStd', 'sumbatU', 'tolSumbat']) delete s[kunci];
  for (const kunci of Object.keys(s)) if (/^a\d_/.test(kunci)) delete s[kunci];
  for (let i = 0; i < 5; i++) {
    const id = String(listrikDef?.[i]?.id ?? ID[i]);
    const h = hasil.listrik?.[id] as Peta | undefined;
    const berlaku = h?.berlaku !== false;
    s[`listrik${i}`] = berlaku ? komaBebas(h?.terukur, 3) : '-';
    s[`tol${i}`] = berlaku ? String(h?.toleransiTeks ?? listrikDef?.[i]?.toleransiTeks ?? '') : '-';
  }
  return s;
}

/**
 * NIBP (Report All NIBP, tataLetakNibp.ts): identitas & lingkungan sama dengan pompa (satuan mmHg), dua baris standar
 * (NIBP Simulator, termohigrometer), tabel NIBP 12 baris: Pembacaan Alat (rata-rata terkoreksi, 0 desimal seperti Excel),
 * Koreksi (2 desimal) dan Ketidakpastian U95 (2 desimal). Titik yang tidak dinilai (bacaan kurang / di luar rentang) dicetak "-".
 * Kolom Diskripsi & Pembacaan Standar adalah teks tetap di kertas cetak (setting template = setting Excel).
 */
export function isianNibp(
  lkk: { data: Peta | null; jejak: Peta | null; snapshot: Peta | null },
  k: KonteksSertifikat,
): Isian {
  const dasar = isianPompa(lkk, k);
  const d = (lkk.data ?? {}) as Peta;
  const iden = (d.identitas ?? {}) as Peta;
  const snap = (lkk.snapshot ?? {}) as Peta;
  const titik = ((lkk.jejak?.hasil ?? {}) as Peta).nibp?.titik as Peta[] | undefined;
  const rentang = pisahSatuan(iden.rentangUkur, 'mmHg');
  const s: Isian = {
    ...dasar,
    rentangUkur: rentang.nilai,
    satuanRentang: rentang.satuan,
    satuanResolusi: komaBebas(iden.resolusi) ? 'mmHg' : '',
    // Nama = nama tampil di master kalibrator (CAL-037 tercetak "NIBP Simulator", lihat teraMasterRoutes nama_tampil)
    kalibrator1: barisStandar(snap.nibp, 'NIBP Simulator'),
    kalibrator2: barisStandar(snap.termohigrometer, 'Digital Thermohygrometer'),
  };
  for (const kunci of ['kalibrator3', 'sumbatSetting', 'sumbatStd', 'sumbatU', 'tolSumbat']) delete s[kunci];
  for (const kunci of Object.keys(s)) if (/^(a\d_|listrik\d)/.test(kunci)) delete s[kunci];
  for (let i = 0; i < 12; i++) {
    const t = titik?.[i];
    const dinilai = !!t && typeof t.rataRata === 'number' && !t.catatan;
    s[`n${i}_alat`] = dinilai ? koma(bulatExcel(t!.pembacaanAlat ?? t!.rataRata, 0), 0) : '-';
    s[`n${i}_kor`] = dinilai ? koma(bulatExcel(t!.koreksi, 2), 2) : '-';
    s[`n${i}_u`] = dinilai ? koma(t!.u95Cetak ?? bulatExcel(t!.u95, 2), 2) : '-';
  }
  return s;
}

/**
 * THERMOHYGROMETER (Report All Thermohygrometer, tataLetakTermohigro.ts; acuan PDF Master_Thermohygrometer.pdf): identitas & lingkungan
 * sama dengan pompa. Satuan Rentang & Resolusi dicetak "%" persis PDF acuan (Excel Input 1!F19). Dua baris standar: Climatic Chamber
 * dan termohigrometer. Dua tabel (suhu s0–s6, kelembaban r0–r6): Pembacaan Alat = titik (teks isian), Pembacaan Standar (1 desimal),
 * Koreksi (2 desimal), Ketidakpastian U95 (1 desimal). Titik yang belum dinilai dicetak "-". Tanpa nilai "Tidak ada MK".
 */
export function isianTermohigro(
  lkk: { data: Peta | null; jejak: Peta | null; snapshot: Peta | null },
  k: KonteksSertifikat,
): Isian {
  const dasar = isianPompa(lkk, k);
  const d = (lkk.data ?? {}) as Peta;
  const iden = (d.identitas ?? {}) as Peta;
  const snap = (lkk.snapshot ?? {}) as Peta;
  const termo = ((lkk.jejak?.hasil ?? {}) as Peta).termo as Peta | undefined;
  const rentang = pisahSatuan(iden.rentangUkur, '%');
  const s: Isian = {
    ...dasar,
    rentangUkur: rentang.nilai,
    satuanRentang: rentang.satuan,
    satuanResolusi: komaBebas(iden.resolusi) ? '%' : '',
    kalibrator1: barisStandar(snap.chamber, 'Climatic Chamber'),
    kalibrator2: barisStandar(snap.termohigrometer, 'Digital Thermohygrometer'),
  };
  for (const kunci of ['kalibrator3', 'sumbatSetting', 'sumbatStd', 'sumbatU', 'tolSumbat']) delete s[kunci];
  for (const kunci of Object.keys(s)) if (/^(a\d_|listrik\d|tol\d)/.test(kunci)) delete s[kunci];
  delete s.fisik3; delete s.fungsi3;
  // Simbol Celsius "°C" (keputusan Ridhwan 27 Okt 2026) menggantikan "0C" di acuan: halaman 2 (Suhu Ruang) & halaman 3 (judul, 4 kolom tabel suhu)
  for (const kunci of ['derajat2', 'derajat3h', 'derajat3_0', 'derajat3_1', 'derajat3_2', 'derajat3u']) s[kunci] = '°C';
  for (const [kode, id] of [['s', 'suhu'], ['r', 'rh']] as const) {
    for (let i = 0; i < 7; i++) {
      const t = (termo?.[id]?.titik as Peta[] | undefined)?.[i];
      const dinilai = !!t && typeof t.rataRata === 'number';
      s[`${kode}${i}_alat`] = typeof t?.setting === 'number' ? komaBebas(t.setting) : '-';
      s[`${kode}${i}_std`] = dinilai ? koma(bulatExcel(t!.pembacaanStandar ?? t!.rataRata, 1), 1) : '-';
      s[`${kode}${i}_kor`] = dinilai ? koma(bulatExcel(t!.koreksi, 2), 2) : '-';
      s[`${kode}${i}_u`] = dinilai ? koma(t!.u95Cetak ?? bulatExcel(t!.u95, 1), 1) : '-';
    }
  }
  return s;
}
