import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../server/supabaseAdmin.js';

/** Role kantor (Manajemen Aset SMK, /admin). */
export type RoleKantor = 'admin_utama' | 'admin_teknik' | 'admin_keuangan' | 'hanya_sph';
/** Role lapangan (Tera SMK, /tera). */
export type RoleTera = 'teknisi';
export type UserRole = RoleKantor | RoleTera;

export const ROLE_KANTOR: readonly RoleKantor[] = [
  'admin_utama',
  'admin_teknik',
  'admin_keuangan',
  'hanya_sph'
] as const;

export const ROLE_TERA: readonly RoleTera[] = ['teknisi'] as const;

/** Semua role yang diakui database (chk_profiles_official_role). */
export const SEMUA_ROLE: readonly UserRole[] = [...ROLE_KANTOR, ...ROLE_TERA];

/**
 * Tetap berarti "role kantor" agar semua pemeriksaan lama (mis. canReadCollection)
 * tidak berubah makna. Teknisi TIDAK termasuk.
 */
export const OFFICIAL_ROLES: readonly UserRole[] = ROLE_KANTOR;

export interface AuthRequest extends Request {
  user?: any;
  userRole?: UserRole;
}

// In-memory cache for user roles (TTL 60 seconds) to reduce repeated database queries
interface CachedRole {
  role: UserRole;
  expiresAt: number;
}
const roleCache = new Map<string, CachedRole>();

/**
 * Pembuat "satpam" API: memeriksa token Supabase lalu role dari public.profiles.
 *
 * Aturan:
 * - Tanpa header "Authorization: Bearer <token>" / token tidak valid -> 401 {"error":"Sesi login diperlukan"}.
 * - Baris profil tidak ada atau role bukan role resmi -> 403 {"error":"Akun belum memiliki hak akses"}.
 * - Role resmi tetapi tidak termasuk `allowed` -> 403 (pola "tolak kecuali diizinkan").
 * - Blok catch -> 503 {"error":"Layanan autentikasi sedang tidak tersedia, coba lagi"}.
 * - Tidak ada fallback role apa pun. Role di-cache 60 detik per user id.
 */
const buatSatpam = (allowed: readonly UserRole[]) => async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Sesi login diperlukan" });
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return res.status(401).json({ error: "Sesi login diperlukan" });
  }

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData?.user) {
      console.error('[Auth Error] Token tidak valid atau kedaluwarsa:', authError?.message);
      return res.status(401).json({ error: "Sesi login diperlukan" });
    }

    const user = authData.user;
    const userId = user.id;
    req.user = user;

    // Check memory cache first (60 detik)
    const now = Date.now();
    const cached = roleCache.get(userId);

    let assignedRole: UserRole;
    if (cached && cached.expiresAt > now) {
      assignedRole = cached.role;
    } else {
      // Baca role dari public.profiles di server
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error(`[Auth Error] Gagal membaca profil pengguna ${userId}:`, profileError);
        return res.status(503).json({ error: "Layanan autentikasi sedang tidak tersedia, coba lagi" });
      }

      if (!profile || !profile.role || !SEMUA_ROLE.includes(profile.role as UserRole)) {
        console.warn(`[Auth Warning] User ${userId} (${user.email}) tidak memiliki role resmi:`, profile?.role);
        return res.status(403).json({ error: "Akun belum memiliki hak akses" });
      }

      assignedRole = profile.role as UserRole;
      roleCache.set(userId, {
        role: assignedRole,
        expiresAt: now + 60 * 1000
      });
    }

    if (!allowed.includes(assignedRole)) {
      console.warn(`[Access Denied] User '${user.email}' dengan role '${assignedRole}' tidak diizinkan di ${req.method} ${req.path}.`);
      return res.status(403).json({ error: "Akun belum memiliki hak akses" });
    }

    req.userRole = assignedRole;
    return next();
  } catch (error) {
    console.error('[Auth Catch Error] Terjadi kegagalan layanan autentikasi:', error);
    return res.status(503).json({ error: "Layanan autentikasi sedang tidak tersedia, coba lagi" });
  }
};

/**
 * Satpam bawaan untuk SEMUA API lama (Manajemen Aset SMK): hanya role kantor.
 * Akun teknisi selalu ditolak di sini.
 */
export const requireAuth = buatSatpam(ROLE_KANTOR);

/**
 * Satpam untuk API yang memang dipakai Tera SMK: role kantor + teknisi.
 * Pasang HANYA di alamat yang disengaja untuk teknisi; data teknisi di alamat itu
 * wajib dibatasi ke miliknya sendiri.
 */
export const requireAuthTera = buatSatpam(SEMUA_ROLE);

/**
 * Middleware untuk validasi hak akses berdasarkan role pengguna.
 * Jika role pengguna tidak termasuk dalam allowedRoles, tolak dengan 403 Forbidden.
 */
export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !allowedRoles.includes(req.userRole)) {
      console.warn(`[Access Denied] User '${req.user?.email}' dengan role '${req.userRole}' tidak diizinkan (dibutuhkan: ${allowedRoles.join(', ')}).`);
      return res.status(403).json({ error: "Akun belum memiliki hak akses" });
    }
    return next();
  };
};
