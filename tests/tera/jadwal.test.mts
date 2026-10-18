// Uji aturan "fotokopi jadwal" (Tahap 3.2) — murni, tanpa database.
// Jalankan: npm run test:tera:jadwal
import { susunPush, type JadwalBaris, type TeknisiBaris, type PushLain } from '../../src/tera/shared/jadwal.ts';

let lulus = 0, gagal = 0;
const cek = (n: string, ok: boolean, d = '') => { ok ? lulus++ : gagal++; console.log((ok ? '✅ ' : '❌ ') + n + (ok ? '' : '  — ' + d)); };

const U1 = '11111111-1111-4111-8111-111111111111';
const U2 = '22222222-2222-4222-8222-222222222222';
const teknisi: TeknisiBaris[] = [
  { id: 'TECH-001', nama: 'Ari', user_id: U1 },
  { id: 'TECH-002', nama: 'Alin', user_id: U2 },
  { id: 'TECH-003', nama: 'Tanpa Akun', user_id: null },
  { id: 'TECH-009', nama: 'Dihapus', user_id: U2, deleted_at: '2026-01-01' },
];
const dasar = (): JadwalBaris => ({
  id: 'SCH-1',
  data: {
    modeSertifikat: 'tera', labelStart: '200.0001', labelEnd: '200.0050',
    labelCadanganAwal: '200.0051', labelCadanganAkhir: '200.0070',
    leadTechnicianId: 'TECH-001', supportTechnicianIds: ['TECH-002'],
    hospitalName: 'RS Contoh', hospitalCity: 'Solo', scheduledDate: '2026-10-20T00:00:00.000Z', endDate: '2026-10-22',
    targetDevices: [
      { id: 'dev-1', sphItemId: 'item-1', name: 'Tensimeter', quantity: 30, labelSequenceStart: 1, labelSequenceEnd: 30 },
      { id: 'dev-2', name: 'Infusion Pump', quantity: 20, labelSequenceStart: 31, labelSequenceEnd: 50 },
    ],
  },
});
const ubah = (f: (j: JadwalBaris) => void) => { const j = dasar(); f(j); return j; };

{ const h = susunPush(dasar(), teknisi, []);
  cek('jadwal lengkap → ok', h.ok === true);
  if (h.ok) {
    cek('BO diambil dari label (200)', h.bahan.p_bo === '200');
    cek('teknisi utama + pendamping → 2 akun', h.bahan.p_teknisi_user_ids.length === 2 && h.bahan.p_teknisi_user_ids.includes(U1) && h.bahan.p_teknisi_user_ids.includes(U2));
    cek('2 alat PO, ref memakai sphItemId lalu id', h.bahan.p_alat_po.length === 2 && h.bahan.p_alat_po[0].ref === 'item-1' && h.bahan.p_alat_po[1].ref === 'dev-2');
    cek('tanggal dipotong ke YYYY-MM-DD', h.bahan.p_tanggal_mulai === '2026-10-20' && h.bahan.p_tanggal_selesai === '2026-10-22');
    cek('bukan data uji', h.bahan.p_is_test === false);
    cek('cadangan terbawa', h.bahan.p_cadangan_awal === '200.0051' && h.bahan.p_cadangan_akhir === '200.0070');
    cek('tanpa peringatan', h.peringatan.length === 0);
  } }

cek('mode manual ditolak', (() => { const h = susunPush(ubah((j) => { j.data!.modeSertifikat = 'manual_drive'; }), teknisi, []); return !h.ok && h.alasan.includes('Manual'); })());
cek('mode kosong (jadwal lama) ditolak', !susunPush(ubah((j) => { delete j.data!.modeSertifikat; }), teknisi, []).ok);
cek('jadwal null / terhapus ditolak', !susunPush(null, teknisi, []).ok && !susunPush(ubah((j) => { j.deleted_at = '2026-10-01'; }), teknisi, []).ok);
cek('label bukan format ditolak', !susunPush(ubah((j) => { j.data!.labelStart = '200-1'; }), teknisi, []).ok);
cek('label awal & akhir beda BO ditolak', !susunPush(ubah((j) => { j.data!.labelEnd = '201.0050'; }), teknisi, []).ok);
cek('label awal > akhir ditolak', !susunPush(ubah((j) => { j.data!.labelStart = '200.0060'; }), teknisi, []).ok);
cek('fallback ke kolom label_awal/label_akhir', susunPush(ubah((j) => { delete j.data!.labelStart; delete j.data!.labelEnd; j.label_awal = '200.0001'; j.label_akhir = '200.0050'; }), teknisi, []).ok);

