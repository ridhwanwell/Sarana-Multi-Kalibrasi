/**
 * Halaman "Nilai Kalibrator Tera" (Manajemen Aset SMK) — khusus Developer (admin_utama).
 *
 * Perumpamaan: lemari sertifikat kalibrator. Di sini nilai koreksi & ketidakpastian (U95) tiap alat standar diisi/diganti.
 * Isi lembar lama tidak ditimpa: menyimpan = lembar BARU, yang lama dinonaktifkan (LKK lama tetap memakai fotokopinya).
 *
 * Satu halaman panjang yang di-scroll (tanpa pindah-pindah bagian). Server juga menolak selain admin_utama.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Plus, Save, Trash2, FlaskConical } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { apiFetch } from '../lib/apiClient';

interface Titik { titik: number; koreksiNaik: number; koreksiTurun: number; u95Naik: number; u95Turun: number; driftNaik?: number; driftTurun?: number }
interface NilaiAktif {
  id: string; asetId: string; namaAlat: string; merk: string | null; model: string | null; nomorSeri: string | null;
  parameter: string; satuan: string; nomorSertifikat: string | null; tertelusur: string | null;
  tanggalKalibrasi: string | null; berlakuSampai: string | null; points: Titik[]; sumber: string; diubahPada: string;
}
interface Alat { id: string; nama: string; merk: string | null; model: string | null }

const PARAMETER_UMUM: { kode: string; satuan: string; nama: string }[] = [
  { kode: 'tekanan_mmhg', satuan: 'mmHg', nama: 'Tekanan (mmHg)' },
  { kode: 'suhu_c', satuan: '°C', nama: 'Suhu (°C)' },
  { kode: 'kelembaban_rh', satuan: '%RH', nama: 'Kelembapan (%RH)' },
  { kode: 'waktu_s', satuan: 'detik', nama: 'Waktu stopwatch (detik)' },
];

/** Baris isian: semua teks (koma desimal Indonesia). */
interface BarisIsi { titik: string; kn: string; kt: string; un: string; ut: string; dn: string; dt: string }
const keTeks = (n: number | undefined): string => (typeof n === 'number' && Number.isFinite(n) ? String(n).replace('.', ',') : '');
const keAngka = (t: string): number | null => {
  const s = t.trim().replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const barisDariTitik = (p: Titik): BarisIsi => ({
  titik: keTeks(p.titik), kn: keTeks(p.koreksiNaik), kt: keTeks(p.koreksiTurun), un: keTeks(p.u95Naik), ut: keTeks(p.u95Turun),
  dn: keTeks(p.driftNaik ?? 0), dt: keTeks(p.driftTurun ?? 0),
});
const barisKosong = (): BarisIsi => ({ titik: '', kn: '0', kt: '0', un: '', ut: '', dn: '0', dt: '0' });
const sama = (b: BarisIsi) => b.kn === b.kt && b.un === b.ut && b.dn === b.dt;

const waktu = (iso?: string) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return iso; }
};

interface IsiEditor {
  asetId: string; parameter: string; satuan: string; nomor: string; tertelusur: string; tanggal: string; berlaku: string; sumber: string; baris: BarisIsi[];
}

const kolom = 'w-full min-w-[4.5rem] px-2 py-1.5 rounded-lg border border-[#DCDFE3] bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#398AB9]';
const label = 'block text-[11px] font-semibold text-slate-600 mb-1';

