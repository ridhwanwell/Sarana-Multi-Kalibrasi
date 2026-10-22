/**
 * Tera SMK — API NILAI KALIBRATOR (halaman "Nilai Kalibrator Tera" di Manajemen Aset).
 *
 *  GET  /api/tera/nilai-kalibrator   -> daftar nilai kalibrator yang aktif + daftar alat kalibrator untuk menambah baru
 *  POST /api/tera/nilai-kalibrator   -> simpan nilai sebagai VERSI BARU (yang lama dinonaktifkan, tidak dihapus)
 *
 * Perumpamaan: lemari sertifikat kalibrator. Isi lembar lama tidak boleh ditimpa; kalau nilainya berubah,
 * dibuat lembar baru dan yang lama diberi cap "tidak dipakai lagi". LKK lama tetap memakai fotokopinya (snapshot).
 *
 * Keamanan: HANYA admin_utama (Developer) — dicek di server. Kunci service role tidak ke browser.
 */
import type { Express, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { supabaseAdmin } from "./supabaseAdmin.js";
import { requireAuthTera, requireRole } from "../middleware/auth.js";
import type { AuthRequest } from "../middleware/auth.js";
import { bacaTitik } from "../tera/shared/nilaiKalibrator.js";

const BATAS_WAKTU_DB_MS = 15_000;
const PESAN_SIBUK = "Server tidak merespons. Coba lagi sebentar.";

const wajibSudahGantiSandi = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.app_metadata?.must_change_password === true) return res.status(403).json({ error: "Ganti kata sandi dulu." });
  return next();
};

async function berbatas<T>(kerja: (sinyal: AbortSignal) => PromiseLike<T>): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), BATAS_WAKTU_DB_MS);
  try { return await kerja(ctrl.signal); } finally { clearTimeout(t); }
}

const teks = (v: unknown, maks: number): string | null => (typeof v === 'string' && v.trim().length <= maks ? v.trim() : null);
const tanggalAtauNull = (v: unknown): string | null | undefined => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  return Number.isNaN(new Date(v + 'T00:00:00Z').getTime()) ? undefined : v;
};

