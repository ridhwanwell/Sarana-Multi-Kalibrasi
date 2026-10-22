/**
 * Tera SMK — PDF SERTIFIKAT (Tahap 4.5b).
 *
 *  GET /api/tera/selia/lkk/:id/pdf  -> PDF Sphygmomanometer dari LKK (pratinjau untuk Penyelia; tanggal terbit = hari ini)
 *
 * Perumpamaan: mesin cetak di kantor. Kertas dasar = kop resmi (PDF di bucket privat `tera-assets`, DITEMPEL apa adanya,
 * tidak digambar ulang); isi dicetak di atasnya dengan font Carlito (publik, public/tera/fonts). Hanya admin_teknik & admin_utama.
 * Tidak mengubah data apa pun (baca saja).
 */
import type { Express, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { supabaseAdmin } from "./supabaseAdmin.js";
import { requireAuthTera, requireRole } from "../middleware/auth.js";
import type { AuthRequest } from "../middleware/auth.js";
import { POLA_UUID } from "../tera/shared/segel.js";
import { renderSertifikatPdf, type BahanPdf } from "../tera/pdf/renderSertifikat.js";
import { TATA_LETAK_SPHYGMOMANOMETER } from "../tera/pdf/tataLetakSphygmo.js";
import { isianSphygmomanometer } from "../tera/pdf/formatSertifikat.js";

const BATAS_WAKTU_MS = 15_000;
const PESAN_SIBUK = "Server tidak merespons. Coba lagi sebentar.";
const BUCKET = 'tera-assets';
const BASE_FONT = 'https://saranamultikalibrasi.com/tera/fonts';
// Sementara (belum ada master tera_signatories): sesuai CLAUDE.md 9.6.
const PENANDATANGAN = { nama: 'Hafizh Pasifianto Utomo, S.Tr.T.', jabatan: 'Manajer Teknik', jabatanEn: 'Technical Manager' };

let fontCache: { r: Uint8Array; b: Uint8Array; i: Uint8Array } | null = null;

async function ambilFont(sinyal: AbortSignal) {
  if (fontCache) return fontCache;
  const muat = async (nama: string) => {
    const r = await fetch(`${BASE_FONT}/${nama}`, { signal: sinyal });
    if (!r.ok) throw new Error(`font ${nama} HTTP ${r.status}`);
    const b = new Uint8Array(await r.arrayBuffer());
    if (b.byteLength < 10_000) throw new Error(`font ${nama} terlalu kecil`);
    return b;
  };
  const [r, b, i] = await Promise.all([muat('Carlito-Regular.ttf'), muat('Carlito-Bold.ttf'), muat('Carlito-Italic.ttf')]);
  fontCache = { r, b, i };
  return fontCache;
}

const hariIniJakarta = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);

