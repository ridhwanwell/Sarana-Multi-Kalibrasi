/**
 * Tera SMK — kerangka aplikasi (Tahap 1.4b).
 *
 * HP & tablet portrait : header biru di atas + tab bawah (Beranda · LKK · Akun)
 * Tablet landscape/laptop: menu samping kiri + header tipis (lihat tera-tema.css)
 *
 * Isi halaman masih kosong dengan ajakan jelas; daftar RS, LKK, dan status sinkron
 * sungguhan datang di Tahap 2–4. Angka di sini sengaja 0 (belum ada yang disimpan).
 *
 * UI: ui-ux-pro-max (Active State, Deep Linking, Empty States, badge bukan tombol,
 * <nav>/<button> semantik), design-system (semua warna lewat token).
 */
import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Building2,
  Check,
  Clock,
  ClipboardCheck,
  Info,
  LayoutDashboard,
  LogOut,
  Upload,
  User,
  WifiOff
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

const LOGO_EMBLEM = '/tera/tera-emblem-256.webp';

// Sementara 0: belum ada penyimpanan di perangkat (dibuat di Tahap 2).
const JUMLAH_DI_PERANGKAT = 0;

const MENU = [
  { ke: '/tera', label: 'Beranda', ikon: LayoutDashboard, persis: true },
  { ke: '/tera/lkk', label: 'LKK', ikon: ClipboardCheck, persis: false },
  { ke: '/tera/akun', label: 'Akun', ikon: User, persis: false }
] as const;

/* ---------- Batas kesalahan: layar rusak tidak menjatuhkan seluruh aplikasi ---------- */

class BatasKesalahan extends React.Component<{ children: React.ReactNode }, { rusak: boolean }> {
  state = { rusak: false };

  static getDerivedStateFromError() {
    return { rusak: true };
  }

  componentDidCatch(err: unknown) {
    console.error('[Tera SMK] Kesalahan tampilan layar', err);
  }

  render() {
    if (!this.state.rusak) return this.props.children;
    return (
      <div className="t-kartu t-kosong" role="alert">
        <div className="t-kosong-ikon"><Info size={24} aria-hidden="true" /></div>
        <h2>Layar ini belum bisa dibuka</h2>
        <p>Data Anda tetap aman di perangkat. Coba muat ulang halaman, atau pindah ke menu lain.</p>
        <button type="button" onClick={() => window.location.reload()} className="t-tombol t-tombol-utama mt-2" style={{ maxWidth: 280 }}>
          Muat ulang halaman
        </button>
      </div>
    );
  }
}

/* ---------- Bagian kecil ---------- */

const KeadaanKosong: React.FC<{
  ikon: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>;
  judul: string;
  pesan: string;
}> = ({ ikon: Ikon, judul, pesan }) => (
  <div className="t-kartu t-kosong">
    <div className="t-kosong-ikon"><Ikon size={24} aria-hidden={true} /></div>
    <h2>{judul}</h2>
    <p>{pesan}</p>
  </div>
);

const Statistik: React.FC = () => {
  const butir = [
    { jenis: 'wait', ikon: Clock, label: 'Di perangkat' },
    { jenis: 'send', ikon: Upload, label: 'Sedang dikirim' },
    { jenis: 'ok', ikon: Check, label: 'Diterima server' }
  ] as const;
  return (
    <ul className="t-statistik" aria-label="Ringkasan status LKK">
      {butir.map(({ jenis, ikon: Ikon, label }, i) => (
        <li key={jenis} className="t-stat t-item-masuk" data-jenis={jenis} style={{ animationDelay: `${i * 40}ms` }}>
          <span className="t-stat-angka">0</span>
          <span className="t-stat-label"><Ikon size={14} aria-hidden="true" className="shrink-0" />{label}</span>
        </li>
      ))}
    </ul>
  );
};

/* ---------- Kerangka ---------- */

