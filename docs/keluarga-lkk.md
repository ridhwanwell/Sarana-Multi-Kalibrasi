# Keluarga LKK TERA SMK (143 file Master)

Dibuat dari analisis otomatis 143 file Master. Kelompok dibagi menurut **cara menghitung ketidakpastian** (sheet Ketidakpastian + Budget), karena di situlah rumus berbeda.

## Struktur yang sama di hampir semua file
Sheet: Input 1 (identitas, standar yang dipakai) -> Input 2 (hasil ukur teknisi) -> Calibrator 1/2 (data sertifikat standar, koreksi) -> Ketidakpastian -> Budget -> View Report / Report All (laporan, lulus/tidak).
Calibrator 2 identik di 98 file; Input 1 hanya 2 pola besar (51 dan 44 file).

## Rumus inti (metode GUM, sama untuk semua)
1. Pembacaan standar dikoreksi dengan koreksi sertifikat (interpolasi dari Calibrator 1).
2. Rata-rata, Koreksi = Rata-rata - Setting, STDEV.
3. U-a pengulangan = STDEV / akar(n), derajat kebebasan vi = n - 1.
4. U-b1 sertifikat standar = U sertifikat (k=2) / 2, vi = 60.
5. U-b2 resolusi = (0,5 x resolusi) / akar(3), vi = 50.
6. U-b3 drift = (10% x U sertifikat) / akar(3), vi = 50 (ada file yang memakai 8%).
7. Uc = akar(jumlah kuadrat komponen). Veff = Uc^4 / jumlah(ui^4 / vi) (Welch-Satterthwaite).
8. k dari Veff: 1,95996 + 2,37356/Veff + 2,818745/Veff^2 + 2,546662/Veff^3 + 1,7861829/Veff^4 + 0,245458/Veff^5.
9. U95 = k x Uc. Beberapa file membandingkan dengan CMC KAN.

Yang membedakan antar keluarga hanya **komponen tambahan** (resolusi UUT, spasial, indikator, stabilitas, keseragaman) dan **aturan lulus/tidak** di View Report.

## Keluarga
### A. Baku: Ulang + Sertifikat + Resolusi standar + Drift (50 file)
AED (Automated External Defibrillator); Audiometer; Autotransfusion Unit; Blanket Warmer; Blood and Solution Warmer; Centrifuge Refrigerator; Chart Visual Projector (ACP); Contrast Media Injector; ECMO (Extra Corporeal Membrane Oxygenation); ENT Treatment Unit; ESWL; Electro Acupuncture; Electro Convulsive Therapy (ECT); Electrostimulator (EST); Electrostimulator dengan Vakum; Fluoroscopy dan Radiography; Heart Lung Machine; Holmium YAG Laser; Humidifier; Insuflator Laparoscopy; Intermittent Pneumatic Compression; Laser Argon Surgical; Low Vacuum Suction; Medium Vacuum Suction; Nd YAG Laser; Oxygen Concentrator; Pacemaker (Eksternal); Patient Cooling Unit; Peritoneal Dialysis; Phaco Emulsification; Radio Frequency Ablator; Radio Frequency Generator; Rotator; Stirer; Thoracic Drainage; Tourniquet Pneumatic; Traksi Unit; Treadmill; Ultrasound Therapy (UST); Vacuum Extractor; Ventilator Anestesi; Ventilator Infant; Ventilator Transport; X Ray Angiography; X Ray CT Scan; X Ray Intra Oral Dental; X Ray Mammography; X Ray Panoramic Dental; X Ray Panoramic Dental dan Cephalometri; X Ray Radiografi Umum

### B. Ulang + Sertifikat + Drift (tanpa komponen resolusi) (41 file)
(Kelistrikan); Anesthesia Machine; Bed Side Monitor; CTG; Centrifuge; Continuous Positive Airway Pressure (CPAP); Defibrillator; Dental Unit; Doppler; ECG Recorder; ESU; Echocardiography (ECHO Cardiograph); Endoscopy; Examination Lamp; Film Viewer; Flow Meter; Glucose Meter (Cek Gula Darah); HFNC (High Flow Nasal Cannula); IR Lamp; Infusion Pump Fluke; Microscope; Nebulizer; NeoPuff Infant Resuscitator; Otoscope; Phototerapy; Pulse Oxymeter; Slit Lamp; Spirometer; Stadiometer (Pengukur Tinggi Badan); Syringe Pump Fluke; TDS Meter (Conductivity); Tensimeter Digital Fluke; Thermogun; Thermohygrometer; Thermometer digital; Treadmill with ECG; UV Sterilizer; Ultrasonography (USG); Vaporizer; Vortex Mixer; lampu operasi

