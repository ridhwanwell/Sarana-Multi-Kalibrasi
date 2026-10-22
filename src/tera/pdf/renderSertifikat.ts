/**
 * RENDER SERTIFIKAT (Tahap 4.5) — "mesin cetak": kop resmi jadi kertas dasar, lalu isian & garis dituliskan di atasnya.
 *
 * Kop (PDF resmi) ditempel sebagai LATAR di semua halaman; isi memakai Carlito (ukuran identik Calibri).
 * Font & kop DISUNTIKKAN sebagai byte (tidak dibaca dari disk/jaringan di sini) agar mudah diuji dan aman.
 * Posisi isi tidak digeser demi kop (CLAUDE.md 9.5).
 */
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { susun, type HalamanSusun, type Isian, type TataLetak, type GayaHuruf } from './susunSertifikat.js';

export interface BahanPdf { fontR: Uint8Array; fontB: Uint8Array; fontI: Uint8Array; kop: Uint8Array | null }
export type HurufTerpasang = Record<GayaHuruf, PDFFont>;

/** Batas kanan isi (poin) — sama dengan tepi kanan garis tabel di acuan. Isian yang kepanjangan diperkecil, tidak meluber. */
const BATAS_KANAN = 548.2;
const UKURAN_MIN_PERSEN = 0.75;
const BIRU = rgb(0.2, 0.72, 0.87);

function gambarHalaman(page: PDFPage, h: HalamanSusun, huruf: HurufTerpasang, tinggi: number) {
  for (const [x0, y0, x1, y1] of h.biru) page.drawRectangle({ x: x0, y: tinggi - y1, width: x1 - x0, height: y1 - y0, color: BIRU });
  for (const [x0, y0, x1, y1] of h.kotak) page.drawRectangle({ x: x0, y: tinggi - y1, width: x1 - x0, height: y1 - y0, color: rgb(0, 0, 0) });
  for (const t of h.teks) {
    const font = huruf[t.huruf];
    let ukuran = t.ukuran;
    let lebar = font.widthOfTextAtSize(t.teks, ukuran);
    let x = t.rata === 'r' ? t.x - lebar : t.rata === 'c' ? t.x - lebar / 2 : t.x;
    if (t.isian && t.rata === 'l' && x + lebar > BATAS_KANAN) {
      ukuran = Math.max(t.ukuran * UKURAN_MIN_PERSEN, t.ukuran * ((BATAS_KANAN - x) / lebar));
      lebar = font.widthOfTextAtSize(t.teks, ukuran);
    }
    page.drawText(t.teks, { x, y: tinggi - t.y, size: ukuran, font, color: rgb(0, 0, 0) });
    if (t.garisBawah) page.drawRectangle({ x, y: tinggi - t.y - 1.3, width: lebar, height: 0.72, color: rgb(0, 0, 0) });
  }
}

/** Gambar semua halaman ke dokumen yang sudah punya font (dipisah agar bisa diuji dengan font standar). */
export async function gambarSertifikat(doc: PDFDocument, tl: TataLetak, isian: Isian, huruf: HurufTerpasang, kop: Uint8Array | null): Promise<void> {
  const { lebar, tinggi } = tl.ukuran;
  // kop = null → versi TANPA kop (untuk salinan Google Drive & komputer); isi tetap sama persis.
  const kopHalaman = kop ? (await doc.embedPdf(kop, [0]))[0] : null;
  for (const h of susun(tl, isian)) {
    const page = doc.addPage([lebar, tinggi]);
    if (kopHalaman) page.drawPage(kopHalaman, { x: 0, y: 0, width: lebar, height: tinggi });
    gambarHalaman(page, h, huruf, tinggi);
  }
}

export async function renderSertifikatPdf(tl: TataLetak, isian: Isian, bahan: BahanPdf): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fontkit = (await import('@pdf-lib/fontkit')).default; // dimuat saat dipakai (tes tanpa font tidak memerlukannya)
  doc.registerFontkit(fontkit);
  // kern:false — PDF acuan (Excel) tidak memakai kerning; lebar kata mengikuti acuan.
  const opsi = { subset: true, features: { kern: false } } as const;
  const huruf: HurufTerpasang = {
    r: await doc.embedFont(bahan.fontR, opsi),
    b: await doc.embedFont(bahan.fontB, opsi),
    i: await doc.embedFont(bahan.fontI, opsi),
  };
  doc.setTitle('Sertifikat Kalibrasi');
  doc.setProducer('PT Sarana Multi Kalibrasi');
  doc.setCreator('PT Sarana Multi Kalibrasi');
  await gambarSertifikat(doc, tl, isian, huruf, bahan.kop);
  return doc.save();
}
