/**
 * Tera SMK — penghubung antara layar dan "kurir" (Tahap 2.4).
 *
 * Perumpamaan: papan status di bengkel. Kurir (mesinKirim.ts) bekerja di belakang layar;
 * komponen ini hanya memasang kurir saat teknisi masuk, lalu memberi layar angka terbaru:
 * berapa LKK 🟡 / 🔵 / 🟢 / merah, apakah penyimpanan HP dijamin, dan apakah boleh Keluar.
 *
 * Aturan (CLAUDE.md 5): kirim otomatis tanpa tombol; Keluar diblokir selama ada LKK belum
 * hijau; "Backup ke file" sebagai cadangan darurat; data di perangkat tidak dihapus oleh
 * layar ini (tidak ada fungsi hapus di sini).
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { apiFetch } from '../lib/apiClient';
import {
  daftarLkk, eksporCadangan, ringkasan as bacaRingkasan,
  type LkkLokal, type Ringkasan
} from './data/teraDb';
import { mintaPenyimpananPermanen, mulaiMesinKirim, pengirimApi, type MesinKirim } from './data/mesinKirim';
import { daftarJadwalAktif, tarikJadwal, type JadwalLokal } from './data/jadwalLokal';
import { tarikMaster } from './data/masterLokal';

const KOSONG: Ringkasan = {
  draft: 0, tersimpan: 0, mengirim: 0, diterima: 0, ditolak: 0, belumHijau: 0, draftBelumTercadang: 0
};

export type HasilKeluar = { ok: true } | { ok: false; belumHijau: number; ditolak: number };

export interface KeadaanSinkron {
  /** false selama buku di perangkat belum selesai dibaca (angka masih sementara). */
  siap: boolean;
  ringkasan: Ringkasan;
  daftar: LkkLokal[];
  /** Jadwal RS aktif di perangkat (yang dicabut kantor sudah disembunyikan). */
  jadwal: JadwalLokal[];
  /** Status tarik jadwal terakhir: 'belum' | 'ok' | 'gagal' (gagal = jadwal lama tetap dipakai). */
  statusJadwal: { keadaan: 'belum' | 'menarik' | 'ok' | 'gagal'; pesan: string | null; waktu: string | null };
  /** Pesan bila penyimpanan di perangkat tidak bisa dibuka (mis. mode privat). */
  gagalPenyimpanan: string | null;
  /** true = browser menjamin data tidak dihapus saat memori penuh. null = belum diperiksa. */
  izinPermanen: boolean | null;
  /** true = aplikasi dibuka dari ikon layar utama (bukan tab browser biasa). */
  terpasang: boolean;
  /** Waktu cadangan draft terakhir yang berhasil (ISO), atau null. */
  cadanganTerakhir: string | null;
  dorong: () => void;
  /** Tarik jadwal sekarang (juga berjalan otomatis). */
  tarikJadwalSekarang: () => void;
  /** Cadangkan draft lalu cek; jika masih ada yang belum hijau, Keluar ditolak. */
  keluarAman: () => Promise<HasilKeluar>;
  unduhCadangan: () => Promise<{ jumlah: number; namaFile: string }>;
  /** Tersedia hanya di Chrome Android (kejadian beforeinstallprompt). */
  pasangKeLayarUtama: (() => Promise<void>) | null;
}

const Konteks = createContext<KeadaanSinkron | null>(null);

export function useSinkron(): KeadaanSinkron {
  const k = useContext(Konteks);
  if (!k) throw new Error('useSinkron harus dipakai di dalam <SinkronProvider>.');
  return k;
}

function sedangTerpasang(): boolean {
  try {
    if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
    if (window.matchMedia?.('(display-mode: fullscreen)').matches) return true;
    return (navigator as any).standalone === true; // iPhone
  } catch {
    return false;
  }
}

