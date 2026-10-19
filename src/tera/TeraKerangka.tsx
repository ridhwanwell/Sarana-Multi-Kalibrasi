/**
 * Tera SMK — kerangka aplikasi (Tahap 1.4b).
 *
 * HP & tablet portrait : header biru di atas + tab bawah (Beranda · LKK · Akun)
 * Tablet landscape/laptop: menu samping kiri + header tipis (lihat tera-tema.css)
 *
 * Beranda & Detail RS ada di HalamanJadwal.tsx (Tahap 3.4b); halaman LKK & Akun di file ini.
 *
 * UI: ui-ux-pro-max (Active State, Deep Linking, Empty States, badge bukan tombol,
 * <nav>/<button> semantik), design-system (semua warna lewat token).
 */
import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  AlertCircle,
  Check,
  Clock,
  ClipboardCheck,
  Download,
  Info,
  LayoutDashboard,
  Loader2,
  LogOut,
  Pencil,
  Smartphone,
  Upload,
  User,
  WifiOff
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useSinkron } from './SinkronKonteks';
import { LaciUji } from './LaciUji';
import type { LkkLokal, SyncState } from './data/teraDb';

const LOGO_EMBLEM = '/tera/tera-emblem-256.webp';

/** Jam:menit (zona waktu perangkat) untuk keterangan cadangan. */
const jam = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';

