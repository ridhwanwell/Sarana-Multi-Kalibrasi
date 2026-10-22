// Uji ATURAN NOMOR STIKER (Tahap 4.3b, PRD F3.2–F3.4). Jalankan: npm run test:tera:nomor
import { cekNomorLabel, nomorDariKetikan, pecahNomor, tanggalLokal, templateUntukAlat } from '../../src/tera/shared/nomorLabel.ts';

let lulus = 0, gagal = 0;
const cek = (n: string, ok: boolean, d = '') => { ok ? lulus++ : gagal++; if (!ok || process.env.RINCI) console.log((ok ? '✅ ' : '❌ ') + n + (ok ? '' : '  — ' + d)); };

const utama = { awal: '095.0001', akhir: '095.0010' };
const cadangan = { awal: '095.0011', akhir: '095.0015' };
const dasar = { bo: '095', utama, cadangan, dipakai: new Set<string>(), mode: 'po' as const };

// pecah & ketikan
cek('pecahNomor: 095.0012 → BO 095 urut 12', JSON.stringify(pecahNomor('095.0012')) === '{"bo":"095","urut":12}');
cek('pecahNomor: bentuk salah → null', [pecahNomor('95.0012'), pecahNomor('095.012'), pecahNomor('abc'), pecahNomor(''), pecahNomor(null)].every((x) => x === null));
cek('ketik 4 angka: BO terisi otomatis', nomorDariKetikan('095', '0012') === '095.0012' && nomorDariKetikan('095', ' 0012 ') === '095.0012');
cek('ketikan lengkap diterima (titik, strip, 7 angka)', nomorDariKetikan('095', '095.0012') === '095.0012' && nomorDariKetikan('095', '095-0012') === '095.0012' && nomorDariKetikan('095', '0950012') === '095.0012');
cek('ketikan salah → null (3 angka, 5 angka, huruf, kosong)', ['012', '00123', 'abcd', '', '12 34'].every((k) => nomorDariKetikan('095', k) === null));

// alat PO
cek('PO: nomor utama diterima (jenis utama)', JSON.stringify(cekNomorLabel({ ...dasar, nomor: '095.0001' })) === '{"ok":true,"nomor":"095.0001","jenis":"utama"}');
cek('PO: batas awal & akhir diterima', cekNomorLabel({ ...dasar, nomor: '095.0001' }).ok && cekNomorLabel({ ...dasar, nomor: '095.0010' }).ok);
cek('PO: cadangan juga diterima (F3.3 utama/cadangan)', (() => { const h = cekNomorLabel({ ...dasar, nomor: '095.0012' }); return h.ok && h.jenis === 'cadangan'; })());
{ const h = cekNomorLabel({ ...dasar, nomor: '095.0016' });
  cek('PO: di luar rentang → pesan memuat rentang', !h.ok && /di luar rentang/.test(h.pesan) && /095\.0001 – 095\.0010/.test(h.pesan) && /cadangan 095\.0011 – 095\.0015/.test(h.pesan), JSON.stringify(h)); }
{ const h = cekNomorLabel({ ...dasar, nomor: '095.0000' });
  cek('PO: 0000 di luar rentang', !h.ok); }
{ const h = cekNomorLabel({ ...dasar, nomor: '200.0012' });
  cek('BO lain ditolak dengan pesan jelas', !h.ok && /milik BO 200, bukan BO 095/.test(h.pesan), JSON.stringify(h)); }
{ const h = cekNomorLabel({ ...dasar, nomor: '095.0003', dipakai: new Set(['095.0003']) });
  cek('sudah dipakai di perangkat → ditolak', !h.ok && /sudah dipakai LKK lain/.test(h.pesan), JSON.stringify(h)); }
{ const h = cekNomorLabel({ ...dasar, nomor: '95.3' });
  cek('format salah → pesan contoh', !h.ok && /3 angka, titik, 4 angka/.test(h.pesan)); }
{ const h = cekNomorLabel({ ...dasar, nomor: null });
  cek('nomor kosong → format salah (tidak crash)', !h.ok); }
{ const h = cekNomorLabel({ ...dasar, utama: null, cadangan: null, nomor: '095.0001' });
  cek('jadwal tanpa rentang → ditolak, tidak crash', !h.ok); }
{ const h = cekNomorLabel({ ...dasar, utama: { awal: 'x', akhir: 'y' }, nomor: '095.0001' });
  cek('rentang jadwal rusak → ditolak, tidak crash', !h.ok); }
{ const h = cekNomorLabel({ ...dasar, utama: { awal: '096.0001', akhir: '096.0010' }, cadangan: null, nomor: '095.0003' });
  cek('rentang jadwal beda BO dengan jadwal → ditolak', !h.ok); }

// alat tambahan
{ const h = cekNomorLabel({ ...dasar, mode: 'tambahan', nomor: '095.0012' });
  cek('tambahan: stiker cadangan diterima', h.ok && h.jenis === 'cadangan'); }
{ const h = cekNomorLabel({ ...dasar, mode: 'tambahan', nomor: '095.0003' });
  cek('tambahan: stiker utama ditolak, pesan menyebut cadangan', !h.ok && /harus memakai stiker cadangan \(095\.0011 – 095\.0015\)/.test(h.pesan), JSON.stringify(h)); }
{ const h = cekNomorLabel({ ...dasar, mode: 'tambahan', nomor: '095.0099' });
  cek('tambahan: di luar semua rentang ditolak', !h.ok && /di luar rentang stiker cadangan/.test(h.pesan)); }
{ const h = cekNomorLabel({ ...dasar, mode: 'tambahan', cadangan: null, nomor: '095.0012' });
  cek('tambahan: jadwal tanpa cadangan → minta hubungi Admin Teknik', !h.ok && /tidak punya stiker cadangan/.test(h.pesan)); }
{ const h = cekNomorLabel({ ...dasar, mode: 'tambahan', nomor: '095.0012', dipakai: new Set(['095.0012']) });
  cek('tambahan: cadangan yang sudah dipakai ditolak', !h.ok && /sudah dipakai/.test(h.pesan)); }

// template per nama alat
const T = [{ nama: 'Sphygmomanometer', kode: 'sph' }, { nama: 'Timbangan Bayi Digital', kode: 'tbd' }];
cek('template: cocok walau huruf besar/kecil & spasi berlebih', templateUntukAlat('  sphygmomanometer ', T)?.kode === 'sph' && templateUntukAlat('TIMBANGAN   BAYI digital', T)?.kode === 'tbd');
cek('template: nama tak dikenal → null (tidak menebak)', templateUntukAlat('Tensimeter', T) === null && templateUntukAlat('', T) === null);

// tanggal lokal
cek('tanggalLokal: format YYYY-MM-DD memakai jam perangkat', tanggalLokal(new Date(2026, 9, 5, 23, 59)) === '2026-10-05' && tanggalLokal(new Date(2026, 0, 1, 0, 0)) === '2026-01-01');

console.log(`\n${lulus} lulus, ${gagal} gagal`);
if (gagal) process.exit(1);