export const SinkronProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const pemilik = user?.id || '';

  const [siap, setSiap] = useState(false);
  const [ringkasan, setRingkasan] = useState<Ringkasan>(KOSONG);
  const [daftar, setDaftar] = useState<LkkLokal[]>([]);
  const [jadwal, setJadwal] = useState<JadwalLokal[]>([]);
  const [statusJadwal, setStatusJadwal] = useState<KeadaanSinkron['statusJadwal']>({ keadaan: 'belum', pesan: null, waktu: null });
  const [gagalPenyimpanan, setGagalPenyimpanan] = useState<string | null>(null);
  const [izinPermanen, setIzinPermanen] = useState<boolean | null>(null);
  const [terpasang, setTerpasang] = useState<boolean>(() => sedangTerpasang());
  const [acaraPasang, setAcaraPasang] = useState<any>(null);

  const mesin = useRef<MesinKirim | null>(null);
  const hidup = useRef(true);
  const sedangMuat = useRef(false);
  const adaMuatLagi = useRef(false);

  // Baca ulang daftar LKK di perangkat. Dijaga agar tidak menumpuk saat banyak perubahan beruntun.
  const muat = useCallback(async () => {
    if (!pemilik) return;
    if (sedangMuat.current) { adaMuatLagi.current = true; return; }
    sedangMuat.current = true;
    try {
      do {
        adaMuatLagi.current = false;
        const [r, d, j] = await Promise.all([bacaRingkasan(pemilik), daftarLkk(pemilik), daftarJadwalAktif(pemilik)]);
        if (!hidup.current) return;
        setRingkasan(r);
        setDaftar(d);
        setJadwal((lama) => (JSON.stringify(lama) === JSON.stringify(j) ? lama : j));
        setSiap(true);
        setGagalPenyimpanan(null);
      } while (adaMuatLagi.current);
    } catch (e: any) {
      if (hidup.current) {
        setGagalPenyimpanan(String(e?.message || 'Penyimpanan di perangkat tidak bisa dibuka.'));
        setSiap(true);
      }
    } finally {
      sedangMuat.current = false;
    }
  }, [pemilik]);

  // Tarik jadwal dari server. Gagal = diam-diam pakai jadwal lama (offline-first), tidak pernah mengunci layar.
  const sedangTarik = useRef(false);
  const tarik = useCallback(async () => {
    if (!pemilik || sedangTarik.current) return;
    sedangTarik.current = true;
    setStatusJadwal((s) => ({ ...s, keadaan: 'menarik' }));
    try {
      const h = await tarikJadwal(pemilik, (signal) =>
        apiFetch('/api/tera/jadwal', { method: 'GET', retries: 0, timeoutMs: 15000, signal }));
      // Template & kalibrator ikut ditarik (4.3a). Gagal = pakai salinan lama / template bawaan, tanpa pesan.
      await tarikMaster((signal) => apiFetch('/api/tera/master', { method: 'GET', retries: 0, timeoutMs: 15000, signal }))
        .catch(() => undefined);
      if (!hidup.current) return;
      if (h.ok) {
        setStatusJadwal({ keadaan: 'ok', pesan: null, waktu: new Date().toISOString() });
        if (h.berubah > 0) void muat();
      } else {
        setStatusJadwal((s) => ({ keadaan: 'gagal', pesan: h.alasan, waktu: s.waktu }));
      }
    } catch (e: any) {
      if (hidup.current) setStatusJadwal((s) => ({ keadaan: 'gagal', pesan: String(e?.message || 'Jadwal belum bisa ditarik.'), waktu: s.waktu }));
    } finally {
      sedangTarik.current = false;
    }
  }, [pemilik, muat]);

  // Pasang kurir saat teknisi masuk; bongkar saat keluar / ganti akun.
  useEffect(() => {
    if (!pemilik) return;
    hidup.current = true;
    setSiap(false);
    setRingkasan(KOSONG);
    setDaftar([]);
    setJadwal([]);
    setStatusJadwal({ keadaan: 'belum', pesan: null, waktu: null });

    const m = mulaiMesinKirim({
      pemilik,
      kirim: pengirimApi,
      onRingkasan: (r) => { if (hidup.current) { setRingkasan(r); void muat(); } },
      onError: (pesan, konteks) => {
        // Laporan ke Developer; gagal melapor tidak boleh mengganggu apa pun.
        void apiFetch('/api/tera/log', {
          method: 'POST',
          body: JSON.stringify({
            pesan,
            konteks,
            perangkat: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 190) : null,
            versiApp: 'tera-2.4'
          }),
          retries: 0,
          timeoutMs: 10000,
          keepalive: true
        }).catch(() => {});
      }
    });
    mesin.current = m;
    void muat();
    void tarik();

    // Penyimpanan permanen (CLAUDE.md 5.7)
    void mintaPenyimpananPermanen().then((ok) => { if (hidup.current) setIzinPermanen(ok); });

    // Cerminan perubahan dari tab lain / sesudah kembali ke aplikasi
    const saatTampil = () => { if (document.visibilityState === 'visible') { setTerpasang(sedangTerpasang()); void muat(); void tarik(); } };
    const saatOnline = () => { void tarik(); };
    window.addEventListener('online', saatOnline);
    // Berkala selama aplikasi terbuka: tiap 5 menit
    const tarikBerkala = window.setInterval(() => { if (document.visibilityState === 'visible') void tarik(); }, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', saatTampil);
    const ulang = window.setInterval(() => { if (document.visibilityState === 'visible') void muat(); }, 5000);

    return () => {
      hidup.current = false;
      document.removeEventListener('visibilitychange', saatTampil);
      window.removeEventListener('online', saatOnline);
      window.clearInterval(tarikBerkala);
      window.clearInterval(ulang);
      m.berhenti();
      mesin.current = null;
    };
  }, [pemilik, muat, tarik]);

  // Tombol "Pasang" Chrome Android
  useEffect(() => {
    const saatTawar = (e: Event) => { e.preventDefault(); setAcaraPasang(e); };
    const saatTerpasang = () => { setAcaraPasang(null); setTerpasang(true); };
    window.addEventListener('beforeinstallprompt', saatTawar);
    window.addEventListener('appinstalled', saatTerpasang);
    return () => {
      window.removeEventListener('beforeinstallprompt', saatTawar);
      window.removeEventListener('appinstalled', saatTerpasang);
    };
  }, []);

  const dorong = useCallback(() => { mesin.current?.dorong(); void muat(); }, [muat]);
  const tarikJadwalSekarang = useCallback(() => { void tarik(); }, [tarik]);

  const keluarAman = useCallback(async (): Promise<HasilKeluar> => {
    // Draft dicadangkan dulu supaya tidak ada yang tertinggal hanya di HP ini.
    try { await mesin.current?.cadangkanDraftSekarang(); } catch { /* cadangan draft bukan penghalang */ }
    mesin.current?.dorong();
    const r = pemilik ? await bacaRingkasan(pemilik) : KOSONG;
    if (hidup.current) { setRingkasan(r); void muat(); }
    if (r.belumHijau > 0) return { ok: false, belumHijau: r.belumHijau, ditolak: r.ditolak };
    return { ok: true };
  }, [pemilik, muat]);

  const unduhCadangan = useCallback(async () => {
    if (!pemilik) throw new Error('Belum masuk.');
    const { namaFile, isi } = await eksporCadangan(pemilik);
    const blob = new Blob([isi], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = namaFile;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    return { jumlah: daftar.length, namaFile };
  }, [pemilik, daftar.length]);

  const pasangKeLayarUtama = useMemo(() => {
    if (!acaraPasang) return null;
    return async () => {
      try {
        await acaraPasang.prompt();
        await acaraPasang.userChoice;
      } finally {
        setAcaraPasang(null);
      }
    };
  }, [acaraPasang]);

  const cadanganTerakhir = useMemo(() => {
    let terbaru: string | null = null;
    for (const l of daftar) if (l.draftBackupAt && (!terbaru || l.draftBackupAt > terbaru)) terbaru = l.draftBackupAt;
    return terbaru;
  }, [daftar]);

  const nilai = useMemo<KeadaanSinkron>(() => ({
    siap, ringkasan, daftar, jadwal, statusJadwal, gagalPenyimpanan, izinPermanen, terpasang, cadanganTerakhir,
    dorong, tarikJadwalSekarang, keluarAman, unduhCadangan, pasangKeLayarUtama
  }), [siap, ringkasan, daftar, jadwal, statusJadwal, gagalPenyimpanan, izinPermanen, terpasang, cadanganTerakhir,
       dorong, tarikJadwalSekarang, keluarAman, unduhCadangan, pasangKeLayarUtama]);

  return <Konteks.Provider value={nilai}>{children}</Konteks.Provider>;
};
