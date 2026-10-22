/**
 * API SINKRON TERA SMK (Tahap 2.2)
 * ------------------------------------------------------------------
 * Perumpamaan: loket arsip kantor. Perangkat teknisi mengirim "paket tercatat" (1 LKK utuh
 * + segel). Loket menghitung ulang segel, menyimpan lewat fungsi database
 * `tera_terima_lkk` (utuh atau tidak sama sekali), lalu memberi TANDA TERIMA.
 *
 *  POST /api/tera/lkk     -> terima 1 LKK "Selesai" (balas tanda terima / alasan ditolak)
 *  POST /api/tera/draft   -> simpan cadangan draft (belum Selesai; tidak masuk Selia)
 *  GET  /api/tera/lkk     -> tarik turun status LKK milik sendiri yang berubah (?sejak=ISO)
 *  POST /api/tera/log     -> catat error/macet dari perangkat
 *
 * Keamanan:
 *  - Hanya role `teknisi` & `admin_utama` (Lampiran A: "Isi LKK baru").
 *  - Pemilik LKK = akun yang login (dari token), TIDAK PERNAH dari isi kiriman.
 *  - Akun yang masih wajib ganti kata sandi ditolak.
 *  - is_test ditentukan server: BO 999 selalu data uji.
 *  - Segel & jumlah titik dihitung ulang di server dengan kode yang sama dengan perangkat.
 *  - Setiap panggilan database punya batas waktu 15 detik (perangkat memakai 20 detik).
 */
import type { Express, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { supabaseAdmin } from "./supabaseAdmin.js";
import { requireAuthTera, requireRole } from "../middleware/auth.js";
import type { AuthRequest } from "../middleware/auth.js";
import {
  segelLkk, segelDraft, SegelError, BO_UJI,
  POLA_UUID, POLA_BO, POLA_LABEL, POLA_TANGGAL, POLA_CHECKSUM,
  type PaketLkk, type PaketDraft,
} from "../tera/shared/segel.js";
import { periksaPaketServer } from "../tera/shared/periksaServer.js";
import type { TemplateAlat } from "../tera/shared/hitung.js";

const ROLE_ISI_LKK = ['teknisi', 'admin_utama'] as const;
const BATAS_DATA_BYTE = 1_500_000;      // 1 LKK (isian + hasil + snapshot) maks ±1,5 MB
const BATAS_DRAFT_BYTE = 1_000_000;
const BATAS_WAKTU_DB_MS = 15_000;

export interface TeraSyncDeps {
  /** Batas umum dibuat di app.ts (dikunci per token login). */
  rateLimitKey: (req: any) => string;
}

// ---------------------------------------------------------------------------
// Fungsi bantu
// ---------------------------------------------------------------------------

/** Tolak akun yang masih memegang segel "wajib ganti kata sandi". */
const wajibSudahGantiSandi = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.app_metadata?.must_change_password === true) {
    return res.status(403).json({ error: "Ganti kata sandi dulu sebelum mengirim LKK." });
  }
  return next();
};

const objekBiasa = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const teksAtauNull = (v: unknown, maks: number): string | null | undefined => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v !== 'string' || v.length > maks) return undefined;   // undefined = tidak sah
  return v;
};

const bilBulatPositif = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v > 0 && v < 1_000_000;

const ukuranJson = (v: unknown): number => {
  try { return Buffer.byteLength(JSON.stringify(v) ?? '', 'utf8'); } catch { return Infinity; }
};

const tanggalAtauNull = (v: unknown): string | null | undefined => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v !== 'string' || !POLA_TANGGAL.test(v)) return undefined;
  const d = new Date(v + 'T00:00:00Z');
  return Number.isNaN(d.getTime()) ? undefined : v;
};

const waktuAtauNull = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

