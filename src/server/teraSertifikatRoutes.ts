/**
 * Tera SMK — PDF SERTIFIKAT (Tahap 4.5b).
 *
 *  GET /api/tera/selia/lkk/:id/pdf          -> PDF dari LKK (Selia; ?kop=0 = tanpa kop untuk Drive & komputer)
 *  GET /api/tera/publik/verifikasi/:kode     -> data halaman verifikasi tanda tangan elektronik (publik, ringkas)
 *  GET /api/tera/publik/sertifikat/:kode     -> PDF sertifikat terbit (publik; dibuka dari scan QR stiker & QR TTE)
 *
 * Perumpamaan: mesin cetak di kantor. Kertas dasar = kop resmi (PDF di bucket privat `tera-assets`, DITEMPEL apa adanya,
 * tidak digambar ulang); isi dicetak di atasnya dengan font Carlito (publik, public/tera/fonts). Rute Selia: admin_teknik & admin_utama.
 * Rute publik hanya MEMBACA data ringkas; satu-satunya tulisan = menyimpan lembar asli PDF ke arsip bila belum tersimpan.
 */
import type { Express, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { supabaseAdmin } from "./supabaseAdmin.js";
import { requireAuthTera, requireRole } from "../middleware/auth.js";
import type { AuthRequest } from "../middleware/auth.js";
import { POLA_UUID } from "../tera/shared/segel.js";
import { buatPdfLkk, GalatPdf, pdfAsliSertifikat, sertifikatBerlakuLkk, sertifikatDariKode } from "./teraPdfSertifikat.js";

const BATAS_WAKTU_MS = 15_000;
const BATAS_WAKTU_PUBLIK_MS = 25_000;
const PESAN_SIBUK = "Server tidak merespons. Coba lagi sebentar.";
const POLA_KODE = /^[0-9a-f]{24}$/;

export function registerTeraSertifikatRoutes(app: Express, deps: { rateLimitKey: (req: any) => string }) {
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, keyGenerator: deps.rateLimitKey, standardHeaders: true, legacyHeaders: false,
    message: { error: "Terlalu banyak permintaan. Coba lagi beberapa menit lagi." } });
  // Halaman publik (scan QR stiker & QR tanda tangan): batas per IP, sama longgarnya dengan scan QR lama.
  const limiterPublik = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false,
    message: { error: "Terlalu banyak permintaan, silakan coba lagi dalam satu menit." } });
  const kantor = [requireAuthTera,
    (req: AuthRequest, res: Response, next: NextFunction) => (req.user?.app_metadata?.must_change_password === true ? res.status(403).json({ error: "Ganti kata sandi dulu." }) : next()),
    requireRole(['admin_teknik', 'admin_utama'])];

  // --- Selia: pratinjau (dengan kop) & unduh tanpa kop -----------------------------------------
  app.get("/api/tera/selia/lkk/:id/pdf", limiter, ...kantor, async (req: AuthRequest, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    const id = String(req.params.id || '').toLowerCase();
    if (!POLA_UUID.test(id)) return res.status(400).json({ error: 'ID LKK tidak sah.' });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), BATAS_WAKTU_MS);
    try {
      const { data: st, error } = await supabaseAdmin.from('tera_lkk').select('status').eq('id', id).maybeSingle().abortSignal(ctrl.signal);
      if (error) { console.error('[Tera/PDF] status:', error.message); return res.status(503).json({ error: PESAN_SIBUK }); }
      if (!st) return res.status(404).json({ error: 'LKK tidak ditemukan.' });
      // Sesudah ACC: isi sama dengan sertifikat terbit (tanggal ACC, TTE asli). Sebelum ACC / saat koreksi: TTE CONTOH.
      const sert = (st as any).status === 'approved' ? await sertifikatBerlakuLkk(id, ctrl.signal) : null;
      const denganKop = req.query.kop !== '0';
      const { pdf, nama } = await buatPdfLkk(id, { denganKop, sert, signal: ctrl.signal });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `${denganKop ? 'inline' : 'attachment'}; filename="${nama}.pdf"`);
      return res.status(200).send(Buffer.from(pdf));
    } catch (e: any) {
      if (e instanceof GalatPdf) return res.status(e.status).json({ error: e.message });
      console.error('[Tera/PDF]', e?.name === 'AbortError' ? 'batas waktu habis' : e?.message);
      return res.status(503).json({ error: e?.name === 'AbortError' ? PESAN_SIBUK : 'PDF belum bisa dibuat. Coba lagi; bila berulang hubungi Developer.' });
    } finally { clearTimeout(timer); }
  });

  // --- Publik: data verifikasi tanda tangan elektronik (/verifikasi/<kode>) ---------------------
  app.get("/api/tera/publik/verifikasi/:kode", limiterPublik, async (req, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    const kode = String(req.params.kode || '').toLowerCase();
    if (kode === 'contoh') return res.json({ contoh: true });
    if (!POLA_KODE.test(kode)) return res.status(404).json({ ditemukan: false });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), BATAS_WAKTU_MS);
    try {
      const { data, error } = await supabaseAdmin.rpc('tera_verifikasi_sertifikat', { p_kode: kode }).abortSignal(ctrl.signal);
      if (error) { console.error('[Tera/Verifikasi]', error.message); return res.status(503).json({ error: PESAN_SIBUK }); }
      const d = (data ?? {}) as any;
      if (!d.ditemukan) return res.status(404).json({ ditemukan: false });
      return res.json({ ...d, pdfUrl: `/api/tera/publik/sertifikat/${kode}` });
    } catch (e: any) {
      console.error('[Tera/Verifikasi]', e?.name === 'AbortError' ? 'batas waktu habis' : e?.message);
      return res.status(503).json({ error: PESAN_SIBUK });
    } finally { clearTimeout(timer); }
  });

  // --- Publik: PDF sertifikat terbit (dengan kop). Kode 24 karakter acak → tidak bisa ditebak dari nomor label. ---
  app.get("/api/tera/publik/sertifikat/:kode", limiterPublik, async (req, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    const kode = String(req.params.kode || '').toLowerCase().replace(/\.pdf$/, '');
    if (!POLA_KODE.test(kode)) return res.status(404).type('text/plain').send('Sertifikat tidak ditemukan.');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), BATAS_WAKTU_PUBLIK_MS);
    try {
      const sert = await sertifikatDariKode(kode, ctrl.signal);
      if (!sert) return res.status(404).type('text/plain').send('Sertifikat tidak ditemukan.');
      const { pdf, nama } = await pdfAsliSertifikat(sert, ctrl.signal);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${nama}.pdf"`);
      return res.status(200).send(Buffer.from(pdf));
    } catch (e: any) {
      console.error('[Tera/Publik PDF]', e?.name === 'AbortError' ? 'batas waktu habis' : e?.message);
      return res.status(503).type('text/plain').send('Sertifikat sedang disiapkan. Silakan coba lagi beberapa saat lagi.');
    } finally { clearTimeout(timer); }
  });
}
