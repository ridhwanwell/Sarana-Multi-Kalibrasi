// Uji data BAP & BASTP (Tahap 5.2): realisasi, sisa, alat tambahan, data uji, nomor, gelar, kolom BASTP.
// Jalankan: npx tsx tests/tera/dataBapBastp.test.mts
import { susunDataBap, susunDataBastp, nomorDokumen, tanggalPo, type BahanDataBap, type LkkBap } from '../../src/tera/shared/dataBapBastp.ts';
import { keteranganBap } from '../../src/tera/pdf/susunBapBastp.ts';
import { susunDataRekap } from '../../src/tera/shared/dataBapBastp.ts';
import { isiRekapXlsx, serialExcel } from '../../src/tera/shared/rekapExcel.ts';
import { readFileSync as baca, writeFileSync as tulis } from 'node:fs';
import JSZip from 'jszip';

let lulus = 0, gagal = 0;
const cek = (n: string, ok: boolean, d: unknown = '') => { ok ? lulus++ : gagal++; if (!ok || process.env.RINCI) console.log((ok ? '✅ ' : '❌ ') + n + (ok ? '' : '  — ' + JSON.stringify(d))); };

const lkk = (no: string, o: Partial<LkkBap> = {}): LkkBap => ({
  no_label: no, status: 'submitted', is_test: false, alat_tambahan: false, po_item_ref: 'tensi', template_kode: 'sphygmomanometer',
  tanggal_kalibrasi: '2026-10-22', teknisi_user_id: 'u1',
  data: { identitas: { merek: 'Riester', tipe: 'Big Ben', noSeri: 'SN1', ruang: 'IGD' } }, results: { kesimpulan: 'Laik Pakai' }, ...o,
});
const bahan = (bo: string, daftar: LkkBap[], isTest = false): BahanDataBap => ({
  jadwal: { nama_rs: 'RS Lama', kota: 'Boyolali', nomor_po: '201/SMK-SPH/IX-2026', tanggal_po: '2026-10-06', nama_teknisi_utama: 'Hafizh Pasifianto Utomo',
    data: { hospitalName: 'RSU Hidayah Boyolali', hospitalAddress: 'Jl. Searah', hospitalCity: 'Kabupaten Boyolali', leadTechnicianName: 'Aziz Arrayya', hospitalPhone: '' } },
  push: { bo, is_test: isTest, alat_po: [{ ref: 'tensi', nama: 'Sphygmomanometer', jumlah: 3 }, { ref: 'timb', nama: 'Timbangan Bayi Digital', jumlah: 2 }] },
  lkk: daftar, namaTemplate: { sphygmomanometer: 'Sphygmomanometer', suction: 'Suction Pump' },
  namaTeknisi: { u1: 'Junior Yudha Pamungkas', u2: 'Ridhwan Nur Yudianto' }, tanggalUnduh: '2026-10-25',
});

// --- BAP ---
const daftar = [
  lkk('201.0002'), lkk('201.0001', { results: { kesimpulan: 'Tidak Laik Pakai' } }),
  lkk('201.0010', { alat_tambahan: true, po_item_ref: null, template_kode: 'suction', teknisi_user_id: 'u2', data: { identitas: { ruang: 'OK' } } }),
  lkk('201.0011', { is_test: true }),                       // data uji di BO sungguhan → dibuang
  lkk('201.0012', { status: 'draft' }),                      // bukan status diterima → dibuang
];
const b = susunDataBap(bahan('201', daftar));
cek('nomor BAP romawi tanggal unduh', b.nomorBap === '201/SMK/BAP/X/2026', b.nomorBap);
cek('nama RS dari data RS jadwal', b.namaPelanggan === 'RSU Hidayah Boyolali', b.namaPelanggan);
cek('tanggal PO Indonesia', b.tanggalPo === 'Selasa, 6 Oktober 2026', b.tanggalPo);
cek('kota dari data RS', b.kota === 'Kabupaten Boyolali', b.kota);
cek('realisasi termasuk TIDAK LAIK, tanpa uji & draft', b.baris[0].realisasi === 2 && b.baris[0].sisa === 1, b.baris[0]);
cek('PO tanpa LKK', b.baris[1].realisasi === 0 && b.baris[1].sisa === 2, b.baris[1]);
cek('alat tambahan baris sendiri, PO 0', b.baris.length === 3 && b.baris[2].nama === 'Suction Pump' && b.baris[2].po === 0 && b.baris[2].realisasi === 1 && b.baris[2].sisa === 0, b.baris[2]);
cek('ketua tim bergelar', b.ketuaTim === 'Aziz Ar Rayya, Amd.T', b.ketuaTim);
cek('tanggal dokumen = tanggal unduh', !!b.tanggal && b.tanggal.getDate() === 25 && b.tanggal.getMonth() === 9, b.tanggal);
cek('keterangan Selesai/Batal', keteranganBap(0) === 'Selesai' && keteranganBap(1) === 'Batal');
const lebih = susunDataBap(bahan('201', [lkk('201.0001'), lkk('201.0002'), lkk('201.0003'), lkk('201.0004')]));
cek('PO terlampaui: sisa tidak negatif', lebih.baris[0].sisa === 0 && lebih.baris[0].realisasi === 4, lebih.baris[0]);

