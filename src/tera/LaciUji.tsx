/**
 * Tera SMK — "Laci uji" (Tahap 2.5). HANYA untuk Developer (role admin_utama).
 *
 * Perumpamaan: laci berisi alat contoh untuk melatih kurir. Template alat sungguhan belum ada
 * (baru Tahap 4), jadi laci ini membuat LKK contoh dengan BO 999 supaya Ridhwan bisa melihat
 * sendiri chip berubah dari tersimpan → sedang dikirim → diterima, memutus sinyal, menutup
 * aplikasi, dll. (uji F4.12). Server menandai BO 999 sebagai data uji (is_test): tidak pernah
 * masuk BAP/BASTP/penagihan (CLAUDE.md 4.7 & 11).
 */
import React, { useId, useState } from 'react';
import { AlertCircle, FlaskConical, Loader2 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useSinkron } from './SinkronKonteks';
import { buatLkk, daftarLkk, tandaiSelesai } from './data/teraDb';

const BO_UJI = '999';
const MAKS = 50;

function tanggalHariIni(): string {
  const d = new Date();
  const dua = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;
}

/** Bacaan contoh: 3 titik ukur dengan angka acak kecil (hanya untuk uji). */
function isianContoh(urutan: number): Record<string, unknown> {
  const acak = () => Math.round((100 + Math.random() * 2) * 10) / 10;
  return {
    catatan: `LKK contoh laci uji #${urutan}`,
    titik_ukur: [0, 1, 2].map((i) => ({ titik: (i + 1) * 50, baca: [acak(), acak(), acak()] })),
  };
}

export const LaciUji: React.FC = () => {
  const { user } = useAuth();
  const { dorong } = useSinkron();
  const idJumlah = useId();
  const idMulai = useId();
  const [jumlah, setJumlah] = useState('5');
  const [mulai, setMulai] = useState('');
  const [selesai, setSelesai] = useState(true);
  const [bekerja, setBekerja] = useState(false);
  const [hasil, setHasil] = useState<{ ok: boolean; teks: string } | null>(null);

  if (user?.role !== 'admin_utama') return null; // teknisi tidak pernah melihat laci ini

  const buat = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasil(null);
    const n = Number.parseInt(jumlah, 10);
    if (!Number.isInteger(n) || n < 1 || n > MAKS) {
      setHasil({ ok: false, teks: `Isi jumlah antara 1 dan ${MAKS}.` });
      return;
    }
    if (mulai && !/^[0-9]{1,4}$/.test(mulai)) {
      setHasil({ ok: false, teks: 'Nomor awal berupa 1–4 angka, mis. 1 atau 0100.' });
      return;
    }
    setBekerja(true);
    try {
      const pemilik = user.id;
      const ada = await daftarLkk(pemilik);
      const dipakai = new Set(ada.map((l) => l.noLabel));
      // Tanpa nomor awal: lanjut dari nomor uji tertinggi di perangkat ini.
      let urut = mulai ? Number.parseInt(mulai, 10) : 1 + ada.reduce((m, l) => {
        const cocok = l.noLabel && l.noLabel.startsWith(`${BO_UJI}.`) ? Number.parseInt(l.noLabel.slice(4), 10) : 0;
        return Math.max(m, cocok);
      }, 0);
      let dibuat = 0;
      let pertama = '';
      let terakhir = '';
      while (dibuat < n && urut <= 9999) {
        const noLabel = `${BO_UJI}.${String(urut).padStart(4, '0')}`;
        urut++;
        if (dipakai.has(noLabel)) continue;
        const l = await buatLkk({
          pemilik, bo: BO_UJI, noLabel,
          templateKode: 'UJI-CONTOH', templateVersi: 1,
          tanggalKalibrasi: tanggalHariIni(),
          data: isianContoh(dibuat + 1),
        });
        if (selesai) await tandaiSelesai(l.id);
        if (!pertama) pertama = noLabel;
        terakhir = noLabel;
        dibuat++;
      }
      if (selesai) dorong();
      setHasil({
        ok: dibuat === n,
        teks: dibuat === 0
          ? 'Tidak ada nomor kosong dari nomor awal itu.'
          : `${dibuat} LKK contoh dibuat (${pertama}${dibuat > 1 ? ` – ${terakhir}` : ''}), ${selesai ? 'langsung masuk antrean kirim.' : 'sebagai draft.'}`,
      });
    } catch (err: any) {
      setHasil({ ok: false, teks: String(err?.message || 'Gagal membuat LKK contoh. Data yang sudah ada tidak terpengaruh.') });
    } finally {
      setBekerja(false);
    }
  };

  return (
    <section className="t-kartu mt-4" aria-labelledby="judul-laci-uji">
      <h2 id="judul-laci-uji" className="flex items-center gap-2 text-[15px] font-semibold">
        <FlaskConical size={18} aria-hidden="true" />Laci uji (Developer)
      </h2>
      <p className="t-ket mt-1">
        Membuat LKK contoh dengan BO 999 untuk menguji pengiriman otomatis. Ditandai data uji oleh server dan tidak pernah masuk BAP atau penagihan.
      </p>
      <form onSubmit={buat} noValidate className="mt-3" style={{ maxWidth: 420 }}>
        <label htmlFor={idJumlah} className="t-label">Jumlah LKK (1–{MAKS})</label>
        <div className="t-kotak">
          <input id={idJumlah} type="text" inputMode="numeric" value={jumlah} onChange={(e) => setJumlah(e.target.value.replace(/\D/g, '').slice(0, 2))} />
        </div>
        <label htmlFor={idMulai} className="t-label mt-3">Mulai dari nomor (opsional)</label>
        <p className="t-ket">Kosong = lanjut otomatis. Isi sama di dua tablet untuk menguji nomor ganda.</p>
        <div className="t-kotak">
          <span className="t-akhiran" style={{ paddingLeft: 12, paddingRight: 0 }} aria-hidden="true">{BO_UJI}.</span>
          <input id={idMulai} type="text" inputMode="numeric" placeholder="otomatis" value={mulai} onChange={(e) => setMulai(e.target.value.replace(/\D/g, '').slice(0, 4))} />
        </div>
        <label className="t-centang mt-3">
          <input type="checkbox" checked={selesai} onChange={(e) => setSelesai(e.target.checked)} />
          <span>Langsung “Selesai” (masuk antrean kirim). Hilangkan centang untuk membuat draft saja.</span>
        </label>
        <div className="mt-4">
          <button type="submit" disabled={bekerja} aria-busy={bekerja} className="t-tombol t-tombol-utama">
            {bekerja && <Loader2 size={18} aria-hidden="true" className="t-putar" />}
            {bekerja ? 'Membuat…' : 'Buat LKK contoh'}
          </button>
        </div>
      </form>
      {hasil && (
        hasil.ok
          ? <p className="t-ket mt-2" role="status">{hasil.teks}</p>
          : <p className="t-pesan-error mt-2" role="alert"><AlertCircle size={16} aria-hidden="true" className="mt-px shrink-0" /><span>{hasil.teks}</span></p>
      )}
    </section>
  );
};
