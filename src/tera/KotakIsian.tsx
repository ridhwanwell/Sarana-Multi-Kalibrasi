/**
 * Tera SMK — kotak isian bersama (dipindah dari LayarLkk.tsx pada Tahap 6.3b supaya dipakai layar Sphygmo DAN layar pompa).
 *
 * Isi tidak berubah: label di atas kotak, font 16 px, tinggi ≥ 48 px, koma desimal Indonesia, galat setelah kotak
 * ditinggalkan, status bukan warna saja (CLAUDE.md 13.6, 13.8).
 */
import React, { useState } from 'react';
import { AlertCircle, Check, ChevronDown, Minus } from 'lucide-react';
import type { Vonis } from './shared/hitung';
import { diLuarBatas, formatAngka, uraiKetikan } from './shared/lingkungan';

export const tglPanjang = (v: string | null | undefined): string => {
  if (!v || !/^\d{4}-\d{2}-\d{2}/.test(v)) return '-';
  try {
    return new Date(v.slice(0, 10) + 'T00:00:00Z').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  } catch { return '-'; }
};


export const Galat: React.FC<{ id: string; pesan: string | null | undefined }> = ({ id, pesan }) =>
  pesan ? (
    <p id={id} className="t-pesan-error">
      <AlertCircle size={16} aria-hidden="true" className="mt-px shrink-0" />
      <span>{pesan}</span>
    </p>
  ) : null;

export interface KotakTeksProps {
  id: string; label: string; nilai: string; onUbah: (v: string) => void; kunci: boolean;
  type?: 'text' | 'date'; maksPanjang?: number; bantuan?: string;
}

/** Kotak teks/tanggal: label selalu di atas, font 16 px, tinggi ≥ 48 px. */
export const KotakTeks: React.FC<KotakTeksProps> = ({ id, label, nilai, onUbah, kunci, type = 'text', maksPanjang, bantuan }) => (
  <div className="t-isian">
    <label htmlFor={id} className="t-label">{label}</label>
    <div className="t-kotak" data-kunci={kunci ? 'true' : undefined}>
      <input
        id={id} type={type} value={nilai} readOnly={kunci} maxLength={maksPanjang}
        autoComplete="off" autoCorrect="off" spellCheck={false}
        aria-describedby={bantuan ? `${id}-ket` : undefined}
        onChange={(e) => onUbah(e.target.value)}
      />
    </div>
    {bantuan && <p id={`${id}-ket`} className="t-ket mt-1">{bantuan}</p>}
  </div>
);

export interface KotakAngkaProps {
  id: string; label: string; nilai: number | null; onNilai: (n: number | null) => void; kunci: boolean;
  satuan?: string; batas?: { min: number; maks: number }; pesanBatas?: string; sudahDiisi?: boolean;
}

/**
 * Kotak angka berkoma Indonesia. Teks yang diketik disimpan terpisah dari angkanya, jadi "27," tidak
 * hilang di tengah ketikan. Galat batas muncul SETELAH kotak ditinggalkan (bukan saat "2" menuju "27").
 */
export const KotakAngka: React.FC<KotakAngkaProps> = ({ id, label, nilai, onNilai, kunci, satuan, batas, pesanBatas }) => {
  const [teks, setTeks] = useState(() => formatAngka(nilai));
  const [disentuh, setDisentuh] = useState(nilai !== null);
  const di_luar = batas ? diLuarBatas(nilai, batas) : false;
  const galat = disentuh && di_luar ? pesanBatas || 'Angka di luar batas.' : null;
  return (
    <div className="t-isian">
      <label htmlFor={id} className="t-label">{label}</label>
      <div className="t-kotak" data-error={galat ? 'true' : undefined} data-kunci={kunci ? 'true' : undefined}>
        <input
          id={id} type="text" inputMode="decimal" autoComplete="off" readOnly={kunci}
          className="tabular" value={teks} aria-invalid={galat ? true : undefined}
          aria-describedby={galat ? `${id}-galat` : undefined}
          onChange={(e) => { const u = uraiKetikan(e.target.value); setTeks(u.bersih); setDisentuh(false); onNilai(u.nilai); }}
          onBlur={() => { setDisentuh(true); setTeks(formatAngka(nilai)); }}
        />
        {satuan && <span className="t-akhiran" aria-hidden="true">{satuan}</span>}
      </div>
      <Galat id={`${id}-galat`} pesan={galat} />
    </div>
  );
};

export interface OpsiSegmen { nilai: string | number; label: string; nada?: 'baik' | 'tidak' }

