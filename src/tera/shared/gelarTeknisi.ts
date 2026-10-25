/**
 * Gelar teknisi untuk BASTP (kolom Petugas & nama ketua tim): nama + gelar.
 * Master `teknisi` hanya menyimpan nama tanpa gelar; daftar ini dari Ridhwan (25 Okt 2026).
 * Pencocokan tidak peka huruf besar/kecil, spasi, atau tanda baca (mis. "Aziz Arrayya" = "Aziz Ar Rayya").
 * Nama yang tidak ada di daftar dicetak apa adanya (tanpa gelar). BAP & BASTP sama-sama memakai nama + gelar.
 */
const DAFTAR = [
  'Hafizh Pasifianto Utomo, S.Tr.T.',
  'Sheva Maresca Pramuningtyas, S.Tr.T.',
  'Junior Yudha Pamungkas, S.Tr.T.',
  'Shifa Zalza Billa, S.Tr.T.',
  'Ahmad Fajar Ariyanto, S.Tr.T.',
  'Aziz Ar Rayya, Amd.T',
  'Muhammad Esak Muhandis, S.Tr.T',
  'Ardhiany Mayliana Wiyono, Amd.T',
  'Rizki Adi Nugroho, S.Tr.T',
] as const;

const kunci = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
const PETA = new Map<string, string>(DAFTAR.map((n) => [kunci(n.split(',')[0]), n]));

/** "Hafizh Pasifianto Utomo" → "Hafizh Pasifianto Utomo, S.Tr.T." (tanpa gelar di daftar → nama apa adanya). */
export const namaDenganGelar = (nama: string): string => PETA.get(kunci(nama)) ?? nama.trim();
