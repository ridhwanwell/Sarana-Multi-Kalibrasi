# Geser satu "pita" isi halaman templat sertifikat ke bawah (mis. kotak Nomor Order / Nomor Sertifikat yang terlalu
# mepet dengan baris e-mail kop). Hanya garis, kotak & teks yang SELURUHNYA berada di pita yang digeser; isi lain tetap.
# Pakai: python3 geser_pita.py SUMBER.pdf TUJUAN.pdf HALAMAN(mis. 2,3) ATAS BAWAH DY   (poin, y diukur dari atas halaman)
import sys, pikepdf
SRC, DST, HAL, ATAS, BAWAH, DY = sys.argv[1], sys.argv[2], [int(x) for x in sys.argv[3].split(',')], float(sys.argv[4]), float(sys.argv[5]), float(sys.argv[6])
pdf = pikepdf.open(SRC)
for h in HAL:
    pg = pdf.pages[h - 1]
    H = float(pg.mediabox[3])
    dalam = lambda y_pdf: ATAS <= H - y_pdf <= BAWAH  # y PDF (dari bawah) → cek di pita
    isi = pikepdf.parse_content_stream(pg)
    baru, n = [], 0
    for o in isi:
        op = str(o.operator); a = list(o.operands)
        if op == 're':
            x, y, w, t = [float(v) for v in a]
            if dalam(y) and dalam(y + t):
                a[1] = y - DY; n += 1
        elif op in ('m', 'l'):
            if dalam(float(a[1])):
                a[1] = float(a[1]) - DY; n += 1
        elif op == 'Tm':
            if dalam(float(a[5])):
                a[5] = float(a[5]) - DY; n += 1
        baru.append(pikepdf.ContentStreamInstruction(a, o.operator))
    pg.Contents = pdf.make_stream(pikepdf.unparse_content_stream(baru))
    print('halaman', h, 'digeser', n)
pdf.save(DST)