/** Tombol segmen (≥ 48 px) — pengganti dropdown kecil. Terpilih = warna + centang + tulisan. */
export const Segmen: React.FC<{ label: string; opsi: OpsiSegmen[]; nilai: unknown; onPilih: (v: string | number) => void; kunci: boolean }> = ({ label, opsi, nilai, onPilih, kunci }) => (
  <div role="radiogroup" aria-label={label} className="t-segmen" style={{ gridTemplateColumns: `repeat(${opsi.length}, minmax(0, 1fr))` }}>
    {opsi.map((o) => {
      const dipilih = nilai === o.nilai;
      return (
        <button
          key={String(o.nilai)} type="button" role="radio" aria-checked={dipilih} aria-disabled={kunci || undefined}
          data-nada={o.nada} onClick={() => { if (!kunci) onPilih(o.nilai); }}
        >
          {dipilih && (o.nada === 'tidak' ? <AlertCircle size={18} aria-hidden="true" /> : <Check size={18} aria-hidden="true" />)}
          <span>{o.label}</span>
        </button>
      );
    })}
  </div>
);

export interface PilihanDropdownProps { id: string; label: string; opsi: [string, string]; nilai: unknown; kunci: boolean; onPilih: (v: string) => void; sembunyikanLabel?: boolean }

/**
 * Dropdown Baik / Tidak Baik (permintaan Ridhwan 22 Okt 2026). Dropdown bawaan perangkat (nyaman di HP/tablet),
 * tinggi ≥ 48 px, font 16 px. Tidak Baik = warna merah + ikon tanda seru + tulisan (bukan warna saja).
 */
export const Dropdown: React.FC<PilihanDropdownProps> = ({ id, label, opsi, nilai, kunci, onPilih, sembunyikanLabel }) => {
  const tidak = nilai === opsi[1];
  const sah = nilai === opsi[0] || nilai === opsi[1];
  return (
    <div className="t-isian">
      {sembunyikanLabel ? null : <label htmlFor={id} className="t-label">{label}</label>}
      <div className="t-kotak t-pilih" data-nada={tidak ? 'tidak' : sah ? 'baik' : undefined} data-kunci={kunci ? 'true' : undefined}>
        <span className="t-ikon-pilih" aria-hidden="true">{tidak ? <AlertCircle size={18} /> : <Check size={18} />}</span>
        <select id={id} value={sah ? (nilai as string) : ''} disabled={kunci} aria-label={sembunyikanLabel ? label : undefined} onChange={(e) => onPilih(e.target.value)}>
          {!sah && <option value="" disabled>Pilih…</option>}
          {opsi.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown size={20} aria-hidden="true" className="t-panah-pilih" />
      </div>
    </div>
  );
};

/** Dropdown pilihan bebas (klasifikasi alat): netral, tanpa warna baik/tidak. Tinggi ≥ 48 px, font 16 px. */
export const PilihanDaftar: React.FC<{ id: string; label: string; opsi: string[]; nilai: unknown; kunci: boolean; onPilih: (v: string) => void; bantuan?: string }> = ({ id, label, opsi, nilai, kunci, onPilih, bantuan }) => {
  const sah = typeof nilai === 'string' && opsi.includes(nilai);
  return (
    <div className="t-isian">
      <label htmlFor={id} className="t-label">{label}</label>
      <div className="t-kotak t-pilih" data-kunci={kunci ? 'true' : undefined}>
        <span className="t-ikon-pilih" aria-hidden="true">{sah ? <Check size={18} /> : <Minus size={18} />}</span>
        <select id={id} value={sah ? (nilai as string) : ''} disabled={kunci} onChange={(e) => onPilih(e.target.value)} aria-describedby={bantuan ? `${id}-b` : undefined}>
          {!sah && <option value="" disabled>Pilih…</option>}
          {opsi.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown size={20} aria-hidden="true" className="t-panah-pilih" />
      </div>
      {bantuan && <p id={`${id}-b`} className="t-ket mt-1">{bantuan}</p>}
    </div>
  );
};

export const HasilKoreksi: React.FC<{ judul: string; teks: string | null; ket: string }> = ({ judul, teks, ket }) => (
  <div className="t-hasil" role="status">
    <p className="t-ket">{judul}</p>
    <p className="t-hasil-angka tabular">{teks ?? '-'}</p>
    <p className="t-ket">{ket}</p>
  </div>
);


export const fmt2 = (n: number | null | undefined) => (typeof n === 'number' && Number.isFinite(n) ? n.toFixed(2).replace('.', ',') : '-');

/** Chip hasil: warna + ikon + tulisan (CLAUDE.md 13.4). */
export const ChipVonis: React.FC<{ vonis: Vonis; teksLaik?: string; teksTidak?: string }> = ({ vonis, teksLaik = 'LAIK', teksTidak = 'TIDAK LAIK' }) => (
  <span className="t-vonis" data-v={vonis === 'Laik' ? 'laik' : vonis === 'Tidak Laik' ? 'tidak' : 'belum'}>
    {vonis === 'Laik' ? <Check size={16} aria-hidden="true" /> : vonis === 'Tidak Laik' ? <AlertCircle size={16} aria-hidden="true" /> : <Minus size={16} aria-hidden="true" />}
    {vonis === 'Laik' ? teksLaik : vonis === 'Tidak Laik' ? teksTidak : 'Belum diisi'}
  </span>
);

