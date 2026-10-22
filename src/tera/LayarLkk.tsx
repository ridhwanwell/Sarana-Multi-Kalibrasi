/**
 * Tera SMK — layar isi LKK, bagian 1–3 (Tahap 4.3c, PRD-AISTUDIO A1 · CLAUDE.md 5, 9.3, 9.4, 13).
 *
 * Perumpamaan: lembar kerja kalibrasi di tangan teknisi. Setiap isian LANGSUNG ditulis ke buku di perangkat
 * (auto-save ≤ 400 ms + saat kotak ditinggalkan, pindah bagian, aplikasi disembunyikan/ditutup), jadi muat
 * ulang halaman atau HP mati tidak menghilangkan isian. Tiga "fotokopi sertifikat" alat standar dijepret ke
 * LKK saat dipilih (snapshot), sehingga hitungan tidak berubah walau master kalibrator nanti diperbarui.
 *
 * Bagian: Identitas alat (+ pilih alat standar) → Kondisi lingkungan → Fisik & fungsi → Kinerja → Kesimpulan.
 * Ringkasan & Selesai dibuka di langkah berikutnya (4.3d-3). Hitungan Laik/Tidak Laik berjalan di belakang layar
 * (shared/jejak.ts → hitung.ts) dan hanya DITAMPILKAN di sini; tidak ada rumus di komponen.
 *
 * Tidak ada rumus di komponen: hitungan lingkungan ada di shared/lingkungan.ts, aturan kelengkapan di shared/isian.ts.
 * UI: ui-ux-pro-max (label di atas kotak, galat di bawah kotak saat pindah kotak, ≥ 48 px, inputmode, safe area,
 * status bukan warna saja, reduced-motion) + break-ui (teks panjang, huruf besar, data kosong/rusak).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, Check, ChevronDown, ChevronLeft, ChevronRight, Info, Loader2, Lock, Minus } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useSinkron } from './SinkronKonteks';
import { ChipSync, KeadaanKosong } from './TeraKerangka';
import { ambilLkk, bolehDiubah, simpanIsian, type LkkLokal } from './data/teraDb';
import { buatJejakHitung } from './shared/jejak';
import type { Vonis } from './shared/hitung';
import { buatSnapshot, daftarKalibrator, templateVersi, type KalibratorLokal } from './data/masterLokal';
import type { TemplateAlat } from './shared/hitung';
import {
  bagianLengkap, batasLingkungan, bidangIdentitas, daftarBagian, daftarStandar, jepretStandar, periksaIsian,
  statusBerlaku, statusSnapshot, susunPilihan, tabelRh, tabelSuhu,
  type BagianId, type DefStandar, type IsiKerja, type Kurang, type PilihanStandar,
} from './shared/isian';
import { diLuarBatas, formatAngka, hitungLingkungan, uraiKetikan } from './shared/lingkungan';

type Peta = Record<string, any>;

/* ---------- Pembantu tampilan ---------- */

const tglPanjang = (v: string | null | undefined): string => {
  if (!v || !/^\d{4}-\d{2}-\d{2}/.test(v)) return '-';
  try {
    return new Date(v.slice(0, 10) + 'T00:00:00Z').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  } catch { return '-'; }
};

const jamLokal = (d: Date): string => d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

const Galat: React.FC<{ id: string; pesan: string | null | undefined }> = ({ id, pesan }) =>
  pesan ? (
    <p id={id} className="t-pesan-error">
      <AlertCircle size={16} aria-hidden="true" className="mt-px shrink-0" />
      <span>{pesan}</span>
    </p>
  ) : null;

interface KotakTeksProps {
  id: string; label: string; nilai: string; onUbah: (v: string) => void; kunci: boolean;
  type?: 'text' | 'date'; maksPanjang?: number; bantuan?: string;
}

