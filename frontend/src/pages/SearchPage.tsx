import { useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Typography, TextField, Button,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useSearchParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get('q') ?? '';

  const [query, setQuery] = useState(initialQuery);

  const doSearch = useCallback((q: string) => {
    if (!q.trim()) return;
    navigate(`/profile?id=${encodeURIComponent(q.trim())}`);
  }, [navigate]);

  useEffect(() => {
    if (initialQuery) doSearch(initialQuery);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ q: query });
    doSearch(query);
  };


  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        bgcolor: '#fff',
        position: 'relative',
      }}
    >
      <Navbar />

      <Container
        maxWidth="lg"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pb: 8,
        }}
      >
        {/* Title */}
        <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 6 }, mt: { xs: -8, md: -12 } }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 900,
              color: '#0F172A',
              letterSpacing: '-0.03em',
              fontSize: { xs: '2rem', md: '3rem' },
              mb: 1.5,
            }}
          >
            Verify Vendor
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: '#64748B', fontSize: { xs: '0.95rem', md: '1.1rem' } }}
          >
            Find and verify a vendor by their Onlok ID or business name.
          </Typography>
        </Box>

        {/* Search Bar — same style as landing page */}
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            width: '100%',
            maxWidth: 800,
            bgcolor: 'white',
            borderRadius: '50px',
            p: { xs: '8px 8px 8px 20px', md: '10px 10px 10px 32px' },
            display: 'flex',
            alignItems: 'center',
            boxShadow: '0 20px 50px rgba(0,0,0,0.08)',
            mb: 0,
          }}
        >
          <SearchIcon sx={{ color: '#1A1FE8', mr: 2, fontSize: { xs: 24, md: 30 } }} />
          <TextField
            variant="standard"
            placeholder="Search ONLOK ID (E.G. OL-NG-00545)"
            fullWidth
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setSearchParams({ q: query });
                doSearch(query);
              }
            }}
            slotProps={{
              input: {
                disableUnderline: true,
                sx: {
                  fontSize: { xs: '0.9rem', md: '1.1rem' },
                  fontWeight: 500,
                  '& input::placeholder': { color: '#94A3B8', opacity: 1 },
                },
              },
            }}
            sx={{
              '& .MuiInput-underline:before': { display: 'none' },
              '& .MuiInput-underline:after': { display: 'none' },
            }}
          />
          <Button
            type="submit"
            variant="contained"
            sx={{
              bgcolor: '#1A1FE8',
              color: 'white',
              borderRadius: '30px',
              px: { xs: 3, md: 6 },
              py: { xs: 1.5, md: 2 },
              fontWeight: 800,
              fontSize: { xs: '0.75rem', md: '1rem' },
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              boxShadow: '0 10px 20px rgba(26,31,232,0.2)',
              '&:hover': { bgcolor: '#0F14B0' },
            }}
          >
            VERIFY NOW
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
