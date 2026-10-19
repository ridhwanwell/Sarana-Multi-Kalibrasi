/**
 * Panel "Push ke Tera SMK" di detail jadwal (Tahap 3.3b, PRD F2.3–F2.4).
 *
 * Perumpamaan: tombol fotokopi surat tugas ke map teknisi. Panel ini hanya menyuruh server
 * memfotokopi; isi fotokopi dibaca server sendiri dari jadwal yang SUDAH TERSIMPAN
 * (bukan dari layar ini), jadi tidak bisa dipalsukan dari browser.
 *
 * - Tampil hanya untuk Admin Teknik & Developer (server juga menolak role lain).
 * - Mode Manual: tombol Push tidak ada (alur lama). Bila pernah di-Push lalu mode diganti,
 *   tombol Cabut tetap ada agar jadwal bisa ditarik dari tablet.
 * - Cabut memakai konfirmasi dua langkah di tempat; LKK yang sudah diisi teknisi tidak terhapus.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Smartphone, Undo2, CloudUpload } from 'lucide-react';
import type { CalibrationSchedule } from '../types';
import { useAuth } from '../lib/AuthContext';
import { apiFetch } from '../lib/apiClient';

interface StatusPush {
  sudahPush: boolean;
  versi?: number;
  pushedAt?: string;
  dicabut?: boolean;
  jumlahTeknisi?: number;
}

type Pesan = { jenis: 'ok' | 'gagal'; teks: string; peringatan?: string[] } | null;

const waktuIndonesia = (iso?: string) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
};

export const TeraPushPanel: React.FC<{ schedule: CalibrationSchedule }> = ({ schedule }) => {
  const { user } = useAuth();
  const bolehPush = user?.role === 'admin_teknik' || user?.role === 'admin_utama';
  const modeTera = schedule.modeSertifikat === 'tera';

  const [status, setStatus] = useState<StatusPush | null>(null);
  const [gagalMuat, setGagalMuat] = useState(false);
  const [bekerja, setBekerja] = useState<'push' | 'cabut' | null>(null);
  const [yakinCabut, setYakinCabut] = useState(false);
  const [pesan, setPesan] = useState<Pesan>(null);

  const muatStatus = useCallback(async () => {
    setGagalMuat(false);
    try {
      const res = await apiFetch(`/api/tera/push-status?jadwalId=${encodeURIComponent(schedule.id)}`, { retries: 1, timeoutMs: 15000 });
      const isi = await res.json().catch(() => null);
      if (!res.ok || !isi) { setGagalMuat(true); return; }
      setStatus(isi);
    } catch {
      setGagalMuat(true);
    }
  }, [schedule.id]);

  useEffect(() => { if (bolehPush) void muatStatus(); }, [bolehPush, muatStatus]);

  if (!bolehPush) return null;

  const aktifDiTablet = !!status?.sudahPush && !status.dicabut;

  const push = async () => {
    setPesan(null);
    setYakinCabut(false);
    setBekerja('push');
    try {
      const res = await apiFetch('/api/tera/push', {
        method: 'POST',
        body: JSON.stringify({ jadwalId: schedule.id }),
        retries: 0,
        timeoutMs: 20000
      });
      const isi = await res.json().catch(() => null);
      if (res.ok && isi?.hasil === 'dipush') {
        setPesan({
          jenis: 'ok',
          teks: `Terkirim ke Tera SMK (versi ${isi.versi}) untuk ${isi.jumlahTeknisi} teknisi, ${isi.jumlahAlat} jenis alat. Muncul di tablet saat tablet tersambung internet.`,
          peringatan: Array.isArray(isi.peringatan) ? isi.peringatan : []
        });
        await muatStatus();
      } else {
        let alasan: string = isi?.alasan || isi?.error || 'Push belum berhasil. Coba lagi.';
        if (/tidak ditemukan/i.test(alasan)) alasan += ' Bila jadwal baru saja dibuat/diubah, tunggu beberapa detik sampai tersimpan ke server, lalu coba lagi.';
        setPesan({ jenis: 'gagal', teks: alasan });
      }
    } catch {
      setPesan({ jenis: 'gagal', teks: 'Server tidak merespons. Belum ada yang berubah — coba lagi.' });
    } finally {
      setBekerja(null);
    }
  };

  const cabut = async () => {
    setPesan(null);
    setBekerja('cabut');
    try {
      const res = await apiFetch('/api/tera/push/cabut', {
        method: 'POST',
        body: JSON.stringify({ jadwalId: schedule.id }),
        retries: 0,
        timeoutMs: 20000
      });
      const isi = await res.json().catch(() => null);
      if (res.ok && (isi?.hasil === 'dicabut' || isi?.hasil === 'tidak_ada_yang_dicabut')) {
        setPesan({ jenis: 'ok', teks: 'Jadwal ditarik dari tablet teknisi. LKK yang sudah diisi tetap aman.' });
        await muatStatus();
      } else {
        setPesan({ jenis: 'gagal', teks: isi?.error || 'Cabut belum berhasil. Coba lagi.' });
      }
    } catch {
      setPesan({ jenis: 'gagal', teks: 'Server tidak merespons. Belum ada yang berubah — coba lagi.' });
    } finally {
      setBekerja(null);
      setYakinCabut(false);
    }
  };

  return (
    <section aria-labelledby={`tera-push-${schedule.id}`} className="bg-white p-3.5 rounded-xl border border-[#1C658C]/40 space-y-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 id={`tera-push-${schedule.id}`} className="font-bold text-[#1C658C] text-xs flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5" aria-hidden="true" />
            Tera SMK — kirim jadwal ke tablet teknisi
          </h4>
          <p className="text-[11px] text-slate-600 mt-0.5" role="status">
            {status === null && !gagalMuat && 'Memeriksa status…'}
            {gagalMuat && 'Status belum bisa dimuat. '}
            {status && !status.sudahPush && 'Belum pernah di-Push.'}
            {status && aktifDiTablet && (
              <>Sudah di-Push <strong>versi {status.versi}</strong> · {waktuIndonesia(status.pushedAt)} · {status.jumlahTeknisi} teknisi</>
            )}
            {status?.sudahPush && status.dicabut && <>Sudah dicabut dari tablet (versi {status.versi}).</>}
          </p>
          {!modeTera && (
            <p className="text-[11px] text-slate-500 mt-0.5">
              Mode sertifikat jadwal ini: <strong>Manual link Google Drive</strong>. Untuk memakai Tera SMK, ubah mode di <em>Edit jadwal</em>.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {gagalMuat && (
            <button type="button" onClick={() => { void muatStatus(); }}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 border border-[#DCDFE3] hover:bg-[#EEEEEE] transition-colors cursor-pointer">
              Muat ulang status
            </button>
          )}
          {modeTera && (
            <button type="button" onClick={() => { void push(); }} disabled={bekerja !== null} aria-busy={bekerja === 'push'}
              className="bg-[#1C658C] hover:bg-[#144966] disabled:opacity-60 text-white font-bold px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer">
              {bekerja === 'push' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <CloudUpload className="w-4 h-4" aria-hidden="true" />}
              {bekerja === 'push' ? 'Mengirim…' : aktifDiTablet ? 'Push ulang (kirim perubahan)' : 'Push ke Tera SMK'}
            </button>
          )}
          {aktifDiTablet && !yakinCabut && (
            <button type="button" onClick={() => setYakinCabut(true)} disabled={bekerja !== null}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-rose-700 border border-rose-300 hover:bg-rose-50 disabled:opacity-60 flex items-center gap-1.5 transition-colors cursor-pointer">
              <Undo2 className="w-4 h-4" aria-hidden="true" />
              Cabut dari tablet
            </button>
          )}
        </div>
      </div>

      {yakinCabut && (
        <div role="alertdialog" aria-label="Konfirmasi cabut jadwal" className="p-2.5 rounded-lg border border-rose-300 bg-rose-50 text-rose-800 text-[11px] flex flex-wrap items-center justify-between gap-2">
          <span>Tarik jadwal ini dari tablet teknisi? RS ini hilang dari daftar teknisi; LKK yang sudah diisi tetap aman dan tetap terkirim.</span>
          <span className="flex gap-2">
            <button type="button" onClick={() => setYakinCabut(false)}
              className="px-3 py-1.5 rounded-lg font-semibold text-slate-700 bg-white border border-[#DCDFE3] cursor-pointer">Batal</button>
            <button type="button" onClick={() => { void cabut(); }} disabled={bekerja !== null} aria-busy={bekerja === 'cabut'}
              className="px-3 py-1.5 rounded-lg font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60 flex items-center gap-1 cursor-pointer">
              {bekerja === 'cabut' && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
              Ya, cabut
            </button>
          </span>
        </div>
      )}

      <div aria-live="polite">
        {pesan && (
          <div className={`p-2.5 rounded-lg border text-[11px] ${pesan.jenis === 'ok' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-rose-50 border-rose-300 text-rose-800'}`}>
            <p className="flex items-start gap-1.5 font-semibold">
              {pesan.jenis === 'ok'
                ? <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                : <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />}
              <span>{pesan.teks}</span>
            </p>
            {pesan.peringatan && pesan.peringatan.length > 0 && (
              <ul className="mt-1.5 space-y-0.5 text-amber-800">
                {pesan.peringatan.map((p, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" aria-hidden="true" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {modeTera && (
        <p className="text-[10px] text-slate-500">
          Push memakai data jadwal yang sudah tersimpan. Setelah mengedit jadwal (alat, teknisi, label cadangan), tekan <strong>Push ulang</strong> agar tablet ikut berubah.
        </p>
      )}
    </section>
  );
};
