import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import theme from './theme';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MobileBottomNav from './components/MobileBottomNav';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import MagicLoginPage from './pages/MagicLoginPage';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import VerificationPage from './pages/VerificationPage';
import BadgePage from './pages/BadgePage';
import ReferralsPage from './pages/ReferralsPage';
import SearchPage from './pages/SearchPage';
import ReportPage from './pages/ReportPage';
import ReportSuccessPage from './pages/ReportSuccessPage';
import ComingSoonPage from './pages/ComingSoonPage';
import SubscriptionPage from './pages/SubscriptionPage';
import VendorSubscriptionPage from './pages/VendorSubscriptionPage';
import CheckoutPage from './pages/CheckoutPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import ProfileUpdatePage from './pages/ProfileUpdatePage';
import ProfileBioEditPage from './pages/ProfileBioEditPage';
import ProfileDocUploadPage from './pages/ProfileDocUploadPage';
import ProfilePictureUpdatePage from './pages/ProfilePictureUpdatePage';
import PublicProfilePage from './pages/PublicProfilePage';
import BadgeShowcasePage from './pages/BadgeShowcasePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsAndConditionsPage from './pages/TermsAndConditionsPage';
import AdminLayout from './layouts/AdminLayout';
import AdminVerificationQueue from './pages/admin/AdminVerificationQueue';
import AdminVerificationReview from './pages/admin/AdminVerificationReview';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminAlerts from './pages/admin/AdminAlerts';
import AdminComplaints from './pages/admin/AdminComplaints';
import AdminComplaintDetail from './pages/admin/AdminComplaintDetail';
import AdminSettings from './pages/admin/AdminSettings';
import AdminReferrals from './pages/admin/AdminReferrals';
import AdminPayments from './pages/admin/AdminPayments';
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
            <Route path="/magic-login" element={<MagicLoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/report-success" element={<ReportSuccessPage />} />
            <Route path="/pricing" element={<SubscriptionPage />} />
            <Route path="/subscription" element={<SubscriptionPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/payment-success" element={<PaymentSuccessPage />} />
            <Route path="/profile" element={<PublicProfilePage />} />
            <Route path="/badges" element={<BadgeShowcasePage />} />
            <Route path="/about" element={<ComingSoonPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
            <Route path="*" element={<ComingSoonPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="verification" element={<VerificationPage />} />
              <Route path="badge" element={<BadgePage />} />
              <Route path="subscription" element={<VendorSubscriptionPage />} />
              <Route path="referrals" element={<ReferralsPage />} />
              <Route path="update" element={<ProfileUpdatePage />} />
              <Route path="update/bio" element={<ProfileBioEditPage />} />
              <Route path="update/docs" element={<ProfileDocUploadPage />} />
              <Route path="update/avatar" element={<ProfilePictureUpdatePage />} />
            </Route>
            
            {/* Protected Admin Routes */}
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<Navigate to="/admin/verifications" replace />} />
              <Route path="/admin/verifications" element={<AdminVerificationQueue />} />
              <Route path="/admin/verifications/:id" element={<AdminVerificationReview />} />
              <Route path="/admin/payments" element={<AdminPayments />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/alerts" element={<AdminAlerts />} />
              <Route path="/admin/complaints" element={<AdminComplaints />} />
              <Route path="/admin/complaints/:id" element={<AdminComplaintDetail />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/referrals" element={<AdminReferrals />} />
            </Route>
          </Routes>
          <MobileBottomNav />
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
