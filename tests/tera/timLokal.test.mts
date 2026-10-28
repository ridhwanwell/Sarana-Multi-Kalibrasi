// Uji PAPAN TIM (28 Okt 2026). Jalankan: npm run test:tera:tim
import { bersihkanTim, pemakaiNomor, ringkasTim, statusTeman, type TimLokal } from '../../src/tera/data/timLokal.ts';

let lulus = 0, gagal = 0;
const cek = (n: string, ok: boolean, d = '') => { ok ? lulus++ : gagal++; if (!ok || process.env.RINCI) console.log((ok ? '✅ ' : '❌ ') + n + (ok ? '' : '  — ' + d)); };

const jadwal: any = {
  id: 'SAYA|J1', pemilik: 'SAYA', jadwalId: 'J1', bo: '999', namaRs: 'RS UJI', kota: null, tanggalMulai: null, tanggalSelesai: null,
  labelAwal: '999.0001', labelAkhir: '999.0010', cadanganAwal: '999.0011', cadanganAkhir: '999.1000',
  alatPo: [{ ref: 'sph', nama: 'Sphygmomanometer', jumlah: 6, urutAwal: 1, urutAkhir: 6 }, { ref: 'tb', nama: 'Timbangan', jumlah: 4, urutAwal: 7, urutAkhir: 10 }],
  versi: 1, isTest: true, pushedAt: '', dicabut: false, diambilAt: '',
};
const lkkSaya = (no: string, ref: string | null, tambahan = false): any => ({ id: no, pemilik: 'SAYA', jadwalId: 'J1', noLabel: no, poItemRef: ref, alatTambahan: tambahan });

const mentah = {
  tim: [
    {
      jadwalId: 'J1',
      anggota: [{ userId: 'ALIN', nama: 'Alin' }, { userId: 'RIZKY', nama: 'Rizky' }],
      lkk: [
        { noLabel: '999.0004', templateKode: 'sphygmomanometer', alatTambahan: false, poItemRef: 'sph', status: 'submitted', teknisiUserId: 'ALIN', waktu: 'x' },
        { noLabel: '999.0005', templateKode: 'sphygmomanometer', alatTambahan: false, poItemRef: null, status: 'draft', teknisiUserId: 'ALIN', waktu: 'x' },
        { noLabel: '999.0005', templateKode: 'sphygmomanometer', alatTambahan: false, poItemRef: null, status: 'draft', teknisiUserId: 'ALIN', waktu: 'y' },
        { noLabel: '999.0007', templateKode: 'timbangan', alatTambahan: false, poItemRef: 'tb', status: 'approved', teknisiUserId: 'RIZKY', waktu: 'x' },
        { noLabel: '999.0020', templateKode: 'termohigrometer', alatTambahan: true, poItemRef: null, status: 'submitted', teknisiUserId: 'RIZKY', waktu: 'x' },
        { noLabel: '999.0001', templateKode: 'sphygmomanometer', alatTambahan: false, poItemRef: 'sph', status: 'submitted', teknisiUserId: 'RIZKY', waktu: 'x' },
        { noLabel: 'rusak', teknisiUserId: 'RIZKY' },
        { noLabel: '999.0009' },
      ],
    },
    { anggota: [] },
  ],
};

const bersih = bersihkanTim(mentah);
cek('baris rusak dibuang (jadwal tanpa id, label tidak sah, tanpa teknisi)', bersih.length === 1 && bersih[0].lkk.length === 6, JSON.stringify(bersih.map((b) => b.lkk.length)));
cek('kiriman kosong / bukan objek tidak crash', bersihkanTim(null).length === 0 && bersihkanTim({ tim: 'x' }).length === 0);

const tim: TimLokal = { diambilAt: '2026-10-28T12:00:00Z', tim: bersih };
const saya = [lkkSaya('999.0001', 'sph'), lkkSaya('999.0002', 'sph'), lkkSaya('999.0011', null, true)];
const rt = ringkasTim(jadwal, saya, tim);

cek('2 teman, urut nama', rt.teman.map((t) => t.nama).join() === 'Alin,Rizky', rt.teman.map((t) => t.nama).join());
cek('Alin: 2 alat (draft dobel jadi satu baris)', rt.teman[0].lkk.map((l) => l.noLabel).join() === '999.0004,999.0005');
cek('nomor yang juga ada di perangkat saya tidak dihitung dua kali (999.0001)', !rt.teman[1].lkk.some((l) => l.noLabel === '999.0001'));
cek('Rizky: 999.0007 + 999.0020 (alat tambahan tetap tampil)', rt.teman[1].lkk.map((l) => l.noLabel).join() === '999.0007,999.0020');
cek('PO sph tim = saya 2 + Alin 1 terkirim', rt.poTim.get('sph') === 3, String(rt.poTim.get('sph')));
cek('PO timbangan tim = 1 (Rizky)', rt.poTim.get('tb') === 1);
cek('draft teman tanpa jenis ikut total, alat tambahan tidak', rt.poTanpaJenis === 1 && rt.totalTim === 5, `${rt.poTanpaJenis}/${rt.totalTim}`);

const kosong = ringkasTim(jadwal, saya, null);
cek('tanpa papan tim (belum pernah ditarik) → tidak ada teman, total = milik saya', kosong.teman.length === 0 && kosong.totalTim === 2);
cek('jadwal lain tidak tercampur', ringkasTim({ ...jadwal, jadwalId: 'J2' }, saya, tim).teman.length === 0);

cek('pemakai nomor terkirim → nama & status', JSON.stringify(pemakaiNomor(tim, 'J1', '999.0004')) === '{"nama":"Alin","status":"submitted"}');
cek('pemakai nomor draft → status draft', pemakaiNomor(tim, 'J1', '999.0005')?.status === 'draft');
cek('nomor bebas → null', pemakaiNomor(tim, 'J1', '999.0003') === null && pemakaiNomor(null, 'J1', '999.0004') === null);
cek('status ditulis bahasa awam', statusTeman('draft') === 'sedang diisi' && statusTeman('approved') === 'ACC' && statusTeman('submitted') === 'terkirim');

console.log(`Papan tim: ${lulus} lulus, ${gagal} gagal`);
if (gagal) process.exit(1);