export function registerTeraSertifikatRoutes(app: Express, deps: { rateLimitKey: (req: any) => string }) {
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, keyGenerator: deps.rateLimitKey, standardHeaders: true, legacyHeaders: false,
    message: { error: "Terlalu banyak permintaan. Coba lagi beberapa menit lagi." } });
  const kantor = [requireAuthTera,
    (req: AuthRequest, res: Response, next: NextFunction) => (req.user?.app_metadata?.must_change_password === true ? res.status(403).json({ error: "Ganti kata sandi dulu." }) : next()),
    requireRole(['admin_teknik', 'admin_utama'])];

  app.get("/api/tera/selia/lkk/:id/pdf", limiter, ...kantor, async (req: AuthRequest, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    const id = String(req.params.id || '').toLowerCase();
    if (!POLA_UUID.test(id)) return res.status(400).json({ error: 'ID LKK tidak sah.' });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), BATAS_WAKTU_MS);
    try {
      const { data: r, error } = await supabaseAdmin.from('tera_lkk').select('*').eq('id', id).maybeSingle().abortSignal(ctrl.signal);
      if (error) { console.error('[Tera/PDF] lkk:', error.message); return res.status(503).json({ error: PESAN_SIBUK }); }
      if (!r) return res.status(404).json({ error: 'LKK tidak ditemukan.' });
      if (r.template_kode !== 'sphygmomanometer') return res.status(422).json({ error: 'PDF untuk alat ini belum tersedia.' });

      const [push, prof, tpl] = await Promise.all([
        r.jadwal_id ? supabaseAdmin.from('tera_jadwal_push').select('nama_rs, kota').eq('jadwal_id', r.jadwal_id).maybeSingle().abortSignal(ctrl.signal) : Promise.resolve({ data: null, error: null }),
        supabaseAdmin.from('profiles').select('full_name').eq('id', r.teknisi_user_id).maybeSingle().abortSignal(ctrl.signal),
        supabaseAdmin.from('tera_device_templates').select('nama, definition').eq('kode_alat', r.template_kode).eq('versi', r.template_versi).maybeSingle().abortSignal(ctrl.signal),
      ]);
      if (push.error || prof.error || tpl.error) { console.error('[Tera/PDF] pelengkap:', push.error?.message, prof.error?.message, tpl.error?.message); return res.status(503).json({ error: PESAN_SIBUK }); }
      const namaRs = (push.data as any)?.nama_rs ?? '';
      const rs = namaRs
        ? await supabaseAdmin.from('rumah_sakit').select('alamat, kota').eq('nama_rs', namaRs).is('deleted_at', null).limit(1).abortSignal(ctrl.signal)
        : { data: [], error: null };
      const alamat = [(rs.data as any)?.[0]?.alamat, (rs.data as any)?.[0]?.kota ?? (push.data as any)?.kota].filter(Boolean).join(', ');

      // ?kop=0 → versi TANPA kop (salinan Google Drive & komputer). Dengan kop hanya untuk pratinjau Selia & tautan QR.
      const denganKop = req.query.kop !== '0';
      let kopBytes: Uint8Array | null = null;
      if (denganKop) {
        const kopPath = 'kop/KOP_SERTIF_NON_KAN.pdf'; // Sphygmomanometer = Non-KAN (CLAUDE.md 9.5)
        const kop = await supabaseAdmin.storage.from(BUCKET).download(kopPath);
        if (kop.error || !kop.data) {
          console.error('[Tera/PDF] kop:', kop.error?.message);
          return res.status(503).json({ error: 'File kop sertifikat belum ada di penyimpanan (tera-assets/kop). Hubungi Developer.' });
        }
        kopBytes = new Uint8Array(await kop.data.arrayBuffer());
      }
      const font = await ambilFont(ctrl.signal);
      const bahan: BahanPdf = { fontR: font.r, fontB: font.b, fontI: font.i, kop: kopBytes };

      const def = (tpl.data as any)?.definition ?? {};
      const kin = (def.kinerja ?? []).find((k: any) => k.id === 'tekanan') ?? {};
      const uji = (def.ujiAmbang ?? []) as any[];
      const isian = isianSphygmomanometer(
        { data: r.data, jejak: r.results, snapshot: r.calibrator_snapshot },
        {
          bo: r.bo, noLabel: r.no_label, namaAlat: (tpl.data as any)?.nama ?? 'Sphygmomanometer', namaRs, alamatRs: alamat,
          teknisi: (prof.data as any)?.full_name ?? '', tanggalKalibrasi: r.tanggal_kalibrasi, tanggalTerbit: hariIniJakarta(), penandatangan: PENANDATANGAN,
        },
        { toleransiTekanan: Number(kin.toleransi) || 0, ambangBocor: Number(uji.find((u) => u.id === 'bocor')?.batas) || 0, ambangLaju: Number(uji.find((u) => u.id === 'lajuBuang')?.batas) || 0 },
      );
      const pdf = await renderSertifikatPdf(TATA_LETAK_SPHYGMOMANOMETER, isian, bahan);
      res.setHeader('Content-Type', 'application/pdf');
      const nama = `Sertifikat-${String(r.no_label).replace(/[^0-9.]/g, '')}${denganKop ? '' : '-tanpa-kop'}`;
      res.setHeader('Content-Disposition', `${denganKop ? 'inline' : 'attachment'}; filename="${nama}.pdf"`);
      return res.status(200).send(Buffer.from(pdf));
    } catch (e: any) {
      console.error('[Tera/PDF]', e?.name === 'AbortError' ? 'batas waktu habis' : e?.message);
      return res.status(503).json({ error: e?.name === 'AbortError' ? PESAN_SIBUK : 'PDF belum bisa dibuat. Coba lagi; bila berulang hubungi Developer.' });
    } finally { clearTimeout(timer); }
  });
}
