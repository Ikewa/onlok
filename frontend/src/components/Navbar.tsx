import { AppBar, Toolbar, Box, Button, Typography, Container, IconButton, Menu, MenuItem, useMediaQuery, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'Report User', to: '/report' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'About', to: '/about' },
];

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
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

          {/* CTA Buttons - Show Sign In on Mobile Landing Page */}
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
              <>
                {!isMobile && (
                  <Button variant="outlined" color="primary" component={RouterLink} to="/dashboard">
                    Dashboard
                  </Button>
                )}
                <Button 
                  variant="contained" 
                  color="error" 
                  onClick={handleLogout}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  Sign Out
                </Button>
              </>
            )}

            {/* Mobile hamburger - only show if NOT on landing page or if authenticated */}
            {isMobile && (location.pathname !== '/' || isAuthenticated) && (
              <>
                <IconButton onClick={handleMenuOpen} color="inherit" sx={{ ml: 1 }}>
                  <MenuIcon />
                </IconButton>
                <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                  {navLinks.map((link) => (
                    <MenuItem key={link.label} component={RouterLink} to={link.to} onClick={handleMenuClose}>
                      {link.label}
                    </MenuItem>
                  ))}
                  {isAuthenticated && (
                    <MenuItem component={RouterLink} to="/dashboard" onClick={handleMenuClose}>Dashboard</MenuItem>
                  )}
                </Menu>
              </>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
