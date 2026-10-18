/* =====================================================================
   MANAJEMEN ASET SMK — SERVICE WORKER ("penjaga gudang"), wilayah HANYA /admin/
   (CLAUDE.md 3A.2; Tahap 1.5b)

   Manajemen Aset SELALU butuh internet untuk data. Penjaga ini hanya:
   - mempercepat buka aplikasi (file /assets/* bernama-hash disimpan di HP);
   - menampilkan pesan jelas bila dibuka tanpa internet.
   Tidak pernah menyimpan halaman/data: /api/... dan Supabase langsung ke internet.
   Hanya mengurus cache berawalan "admin-" (tidak menyentuh cache "tera-" / IndexedDB).
   Halaman publik scan QR (/sertifikat, /scan, /verifikasi, /cert, /label, /)
   berada di luar wilayah /admin/, jadi tidak pernah dilayani file ini.

   Tombol darurat: lihat bagian bawah file.
   ===================================================================== */

const VERSI = '2026-10-18-1';
const CACHE_ASET = 'admin-aset';
const CACHE_STATIS = 'admin-statis-' + VERSI;      // ikon & manifest; versi baru = salinan baru
const BATAS_ASET = 150;

const HALAMAN_OFFLINE =
  '<!doctype html><html lang="id"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
  '<title>Tidak ada internet · Manajemen Aset SMK</title>' +
  '<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;' +
  'font-family:Inter,system-ui,-apple-system,sans-serif;background:#EEEEEE;color:#1E2B35;padding:24px;box-sizing:border-box}' +
  '.k{max-width:420px;width:100%;background:#fff;border:1px solid #DCDFE3;border-radius:14px;padding:24px}' +
  'h1{font-size:22px;font-weight:600;margin:0 0 8px}p{font-size:16px;line-height:1.5;margin:0 0 20px;color:#5B6B78}' +
  'button{width:100%;min-height:48px;border:0;border-radius:12px;background:#1C658C;color:#fff;font-size:15px;font-weight:600;cursor:pointer}' +
  '@media (prefers-color-scheme:dark){body{background:#121B21;color:#EAF4FB}.k{background:#1B262C;border-color:#2B3A44}p{color:#9FB7C7}button{background:#3282B8;color:#0B1220}}' +
  '</style></head><body><main class="k"><h1>Tidak ada internet</h1>' +
  '<p>Manajemen Aset SMK butuh internet untuk menampilkan data. Periksa sinyal atau Wi-Fi, lalu coba lagi.</p>' +
  '<button type="button" onclick="location.reload()">Coba lagi</button></main></body></html>';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const statis = await caches.open(CACHE_STATIS);
    await statis.addAll([
      '/admin/manifest.webmanifest',
      '/admin/admin-icon-192.png',
      '/admin/admin-icon-512.png'
    ]);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const semua = await caches.keys();
    await Promise.all(
      semua
        .filter((nama) => nama.startsWith('admin-statis-') && nama !== CACHE_STATIS)
        .map((nama) => caches.delete(nama))
    );
    const cache = await caches.open(CACHE_ASET);
    const kunci = await cache.keys();
    for (let i = 0; i < kunci.length - BATAS_ASET; i++) await cache.delete(kunci[i]);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;            // Supabase, font, dll.: langsung internet
  if (url.pathname.startsWith('/api/')) return;               // data: selalu internet

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() =>
        new Response(HALAMAN_OFFLINE, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
      )
    );
    return;
  }
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheDulu(req, CACHE_ASET));
    return;
  }
  if (url.pathname.startsWith('/admin/')) {
    event.respondWith(cacheDulu(req, CACHE_STATIS));
  }
});

async function cacheDulu(req, namaCache) {
  const cache = await caches.open(namaCache);
  const simpanan = await cache.match(req);
  if (simpanan) return simpanan;
  const res = await fetch(req);
  if (res.ok) await cache.put(req, res.clone());
  return res;
}

/* =====================================================================
   SW-DARURAT: ganti SELURUH isi file ini dengan baris berikut, commit,
   lalu tunggu perangkat membuka aplikasi sekali.

   self.addEventListener('install', () => self.skipWaiting());
   self.addEventListener('activate', (e) => e.waitUntil((async () => {
     for (const n of await caches.keys()) if (n.startsWith('admin-')) await caches.delete(n);
     await self.registration.unregister();
   })()));
   ===================================================================== */
