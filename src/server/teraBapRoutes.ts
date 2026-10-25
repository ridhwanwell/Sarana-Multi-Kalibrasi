/**
 * Tera SMK — UNDUH BAP & BASTP (Tahap 5.2).
 *
 *  GET /api/tera/bap/:jadwalId/pdf?jenis=bap|bastp[&rangkap=1|2]
 *    -> PDF BAP (di atas KOP SURAT) atau BASTP, dari jadwal yang sudah di-Push + LKK yang sudah diterima server.
 *       Tanggal dokumen = tanggal unduh (waktu Jakarta). Rangkap bawaan 2 (instansi & kantor), dicetak berurutan.
 *
 * Hak akses: admin_teknik & admin_utama → semua jadwal; teknisi → hanya jadwal yang ditugaskan kepadanya dan belum dicabut.
 * Hanya MEMBACA database (jadwal_kalibrasi, tera_jadwal_push, tera_lkk, tera_device_templates, teknisi, profiles).
 * Data uji (is_test) hanya ikut di BO 999 (dataBapBastp.ts).
 */
import type { Express, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { supabaseAdmin } from "./supabaseAdmin.js";
import { requireAuthTera, requireRole } from "../middleware/auth.js";
import type { AuthRequest } from "../middleware/auth.js";
import { ambilFont, BUCKET_TERA } from "./teraPdfSertifikat.js";
import { renderBapPdf, renderBastpPdf, type BahanBapBastp } from "../tera/pdf/renderBapBastp.js";
import type { NamaTempel } from "../tera/pdf/susunBapBastp.js";
import { susunDataBap, susunDataBastp, type BahanDataBap } from "../tera/shared/dataBapBastp.js";

const BATAS_WAKTU_MS = 20_000;
const PESAN_SIBUK = "Server tidak merespons. Coba lagi sebentar.";
const POLA_JADWAL = /^[A-Za-z0-9._:\-]{1,120}$/;
const BASE_TEMPLAT = 'https://saranamultikalibrasi.com/tera/bap';
const FILE_TEMPLAT: Record<NamaTempel, string> = {
  kepala: 'templat-bap-kepala.pdf', ekor: 'templat-bap-ekor.pdf',
  bastp: 'templat-bastp.pdf', bastpTanpaRingkasan: 'templat-bastp-tanpa-ringkasan.pdf',
};

class Galat extends Error { constructor(public status: number, message: string) { super(message); } }

const wajibSudahGantiSandi = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.app_metadata?.must_change_password === true) return res.status(403).json({ error: "Ganti kata sandi dulu." });
  return next();
};

const templatCache = new Map<string, Uint8Array>();
async function ambilTemplat(nama: string, sinyal: AbortSignal): Promise<Uint8Array> {
  const ada = templatCache.get(nama);
  if (ada) return ada;
  const r = await fetch(`${BASE_TEMPLAT}/${nama}`, { signal: sinyal });
  if (!r.ok) throw new Error(`templat ${nama} HTTP ${r.status}`);
  const b = new Uint8Array(await r.arrayBuffer());
  if (b.byteLength < 10_000 || String.fromCharCode(...b.slice(0, 5)) !== '%PDF-') throw new Error(`templat ${nama} rusak`);
  templatCache.set(nama, b);
  return b;
}

/** Tanggal hari ini menurut waktu Jakarta (WIB), 'YYYY-MM-DD'. */
const hariIniJakarta = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const amanNamaFile = (s: string) => s.replace(/[^A-Za-z0-9 ._-]/g, '').replace(/\s+/g, '_').slice(0, 60);

