#!/usr/bin/env python3
"""Tahap 5 - bikin 'kertas cetak' BAP & BASTP dari PDF contoh kantor.

Cara pakai:  python3 tools/tera/buat_templat_bap_bastp.py FOLDER_CONTOH FOLDER_HASIL
  FOLDER_CONTOH berisi bap.pdf dan bastp.pdf (contoh isian kantor, TIDAK ikut commit).
  FOLDER_HASIL  menerima 4 PDF bersih: bap-kepala, bap-ekor, bastp, bastp-tanpa-ringkasan.

Yang dihapus hanya ISIAN (nama RS, nomor, alamat, isi tabel, angka, tanda tangan).
Teks tetap, garis, tabel, logo, dan kop dibiarkan apa adanya.
PDF contoh berasal dari iOS/Quartz: tiap huruf = satu blok BT..ET, jadi
pengelompokan dilakukan lewat POSISI (bukan isi teks).
"""
import sys, os, pikepdf

def kali(a, b):  # gabung dua matriks PDF (a dulu, lalu b)
    return (a[0]*b[0]+a[1]*b[2], a[0]*b[1]+a[1]*b[3],
            a[2]*b[0]+a[3]*b[2], a[2]*b[1]+a[3]*b[3],
            a[4]*b[0]+a[5]*b[2]+b[4], a[4]*b[1]+a[5]*b[3]+b[5])

def saring(pdf, hal, aturan_huruf, aturan_rect=None, buang_gambar=()):
    pg = pdf.pages[hal]
    H = float(pg.mediabox[3])
    ops = list(pikepdf.parse_content_stream(pg))
    gs = [(1, 0, 0, 1, 0, 0)]
    buang = set()
    out_ganti = {}
    bt_mulai = None; bt_info = None; fs = 0.0; font = ''
    fonts = pg.Resources.Font
    pend_re = []
    for i, (o, op) in enumerate(ops):
        s = str(op)
        if s == 'q': gs.append(gs[-1])
        elif s == 'Q': gs.pop()
        elif s == 'cm': gs[-1] = kali(tuple(float(x) for x in o), gs[-1])
        elif s == 'BT': bt_mulai = i; bt_info = None
        elif s == 'Tf':
            font = str(fonts[o[0]].BaseFont); fs = float(o[1])
        elif s == 'Tm':
            m = tuple(float(x) for x in o); A = gs[-1]
            x = m[4]*A[0]+m[5]*A[2]+A[4]; y = m[4]*A[1]+m[5]*A[3]+A[5]
            bt_info = (x, H-y, abs(m[0]*A[0])*fs, font)
        elif s == 'ET':
            if bt_info and aturan_huruf(*bt_info):
                buang.update(range(bt_mulai, i+1))
            bt_mulai = None
        elif s == 're':
            pend_re.append(i)
        elif s in ('f', 'f*', 'F'):
            if aturan_rect:
                A = gs[-1]
                for j in pend_re:
                    x, y, w, h = (float(v) for v in ops[j][0])
                    atas = H-(y*A[3]+A[5]+h*A[3]); tinggi = h*A[3]
                    r = aturan_rect(x*A[0]+A[4], atas, w*A[0], tinggi)
                    if r == 'buang':
                        buang.add(j)
                    elif r is not None:  # potong: (atas_baru, tinggi_baru)
                        a2, t2 = r
                        bawah_abs = H-(a2+t2)
                        ys = (bawah_abs-A[5])/A[3]
                        ops[j] = ([ops[j][0][0], ys, ops[j][0][2], t2/A[3]], ops[j][1])
                if all(j in buang for j in pend_re) and pend_re:
                    buang.add(i)
            pend_re = []
        elif s in ('n', 'S', 's', 'B', 'b'):
            pend_re = []
        elif s == 'Do' and str(o[0]) in buang_gambar:
            buang.add(i)
    baru = [x for k, x in enumerate(ops) if k not in buang]
    pg.Contents = pdf.make_stream(pikepdf.unparse_content_stream(baru))
    # Gambar yang dibuang juga dihapus dari sumber daya halaman (tanda tangan contoh / kop tidak boleh ikut tersimpan di file)
    xo = pg.Resources.get('/XObject')
    if xo is not None:
        for nama in buang_gambar:
            if nama in xo: del xo[nama]
    return len(buang)

