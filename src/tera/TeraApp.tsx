/**
 * Tera SMK — pintu masuk (/tera).
 *
 * Tahap 1.3a/1.3b: login teknisi, pengalihan per role, wajib ganti kata sandi
 * saat login pertama, dan layar sementara. Tampilan lengkap (token Ocean, mode
 * gelap, logo, tata letak HP/tablet) dibuat di Tahap 1.4 — warna di sini sementara.
 *
 * Aturan akses (CLAUDE.md 3A.4 & 6):
 * - Belum login            -> form login (cukup ketik nama akun, "@tera.smk" ditambahkan otomatis)
 * - Segel ganti sandi ada  -> HANYA layar "Buat kata sandi baru"
 * - role 'teknisi'         -> boleh masuk
 * - role 'admin_utama'     -> boleh masuk (Developer, untuk menguji)
 * - role kantor lain       -> dialihkan ke /admin
 * Pembatasan data tetap dijaga di server (requireAuth / requireAuthTera).
 *
 * UI mengikuti ui-ux-pro-max (ux: Password Visibility, Error Placement,
 * Accessible Authentication, Submit Feedback, Inline Validation).
 */
import React, { useEffect, useId, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { apiFetch } from '../lib/apiClient';

const DOMAIN_TERA = '@tera.smk';
const MIN_SANDI = 8;

function keEmailTera(input: string): string {
  const bersih = input.trim().toLowerCase();
  if (!bersih) return '';
  return bersih.includes('@') ? bersih : `${bersih}${DOMAIN_TERA}`;
}

/* ---------- Bagian kecil yang dipakai ulang ---------- */

const kelasKotak =
  'flex items-center rounded-[12px] border bg-white transition-shadow ' +
  'focus-within:border-sky-700 focus-within:ring-2 focus-within:ring-sky-700 ' +
  'focus-within:shadow-[0_0_0_5px_rgba(41,197,246,0.25)]';

const kelasTombolUtama =
  'flex min-h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-sky-700 px-4 ' +
  'text-[15px] font-semibold text-white transition-transform duration-100 active:scale-[0.97] ' +
  'motion-reduce:transform-none disabled:opacity-70 ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700';

const kelasTombolKedua =
  'flex min-h-12 w-full items-center justify-center rounded-[12px] border border-slate-300 bg-white px-4 ' +
  'text-[15px] font-medium text-slate-700 transition-transform duration-100 active:scale-[0.97] ' +
  'motion-reduce:transform-none ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700';

const Putar: React.FC = () => (
  <Loader2 size={20} aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
);

const PesanError: React.FC<{ id: string; pesan: string | null }> = ({ id, pesan }) =>
  pesan ? (
    <p id={id} className="mt-1 text-[13px] font-medium text-red-700">{pesan}</p>
  ) : null;

interface KotakSandiProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error: string | null;
  bantuan?: string;
  autoComplete: 'current-password' | 'new-password';
  inputRef?: React.Ref<HTMLInputElement>;
}