### C. Ulang + Sertifikat + Resolusi UUT + Drift (12 file)
Antropometri Bayi; Autorefraktometer; BERA; Biometri Ultrasound; Electroencephalograph (EEG); Intra Aortic Balloon Pump (IABP); Stress Monitor; Timbangan Dewasa Digital; Timbangan Popok dan Pampers; Timpanometer; Tonometer; Vital Sign Monitor

### D. Baku + Resolusi UUT tambahan (5 file)
Defibrillator dengan ECG; Defibrillator dengan Patient Monitor; Defibrillator dengan SpO2 Monitor; Electromyograph (EMG); Patient Cooling and Warming Unit

### E. Ruang suhu: Sertifikat + Resolusi + Stabilitas suhu + Keseragaman suhu (8 file)
Blood Bank Refrigerator; Cold Chain Vaccine Refrigerator; Inkubator Laboratorium; Medical Freezer; Medical Refrigerator; Oven; Platelet Agitator Incubator; Warming Cabinet

### S. Kasus kecil (3 file)
Sphygmomanometer; Suction Pump Mmhg; Ventilator ICU Adult & Pediatrik

### H. Susunan Budget berbeda, perlu dibaca satu per satu (24 file)
- **H1 Timbangan (anak timbangan, ada sheet MPE AT / CMC KAN)** (6): Hemoscale (Range 0 - 600 g); Timbangan Analitic Elektronik (Range 0 - 3000 g); Timbangan Analitic Elektronik (Range 0 - 600 g); Timbangan Bayi Digital; Timbangan Bayi Mekanik; Timbangan Dewasa Analog
- **H2 Suhu khusus (sensor banyak, ada Spasial/Indikator)** (5): Autoclave (Steam Sterilizer); ENCLOSURE Sterilisator Kering; Infant Warmer; Inkubator Bayi (Baby Incubator); Inkubator Transport
- **H3 Mikropipet (gravimetri)** (2): MIKROPIPET Fix Volume; MIKROPIPET Variable Volume
- **H4 Analyzer / optik / pencitraan** (8): Auto Chemistry Analyzer; Bone Mineral Densitometer; Computed Radiography (CR); Head Lamp Medik; Hematology Analyzer; Laryngoscope; Magnetic Resonance Imaging (MRI); Spektrofotometer
- **H5 X-Ray C-Arm / Mobile (hanya sheet Ketidakpastian)** (2): X Ray C Arm; X Ray Mobile
- **H6 Hemodialisa (suhu + konduktivitas, sheet Setting Merk)** (1): Hemodialisa

## Hal yang perlu dicek sebelum dibangun
- 3 file (Infant Warmer, Inkubator Bayi, Inkubator Transport) memakai koefisien 1,761829 pada rumus k, sedangkan 127 file lain 1,7861829. Kemungkinan salah ketik; dampak sangat kecil, tapi samakan.
- 13 file tidak memakai rumus k di atas (kemungkinan k tetap atau cara lain). Perlu dicek per file.
- Pembagi pengulangan tidak seragam: ada akar(n), akar(3), akar(6) yang ditulis tetap (hard-coded) di beberapa file.
- Drift 10% vs 8% berbeda antar file.
- File Master memakai sel kosong sebagai template (belum ada nilai tersimpan), jadi uji perbandingan harus dengan mengisi data contoh di Excel.

## Saran urutan pengerjaan
1. Bangun mesin GUM inti + keluarga A (50 file) dan uji dengan data contoh yang sama di Excel.
2. Tambah B (41), lalu C, D (komponen resolusi UUT).
3. E (ruang suhu) lalu S.
4. H terakhir, satu per satu.
5. Per alat hanya perlu "resep": titik uji, toleransi, satuan, komponen ketidakpastian, aturan lulus.
