/**
 * Tera SMK — bagian layar khusus POMPA (Infusion Pump; Syringe Pump menyusul) — Tahap 6.3b.
 *
 * Perumpamaan: dua lembar tambahan di map teknisi — "Keselamatan listrik" (bacaan ESA) dan "Kinerja"
 * (bacaan IDA: aliran di beberapa setting + penyumbatan). Semua hitungan Laik/Tidak Laik dikerjakan mesin
 * bersama (shared/hitungPompa.ts lewat shared/jejak.ts); komponen ini hanya MENAMPILKAN, tanpa rumus.
 * Bagian Identitas, Lingkungan, dan Fisik & fungsi memakai layar yang sama dengan Sphygmo (LayarLkk.tsx).
 *
 * UI: ui-ux-pro-max (label di atas kotak, ≥ 48 px, inputmode desimal, galat setelah kotak ditinggalkan,
 * status = warna + ikon + tulisan) + break-ui (nama panjang, angka ekstrem, data kosong → "-").
 */
import React, { useMemo } from 'react';
import { AlertCircle, Check } from 'lucide-react';
import { buatJejakHitung } from './shared/jejak';
import type { IsiKerja } from './shared/isian';
import { klasifikasiWajib, ujiBerlaku, type TemplatePompa } from './shared/hitungPompa';
import { formatAngka } from './shared/lingkungan';
import { ChipVonis, fmt2, KotakAngka, PilihanDaftar } from './KotakIsian';

type Peta = Record<string, any>;

export interface SifatPompa {
  tpl: TemplatePompa;
  isi: IsiKerja;
  kunci: boolean;
  ubahData: (blok: string, bidang: string, nilai: unknown) => void;
  /** Satu bacaan di data.aliran[kunci][urutan] atau data.sumbat.bacaan[urutan]. */
  ubahRun: (blok: 'aliran' | 'sumbat' | 'nibp' | 'termo', kunci: string, urutan: number, jumlah: number, nilai: number | null) => void;
}

/** Angka tampil dengan koma Indonesia dan paling banyak `maks` desimal (angka ekstrem tetap terbaca). */
export const tampil = (n: number | null | undefined, maks = 3): string =>
  typeof n === 'number' && Number.isFinite(n) ? formatAngka(Number(n.toFixed(maks))) : '-';

const dalamBatas = (banding: string) => banding.replace('<=', '≤').replace('>=', '≥');

/* ---------- Bagian 4: Keselamatan listrik ---------- */

