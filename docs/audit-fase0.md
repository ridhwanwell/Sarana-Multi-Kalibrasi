# Audit Fase 0 — Tera SMK di dalam `qrcode-smk`

| | |
|---|---|
| Tanggal | 18 Oktober 2026 |
| Acuan | PRD Draf 3 bagian 9 (Tahap 0) & F0 · CLAUDE.md bagian 2 & 4 |
| Kode yang diaudit | Repo `ridhwanwell/qrcode-smk`, cabang `main`, commit `abd30b1` (10 Okt 2026) — ±58.000 baris TypeScript |
| Database yang diaudit | Supabase `qr-label-kalibrasi` (produksi), dibaca langsung dengan query **SELECT saja** |
| Hosting yang diaudit | Vercel project `qrcode-smk` (domain & nama variabel lingkungan, **tanpa** membuka isi rahasia) |
| Yang diubah | **Tidak ada.** Tidak ada kode, data, tabel, bucket, domain, atau pengaturan Vercel yang diubah |
| PDF MK Kemenkes | **Tidak dibuka** — Tahap 0 tidak membutuhkannya (dipakai mulai Tahap 4, MK 090 Sphygmomanometer) |
| Status dokumen | Menunggu persetujuan pemilik produk (kriteria F0.7) |

> **Perumpamaan:** audit ini seperti **inspeksi fisik & fungsi sebelum kalibrasi**. Alatnya (website) dibuka tutupnya, dicatat setiap komponen dan kabelnya, diukur keselamatan listriknya — tapi **belum ada satu sekrup pun yang diputar**. Hasilnya menentukan apakah alat aman "dikalibrasi" (ditambah Tera SMK) dan bagian mana yang harus dijaga.

---

## 0. Ringkasan untuk pemilik produk

**Kabar baik**
1. Website sudah rapi secara keamanan dasar: semua tabel database **tertutup dari browser** (RLS aktif, tanpa izin langsung), semua data lewat **server API** yang memeriksa login & role.
2. Label QR baru sudah memakai **kode verifikasi** (`?k=XXXXXX`) sehingga orang tidak bisa menebak nomor label RS lain.
3. Data portal (jadwal, SPH, BAP, kalibrator, teknisi, RS) sudah **satu tabel per jenis data**, dengan **hapus lunak** (tidak benar-benar hilang) dan pencatat kegiatan (`activity_log`).
4. Folder label **`999` sudah ada dan masih kosong (0 label)** — siap dipakai sebagai BO uji.
5. Belum ada akun `@tera.smk` di Supabase Auth, jadi saat ini **tidak ada pintu yang terbuka** untuk teknisi.

**Yang wajib diperhatikan sebelum Tahap 1** (rincian di bagian 12)
1. **Link Preview Vercel belum bisa memakai server API**: kunci `SUPABASE_SERVICE_ROLE_KEY` & `SUPABASE_URL` hanya diisi untuk *Production*. Di Preview, semua `/api/...` akan menjawab "Konfigurasi server belum lengkap". Harus ditambahkan untuk cabang `tera-dev` dulu (F0.6).
2. **Link Preview dilindungi login Vercel** (*Vercel Authentication*). HP/tablet teknisi tidak bisa membukanya tanpa akun Vercel → perlu "link berbagi" (*shareable link*) saat uji.
3. **Menambah role `teknisi` tidak cukup di database saja.** Daftar role resmi tertulis di **4 tempat** (database, server, browser, aturan bucket). Bila `teknisi` hanya ditambahkan ke daftar umum, teknisi otomatis bisa **membaca semua jadwal, RS, teknisi, kalibrator, dan seluruh label beserta kode QR-nya** lewat API. Tahap 1 harus memisahkan "role kantor" dan "role Tera".
4. Alamat `/tera` saat ini **jatuh ke halaman publik scan QR** (rute "tangkap-semua"). Rute Tera harus dipasang sebelum rute itu.
5. Label QR dibuat dengan alamat **domain tempat admin membuka website**. Bila admin membuat label dari link Preview, QR akan berisi alamat Preview yang tidak bisa dibuka RS. **Jangan membuat/mencetak label dari link Preview.**
6. Tabel lama menyimpan isi aslinya di kolom **`data` (JSON)**; kolom lain (`label_awal`, `nama_rs`, dst.) **diisi otomatis oleh trigger** dari JSON itu. Ini memengaruhi cara menambah "label cadangan" & "mode sertifikat" di Tahap 3 (bagian 7.2).
7. `.gitignore` belum mengecualikan `_referensi/` (F0.9) — wajib diperbaiki pada commit pertama Tahap 1.

**Arti status "Cadangan Laik Pakai"** (PRD 12.4) — lihat bagian 5. Singkatnya: **stiker sisa pengisi lembar A3+ (85 stiker/lembar)**, bernomor lanjutan setelah rentang utama, dicetak dengan desain stiker "Laik Pakai", belum punya sertifikat. **Konsepnya sama dengan "label cadangan" Draf 3**, hanya saja jumlahnya ditentukan ukuran lembar, bukan ditentukan Admin Teknik. Ada **586 label** berstatus ini di 11 folder.

---

## 1. Cara audit dilakukan

| Sumber | Cara | Catatan |
|---|---|---|
| Kode | Repo publik di-*clone* (baca saja), dibaca file per file | Tidak ada cabang selain `main`; cabang `tera-dev` belum dibuat |
| Database | Query `SELECT` lewat sambungan Supabase (sama dengan file `docs/audit-fase0-query.sql`) | Hasil di bagian 9–10 adalah **kondisi 18 Okt 2026**, bukan dari `supabase_schema.sql` (sudah usang, F0.8) |
| Vercel | Membaca daftar domain, proteksi, dan **nama** variabel lingkungan | Isi rahasia tidak dibuka (tetap terenkripsi) |
| Paket Tera SMK | PRD.md, CLAUDE.md, BACA-DULU.md, PROMPT.md, daftar isi `_referensi/` | Master LKK, kop, golden file, MK tidak dibuka (belum dibutuhkan) |

---

## 2. Peta halaman & rute (browser)

Semua rute ada di `src/App.tsx`. Satu aplikasi React (*single page app*); Vercel mengarahkan semua alamat non-`/api` ke `index.html` (`vercel.json`).

