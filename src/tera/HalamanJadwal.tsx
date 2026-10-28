/**
 * Tera SMK — Beranda (daftar RS) & Detail RS (Tahap 3.4b, PRD F2.5–F2.6).
 *
 * Perumpamaan: map surat tugas di tas teknisi. Beranda = daftar surat tugas (satu RS satu kartu);
 * Detail RS = isi satu surat tugas: alat apa saja yang dipesan (PO), berapa yang sudah dikerjakan,
 * dan sisanya. Semua dibaca dari penyimpanan perangkat (offline-first); layar tidak menunggu internet.
 *
 * "Dikerjakan" dihitung dari LKK di perangkat (bukan dari server), jadi angka langsung berubah
 * begitu teknisi menekan Selesai, tanpa sinyal.
 *
 * UI: ui-ux-pro-max (Empty States, Deep Linking, Touch 48px, Loading feedback, status bukan warna saja),
 * break-ui (nama RS sangat panjang, 0 alat, 200 alat, PO ditembus). Daftar panjang memakai
 * `content-visibility: auto` pada baris (tanpa paket baru).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle, Building2, Check, ChevronLeft, ChevronRight, ClipboardCheck, FileDown, Loader2, Plus, RefreshCw, Tag, Users,
} from 'lucide-react';
import { useSinkron } from './SinkronKonteks';
import { BarisLkk, KeadaanKosong, Statistik } from './TeraKerangka';
import { hitungAlatPo, type HitunganAlat, type JadwalLokal } from './data/jadwalLokal';
import { daftarTemplateTerbaru } from './data/masterLokal';
import type { LkkLokal } from './data/teraDb';
import type { TemplateApa } from './data/masterLokal';
import { templateUntukAlat } from './shared/nomorLabel';
import { MulaiLkk } from './MulaiLkk';
import { unduhBapBastp, type JenisDokumen } from './data/unduhBapBastp';
import { pemakaiNomor, ringkasTim, statusTeman, type RingkasTim, type TimLokal } from './data/timLokal';

/* ---------- Dokumen RS: unduh BAP & BASTP (Tahap 5.3) ---------- */

/** Dua tombol unduh. Isi dokumen = LKK yang sudah DITERIMA server; LKK yang masih di perangkat belum ikut (diberi tahu). */
const DokumenRs: React.FC<{ jadwalId: string; belumTerkirim: number }> = ({ jadwalId, belumTerkirim }) => {
  const [memuat, setMemuat] = useState<JenisDokumen | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const unduh = async (jenis: JenisDokumen) => {
    if (memuat) return;
    setMemuat(jenis); setGalat(null);
    const h = await unduhBapBastp(jadwalId, jenis);
    if (!h.ok) setGalat(h.pesan);
    setMemuat(null);
  };
  return (
    <section className="t-kartu mt-4" aria-labelledby="judul-dokumen">
      <p id="judul-dokumen" className="text-[15px] font-semibold flex items-center gap-2"><FileDown size={16} aria-hidden="true" />BAP &amp; BASTP</p>
      <p className="t-ket mt-1">Unduh untuk ditandatangani pihak rumah sakit. Isinya dari LKK yang sudah diterima server.</p>
      {belumTerkirim > 0 && (
        <p className="t-ket mt-1" role="status">{belumTerkirim} LKK di perangkat belum diterima server (draft/belum terkirim), jadi belum ikut dihitung.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {(['bap', 'bastp'] as JenisDokumen[]).map((jenis) => (
          <button key={jenis} type="button" className="t-tombol t-tombol-kedua t-tombol-kecil" aria-busy={memuat === jenis}
            onClick={() => { void unduh(jenis); }}>
            {memuat === jenis ? <Loader2 size={18} aria-hidden="true" className="t-putar" /> : <FileDown size={18} aria-hidden="true" />}
            {memuat === jenis ? 'Membuat PDF…' : jenis === 'bap' ? 'Unduh BAP' : 'Unduh BASTP'}
          </button>
        ))}
      </div>
      {galat && (
        <div className="t-info mt-3" role="alert">
          <AlertCircle size={20} aria-hidden="true" className="shrink-0" /><p className="min-w-0">{galat}</p>
        </div>
      )}
    </section>
  );
};

/* ---------- Pembantu ---------- */

const tgl = (v: string | null): string => {
  if (!v) return '';
  try {
    const d = new Date(v.length === 10 ? `${v}T00:00:00Z` : v);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: v.length === 10 ? 'UTC' : undefined });
  } catch { return ''; }
};

