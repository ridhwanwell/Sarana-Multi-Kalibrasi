/**
 * Tera SMK — bantuan mengisi BACAAN KINERJA lebih cepat (permintaan Ridhwan 27 Okt 2026).
 *
 * Hanya untuk kotak bacaan kinerja (bukan identitas/fisik/kalibrator) dan hanya mengisi kotak yang SAMA-SAMA ada di layar.
 * Rumus tidak disentuh: nilai tetap masuk lewat jalur yang sama dengan ketikan biasa (onChange kotak).
 *
 *  1. Enter / tombol "Berikutnya" → pindah ke kotak bacaan berikutnya, keyboard tetap terbuka.
 *  2. Tombol "= Sama" → isi kotak ini dengan angka kotak sebelumnya (satu kelompok), lalu pindah ke kotak berikutnya.
 *  3. Tempel banyak angka sekaligus ("24,9 25,0 24,9 …", satu baris atau tabel dari Excel) → dipecah ke kotak-kotak berurutan.
 * Kotak hasil "=" / tempel diberi tanda kecil, tercatat di data.salinan, dan dilihat Selia. Mengetik manual menghapus tanda.
 * Bacaan TIDAK bisa disalin dari LKK lain (tidak ada tombolnya).
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export type JenisSalin = 'sama' | 'tempel';

export interface SalinKonteks {
  /** Jenis salinan sebuah kotak (kunci = id kotak di layar), atau undefined bila diketik manual. */
  tanda: (id: string) => JenisSalin | undefined;
  setTanda: (id: string, jenis: JenisSalin | null) => void;
}

export const SalinContext = createContext<SalinKonteks>({ tanda: () => undefined, setTanda: () => {} });
export const useSalin = () => useContext(SalinContext);

/** Selama true, onChange kotak tahu bahwa isinya diisi program (bukan ketikan teknisi) → tanda tidak dihapus. */
let sedangMenyalin = false;
export const apaSedangMenyalin = () => sedangMenyalin;

const PEMISAH = /[\s;]+/;
const ANGKA = /^-?\d+([.,]\d+)?$/;

/** Teks tempelan → daftar angka (teks berkoma). null = ada isi yang bukan angka. */
export function uraiTempelan(teks: string): { angka: string[] } | { galat: string } {
  const bagian = String(teks ?? '').split(PEMISAH).filter((x) => x !== '');
  for (const b of bagian) if (!ANGKA.test(b)) return { galat: `"${b.length > 12 ? b.slice(0, 12) + '…' : b}" bukan angka.` };
  return { angka: bagian.map((b) => b.replace('.', ',')) };
}

/** Kotak bacaan yang bisa diisi, urut sesuai tampilan layar. */
export const semuaKotakBacaan = (akar: ParentNode = document): HTMLInputElement[] =>
  Array.from(akar.querySelectorAll<HTMLInputElement>('input[data-baca="1"]')).filter((e) => !e.readOnly && !e.disabled);

/** Isi sebuah kotak lewat jalur ketikan biasa (React onChange), jadi tersimpan persis seperti diketik. */
const isiKotak = (el: HTMLInputElement, teks: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  if (!setter) return;
  setter.call(el, teks);
  el.dispatchEvent(new Event('input', { bubbles: true }));
};

export interface HasilSalin { ok: boolean; pesan: string; terisi: string[] }

/** Tempel banyak angka mulai dari kotak `awal`, berurutan sepanjang layar. */
export function tempelKeKotak(awal: HTMLInputElement, teks: string, setTanda: SalinKonteks['setTanda']): HasilSalin {
  const u = uraiTempelan(teks);
  if ('galat' in u) return { ok: false, pesan: `Tidak ditempel: ${u.galat}`, terisi: [] };
  if (u.angka.length === 0) return { ok: false, pesan: 'Tidak ada angka untuk ditempel.', terisi: [] };
  const daftar = semuaKotakBacaan();
  const i0 = daftar.indexOf(awal);
  if (i0 < 0) return { ok: false, pesan: 'Kotak tidak ditemukan.', terisi: [] };
  const tujuan = daftar.slice(i0, i0 + u.angka.length);
  sedangMenyalin = true;
  try { tujuan.forEach((el, k) => isiKotak(el, u.angka[k])); } finally { sedangMenyalin = false; }
  const ids = tujuan.map((e) => e.id);
  // Satu angka saja bukan "salinan"; lebih dari satu = tempel
  if (u.angka.length > 1) ids.forEach((id) => setTanda(id, 'tempel'));
  const sisa = u.angka.length - tujuan.length;
  return { ok: true, terisi: ids, pesan: `${tujuan.length} angka terisi${sisa > 0 ? `, ${sisa} angka tidak muat (kotak habis)` : ''}.` };
}

/** Pindah fokus ke kotak bacaan berikutnya (arah +1) atau sebelumnya (-1) di seluruh layar. */
export function pindahKotak(dari: HTMLInputElement, arah: 1 | -1): HTMLInputElement | null {
  const daftar = semuaKotakBacaan();
  const t = daftar[daftar.indexOf(dari) + arah];
  if (t) { t.focus(); t.select?.(); }
  return t ?? null;
}

