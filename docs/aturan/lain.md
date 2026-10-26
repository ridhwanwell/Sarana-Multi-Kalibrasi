> Dipindah apa adanya dari CLAUDE.md §14–15 (27 Okt 2026). Baca hanya bila: mengerjakan backup data atau merancang fitur mirip aplikasi lama.

## 14. BACKUP DATA

- Selain backup harian Supabase, **ekspor otomatis MINGGUAN** (data LKK CSV/JSON + PDF sertifikat) ke bucket privat **`tera-backups`**.
- **Terverifikasi**: manifest (jumlah LKK, jumlah PDF, checksum) dicocokkan otomatis; gagal → ulang otomatis + status **"Backup gagal"** merah di menu Developer + log.
- Simpan **12 backup terakhir**; uji pulih otomatis tiap bulan.
- Tidak boleh ada backup yang gagal diam-diam.
- Panduan pemulihan: `docs/pemulihan.md`.

---

## 15. PELAJARAN DARI APLIKASI LAMA (ECalib_SMK) — JANGAN DIULANG

| Masalah di ECalib | Aturan di Tera SMK |
|---|---|
| Database Google Sheets/Drive → data tidak terupload semua | Supabase + antrean sinkron dengan konfirmasi server |
| Tombol Upload manual + pilih akun Google | Sinkron otomatis, tanpa tombol Upload |
| Excel diolah di perangkat → berat, macet | Hitungan dari template JSON |
| Layar loading mengunci aplikasi | Sinkron di latar belakang + timeout + coba ulang |
| Form per alat ditulis manual → rumus salah | Semua alat dari template data |
| Kartu transparan, latar ramai, kontras rendah | Kartu & latar padat, palet Ocean, kontras AA |
| Banyak tombol kecil, Hapus di samping Edit | 1 aksi utama, Hapus terpisah + konfirmasi |
| Status hanya tulisan berwarna | Chip warna + ikon + tulisan |
| Popup bertumpuk | Dialog hanya untuk aksi tak bisa dibatalkan |
| Format sertifikat berantakan | PDF sama persis Report All, kop resmi |
