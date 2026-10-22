/**
 * Pemeriksa isian tabel nilai kalibrator (dipakai server & halaman Nilai Kalibrator Tera). Murni, tanpa jaringan.
 * Aturan sama dengan CHECK database `tera_calibrator_points_points_check` (angka, U95 ≥ 0), ditambah: titik tidak kembar.
 */
const angka = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Periksa & rapikan titik: angka terbatas, titik tidak kembar, U95 ≥ 0, urut naik. */
export function bacaTitik(v: unknown): { titik?: Record<string, number>[]; salah?: string } {
  if (!Array.isArray(v) || v.length < 1 || v.length > 200) return { salah: 'Isi 1 sampai 200 titik.' };
  const hasil: Record<string, number>[] = [];
  const dilihat = new Set<number>();
  for (const [i, t] of v.entries()) {
    const n = i + 1;
    if (!t || typeof t !== 'object') return { salah: `Titik ke-${n} tidak sah.` };
    const { titik, koreksiNaik, koreksiTurun, u95Naik, u95Turun } = t as any;
    if (![titik, koreksiNaik, koreksiTurun, u95Naik, u95Turun].every(angka)) return { salah: `Titik ke-${n}: titik, koreksi, dan U95 harus angka.` };
    if (u95Naik < 0 || u95Turun < 0) return { salah: `Titik ke-${n}: U95 tidak boleh negatif.` };
    if (dilihat.has(titik)) return { salah: `Titik ${titik} muncul dua kali.` };
    dilihat.add(titik);
    const baris: Record<string, number> = { titik, koreksiNaik, koreksiTurun, u95Naik, u95Turun };
    for (const k of ['driftNaik', 'driftTurun'] as const) {
      const d = (t as any)[k];
      if (d !== undefined && d !== null) { if (!angka(d)) return { salah: `Titik ke-${n}: ${k} harus angka.` }; baris[k] = d; }
    }
    hasil.push(baris);
  }
  return { titik: hasil.sort((a, b) => a.titik - b.titik) };
}