const rentangTgl = (a: string | null, b: string | null): string => {
  const x = tgl(a), y = tgl(b);
  if (x && y && x !== y) return `${x} – ${y}`;
  return x || y || 'Tanggal belum diisi';
};

const jam = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';

interface Total { po: number; dikerjakan: number; sisa: number }

function totalJadwal(j: JadwalLokal, lkk: LkkLokal[]): Total {
  let po = 0, dikerjakan = 0, sisa = 0;
  for (const a of hitungAlatPo(j, lkk)) { po += a.jumlah; dikerjakan += a.dikerjakan; sisa += a.sisa; }
  return { po, dikerjakan, sisa };
}

/** Bilah kemajuan: hanya `transform` yang bergerak. Tulisan angka selalu menyertai (bukan warna saja). */
const Bilah: React.FC<{ nilai: number; maks: number }> = ({ nilai, maks }) => {
  const rasio = maks > 0 ? Math.min(1, nilai / maks) : 0;
  return (
    <div className="t-bilah" aria-hidden="true">
      <div className="t-bilah-isi" style={{ transform: `scaleX(${rasio})` }} />
    </div>
  );
};

/* ---------- Status tarik jadwal ---------- */

const BarisStatusJadwal: React.FC = () => {
  const { statusJadwal: s, tarikJadwalSekarang, siap } = useSinkron();
  if (!siap || s.keadaan === 'belum' || s.keadaan === 'menarik') {
    return (
      <p className="t-ket flex items-center gap-2" role="status">
        <Loader2 size={16} aria-hidden="true" className="t-putar shrink-0" />Memeriksa jadwal baru…
      </p>
    );
  }
  if (s.keadaan === 'gagal') {
    return (
      <div className="t-info" role="status">
        <AlertCircle size={20} aria-hidden="true" className="shrink-0" />
        <div className="min-w-0">
          <p>{s.pesan || 'Jadwal belum bisa ditarik.'} Aplikasi memakai jadwal yang sudah ada di perangkat.</p>
          <button type="button" className="t-tombol t-tombol-kedua t-tombol-kecil" onClick={tarikJadwalSekarang}>
            <RefreshCw size={18} aria-hidden="true" />Coba lagi
          </button>
        </div>
      </div>
    );
  }
  return <p className="t-ket" role="status">Jadwal diperbarui pukul {jam(s.waktu)}.</p>;
};

/* ---------- Beranda ---------- */

const KartuRs: React.FC<{ j: JadwalLokal; t: Total; urut: number; tim: number | null }> = React.memo(({ j, t, urut, tim }) => (
  <li className="t-item-masuk" style={{ animationDelay: `${Math.min(urut, 8) * 40}ms` }}>
    <Link to={`/tera/rs/${encodeURIComponent(j.jadwalId)}`} className="t-rs-kartu">
      <div className="t-rs-utama">
        <p className="t-rs-nama">{j.namaRs}</p>
        <p className="t-ket t-rs-meta">
          <span className="tabular">BO {j.bo}</span>
          {j.kota ? <span> · {j.kota}</span> : null}
          {j.isTest ? <span> · data uji</span> : null}
        </p>
        <p className="t-ket">{rentangTgl(j.tanggalMulai, j.tanggalSelesai)}</p>
        <div className="t-rs-kemajuan">
          <Bilah nilai={t.dikerjakan} maks={t.po} />
          <p className="t-ket tabular">
            {t.po === 0 ? 'Belum ada alat PO' : `${t.dikerjakan} dari ${t.po} dikerjakan · sisa ${t.sisa}`}
          </p>
          {tim !== null && t.po > 0 && (
            <p className="t-ket tabular flex items-center gap-1"><Users size={14} aria-hidden="true" />Tim: {Math.min(tim, t.po)} dari {t.po} dikerjakan</p>
          )}
        </div>
      </div>
      <ChevronRight size={20} aria-hidden="true" className="t-rs-panah" />
    </Link>
  </li>
));
KartuRs.displayName = 'KartuRs';

