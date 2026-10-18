/* =====================================================================
   TERA SMK — SERVICE WORKER ("penjaga gudang"), wilayah HANYA /tera/
   (CLAUDE.md 3A, 5, 12; Tahap 1.5a)

   Tugas:
   - Menyimpan TAMPILAN aplikasi (HTML, JS, CSS, logo, font) supaya Tera SMK
     tetap bisa dibuka tanpa sinyal.
   - TIDAK PERNAH menyimpan data: /api/... dan Supabase selalu langsung ke internet.
     Data LKK disimpan di IndexedDB oleh aplikasi (Tahap 2), bukan di sini.
   - TIDAK PERNAH menghapus IndexedDB. Saat versi baru, yang dibuang hanya
     salinan tampilan lama milik Tera (cache berawalan "tera-").
   - Halaman publik scan QR (/sertifikat, /scan, /verifikasi, /cert, /label, /)
     berada di luar wilayah /tera/, jadi tidak pernah dilayani file ini.

   Tombol darurat: bila suatu saat file ini bermasalah, ganti isinya dengan
   sw-darurat (lihat bagian bawah) supaya semua HP mencopot penjaga ini sendiri.
   ===================================================================== */

const VERSI = '2026-10-18-1';
const CACHE_SHELL = 'tera-shell-' + VERSI;   // halaman /tera/ (index.html)
const CACHE_ASET = 'tera-aset';              // file /assets/* bernama-hash (dipakai lintas versi)
const CACHE_STATIS = 'tera-statis';          // logo, ikon, manifest di /tera/*
const CACHE_FONT = 'tera-font';              // font Inter dari Google Fonts
const HALAMAN = '/tera/';
const BATAS_ASET = 150;                      // jumlah file /assets yang disimpan paling banyak
const TUNGGU_JARINGAN_MS = 3000;             // lewat dari ini -> pakai salinan di HP

const STATIS_AWAL = [
  '/tera/manifest.webmanifest',
  '/tera/tera-emblem-256.webp',
  '/tera/tera-icon-192.png',
  '/tera/tera-icon-512.png',
  '/tera/tera-apple-touch-icon-180.png'
];

const HALAMAN_DARURAT =
  '<!doctype html><html lang="id"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>Tera SMK</title></head>' +
  '<body style="font-family:system-ui,sans-serif;background:#EEF6FB;color:#1E293B;padding:24px">' +
  '<h1 style="font-size:22px">Tera SMK belum tersimpan di perangkat</h1>' +
  '<p style="font-size:16px;line-height:1.5">Buka Tera SMK sekali saat ada internet, ' +
  'setelah itu aplikasi bisa dibuka tanpa sinyal.</p></body></html>';

/* ---------- Pasang: simpan halaman + file tampilan sekaligus (utuh atau gagal) ---------- */
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const res = await fetch(HALAMAN, { cache: 'no-store', credentials: 'same-origin' });
    if (!res.ok) throw new Error('Halaman /tera/ tidak bisa diambil: ' + res.status);
    const html = await res.clone().text();
    const daftarAset = Array.from(
      new Set(Array.from(html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g), (m) => m[1]))
    );
    const aset = await caches.open(CACHE_ASET);
    await aset.addAll(daftarAset);
    const statis = await caches.open(CACHE_STATIS);
    await statis.addAll(STATIS_AWAL);
    const shell = await caches.open(CACHE_SHELL);
    await shell.put(HALAMAN, res);
    await self.skipWaiting();
  })());
});

/* ---------- Aktif: buang salinan tampilan versi lama (HANYA cache "tera-shell-*") ---------- */
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const semua = await caches.keys();
    await Promise.all(
      semua
        .filter((nama) => nama.startsWith('tera-shell-') && nama !== CACHE_SHELL)
        .map((nama) => caches.delete(nama))
    );
    await pangkasAset();
    await self.clients.claim();
  })());
});

async function pangkasAset() {
  const cache = await caches.open(CACHE_ASET);
  const kunci = await cache.keys();
  const lebih = kunci.length - BATAS_ASET;
  for (let i = 0; i < lebih; i++) await cache.delete(kunci[i]); // yang paling lama disimpan dulu
}

/* ---------- Melayani permintaan ---------- */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/api/')) return;                 // data: selalu internet
    if (req.mode === 'navigate') {
      if (url.pathname === '/tera' || url.pathname.startsWith('/tera/')) {
        event.respondWith(bukaHalaman(req));
      }
      return;
    }
    if (url.pathname.startsWith('/assets/')) {
      event.respondWith(cacheDulu(req, CACHE_ASET));              // nama ber-hash, isinya tidak berubah
      return;
    }
    if (url.pathname.startsWith('/tera/')) {
      event.respondWith(salinanLaluPerbarui(req, CACHE_STATIS));
    }
    return;
  }

  if (url.hostname === 'fonts.googleapis.com') {
    event.respondWith(salinanLaluPerbarui(req, CACHE_FONT));
  } else if (url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheDulu(req, CACHE_FONT));
  }
  // Supabase & alamat lain: tidak disentuh (langsung ke internet).
});

/** Halaman: coba internet (maks 3 detik), kalau gagal pakai salinan /tera/ di HP. */
async function bukaHalaman(req) {
  const shell = await caches.open(CACHE_SHELL);
  try {
    const res = await denganBatasWaktu(fetch(req), TUNGGU_JARINGAN_MS);
    if (res.type === 'opaqueredirect') return res;               // pengalihan (mis. login Vercel Preview): ikuti
    const jenis = res.headers.get('content-type') || '';
    if (res.ok && jenis.includes('text/html')) {
      await shell.put(HALAMAN, res.clone());
      return res;
    }
    if (res.ok) return res;
    const simpanan = await shell.match(HALAMAN);
    return simpanan || res;
  } catch (_) {
    const simpanan = await shell.match(HALAMAN);
    if (simpanan) return simpanan;
    return new Response(HALAMAN_DARURAT, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}

async function cacheDulu(req, namaCache) {
  const cache = await caches.open(namaCache);
  const simpanan = await cache.match(req);
  if (simpanan) return simpanan;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') await cache.put(req, res.clone());
  return res;
}

async function salinanLaluPerbarui(req, namaCache) {
  const cache = await caches.open(namaCache);
  const simpanan = await cache.match(req);
  const ambil = fetch(req)
    .then(async (res) => {
      if (res.ok || res.type === 'opaque') await cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);
  if (simpanan) return simpanan;
  const baru = await ambil;
  return baru || Response.error();
}

function denganBatasWaktu(janji, ms) {
  return new Promise((selesai, gagal) => {
    const t = setTimeout(() => gagal(new Error('waktu habis')), ms);
    janji.then((v) => { clearTimeout(t); selesai(v); }, (e) => { clearTimeout(t); gagal(e); });
  });
}

/* =====================================================================
   SW-DARURAT (jangan diaktifkan kecuali ada masalah besar):
   ganti SELURUH isi file ini dengan 4 baris berikut, commit, lalu tunggu
   HP membuka aplikasi sekali. Penjaga akan mencopot diri & membuang cache
   tampilan Tera (IndexedDB/data LKK TIDAK ikut terhapus).

   self.addEventListener('install', () => self.skipWaiting());
   self.addEventListener('activate', (e) => e.waitUntil((async () => {
     for (const n of await caches.keys()) if (n.startsWith('tera-')) await caches.delete(n);
     await self.registration.unregister();
   })()));
   ===================================================================== */
