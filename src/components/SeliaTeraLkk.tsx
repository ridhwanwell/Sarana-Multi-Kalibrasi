/**
 * Selia — LKK digital Tera SMK (Manajemen Aset SMK, tab Selia).
 *
 * Perumpamaan: meja Penyelia. Tumpukan LKK yang sudah diterima loket ada di atas; LKK yang dipilih dibentangkan
 * di bawahnya sebagai SATU lembar panjang (identitas → lingkungan → fisik → uji → kinerja → kalibrator → kesimpulan →
 * hasil periksa server), dan tombol Kembalikan / ACC ada di paling bawah. Tidak ada pindah-pindah halaman/bagian.
 *
 * Hanya untuk admin_teknik & admin_utama (server juga memeriksa).
 * 25 Okt 2026 (keputusan Ridhwan): penanda mendekati/melewati batas TIDAK ditampilkan dan ACC tidak diblokir;
 * Penyelia bisa langsung mengubah isian (SeliaTeraEditor) tanpa mengembalikan ke teknisi.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, Clock, FileDown, FileText, Folder, FolderOpen, Loader2, Pencil, RotateCcw, ShieldCheck, Stamp, Undo2 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { apiFetch } from '../lib/apiClient';
import { SeliaTeraEditor } from './SeliaTeraEditor';
import { SeliaTeraPompa } from './SeliaTeraPompa';
import { unduhBapBastp, type JenisDokumen } from '../tera/data/unduhBapBastp';

type Peta = Record<string, any>;
interface Ringkas {
  id: string; bo: string; noLabel: string; templateKode: string; status: string; namaRs: string | null; teknisi: string | null;
  tanggalKalibrasi: string | null; alatTambahan: boolean; clientVersion: number; isTest: boolean; diterimaAt: string;
  pemeriksaan: { jejakCocok: boolean; bolehAcc: boolean; kesimpulanServer: string | null; jumlahPenanda: number } | null;
}
interface Penanda { kode: string; teks: string; blokirAcc: boolean }
interface SertTerbit {
  kode: string; revisi: number; status: 'berlaku' | 'digantikan' | string; ditandatanganiAt: string; pdfTersimpan: boolean;
  drive?: { status: 'menunggu' | 'terkirim' | 'gagal' | null; pesan: string | null; url: string | null };
}
interface Detail {
  sertifikat?: SertTerbit[];
  driveTersambung?: boolean;
  lkk: Peta; data: Peta | null; jejakHitung: Peta | null; calibratorSnapshot: Peta | null; template: Peta | null;
  pemeriksaan: { jejakCocok: boolean; bolehAcc: boolean; kesimpulanServer: string | null; penanda: Penanda[]; diperiksaAt?: string } | null;
}

const STATUS: Record<string, { teks: string; kelas: string; ikon: React.ReactNode }> = {
  submitted: { teks: 'Diterima server', kelas: 'bg-emerald-100 text-emerald-900 border-emerald-300', ikon: <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> },
  under_review: { teks: 'Sedang diperiksa', kelas: 'bg-blue-100 text-blue-900 border-blue-300', ikon: <Clock className="w-3.5 h-3.5" aria-hidden="true" /> },
  returned: { teks: 'Dikembalikan', kelas: 'bg-violet-100 text-violet-900 border-violet-300', ikon: <Undo2 className="w-3.5 h-3.5" aria-hidden="true" /> },
  approved: { teks: 'Sudah ACC', kelas: 'bg-[#0B6FB3] text-white border-[#0B6FB3]', ikon: <Stamp className="w-3.5 h-3.5" aria-hidden="true" /> },
  correction_open: { teks: 'Koreksi dibuka', kelas: 'bg-amber-100 text-amber-900 border-amber-300', ikon: <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" /> },
};
const Chip: React.FC<{ status: string }> = ({ status }) => {
  const s = STATUS[status] || { teks: status, kelas: 'bg-slate-100 text-slate-800 border-slate-300', ikon: null };
  return <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-bold ${s.kelas}`}>{s.ikon}{s.teks}</span>;
};

const fmt = (n: unknown, d = 2): string => (typeof n === 'number' && Number.isFinite(n) ? n.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: d }) : '-');
const tgl = (s?: string | null) => { if (!s) return '-'; try { return new Date(s).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return s; } };
const tglPendek = (s?: string | null) => { if (!s) return '-'; try { return new Date(s + (s.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return s; } };

/** Kotak penanda kuning / merah / info — warna + ikon + tulisan. */
const Tanda: React.FC<{ tingkat: 'merah' | 'kuning' | 'info'; judul: string; children?: React.ReactNode; periksa?: { sudah: boolean; ubah: () => void } }> = ({ tingkat, judul, children, periksa }) => {
  const g = tingkat === 'merah'
    ? { box: 'bg-[#FEE2E2] border-l-[3px] border-[#DC2626] text-[#991B1B]', ikon: <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />, tebal: 'font-bold' }
    : tingkat === 'kuning'
    ? { box: 'bg-[#FEF3C7] border-l-[3px] border-[#D97706] text-[#92400E]', ikon: <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />, tebal: 'font-semibold' }
    : { box: 'bg-sky-50 border-l-[3px] border-[#0B6FB3] text-[#095C95]', ikon: <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />, tebal: 'font-semibold' };
  return (
    <div className={`rounded-lg px-3 py-2 text-xs flex gap-2 ${g.box}`}>
      {g.ikon}
      <div className="min-w-0 flex-1">
        <p className={g.tebal}>{judul}</p>
        {children && <div className="mt-0.5 font-normal break-words">{children}</div>}
      </div>
      {periksa && (
        <label className="shrink-0 flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer self-start">
          <input type="checkbox" className="w-4 h-4" checked={periksa.sudah} onChange={periksa.ubah} />
          {periksa.sudah ? <><CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />Sudah saya periksa</> : 'Sudah saya periksa'}
        </label>
      )}
    </div>
  );
};

const Bagian: React.FC<{ id: string; judul: string; children: React.ReactNode }> = ({ id, judul, children }) => (
  <section aria-labelledby={id} className="space-y-3">
    <h4 id={id} className="text-sm font-black text-[#1C658C] border-b border-[#DCDFE3] pb-1.5">{judul}</h4>
    {children}
  </section>
);
const Isian: React.FC<{ nama: string; nilai: React.ReactNode }> = ({ nama, nilai }) => (
  <div className="min-w-0"><dt className="text-[11px] font-semibold text-slate-500">{nama}</dt><dd className="text-sm text-slate-800 break-words">{nilai ?? '-'}</dd></div>
);

