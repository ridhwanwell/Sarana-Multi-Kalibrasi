/**
 * Tera SMK — pintu masuk (/tera).
 *
 * Tahap 1.3: login teknisi, pengalihan per role, wajib ganti kata sandi saat login pertama.
 * Tahap 1.4a: tampilan Ocean (token di tera-tema.css), logo Tera SMK, mode gelap otomatis.
 * Tahap 1.4b: kerangka HP/tablet (header, tab bawah, menu samping) ada di TeraKerangka.tsx.
 * Tahap 2.4: kurir kirim otomatis + papan status dipasang lewat SinkronKonteks.tsx.
 *
 * Aturan akses (CLAUDE.md 3A.4 & 6):
 * - Belum login            -> form login (cukup ketik nama akun, "@tera.smk" ditambahkan otomatis)
 * - Segel ganti sandi ada  -> HANYA layar "Buat kata sandi baru"
 * - role 'teknisi'         -> boleh masuk
 * - role 'admin_utama'     -> boleh masuk (Developer, untuk menguji)
 * - role kantor lain       -> dialihkan ke /admin
 * Pembatasan data tetap dijaga di server (requireAuth / requireAuthTera).
 *
 * UI mengikuti ui-ux-pro-max (Password Visibility, Error Placement, Accessible
 * Authentication, Submit Feedback, Inline Validation) + design-system (token, bukan warna mentah).
 */
import React, { useEffect, useId, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AlertCircle, Check, Circle, Eye, EyeOff, Loader2, Lock, LogOut, User } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { apiFetch } from '../lib/apiClient';
import { HalamanAkun, HalamanBeranda, HalamanLkk, KerangkaTera } from './TeraKerangka';
import { SinkronProvider } from './SinkronKonteks';
import './tera-tema.css';

const DOMAIN_TERA = '@tera.smk';
const MIN_SANDI = 8;
const LOGO_EMBLEM = '/tera/tera-emblem-256.webp';

function keEmailTera(input: string): string {
  const bersih = input.trim().toLowerCase();
  if (!bersih) return '';
  return bersih.includes('@') ? bersih : `${bersih}${DOMAIN_TERA}`;
}

/* ---------- Bagian kecil yang dipakai ulang ---------- */

const Putar: React.FC = () => <Loader2 size={20} aria-hidden="true" className="t-putar" />;

const PesanError: React.FC<{ id: string; pesan: string | null }> = ({ id, pesan }) =>
  pesan ? (
    <p id={id} className="t-pesan-error">
      <AlertCircle size={16} aria-hidden="true" className="mt-px shrink-0" />
      <span>{pesan}</span>
    </p>
  ) : null;

const Peringatan: React.FC<{ pesan: string }> = ({ pesan }) => (
  <p role="alert" className="t-peringatan">
    <AlertCircle size={20} aria-hidden="true" className="shrink-0" />
    <span>{pesan}</span>
  </p>
);

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
      <label htmlFor={id} className="t-label">{label}</label>
      {bantuan && <p id={idBantuan} className="t-ket mt-0.5">{bantuan}</p>}
      <div className="t-kotak" data-error={error ? 'true' : undefined}>
        <Lock size={20} aria-hidden="true" className="t-ikon-kotak" />
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
        />
        <button
          type="button"
          onClick={() => setTerlihat((v) => !v)}
          aria-label={terlihat ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
          aria-pressed={terlihat}
          className="t-tombol-ikon"
        >
          {terlihat ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
        </button>
      </div>
      <PesanError id={idError} pesan={error} />
    </div>
  );
};

/**
 * Kerangka layar masuk: header biru + garis cyan + skala penggaris, lencana logo,
 * kartu di atasnya. Dipakai login dan "Buat kata sandi baru".
 */
const LayarMasuk: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="tera-root">
    <header className="t-hero">
      <div className="t-lencana t-animasi-masuk">
        <img src={LOGO_EMBLEM} width={64} height={64} alt="Logo Tera SMK" decoding="async" />
      </div>
      <p className="mt-3 text-center text-[13px] font-medium tracking-[0.08em]" style={{ color: 'var(--t-on-header-muted)' }}>
        Tertelusur · Efisien · Rapi · Akurat
      </p>
      <div className="t-hero-skala" aria-hidden="true" />
    </header>
    <main className="t-kartu-layar t-animasi-masuk-2">{children}</main>
    <footer className="t-ket t-isi-bawah mt-6 px-4 text-center">PT Sarana Multi Kalibrasi</footer>
  </div>
);

const LayarMemuat: React.FC<{ pesan: string }> = ({ pesan }) => (
  <div className="tera-root flex min-h-dvh flex-col items-center justify-center gap-3" role="status">
    <div className="t-lencana t-animasi-masuk">
      <img src={LOGO_EMBLEM} width={64} height={64} alt="" decoding="async" />
    </div>
    <span className="t-teks-2 flex items-center gap-2 text-[15px]"><Putar />{pesan}</span>
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
    <LayarMasuk>
      <form onSubmit={kirim} noValidate aria-labelledby="judul-login-tera">
        <h1 id="judul-login-tera" className="t-judul-layar">Masuk ke Tera SMK</h1>
        <p className="t-ket mt-1">Teknologi Evaluasi &amp; Rekam Alkes</p>

        <div className="mt-6">
          <label htmlFor={idAkun} className="t-label">Nama akun</label>
          <div className="t-kotak" data-error={errAkun ? 'true' : undefined}>
            <User size={20} aria-hidden="true" className="t-ikon-kotak" />
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
              placeholder="contoh: ari…"
            />
            {!akun.includes('@') && <span className="t-akhiran" aria-hidden="true">{DOMAIN_TERA}</span>}
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

        {pesan && <Peringatan pesan={pesan} />}

        <div className="mt-6">
          <button type="submit" disabled={sedangMasuk} aria-busy={sedangMasuk} className="t-tombol t-tombol-utama">
            {sedangMasuk && <Putar />}
            {sedangMasuk ? 'Sedang masuk…' : 'Masuk'}
          </button>
        </div>
      </form>
    </LayarMasuk>
  );
};

