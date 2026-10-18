/**
 * Tera SMK — pintu masuk (/tera).
 *
 * Tahap 1.3a: login teknisi + pengalihan per role + layar sementara.
 * Tampilan lengkap (tema Ocean, logo, tata letak HP/tablet) dibuat di Tahap 1.4.
 *
 * Aturan akses (CLAUDE.md 3A.4 & 6):
 * - Belum login            -> form login Tera SMK (cukup ketik nama akun, "@tera.smk" ditambahkan otomatis)
 * - role 'teknisi'         -> boleh masuk
 * - role 'admin_utama'     -> boleh masuk (Developer, untuk menguji)
 * - role kantor lain       -> dialihkan ke /admin
 * Pembatasan data tetap dijaga di server (requireAuth / requireAuthTera).
 */
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

const DOMAIN_TERA = '@tera.smk';

function keEmailTera(input: string): string {
  const bersih = input.trim().toLowerCase();
  if (!bersih) return '';
  return bersih.includes('@') ? bersih : `${bersih}${DOMAIN_TERA}`;
}

const LayarMemuat: React.FC<{ pesan: string }> = ({ pesan }) => (
  <div className="min-h-dvh flex flex-col items-center justify-center gap-3 bg-slate-50 font-sans">
    <span className="smk-spinner" aria-hidden="true" />
    <span className="text-[15px] text-slate-600">{pesan}</span>
  </div>
);

const LoginTera: React.FC = () => {
  const { login, error, setError } = useAuth();
  const [akun, setAkun] = useState('');
  const [sandi, setSandi] = useState('');
  const [sedangMasuk, setSedangMasuk] = useState(false);
  const [pesanLokal, setPesanLokal] = useState<string | null>(null);

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();
    setPesanLokal(null);
    setError(null);
    const email = keEmailTera(akun);
    if (!email || !sandi) {
      setPesanLokal('Isi nama akun dan kata sandi.');
      return;
    }
    setSedangMasuk(true);
    const hasil = await login(email, sandi);
    setSedangMasuk(false);
    if (!hasil.success) {
      setPesanLokal(hasil.error || 'Gagal masuk. Periksa nama akun dan kata sandi.');
    }
  };

  const pesan = pesanLokal || error;

  return (
    <main className="min-h-dvh flex items-center justify-center bg-slate-50 px-4 py-8 font-sans">
      <form
        onSubmit={kirim}
        className="w-full max-w-sm rounded-[14px] border border-slate-200 bg-white p-6"
        aria-labelledby="judul-login-tera"
        noValidate
      >
        <h1 id="judul-login-tera" className="text-[22px] font-semibold text-slate-800">Tera SMK</h1>
        <p className="mt-1 text-[13px] text-slate-500">Teknologi Evaluasi &amp; Rekam Alkes</p>

        <label htmlFor="tera-akun" className="mt-6 block text-[14px] font-medium text-slate-700">Nama akun</label>
        <div className="mt-1 flex items-center rounded-[12px] border border-slate-400 bg-white focus-within:border-2 focus-within:border-sky-700">
          <input
            id="tera-akun"
            type="text"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={akun}
            onChange={(e) => setAkun(e.target.value)}
            className="min-h-12 w-full rounded-[12px] bg-transparent px-3 text-[16px] text-slate-800 outline-none"
            placeholder="contoh: ari"
          />
          {!akun.includes('@') && (
            <span className="pr-3 text-[15px] text-slate-500" aria-hidden="true">{DOMAIN_TERA}</span>
          )}
        </div>

        <label htmlFor="tera-sandi" className="mt-4 block text-[14px] font-medium text-slate-700">Kata sandi</label>
        <input
          id="tera-sandi"
          type="password"
          autoComplete="current-password"
          value={sandi}
          onChange={(e) => setSandi(e.target.value)}
          className="mt-1 min-h-12 w-full rounded-[12px] border border-slate-400 bg-white px-3 text-[16px] text-slate-800 outline-none focus:border-2 focus:border-sky-700"
        />

        {pesan && (
          <p role="alert" className="mt-4 rounded-[12px] bg-red-50 px-3 py-2 text-[14px] text-red-800">{pesan}</p>
        )}

        <button
          type="submit"
          disabled={sedangMasuk}
          className="mt-6 min-h-12 w-full rounded-[12px] bg-sky-700 text-[15px] font-semibold text-white transition-transform active:scale-[0.97] disabled:opacity-60"
        >
          {sedangMasuk ? 'Sedang masuk…' : 'Masuk'}
        </button>
      </form>
    </main>
  );
};

const BerandaSementara: React.FC = () => {
  const { user, logout } = useAuth();
  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-8 font-sans">
      <div className="mx-auto max-w-md rounded-[14px] border border-slate-200 bg-white p-6">
        <p className="text-[13px] text-slate-500">Tera SMK · {user?.roleLabel}</p>
        <h1 className="mt-1 text-[22px] font-semibold text-slate-800">Halo, {user?.fullName}</h1>
        <p className="mt-3 text-[15px] text-slate-600">
          Login berhasil. Layar kerja Tera SMK sedang disiapkan.
        </p>
        <button
          type="button"
          onClick={() => { void logout(); }}
          className="mt-6 min-h-12 w-full rounded-[12px] border border-slate-300 text-[15px] font-medium text-slate-700 transition-transform active:scale-[0.97]"
        >
          Keluar
        </button>
      </div>
    </main>
  );
};

const TeraApp: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) return <LayarMemuat pesan="Memeriksa akun…" />;
  if (!user) return <LoginTera />;
  if (user.role === 'teknisi' || user.role === 'admin_utama') return <BerandaSementara />;
  return <Navigate to="/admin" replace />;
};

export default TeraApp;
