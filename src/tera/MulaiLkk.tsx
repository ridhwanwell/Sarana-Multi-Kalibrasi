/**
 * MULAI LKK BARU — pilih nomor stiker lalu LKK terbentuk (Tahap 4.3b, PRD F3.1–F3.4).
 *
 * Perumpamaan: loket pengambilan lembar kerja. Teknisi menunjukkan stiker (scan kamera, atau ketik
 * 4 angka), petugas mencocokkan dengan jatah RS itu, menanyakan "sudah sesuai dengan stiker di alat?",
 * baru menyerahkan lembar kerja kosong. Semuanya berjalan di perangkat, tanpa internet.
 *
 * Alur: [jenis alat — hanya alat tambahan] → nomor (Scan stiker | Ketik manual) → konfirmasi → LKK draft.
 * Pemindai memakai pustaka html5-qrcode yang sudah ada (dimuat hanya saat kamera dibuka) dengan
 * tampilan Ocean; "Ketik manual" selalu terlihat (CLAUDE.md 13.6).
 *
 * UI: ui-ux-pro-max (area sentuh 48 px, label terlihat, galat di bawah kotak, fokus & Esc, safe area,
 * reduced-motion) + break-ui (nama alat/RS sangat panjang, izin kamera ditolak, QR bukan stiker).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Camera, Check, ChevronLeft, Keyboard, Loader2, Tag, X } from 'lucide-react';
import { cleanLabelString } from '../lib/labelParser';
import { buatLkk, daftarLkk, type LkkLokal } from './data/teraDb';
import type { HitunganAlat, JadwalLokal } from './data/jadwalLokal';
import type { TemplateAlat } from './shared/hitung';
import { cekNomorLabel, nomorDariKetikan, tanggalLokal, templateUntukAlat, type HasilCekNomor } from './shared/nomorLabel';

type Langkah = 'jenis' | 'nomor' | 'kamera' | 'konfirmasi';

export interface MulaiLkkProps {
  jadwal: JadwalLokal;
  /** Alat PO yang dikerjakan; null = alat tambahan (di luar PO). */
  alat: HitunganAlat | null;
  templates: TemplateAlat[];
  pemilik: string;
  onTutup: () => void;
  onDibuat: (lkk: LkkLokal, template: TemplateAlat) => void;
}

/* ---------- Pemindai kamera ---------- */

const ID_PEMINDAI = 't-pemindai-stiker';

const Pemindai: React.FC<{ onHasil: (teks: string) => void; onKetik: () => void }> = ({ onHasil, onKetik }) => {
  const [galat, setGalat] = useState<string | null>(null);
  const [siap, setSiap] = useState(false);
  const [saran, setSaran] = useState<string | null>(null);
  const selesai = useRef(false);
  const terakhir = useRef('');
  const onHasilRef = useRef(onHasil);
  onHasilRef.current = onHasil;

  useEffect(() => {
    let batal = false;
    let pemindai: any = null;
    (async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
        if (batal) return;
        pemindai = new Html5Qrcode(ID_PEMINDAI, { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false });
        await pemindai.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: (w: number, h: number) => { const s = Math.floor(Math.min(w, h) * 0.7); return { width: s, height: s }; } },
          (teks: string) => {
            if (selesai.current || teks === terakhir.current) return;
            terakhir.current = teks;
            const nomor = cleanLabelString(teks);
            if (nomor) { selesai.current = true; onHasilRef.current(nomor); }
            else setSaran('QR ini bukan stiker kalibrasi. Arahkan ke QR pada stiker di alat.');
          },
          () => { /* bingkai tanpa QR: diam */ }
        );
        if (!batal) setSiap(true);
      } catch (e: any) {
        if (batal) return;
        setGalat(e?.name === 'NotAllowedError' || /permission|denied|izin/i.test(String(e?.message))
          ? 'Izin kamera ditolak. Aktifkan izin kamera untuk aplikasi ini di pengaturan HP, atau ketik nomor stiker secara manual.'
          : 'Kamera tidak bisa dibuka. Ketik nomor stiker secara manual.');
      }
    })();
    return () => {
      batal = true;
      if (pemindai) {
        Promise.resolve(pemindai.stop()).catch(() => { /* belum sempat menyala */ }).finally(() => { try { pemindai.clear(); } catch { /* sudah bersih */ } });
      }
    };
  }, []);

  return (
    <div>
      <div className="t-kamera" data-siap={siap}>
        <div id={ID_PEMINDAI} />
        {!siap && !galat && (
          <p className="t-kamera-info" role="status"><Loader2 size={20} aria-hidden="true" className="t-putar" />Membuka kamera…</p>
        )}
      </div>
      {galat ? (
        <p className="t-pesan-error mt-3" role="alert"><AlertCircle size={16} aria-hidden="true" className="shrink-0 mt-0.5" /><span>{galat}</span></p>
      ) : (
        <p className="t-ket mt-3" role="status">{saran || 'Arahkan kamera ke QR pada stiker di alat.'}</p>
      )}
      <button type="button" className="t-tombol t-tombol-kedua mt-3" onClick={onKetik}>
        <Keyboard size={20} aria-hidden="true" />Ketik manual
      </button>
    </div>
  );
};

