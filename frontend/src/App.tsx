import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import theme from './theme';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import SearchPage from './pages/SearchPage';
import ReportPage from './pages/ReportPage';
import ComingSoonPage from './pages/ComingSoonPage';
import AdminLayout from './layouts/AdminLayout';
import AdminVerificationQueue from './pages/admin/AdminVerificationQueue';
import AdminVerificationReview from './pages/admin/AdminVerificationReview';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import { Navigate } from 'react-router-dom';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/pricing" element={<ComingSoonPage />} />
            <Route path="/about" element={<ComingSoonPage />} />
            <Route path="*" element={<ComingSoonPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            
            {/* Protected Admin Routes */}
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<Navigate to="/admin/verifications" replace />} />
              <Route path="/admin/verifications" element={<AdminVerificationQueue />} />
              <Route path="/admin/verifications/:id" element={<AdminVerificationReview />} />
              <Route path="/admin/dashboard" element={<ComingSoonPage />} />
              <Route path="/admin/alerts" element={<ComingSoonPage />} />
              <Route path="/admin/settings" element={<ComingSoonPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: '12px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: '0.9rem',
            },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}