cek('cadangan tanpa label (kosong semua) boleh', (() => { const h = susunPush(ubah((j) => { delete j.data!.labelCadanganAwal; delete j.data!.labelCadanganAkhir; }), teknisi, []); return h.ok && h.bahan.p_cadangan_awal === null; })());
cek('cadangan setengah terisi ditolak', !susunPush(ubah((j) => { delete j.data!.labelCadanganAkhir; }), teknisi, []).ok);
cek('cadangan beda BO ditolak', !susunPush(ubah((j) => { j.data!.labelCadanganAwal = '300.0051'; j.data!.labelCadanganAkhir = '300.0070'; }), teknisi, []).ok);
cek('cadangan tumpang tindih utama ditolak', !susunPush(ubah((j) => { j.data!.labelCadanganAwal = '200.0040'; }), teknisi, []).ok);
cek('cadangan sebelum utama ditolak', !susunPush(ubah((j) => { j.data!.labelStart = '200.0100'; j.data!.labelEnd = '200.0150'; j.data!.labelCadanganAwal = '200.0001'; j.data!.labelCadanganAkhir = '200.0010'; }), teknisi, []).ok);

const lain = (aw: string, ak: string, ca: string | null = null, cb: string | null = null): PushLain => ({ jadwal_id: 'SCH-LAIN', label_awal: aw, label_akhir: ak, label_cadangan_awal: ca, label_cadangan_akhir: cb });
cek('bentrok dengan jadwal lain (utama) ditolak', !susunPush(dasar(), teknisi, [lain('200.0040', '200.0090')]).ok);
cek('bentrok cadangan dengan utama jadwal lain ditolak', !susunPush(dasar(), teknisi, [lain('200.0060', '200.0080')]).ok);
cek('BO berbeda tidak bentrok', susunPush(dasar(), teknisi, [lain('300.0001', '300.0090')]).ok);
cek('push jadwal sendiri tidak dihitung bentrok', susunPush(dasar(), teknisi, [{ ...lain('200.0001', '200.0050'), jadwal_id: 'SCH-1' }]).ok);
cek('rentang bersebelahan tidak bentrok', susunPush(dasar(), teknisi, [lain('200.0071', '200.0099')]).ok);

cek('alat PO kosong ditolak', !susunPush(ubah((j) => { j.data!.targetDevices = []; }), teknisi, []).ok);
cek('alat tak valid (tanpa nama / jumlah) dilewati, sisanya ikut', (() => { const h = susunPush(ubah((j) => { j.data!.targetDevices.push({ id: 'x', name: '', quantity: 3 }, { id: 'y', name: 'A', quantity: 'banyak' }); }), teknisi, []); return h.ok && h.bahan.p_alat_po.length === 2; })());

cek('tanpa teknisi ditugaskan ditolak', !susunPush(ubah((j) => { j.data!.leadTechnicianId = ''; j.data!.supportTechnicianIds = []; }), teknisi, []).ok);
cek('teknisi tanpa akun → peringatan, yang lain tetap ikut', (() => { const h = susunPush(ubah((j) => { j.data!.supportTechnicianIds = ['TECH-003']; }), teknisi, []); return h.ok && h.peringatan.length === 1 && h.peringatan[0].includes('Tanpa Akun') && h.bahan.p_teknisi_user_ids.length === 1; })());
cek('semua teknisi tanpa akun ditolak', !susunPush(ubah((j) => { j.data!.leadTechnicianId = 'TECH-003'; j.data!.supportTechnicianIds = []; }), teknisi, []).ok);
cek('teknisi terhapus / tak dikenal → peringatan', (() => { const h = susunPush(ubah((j) => { j.data!.supportTechnicianIds = ['TECH-009', 'TECH-404']; }), teknisi, []); return h.ok && h.peringatan.length === 2; })());
cek('teknisi ganda hanya dihitung sekali', (() => { const h = susunPush(ubah((j) => { j.data!.supportTechnicianIds = ['TECH-001', 'TECH-001']; }), teknisi, []); return h.ok && h.bahan.p_teknisi_user_ids.length === 1; })());

cek('BO 999 otomatis data uji', (() => { const h = susunPush(ubah((j) => { j.data!.labelStart = '999.0001'; j.data!.labelEnd = '999.0050'; j.data!.labelCadanganAwal = '999.0051'; j.data!.labelCadanganAkhir = '999.0060'; }), teknisi, []); return h.ok && h.bahan.p_is_test === true && h.bahan.p_bo === '999'; })());
cek('nama RS kosong ditolak', !susunPush(ubah((j) => { delete j.data!.hospitalName; j.nama_rs = null; }), teknisi, []).ok);
cek('nama RS jatuh ke kolom nama_rs', (() => { const h = susunPush(ubah((j) => { delete j.data!.hospitalName; j.nama_rs = 'RS Kolom'; }), teknisi, []); return h.ok && h.bahan.p_nama_rs === 'RS Kolom'; })());

console.log(`\nLulus ${lulus}, gagal ${gagal}`);
process.exit(gagal ? 1 : 0);
