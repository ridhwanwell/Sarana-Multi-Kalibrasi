/**
 * Tera SMK — layar isi LKK, bagian 1–3 (Tahap 4.3c, PRD-AISTUDIO A1 · CLAUDE.md 5, 9.3, 9.4, 13).
 *
 * Perumpamaan: lembar kerja kalibrasi di tangan teknisi. Setiap isian LANGSUNG ditulis ke buku di perangkat
 * (auto-save ≤ 400 ms + saat kotak ditinggalkan, pindah bagian, aplikasi disembunyikan/ditutup), jadi muat
 * ulang halaman atau HP mati tidak menghilangkan isian. Tiga "fotokopi sertifikat" alat standar dijepret ke
 * LKK saat dipilih (snapshot), sehingga hitungan tidak berubah walau master kalibrator nanti diperbarui.
 *
 * Bagian: Identitas alat (+ pilih alat standar) → Kondisi lingkungan → Fisik & fungsi → Kinerja → Kesimpulan → Ringkasan & Selesai.
 * Ringkasan & Selesai (4.3d-3): segel LKK lalu antre kirim otomatis. Hitungan Laik/Tidak Laik berjalan di belakang layar
 * (shared/jejak.ts → hitung.ts) dan hanya DITAMPILKAN di sini; tidak ada rumus di komponen.
 *
 * Tidak ada rumus di komponen: hitungan lingkungan ada di shared/lingkungan.ts, aturan kelengkapan di shared/isian.ts.
 * UI: ui-ux-pro-max (label di atas kotak, galat di bawah kotak saat pindah kotak, ≥ 48 px, inputmode, safe area,
 * status bukan warna saja, reduced-motion) + break-ui (teks panjang, huruf besar, data kosong/rusak).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, Check, ChevronLeft, ChevronRight, Info, Loader2, Lock, Minus } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useSinkron } from './SinkronKonteks';
import { ChipSync, KeadaanKosong } from './TeraKerangka';
import { ChipVonis, Dropdown, fmt2, Galat, HasilKoreksi, KotakAngka, KotakTeks, Segmen, tglPanjang } from './KotakIsian';
import { MulaiLkk } from './MulaiLkk';
import { ambilLkk, bolehDiubah, simpanIsian, tandaiSelesai, type LkkLokal, type SyncState } from './data/teraDb';
import { buatJejakHitung } from './shared/jejak';
import { buatSnapshot, daftarKalibrator, templateVersi, type KalibratorLokal } from './data/masterLokal';
import type { HasilLkk, TemplateAlat } from './shared/hitung';
import type { TemplatePompa } from './shared/hitungPompa';
import { adalahTemplatePompa } from './shared/lkkPompa';
import { BagianKeselamatanPompa, BagianKinerjaPompa, KesimpulanPompaFinal, barisRingkasPompa } from './BagianPompa';
import {
  bagianLengkap, batasLingkungan, bidangIdentitas, daftarBagian, daftarStandar, jepretStandar, opsiFisik, periksaIsian,
  statusBerlaku, statusSnapshot, susunPilihan, tabelRh, tabelSuhu,
  type BagianId, type DefStandar, type IsiKerja, type Kurang, type PilihanStandar,
} from './shared/isian';
import { formatAngka, hitungLingkungan } from './shared/lingkungan';

type Peta = Record<string, any>;

/* ---------- Pembantu tampilan ---------- */

const jamLokal = (d: Date): string => d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

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

/** Sphygmo/timbangan (naik-turun) atau pompa (aliran + penyumbatan + listrik). */
type TemplateApa = TemplateAlat | TemplatePompa;

/** Nama alat yang tampil: isian "Nama Alat" (template Keselamatan Listrik, dipakai banyak jenis alat) atau nama template. */
const namaAlatLkk = (tpl: TemplateApa, data: Peta | null | undefined): string => {
  const n = (data?.identitas as Peta | undefined)?.namaAlat;
  return typeof n === 'string' && n.trim() ? n.trim() : tpl.nama;
};