| Alamat | Halaman | Perlu login? | Keterangan |
|---|---|---|---|
| `/sertifikat/:noLabel`, `/scan/:noLabel`, `/verifikasi/:noLabel`, `/cert/:noLabel`, `/label/:noLabel` | `PublicScanPage` | Tidak | Halaman publik scan QR stiker |
| `/sertifikat/*`, `/scan/*`, `/verifikasi/*` | `PublicScanPage` | Tidak | Varian alamat panjang |
| `/` , `/sertifikat`, `/scan`, `/verifikasi` | `ScanOrRedirect` | — | Bila ada nomor label di alamat/parameter (`?noLabel=`, `?label=`, `?cert=`, …) → halaman scan; bila tidak → **portal Manajemen Aset** (`AsetPortalApp`) |
| `/admin/login` | `AdminLogin` | Tidak | Form login (email/username + sandi) |
| `/admin` → `/admin/dashboard` | `AdminDashboard` | Ya | Dasbor label QR |
| `/admin/labels` | `AdminLabels` | Ya | Daftar label, tautkan sertifikat, void |
| `/admin/generate` | `AdminGenerate` | Ya | Generate & cetak label QR (A3+ 85 stiker) |
| `/admin/templates` | `AdminTemplates` | Ya | Desain template stiker |
| `/admin/aset` | `AsetPortalApp` | Ya | Portal Manajemen Aset (sama dengan `/`) |
| `/portal-aset` | `AsetPortalApp` | Ya (form login sendiri) | Alamat langsung portal |
| `*` (selain di atas) | `PublicScanPage` | Tidak | "Tangkap-semua": alamat seperti `/002.0020` dianggap nomor label |

**Isi portal Manajemen Aset** (`src/pages/AsetPortalApp.tsx`, pindah tab tanpa ganti alamat): Dasbor · SPH · Label · Penjadwalan · Penagihan · **Selia** · Aset Kalibrator · Tablet · Keuangan · Master RS & Teknisi · Template · ASPAK.

**Temuan rute**
- `/tera` belum ada → saat ini masuk "tangkap-semua" lalu dianggap nomor label "tera". Daftar `RESERVED_PATHS` di `src/lib/labelParser.ts` juga belum memuat `tera`.
- Script tema di `index.html` menganggap `/` dan `/admin…` sebagai portal; halaman scan selalu terang. Tera SMK perlu temanya sendiri (Ocean) tanpa mengganggu script ini.
- Belum ada **manifest PWA** dan **service worker** sama sekali (aman: tidak ada cache lama yang perlu dibersihkan).

---

## 3. Alur login & role

**Alur login (browser)**
1. `AdminLogin` / `AsetLoginPage` → `AuthContext.login()` (`src/lib/AuthContext.tsx`).
2. Bila yang diketik bukan email, `normalizeEmail()` menambahkan `@smk.co.id` (contoh `fitri` → `fitri@smk.co.id`). **Akun `@tera.smk` harus diketik lengkap.**
3. `supabase.auth.signInWithPassword()` → lalu `GET /api/auth/me` (server) untuk mengambil role dari tabel `profiles`.
4. Role **harus salah satu dari 4 role resmi**. Bila tidak ada profil/role → pesan *"Akun belum diaktifkan, hubungi Admin Utama"* dan langsung logout. ✅ Perilaku aman ini wajib dipertahankan (CLAUDE.md 3A.4).
5. Pengalihan sesudah login: `admin_utama` → `/admin/dashboard`; `admin_teknik`/`admin_keuangan`/`hanya_sph` → `/admin/aset`.

**Pemeriksaan di server** (`src/middleware/auth.ts`)
- `requireAuth`: wajib token Bearer → cek token ke Supabase → baca `profiles.role` → tolak (403) bila bukan 4 role resmi. Role disimpan di memori 60 detik.
- `requireRole([...])`: membatasi endpoint tertentu.

**Daftar role tertulis di 4 tempat** (semua harus diubah serentak di Tahap 1)

| # | Tempat | Isi sekarang |
|---|---|---|
| 1 | Database: aturan `chk_profiles_official_role` di `profiles` | 4 role |
| 2 | Server: `OFFICIAL_ROLES` di `src/middleware/auth.ts` | 4 role |
| 3 | Browser: `OFFICIAL_ROLES` di `src/lib/AuthContext.tsx` | 4 role |
| 4 | Storage: policy upload `internal-documents` | 4 role |

**Pembatasan per role di layar** hanya ada di `AsetPortalApp` (tab yang boleh dibuka). `AdminLayout` (`/admin/labels`, `/admin/generate`, `/admin/templates`) **tidak membatasi role** — semua role kantor bisa membuka layarnya; penulisan tetap dicegat server.

**Akun saat ini (Supabase Auth, 18 Okt 2026)**

| Domain | Role | Jumlah |
|---|---|---|
| smk.co.id | admin_utama | **4** (PRD: dikurangi menjadi 1 di Tahap 10) |
| smk.co.id | admin_teknik | 2 |
| smk.co.id | admin_keuangan | 2 |
| smk.co.id | hanya_sph | 3 |
| tera.smk | — | **0** (langkah 5 BACA-DULU belum dilakukan) |

Tidak ada trigger di `auth.users`, jadi akun baru **tidak** otomatis mendapat baris `profiles` → akun `@tera.smk` yang nanti dibuat **tidak bisa masuk ke mana pun** sampai Tahap 1 (sesuai F1.9).

---

## 4. Alur label QR & halaman publik scan

**Pembuatan label** (`AdminGenerate` → `POST /api/labels/bulk`)
1. Admin memilih rentang `BBB.NNNN` (maks 2.000 per proses) dan jenis stiker **Laik** atau **Tidak Laik**.
2. Mode cadangan bawaan **"kelipatan 85"**: jumlah dibulatkan ke kelipatan 85 (1 lembar A3+ = 5×17 stiker). Bila sisa < 15 stiker, ditambah 1 lembar lagi. Mode lain: **"jumlah pas"** (tanpa cadangan).
3. Server menyimpan label baru dengan `qr_secured = true`; database memberi `verify_code` acak 6 huruf (fungsi `generate_label_verify_code`).
4. Nomor yang sudah ada **dilewati, tidak ditimpa** (mode bawaan). Mode "update" menjaga tautan sertifikat lama.
5. PDF stiker dibuat di browser (jsPDF). Isi QR: **`<domain>/sertifikat/<no_label>?k=<kode>`**, dengan `<domain>` = pengaturan `general.publicBaseUrl` bila ada (**saat ini belum ada**), atau alamat website yang sedang dibuka admin, atau domain yang diketik manual di form. ⚠️ Lihat risiko R5.

