/**
 * Tera SMK — API SELIA / PENYELIA (Tahap 4.4b-1, bagian BACA).
 *
 *  GET /api/tera/selia/lkk        -> daftar LKK yang masuk (+ jumlah penanda merah dari pemeriksaan server)
 *  GET /api/tera/selia/lkk/:id    -> satu LKK lengkap: isian, jejak hitung, snapshot kalibrator, hasil pemeriksaan server
 *  POST /api/tera/selia/lkk/:id/kembalikan  -> kembalikan ke teknisi (alasan wajib) — fungsi database tera_kembalikan_lkk
 *  POST /api/tera/selia/lkk/:id/acc         -> ACC (ditolak bila ada penanda merah / belum diperiksa server) — tera_acc_lkk;
 *                                              sesudahnya lembar ASLI PDF (dengan kop) dicetak & disimpan (scan QR membuka ini)
 *  POST /api/tera/selia/lkk/:id/buka-koreksi -> HANYA Developer (admin_utama), alasan wajib — tera_buka_koreksi (revisi naik)
 *  POST /api/tera/selia/lkk/:id/ubah  -> Penyelia menyunting isian (tanpa alasan); server menghitung ulang jejak dengan
 *                                        mesin yang sama, tiap kolom yang berubah dicatat di riwayat — tera_ubah_lkk (0020)
 *  ACC tidak lagi diblokir penanda (keputusan Ridhwan 25 Okt 2026, migrasi 0020).
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
import { GalatPdf, pdfAsliSertifikat, sertifikatBerlakuLkk, sertifikatDariKode } from "./teraPdfSertifikat.js";
import { driveTersambung, kirimKeDrive, waktunyaCobaDrive } from "./teraDrive.js";
import { buatJejakHitung } from "../tera/shared/jejak.js";
import { periksaPaketServer } from "../tera/shared/periksaServer.js";
import type { TemplateAlat } from "../tera/shared/hitung.js";
import type { TemplatePompa } from "../tera/shared/hitungPompa.js";

/** Ratakan isian jadi peta "jalur → nilai" (mis. "identitas.merek", "kinerja.tekanan.50.naik.0"). */
function ratakan(x: unknown, awal = '', keluar: Record<string, unknown> = {}): Record<string, unknown> {
  if (x !== null && typeof x === 'object') {
    const entri = Array.isArray(x) ? x.map((v, i) => [String(i), v] as const) : Object.entries(x as Record<string, unknown>);
    if (entri.length === 0) { if (awal) keluar[awal] = x; return keluar; }
    for (const [k, v] of entri) ratakan(v, awal ? `${awal}.${k}` : k, keluar);
    return keluar;
  }
  if (awal) keluar[awal] = x === undefined ? null : x;
  return keluar;
}
const sama = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const POLA_TGL = /^\d{4}-\d{2}-\d{2}$/;

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
    // ?jadwal=<id> = hanya LKK satu jadwal (dashboard Selia per RS); ?jadwal=__tanpa__ = LKK tanpa jadwal
    const jadwal = typeof req.query.jadwal === 'string' ? req.query.jadwal : '';
    if (jadwal && (jadwal.length > 120 || !/^[A-Za-z0-9._:\-]+$/.test(jadwal))) return res.status(400).json({ error: 'ID jadwal tidak sah.' });
    try {
      let q = supabaseAdmin.from('tera_lkk')
        .select('id, bo, no_label, template_kode, template_versi, status, jadwal_id, teknisi_user_id, tanggal_kalibrasi, alat_tambahan, jumlah_titik, client_version, is_test, server_received_at, updated_at')
        .order('server_received_at', { ascending: false })
        .limit(BATAS_DAFTAR);
      if (status) q = q.eq('status', status);
      if (bo) q = q.eq('bo', bo);
      if (jadwal === '__tanpa__') q = q.is('jadwal_id', null);
      else if (jadwal) q = q.eq('jadwal_id', jadwal);
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
            id: r.id, bo: r.bo, noLabel: r.no_label, templateKode: r.template_kode, templateVersi: r.template_versi, jadwalId: r.jadwal_id ?? null,
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

  // --- Ringkasan per jadwal (Selia Dashboard per RS) ----------------------------
  // Jadwal yang di-Push ke Tera SMK (belum dicabut) + jumlah LKK per status; juga jumlah LKK tanpa jadwal.
  app.get("/api/tera/selia/jadwal", limiter, ...kantor, async (_req: AuthRequest, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const [push, lkk] = await Promise.all([
        berbatas((s) => supabaseAdmin.from('tera_jadwal_push').select('jadwal_id, bo, nama_rs, kota, label_awal, label_akhir, is_test, pushed_at, dicabut_at').is('dicabut_at', null).limit(1000).abortSignal(s)),
        berbatas((s) => supabaseAdmin.from('tera_lkk').select('jadwal_id, status').limit(20000).abortSignal(s)),
      ]);
      if (push.error || lkk.error) { console.error('[Tera/Selia] jadwal:', push.error?.message || lkk.error?.message); return res.status(503).json({ error: PESAN_SIBUK }); }
      type Hitung = { total: number; menunggu: number; dikembalikan: number; acc: number };
      const per = new Map<string, Hitung>();
      for (const r of (lkk.data || []) as any[]) {
        const k = r.jadwal_id ?? '__tanpa__';
        const h = per.get(k) ?? { total: 0, menunggu: 0, dikembalikan: 0, acc: 0 };
        h.total++;
        if (r.status === 'submitted' || r.status === 'under_review' || r.status === 'correction_open') h.menunggu++;
        else if (r.status === 'returned') h.dikembalikan++;
        else if (r.status === 'approved') h.acc++;
        per.set(k, h);
      }
      const kosong: Hitung = { total: 0, menunggu: 0, dikembalikan: 0, acc: 0 };
      return res.json({
        jadwal: ((push.data || []) as any[]).map((p) => ({
          jadwalId: p.jadwal_id, bo: p.bo, namaRs: p.nama_rs, kota: p.kota, labelAwal: p.label_awal, labelAkhir: p.label_akhir,
          isTest: !!p.is_test, pushedAt: p.pushed_at, lkk: per.get(p.jadwal_id) ?? kosong,
        })),
        tanpaJadwal: per.get('__tanpa__') ?? kosong,
      });
    } catch (e: any) {
      console.error('[Tera/Selia] jadwal:', e?.name === 'AbortError' ? 'batas waktu habis' : e?.message);
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

      const [pem, push, prof, tpl, sert] = await Promise.all([
        berbatas((s) => supabaseAdmin.from('tera_lkk_pemeriksaan').select('client_version, jejak_cocok, boleh_acc, kesimpulan_server, penanda, diperiksa_at').eq('lkk_id', id).eq('client_version', r.client_version).maybeSingle().abortSignal(s)),
        r.jadwal_id ? berbatas((s) => supabaseAdmin.from('tera_jadwal_push').select('nama_rs, kota').eq('jadwal_id', r.jadwal_id).maybeSingle().abortSignal(s)) : Promise.resolve({ data: null, error: null }),
        berbatas((s) => supabaseAdmin.from('profiles').select('full_name').eq('id', r.teknisi_user_id).maybeSingle().abortSignal(s)),
        berbatas((s) => supabaseAdmin.from('tera_device_templates').select('nama, definition').eq('kode_alat', r.template_kode).eq('versi', r.template_versi).maybeSingle().abortSignal(s)),
        berbatas((s) => supabaseAdmin.from('tera_sertifikat').select('kode_verifikasi, revisi, status, ditandatangani_at, pdf_path, drive_file_id, drive_status, drive_pesan').eq('lkk_id', id).order('revisi', { ascending: false }).limit(20).abortSignal(s)),
      ]);
      if (pem.error || push.error || prof.error || tpl.error || sert.error) {
        console.error('[Tera/Selia] pelengkap detail:', pem.error?.message, push.error?.message, prof.error?.message, tpl.error?.message);
        return res.status(503).json({ error: PESAN_SIBUK });
      }
      return res.json({
        lkk: {
          id: r.id, bo: r.bo, noLabel: r.no_label, status: r.status, jadwalId: r.jadwal_id, tanggalKalibrasi: r.tanggal_kalibrasi,
          alatTambahan: r.alat_tambahan, jumlahTitik: r.jumlah_titik, clientVersion: r.client_version, isTest: r.is_test,
          checksum: r.checksum, diterimaAt: r.server_received_at,
          templateKode: r.template_kode, templateVersi: r.template_versi, namaAlat: tpl.data?.nama ?? r.template_kode, revisi: r.revisi ?? 0,
          accOlehNama: r.acc_oleh_nama ?? null, accAt: r.acc_at ?? null,
          namaRs: push.data?.nama_rs ?? null, kota: push.data?.kota ?? null, teknisi: prof.data?.full_name ?? null,
        },
        data: r.data,
        jejakHitung: r.results,
        calibratorSnapshot: r.calibrator_snapshot,
        template: tpl.data?.definition ?? null,
        pemeriksaan: pem.data ? { ...keRingkas(pem.data), diperiksaAt: (pem.data as any).diperiksa_at } : null,
        // Sertifikat terbit (tiap revisi). Kode = kunci tautan publik PDF & halaman verifikasi TTE.
        sertifikat: ((sert.data as any[]) ?? []).map((x) => ({
          kode: x.kode_verifikasi, revisi: x.revisi, status: x.status, ditandatanganiAt: x.ditandatangani_at, pdfTersimpan: !!x.pdf_path,
          drive: { status: x.drive_status ?? null, pesan: x.drive_pesan ?? null, url: x.drive_file_id ? `https://drive.google.com/file/d/${x.drive_file_id}/view` : null },
        })),
        driveTersambung: driveTersambung(),
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

  const jalankanAksi = async (req: AuthRequest, res: Response, fungsi: 'tera_kembalikan_lkk' | 'tera_acc_lkk' | 'tera_buka_koreksi') => {
    res.setHeader('Cache-Control', 'no-store');
    const id = String(req.params.id || '').toLowerCase();
    if (!POLA_UUID.test(id)) return res.status(400).json({ error: 'ID LKK tidak sah.' });
    const args: Record<string, unknown> = { p_id: id, p_user: req.user.id };
    if (fungsi === 'tera_buka_koreksi') {
      // "Buka koreksi" HANYA Developer (CLAUDE.md 6) — diperiksa di server, bukan hanya disembunyikan di layar.
      if (req.userRole !== 'admin_utama') return res.status(403).json({ hasil: 'ditolak', alasan: 'Hanya Developer yang boleh membuka koreksi.' });
      const alasan = req.body?.alasan;
      if (typeof alasan !== 'string' || alasan.trim().length < 5) return res.status(400).json({ hasil: 'ditolak', alasan: 'Alasan koreksi wajib diisi (min. 5 huruf).' });
      if (alasan.length > 1000) return res.status(400).json({ hasil: 'ditolak', alasan: 'Alasan terlalu panjang (maks 1000 huruf).' });
      args.p_alasan = alasan;
    }
    if (fungsi === 'tera_kembalikan_lkk') {
      const alasan = req.body?.alasan;
      if (typeof alasan !== 'string' || alasan.trim().length < 3) return res.status(400).json({ hasil: 'ditolak', alasan: 'Alasan pengembalian wajib diisi (min. 3 huruf).' });
      if (alasan.length > 1000) return res.status(400).json({ hasil: 'ditolak', alasan: 'Alasan terlalu panjang (maks 1000 huruf).' });
      args.p_alasan = alasan;
    }
    try {
      args.p_nama = await namaPenyelia(req);
      const { data, error } = await berbatas((sg) => supabaseAdmin.rpc(fungsi, args).abortSignal(sg));
      if (error || !data) {
        console.error(`[Tera/Selia] ${fungsi}:`, error?.message);
        // Galat dari database (bukan sinyal): beri tahu jujur, jangan "server tidak merespons".
        return res.status(error ? 500 : 503).json({ error: error ? 'Database menolak perintah ini. Tidak ada yang berubah — galat sudah tercatat, hubungi Developer.' : PESAN_SIBUK });
      }
      const h = data as any;
      const ok = ['acc', 'sudah_acc', 'dikembalikan', 'sudah_dikembalikan', 'dibuka', 'sudah_dibuka'].includes(h.hasil);
      // Sesudah ACC: cetak lembar ASLI (dengan kop) lalu simpan, supaya scan QR langsung membuka PDF.
      // Gagal mencetak TIDAK membatalkan ACC (dicoba lagi otomatis saat QR dibuka).
      if (h.hasil === 'acc' && typeof h.kodeVerifikasi === 'string') {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 25_000);
        try {
          const sert = await sertifikatDariKode(h.kodeVerifikasi, ctrl.signal);
          if (sert) {
            await pdfAsliSertifikat(sert, ctrl.signal); h.pdfTersimpan = true;
            // Salinan TANPA kop ke Google Drive (gagal tidak membatalkan apa pun; dicoba ulang nanti)
            if (driveTersambung()) {
              const c2 = new AbortController(); const t2 = setTimeout(() => c2.abort(), 20_000);
              try { const d = await kirimKeDrive(sert as any, c2.signal); h.driveStatus = d.status; if (d.pesan) h.drivePesan = d.pesan; }
              finally { clearTimeout(t2); }
            } else h.driveStatus = 'belum_tersambung';
          }
        } catch (e: any) {
          h.pdfTersimpan = false;
          h.pdfPesan = e instanceof GalatPdf ? e.message : 'PDF sertifikat belum tersimpan; akan dibuat otomatis saat QR dibuka.';
          console.error('[Tera/Selia] simpan PDF sesudah ACC:', e?.message);
        } finally { clearTimeout(t); }
      }
      return res.status(ok ? 200 : 409).json(h);
    } catch (e: any) {
      console.error(`[Tera/Selia] ${fungsi}:`, e?.name === 'AbortError' ? 'batas waktu habis' : e?.message);
      return res.status(503).json({ error: PESAN_SIBUK });
    }
  };

  app.post("/api/tera/selia/lkk/:id/kembalikan", limiter, ...kantor, (req: AuthRequest, res: Response) => jalankanAksi(req, res, 'tera_kembalikan_lkk'));
  app.post("/api/tera/selia/lkk/:id/acc", limiter, ...kantor, (req: AuthRequest, res: Response) => jalankanAksi(req, res, 'tera_acc_lkk'));
  // Kirim (ulang) salinan tanpa kop ke Google Drive. ?paksa=1 dari tombol; tanpa paksa mengikuti jeda coba ulang.
  app.post("/api/tera/selia/lkk/:id/drive", limiter, ...kantor, async (req: AuthRequest, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    const id = String(req.params.id || '').toLowerCase();
    if (!POLA_UUID.test(id)) return res.status(400).json({ error: 'ID LKK tidak sah.' });
    if (!driveTersambung()) return res.json({ status: 'belum_tersambung' });
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 30_000);
    try {
      const sert = await sertifikatBerlakuLkk(id, ctrl.signal);
      if (!sert) return res.status(404).json({ error: 'Belum ada sertifikat terbit untuk LKK ini.' });
      if (!waktunyaCobaDrive(sert as any, req.query.paksa === '1')) return res.json({ status: (sert as any).drive_status ?? 'menunggu', dilewati: true });
      return res.json(await kirimKeDrive(sert as any, ctrl.signal));
    } catch (e: any) {
      console.error('[Tera/Drive] rute:', e?.message);
      return res.status(503).json({ error: PESAN_SIBUK });
    } finally { clearTimeout(t); }
  });
  app.post("/api/tera/selia/lkk/:id/buka-koreksi", limiter, ...kantor, (req: AuthRequest, res: Response) => jalankanAksi(req, res, 'tera_buka_koreksi'));
  // --- Penyelia menyunting isian LKK (tanpa alasan; riwayat internal otomatis) -------------------------
  app.post("/api/tera/selia/lkk/:id/ubah", limiter, ...kantor, async (req: AuthRequest, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    const id = String(req.params.id || '').toLowerCase();
    if (!POLA_UUID.test(id)) return res.status(400).json({ error: 'ID LKK tidak sah.' });
    const dataBaru = req.body?.data;
    if (!dataBaru || typeof dataBaru !== 'object' || Array.isArray(dataBaru)) return res.status(400).json({ hasil: 'ditolak', alasan: 'Isian LKK tidak sah.' });
    let ukuran = Infinity; try { ukuran = Buffer.byteLength(JSON.stringify(dataBaru), 'utf8'); } catch { /* tidak sah */ }
    if (ukuran > 1_500_000) return res.status(400).json({ hasil: 'ditolak', alasan: 'Isian terlalu besar.' });
    const tglMasuk = req.body?.tanggalKalibrasi;
    if (tglMasuk !== null && tglMasuk !== undefined && (typeof tglMasuk !== 'string' || !POLA_TGL.test(tglMasuk))) {
      return res.status(400).json({ hasil: 'ditolak', alasan: 'Tanggal kalibrasi tidak sah.' });
    }
    try {
      const { data: r, error } = await berbatas((s) => supabaseAdmin.from('tera_lkk')
        .select('id, bo, status, data, tanggal_kalibrasi, template_kode, template_versi, calibrator_snapshot, client_version, is_test')
        .eq('id', id).maybeSingle().abortSignal(s));
      if (error) { console.error('[Tera/Selia] ubah baca:', error.message); return res.status(503).json({ error: PESAN_SIBUK }); }
      if (!r) return res.status(404).json({ hasil: 'ditolak', alasan: 'LKK tidak ditemukan.' });
      if (!['submitted', 'under_review', 'correction_open'].includes(r.status)) {
        return res.status(409).json({ hasil: 'ditolak', alasan: r.status === 'approved' ? 'LKK sudah ACC dan terkunci. Developer perlu membuka koreksi dulu.' : 'LKK ini tidak bisa diubah sekarang.' });
      }
      const { data: t, error: et } = await berbatas((s) => supabaseAdmin.from('tera_device_templates').select('definition')
        .eq('kode_alat', r.template_kode).eq('versi', r.template_versi).maybeSingle().abortSignal(s));
      if (et) { console.error('[Tera/Selia] ubah template:', et.message); return res.status(503).json({ error: PESAN_SIBUK }); }
      const tpl = (t?.definition ?? null) as TemplateAlat | TemplatePompa | null;
      if (!tpl) return res.status(422).json({ hasil: 'ditolak', alasan: 'Template alat tidak ditemukan di server.' });

      const tanggal = tglMasuk === undefined ? r.tanggal_kalibrasi : (tglMasuk || null);
      // Hitung ulang dengan mesin yang sama (tablet & server) → jejak hitung baru = hasil di sertifikat.
      const jejak = buatJejakHitung(tpl, dataBaru, r.calibrator_snapshot);
      if (!jejak) return res.status(422).json({ hasil: 'ditolak', alasan: 'Isian tidak bisa dihitung. Periksa angkanya.' });

      // Catatan internal: setiap jalur yang berubah (nilai lama → baru).
      const lama = ratakan(r.data ?? {}), baru = ratakan(dataBaru);
      const perubahan: { kolom: string; lama: unknown; baru: unknown }[] = [];
      for (const k of new Set([...Object.keys(lama), ...Object.keys(baru)])) {
        if (!sama(lama[k], baru[k])) perubahan.push({ kolom: k, lama: lama[k] ?? null, baru: baru[k] ?? null });
      }
      if (!sama(r.tanggal_kalibrasi, tanggal)) perubahan.push({ kolom: 'tanggal_kalibrasi', lama: r.tanggal_kalibrasi ?? null, baru: tanggal });
      if (!perubahan.length) return res.json({ hasil: 'tidak_berubah' });

      const nama = await namaPenyelia(req);
      const { data: h, error: er } = await berbatas((sg) => supabaseAdmin.rpc('tera_ubah_lkk', {
        p_id: id, p_user: req.user.id, p_nama: nama, p_data: dataBaru, p_results: jejak, p_tanggal: tanggal, p_perubahan: perubahan,
      }).abortSignal(sg));
      if (er || !h) { console.error('[Tera/Selia] tera_ubah_lkk:', er?.message); return res.status(503).json({ error: PESAN_SIBUK }); }
      if ((h as any).hasil !== 'diubah') return res.status(409).json(h);

      // Hasil periksa server ikut diperbarui (hanya info; tidak memblokir ACC).
      const p = periksaPaketServer(tpl, {
        data: dataBaru, results: jejak, calibratorSnapshot: r.calibrator_snapshot, tanggalKalibrasi: tanggal,
        templateKode: r.template_kode, templateVersi: r.template_versi, isTest: !!r.is_test,
      });
      const { error: ep } = await supabaseAdmin.from('tera_lkk_pemeriksaan').upsert({
        lkk_id: id, client_version: r.client_version, mesin_hitung: p.mesinHitung, jejak_cocok: p.jejakCocok,
        boleh_acc: p.bolehAcc, penanda: p.penanda, kesimpulan_server: p.kesimpulanServer, diperiksa_at: new Date().toISOString(),
      }, { onConflict: 'lkk_id,client_version' });
      if (ep) console.error('[Tera/Selia] pemeriksaan sesudah ubah:', ep.message);

      return res.json({ ...(h as any), kesimpulan: jejak.kesimpulan });
    } catch (e: any) {
      console.error('[Tera/Selia] ubah:', e?.name === 'AbortError' ? 'batas waktu habis' : e?.message);
      return res.status(503).json({ error: PESAN_SIBUK });
    }
  });
}
