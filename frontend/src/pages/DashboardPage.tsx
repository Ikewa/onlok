import { useEffect, useState } from 'react';
import {
  Box, Container, Typography, Paper, Chip, Avatar, Button,
  CircularProgress, Alert, Divider, IconButton,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VerifiedIcon from '@mui/icons-material/Verified';
import ShieldIcon from '@mui/icons-material/Shield';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboard } from '../api/dashboard';
import type { DashboardData } from '../types';
import toast from 'react-hot-toast';

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  verified: { color: '#fff', bg: '#059669', label: 'Verified' },
  pending: { color: '#fff', bg: '#F97316', label: 'Pending Review' },
  rejected: { color: '#fff', bg: '#DC2626', label: 'Rejected' },
  suspended: { color: '#fff', bg: '#6B7280', label: 'Suspended' },
};

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch(() => setError('Failed to load dashboard. Please refresh.'))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F4F7FB' }}>
        <CircularProgress size={48} sx={{ color: '#1A1FE8' }} />
      </Box>
    );
  }

  const dashUser = data?.user ?? user;
  const badges = data?.badges ?? [];
  const profile = data?.profile;
  const notifications = data?.notifications ?? [];
  const statusInfo = statusConfig[dashUser?.status ?? 'pending'];
  const initials = `${dashUser?.first_name?.[0] ?? ''}${dashUser?.last_name?.[0] ?? ''}`.toUpperCase();
  const fullName = `${dashUser?.first_name ?? ''} ${dashUser?.last_name ?? ''}`.trim();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F4F7FB', pb: 10 }}>
      {/* Top Navbar */}
      <Box sx={{ background: 'linear-gradient(90deg, #1A1FE8 0%, #0A0E6A 100%)', py: { xs: 2, md: 3 }, px: { xs: 2, md: 6 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1400, mx: 'auto' }}>
          <Typography component={RouterLink} to="/" sx={{ textDecoration: 'none', fontWeight: 900, fontSize: '1.5rem', color: '#fff' }}>
            Onlok
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button
              component={RouterLink}
              to="/search"
              variant="outlined"
              sx={{
                borderColor: 'rgba(255,255,255,0.3)', color: '#fff', borderRadius: '50px', px: 3, py: 0.8, textTransform: 'none', fontWeight: 600,
                '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' }
              }}
            >
              Search
            </Button>
            <Button
              onClick={handleLogout}
              variant="outlined"
              startIcon={<LogoutIcon sx={{ fontSize: 18 }} />}
              sx={{
                borderColor: 'rgba(255,255,255,0.3)', color: '#fff', borderRadius: '50px', px: 3, py: 0.8, textTransform: 'none', fontWeight: 600,
                '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' }
              }}
            >
              Sign Out
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ mt: { xs: 4, md: 6 }, px: { xs: 2, md: 6 } }}>
        {error && <Alert severity="error" sx={{ mb: 3, maxWidth: 400 }}>{error}</Alert>}

        {/* The layout in the design is left-aligned. Profile card on top, then the 3 smaller cards below it in a row. */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 900 }}>
          
          {/* Profile Card */}
          <Paper elevation={0} sx={{ p: { xs: 3, md: 5 }, borderRadius: 4, width: '100%', maxWidth: 400, border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <Avatar sx={{ width: 90, height: 90, bgcolor: '#1A1FE8', fontSize: '2.2rem', fontWeight: 700, mb: 2 }}>
                {initials}
              </Avatar>
              <Typography variant="h5" fontWeight={800} color="#0F172A" mb={0.5}>
                {fullName}
              </Typography>
              <Typography variant="body2" color="#64748B" mb={2}>
                {dashUser?.business_name}
              </Typography>

              {/* Vendor ID Pill */}
              <Box
                sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 1, bgcolor: '#F1F5F9',
                  borderRadius: '50px', px: 2, py: 0.5, mb: 2, cursor: 'pointer',
                  '&:hover': { bgcolor: '#E2E8F0' }
                }}
                onClick={() => copyToClipboard(dashUser?.vendor_id ?? '')}
              >
                <Typography variant="caption" fontFamily="monospace" fontWeight={600} color="#475569">
                  {dashUser?.vendor_id}
                </Typography>
                <ContentCopyIcon sx={{ fontSize: 14, color: '#64748B' }} />
              </Box>

              {/* Status Pill */}
              <Chip
                icon={<VerifiedIcon style={{ color: '#fff' }} />}
                label={statusInfo.label}
                sx={{
                  bgcolor: statusInfo.bg, color: statusInfo.color, fontWeight: 700,
                  borderRadius: '8px', px: 1, py: 2.5, mb: 3, width: 'fit-content',
                  '& .MuiChip-icon': { ml: 1 }
                }}
              />

              <Divider sx={{ width: '100%', mb: 3, borderColor: '#F1F5F9' }} />

              {/* Profile Link */}
              <Box sx={{ width: '100%' }}>
                <Typography variant="caption" color="#94A3B8" fontWeight={700} mb={1} display="block" sx={{ letterSpacing: '0.05em' }}>
                  PROFILE LINK
                </Typography>
                <Box
                  sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    bgcolor: '#F4F7FB', borderRadius: 3, p: 2, cursor: 'pointer',
                    '&:hover': { bgcolor: '#Eef2f6' }
                  }}
                  onClick={() => copyToClipboard(profile?.profile_link ?? '')}
                >
                  <Typography variant="caption" color="#475569" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {profile?.profile_link ?? `https://onlok.com/profile/${dashUser?.vendor_id}`}
                  </Typography>
                  <ContentCopyIcon sx={{ fontSize: 16, color: '#64748B', ml: 1 }} />
                </Box>
              </Box>
            </Box>
          </Paper>

          {/* 3 Info Cards Row */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 3 }}>
            
            {/* Badges Card */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <ShieldIcon sx={{ color: '#1A1FE8' }} />
                <Typography variant="h6" fontWeight={800} color="#0F172A">Badges</Typography>
              </Box>
              {badges.length > 0 ? (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {badges.map((b) => (
                    <Chip key={b.id} label={b.badge_type.replace('_', ' ')} sx={{ bgcolor: '#F4F7FB', color: '#1A1FE8', fontWeight: 600, borderRadius: 2 }} />
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="#64748B" sx={{ lineHeight: 1.6 }}>
                  No badges yet. Complete verification to earn your first badge.
                </Typography>
              )}
            </Paper>

            {/* QR Code Card */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: profile?.qr_code_url ? 2 : 3 }}>
                <QrCode2Icon sx={{ color: '#1A1FE8' }} />
                <Typography variant="h6" fontWeight={800} color="#0F172A">QR Code</Typography>
              </Box>
              {profile?.qr_code_url && (
                <Box
                  component="img"
                  src={`http://localhost:5000${profile.qr_code_url}`}
                  alt="QR Code"
                  sx={{ width: 100, height: 100, borderRadius: 2, mb: 2 }}
                  onError={(e: any) => { e.target.style.display = 'none'; }}
                />
              )}
              <Typography variant="body2" color="#64748B" fontWeight={500}>
                {profile?.views ?? 0} profile view{profile?.views !== 1 ? 's' : ''}
              </Typography>
            </Paper>

            {/* Notifications Card */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <NotificationsIcon sx={{ color: '#1A1FE8' }} />
                <Typography variant="h6" fontWeight={800} color="#0F172A">Notifications</Typography>
              </Box>
              {notifications.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {notifications.map((n) => (
                    <Box key={n.id} sx={{ p: 1.5, bgcolor: '#F4F7FB', borderRadius: 2 }}>
                      <Typography variant="body2" color="#0F172A" fontWeight={500} mb={0.5}>{n.message}</Typography>
                      <Typography variant="caption" color="#64748B" display="block">
                        {new Date(n.date).toISOString()}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="#64748B">No new notifications.</Typography>
              )}
            </Paper>
            
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
