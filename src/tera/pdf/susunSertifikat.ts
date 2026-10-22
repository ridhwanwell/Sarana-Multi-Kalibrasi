/**
 * SUSUN SERTIFIKAT (Tahap 4.5) — "petugas yang menulis isian ke formulir Report All yang sudah tercetak garisnya".
 *
 * Perumpamaan: tata letak (posisi tiap kata & garis, diukur dari PDF acuan Ridhwan) adalah formulir kosong;
 * di sini isian (nama RS, angka hasil, Laik/Tidak Laik) dituliskan ke kotaknya. Murni: tanpa PDF, tanpa font,
 * tanpa jaringan — sehingga bisa diuji cepat. Penggambaran sebenarnya ada di renderSertifikat.ts.
 *
 * Koordinat dalam poin PDF, y diukur dari ATAS halaman (garis dasar teks).
 */
export type Kotak = [number, number, number, number]; // x0, y0, x1, y1 (y dari atas)
export type GayaHuruf = 'r' | 'b' | 'i';
export type Rata = 'l' | 'c' | 'r';

export interface OpTeks {
  /** t = teks tetap, f = isian dari data */
  j: 't' | 'f';
  x: number;
  y: number;
  f: GayaHuruf;
  s: number;
  a?: Rata;
  /** teks tetap (boleh memuat {p} = nomor halaman, {n} = jumlah halaman) */
  t?: string;
  /** kunci isian */
  k?: string;
  /** 1 = garis bawah mengikuti lebar teks (mis. "Laik Pakai") */
  u?: number;
}

export interface TataLetak {
  kode: string;
  halaman: number;
  ukuran: { lebar: number; tinggi: number };
  /** Kotak label berlatar biru (halaman 1) */
  biru: Kotak[];
  /** Garis/kotak hitam per halaman */
  kotak: Record<number, Kotak[]>;
  teks: Record<number, OpTeks[]>;
}

export type Isian = Record<string, string | null | undefined>;

export interface TeksGambar {
  x: number; y: number; huruf: GayaHuruf; ukuran: number; rata: Rata; teks: string; garisBawah: boolean;
  /** true = isian dari data (boleh diperkecil bila kepanjangan); false = teks tetap, tidak pernah diubah */
  isian: boolean;
}
export interface HalamanSusun { nomor: number; biru: Kotak[]; kotak: Kotak[]; teks: TeksGambar[] }

const rapikan = (v: string | null | undefined): string => {
  const s = String(v ?? '').replace(/[\u0000-\u001F\u007F]+/g, ' ').replace(/ {3,}/g, '  ').trim();
  return s === '' ? '-' : s;
};

/** Isi tata letak dengan data. Isian kosong tampil "-" (data belum lengkap tidak boleh membuat galat). */
export function susun(tl: TataLetak, isian: Isian): HalamanSusun[] {
  const hasil: HalamanSusun[] = [];
  for (let p = 1; p <= tl.halaman; p++) {
    const teks: TeksGambar[] = [];
    for (const o of tl.teks[p] ?? []) {
      const isiTeks = o.j === 't'
        ? String(o.t ?? '').split('{p}').join(String(p)).split('{n}').join(String(tl.halaman))
        : rapikan(isian[o.k ?? '']);
      teks.push({ x: o.x, y: o.y, huruf: o.f, ukuran: o.s, rata: o.a ?? 'l', teks: isiTeks, garisBawah: !!o.u, isian: o.j === 'f' });
    }
    hasil.push({ nomor: p, biru: p === 1 ? tl.biru : [], kotak: tl.kotak[p] ?? [], teks });
  }
  return hasil;
}

/** Kunci isian yang dibutuhkan tata letak (untuk pengecekan kelengkapan di tes). */
export function kunciIsian(tl: TataLetak): string[] {
  const s = new Set<string>();
  for (const p of Object.values(tl.teks)) for (const o of p) if (o.j === 'f' && o.k) s.add(o.k);
  return [...s];
}
