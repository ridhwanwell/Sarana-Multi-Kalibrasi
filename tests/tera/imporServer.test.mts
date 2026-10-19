// Uji penjaga: semua impor relatif yang dipakai SERVER wajib berakhiran .js.
// Server Vercel menjalankan ESM Node: impor './segel' (tanpa .js) lolos build tetapi membuat
// SELURUH API gagal saat berjalan (kejadian 19 Okt 2026, Preview tera-dev). Jalankan: npm run test:tera:impor
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const akar = fileURLToPath(new URL('../../', import.meta.url));
const mulai = ['api/index.ts', 'server.ts'].filter((f) => existsSync(join(akar, f)));
const pola = /(?:import|export)[^'"]*?from\s+['"](\.{1,2}\/[^'"]+)['"]|import\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g;
const dilihat = new Set<string>();
const salah: string[] = [];
const antre = [...mulai];

function cari(asal: string, spes: string): string | null {
  const p = normalize(join(dirname(asal), spes));
  for (const c of [p.endsWith('.js') ? p.slice(0, -3) + '.ts' : '', p + '.ts', join(p, 'index.ts'), p]) {
    if (c && c.endsWith('.ts') && existsSync(join(akar, c))) return c;
  }
  return null;
}

while (antre.length) {
  const f = antre.pop()!;
  if (dilihat.has(f)) continue;
  dilihat.add(f);
  const isi = readFileSync(join(akar, f), 'utf8');
  for (const m of isi.matchAll(pola)) {
    const s = m[1] || m[2];
    if (!/\.(js|json|mjs|cjs)$/.test(s)) salah.push(`${f}: '${s}'`);
    const t = cari(f, s);
    if (t) antre.push(t);
  }
}

console.log(`${dilihat.size} file server diperiksa.`);
if (salah.length) {
  console.log('GAGAL — impor relatif tanpa .js:\n  ' + salah.join('\n  '));
  process.exit(1);
}
console.log('LULUS — semua impor relatif server berakhiran .js');
