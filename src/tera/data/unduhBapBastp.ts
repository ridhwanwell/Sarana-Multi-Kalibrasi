/**
 * Unduh BAP / BASTP (Tahap 5.3) — dipakai di PWA Tera (Detail RS) dan Selia Dashboard (detail RS).
 * Server: GET /api/tera/bap/:jadwalId/pdf?jenis=bap|bastp (hak akses dicek di server).
 * PDF diunduh sebagai file (iPhone: tampil pratinjau → bisa dicetak / dibagikan ke pihak RS).
 * Butuh internet: dokumen dibuat dari LKK yang sudah DITERIMA server (bukan LKK yang masih di perangkat).
 */
import { apiFetch } from '../../lib/apiClient';

export type JenisDokumen = 'bap' | 'bastp';

export async function unduhBapBastp(jadwalId: string, jenis: JenisDokumen): Promise<{ ok: true } | { ok: false; pesan: string }> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { ok: false, pesan: 'Tidak ada internet. BAP/BASTP dibuat di server dari LKK yang sudah terkirim — coba lagi saat ada sinyal.' };
  }
  try {
    const r = await apiFetch(`/api/tera/bap/${encodeURIComponent(jadwalId)}/pdf?jenis=${jenis}`, { retries: 0, timeoutMs: 45000 });
    if (!r.ok) {
      const j = await r.json().catch(() => null);
      return { ok: false, pesan: j?.error || 'Dokumen belum bisa dibuat. Coba lagi.' };
    }
    const cd = r.headers.get('Content-Disposition') || '';
    const nama = /filename="([^"]+)"/.exec(cd)?.[1] || `${jenis.toUpperCase()}.pdf`;
    const url = URL.createObjectURL(await r.blob());
    const a = document.createElement('a');
    a.href = url; a.download = nama; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return { ok: true };
  } catch {
    return { ok: false, pesan: 'Server tidak merespons. Coba lagi sebentar.' };
  }
}
