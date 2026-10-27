#!/usr/bin/env python3
"""Golden file Thermohygrometer: menghitung ulang Master_Thermohygrometer (Excel contoh isi) dengan rumus sheet
Ketidakpastian (K:AB), SECARA TERPISAH dari kode TypeScript. Nilai tersimpan di Excel contoh basi (0), jadi dihitung ulang.
Pakai:  python3 tools/tera/buat_golden_termohigro.py Master_Thermohygrometer_contoh.xlsx tests/tera/fixtures/termohigro-golden-v1.json
Tabel standar = Calibrator 1 (angka SEMENTARA di master: koreksi 0, U 1 °C / 4 %RH)."""
import json, math, statistics, sys
import openpyxl

def k_faktor(v):
    return 1.95996 + 2.37356 / v + 2.818745 / v**2 + 2.546662 / v**3 + 1.7861829 / v**4 + 0.245458 / v**5 + 1.000764 / v**6

def titik(ws, baris_awal):
    hasil = []
    for r in range(baris_awal, baris_awal + 7):
        setting = ws.cell(r, 3).value
        run = [ws.cell(r, c).value for c in range(5, 11)]
        hasil.append((float(setting), [float(x) for x in run]))
    return hasil

def budget(setting, run, kor_std, u_std_sert, resolusi, drift=0.10):
    mentah = run
    terkoreksi = [x + kor_std for x in mentah]
    n = len(terkoreksi)
    rr = sum(terkoreksi) / n
    uA = statistics.stdev(terkoreksi) / math.sqrt(6)
    uStd = u_std_sert / 2
    uRes = (resolusi * 0.5) / math.sqrt(3)
    uDrift = (u_std_sert * drift) / math.sqrt(3)
    uc = math.sqrt(uA**2 + uStd**2 + uRes**2 + uDrift**2)
    veff = uc**4 / (uA**4 / 5 + uStd**4 / 60 + uRes**4 / 50 + uDrift**4 / 50)
    k = k_faktor(veff)
    return {"setting": setting, "bacaan": run, "pembacaanStandar": rr, "koreksi": rr - setting, "uA": uA, "uc": uc, "veff": veff, "k": k, "u95": k * uc}

def main(xlsx, keluar):
    wb = openpyxl.load_workbook(xlsx)
    ws = wb["Input 2"]
    resolusi = float(wb["Input 1"]["E19"].value)
    suhu = [budget(s, r, 0.0, 1.0, resolusi) for s, r in titik(ws, 14)]
    rh = [budget(s, r, 0.0, 4.0, resolusi) for s, r in titik(ws, 26)]
    out = {"sumber": "Master_Thermohygrometer.xlsx (Excel contoh isi, 27 Okt 2026), dihitung ulang", "resolusi": resolusi,
           "tabelStandar": {"suhu_c": {"koreksi": 0, "u95": 1}, "kelembaban_rh": {"koreksi": 0, "u95": 4}},
           "toleransi": {"suhu": 1, "rh": 5}, "suhu": suhu, "rh": rh}
    json.dump(out, open(keluar, "w"), indent=1)
    for nama, daftar in (("SUHU", suhu), ("RH", rh)):
        print(nama)
        for b in daftar:
            print(f"  {b['setting']:>5} std={b['pembacaanStandar']:.4f} kor={b['koreksi']:+.4f} U95={b['u95']:.4f}")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
