import { useState } from 'react';
import { Box, Typography, Button, TextField, Divider, Grid, Chip, Container } from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SecurityIcon from '@mui/icons-material/Security';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

function OnlokLogo() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, textDecoration: 'none' }} component={RouterLink} to="/">
      <Box sx={{ 
        width: 24, height: 24, borderRadius: '50%', bgcolor: '#1A1FE8', 
        display: 'flex', alignItems: 'center', justifyContent: 'center' 
      }}>
        <Box sx={{ width: 10, height: 10, bgcolor: '#fff', borderRadius: '50%' }} />
      </Box>
      <Typography sx={{ fontWeight: 900, fontSize: '1.5rem', color: '#0F172A', letterSpacing: '-0.04em' }}>
        nlok
      </Typography>
    </Box>
  );
}

const inputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    fontSize: '0.9rem',
    bgcolor: '#F8FAFC',
    '& fieldset': { borderColor: '#E2E8F0' },
    '&:hover fieldset': { borderColor: '#1A1FE8' },
    '&.Mui-focused fieldset': { borderColor: '#1A1FE8' },
  },
  '& .MuiInputLabel-root': { fontSize: '0.82rem', color: '#94A3B8' },
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    cardName: '', cardNumber: '', expiry: '', cvc: '',
    street: '', city: '', postal: '',
  });

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = () => {
    toast.success('Processing payment…');
    setTimeout(() => {
      navigate('/payment-success');
    }, 1000);
  };

  const features = [
    'Unlimited identity verification queries',
    'Priority API access & 99.9% uptime',
    'Dedicated dashboard for team analytics',
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fff', fontFamily: 'Inter, sans-serif' }}>
      {/* Nav */}
      <Box sx={{ bgcolor: '#fff', px: { xs: 2.5, md: 6 }, py: 1.8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9' }}>
        <OnlokLogo />
        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 4 }}>
          {['Home', 'Security', 'About'].map((link) => (
            <Typography key={link} component={RouterLink} to="#" sx={{ fontWeight: 500, fontSize: '0.9rem', color: '#64748B', textDecoration: 'none', '&:hover': { color: '#0F172A' } }}>
              {link}
            </Typography>
          ))}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button component={RouterLink} to="/login" sx={{ display: { xs: 'none', md: 'block' }, bgcolor: '#EEF2FF', color: '#64748B', borderRadius: 2, textTransform: 'none', fontWeight: 600, fontSize: '0.85rem', px: 3, py: 0.8, '&:hover': { bgcolor: '#E0E7FF' } }}>
            Sign In
          </Button>
          <Button component={RouterLink} to="/register" variant="contained" sx={{ bgcolor: '#1A1FE8', borderRadius: 2, textTransform: 'none', fontWeight: 600, fontSize: '0.85rem', px: 3, py: 0.8, '&:hover': { bgcolor: '#1318C0' } }}>
            Get Verified
          </Button>
        </Box>
      </Box>

      <Container maxWidth="lg" sx={{ pt: { xs: 4, md: 6 }, pb: 8 }}>
        {/* Heading */}
        <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 6 } }}>
          <Chip label="Checkout" sx={{ bgcolor: '#0B115B', color: '#fff', fontWeight: 600, fontSize: '0.75rem', height: 24, mb: 2 }} />
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.8rem', md: '2.5rem' }, color: '#0F172A', lineHeight: 1.2, mb: 1 }}>
            Final step to activate your verification
          </Typography>
          <Typography sx={{ color: '#64748B', fontSize: { xs: '0.85rem', md: '0.95rem' }, maxWidth: 500, mx: 'auto' }}>
            Show Customers You're Real, Reliable, And Ready For Business. Complete Now And Start Receiving Trusted Orders Today
          </Typography>
        </Box>

        <Grid container spacing={{ xs: 3, md: 6 }}>
          {/* Left Column - Form */}
          <Grid item xs={12} md={7}>
            <Box sx={{ bgcolor: '#fff', borderRadius: 3, border: '1px solid #E2E8F0', p: { xs: 2.5, md: 4 } }}>
              {/* Payment Information */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Box sx={{ width: 20, height: 14, bgcolor: '#1A1FE8', borderRadius: 0.5 }} />
                <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: '#0F172A' }}>Payment Information</Typography>
              </Box>

              <TextField fullWidth label="CARDHOLDER NAME" placeholder="John Doe" value={form.cardName} onChange={handleChange('cardName')} sx={{ ...inputSx, mb: 2.5 }} size="small" />

              <Box sx={{ mb: 2.5 }}>
                <TextField fullWidth label="CARD NUMBER" placeholder="0000 0000 0000 0000" value={form.cardNumber} onChange={handleChange('cardNumber')} sx={inputSx} size="small"
                  slotProps={{ input: { endAdornment: <CreditCardIcon sx={{ color: '#94A3B8', fontSize: 20 }} /> } }}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
                <TextField fullWidth label="EXPIRY DATE" placeholder="MM / YY" value={form.expiry} onChange={handleChange('expiry')} sx={inputSx} size="small" />
                <TextField fullWidth label="CVC" placeholder="123" value={form.cvc} onChange={handleChange('cvc')} sx={inputSx} size="small" />
              </Box>

              {/* Billing Address */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <LocationOnIcon sx={{ color: '#1A1FE8', fontSize: 22 }} />
                <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: '#0F172A' }}>Billing Address</Typography>
              </Box>

              <TextField fullWidth label="STREET ADDRESS" placeholder="mm2a kawo kaduna" value={form.street} onChange={handleChange('street')} sx={{ ...inputSx, mb: 2.5 }} size="small" />

              <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
                <TextField fullWidth label="CITY" placeholder="kaduna" value={form.city} onChange={handleChange('city')} sx={inputSx} size="small" />
                <TextField fullWidth label="POSTAL CODE" placeholder="94103" value={form.postal} onChange={handleChange('postal')} sx={inputSx} size="small" />
              </Box>

              {/* Complete Purchase */}
              <Button
                variant="contained"
                fullWidth
                onClick={handleSubmit}
                startIcon={<ShieldIcon />}
                sx={{ bgcolor: '#1A1FE8', color: '#fff', borderRadius: 2, py: 1.8, fontWeight: 700, fontSize: '1.05rem', textTransform: 'none', mb: 1.5, '&:hover': { bgcolor: '#1318C0' } }}
              >
                Complete Purchase
              </Button>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.8 }}>
                <LockIcon sx={{ fontSize: 14, color: '#94A3B8' }} />
                <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                  Encrypted with 256-bit AES protocol. Your data is safe.
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Right Column - Summary */}
          <Grid item xs={12} md={5}>
            <Box sx={{ bgcolor: '#F8FAFC', borderRadius: 4, p: { xs: 3, md: 5 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: '#1A1FE8', letterSpacing: '0.1em', mb: 1, textTransform: 'uppercase' }}>Selected Plan</Typography>
              <Typography sx={{ fontWeight: 900, fontSize: '1.8rem', color: '#0F172A', mb: 4 }}>Professional</Typography>

              {[
                { label: 'Monthly subscription', value: '₦12000.00' },
                { label: 'Processing fee', value: '₦0.00' },
                { label: 'Tax', value: '₦0.00' },
              ].map((row) => (
                <Box key={row.label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography sx={{ fontSize: '0.95rem', color: '#64748B' }}>{row.label}</Typography>
                  <Typography sx={{ fontSize: '0.95rem', color: '#0F172A', fontWeight: 700 }}>{row.value}</Typography>
                </Box>
              ))}

              <Divider sx={{ my: 3, borderColor: '#E2E8F0' }} />

              <Typography sx={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700, letterSpacing: '0.08em', mb: 1, textTransform: 'uppercase' }}>TOTAL DUE TODAY</Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 4 }}>
                <Typography sx={{ fontWeight: 900, fontSize: '2.5rem', color: '#0F172A' }}>₦12.00</Typography>
                <Typography sx={{ fontSize: '0.9rem', color: '#94A3B8' }}>Naira</Typography>
              </Box>

              <Box sx={{ mb: 'auto' }}>
                {features.map((f, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2.5 }}>
                    <CheckCircleIcon sx={{ color: '#1A1FE8', fontSize: 20, mt: 0.1, bgcolor: '#fff', borderRadius: '50%' }} />
                    <Typography sx={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.4 }}>{f}</Typography>
                  </Box>
                ))}
              </Box>

              {/* SSL Footer inside summary box */}
              <Box sx={{ bgcolor: '#EEF2FF', borderRadius: 3, p: 2, textAlign: 'center', mt: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 1 }}>
                  <SecurityIcon sx={{ color: '#64748B', fontSize: 18 }} />
                  <ShieldIcon sx={{ color: '#64748B', fontSize: 18 }} />
                  <LockIcon sx={{ color: '#64748B', fontSize: 18 }} />
                </Box>
                <Typography sx={{ fontSize: '0.65rem', color: '#64748B', letterSpacing: '0.08em', fontWeight: 700, textTransform: 'uppercase' }}>
                  SSL SECURE CHECKOUT POWERED<br />BY ONLOK PURE
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