// --- BO 999: data uji ikut ---
const uji = susunDataBap(bahan('999', [lkk('999.0001', { is_test: true })], true));
cek('BO 999: LKK uji dihitung', uji.baris[0].realisasi === 1, uji.baris[0]);

// --- BASTP ---
const t = susunDataBastp(bahan('201', daftar));
cek('No. Order', t.noOrder === '201/SMK-BO/X-2026', t.noOrder);
cek('BASTP hanya LKK sah, urut nomor label', t.baris.length === 3 && t.baris[0].merk === 'Riester', t.baris.map((x) => x.nama));
cek('hasil Laik/Tidak', t.laikPakai === 2 && t.tidakLaik === 1, [t.laikPakai, t.tidakLaik]);
cek('petugas bergelar', t.baris[0].petugas === 'Junior Yudha Pamungkas, S.Tr.T.', t.baris[0].petugas);
cek('petugas tanpa gelar di daftar', t.baris[2].petugas === 'Ridhwan Nur Yudianto', t.baris[2].petugas);
cek('ruangan dari LKK', t.baris[0].ruangan === 'IGD' && t.baris[2].ruangan === 'OK', t.baris.map((x) => x.ruangan));
cek('tanggal kalibrasi dd/mm/yy', t.baris[0].tanggal === '22/10/26', t.baris[0].tanggal);
cek('isian kosong = "-"', t.baris[2].merk === '-' && t.baris[2].noSeri === '-', t.baris[2]);
cek('alat tambahan nama katalog', t.baris[2].nama === 'Suction Pump', t.baris[2].nama);
cek('telepon kosong = "-"', t.telepon === '-', t.telepon);
cek('alamat + kota', t.alamat === 'Jl. Searah, Kabupaten Boyolali', t.alamat);
cek('nomorDokumen Januari', nomorDokumen('005', '2027-01-03').nomorBap === '005/SMK/BAP/I/2027');
cek('tanggalPo teks bebas dibiarkan', tanggalPo('Senin, 5 Oktober 2026') === 'Senin, 5 Oktober 2026');

// --- REKAP Excel ---
const rk = susunDataRekap(bahan('201', daftar));
cek('rekap: baris = LKK sah', rk.length === 3, rk.length);
cek('rekap: nama alat huruf besar', rk[0].nama === 'SPHYGMOMANOMETER' && rk[2].nama === 'SUCTION PUMP', rk.map((x) => x.nama));
cek('rekap: no. sertifikat = nomor label', rk[0].noSertifikat === '201.0001', rk[0].noSertifikat);
cek('rekap: tanggal ISO', rk[0].tanggal === '2026-10-22', rk[0].tanggal);
cek('serial Excel 11 Agu 2026', serialExcel('2026-08-11') === 46245, serialExcel('2026-08-11'));
const tpl = baca(new URL('../../public/tera/rekap/templat-rekap.xlsx', import.meta.url));
const xl = await isiRekapXlsx(new Uint8Array(tpl), [...rk, { ...rk[0], nama: 'A & B <uji>', noSertifikat: '201.0099' }]);
const sh = await (await JSZip.loadAsync(xl)).file('xl/worksheets/sheet1.xml')!.async('string');
cek('rekap xlsx: baris 3..6 ada, dimensi', sh.includes('<row r="6">') && sh.includes('<dimension ref="A1:J6"/>'));
cek('rekap xlsx: karakter khusus aman', sh.includes('A &amp; B &lt;uji&gt;'));
cek('rekap xlsx: judul & header tetap', sh.includes('FORM REKAP PEKERJAAN') && sh.includes('No. Sertifikat'));
if (process.env.SIMPAN_REKAP) tulis(process.env.SIMPAN_REKAP, xl);

console.log(`\n${lulus} lulus, ${gagal} gagal`);
if (gagal) process.exit(1);
