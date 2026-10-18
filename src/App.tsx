/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { extractLabelFromLocation } from './lib/labelParser';
import { ThemeProvider, ThemeRouteSync } from './lib/theme';

// Pages
import PublicScanPage from './pages/PublicScanPage';
import AdminLogin from './pages/AdminLogin';
import AdminLayout from './components/AdminLayout';
import AsetPortalApp from './pages/AsetPortalApp';
import TeraApp from './tera/TeraApp';

/**
 * Admin Panel lama (/admin/dashboard, /labels, /generate, /templates) sudah tidak dipakai:
 * isinya sama dengan tab "Label & Cetak Stiker" di portal Manajemen Aset.
 * Alamat lama tetap hidup (bookmark & tombol di dalam modul label) — dibelokkan ke portal,
 * parameter (mis. ?folder=087) ikut dibawa, sub-tab label yang sesuai langsung terbuka.
 */
const PanelLamaKePortal = ({ sub }: { sub?: 'labels' | 'generate' | 'templates' }) => {
  const location = useLocation();
  if (!sub) return <Navigate to="/admin/aset" replace />;
  const params = new URLSearchParams(location.search);
  params.set('modul', 'label');
  params.set('sub', sub);
  return <Navigate to={`/admin/aset?${params.toString()}`} replace />;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="app-surface h-screen w-screen flex flex-col items-center justify-center gap-3 font-sans">
      <span className="smk-spinner" aria-hidden="true" />
      <span className="text-sm text-slate-500">Memuat...</span>
    </div>
  );
  if (!user) return <Navigate to="/admin/login" replace />;
  // Teknisi hanya boleh di Tera SMK
  if (user.role === 'teknisi') return <Navigate to="/tera/" replace />;
  return <>{children}</>;
};

/** Penjaga pintu Manajemen Aset: akun teknisi dialihkan ke /tera/. */
const KantorOnly = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (user?.role === 'teknisi') return <Navigate to="/tera/" replace />;
  return <>{children}</>;
};

/**
 * Route handler for root or base scan paths:
 * If explicit scan route (/sertifikat, /scan, /verifikasi) or explicit label parameter is present,
 * render PublicScanPage.
 * Otherwise, render the main portal (Manajemen Aset & Penjadwalan Kalibrasi RS / Label Stiker).
 */
/** Menyamakan tema (terang / Hitam Kaca) dengan halaman yang sedang dibuka. */
const ThemeLocationSync = () => {
  const location = useLocation();
  return <ThemeRouteSync pathname={location.pathname} search={location.search} />;
};

const ScanOrRedirect = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const foundLabel = extractLabelFromLocation(location);

  const isExplicitScanRoute = location.pathname.startsWith('/sertifikat') || 
                              location.pathname.startsWith('/scan') || 
                              location.pathname.startsWith('/verifikasi') || 
                              location.pathname.startsWith('/cert') || 
                              location.pathname.startsWith('/label');

  const hasExplicitLabelParam = searchParams.has('noLabel') || 
                                searchParams.has('nolabel') || 
                                searchParams.has('label') || 
                                searchParams.has('cert') || 
                                searchParams.has('no_label');

  if ((foundLabel && (isExplicitScanRoute || hasExplicitLabelParam)) || (foundLabel && location.pathname !== '/' && location.pathname !== '')) {
    return <PublicScanPage />;
  }

  return <KantorOnly><AsetPortalApp /></KantorOnly>;
};

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <ThemeLocationSync />
        <Routes>
          {/* Scanned QR code routes with specific label parameter */}
          <Route path="/sertifikat/:noLabel" element={<PublicScanPage />} />
          <Route path="/scan/:noLabel" element={<PublicScanPage />} />
          <Route path="/verifikasi/:noLabel" element={<PublicScanPage />} />
          <Route path="/cert/:noLabel" element={<PublicScanPage />} />
          <Route path="/label/:noLabel" element={<PublicScanPage />} />

          {/* Paths with potential query parameters or fallback */}
          <Route path="/" element={<ScanOrRedirect />} />
          <Route path="/sertifikat" element={<ScanOrRedirect />} />
          <Route path="/sertifikat/*" element={<PublicScanPage />} />
          <Route path="/scan" element={<ScanOrRedirect />} />
          <Route path="/scan/*" element={<PublicScanPage />} />
          <Route path="/verifikasi" element={<ScanOrRedirect />} />
          <Route path="/verifikasi/*" element={<PublicScanPage />} />
          
          <Route path="/admin/login" element={<AdminLogin />} />
          
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<PanelLamaKePortal />} />
            <Route path="dashboard" element={<PanelLamaKePortal />} />
            <Route path="labels" element={<PanelLamaKePortal sub="labels" />} />
            <Route path="generate" element={<PanelLamaKePortal sub="generate" />} />
            <Route path="templates" element={<PanelLamaKePortal sub="templates" />} />
            <Route path="aset" element={<AsetPortalApp />} />
          </Route>

          {/* Direct route to Manajemen Aset standalone portal */}
          <Route path="/portal-aset" element={<KantorOnly><AsetPortalApp /></KantorOnly>} />

          {/* Tera SMK (teknisi) — sebelum catch-all agar /tera tidak dibaca sebagai nomor label */}
          <Route path="/tera/*" element={<TeraApp />} />

          {/* Catch-all sends to PublicScanPage so custom or bare label paths (e.g. /002.0020) work */}
          <Route path="*" element={<PublicScanPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}