**Menautkan sertifikat** (`AdminLabels`, `BulkCertificateLinkModal`)
- Cara sekarang = mode (b) PRD: link **Google Drive** ditempel/ditautkan massal (bisa dibaca otomatis lewat `GET /api/drive-certificate/:fileId` dan OCR Gemini).
- Server hanya menerima link `https://` ke `drive.google.com`, `docs.google.com`, `*.googleusercontent.com`, atau `auzpctxhltcdzdhcaetb.supabase.co`.
- Status berubah menjadi **"Sertifikat Tertaut"**; label rusak → **"Void / Rusak"** (alasan wajib, tercatat).

**Halaman publik scan** (`PublicScanPage` → `GET /api/labels/:noLabel`, tanpa login, maks 60 permintaan/menit/IP)
1. Label `qr_secured = true` **wajib** membawa `?k=` yang benar; bila salah → dijawab "tidak ditemukan" (anti tebak nomor).
2. Label lama (`qr_secured = false`, **1.041 label**) tetap bisa dibuka tanpa kode → stiker lama aman.
3. Yang dikirim ke publik hanya kolom aman (nama RS, alat, ruangan, status, tanggal, link sertifikat yang lolos saringan).
4. Bila nomor tidak ada di database tapi berbentuk angka → tampil "Menunggu Sertifikat" (stiker pra-cetak).

**Status label di database (18 Okt 2026)**

| Status | Jumlah | Pakai kode QR | Sudah ada sertifikat |
|---|---:|---:|---:|
| Menunggu Sertifikat | 3.002 | 2.187 | 0 |
| Cadangan Laik Pakai | 586 | 493 | 0 |
| Sertifikat Tertaut | 275 | 162 | 275 (semua `pdf_source = drive`) |
| Tidak Laik Pakai | 71 | 51 | 0 |
| **Total** | **3.934** | | |

**Temuan untuk Tahap 4 (mode a "Terintegrasi")**
- Endpoint publik **tidak mengirim `pdfSource`** dan **menolak link yang bukan Google/Supabase-publik**. PDF Tera SMK di bucket **privat** `tera-certificates` membutuhkan cabang baru: server membuat *signed URL* berumur pendek saat label di-scan (F9.7). Urutan tampil F9.5 (PDF Tera → Drive → "belum terbit") belum ada.
- Siaran pembaruan *realtime* tidak cocok: server mengirim `labels_changed` di kanal `labels_broadcast_server`, halaman scan mendengarkan `labels_updated` di kanal lain → **tidak pernah terpicu**. Tidak berbahaya (halaman scan tetap mengambil data baru saat dibuka), dicatat saja; **tidak diubah** kecuali diminta.

---

## 5. Arti status "Cadangan Laik Pakai" (PRD 12.4)

**Sumber di kode:** `src/pages/AdminGenerate.tsx` (fungsi `calculateLabelBatches`, baris ±48–75 dan ±370–436).

**Artinya:** label **sisa pengisi lembar A3+**. Contoh: admin meminta 114 label (`123.0001–123.0114`) dengan mode "kelipatan 85" → dibulatkan ke 170 stiker (2 lembar). 56 stiker sisanya diberi nomor lanjutan (`123.0115–123.0170`), dicetak dengan **desain stiker Laik Pakai**, dan disimpan dengan status **"Cadangan Laik Pakai"**. Bila batch dipilih "Tidak Laik", sisanya berstatus "Tidak Laik Pakai" (desain stiker merah).

Perumpamaan: seperti **sisa stiker kalibrasi di satu rol** — nomornya sudah urut dan sah, dibawa teknisi, belum ditempel ke alat mana pun.

| Pertanyaan | Jawaban dari kode & data |
|---|---|
| Apakah sudah punya sertifikat? | Tidak (0 dari 586) |
| Bagaimana tampil saat di-scan? | Sama seperti "Menunggu Sertifikat" (tidak ada tampilan khusus untuk status ini) |
| Bila sertifikat ditautkan? | Status menjadi "Sertifikat Tertaut", sama seperti label biasa |
| Nomornya? | **Lanjutan langsung** dari rentang utama, BO/prefix sama |
| Apakah sama dengan "label cadangan" Draf 3? | **Ya secara fungsi** (stiker berlebih untuk alat di luar PO). **Bedanya**: Draf 3 ingin rentangnya **ditentukan Admin Teknik di jadwal** (F2.1), sedangkan sekarang jumlahnya **ditentukan ukuran lembar** dan tidak tercatat di jadwal |

**Sebaran (18 Okt 2026):** 001 (83: 001.0170–001.0255), 082 (10), 086 (10), 087 (54), 093 (19), 115 (60), 118 (75), 119 (75), 120 (53), 122 (55), 123 (92).

**Usulan (diputuskan di Tahap 3, belum dikerjakan):**
- Status "Cadangan Laik Pakai" **dipertahankan apa adanya** (tidak diganti nama, tidak diubah barisnya — F0.2).
- Saat Admin Teknik mengisi "rentang label cadangan" di jadwal (F2.1), form bisa **mengusulkan otomatis** rentang dari label berstatus "Cadangan Laik Pakai" di folder BO itu; Admin Teknik tetap bisa mengubah.
- Tera SMK menerima nomor dari rentang cadangan untuk **alat tambahan**. Saat ACC (Tahap 4), status label berubah mengikuti hasil (F9.2), sama seperti label utama.

---

## 6. API server (`api/` dan `src/server/`)

**Susunan:** `api/index.ts` (fungsi serverless Vercel, maks 60 detik) memuat `createApp()` dari `src/server/app.ts` (Express). `server.ts` hanya untuk jalan di laptop. Kunci *service role* hanya di server (`src/server/supabaseAdmin.ts`) — server **berhenti** bila kunci tidak ada (tidak ada jalan pintas ke kunci anon). ✅

**Pengaman umum:** batas permintaan 2.000/15 menit (login) atau 200/15 menit (tamu); scan publik 60/menit/IP; idempotensi (tabel `api_idempotency`) untuk kirim ulang yang aman; semua respons `/api` `Cache-Control: no-store`.

