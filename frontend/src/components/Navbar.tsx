import { AppBar, Toolbar, Box, Button, Typography, Container, IconButton, Menu, MenuItem, Popover, Avatar, Divider, useMediaQuery, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import DashboardIcon from '@mui/icons-material/Dashboard';
import EditIcon from '@mui/icons-material/Edit';
import LogoutIcon from '@mui/icons-material/Logout';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import QuickAvatarUploadModal from './QuickAvatarUploadModal';

const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'Report User', to: '/report' },
  { label: 'About', to: '/#about' },
];

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  const handleProfileMenuOpen = (e: React.MouseEvent<HTMLElement>) => setProfileMenuAnchor(e.currentTarget);
  const handleProfileMenuClose = () => setProfileMenuAnchor(null);

  const handleLogout = () => {
    handleProfileMenuClose();
    logout();
    navigate('/login');
  };

  const API_BASE = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000');
  const avatarSrc = user?.profile_picture_url ? `${API_BASE}${user.profile_picture_url}` : undefined;
  const fullName = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || 'Vendor Profile';
  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase() || 'ON';

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <AppBar 
        position={location.pathname === '/' ? 'absolute' : 'sticky'}
        elevation={0} 
        sx={{ 
          bgcolor: location.pathname === '/' ? 'transparent' : 'rgba(255,255,255,0.8)', 
          backdropFilter: location.pathname === '/' ? 'none' : 'blur(10px)', 
          borderBottom: location.pathname === '/' ? 'none' : '1px solid rgba(0,0,0,0.05)',
          pt: { xs: location.pathname === '/' ? 2 : 0, md: 0 },
          top: 0,
          left: 0,
          right: 0
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ py: 1 }}>
            {/* Logo Image - Hidden on mobile landing page to match screenshot */}
            <Box sx={{ display: { xs: location.pathname === '/' ? 'none' : 'flex', md: 'flex' }, alignItems: 'center' }}>
              <RouterLink to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                <Box 
                  sx={{ 
                    height: 45, 
                    width: 200, 
                    overflow: 'hidden',
                    position: 'relative'
                  }}
                >
                  <Box 
                    component="img"
                    src="/logo.png"
                    alt="Onlok Logo"
                    sx={{ 
                      width: '180%', 
                      height: 'auto',
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)'
                    }} 
                  />
                </Box>
              </RouterLink>
            </Box>

            <Box sx={{ flexGrow: 1 }} />

            {/* Desktop nav centered */}
            {!isMobile && (
              <Box sx={{ display: 'flex', gap: 5, position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
                {navLinks.map((link) => (
                  <Button
                    key={link.label}
                    component={RouterLink}
                    to={link.to}
                    disableRipple
                    sx={{
                      color: isActive(link.to) ? '#1A1FE8' : '#64748B',
                      fontWeight: 700,
                      textTransform: 'none',
                      fontSize: '1rem',
                      position: 'relative',
                      px: 1,
                      minWidth: 'auto',
                      transition: 'color 0.2s',
                      '&:hover': { 
                        color: '#1A1FE8', 
                        background: 'transparent'
                      },
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        bottom: -4,
                        left: 0,
                        width: isActive(link.to) ? '100%' : '0%',
                        height: '3px',
                        bgcolor: '#1A1FE8',
                        transition: 'width 0.3s',
                        borderRadius: '10px'
                      }
                    }}
                  >
                    {link.label}
                  </Button>
                ))}
              </Box>
            )}

            {/* CTA Buttons or User Profile Avatar */}
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              {!isAuthenticated ? (
                <>
                  <Button
                    variant="contained"
                    sx={{ 
                      bgcolor: location.pathname === '/' ? '#00BCD4' : '#E8EBFF', 
                      color: location.pathname === '/' ? 'white' : '#1A1FE8',
                      boxShadow: location.pathname === '/' ? '0 4px 14px rgba(0,188,212,0.3)' : 'none',
                      fontWeight: 700,
                      textTransform: 'none',
                      px: { xs: 4, md: 3 },
                      py: { xs: 1.5, md: 1 },
                      borderRadius: '25px',
                      fontSize: { xs: '0.9rem', md: '1rem' },
                      '&:hover': { 
                        bgcolor: location.pathname === '/' ? '#00ACC1' : '#D8DEFF', 
                        boxShadow: 'none' 
                      }
                    }}
                    component={RouterLink}
                    to="/login"
                  >
                    Sign In
                  </Button>
                  
                  {!isMobile && (
                    <Button
                      variant="contained"
                      color="primary"
                      component={RouterLink}
                      to="/register"
                      sx={{ 
                        px: 3,
                        fontWeight: 600,
                        textTransform: 'none',
                        bgcolor: '#1A1FE8',
                        '&:hover': { bgcolor: '#0F14B0' }
                      }}
                    >
                      Get Verified
                    </Button>
                  )}
                </>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {!isMobile && (
                    <Button 
                      variant="outlined" 
                      component={RouterLink} 
                      to="/dashboard"
                      sx={{ 
                        borderRadius: '20px', 
                        textTransform: 'none', 
                        fontWeight: 700,
                        borderColor: '#1A1FE8',
                        color: '#1A1FE8'
                      }}
                    >
                      Dashboard
                    </Button>
                  )}
                  
                  {/* Avatar Button */}
                  <IconButton
                    onClick={handleProfileMenuOpen}
                    sx={{
                      p: 0.5,
                      border: '2px solid #1A1FE8',
                      transition: 'transform 0.2s',
                      '&:hover': { transform: 'scale(1.05)' }
                    }}
                  >
                    <Avatar src={avatarSrc} sx={{ width: 38, height: 38, bgcolor: '#1E293B', fontWeight: 800, fontSize: '0.9rem' }}>
                      {initials}
                    </Avatar>
                  </IconButton>
                </Box>
              )}

            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* User Profile Popover Menu */}
      <Menu
        open={Boolean(profileMenuAnchor)}
        anchorEl={profileMenuAnchor}
        onClose={handleProfileMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            width: 280,
            borderRadius: 3,
            p: 1.5,
            boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
            mt: 1.5
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, mb: 1, bgcolor: '#F8FAFC', borderRadius: 2 }}>
          <Box sx={{ position: 'relative' }}>
            <Avatar src={avatarSrc} sx={{ width: 44, height: 44, bgcolor: '#1E293B', fontWeight: 800 }}>
              {initials}
            </Avatar>
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle2" fontWeight={800} color="#0F172A" noWrap>
              {fullName}
            </Typography>
            <Typography variant="caption" color="#64748B" noWrap display="block">
              {user?.vendor_id ? `ID: ${user.vendor_id}` : user?.email}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 1 }} />

        <MenuItem
          onClick={() => {
            handleProfileMenuClose();
            setAvatarModalOpen(true);
          }}
          sx={{ py: 1.2, borderRadius: 1.5, gap: 1.5 }}
        >
          <CameraAltIcon sx={{ fontSize: 20, color: '#1A1FE8' }} />
          <Typography variant="body2" fontWeight={700} color="#0F172A">
            Change Profile Picture
          </Typography>
        </MenuItem>

        <MenuItem
          component={RouterLink}
          to="/dashboard"
          onClick={handleProfileMenuClose}
          sx={{ py: 1.2, borderRadius: 1.5, gap: 1.5 }}
        >
          <DashboardIcon sx={{ fontSize: 20, color: '#64748B' }} />
          <Typography variant="body2" fontWeight={600} color="#0F172A">
            My Dashboard
          </Typography>
        </MenuItem>

        <MenuItem
          component={RouterLink}
          to="/dashboard/update/bio"
          onClick={handleProfileMenuClose}
          sx={{ py: 1.2, borderRadius: 1.5, gap: 1.5 }}
        >
          <EditIcon sx={{ fontSize: 20, color: '#64748B' }} />
          <Typography variant="body2" fontWeight={600} color="#0F172A">
            Edit Business Info
          </Typography>
        </MenuItem>

        <Divider sx={{ my: 1 }} />

        <MenuItem
          onClick={handleLogout}
          sx={{ py: 1.2, borderRadius: 1.5, gap: 1.5, color: '#EF4444' }}
        >
          <LogoutIcon sx={{ fontSize: 20 }} />
          <Typography variant="body2" fontWeight={700}>
            Sign Out
          </Typography>
        </MenuItem>
      </Menu>

      {/* Quick Avatar Upload Modal */}
      <QuickAvatarUploadModal
        open={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
      />
    </>
  );
}