export const HalamanBeranda: React.FC = () => {
  const { jadwal, daftar, siap, tim } = useSinkron();
  const baris = useMemo(() => jadwal.map((j) => {
    const rt = ringkasTim(j, daftar, tim);
    return { j, t: totalJadwal(j, daftar), tim: rt.teman.length > 0 ? rt.totalTim : null };
  }), [jadwal, daftar, tim]);
  const jumlah = useMemo(() => baris.reduce((a, b) => ({ po: a.po + b.t.po, dikerjakan: a.dikerjakan + b.t.dikerjakan, sisa: a.sisa + b.t.sisa }), { po: 0, dikerjakan: 0, sisa: 0 }), [baris]);

  return (
    <>
      <h1 className="t-judul-layar">Beranda</h1>
      <div className="mt-4"><Statistik /></div>
      <div className="t-belah mt-6">
        <section aria-labelledby="judul-rs">
          <h2 id="judul-rs" className="t-judul-bagian">Rumah sakit aktif</h2>
          <div className="mt-2"><BarisStatusJadwal /></div>
          <div className="mt-3">
            {!siap ? (
              <p className="t-teks-2 flex items-center gap-2 text-[15px]" role="status">
                <Loader2 size={20} aria-hidden="true" className="t-putar" />Membuka data di perangkat…
              </p>
            ) : baris.length === 0 ? (
              <KeadaanKosong
                ikon={Building2}
                judul="Belum ada jadwal"
                pesan="Hubungi Admin Teknik agar jadwal dikirim (Push) ke aplikasi ini."
              />
            ) : (
              <ul className="t-rs-daftar" aria-label={`${baris.length} rumah sakit aktif`}>
                {baris.map(({ j, t, tim: nt }, i) => <KartuRs key={j.id} j={j} t={t} tim={nt} urut={i} />)}
              </ul>
            )}
          </div>
        </section>
        <aside className="t-ringkasan" aria-labelledby="judul-ringkasan">
          <h2 id="judul-ringkasan" className="t-judul-bagian">Ringkasan</h2>
          <div className="t-kartu mt-3">
            {baris.length === 0 ? (
              <p className="t-teks-2 text-[15px]">Pilih rumah sakit di daftar untuk melihat alat PO, jumlah yang sudah dikerjakan, dan sisanya.</p>
            ) : (
              <dl className="t-ringkas-angka">
                <div><dt>Rumah sakit</dt><dd className="tabular">{baris.length}</dd></div>
                <div><dt>Alat PO</dt><dd className="tabular">{jumlah.po}</dd></div>
                <div><dt>Dikerjakan</dt><dd className="tabular">{jumlah.dikerjakan}</dd></div>
                <div><dt>Sisa</dt><dd className="tabular">{jumlah.sisa}</dd></div>
              </dl>
            )}
          </div>
        </aside>
      </div>
    </>
  );
};

/* ---------- Papan Tim (28 Okt 2026): LKK teman satu jadwal, hanya dilihat ---------- */