def simpan_halaman(pdf, hal, nama):
    out = pikepdf.Pdf.new()
    out.pages.append(pdf.pages[hal])
    out.remove_unreferenced_resources()
    out.save(nama, compress_streams=True, object_stream_mode=pikepdf.ObjectStreamMode.generate)

def main(src, dst):
    os.makedirs(dst, exist_ok=True)
    # ---------- BAP (PDF contoh dari Excel, kop sudah terpisah sebagai bentuk /NxFm0 -> dibuang) ----------
    # Ukuran dari PDF contoh: header tabel selesai di y=291; baris 14,4 pt; halaman 2 mulai y=144.
    def h_kepala(x, y, s, f):
        if 115 < y < 123: return True                    # baris "NO. : ..." (digambar ulang, rata tengah)
        if 140 < y < 170: return True                    # paragraf pembuka (digambar ulang utuh, dibungkus per kata)
        if 185 < y < 252 and x >= 235: return True       # nilai identitas (titik dua di x=226 tetap)
        if y >= 295: return True                         # isi tabel
        return False
    def r_kepala(x, atas, w, h):
        if atas > 295.0: return 'buang'
        if h > 100: return (atas, 291.67-atas)           # garis tegak dipotong di bawah header
        return None
    p = pikepdf.open(os.path.join(src, 'bap.pdf'))
    saring(p, 0, h_kepala, r_kepala, buang_gambar=('/NxFm0',))
    simpan_halaman(p, 0, os.path.join(dst, 'templat-bap-kepala.pdf'))
    p = pikepdf.open(os.path.join(src, 'bap.pdf'))
    def h_ekor(x, y, s, f):
        if y < 456: return True                          # semua baris tabel
        if 458 < y < 465 and x >= 300: return True       # angka TOTAL
        if 510 < y < 525: return True                    # "Surakarta, ..." (digambar ulang)
        if 545 < y < 556 and x < 300: return True        # nama RS
        if 636 < y < 650: return True                    # nama ketua tim
        return False
    def r_ekor(x, atas, w, h):
        if atas < 445.5 and h < 5: return 'buang'
        if h > 100: return (446.5, atas+h-446.5)         # garis tegak mulai dari pita TOTAL
        return None
    saring(p, 1, h_ekor, r_ekor, buang_gambar=('/NxFm0',))
    simpan_halaman(p, 1, os.path.join(dst, 'templat-bap-ekor.pdf'))
    # ---------- BASTP ----------
    def bastp(tanpa_ringkasan):
        p = pikepdf.open(os.path.join(src, 'bastp.pdf'))
        def h(x, y, s, f):
            if 192 <= y <= 524: return True
            if 113 < y < 123 and (200 <= x < 385 or x >= 572): return True
            if 124 < y < 168 and 200 <= x < 385: return True
            if 99 < y < 112 and 'TimesNewRoman' in f: return True
            if 170 < y < 180 and x < 620: return True
            if y > 535 and (s < 7.9 or tanpa_ringkasan): return True
            return False
        def r(x, atas, w, hh):
            return 'buang' if tanpa_ringkasan and atas > 535 else None
        # Contoh BASTP 25 Okt 23.52 sudah tanpa tanda tangan & stempel; '/Im3' (tanda tangan contoh lama) tetap
        # dibuang bila masih ada, dan '/Im4' (stempel SMK di kolom TTD versi lama) juga dibuang — kolom TTD polos.
        saring(p, 0, h, r, buang_gambar=('/Im3', '/Im4'))
        return p
    simpan_halaman(bastp(False), 0, os.path.join(dst, 'templat-bastp.pdf'))
    simpan_halaman(bastp(True), 0, os.path.join(dst, 'templat-bastp-tanpa-ringkasan.pdf'))
    print('selesai ->', dst)

if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
