# CARA PAKAI PAKET AI STUDIO — untuk Ridhwan
Perumpamaan: AI Studio = teknisi baru yang mengerjakan LKK, Claude = penyelia yang memeriksa sebelum ACC. Paket ini = SOP + lembar kerja + contoh hasil yang benar.

## A. Siapkan repo salinan (sekali saja, dari Safari iPhone)
1. Buka **github.com/new/import**.
2. "Your old repository's clone URL": `https://github.com/ridhwanwell/qrcode-smk` → nama repo baru **`tera-aistudio`** → pilih **Private** → Begin import. Tunggu selesai.
3. Di repo `tera-aistudio`: **Settings → General → Default branch → ganti ke `tera-dev`** → Update.
4. **Jangan** sambungkan repo ini ke Vercel. **Jangan** sambungkan AI Studio ke repo asli `qrcode-smk` (kalau AI Studio mendorong ke `main`, website produksi ikut berubah).

## B. Di Google AI Studio (Build)
1. Buat app baru → **Import from GitHub** → pilih **`tera-aistudio`** (atau sambungkan di Settings → GitHub).
2. Buka **System instructions** → tempel isi file `docs/aistudio/SYSTEM-INSTRUCTION.md` (bagian di bawah garis).
3. Lampirkan file (ikon +) — lihat daftar C.
4. Ketik pesan pertama: **"Baca docs/aistudio/PRD-AISTUDIO.md, ATURAN-AISTUDIO.md dan SPEK-REPORT-ALL-SPHYGMO.md, lalu rangkum rencana langkah A1."** Balas **"lanjut"** bila rencananya masuk akal.
5. **Jangan** isi kunci Supabase/Vercel/Google di Secrets AI Studio.

## C. File yang diunggah
| File | Wajib? | Asal |
|---|---|---|
| Repo `tera-aistudio` (berisi CLAUDE.md, PRD.md, PROMPT.md, `docs/aistudio/*`, semua kode & uji) | ✅ | langkah A |
| `Master Sphygmomanometer.xlsx` (Master v12) | ✅ | zip `Tera_SMK_1_Dokumen_Logo_Master` |
| `Master_Sphygmomanometer_golden_1_v3.xlsx` & `_2_v3.xlsx` | ✅ | Project Files (sudah anonim: "RS CONTOH", BO 999) |
| PDF acuan sertifikat Sphygmomanometer (yang dicetak dari iPhone) | ✅ | arsip Anda |
| Font **Carlito** (`Carlito-Regular.ttf`, `-Bold`, `-Italic`, `-BoldItalic`) | ✅ | Google Fonts → "Carlito" → Download family |
| **MK 090** Sphygmomanometer (PDF) | ✅ cukup ini saja | zip `Tera_SMK_4_MK_Kemenkes_084-111` |
| MK lain (001–133) | ❌ tidak perlu | — |
| Contoh BAP & *BASTP Klinik Jantung Hasna Medika* | hanya bila Fase B | zip 1 |
| Kop KAN/Non-KAN/kop surat, logo | ❌ (kop dilewati, logo sudah di repo) | — |
| `.env`, kunci, data RS/pelanggan sungguhan | ❌ **jangan pernah** | — |

## D. Ritme kerja yang disarankan
- Biarkan AI Studio mengerjakan **1–2 langkah** (mis. A1 lalu A2), lalu kembali ke Claude: ketik **"audit tera-aistudio"**.
- Claude membaca `docs/aistudio/LAPORAN-AISTUDIO.md`, memeriksa kode & menjalankan uji, memindahkan yang lolos ke `tera-dev` (link Preview seperti biasa), dan memberi tahu yang harus diperbaiki di AI Studio.
- Database (migrasi SQL) tetap dijalankan Claude setelah Anda bilang **"lanjutkan"**; merge ke `main` tetap menunggu **"oke"**.

## E. Yang perlu Anda putuskan (boleh dijawab kapan saja, ke Claude atau AI Studio)
Lihat tabel **T9–T16** di `PRD-AISTUDIO.md` bagian 4A — terutama:
- **T9**: Excel memakai koreksi termohigrometer yang salah (sertifikat tercetak HTC-2 2025, koreksi dari KRISBOW 2023). Tera SMK akan memakai data termohigrometer yang benar-benar dipilih. Setuju?
- **T11** `0C` atau `°C` · **T12** tanggal terbit = tanggal ACC atau penerimaan + 1 · **T15** batas suhu & kelembaban · **T16** format Nomor Order di sertifikat.