interface BagianProps {
  tpl: TemplateApa; isi: IsiKerja; kunci: boolean; kurang: Kurang[];
  ubahData: (blok: string, bidang: string, nilai: unknown) => void;
  ubahBacaan: (kinerjaId: string, titik: number, arah: 'naik' | 'turun', urutan: number, jumlah: number, nilai: number | null) => void;
}

/** Props bagian khusus naik-turun: template sudah pasti TemplateAlat. */
type BagianSph = Omit<BagianProps, 'tpl'> & { tpl: TemplateAlat };

const BagianIdentitas: React.FC<BagianProps & {
  namaRs: string; teknisi: string; kalibrator: KalibratorLokal[];
  ubahTanggal: (v: string) => void; pilihStandar: (def: DefStandar, p: PilihanStandar<KalibratorLokal>) => void;
}> = ({ tpl, isi, kunci, namaRs, teknisi, kalibrator, ubahTanggal, ubahData, pilihStandar }) => {
  const iden = (isi.data.identitas ?? {}) as Peta;
  const standar = useMemo(() => daftarStandar(tpl), [tpl]);
  return (
    <>
      <div className="t-isian-grid">
        <div className="t-isian"><span className="t-label">{bidangIdentitas(tpl).some((b) => b.id === 'namaAlat') ? 'Jenis LKK' : 'Nama alat'}</span><p className="t-baca">{tpl.nama}</p></div>
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
  const opsi = opsiFisik(tpl);
  const tambahan = adalahTemplatePompa(tpl) ? [] : (tpl.fisikTambahan ?? []);
  const simpan = (id: string, sisi: 'fisik' | 'fungsi', v: unknown) => ubahData('fisik', id, { ...(fisik[id] ?? {}), [sisi]: v });
  return (
    <>
      <p className="t-ket">Periksa tiap bagian alat: kondisi fisiknya dan cara kerjanya. Pilihan awal Baik; ubah ke Tidak Baik bila ada yang tidak sesuai.</p>
      <ul className="t-fisik-daftar mt-3">
        {tpl.fisik.map((f) => (
          <li key={f.id} className="t-kartu">
            <h3 className="t-judul-kecil">{f.judul}</h3>
            <div className="t-isian-grid mt-2">
              <Dropdown id={`fisik-${f.id}-fisik`} label="Fisik" opsi={opsi.fisik} nilai={fisik[f.id]?.fisik} kunci={kunci} onPilih={(v) => simpan(f.id, 'fisik', v)} />
              <Dropdown id={`fisik-${f.id}-fungsi`} label="Fungsi" opsi={opsi.fungsi} nilai={fisik[f.id]?.fungsi} kunci={kunci} onPilih={(v) => simpan(f.id, 'fungsi', v)} />
            </div>
          </li>
        ))}
      </ul>
      {tambahan.length > 0 && (
        <>
          <h3 className="t-judul-kecil mt-6">Butir lain yang diperiksa</h3>
          <p className="t-ket">Satu pilihan untuk tiap butir (awalnya Baik).</p>
          <ul className="t-fisik-daftar mt-3">
            {tambahan.map((f) => (
              <li key={f.id} className="t-kartu">
                <h4 className="t-judul-kecil">{f.judul}</h4>
                <div className="mt-2">
                  <Dropdown id={`fisik-lain-${f.id}`} label={f.judul} sembunyikanLabel opsi={opsi.fisik} nilai={((isi.data.fisikTambahan ?? {}) as Peta)[f.id]} kunci={kunci} onPilih={(v) => ubahData('fisikTambahan', f.id, v)} />
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

const BagianKinerja: React.FC<BagianSph> = ({ tpl, isi, kunci, ubahData, ubahBacaan }) => {
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

const BagianKesimpulan: React.FC<BagianProps & { keBagian: (id: BagianId) => void }> = ({ tpl: tplApa, isi, kurang, keBagian }) => {
  const jejak = useMemo(() => buatJejakHitung(tplApa, isi.data, isi.snapshot), [tplApa, isi.data, isi.snapshot]);
  const hasil = (jejak?.hasil ?? null) as HasilLkk | null;
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

  if (adalahTemplatePompa(tplApa)) return <KesimpulanPompaFinal tpl={tplApa} isi={isi} />;
  const tpl: TemplateAlat = tplApa;
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

/* ---------- Bagian 7: Ringkasan & Selesai ---------- */

interface SelesaiProps {
  lkk: LkkLokal; namaRs: string; status: SyncState; terkunci: boolean; proses: boolean; galat: string | null;
  onSelesai: () => void; keBagian: (id: BagianId) => void;
}

const Baris: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="t-ringkas-baris"><dt className="t-ket">{label}</dt><dd>{children}</dd></div>
);

const BagianRingkasan: React.FC<BagianProps & SelesaiProps> = ({ tpl: tplApa, isi, kunci, kurang, lkk, namaRs, status, terkunci, proses, galat, onSelesai, keBagian }) => {
  const [tanya, setTanya] = useState(false);
  const jejak = useMemo(() => buatJejakHitung(tplApa, isi.data, isi.snapshot), [tplApa, isi.data, isi.snapshot]);
  const pompa = adalahTemplatePompa(tplApa) ? tplApa : null;
  // Baris khusus naik-turun hanya dipakai bila bukan pompa; untuk pompa, hasil/tpl ini tidak dibaca.
  const tpl = tplApa as TemplateAlat;
  const hasil = (pompa ? null : (jejak?.hasil ?? null)) as HasilLkk | null;
  // Siap = jejak hitung lengkap & tidak ada yang kurang. (Dulu ikut mensyaratkan hasil naik-turun → pompa/listrik tidak pernah bisa Selesai.)
  const siap = !!jejak?.lengkap && !!jejak?.kesimpulan && kurang.length === 0;
  const laik = jejak?.kesimpulan === 'Laik Pakai';
  const iden = (isi.data.identitas ?? {}) as Peta;
  const ling = (isi.data.lingkungan ?? {}) as Peta;
  const snap = (isi.snapshot ?? {}) as Peta;
  const bagianKurang = [...new Set(kurang.map((k) => k.bagian))];
  const angka = (v: unknown) => (typeof v === 'number' ? formatAngka(v) : '-');
  const sudahSelesai = terkunci || status !== 'draft';

  return (
    <>
      {sudahSelesai && (
        <div className="t-stiker" data-v="laik" role="status">
          <Check size={28} aria-hidden="true" />
          <div>
            <p className="t-stiker-judul">LKK selesai</p>
            <p className="t-ket">Tersimpan di perangkat dan dikirim otomatis begitu ada sinyal. Tidak perlu menekan tombol apa pun.</p>
            <p className="mt-2"><ChipSync state={status} /></p>
          </div>
        </div>
      )}
      {siap && (
        <div className="t-stiker mt-3" data-v={laik ? 'laik' : 'tidak'} role="status">
          {laik ? <Check size={28} aria-hidden="true" /> : <AlertCircle size={28} aria-hidden="true" />}
          <div>
            <p className="t-stiker-judul">{laik ? 'LAIK PAKAI' : 'TIDAK LAIK PAKAI'}</p>
            <p className="t-stiker-petunjuk">Tempel stiker <b>{laik ? 'LAIK PAKAI' : 'TIDAK LAIK PAKAI'}</b> pada alat ini.</p>
          </div>
        </div>
      )}

      <section className="t-kartu mt-3" aria-label="Ringkasan LKK">
        <h3 className="t-judul-kecil">Ringkasan</h3>
        <dl className="t-ringkas mt-2">
          <Baris label="Alat">{namaAlatLkk(tpl, isi.data)}</Baris>
          <Baris label="Nomor stiker"><span className="tabular">{lkk.noLabel || '-'}</span>{lkk.alatTambahan ? ' · alat tambahan' : ''}</Baris>
          <Baris label="Rumah sakit">{namaRs}</Baris>
          <Baris label="Tanggal pelaksanaan">{tglPanjang(isi.tanggal)}</Baris>
          <Baris label="Merek / tipe / no. seri">{[iden.merek, iden.tipe, iden.noSeri].filter((x) => typeof x === 'string' && x.trim()).join(' · ') || '-'}</Baris>
          {!pompa && <Baris label="Alat standar">{(['tekanan', 'stopwatch', 'termohigrometer'] as const).map((k) => snap[k]?.nama).filter(Boolean).join(' · ') || '-'}</Baris>}
          <Baris label="Lingkungan"><span className="tabular">{angka(ling.suhuAwal)}–{angka(ling.suhuAkhir)} °C · {angka(ling.rhAwal)}–{angka(ling.rhAkhir)} %RH</span></Baris>
          {pompa && barisRingkasPompa(pompa, isi).map((b) => <Baris key={b.label} label={b.label}>{b.isi}</Baris>)}
          {hasil && <Baris label="Fisik & fungsi">{hasil.fisik.jumlahBaik} dari {hasil.fisik.jumlahItem} butir Baik</Baris>}
          {hasil && tpl.ujiAmbang.map((u) => (
            <Baris key={u.id} label={u.judul}><span className="tabular">{hasil.ujiAmbang[u.id]?.nilaiUkur != null ? `${formatAngka(hasil.ujiAmbang[u.id].nilaiUkur)} ${u.satuan}` : '-'}</span> <ChipVonis vonis={hasil.ujiAmbang[u.id]?.hasil ?? '-'} /></Baris>
          ))}
          {hasil && tpl.kinerja.map((k) => (
            <Baris key={k.id} label={k.judul}>{hasil.kinerja[k.id]?.jumlahLaik ?? 0} dari {hasil.kinerja[k.id]?.jumlahDinilai ?? 0} titik laik</Baris>
          ))}
          {siap && hasil && <Baris label="Skor">{hasil.skor.total} dari {tpl.skor.item.reduce((a, b) => a + b.nilai, 0)}</Baris>}
        </dl>
      </section>

      {!sudahSelesai && kurang.length > 0 && (
        <div className="t-kurang" role="status" aria-label="Yang masih kurang">
          <p className="t-label">Belum bisa diselesaikan — masih kurang</p>
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

      {galat && (
        <p className="t-peringatan mt-3" role="alert">
          <AlertCircle size={20} aria-hidden="true" className="shrink-0" /><span>{galat}</span>
        </p>
      )}

      {!sudahSelesai && !kunci && (
        tanya && siap ? (
          <section className="t-kartu t-konfirmasi mt-4" role="group" aria-label="Konfirmasi selesai">
            <p className="t-judul-kecil">Selesaikan LKK ini?</p>
            <p className="t-ket mt-1">Hasil: <b>{laik ? 'LAIK PAKAI' : 'TIDAK LAIK PAKAI'}</b>. Setelah selesai, isian dikunci dan tidak bisa diubah (kecuali Penyelia mengembalikannya).</p>
            <div className="t-aksi-bawah-tombol">
              <button type="button" className="t-tombol t-tombol-kedua" onClick={() => setTanya(false)} disabled={proses}>Periksa lagi</button>
              <button type="button" className="t-tombol t-tombol-utama" onClick={() => { void onSelesai(); }} aria-busy={proses || undefined} disabled={proses}>
                {proses ? <><Loader2 size={20} aria-hidden="true" className="t-putar" />Menyimpan…</> : 'Ya, selesai'}
              </button>
            </div>
          </section>
        ) : (
          <button type="button" className="t-tombol t-tombol-utama t-tombol-penuh mt-4" onClick={() => { if (siap) setTanya(true); }} aria-describedby={siap ? undefined : 'selesai-ket'}>
            <Check size={20} aria-hidden="true" />Selesai
          </button>
        )
      )}
      {!sudahSelesai && !kunci && !siap && <p id="selesai-ket" className="t-ket mt-2">Tombol Selesai aktif setelah semua isian lengkap. Yang kurang tertulis di atas.</p>}
    </>
  );
};

/* ---------- Daftar bagian & kemajuan ---------- */

const DaftarBagian: React.FC<{
  bagian: ReturnType<typeof daftarBagian>; aktif: number; kurang: Kurang[]; selesai: boolean; onPilih: (i: number) => void;
}> = ({ bagian, aktif, kurang, selesai, onPilih }) => (
  <nav className="t-bagian" aria-label="Bagian LKK">
    <p className="t-bagian-label" aria-live="polite">Bagian {aktif + 1} dari {bagian.length} · {bagian[aktif]?.nama}</p>
    <ol className="t-bagian-daftar">
      {bagian.map((b, i) => {
        const lengkap = b.tersedia && (b.id === 'ringkasan' ? selesai : b.id === 'kesimpulan' ? kurang.length === 0 : bagianLengkap(kurang, b.id));
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

interface FormulirProps { lkk: LkkLokal; tpl: TemplateApa; kalibrator: KalibratorLokal[]; namaRs: string; teknisi: string; onMuatUlang: () => void }
type Simpan = { k: 'diam' } | { k: 'menyimpan' } | { k: 'tersimpan'; waktu: Date } | { k: 'galat'; pesan: string };

const Formulir: React.FC<FormulirProps> = ({ lkk, tpl, kalibrator, namaRs, teknisi, onMuatUlang }) => {
  const { dorong, daftar, jadwal } = useSinkron();
  const [selesaiLokal, setSelesaiLokal] = useState(false);
  const [status, setStatus] = useState<SyncState>(lkk.syncState);
  const [gantiNomor, setGantiNomor] = useState(false);
  // Keadaan TERBARU dari buku di perangkat (berubah sendiri saat server menolak/menerima), bukan foto saat layar dibuka.
  const live = daftar.find((x) => x.id === lkk.id);
  const ditolak = live?.syncState === 'ditolak';
  const statusNyata: SyncState = selesaiLokal && live?.syncState === 'draft' ? status : (live?.syncState ?? status);
  const jadwalLkk = jadwal.find((x) => x.jadwalId === lkk.jadwalId);
  useEffect(() => { if (ditolak) setSelesaiLokal(false); }, [ditolak]);
  const [prosesSelesai, setProsesSelesai] = useState(false);
  const [galatSelesai, setGalatSelesai] = useState<string | null>(null);
  const kunci = !bolehDiubah(live ?? lkk) || (selesaiLokal && !ditolak);
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

  /** Satu bacaan pompa: data.aliran[kunci][urutan] atau data.sumbat.bacaan[urutan]. */
  const ubahRun = useCallback((blok: 'aliran' | 'sumbat', kunci: string, urutan: number, jumlah: number, nilai: number | null) => {
    ubah((i) => {
      const lama = blok === 'aliran' ? (i.data.aliran as Peta)?.[kunci] : (i.data.sumbat as Peta)?.bacaan;
      const run: (number | null)[] = Array.from({ length: jumlah }, (_, j) => (typeof lama?.[j] === 'number' ? lama[j] : null));
      run[urutan] = nilai;
      if (blok === 'aliran') return { ...i, data: { ...i.data, aliran: { ...((i.data.aliran as Peta) ?? {}), [kunci]: run } } };
      return { ...i, data: { ...i.data, sumbat: { ...((i.data.sumbat as Peta) ?? {}), bacaan: run } } };
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
      const opsi = opsiFisik(tpl);
      const bawaan = opsi.fisik[0];
      const bawaanFungsi = opsi.fungsi[0];
      const fisikLama = (hasil.data.fisik ?? {}) as Peta;
      const fisikBaru: Peta = { ...fisikLama };
      let ubahFisik = false;
      for (const f of tpl.fisik) {
        const b = (fisikLama[f.id] ?? {}) as Peta;
        const fisikIsi = typeof b.fisik === 'string' && b.fisik ? b.fisik : bawaan;
        const fungsiIsi = typeof b.fungsi === 'string' && b.fungsi ? b.fungsi : bawaanFungsi;
        if (fisikIsi !== b.fisik || fungsiIsi !== b.fungsi) { fisikBaru[f.id] = { ...b, fisik: fisikIsi, fungsi: fungsiIsi }; ubahFisik = true; }
      }
      const tambahLama = (hasil.data.fisikTambahan ?? {}) as Peta;
      const tambahBaru: Peta = { ...tambahLama };
      let ubahTambah = false;
      for (const f of adalahTemplatePompa(tpl) ? [] : (tpl.fisikTambahan ?? [])) {
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

  /** SELESAI: tulis isian + jejak hitung terakhir, segel, taruh di antrean kirim (🟡), lalu kunci layar. */
  const selesaikan = useCallback(async () => {
    if (prosesSelesai || kunci) return;
    setProsesSelesai(true);
    setGalatSelesai(null);
    try {
      const s = isiRef.current;
      const jejak = buatJejakHitung(tpl, s.data, s.snapshot);
      if (periksaIsian(tpl, s).length > 0 || !jejak || !jejak.lengkap || !jejak.kesimpulan) {
        throw new Error('Masih ada isian yang kurang. Lengkapi dulu, lalu tekan Selesai lagi.');
      }
      if (jam.current !== null) { window.clearTimeout(jam.current); jam.current = null; }
      await antrean.current;
      await simpanIsian(lkk.id, { data: s.data, tanggalKalibrasi: s.tanggal, calibratorSnapshot: s.snapshot, results: jejak as unknown as Record<string, unknown> });
      kotor.current = false;
      const baru = await tandaiSelesai(lkk.id);
      setStatus(baru.syncState);
      setSelesaiLokal(true);
      try { navigator.vibrate?.(30); } catch { /* tidak semua perangkat */ }
      dorong();
    } catch (e: any) {
      setGalatSelesai(String(e?.message || 'LKK belum bisa diselesaikan. Isian tetap aman di perangkat.'));
    } finally {
      setProsesSelesai(false);
    }
  }, [prosesSelesai, kunci, tpl, lkk.id, dorong]);

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
  const pompa = adalahTemplatePompa(tpl) ? tpl : null;
  const sifatSph: BagianSph = { ...sifat, tpl: tpl as TemplateAlat };
  const balik = lkk.jadwalId ? `/tera/rs/${encodeURIComponent(lkk.jadwalId)}` : '/tera/lkk';

  return (
    <div className="t-lkk-layar">
      <Link to={balik} className="t-kembali"><ChevronLeft size={20} aria-hidden="true" />Kembali ke daftar</Link>
      <header className="t-lkk-kepala">
        <h1 className="t-judul-layar t-rs-judul">{namaAlatLkk(tpl, isi.data)}</h1>
        <p className="t-ket tabular t-rs-judul">{lkk.noLabel || 'Nomor label belum diisi'} · {namaRs}{lkk.alatTambahan ? ' · alat tambahan' : ''}{lkk.isTest ? ' · data uji' : ''}</p>
        <div className="t-lkk-status"><ChipSync state={statusNyata} /></div>
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

      {ditolak && (
        <div className="t-peringatan mt-3" role="alert">
          <AlertCircle size={20} aria-hidden="true" className="shrink-0" />
          <div className="min-w-0">
            <p><strong>Ditolak server:</strong> {live?.alasanDitolak || 'Kiriman ditolak server.'}</p>
            <p className="mt-1">Isinya aman di perangkat. Betulkan yang diminta, lalu tekan Selesai lagi di bagian terakhir. Bila nomor stiker yang bermasalah, ganti nomornya.</p>
            {jadwalLkk
              ? <button type="button" className="t-tombol t-tombol-kedua mt-2" onClick={() => { void simpanSekarang().then(() => setGantiNomor(true)); }}>Ganti nomor stiker</button>
              : <p className="mt-1">Jadwal RS belum ada di perangkat. Buka aplikasi dengan internet sebentar agar jadwal ditarik, lalu coba lagi.</p>}
          </div>
        </div>
      )}
      {gantiNomor && jadwalLkk && (
        <MulaiLkk jadwal={jadwalLkk} alat={null} templates={[tpl]} pemilik={lkk.pemilik} ganti={live ?? lkk}
          onTutup={() => setGantiNomor(false)} onDibuat={() => { /* tidak dipakai pada mode ganti */ }}
          onGanti={() => { setGantiNomor(false); onMuatUlang(); }} />
      )}

      {kunci && (
        <p className="t-info mt-3" role="status">
          <Lock size={20} aria-hidden="true" className="shrink-0" />
          <span>LKK ini sudah dikirim dan tidak bisa diubah. Bila ada yang salah, minta Penyelia mengembalikannya.</span>
        </p>
      )}

      <div className="t-lkk-badan">
        <DaftarBagian bagian={bagian} aktif={aktif} kurang={kurang} selesai={selesaiLokal || lkk.syncState !== 'draft'} onPilih={pindah} />
        <section className="t-lkk-isi" aria-labelledby="judul-bagian-lkk" onBlur={() => { void simpanSekarang(); }}>
          <h2 id="judul-bagian-lkk" ref={judulRef} tabIndex={-1} className="t-judul-bagian">{bagian[aktif].nama}</h2>
          <div className="mt-3">
            {idBagian === 'identitas' && (
              <BagianIdentitas {...sifat} namaRs={namaRs} teknisi={teknisi} kalibrator={kalibrator} ubahTanggal={ubahTanggal} pilihStandar={pilihStandar} />
            )}
            {idBagian === 'lingkungan' && <BagianLingkungan {...sifat} keIdentitas={() => pindah(0)} />}
            {idBagian === 'fisik' && <BagianFisik {...sifat} />}
            {idBagian === 'keselamatan' && pompa && <BagianKeselamatanPompa tpl={pompa} isi={isi} kunci={kunci} ubahData={ubahData} ubahRun={ubahRun} />}
            {idBagian === 'kinerja' && (pompa
              ? <BagianKinerjaPompa tpl={pompa} isi={isi} kunci={kunci} ubahData={ubahData} ubahRun={ubahRun} />
              : <BagianKinerja {...sifatSph} />)}
            {idBagian === 'kesimpulan' && <BagianKesimpulan {...sifat} keBagian={(id) => pindah(bagian.findIndex((b) => b.id === id))} />}
            {idBagian === 'ringkasan' && (
              <BagianRingkasan {...sifat} lkk={lkk} namaRs={namaRs} status={statusNyata} terkunci={selesaiLokal} proses={prosesSelesai} galat={galatSelesai}
                onSelesai={selesaikan} keBagian={(id) => pindah(bagian.findIndex((b) => b.id === id))} />
            )}
          </div>
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
  | { k: 'siap'; lkk: LkkLokal; tpl: TemplateApa; kalibrator: KalibratorLokal[] };

export const LayarLkk: React.FC = () => {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const { jadwal, siap } = useSinkron();
  const [muat, setMuat] = useState<Muat>({ k: 'memuat' });
  const [muatUlang, setMuatUlang] = useState(0);

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
  }, [id, user?.id, muatUlang]);

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
      onMuatUlang={() => setMuatUlang((n) => n + 1)}
    />
  );
};
