/**
 * Tera SMK — PUSH JADWAL (Tahap 3.2, PRD F2).
 *
 *  POST /api/tera/push            -> kantor: fotokopi jadwal ke tablet teknisi (push ulang = versi naik)
 *  POST /api/tera/push/cabut      -> kantor: tarik jadwal dari tablet (LKK yang ada tidak terhapus)
 *  GET  /api/tera/push-status     -> kantor: status push satu jadwal (untuk tombol di form penjadwalan)
 *  GET  /api/tera/jadwal          -> teknisi: jadwal yang ditugaskan kepadanya (F2.5, dicek di server)
 *
 * Keamanan:
 *  - Push/cabut hanya admin_teknik & admin_utama. Browser hanya mengirim `jadwalId`;
 *    server membaca jadwal, teknisi, dan rentang label sendiri dari database.
 *  - Tarik jadwal: hanya baris yang `teknisi_user_ids`-nya memuat akun yang login.
 *  - Tabel jadwal_kalibrasi hanya DIBACA (select), tidak pernah ditulis.
 */
import type { Express, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { supabaseAdmin } from "./supabaseAdmin.js";
import { requireAuthTera, requireRole } from "../middleware/auth.js";
import type { AuthRequest } from "../middleware/auth.js";
import { susunPush, type PushLain } from "../tera/shared/jadwal.js";

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

const idJadwalSah = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 120 && /^[A-Za-z0-9._-]+$/.test(v);

export function registerTeraJadwalRoutes(app: Express, deps: { rateLimitKey: (req: any) => string }) {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    keyGenerator: deps.rateLimitKey,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Terlalu banyak permintaan. Coba lagi beberapa menit lagi." },
  });
  const kantor = [requireAuthTera, wajibSudahGantiSandi, requireRole(['admin_teknik', 'admin_utama'])];
  const lapangan = [requireAuthTera, wajibSudahGantiSandi, requireRole(['teknisi', 'admin_utama'])];

  // --- Push ke Tera SMK ---------------------------------------------------------
  app.post("/api/tera/push", limiter, ...kantor, async (req: AuthRequest, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const jadwalId = req.body?.jadwalId;
    if (!idJadwalSah(jadwalId)) return res.status(400).json({ error: 'ID jadwal tidak sah.' });
    try {
      const { data: jadwal, error: eJ } = await berbatas((s) =>
        supabaseAdmin.from('jadwal_kalibrasi')
          .select('id, deleted_at, label_awal, label_akhir, nama_rs, kota, tanggal_mulai, tanggal_selesai, data')
          .eq('id', jadwalId).maybeSingle().abortSignal(s));
      if (eJ) { console.error('[Tera] push baca jadwal:', eJ.message); return res.status(503).json({ error: PESAN_SIBUK }); }

      // BO & teknisi dibaca dulu dari jadwal untuk mengambil data pendukungnya; pemeriksaan sebenarnya di susunPush
      const d: any = (jadwal as any)?.data || {};
      const kandidatBo = String(d.labelStart || (jadwal as any)?.label_awal || '').slice(0, 3);
      const idTeknisi: string[] = Array.from(new Set([d.leadTechnicianId, ...(Array.isArray(d.supportTechnicianIds) ? d.supportTechnicianIds : [])]
        .filter((x: unknown): x is string => typeof x === 'string' && x.length > 0)));

      const [rT, rP] = await Promise.all([
        idTeknisi.length
          ? berbatas((s) => supabaseAdmin.from('teknisi').select('id, nama, user_id, deleted_at').in('id', idTeknisi).abortSignal(s))
          : Promise.resolve({ data: [], error: null } as any),
        /^[0-9]{3}$/.test(kandidatBo)
          ? berbatas((s) => supabaseAdmin.from('tera_jadwal_push')
              .select('jadwal_id, label_awal, label_akhir, label_cadangan_awal, label_cadangan_akhir')
              .eq('bo', kandidatBo).neq('jadwal_id', jadwalId).is('dicabut_at', null).abortSignal(s))
          : Promise.resolve({ data: [], error: null } as any),
      ]);
      if (rT.error || rP.error) { console.error('[Tera] push baca teknisi/push:', rT.error?.message || rP.error?.message); return res.status(503).json({ error: PESAN_SIBUK }); }

      const hasil = susunPush(jadwal as any, (rT.data || []) as any, (rP.data || []) as PushLain[]);
      if (!hasil.ok) return res.status(422).json({ hasil: 'ditolak', alasan: hasil.alasan });

      const { data, error } = await berbatas((s) =>
        supabaseAdmin.rpc('tera_push_jadwal', { ...hasil.bahan, p_oleh: req.user.id }).abortSignal(s));
      if (error || !data) {
        console.error('[Tera] tera_push_jadwal gagal:', error?.message);
        return res.status(503).json({ error: PESAN_SIBUK });
      }
      const h = data as any;
      return res.json({
        hasil: h.hasil,
        versi: h.versi,
        jumlahTeknisi: hasil.bahan.p_teknisi_user_ids.length,
        jumlahAlat: hasil.bahan.p_alat_po.length,
        peringatan: hasil.peringatan,
      });
    } catch (err: any) {
      console.error('[Tera] POST /api/tera/push:', err?.name === 'AbortError' ? 'batas waktu habis' : err?.message);
      return res.status(503).json({ error: PESAN_SIBUK });
    }
  });

  // --- Cabut dari tablet -----------------------------------------------------------
  app.post("/api/tera/push/cabut", limiter, ...kantor, async (req: AuthRequest, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const jadwalId = req.body?.jadwalId;
    if (!idJadwalSah(jadwalId)) return res.status(400).json({ error: 'ID jadwal tidak sah.' });
    try {
      const { data, error } = await berbatas((s) =>
        supabaseAdmin.rpc('tera_cabut_jadwal', { p_jadwal_id: jadwalId, p_oleh: req.user.id }).abortSignal(s));
      if (error || !data) { console.error('[Tera] tera_cabut_jadwal gagal:', error?.message); return res.status(503).json({ error: PESAN_SIBUK }); }
      return res.json(data);
    } catch (err: any) {
      console.error('[Tera] POST /api/tera/push/cabut:', err?.message);
      return res.status(503).json({ error: PESAN_SIBUK });
    }
  });

  // --- Status push satu jadwal (kantor) ---------------------------------------------
  app.get("/api/tera/push-status", limiter, ...kantor, async (req: AuthRequest, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const jadwalId = req.query.jadwalId;
    if (!idJadwalSah(jadwalId)) return res.status(400).json({ error: 'ID jadwal tidak sah.' });
    try {
      const { data, error } = await berbatas((s) =>
        supabaseAdmin.from('tera_jadwal_push')
          .select('versi, pushed_at, dicabut_at, teknisi_user_ids')
          .eq('jadwal_id', jadwalId).maybeSingle().abortSignal(s));
      if (error) { console.error('[Tera] push-status:', error.message); return res.status(503).json({ error: PESAN_SIBUK }); }
      if (!data) return res.json({ sudahPush: false });
      return res.json({
        sudahPush: true,
        versi: (data as any).versi,
        pushedAt: (data as any).pushed_at,
        dicabut: !!(data as any).dicabut_at,
        jumlahTeknisi: ((data as any).teknisi_user_ids || []).length,
      });
    } catch (err: any) {
      console.error('[Tera] GET /api/tera/push-status:', err?.message);
      return res.status(503).json({ error: PESAN_SIBUK });
    }
  });

  // --- Tarik jadwal (tablet teknisi) -------------------------------------------------
  app.get("/api/tera/jadwal", limiter, ...lapangan, async (req: AuthRequest, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const { data, error } = await berbatas((s) =>
        supabaseAdmin.from('tera_jadwal_push')
          .select('jadwal_id, bo, nama_rs, kota, tanggal_mulai, tanggal_selesai, label_awal, label_akhir, label_cadangan_awal, label_cadangan_akhir, alat_po, versi, is_test, pushed_at, dicabut_at')
          .contains('teknisi_user_ids', [req.user.id])      // F2.5: hanya yang ditugaskan kepadanya
          .order('pushed_at', { ascending: false })
          .limit(200)
          .abortSignal(s));
      if (error) { console.error('[Tera] GET /api/tera/jadwal:', error.message); return res.status(503).json({ error: PESAN_SIBUK }); }
      return res.json({
        waktuServer: new Date().toISOString(),
        jadwal: (data || []).map((r: any) => ({
          jadwalId: r.jadwal_id,
          bo: r.bo,
          namaRs: r.nama_rs,
          kota: r.kota,
          tanggalMulai: r.tanggal_mulai,
          tanggalSelesai: r.tanggal_selesai,
          labelAwal: r.label_awal,
          labelAkhir: r.label_akhir,
          cadanganAwal: r.label_cadangan_awal,
          cadanganAkhir: r.label_cadangan_akhir,
          alatPo: r.alat_po,
          versi: r.versi,
          isTest: r.is_test,
          pushedAt: r.pushed_at,
          dicabut: !!r.dicabut_at,
        })),
      });
    } catch (err: any) {
      console.error('[Tera] GET /api/tera/jadwal:', err?.message);
      return res.status(503).json({ error: PESAN_SIBUK });
    }
  });
}