export function registerTeraNilaiKalibratorRoutes(app: Express, deps: { rateLimitKey: (req: any) => string }) {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, max: 200, keyGenerator: deps.rateLimitKey, standardHeaders: true, legacyHeaders: false,
    message: { error: "Terlalu banyak permintaan. Coba lagi beberapa menit lagi." },
  });
  const developer = [requireAuthTera, wajibSudahGantiSandi, requireRole(['admin_utama'])];

  app.get("/api/tera/nilai-kalibrator", limiter, ...developer, async (_req: AuthRequest, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const [rK, rA] = await Promise.all([
        berbatas((s) => supabaseAdmin.from('tera_calibrator_points')
          .select('id, aset_kalibrator_id, parameter, satuan, nomor_sertifikat, tertelusur, tanggal_kalibrasi, berlaku_sampai, points, sumber, diubah_pada')
          .eq('aktif', true).order('aset_kalibrator_id').order('parameter').limit(500).abortSignal(s)),
        berbatas((s) => supabaseAdmin.from('aset_kalibrator')
          .select('id, nama_alat, merk, model, nomor_seri').is('deleted_at', null).order('id').limit(1000).abortSignal(s)),
      ]);
      if (rK.error || rA.error) { console.error('[Tera/NilaiKal] daftar:', rK.error?.message, rA.error?.message); return res.status(503).json({ error: PESAN_SIBUK }); }
      const aset = new Map<string, any>((rA.data || []).map((a: any) => [a.id, a]));
      return res.json({
        nilai: (rK.data || []).map((r: any) => ({
          id: r.id, asetId: r.aset_kalibrator_id, namaAlat: aset.get(r.aset_kalibrator_id)?.nama_alat ?? r.aset_kalibrator_id,
          merk: aset.get(r.aset_kalibrator_id)?.merk ?? null, model: aset.get(r.aset_kalibrator_id)?.model ?? null,
          nomorSeri: aset.get(r.aset_kalibrator_id)?.nomor_seri ?? null,
          parameter: r.parameter, satuan: r.satuan, nomorSertifikat: r.nomor_sertifikat, tertelusur: r.tertelusur,
          tanggalKalibrasi: r.tanggal_kalibrasi, berlakuSampai: r.berlaku_sampai, points: r.points, sumber: r.sumber, diubahPada: r.diubah_pada,
        })),
        alat: (rA.data || []).map((a: any) => ({ id: a.id, nama: a.nama_alat, merk: a.merk, model: a.model })),
      });
    } catch (e: any) {
      console.error('[Tera/NilaiKal] daftar:', e?.name === 'AbortError' ? 'batas waktu habis' : e?.message);
      return res.status(503).json({ error: PESAN_SIBUK });
    }
  });

  app.post("/api/tera/nilai-kalibrator", limiter, ...developer, async (req: AuthRequest, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const b = req.body ?? {};
    const asetId = teks(b.asetId, 60);
    const parameter = teks(b.parameter, 40);
    const satuan = teks(b.satuan, 20);
    const sumber = teks(b.sumber, 500);
    const nomor = teks(b.nomorSertifikat ?? '', 120);
    const tertelusur = teks(b.tertelusur ?? '', 200);
    const tanggal = tanggalAtauNull(b.tanggalKalibrasi);
    const berlaku = tanggalAtauNull(b.berlakuSampai);
    if (!asetId) return res.status(400).json({ hasil: 'ditolak', alasan: 'Pilih alat kalibrator.' });
    if (!parameter || !/^[a-z0-9_]+$/.test(parameter)) return res.status(400).json({ hasil: 'ditolak', alasan: 'Parameter harus huruf kecil/angka/garis bawah.' });
    if (!satuan) return res.status(400).json({ hasil: 'ditolak', alasan: 'Satuan wajib diisi.' });
    if (!sumber || sumber.length < 3) return res.status(400).json({ hasil: 'ditolak', alasan: 'Sumber nilai wajib diisi (mis. nomor sertifikat atau datasheet).' });
    if (nomor === null || tertelusur === null) return res.status(400).json({ hasil: 'ditolak', alasan: 'Nomor sertifikat/ketertelusuran terlalu panjang.' });
    if (tanggal === undefined || berlaku === undefined) return res.status(400).json({ hasil: 'ditolak', alasan: 'Format tanggal tidak sah.' });
    if (tanggal && berlaku && berlaku < tanggal) return res.status(400).json({ hasil: 'ditolak', alasan: 'Tanggal berlaku tidak boleh sebelum tanggal kalibrasi.' });
    const { titik, salah } = bacaTitik(b.points);
    if (!titik) return res.status(400).json({ hasil: 'ditolak', alasan: salah });
    try {
      const { data, error } = await berbatas((s) => supabaseAdmin.rpc('tera_simpan_nilai_kalibrator', {
        p_user: req.user.id, p_aset: asetId, p_parameter: parameter, p_satuan: satuan, p_nomor: nomor, p_tertelusur: tertelusur,
        p_tanggal: tanggal, p_berlaku: berlaku, p_points: titik, p_sumber: sumber,
      }).abortSignal(s));
      if (error || !data) { console.error('[Tera/NilaiKal] simpan:', error?.message); return res.status(503).json({ error: PESAN_SIBUK }); }
      const h = data as any;
      return res.status(h.hasil === 'disimpan' ? 200 : 409).json(h);
    } catch (e: any) {
      console.error('[Tera/NilaiKal] simpan:', e?.name === 'AbortError' ? 'batas waktu habis' : e?.message);
      return res.status(503).json({ error: PESAN_SIBUK });
    }
  });
}
