# Infusion Pump — buat "kertas cetak" Report All dari PDF cetakan Excel (Master_" + NAMA.replace(' ', '_') + "_terisi.pdf, 26 Okt 2026)
# + tata letak isian (src/tera/pdf/tataLetakPompa.ts). Teks PDF Excel memakai font tanpa pemetaan Unicode (tidak bisa dibaca
# sebagai teks), jadi isian dikenali dari POSISI (halaman, garis dasar, rentang x) — bukan dari isinya.
#   python3 tools/tera/buat_templat_pompa.py <Master_..._terisi.pdf> <templat-keluaran.pdf> <tataLetakPompa.ts>
import sys, json, pikepdf, pdfplumber

SRC, DST, TS = sys.argv[1], sys.argv[2], sys.argv[3]
KODE = sys.argv[4] if len(sys.argv) > 4 else 'infusion_pump'   # 'infusion_pump', 'syringe_pump' atau 'keselamatan_listrik'
NAMA = {'infusion_pump': 'Infusion Pump', 'syringe_pump': 'Syringe Pump', 'keselamatan_listrik': 'Keselamatan Listrik', 'nibp': 'NIBP'}[KODE]
BERKAS = 'templat-' + KODE.replace('_', '-') + '.pdf'
# (halaman, garis dasar y dari atas, x awal-min, x awal-maks, kunci, rata, x-jangkar|None=awal, huruf, ukuran, garis bawah)
F = []
# Halaman 2 & 3: seluruh isi diturunkan 8 poin supaya jarak kotak Nomor Order / Nomor Sertifikat ke baris e-mail kop
# SAMA dengan sertifikat Sphygmomanometer (kotak di y 112,91; acuan Excel y 104,91). ATURAN TETAP untuk semua sertifikat
# (Ridhwan 26 Okt 2026 19.26; sebelumnya 24,7 poin = terlalu jauh). Teks kaki (y > 760) tetap di tempatnya.
GESER = {2: 8.0, 3: 8.0}
KIRI = 292  # batas kanan isian kolom kiri (label kolom kanan mulai x≈297)
def f(p, y, lo, hi, k, a='l', ax=None, h='r', s=9.96, u=0, m=None, ty=0.6): F.append(dict(p=p, y=y, lo=lo, hi=hi, k=k, a=a, ax=ax, h=h, s=s, u=u, m=m, ty=ty))

if KODE == 'nibp':
    # Report All NIBP: hlm 1 sama dengan pompa (dengan Rentang & Resolusi), hlm 2 dua baris standar (NIBP Simulator,
    # termohigrometer), hlm 3 tabel NIBP 12 baris (Pembacaan Standar & Diskripsi = teks tetap; Pembacaan Alat, Koreksi,
    # Ketidakpastian = isian) + kesimpulan. Tanpa tabel keselamatan listrik (keputusan Ridhwan 26 Okt 2026).
    f(1, 176.4, 145, 199.2, 'nomorOrder', m=KIRI); f(1, 176.4, 398, 480, 'nomorSertifikat')
    f(1, 213.6, 145, 215, 'tanggalTerbit', m=KIRI); f(1, 213.6, 398, 468, 'kalibrasiUlang')
    f(1, 294.9, 145, 313, 'namaPelanggan'); f(1, 321.0, 145, 300, 'alamatPelanggan')
    f(1, 401.9, 145, 290, 'namaAlat', m=KIRI); f(1, 401.9, 398, 470, 'noSeri')
    f(1, 438.2, 145, 178, 'merek', m=KIRI); f(1, 438.2, 405, 446, 'rentangUkur', 'r', 445.45); f(1, 438.2, 448, 480, 'satuanRentang', 'l', 449.0)
    f(1, 474.4, 145, 240, 'tipe', m=KIRI); f(1, 474.4, 432, 446, 'resolusi', 'r', 445.45); f(1, 474.4, 448, 480, 'satuanResolusi', 'l', 449.0)
    f(1, 523.0, 196, 266, 'tanggalPenerimaan')
    f(1, 680.0, 44, 188, 'penandatanganNama', s=11.04); f(1, 695.1, 44, 117, 'penandatanganJabatan', h='b', s=11.04); f(1, 706.9, 44, 107, 'penandatanganJabatanEn', h='i', s=8.04)
    f(2, 104.9, 145, 200, 'nomorOrder', m=KIRI); f(2, 104.9, 398, 480, 'nomorSertifikat')
    f(2, 157.34, 44, 600, 'kalibrator1', s=9); f(2, 169.7, 44, 600, 'kalibrator2', s=9)
    f(2, 197.54, 145, 310, 'tempat', m=KIRI, ty=0.2); f(2, 197.54, 398, 468, 'tanggalPelaksanaan')
    f(2, 212.78, 145, 247, 'ruang', m=KIRI, ty=0.2); f(2, 212.78, 398, 530, 'teknisi')
    f(2, 262.13, 138, 194, 'suhuRuang', 'r', 192.89, ty=0.2); f(2, 262.13, 404, 446.5, 'rhRuang', 'r', 445.46, ty=0.2)
    for i, y in enumerate([351.52, 366.04, 380.56], 1):
        f(2, y, 388, 406, f'fisik{i}', 'c', 397.09); f(2, y, 479, 518, f'fungsi{i}', 'c', 498.17)
    f(3, 104.9, 145, 200, 'nomorOrder', m=KIRI); f(3, 104.9, 398, 480, 'nomorSertifikat')
    for i, y in enumerate([251.42, 276.17, 300.88, 325.6, 350.32, 375.04, 399.76, 424.47, 449.21, 473.93, 498.65, 523.37]):
        f(3, y, 280, 312, f'n{i}_alat', 'c', 295.7); f(3, y, 380, 412, f'n{i}_kor', 'c', 396.73); f(3, y, 480, 512, f'n{i}_u', 'c', 497.71)
    f(3, 605.08, 145, 300, 'kesimpulan', 'l', None, 'b', 11.04, 1)
    Y_TEMPAT, Y_RUANG = 197.54, 212.78
