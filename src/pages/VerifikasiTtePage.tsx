/**
 * HALAMAN PUBLIK — Verifikasi Tanda Tangan Elektronik sertifikat Tera SMK (CLAUDE.md 9.6, Tahap 4.6b).
 *
 * Dibuka dari QR TTE di halaman 1 sertifikat: saranamultikalibrasi.com/verifikasi/<kode 24 karakter>.
 * Alamat lama /verifikasi/<nomor label> (stiker) TETAP ke halaman scan QR lama (dipilah di App.tsx).
 * Halaman ini di luar kedua PWA dan tidak di-cache service worker. Data diambil dari server (ringkas, baca saja).
 *
 * UI: ui-ux-pro-max — satu kolom, kontras AA, status = warna + ikon + tulisan, area sentuh ≥ 48 px, tanpa animasi berat.
 */
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, BadgeCheck, FileText, History, Info, Loader2 } from 'lucide-react';

type Data =
  | { k: 'memuat' }
  | { k: 'contoh' }
  | { k: 'tidak' }
  | { k: 'galat' }
  | { k: 'ada'; d: any };

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const tanggal = (v: unknown) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v ?? ''));
  return m ? `${Number(m[3])} ${BULAN[Number(m[2]) - 1]} ${m[1]}` : '-';
};
const tanggalJam = (v: unknown) => {
  const d = new Date(String(v ?? ''));
  if (isNaN(d.getTime())) return '-';
  const j = new Date(d.getTime() + 7 * 3600_000); // WIB
  const p = (n: number) => String(n).padStart(2, '0');
  return `${j.getUTCDate()} ${BULAN[j.getUTCMonth()]} ${j.getUTCFullYear()}, pukul ${p(j.getUTCHours())}.${p(j.getUTCMinutes())} WIB`;
};
const teks = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : '-');

const Baris: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="py-2.5 border-b border-[#D5DEE7] last:border-b-0 grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-0.5 sm:gap-3">
    <dt className="text-[13px] text-[#5B6B80]">{label}</dt>
    <dd className="text-[15px] text-[#1E293B] font-medium break-words">{children}</dd>
  </div>
);

