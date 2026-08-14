import { Box, Typography, List, ListItem, ListItemIcon, ListItemText, Avatar, ListItemButton } from '@mui/material';
import { Outlet, useLocation, Link as RouterLink, useNavigate } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/GridView';
import QueueIcon from '@mui/icons-material/FormatListBulleted';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SettingsIcon from '@mui/icons-material/Settings';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin/dashboard' },
  { text: 'Verification Queue', icon: <QueueIcon />, path: '/admin/verifications' },
  { text: 'Referrals & Payouts', icon: <AccountBalanceWalletOutlinedIcon />, path: '/admin/referrals' },
  { text: 'Complaints & Reports', icon: <WarningAmberIcon />, path: '/admin/complaints' },
  { text: 'Alerts & Risk', icon: <WarningAmberIcon />, path: '/admin/alerts' },
  { text: 'Admin Settings', icon: <SettingsIcon />, path: '/admin/settings' },
];

export default function AdminLayout() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Protect route
  if (user && user.role !== 'admin') {
    return (
      <Box sx={{ p: 5, textAlign: 'center' }}>
        <Typography variant="h5" color="error">Not Authorized</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F4F5FA', fontFamily: 'Inter, sans-serif' }}>
      {/* Sidebar */}
      <Box 
        sx={{ 
          width: 260, 
          bgcolor: '#0B0F3D', 
          color: '#fff', 
          display: 'flex', 
          flexDirection: 'column',
          flexShrink: 0
        }}
      >
        {/* Logo Area */}
        <Box sx={{ p: 3, pb: 4, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <Box sx={{ height: 45, width: 150, overflow: 'hidden', position: 'relative', mb: 1, filter: 'brightness(0) invert(1)' }}>
            <Box component="img" src="/logo.png" alt="Onlok Logo" sx={{ width: '180%', height: 'auto', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
          </Box>
          <Typography variant="caption" sx={{ color: '#9CA3AF', ml: 4, letterSpacing: '0.05em' }}>
            Admin Dashboard
          </Typography>
        </Box>

        {/* Navigation */}
        <List sx={{ px: 2, py: 3, flexGrow: 1 }}>
          {navItems.map((item) => {
            const isSelected = pathname.startsWith(item.path);
            return (
              <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
                <ListItemButton
                  component={RouterLink}
                  to={item.path}
                  sx={{
                    borderRadius: '8px',
                    bgcolor: isSelected ? '#5B5FEC' : 'transparent',
                    '&:hover': { bgcolor: isSelected ? '#5B5FEC' : 'rgba(255,255,255,0.08)' },
                    py: 1.25,
                    px: 2
                  }}
                >
                  <ListItemIcon sx={{ color: '#fff', minWidth: 36 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text} 
                    primaryTypographyProps={{ fontWeight: isSelected ? 700 : 500, fontSize: '0.9rem', fontFamily: 'Inter, sans-serif' }} 
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>

        {/* Admin User Profile */}
        <Box sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: '#5B5FEC', color: '#fff', width: 40, height: 40, fontWeight: 700, fontSize: '0.9rem' }}>
            AU
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={700} sx={{ color: '#FFFFFF', fontSize: '0.88rem' }}>Admin User</Typography>
            <Typography variant="caption" sx={{ color: '#9CA3AF', fontSize: '0.78rem' }}>{user?.email || 'admin@onlok.com'}</Typography>
          </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: { xs: 2.5, md: 4 } }}>
           <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