elif KODE == 'keselamatan_listrik':
    # Report All Keselamatan Listrik ("SERTIFIKAT PENGUJIAN"): hlm 1 tanpa Rentang/Resolusi, hlm 2 dua baris standar,
    # hlm 3 tabel listrik 5 baris (Terukur + Toleransi menurut klasifikasi) + kesimpulan.
    f(1, 176.4, 145, 199.2, 'nomorOrder', m=KIRI); f(1, 176.4, 398, 480, 'nomorSertifikat')
    f(1, 213.6, 145, 215, 'tanggalTerbit', m=KIRI); f(1, 213.6, 398, 468, 'kalibrasiUlang')
    f(1, 294.9, 145, 313, 'namaPelanggan'); f(1, 321.0, 145, 300, 'alamatPelanggan')
    f(1, 401.9, 145, 280, 'namaAlat', m=KIRI); f(1, 401.9, 398, 465, 'noSeri')
    f(1, 438.15, 145, 160, 'merek', m=KIRI)
    f(1, 474.4, 145, 240, 'tipe', m=KIRI)
    f(1, 523.0, 196, 266, 'tanggalPenerimaan')
    f(1, 680.0, 44, 188, 'penandatanganNama', s=11.04); f(1, 695.1, 44, 117, 'penandatanganJabatan', h='b', s=11.04); f(1, 706.9, 44, 107, 'penandatanganJabatanEn', h='i', s=8.04)
    f(2, 104.9, 145, 200, 'nomorOrder', m=KIRI); f(2, 104.9, 398, 480, 'nomorSertifikat')
    f(2, 165.14, 44, 600, 'kalibrator1', s=9); f(2, 177.5, 44, 600, 'kalibrator2', s=9)
    # Isian Tempat di acuan meluber sampai x≈309, sebaris dengan label "Tanggal" (y 225,14): toleransi y dipersempit agar label tidak ikut terhapus
    f(2, 224.78, 145, 310, 'tempat', m=KIRI, ty=0.2); f(2, 224.78, 398, 468, 'tanggalPelaksanaan')
    f(2, 240.02, 145, 247, 'ruang', m=KIRI); f(2, 240.02, 398, 530, 'teknisi')
    f(2, 289.36, 141, 194, 'suhuRuang', 'r', 192.89); f(2, 289.36, 404, 446.5, 'rhRuang', 'r', 445.46)
    for i, y in enumerate([378.76, 393.28, 407.8], 1):
        f(2, y, 388, 406, f'fisik{i}', 'c', 397.09); f(2, y, 479, 518, f'fungsi{i}', 'c', 498.17)
    f(3, 104.9, 145, 200, 'nomorOrder', m=KIRI); f(3, 104.9, 398, 480, 'nomorSertifikat')
    for i, y in enumerate([238.34, 257.78, 277.25, 296.68, 316.12]):
        f(3, y, 405, 440, f'listrik{i}', 'c', 422.4); f(3, y, 450, 495, f'tol{i}', 'c', 472.55)
    f(3, 372.4, 145, 300, 'kesimpulan', 'l', None, 'b', 11.04, 1)
    Y_TEMPAT, Y_RUANG = 224.78, 240.02