const Editor: React.FC<{
  awal: IsiEditor; kunci: boolean; alat?: Alat[]; tombol: string; onSimpan: (b: Record<string, unknown>) => Promise<{ ok: boolean; pesan: string }>;
}> = ({ awal, kunci, alat, tombol, onSimpan }) => {
  const [isi, setIsi] = useState<IsiEditor>(awal);
  const [satuArah, setSatuArah] = useState<boolean>(awal.baris.every(sama));
  const [bekerja, setBekerja] = useState(false);
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null);
  const ubah = (k: keyof IsiEditor, v: string) => setIsi((s) => ({ ...s, [k]: v }));
  const ubahBaris = (i: number, k: keyof BarisIsi, v: string) => setIsi((s) => ({
    ...s,
    baris: s.baris.map((b, j) => {
      if (j !== i) return b;
      const n = { ...b, [k]: v };
      if (satuArah) { n.kt = n.kn; n.ut = n.un; n.dt = n.dn; }
      return n;
    }),
  }));

  const simpan = async () => {
    setPesan(null);
    const points: Record<string, number>[] = [];
    for (const [i, b] of isi.baris.entries()) {
      const nilai = { titik: keAngka(b.titik), kn: keAngka(b.kn), kt: keAngka(satuArah ? b.kn : b.kt), un: keAngka(b.un), ut: keAngka(satuArah ? b.un : b.ut), dn: keAngka(b.dn || '0'), dt: keAngka(satuArah ? (b.dn || '0') : (b.dt || '0')) };
      if (Object.values(nilai).some((v) => v === null)) { setPesan({ ok: false, teks: `Baris ke-${i + 1}: semua kotak harus berisi angka (pakai koma untuk desimal).` }); return; }
      points.push({ titik: nilai.titik!, koreksiNaik: nilai.kn!, koreksiTurun: nilai.kt!, u95Naik: nilai.un!, u95Turun: nilai.ut!, driftNaik: nilai.dn!, driftTurun: nilai.dt! });
    }
    if (!isi.asetId) { setPesan({ ok: false, teks: 'Pilih alat kalibrator dulu.' }); return; }
    setBekerja(true);
    const h = await onSimpan({
      asetId: isi.asetId, parameter: isi.parameter.trim(), satuan: isi.satuan.trim(), nomorSertifikat: isi.nomor, tertelusur: isi.tertelusur,
      tanggalKalibrasi: isi.tanggal || null, berlakuSampai: isi.berlaku || null, sumber: isi.sumber, points,
    });
    setBekerja(false);
    setPesan({ ok: h.ok, teks: h.pesan });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {alat && (
          <div>
            <label className={label} htmlFor="nk-alat">Alat kalibrator</label>
            <select id="nk-alat" className={kolom} value={isi.asetId} onChange={(e) => ubah('asetId', e.target.value)} disabled={kunci}>
              <option value="">— pilih alat —</option>
              {alat.map((a) => <option key={a.id} value={a.id}>{a.id} · {a.nama}{a.merk ? ` · ${a.merk}` : ''}{a.model ? ` ${a.model}` : ''}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className={label}>Parameter</label>
          {kunci ? <input className={kolom} value={isi.parameter} disabled aria-label="Parameter" /> : (
            <select className={kolom} value={isi.parameter} aria-label="Parameter" onChange={(e) => {
              const p = PARAMETER_UMUM.find((x) => x.kode === e.target.value);
              setIsi((s) => ({ ...s, parameter: e.target.value, satuan: p ? p.satuan : s.satuan }));
            }}>
              <option value="">— pilih —</option>
              {PARAMETER_UMUM.map((p) => <option key={p.kode} value={p.kode}>{p.nama}</option>)}
            </select>
          )}
        </div>
        <div><label className={label}>Satuan</label><input className={kolom} value={isi.satuan} onChange={(e) => ubah('satuan', e.target.value)} disabled={kunci} aria-label="Satuan" /></div>
        <div><label className={label}>Nomor sertifikat</label><input className={kolom} value={isi.nomor} onChange={(e) => ubah('nomor', e.target.value)} aria-label="Nomor sertifikat" /></div>
        <div><label className={label}>Tertelusur ke</label><input className={kolom} value={isi.tertelusur} onChange={(e) => ubah('tertelusur', e.target.value)} aria-label="Tertelusur ke" /></div>
        <div><label className={label}>Tanggal kalibrasi</label><input type="date" className={kolom} value={isi.tanggal} onChange={(e) => ubah('tanggal', e.target.value)} aria-label="Tanggal kalibrasi" /></div>
        <div>
          <label className={label}>Berlaku sampai</label>
          <input type="date" className={kolom} value={isi.berlaku} onChange={(e) => ubah('berlaku', e.target.value)} aria-label="Berlaku sampai" />
          <p className="text-[11px] text-slate-500 mt-1">Kosong = belum bersertifikat (tidak diblokir).</p>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className={label}>Sumber nilai (wajib)</label>
          <input className={kolom} value={isi.sumber} onChange={(e) => ubah('sumber', e.target.value)} aria-label="Sumber nilai" />
          <p className="text-[11px] text-slate-500 mt-1">Contoh: "Sertifikat YK.05.02/E.IX/5376/2026" atau tautan datasheet. Selama tulisannya masih memuat <strong>NILAI SEMENTARA</strong>, ACC hanya boleh untuk BO 999 (data uji).</p>
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h4 className="text-xs font-bold text-[#1C658C]">Titik koreksi & ketidakpastian</h4>
          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
            <input type="checkbox" checked={satuArah} onChange={(e) => {
              setSatuArah(e.target.checked);
              if (e.target.checked) setIsi((s) => ({ ...s, baris: s.baris.map((b) => ({ ...b, kt: b.kn, ut: b.un, dt: b.dn })) }));
            }} className="w-4 h-4" />
            Satu arah (naik = turun)
          </label>
        </div>
        <div className="overflow-x-auto rounded-xl border border-[#DCDFE3]">
          <table className="w-full text-sm">
            <thead className="bg-[#EEF3F7] text-[11px] text-slate-600">
              <tr>
                <th className="p-2 text-left">Titik ({isi.satuan || '—'})</th>
                <th className="p-2 text-left">Koreksi{satuArah ? '' : ' naik'}</th>
                {!satuArah && <th className="p-2 text-left">Koreksi turun</th>}
                <th className="p-2 text-left">U95{satuArah ? '' : ' naik'}</th>
                {!satuArah && <th className="p-2 text-left">U95 turun</th>}
                <th className="p-2 text-left">Drift{satuArah ? '' : ' naik'}</th>
                {!satuArah && <th className="p-2 text-left">Drift turun</th>}
                <th className="p-2"><span className="sr-only">Hapus</span></th>
              </tr>
            </thead>
            <tbody>
              {isi.baris.map((b, i) => (
                <tr key={i} className="border-t border-[#DCDFE3]">
                  <td className="p-1.5"><input inputMode="decimal" className={kolom} value={b.titik} onChange={(e) => ubahBaris(i, 'titik', e.target.value)} aria-label={`Titik baris ${i + 1}`} /></td>
                  <td className="p-1.5"><input inputMode="decimal" className={kolom} value={b.kn} onChange={(e) => ubahBaris(i, 'kn', e.target.value)} aria-label={`Koreksi baris ${i + 1}`} /></td>
                  {!satuArah && <td className="p-1.5"><input inputMode="decimal" className={kolom} value={b.kt} onChange={(e) => ubahBaris(i, 'kt', e.target.value)} aria-label={`Koreksi turun baris ${i + 1}`} /></td>}
                  <td className="p-1.5"><input inputMode="decimal" className={kolom} value={b.un} onChange={(e) => ubahBaris(i, 'un', e.target.value)} aria-label={`U95 baris ${i + 1}`} /></td>
                  {!satuArah && <td className="p-1.5"><input inputMode="decimal" className={kolom} value={b.ut} onChange={(e) => ubahBaris(i, 'ut', e.target.value)} aria-label={`U95 turun baris ${i + 1}`} /></td>}
                  <td className="p-1.5"><input inputMode="decimal" className={kolom} value={b.dn} onChange={(e) => ubahBaris(i, 'dn', e.target.value)} aria-label={`Drift baris ${i + 1}`} /></td>
                  {!satuArah && <td className="p-1.5"><input inputMode="decimal" className={kolom} value={b.dt} onChange={(e) => ubahBaris(i, 'dt', e.target.value)} aria-label={`Drift turun baris ${i + 1}`} /></td>}
                  <td className="p-1.5 text-right">
                    <button type="button" aria-label={`Hapus baris ${i + 1}`} disabled={isi.baris.length <= 1}
                      onClick={() => setIsi((s) => ({ ...s, baris: s.baris.filter((_, j) => j !== i) }))}
                      className="p-2 rounded-lg text-rose-700 hover:bg-rose-50 disabled:opacity-40 cursor-pointer"><Trash2 className="w-4 h-4" aria-hidden="true" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={() => setIsi((s) => ({ ...s, baris: [...s.baris, barisKosong()] }))}
          className="mt-2 px-3 py-2 rounded-lg text-xs font-semibold text-[#1C658C] border border-[#1C658C]/40 hover:bg-[#EEF3F7] flex items-center gap-1.5 cursor-pointer">
          <Plus className="w-4 h-4" aria-hidden="true" /> Tambah titik
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => { void simpan(); }} disabled={bekerja} aria-busy={bekerja}
          className="bg-[#1C658C] hover:bg-[#144966] disabled:opacity-60 text-white font-bold px-4 py-2.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer">
          {bekerja ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />}
          {bekerja ? 'Menyimpan…' : tombol}
        </button>
        <div aria-live="polite" className="text-xs">
          {pesan && (
            <span className={`flex items-start gap-1.5 font-semibold ${pesan.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
              {pesan.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" /> : <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />}
              <span>{pesan.teks}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export const NilaiKalibratorTera: React.FC = () => {
  const { role } = useAuth();
  const [nilai, setNilai] = useState<NilaiAktif[] | null>(null);
  const [alat, setAlat] = useState<Alat[]>([]);
  const [gagal, setGagal] = useState<string | null>(null);

  const muat = useCallback(async () => {
    setGagal(null);
    try {
      const res = await apiFetch('/api/tera/nilai-kalibrator', { retries: 1, timeoutMs: 20000 });
      const isi = await res.json().catch(() => null);
      if (!res.ok || !isi) { setGagal(isi?.error || 'Data belum bisa dimuat.'); return; }
      setNilai(isi.nilai || []);
      setAlat(isi.alat || []);
    } catch {
      setGagal('Server tidak merespons. Coba lagi.');
    }
  }, []);

  useEffect(() => { if (role === 'admin_utama') void muat(); }, [role, muat]);

  if (role !== 'admin_utama') {
    return (
      <div className="bg-white rounded-2xl p-6 border border-[#DCDFE3] text-sm text-slate-700" role="alert">
        Halaman ini khusus Developer.
      </div>
    );
  }

  const simpan = async (b: Record<string, unknown>) => {
    try {
      const res = await apiFetch('/api/tera/nilai-kalibrator', { method: 'POST', body: JSON.stringify(b), retries: 0, timeoutMs: 20000 });
      const h = await res.json().catch(() => null);
      if (res.ok && h?.hasil === 'disimpan') { await muat(); return { ok: true, pesan: 'Tersimpan sebagai versi baru. LKK baru memakai nilai ini; tablet menarik data saat aplikasinya dibuka online.' }; }
      return { ok: false, pesan: h?.alasan || h?.error || 'Belum tersimpan. Coba lagi.' };
    } catch {
      return { ok: false, pesan: 'Server tidak merespons. Belum ada yang berubah — coba lagi.' };
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl p-5 sm:p-6 border border-[#DCDFE3]">
        <h2 className="text-xl font-black text-[#1C658C] flex items-center gap-2"><FlaskConical className="w-5 h-5" aria-hidden="true" />Nilai Kalibrator Tera</h2>
        <p className="text-sm text-slate-600 mt-1 leading-relaxed">
          Nilai koreksi dan ketidakpastian (U95) alat standar yang dipakai LKK di Tera SMK. Halaman ini hanya terlihat oleh Developer.
          Menyimpan membuat <strong>versi baru</strong>; versi lama tidak dihapus, dan LKK yang sudah dibuat tetap memakai salinannya.
        </p>
      </section>

      {gagal && (
        <div role="alert" className="p-3 rounded-xl border border-rose-300 bg-rose-50 text-rose-800 text-sm flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" aria-hidden="true" />{gagal}</span>
          <button type="button" onClick={() => { void muat(); }} className="px-3 py-1.5 rounded-lg font-semibold border border-rose-300 bg-white cursor-pointer">Muat ulang</button>
        </div>
      )}
      {nilai === null && !gagal && <p className="text-sm text-slate-600 flex items-center gap-2" role="status"><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />Memuat nilai kalibrator…</p>}
      {nilai?.length === 0 && <p className="text-sm text-slate-600">Belum ada nilai kalibrator. Tambahkan di bagian bawah.</p>}

      {nilai?.map((n) => {
        const sementara = /NILAI SEMENTARA/i.test(n.sumber);
        return (
          <section key={n.id} aria-labelledby={`nk-${n.id}`} className="bg-white rounded-2xl p-5 sm:p-6 border border-[#DCDFE3] space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 id={`nk-${n.id}`} className="text-base font-bold text-slate-800 break-words">{n.asetId} · {n.namaAlat}</h3>
                <p className="text-xs text-slate-600 break-words">{[n.merk, n.model, n.nomorSeri && `S/N ${n.nomorSeri}`].filter(Boolean).join(' · ')}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Versi aktif disimpan {waktu(n.diubahPada)}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#EEF3F7] text-[#1C658C] border border-[#1C658C]/30">{n.parameter}</span>
                {sementara && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />NILAI SEMENTARA
                  </span>
                )}
              </div>
            </div>
            <Editor
              key={n.id}
              kunci
              tombol="Simpan sebagai versi baru"
              onSimpan={simpan}
              awal={{
                asetId: n.asetId, parameter: n.parameter, satuan: n.satuan, nomor: n.nomorSertifikat ?? '', tertelusur: n.tertelusur ?? '',
                tanggal: n.tanggalKalibrasi ?? '', berlaku: n.berlakuSampai ?? '', sumber: n.sumber, baris: n.points.map(barisDariTitik),
              }}
            />
          </section>
        );
      })}

      <section aria-labelledby="nk-baru" className="bg-white rounded-2xl p-5 sm:p-6 border border-dashed border-[#1C658C]/50 space-y-4">
        <h3 id="nk-baru" className="text-base font-bold text-[#1C658C] flex items-center gap-2"><Plus className="w-4 h-4" aria-hidden="true" />Tambah nilai kalibrator baru</h3>
        <p className="text-xs text-slate-600">Untuk alat atau parameter yang belum ada di daftar di atas. Kalau pasangan alat + parameter sudah punya nilai aktif, nilai lama otomatis dinonaktifkan.</p>
        <Editor
          kunci={false}
          alat={alat}
          tombol="Simpan nilai baru"
          onSimpan={simpan}
          awal={{ asetId: '', parameter: '', satuan: '', nomor: '', tertelusur: '', tanggal: '', berlaku: '', sumber: '', baris: [barisKosong()] }}
        />
      </section>
    </div>
  );
};
