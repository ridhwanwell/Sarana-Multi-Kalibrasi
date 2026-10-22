/**
 * PEMERIKSA SERVER (Tahap 4.4a) — "petugas loket menghitung ulang lembar kerja".
 *
 * Perumpamaan: tablet teknisi menulis hasil hitung (jejak hitung) di LKK. Di kantor, petugas menghitung
 * ulang dari bacaan yang sama dengan mesin hitung yang sama, lalu membandingkan. Bila angkanya beda
 * (mis. aplikasi lama, data diubah di jalan, rumus tidak cocok) LKK TETAP DISIMPAN (data tidak boleh hilang),
 * tetapi diberi penanda merah dan ACC ditolak sampai dibetulkan.
 *
 * Murni (tanpa jaringan/database). Tidak pernah melempar galat.
 */
import type { TemplateAlat } from './hitung.js';
import { buatJejakHitung, VERSI_MESIN_HITUNG, type JejakHitung } from './jejak.js';
import { periksaIsian } from './isian.js';
import { jsonKanonik } from './segel.js';

export type KodePenanda =
  | 'jejak_beda'          // hasil hitung tablet ≠ hitung ulang server
  | 'jejak_hilang'        // LKK terkirim tanpa jejak hitung
  | 'template_beda'       // template/versi di jejak ≠ template LKK
  | 'standar_expired'     // alat standar expired pada tanggal pelaksanaan
  | 'lingkungan_luar'     // suhu/RH di luar batas
  | 'data_belum_lengkap'  // ada isian wajib yang kosong
  | 'standar_sementara'    // alat standar bernilai SEMENTARA (karangan uji) — tidak boleh jadi sertifikat sungguhan
  | 'template_rusak';     // server tidak bisa menghitung (template rusak)

export interface Penanda {
  kode: KodePenanda;
  teks: string;
  /** true = ACC ditolak selama penanda ini ada (CLAUDE.md 5.13, 13.11). */
  blokirAcc: boolean;
}

export interface HasilPeriksaServer {
  /** Versi mesin hitung server saat memeriksa (dicatat bersama hasil). */
  mesinHitung: number;
  /** true bila jejak kiriman sama persis dengan hitung ulang server. */
  jejakCocok: boolean;
  penanda: Penanda[];
  /** true bila tidak ada penanda yang memblokir ACC. */
  bolehAcc: boolean;
  /** Ringkasan kesimpulan menurut server (null bila belum lengkap/rusak). */
  kesimpulanServer: JejakHitung['kesimpulan'];
}

type Peta = Record<string, any>;

export interface MasukanPeriksa {
  data: Peta;
  results: Peta | null;
  calibratorSnapshot: Peta | null;
  tanggalKalibrasi: string | null;
  templateKode: string;
  templateVersi: number;
  /** BO 999 (data uji). Nilai kalibrator sementara hanya boleh di-ACC bila true. */
  isTest?: boolean;
}

export function periksaPaketServer(tpl: TemplateAlat | null, m: MasukanPeriksa): HasilPeriksaServer {
  const penanda: Penanda[] = [];
  const selesai = (jejakCocok: boolean, kesimpulanServer: JejakHitung['kesimpulan']): HasilPeriksaServer => ({
    mesinHitung: VERSI_MESIN_HITUNG,
    jejakCocok,
    penanda,
    bolehAcc: !penanda.some((p) => p.blokirAcc),
    kesimpulanServer,
  });

  try {
    if (!tpl || tpl.kode_alat !== m.templateKode || tpl.versi !== m.templateVersi) {
      penanda.push({ kode: 'template_rusak', teks: 'Template alat tidak ditemukan di server, hitungan tidak bisa diperiksa.', blokirAcc: true });
      return selesai(false, null);
    }

    const server = buatJejakHitung(tpl, m.data, m.calibratorSnapshot);
    if (!server) {
      penanda.push({ kode: 'template_rusak', teks: 'Server tidak bisa menghitung LKK ini (template rusak).', blokirAcc: true });
      return selesai(false, null);
    }

    let cocok = false;
    if (!m.results || typeof m.results !== 'object') {
      penanda.push({ kode: 'jejak_hilang', teks: 'LKK dikirim tanpa jejak hitung.', blokirAcc: true });
    } else {
      cocok = jsonKanonik(m.results) === jsonKanonik(server);
      if (!cocok) {
        const t = (m.results as Peta).template;
        if (!t || t.kode !== tpl.kode_alat || t.versi !== tpl.versi) {
          penanda.push({ kode: 'template_beda', teks: 'Template di jejak hitung berbeda dengan template LKK.', blokirAcc: true });
        }
        penanda.push({
          kode: 'jejak_beda',
          teks: 'Hasil hitung di tablet tidak sama dengan hitung ulang server. Periksa lalu kembalikan ke teknisi.',
          blokirAcc: true,
        });
      }
    }

    // Nilai kalibrator SEMENTARA (karangan, alat belum bersertifikat): HANYA info untuk Penyelia, TIDAK memblokir ACC
    // dan TIDAK dicetak di sertifikat (keputusan Ridhwan 22 Okt 2026: dibypass).
    if (JSON.stringify(m.calibratorSnapshot ?? {}).includes('NILAI SEMENTARA')) {
      penanda.push({
        kode: 'standar_sementara',
        teks: 'Info Penyelia: LKK ini memakai nilai kalibrator SEMENTARA (alat standar belum bersertifikat). Tidak memblokir ACC dan tidak tertulis di sertifikat.',
        blokirAcc: false,
      });
    }

    // Penanda dari kelengkapan: hanya yang merah (expired / lingkungan) memblokir ACC; kurang isian juga memblokir.
    const kurang = periksaIsian(tpl, { data: m.data, tanggal: m.tanggalKalibrasi, snapshot: m.calibratorSnapshot });
    for (const k of kurang) {
      if (k.merah) {
        const expired = /expired/i.test(k.teks);
        penanda.push({ kode: expired ? 'standar_expired' : 'lingkungan_luar', teks: k.teks, blokirAcc: true });
      }
    }
    if (kurang.some((k) => !k.merah)) {
      penanda.push({ kode: 'data_belum_lengkap', teks: `Ada ${kurang.filter((k) => !k.merah).length} isian wajib yang masih kosong.`, blokirAcc: true });
    }

    return selesai(cocok, server.kesimpulan);
  } catch {
    penanda.push({ kode: 'template_rusak', teks: 'Pemeriksaan server gagal. LKK tetap tersimpan.', blokirAcc: true });
    return selesai(false, null);
  }
}