/** Kotak kata sandi dengan tombol lihat/sembunyikan (48×48) dan error di bawahnya. */
const KotakSandi: React.FC<KotakSandiProps> = ({
  label, value, onChange, onBlur, error, bantuan, autoComplete, inputRef
}) => {
  const id = useId();
  const [terlihat, setTerlihat] = useState(false);
  const idBantuan = `${id}-bantuan`;
  const idError = `${id}-error`;
  const keterangan = [bantuan ? idBantuan : null, error ? idError : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="mt-4">
      <label htmlFor={id} className="block text-[14px] font-medium text-slate-700">{label}</label>
      {bantuan && <p id={idBantuan} className="mt-0.5 text-[13px] text-slate-500">{bantuan}</p>}
      <div className={`mt-1 ${kelasKotak} ${error ? 'border-red-600' : 'border-slate-500'}`}>
        <input
          id={id}
          ref={inputRef}
          type={terlihat ? 'text' : 'password'}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={error ? true : undefined}
          aria-describedby={keterangan}
          className="min-h-12 w-full min-w-0 rounded-[12px] bg-transparent px-3 text-[16px] text-slate-800 outline-none"
        />
        <button
          type="button"
          onClick={() => setTerlihat((v) => !v)}
          aria-label={terlihat ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
          aria-pressed={terlihat}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-700"
        >
          {terlihat ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
        </button>
      </div>
      <PesanError id={idError} pesan={error} />
    </div>
  );
};

const Kartu: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <main className="min-h-dvh bg-slate-50 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] font-sans">
    <div className="mx-auto w-full max-w-sm rounded-[14px] border border-slate-200 bg-white p-6">
      {children}
    </div>
  </main>
);

const LayarMemuat: React.FC<{ pesan: string }> = ({ pesan }) => (
  <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-slate-50 font-sans text-slate-600" role="status">
    <Putar />
    <span className="text-[15px]">{pesan}</span>
  </div>
);

/* ---------- Layar: Login ---------- */

const LoginTera: React.FC = () => {
  const { login, error, setError } = useAuth();
  const idAkun = useId();
  const [akun, setAkun] = useState('');
  const [sandi, setSandi] = useState('');
  const [errAkun, setErrAkun] = useState<string | null>(null);
  const [errSandi, setErrSandi] = useState<string | null>(null);
  const [pesanServer, setPesanServer] = useState<string | null>(null);
  const [sedangMasuk, setSedangMasuk] = useState(false);
  const refAkun = useRef<HTMLInputElement>(null);
  const refSandi = useRef<HTMLInputElement>(null);

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();
    setPesanServer(null);
    setError(null);
    const eA = akun.trim() ? null : 'Isi nama akun Anda.';
    const eS = sandi ? null : 'Isi kata sandi.';
    setErrAkun(eA);
    setErrSandi(eS);
    if (eA) { refAkun.current?.focus(); return; }
    if (eS) { refSandi.current?.focus(); return; }

    setSedangMasuk(true);
    const hasil = await login(keEmailTera(akun), sandi);
    setSedangMasuk(false);
    if (!hasil.success) {
      setPesanServer(hasil.error || 'Gagal masuk. Periksa nama akun dan kata sandi.');
    }
  };

  const pesan = pesanServer || error;
  const idErrAkun = `${idAkun}-error`;

  return (
    <Kartu>
      <form onSubmit={kirim} noValidate aria-labelledby="judul-login-tera">
        <h1 id="judul-login-tera" className="text-[22px] font-semibold text-slate-800">Tera SMK</h1>
        <p className="mt-1 text-[13px] text-slate-500">Teknologi Evaluasi &amp; Rekam Alkes</p>

        <div className="mt-6">
          <label htmlFor={idAkun} className="block text-[14px] font-medium text-slate-700">Nama akun</label>
          <div className={`mt-1 ${kelasKotak} ${errAkun ? 'border-red-600' : 'border-slate-500'}`}>
            <input
              id={idAkun}
              ref={refAkun}
              type="text"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={akun}
              onChange={(e) => setAkun(e.target.value)}
              aria-invalid={errAkun ? true : undefined}
              aria-describedby={errAkun ? idErrAkun : undefined}
              className="min-h-12 w-full min-w-0 rounded-[12px] bg-transparent px-3 text-[16px] text-slate-800 outline-none"
              placeholder="contoh: ari"
            />
            {!akun.includes('@') && (
              <span className="shrink-0 pr-3 text-[15px] text-slate-600" aria-hidden="true">{DOMAIN_TERA}</span>
            )}
          </div>
          <PesanError id={idErrAkun} pesan={errAkun} />
        </div>

        <KotakSandi
          label="Kata sandi"
          value={sandi}
          onChange={setSandi}
          error={errSandi}
          autoComplete="current-password"
          inputRef={refSandi}
        />

        {pesan && (
          <p role="alert" className="mt-4 rounded-[12px] bg-red-50 px-3 py-2 text-[14px] text-red-800">{pesan}</p>
        )}

        <div className="mt-6">
          <button type="submit" disabled={sedangMasuk} className={kelasTombolUtama}>
            {sedangMasuk && <Putar />}
            {sedangMasuk ? 'Sedang masuk…' : 'Masuk'}
          </button>
        </div>
      </form>
    </Kartu>
  );
};

/* ---------- Layar: Buat kata sandi baru (login pertama) ---------- */