else:
    # ── halaman 1
    f(1, 176.4, 145, 199.2, 'nomorOrder', m=KIRI); f(1, 176.4, 398, 480, 'nomorSertifikat')
    f(1, 213.6, 145, 215, 'tanggalTerbit', m=KIRI); f(1, 213.6, 398, 468, 'kalibrasiUlang')
    f(1, 294.9, 145, 313, 'namaPelanggan'); f(1, 321.0, 145, 300, 'alamatPelanggan')
    f(1, 401.9, 145, 206, 'namaAlat', m=KIRI); f(1, 401.9, 398, 458, 'noSeri')
    f(1, 438.2, 145, 178, 'merek', m=KIRI); f(1, 438.2, 417, 446, 'rentangUkur', 'r', 445.45); f(1, 438.2, 448, 471, 'satuanRentang', 'l', 449.0)
    f(1, 474.4, 145, 228, 'tipe', m=KIRI); f(1, 474.4, 432, 446, 'resolusi', 'r', 445.45); f(1, 474.4, 448, 471, 'satuanResolusi', 'l', 449.0)
    f(1, 523.0, 196, 266, 'tanggalPenerimaan')
    f(1, 680.0, 44, 188, 'penandatanganNama', s=11.04); f(1, 695.1, 44, 117, 'penandatanganJabatan', h='b', s=11.04); f(1, 706.9, 44, 107, 'penandatanganJabatanEn', h='i', s=8.04)
    # ── halaman 2
    f(2, 104.9, 145, 200, 'nomorOrder', m=KIRI); f(2, 104.9, 398, 480, 'nomorSertifikat')
    # Baris standar 9 pt (Ridhwan 26 Okt 2026: lebih kecil, ujung kanan dibiarkan tidak rata)
    f(2, 157.8, 44, 600, 'kalibrator1', s=9); f(2, 170.2, 44, 600, 'kalibrator2', s=9); f(2, 182.5, 44, 600, 'kalibrator3', s=9)
    f(2, 229.8, 145, 296, 'tempat', m=KIRI); f(2, 229.8, 398, 468, 'tanggalPelaksanaan')
    f(2, 245.1, 145, 247, 'ruang', m=KIRI); f(2, 245.1, 398, 530, 'teknisi')
    f(2, 294.4, 141, 194, 'suhuRuang', 'r', 192.89); f(2, 294.4, 414, 446.5, 'rhRuang', 'r', 445.46)
    for i, y in enumerate([383.8, 398.3, 412.8], 1):
        f(2, y, 388, 406, f'fisik{i}', 'c', 397.09); f(2, y, 479, 518, f'fungsi{i}', 'c', 498.17)
    # ── halaman 3
    f(3, 104.9, 145, 200, 'nomorOrder', m=KIRI); f(3, 104.9, 398, 480, 'nomorSertifikat')
    for i, y in enumerate([221.4, 240.9, 260.3, 279.8]): f(3, y, 405, 440, f'listrik{i}', 'c', 422.4)
    for i, y in enumerate([387.3, 406.7, 426.2, 445.6, 465.1]):
        f(3, y, 80, 106, f'a{i}_alat', 'c', 93.65); f(3, y, 178, 210, f'a{i}_std', 'c', 194.6)
        f(3, y, 284, 308, f'a{i}_kor', 'c', 295.7); f(3, y, 385, 408, f'a{i}_u', 'c', 396.7)
    f(3, 577.2, 80, 106, 'sumbatSetting', 'c', 93.6); f(3, 577.2, 185, 203, 'sumbatStd', 'c', 194.6); f(3, 577.2, 385, 408, 'sumbatU', 'c', 396.7)
    f(3, 636.9, 145, 300, 'kesimpulan', 'l', None, 'b', 11.04, 1)
    # Infusion: "≤20psi" pada "Toleransi Occlusion" diganti "<20psi" sesuai KMK-MK-053.0 butir 53.9.2 (disetujui Ridhwan 26 Okt 2026 05.01).
    # Syringe sudah tertulis "<20psi" di Excel, tidak disentuh.
    if KODE == 'infusion_pump':
        f(3, 594.04, 127, 152, 'tolSumbat')
    Y_TEMPAT, Y_RUANG = 229.8, 245.1

