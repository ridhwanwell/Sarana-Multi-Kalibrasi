/**
 * Selia — bagian LKK POMPA (Infusion Pump, Syringe Pump): listrik, aliran, penyumbatan (Tahap 6.4).
 *
 * Perumpamaan: lembar periksa Penyelia untuk pompa. Isinya sama dengan yang dilihat teknisi, ditambah "jejak hitung"
 * (rata-rata → koreksi → ketidakpastian → U95 → Laik/Tidak Laik) supaya angka bisa dicocokkan dengan Excel.
 * Hanya menampilkan; angka dihitung oleh mesin bersama (`hitungPompa.ts`) di server saat LKK dikirim/diubah.
 */
import React from 'react';

type Peta = Record<string, any>;

const fmt = (v: unknown, d = 2): string => (typeof v === 'number' && Number.isFinite(v) ? v.toLocaleString('id-ID', { maximumFractionDigits: d, minimumFractionDigits: 0 }) : '-');

const Bagian: React.FC<{ id: string; judul: string; children: React.ReactNode }> = ({ id, judul, children }) => (
  <section aria-labelledby={id} className="space-y-3">
    <h4 id={id} className="text-sm font-black text-[#1C658C] border-b border-[#DCDFE3] pb-1.5">{judul}</h4>
    {children}
  </section>
);

