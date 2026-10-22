// Uji segel bersama perangkat & server (Tahap 2.2). Jalankan: npm run test:tera
import { segelLkk, segelDraft, jsonKanonik, bolehHijau, hitungJumlahTitik, SegelError, POLA_UUID } from '../../src/tera/shared/segel.ts';
import { createHash, randomUUID } from 'node:crypto';
let lulus = 0, gagal = 0;
const cek = (nama: string, ok: boolean) => { ok ? lulus++ : gagal++; console.log(`${ok ? '✅' : '❌'} ${nama}`); };
const dasar = {
  id: randomUUID(), bo: '999', noLabel: '999.0001', templateKode: 'SPHYGMO', templateVersi: 1,
  tanggalKalibrasi: '2026-10-19', alatTambahan: false, poItemRef: null, jadwalId: null,
  data: { lingkungan: { suhu: 24.5, rh: 55 }, titik_ukur: [{ s: 0, b: [0, 0.5] }, { s: 100, b: [100, 101] }, { s: 200, b: [199, 200] }] },
  results: { laik: true }, calibratorSnapshot: null, clientVersion: 1,
};
const a = await segelLkk(dasar);
const diacak = { ...dasar, data: { titik_ukur: dasar.data.titik_ukur, lingkungan: { rh: 55, suhu: 24.5 } } };
const b = await segelLkk(diacak as any);
cek('segel 64 heksa', /^[0-9a-f]{64}$/.test(a.checksum));
cek('urutan kunci beda -> segel sama', a.checksum === b.checksum);
const ubah = structuredClone(dasar); ubah.data.titik_ukur[1].b[1] = 101.1;
cek('satu angka diubah -> segel beda', (await segelLkk(ubah)).checksum !== a.checksum);
const urutArray = structuredClone(dasar); urutArray.data.titik_ukur.reverse();
cek('urutan titik ukur beda -> segel beda', (await segelLkk(urutArray)).checksum !== a.checksum);
cek('jumlah titik = 3', a.jumlahTitik === 3);
cek('tanpa titik_ukur -> 0', hitungJumlahTitik({ x: 1 }) === 0);
cek('data template: tiap bacaan angka di kinerja dihitung (2 titik × 2 arah × 3 = 12)', hitungJumlahTitik({ kinerja: { tekanan: { '0': { naik: [0, 0, 0], turun: [0, 0, 0] }, '50': { naik: [50, 50, 50], turun: [50, 50, 50] } } } }) === 12);
cek('bacaan kosong / bukan angka tidak dihitung (bacaan hilang → jumlah turun)', hitungJumlahTitik({ kinerja: { tekanan: { '0': { naik: [0, null, 'x', NaN], turun: [1] } } } }) === 2);
cek('data kinerja rusak tidak melempar galat', hitungJumlahTitik({ kinerja: 'x' }) === 0 && hitungJumlahTitik({ kinerja: { a: 5, b: { '0': 7 } } }) === 0 && hitungJumlahTitik(null) === 0);
const versi2 = { ...dasar, clientVersion: 2 };
cek('versi beda -> segel beda', (await segelLkk(versi2)).checksum !== a.checksum);
cek('undefined dibuang', jsonKanonik({ b: 1, a: undefined }) === '{"b":1}');
cek('-0 jadi 0', jsonKanonik({ x: -0 }) === '{"x":0}');
let tolakNaN = false; try { await segelLkk({ ...dasar, data: { x: NaN } } as any); } catch (e) { tolakNaN = e instanceof SegelError; }
cek('NaN ditolak', tolakNaN);
const manual = createHash('sha256').update(jsonKanonik({ v: 1, jenis: 'lkk', ...dasar })).digest('hex');
cek('sama dengan SHA-256 Node (perangkat = server)', manual === a.checksum);
const d1 = await segelDraft({ id: dasar.id, bo: null, noLabel: null, templateKode: null, data: { x: 1 }, clientVersion: 1 });
cek('segel draft beda dengan segel LKK', d1.checksum !== a.checksum);
const milik = { checksum: a.checksum, jumlahTitik: 3, clientVersion: 1 };
cek('hijau bila cocok', bolehHijau({ hasil: 'diterima', checksum: a.checksum, jumlahTitik: 3, clientVersion: 1 }, milik));
cek('hijau juga bila sudah_diterima', bolehHijau({ hasil: 'sudah_diterima', checksum: a.checksum, jumlahTitik: 3, clientVersion: 1 }, milik));
cek('TIDAK hijau bila jumlah titik beda', !bolehHijau({ hasil: 'diterima', checksum: a.checksum, jumlahTitik: 2, clientVersion: 1 }, milik));
cek('TIDAK hijau bila segel beda', !bolehHijau({ hasil: 'diterima', checksum: 'f'.repeat(64), jumlahTitik: 3, clientVersion: 1 }, milik));
cek('TIDAK hijau bila ditolak', !bolehHijau({ hasil: 'ditolak_label_ganda' }, milik));
cek('TIDAK hijau tanpa tanda terima', !bolehHijau(null, milik));
cek('UUID crypto.randomUUID lolos pola', POLA_UUID.test(randomUUID()));
console.log(`\nLulus ${lulus}, gagal ${gagal}`); if (gagal) process.exit(1);