export default function VerifikasiTtePage() {
  const { noLabel: kodeMentah = '' } = useParams();
  const kode = kodeMentah.trim().toLowerCase();
  const [data, setData] = useState<Data>({ k: 'memuat' });

  useEffect(() => {
    let hidup = true;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    (async () => {
      try {
        const r = await fetch(`/api/tera/publik/verifikasi/${encodeURIComponent(kode)}`, { signal: ctrl.signal, cache: 'no-store' });
        const j = await r.json().catch(() => null);
        if (!hidup) return;
        if (r.ok && j?.contoh) setData({ k: 'contoh' });
        else if (r.ok && j?.ditemukan) setData({ k: 'ada', d: j });
        else if (r.status === 404) setData({ k: 'tidak' });
        else setData({ k: 'galat' });
      } catch {
        if (hidup) setData({ k: 'galat' });
      } finally { clearTimeout(t); }
    })();
    return () => { hidup = false; ctrl.abort(); };
  }, [kode]);

  useEffect(() => { document.title = 'Verifikasi Tanda Tangan Elektronik — PT Sarana Multi Kalibrasi'; }, []);

  return (
    <div className="min-h-screen bg-[#EEF6FB] font-sans text-[#1E293B] flex flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <header className="bg-white border-b border-[#D5DEE7]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <img src="/logo-smk.svg" alt="PT Sarana Multi Kalibrasi" className="h-9 w-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <p className="text-[15px] font-semibold leading-tight">PT Sarana Multi Kalibrasi</p>
        </div>
        <div className="h-[3px] bg-[#29C5F6]" aria-hidden="true" />
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-[22px] font-semibold">Verifikasi Tanda Tangan Elektronik</h1>

        {data.k === 'memuat' && (
          <p className="mt-6 flex items-center gap-2 text-[15px] text-[#5B6B80]" role="status">
            <Loader2 className="w-5 h-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />Memeriksa data sertifikat…
          </p>
        )}

        {data.k === 'contoh' && (
          <section className="mt-5 rounded-[14px] bg-white border border-[#D5DEE7] p-5">
            <p className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[14px] font-semibold bg-[#FEF3C7] text-[#92400E]">
              <Info className="w-4 h-4" aria-hidden="true" />QR contoh
            </p>
            <p className="mt-3 text-[16px] leading-relaxed">Ini QR contoh pada pratinjau. Sertifikat belum disetujui, jadi belum ada tanda tangan elektronik yang sah.</p>
          </section>
        )}

        {data.k === 'tidak' && (
          <section className="mt-5 rounded-[14px] bg-white border border-[#D5DEE7] p-5">
            <p className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[14px] font-bold bg-[#FEE2E2] text-[#991B1B]">
              <AlertCircle className="w-4 h-4" aria-hidden="true" />Tidak ditemukan
            </p>
            <p className="mt-3 text-[16px] leading-relaxed">Kode verifikasi ini tidak terdaftar sebagai tanda tangan elektronik sertifikat PT Sarana Multi Kalibrasi. Pastikan QR dipindai langsung dari sertifikat.</p>
          </section>
        )}

        {data.k === 'galat' && (
          <section className="mt-5 rounded-[14px] bg-white border border-[#D5DEE7] p-5">
            <p className="text-[16px] leading-relaxed">Server tidak merespons. Silakan muat ulang halaman ini beberapa saat lagi.</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-3 min-h-[48px] px-5 rounded-[12px] bg-[#0B6FB3] text-white font-semibold active:scale-[0.97]">Muat ulang</button>
          </section>
        )}

        {data.k === 'ada' && (() => {
          const d = data.d; const r = d.ringkasan ?? {};
          const berlaku = d.status === 'berlaku';
          return (
            <section className="mt-5 rounded-[14px] bg-white border border-[#D5DEE7] p-5">
              {berlaku ? (
                <p className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[14px] font-semibold bg-[#DCFCE7] text-[#166534]">
                  <BadgeCheck className="w-4 h-4" aria-hidden="true" />Berlaku
                </p>
              ) : (
                <p className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[14px] font-semibold bg-[#EDE9FE] text-[#5B21B6]">
                  <History className="w-4 h-4" aria-hidden="true" />Digantikan oleh revisi terbaru
                </p>
              )}
              {d.isTest && <p className="mt-2 text-[13px] text-[#5B6B80]">Data uji (bukan sertifikat untuk pelanggan).</p>}

              <p className="mt-4 text-[16px] leading-relaxed">
                Sertifikat ini ditandatangani secara elektronik oleh <strong>{teks(d.ditandatanganiOleh)}</strong> ({teks(d.jabatan)}), PT Sarana Multi Kalibrasi.
              </p>

              <dl className="mt-4">
                <Baris label="Nomor sertifikat"><span className="tabular-nums">{teks(d.noLabel)}</span></Baris>
                <Baris label="Nama alat">{teks(r.namaAlat)}</Baris>
                <Baris label="Merek / Tipe / Nomor seri">{[teks(r.merek), teks(r.tipe), teks(r.noSeri)].join(' / ')}</Baris>
                <Baris label="Rumah sakit">{teks(r.namaRs)}</Baris>
                <Baris label="Tanggal kalibrasi">{tanggal(r.tanggalKalibrasi)}</Baris>
                <Baris label="Hasil">{teks(r.hasil)}</Baris>
                <Baris label="Revisi ke-"><span className="tabular-nums">{Number.isFinite(Number(d.revisi)) ? Number(d.revisi) : '-'}</span></Baris>
                <Baris label="Disetujui (ACC)">{tanggalJam(d.ditandatanganiAt)}</Baris>
              </dl>

              {typeof d.pdfUrl === 'string' && d.pdfUrl.startsWith('/api/tera/publik/sertifikat/') && (
                <a href={d.pdfUrl} target="_blank" rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-[12px] bg-[#0B6FB3] hover:bg-[#095C95] text-white font-semibold active:scale-[0.97]">
                  <FileText className="w-5 h-5" aria-hidden="true" />Lihat sertifikat (PDF)
                </a>
              )}
            </section>
          );
        })()}
      </main>

      <footer className="text-center text-[13px] text-[#5B6B80] px-4 py-5">
        Halaman ini diterbitkan oleh PT Sarana Multi Kalibrasi · saranamultikalibrasi.com
      </footer>
    </div>
  );
}
