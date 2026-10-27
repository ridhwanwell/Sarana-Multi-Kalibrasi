/**
 * Selia — PENYUNTING ISIAN LKK oleh Penyelia (Tahap 4.7f, permintaan Ridhwan 25 Okt 2026).
 *
 * Perumpamaan: Penyelia memegang pulpen koreksi. Semua yang diisi teknisi (identitas, tanggal, lingkungan, fisik,
 * uji lain, bacaan kinerja) bisa dibetulkan langsung tanpa mengembalikan LKK ke teknisi dan tanpa menulis alasan.
 * Server menghitung ulang dengan mesin hitung yang sama, lalu tiap kolom yang berubah dicatat otomatis di riwayat
 * internal (siapa, kapan, nilai lama → baru) — tidak tampil di sertifikat.
 *
 * UI (ui-ux-pro-max): label selalu terlihat di atas kotak, kotak ≥ 16 px (tidak zoom di iPhone), inputMode decimal,
 * koma desimal diterima, pesan salah di bawah kotak, satu tombol utama "Simpan perubahan".
 */
import React, { useMemo, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Save, X } from 'lucide-react';
import { apiFetch } from '../lib/apiClient';
import { bidangIdentitas, opsiFisik } from '../tera/shared/isian';

type Peta = Record<string, any>;
const salin = <T,>(x: T): T => JSON.parse(JSON.stringify(x ?? {}));
const PILIHAN_BAIK = ['Baik', 'Tidak Baik'];

/** Angka dari teks (koma atau titik). '' → null; tidak sah → undefined. */
const keAngka = (s: string): number | null | undefined => {
  const t = s.trim().replace(/\s/g, '').replace(',', '.');
  if (t === '') return null;
  if (!/^-?\d+(\.\d+)?$/.test(t)) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
};
/** Tulis nilai di jalur (membuat objek/array perantara bila perlu). Mengubah `o` langsung. */
function aturDi(o: any, jalur: (string | number)[], nilai: unknown) {
  for (let i = 0; i < jalur.length - 1; i++) {
    const k = jalur[i];
    if (o[k] === undefined || o[k] === null || typeof o[k] !== 'object') o[k] = typeof jalur[i + 1] === 'number' ? [] : {};
    o = o[k];
  }
  o[jalur[jalur.length - 1]] = nilai;
}
const keTeks = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? String(n).replace('.', ',') : '');

const kelasKotak = 'w-full min-h-[44px] px-3 rounded-lg border border-[#7D8DA1] bg-white text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#398AB9] focus:border-[#0B6FB3]';

const Label: React.FC<{ htmlFor: string; children: React.ReactNode }> = ({ htmlFor, children }) => (
  <label htmlFor={htmlFor} className="block text-[12px] font-semibold text-slate-600 mb-1">{children}</label>
);