/** Chip Laik / Tidak Laik: warna + ikon-teks (bukan warna saja). */
const Vonis: React.FC<{ v: unknown }> = ({ v }) => (
  <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap ${v === 'Tidak Laik' ? 'bg-[#FEE2E2] text-[#991B1B] border-[#DC2626]' : v === 'Laik' ? 'bg-[#DCFCE7] text-[#166534] border-[#86EFAC]' : 'bg-slate-100 text-slate-600 border-slate-300'}`}>
    {v === 'Tidak Laik' ? '! Tidak Laik' : v === 'Laik' ? '✓ Laik' : '-'}
  </span>
);

const KOLOM_BUDGET = ['Rata-rata', 'Koreksi', 'u Tipe A', 'u Sert.', 'u Resol.', 'u Drift', 'uc', 'v eff', 'k', 'U95', 'U95 lap.'];

const BarisBudget: React.FC<{ t: Peta }> = ({ t }) => (
  <>
    <td className="p-2">{fmt(t.rataRata, 3)}</td><td className="p-2">{fmt(t.koreksi, 3)}</td><td className="p-2">{fmt(t.uTipeA, 4)}</td>
    <td className="p-2">{fmt(t.uSertifikat, 4)}</td><td className="p-2">{fmt(t.uResolusi, 4)}</td><td className="p-2">{fmt(t.uDrift, 4)}</td>
    <td className="p-2">{fmt(t.uc, 4)}</td><td className="p-2">{fmt(t.vEff, 1)}</td><td className="p-2">{fmt(t.k, 3)}</td>
    <td className="p-2">{fmt(t.u95, 4)}</td><td className="p-2">{fmt(t.u95Cetak, 2)}</td>
  </>
);

export const SeliaTeraPompa: React.FC<{ tpl: Peta; data: Peta; h: Peta | null }> = ({ tpl, data, h }) => {
  const listrik: Peta[] = Array.isArray(tpl.listrik) ? tpl.listrik : [];
  const titikAliran: number[] = Array.isArray(tpl.kinerja?.titikAliran) ? tpl.kinerja.titikAliran : [];
  const hAliran: Peta[] = Array.isArray(h?.aliran?.titik) ? h!.aliran.titik : [];
  const hs: Peta | null = h?.sumbat ?? null;
  const runSumbat: unknown[] = Array.isArray(data.sumbat?.bacaan) ? data.sumbat.bacaan : [];
  return (
    <>
      <Bagian id="b-listrik" judul="4. Keselamatan listrik">
        <div className="overflow-x-auto rounded-xl border border-[#DCDFE3]">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-[11px] text-slate-600"><tr><th className="p-2 text-left">Uji</th><th className="p-2 text-left">Bacaan ESA</th><th className="p-2 text-left">Terukur (terkoreksi)</th><th className="p-2 text-left">U95</th><th className="p-2 text-left">Batas</th><th className="p-2 text-left">Hasil</th></tr></thead>
            <tbody>
              {listrik.map((u) => {
                const r = h?.listrik?.[u.id];
                return (
                  <tr key={u.id} className="border-t border-[#DCDFE3]">
                    <td className="p-2">{u.judul}</td>
                    <td className="p-2 tabular-nums">{fmt(data.listrik?.[u.id], 4)} {u.satuan}</td>
                    <td className="p-2 tabular-nums">{fmt(r?.terukur, 4)} {u.satuan}</td>
                    <td className="p-2 tabular-nums">{fmt(r?.u95, 4)}</td>
                    <td className="p-2 tabular-nums">{u.toleransiTeks} {u.satuan}</td>
                    <td className="p-2"><Vonis v={r?.hasil} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Bagian>

      <Bagian id="b-aliran" judul="5. Aliran / Flow Rate — jejak hitung">
        <p className="text-xs text-slate-600">
          Batas: ± {fmt((tpl.kinerja?.toleransiAliranPersen ?? 0) * 100, 0)}% dari setting · Titik Laik: {h?.aliran?.jumlahLaik ?? '-'} dari {h?.aliran?.jumlahDinilai ?? '-'}
        </p>
        <div className="overflow-x-auto rounded-xl border border-[#DCDFE3]">
          <table className="w-full text-xs tabular-nums">
            <thead className="bg-slate-100 text-[11px] text-slate-600">
              <tr>{['Setting (mL/h)', 'Bacaan', ...KOLOM_BUDGET, 'Batas ±', 'Hasil'].map((c) => <th key={c} className="p-2 text-left whitespace-nowrap">{c}</th>)}</tr>
            </thead>
            <tbody>
              {titikAliran.map((s, i) => {
                const t = hAliran[i] ?? {};
                const bacaan: unknown[] = Array.isArray(data.aliran?.[String(s)]) ? data.aliran[String(s)] : [];
                return (
                  <tr key={s} className="border-t border-[#DCDFE3]">
                    <td className="p-2 font-semibold">{fmt(s)}</td>
                    <td className="p-2 whitespace-nowrap">{bacaan.map((b) => fmt(b)).join('; ') || '-'}</td>
                    <BarisBudget t={t} />
                    <td className="p-2">{fmt(t.toleransi, 2)}</td>
                    <td className="p-2"><Vonis v={t.hasil} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Bagian>

      <Bagian id="b-sumbat" judul="6. Penyumbatan / Occlusion — jejak hitung">
        <p className="text-xs text-slate-600">Setting alat: {fmt(hs?.setting ?? data.sumbat?.setting)} mL/h · Batas: ≤ {fmt(hs?.batas ?? tpl.kinerja?.sumbat?.batas)} psi (rata-rata + U95)</p>
        <div className="overflow-x-auto rounded-xl border border-[#DCDFE3]">
          <table className="w-full text-xs tabular-nums">
            <thead className="bg-slate-100 text-[11px] text-slate-600">
              <tr>{['Bacaan (psi)', ...KOLOM_BUDGET.filter((c) => c !== 'Koreksi'), 'Hasil'].map((c) => <th key={c} className="p-2 text-left whitespace-nowrap">{c}</th>)}</tr>
            </thead>
            <tbody>
              <tr className="border-t border-[#DCDFE3]">
                <td className="p-2 whitespace-nowrap">{runSumbat.map((b) => fmt(b)).join('; ') || '-'}</td>
                <td className="p-2">{fmt(hs?.rataRata, 3)}</td><td className="p-2">{fmt(hs?.uTipeA, 4)}</td><td className="p-2">{fmt(hs?.uSertifikat, 4)}</td>
                <td className="p-2">{fmt(hs?.uResolusi, 4)}</td><td className="p-2">{fmt(hs?.uDrift, 4)}</td><td className="p-2">{fmt(hs?.uc, 4)}</td>
                <td className="p-2">{fmt(hs?.vEff, 1)}</td><td className="p-2">{fmt(hs?.k, 3)}</td><td className="p-2">{fmt(hs?.u95, 4)}</td><td className="p-2">{fmt(hs?.u95Cetak, 2)}</td>
                <td className="p-2"><Vonis v={hs?.hasil} /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Bagian>
    </>
  );
};