/** "= Sama": isi kotak ini dengan angka kotak sebelumnya DALAM KELOMPOK YANG SAMA, lalu pindah ke kotak berikutnya. */
export function samaDenganSebelumnya(el: HTMLInputElement, grup: HTMLElement, setTanda: SalinKonteks['setTanda']): HasilSalin {
  const dalam = semuaKotakBacaan(grup);
  const i = dalam.indexOf(el);
  if (i <= 0) return { ok: false, pesan: 'Ini kotak pertama — belum ada angka sebelumnya.', terisi: [] };
  const sebelum = dalam[i - 1].value.trim();
  if (!sebelum) return { ok: false, pesan: 'Kotak sebelumnya masih kosong.', terisi: [] };
  sedangMenyalin = true;
  try { isiKotak(el, sebelum); } finally { sedangMenyalin = false; }
  setTanda(el.id, 'sama');
  pindahKotak(el, 1);
  return { ok: true, pesan: `Diisi ${sebelum} (sama dengan sebelumnya).`, terisi: [el.id] };
}

/**
 * Pembungkus satu kelompok kotak bacaan (mis. 6 bacaan satu titik). Menampilkan baris tombol bantu
 * hanya selama ada kotak di kelompok ini yang sedang diisi.
 */
export const BarisBacaan: React.FC<{ kunci: boolean; children: React.ReactNode; className?: string }> = ({ kunci, children, className = 't-baca-grid' }) => {
  const { setTanda } = useSalin();
  const grup = useRef<HTMLDivElement>(null);
  const [fokus, setFokus] = useState(false);
  const [pesan, setPesan] = useState('');

  const aktif = (): HTMLInputElement | null => {
    const a = document.activeElement;
    return a instanceof HTMLInputElement && a.dataset.baca === '1' && grup.current?.contains(a) ? a : null;
  };
  // Tombol tidak boleh mencuri fokus (keyboard tetap terbuka)
  const jagaFokus = (e: React.SyntheticEvent) => e.preventDefault();

  const sama = useCallback(() => {
    const a = aktif(); if (!a || !grup.current) return;
    setPesan(samaDenganSebelumnya(a, grup.current, setTanda).pesan);
  }, [setTanda]);
  const lanjut = useCallback((arah: 1 | -1) => {
    const a = aktif(); if (!a) return;
    const t = pindahKotak(a, arah);
    setPesan(t ? '' : arah === 1 ? 'Ini kotak bacaan terakhir.' : 'Ini kotak bacaan pertama.');
  }, []);
  const tempel = useCallback(async () => {
    const a = aktif(); if (!a) return;
    try {
      const teks = await navigator.clipboard.readText();
      setPesan(tempelKeKotak(a, teks, setTanda).pesan);
    } catch {
      setPesan('Perangkat tidak mengizinkan tombol Tempel. Tekan lama pada kotak lalu pilih "Tempel".');
    }
  }, [setTanda]);

  // Pesan dari tempel lewat tekan-lama (dikirim kotak sebagai kejadian 'tera-salin-pesan')
  useEffect(() => {
    const el = grup.current; if (!el) return;
    const dengar = (e: Event) => setPesan(String((e as CustomEvent).detail ?? ''));
    el.addEventListener('tera-salin-pesan', dengar);
    return () => el.removeEventListener('tera-salin-pesan', dengar);
  }, []);

  const bisaTempel = typeof navigator !== 'undefined' && !!navigator.clipboard?.readText;

  return (
    <div
      ref={grup} data-baca-grup="1"
      onFocus={() => setFokus(true)}
      onBlur={(e) => { if (!grup.current?.contains(e.relatedTarget as Node | null)) { setFokus(false); setPesan(''); } }}
    >
      <div className={className}>{children}</div>
      {fokus && !kunci && (
        <div className="t-salin-bar" role="group" aria-label="Bantuan mengisi bacaan">
          <button type="button" className="t-salin-tombol" onMouseDown={jagaFokus} onPointerDown={jagaFokus} onClick={() => lanjut(-1)} aria-label="Kotak sebelumnya">◂</button>
          <button type="button" className="t-salin-tombol" onMouseDown={jagaFokus} onPointerDown={jagaFokus} onClick={() => lanjut(1)}>Berikutnya ▸</button>
          <button type="button" className="t-salin-tombol" onMouseDown={jagaFokus} onPointerDown={jagaFokus} onClick={sama}>= Sama</button>
          {bisaTempel && <button type="button" className="t-salin-tombol" onMouseDown={jagaFokus} onPointerDown={jagaFokus} onClick={() => { void tempel(); }}>Tempel</button>}
          <p className="t-ket t-salin-pesan" role="status" aria-live="polite">{pesan}</p>
        </div>
      )}
    </div>
  );
};

export const teksTanda = (j: JenisSalin | undefined): string | null => (j === 'sama' ? '= sama dgn sebelumnya' : j === 'tempel' ? 'hasil tempel' : null);
