/**
 * RENDER BAP & BASTP (Tahap 5) — "mesin cetak": kertas cetak (PDF contoh kantor yang sudah dibersihkan) jadi dasar,
 * aplikasi hanya mencetak isian di posisi yang sama. BAP ditempel di atas KOP SURAT; BASTP memakai kop bawaan kertasnya.
 * Font disuntikkan sebagai byte (Carlito = ukuran identik Calibri). Rangkap (instansi & kantor) dicetak BERURUTAN utuh.
 */
import { PDFDocument, StandardFonts, rgb, PDFName, type PDFFont, type PDFEmbeddedPage } from 'pdf-lib';
import { susunBap, susunBastp, type DataBap, type DataBastp, type Halaman, type Huruf, type NamaTempel } from './susunBapBastp.js';

export interface BahanBapBastp {
  fontR: Uint8Array; fontB: Uint8Array; fontI: Uint8Array;
  kop?: Uint8Array | null;
  templat: Record<NamaTempel, Uint8Array | null>;
}
const UKURAN_MIN = 0.6;
// Batas pengisian ekor (poin dari atas halaman, sistem contoh) — hanya bagian ini diambil dari templat 'ekor'.
const EKOR_ATAS = 440, EKOR_BAWAH = 665;

async function siapkan(bahan: BahanBapBastp) {
  const doc = await PDFDocument.create();
  const fontkit = (await import('@pdf-lib/fontkit')).default;
  doc.registerFontkit(fontkit);
  const opsi = { subset: false, features: { kern: false } } as const; // sama dengan sertifikat: font utuh, tanpa kerning
  const huruf: Record<Huruf, PDFFont> = {
    r: await doc.embedFont(bahan.fontR, opsi), b: await doc.embedFont(bahan.fontB, opsi), i: await doc.embedFont(bahan.fontI, opsi),
    tb: await doc.embedFont(StandardFonts.TimesRomanBold),
  };
  doc.setProducer('PT Sarana Multi Kalibrasi'); doc.setCreator('PT Sarana Multi Kalibrasi');
  return { doc, huruf };
}

export async function tempelan(doc: PDFDocument, bahan: BahanBapBastp, halaman: Halaman[]) {
  const dipakai = new Set<NamaTempel>(halaman.flatMap((h) => h.tempel.map((t) => t.nama)));
  const peta = new Map<NamaTempel, PDFEmbeddedPage>();
  for (const nama of dipakai) {
    const bytes = bahan.templat[nama]; if (!bytes) throw new Error(`Kertas cetak '${nama}' belum tersedia`);
    const src = await PDFDocument.load(bytes); const pg = src.getPage(0); const { width: W, height: H } = pg.getSize();
    peta.set(nama, nama === 'ekor' ? await doc.embedPage(pg, { left: 0, bottom: H - EKOR_BAWAH, right: W, top: H - EKOR_ATAS }) : await doc.embedPage(pg));
  }
  const kop = bahan.kop && halaman.some((h) => h.kop) ? await doc.embedPage((await PDFDocument.load(bahan.kop)).getPage(0)) : null;
  return { peta, kop };
}

/** Gambar halaman ke dokumen yang sudah punya font (dipisah agar bisa diuji dengan font standar, tanpa fontkit). */
export function gambar(doc: PDFDocument, hal: Halaman[], huruf: Record<Huruf, PDFFont>, t: { peta: Map<NamaTempel, PDFEmbeddedPage>; kop: PDFEmbeddedPage | null }, rangkap: number) {
  for (let r = 0; r < rangkap; r++) {
    for (const h of hal) {
      const page = doc.addPage([h.lebar, h.tinggi]);
      page.node.set(PDFName.of('Group'), doc.context.obj({ Type: 'Group', S: 'Transparency', CS: 'DeviceRGB' }));
      if (h.kop && t.kop) page.drawPage(t.kop, { x: 0, y: 0, width: h.lebar, height: h.tinggi });
      for (const tp of h.tempel) {
        const e = t.peta.get(tp.nama)!;
        if (tp.nama === 'ekor') page.drawPage(e, { x: 0, y: h.tinggi - EKOR_BAWAH - tp.dy });
        else page.drawPage(e, { x: 0, y: -tp.dy, width: h.lebar, height: h.tinggi });
      }
      for (const g of h.garis) page.drawRectangle({ x: g.x, y: h.tinggi - g.y - g.h, width: g.w, height: g.h, color: rgb(0, 0, 0) });
      for (const x of h.teks) {
        const font = huruf[x.huruf]; let uk = x.ukuran; let lebar = font.widthOfTextAtSize(x.teks, uk);
        if (x.lebarMaks && lebar > x.lebarMaks) { uk = Math.max(x.ukuran * UKURAN_MIN, uk * (x.lebarMaks / lebar)); lebar = font.widthOfTextAtSize(x.teks, uk); }
        const px = x.rata === 'c' ? x.x - lebar / 2 : x.rata === 'r' ? x.x - lebar : x.x;
        page.drawText(x.teks, { x: px, y: h.tinggi - x.y, size: uk, font, color: x.putih ? rgb(1, 1, 1) : rgb(0, 0, 0) });
      }
    }
  }
}

/** rangkap = jumlah salinan (2 = instansi & kantor); semua halaman salinan 1 dulu, baru salinan 2 (urutan cetak terjaga). */
export async function renderBapPdf(data: DataBap, bahan: BahanBapBastp, rangkap = 2): Promise<Uint8Array> {
  const { doc, huruf } = await siapkan(bahan); doc.setTitle('Berita Acara Pekerjaan');
  const hal = susunBap(data, (s, h, uk) => huruf[h].widthOfTextAtSize(s, uk));
  gambar(doc, hal, huruf, await tempelan(doc, bahan, hal), rangkap);
  return doc.save();
}

export async function renderBastpPdf(data: DataBastp, bahan: BahanBapBastp, rangkap = 2): Promise<Uint8Array> {
  const { doc, huruf } = await siapkan(bahan); doc.setTitle('Berita Acara Kalibrasi');
  const hal = susunBastp(data, (s, h, uk) => huruf[h].widthOfTextAtSize(s, uk));
  gambar(doc, hal, huruf, await tempelan(doc, bahan, hal), rangkap);
  return doc.save();
}