/** Kotak teks/tanggal: label selalu di atas, font 16 px, tinggi ≥ 48 px. */
const KotakTeks: React.FC<KotakTeksProps> = ({ id, label, nilai, onUbah, kunci, type = 'text', maksPanjang, bantuan }) => (
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

interface KotakAngkaProps {
  id: string; label: string; nilai: number | null; onNilai: (n: number | null) => void; kunci: boolean;
  satuan?: string; batas?: { min: number; maks: number }; pesanBatas?: string; sudahDiisi?: boolean;
}

/**
 * Kotak angka berkoma Indonesia. Teks yang diketik disimpan terpisah dari angkanya, jadi "27," tidak
 * hilang di tengah ketikan. Galat batas muncul SETELAH kotak ditinggalkan (bukan saat "2" menuju "27").
 */
const KotakAngka: React.FC<KotakAngkaProps> = ({ id, label, nilai, onNilai, kunci, satuan, batas, pesanBatas }) => {
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

interface OpsiSegmen { nilai: string | number; label: string; nada?: 'baik' | 'tidak' }

/** Tombol segmen (≥ 48 px) — pengganti dropdown kecil. Terpilih = warna + centang + tulisan. */
const Segmen: React.FC<{ label: string; opsi: OpsiSegmen[]; nilai: unknown; onPilih: (v: string | number) => void; kunci: boolean }> = ({ label, opsi, nilai, onPilih, kunci }) => (
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

interface PilihanDropdownProps { id: string; label: string; opsi: [string, string]; nilai: unknown; kunci: boolean; onPilih: (v: string) => void; sembunyikanLabel?: boolean }

/**
 * Dropdown Baik / Tidak Baik (permintaan Ridhwan 22 Okt 2026). Dropdown bawaan perangkat (nyaman di HP/tablet),
 * tinggi ≥ 48 px, font 16 px. Tidak Baik = warna merah + ikon tanda seru + tulisan (bukan warna saja).
 */
const Dropdown: React.FC<PilihanDropdownProps> = ({ id, label, opsi, nilai, kunci, onPilih, sembunyikanLabel }) => {
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

/* ---------- Pilih alat standar ---------- */

const RingkasStatus: React.FC<{ status: ReturnType<typeof statusBerlaku>; berlakuSampai: string | null }> = ({ status, berlakuSampai }) => {
  if (status === 'expired') return <span className="t-opsi-status" data-jenis="expired"><AlertCircle size={14} aria-hidden="true" />Expired — berlaku sampai {tglPanjang(berlakuSampai)}</span>;
  if (status === 'berlaku') return <span className="t-opsi-status" data-jenis="berlaku"><Check size={14} aria-hidden="true" />Berlaku sampai {tglPanjang(berlakuSampai)}</span>;
  return <span className="t-opsi-status" data-jenis="belum"><Info size={14} aria-hidden="true" />Belum ada tanggal sertifikat (boleh dipakai)</span>;
};

interface KartuStandarProps {
  def: DefStandar; pilihan: PilihanStandar<KalibratorLokal>[]; snap: Peta | null; tanggal: string | null;
  kunci: boolean; onPilih: (p: PilihanStandar<KalibratorLokal>) => void;
}

const KartuStandar: React.FC<KartuStandarProps> = ({ def, pilihan, snap, tanggal, kunci, onPilih }) => {
  const idJudul = `std-${def.peran}`;
  const statusDipilih = statusSnapshot(snap, tanggal);
  return (
    <section className="t-kartu t-standar" aria-labelledby={idJudul}>
      <h3 id={idJudul} className="t-judul-kecil">
        {def.judul}{def.wajib ? <span className="t-ket"> · wajib</span> : null}
      </h3>
      {snap && statusDipilih === 'expired' && (
        <p className="t-peringatan" role="alert">
          <AlertCircle size={20} aria-hidden="true" className="shrink-0" />
          <span>Alat yang dipilih expired pada tanggal pelaksanaan. Pilih alat lain, atau betulkan tanggal pelaksanaan. LKK belum bisa diselesaikan.</span>
        </p>
      )}
      {pilihan.length === 0 ? (
        <p className="t-ket mt-2" role="status">Data {def.judul.toLowerCase()} belum ada di aplikasi. Hubungi Developer.</p>
      ) : (
        <div role="radiogroup" aria-labelledby={idJudul} className="t-opsi-daftar">
          {pilihan.map((p) => {
            const st = statusBerlaku(p.berlakuSampai, tanggal);
            const dipilih = snap?.asetId === p.kunci;
            const mati = kunci || (st === 'expired' && !dipilih) || !p.lengkap;
            const rincian = [[p.merk, p.model].filter(Boolean).join(' '), p.nomorSeri ? `S/N ${p.nomorSeri}` : ''].filter(Boolean).join(' · ');
            return (
              <button
                key={p.kunci} type="button" role="radio" className="t-opsi"
                aria-checked={dipilih} aria-disabled={mati || undefined} data-mati={mati ? 'true' : undefined}
                onClick={() => { if (!mati && !dipilih) onPilih(p); }}
              >
                <span className="t-opsi-tanda" aria-hidden="true">{dipilih ? <Check size={16} /> : null}</span>
                <span className="t-opsi-isi">
                  <span className="t-opsi-nama">
                    {p.nama}
                    {p.rekomendasi && <span className="t-rekomendasi">Rekomendasi</span>}
                  </span>
                  {rincian && <span className="t-ket">{rincian}</span>}
                  {p.nomorSertifikat && <span className="t-ket tabular">Sertifikat {p.nomorSertifikat}</span>}
                  <RingkasStatus status={st} berlakuSampai={p.berlakuSampai} />
                  {!p.lengkap && <span className="t-ket">Data sertifikat belum lengkap, belum bisa dipilih.</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};

/* ---------- Bagian 1: Identitas ---------- */

interface BagianProps {
  tpl: TemplateAlat; isi: IsiKerja; kunci: boolean; kurang: Kurang[];
  ubahData: (blok: string, bidang: string, nilai: unknown) => void;
  ubahBacaan: (kinerjaId: string, titik: number, arah: 'naik' | 'turun', urutan: number, jumlah: number, nilai: number | null) => void;
}

const BagianIdentitas: React.FC<BagianProps & {
  namaRs: string; teknisi: string; kalibrator: KalibratorLokal[];
  ubahTanggal: (v: string) => void; pilihStandar: (def: DefStandar, p: PilihanStandar<KalibratorLokal>) => void;
}> = ({ tpl, isi, kunci, namaRs, teknisi, kalibrator, ubahTanggal, ubahData, pilihStandar }) => {
  const iden = (isi.data.identitas ?? {}) as Peta;
  const standar = useMemo(() => daftarStandar(tpl), [tpl]);
  return (
    <>
      <div className="t-isian-grid">
        <div className="t-isian"><span className="t-label">Nama alat</span><p className="t-baca">{tpl.nama}</p></div>
        <div className="t-isian"><span className="t-label">Tempat</span><p className="t-baca">{namaRs}</p></div>
        <div className="t-isian"><span className="t-label">Teknisi</span><p className="t-baca">{teknisi}</p></div>
        {bidangIdentitas(tpl).map((b) => {
          const id = `iden-${b.id}`;
          if (b.jenis === 'teks') return <KotakTeks key={b.id} id={id} label={b.label} nilai={String(iden[b.id] ?? '')} kunci={kunci} maksPanjang={b.maksPanjang} onUbah={(v) => ubahData('identitas', b.id, v)} />;
          if (b.jenis === 'tanggal') return <KotakTeks key={b.id} id={id} label={b.label} type="date" nilai={String(iden[b.id] ?? '')} kunci={kunci} onUbah={(v) => ubahData('identitas', b.id, v)} />;
          if (b.jenis === 'angka') return <KotakAngka key={b.id} id={id} label={b.label} satuan={b.satuan} nilai={typeof iden[b.id] === 'number' ? iden[b.id] : null} kunci={kunci} onNilai={(n) => ubahData('identitas', b.id, n)} />;
          if (b.jenis === 'resolusi') {
            return (
              <div key={b.id} className="t-isian">
                <span className="t-label" id={`${id}-l`}>{b.label}</span>
                <Segmen label={b.label} kunci={kunci} nilai={iden[b.id]} onPilih={(v) => ubahData('identitas', b.id, v)}
                  opsi={tpl.identitas.resolusi.pilihan.map((n) => ({ nilai: n, label: `${formatAngka(n)} ${tpl.identitas.resolusi.satuan}` }))} />
              </div>
            );
          }
          return (
            <div key={b.id} className="t-isian">
              <span className="t-label" id={`${id}-l`}>{b.label}</span>
              <Segmen label={b.label} kunci={kunci} nilai={iden[b.id]} onPilih={(v) => ubahData('identitas', b.id, v)}
                opsi={tpl.identitas.jenisSkala.map((s) => ({ nilai: s, label: s }))} />
            </div>
          );
        })}
        <KotakTeks id="iden-tanggal-pelaksanaan" label="Tanggal pelaksanaan" type="date" nilai={isi.tanggal ?? ''} kunci={kunci} onUbah={ubahTanggal}
          bantuan="Dipakai untuk memeriksa masa berlaku alat standar." />
      </div>

      <h3 className="t-judul-bagian mt-6">Alat standar yang dipakai</h3>
      <p className="t-ket mt-1">Pilih alat yang benar-benar dipakai. Salinan sertifikatnya disimpan di LKK ini.</p>
      <div className="t-standar-daftar mt-3">
        {standar.map((d) => (
          <KartuStandar
            key={d.peran} def={d} kunci={kunci} tanggal={isi.tanggal} snap={(isi.snapshot?.[d.peran] as Peta) ?? null}
            pilihan={susunPilihan(d, kalibrator)} onPilih={(p) => pilihStandar(d, p)}
          />
        ))}
      </div>
    </>
  );
};

/* ---------- Bagian 2: Lingkungan ---------- */

const HasilKoreksi: React.FC<{ judul: string; teks: string | null; ket: string }> = ({ judul, teks, ket }) => (
  <div className="t-hasil" role="status">
    <p className="t-ket">{judul}</p>
    <p className="t-hasil-angka tabular">{teks ?? '-'}</p>
    <p className="t-ket">{ket}</p>
  </div>
);

const BagianLingkungan: React.FC<BagianProps & { keIdentitas: () => void }> = ({ tpl, isi, kunci, ubahData, keIdentitas }) => {
  const ling = (isi.data.lingkungan ?? {}) as Peta;
  const batas = batasLingkungan(tpl);
  const snap = (isi.snapshot?.termohigrometer as Peta) ?? null;
  const angka = (k: string) => (typeof ling[k] === 'number' ? (ling[k] as number) : null);
  const suhu = useMemo(() => hitungLingkungan(tabelSuhu(snap), ling.suhuAwal, ling.suhuAkhir, 1), [snap, ling.suhuAwal, ling.suhuAkhir]);
  const rh = useMemo(() => hitungLingkungan(tabelRh(snap), ling.rhAwal, ling.rhAkhir, 0), [snap, ling.rhAwal, ling.rhAkhir]);
  const adaIsian = (a: unknown, b: unknown) => typeof a === 'number' && typeof b === 'number';
  const ket = (hasil: unknown, a: unknown, b: unknown) =>
    !snap ? 'Pilih termohigrometer di bagian Identitas.'
      : !adaIsian(a, b) ? 'Isi bacaan awal dan akhir.'
        : hasil ? `Dikoreksi dengan sertifikat ${snap.nama || 'termohigrometer'}.` : 'Data sertifikat termohigrometer kurang.';
  const pesan = (n: string, b: { min: number; maks: number }, s: string) => `Di luar batas ${b.min}–${b.maks} ${s}. Periksa angkanya. Bila benar, ruangan belum layak untuk kalibrasi.`;
  return (
    <>
      <p className="t-ket">Baca termohigrometer di ruangan, sebelum dan sesudah kalibrasi. Batas ruang: suhu {batas.suhu.min}–{batas.suhu.maks} °C, kelembaban {batas.rh.min}–{batas.rh.maks} %RH.</p>
      {!snap && !kunci && (
        <p className="t-info mt-3" role="status">
          <Info size={20} aria-hidden="true" className="shrink-0" />
          <span>Nilai terkoreksi muncul setelah termohigrometer dipilih. <button type="button" className="t-tautan" onClick={keIdentitas}>Pilih sekarang</button></span>
        </p>
      )}
      <div className="t-isian-grid mt-4">
        <section className="t-kartu" aria-label="Suhu ruangan">
          <h3 className="t-judul-kecil">Suhu ruangan</h3>
          <div className="t-isian-grid mt-2">
            <KotakAngka id="ling-suhu-awal" label="Awal" satuan="°C" nilai={angka('suhuAwal')} kunci={kunci} batas={batas.suhu} pesanBatas={pesan('Suhu', batas.suhu, '°C')} onNilai={(n) => ubahData('lingkungan', 'suhuAwal', n)} />
            <KotakAngka id="ling-suhu-akhir" label="Akhir" satuan="°C" nilai={angka('suhuAkhir')} kunci={kunci} batas={batas.suhu} pesanBatas={pesan('Suhu', batas.suhu, '°C')} onNilai={(n) => ubahData('lingkungan', 'suhuAkhir', n)} />
          </div>
          <HasilKoreksi judul="Suhu terkoreksi" ket={ket(suhu, ling.suhuAwal, ling.suhuAkhir)}
            teks={suhu ? `( ${suhu.terkoreksi.toFixed(1).replace('.', ',')} ± ${formatAngka(suhu.u95)} ) °C` : null} />
        </section>
        <section className="t-kartu" aria-label="Kelembaban ruangan">
          <h3 className="t-judul-kecil">Kelembaban</h3>
          <div className="t-isian-grid mt-2">
            <KotakAngka id="ling-rh-awal" label="Awal" satuan="%RH" nilai={angka('rhAwal')} kunci={kunci} batas={batas.rh} pesanBatas={pesan('Kelembaban', batas.rh, '%RH')} onNilai={(n) => ubahData('lingkungan', 'rhAwal', n)} />
            <KotakAngka id="ling-rh-akhir" label="Akhir" satuan="%RH" nilai={angka('rhAkhir')} kunci={kunci} batas={batas.rh} pesanBatas={pesan('Kelembaban', batas.rh, '%RH')} onNilai={(n) => ubahData('lingkungan', 'rhAkhir', n)} />
          </div>
          <HasilKoreksi judul="Kelembaban terkoreksi" ket={ket(rh, ling.rhAwal, ling.rhAkhir)}
            teks={rh ? `( ${rh.terkoreksi.toFixed(0)} ± ${formatAngka(rh.u95)} ) %RH` : null} />
        </section>
      </div>
    </>
  );
};

/* ---------- Bagian 3: Fisik & fungsi ---------- */

const BagianFisik: React.FC<BagianProps> = ({ tpl, isi, kunci, ubahData }) => {
  const fisik = (isi.data.fisik ?? {}) as Peta;
  const [baik, tidak] = tpl.pilihanFisik;
  const simpan = (id: string, sisi: 'fisik' | 'fungsi', v: unknown) => ubahData('fisik', id, { ...(fisik[id] ?? {}), [sisi]: v });
  return (
    <>
      <p className="t-ket">Periksa tiap bagian alat: kondisi fisiknya dan cara kerjanya. Pilihan awal Baik; ubah ke Tidak Baik bila ada yang tidak sesuai.</p>
      <ul className="t-fisik-daftar mt-3">
        {tpl.fisik.map((f) => (
          <li key={f.id} className="t-kartu">
            <h3 className="t-judul-kecil">{f.judul}</h3>
            <div className="t-isian-grid mt-2">
              <Dropdown id={`fisik-${f.id}-fisik`} label="Fisik" opsi={[baik, tidak]} nilai={fisik[f.id]?.fisik} kunci={kunci} onPilih={(v) => simpan(f.id, 'fisik', v)} />
              <Dropdown id={`fisik-${f.id}-fungsi`} label="Fungsi" opsi={[baik, tidak]} nilai={fisik[f.id]?.fungsi} kunci={kunci} onPilih={(v) => simpan(f.id, 'fungsi', v)} />
            </div>
          </li>
        ))}
      </ul>
      {(tpl.fisikTambahan?.length ?? 0) > 0 && (
        <>
          <h3 className="t-judul-kecil mt-6">Butir lain yang diperiksa</h3>
          <p className="t-ket">Satu pilihan untuk tiap butir (awalnya Baik).</p>
          <ul className="t-fisik-daftar mt-3">
            {tpl.fisikTambahan!.map((f) => (
              <li key={f.id} className="t-kartu">
                <h4 className="t-judul-kecil">{f.judul}</h4>
                <div className="mt-2">
                  <Dropdown id={`fisik-lain-${f.id}`} label={f.judul} sembunyikanLabel opsi={[baik, tidak]} nilai={((isi.data.fisikTambahan ?? {}) as Peta)[f.id]} kunci={kunci} onPilih={(v) => ubahData('fisikTambahan', f.id, v)} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
};

/* ---------- Bagian 5: Kinerja ---------- */

const fmt2 = (n: number | null | undefined) => (typeof n === 'number' && Number.isFinite(n) ? n.toFixed(2).replace('.', ',') : '-');

/** Chip hasil: warna + ikon + tulisan (CLAUDE.md 13.4). */
const ChipVonis: React.FC<{ vonis: Vonis; teksLaik?: string; teksTidak?: string }> = ({ vonis, teksLaik = 'LAIK', teksTidak = 'TIDAK LAIK' }) => (
  <span className="t-vonis" data-v={vonis === 'Laik' ? 'laik' : vonis === 'Tidak Laik' ? 'tidak' : 'belum'}>
    {vonis === 'Laik' ? <Check size={16} aria-hidden="true" /> : vonis === 'Tidak Laik' ? <AlertCircle size={16} aria-hidden="true" /> : <Minus size={16} aria-hidden="true" />}
    {vonis === 'Laik' ? teksLaik : vonis === 'Tidak Laik' ? teksTidak : 'Belum diisi'}
  </span>
);

const BagianKinerja: React.FC<BagianProps> = ({ tpl, isi, kunci, ubahData, ubahBacaan }) => {
  const jejak = useMemo(() => buatJejakHitung(tpl, isi.data, isi.snapshot), [tpl, isi.data, isi.snapshot]);
  const hasil = jejak?.hasil ?? null;
  const kin = (isi.data.kinerja ?? {}) as Peta;
  return (
    <>
      {tpl.ujiAmbang.map((u) => {
        const nilai = (isi.data[u.id] ?? {}) as Peta;
        const kolom = u.jenis === 'selisih_setting' ? 'bacaan' : 'waktu';
        const h = hasil?.ujiAmbang[u.id];
        const angka = typeof nilai[kolom] === 'number' ? (nilai[kolom] as number) : null;
        return (
          <section key={u.id} className="t-kartu mb-4" aria-label={u.judul}>
            <h3 className="t-judul-kecil">{u.judul}</h3>
            <p className="t-ket">
              {u.jenis === 'selisih_setting' ? `Setting ${u.setting} ${u.satuan}. Isi bacaan di alat; selisih terhadap setting dihitung otomatis.` : 'Isi hasil pengukuran.'}
              {' '}Batas: {u.banding.replace('<=', '≤').replace('>=', '≥')} {u.batas} {u.satuan}.
            </p>
            <div className="mt-2 t-isian-grid">
              <KotakAngka id={`uji-${u.id}`} label={u.jenis === 'selisih_setting' ? 'Bacaan' : 'Waktu'} satuan={u.satuan} nilai={angka} kunci={kunci} onNilai={(n) => ubahData(u.id, kolom, n)} />
              <div className="t-isian">
                <span className="t-label">{u.jenis === 'selisih_setting' ? 'Selisih' : 'Nilai'}</span>
                <p className="t-hasil-baris tabular">
                  {h && h.nilaiUkur !== null ? `${formatAngka(h.nilaiUkur)} ${u.satuan}` : '-'}
                  <ChipVonis vonis={h?.hasil ?? '-'} />
                </p>
              </div>
            </div>
          </section>
        );
      })}

      {tpl.kinerja.map((k) => (
        <div key={k.id}>
          <h3 className="t-judul-kecil">{k.judul}</h3>
          <p className="t-ket">
            Isi {k.pengulangan} bacaan naik dan {k.pengulangan} bacaan turun di tiap titik, mulai dari titik 0. Rata-rata, koreksi, dan ketidakpastian (U95) dihitung otomatis dengan koreksi alat standar.
          </p>
          <ul className="t-fisik-daftar mt-3">
            {k.titik.map((t) => (
              <li key={t} className="t-kartu" aria-label={`Titik ${t} ${k.satuan}`}>
                <h4 className="t-judul-kecil">Titik {t} {k.satuan}</h4>
                <div className="t-baca-pasang mt-2">
                  {(['naik', 'turun'] as const).map((arah) => {
                    const run = (kin[k.id]?.[String(t)]?.[arah] ?? []) as (number | null)[];
                    const ht = hasil?.kinerja[k.id]?.titik.find((x) => x.titik === t && x.arah === arah);
                    return (
                      <div key={arah} className="t-baca-grup">
                        <p className="t-label">{arah === 'naik' ? 'Naik' : 'Turun'}</p>
                        <div className="t-baca-grid">
                          {Array.from({ length: k.pengulangan }, (_, i) => (
                            <KotakAngka
                              key={i} id={`kin-${k.id}-${t}-${arah}-${i}`} label={`Bacaan ${i + 1}`} nilai={typeof run[i] === 'number' ? run[i] : null}
                              kunci={kunci} onNilai={(n) => ubahBacaan(k.id, t, arah, i, k.pengulangan, n)}
                            />
                          ))}
                        </div>
                        <p className="t-hasil-baris tabular" role="status" aria-label={`Hasil titik ${t} ${arah}`}>
                          <span>Rata-rata {ht?.rataRata != null ? formatAngka(Math.round(ht.rataRata * 100) / 100) : '-'}</span>
                          <span>Koreksi {ht?.koreksi != null ? formatAngka(Math.round(ht.koreksi * 100) / 100) : '-'}</span>
                          <span>U95 {fmt2(ht?.u95Cetak)}</span>
                          <ChipVonis vonis={ht?.hasil ?? '-'} />
                        </p>
                      </div>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
};

/* ---------- Bagian 6: Kesimpulan ---------- */

const NAMA_BAGIAN: Record<string, string> = { identitas: 'Identitas alat', lingkungan: 'Kondisi lingkungan', fisik: 'Fisik & fungsi', keselamatan: 'Keselamatan listrik', kinerja: 'Kinerja' };

const BagianKesimpulan: React.FC<BagianProps & { keBagian: (id: BagianId) => void }> = ({ tpl, isi, kurang, keBagian }) => {
  const jejak = useMemo(() => buatJejakHitung(tpl, isi.data, isi.snapshot), [tpl, isi.data, isi.snapshot]);
  const hasil = jejak?.hasil ?? null;
  const final = !!hasil && !!jejak?.lengkap && kurang.length === 0;
  if (!final || !hasil) {
    const bagianKurang = [...new Set(kurang.map((k) => k.bagian))];
    return (
      <>
        <div className="t-stiker" data-v="belum" role="status">
          <Minus size={28} aria-hidden="true" />
          <div>
            <p className="t-stiker-judul">Belum bisa ditentukan</p>
            <p className="t-ket">Lengkapi isian dulu. Setelah semua terisi, di sini muncul LAIK PAKAI atau TIDAK LAIK PAKAI beserta stiker yang harus ditempel.</p>
          </div>
        </div>
        {kurang.length > 0 && (
          <div className="t-kurang" role="status" aria-label="Yang masih kurang">
            <p className="t-label">Yang masih kurang</p>
            <ul>
              {kurang.map((k) => (
                <li key={k.bagian + k.teks} data-merah={k.merah || undefined}>
                  {k.merah ? <AlertCircle size={16} aria-hidden="true" className="shrink-0" /> : <span className="t-titik" aria-hidden="true" />}
                  <span><b>{NAMA_BAGIAN[k.bagian] ?? k.bagian}:</b> {k.teks}</span>
                </li>
              ))}
            </ul>
            <div className="t-kurang-aksi">
              {bagianKurang.map((id) => (
                <button key={id} type="button" className="t-tombol t-tombol-kedua" onClick={() => keBagian(id)}>Ke {NAMA_BAGIAN[id] ?? id}</button>
              ))}
            </div>
          </div>
        )}
      </>
    );
  }

  const laik = hasil.kesimpulan === 'Laik Pakai';
  const alasan: string[] = [];
  tpl.skor.item.forEach((it, idx) => {
    const nilai = hasil.skor.rincian[idx]?.nilai ?? 0;
    if (nilai > 0) return;
    if (it.dari === 'fisik') alasan.push(`Fisik & fungsi: ${hasil.fisik.jumlahBaik} dari ${hasil.fisik.jumlahItem} butir baik (perlu minimal ${Math.round(it.minimalPersen * 100)}%).`);
    else if (it.dari === 'uji_ambang') {
      const u = tpl.ujiAmbang.find((x) => x.id === it.id); const h = hasil.ujiAmbang[it.id];
      if (u && h) alasan.push(`${u.judul}: ${formatAngka(h.nilaiUkur)} ${u.satuan}, batas ${u.banding.replace('<=', '≤').replace('>=', '≥')} ${u.batas} ${u.satuan}.`);
    } else {
      const k = tpl.kinerja.find((x) => x.id === it.id); const h = hasil.kinerja[it.id];
      if (k && h) alasan.push(`${k.judul}: ${h.jumlahLaik} dari ${h.jumlahDinilai} titik laik (perlu minimal ${Math.round(it.minimalPersen * 100)}%).`);
    }
  });
  return (
    <>
      <div className="t-stiker" data-v={laik ? 'laik' : 'tidak'} role="status">
        {laik ? <Check size={32} aria-hidden="true" /> : <AlertCircle size={32} aria-hidden="true" />}
        <div>
          <p className="t-stiker-judul">{laik ? 'LAIK PAKAI' : 'TIDAK LAIK PAKAI'}</p>
          <p className="t-stiker-petunjuk">Tempel stiker <b>{laik ? 'LAIK PAKAI' : 'TIDAK LAIK PAKAI'}</b> pada alat ini.</p>
        </div>
      </div>
      <p className="t-ket mt-3">Skor {hasil.skor.total} dari {tpl.skor.item.reduce((a, b) => a + b.nilai, 0)} (batas laik {tpl.skor.laikBila.banding.replace('>=', '≥')} {tpl.skor.laikBila.batas}).</p>
      {alasan.length > 0 && (
        <section className="t-kartu mt-3" aria-label="Alasan">
          <h3 className="t-judul-kecil">Yang menurunkan nilai</h3>
          <ul className="t-skor-daftar mt-2">{alasan.map((a) => <li key={a}>{a}</li>)}</ul>
        </section>
      )}
    </>
  );
};

/* ---------- Daftar bagian & kemajuan ---------- */

const DaftarBagian: React.FC<{
  bagian: ReturnType<typeof daftarBagian>; aktif: number; kurang: Kurang[]; onPilih: (i: number) => void;
}> = ({ bagian, aktif, kurang, onPilih }) => (
  <nav className="t-bagian" aria-label="Bagian LKK">
    <p className="t-bagian-label" aria-live="polite">Bagian {aktif + 1} dari {bagian.length} · {bagian[aktif]?.nama}</p>
    <ol className="t-bagian-daftar">
      {bagian.map((b, i) => {
        const lengkap = b.tersedia && (b.id === 'kesimpulan' ? kurang.length === 0 : bagianLengkap(kurang, b.id));
        const adaMerah = kurang.some((k) => k.bagian === b.id && k.merah);
        return (
          <li key={b.id}>
            <button
              type="button" className="t-bagian-btn" aria-current={i === aktif ? 'step' : undefined}
              aria-disabled={!b.tersedia || undefined} data-aktif={i === aktif} data-lengkap={lengkap} data-merah={adaMerah || undefined}
              aria-label={`Bagian ${i + 1}, ${b.nama}${lengkap ? ', lengkap' : ''}${adaMerah ? ', ada yang perlu diperbaiki' : ''}${b.tersedia ? '' : ', segera hadir'}`}
              onClick={() => { if (b.tersedia) onPilih(i); }}
            >
              <span className="t-bagian-nomor" aria-hidden="true">
                {adaMerah ? <AlertCircle size={16} /> : lengkap ? <Check size={16} /> : i + 1}
              </span>
              <span className="t-bagian-nama">{b.nama}{b.tersedia ? '' : <span className="t-ket"> · segera</span>}</span>
            </button>
          </li>
        );
      })}
    </ol>
  </nav>
);

/* ---------- Formulir ---------- */

interface FormulirProps { lkk: LkkLokal; tpl: TemplateAlat; kalibrator: KalibratorLokal[]; namaRs: string; teknisi: string }
type Simpan = { k: 'diam' } | { k: 'menyimpan' } | { k: 'tersimpan'; waktu: Date } | { k: 'galat'; pesan: string };

const Formulir: React.FC<FormulirProps> = ({ lkk, tpl, kalibrator, namaRs, teknisi }) => {
  const kunci = !bolehDiubah(lkk);
  const bagian = useMemo(() => daftarBagian(tpl), [tpl]);
  const [aktif, setAktif] = useState(0);
  const [isi, setIsi] = useState<IsiKerja>(() => ({ data: (lkk.data ?? {}) as Peta, tanggal: lkk.tanggalKalibrasi, snapshot: (lkk.calibratorSnapshot ?? null) as Peta | null }));
  const [simpan, setSimpan] = useState<Simpan>({ k: 'diam' });
  const isiRef = useRef(isi);
  const kotor = useRef(false);
  const jam = useRef<number | null>(null);
  const antrean = useRef<Promise<void>>(Promise.resolve());
  const judulRef = useRef<HTMLHeadingElement>(null);

  /* Auto-save: tulis SEMUA isian terbaru; ditumpuk berurutan agar tidak saling menimpa. */
  const simpanSekarang = useCallback((): Promise<void> => {
    if (jam.current !== null) { window.clearTimeout(jam.current); jam.current = null; }
    if (kunci || !kotor.current) return antrean.current;
    kotor.current = false;
    const s = isiRef.current;
    setSimpan({ k: 'menyimpan' });
    antrean.current = antrean.current
      .then(() => simpanIsian(lkk.id, { data: s.data, tanggalKalibrasi: s.tanggal, calibratorSnapshot: s.snapshot, results: buatJejakHitung(tpl, s.data, s.snapshot) as unknown as Record<string, unknown> | null }))
      .then(() => { setSimpan({ k: 'tersimpan', waktu: new Date() }); })
      .catch((e: any) => {
        kotor.current = true;       // dicoba lagi pada pemicu berikutnya
        setSimpan({ k: 'galat', pesan: String(e?.message || 'Isian belum tersimpan di perangkat.') });
      });
    return antrean.current;
  }, [kunci, lkk.id, tpl]);

  const ubah = useCallback((f: (i: IsiKerja) => IsiKerja) => {
    if (kunci) return;
    const baru = f(isiRef.current);
    isiRef.current = baru;
    kotor.current = true;
    setIsi(baru);
    if (jam.current !== null) window.clearTimeout(jam.current);
    jam.current = window.setTimeout(() => { void simpanSekarang(); }, 350);
  }, [kunci, simpanSekarang]);

  // Simpan saat aplikasi disembunyikan / ditutup / layar ditinggalkan
  useEffect(() => {
    const sembunyi = () => { if (document.visibilityState === 'hidden') void simpanSekarang(); };
    const tutup = () => { void simpanSekarang(); };
    document.addEventListener('visibilitychange', sembunyi);
    window.addEventListener('pagehide', tutup);
    return () => {
      document.removeEventListener('visibilitychange', sembunyi);
      window.removeEventListener('pagehide', tutup);
      void simpanSekarang();
    };
  }, [simpanSekarang]);

  const ubahData = useCallback((blok: string, bidang: string, nilai: unknown) => {
    ubah((i) => ({ ...i, data: { ...i.data, [blok]: { ...((i.data[blok] as Peta) ?? {}), [bidang]: nilai } } }));
  }, [ubah]);

  /** Satu bacaan naik/turun di satu titik: data.kinerja[id][titik][arah][urutan]. */
  const ubahBacaan = useCallback((kid: string, titik: number, arah: 'naik' | 'turun', urutan: number, jumlah: number, nilai: number | null) => {
    ubah((i) => {
      const kin = { ...((i.data.kinerja as Peta) ?? {}) };
      const blok = { ...(kin[kid] ?? {}) };
      const baris = { ...(blok[String(titik)] ?? {}) };
      const run: (number | null)[] = Array.from({ length: jumlah }, (_, j) => (typeof baris[arah]?.[j] === 'number' ? baris[arah][j] : null));
      run[urutan] = nilai;
      baris[arah] = run;
      blok[String(titik)] = baris;
      kin[kid] = blok;
      return { ...i, data: { ...i.data, kinerja: kin } };
    });
  }, [ubah]);

  const ubahTanggal = useCallback((v: string) => ubah((i) => ({ ...i, tanggal: v || null })), [ubah]);

  const pilihStandar = useCallback((def: DefStandar, p: PilihanStandar<KalibratorLokal>) => {
    ubah((i) => ({ ...i, snapshot: { ...(i.snapshot ?? {}), [def.peran]: jepretStandar(def, p, buatSnapshot) } }));
  }, [ubah]);

  // Saat dibuka: resolusi bawaan template terisi; fisik & fungsi bawaan Baik; alat standar yang satu-satunya berlaku terpilih otomatis (A1.4, A1.5)
  useEffect(() => {
    if (kunci) return;
    ubah((i) => {
      let hasil = i;
      const iden = (i.data.identitas ?? {}) as Peta;
      if (iden.resolusi === undefined || iden.resolusi === null) {
        hasil = { ...hasil, data: { ...hasil.data, identitas: { ...iden, resolusi: tpl.identitas.resolusi.pilihan[0] } } };
      }
      // Fisik & fungsi: pilihan awal selalu "Baik" (permintaan Ridhwan 22 Okt 2026); hanya yang masih kosong yang diisi
      const bawaan = tpl.pilihanFisik[0];
      const fisikLama = (hasil.data.fisik ?? {}) as Peta;
      const fisikBaru: Peta = { ...fisikLama };
      let ubahFisik = false;
      for (const f of tpl.fisik) {
        const b = (fisikLama[f.id] ?? {}) as Peta;
        const fisikIsi = typeof b.fisik === 'string' && b.fisik ? b.fisik : bawaan;
        const fungsiIsi = typeof b.fungsi === 'string' && b.fungsi ? b.fungsi : bawaan;
        if (fisikIsi !== b.fisik || fungsiIsi !== b.fungsi) { fisikBaru[f.id] = { ...b, fisik: fisikIsi, fungsi: fungsiIsi }; ubahFisik = true; }
      }
      const tambahLama = (hasil.data.fisikTambahan ?? {}) as Peta;
      const tambahBaru: Peta = { ...tambahLama };
      let ubahTambah = false;
      for (const f of tpl.fisikTambahan ?? []) {
        if (typeof tambahLama[f.id] !== 'string' || !tambahLama[f.id]) { tambahBaru[f.id] = bawaan; ubahTambah = true; }
      }
      if (ubahFisik || ubahTambah) {
        hasil = { ...hasil, data: { ...hasil.data, ...(ubahFisik ? { fisik: fisikBaru } : {}), ...(ubahTambah ? { fisikTambahan: tambahBaru } : {}) } };
      }
      for (const d of daftarStandar(tpl)) {
        if (hasil.snapshot?.[d.peran]) continue;
        const layak = susunPilihan(d, kalibrator).filter((p) => p.lengkap && statusBerlaku(p.berlakuSampai, hasil.tanggal) !== 'expired');
        if (layak.length === 1) hasil = { ...hasil, snapshot: { ...(hasil.snapshot ?? {}), [d.peran]: jepretStandar(d, layak[0], buatSnapshot) } };
      }
      return hasil;
    });
  // Hanya sekali saat layar dibuka
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kurang = useMemo(() => periksaIsian(tpl, isi), [tpl, isi]);

  const pindah = useCallback((i: number) => {
    if (i < 0 || i >= bagian.length || !bagian[i].tersedia) return;
    void simpanSekarang();
    setAktif(i);
    try { window.scrollTo({ top: 0 }); } catch { /* lingkungan tanpa scroll */ }
  }, [bagian, simpanSekarang]);
  useEffect(() => { judulRef.current?.focus({ preventScroll: true }); }, [aktif]);

  const terakhirTersedia = !bagian[aktif + 1]?.tersedia;
  const kurangBagian = kurang.filter((k) => k.bagian === bagian[aktif].id);
  const idBagian: BagianId = bagian[aktif].id;
  const sifat: BagianProps = { tpl, isi, kunci, kurang, ubahData, ubahBacaan };
  const balik = lkk.jadwalId ? `/tera/rs/${encodeURIComponent(lkk.jadwalId)}` : '/tera/lkk';

  return (
    <div className="t-lkk-layar">
      <Link to={balik} className="t-kembali"><ChevronLeft size={20} aria-hidden="true" />Kembali ke daftar</Link>
      <header className="t-lkk-kepala">
        <h1 className="t-judul-layar t-rs-judul">{tpl.nama}</h1>
        <p className="t-ket tabular t-rs-judul">{lkk.noLabel || 'Nomor label belum diisi'} · {namaRs}{lkk.alatTambahan ? ' · alat tambahan' : ''}{lkk.isTest ? ' · data uji' : ''}</p>
        <div className="t-lkk-status"><ChipSync state={lkk.syncState} /></div>
        {/* Tinggi baris ini tetap supaya layar tidak bergeser saat status simpan berganti (ketukan tidak meleset) */}
        <p className="t-ket t-simpan" role="status" data-simpan={simpan.k}>
          {simpan.k === 'menyimpan' ? 'Menyimpan…'
            : simpan.k === 'tersimpan' ? `Tersimpan di perangkat pukul ${jamLokal(simpan.waktu)}`
              : simpan.k === 'galat' ? '\u00a0' : kunci ? 'Hanya bisa dibaca' : 'Setiap isian langsung tersimpan di perangkat'}
        </p>
        {simpan.k === 'galat' && (
          <p className="t-peringatan" role="alert">
            <AlertCircle size={20} aria-hidden="true" className="shrink-0" /><span>{simpan.pesan} Isian tetap ada di layar; aplikasi mencoba menyimpan lagi.</span>
          </p>
        )}
      </header>

      {kunci && (
        <p className="t-info mt-3" role="status">
          <Lock size={20} aria-hidden="true" className="shrink-0" />
          <span>LKK ini sudah dikirim dan tidak bisa diubah. Bila ada yang salah, minta Penyelia mengembalikannya.</span>
        </p>
      )}

      <div className="t-lkk-badan">
        <DaftarBagian bagian={bagian} aktif={aktif} kurang={kurang} onPilih={pindah} />
        <section className="t-lkk-isi" aria-labelledby="judul-bagian-lkk" onBlur={() => { void simpanSekarang(); }}>
          <h2 id="judul-bagian-lkk" ref={judulRef} tabIndex={-1} className="t-judul-bagian">{bagian[aktif].nama}</h2>
          <div className="mt-3">
            {idBagian === 'identitas' && (
              <BagianIdentitas {...sifat} namaRs={namaRs} teknisi={teknisi} kalibrator={kalibrator} ubahTanggal={ubahTanggal} pilihStandar={pilihStandar} />
            )}
            {idBagian === 'lingkungan' && <BagianLingkungan {...sifat} keIdentitas={() => pindah(0)} />}
            {idBagian === 'fisik' && <BagianFisik {...sifat} />}
            {idBagian === 'kinerja' && <BagianKinerja {...sifat} />}
            {idBagian === 'kesimpulan' && <BagianKesimpulan {...sifat} keBagian={(id) => pindah(bagian.findIndex((b) => b.id === id))} />}
          </div>
          {terakhirTersedia && (
            <p className="t-ket mt-4" role="status">Ringkasan & Selesai dibuka di pembaruan berikutnya. Semua isian sudah tersimpan di perangkat.</p>
          )}
          {kurangBagian.length > 0 && (
            <div className="t-kurang" role="status" aria-label="Yang masih kurang di bagian ini">
              <p className="t-label">Belum lengkap di bagian ini</p>
              <ul>
                {kurangBagian.map((k) => (
                  <li key={k.teks} data-merah={k.merah || undefined}>
                    {k.merah ? <AlertCircle size={16} aria-hidden="true" className="shrink-0" /> : <span className="t-titik" aria-hidden="true" />}
                    <span>{k.teks}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      <div className="t-aksi-bawah">
        <div className="t-aksi-bawah-tombol">
          <button type="button" className="t-tombol t-tombol-kedua" onClick={() => pindah(aktif - 1)} aria-disabled={aktif === 0 || undefined}>
            <ChevronLeft size={20} aria-hidden="true" />Kembali
          </button>
          <button type="button" className="t-tombol t-tombol-utama" onClick={() => pindah(aktif + 1)} aria-disabled={terakhirTersedia || undefined}>
            Lanjut<ChevronRight size={20} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------- Pintu masuk layar: /tera/lkk/:id ---------- */

type Muat =
  | { k: 'memuat' }
  | { k: 'tidak'; judul: string; pesan: string }
  | { k: 'siap'; lkk: LkkLokal; tpl: TemplateAlat; kalibrator: KalibratorLokal[] };

export const LayarLkk: React.FC = () => {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const { jadwal, siap } = useSinkron();
  const [muat, setMuat] = useState<Muat>({ k: 'memuat' });

  useEffect(() => {
    let hidup = true;
    setMuat({ k: 'memuat' });
    (async () => {
      try {
        const lkk = await ambilLkk(id);
        if (!lkk || (user?.id && lkk.pemilik !== user.id)) {
          if (hidup) setMuat({ k: 'tidak', judul: 'LKK tidak ditemukan', pesan: 'LKK ini tidak ada di perangkat atau bukan milik akun Anda.' });
          return;
        }
        const tpl = lkk.templateKode && lkk.templateVersi ? await templateVersi(lkk.templateKode, lkk.templateVersi) : null;
        if (!tpl) {
          if (hidup) setMuat({ k: 'tidak', judul: 'Template alat belum ada di perangkat', pesan: 'Buka aplikasi dengan internet sebentar agar template ditarik, lalu coba lagi. Isian LKK tetap aman.' });
          return;
        }
        const kalibrator = await daftarKalibrator();
        if (hidup) setMuat({ k: 'siap', lkk, tpl, kalibrator });
      } catch {
        if (hidup) setMuat({ k: 'tidak', judul: 'Data di perangkat belum bisa dibaca', pesan: 'Isian tetap aman. Muat ulang halaman, atau pindah ke menu lain lalu kembali.' });
      }
    })();
    return () => { hidup = false; };
  }, [id, user?.id]);

  if (muat.k === 'memuat' || !siap) {
    return (
      <p className="t-teks-2 mt-4 flex items-center gap-2 text-[15px]" role="status">
        <Loader2 size={20} aria-hidden="true" className="t-putar" />Membuka LKK di perangkat…
      </p>
    );
  }
  if (muat.k === 'tidak') {
    return (
      <>
        <Link to="/tera/lkk" className="t-kembali"><ChevronLeft size={20} aria-hidden="true" />Daftar LKK</Link>
        <div className="mt-4"><KeadaanKosong ikon={AlertCircle} judul={muat.judul} pesan={muat.pesan} /></div>
      </>
    );
  }
  const j = jadwal.find((x) => x.jadwalId === muat.lkk.jadwalId);
  return (
    <Formulir
      key={muat.lkk.id} lkk={muat.lkk} tpl={muat.tpl} kalibrator={muat.kalibrator}
      namaRs={j?.namaRs || (muat.lkk.bo ? `BO ${muat.lkk.bo}` : 'Rumah sakit belum diketahui')}
      teknisi={user?.fullName?.trim() || 'Teknisi'}
    />
  );
};