/* ---------- Layar: Buat kata sandi baru (login pertama) ---------- */

const Syarat: React.FC<{ ok: boolean; teks: string }> = ({ ok, teks }) => (
  <li data-ok={ok ? 'true' : 'false'}>
    {ok ? <Check size={16} aria-hidden="true" /> : <Circle size={16} aria-hidden="true" />}
    <span>{teks}</span>
    <span className="sr-only">{ok ? '(terpenuhi)' : '(belum terpenuhi)'}</span>
  </li>
);

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
    <LayarMasuk>
      <form onSubmit={simpan} noValidate aria-labelledby="judul-ganti-sandi">
        <p className="t-ket truncate" title={user?.fullName || undefined}>Halo, {user?.fullName?.trim() || 'Teknisi'}</p>
        <h1 id="judul-ganti-sandi" className="t-judul-layar mt-1">Buat kata sandi baru</h1>
        <p className="t-teks-2 mt-2 text-[15px]">
          Ini login pertama Anda. Ganti kata sandi sementara dari Developer dengan kata sandi milik Anda sendiri.
        </p>

        <KotakSandi
          label="Kata sandi baru"
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

        <ul className="t-syarat" aria-label="Syarat kata sandi">
          <Syarat ok={baru.length >= MIN_SANDI} teks={`Minimal ${MIN_SANDI} karakter`} />
          <Syarat ok={ulang.length > 0 && ulang === baru} teks="Kedua isian sama" />
        </ul>
        <p className="t-ket mt-2">Jangan sama dengan kata sandi sementara.</p>

        {pesanServer && <Peringatan pesan={pesanServer} />}

        <div className="mt-6 flex flex-col gap-3">
          <button type="submit" disabled={menyimpan} aria-busy={menyimpan} className="t-tombol t-tombol-utama">
            {menyimpan && <Putar />}
            {menyimpan ? 'Sedang menyimpan…' : 'Simpan kata sandi'}
          </button>
          <button type="button" onClick={() => { void logout(); }} className="t-tombol t-tombol-kedua">
            <LogOut size={18} aria-hidden="true" />
            Keluar
          </button>
        </div>
      </form>
    </LayarMasuk>
  );
};

/* ---------- Layar kerja: kerangka + 3 halaman (rute /tera, /tera/lkk, /tera/akun) ---------- */

const LayarKerja: React.FC = () => (
  <SinkronProvider>
    <Routes>
      <Route element={<KerangkaTera />}>
        <Route index element={<HalamanBeranda />} />
        <Route path="lkk" element={<HalamanLkk />} />
        <Route path="akun" element={<HalamanAkun />} />
        <Route path="*" element={<Navigate to="/tera/" replace />} />
      </Route>
    </Routes>
  </SinkronProvider>
);

/* ---------- PWA: kartu identitas + penjaga gudang (Tahap 1.5a) ---------- */

/**
 * Biasanya sudah dipasang oleh skrip di index.html saat halaman /tera… dibuka.
 * Fungsi ini menjaga kasus teknisi masuk lewat /admin/login lalu dialihkan ke /tera/
 * tanpa memuat ulang halaman.
 */
function pasangPwaTera(): void {
  try {
    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = '/tera/manifest.webmanifest';
      document.head.appendChild(link);
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/tera/sw.js', { scope: '/tera/' }).catch(() => {});
    }
  } catch {
    /* PWA hanya tambahan: aplikasi tetap jalan tanpa ini */
  }
}

/* ---------- Pintu masuk ---------- */

const TeraApp: React.FC = () => {
  const { user, loading } = useAuth();
  const lokasi = useLocation();
  // Layar "Memeriksa akun…" hanya saat aplikasi pertama dibuka. Saat tombol Masuk
  // ditekan, form tetap tampil agar isian tidak hilang bila login gagal.
  const [pemeriksaanAwal, setPemeriksaanAwal] = useState(true);
  useEffect(() => {
    if (!loading) setPemeriksaanAwal(false);
  }, [loading]);

  // Tema Ocean berlaku selama area /tera terbuka (latar penuh, termasuk di balik status bar iPhone).
  useEffect(() => {
    document.documentElement.classList.add('tera-aktif');
    return () => document.documentElement.classList.remove('tera-aktif');
  }, []);

  useEffect(() => { pasangPwaTera(); }, []);

  // Wilayah PWA adalah "/tera/" (bergaris miring). "/tera" dibelokkan agar tetap di dalam wilayah.
  if (lokasi.pathname === '/tera') return <Navigate to={`/tera/${lokasi.search}${lokasi.hash}`} replace />;

  if (loading && pemeriksaanAwal) return <LayarMemuat pesan="Memeriksa akun…" />;
  if (!user) return <LoginTera />;
  if (user.role !== 'teknisi' && user.role !== 'admin_utama') return <Navigate to="/admin" replace />;
  if (user.mustChangePassword) return <GantiSandiPertama />;
  return <LayarKerja />;
};

export default TeraApp;
