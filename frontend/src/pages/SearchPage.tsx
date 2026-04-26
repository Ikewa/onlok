import { useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Typography, TextField, Button,
  CircularProgress, Chip, Avatar, Paper,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VerifiedIcon from '@mui/icons-material/Verified';
import FlagIcon from '@mui/icons-material/Flag';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ShieldIcon from '@mui/icons-material/Shield';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useSearchParams, Link as RouterLink } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { searchVendors } from '../api/dashboard';
import type { VendorSearchResult } from '../types';
import toast from 'react-hot-toast';

type SearchState = 'idle' | 'loading' | 'found' | 'not_found' | 'error';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<VendorSearchResult[]>([]);
  const [state, setState] = useState<SearchState>('idle');

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setState('loading');
    try {
      const res = await searchVendors(q);
      if (res.results.length === 0) {
        setState('not_found');
        setResults([]);
      } else {
        setResults(res.results);
        setState('found');
      }
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    if (initialQuery) doSearch(initialQuery);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ q: query });
    doSearch(query);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied!');
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
          justifyContent: state === 'idle' ? 'center' : 'flex-start',
          pt: state === 'idle' ? 0 : { xs: 6, md: 10 },
          pb: 8,
        }}
      >
        {/* Title */}
        <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 6 }, mt: state === 'idle' ? { xs: -8, md: -12 } : 0 }}>
          <Typography
            variant="h3"
            fontWeight={900}
            sx={{
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
            mb: state !== 'idle' ? { xs: 6, md: 8 } : 0,
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
            disabled={state === 'loading'}
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
            {state === 'loading'
              ? <CircularProgress size={22} color="inherit" />
              : 'VERIFY NOW'}
          </Button>
        </Box>

        {/* ── LOADING ── */}
        {state === 'loading' && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <CircularProgress size={48} sx={{ color: '#1A1FE8' }} />
            <Typography variant="body1" color="#64748B" mt={3} fontWeight={500}>
              Searching database…
            </Typography>
          </Box>
        )}

        {/* ── NOT FOUND ── */}
        {state === 'not_found' && (
          <Box sx={{ textAlign: 'center', maxWidth: 480, mx: 'auto' }}>
            {/* Big X circle */}
            <Box
              sx={{
                width: { xs: 90, md: 110 },
                height: { xs: 90, md: 110 },
                borderRadius: '50%',
                bgcolor: '#FEF2F2',
                border: '3px solid #FECACA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 4,
              }}
            >
              <WarningAmberIcon sx={{ fontSize: { xs: 44, md: 54 }, color: '#DC2626' }} />
            </Box>

            <Typography variant="h4" fontWeight={900} color="#0F172A" mb={1.5}
              sx={{ letterSpacing: '-0.02em', fontSize: { xs: '1.6rem', md: '2.2rem' } }}>
              No Matching ID Found
            </Typography>
            <Typography variant="body1" color="#64748B" mb={1}>
              We couldn't find any vendor matching
            </Typography>
            <Typography
              variant="body1"
              fontWeight={800}
              fontFamily="monospace"
              color="#1A1FE8"
              mb={5}
              sx={{ fontSize: { xs: '1rem', md: '1.2rem' } }}
            >
              "{searchParams.get('q')}"
            </Typography>

            <Typography variant="body2" color="#94A3B8" mb={5}>
              Double-check the Onlok ID or business name and try again.
              If you believe this vendor is operating fraudulently, you can report them below.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                color="error"
                startIcon={<FlagIcon />}
                component={RouterLink}
                to={`/report?vendor=${searchParams.get('q')}`}
                sx={{
                  borderRadius: '50px',
                  px: 4,
                  py: 1.5,
                  fontWeight: 700,
                  textTransform: 'none',
                  fontSize: '1rem',
                  boxShadow: '0 8px 20px rgba(220,38,38,0.2)',
                }}
              >
                Report This ID
              </Button>
              <Button
                variant="outlined"
                component={RouterLink}
                to="/"
                sx={{
                  borderRadius: '50px',
                  px: 4,
                  py: 1.5,
                  fontWeight: 700,
                  textTransform: 'none',
                  fontSize: '1rem',
                  borderColor: '#CBD5E1',
                  color: '#64748B',
                  '&:hover': { borderColor: '#94A3B8', bgcolor: '#F8FAFC' },
                }}
              >
                Back to Home
              </Button>
            </Box>
          </Box>
        )}

        {/* ── ERROR ── */}
        {state === 'error' && (
          <Box sx={{ textAlign: 'center', maxWidth: 420, mx: 'auto' }}>
            <Box
              sx={{
                width: 100, height: 100, borderRadius: '50%',
                bgcolor: '#FFF7ED', border: '3px solid #FED7AA',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                mx: 'auto', mb: 4,
              }}
            >
              <WarningAmberIcon sx={{ fontSize: 50, color: '#EA580C' }} />
            </Box>
            <Typography variant="h5" fontWeight={800} color="#0F172A" mb={1}>
              Connection Error
            </Typography>
            <Typography variant="body2" color="#64748B" mb={4}>
              Could not reach the server. Make sure the backend is running and try again.
            </Typography>
            <Button
              variant="contained"
              onClick={() => doSearch(query)}
              sx={{
                borderRadius: '50px', px: 5, py: 1.5,
                fontWeight: 700, textTransform: 'none',
                bgcolor: '#1A1FE8', '&:hover': { bgcolor: '#0F14B0' },
              }}
            >
              Try Again
            </Button>
          </Box>
        )}

        {/* ── FOUND — Vendor Cards ── */}
        {state === 'found' && results.map((vendor) => {
          const fullName = `${vendor.first_name} ${vendor.last_name}`.trim();
          const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
          const isVerified = vendor.status === 'verified';
          const memberSince = new Date(vendor.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
          const lastVerifiedStr = vendor.last_verified ? new Date(vendor.last_verified).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : 'Pending';
          const trustLevel = isVerified ? 'Level 5 / 5' : 'Level 1 / 5';
          const trustWidth = isVerified ? '100%' : '20%';

          return (
            <Box key={vendor.id} sx={{ width: '100%', maxWidth: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Paper
                elevation={0}
                sx={{
                  width: '100%',
                  borderRadius: 4,
                  border: '1px solid #E2E8F0',
                  overflow: 'hidden',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.04)',
                }}
              >
                {/* Header Bar */}
                <Box sx={{ bgcolor: '#1A1FE8', py: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
                  <VerifiedIcon sx={{ color: '#fff', fontSize: 20 }} />
                  <Typography variant="body2" fontWeight={700} color="#fff">
                    Official ONLOK Public Verification Profile
                  </Typography>
                </Box>

                <Box sx={{ p: { xs: 3, md: 5 } }}>
                  {/* Top Section */}
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', gap: 4, mb: 5 }}>
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 3, md: 4 } }}>
                      {/* Avatar */}
                      <Box sx={{ position: 'relative', width: { xs: 90, md: 120 }, height: { xs: 90, md: 120 }, flexShrink: 0 }}>
                        <Avatar sx={{ width: '100%', height: '100%', bgcolor: '#334155', fontSize: '2.5rem', fontWeight: 800 }}>
                          {initials}
                        </Avatar>
                        {isVerified && (
                          <Box sx={{ position: 'absolute', bottom: 0, right: 0, bgcolor: '#fff', borderRadius: '50%', p: 0.5 }}>
                            <CheckCircleIcon sx={{ color: '#1A1FE8', fontSize: 28 }} />
                          </Box>
                        )}
                      </Box>

                      {/* Info */}
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, flexWrap: 'wrap' }}>
                          <Typography variant="h4" fontWeight={900} color="#1A1FE8" sx={{ letterSpacing: '-0.02em' }}>
                            {fullName}
                          </Typography>
                          <Chip
                            icon={<VerifiedIcon sx={{ fontSize: 16 }} />}
                            label={isVerified ? "FULLY VERIFIED" : "PENDING VERIFICATION"}
                            sx={{
                              bgcolor: isVerified ? '#E0F2FE' : '#FEF3C7',
                              color: isVerified ? '#0369A1' : '#D97706',
                              fontWeight: 800,
                              borderRadius: '50px',
                              height: 28,
                              '& .MuiChip-icon': { color: isVerified ? '#0369A1' : '#D97706', ml: 1 }
                            }}
                          />
                        </Box>
                        <Typography variant="body1" color="#64748B" fontWeight={600} mb={2}>
                          ID: {vendor.vendor_id}
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
                          <Typography variant="body2" color="#475569" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"></path></svg>
                            {vendor.business_name}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                          <Button variant="contained" sx={{ bgcolor: '#1A1FE8', borderRadius: '8px', px: 3, py: 1, textTransform: 'none', fontWeight: 600 }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8 }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                            Contact
                          </Button>
                          <Button variant="outlined" sx={{ borderColor: '#0EA5E9', color: '#0EA5E9', borderRadius: '8px', px: 3, py: 1, textTransform: 'none', fontWeight: 600 }}>
                            <CheckCircleIcon sx={{ fontSize: 18, mr: 1 }} />
                            Proceed with Confidence
                          </Button>
                        </Box>
                      </Box>
                    </Box>

                    {/* Big Shield (Desktop) */}
                    <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                      <Box sx={{ width: 100, height: 110, bgcolor: '#E2E8F0', clipPath: 'polygon(50% 0%, 100% 0, 100% 70%, 50% 100%, 0 70%, 0 0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Box sx={{ width: 60, height: 60, borderRadius: '50%', border: '4px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                           <CheckCircleIcon sx={{ color: '#fff', fontSize: 40 }} />
                        </Box>
                      </Box>
                    </Box>
                  </Box>

                  {/* Bottom Section (Gray bg) */}
                  <Box sx={{ bgcolor: '#F8FAFC', borderRadius: 4, p: { xs: 3, md: 5 }, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: 4, md: 6 } }}>
                    
                    {/* Left Col: Verification Breakdown */}
                    <Box>
                      <Typography variant="h6" fontWeight={800} color="#1A1FE8" mb={2}>
                        Verification Breakdown
                      </Typography>
                      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {[
                          { title: 'Identity Confirmed', desc: isVerified ? 'Identity check passed' : 'Pending review', verified: isVerified },
                          { title: 'Business Registration', desc: vendor.business_name, verified: isVerified },
                          { title: 'Platform Screening', desc: 'Account active and in good standing', verified: true },
                        ].map((item, i) => (
                          <Box key={i} sx={{ display: 'flex', gap: 2 }}>
                            <CheckCircleIcon sx={{ color: item.verified ? '#0EA5E9' : '#CBD5E1', mt: 0.2 }} />
                            <Box>
                              <Typography variant="body2" fontWeight={800} color={item.verified ? '#0EA5E9' : '#64748B'}>{item.title}</Typography>
                              <Typography variant="caption" color="#94A3B8" fontWeight={500}>{item.desc}</Typography>
                            </Box>
                          </Box>
                        ))}
                      </Paper>
                    </Box>

                    {/* Right Col: Trust Level & Details */}
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <Typography variant="h6" fontWeight={800} color="#1A1FE8">
                          Trust Level
                        </Typography>
                        <Typography variant="body2" fontWeight={800} color="#0EA5E9">
                          {trustLevel}
                        </Typography>
                      </Box>
                      <Box sx={{ width: '100%', height: 10, bgcolor: '#E2E8F0', borderRadius: 5, mb: 1, overflow: 'hidden', display: 'flex' }}>
                        <Box sx={{ width: trustWidth, height: '100%', bgcolor: '#0EA5E9' }} />
                      </Box>
                      <Typography variant="caption" color="#94A3B8" fontWeight={500} display="block" mb={4}>
                        {isVerified ? 'High confidence based on verified data.' : 'Vendor is currently pending verification.'}
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <Paper elevation={0} sx={{ flex: 1, p: 2, borderRadius: 3, border: '1px solid #E2E8F0' }}>
                          <Typography variant="caption" color="#64748B" fontWeight={500} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            Member Since
                          </Typography>
                          <Typography variant="body2" fontWeight={800} color="#1A1FE8">{memberSince}</Typography>
                        </Paper>
                        <Paper elevation={0} sx={{ flex: 1, p: 2, borderRadius: 3, border: '1px solid #E2E8F0' }}>
                          <Typography variant="caption" color="#64748B" fontWeight={500} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <ShieldIcon sx={{ fontSize: 14 }} />
                            Last Verified
                          </Typography>
                          <Typography variant="body2" fontWeight={800} color="#1A1FE8">{lastVerifiedStr}</Typography>
                        </Paper>
                      </Box>

                      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #E2E8F0' }}>
                        <Typography variant="caption" color="#1A1FE8" fontWeight={800} display="block" mb={1}>
                          Associated Business
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="body2" color="#1A1FE8" fontWeight={500} mb={0.5}>
                              {vendor.business_name}
                            </Typography>
                            <Typography variant="caption" color="#94A3B8">
                              Status: {vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1)}
                            </Typography>
                          </Box>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                        </Box>
                      </Paper>
                    </Box>

                  </Box>
                </Box>
              </Paper>

              <Button
                component={RouterLink}
                to={`/report?vendor=${vendor.vendor_id}`}
                sx={{ mt: 3, color: '#64748B', textTransform: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <WarningAmberIcon sx={{ fontSize: 18 }} />
                Report this profile
              </Button>
            </Box>
          );
        })}
      </Container>
    </Box>
  );
}