type Saringan = 'semua' | 'merah' | 'menunggu' | 'acc';

/** Nama isian identitas seperti di layar teknisi (bukan nama teknis di database). */
const NAMA_IDENTITAS: Record<string, string> = {
  merek: 'Merek', tipe: 'Tipe / model', noSeri: 'Nomor seri', ruang: 'Ruang / lokasi', jenisSkala: 'Jenis skala',
  rentangUkur: 'Rentang ukur (mmHg)', resolusi: 'Resolusi (mmHg)', tanggalPenerimaan: 'Tanggal penerimaan',
};

/** Satu folder = satu rumah sakit (BO). Isinya hanya LKK yang sudah dikirim teknisi. */
interface FolderRs { kunci: string; nama: string; bo: string; isTest: boolean; isi: Ringkas[]; menunggu: number; merah: number }
const adaMerah = (x: Ringkas) => !x.pemeriksaan || !x.pemeriksaan.bolehAcc || !x.pemeriksaan.jejakCocok;

/**
 * jadwalId: undefined = semua LKK (folder per RS); string = hanya LKK jadwal itu (ditanam di Selia Dashboard per RS);
 * null = LKK tanpa jadwal (data uji lama).
 */
export const SeliaTeraLkk: React.FC<{
  jadwalId?: string | null;
  /** Mode halaman detail: hanya isi satu LKK (dibuka sebagai halaman tersendiri oleh SeliaDashboard). */
  lkkId?: string;
  /** Mode daftar: LKK yang diketuk dibuka di halaman baru (bukan dibentangkan di bawah daftar). */
  onPilih?: (id: string) => void;
}> = ({ jadwalId, lkkId, onPilih }) => {
  const tertanam = jadwalId !== undefined;
  const modeDetail = !!lkkId;
  const { role } = useAuth();
  const boleh = role === 'admin_teknik' || role === 'admin_utama';
  const [daftar, setDaftar] = useState<Ringkas[] | null>(null);
  const [terpotong, setTerpotong] = useState(false);
  const [gagalDaftar, setGagalDaftar] = useState<string | null>(null);
  const [saringan, setSaringan] = useState<Saringan>('semua');
  const [pilihId, setPilihId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [gagalDetail, setGagalDetail] = useState<string | null>(null);
  const [memuatDetail, setMemuatDetail] = useState(false);
  const [alasan, setAlasan] = useState('');
  const [yakinAcc, setYakinAcc] = useState(false);
  const [bekerja, setBekerja] = useState(false);
  const [hasilAksi, setHasilAksi] = useState<{ ok: boolean; teks: string } | null>(null);
  const [ubah, setUbah] = useState(false);
  const bentang = useRef<HTMLDivElement | null>(null);

  const muatDaftar = useCallback(async () => {
    setGagalDaftar(null);
    try {
      const url = jadwalId === undefined ? '/api/tera/selia/lkk' : `/api/tera/selia/lkk?jadwal=${encodeURIComponent(jadwalId ?? '__tanpa__')}`;
      const r = await apiFetch(url, { retries: 1, timeoutMs: 20000 });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j) { setGagalDaftar(j?.error || 'Daftar LKK belum bisa dimuat.'); return; }
      setDaftar(j.lkk || []); setTerpotong(!!j.terpotong);
    } catch { setGagalDaftar('Server tidak merespons. Coba lagi.'); }
  }, [jadwalId]);

  // Pratinjau sertifikat DENGAN kop (tampil di layar Selia; kop ini juga yang tertaut ke QR).
  // Salinan untuk Google Drive & komputer = TANPA kop (tombol Unduh).
  const [pdfMemuat, setPdfMemuat] = useState<null | 'kop' | 'tanpa'>(null);
  const [pdfGalat, setPdfGalat] = useState<string | null>(null);
  // Unduh BAP / BASTP satu rumah sakit (Tahap 5.3) — hanya di mode tertanam per jadwal.
  const [dokMemuat, setDokMemuat] = useState<JenisDokumen | null>(null);
  const [dokGalat, setDokGalat] = useState<string | null>(null);
  const unduhDok = async (jenis: JenisDokumen) => {
    if (!jadwalId || dokMemuat) return;
    setDokMemuat(jenis); setDokGalat(null);
    const h = await unduhBapBastp(jadwalId, jenis);
    if (!h.ok) setDokGalat(h.pesan);
    setDokMemuat(null);
  };
  const [pratinjauUrl, setPratinjauUrl] = useState<string | null>(null);
  const bersihkanPratinjau = () => setPratinjauUrl((u) => { if (u) URL.revokeObjectURL(u); return null; });
  const ambilPdf = async (id: string, denganKop: boolean) => {
    setPdfMemuat(denganKop ? 'kop' : 'tanpa'); setPdfGalat(null);
    try {
      const r = await apiFetch(`/api/tera/selia/lkk/${id}/pdf${denganKop ? '' : '?kop=0'}`, { retries: 0, timeoutMs: 30000 });
      if (!r.ok) { const j = await r.json().catch(() => null); setPdfGalat(j?.error || 'PDF belum bisa dibuat.'); }
      else {
        const url = URL.createObjectURL(await r.blob());
        if (denganKop) setPratinjauUrl((lama) => { if (lama) URL.revokeObjectURL(lama); return url; });
        else {
          const a = document.createElement('a'); a.href = url; a.download = `Sertifikat-${detail?.lkk.noLabel ?? ''}-tanpa-kop.pdf`; document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 60000);
        }
      }
    } catch { setPdfGalat('Server tidak merespons. Coba lagi.'); }
    setPdfMemuat(null);
  };

  const muatDetail = useCallback(async (id: string) => {
    setMemuatDetail(true); setGagalDetail(null);
    try {
      const r = await apiFetch(`/api/tera/selia/lkk/${id}`, { retries: 1, timeoutMs: 20000 });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j) { setDetail(null); setGagalDetail(j?.error || 'LKK belum bisa dimuat.'); }
      else setDetail(j);
    } catch { setDetail(null); setGagalDetail('Server tidak merespons. Coba lagi.'); }
    setMemuatDetail(false);
  }, []);

  useEffect(() => { if (boleh && !modeDetail) void muatDaftar(); }, [boleh, modeDetail, muatDaftar]);
  // Coba ulang otomatis (sekali per buka detail) bila sertifikat terbit belum ada di Drive; server mengatur jeda.
  useEffect(() => {
    const b = detail?.sertifikat?.find((x) => x.status === 'berlaku');
    if (detail?.driveTersambung && b && b.drive?.status !== 'terkirim') void kirimDrive(detail.lkk.id, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.lkk?.id, detail?.driveTersambung]);

  const pilih = (id: string) => {
    if (onPilih && !modeDetail) { onPilih(id); return; }
    bersihkanPratinjau(); setPdfGalat(null); setDriveKirim(null); setYakinKoreksi(false); setAlasanKoreksi('');
    setPilihId(id); setDetail(null); setAlasan(''); setYakinAcc(false); setHasilAksi(null); setUbah(false);
    void muatDetail(id);
    if (!modeDetail) setTimeout(() => bentang.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }), 60);
  };

  // Halaman detail: muat LKK yang dibuka (sekali per id).
  useEffect(() => {
    if (boleh && lkkId) pilih(lkkId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boleh, lkkId]);

  const tampil = useMemo(() => {
    const d = daftar || [];
    const f = d.filter((x) => {
      if (saringan === 'merah') return !x.pemeriksaan || !x.pemeriksaan.bolehAcc || !x.pemeriksaan.jejakCocok;
      if (saringan === 'menunggu') return x.status === 'submitted' || x.status === 'under_review' || x.status === 'correction_open';
      if (saringan === 'acc') return x.status === 'approved';
      return true;
    });
    return f;
  }, [daftar, saringan]);

  // Folder per RS: yang masih ada pekerjaan (menunggu / merah) di atas, lalu urut nama.
  const folder = useMemo<FolderRs[]>(() => {
    const peta = new Map<string, FolderRs>();
    for (const x of tampil) {
      const kunciF = `${x.bo}|${x.namaRs ?? ''}`;
      let f = peta.get(kunciF);
      if (!f) { f = { kunci: kunciF, nama: x.namaRs ?? `BO ${x.bo}`, bo: x.bo, isTest: x.isTest, isi: [], menunggu: 0, merah: 0 }; peta.set(kunciF, f); }
      f.isi.push(x);
      if (x.status === 'submitted' || x.status === 'under_review' || x.status === 'correction_open') f.menunggu += 1;
      if (adaMerah(x)) f.merah += 1;
    }
    return [...peta.values()].sort((a, b) => (Number(b.menunggu > 0) - Number(a.menunggu > 0)) || a.nama.localeCompare(b.nama, 'id'));
  }, [tampil]);
  const [bukaF, setBukaF] = useState<Record<string, boolean>>({});
  // Buka koreksi (HANYA Developer / admin_utama; server juga memeriksa)
  const [alasanKoreksi, setAlasanKoreksi] = useState('');
  const [yakinKoreksi, setYakinKoreksi] = useState(false);
  // Salinan tanpa kop ke Google Drive
  const [driveKirim, setDriveKirim] = useState<null | { sedang: boolean; pesan?: string }>(null);
  const kirimDrive = useCallback(async (id: string, paksa: boolean) => {
    setDriveKirim({ sedang: true });
    try {
      const r = await apiFetch(`/api/tera/selia/lkk/${id}/drive${paksa ? '?paksa=1' : ''}`, { method: 'POST', body: '{}', retries: 0, timeoutMs: 40000 });
      const j = await r.json().catch(() => null);
      setDriveKirim({ sedang: false, pesan: j?.status === 'terkirim' ? 'Salinan tanpa kop sudah terkirim ke Google Drive.' : j?.dilewati ? undefined : (j?.pesan || j?.error || undefined) });
      if (j?.status === 'terkirim') await muatDetail(id);
    } catch { setDriveKirim({ sedang: false, pesan: 'Server tidak merespons. Dicoba lagi otomatis nanti.' }); }
  }, [muatDetail]);

  if (!boleh) return null;

  const aksi = async (jenis: 'kembalikan' | 'acc' | 'buka-koreksi') => {
    if (!pilihId) return;
    setBekerja(true); setHasilAksi(null);
    try {
      const body = jenis === 'kembalikan' ? { alasan } : jenis === 'buka-koreksi' ? { alasan: alasanKoreksi } : {};
      // ACC juga mencetak & menyimpan PDF asli → beri waktu lebih panjang
      const r = await apiFetch(`/api/tera/selia/lkk/${pilihId}/${jenis}`, { method: 'POST', body: JSON.stringify(body), retries: 0, timeoutMs: jenis === 'acc' ? 45000 : 20000 });
      const j = await r.json().catch(() => null);
      const ok = r.ok && j && ['acc', 'sudah_acc', 'dikembalikan', 'sudah_dikembalikan', 'dibuka', 'sudah_dibuka'].includes(j.hasil);
      const teksOk = jenis === 'acc'
        ? `LKK sudah di-ACC dan tercatat di riwayat.${j?.pdfTersimpan === true ? ' Sertifikat (PDF) sudah terbit; scan QR stiker langsung membukanya.' : j?.pdfTersimpan === false ? ` ${j?.pdfPesan || 'PDF belum tersimpan; dibuat otomatis saat QR dibuka.'}` : ''}`
        : jenis === 'buka-koreksi' ? `Koreksi dibuka (revisi ${j?.revisi ?? '-'}). Kembalikan ke teknisi untuk dibetulkan, lalu ACC ulang.`
        : 'LKK dikembalikan ke teknisi dan tercatat di riwayat.';
      setHasilAksi({ ok: !!ok, teks: ok ? teksOk : (j?.alasan || j?.error || 'Belum berhasil. Tidak ada yang berubah — coba lagi.') });
      if (ok) { setYakinAcc(false); setAlasan(''); setYakinKoreksi(false); setAlasanKoreksi(''); await Promise.all([muatDaftar(), muatDetail(pilihId)]); }
    } catch { setHasilAksi({ ok: false, teks: 'Server tidak merespons. Belum ada yang berubah — coba lagi.' }); }
    setBekerja(false);
  };

  const h: Peta | null = detail?.jejakHitung?.hasil ?? null;
  const data: Peta = detail?.data ?? {};
  const tpl: Peta = detail?.template ?? {};
  const pompa = tpl.tipe === 'pompa';
  // Label kolom identitas mengikuti template (mis. pompa: "Merk Pabrik", satuan mL/h), cadangan: nama bawaan.
  const labelIden = (k: string) => (Array.isArray(tpl.identitasBidang) ? tpl.identitasBidang.find((b: Peta) => b.id === k)?.label : undefined) ?? NAMA_IDENTITAS[k] ?? k;
  const aturanKinerja: Peta = detail?.jejakHitung?.aturan?.kinerja ?? {};
  const bisaAksi = detail && ['submitted', 'under_review', 'correction_open'].includes(detail.lkk.status);
  const bolehKoreksi = role === 'admin_utama' && detail?.lkk.status === 'approved';
  const sertBerlaku = (detail?.sertifikat ?? []).find((x) => x.status === 'berlaku') ?? null;


  const barisLkk = (x: Ringkas) => {
                      return (
                        <li key={x.id}>
                          <button type="button" onClick={() => pilih(x.id)} aria-current={pilihId === x.id}
                            className={`w-full text-left rounded-xl border px-3 py-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 cursor-pointer min-h-[56px] ${pilihId === x.id ? 'border-[#1C658C] bg-slate-100' : 'border-[#DCDFE3] bg-white hover:bg-slate-50'}`}>
                            <span className="font-black text-sm text-slate-900 tabular-nums">{x.noLabel}</span>
                            <span className="min-w-0 flex-1 text-xs text-slate-600 truncate">{x.templateKode} · {x.teknisi ?? '-'} · {tglPendek(x.tanggalKalibrasi)}</span>
                            {x.alatTambahan && <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">Alat tambahan</span>}
                            {x.pemeriksaan && <span className="shrink-0 text-[11px] font-bold text-slate-700">{x.pemeriksaan.kesimpulanServer ?? '-'}</span>}
                            <Chip status={x.status} />
                          </button>
                        </li>
                      );
  };

  return (
    <section aria-labelledby="selia-tera" className="bg-white rounded-2xl border border-[#DCDFE3] p-5 sm:p-6 space-y-6 mb-6">
      <div>
        <h2 id="selia-tera" className="text-xl font-black text-[#1C658C] flex items-center gap-2"><Stamp className="w-5 h-5" aria-hidden="true" />LKK Digital Tera SMK</h2>
        {!modeDetail && <p className="text-sm text-slate-600 mt-1 leading-relaxed">{tertanam
          ? 'LKK rumah sakit ini yang sudah dikirim teknisi dari Tera SMK. Ketuk satu LKK untuk membukanya di halaman tersendiri. Pratinjau sertifikat serta tombol Kembalikan / ACC ada di paling bawah.'
          : 'Folder per rumah sakit, isinya hanya LKK yang sudah dikirim teknisi. Buka folder, ketuk satu LKK untuk membukanya di halaman tersendiri. Pratinjau sertifikat serta tombol Kembalikan / ACC ada di paling bawah.'}</p>}
      </div>

      {!modeDetail && tertanam && jadwalId && (
        <div className="rounded-xl border border-[#DCDFE3] bg-slate-50 p-4 space-y-2">
          <p className="text-sm font-bold text-slate-800 flex items-center gap-2"><FileDown className="w-4 h-4" aria-hidden="true" />BAP, BASTP &amp; Rekap rumah sakit ini</p>
          <p className="text-xs text-slate-600">Dibuat dari LKK yang sudah diterima server (termasuk TIDAK LAIK). BAP/BASTP: PDF 2 rangkap, tanggal = hari ini. Rekap: Excel, hanya Penyelia.</p>
          <div className="flex flex-wrap gap-2">
            {(['bap', 'bastp', 'rekap'] as JenisDokumen[]).map((jenis) => (
              <button key={jenis} type="button" onClick={() => { void unduhDok(jenis); }} disabled={dokMemuat !== null} aria-busy={dokMemuat === jenis}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-[#1C658C] text-[#1C658C] bg-white hover:bg-[#1C658C]/5 disabled:opacity-60 cursor-pointer min-h-[44px]">
                {dokMemuat === jenis ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <FileDown className="w-4 h-4" aria-hidden="true" />}
                {dokMemuat === jenis ? (jenis === 'rekap' ? 'Membuat Excel…' : 'Membuat PDF…') : jenis === 'bap' ? 'Unduh BAP' : jenis === 'bastp' ? 'Unduh BASTP' : 'Unduh Rekap (Excel)'}
              </button>
            ))}
          </div>
          {dokGalat && <p className="text-xs text-[#991B1B] font-semibold flex items-start gap-1.5" role="alert"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />{dokGalat}</p>}
        </div>
      )}

      {/* ───────── DAFTAR ───────── */}
      {!modeDetail && <div className="space-y-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Saring daftar LKK">
          {([['semua', 'Semua'], ['menunggu', 'Menunggu diperiksa'], ['acc', 'Sudah ACC']] as [Saringan, string][]).map(([k, t]) => (
            <button key={k} type="button" onClick={() => setSaringan(k)} aria-pressed={saringan === k}
              className={`px-3 py-2 rounded-full text-xs font-semibold border cursor-pointer min-h-[40px] ${saringan === k ? 'bg-[#1C658C] text-white border-[#1C658C]' : 'bg-white text-slate-700 border-[#DCDFE3] hover:bg-slate-100'}`}>{t}</button>
          ))}
          <button type="button" onClick={() => { void muatDaftar(); }} className="ml-auto px-3 py-2 rounded-full text-xs font-semibold border border-[#DCDFE3] text-slate-700 hover:bg-slate-100 cursor-pointer min-h-[40px]">Muat ulang</button>
        </div>
        {gagalDaftar && <p role="alert" className="text-sm text-rose-700 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" aria-hidden="true" />{gagalDaftar}</p>}
        {daftar === null && !gagalDaftar && <p role="status" className="text-sm text-slate-600 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />Memuat daftar LKK…</p>}
        {daftar && tampil.length === 0 && <p className="text-sm text-slate-600">Belum ada LKK pada saringan ini.</p>}
        {tertanam ? (
          <ul className="space-y-2">{tampil.map(barisLkk)}</ul>
        ) : (
        <ul className="space-y-3">
          {folder.map((f) => {
            const terpilihDiSini = f.isi.some((x) => x.id === pilihId);
            const buka = bukaF[f.kunci] ?? (saringan !== 'semua' || terpilihDiSini);
            const idIsi = `folder-${f.kunci.replace(/[^a-z0-9]/gi, '-')}`;
            return (
              <li key={f.kunci} className="rounded-xl border border-[#DCDFE3] bg-white overflow-hidden">
                <button type="button" aria-expanded={buka} aria-controls={idIsi} onClick={() => setBukaF((s) => ({ ...s, [f.kunci]: !buka }))}
                  className="w-full text-left px-3 py-3 flex items-center gap-3 cursor-pointer min-h-[56px] bg-slate-50 hover:bg-slate-100">
                  {buka ? <FolderOpen className="w-5 h-5 shrink-0 text-[#1C658C]" aria-hidden="true" /> : <Folder className="w-5 h-5 shrink-0 text-[#1C658C]" aria-hidden="true" />}
                  <span className="min-w-0 flex-1">
                    <span className="block font-black text-sm text-slate-900 truncate">{f.nama}</span>
                    <span className="block text-xs text-slate-600">BO {f.bo} · {f.isi.length} LKK terkirim</span>
                  </span>
                  {f.isTest && <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-800">Data uji</span>}
                  {f.menunggu > 0 && <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300"><Clock className="w-3.5 h-3.5" aria-hidden="true" />{f.menunggu} menunggu</span>}
                  <ChevronDown className={`w-5 h-5 shrink-0 text-slate-500 transition-transform ${buka ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
                {buka && (
                  <ul id={idIsi} className="p-2 space-y-2 border-t border-[#DCDFE3]">
                    {f.isi.map(barisLkk)}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
        )}
        {terpotong && <p className="text-xs text-slate-500">Hanya 300 LKK terbaru yang ditampilkan. Pakai saringan.</p>}
      </div>}

      {/* ───────── LEMBAR PANJANG ───────── */}
      <div ref={bentang} className="scroll-mt-20" />
      {pilihId && (
        <article aria-label="Isi LKK terpilih" className={modeDetail ? 'space-y-8' : 'border-t-2 border-[#1C658C]/30 pt-6 space-y-8'}>
          {memuatDetail && <p role="status" className="text-sm text-slate-600 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />Memuat isi LKK…</p>}
          {gagalDetail && (
            <p role="alert" className="text-sm text-rose-700 flex flex-wrap items-center gap-2"><AlertTriangle className="w-4 h-4" aria-hidden="true" />{gagalDetail}
              <button type="button" className="underline font-semibold cursor-pointer" onClick={() => { void muatDetail(pilihId); }}>Coba lagi</button></p>
          )}
          {detail && (
            <>
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg font-black text-slate-900 break-words">{detail.lkk.namaAlat} · <span className="tabular-nums">{detail.lkk.noLabel}</span></h3>
                  <p className="text-xs text-slate-600 break-words">{detail.lkk.namaRs ?? `BO ${detail.lkk.bo}`}{detail.lkk.kota ? ` · ${detail.lkk.kota}` : ''} · Teknisi: {detail.lkk.teknisi ?? '-'} · Dikalibrasi {tglPendek(detail.lkk.tanggalKalibrasi)} · Diterima {tgl(detail.lkk.diterimaAt)} · Versi {detail.lkk.clientVersion}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <Chip status={detail.lkk.status} />
                  {bisaAksi && !ubah && (
                    <button type="button" onClick={() => { setUbah(true); setHasilAksi(null); }}
                      className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-[#0B6FB3] hover:bg-[#095C95] text-white text-xs font-bold cursor-pointer active:scale-[0.97]">
                      <Pencil className="w-4 h-4" aria-hidden="true" />Ubah isian
                    </button>
                  )}
                </div>
              </header>
              {hasilAksi && !ubah && (
                <p role="status" className={`text-sm flex items-start gap-1.5 font-semibold ${hasilAksi.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{hasilAksi.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />}{hasilAksi.teks}</p>
              )}

              {/* Penyelia mengubah isian langsung (tanpa alasan; riwayat internal otomatis) */}
              {ubah && bisaAksi && (
                <SeliaTeraEditor lkkId={detail.lkk.id} data={detail.data} template={detail.template} tanggalKalibrasi={detail.lkk.tanggalKalibrasi ?? null}
                  onBatal={() => setUbah(false)}
                  onTersimpan={(teks) => { setUbah(false); setHasilAksi({ ok: true, teks }); void muatDetail(detail.lkk.id); if (!modeDetail) void muatDaftar(); }} />
              )}

              {/* 2. Identitas */}
              <Bagian id="b-identitas" judul="1. Identitas alat">
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(data.identitas ?? {}).map(([k, v]) => <Isian key={k} nama={labelIden(k)} nilai={v === null || v === '' ? '-' : (k === 'tanggalPenerimaan' ? tglPendek(String(v)) : String(v))} />)}
                  <Isian nama="Template" nilai={`${detail.lkk.templateKode} v${detail.lkk.templateVersi}`} />
                </dl>
              </Bagian>

              {/* 3. Lingkungan */}
              <Bagian id="b-lingkungan" judul="2. Kondisi lingkungan">
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Isian nama="Suhu awal (°C)" nilai={fmt(data.lingkungan?.suhuAwal, 1)} />
                  <Isian nama="Suhu akhir (°C)" nilai={fmt(data.lingkungan?.suhuAkhir, 1)} />
                  <Isian nama="Kelembapan awal (%RH)" nilai={fmt(data.lingkungan?.rhAwal, 1)} />
                  <Isian nama="Kelembapan akhir (%RH)" nilai={fmt(data.lingkungan?.rhAkhir, 1)} />
                </dl>
              </Bagian>

              {/* 4. Fisik & fungsi */}
              <Bagian id="b-fisik" judul="3. Pemeriksaan fisik & fungsi">
                <div className="overflow-x-auto rounded-xl border border-[#DCDFE3]">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-[11px] text-slate-600"><tr><th className="p-2 text-left">Butir</th><th className="p-2 text-left">Fisik</th><th className="p-2 text-left">Fungsi</th></tr></thead>
                    <tbody>
                      {(tpl.fisik || []).map((b: Peta) => {
                        const v = data.fisik?.[b.id] ?? {};
                        return <tr key={b.id} className="border-t border-[#DCDFE3]"><td className="p-2">{b.judul}</td><td className="p-2">{v.fisik ?? '-'}</td><td className="p-2">{v.fungsi ?? '-'}</td></tr>;
                      })}
                      {(tpl.fisikTambahan || []).map((b: Peta) => {
                        const v = data.fisikTambahan?.[b.id];
                        return <tr key={b.id} className="border-t border-[#DCDFE3]"><td className="p-2">{b.judul}</td><td colSpan={2} className="p-2">{v ?? '-'}</td></tr>;
                      })}
                    </tbody>
                  </table>
                </div>
                {h?.fisik && <p className="text-xs text-slate-600">Butir Baik: {h.fisik.jumlahBaik} dari {h.fisik.jumlahItem} · Nilai fisik: <strong>{fmt(h.fisik.nilai, 1)}</strong></p>}
              </Bagian>

              {/* 5. Uji ambang */}
              {!pompa && (tpl.ujiAmbang || []).length > 0 && (
                <Bagian id="b-uji" judul="4. Uji lain">
                  <div className="overflow-x-auto rounded-xl border border-[#DCDFE3]">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100 text-[11px] text-slate-600"><tr><th className="p-2 text-left">Uji</th><th className="p-2 text-left">Nilai ukur</th><th className="p-2 text-left">Batas</th><th className="p-2 text-left">Hasil</th></tr></thead>
                      <tbody>
                        {(tpl.ujiAmbang as Peta[]).map((u) => {
                          const r = h?.ujiAmbang?.[u.id];
                          return (
                            <tr key={u.id} className="border-t border-[#DCDFE3]">
                              <td className="p-2">{u.judul}</td>
                              <td className="p-2 tabular-nums">{fmt(r?.nilaiUkur)} {u.satuan}</td>
                              <td className="p-2 tabular-nums">{u.banding} {fmt(u.batas)} {u.satuan}</td>
                              <td className="p-2">{r?.hasil ?? '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Bagian>
              )}

              {/* Pompa: listrik + aliran + penyumbatan */}
              {pompa && <SeliaTeraPompa tpl={tpl} data={data} h={h} />}

              {/* 6. Kinerja + jejak hitung */}
              {!pompa && Object.keys(h?.kinerja ?? {}).map((kid) => {
                const kin = h!.kinerja[kid];
                const def = (tpl.kinerja || []).find((x: Peta) => x.id === kid) ?? {};
                const tol: number | null = typeof aturanKinerja[kid]?.toleransi === 'number' ? aturanKinerja[kid].toleransi : null;
                return (
                  <Bagian key={kid} id={`b-kin-${kid}`} judul={`5. ${def.judul ?? kid} — jejak hitung`}>
                    <p className="text-xs text-slate-600">Toleransi: ± {fmt(tol)} {def.satuan} · Titik Laik: {kin.jumlahLaik} dari {kin.jumlahDinilai}</p>
                    <div className="overflow-x-auto rounded-xl border border-[#DCDFE3]">
                      <table className="w-full text-xs tabular-nums">
                        <thead className="bg-slate-100 text-[11px] text-slate-600">
                          <tr>{['Titik', 'Arah', 'Bacaan', 'Rata-rata', 'Koreksi', 'u Tipe A', 'u Sert.', 'u Zero', 'u Resol.', 'u Drift', 'uc', 'v eff', 'k', 'U95', 'U95 lap.', 'Hasil'].map((c) => <th key={c} className="p-2 text-left whitespace-nowrap">{c}</th>)}</tr>
                        </thead>
                        <tbody>
                          {(kin.titik as Peta[]).map((t, i) => {
                            const bacaan: unknown[] = data.kinerja?.[kid]?.[String(t.titik)]?.[t.arah] ?? [];
                            return (
                              <React.Fragment key={i}>
                                <tr className="border-t border-[#DCDFE3]">
                                  <td className="p-2">{fmt(t.titik)}</td><td className="p-2">{t.arah}</td>
                                  <td className="p-2 whitespace-nowrap">{bacaan.map((b) => fmt(b)).join('; ') || '-'}</td>
                                  <td className="p-2">{fmt(t.rataRata, 3)}</td><td className="p-2">{fmt(t.koreksi, 3)}</td>
                                  <td className="p-2">{fmt(t.uTipeA, 3)}</td><td className="p-2">{fmt(t.uSertifikat, 3)}</td><td className="p-2">{fmt(t.uZero, 3)}</td>
                                  <td className="p-2">{fmt(t.uResolusi, 3)}</td><td className="p-2">{fmt(t.uDrift, 3)}</td><td className="p-2">{fmt(t.uc, 3)}</td>
                                  <td className="p-2">{fmt(t.vEff, 1)}</td><td className="p-2">{fmt(t.k, 3)}</td><td className="p-2">{fmt(t.u95, 3)}</td><td className="p-2">{fmt(t.u95Laporan, 2)}</td>
                                  <td className="p-2 whitespace-nowrap">{t.hasil}</td>
                                </tr>
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Bagian>
                );
              })}

              {/* 7. Alat standar */}
              <Bagian id="b-kal" judul={`${pompa ? (tpl.kinerja ? 7 : 5) : 6}. Alat standar yang dipakai (fotokopi sertifikat di LKK)`}>
                {detail.calibratorSnapshot && Object.keys(detail.calibratorSnapshot).length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-[#DCDFE3]">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100 text-[11px] text-slate-600"><tr><th className="p-2 text-left">Peran</th><th className="p-2 text-left">Alat</th><th className="p-2 text-left">No. sertifikat</th><th className="p-2 text-left">Berlaku sampai</th></tr></thead>
                      <tbody>
                        {Object.entries(detail.calibratorSnapshot).map(([peran, v]: [string, any]) => (
                          <tr key={peran} className="border-t border-[#DCDFE3]">
                            <td className="p-2">{peran}</td><td className="p-2">{v?.asetId ?? '-'} · {v?.nama ?? '-'}</td><td className="p-2 break-words">{v?.nomorSertifikat ?? '-'}</td><td className="p-2">{v?.berlakuSampai ? tglPendek(v.berlakuSampai) : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-sm text-slate-600">Tidak ada alat standar tercatat.</p>}
              </Bagian>

              {/* 8. Kesimpulan */}
              <Bagian id="b-kesimpulan" judul={`${pompa ? (tpl.kinerja ? 8 : 6) : 7}. Kesimpulan`}>
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`px-4 py-2 rounded-full text-sm font-black border ${h?.kesimpulan === 'Tidak Laik Pakai' ? 'bg-[#FEE2E2] text-[#991B1B] border-[#DC2626]' : 'bg-[#DCFCE7] text-[#166534] border-[#86EFAC]'}`}>{h?.kesimpulan ?? '-'}</span>
                  {h?.skor && <span className="text-xs text-slate-600">Skor total {fmt(h.skor.total, 1)}{h.skor.maks ? ` dari ${fmt(h.skor.maks, 0)}` : ''} (rincian: {(h.skor.rincian || []).map((r: Peta) => `${r.dari} ${fmt(r.nilai, 1)}`).join(', ')})</span>}
                </div>
              </Bagian>

              {/* 9. Pratinjau sertifikat (di paling bawah lembar, sebelum keputusan) */}
              <Bagian id="b-pratinjau" judul={`${pompa ? (tpl.kinerja ? 9 : 7) : 8}. Pratinjau sertifikat`}>
                {!['sphygmomanometer', 'infusion_pump', 'syringe_pump', 'keselamatan_listrik', 'nibp', 'termohigrometer'].includes(detail.lkk.templateKode) ? (
                  <p className="text-sm text-slate-600">Pratinjau sertifikat untuk alat ini belum tersedia.</p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-600">Versi <strong>dengan kop</strong> hanya untuk dilihat di sini dan tertaut ke QR. Salinan untuk Google Drive dan komputer adalah versi <strong>tanpa kop</strong>. {detail.lkk.status === 'approved' ? 'Sudah ACC: isi pratinjau sama dengan sertifikat terbit (tanggal ACC, QR tanda tangan asli).' : 'Sebelum ACC, QR yang tampil hanya contoh (TTE CONTOH).'}</p>
                    {sertBerlaku && (
                      <div className="rounded-xl border border-[#0B6FB3] bg-sky-50 p-3 text-xs text-[#095C95] space-y-2">
                        <p className="font-bold flex items-center gap-1.5"><Stamp className="w-4 h-4" aria-hidden="true" />Sertifikat terbit · revisi {sertBerlaku.revisi} · ACC {tgl(sertBerlaku.ditandatanganiAt)}</p>
                        <p>{sertBerlaku.pdfTersimpan ? 'Lembar asli (dengan kop) sudah tersimpan. Scan QR stiker membuka file ini.' : 'Lembar asli belum tersimpan (mis. kop belum diunggah). Dibuat otomatis saat QR dibuka.'}</p>
                        <p>
                          {!detail.driveTersambung
                            ? 'Salinan Google Drive (tanpa kop): belum tersambung — Developer perlu memasang izin Google di server.'
                            : sertBerlaku.drive?.status === 'terkirim' ? 'Salinan Google Drive (tanpa kop): terkirim.'
                            : `Salinan Google Drive (tanpa kop): ${driveKirim?.sedang ? 'sedang dikirim…' : 'belum terkirim'}${sertBerlaku.drive?.pesan ? ` — ${sertBerlaku.drive.pesan}` : ''}`}
                          {driveKirim?.pesan ? ` ${driveKirim.pesan}` : ''}
                        </p>
                        <div className="flex flex-wrap gap-3">
                          {sertBerlaku.drive?.url && <a href={sertBerlaku.drive.url} target="_blank" rel="noopener noreferrer" className="font-bold underline min-h-[40px] inline-flex items-center">Buka di Google Drive</a>}
                          {detail.driveTersambung && sertBerlaku.drive?.status !== 'terkirim' && (
                            <button type="button" disabled={!!driveKirim?.sedang} onClick={() => { void kirimDrive(detail.lkk.id, true); }} className="font-bold underline min-h-[40px] inline-flex items-center gap-1 cursor-pointer disabled:opacity-60">
                              {driveKirim?.sedang && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}Kirim ulang ke Drive
                            </button>
                          )}
                          <a href={`/api/tera/publik/sertifikat/${sertBerlaku.kode}`} target="_blank" rel="noopener noreferrer" className="font-bold underline min-h-[40px] inline-flex items-center">Buka sertifikat terbit (PDF)</a>
                          <a href={`/verifikasi/${sertBerlaku.kode}`} target="_blank" rel="noopener noreferrer" className="font-bold underline min-h-[40px] inline-flex items-center">Halaman verifikasi TTE</a>
                        </div>
                        {(detail.sertifikat ?? []).some((x) => x.status !== 'berlaku') && (
                          <p className="text-[11px]">Revisi lama (digantikan, tetap disimpan): {(detail.sertifikat ?? []).filter((x) => x.status !== 'berlaku').map((x) => (
                            <a key={x.kode} href={`/api/tera/publik/sertifikat/${x.kode}`} target="_blank" rel="noopener noreferrer" className="underline mr-2">revisi {x.revisi}</a>
                          ))}</p>
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => { void ambilPdf(detail.lkk.id, true); }} disabled={pdfMemuat !== null}
                        className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl border border-[#0B6FB3] text-[#0B6FB3] text-xs font-bold cursor-pointer active:scale-[0.97] disabled:opacity-60">
                        {pdfMemuat === 'kop' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <FileText className="w-4 h-4" aria-hidden="true" />}
                        {pdfMemuat === 'kop' ? 'Membuat…' : 'Tampilkan pratinjau (dengan kop)'}
                      </button>
                      <button type="button" onClick={() => { void ambilPdf(detail.lkk.id, false); }} disabled={pdfMemuat !== null}
                        className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl border border-slate-400 text-slate-700 text-xs font-bold cursor-pointer active:scale-[0.97] disabled:opacity-60">
                        {pdfMemuat === 'tanpa' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <FileText className="w-4 h-4" aria-hidden="true" />}
                        {pdfMemuat === 'tanpa' ? 'Membuat…' : 'Unduh tanpa kop'}
                      </button>
                    </div>
                    {pdfGalat && <p className="text-xs text-[#991B1B] font-semibold flex items-start gap-1.5" role="alert"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />{pdfGalat}</p>}
                    {pratinjauUrl && (
                      <div className="rounded-xl border border-[#DCDFE3] bg-white overflow-hidden">
                        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-100 text-xs">
                          <p className="font-bold text-slate-800">Pratinjau sertifikat (dengan kop)</p>
                          <div className="flex gap-3 shrink-0">
                            <a href={pratinjauUrl} target="_blank" rel="noreferrer" className="font-bold text-[#0B6FB3] underline">Layar penuh</a>
                            <button type="button" onClick={bersihkanPratinjau} className="font-bold text-slate-700 underline cursor-pointer">Tutup</button>
                          </div>
                        </div>
                        <iframe title="Pratinjau sertifikat" src={pratinjauUrl} className="w-full h-[70vh] min-h-[420px] bg-slate-100" />
                      </div>
                    )}
                  </div>
                )}
              </Bagian>

              {/* 10. Aksi */}
              <Bagian id="b-aksi" judul="9. Keputusan Penyelia">
                {!bisaAksi && !bolehKoreksi && <p className="text-sm text-slate-600">LKK berstatus <strong>{STATUS[detail.lkk.status]?.teks ?? detail.lkk.status}</strong>; tidak ada aksi yang tersedia di sini.{detail.lkk.status === 'approved' ? ' Bila ada kesalahan, hanya Developer yang bisa membuka koreksi.' : ''}</p>}
                {detail.lkk.status === 'correction_open' && (
                  <Tanda tingkat="kuning" judul={`Koreksi dibuka · revisi ${detail.lkk.revisi ?? '-'}`}>Sertifikat lama tetap berlaku sampai ACC ulang. Kembalikan ke teknisi untuk dibetulkan (lalu ACC ulang), atau ACC ulang langsung bila tidak ada isian yang perlu diubah. Sesudah ACC ulang: PDF versi baru dengan nomor sama, QR stiker ikut versi baru, PDF lama tetap disimpan.</Tanda>
                )}
                {bolehKoreksi && (
                  <div className="rounded-xl border border-[#DCDFE3] p-4 space-y-2">
                    <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><RotateCcw className="w-4 h-4" aria-hidden="true" />Buka koreksi (khusus Developer)</p>
                    <p className="text-xs text-slate-600">Dipakai bila ada kesalahan pada sertifikat yang sudah ACC. Tercatat di riwayat dan tidak bisa dihapus.</p>
                    <label htmlFor="alasan-koreksi" className="block text-xs font-bold text-slate-700">Alasan koreksi (wajib)</label>
                    <textarea id="alasan-koreksi" value={alasanKoreksi} onChange={(e) => setAlasanKoreksi(e.target.value)} rows={3} maxLength={1000}
                      className="w-full px-3 py-2 rounded-lg border border-[#7D8DA1] bg-white text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#398AB9]" placeholder="Contoh: nomor seri alat salah ketik" />
                    {!yakinKoreksi
                      ? <button type="button" disabled={bekerja || alasanKoreksi.trim().length < 5} onClick={() => setYakinKoreksi(true)} className="px-4 py-2.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-60 min-h-[44px]"><RotateCcw className="w-4 h-4" aria-hidden="true" />Buka koreksi</button>
                      : (
                        <div className="flex flex-wrap items-center gap-2" role="alertdialog" aria-label="Konfirmasi buka koreksi">
                          <span className="text-xs font-semibold text-slate-800">Yakin membuka koreksi {detail.lkk.noLabel}? Revisi akan naik menjadi {(Number(detail.lkk.revisi) || 0) + 1}.</span>
                          <button type="button" disabled={bekerja} onClick={() => { void aksi('buka-koreksi'); }} className="px-4 py-2.5 rounded-lg text-xs font-bold bg-amber-600 text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-60 min-h-[44px]">
                            {bekerja ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <RotateCcw className="w-4 h-4" aria-hidden="true" />}Ya, buka koreksi
                          </button>
                          <button type="button" disabled={bekerja} onClick={() => setYakinKoreksi(false)} className="px-4 py-2.5 rounded-lg text-xs font-semibold border border-[#DCDFE3] text-slate-700 cursor-pointer min-h-[44px]">Batal</button>
                        </div>
                      )}
                    {alasanKoreksi.trim().length < 5 && <p className="text-[11px] text-slate-500">Isi alasan (min. 5 huruf) lalu tekan tombol.</p>}
                  </div>
                )}
                {bisaAksi && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="rounded-xl border border-[#DCDFE3] p-4 space-y-2">
                        <label htmlFor="alasan-kembali" className="block text-xs font-bold text-slate-700">Alasan pengembalian (wajib)</label>
                        <textarea id="alasan-kembali" value={alasan} onChange={(e) => setAlasan(e.target.value)} rows={3} maxLength={1000}
                          className="w-full px-3 py-2 rounded-lg border border-[#7D8DA1] bg-white text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#398AB9]" placeholder="Contoh: bacaan titik 150 naik terlihat salah ketik" />
                        <button type="button" disabled={bekerja} onClick={() => { void aksi('kembalikan'); }}
                          className="px-4 py-2.5 rounded-lg text-xs font-bold bg-violet-700 hover:bg-violet-800 text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-60 min-h-[44px]">
                          <Undo2 className="w-4 h-4" aria-hidden="true" />Kembalikan ke teknisi
                        </button>
                        {alasan.trim().length < 3 && <p className="text-[11px] text-slate-500">Isi alasan (min. 3 huruf) lalu tekan tombol.</p>}
                      </div>
                      <div className="rounded-xl border border-[#DCDFE3] p-4 space-y-2">
                        <p className="text-xs font-bold text-slate-700">ACC</p>
                        <p className="text-xs text-slate-600">ACC tercatat di riwayat (nama Anda dan waktunya) dan tidak bisa dibatalkan di layar ini.</p>
                        {!yakinAcc
                          ? <button type="button" disabled={bekerja} onClick={() => setYakinAcc(true)} className="px-4 py-2.5 rounded-lg text-xs font-bold bg-[#0B6FB3] hover:bg-[#095C95] text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-60 min-h-[44px]"><Stamp className="w-4 h-4" aria-hidden="true" />{detail.lkk.status === 'correction_open' ? 'ACC ulang' : 'ACC LKK ini'}</button>
                          : (
                            <div className="flex flex-wrap items-center gap-2" role="alertdialog" aria-label="Konfirmasi ACC">
                              <span className="text-xs font-semibold text-slate-800">Yakin ACC {detail.lkk.noLabel}?</span>
                              <button type="button" disabled={bekerja} onClick={() => { void aksi('acc'); }} className="px-4 py-2.5 rounded-lg text-xs font-bold bg-[#0B6FB3] text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-60 min-h-[44px]">
                                {bekerja ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="w-4 h-4" aria-hidden="true" />}Ya, ACC
                              </button>
                              <button type="button" disabled={bekerja} onClick={() => setYakinAcc(false)} className="px-4 py-2.5 rounded-lg text-xs font-semibold border border-[#DCDFE3] text-slate-700 cursor-pointer min-h-[44px]">Batal</button>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                )}
                <div aria-live="polite" className="text-sm">
                  {hasilAksi && <p className={`flex items-start gap-1.5 font-semibold ${hasilAksi.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{hasilAksi.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />}{hasilAksi.teks}</p>}
                </div>
              </Bagian>
            </>
          )}
        </article>
      )}
    </section>
  );
};
