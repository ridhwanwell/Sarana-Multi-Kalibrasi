/**
 * SUSUN BAP & BASTP (Tahap 5) — murni hitungan posisi, tanpa pdf-lib.
 *
 * "Kertas cetak" = PDF contoh kantor yang isiannya sudah dibersihkan (tools/tera/buat_templat_bap_bastp.py).
 * Modul ini hanya menentukan DI MANA tiap isian dicetak (satuan poin, y diukur dari ATAS halaman),
 * memakai ukuran yang diukur langsung dari PDF contoh. TIDAK ada tulisan tambahan di luar PDF contoh.
 */

export type Huruf = 'r' | 'b' | 'i' | 'tb'; // regular, bold, italic, Times Bold (judul nama customer BASTP)
export interface Teks {
  x: number; y: number; teks: string; ukuran: number; huruf: Huruf;
  rata: 'l' | 'c' | 'r'; lebarMaks?: number; putih?: boolean;
}
export interface Kotak { x: number; y: number; w: number; h: number }
export type NamaTempel = 'kepala' | 'ekor' | 'bastp' | 'bastpTanpaRingkasan';
export interface Halaman { lebar: number; tinggi: number; kop: boolean; tempel: { nama: NamaTempel; dy: number }[]; garis: Kotak[]; teks: Teks[] }

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
export const bulanRomawi = (d: Date) => ROMAWI[d.getMonth()];
export const namaHari = (d: Date) => HARI[d.getDay()];
export const namaBulan = (d: Date) => BULAN[d.getMonth()];
/** "25 Oktober 2026" */
export const tanggalPanjang = (d: Date) => `${d.getDate()} ${namaBulan(d)} ${d.getFullYear()}`;
/** "08/09/26" seperti kolom Tanggal Kalibrasi di BASTP contoh */
export const tanggalPendek = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`;

// ───────────────────────── BAP ─────────────────────────
/** Keterangan TIDAK diisi pemanggil: dihitung dari sisa (0 → Selesai, masih ada → Batal). Hanya dua kemungkinan itu. */
export interface BarisBap { nama: string; po: number; realisasi: number; sisa: number }
export const keteranganBap = (sisa: number) => (sisa > 0 ? 'Batal' : 'Selesai');
export interface DataBap {
  nomorBap: string; namaPelanggan: string; nomorPo: string; tanggalPo: string; alamat: string; kota: string;
  baris: BarisBap[];
  /** Tanggal dokumen (= tanggal unduh). null → hari/tanggal/bulan/tahun dibiarkan titik-titik SEMUA (tidak setengah terisi). */
  tanggal: Date | null;
  ketuaTim: string; // nama + gelar (keputusan Ridhwan 25 Okt: BAP juga bergelar) — pakai namaDenganGelar()
}

const A4 = { lebar: 595.2756, tinggi: 841.8898 };
// Ukuran diukur dari PDF contoh BAP (Excel, margin atas 3,3 cm, kop surat di latar): baris 14,4 pt, huruf 11,4 pt.
const BAP = {
  barisTop1: 290.67, barisTop2: 144.03, tinggiBaris: 14.4, batasBawah: 740, tinggiEkor: 205,
  garis: 1.0, kolomX: [34.6, 65.22, 325.9, 380.52, 437.55, 492.18, 565.0], xKiri: 35.6, lebarTabel: 530.4,
  tengahNo: 50.9, xNama: 67.8, tengahAngka: [354.2, 410.0, 465.8], tengahKet: 529.7,
  offNama: 11.0, offAngka: 11.61, ukuran: 11.4, batasKanan: 566, bandTopAsal: 446.5,
  xTeks: 37.2, xNilai: 239.9, tengahJudul: 300.4, tengahKiri: 181.9, tengahKanan: 446.5,
};

/** Bagi baris ke halaman: halaman 1 muat 31, berikutnya 41; blok TOTAL+tanda tangan tidak boleh sendirian. */
export function bagiBarisBap(n: number): { awal: number; jumlah: number; ekor: boolean }[] {
  const mulai = (h: number) => (h === 0 ? BAP.barisTop1 : BAP.barisTop2);
  const cap = (h: number) => Math.floor((BAP.batasBawah - mulai(h)) / BAP.tinggiBaris);
  const muatEkor = (h: number, jml: number) => mulai(h) + jml * BAP.tinggiBaris + BAP.tinggiEkor <= BAP.batasBawah;
  const hasil: { awal: number; jumlah: number; ekor: boolean }[] = [];
  let i = 0, h = 0;
  while (true) {
    const sisa = n - i; const c = cap(h);
    if (sisa <= c && muatEkor(h, sisa)) { hasil.push({ awal: i, jumlah: sisa, ekor: true }); break; }
    let ambil = Math.min(sisa, c);
    if (sisa <= c) ambil = Math.max(1, sisa - 2); // ekor tidak muat: sisakan 2 baris agar TOTAL tidak sendirian
    hasil.push({ awal: i, jumlah: ambil, ekor: false });
    i += ambil; h++;
    if (h > 500) throw new Error('BAP: jumlah baris tidak wajar');
  }
  return hasil;
}

/** Paragraf pembuka, dibungkus per kata agar kalimat TIDAK terpotong di tepi kanan (baris pertama menjorok 4 spasi seperti contoh). */
export function paragrafBap(tgl: Date | null, ukur: (s: string) => number, lebarMaks: number): string[] {
  const hari = tgl ? namaHari(tgl) : '.........', t = tgl ? String(tgl.getDate()) : '...', b = tgl ? namaBulan(tgl) : '....', th = tgl ? String(tgl.getFullYear()) : '....';
  const kata = `Pada Hari Ini ${hari} Tanggal ${t} Bulan ${b} Tahun ${th}, Telah Dilaksanakan Pekerjaan Kalibrasi dan/atau Pengujian Alat-alat Kesehatan pada :`.split(' ');
  const baris: string[] = []; let kini = '    ';
  for (const k of kata) {
    const calon = kini.trim() === '' ? kini + k : `${kini} ${k}`;
    if (kini.trim() !== '' && ukur(calon) > lebarMaks) { baris.push(kini); kini = k; } else kini = calon;
  }
  baris.push(kini);
  return baris;
}

export function susunBap(d: DataBap, ukur: (s: string, huruf: Huruf, ukuran: number) => number): Halaman[] {
  const bagi = bagiBarisBap(d.baris.length);
  const total = d.baris.reduce((a, b) => ({ po: a.po + b.po, re: a.re + b.realisasi, si: a.si + b.sisa }), { po: 0, re: 0, si: 0 });
  const halaman: Halaman[] = [];
  bagi.forEach((bg, h) => {
    const p: Halaman = { ...A4, kop: true, tempel: [], garis: [], teks: [] };
    const T = (t: Teks) => p.teks.push(t);
    let top = BAP.barisTop2;
    if (h === 0) {
      top = BAP.barisTop1;
      p.tempel.push({ nama: 'kepala', dy: 0 });
      T({ x: BAP.tengahJudul, y: 119.03, teks: `NO. : ${d.nomorBap}`, ukuran: BAP.ukuran, huruf: 'b', rata: 'c' });
      paragrafBap(d.tanggal, (s) => ukur(s, 'r', BAP.ukuran), BAP.batasKanan - BAP.xTeks)
        .forEach((l, i) => T({ x: BAP.xTeks, y: 147.83 + i * 14.59, teks: l, ukuran: BAP.ukuran, huruf: 'r', rata: 'l' }));
      const nilai = [d.namaPelanggan, d.nomorPo, d.tanggalPo, d.alamat, d.kota]; const ys = [189.85, 204.25, 218.65, 233.05, 247.45];
      nilai.forEach((v, i) => T({ x: BAP.xNilai, y: ys[i], teks: v, ukuran: BAP.ukuran, huruf: 'r', rata: 'l', lebarMaks: BAP.batasKanan - BAP.xNilai - 2 }));
    }
    // Garis tabel baris (halaman 1: garis atas = bawah header, sudah ada di kertas cetak)
    const n = bg.jumlah, bawah = top + n * BAP.tinggiBaris;
    for (let k = h === 0 ? 1 : 0; k <= n; k++) p.garis.push({ x: BAP.xKiri, y: top + k * BAP.tinggiBaris, w: BAP.lebarTabel, h: BAP.garis });
    if (n > 0) for (const x of BAP.kolomX) p.garis.push({ x, y: top, w: BAP.garis, h: n * BAP.tinggiBaris + BAP.garis });
    for (let k = 0; k < n; k++) {
      const b = d.baris[bg.awal + k]; const y0 = top + k * BAP.tinggiBaris;
      T({ x: BAP.tengahNo, y: y0 + BAP.offAngka, teks: String(bg.awal + k + 1), ukuran: BAP.ukuran, huruf: 'r', rata: 'c' });
      T({ x: BAP.xNama, y: y0 + BAP.offNama, teks: b.nama, ukuran: BAP.ukuran, huruf: 'r', rata: 'l', lebarMaks: BAP.kolomX[2] - BAP.xNama - 2 });
      [b.po, b.realisasi, b.sisa].forEach((v, c) => T({ x: BAP.tengahAngka[c], y: y0 + BAP.offAngka, teks: String(v), ukuran: BAP.ukuran, huruf: 'r', rata: 'c' }));
      T({ x: BAP.tengahKet, y: y0 + BAP.offAngka, teks: keteranganBap(b.sisa), ukuran: BAP.ukuran, huruf: 'r', rata: 'c', lebarMaks: BAP.kolomX[6] - BAP.kolomX[5] - 4 });
    }
    if (bg.ekor) {
      const dy = bawah - BAP.bandTopAsal; // pita TOTAL menempel di garis bawah baris terakhir (seperti contoh)
      p.tempel.push({ nama: 'ekor', dy });
      [total.po, total.re, total.si].forEach((v, c) => T({ x: BAP.tengahAngka[c], y: 461.1 + dy, teks: String(v), ukuran: BAP.ukuran, huruf: 'b', rata: 'c', putih: true }));
      const kota = d.tanggal ? `Surakarta, ${tanggalPanjang(d.tanggal)}` : 'Surakarta, ... ........ ....';
      T({ x: BAP.tengahKanan, y: 518.92 + dy, teks: kota, ukuran: BAP.ukuran, huruf: 'r', rata: 'c' });
      T({ x: BAP.tengahKiri, y: 551.13 + dy, teks: d.namaPelanggan, ukuran: BAP.ukuran, huruf: 'b', rata: 'c', lebarMaks: 250 });
      T({ x: BAP.tengahKanan, y: 642.75 + dy, teks: d.ketuaTim, ukuran: BAP.ukuran, huruf: 'b', rata: 'c', lebarMaks: 200 });
    }
    halaman.push(p);
  });
  return halaman;
}

// ───────────────────────── BASTP ─────────────────────────
export interface BarisBastp { nama: string; merk: string; tipe: string; noSeri: string; petugas: string; tanggal: string; ruangan: string; keterangan: string }
export interface DataBastp {
  noOrder: string; namaCustomer: string; telepon: string; alamat: string;
  ketuaTim: string; // nama + gelar, dicetak di bawah kolom tanda tangan PT SMK
  baris: BarisBastp[]; laikPakai: number; tidakLaik: number;
}
// Ukuran dari CONTOH_BASTP.pdf versi 25 Okt 2026 23.52 (tanpa tanda tangan & tanpa stempel SMK di kolom TTD).
const BASTP = {
  lebar: 841.8898, tinggi: 595.2756, perHalaman: 30, ukuran: 8.16,
  barisY: [197.0, 208.0, 219.5, 230.5, 241.5, 252.5, 262.5, 273.5, 284.5, 295.5, 306.5, 317.5, 328.5, 340.0, 351.0, 362.0, 373.0, 384.0, 395.0, 406.0, 417.0, 428.0, 439.0, 450.0, 461.0, 472.5, 483.5, 494.5, 505.5, 516.5],
  kolomX: [51.73, 73.69, 203.06, 313.24, 385.48, 458.33, 572.32, 650.11, 725.70, 789.78],
  xNilai: 204.9, yNilai: [118.0, 128.5, 140.5, 152.0], jarakAlamat: 10.5, yJudulRs: 106.0, tengahJudul: 418.5, ukuranJudul: 15.0,
  tengahKolomRs: 681.05, yTtd: 175.5, tengahTtd: 475.6, tengahRingkasan: 258.2, yRingkasan: [551.0, 562.5, 573.5], ukuranRingkasan: 7.56,
};

/** Pecah teks ke maksimal `maks` baris menurut lebar (diukur pemanggil lewat fungsi lebar). */
export function bungkusKata(teks: string, lebarMaks: number, ukur: (s: string) => number, maks = 2): string[] {
  const kata = teks.split(/\s+/).filter(Boolean); const baris: string[] = []; let kini = '';
  for (const k of kata) {
    const calon = kini ? `${kini} ${k}` : k;
    if (kini && ukur(calon) > lebarMaks && baris.length < maks - 1) { baris.push(kini); kini = k; } else kini = calon;
  }
  if (kini) baris.push(kini);
  return baris;
}

export function susunBastp(d: DataBastp, ukur: (s: string, huruf: Huruf, ukuran: number) => number): Halaman[] {
  const jml = Math.max(1, Math.ceil(d.baris.length / BASTP.perHalaman));
  const halaman: Halaman[] = [];
  for (let h = 0; h < jml; h++) {
    const terakhir = h === jml - 1;
    const p: Halaman = { lebar: BASTP.lebar, tinggi: BASTP.tinggi, kop: false, tempel: [{ nama: terakhir ? 'bastp' : 'bastpTanpaRingkasan', dy: 0 }], garis: [], teks: [] };
    const T = (t: Teks) => p.teks.push(t);
    const lebarNilai = BASTP.kolomX[4] - BASTP.xNilai - 4;
    T({ x: BASTP.tengahJudul, y: BASTP.yJudulRs, teks: d.namaCustomer, ukuran: BASTP.ukuranJudul, huruf: 'tb', rata: 'c', lebarMaks: 540 });
    T({ x: BASTP.xNilai, y: BASTP.yNilai[0], teks: d.noOrder, ukuran: BASTP.ukuran, huruf: 'r', rata: 'l', lebarMaks: lebarNilai });
    T({ x: BASTP.tengahKolomRs, y: BASTP.yNilai[0], teks: d.namaCustomer, ukuran: BASTP.ukuran, huruf: 'r', rata: 'c', lebarMaks: 210 });
    T({ x: BASTP.xNilai, y: BASTP.yNilai[1], teks: d.namaCustomer, ukuran: BASTP.ukuran, huruf: 'r', rata: 'l', lebarMaks: lebarNilai });
    if (d.telepon) T({ x: BASTP.xNilai, y: BASTP.yNilai[2], teks: d.telepon, ukuran: BASTP.ukuran, huruf: 'r', rata: 'l', lebarMaks: lebarNilai });
    bungkusKata(d.alamat, lebarNilai, (s) => ukur(s, 'r', BASTP.ukuran), 2).forEach((l, i) => T({ x: BASTP.xNilai, y: BASTP.yNilai[3] + i * BASTP.jarakAlamat, teks: l, ukuran: BASTP.ukuran, huruf: 'r', rata: 'l', lebarMaks: lebarNilai }));
    T({ x: BASTP.tengahTtd, y: BASTP.yTtd, teks: d.ketuaTim, ukuran: BASTP.ukuran, huruf: 'r', rata: 'c', lebarMaks: 180 });
    const k = BASTP.kolomX; const tengah = (i: number) => (k[i] + k[i + 1]) / 2; const lebarKol = (i: number) => k[i + 1] - k[i] - 4;
    d.baris.slice(h * BASTP.perHalaman, (h + 1) * BASTP.perHalaman).forEach((b, r) => {
      const y = BASTP.barisY[r];
      const sel = [String(h * BASTP.perHalaman + r + 1), b.nama, b.merk, b.tipe, b.noSeri, b.petugas, b.tanggal, b.ruangan, b.keterangan];
      sel.forEach((t, c) => { if (t) T({ x: tengah(c), y, teks: t, ukuran: BASTP.ukuran, huruf: 'i', rata: 'c', lebarMaks: lebarKol(c) }); });
    });
    if (terakhir) {
      [d.laikPakai, d.tidakLaik, d.laikPakai + d.tidakLaik].forEach((v, i) => T({ x: BASTP.tengahRingkasan, y: BASTP.yRingkasan[i], teks: String(v), ukuran: BASTP.ukuranRingkasan, huruf: 'r', rata: 'c' }));
    }
    halaman.push(p);
  }
  return halaman;
}
