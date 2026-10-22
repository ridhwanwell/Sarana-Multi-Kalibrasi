/**
 * Tera SMK — API SELIA / PENYELIA (Tahap 4.4b-1, bagian BACA).
 *
 *  GET /api/tera/selia/lkk        -> daftar LKK yang masuk (+ jumlah penanda merah dari pemeriksaan server)
 *  GET /api/tera/selia/lkk/:id    -> satu LKK lengkap: isian, jejak hitung, snapshot kalibrator, hasil pemeriksaan server
 *  POST /api/tera/selia/lkk/:id/kembalikan  -> kembalikan ke teknisi (alasan wajib) — fungsi database tera_kembalikan_lkk
 *  POST /api/tera/selia/lkk/:id/acc         -> ACC (ditolak bila ada penanda merah / belum diperiksa server) — tera_acc_lkk
 *
 * Perumpamaan: meja Penyelia di kantor. Penyelia melihat tumpukan LKK yang sudah diterima loket, tiap lembar
 * diberi stiker penanda hasil periksa ulang petugas loket (4.4a). Penyelia bisa mengembalikan atau meng-ACC.
 *
 * Keamanan: hanya admin_teknik & admin_utama (dicek di server). Nama & ID penyelia diambil dari akun yang login
 * (bukan dari isi kiriman). Perubahan status dilakukan fungsi database yang utuh (kunci baris + riwayat tak bisa diubah).
 */