pdf = pikepdf.open(SRC)
laporan, ops = [], {1: [], 2: [], 3: []}
kena = {id(x): 0 for x in F}
for pi, pg in enumerate(pdf.pages):
    H = float(pg.mediabox[3]); P = pi + 1
    nama_font = {}
    for k, v in pg.Resources.get('/Font', {}).items():
        nama_font[str(k)] = str(v.get('/BaseFont', ''))
    isi = pikepdf.parse_content_stream(pg)
    baru, i, dibuang, gs = [], 0, 0, [{'cs': None, 'sc': None, 'cm': (1, 0, 0, 1, 0, 0)}]
    re_akhir = None; garis = 0
    medan = [x for x in F if x['p'] == P]
    while i < len(isi):
        o = isi[i]; op = str(o.operator)
        if op == 're': re_akhir = [float(x) for x in o.operands]
        if op in ('f', 'f*') and re_akhir and re_akhir[3] < 1.2:
            rx, ry, rw, rh = re_akhir; yt = H - (ry + rh)
            if any(m['u'] and m['y'] - 1 <= yt <= m['y'] + 3 and m['lo'] - 3 <= rx <= m['hi'] + 120 for m in medan):
                garis += 1; baru.append(pikepdf.ContentStreamInstruction([], pikepdf.Operator('n'))); i += 1; continue
        if op == 'q': gs.append(dict(gs[-1])); baru.append(o); i += 1; continue
        if op == 'Q': gs.pop(); baru.append(o); i += 1; continue
        if op == 'cm': gs[-1]['cm'] = tuple(float(x) for x in o.operands); baru.append(o); i += 1; continue
        if op == 'cs': gs[-1]['cs'] = str(o.operands[0]); baru.append(o); i += 1; continue
        if op in ('sc', 'scn'): gs[-1]['sc'] = [str(x) for x in o.operands]; baru.append(o); i += 1; continue
        if op in ('f', 'f*') and gs[-1]['cs'] == '/Cs1' and gs[-1]['sc'] == ['1']:
            baru.append(pikepdf.ContentStreamInstruction([], pikepdf.Operator('n'))); i += 1; continue  # latar putih sel → tidak dicat
        if op == 'BT':
            j = i
            while str(isi[j].operator) != 'ET': j += 1
            blok = isi[i:j + 1]
            tm = [b for b in blok if str(b.operator) == 'Tm'][0]
            a, b_, c, d, e, f_ = [float(x) for x in tm.operands]
            ca, cb, cc, cd, ce, cf = gs[-1]['cm']
            x = ca * e + ce; ytop = H - (cd * f_ + cf)
            m = next((m for m in medan if abs(m['y'] - ytop) < m['ty'] and m['lo'] <= x <= m['hi']), None)
            if not m and P in GESER and ytop > 760:  # teks kaki: batalkan geseran
                baru.append(pikepdf.ContentStreamInstruction([], pikepdf.Operator('q')))
                baru.append(pikepdf.ContentStreamInstruction([1, 0, 0, 1, 0, GESER[P] / cd], pikepdf.Operator('cm')))
                baru.extend(blok); baru.append(pikepdf.ContentStreamInstruction([], pikepdf.Operator('Q')))
                i = j + 1; continue
            if m:
                dibuang += 1; kena[id(m)] += 1; m.setdefault('x0', x); m.setdefault('y0', ytop)
                if x < m['x0']: m['x0'] = x
                i = j + 1; continue
        baru.append(o); i += 1
    if P in GESER:
        baru = [pikepdf.ContentStreamInstruction([], pikepdf.Operator('q')), pikepdf.ContentStreamInstruction([1, 0, 0, 1, 0, -GESER[P]], pikepdf.Operator('cm'))] + baru + [pikepdf.ContentStreamInstruction([], pikepdf.Operator('Q'))]
    pg.Contents = pdf.make_stream(pikepdf.unparse_content_stream(baru))
    laporan.append((P, 'blok isian dibuang', dibuang, 'garis bawah', garis))
