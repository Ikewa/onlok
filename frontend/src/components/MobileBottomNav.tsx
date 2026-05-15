import { Paper, BottomNavigation, BottomNavigationAction } from '@mui/material';
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

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
        <BottomNavigationAction label="Dashboard" icon={<GridViewOutlinedIcon fontSize="small" />} />
        <BottomNavigationAction label="Search" icon={<SearchOutlinedIcon fontSize="small" />} />
        <BottomNavigationAction label="Earning" icon={<PaymentsOutlinedIcon fontSize="small" />} />
        <BottomNavigationAction label="Badge" icon={<WorkspacePremiumOutlinedIcon fontSize="small" />} />
      </BottomNavigation>
    </Paper>
  );
}
