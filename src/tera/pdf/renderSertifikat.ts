/**
 * RENDER SERTIFIKAT (Tahap 4.5) — "mesin cetak": kop resmi jadi kertas dasar, lalu isian & garis dituliskan di atasnya.
 *
 * Kop (PDF resmi) ditempel sebagai LATAR di semua halaman; isi memakai Carlito (ukuran identik Calibri).
 * Font & kop DISUNTIKKAN sebagai byte (tidak dibaca dari disk/jaringan di sini) agar mudah diuji dan aman.
 * Posisi isi tidak digeser demi kop (CLAUDE.md 9.5).
 */
import { PDFDocument, PDFName, rgb, type PDFFont, type PDFPage, type PDFEmbeddedPage, type PDFImage } from 'pdf-lib';
import { LOGO_TTE_LEBAR, LOGO_TTE_TINGGI, LOGO_TTE_PNG_B64, LOGO_TTE_TOPENG_B64 } from './logoTte.js';
import { susun, type HalamanSusun, type Isian, type TataLetak, type GayaHuruf } from './susunSertifikat.js';

/**
 * QR tanda tangan elektronik (TTE) di halaman 1, di ruang kosong atas nama Manajer Teknik. `kotak[baris][kolom]` true = gelap.
 * Disetujui Ridhwan 25 Okt 2026: QR 2,1 cm, logo SMK (tanpa latar) di tengah selebar 42 % QR, kotak QR merapat ke bentuk
 * logo (hanya kotak yang tertimpa logo + celah tipis yang dikosongkan; QR memakai koreksi galat tingkat H / 30 %).
 * Tanpa tulisan di samping QR; sebelum ACC hanya "TTE CONTOH".
 */
export interface Tte { kotak: boolean[][]; contoh: boolean }
// Ruang kosong antara "Disetujui oleh, / Approved by" (y 605) dan nama (y 680) — posisi isi lain TIDAK digeser.
const QR_X = 45, QR_Y_ATAS = 610, QR_UKURAN = 60, QR_TEPI = 1;
const LOGO_PERSEN = 0.42, CELAH_KOTAK = 0.35;

const dariB64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
let topengLogo: Uint8Array | null = null;
const titikLogo = (x: number, y: number) => {
  topengLogo ??= dariB64(LOGO_TTE_TOPENG_B64);
  const i = y * LOGO_TTE_LEBAR + x;
  return ((topengLogo[i >> 3] >> (7 - (i & 7))) & 1) === 1;
};

/** Ukuran & letak logo di dalam QR (poin, dari kiri-atas area kotak). */
function letakLogo() {
  const d = QR_UKURAN - 2 * QR_TEPI;
  const lebar = LOGO_PERSEN * d, tinggi = lebar * LOGO_TTE_TINGGI / LOGO_TTE_LEBAR;
  return { d, lebar, tinggi, x0: (d - lebar) / 2, y0: (d - tinggi) / 2 };
}

/** true bila kotak (baris r, kolom c) tertimpa logo (diperlebar celah tipis) → dikosongkan. */
function tertimpaLogo(r: number, c: number, n: number): boolean {
  const L = letakLogo(); const sel = L.d / n; const k = LOGO_TTE_LEBAR / L.lebar; // titik logo per poin
  const bx0 = (c - CELAH_KOTAK) * sel, bx1 = (c + 1 + CELAH_KOTAK) * sel;
  const by0 = (r - CELAH_KOTAK) * sel, by1 = (r + 1 + CELAH_KOTAK) * sel;
  const px0 = Math.max(0, Math.floor((bx0 - L.x0) * k)), px1 = Math.min(LOGO_TTE_LEBAR - 1, Math.ceil((bx1 - L.x0) * k) - 1);
  const py0 = Math.max(0, Math.floor((by0 - L.y0) * k)), py1 = Math.min(LOGO_TTE_TINGGI - 1, Math.ceil((by1 - L.y0) * k) - 1);
  for (let y = py0; y <= py1; y++) for (let x = px0; x <= px1; x++) if (titikLogo(x, y)) return true;
  return false;
}

function gambarTte(page: PDFPage, tte: Tte, huruf: HurufTerpasang, tinggi: number, logo: PDFImage | null) {
  const n = tte.kotak.length;
  if (n === 0) return;
  const L = letakLogo(); const sel = L.d / n;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (!tte.kotak[r][c] || (logo && tertimpaLogo(r, c, n))) continue;
    page.drawRectangle({ x: QR_X + QR_TEPI + c * sel, y: tinggi - (QR_Y_ATAS + QR_TEPI + (r + 1) * sel), width: sel + 0.02, height: sel + 0.02, color: rgb(0, 0, 0) });
  }
  if (logo) {
    page.drawImage(logo, { x: QR_X + QR_TEPI + L.x0, y: tinggi - (QR_Y_ATAS + QR_TEPI + L.y0 + L.tinggi), width: L.lebar, height: L.tinggi });
  }
  if (tte.contoh) page.drawText('TTE CONTOH', { x: QR_X + QR_UKURAN + 6, y: tinggi - (QR_Y_ATAS + QR_UKURAN / 2 + 3), size: 9.96, font: huruf.b, color: rgb(0, 0, 0) });
}

