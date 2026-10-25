/**
 * REKAP EXCEL (Tahap 5) — "kertas cetak" Excel: FORM_REKAP.xlsx dari Ridhwan yang isinya dikosongkan
 * (public/tera/rekap/templat-rekap.xlsx: judul baris 1, header baris 2, baris 3 = contoh gaya sel kosong).
 * Aplikasi hanya menulis baris data mulai baris 3 dengan GAYA SEL YANG SAMA (lebar kolom, garis, huruf, format tanggal
 * dd/mm/yy tetap dari form asli). Tidak ada tulisan tambahan.
 */
import JSZip from 'jszip';
import type { BarisRekap } from './dataBapBastp.js';

const KOLOM = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] as const;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  // karakter kontrol tidak sah di XML
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

/** 'YYYY-MM-DD' → nomor seri tanggal Excel (1900, dasar 30 Des 1899). */
export function serialExcel(tgl: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tgl);
  if (!m) return null;
  return Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(1899, 11, 30)) / 86_400_000);
}

export async function isiRekapXlsx(templat: Uint8Array, baris: BarisRekap[]): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(templat);
  const jalur = 'xl/worksheets/sheet1.xml';
  const xml = await zip.file(jalur)?.async('string');
  if (!xml) throw new Error('templat rekap rusak (sheet1 tidak ada)');
  const baris3 = /<row r="3"[^>]*>[\s\S]*?<\/row>/.exec(xml);
  if (!baris3) throw new Error('templat rekap rusak (baris 3 tidak ada)');
  // gaya per kolom dari baris 3 templat
  const gaya: Record<string, string> = {};
  for (const m of baris3[0].matchAll(/<c r="([A-J])3" s="(\d+)"/g)) gaya[m[1]] = m[2];
  const sel = (kol: string, r: number, nilai: string | number | null, tanggal = false) => {
    const s = gaya[kol] ? ` s="${gaya[kol]}"` : '';
    if (nilai === null || nilai === '') return `<c r="${kol}${r}"${s}/>`;
    if (typeof nilai === 'number') return `<c r="${kol}${r}"${s}><v>${nilai}</v></c>`;
    if (tanggal) { const n = serialExcel(nilai); if (n !== null) return `<c r="${kol}${r}"${s}><v>${n}</v></c>`; }
    return `<c r="${kol}${r}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(nilai)}</t></is></c>`;
  };
  const isi = baris.map((b, i) => {
    const r = i + 3;
    const v: (string | number | null)[] = [i + 1, b.nama, b.merk, b.tipe, b.noSeri, b.petugas, b.tanggal, b.ruangan, b.keterangan, b.noSertifikat];
    return `<row r="${r}">${KOLOM.map((k, c) => sel(k, r, v[c], k === 'G')).join('')}</row>`;
  }).join('');
  const akhir = Math.max(2, baris.length + 2);
  const baru = xml.replace(baris3[0], isi).replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="A1:J${akhir}"/>`);
  zip.file(jalur, baru);
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