import type { Express, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { supabaseAdmin } from "./supabaseAdmin.js";
import { requireAuthTera, requireRole } from "../middleware/auth.js";
import type { AuthRequest } from "../middleware/auth.js";
import { POLA_UUID } from "../tera/shared/segel.js";

const BATAS_WAKTU_DB_MS = 15_000;
const PESAN_SIBUK = "Server tidak merespons. Coba lagi sebentar.";
const STATUS_SAH = ['submitted', 'under_review', 'returned', 'approved', 'correction_open'] as const;
const BATAS_DAFTAR = 300;

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

interface RingkasPemeriksaan {
  clientVersion: number;
  jejakCocok: boolean;
  bolehAcc: boolean;
  kesimpulanServer: string | null;
  penanda: { kode: string; teks: string; blokirAcc: boolean }[];
}

const keRingkas = (r: any): RingkasPemeriksaan => ({
  clientVersion: r.client_version,
  jejakCocok: r.jejak_cocok,
  bolehAcc: r.boleh_acc,
  kesimpulanServer: r.kesimpulan_server ?? null,
  penanda: Array.isArray(r.penanda) ? r.penanda : [],
});

export function registerTeraSeliaRoutes(app: Express, deps: { rateLimitKey: (req: any) => string }) {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 400,
    keyGenerator: deps.rateLimitKey,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Terlalu banyak permintaan. Coba lagi beberapa menit lagi." },
  });
  const kantor = [requireAuthTera, wajibSudahGantiSandi, requireRole(['admin_teknik', 'admin_utama'])];

  // --- Daftar -----------------------------------------------------------------
  app.get("/api/tera/selia/lkk", limiter, ...kantor, async (req: AuthRequest, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    if (status && !(STATUS_SAH as readonly string[]).includes(status)) return res.status(400).json({ error: 'Status tidak sah.' });
    const bo = typeof req.query.bo === 'string' ? req.query.bo : '';
    if (bo && !/^[0-9]{3}$/.test(bo)) return res.status(400).json({ error: 'Nomor BO harus 3 angka.' });
    try {
      let q = supabaseAdmin.from('tera_lkk')
        .select('id, bo, no_label, template_kode, template_versi, status, jadwal_id, teknisi_user_id, tanggal_kalibrasi, alat_tambahan, jumlah_titik, client_version, is_test, server_received_at, updated_at')
        .order('server_received_at', { ascending: false })
        .limit(BATAS_DAFTAR);
      if (status) q = q.eq('status', status);
      if (bo) q = q.eq('bo', bo);
      const { data: lkk, error } = await berbatas((s) => q.abortSignal(s));
      if (error) { console.error('[Tera/Selia] daftar:', error.message); return res.status(503).json({ error: PESAN_SIBUK }); }
      const baris = lkk || [];
      const ids = baris.map((r: any) => r.id);
      const jadwalIds = [...new Set(baris.map((r: any) => r.jadwal_id).filter(Boolean))] as string[];
      const teknisiIds = [...new Set(baris.map((r: any) => r.teknisi_user_id).filter(Boolean))] as string[];

      const [pem, push, prof] = await Promise.all([
        ids.length ? berbatas((s) => supabaseAdmin.from('tera_lkk_pemeriksaan').select('lkk_id, client_version, jejak_cocok, boleh_acc, kesimpulan_server, penanda').in('lkk_id', ids).abortSignal(s)) : { data: [], error: null },
        jadwalIds.length ? berbatas((s) => supabaseAdmin.from('tera_jadwal_push').select('jadwal_id, nama_rs').in('jadwal_id', jadwalIds).abortSignal(s)) : { data: [], error: null },
        teknisiIds.length ? berbatas((s) => supabaseAdmin.from('profiles').select('id, full_name').in('id', teknisiIds).abortSignal(s)) : { data: [], error: null },
      ]);
      if (pem.error || push.error || prof.error) {
        console.error('[Tera/Selia] pelengkap daftar:', pem.error?.message, push.error?.message, prof.error?.message);
        return res.status(503).json({ error: PESAN_SIBUK });
      }
      // pemeriksaan = versi terbaru per LKK
      const terbaru = new Map<string, any>();
      for (const p of (pem.data || []) as any[]) {
        const lama = terbaru.get(p.lkk_id);
        if (!lama || p.client_version > lama.client_version) terbaru.set(p.lkk_id, p);
      }
      const namaRs = new Map((push.data || []).map((p: any) => [p.jadwal_id, p.nama_rs]));
      const namaTeknisi = new Map((prof.data || []).map((p: any) => [p.id, p.full_name]));

      return res.json({
        lkk: baris.map((r: any) => {
          const p = terbaru.get(r.id);
          const ringkas = p && p.client_version === r.client_version ? keRingkas(p) : null;   // pemeriksaan harus untuk versi yang sama
          return {
            id: r.id, bo: r.bo, noLabel: r.no_label, templateKode: r.template_kode, templateVersi: r.template_versi,
            status: r.status, namaRs: namaRs.get(r.jadwal_id) ?? null, teknisi: namaTeknisi.get(r.teknisi_user_id) ?? null,
            tanggalKalibrasi: r.tanggal_kalibrasi, alatTambahan: r.alat_tambahan, jumlahTitik: r.jumlah_titik,
            clientVersion: r.client_version, isTest: r.is_test, diterimaAt: r.server_received_at,
            // null = belum/gagal diperiksa server → diperlakukan sebagai belum boleh ACC
            pemeriksaan: ringkas ? { jejakCocok: ringkas.jejakCocok, bolehAcc: ringkas.bolehAcc, kesimpulanServer: ringkas.kesimpulanServer, jumlahPenanda: ringkas.penanda.length } : null,
          };
        }),
        terpotong: baris.length >= BATAS_DAFTAR,
      });
    } catch (e: any) {
      console.error('[Tera/Selia] daftar:', e?.name === 'AbortError' ? 'batas waktu habis' : e?.message);
      return res.status(503).json({ error: PESAN_SIBUK });
    }
  });

  // --- Detail ------------------------------------------------------------------
  app.get("/api/tera/selia/lkk/:id", limiter, ...kantor, async (req: AuthRequest, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const id = String(req.params.id || '').toLowerCase();
    if (!POLA_UUID.test(id)) return res.status(400).json({ error: 'ID LKK tidak sah.' });
    try {
      const { data: r, error } = await berbatas((s) => supabaseAdmin.from('tera_lkk').select('*').eq('id', id).maybeSingle().abortSignal(s));
      if (error) { console.error('[Tera/Selia] detail:', error.message); return res.status(503).json({ error: PESAN_SIBUK }); }
      if (!r) return res.status(404).json({ error: 'LKK tidak ditemukan.' });

      const [pem, push, prof, tpl] = await Promise.all([
        berbatas((s) => supabaseAdmin.from('tera_lkk_pemeriksaan').select('client_version, jejak_cocok, boleh_acc, kesimpulan_server, penanda, diperiksa_at').eq('lkk_id', id).eq('client_version', r.client_version).maybeSingle().abortSignal(s)),
        r.jadwal_id ? berbatas((s) => supabaseAdmin.from('tera_jadwal_push').select('nama_rs, kota').eq('jadwal_id', r.jadwal_id).maybeSingle().abortSignal(s)) : Promise.resolve({ data: null, error: null }),
        berbatas((s) => supabaseAdmin.from('profiles').select('full_name').eq('id', r.teknisi_user_id).maybeSingle().abortSignal(s)),
        berbatas((s) => supabaseAdmin.from('tera_device_templates').select('nama, definition').eq('kode_alat', r.template_kode).eq('versi', r.template_versi).maybeSingle().abortSignal(s)),
      ]);
      if (pem.error || push.error || prof.error || tpl.error) {
        console.error('[Tera/Selia] pelengkap detail:', pem.error?.message, push.error?.message, prof.error?.message, tpl.error?.message);
        return res.status(503).json({ error: PESAN_SIBUK });
      }
      return res.json({
        lkk: {
          id: r.id, bo: r.bo, noLabel: r.no_label, status: r.status, jadwalId: r.jadwal_id, tanggalKalibrasi: r.tanggal_kalibrasi,
          alatTambahan: r.alat_tambahan, jumlahTitik: r.jumlah_titik, clientVersion: r.client_version, isTest: r.is_test,
          checksum: r.checksum, diterimaAt: r.server_received_at,
          templateKode: r.template_kode, templateVersi: r.template_versi, namaAlat: tpl.data?.nama ?? r.template_kode,
          namaRs: push.data?.nama_rs ?? null, kota: push.data?.kota ?? null, teknisi: prof.data?.full_name ?? null,
        },
        data: r.data,
        jejakHitung: r.results,
        calibratorSnapshot: r.calibrator_snapshot,
        template: tpl.data?.definition ?? null,
        pemeriksaan: pem.data ? { ...keRingkas(pem.data), diperiksaAt: (pem.data as any).diperiksa_at } : null,
      });
    } catch (e: any) {
      console.error('[Tera/Selia] detail:', e?.name === 'AbortError' ? 'batas waktu habis' : e?.message);
      return res.status(503).json({ error: PESAN_SIBUK });
    }
  });

  // --- Aksi: kembalikan & ACC -----------------------------------------------------
  const namaPenyelia = async (req: AuthRequest): Promise<string> => {
    const { data } = await berbatas((sg) => supabaseAdmin.from('profiles').select('full_name').eq('id', req.user.id).maybeSingle().abortSignal(sg));
    const n = (data as any)?.full_name;
    return typeof n === 'string' && n.trim() ? n.trim().slice(0, 120) : String(req.user?.email || 'Penyelia').slice(0, 120);
  };

  const jalankanAksi = async (req: AuthRequest, res: Response, fungsi: 'tera_kembalikan_lkk' | 'tera_acc_lkk') => {
    res.setHeader('Cache-Control', 'no-store');
    const id = String(req.params.id || '').toLowerCase();
    if (!POLA_UUID.test(id)) return res.status(400).json({ error: 'ID LKK tidak sah.' });
    const args: Record<string, unknown> = { p_id: id, p_user: req.user.id };
    if (fungsi === 'tera_kembalikan_lkk') {
      const alasan = req.body?.alasan;
      if (typeof alasan !== 'string' || alasan.trim().length < 3) return res.status(400).json({ hasil: 'ditolak', alasan: 'Alasan pengembalian wajib diisi (min. 3 huruf).' });
      if (alasan.length > 1000) return res.status(400).json({ hasil: 'ditolak', alasan: 'Alasan terlalu panjang (maks 1000 huruf).' });
      args.p_alasan = alasan;
    }
    try {
      args.p_nama = await namaPenyelia(req);
      const { data, error } = await berbatas((sg) => supabaseAdmin.rpc(fungsi, args).abortSignal(sg));
      if (error || !data) { console.error(`[Tera/Selia] ${fungsi}:`, error?.message); return res.status(503).json({ error: PESAN_SIBUK }); }
      const h = data as any;
      const ok = ['acc', 'sudah_acc', 'dikembalikan', 'sudah_dikembalikan'].includes(h.hasil);
      return res.status(ok ? 200 : 409).json(h);
    } catch (e: any) {
      console.error(`[Tera/Selia] ${fungsi}:`, e?.name === 'AbortError' ? 'batas waktu habis' : e?.message);
      return res.status(503).json({ error: PESAN_SIBUK });
    }
  };

  app.post("/api/tera/selia/lkk/:id/kembalikan", limiter, ...kantor, (req: AuthRequest, res: Response) => jalankanAksi(req, res, 'tera_kembalikan_lkk'));
  app.post("/api/tera/selia/lkk/:id/acc", limiter, ...kantor, (req: AuthRequest, res: Response) => jalankanAksi(req, res, 'tera_acc_lkk'));
}