/** Ubah isi kiriman menjadi PaketLkk yang sah, atau kembalikan pesan kesalahan. */
function bacaPaketLkk(b: any): { paket?: PaketLkk; salah?: string } {
  if (!objekBiasa(b)) return { salah: 'Isi kiriman kosong.' };
  if (typeof b.id !== 'string' || !POLA_UUID.test(b.id)) return { salah: 'ID LKK tidak sah.' };
  if (typeof b.bo !== 'string' || !POLA_BO.test(b.bo)) return { salah: 'Nomor BO harus 3 angka.' };
  if (typeof b.noLabel !== 'string' || !POLA_LABEL.test(b.noLabel)) return { salah: 'Nomor label harus format BBB.NNNN.' };
  if (b.noLabel.slice(0, 3) !== b.bo) return { salah: 'Nomor label tidak sesuai nomor BO.' };
  if (typeof b.templateKode !== 'string' || !b.templateKode.trim() || b.templateKode.length > 80) return { salah: 'Kode template tidak sah.' };
  if (!bilBulatPositif(b.templateVersi)) return { salah: 'Versi template tidak sah.' };
  if (!bilBulatPositif(b.clientVersion)) return { salah: 'Versi kiriman tidak sah.' };
  if (typeof b.alatTambahan !== 'boolean') return { salah: 'Tanda alat tambahan tidak sah.' };
  if (!objekBiasa(b.data)) return { salah: 'Isian LKK kosong.' };
  if (b.results !== null && b.results !== undefined && !objekBiasa(b.results)) return { salah: 'Hasil hitung tidak sah.' };
  if (b.calibratorSnapshot !== null && b.calibratorSnapshot !== undefined && !objekBiasa(b.calibratorSnapshot)) return { salah: 'Snapshot kalibrator tidak sah.' };
  const tanggal = tanggalAtauNull(b.tanggalKalibrasi);
  if (tanggal === undefined) return { salah: 'Tanggal kalibrasi tidak sah.' };
  const poItemRef = teksAtauNull(b.poItemRef, 120);
  const jadwalId = teksAtauNull(b.jadwalId, 120);
  if (poItemRef === undefined || jadwalId === undefined) return { salah: 'Rujukan jadwal/PO tidak sah.' };

  const paket: PaketLkk = {
    id: b.id.toLowerCase(),
    bo: b.bo,
    noLabel: b.noLabel,
    templateKode: b.templateKode,
    templateVersi: b.templateVersi,
    tanggalKalibrasi: tanggal,
    alatTambahan: b.alatTambahan,
    poItemRef,
    jadwalId,
    data: b.data,
    results: b.results ?? null,
    calibratorSnapshot: b.calibratorSnapshot ?? null,
    clientVersion: b.clientVersion,
  };
  if (ukuranJson([paket.data, paket.results, paket.calibratorSnapshot]) > BATAS_DATA_BYTE) {
    return { salah: 'Isi LKK terlalu besar (maks 1,5 MB).' };
  }
  return { paket };
}

function bacaPaketDraft(b: any): { paket?: PaketDraft; salah?: string } {
  if (!objekBiasa(b)) return { salah: 'Isi kiriman kosong.' };
  if (typeof b.id !== 'string' || !POLA_UUID.test(b.id)) return { salah: 'ID LKK tidak sah.' };
  const bo = teksAtauNull(b.bo, 3);
  if (bo === undefined || (bo !== null && !POLA_BO.test(bo))) return { salah: 'Nomor BO harus 3 angka.' };
  const noLabel = teksAtauNull(b.noLabel, 20);           // draft boleh belum lengkap, tidak dicek pola
  const templateKode = teksAtauNull(b.templateKode, 80);
  if (noLabel === undefined || templateKode === undefined) return { salah: 'Isi draft tidak sah.' };
  if (!bilBulatPositif(b.clientVersion)) return { salah: 'Versi draft tidak sah.' };
  if (!objekBiasa(b.data)) return { salah: 'Isian draft kosong.' };
  if (ukuranJson(b.data) > BATAS_DRAFT_BYTE) return { salah: 'Isi draft terlalu besar (maks 1 MB).' };
  return { paket: { id: b.id.toLowerCase(), bo, noLabel, templateKode, data: b.data, clientVersion: b.clientVersion } };
}

/** Panggil fungsi database dengan batas waktu. */
async function rpcBerbatas(nama: string, args: Record<string, unknown>) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), BATAS_WAKTU_DB_MS);
  try {
    return await supabaseAdmin.rpc(nama, args).abortSignal(ctrl.signal);
  } finally {
    clearTimeout(t);
  }
}

/**
 * Pemeriksaan server (Tahap 4.4a): hitung ulang dengan mesin yang sama, catat hasilnya.
 * TIDAK PERNAH menggagalkan penerimaan — LKK sudah tersimpan; bila pemeriksaan gagal, hanya dicatat di log
 * (LKK tanpa catatan pemeriksaan tidak boleh di-ACC, ditangani di tahap ACC).
 */
async function periksaDanCatat(paket: PaketLkk, clientVersion: number): Promise<void> {
  try {
    const { data: tpl } = await supabaseAdmin.from('tera_device_templates')
      .select('definition').eq('kode_alat', paket.templateKode).eq('versi', paket.templateVersi).maybeSingle();
    const h = periksaPaketServer((tpl?.definition ?? null) as TemplateAlat | null, {
      data: paket.data, results: paket.results, calibratorSnapshot: paket.calibratorSnapshot,
      tanggalKalibrasi: paket.tanggalKalibrasi, templateKode: paket.templateKode, templateVersi: paket.templateVersi,
    });
    const { error } = await supabaseAdmin.from('tera_lkk_pemeriksaan').upsert({
      lkk_id: paket.id, client_version: clientVersion, mesin_hitung: h.mesinHitung, jejak_cocok: h.jejakCocok,
      boleh_acc: h.bolehAcc, penanda: h.penanda, kesimpulan_server: h.kesimpulanServer, diperiksa_at: new Date().toISOString(),
    }, { onConflict: 'lkk_id,client_version' });
    if (error) console.error('[Tera] simpan pemeriksaan gagal:', error.message);
  } catch (e: any) {
    console.error('[Tera] pemeriksaan server gagal:', e?.message);
  }
}

