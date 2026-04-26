import { Box, Typography, List, ListItem, ListItemIcon, ListItemText, Avatar, ListItemButton } from '@mui/material';
import { Outlet, useLocation, Link as RouterLink, useNavigate } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/GridView';
import QueueIcon from '@mui/icons-material/FormatListBulleted';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SettingsIcon from '@mui/icons-material/Settings';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin/dashboard' },
  { text: 'Verification Queue', icon: <QueueIcon />, path: '/admin/verifications' },
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
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F8FAFC' }}>
      {/* Sidebar */}
      <Box 
        sx={{ 
          width: 260, 
          bgcolor: '#1A1FE8', 
          color: '#fff', 
          display: 'flex', 
          flexDirection: 'column',
          flexShrink: 0
        }}
      >
        {/* Logo Area */}
        <Box sx={{ p: 3, pb: 4, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: '-0.03em', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box component="span" sx={{ position: 'relative', width: 24, height: 24, bgcolor: '#fff', borderRadius: '50%', display: 'inline-block' }}>
               <Box sx={{ position: 'absolute', top: 0, right: 0, width: '50%', height: '50%', bgcolor: '#0EA5E9', borderTopRightRadius: '100%' }} />
            </Box>
            nlok
          </Typography>
          <Typography variant="caption" sx={{ color: '#94A3B8', ml: 4 }}>
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
                    borderRadius: 2,
                    bgcolor: isSelected ? 'rgba(255,255,255,0.15)' : 'transparent',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                    py: 1.5
                  }}
                >
                  <ListItemIcon sx={{ color: '#fff', minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text} 
                    primaryTypographyProps={{ fontWeight: isSelected ? 700 : 500, fontSize: '0.95rem' }} 
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>

        {/* Admin User Profile */}
        <Box sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', width: 40, height: 40, fontWeight: 700, fontSize: '0.9rem' }}>
            AU
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={700}>Admin User</Typography>
            <Typography variant="caption" sx={{ color: '#94A3B8' }}>{user?.email || 'admin@onlok.com'}</Typography>
          </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: { xs: 3, md: 5 } }}>
           <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
