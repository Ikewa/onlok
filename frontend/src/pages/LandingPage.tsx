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

      <Container maxWidth="lg" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', py: { xs: 4, md: 12 } }}>
        <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 8 } }}>
          {/* GIGANTIC Size - Virtually Cropped via CSS Zoom */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 8 }}>
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
              mb: 6,
              lineHeight: 1.6,
              fontWeight: 500,
              px: { xs: 2, md: 0 }
            }}
          >
            Onlok Is A Dedicated Business Identity Verification Platform. It Is Built Specifically For The Online Global Market And Those That Power It.
          </Typography>
        </Box>

          {/* Search Box */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4, px: { xs: 2, md: 0 } }}>
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

        {/* Action Buttons Below Search */}
        <Box sx={{ 
          display: { xs: 'flex', md: 'none' }, 
          gap: 1, 
          justifyContent: 'center', 
          flexWrap: 'nowrap', 
          px: 1,
          mb: 4
        }}>
          <Button
            variant="contained"
            startIcon={<FlagIcon />}
            sx={{
              bgcolor: '#E11D48',
              color: 'white',
              borderRadius: '50px',
              px: { xs: 2, md: 4 },
              py: { xs: 1.5, md: 2 },
              fontWeight: 600,
              fontSize: { xs: '0.75rem', md: '1rem' },
              textTransform: 'none',
              minWidth: { xs: 'auto', md: 180 },
              flexGrow: 1,
              '&:hover': { bgcolor: '#BE123C' }
            }}
            component={RouterLink}
            to="/report"
          >
            Report A User
          </Button>
          <Button
            variant="contained"
            startIcon={<VerifiedUserIcon />}
            sx={{
              bgcolor: '#6366F1',
              color: 'white',
              borderRadius: '50px',
              px: { xs: 2, md: 4 },
              py: { xs: 1.5, md: 2 },
              fontWeight: 600,
              fontSize: { xs: '0.75rem', md: '1rem' },
              textTransform: 'none',
              minWidth: { xs: 'auto', md: 180 },
              flexGrow: 1,
              '&:hover': { bgcolor: '#4F46E5' }
            }}
            component={RouterLink}
            to="/register"
          >
            Get Verified
          </Button>
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
