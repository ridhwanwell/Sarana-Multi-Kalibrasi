/**
 * Tera SMK — DATA MASTER UNTUK TABLET (Tahap 4.3a, PRD F4.10 · CLAUDE.md 9.3/10).
 *
 *  GET /api/tera/master -> teknisi: template alat yang aktif + titik kalibrator yang aktif
 *
 * Perumpamaan: lemari arsip kantor (resep alat & fotokopi sertifikat kalibrator) yang difotokopi
 * ke tas teknisi supaya bisa dipakai tanpa sinyal. Tablet hanya MEMBACA; perubahan nilai dilakukan
 * Developer di Manajemen Aset SMK (bukan di sini).
 *
 * Keamanan: hanya teknisi & admin_utama yang sudah ganti sandi. Tabel tera_* hanya bisa dibaca
 * server (service_role). Data pelanggan tidak ada di sini.
 */
import type { Express, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { supabaseAdmin } from "./supabaseAdmin.js";
import { requireAuthTera, requireRole } from "../middleware/auth.js";
import type { AuthRequest } from "../middleware/auth.js";

const BATAS_WAKTU_DB_MS = 15_000;
const PESAN_SIBUK = "Server tidak merespons. Coba lagi sebentar.";

const wajibSudahGantiSandi = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.app_metadata?.must_change_password === true) {
    return res.status(403).json({ error: "Ganti kata sandi dulu." });
  }
  return next();
};

async function berbatas<T>(kerja: (sinyal: AbortSignal) => PromiseLike<T>): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), BATAS_WAKTU_DB_MS);
  try { return await kerja(ctrl.signal); } finally { clearTimeout(t); }
}

export function registerTeraMasterRoutes(app: Express, deps: { rateLimitKey: (req: any) => string }) {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    keyGenerator: deps.rateLimitKey,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Terlalu banyak permintaan. Coba lagi beberapa menit lagi." },
  });
  const lapangan = [requireAuthTera, wajibSudahGantiSandi, requireRole(['teknisi', 'admin_utama'])];

  app.get("/api/tera/master", limiter, ...lapangan, async (_req: AuthRequest, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const [rT, rK] = await Promise.all([
        berbatas((s) => supabaseAdmin.from('tera_device_templates')
          .select('kode_alat, versi, definition').eq('aktif', true).limit(500).abortSignal(s)),
        berbatas((s) => supabaseAdmin.from('tera_calibrator_points')
          .select('id, aset_kalibrator_id, parameter, satuan, nomor_sertifikat, tertelusur, tanggal_kalibrasi, berlaku_sampai, points, budget, sumber, diubah_pada, nama_tampil')
          .eq('aktif', true).limit(2000).abortSignal(s)),
      ]);
      if (rT.error || rK.error) {
        console.error('[Tera] GET /api/tera/master:', rT.error?.message || rK.error?.message);
        return res.status(503).json({ error: PESAN_SIBUK });
      }
      const idAset = Array.from(new Set((rK.data || []).map((r: any) => r.aset_kalibrator_id)));
      const rA = idAset.length
        ? await berbatas((s) => supabaseAdmin.from('aset_kalibrator')
            .select('id, kode, nama_alat, merk, model, nomor_seri, deleted_at').in('id', idAset).abortSignal(s))
        : ({ data: [], error: null } as any);
      if (rA.error) {
        console.error('[Tera] GET /api/tera/master aset:', rA.error.message);
        return res.status(503).json({ error: PESAN_SIBUK });
      }
      const aset = new Map<string, any>((rA.data || []).map((a: any) => [a.id, a]));

      return res.json({
        waktuServer: new Date().toISOString(),
        template: (rT.data || []).map((r: any) => ({ kodeAlat: r.kode_alat, versi: r.versi, definition: r.definition })),
        kalibrator: (rK.data || [])
          .filter((r: any) => aset.has(r.aset_kalibrator_id) && !aset.get(r.aset_kalibrator_id).deleted_at)
          .map((r: any) => {
            const a = aset.get(r.aset_kalibrator_id);
            return {
              pointsId: r.id,
              asetId: r.aset_kalibrator_id,
              kode: a.kode,
              // nama_tampil (migrasi 0017): nama yang dicetak di sertifikat bila berbeda dengan nama di Manajemen Aset
              nama: (typeof r.nama_tampil === 'string' && r.nama_tampil.trim()) ? r.nama_tampil.trim() : a.nama_alat,
              merk: a.merk,
              model: a.model,
              nomorSeri: a.nomor_seri,
              parameter: r.parameter,
              satuan: r.satuan,
              nomorSertifikat: r.nomor_sertifikat,
              tertelusur: r.tertelusur,
              tanggalKalibrasi: r.tanggal_kalibrasi,
              berlakuSampai: r.berlaku_sampai,
              points: r.points,
              budget: r.budget,
              sumber: r.sumber,
              diubahPada: r.diubah_pada,
            };
          }),
      });
    } catch (e: any) {
      console.error('[Tera] GET /api/tera/master gagal:', e?.message || e);
      return res.status(503).json({ error: PESAN_SIBUK });
    }
  });
}
