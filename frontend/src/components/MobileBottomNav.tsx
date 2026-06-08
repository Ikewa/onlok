import { Box, Paper, BottomNavigation, BottomNavigationAction } from '@mui/material';
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const get3DIcon = (IconComponent: any, color: string, gradient: string) => (
  <Box sx={{ 
    width: 34, height: 34, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: gradient,
    boxShadow: '2px 2px 5px rgba(0,0,0,0.15), -2px -2px 5px rgba(255,255,255,0.9), inset 1px 1px 2px rgba(255,255,255,0.6), inset -1px -1px 2px rgba(0,0,0,0.05)',
    transform: 'perspective(500px) rotateX(10deg) rotateY(-5deg)',
    transition: 'all 0.3s ease',
  }}>
    <IconComponent sx={{ fontSize: 20, color: color, filter: `drop-shadow(1px 1px 2px ${color}80)` }} />
  </Box>
);

export default function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  // Hide bottom nav on admin pages, login, register, etc
  if (location.pathname.startsWith('/admin') || location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/checkout' || location.pathname === '/payment-success') {
    return null;
  }

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const getMobileActiveIndex = () => {
    if (isActive('/search')) return 1;
    if (isActive('/dashboard/referrals')) return 2;
    if (isActive('/dashboard/badge')) return 3;
    if (isActive('/dashboard')) return 0;
    return -1;
  };

  const handleMobileNav = (event: any, newValue: number) => {
    if (newValue === 1) {
      navigate('/search');
      return;
    }

    if (!isAuthenticated) {
      toast.error('Please sign in to access this page.');
      navigate('/login');
      return;
    }

    if (newValue === 0) navigate('/dashboard');
    if (newValue === 2) navigate('/dashboard/referrals');
    if (newValue === 3) navigate('/dashboard/badge');
  };

  return (
    <Paper 
      sx={{ 
        position: 'fixed', bottom: 0, left: 0, right: 0, 
        display: { xs: 'block', md: 'none' }, zIndex: 9999,
        boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
      }} 
      elevation={3}
    >
      <BottomNavigation
        showLabels
        value={getMobileActiveIndex()}
        onChange={handleMobileNav}
        sx={{
          height: 65,
          '& .MuiBottomNavigationAction-root': {
            minWidth: 'auto',
            color: '#94A3B8',
            '&.Mui-selected': { color: '#3B82F6' },
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: '0.7rem',
            fontWeight: 500,
            mt: 0.5,
            '&.Mui-selected': { fontSize: '0.7rem', fontWeight: 600 }
          }
        }}
      >
        <BottomNavigationAction label="Dashboard" icon={get3DIcon(GridViewOutlinedIcon, '#3B82F6', 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)')} />
        <BottomNavigationAction label="Search" icon={get3DIcon(SearchOutlinedIcon, '#8B5CF6', 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)')} />
        <BottomNavigationAction label="Earning" icon={get3DIcon(PaymentsOutlinedIcon, '#10B981', 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)')} />
        <BottomNavigationAction label="Badge" icon={get3DIcon(WorkspacePremiumOutlinedIcon, '#F59E0B', 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)')} />
      </BottomNavigation>
    </Paper>
  );
}
