import { useState } from 'react';
import {
  Box, Container, Typography, Button, TextField, Fab,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FlagIcon from '@mui/icons-material/Flag';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function LandingPage() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = () => {
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      bgcolor: '#fff', 
      overflow: 'hidden', // Non-scrollable
      position: 'relative'
    }}>
      <Navbar />

      <Container maxWidth="lg" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', py: { xs: 2, md: 4 }, pb: { xs: '80px', md: 4 } }}>
        <Box sx={{ my: 'auto', width: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ textAlign: 'center', mb: { xs: 2, md: 8 } }}>
            {/* GIGANTIC Size - Virtually Cropped via CSS Zoom */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: { xs: 2, md: 8 } }}>
              <Box 
                sx={{ 
                  width: { xs: '90%', md: 700 }, // Responsive width
                  maxWidth: { xs: 350, md: 700 },
                  height: { xs: 60, md: 150 }, // Scaled height for mobile
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}
              >
                <Box 
                  component="img"
                  src="/logo.png"
                  alt="Onlok Logo"
                  sx={{ 
                    width: '180%', // Reduced zoom to show more of the logo
                    height: 'auto',
                    display: 'block',
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)'
                  }} 
                />
              </Box>
            </Box>

            <Typography 
              variant="body1" 
              sx={{ 
                color: '#64748B', 
                fontSize: { xs: '1rem', md: '1.25rem' }, 
                maxWidth: 600, 
                mx: 'auto', 
                mb: { xs: 3, md: 6 },
                lineHeight: 1.6,
                fontWeight: 500,
                px: { xs: 2, md: 0 }
              }}
            >
              Onlok Is A Dedicated Business Identity Verification Platform. It Is Built Specifically For The Online Global Market And Those That Power It.
            </Typography>
          </Box>

          {/* Search Box */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: { xs: 2, md: 4 }, px: { xs: 2, md: 0 } }}>
            <Box 
              sx={{ 
                width: '100%',
                maxWidth: 800,
                bgcolor: 'white',
                borderRadius: '50px',
                p: { xs: 0.8, md: 1.2 },
                pl: { xs: 2, md: 4 },
                display: 'flex',
                alignItems: 'center',
                boxShadow: '0 20px 50px rgba(0,0,0,0.08)',
                border: '4px solid #94A3B8',
                mx: 'auto',
                position: 'relative'
              }}
            >
              <SearchIcon sx={{ color: '#1A1FE8', mr: 2, fontSize: { xs: 24, md: 32 } }} />
              <TextField
                variant="standard"
                placeholder="Search ONLOK ID (E.G. OL-NG-00545)"
                fullWidth
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
                slotProps={{
                  input: {
                    disableUnderline: true,
                    sx: { 
                      fontSize: { xs: '0.9rem', md: '1.2rem' },
                      fontWeight: 500,
                      '& input::placeholder': { color: '#94A3B8', opacity: 1 }
                    }
                  }
                }}
                sx={{
                  '& .MuiInput-underline:before': { display: 'none' },
                  '& .MuiInput-underline:after': { display: 'none' },
                  '& .MuiInput-underline:hover:not(.Mui-disabled):before': { display: 'none' }
                }}
              />
              <Button
                variant="contained"
                onClick={handleSearch}
                sx={{
                  bgcolor: '#1A1FE8',
                  color: 'white',
                  borderRadius: '30px',
                  px: { xs: 3, md: 6 },
                  py: { xs: 1.2, md: 2 },
                  fontWeight: 800,
                  fontSize: { xs: '0.75rem', md: '1rem' },
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  ml: 1,
                  boxShadow: '0 10px 20px rgba(26,31,232,0.2)',
                  '&:hover': { bgcolor: '#0F14B0' }
                }}
              >
                VERIFY NOW
              </Button>
            </Box>
          </Box>

          {/* Action Buttons — mobile only, grouped with search */}
          <Box sx={{ 
            display: { xs: 'flex', md: 'none' }, 
            gap: 1.5, 
            justifyContent: 'center', 
            px: 2,
            mt: 2
          }}>
            {/* Get Verified — LEFT */}
            <Button
              variant="contained"
              startIcon={
                <Box sx={{ 
                  width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
                  boxShadow: '2px 2px 5px rgba(0,0,0,0.2), -2px -2px 5px rgba(255,255,255,0.5), inset 1px 1px 3px rgba(255,255,255,0.5), inset -1px -1px 3px rgba(0,0,0,0.1)',
                  transform: 'perspective(500px) rotateX(10deg) rotateY(10deg)',
                  mr: 0.5
                }}>
                  <VerifiedUserIcon sx={{ fontSize: 18, color: '#6366F1', filter: 'drop-shadow(1px 1px 1px rgba(99,102,241,0.4))' }} />
                </Box>
              }
              sx={{
                bgcolor: '#6366F1',
                color: 'white',
                borderRadius: '50px',
                px: 2,
                py: 1.5,
                fontWeight: 600,
                fontSize: '0.8rem',
                textTransform: 'none',
                flexGrow: 1,
                '&:hover': { bgcolor: '#4F46E5' }
              }}
              component={RouterLink}
              to="/register"
            >
              Get Verified
            </Button>
            {/* Report A User — RIGHT */}
            <Button
              variant="contained"
              startIcon={
                <Box sx={{ 
                  width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)',
                  boxShadow: '2px 2px 5px rgba(0,0,0,0.2), -2px -2px 5px rgba(255,255,255,0.5), inset 1px 1px 3px rgba(255,255,255,0.5), inset -1px -1px 3px rgba(0,0,0,0.1)',
                  transform: 'perspective(500px) rotateX(10deg) rotateY(-10deg)',
                  mr: 0.5
                }}>
                  <FlagIcon sx={{ fontSize: 18, color: '#E11D48', filter: 'drop-shadow(1px 1px 1px rgba(225,29,72,0.4))' }} />
                </Box>
              }
              sx={{
                bgcolor: '#E11D48',
                color: 'white',
                borderRadius: '50px',
                px: 2,
                py: 1.5,
                fontWeight: 600,
                fontSize: '0.8rem',
                textTransform: 'none',
                flexGrow: 1,
                '&:hover': { bgcolor: '#BE123C' }
              }}
              component={RouterLink}
              to="/report"
            >
              Report A User
            </Button>
          </Box>
        </Box>
      </Container>
      
      {/* Desktop Floating Report Button - Large Circle */}
      <Fab 
        component={RouterLink}
        to="/report"
        sx={{ 
          position: 'absolute', 
          bottom: { md: 48 }, 
          right: { md: 48 },
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          bgcolor: '#E11D48',
          color: 'white',
          width: 130,
          height: 130,
          borderRadius: '50%',
          '&:hover': { 
            bgcolor: '#BE123C',
            transform: 'scale(1.1) rotate(3deg)',
          },
          boxShadow: '0 20px 50px rgba(225,29,72,0.4)',
          transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
      >
        <FlagIcon sx={{ fontSize: 36, mb: 0.5 }} />
        <Typography 
          variant="caption" 
          sx={{ 
            fontWeight: 900, 
            fontSize: '0.75rem', 
            textAlign: 'center', 
            lineHeight: 1.2,
            maxWidth: 80,
            textTransform: 'uppercase'
          }}
        >
          Report<br/>A User
        </Typography>
      </Fab>
    </Box>
  );
}