/* ---------- Lembar ---------- */

export const MulaiLkk: React.FC<MulaiLkkProps> = ({ jadwal, alat, templates, pemilik, onTutup, onDibuat }) => {
  const tambahan = alat === null;
  const templatePo = alat ? templateUntukAlat(alat.nama, templates) : null;
  const [langkah, setLangkah] = useState<Langkah>(tambahan ? 'jenis' : 'nomor');
  const [template, setTemplate] = useState<TemplateAlat | null>(templatePo);
  const [ketikan, setKetikan] = useState('');
  const [galat, setGalat] = useState<string | null>(null);
  const [hasil, setHasil] = useState<Extract<HasilCekNomor, { ok: true }> | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);
  const sibuk = useRef(false);
  const judulRef = useRef<HTMLHeadingElement>(null);

  const utama = jadwal.labelAwal && jadwal.labelAkhir ? { awal: jadwal.labelAwal, akhir: jadwal.labelAkhir } : null;
  const cadangan = jadwal.cadanganAwal && jadwal.cadanganAkhir ? { awal: jadwal.cadanganAwal, akhir: jadwal.cadanganAkhir } : null;

  // Esc menutup (kecuali saat menyimpan); layar belakang tidak ikut menggulung; fokus pindah ke judul langkah
  useEffect(() => {
    const saatTombol = (e: KeyboardEvent) => { if (e.key === 'Escape' && !sibuk.current) onTutup(); };
    document.addEventListener('keydown', saatTombol);
    const lama = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', saatTombol); document.body.style.overflow = lama; };
  }, [onTutup]);
  useEffect(() => { judulRef.current?.focus(); }, [langkah]);

  const periksa = useCallback(async (nomor: string | null) => {
    setGalat(null);
    try {
      const semua = await daftarLkk(pemilik);
      const dipakai = new Set(semua.map((l) => l.noLabel).filter((x): x is string => !!x));
      const h = cekNomorLabel({ nomor, bo: jadwal.bo, utama, cadangan, dipakai, mode: tambahan ? 'tambahan' : 'po' });
      if (!h.ok) { setGalat(h.pesan); setLangkah('nomor'); return; }
      setHasil(h);
      setLangkah('konfirmasi');
    } catch {
      setGalat('Data di perangkat belum bisa dibaca. Coba lagi.');
      setLangkah('nomor');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pemilik, jadwal.bo, jadwal.labelAwal, jadwal.labelAkhir, jadwal.cadanganAwal, jadwal.cadanganAkhir, tambahan]);

  const kirimKetikan = (e: React.FormEvent) => {
    e.preventDefault();
    const nomor = nomorDariKetikan(jadwal.bo, ketikan);
    if (!nomor) { setGalat('Ketik 4 angka di belakang titik pada stiker (contoh 0012).'); return; }
    void periksa(nomor);
  };

  const simpan = async () => {
    if (!hasil || !template || sibuk.current) return;
    sibuk.current = true;
    setMenyimpan(true);
    setGalat(null);
    try {
      // Periksa ulang tepat sebelum menulis (nomor bisa terpakai sejak diperiksa)
      const semua = await daftarLkk(pemilik);
      if (semua.some((l) => l.noLabel === hasil.nomor)) {
        setGalat(`Nomor stiker ${hasil.nomor} sudah dipakai LKK lain di perangkat ini.`);
        setLangkah('nomor');
        return;
      }
      const lkk = await buatLkk({
        pemilik, bo: jadwal.bo, noLabel: hasil.nomor,
        templateKode: template.kode_alat, templateVersi: template.versi,
        tanggalKalibrasi: tanggalLokal(),
        alatTambahan: tambahan, poItemRef: alat?.ref ?? null, jadwalId: jadwal.jadwalId,
        data: {},
      });
      onDibuat(lkk, template);
    } catch (e: any) {
      setGalat(String(e?.message || 'LKK belum bisa dibuat. Data di perangkat tetap aman. Coba lagi.'));
      setLangkah('konfirmasi');
    } finally {
      sibuk.current = false;
      setMenyimpan(false);
    }
  };

  const mundur = () => { setGalat(null); setLangkah('nomor'); };
  const namaAlat = template?.nama || alat?.nama || 'Alat tambahan';
  const rentang = tambahan
    ? (cadangan ? `Stiker cadangan ${cadangan.awal} – ${cadangan.akhir}` : 'Tidak ada stiker cadangan')
    : [utama && `Utama ${utama.awal} – ${utama.akhir}`, cadangan && `cadangan ${cadangan.awal} – ${cadangan.akhir}`].filter(Boolean).join(' · ');

  const judul = langkah === 'jenis' ? 'Pilih jenis alat tambahan'
    : langkah === 'kamera' ? 'Scan stiker'
    : langkah === 'konfirmasi' ? 'Cek nomor stiker'
    : 'Nomor stiker alat';

  return createPortal(
    <div className="t-lapis tera-root">
      <div className="t-lembar" role="dialog" aria-modal="true" aria-labelledby="judul-mulai-lkk">
        <div className="t-lembar-kepala">
          {langkah === 'kamera' || (langkah === 'konfirmasi') || (langkah === 'nomor' && tambahan) ? (
            <button type="button" className="t-tombol-ikon" aria-label="Kembali" onClick={() => {
              setGalat(null);
              setLangkah(langkah === 'nomor' ? 'jenis' : 'nomor');
            }}><ChevronLeft size={24} aria-hidden="true" /></button>
          ) : <span className="t-tombol-ikon" aria-hidden="true" />}
          <h2 id="judul-mulai-lkk" ref={judulRef} tabIndex={-1} className="t-lembar-judul">{judul}</h2>
          <button type="button" className="t-tombol-ikon" aria-label="Tutup" onClick={onTutup} disabled={menyimpan}><X size={24} aria-hidden="true" /></button>
        </div>

        <p className="t-ket t-lembar-sub">
          {langkah !== 'jenis' && <strong className="t-lembar-alat">{namaAlat}{tambahan ? ' · alat tambahan' : ''}</strong>}
          <span className="tabular"> BO {jadwal.bo}</span> · <span className="t-rs-judul">{jadwal.namaRs}</span>
        </p>

        {langkah === 'jenis' && (
          <div className="mt-4">
            {!cadangan ? (
              <p className="t-pesan-error" role="alert"><AlertCircle size={16} aria-hidden="true" className="shrink-0 mt-0.5" />Jadwal ini tidak punya stiker cadangan. Hubungi Admin Teknik.</p>
            ) : templates.length === 0 ? (
              <p className="t-ket">Belum ada template alat di perangkat. Buka aplikasi dengan internet sekali lalu coba lagi.</p>
            ) : (
              <ul className="t-pilihan" aria-label="Jenis alat">
                {templates.map((t) => (
                  <li key={t.kode_alat}>
                    <button type="button" className="t-pilihan-isi" onClick={() => { setTemplate(t); setGalat(null); setLangkah('nomor'); }}>
                      <span className="t-pilihan-nama">{t.nama}</span>
                      <span className="t-ket">Kop {t.kop === 'KAN' ? 'KAN' : 'Non-KAN'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {langkah === 'nomor' && (
          <div className="mt-4">
            <button type="button" className="t-tombol t-tombol-utama" onClick={() => { setGalat(null); setLangkah('kamera'); }}>
              <Camera size={24} aria-hidden="true" />Scan stiker
            </button>
            <p className="t-pemisah" aria-hidden="true"><span>atau ketik manual</span></p>
            <form onSubmit={kirimKetikan} noValidate>
              <label className="t-label" htmlFor="t-empat-angka">Nomor stiker (BO sudah terisi)</label>
              <div className="t-kotak" data-error={galat ? 'true' : undefined}>
                <span className="t-ikon-kotak tabular t-awalan" aria-hidden="true">{jadwal.bo}.</span>
                <input
                  id="t-empat-angka" inputMode="numeric" autoComplete="off" maxLength={8} placeholder="0012"
                  value={ketikan} onChange={(e) => { setKetikan(e.target.value); if (galat) setGalat(null); }}
                  aria-describedby="t-ket-rentang t-galat-nomor" aria-invalid={galat ? true : undefined}
                />
              </div>
              <p id="t-ket-rentang" className="t-ket mt-1 tabular">{rentang}</p>
              <div id="t-galat-nomor" aria-live="polite">
                {galat && <p className="t-pesan-error" role="alert"><AlertCircle size={16} aria-hidden="true" className="shrink-0 mt-0.5" /><span>{galat}</span></p>}
              </div>
              <button type="submit" className="t-tombol t-tombol-kedua mt-3"><Keyboard size={20} aria-hidden="true" />Periksa nomor</button>
            </form>
          </div>
        )}

        {langkah === 'kamera' && (
          <div className="mt-4">
            <Pemindai onHasil={(n) => { void periksa(n); }} onKetik={mundur} />
          </div>
        )}

        {langkah === 'konfirmasi' && hasil && (
          <div className="mt-4">
            <div className="t-konfirmasi">
              <p className="t-ket">Nomor stiker</p>
              <p className="t-konfirmasi-nomor tabular" aria-label={`Nomor stiker ${hasil.nomor}`}>{hasil.nomor}</p>
              {(hasil.jenis === 'cadangan' || tambahan) && (
                <span className="t-chip-sync" data-jenis="draft"><Tag size={14} aria-hidden="true" className="t-chip-sync-ikon" /><span>Stiker cadangan</span></span>
              )}
            </div>
            <p className="t-konfirmasi-tanya">Nomor stiker {hasil.nomor} — sudah sesuai dengan stiker di alat?</p>
            {galat && <p className="t-pesan-error" role="alert"><AlertCircle size={16} aria-hidden="true" className="shrink-0 mt-0.5" /><span>{galat}</span></p>}
            <button type="button" className="t-tombol t-tombol-utama mt-3" onClick={() => void simpan()} disabled={menyimpan}>
              {menyimpan ? <Loader2 size={20} aria-hidden="true" className="t-putar" /> : <Check size={20} aria-hidden="true" />}
              {menyimpan ? 'Menyimpan…' : 'Ya, sesuai — mulai LKK'}
            </button>
            <button type="button" className="t-tombol t-tombol-kedua mt-2" onClick={mundur} disabled={menyimpan}>Ubah nomor</button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