export const SeliaTeraEditor: React.FC<{
  lkkId: string; data: Peta | null; template: Peta | null; tanggalKalibrasi: string | null;
  onTersimpan: (pesan: string) => void; onBatal: () => void;
}> = ({ lkkId, data, template, tanggalKalibrasi, onTersimpan, onBatal }) => {
  const tpl: Peta = template ?? {};
  const [d, setD] = useState<Peta>(() => salin(data));
  const [tanggal, setTanggal] = useState<string>(tanggalKalibrasi ?? '');
  // Kotak angka disimpan sebagai teks selama diketik (koma boleh); diubah ke angka saat disimpan.
  const [angka, setAngka] = useState<Record<string, string>>({});
  const [salah, setSalah] = useState<Record<string, string>>({});
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const bidang = useMemo(() => bidangIdentitas(tpl as any), [tpl]);

  /** Ubah nilai di jalur (mis. ['identitas','merek']). */
  const atur = (jalur: (string | number)[], nilai: unknown) => setD((lama) => { const baru = salin(lama); aturDi(baru, jalur, nilai); return baru; });
  const jalurKotak = useRef<Record<string, (string | number)[]>>({});
  const ambil = (jalur: (string | number)[]): any => jalur.reduce<any>((o, k) => (o == null ? undefined : o[k]), d);

  /** Kotak angka: teks sementara di `angka[kunci]`, nilai asli di data. */
  // Fungsi gambar biasa (bukan komponen) supaya kotak tidak dibuat ulang tiap ketikan (fokus tidak hilang).
  const kotakAngka = (p: { id: string; label: string; jalur: (string | number)[]; satuan?: string }) => {
    const k = p.jalur.join('.');
    jalurKotak.current[k] = p.jalur;
    const tampil = angka[k] ?? keTeks(ambil(p.jalur));
    return (
      <div key={p.id} className="min-w-0">
        <Label htmlFor={p.id}>{p.label}{p.satuan ? ` (${p.satuan})` : ''}</Label>
        <input id={p.id} inputMode="decimal" autoComplete="off" value={tampil}
          onChange={(e) => setAngka((s) => ({ ...s, [k]: e.target.value }))}
          onBlur={() => {
            const n = keAngka(tampil);
            if (n === undefined) { setSalah((s) => ({ ...s, [k]: 'Bukan angka. Contoh: 27,4' })); return; }
            setSalah((s) => { const c = { ...s }; delete c[k]; return c; });
            atur(p.jalur, n);
          }}
          aria-invalid={!!salah[k]} aria-describedby={salah[k] ? `${p.id}-s` : undefined}
          className={`${kelasKotak} tabular-nums ${salah[k] ? 'border-[#DC2626]' : ''}`} />
        {salah[k] && <p id={`${p.id}-s`} className="mt-1 text-[12px] font-semibold text-[#991B1B]">{salah[k]}</p>}
      </div>
    );
  };

  const pilih = (p: { id: string; label: string; jalur: (string | number)[]; opsi: (string | number)[] }) => {
    const v = ambil(p.jalur);
    return (
      <div key={p.id} className="min-w-0">
        <Label htmlFor={p.id}>{p.label}</Label>
        <select id={p.id} value={v === undefined || v === null ? '' : String(v)}
          onChange={(e) => {
            const o = p.opsi.find((x) => String(x) === e.target.value);
            atur(p.jalur, o === undefined ? null : o);
          }} className={kelasKotak}>
          <option value="">-</option>
          {p.opsi.map((o) => <option key={String(o)} value={String(o)}>{String(o)}</option>)}
        </select>
      </div>
    );
  };

  const simpan = async () => {
    setGalat(null);
    // Pastikan semua kotak angka yang sedang diketik ikut tersimpan.
    const final = salin(d);
    const salahBaru: Record<string, string> = {};
    for (const [k, t] of Object.entries(angka)) {
      const n = keAngka(String(t));
      if (n === undefined) { salahBaru[k] = 'Bukan angka. Contoh: 27,4'; continue; }
      const jalur = jalurKotak.current[k];
      if (jalur) aturDi(final, jalur, n);
    }
    if (Object.keys(salahBaru).length) { setSalah(salahBaru); setGalat('Ada kotak berisi bukan angka. Betulkan dulu (lihat tulisan merah).'); return; }
    setMenyimpan(true);
    try {
      const r = await apiFetch(`/api/tera/selia/lkk/${lkkId}/ubah`, {
        method: 'POST', body: JSON.stringify({ data: final, tanggalKalibrasi: tanggal || null }), retries: 0, timeoutMs: 30000,
      });
      const j = await r.json().catch(() => null);
      if (r.ok && j?.hasil === 'tidak_berubah') { onTersimpan('Tidak ada isian yang berubah.'); return; }
      if (r.ok && j?.hasil === 'diubah') { onTersimpan(`Perubahan tersimpan (${j.jumlah} isian). Hasil dihitung ulang: ${j.kesimpulan ?? '-'}.`); return; }
      setGalat(j?.alasan || j?.error || 'Belum tersimpan. Coba lagi.');
    } catch {
      setGalat('Server tidak merespons. Perubahan belum tersimpan — coba lagi.');
    } finally { setMenyimpan(false); }
  };

  const pompa = tpl.tipe === 'pompa';
  const kinerja: Peta[] = Array.isArray(tpl.kinerja) ? tpl.kinerja : [];
  const pilihFisik = pompa ? opsiFisik(tpl as any) : { fisik: PILIHAN_BAIK, fungsi: PILIHAN_BAIK };

  return (
    <section aria-labelledby="ubah-judul" className="rounded-2xl border-2 border-[#0B6FB3] bg-white p-4 sm:p-5 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 id="ubah-judul" className="text-base font-black text-[#0B6FB3]">Ubah isian LKK</h4>
          <p className="text-xs text-slate-600 mt-0.5">Betulkan isian teknisi langsung di sini. Hasil dihitung ulang otomatis setelah disimpan. Perubahan dicatat di riwayat internal (tidak tercetak di sertifikat).</p>
        </div>
        <button type="button" onClick={onBatal} className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg border border-[#DCDFE3] text-xs font-semibold text-slate-700 cursor-pointer"><X className="w-4 h-4" aria-hidden="true" />Batal</button>
      </div>

      {/* Identitas + tanggal */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-black text-[#1C658C]">Identitas alat & tanggal</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {bidang.map((b) => {
            const id = `ubah-iden-${b.id}`;
            if (b.jenis === 'angka') return kotakAngka({ id, label: b.label, satuan: b.satuan, jalur: ['identitas', b.id] });
            if (b.jenis === 'resolusi') return pilih({ id, label: `${b.label}${b.satuan ? ` (${b.satuan})` : ''}`, jalur: ['identitas', b.id], opsi: tpl.identitas?.resolusi?.pilihan ?? [2, 1] });
            if (b.jenis === 'skala') return pilih({ id, label: b.label, jalur: ['identitas', b.id], opsi: tpl.identitas?.jenisSkala ?? ['Analog', 'Digital'] });
            return (
              <div key={b.id} className="min-w-0">
                <Label htmlFor={id}>{b.label}</Label>
                <input id={id} type={b.jenis === 'tanggal' ? 'date' : 'text'} maxLength={b.maksPanjang ?? 120} value={String(ambil(['identitas', b.id]) ?? '')}
                  onChange={(e) => atur(['identitas', b.id], e.target.value)} className={kelasKotak} />
              </div>
            );
          })}
          <div className="min-w-0">
            <Label htmlFor="ubah-tanggal">Tanggal pelaksanaan kalibrasi</Label>
            <input id="ubah-tanggal" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className={kelasKotak} />
          </div>
        </div>
      </fieldset>

      {/* Lingkungan */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-black text-[#1C658C]">Kondisi lingkungan</legend>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kotakAngka({ id: 'ubah-suhu-awal', label: 'Suhu awal', satuan: '°C', jalur: ['lingkungan', 'suhuAwal'] })}
          {kotakAngka({ id: 'ubah-suhu-akhir', label: 'Suhu akhir', satuan: '°C', jalur: ['lingkungan', 'suhuAkhir'] })}
          {kotakAngka({ id: 'ubah-rh-awal', label: 'Kelembapan awal', satuan: '%RH', jalur: ['lingkungan', 'rhAwal'] })}
          {kotakAngka({ id: 'ubah-rh-akhir', label: 'Kelembapan akhir', satuan: '%RH', jalur: ['lingkungan', 'rhAkhir'] })}
        </div>
      </fieldset>

      {/* Fisik & fungsi */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-black text-[#1C658C]">Pemeriksaan fisik & fungsi</legend>
        <div className="space-y-3">
          {(tpl.fisik || []).map((b: Peta) => (
            <div key={b.id} className="grid grid-cols-1 sm:grid-cols-[1fr_160px_160px] gap-2 sm:items-end">
              <p className="text-sm text-slate-800 sm:pb-3">{b.judul}</p>
              {pilih({ id: `ubah-fisik-${b.id}`, label: 'Fisik', jalur: ['fisik', b.id, 'fisik'], opsi: pilihFisik.fisik })}
              {pilih({ id: `ubah-fungsi-${b.id}`, label: 'Fungsi', jalur: ['fisik', b.id, 'fungsi'], opsi: pilihFisik.fungsi })}
            </div>
          ))}
          {(tpl.fisikTambahan || []).map((b: Peta) => (
            <div key={b.id} className="grid grid-cols-1 sm:grid-cols-[1fr_160px_160px] gap-2 sm:items-end">
              <p className="text-sm text-slate-800 sm:pb-3">{b.judul}</p>
              {pilih({ id: `ubah-tambah-${b.id}`, label: 'Kondisi', jalur: ['fisikTambahan', b.id], opsi: PILIHAN_BAIK })}
            </div>
          ))}
        </div>
      </fieldset>

      {/* Uji lain */}
      {(tpl.ujiAmbang || []).length > 0 && (
        <fieldset className="space-y-3">
          <legend className="text-sm font-black text-[#1C658C]">Uji lain</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(tpl.ujiAmbang as Peta[]).map((u) => kotakAngka({
              id: `ubah-uji-${u.id}`,
              label: u.jenis === 'selisih_setting' ? `${u.judul} — bacaan (setting ${u.setting})` : `${u.judul}`,
              satuan: u.satuan, jalur: [u.id, u.jenis === 'selisih_setting' ? 'bacaan' : 'waktu'],
            }))}
          </div>
        </fieldset>
      )}

      {/* Pompa: keselamatan listrik, aliran, penyumbatan */}
      {pompa && (
        <>
          {Array.isArray(tpl.klasifikasi) && tpl.klasifikasi.length > 0 && (
            <fieldset className="space-y-3">
              <legend className="text-sm font-black text-[#1C658C]">Klasifikasi alat (menentukan batas uji listrik)</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(tpl.klasifikasi as Peta[]).map((k) => pilih({ id: `ubah-klas-${k.id}`, label: k.label, jalur: ['klasifikasi', k.id], opsi: k.pilihan ?? [] }))}
              </div>
            </fieldset>
          )}
          {Array.isArray(tpl.listrik) && tpl.listrik.length > 0 && (
          <fieldset className="space-y-3">
            <legend className="text-sm font-black text-[#1C658C]">Keselamatan listrik — bacaan ESA</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(tpl.listrik as Peta[]).map((u) => kotakAngka({ id: `ubah-listrik-${u.id}`, label: u.judul, satuan: u.satuan, jalur: ['listrik', u.id] }))}
            </div>
          </fieldset>
          )}
          {tpl.termo && (
            <fieldset className="space-y-3">
              <legend className="text-sm font-black text-[#1C658C]">Thermohygrometer — bacaan alat standar</legend>
              {(tpl.termo.parameter as Peta[]).map((p) => (
                <div key={p.id} className="space-y-3">
                  <p className="text-sm font-black text-slate-700">{p.judul} ({p.satuan})</p>
                  {(p.titik as Peta[]).map((tt) => (
                    <div key={tt.id} className="rounded-xl border border-[#DCDFE3] p-3">
                      <p className="text-sm font-bold text-slate-800 tabular-nums mb-2">Titik {tt.setting} {p.satuan}</p>
                      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
                        {Array.from({ length: Number(tpl.termo.pengulangan) || 6 }, (_, i) => kotakAngka({ id: `ubah-termo-${tt.id}-${i}`, label: `Bacaan ${i + 1}`, jalur: ['termo', tt.id, i] }))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </fieldset>
          )}
          {tpl.nibp && (
            <fieldset className="space-y-3">
              <legend className="text-sm font-black text-[#1C658C]">NIBP — bacaan alat ({tpl.nibp.satuan})</legend>
              <div className="space-y-3">
                {(tpl.nibp.titik as Peta[]).map((tt) => (
                  <div key={tt.id} className="rounded-xl border border-[#DCDFE3] p-3">
                    <p className="text-sm font-bold text-slate-800 tabular-nums mb-2">{tt.label} · setting {tt.setting} {tpl.nibp.satuan}</p>
                    <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
                      {Array.from({ length: Number(tpl.nibp.pengulangan) || 6 }, (_, i) => kotakAngka({ id: `ubah-nibp-${tt.id}-${i}`, label: `Bacaan ${i + 1}`, jalur: ['nibp', tt.id, i] }))}
                    </div>
                  </div>
                ))}
              </div>
            </fieldset>
          )}
          {tpl.kinerja && <>
          <fieldset className="space-y-3">
            <legend className="text-sm font-black text-[#1C658C]">Aliran / Flow Rate — bacaan IDA (mL/h)</legend>
            <div className="space-y-3">
              {(tpl.kinerja.titikAliran as number[]).map((s) => (
                <div key={s} className="rounded-xl border border-[#DCDFE3] p-3">
                  <p className="text-sm font-bold text-slate-800 tabular-nums mb-2">Setting {s} mL/h</p>
                  <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
                    {Array.from({ length: Number(tpl.kinerja.pengulangan) || 6 }, (_, i) => kotakAngka({ id: `ubah-aliran-${s}-${i}`, label: `Bacaan ${i + 1}`, jalur: ['aliran', String(s), i] }))}
                  </div>
                </div>
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-3">
            <legend className="text-sm font-black text-[#1C658C]">Penyumbatan / Occlusion — bacaan IDA (psi)</legend>
            <div className="rounded-xl border border-[#DCDFE3] p-3 space-y-3">
              <div className="max-w-xs">{kotakAngka({ id: 'ubah-sumbat-setting', label: 'Setting alat', satuan: 'mL/h', jalur: ['sumbat', 'setting'] })}</div>
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
                {Array.from({ length: Number(tpl.kinerja.pengulangan) || 6 }, (_, i) => kotakAngka({ id: `ubah-sumbat-${i}`, label: `Bacaan ${i + 1}`, jalur: ['sumbat', 'bacaan', i] }))}
              </div>
            </div>
          </fieldset>
          </>}
        </>
      )}

      {/* Kinerja */}
      {!pompa && kinerja.map((k) => {
        const n = Math.max(1, Number(k.pengulangan) || 3);
        return (
          <fieldset key={k.id} className="space-y-3">
            <legend className="text-sm font-black text-[#1C658C]">{k.judul} — bacaan alat ({k.satuan})</legend>
            <div className="space-y-3">
              {(k.titik || []).map((t: number) => (
                <div key={t} className="rounded-xl border border-[#DCDFE3] p-3">
                  <p className="text-sm font-bold text-slate-800 tabular-nums mb-2">Titik {t} {k.satuan}</p>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {(['naik', 'turun'] as const).map((arah) => (
                      <div key={arah} className="grid grid-cols-3 gap-2">
                        {Array.from({ length: n }, (_, i) => kotakAngka({
                          id: `ubah-k-${k.id}-${t}-${arah}-${i}`, label: `${arah === 'naik' ? 'Naik' : 'Turun'} ${i + 1}`,
                          jalur: ['kinerja', k.id, String(t), arah, i],
                        }))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </fieldset>
        );
      })}

      <div className="sticky bottom-0 bg-white pt-3 pb-1 border-t border-[#DCDFE3] flex flex-wrap items-center gap-3" style={{ paddingBottom: 'max(4px, env(safe-area-inset-bottom))' }}>
        <button type="button" onClick={() => { void simpan(); }} disabled={menyimpan}
          className="inline-flex items-center gap-2 min-h-[48px] px-5 rounded-xl bg-[#0B6FB3] hover:bg-[#095C95] text-white text-sm font-bold cursor-pointer active:scale-[0.97] disabled:opacity-60">
          {menyimpan ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />}
          {menyimpan ? 'Menyimpan…' : 'Simpan perubahan'}
        </button>
        <button type="button" onClick={onBatal} disabled={menyimpan} className="min-h-[48px] px-4 rounded-xl border border-[#DCDFE3] text-sm font-semibold text-slate-700 cursor-pointer">Batal</button>
        <div aria-live="polite" className="min-w-0 flex-1">
          {galat && <p role="alert" className="text-sm font-semibold text-[#991B1B]">{galat}</p>}
          {!galat && !menyimpan && <p className="text-xs text-slate-500 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />Belum tersimpan sampai tombol ditekan.</p>}
        </div>
      </div>
    </section>
  );
};