| Endpoint | Siapa | Fungsi |
|---|---|---|
| `GET /api/health` | publik | Cek hidup |
| `GET /api/health/deep` | admin_utama | Cek tabel & variabel |
| `GET /api/labels/:noLabel` | **publik** | Data scan QR (kode `?k=` wajib untuk label baru) |
| `GET /api/auth/me` | login | Profil & role |
| `GET /api/labels` | **semua role login** | Seluruh label **termasuk `verify_code`** |
| `GET /api/labels/summary` | semua role login | Ringkasan per folder |
| `POST /api/labels`, `/api/labels/bulk` | utama, teknik | Buat/ubah label |
| `POST /api/labels/:no/void`, `/unvoid` | utama, teknik | Void / batal void |
| `DELETE /api/labels/:no`, `POST /api/labels/batch-delete` | utama | Hapus label (salinan disimpan ke `activity_log`) |
| `GET /api/drive-certificate/:id` (+`/ocr`), `GET /api/drive-folder/:id` | utama, teknik | Baca PDF/folder Google Drive, OCR Gemini |
| `GET/POST/DELETE /api/folders…` | bervariasi | Folder label ↔ nama RS |
| `GET /api/collections/:name` | per koleksi (lihat 7.1) | Ambil data portal |
| `POST /api/collections/:name` | per koleksi | Simpan data portal (deteksi konflik versi `baseUpdatedAt`) |
| `DELETE /api/collections/:name/:id` | per koleksi | Hapus lunak |
| `DELETE /api/collections/:name` | utama | Kosongkan koleksi (hapus lunak) |
| `POST /api/sph-transisi…`, `GET …/kamus`, `GET …/riwayat/:id` | utama/teknik/keuangan/sph | SPH lama (transisi) |
| `POST /api/storage/signed-url` | login, dibatasi jenis dokumen | Link sementara dokumen privat |
| `GET /api/settings/:key` | semua role login | Baca pengaturan (daftar kunci terbatas) |
| `POST /api/settings/:key` | utama | Ubah pengaturan |
| `GET /api/supabase/status`, `POST /api/supabase/sync` | utama | Cek koneksi |

**Pilihan server untuk Tera SMK (CLAUDE.md 3 "dipilih di Fase 0")** — **usulan: pakai Express yang sudah ada di `api/`** dengan berkas baru terpisah (mis. `src/server/teraRoutes.ts`), didaftarkan sekali di `createApp()`. Alasan: pola login & role sudah ada, kunci rahasia sudah di Vercel, satu tempat log. Supabase Edge Function/cron hanya bila perlu (backup mingguan Tahap 9). Batas 60 detik per permintaan cukup untuk sinkron 1 LKK/paket; pembuatan PDF sertifikat perlu diukur di Tahap 4.

---

## 7. Cara data disimpan

### 7.1 Data portal: "satu tabel per jenis data, isi utama di JSON"

Website memakai hook `useSupabaseData` (`src/lib/useSupabaseData.ts`) → `/api/collections/:name` → tabel:

| Koleksi (kode) | Tabel | Baca | Tulis |
|---|---|---|---|
| schedules | `jadwal_kalibrasi` | semua role | utama, teknik, keuangan |
| sphDocuments | `dokumen_sph` | utama, keuangan, sph | utama, keuangan, sph |
| bapDocuments | `dokumen_bap` | **utama, keuangan** | **utama, keuangan** |
| calibratorAssets | `aset_kalibrator` | semua role | utama, teknik |
| hospitals | `rumah_sakit` | semua role | utama, teknik, keuangan |
| technicians | `teknisi` | semua role | utama, teknik, keuangan |
| marketingStaff | `staf_marketing` | semua role | utama, teknik, keuangan |
| tabletAssets / tabletLoans | `aset_tablet` / `peminjaman_tablet` | semua role | utama, teknik |
| financialAssets / financialTransactions | `aset_keuangan` / `transaksi_keuangan` | utama, keuangan | utama, keuangan |

**Cara simpan:** server hanya menulis kolom **`id`, `data` (JSON berisi seluruh objek), `updated_at`, `deleted_at`**. Kolom-kolom lain (contoh `jadwal_kalibrasi.label_awal`, `nama_rs`, `nomor_bap`; `aset_kalibrator.nomor_sertifikat`, `jatuh_tempo_kalibrasi`) **diisi otomatis** oleh trigger `internal.isi_kolom_otomatis()` dari isi JSON. Perumpamaan: JSON = **lembar kerja asli**, kolom = **ringkasan di sampul map** yang ditulis ulang otomatis setiap lembar diubah.

Akibatnya untuk Tera SMK:
- **Menambah kolom baru di tabel lama tidak otomatis terisi** oleh website lama — website hanya mengirim JSON. Pilihan di Tahap 3: (a) simpan di JSON jadwal (kunci baru, mis. `labelCadanganAwal`), atau (b) tabel `tera_` sendiri yang menyimpan data push. **Usulan: (b) `tera_jadwal_push`** (salinan saat "Push ke Tera SMK"), sehingga tabel lama dan trigger lama **tidak disentuh**. Diputuskan di Tahap 3.
- Trigger `a1_kunci_data_transisi` menjaga data SPH/jadwal "transisi" dan `catat_riwayat_realisasi` mencatat perubahan jumlah alat (tabel `riwayat_realisasi`). Jangan dilemahkan.

**Aturan tulis:** deteksi konflik versi (perangkat harus mengirim `baseUpdatedAt`); item yang sudah dihapus tidak bisa "hidup lagi"; batas 500 item per kiriman.

### 7.2 Di browser (Manajemen Aset)

| Tempat | Nama | Isi |
|---|---|---|
| localStorage | `smk_supa_<koleksi>` | Salinan terakhir data server (agar tetap bisa dibuka saat internet putus) |
| IndexedDB | `smk_offline_store` → `pending_queue` | Antrean perubahan yang belum terkirim (ada idempotency key) |
| IndexedDB | `SMK_Template_Blobs_DB`, `SMK_SphTransisi_Draft` | Template stiker, draf SPH transisi |
| localStorage | `smk_theme`, `smk_labels`, `smk_folder_nama_rs_map`, `smk_app_logo`, dll. | Pengaturan & cadangan kecil |

`runStorageCleanup()` menghapus kunci berawalan `smk_deleted_`, `smk_inited_`, `smk_aset_` sekali per perangkat. **Tera SMK memakai awalan `tera_`** (CLAUDE.md 3A.8) sehingga tidak bentrok dan tidak ikut terhapus. Logout website lama hanya menghapus 3 kunci profil — tidak menyentuh IndexedDB.