export const KerangkaTera: React.FC = () => {
  const { user, isOnline } = useAuth();
  const lokasi = useLocation();
  const nama = user?.fullName || 'Teknisi';

  return (
    <div className="tera-root t-app">
      <header className="t-bar">
        <div className="t-bar-baris">
          <div className="t-bar-lencana">
            <img src={LOGO_EMBLEM} width={32} height={32} alt="Logo Tera SMK" decoding="async" />
          </div>
          <div className="t-bar-teks">
            <p className="t-bar-salam">Halo,</p>
            <p className="t-bar-nama truncate">{nama}</p>
          </div>
        </div>
        <div className="t-bar-chips">
          <span className="t-chip-header tabular">
            <Clock size={14} aria-hidden="true" />
            <span className="truncate">{JUMLAH_DI_PERANGKAT} di perangkat</span>
          </span>
          {isOnline ? (
            <span className="t-chip-header">
              <Check size={14} aria-hidden="true" />
              <span className="truncate">Tidak ada yang menunggu kirim</span>
            </span>
          ) : (
            <span className="t-chip-header" role="status">
              <WifiOff size={14} aria-hidden="true" />
              <span className="truncate">Offline · data aman di perangkat</span>
            </span>
          )}
        </div>
      </header>

      <nav className="t-nav" aria-label="Menu utama Tera SMK">
        <div className="t-nav-brand">
          <div className="t-bar-lencana" style={{ border: '1px solid var(--t-border)' }}>
            <img src={LOGO_EMBLEM} width={32} height={32} alt="" decoding="async" />
          </div>
          <div className="min-w-0">
            <strong>Tera SMK</strong>
            <span className="t-ket">Tertelusur · Efisien · Rapi · Akurat</span>
          </div>
        </div>
        <div className="t-nav-daftar">
          {MENU.map(({ ke, label, ikon: Ikon, persis }) => (
            <NavLink key={ke} to={ke} end={persis} className="t-nav-item">
              <Ikon size={24} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
        <div className="t-nav-akun">
          <p className="truncate text-[14px] font-medium" style={{ color: 'var(--t-text)' }}>{nama}</p>
          <p className="t-ket truncate">{user?.roleLabel}</p>
        </div>
      </nav>

      <main className="t-main" id="isi-utama">
        <div key={lokasi.pathname} className="t-halaman t-halaman-masuk">
          <BatasKesalahan key={lokasi.pathname}>
            <Outlet />
          </BatasKesalahan>
        </div>
      </main>
    </div>
  );
};

/* ---------- Halaman ---------- */

export const HalamanBeranda: React.FC = () => (
  <>
    <h1 className="t-judul-layar">Beranda</h1>
    <div className="mt-4"><Statistik /></div>
    <div className="t-belah mt-6">
      <section aria-labelledby="judul-rs">
        <h2 id="judul-rs" className="t-judul-bagian">Rumah sakit aktif</h2>
        <div className="mt-3">
          <KeadaanKosong
            ikon={Building2}
            judul="Belum ada jadwal"
            pesan="Hubungi Admin Teknik agar jadwal dikirim ke aplikasi ini."
          />
        </div>
      </section>
      <aside className="t-ringkasan" aria-labelledby="judul-ringkasan">
        <h2 id="judul-ringkasan" className="t-judul-bagian">Ringkasan</h2>
        <div className="t-kartu mt-3">
          <p className="t-teks-2 text-[15px]">
            Pilih rumah sakit di daftar untuk melihat alat PO, jumlah yang sudah dikerjakan, dan sisanya.
          </p>
        </div>
      </aside>
    </div>
  </>
);

export const HalamanLkk: React.FC = () => (
  <>
    <h1 className="t-judul-layar">LKK</h1>
    <div className="mt-4">
      <KeadaanKosong
        ikon={ClipboardCheck}
        judul="Belum ada LKK"
        pesan="LKK muncul setelah Admin Teknik mengirim jadwal ke aplikasi ini."
      />
    </div>
  </>
);

export const HalamanAkun: React.FC = () => {
  const { user, logout } = useAuth();
  const huruf = (user?.fullName || user?.email || 'T').trim().charAt(0).toUpperCase();
  return (
    <>
      <h1 className="t-judul-layar">Akun</h1>

      <section className="t-kartu mt-4" aria-label="Profil">
        <div className="flex items-center gap-4">
          <div className="t-avatar" aria-hidden="true">{huruf}</div>
          <div className="min-w-0">
            <p className="break-words text-[17px] font-semibold leading-snug">{user?.fullName}</p>
            <p className="t-ket">{user?.roleLabel}</p>
            <p className="t-ket break-all">{user?.email}</p>
          </div>
        </div>
      </section>

      <div className="t-info mt-4" role="note">
        <Info size={20} aria-hidden="true" className="shrink-0" />
        <p>
          Jangan memilih “Hapus data situs/cache” di Chrome selama masih ada LKK yang belum
          berstatus hijau (Diterima server). Data di perangkat bisa hilang.
        </p>
      </div>

      <section className="t-kartu mt-4" aria-label="Tentang aplikasi">
        <p className="text-[15px] font-semibold">Tera SMK</p>
        <p className="t-ket">Teknologi Evaluasi &amp; Rekam Alkes · PT Sarana Multi Kalibrasi</p>
      </section>

      <div className="mt-6" style={{ maxWidth: 420 }}>
        <button type="button" onClick={() => { void logout(); }} className="t-tombol t-tombol-kedua">
          <LogOut size={18} aria-hidden="true" />
          Keluar
        </button>
      </div>
    </>
  );
};