const PESAN_SERVER_SIBUK = "Server tidak merespons. Data aman di perangkat, akan dicoba lagi otomatis.";

// ---------------------------------------------------------------------------
// Rute
// ---------------------------------------------------------------------------
export function registerTeraSyncRoutes(app: Express, deps: TeraSyncDeps) {
  const kirimLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1200,                               // 50 LKK + cadangan draft + coba ulang, per akun
    keyGenerator: deps.rateLimitKey,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Terlalu banyak kiriman dalam waktu singkat. Data aman di perangkat, akan dicoba lagi otomatis." }
  });
  const logLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    keyGenerator: deps.rateLimitKey,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Terlalu banyak catatan error." }
  });

  const pintu = [requireAuthTera, requireRole([...ROLE_ISI_LKK]), wajibSudahGantiSandi] as const;

  // --- Terima 1 LKK utuh ---------------------------------------------------
  app.post("/api/tera/lkk", kirimLimiter, ...pintu, async (req: AuthRequest, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const { paket, salah } = bacaPaketLkk(req.body?.paket);
    if (!paket) return res.status(400).json({ hasil: 'ditolak_segel', alasan: salah });

    // Hitung ulang segel di server — harus sama persis dengan segel perangkat
    let segel: { checksum: string; jumlahTitik: number };
    try {
      segel = await segelLkk(paket);
    } catch (e: any) {
      const alasan = e instanceof SegelError ? e.message : 'Isi LKK tidak bisa disegel.';
      return res.status(400).json({ hasil: 'ditolak_segel', alasan });
    }
    const segelPerangkat = req.body?.checksum;
    const titikPerangkat = req.body?.jumlahTitik;
    if (typeof segelPerangkat !== 'string' || !POLA_CHECKSUM.test(segelPerangkat)
        || segelPerangkat !== segel.checksum || titikPerangkat !== segel.jumlahTitik) {
      return res.status(422).json({
        hasil: 'ditolak_segel',
        alasan: 'Paket tidak utuh (segel tidak cocok). Data aman di perangkat, akan dikirim ulang otomatis.'
      });
    }

    try {
      const { data, error } = await rpcBerbatas('tera_terima_lkk', {
        p_id: paket.id,
        p_user: req.user.id,
        p_bo: paket.bo,
        p_no_label: paket.noLabel,
        p_template_kode: paket.templateKode,
        p_template_versi: paket.templateVersi,
        p_tanggal: paket.tanggalKalibrasi,
        p_alat_tambahan: paket.alatTambahan,
        p_po_item_ref: paket.poItemRef,
        p_jadwal_id: paket.jadwalId,
        p_data: paket.data,
        p_results: paket.results,
        p_calibrator_snapshot: paket.calibratorSnapshot,
        p_checksum: segel.checksum,
        p_jumlah_titik: segel.jumlahTitik,
        p_client_version: paket.clientVersion,
        p_is_test: paket.bo === BO_UJI,
        p_client_updated_at: waktuAtauNull(req.body?.clientUpdatedAt),
      });
      if (error || !data) {
        console.error('[Tera] tera_terima_lkk gagal:', error?.message);
        return res.status(503).json({ error: PESAN_SERVER_SIBUK });
      }

      const h = data as any;
      if (h.hasil === 'diterima') await periksaDanCatat(paket, paket.clientVersion);
      if (h.hasil === 'diterima' || h.hasil === 'sudah_diterima') {
        return res.json({
          hasil: h.hasil,
          checksum: h.checksum,
          jumlahTitik: h.jumlah_titik,
          clientVersion: h.client_version,
          status: h.status,
        });
      }
      // Ditolak dengan alasan jelas (label ganda / terkunci / versi lama) — perangkat menyimpan data & berhenti mengulang
      return res.status(409).json({
        hasil: h.hasil,
        alasan: h.alasan || (h.hasil === 'ditolak_versi_lama'
          ? 'Server sudah menyimpan versi LKK yang lebih baru.'
          : 'Kiriman ditolak server.'),
        status: h.status,
        noLabel: h.no_label,
        clientVersionServer: h.client_version_server,
      });
    } catch (err: any) {
      console.error('[Tera] POST /api/tera/lkk:', err?.name === 'AbortError' ? 'batas waktu habis' : err?.message);
      return res.status(503).json({ error: PESAN_SERVER_SIBUK });
    }
  });

  // --- Cadangan draft ---------------------------------------------------------
  app.post("/api/tera/draft", kirimLimiter, ...pintu, async (req: AuthRequest, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const { paket, salah } = bacaPaketDraft(req.body?.paket);
    if (!paket) return res.status(400).json({ hasil: 'ditolak', alasan: salah });

    let checksum: string;
    try {
      checksum = (await segelDraft(paket)).checksum;
    } catch (e: any) {
      return res.status(400).json({ hasil: 'ditolak', alasan: e instanceof SegelError ? e.message : 'Draft tidak bisa disegel.' });
    }
    if (req.body?.checksum !== checksum) {
      return res.status(422).json({ hasil: 'ditolak', alasan: 'Cadangan tidak utuh (segel tidak cocok). Dicoba lagi otomatis.' });
    }

    try {
      const { data, error } = await rpcBerbatas('tera_simpan_draft', {
        p_id: paket.id,
        p_user: req.user.id,
        p_bo: paket.bo,
        p_no_label: paket.noLabel,
        p_template_kode: paket.templateKode,
        p_data: paket.data,
        p_checksum: checksum,
        p_client_version: paket.clientVersion,
        p_is_test: paket.bo === BO_UJI,
        p_client_updated_at: waktuAtauNull(req.body?.clientUpdatedAt),
      });
      if (error || !data) {
        console.error('[Tera] tera_simpan_draft gagal:', error?.message);
        return res.status(503).json({ error: PESAN_SERVER_SIBUK });
      }
      const h = data as any;
      if (h.hasil === 'ditolak') return res.status(409).json({ hasil: 'ditolak', alasan: h.alasan });
      if (h.hasil === 'coba_lagi') return res.status(503).json({ error: PESAN_SERVER_SIBUK });
      return res.json({ hasil: h.hasil, clientVersion: h.client_version, checksum: h.checksum });
    } catch (err: any) {
      console.error('[Tera] POST /api/tera/draft:', err?.name === 'AbortError' ? 'batas waktu habis' : err?.message);
      return res.status(503).json({ error: PESAN_SERVER_SIBUK });
    }
  });

  // --- Tarik turun status LKK milik sendiri ------------------------------------
  app.get("/api/tera/lkk", ...pintu, async (req: AuthRequest, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const sejak = waktuAtauNull(req.query.sejak);
    try {
      let q = supabaseAdmin
        .from('tera_lkk')
        .select('id, no_label, status, client_version, checksum, jumlah_titik, updated_at')
        .eq('teknisi_user_id', req.user.id)
        .order('updated_at', { ascending: true })
        .limit(500);
      if (sejak) q = q.gt('updated_at', sejak);
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), BATAS_WAKTU_DB_MS);
      const { data, error } = await q.abortSignal(ctrl.signal);
      clearTimeout(t);
      if (error) {
        console.error('[Tera] GET /api/tera/lkk:', error.message);
        return res.status(503).json({ error: PESAN_SERVER_SIBUK });
      }
      return res.json({
        waktuServer: new Date().toISOString(),
        lkk: (data || []).map((r: any) => ({
          id: r.id,
          noLabel: r.no_label,
          status: r.status,
          clientVersion: r.client_version,
          checksum: r.checksum,
          jumlahTitik: r.jumlah_titik,
          updatedAt: r.updated_at,
        })),
      });
    } catch (err: any) {
      console.error('[Tera] GET /api/tera/lkk:', err?.message);
      return res.status(503).json({ error: PESAN_SERVER_SIBUK });
    }
  });

  // --- Catat error dari perangkat -------------------------------------------
  app.post("/api/tera/log", logLimiter, requireAuthTera, async (req: AuthRequest, res) => {
    const b = req.body || {};
    const pesan = typeof b.pesan === 'string' ? b.pesan.slice(0, 2000) : '';
    if (!pesan.trim()) return res.status(400).json({ error: 'Pesan kosong.' });
    const konteks = objekBiasa(b.konteks) && ukuranJson(b.konteks) <= 8_000 ? b.konteks : null;
    try {
      const { error } = await supabaseAdmin.from('tera_error_logs').insert({
        user_id: req.user.id,
        perangkat: typeof b.perangkat === 'string' ? b.perangkat.slice(0, 200) : null,
        versi_app: typeof b.versiApp === 'string' ? b.versiApp.slice(0, 40) : null,
        pesan,
        konteks,
      });
      if (error) console.error('[Tera] simpan log gagal:', error.message);
      return res.status(error ? 503 : 204).end();
    } catch (err: any) {
      console.error('[Tera] POST /api/tera/log:', err?.message);
      return res.status(503).end();
    }
  });
}