const PapanTim: React.FC<{ rt: RingkasTim | null; tim: TimLokal | null; namaAlat: (kode: string | null) => string }> = ({ rt, tim, namaAlat }) => (
  <section className="mt-6" aria-labelledby="judul-tim">
    <h2 id="judul-tim" className="t-judul-bagian flex items-center gap-2"><Users size={18} aria-hidden="true" />Dikerjakan teman satu tim</h2>
    <p className="t-ket mt-1">
      {tim ? `Diperbarui pukul ${jam(tim.diambilAt)} (otomatis saat ada sinyal).` : 'Belum pernah diperbarui — butuh sinyal sekali.'}
      {' '}Hanya nomor stiker & status; isi LKK teman tidak bisa dibuka.
    </p>
    <div className="mt-3">
      {!rt || rt.teman.length === 0 ? (
        <p className="t-teks-2 text-[15px]">Belum ada LKK dari teman satu tim di rumah sakit ini.</p>
      ) : (
        <ul className="t-alat-daftar" aria-label={`${rt.teman.length} teman`}>
          {rt.teman.map((g) => (
            <li key={g.userId} className="t-alat-baris">
              <div className="t-alat-atas">
                <p className="t-alat-nama">{g.nama}</p>
                <span className="t-chip-sync" data-jenis="tersimpan"><span className="tabular">{g.lkk.length} alat</span></span>
              </div>
              <ul className="mt-1" aria-label={`LKK ${g.nama}`}>
                {g.lkk.map((l) => (
                  <li key={l.noLabel} className="t-ket tabular">
                    {l.noLabel} · {namaAlat(l.templateKode)}{l.alatTambahan ? ' · alat tambahan' : ''} · {statusTeman(l.status)}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  </section>
);

/* ---------- Detail RS ---------- */

export const HalamanDetailRs: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { jadwal, daftar, siap, dorong, statusJadwal, tim } = useSinkron();
  const [templates, setTemplates] = useState<TemplateApa[]>([]);
  const [lembar, setLembar] = useState<{ alat: HitunganAlat | null } | null>(null);
  const [kabar, setKabar] = useState<{ jenis: 'ok' | 'info'; teks: string } | null>(null);
  const [tanpaTemplate, setTanpaTemplate] = useState<string | null>(null);

  // Template di perangkat (bawaan kode + hasil tarik dari server); dibaca ulang tiap master ditarik
  useEffect(() => {
    let hidup = true;
    daftarTemplateTerbaru().then((t) => { if (hidup) setTemplates(t); }).catch(() => { /* tetap pakai yang ada */ });
    return () => { hidup = false; };
  }, [statusJadwal.waktu]);

  const j = useMemo(() => jadwal.find((x) => x.jadwalId === id) || null, [jadwal, id]);
  const alat = useMemo(() => (j ? hitungAlatPo(j, daftar) : []), [j, daftar]);
  const lkk = useMemo(() => (j ? daftar.filter((l) => l.jadwalId === j.jadwalId) : []), [j, daftar]);
  const t = useMemo(() => alat.reduce((a, b) => ({ po: a.po + b.jumlah, dikerjakan: a.dikerjakan + b.dikerjakan, sisa: a.sisa + b.sisa }), { po: 0, dikerjakan: 0, sisa: 0 }), [alat]);
  const rt = useMemo(() => (j ? ringkasTim(j, daftar, tim) : null), [j, daftar, tim]);
  const adaTeman = !!rt && rt.teman.length > 0;
  const totalTim = rt ? Math.min(rt.totalTim, t.po) : 0;

  const kembali = (
    <Link to="/tera/" className="t-kembali">
      <ChevronLeft size={20} aria-hidden="true" />Beranda
    </Link>
  );

  if (!siap) {
    return (
      <>
        {kembali}
        <p className="t-teks-2 mt-4 flex items-center gap-2 text-[15px]" role="status">
          <Loader2 size={20} aria-hidden="true" className="t-putar" />Membuka data di perangkat…
        </p>
      </>
    );
  }

  if (!j) {
    return (
      <>
        {kembali}
        <div className="mt-4">
          <KeadaanKosong
            ikon={Building2}
            judul="Jadwal ini tidak ada lagi"
            pesan="Jadwal mungkin ditarik kembali oleh Admin Teknik. LKK yang sudah Anda isi tetap aman di menu LKK."
          />
        </div>
      </>
    );
  }

  return (
    <>
      {kembali}
      <h1 className="t-judul-layar t-rs-judul mt-2">{j.namaRs}</h1>
      <p className="t-ket mt-1">
        <span className="tabular">BO {j.bo}</span>
        {j.kota ? ` · ${j.kota}` : ''}
        {j.isTest ? ' · data uji' : ''}
        {' · '}{rentangTgl(j.tanggalMulai, j.tanggalSelesai)}
      </p>

      <ul className="t-statistik mt-4" aria-label="Ringkasan PO rumah sakit ini">
        <li className="t-stat" data-jenis="send"><span className="t-stat-angka">{t.po}</span><span className="t-stat-label">Alat PO</span></li>
        <li className="t-stat" data-jenis="wait"><span className="t-stat-angka">{t.dikerjakan}</span><span className="t-stat-label">{adaTeman ? 'Dikerjakan saya' : 'Dikerjakan'}</span></li>
        {adaTeman ? (
          <li className="t-stat" data-jenis={t.po > 0 && totalTim >= t.po ? 'ok' : 'wait'}><span className="t-stat-angka">{Math.max(0, t.po - totalTim)}</span><span className="t-stat-label">Sisa tim</span></li>
        ) : (
          <li className="t-stat" data-jenis={t.po > 0 && t.sisa === 0 ? 'ok' : 'wait'}><span className="t-stat-angka">{t.sisa}</span><span className="t-stat-label">Sisa</span></li>
        )}
      </ul>
      {adaTeman && t.po > 0 && (
        <div className="t-rs-kemajuan mt-3">
          <Bilah nilai={totalTim} maks={t.po} />
          <p className="t-ket tabular">Progres tim: {totalTim} dari {t.po} PO dikerjakan (saya {t.dikerjakan} · teman {totalTim - t.dikerjakan})</p>
        </div>
      )}

      <section className="t-kartu mt-4" aria-label="Nomor stiker">
        <p className="text-[15px] font-semibold flex items-center gap-2"><Tag size={16} aria-hidden="true" />Nomor stiker</p>
        <p className="t-ket mt-1 tabular">Utama: {j.labelAwal} – {j.labelAkhir}</p>
        <p className="t-ket tabular">
          {j.cadanganAwal && j.cadanganAkhir ? `Cadangan (alat tambahan): ${j.cadanganAwal} – ${j.cadanganAkhir}` : 'Tidak ada stiker cadangan.'}
        </p>
      </section>

      <DokumenRs jadwalId={j.jadwalId} belumTerkirim={lkk.filter((l) => l.syncState !== 'diterima').length} />

      {kabar && (
        <div className={kabar.jenis === 'ok' ? 't-sukses mt-4' : 't-info mt-4'} role="status">
          {kabar.jenis === 'ok' ? <Check size={20} aria-hidden="true" className="shrink-0" /> : <AlertCircle size={20} aria-hidden="true" className="shrink-0" />}
          <p className="min-w-0">{kabar.teks}</p>
        </div>
      )}

      <section className="mt-6" aria-labelledby="judul-alat">
        <h2 id="judul-alat" className="t-judul-bagian">Alat PO</h2>
        {alat.length === 0 ? (
          <div className="mt-3">
            <KeadaanKosong ikon={ClipboardCheck} judul="Belum ada alat di PO" pesan="Hubungi Admin Teknik untuk memeriksa daftar alat jadwal ini." />
          </div>
        ) : (
          <ul className="t-alat-daftar mt-3" aria-label={`${alat.length} jenis alat`}>
            {alat.map((a) => (
              <li key={a.ref} className="t-alat-baris">
                <div className="t-alat-atas">
                  <p className="t-alat-nama">{a.nama}</p>
                  {a.sisa === 0 && a.jumlah > 0 ? (
                    <span className="t-chip-sync" data-jenis="diterima"><Check size={14} aria-hidden="true" className="t-chip-sync-ikon" /><span>Selesai</span></span>
                  ) : (
                    <span className="t-chip-sync" data-jenis="tersimpan"><span className="tabular">Sisa {a.sisa}</span></span>
                  )}
                </div>
                <Bilah nilai={a.dikerjakan} maks={a.jumlah} />
                <p className="t-ket tabular">PO {a.jumlah} · dikerjakan {a.dikerjakan} · sisa {a.sisa}</p>
                {adaTeman && (rt!.poTim.get(a.ref) || 0) > a.dikerjakan && (
                  <p className="t-ket tabular">Termasuk teman: {Math.min(rt!.poTim.get(a.ref) || 0, a.jumlah)} dari {a.jumlah} · sisa tim {Math.max(0, a.jumlah - (rt!.poTim.get(a.ref) || 0))}</p>
                )}
                {a.sisa > 0 && (
                  <div className="t-alat-aksi">
                    <button
                      type="button" className="t-tombol t-tombol-utama t-tombol-kecil"
                      aria-describedby={tanpaTemplate === a.ref ? `ket-tpl-${a.ref}` : undefined}
                      onClick={() => {
                        setKabar(null);
                        if (!templateUntukAlat(a.nama, templates)) { setTanpaTemplate(a.ref); return; }
                        setTanpaTemplate(null);
                        setLembar({ alat: a });
                      }}
                    >
                      <Plus size={18} aria-hidden="true" />Mulai LKK
                    </button>
                    {tanpaTemplate === a.ref && (
                      <p id={`ket-tpl-${a.ref}`} className="t-ket mt-2" role="status">
                        Template untuk alat ini belum tersedia di aplikasi. Hubungi Developer.
                      </p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4" style={{ maxWidth: 420 }}>
          <button
            type="button" className="t-tombol t-tombol-kedua" aria-describedby="ket-tambahan"
            onClick={() => {
              setTanpaTemplate(null);
              if (!j.cadanganAwal || !j.cadanganAkhir) {
                setKabar({ jenis: 'info', teks: 'Jadwal ini tidak punya stiker cadangan, jadi belum bisa menambah alat. Hubungi Admin Teknik.' });
                return;
              }
              setKabar(null);
              setLembar({ alat: null });
            }}
          >
            <Plus size={18} aria-hidden="true" />Alat tambahan
          </button>
          <p id="ket-tambahan" className="t-ket mt-2">Alat di luar PO. Memakai stiker cadangan dan tidak mengurangi jatah PO.</p>
        </div>
      </section>

      <PapanTim rt={rt} tim={tim} namaAlat={(k) => (k ? templates.find((x) => x.kode_alat === k)?.nama || k.replace(/_/g, ' ') : '-')} />

      <section className="mt-6" aria-labelledby="judul-lkk-rs">
        <h2 id="judul-lkk-rs" className="t-judul-bagian">LKK di rumah sakit ini</h2>
        <div className="mt-3">
          {lkk.length === 0 ? (
            <KeadaanKosong ikon={ClipboardCheck} judul="Belum ada LKK" pesan="LKK untuk rumah sakit ini akan muncul di sini setelah dibuat." />
          ) : (
            <ul className="t-lkk-daftar" aria-label={`${lkk.length} LKK`}>
              {lkk.map((l) => <BarisLkk key={l.id} l={l} />)}
            </ul>
          )}
        </div>
      </section>
      {lembar && (
        <MulaiLkk
          jadwal={j} alat={lembar.alat} templates={templates} pemilik={j.pemilik}
          cekTeman={(n) => pemakaiNomor(tim, j.jadwalId, n)}
          onTutup={() => setLembar(null)}
          onDibuat={(l) => {
            setLembar(null);
            dorong();
            navigate(`/tera/lkk/${encodeURIComponent(l.id)}`);   // langsung ke layar isi LKK (4.3c)
          }}
        />
      )}
    </>
  );
};