### 7.3 Label QR
Tabel `labels` diakses **langsung** oleh server (bukan lewat koleksi). Kunci utama `no_label`; `folder` → `folder_label.prefix` (trigger `pastikan_folder_ada` membuat folder otomatis).

---

## 8. Modul yang akan disambung (titik sambung PRD)

| Modul | File utama | Cara kerja sekarang | Sambungan Tera SMK |
|---|---|---|---|
| **Penjadwalan** | `ScheduleManager.tsx`, `ScheduleFormModal.tsx` | Jadwal per RS: teknisi utama & pendamping, `targetDevices` (alat PO), rentang label otomatis `labelStart/labelEnd` dari kode RS 3 digit + urutan | Tahap 3: label cadangan, mode sertifikat, tombol Push (F2) |
| **Selia** | `SeliaDashboard.tsx` | Per jadwal berstatus selesai: daftar unit (`seliaItems` di JSON jadwal) dengan status *Belum Diselia / Sedang Proses / Sudah Cetak Sertifikat* + keterangan. **Tidak ada isian LKK yang diperiksa** | Tahap 4: daftar & detail LKK, Edit/Kembalikan/ACC (F6) — layar Selia baru, data di tabel `tera_lkk` |
| **BAP/BASTP** | `BapModal.tsx`, `utils/bapHelpers.ts`, `bapExcelExport.ts`, `bapPdfImport.ts` | BAP dibuat dari SPH/jadwal; realisasi diisi **manual per tanggal** atau dari **upload PDF BAP bertanda tangan** (dibaca otomatis). Sudah ada bagian **Non PO** (`nonPoItems`) ≈ alat tambahan. Nomor `BBB/SMK/BAP/<romawi>/<tahun>` | Tahap 5: realisasi otomatis dari LKK 🟢, BASTP format Hasna Medika (F10) |
| **Penagihan** | `HospitalBillingManager.tsx`, `utils/billingHelpers.ts` | Jumlah tagihan = realisasi BAP × harga satuan SPH; PPN dari `sph.ppnPercent`, **bawaan 11 bila kosong (tertulis di kode)** | Tahap 5: alat tambahan harga SPH, PPN dari data master (F11.4) |
| **Aset kalibrator** | `CalibratorAssetManager.tsx`, `data/spreadsheetCalibrators.ts` | Identitas, sertifikat, lab, tertelusur, jatuh tempo, peminjaman. Tabel `aset_kalibrator` (57 aktif). **Belum ada tabel koreksi & U95** | Tahap 4/8: `tera_calibrator_points` (F12.1) |
| **Master teknisi** | `MasterHospitalAndTech.tsx` | Tabel `teknisi` (11): nama, jabatan, STR, email. **Belum tertaut ke akun login** | Tahap 1: tautan akun ↔ teknisi (F1.6) |
| **Pengaturan** | `TemplateSettings.tsx`, tabel `settings` | Kunci yang ada: `templates`, `appConfig`, `branding`. Belum ada `ppn_persen`, alamat master, penandatangan | Tahap 5/8 |

---

## 9. Struktur database asli vs dokumen

### 9.1 Tabel `public` (18 Okt 2026, semua RLS aktif)

| Tabel | Baris | Catatan penting |
|---|---:|---|
| `labels` | 3.934 | Kunci `no_label`; kolom `verify_code`, `qr_secured`, `void_reason`, `voided_at`, `pdf_source`, `pdf_url`, `pdf_drive_url`, `pdforiginal_url`, `id` (bigint unik). Aturan `labels_hanya_nomor_asli` (tidak boleh diawali `__`) |
| `folder_label` | 27 | `prefix` (BO), `nama_rs`, `id_rumah_sakit`. **Prefix `999` sudah ada, 0 label** |
| `jadwal_kalibrasi` | 2 | `data` JSON + kolom ringkasan (`label_awal`, `label_akhir`, `nomor_bap`, `nomor_bastp`, `sumber`, `jumlah_unit_sph`, `jumlah_unit_realisasi`, `selisih_unit`, …) |
| `dokumen_sph` | 2 | Ada kolom `ppn_persen`, `nilai_ppn`, `sumber` (web/transisi), `file_sph` |
| `dokumen_bap` | 5 | `nomor_bap`, `nomor_bastp`, `folder_label` (FK) |
| `rumah_sakit` | 1 | `kode_rs`, alamat, PIC, `aspak_id` |
| `teknisi` | 11 | `nama`, `jabatan`, `nomor_str`, `email`, `manajer` — **tanpa `user_id`** |
| `aset_kalibrator` | 57 aktif | `nomor_sertifikat`, `tertelusur_ke`, `jatuh_tempo_kalibrasi`, `lab_kalibrasi` |
| `kamus_nama_alat` | 31 | Nama di SPH → nomor & nama katalog |
| `riwayat_realisasi` | — | Riwayat perubahan qty jadwal transisi |
| `profiles` | 11 | `role` (teks, aturan 4 role), `email`, `full_name` |
| `settings` | 3 kunci | `key`/`value` teks |
| `activity_log`, `api_idempotency` | — | Log & idempotensi (khusus server) |
| `aset_keuangan`, `transaksi_keuangan`, `aset_tablet`, `peminjaman_tablet`, `staf_marketing` | — | Modul lain (tidak disentuh) |

### 9.2 Hak akses browser (anon/authenticated)
- **Semua tabel kecuali `profiles`: tidak ada policy & tidak ada GRANT** → browser tidak bisa membaca/menulis langsung. ✅ Semua lewat server.
- `profiles`: policy *baca semua profil* (login), *ubah profil sendiri* (kolom `full_name`, `avatar_url`), *admin_utama kelola semua*. Trigger `trg_prevent_profile_role_escalation` aktif. ⚠️ Peran `authenticated` juga masih memegang hak tabel **INSERT, DELETE, TRUNCATE, TRIGGER, REFERENCES** pada `profiles` (INSERT/DELETE tetap dicegat RLS; TRUNCATE tidak bisa dipanggil lewat API browser, tapi sebaiknya dicabut — R9).

