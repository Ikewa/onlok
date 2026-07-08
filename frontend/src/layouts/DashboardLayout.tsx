import { Box, Typography, Avatar, Button, IconButton } from '@mui/material';
import { Link as RouterLink, Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import CardGiftcardOutlinedIcon from '@mui/icons-material/CardGiftcardOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import { useAuth } from '../context/AuthContext';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const fullName = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim();

  // Redirect unverified users to the verification status page, but allow them to access the update form
  const isAllowedForUnverified = location.pathname === '/dashboard/verification' || location.pathname.startsWith('/dashboard/update');
  if (user && user.status !== 'verified' && !isAllowedForUnverified) {
    return <Navigate to="/dashboard/verification" replace />;
  }

  // Helper to determine active state
  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const navItem = (path: string, label: string, icon: React.ReactNode, isWarning = false) => {
    const active = isActive(path);
    return (
      <Button
        component={RouterLink}
        to={path}
        startIcon={icon}
        sx={{
          justifyContent: 'flex-start',
          bgcolor: active ? '#3B82F6' : 'transparent',
          color: active ? '#fff' : (isWarning ? '#EAB308' : '#CBD5E1'),
          px: 2.5,
          py: 1.2,
          borderRadius: 2,
          textTransform: 'none',
          fontWeight: active ? 600 : 500,
          '&:hover': {
            bgcolor: active ? '#2563EB' : 'rgba(255,255,255,0.05)',
            color: active ? '#fff' : (isWarning ? '#EAB308' : '#fff'),
          }
        }}
      >
        {label}
      </Button>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Top Nav */}
      <Box sx={{ 
        bgcolor: '#FFFFFF', px: { xs: 2.5, md: 4 }, py: { xs: 1.8, md: 2 }, 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxSizing: 'border-box'
      }}>
        <Box component={RouterLink} to="/" sx={{ textDecoration: 'none', display: 'flex', alignItems: 'center', overflow: 'hidden', width: { xs: 100, md: 140 }, height: 40, position: 'relative' }}>
          <Box component="img" src="/logo.png" alt="Onlok" sx={{ width: '180%', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <IconButton sx={{ color: '#0F172A' }}>
            <NotificationsNoneIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar src={user?.avatar} sx={{ width: 36, height: 36 }} />
            <Typography sx={{ display: { xs: 'none', md: 'block' }, fontWeight: 600, color: '#0F172A', fontSize: '0.95rem' }}>
              {fullName}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flex: 1, minWidth: 0 }}>
        {/* Sidebar (Desktop only) */}
        <Box sx={{ 
          width: 260, flexShrink: 0, bgcolor: '#040B48', display: { xs: 'none', md: 'flex' }, 
          flexDirection: 'column', pt: 3, minHeight: 'calc(100vh - 72px)'
        }}>
          <Box sx={{ flex: 1, px: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {navItem('/dashboard', 'My Profile', <PersonOutlinedIcon />)}
            {navItem('/dashboard/verification', 'Verification', <VerifiedUserOutlinedIcon />)}
            {navItem('/dashboard/badge', 'My Badge', <BadgeOutlinedIcon />)}
            
            <Box sx={{ position: 'relative', mt: 3, mb: 1 }}>
              <Box sx={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 6, height: 6, bgcolor: '#EAB308', borderRadius: '50%' }} />
              {navItem('/dashboard/referrals', 'Referrals / Earn Rewards', <CardGiftcardOutlinedIcon />, true)}
            </Box>
          </Box>
          <Box sx={{ p: 2, pb: 4 }}>
            <Button onClick={handleLogout} startIcon={<LogoutOutlinedIcon />} sx={{ justifyContent: 'flex-start', color: '#CBD5E1', width: '100%', px: 2.5, py: 1.2, borderRadius: 2, textTransform: 'none', fontWeight: 500, '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.05)' } }}>
              Logout
            </Button>
          </Box>
        </Box>

        {/* Content Body */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', pb: { xs: 8, md: 0 }, minWidth: 0 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