export const BagianKeselamatanPompa: React.FC<SifatPompa> = ({ tpl, isi, kunci, ubahData }) => {
  const hasil = useMemo(() => buatJejakHitung(tpl, isi.data, isi.snapshot)?.hasil ?? null, [tpl, isi.data, isi.snapshot]);
  const nilai = (isi.data.listrik ?? {}) as Peta;
  const kl = (isi.data.klasifikasi ?? {}) as Peta;
  const wajib = new Set(klasifikasiWajib(tpl, isi.data).map((k) => k.id));
  const namaKl = (id: string) => tpl.klasifikasi?.find((k) => k.id === id)?.label.toLowerCase() ?? id;
  return (
    <>
      {tpl.klasifikasi && (
        <section className="t-kartu mb-4" aria-label="Klasifikasi alat">
          <h3 className="t-judul-kecil">Klasifikasi alat</h3>
          <p className="t-ket">Lihat label alat / buku manual. Klasifikasi menentukan uji yang berlaku dan batasnya (SNI IEC 62353).</p>
          <div className="t-isian-grid mt-2">
            {tpl.klasifikasi.filter((k) => wajib.has(k.id)).map((k) => (
              <PilihanDaftar key={k.id} id={`klas-${k.id}`} label={k.label} opsi={k.pilihan} nilai={kl[k.id]} kunci={kunci} onPilih={(v) => ubahData('klasifikasi', k.id, v)} />
            ))}
          </div>
        </section>
      )}
      <p className="t-ket">
        Ukur dengan Electrical Safety Analyzer (ESA), lalu isi angka yang tampil di ESA. Nilai terkoreksi dan ketidakpastian (U95) dihitung otomatis
        dari sertifikat ESA yang dipilih di bagian Identitas.
      </p>
      <ul className="t-fisik-daftar mt-3">
        {tpl.listrik.map((u) => {
          const h = hasil?.listrik[u.id];
          const berlaku = ujiBerlaku(u, isi.data);
          if (berlaku === false) {
            return (
              <li key={u.id} className="t-kartu" aria-label={u.judul}>
                <h3 className="t-judul-kecil">{u.judul}</h3>
                <p className="t-ket">Tidak berlaku untuk {namaKl(u.berlakuBila!.klasifikasi)} "{String(kl[u.berlakuBila!.klasifikasi])}" — tidak perlu diukur.</p>
              </li>
            );
          }
          const tol = h?.toleransiTeks ?? u.toleransiTeks;
          return (
            <li key={u.id} className="t-kartu" aria-label={u.judul}>
              <h3 className="t-judul-kecil">{u.judul}</h3>
              <p className="t-ket">Batas: <span className="tabular">{tol === '-' ? 'pilih klasifikasi dulu' : tol}</span> {tol === '-' ? '' : u.satuan}{u.masukKesimpulan === false ? ' · tidak ikut kesimpulan' : ''}</p>
              <div className="t-isian-grid mt-2">
                <KotakAngka
                  id={`listrik-${u.id}`} label="Bacaan ESA" satuan={u.satuan} kunci={kunci}
                  nilai={typeof nilai[u.id] === 'number' ? (nilai[u.id] as number) : null}
                  onNilai={(n) => ubahData('listrik', u.id, n)}
                />
                <div className="t-isian">
                  <span className="t-label">Terukur (terkoreksi)</span>
                  <p className="t-hasil-baris tabular" role="status" aria-label={`Hasil ${u.judul}`}>
                    <span>{h && h.terukur !== null ? `${tampil(h.terukur)} ${u.satuan}` : '-'}</span>
                    <span>U95 {h && h.u95 !== null ? tampil(h.u95, 4) : '-'}</span>
                    <ChipVonis vonis={h?.hasil ?? '-'} {...(u.teksHasil ? { teksLaik: u.teksHasil[0].toUpperCase(), teksTidak: u.teksHasil[1].toUpperCase() } : {})} />
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
};

/* ---------- Bagian 5: Kinerja ---------- */

/* ---------- Bagian 5 (NIBP): 4 setting × Systole / MAP / Diastole ---------- */

const BagianKinerjaNibp: React.FC<SifatPompa> = ({ tpl, isi, kunci, ubahRun }) => {
  const hasil = useMemo(() => buatJejakHitung(tpl, isi.data, isi.snapshot)?.hasil ?? null, [tpl, isi.data, isi.snapshot]);
  const nb = tpl.nibp!;
  const data = (isi.data.nibp ?? {}) as Peta;
  // Kelompok per setting (3 titik: Systole, MAP, Diastole)
  const kelompok: { no: number; titik: typeof nb.titik }[] = [];
  nb.titik.forEach((t, i) => { const g = Math.floor(i / 3); (kelompok[g] ??= { no: g + 1, titik: [] }).titik.push(t); });
  return (
    <>
      <p className="t-ket">
        Atur NIBP Simulator di tiap setting, lalu isi bacaan alat (Systole, MAP, Diastole) {nb.minimalUlangan}–{nb.pengulangan} kali. Rata-rata, koreksi, dan
        ketidakpastian (U95) dihitung otomatis dengan koreksi sertifikat NIBP Simulator. Batas: |koreksi| + U95 ≤ {nb.toleransi} {nb.satuan}.
      </p>
      <ul className="t-fisik-daftar mt-3">
        {kelompok.map((g) => (
          <li key={g.no} className="t-kartu" aria-label={`Setting ${g.no}: ${g.titik.map((t) => t.setting).join('/')} ${nb.satuan}`}>
            <h3 className="t-judul-kecil">Setting {g.no} · <span className="tabular">{g.titik.map((t) => formatAngka(t.setting)).join(' / ')}</span> {nb.satuan}</h3>
            {g.titik.map((t) => {
              const idx = nb.titik.indexOf(t);
              const h = hasil?.nibp?.titik[idx];
              const run = (Array.isArray(data[t.id]) ? data[t.id] : []) as (number | null)[];
              return (
                <div key={t.id} className="mt-3">
                  <h4 className="t-label">{t.label} · <span className="tabular">{formatAngka(t.setting)}</span> {nb.satuan}</h4>
                  <div className="t-baca-grid mt-1">
                    {Array.from({ length: nb.pengulangan }, (_, i) => (
                      <KotakAngka
                        key={i} id={`nibp-${t.id}-${i}`} label={`${t.label} ${i + 1}${i >= nb.minimalUlangan ? ' (boleh kosong)' : ''}`} nilai={typeof run[i] === 'number' ? run[i] : null}
                        kunci={kunci} onNilai={(n) => ubahRun('nibp', t.id, i, nb.pengulangan, n)}
                      />
                    ))}
                  </div>
                  <p className="t-hasil-baris tabular" role="status" aria-label={`Hasil ${t.label} ${t.setting}`}>
                    <span>Rata-rata {tampil(h?.rataRata, 2)}</span>
                    <span>Koreksi {tampil(h?.koreksi, 2)}</span>
                    <span>U95 {fmt2(h?.u95Cetak)}</span>
                    {h?.catatan && <span>{h.catatan}</span>}
                    <ChipVonis vonis={h?.hasil ?? '-'} />
                  </p>
                </div>
              );
            })}
          </li>
        ))}
      </ul>
      <p className="t-ket mt-3">Titik laik: <span className="tabular">{hasil?.nibp?.jumlahLaik ?? 0} dari {nb.titik.length}</span> (perlu minimal {Math.round(nb.minimalPersenTitik * 100)}%).</p>
    </>
  );
};

/* ---------- Bagian 5 (Thermohygrometer): suhu & kelembaban, 7 titik tiap parameter ---------- */

const BagianKinerjaTermo: React.FC<SifatPompa> = ({ tpl, isi, kunci, ubahRun }) => {
  const hasil = useMemo(() => buatJejakHitung(tpl, isi.data, isi.snapshot)?.hasil ?? null, [tpl, isi.data, isi.snapshot]);
  const tm = tpl.termo!;
  const data = (isi.data.termo ?? {}) as Peta;
  return (
    <>
      <p className="t-ket">
        Atur Climatic Chamber di tiap titik, lalu isi {tm.pengulangan} bacaan ALAT STANDAR. Rata-rata terkoreksi, koreksi, dan ketidakpastian (U95) dihitung otomatis
        dengan koreksi alat standar. Titik laik bila |koreksi| ≤ batas (suhu ±{formatAngka(tm.parameter[0]?.toleransi)} {tm.parameter[0]?.satuan}, kelembaban ±{formatAngka(tm.parameter[1]?.toleransi)} {tm.parameter[1]?.satuan}).
      </p>
      {tm.parameter.map((p) => (
        <section key={p.id} aria-label={p.judul} className="mt-4">
          <h3 className="t-judul-kecil">{p.judul} ({p.satuan})</h3>
          <ul className="t-fisik-daftar mt-2">
            {p.titik.map((t, idx) => {
              const h = hasil?.termo?.[p.id]?.titik[idx];
              const run = (Array.isArray(data[t.id]) ? data[t.id] : []) as (number | null)[];
              return (
                <li key={t.id} className="t-kartu" aria-label={`${p.judul} ${t.setting} ${p.satuan}`}>
                  <h4 className="t-label">Titik <span className="tabular">{formatAngka(t.setting)}</span> {p.satuan}</h4>
                  <div className="t-baca-grid mt-1">
                    {Array.from({ length: tm.pengulangan }, (_, i) => (
                      <KotakAngka
                        key={i} id={`termo-${t.id}-${i}`} label={`${p.judul} ${t.setting} bacaan ${i + 1}`} nilai={typeof run[i] === 'number' ? run[i] : null}
                        kunci={kunci} onNilai={(n) => ubahRun('termo', t.id, i, tm.pengulangan, n)}
                      />
                    ))}
                  </div>
                  <p className="t-hasil-baris tabular" role="status" aria-label={`Hasil ${p.judul} ${t.setting}`}>
                    <span>Rata-rata {tampil(h?.rataRata, 2)}</span>
                    <span>Koreksi {tampil(h?.koreksi, 2)}</span>
                    <span>U95 {fmt2(h?.u95Cetak)}</span>
                    <ChipVonis vonis={h?.hasil ?? '-'} />
                  </p>
                </li>
              );
            })}
          </ul>
          <p className="t-ket mt-2">Titik laik {p.judul.split(' ')[0].toLowerCase()}: <span className="tabular">{hasil?.termo?.[p.id]?.jumlahLaik ?? 0} dari {p.titik.length}</span> (perlu minimal {Math.round(tm.minimalPersenTitik * 100)}%).</p>
        </section>
      ))}
    </>
  );
};

export const BagianKinerjaPompa: React.FC<SifatPompa> = (props) => {
  const { tpl, isi, kunci, ubahData, ubahRun } = props;
  const hasil = useMemo(() => buatJejakHitung(tpl, isi.data, isi.snapshot)?.hasil ?? null, [tpl, isi.data, isi.snapshot]);
  const kn = tpl.kinerja;
  if (tpl.termo) return <BagianKinerjaTermo {...props} />;
  if (tpl.nibp) return <BagianKinerjaNibp {...props} />;
  if (!kn) return null;
  const aliran = (isi.data.aliran ?? {}) as Peta;
  const sumbat = (isi.data.sumbat ?? {}) as Peta;
  const runSumbat = (Array.isArray(sumbat.bacaan) ? sumbat.bacaan : []) as (number | null)[];
  const toleransiPersen = Math.round(kn.toleransiAliranPersen * 100);
  const hs = hasil?.sumbat;
  return (
    <>
      <h3 className="t-judul-kecil">Aliran / Flow Rate</h3>
      <p className="t-ket">
        Atur pompa di tiap setting, lalu isi {kn.pengulangan} bacaan Infusion Device Analyzer (IDA). Rata-rata, koreksi, dan ketidakpastian (U95)
        dihitung otomatis dengan koreksi sertifikat IDA. Batas: ± {toleransiPersen}% dari setting.
      </p>
      <ul className="t-fisik-daftar mt-3">
        {kn.titikAliran.map((s, idx) => {
          const run = (Array.isArray(aliran[String(s)]) ? aliran[String(s)] : []) as (number | null)[];
          const h = hasil?.aliran.titik[idx];
          return (
            <li key={s} className="t-kartu" aria-label={`Setting ${s} mL/h`}>
              <h4 className="t-judul-kecil">Setting {formatAngka(s)} mL/h</h4>
              <div className="t-baca-grid mt-2">
                {Array.from({ length: kn.pengulangan }, (_, i) => (
                  <KotakAngka
                    key={i} id={`aliran-${s}-${i}`} label={`Bacaan ${i + 1}`} nilai={typeof run[i] === 'number' ? run[i] : null}
                    kunci={kunci} onNilai={(n) => ubahRun('aliran', String(s), i, kn.pengulangan, n)}
                  />
                ))}
              </div>
              <p className="t-hasil-baris tabular" role="status" aria-label={`Hasil setting ${s} mL/h`}>
                <span>Rata-rata {tampil(h?.rataRata, 2)}</span>
                <span>Koreksi {tampil(h?.koreksi, 2)}</span>
                <span>U95 {fmt2(h?.u95Cetak)}</span>
                <span>Batas ± {tampil(h?.toleransi ?? Math.abs(s * kn.toleransiAliranPersen), 2)}</span>
                <ChipVonis vonis={h?.hasil ?? '-'} />
              </p>
            </li>
          );
        })}
      </ul>

      <h3 className="t-judul-kecil mt-6">Penyumbatan / Occlusion</h3>
      <p className="t-ket">
        Tutup selang pompa, lalu isi {kn.pengulangan} bacaan tekanan tertinggi dari IDA. Batas: {dalamBatas(kn.sumbat.banding)} {kn.sumbat.batas} psi
        (nilai ditambah U95).
      </p>
      <section className="t-kartu mt-3" aria-label="Penyumbatan">
        <div className="t-isian-grid">
          <KotakAngka
            id="sumbat-setting" label="Setting alat" satuan="mL/h" kunci={kunci}
            nilai={typeof sumbat.setting === 'number' ? sumbat.setting : kn.sumbat.settingBawaan}
            onNilai={(n) => ubahData('sumbat', 'setting', n)}
          />
        </div>
        <div className="t-baca-grid mt-2">
          {Array.from({ length: kn.pengulangan }, (_, i) => (
            <KotakAngka
              key={i} id={`sumbat-${i}`} label={`Bacaan ${i + 1}`} satuan="psi" nilai={typeof runSumbat[i] === 'number' ? runSumbat[i] : null}
              kunci={kunci} onNilai={(n) => ubahRun('sumbat', '', i, kn.pengulangan, n)}
            />
          ))}
        </div>
        <p className="t-hasil-baris tabular" role="status" aria-label="Hasil penyumbatan">
          <span>Rata-rata {tampil(hs?.rataRata, 2)} psi</span>
          <span>U95 {fmt2(hs?.u95Cetak)}</span>
          <span>Batas {dalamBatas(kn.sumbat.banding)} {kn.sumbat.batas} psi</span>
          <ChipVonis vonis={hs?.hasil ?? '-'} />
        </p>
      </section>
    </>
  );
};

/* ---------- Bagian 6: Kesimpulan (bagian "sudah final") ---------- */

export const KesimpulanPompaFinal: React.FC<{ tpl: TemplatePompa; isi: IsiKerja }> = ({ tpl, isi }) => {
  const jejak = useMemo(() => buatJejakHitung(tpl, isi.data, isi.snapshot), [tpl, isi.data, isi.snapshot]);
  const hasil = jejak?.hasil;
  if (!hasil) return null;
  const laik = hasil.kesimpulan === 'Laik Pakai';
  const alasan: string[] = [];
  const sk = tpl.skor;
  if (!sk || (!tpl.kinerja && !tpl.nibp && !tpl.termo)) {
    // Keselamatan Listrik saja: Laik Pakai bila semua uji yang berlaku Laik (tanpa skor); v2: fisik & fungsi ikut menentukan
    if (tpl.fisikWajib && hasil.fisik.lolos === false) {
      alasan.push(`Fisik & fungsi: ${hasil.fisik.jumlahBaik} dari ${hasil.fisik.jumlahItem} kotak baik/berfungsi (perlu minimal ${Math.round(tpl.fisikWajib.minimalPersen * 100)}%).`);
    }
    for (const u of tpl.listrik) {
      const h = hasil.listrik[u.id];
      if (u.masukKesimpulan !== false && h && h.berlaku !== false && h.hasil !== 'Laik') alasan.push(`${u.judul}: ${tampil(h.terukur)} ${u.satuan} ± ${tampil(h.u95, 4)}, batas ${h.toleransiTeks ?? u.toleransiTeks} ${u.satuan}.`);
    }
    return <StikerKesimpulan laik={laik} alasan={alasan} judulAlasan="Yang tidak memenuhi syarat" />;
  }
  const rinci = (dari: string) => hasil.skor.rincian.find((r) => r.dari === dari);
  const rFisik = rinci('fisik'), rKinerja = rinci('kinerja');
  // NIBP v2: listrik tidak dinilai (tidak ada di rincian) → tidak pernah jadi alasan
  const rListrik = rinci('listrik') ?? { dari: 'listrik', nilai: sk.listrik.nilai };
  if ((rFisik?.nilai ?? 0) === 0) alasan.push(`Fisik & fungsi: ${hasil.fisik.jumlahBaik} dari ${hasil.fisik.jumlahItem} kotak baik/berfungsi (perlu minimal ${Math.round(sk.fisik.minimalPersen * 100)}%).`);
  if ((rListrik?.nilai ?? 0) === 0) {
    for (const u of tpl.listrik) {
      const h = hasil.listrik[u.id];
      if (h && h.hasil !== 'Laik') alasan.push(`${u.judul}: ${tampil(h.terukur)} ${u.satuan} ± ${tampil(h.u95, 4)}, batas ${u.toleransiTeks} ${u.satuan}.`);
    }
  }
  if ((rKinerja?.nilai ?? 0) === 0 && tpl.termo && hasil.termo) {
    for (const p of tpl.termo.parameter) {
      const h = hasil.termo[p.id];
      if (h && !(h.jumlahDinilai > 0 && h.jumlahLaik / h.jumlahDinilai >= tpl.termo.minimalPersenTitik)) {
        alasan.push(`${p.judul.split(' ')[0]}: ${h.jumlahLaik} dari ${p.titik.length} titik laik (perlu minimal ${Math.round(tpl.termo.minimalPersenTitik * 100)}%).`);
      }
    }
  }
  if ((rKinerja?.nilai ?? 0) === 0 && tpl.nibp && hasil.nibp) {
    alasan.push(`NIBP: ${hasil.nibp.jumlahLaik} dari ${hasil.nibp.jumlahDinilai} titik laik (perlu minimal ${Math.round(tpl.nibp.minimalPersenTitik * 100)}%).`);
  }
  if ((rKinerja?.nilai ?? 0) === 0 && tpl.kinerja) {
    if (hasil.aliran.jumlahLaik / Math.max(1, hasil.aliran.jumlahDinilai) < tpl.kinerja.minimalPersenAliran) {
      alasan.push(`Aliran: ${hasil.aliran.jumlahLaik} dari ${hasil.aliran.jumlahDinilai} titik laik (perlu minimal ${Math.round(tpl.kinerja.minimalPersenAliran * 100)}%).`);
    }
    if (hasil.sumbat.hasil !== 'Laik') {
      alasan.push(`Penyumbatan: ${tampil(hasil.sumbat.rataRata, 2)} psi ± ${fmt2(hasil.sumbat.u95Cetak)}, batas ${dalamBatas(tpl.kinerja.sumbat.banding)} ${tpl.kinerja.sumbat.batas} psi.`);
    }
  }
  const total = hasil.skor.maks ?? sk.fisik.nilai + sk.listrik.nilai + sk.kinerja.nilai;
  return (
    <StikerKesimpulan laik={laik} alasan={alasan} judulAlasan="Yang menurunkan nilai"
      ket={hasil.skor.maks ? `Skor ${hasil.skor.total} dari ${total} (kelistrikan tidak dinilai; laik bila fisik & fungsi dan kinerja sama-sama memenuhi).` : `Skor ${hasil.skor.total} dari ${total} (batas laik ${sk.laikBila.banding.replace('>=', '≥')} ${sk.laikBila.batas}).`} />
  );
};

const StikerKesimpulan: React.FC<{ laik: boolean; alasan: string[]; judulAlasan: string; ket?: string }> = ({ laik, alasan, judulAlasan, ket }) => (
  <>
    <div className="t-stiker" data-v={laik ? 'laik' : 'tidak'} role="status">
      {laik ? <Check size={32} aria-hidden="true" /> : <AlertCircle size={32} aria-hidden="true" />}
      <div>
        <p className="t-stiker-judul">{laik ? 'LAIK PAKAI' : 'TIDAK LAIK PAKAI'}</p>
        <p className="t-stiker-petunjuk">Tempel stiker <b>{laik ? 'LAIK PAKAI' : 'TIDAK LAIK PAKAI'}</b> pada alat ini.</p>
      </div>
    </div>
    {ket && <p className="t-ket mt-3">{ket}</p>}
    {alasan.length > 0 && (
      <section className="t-kartu mt-3" aria-label="Alasan">
        <h3 className="t-judul-kecil">{judulAlasan}</h3>
        <ul className="t-skor-daftar mt-2">{alasan.map((a) => <li key={a}>{a}</li>)}</ul>
      </section>
    )}
  </>
);

/* ---------- Bagian 7: baris ringkasan ---------- */

export interface BarisRingkas { label: string; isi: React.ReactNode }

/** Baris khusus pompa untuk kartu Ringkasan (baris umum — alat, nomor stiker, RS — ditulis oleh LayarLkk). */
export function barisRingkasPompa(tpl: TemplatePompa, isi: IsiKerja): BarisRingkas[] {
  const jejak = buatJejakHitung(tpl, isi.data, isi.snapshot);
  const hasil = jejak?.hasil;
  if (!hasil) return [];
  const snap = (isi.snapshot ?? {}) as Peta;
  const kl = (isi.data.klasifikasi ?? {}) as Peta;
  return [
    { label: 'Alat standar', isi: (['ida', 'esa', 'nibp', 'chamber', 'termohigrometer'] as const).map((k) => snap[k]?.nama).filter(Boolean).join(' · ') || '-' },
    ...(tpl.klasifikasi ? [{ label: 'Klasifikasi', isi: tpl.klasifikasi.map((k) => kl[k.id]).filter(Boolean).join(' · ') || '-' }] : []),
    { label: 'Fisik & fungsi', isi: `${hasil.fisik.jumlahBaik} dari ${hasil.fisik.jumlahItem} kotak baik/berfungsi` },
    ...tpl.listrik.map((u) => ({
      label: u.judul,
      isi: hasil.listrik[u.id]?.berlaku === false ? 'Tidak berlaku' : (
        <>
          <span className="tabular">{hasil.listrik[u.id]?.terukur != null ? `${tampil(hasil.listrik[u.id].terukur)} ${u.satuan}` : '-'}</span>{' '}
          <ChipVonis vonis={hasil.listrik[u.id]?.hasil ?? '-'} {...(u.teksHasil ? { teksLaik: u.teksHasil[0].toUpperCase(), teksTidak: u.teksHasil[1].toUpperCase() } : {})} />
        </>
      ),
    })),
    ...(tpl.termo && hasil.termo ? tpl.termo.parameter.map((p) => ({ label: p.judul.split(' ')[0], isi: `${hasil.termo![p.id]?.jumlahLaik ?? 0} dari ${p.titik.length} titik laik` })) : []),
    ...(tpl.nibp && hasil.nibp ? [{ label: 'NIBP', isi: `${hasil.nibp.jumlahLaik} dari ${hasil.nibp.jumlahDinilai} titik laik` }] : []),
    ...(tpl.kinerja ? [
      { label: 'Aliran', isi: `${hasil.aliran.jumlahLaik} dari ${hasil.aliran.jumlahDinilai} titik laik` },
      { label: 'Penyumbatan', isi: (<><span className="tabular">{hasil.sumbat.rataRata != null ? `${tampil(hasil.sumbat.rataRata, 2)} psi` : '-'}</span>{' '}<ChipVonis vonis={hasil.sumbat.hasil} /></>) },
    ] : []),
    ...(jejak.lengkap && tpl.skor ? [{ label: 'Skor', isi: `${hasil.skor.total} dari ${hasil.skor.maks ?? tpl.skor.fisik.nilai + tpl.skor.listrik.nilai + tpl.skor.kinerja.nilai}` }] : []),
  ];
}