pdf.save(DST)
# Sel tanggal di PDF acuan Syringe Pump kosong (tidak ada tulisan untuk dilacak) — posisinya sama persis dengan Infusion Pump
# (susunan sel Excel identik), jadi dipakai posisi yang sudah terbukti di sertifikat Infusion Pump yang disetujui.
CADANGAN = {('tanggalTerbit', 1): (145.81, 213.62), ('kalibrasiUlang', 1): (398.44, 213.62),
            ('tanggalPenerimaan', 1): (196.36, 523.01), ('tanggalPelaksanaan', 2): (398.44, 229.82 + GESER[2])}  # y acuan Excel 229,82 + geser halaman 2
if KODE == 'syringe_pump':
    for x in F:
        if kena[id(x)] == 0 and (x['k'], x['p']) in CADANGAN:
            cx, cy = CADANGAN[(x['k'], x['p'])]
            x['x0'], x['y0'], x['ax'] = cx, cy - GESER.get(x['p'], 0), None
            kena[id(x)] = 1
kosong = [x['k'] + '@%s' % x['p'] for x in F if kena[id(x)] == 0]
print(laporan); print('isian tanpa teks di acuan:', kosong)

# ── tata letak
# Nama Pelanggan & Alamat: isian diluruskan ke garis dasar labelnya ("Nama Pelanggan:" y 296,8; "Alamat:" y 322,96) —
# di cetakan Excel isian 1,92 pt lebih tinggi (permintaan Ridhwan 26 Okt 2026 18.36).
LURUS = {('namaPelanggan', 1): 296.8, ('alamatPelanggan', 1): 322.96}
for x in F:
    if (x['k'], x['p']) in LURUS and 'y0' in x: x['y0'] = LURUS[(x['k'], x['p'])]
def num(v): return ('%.2f' % v).rstrip('0').rstrip('.')
baris = {1: [], 2: [], 3: []}
for x in F:
    if kena[id(x)] == 0: continue
    ax = x['ax'] if x['ax'] is not None else x['x0']
    ops_s = '{j:"f",x:%s,y:%s,f:"%s",s:%s,a:"%s",k:"%s"%s}' % (num(ax), num(x['y0'] + GESER.get(x['p'], 0)), x['h'], num(x['s']), x['a'], x['k'], (',u:1' if x['u'] else '') + (',m:%s' % num(x['m']) if x['m'] else ''))
    baris[x['p']].append('      ' + ops_s)
sat = ["/**", " * TATA LETAK SERTIFIKAT — " + NAMA + " (Report All), 3 halaman A4. DIHASILKAN oleh tools/tera/buat_templat_pompa.py", " * dari PDF cetakan Excel Ridhwan (Master_" + NAMA.replace(' ', '_') + "_terisi.pdf, 26 Okt 2026). Hanya posisi ISIAN (j:'f') yang disimpan;",
       " * semua teks tetap, garis & kotak biru ada di kertas cetak " + BERKAS + ". Jangan diedit tangan.", " */",
       "import type { TataLetak } from './susunSertifikat.js';", "", "export const TATA_LETAK_" + KODE.upper() + ": TataLetak = {",
       "  kode: 'report_all_" + KODE + "',", "  halaman: 3,", "  ukuran: { lebar: 595.2756, tinggi: 841.8898 },", "  biru: [],", "  kotak: {},",
       "  // Tempat/Tanggal/Ruangan/Teknisi kepanjangan → 2 baris (ukuran huruf sama), isi di bawahnya turun (Ridhwan 26 Okt 2026)",
       "  duaBaris: { 2: { baris: [{ k: ['tempat', 'tanggalPelaksanaan'], dari: %s }, { k: ['ruang', 'teknisi'], dari: %s }], sampai: 750, jarak: 12.2 } }," % (num(Y_TEMPAT + GESER[2] + 5.0), num(Y_RUANG + GESER[2] + 4.7)), "  teks: {"]
for p in (1, 2, 3):
    sat.append('    %d: [' % p); sat.append(',\n'.join(baris[p])); sat.append('    ],')
sat += ["  },", "};", ""]
open(TS, 'w').write('\n'.join(sat))
