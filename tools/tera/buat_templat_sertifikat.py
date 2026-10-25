# Buat "kertas cetak" sertifikat dari PDF Report All (Excel): hapus teks isian (data) & isian latar putih,
# sisakan teks tetap, garis, kotak biru — persis Excel. Teks isian nanti dicetak aplikasi di posisi yang sama.
import sys, json, pikepdf
from fontTools.ttLib import TTFont
SRC, OPS, DST = sys.argv[1], sys.argv[2], sys.argv[3]
FD='/usr/share/fonts/truetype/crosextra/'
FT={'r':TTFont(FD+'Carlito-Regular.ttf'),'b':TTFont(FD+'Carlito-Bold.ttf'),'i':TTFont(FD+'Carlito-Italic.ttf')}
def lebar(t,f,s):
    ft=FT[f]; cm=ft.getBestCmap(); hm=ft['hmtx']; upm=ft['head'].unitsPerEm
    return sum(hm[cm.get(ord(c),'.notdef')][0] for c in t)*s/upm
ops=json.load(open(OPS))
pdf=pikepdf.open(SRC)
laporan=[]
for pi,pg in enumerate(pdf.pages):
    H=float(pg.mediabox[3])
    L=ops[str(pi+1)]
    # anchor per baris
    def awal(o):
        if o['j']=='f': return o['x']
        w=lebar(o['t'].replace('{p}','1').replace('{n}','3'),o['f'],o['s'])
        return o['x']-w if o['a']=='r' else (o['x']-w/2 if o['a']=='c' else o['x'])
    def akhir(o):
        w=lebar(o['t'].replace('{p}','1').replace('{n}','3'),o['f'],o['s'])
        return awal(o)+w
    wilayah=[]
    for f in [o for o in L if o['j']=='f']:
        baris=[o for o in L if abs(o['y']-f['y'])<0.6 and o is not f]
        kiri=[o for o in baris if (o['x'] if o['j']=='f' else awal(o)) < f['x']-0.01]
        kanan=[o for o in baris if (o['x'] if o['j']=='f' else awal(o)) > f['x']+0.01]
        prev=max(kiri,key=lambda o:(o['x'] if o['j']=='f' else awal(o)),default=None)
        nxt=min(kanan,key=lambda o:(o['x'] if o['j']=='f' else awal(o)),default=None)
        lo = 30 if prev is None else (akhir(prev)+0.3 if prev['j']=='t' else (prev['x']+f['x'])/2)
        hi = 575 if nxt is None else (awal(nxt)-0.3 if nxt['j']=='t' else (f['x']+nxt['x'])/2)
        if f['a']=='l': lo=max(lo,f['x']-1.0)
        if f['a']=='r': hi=min(hi,f['x']+1.0)
        wilayah.append((f['y'],lo,hi,f['k']))
    stat=[(o['y'],awal(o)-0.6,akhir(o)+0.6) for o in L if o['j']=='t']
    isi=pikepdf.parse_content_stream(pg)
    baru=[]; i=0; dibuang=0; aneh=[]
    gs=[{'cs':None,'sc':None,'cm':(1,0,0,1,0,0)}]
    re_akhir=None; garis_dibuang=0
    while i<len(isi):
        o=isi[i]; op=str(o.operator)
        if op=='re': re_akhir=[float(x) for x in o.operands]
        if op in ('f','f*') and re_akhir and re_akhir[3] < 1.2:
            rx,ry,rw,rh=re_akhir; yt=H-(ry+rh)
            if any(w[0] <= yt <= w[0]+3 and w[1]-1 <= rx <= w[2] for w in wilayah):
                garis_dibuang+=1; baru.append(pikepdf.ContentStreamInstruction([],pikepdf.Operator('n'))); i+=1; continue  # garis bawah isian
        if op=='q': gs.append(dict(gs[-1])); baru.append(o); i+=1; continue
        if op=='Q': gs.pop(); baru.append(o); i+=1; continue
        if op=='cm': gs[-1]['cm']=tuple(float(x) for x in o.operands); baru.append(o); i+=1; continue
        if op=='cs': gs[-1]['cs']=str(o.operands[0]); baru.append(o); i+=1; continue
        if op in ('sc','scn'): gs[-1]['sc']=[str(x) for x in o.operands]; baru.append(o); i+=1; continue
        if op in ('f','f*') and gs[-1]['cs']=='/Cs1' and gs[-1]['sc']==['1']:
            baru.append(pikepdf.ContentStreamInstruction([],pikepdf.Operator('n'))); i+=1; continue  # latar putih sel → tidak dicat
        if op=='BT':
            j=i
            while str(isi[j].operator)!='ET': j+=1
            blok=isi[i:j+1]
            tm=[b for b in blok if str(b.operator)=='Tm'][0]
            a,b_,c,d,e,f_=[float(x) for x in tm.operands]
            ca,cb,cc,cd,ce,cf=gs[-1]['cm']
            x=ca*e+ce; ytop=H-(cd*f_+cf)
            data=next((w for w in wilayah if abs(w[0]-ytop)<0.6 and w[1]<=x<=w[2]),None)
            if data: dibuang+=1; i=j+1; continue
            if not any(abs(s[0]-ytop)<0.6 and s[1]<=x<=s[2] for s in stat): aneh.append((round(x,1),round(ytop,1),a))
            baru.extend(blok); i=j+1; continue
        baru.append(o); i+=1
    pg.Contents=pdf.make_stream(pikepdf.unparse_content_stream(baru))
    laporan.append((pi+1,dibuang,'garis',garis_dibuang,len(aneh)))
pdf.save(DST)
for l in laporan: print(l)