### 9.3 Trigger & fungsi
- `internal.isi_kolom_otomatis` (semua tabel koleksi), `internal.isi_kolom_transisi`, `internal.kunci_data_transisi`, `internal.catat_riwayat_realisasi`, `internal.catat_upload_sph_transisi`, `internal.isi_folder_label`, `internal.normalkan_kamus_alat`, `internal.pastikan_folder_ada`.
- `public.get_current_user_role()` (SECURITY DEFINER), `public.prevent_profile_role_escalation()`, `public.generate_label_verify_code()`, `public.cek_sph_ganda()`, `public.rls_auto_enable()`.
- Skema `internal` tidak dibuka untuk anon (tidak bisa dipanggil dari browser). ✅
- Ekstensi: `pgcrypto`, `uuid-ossp`, `pg_stat_statements`, `supabase_vault`. **Belum ada `pg_cron`** (relevan untuk backup Tahap 9).
- Tidak ada tabel di publikasi *realtime* Postgres; realtime hanya dipakai sebagai siaran (*broadcast*).

### 9.4 Koreksi terhadap PRD Lampiran B & CLAUDE.md (untuk disetujui)
| Dokumen menulis | Kenyataan di database/kode | Dampak |
|---|---|---|
| `jadwal_kalibrasi` "tambah kolom `label_cadangan_awal`…" | Kolom baru tidak akan terisi oleh website lama (hanya JSON yang dikirim) | Simpan data push di tabel `tera_jadwal_push` atau di JSON — diputuskan Tahap 3 |
| `teknisi` "tambah `user_id`" | Bisa ditambah, tetapi tidak diisi trigger; perlu diisi oleh fungsi Developer | Aman, dikerjakan Tahap 1 |
| `settings` kunci `ppn_persen` | Server hanya mengizinkan kunci tertentu (regex `ALLOWED_SETTINGS_KEY_REGEX`) | Kunci baru perlu ditambahkan ke daftar server (Tahap 5/8) |
| CLAUDE.md 13.9 "logo `public/logo-smk.svg`" | Ada ✅ (juga `.png`, `.webp`, versi gelap) | — |
| CLAUDE.md 4.1 "data uji BO 999" | Folder `999` sudah ada & kosong ✅ | — |
| `supabase_schema.sql` di repo | **Usang** (masih menyebut `app_collections`, tabel itu sudah tidak ada) | Jangan dipakai sebagai acuan (F0.8) |

---

## 10. Penyimpanan file (Storage)

| Bucket | Publik? | Batas | Isi | Policy browser |
|---|---|---|---|---|
| `internal-documents` | Privat | 10 MB; pdf/xlsx/docx/jpg/png | 1 file | Hanya **upload** oleh 4 role kantor ke folder `sph/ spk/ bap/ financial/ invoices/ contracts/`; baca lewat signed URL server |
| `documents` | **Publik** | 10 MB; termasuk svg | **0 file** | **Tidak ada policy** → upload dari browser (`uploadPublicAsset`) akan gagal lalu jatuh ke Base64. Jangan dipakai untuk sertifikat (PRD B.3) |
| `tera-certificates`, `tera-assets`, `tera-backups` | — | — | Belum ada | Dibuat di Tahap 4/9 (privat) |

---

## 11. Vercel & domain

| Domain | Perilaku |
|---|---|
| `saranamultikalibrasi.com` | Produksi utama |
| `www.saranamultikalibrasi.com` | Dialihkan (308) ke domain utama |
| `manajemen-aset-smk.vercel.app` | Produksi |
| `qrcode-smk.vercel.app`, `smk-labelqr.vercel.app` | Dialihkan (307) ke `manajemen-aset-smk.vercel.app` |

Sesuai F14.7 — **semua alamat lama hidup**. Tidak boleh diubah.