const GantiSandiPertama: React.FC = () => {
  const { user, logout, refreshProfile } = useAuth();
  const [baru, setBaru] = useState('');
  const [ulang, setUlang] = useState('');
  const [errBaru, setErrBaru] = useState<string | null>(null);
  const [errUlang, setErrUlang] = useState<string | null>(null);
  const [pesanServer, setPesanServer] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);
  const refBaru = useRef<HTMLInputElement>(null);
  const refUlang = useRef<HTMLInputElement>(null);

  const cekBaru = (v: string) => (v.length < MIN_SANDI ? `Minimal ${MIN_SANDI} karakter.` : null);
  const cekUlang = (v: string, b: string) => (!v ? 'Ulangi kata sandi baru.' : v !== b ? 'Belum sama dengan kata sandi baru.' : null);

  const simpan = async (e: React.FormEvent) => {
    e.preventDefault();
    setPesanServer(null);
    const eB = cekBaru(baru);
    const eU = cekUlang(ulang, baru);
    setErrBaru(eB);
    setErrUlang(eU);
    if (eB) { refBaru.current?.focus(); return; }
    if (eU) { refUlang.current?.focus(); return; }

    setMenyimpan(true);
    try {
      const res = await apiFetch('/api/tera/ganti-sandi', {
        method: 'POST',
        body: JSON.stringify({ passwordBaru: baru }),
        retries: 0,
        timeoutMs: 20000
      });
      if (res.ok || res.status === 409) {
        // 409 = segel sudah lepas sebelumnya; cukup muat ulang profil
        await refreshProfile();
        return;
      }
      const data = await res.json().catch(() => null);
      setPesanServer(data?.error || 'Kata sandi belum tersimpan. Coba lagi.');
    } catch {
      setPesanServer('Server tidak merespons. Kata sandi belum diganti — coba lagi.');
    } finally {
      setMenyimpan(false);
    }
  };

  return (
    <Kartu>
      <form onSubmit={simpan} noValidate aria-labelledby="judul-ganti-sandi">
        <p className="text-[13px] text-slate-500">Tera SMK · {user?.fullName}</p>
        <h1 id="judul-ganti-sandi" className="mt-1 text-[22px] font-semibold text-slate-800">Buat kata sandi baru</h1>
        <p className="mt-2 text-[15px] text-slate-600">
          Ini login pertama Anda. Ganti kata sandi sementara dari Developer dengan kata sandi milik Anda sendiri.
        </p>

        <KotakSandi
          label="Kata sandi baru"
          bantuan={`Minimal ${MIN_SANDI} karakter. Jangan sama dengan kata sandi sementara.`}
          value={baru}
          onChange={(v) => { setBaru(v); if (errBaru) setErrBaru(cekBaru(v)); }}
          onBlur={() => baru && setErrBaru(cekBaru(baru))}
          error={errBaru}
          autoComplete="new-password"
          inputRef={refBaru}
        />
        <KotakSandi
          label="Ulangi kata sandi baru"
          value={ulang}
          onChange={(v) => { setUlang(v); if (errUlang) setErrUlang(cekUlang(v, baru)); }}
          onBlur={() => ulang && setErrUlang(cekUlang(ulang, baru))}
          error={errUlang}
          autoComplete="new-password"
          inputRef={refUlang}
        />

        {pesanServer && (
          <p role="alert" className="mt-4 rounded-[12px] bg-red-50 px-3 py-2 text-[14px] text-red-800">{pesanServer}</p>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <button type="submit" disabled={menyimpan} className={kelasTombolUtama}>
            {menyimpan && <Putar />}
            {menyimpan ? 'Sedang menyimpan…' : 'Simpan kata sandi'}
          </button>
          <button type="button" onClick={() => { void logout(); }} className={kelasTombolKedua}>
            Keluar
          </button>
        </div>
      </form>
    </Kartu>
  );
};

/* ---------- Layar: Beranda sementara ---------- */

const BerandaSementara: React.FC = () => {
  const { user, logout } = useAuth();
  return (
    <Kartu>
      <p className="text-[13px] text-slate-500">Tera SMK · {user?.roleLabel}</p>
      <h1 className="mt-1 text-[22px] font-semibold text-slate-800">Halo, {user?.fullName}</h1>
      <p className="mt-3 text-[15px] text-slate-600">Login berhasil. Layar kerja Tera SMK sedang disiapkan.</p>
      <div className="mt-6">
        <button type="button" onClick={() => { void logout(); }} className={kelasTombolKedua}>
          Keluar
        </button>
      </div>
    </Kartu>
  );
};

/* ---------- Pintu masuk ---------- */

const TeraApp: React.FC = () => {
  const { user, loading } = useAuth();
  // Layar "Memeriksa akun…" hanya saat aplikasi pertama dibuka. Saat tombol Masuk
  // ditekan, form tetap tampil agar isian tidak hilang bila login gagal.
  const [pemeriksaanAwal, setPemeriksaanAwal] = useState(true);
  useEffect(() => {
    if (!loading) setPemeriksaanAwal(false);
  }, [loading]);

  if (loading && pemeriksaanAwal) return <LayarMemuat pesan="Memeriksa akun…" />;
  if (!user) return <LoginTera />;
  if (user.role !== 'teknisi' && user.role !== 'admin_utama') return <Navigate to="/admin" replace />;
  if (user.mustChangePassword) return <GantiSandiPertama />;
  return <BerandaSementara />;
};

export default TeraApp;