const MENU = [
  { ke: '/tera/', label: 'Beranda', ikon: LayoutDashboard, persis: true },
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

export const KeadaanKosong: React.FC<{
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

/** Chip status satu LKK: selalu warna + ikon + tulisan (CLAUDE.md 13.4). */
const INFO_CHIP: Record<SyncState, { label: string; ikon: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean; className?: string }> }> = {
  draft: { label: 'Sedang diisi', ikon: Pencil },
  tersimpan: { label: 'Tersimpan di perangkat', ikon: Clock },
  mengirim: { label: 'Sedang dikirim', ikon: Upload },
  diterima: { label: 'Diterima server', ikon: Check },
  ditolak: { label: 'Perlu diperbaiki', ikon: AlertCircle }
};

export const ChipSync: React.FC<{ state: SyncState }> = ({ state }) => {
  const { label, ikon: Ikon } = INFO_CHIP[state];
  return (
    <span className="t-chip-sync" data-jenis={state}>
      <Ikon size={14} aria-hidden={true} className="t-chip-sync-ikon" />
      <span>{label}</span>
    </span>
  );
};

export const Statistik: React.FC = () => {
  const { ringkasan: r, siap } = useSinkron();
  const butir = [
    { jenis: 'wait', ikon: Clock, label: 'Di perangkat', angka: r.tersimpan },
    { jenis: 'send', ikon: Upload, label: 'Sedang dikirim', angka: r.mengirim },
    { jenis: 'ok', ikon: Check, label: 'Diterima server', angka: r.diterima },
    ...(r.ditolak > 0 ? [{ jenis: 'bad', ikon: AlertCircle, label: 'Perlu diperbaiki', angka: r.ditolak }] : [])
  ] as const;
  return (
    <>
      <ul className="t-statistik" aria-label="Ringkasan status LKK" aria-busy={!siap}>
        {butir.map(({ jenis, ikon: Ikon, label, angka }, i) => (
          <li key={jenis} className="t-stat t-item-masuk" data-jenis={jenis} style={{ animationDelay: `${i * 40}ms` }}>
            <span className="t-stat-angka">{angka}</span>
            <span className="t-stat-label"><Ikon size={14} aria-hidden="true" className="shrink-0" />{label}</span>
          </li>
        ))}
      </ul>
      {r.draft > 0 && (
        <p className="t-ket mt-2">{r.draft} LKK masih berupa draft (sedang diisi).</p>
      )}
    </>
  );
};

/* ---------- Spanduk peringatan penyimpanan (tidak bisa ditutup, CLAUDE.md 5.7) ---------- */

const Spanduk: React.FC = () => {
  const { gagalPenyimpanan, terpasang, izinPermanen, ringkasan: r, pasangKeLayarUtama } = useSinkron();
  const butir: React.ReactNode[] = [];

  if (gagalPenyimpanan) {
    butir.push(
      <div key="gagal" className="t-spanduk" data-jenis="bad" role="alert">
        <AlertCircle size={20} aria-hidden="true" className="shrink-0" />
        <div>
          <strong>Penyimpanan di perangkat tidak bisa dibuka.</strong>
          <p>Jangan mengisi LKK dulu. Tutup mode penyamaran/privat, lalu buka lagi. Bila tetap begini, hubungi Developer.</p>
        </div>
      </div>
    );
  }

  if (r.ditolak > 0) {
    butir.push(
      <div key="tolak" className="t-spanduk" data-jenis="bad" role="alert">
        <AlertCircle size={20} aria-hidden="true" className="shrink-0" />
        <div>
          <strong>{r.ditolak} LKK ditolak server.</strong>
          <p>Isinya aman di perangkat. Buka menu LKK, baca alasannya, lalu perbaiki.</p>
        </div>
      </div>
    );
  }

  if (!terpasang) {
    butir.push(
      <div key="pasang" className="t-spanduk" data-jenis="warn" role="status">
        <Smartphone size={20} aria-hidden="true" className="shrink-0" />
        <div>
          <strong>Pasang Tera SMK ke layar utama.</strong>
          <p>
            Dibuka dari tab browser, data lebih mudah terhapus. iPhone: ketuk Bagikan, lalu “Tambah ke Layar Utama”.
            Android: menu titik tiga, lalu “Instal aplikasi”.
          </p>
          {pasangKeLayarUtama && (
            <button type="button" className="t-tombol t-tombol-kedua t-tombol-kecil" onClick={() => { void pasangKeLayarUtama(); }}>
              Pasang sekarang
            </button>
          )}
        </div>
      </div>
    );
  } else if (izinPermanen === false) {
    butir.push(
      <div key="izin" className="t-spanduk" data-jenis="warn" role="status">
        <Info size={20} aria-hidden="true" className="shrink-0" />
        <div>
          <strong>Penyimpanan belum dijamin permanen.</strong>
          <p>Jangan menghapus data situs/cache Chrome. Kirim LKK secepatnya bila ada sinyal, atau gunakan “Backup ke file” di menu Akun.</p>
        </div>
      </div>
    );
  }

  return butir.length ? <div className="t-spanduk-daftar">{butir}</div> : null;
};

/* ---------- Kerangka ---------- */

export const KerangkaTera: React.FC = () => {
  const { user, isOnline } = useAuth();
  const { ringkasan: r } = useSinkron();
  const lokasi = useLocation();
  const nama = user?.fullName?.trim() || 'Teknisi';
  const diPerangkat = r.belumHijau + r.draft;
  const adaKirim = r.mengirim > 0;
  const menunggu = r.tersimpan + r.mengirim;

  return (
    <div className="tera-root t-app">
      <header className="t-bar">
        <div className="t-bar-baris">
          <div className="t-bar-lencana">
            <img src={LOGO_EMBLEM} width={32} height={32} alt="Logo Tera SMK" decoding="async" />
          </div>
          <div className="t-bar-teks">
            <p className="t-bar-salam">Halo,</p>
            <p className="t-bar-nama truncate" title={nama}>{nama}</p>
          </div>
        </div>
        <div className="t-bar-chips">
          <span className="t-chip-header tabular">
            <Clock size={14} aria-hidden="true" />
            <span className="truncate">{diPerangkat} di perangkat</span>
          </span>
          {!isOnline ? (
            <span className="t-chip-header" role="status">
              <WifiOff size={14} aria-hidden="true" />
              <span className="truncate" title="Offline · data aman di perangkat">Offline · data aman di perangkat</span>
            </span>
          ) : r.ditolak > 0 ? (
            <span className="t-chip-header" role="status">
              <AlertCircle size={14} aria-hidden="true" />
              <span className="truncate">{r.ditolak} perlu diperbaiki</span>
            </span>
          ) : adaKirim ? (
            <span className="t-chip-header" role="status">
              <Upload size={14} aria-hidden="true" className="t-denyut" />
              <span className="truncate">Mengirim {menunggu}…</span>
            </span>
          ) : menunggu > 0 ? (
            <span className="t-chip-header" role="status">
              <Clock size={14} aria-hidden="true" />
              <span className="truncate">{menunggu} menunggu kirim</span>
            </span>
          ) : (
            <span className="t-chip-header">
              <Check size={14} aria-hidden="true" />
              <span className="truncate" title="Tidak ada yang menunggu kirim">Tidak ada yang menunggu kirim</span>
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
          <p className="truncate text-[14px] font-medium" style={{ color: 'var(--t-text)' }} title={nama}>{nama}</p>
          {user?.roleLabel && <p className="t-ket truncate" title={user.roleLabel}>{user.roleLabel}</p>}
        </div>
      </nav>

      <main className="t-main" id="isi-utama">
        <div key={lokasi.pathname} className="t-halaman t-halaman-masuk">
          <Spanduk />
          <BatasKesalahan key={lokasi.pathname}>
            <Outlet />
          </BatasKesalahan>
        </div>
      </main>
    </div>
  );
};

/* ---------- Halaman ---------- */

export const BarisLkk: React.FC<{ l: LkkLokal }> = React.memo(({ l }) => (
  <li className="t-lkk-baris">
    <div className="t-lkk-utama">
      <p className="t-lkk-nomor tabular truncate" title={l.noLabel || undefined}>{l.noLabel || 'Nomor label belum diisi'}</p>
      <p className="t-ket truncate" title={l.templateKode || undefined}>
        {l.templateKode || 'Jenis alat belum dipilih'}
        {l.alatTambahan ? ' · alat tambahan' : ''}
        {l.isTest ? ' · data uji' : ''}
      </p>
      {l.syncState === 'ditolak' && l.alasanDitolak && (
        <p className="t-lkk-alasan" role="note">{l.alasanDitolak}</p>
      )}
    </div>
    <ChipSync state={l.syncState} />
  </li>
));
BarisLkk.displayName = 'BarisLkk';

export const HalamanLkk: React.FC = () => {
  const { daftar, siap } = useSinkron();
  return (
    <>
      <h1 className="t-judul-layar">LKK</h1>
      <div className="mt-4">
        {!siap ? (
          <p className="t-teks-2 flex items-center gap-2 text-[15px]" role="status">
            <Loader2 size={20} aria-hidden="true" className="t-putar" />Membuka data di perangkat…
          </p>
        ) : daftar.length === 0 ? (
          <KeadaanKosong
            ikon={ClipboardCheck}
            judul="Belum ada LKK"
            pesan="LKK muncul setelah Admin Teknik mengirim jadwal ke aplikasi ini."
          />
        ) : (
          <ul className="t-lkk-daftar" aria-label={`${daftar.length} LKK di perangkat`}>
            {daftar.map((l) => <BarisLkk key={l.id} l={l} />)}
          </ul>
        )}
      </div>
    </>
  );
};

export const HalamanAkun: React.FC = () => {
  const { user, logout } = useAuth();
  const { ringkasan: r, cadanganTerakhir, keluarAman, unduhCadangan, gagalPenyimpanan } = useSinkron();
  const [memeriksa, setMemeriksa] = useState(false);
  const [halangan, setHalangan] = useState<{ belumHijau: number; ditolak: number } | null>(null);
  const [mengunduh, setMengunduh] = useState(false);
  const [infoCadangan, setInfoCadangan] = useState<{ ok: boolean; teks: string } | null>(null);
  const nama = user?.fullName?.trim() || '';
  // Huruf pertama utuh (Array.from tidak memotong huruf beraksen/emoji di tengah)
  const huruf = (Array.from((nama || user?.email || 'T').trim())[0] || 'T').toUpperCase();

  const keluar = async () => {
    setHalangan(null);
    setMemeriksa(true);
    try {
      const hasil = await keluarAman();
      if (hasil.ok) { await logout(); return; }
      setHalangan({ belumHijau: hasil.belumHijau, ditolak: hasil.ditolak });
    } catch {
      setHalangan({ belumHijau: -1, ditolak: 0 });
    } finally {
      setMemeriksa(false);
    }
  };

  const cadangkan = async () => {
    setInfoCadangan(null);
    setMengunduh(true);
    try {
      const { jumlah, namaFile } = await unduhCadangan();
      setInfoCadangan({
        ok: true,
        teks: `${jumlah} LKK disimpan ke file ${namaFile}. Cari di folder Unduhan (iPhone: aplikasi Berkas).`
      });
    } catch {
      setInfoCadangan({ ok: false, teks: 'File cadangan belum bisa dibuat. Coba lagi; data di perangkat tidak terpengaruh.' });
    } finally {
      setMengunduh(false);
    }
  };

  const adaDraftTertunda = r.draftBelumTercadang > 0;

  return (
    <>
      <h1 className="t-judul-layar">Akun</h1>

      <section className="t-kartu mt-4" aria-label="Profil">
        <div className="t-profil">
          <div className="t-avatar" aria-hidden="true">{huruf}</div>
          <div className="t-profil-teks">
            <p className="text-[17px] font-semibold leading-snug">{nama || 'Nama belum diisi'}</p>
            {user?.roleLabel && <p className="t-ket">{user.roleLabel}</p>}
            <p className="t-ket">{user?.email}</p>
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

      <section className="t-kartu mt-4" aria-labelledby="judul-cadangan">
        <h2 id="judul-cadangan" className="text-[15px] font-semibold">Cadangan data</h2>
        <p className="t-ket mt-1" role="status">
          {gagalPenyimpanan
            ? 'Penyimpanan di perangkat tidak bisa dibuka.'
            : adaDraftTertunda
              ? `Cadangan draft tertunda (${r.draftBelumTercadang}). Dikirim otomatis begitu ada sinyal.`
              : cadanganTerakhir
                ? `Draft tercadang di server pukul ${jam(cadanganTerakhir)}.`
                : r.draft > 0
                  ? 'Draft akan dicadangkan otomatis ke server.'
                  : 'Tidak ada draft yang perlu dicadangkan.'}
        </p>
        <p className="t-ket mt-1">
          Cadangan darurat: simpan semua LKK di perangkat ini ke satu file. Gunakan bila sinyal tidak kunjung ada atau aplikasi bermasalah.
        </p>
        <div className="mt-3" style={{ maxWidth: 420 }}>
          <button type="button" onClick={() => { void cadangkan(); }} disabled={mengunduh} aria-busy={mengunduh} className="t-tombol t-tombol-kedua">
            {mengunduh ? <Loader2 size={18} aria-hidden="true" className="t-putar" /> : <Download size={18} aria-hidden="true" />}
            {mengunduh ? 'Menyiapkan file…' : 'Backup ke file'}
          </button>
        </div>
        {infoCadangan && (
          <p className={infoCadangan.ok ? 't-ket mt-2' : 't-pesan-error mt-2'} role="status">{infoCadangan.teks}</p>
        )}
      </section>

      <LaciUji />

      <section className="t-kartu mt-4" aria-label="Tentang aplikasi">
        <p className="text-[15px] font-semibold">Tera SMK</p>
        <p className="t-ket">Teknologi Evaluasi &amp; Rekam Alkes · PT Sarana Multi Kalibrasi</p>
      </section>

      <div className="mt-6" style={{ maxWidth: 420 }}>
        <button type="button" onClick={() => { void keluar(); }} disabled={memeriksa} aria-busy={memeriksa} className="t-tombol t-tombol-kedua">
          {memeriksa ? <Loader2 size={18} aria-hidden="true" className="t-putar" /> : <LogOut size={18} aria-hidden="true" />}
          {memeriksa ? 'Memeriksa data…' : 'Keluar'}
        </button>
        {halangan && (
          <p role="alert" className="t-peringatan">
            <AlertCircle size={20} aria-hidden="true" className="shrink-0" />
            <span>
              {halangan.belumHijau < 0
                ? 'Belum bisa memeriksa data di perangkat. Demi keamanan, Anda belum bisa keluar. Coba lagi.'
                : `Belum bisa keluar: masih ada ${halangan.belumHijau} LKK yang belum berstatus Diterima server${halangan.ditolak > 0 ? ` (${halangan.ditolak} di antaranya perlu diperbaiki)` : ''}. Biarkan aplikasi terbuka dengan internet sampai semuanya hijau. Darurat: pakai “Backup ke file”.`}
            </span>
          </p>
        )}
      </div>
    </>
  );
};