**Variabel lingkungan** (nama saja): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `GOOGLE_DRIVE_API_KEY`, dan kunci integrasi `POSTGRES_*`, `SUPABASE_JWT_SECRET`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_*` → **hanya target *Production***. `GEMINI_API_KEY` dan `APP_URL` → Production + Preview.
- ⚠️ Di Preview, `api/index.ts` gagal start (kunci service role tidak ada) → semua `/api` menjawab 503 (R1).
- Browser tetap tersambung ke Supabase di Preview karena `vite.config.ts` punya alamat & kunci *anon* cadangan tertulis (kunci anon memang publik; dicatat saja).

**Proteksi:** *Vercel Authentication* aktif untuk "semua kecuali domain kustom" → link Preview butuh login Vercel (R2). Node.js 24.x. Deploy produksi terakhir: siap (READY).

---

## 12. Daftar risiko

Tingkat: 🔴 tinggi (harus ditangani sebelum/di Tahap 1) · 🟠 sedang (ditangani di tahap terkait) · 🟡 rendah (dicatat).

| # | Risiko | Tingkat | Bukti | Mitigasi / kapan |
|---|---|---|---|---|
| R1 | Preview `tera-dev` tidak punya kunci server → API 503, uji F0.6 tidak bisa | 🔴 | Env `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY` hanya Production | Tahap 1 langkah 1: tambahkan kedua variabel untuk **Preview, cabang `tera-dev` saja**. Isi disalin pemilik produk dari Supabase → API Settings (tidak lewat chat) |
| R2 | Link Preview dikunci login Vercel → HP/tablet teknisi tidak bisa uji | 🟠 | `ssoProtection: all_except_custom_domains` | Pakai "Share" (link berbagi sementara) dari halaman deployment Vercel saat uji; proteksi **tidak dimatikan** |
| R3 | Menambah `teknisi` ke daftar role umum membuka data kantor ke teknisi (jadwal semua RS, RS, teknisi, kalibrator, **semua label + kode QR**, pengaturan, signed-url) | 🔴 | `requireAuth` hanya cek "role resmi"; `canReadCollection` mengizinkan "semua role resmi"; `GET /api/labels` & `/api/settings` hanya `requireAuth` | Tahap 1: pisahkan `ROLE_KANTOR` (4 role lama, dipakai semua endpoint lama) dan `ROLE_TERA` (`teknisi`, `admin_utama`) untuk endpoint `/api/tera/*` baru. Endpoint lama **tetap menolak** teknisi |
| R4 | `/tera` jatuh ke halaman publik scan (rute tangkap-semua) | 🟠 | `App.tsx` `path="*"` | Tahap 1: rute `/tera/*` dipasang sebelum `*`; `tera` ditambah ke `RESERVED_PATHS` |
| R5 | QR label berisi domain tempat admin membuka website; label dibuat dari Preview → QR rusak di stiker | 🔴 (operasional) | `getPublicUrl()` memakai pengaturan `settings.general.publicBaseUrl`; kunci `general` **belum ada** di database → jatuh ke `window.location.origin` | **Aturan kerja: generate/cetak label hanya dari `saranamultikalibrasi.com`.** Perbaikan tanpa ubah kode (F14.8): isi pengaturan `general` = `{"publicBaseUrl":"https://saranamultikalibrasi.com"}` lewat SQL 4 blok di Tahap 1 (perlu izin, P5) |
| R6 | Repo publik, `.gitignore` belum mengecualikan `_referensi/` | 🔴 | `.gitignore` hanya `.env*`, `dist`, dll. | ✅ Sudah ditangani: `_referensi/` ditambahkan ke `.gitignore` di commit Tahap 0 |
| R7 | Label lama tanpa kode QR (1.041) bisa dibuka dengan menebak nomor | 🟡 | `qr_secured = false` | Disengaja agar stiker lama tetap jalan. Tidak diubah |
| R8 | Semua role kantor (termasuk `hanya_sph`, `admin_keuangan`) bisa membaca seluruh label + `verify_code` lewat API & membuka layar `/admin/labels` | 🟠 | `GET /api/labels` hanya `requireAuth`; `AdminLayout` tanpa cek role | Dicatat; perbaikan **hanya bila diminta** (bukan bagian Tera SMK) |
| R9 | `authenticated` memegang hak tabel INSERT/DELETE/TRUNCATE di `profiles` | 🟡 | Hasil Q4 | Usul migrasi kecil `REVOKE` di Tahap 1 (4 blok, perlu izin). INSERT/DELETE sudah dicegat RLS |
| R10 | Admin Teknik tidak bisa membaca/menulis BAP di server, padahal PRD menempatkan BAP/BASTP di Admin Teknik | 🟠 | `canReadCollection/canWriteCollection('bapDocuments')` = utama & keuangan | Ditinjau di Tahap 5 (tanya pemilik produk — P3) |
| R11 | Tabel lama berbasis JSON + trigger; kolom tambahan tidak terisi website lama | 🟠 | `isi_kolom_otomatis` | Data Tera di tabel `tera_` sendiri (tabel lama & trigger tidak disentuh) |
| R12 | PDF Tera di bucket privat tidak bisa ditampilkan oleh halaman scan sekarang | 🟠 | Saringan `safeCertUrlOrNull`, tidak ada `pdfSource` | Tahap 4: cabang khusus `pdf_source = 'tera'` → signed URL pendek |
| R13 | Data BAP jadwal `SCH-702048`: label `100.0001–100.0149` tetapi `nomor_bap` = `200/SMK/BAP/IX/2026` (PRD 11.23: BAP = BO = prefix label) | 🟡 | Hasil query jadwal | Tidak diubah; ditanyakan (P1) |
| R14 | Kode lama besar & belum ada test otomatis | 🟠 | Tidak ada folder test | Perubahan kecil & terisolasi di `src/tera/`; golden-file test hanya untuk mesin hitung (Tahap 4) |
| R15 | PPN bawaan 11 tertulis di kode penagihan | 🟡 | `billingHelpers.ts` `sph.ppnPercent \|\| 11` | Tahap 5 (F11.4) |
| R16 | Batas fungsi Vercel 60 detik & ±4,5 MB respons | 🟠 | `vercel.json`, komentar di `app.ts` | Sinkron 1 LKK per paket; PDF diukur di Tahap 4 |
| R17 | Siaran realtime halaman scan tidak cocok nama kejadian | 🟡 | `labels_changed` vs `labels_updated` | Dicatat, tidak diubah |
| R18 | Backup harian Supabase berada di project yang sama (PRD R "backup di project sama") | 🟠 | — | Sebelum migrasi pertama: unduh backup terbaru (Database → Backups) ke laptop |

---

## 13. Aturan pengaman yang berlaku mulai Tahap 1 (F0)

1. **Tabel baru berawalan `tera_`**; tabel lama hanya boleh **ditambah kolom** (F0.1–F0.2). Trigger & fungsi lama tidak diubah.
2. **Setiap migrasi = 4 blok** (BACKUP · PERUBAHAN · CEK · BATALKAN), dijelaskan dulu dengan bahasa awam, dijalankan setelah kata **"lanjutkan"**, dan disimpan sebagai `supabase/migrations/NNNN_nama.sql` (F0.3–F0.4). Contoh blok BACKUP: `create table backup_20261020_profiles as table public.profiles;`
3. **Sebelum migrasi pertama**: unduh backup database terbaru dari Supabase (Database → Backups) ke laptop/Drive (R18).
4. **BO uji `999`** + `is_test = true` untuk semua data uji (F0.5). Folder `999` sudah ada & kosong. Label uji `999.xxxx` hanya dibuat lewat jalur yang ditandai uji, tidak pernah dicetak untuk RS.
5. **Uji di Preview `tera-dev`**, bukan langsung di `main` (F0.6) — setelah R1 & R2 ditangani.
6. **Jangan generate/cetak label dari link Preview** (R5).
7. **`_referensi/` tidak pernah masuk repo publik** (F0.9).
8. **Sumber struktur = database langsung** (F0.8); jalankan ulang `docs/audit-fase0-query.sql` bila ragu.
9. Cara kerja (diperbarui 18 Okt 2026, CLAUDE.md 2A): Claude commit & push **hanya ke `tera-dev`** setelah build lolos; **`main` hanya digabung pemilik produk**. Perubahan Supabase & Vercel dijelaskan dulu dan dijalankan setelah "lanjutkan".

---

## 14. Rencana Tahap 1 (dipecah per giliran, maks ±3 file)

Tujuan Tahap 1 (PRD 9): dua PWA (`/admin` & `/tera`), role `teknisi`, login & pengalihan per role, tema Ocean, tata letak HP/tablet. Selesai bila F1 & F14 lolos.

| Giliran | Isi | Menyentuh |
|---|---|---|
| **1.0 Persiapan** | (a) ✅ cabang `tera-dev` sudah ada. (b) ✅ `.gitignore` (+`_referensi/`), `PRD.md`, `CLAUDE.md`, `docs/audit-fase0*` sudah di-commit ke `tera-dev`. (c) Vercel: tambah `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY` untuk **Preview cabang `tera-dev`** (R1). (d) Unduh backup database (R18). (e) Buat akun `@tera.smk` (Auto Confirm, **tanpa** profil) | GitHub, Vercel env, Supabase Auth |
| **1.1 Migrasi `0001_role_teknisi`** | SQL 4 blok: aturan `chk_profiles_official_role` + `teknisi`; kolom `teknisi.user_id` (uuid, nullable, unik); `REVOKE` hak berlebih `profiles` (R9, bila disetujui P2); pengaturan `general.publicBaseUrl` (R5, bila disetujui P5). Trigger anti-eskalasi **tetap** | Database (`profiles`, `teknisi`) |
| **1.2 Server: pemisahan role** | `src/middleware/auth.ts`: `ROLE_KANTOR` (4 lama, perilaku lama tidak berubah) + `requireTeraAuth` (`teknisi`, `admin_utama`); `/api/auth/me` mengembalikan `teknisi` juga; `src/server/teraRoutes.ts` kosong berisi `GET /api/tera/me` | 2–3 file server |
| **1.3 Browser: login & pengalihan** | `AuthContext` mengenal `teknisi`; teknisi yang membuka `/`, `/admin*`, `/portal-aset` → dialihkan ke `/tera`; role kantor yang membuka `/tera` → ditolak (kecuali `admin_utama`) | `AuthContext.tsx`, `App.tsx`, `labelParser.ts` (tambah `tera` ke RESERVED) |
| **1.4 Kerangka Tera SMK** | `src/tera/` — tema Ocean (token CSS), font Inter, layar Login Tera, Beranda kosong, tab bawah Beranda·LKK·Akun, tata letak HP/tablet portrait/landscape (skill ui-ux-pro-max + checklist) | File baru saja |
| **1.5 Dua PWA** | `public/tera/manifest.webmanifest` (scope `/tera/`, ikon `_logo/`) + `public/tera/sw.js` (cangkang saja; data offline di Tahap 2); `public/admin/manifest.webmanifest` (scope `/admin/`, logo PT SMK) + `public/admin/sw.js` (cangkang + pesan "Anda sedang offline"). **Halaman scan tidak pernah di-cache** (SW hanya di scope masing-masing). `index.html` memilih manifest sesuai alamat | `public/`, `index.html` |
| **1.6 Uji** | Daftar uji F1 & F14 di laptop, HP, tablet (link berbagi Preview): pasang 2 ikon, teknisi ditolak di `/admin`, `/sertifikat/...` lama tetap jalan dari 4 alamat lama, offline Manajemen Aset → pesan jelas | — |

Catatan rancangan:
- **Rute `/admin`**: PWA Manajemen Aset memakai `start_url` `/admin/` yang sudah mengalihkan per role (utama → dasbor label, lainnya → portal). Alamat `/` dan `/portal-aset` **tetap jalan** seperti sekarang (bookmark lama aman).
- Service worker ditulis tangan & kecil (tanpa plugin tambahan) di Tahap 1; pustaka Workbox/Dexie dipertimbangkan di Tahap 2 (cek dokumentasi terbaru dulu).
- Tidak ada perubahan pada modul SPH, label, penagihan, keuangan, aset di Tahap 1.

---

## 15. Pertanyaan untuk pemilik produk (baru, bukan keputusan bagian 11)

| # | Pertanyaan | Nilai bawaan bila tidak dijawab |
|---|---|---|
| P1 | Jadwal `SCH-702048` memakai label `100.xxxx` tetapi nomor BAP `200/...`. Apakah BO 100 ini memang bernomor BAP 200 (data lama), atau salah ketik? | Dibiarkan; aturan BAP = BO berlaku untuk jadwal baru |
| P2 | Bolehkah hak tabel berlebih `profiles` (INSERT/DELETE/TRUNCATE untuk `authenticated`) dicabut di migrasi 0001? (Tidak mengubah cara kerja website) | Ya, dicabut (dengan backup & blok BATALKAN) |
| P3 | Saat ini **Admin Teknik tidak bisa membuka/menyimpan BAP** di server (hanya Admin Utama & Keuangan). PRD menempatkan BAP/BASTP di Admin Teknik. Apakah memang disengaja? | Ditinjau di Tahap 5; tidak diubah sebelumnya |
| P4 | Untuk alat tambahan, apakah rentang "Cadangan Laik Pakai" yang sudah tercetak boleh **diusulkan otomatis** sebagai rentang cadangan jadwal (bagian 5)? | Ya, diusulkan; Admin Teknik tetap bisa mengubah |
| P5 | Bolehkah di Tahap 1 ditambahkan pengaturan `general.publicBaseUrl = https://saranamultikalibrasi.com` agar QR baru **selalu** memakai domain resmi, dari alamat mana pun admin membuat label (R5, F14.8)? | Ya, ikut migrasi 0001 |
| P6 | *(ditambah 18 Okt, Tahap 1.2)* Aturan RLS lama "Users can read all profiles" membuat **setiap akun login (termasuk teknisi) bisa membaca daftar semua profil** (nama, email, role) langsung dari database. Bolehkah dipersempit: teknisi hanya membaca profilnya sendiri, role kantor tetap seperti sekarang? | Diusulkan sebagai migrasi kecil terpisah sebelum teknisi dipakai sungguhan (Tahap 1.3/1.6) |

---

## Lampiran — Query SQL (hanya membaca)

File lengkap: **`docs/audit-fase0-query.sql`** (13 query, Q1–Q13). Semua `SELECT`, tanpa perubahan. Jalankan satu blok per kali di **Supabase → SQL Editor**. Ringkas isinya:

| Query | Untuk melihat |
|---|---|
| Q1 | Daftar tabel, RLS, kolom & tipe |
| Q2 | Jumlah baris tabel penting |
| Q3 | Semua policy RLS (public & storage) |
| Q4 | Hak akses tabel untuk anon/authenticated |
| Q5 | Trigger (public, auth, storage) |
| Q6 | Aturan CHECK/UNIQUE/FK/PK |
| Q7 | Fungsi & siapa yang boleh menjalankan |
| Q8 | Bucket storage & jumlah file |
| Q9 | Status label (termasuk Cadangan Laik Pakai) |
| Q10 | Rentang Cadangan Laik Pakai per folder |
| Q11 | Akun per domain & role (cek admin_utama & `@tera.smk`) |
| Q12 | BO uji 999 masih kosong |
| Q13 | Kunci JSON jadwal (bahan Tahap 3) |

Hasil yang diharapkan saat dijalankan sekarang = angka di bagian 3, 4, 5, 9, dan 10 dokumen ini.