/**
 * templat = "kertas cetak" Report All dari Excel (PDF cetakan Ridhwan, teks isian & latar putih sel sudah dihapus —
 * tools/tera/buat_templat_sertifikat.py). Bila ada, SEMUA teks tetap, garis, dan kotak biru diambil dari templat apa adanya;
 * aplikasi hanya mencetak isian dari LKK. Tanpa templat → cara lama (teks tetap digambar dari tata letak; dipakai tes).
 */
export interface BahanPdf { fontR: Uint8Array; fontB: Uint8Array; fontI: Uint8Array; kop: Uint8Array | null; templat?: Uint8Array | null }
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
/** Grup transparansi: tanpa ini sebagian penampil (iPhone) tidak menghormati transparansi gambar watermark kop → kotak abu-abu. */
function grupTransparan(doc: PDFDocument) {
  return doc.context.obj({ Type: 'Group', S: 'Transparency', CS: 'DeviceRGB' });
}

export async function gambarSertifikat(doc: PDFDocument, tl: TataLetak, isian: Isian, huruf: HurufTerpasang, kop: Uint8Array | null, tte?: Tte | null, templat?: Uint8Array | null): Promise<PDFEmbeddedPage[]> {
  const { lebar, tinggi } = tl.ukuran;
  // kop = null → versi TANPA kop (untuk salinan Google Drive & komputer); isi tetap sama persis.
  const kopHalaman = kop ? (await doc.embedPdf(kop, [0]))[0] : null;
  const templatHalaman = templat ? await doc.embedPdf(templat, Array.from({ length: tl.halaman }, (_, i) => i)) : null;
  const logo = tte ? await doc.embedPng(dariB64(LOGO_TTE_PNG_B64)) : null;
  for (const h of susun(tl, isian)) {
    const page = doc.addPage([lebar, tinggi]);
    page.node.set(PDFName.of('Group'), grupTransparan(doc));
    if (kopHalaman) page.drawPage(kopHalaman, { x: 0, y: 0, width: lebar, height: tinggi });
    if (templatHalaman) {
      // Teks tetap, garis & kotak biru = templat Excel; aplikasi hanya mencetak isian.
      page.drawPage(templatHalaman[h.nomor - 1], { x: 0, y: 0, width: lebar, height: tinggi });
      gambarHalaman(page, { ...h, biru: [], kotak: [], teks: h.teks.filter((t) => t.isian) }, huruf, tinggi);
    } else {
      gambarHalaman(page, h, huruf, tinggi);
    }
    if (tte && h.nomor === 1) gambarTte(page, tte, huruf, tinggi, logo);
  }
  return [kopHalaman, ...(templatHalaman ?? [])].filter((x): x is PDFEmbeddedPage => !!x);
}

export async function renderSertifikatPdf(tl: TataLetak, isian: Isian, bahan: BahanPdf, tte?: Tte | null): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fontkit = (await import('@pdf-lib/fontkit')).default; // dimuat saat dipakai (tes tanpa font tidak memerlukannya)
  doc.registerFontkit(fontkit);
  // kern:false — PDF acuan (Excel) tidak memakai kerning; lebar kata mengikuti acuan.
  // subset:false — pemotongan font (subset) fontkit membuat sebagian huruf hilang di iPhone/Acrobat; font dipasang utuh.
  const opsi = { subset: false, features: { kern: false } } as const;
  const huruf: HurufTerpasang = {
    r: await doc.embedFont(bahan.fontR, opsi),
    b: await doc.embedFont(bahan.fontB, opsi),
    i: await doc.embedFont(bahan.fontI, opsi),
  };
  doc.setTitle('Sertifikat Kalibrasi');
  doc.setProducer('PT Sarana Multi Kalibrasi');
  doc.setCreator('PT Sarana Multi Kalibrasi');
  const tempelan = await gambarSertifikat(doc, tl, isian, huruf, bahan.kop, tte, bahan.templat ?? null);
  // Halaman tempelan (kop, templat) juga diberi grup transparansi (lihat grupTransparan)
  try {
    await doc.flush();
    for (const e of tempelan) {
      const xo: any = doc.context.lookup(e.ref);
      xo?.dict?.set(PDFName.of('Group'), grupTransparan(doc));
    }
  } catch { /* tidak wajib: tanpa ini PDF tetap sah */ }
  return doc.save();
}