async function kumpulkanBahan(jadwalId: string, req: AuthRequest, s: AbortSignal): Promise<BahanDataBap> {
  const { data: push, error: ePush } = await supabaseAdmin.from('tera_jadwal_push')
    .select('bo, is_test, alat_po, teknisi_user_ids, dicabut_at').eq('jadwal_id', jadwalId).maybeSingle().abortSignal(s);
  if (ePush) throw new Error(`push: ${ePush.message}`);
  if (!push) throw new Galat(404, 'Jadwal ini belum di-Push ke Tera SMK.');
  if (req.userRole === 'teknisi') {
    const ditugaskan = ((push as any).teknisi_user_ids ?? []).includes(req.user?.id);
    if (!ditugaskan || (push as any).dicabut_at) throw new Galat(403, 'Jadwal ini tidak ditugaskan kepada Anda.');
  }
  const [jadwal, lkk, tpl] = await Promise.all([
    supabaseAdmin.from('jadwal_kalibrasi').select('nama_rs, kota, nomor_po, tanggal_po, nama_teknisi_utama, data')
      .eq('id', jadwalId).is('deleted_at', null).maybeSingle().abortSignal(s),
    supabaseAdmin.from('tera_lkk')
      .select('no_label, status, is_test, alat_tambahan, po_item_ref, template_kode, tanggal_kalibrasi, teknisi_user_id, data, results')
      .eq('jadwal_id', jadwalId).limit(2000).abortSignal(s),
    supabaseAdmin.from('tera_device_templates').select('kode_alat, nama, versi').order('versi', { ascending: true }).abortSignal(s),
  ]);
  if (jadwal.error || lkk.error || tpl.error) throw new Error(`baca: ${jadwal.error?.message ?? lkk.error?.message ?? tpl.error?.message}`);
  if (!jadwal.data) throw new Galat(404, 'Data jadwal tidak ditemukan di Penjadwalan.');
  const baris = (lkk.data ?? []) as any[];
  const ids = [...new Set(baris.map((l) => l.teknisi_user_id).filter(Boolean))] as string[];
  const [tek, prof] = ids.length
    ? await Promise.all([
      supabaseAdmin.from('teknisi').select('user_id, nama').in('user_id', ids).abortSignal(s),
      supabaseAdmin.from('profiles').select('id, full_name').in('id', ids).abortSignal(s),
    ])
    : [{ data: [], error: null }, { data: [], error: null }] as const;
  if (tek.error || prof.error) throw new Error(`teknisi: ${tek.error?.message ?? prof.error?.message}`);
  const namaTeknisi: Record<string, string> = {};
  for (const p of (prof.data ?? []) as any[]) if (p.full_name) namaTeknisi[p.id] = p.full_name;
  for (const t of (tek.data ?? []) as any[]) if (t.nama) namaTeknisi[t.user_id] = t.nama; // master teknisi didahulukan
  const namaTemplate: Record<string, string> = {};
  for (const t of (tpl.data ?? []) as any[]) if (t.nama) namaTemplate[t.kode_alat] = t.nama; // versi tertinggi menang
  return {
    jadwal: jadwal.data as any,
    push: { bo: String((push as any).bo), is_test: !!(push as any).is_test, alat_po: Array.isArray((push as any).alat_po) ? (push as any).alat_po : [] },
    lkk: baris, namaTemplate, namaTeknisi, tanggalUnduh: hariIniJakarta(),
  };
}

export function registerTeraBapRoutes(app: Express, deps: { rateLimitKey: (req: any) => string }) {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, max: 120, keyGenerator: deps.rateLimitKey, standardHeaders: true, legacyHeaders: false,
    message: { error: "Terlalu banyak permintaan. Coba lagi beberapa menit lagi." },
  });
  const boleh = [requireAuthTera, wajibSudahGantiSandi, requireRole(['admin_teknik', 'admin_utama', 'teknisi'])];

  app.get("/api/tera/bap/:jadwalId/pdf", limiter, ...boleh, async (req: AuthRequest, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const jadwalId = String(req.params.jadwalId ?? '');
    const jenis = req.query.jenis === 'bastp' ? 'bastp' : req.query.jenis === 'bap' ? 'bap' : '';
    const rangkap = req.query.rangkap === '1' ? 1 : 2;
    if (!POLA_JADWAL.test(jadwalId)) return res.status(400).json({ error: 'ID jadwal tidak sah.' });
    if (!jenis) return res.status(400).json({ error: 'Pilih jenis dokumen: bap atau bastp.' });
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), BATAS_WAKTU_MS);
    try {
      const bahanData = await kumpulkanBahan(jadwalId, req, ctrl.signal);
      const perlu: NamaTempel[] = jenis === 'bap' ? ['kepala', 'ekor'] : ['bastp', 'bastpTanpaRingkasan'];
      const [font, ...tpl] = await Promise.all([ambilFont(ctrl.signal), ...perlu.map((n) => ambilTemplat(FILE_TEMPLAT[n], ctrl.signal))]);
      const templat = { kepala: null, ekor: null, bastp: null, bastpTanpaRingkasan: null } as Record<NamaTempel, Uint8Array | null>;
      perlu.forEach((n, i) => { templat[n] = tpl[i]; });
      let kop: Uint8Array | null = null;
      if (jenis === 'bap') {
        const k = await supabaseAdmin.storage.from(BUCKET_TERA).download('kop/KOP_SURAT.pdf');
        if (k.error || !k.data) { console.error('[Tera/BAP] kop:', k.error?.message); throw new Galat(503, 'File kop surat belum ada di penyimpanan (tera-assets/kop/KOP_SURAT.pdf). Hubungi Developer.'); }
        kop = new Uint8Array(await k.data.arrayBuffer());
      }
      const bahan: BahanBapBastp = { fontR: font.r, fontB: font.b, fontI: font.i, kop, templat };
      const pdf = jenis === 'bap'
        ? await renderBapPdf(susunDataBap(bahanData), bahan, rangkap)
        : await renderBastpPdf(susunDataBastp(bahanData), bahan, rangkap);
      const rs = amanNamaFile(String(bahanData.jadwal.data?.hospitalName || bahanData.jadwal.nama_rs || 'RS'));
      const nama = `${jenis.toUpperCase()}_${bahanData.push.bo}_${rs}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${nama}"`);
      return res.send(Buffer.from(pdf));
    } catch (err: any) {
      if (err instanceof Galat) return res.status(err.status).json({ error: err.message });
      console.error('[Tera/BAP] unduh:', err?.message);
      return res.status(503).json({ error: ctrl.signal.aborted ? PESAN_SIBUK : 'Dokumen gagal dibuat. Coba lagi; bila berulang hubungi Developer.' });
    } finally {
      clearTimeout(t);
    }
  });
}
