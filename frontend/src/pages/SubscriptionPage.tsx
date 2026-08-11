import { Box, Typography, Button, Container } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { OnlokBadge } from '../components/OnlokBadge';
import { useAuth } from '../context/AuthContext';
import { initializePayment } from '../api/payment';
import { getMyVerification } from '../api/verifications';
import toast from 'react-hot-toast';
import { CircularProgress } from '@mui/material';
import { useEffect } from 'react';

function OnlokLogo() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Box sx={{ width: 24, height: 24, bgcolor: '#0029FF', borderRadius: '50%', position: 'relative' }}>
         <Box sx={{ position: 'absolute', width: 12, height: 12, bgcolor: '#fff', borderRadius: '50%', top: 2, right: 2 }} />
      </Box>
      <Typography component={RouterLink} to="/" sx={{ textDecoration: 'none', fontWeight: 900, fontSize: '1.4rem', color: '#000', letterSpacing: '-0.04em' }}>
        onlok
      </Typography>
    </Box>
  );
}

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<'annual' | 'monthly'>('annual');
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [assignedTier, setAssignedTier] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      getMyVerification().then(res => {
        if (res && res.assigned_tier) {
          setAssignedTier(res.assigned_tier.toLowerCase());
        }
      }).catch(console.error);
    }
  }, [user]);

  const isTierDisabled = (tierName: string) => {
    if (!assignedTier) return false;
    if (assignedTier === 'gold') {
      return tierName !== 'Premium Category';
    }
    if (assignedTier === 'silver') {
      return tierName === 'Verified Vendor'; // disable bronze
    }
    return false; // bronze can upgrade to silver or gold
  };

  const getPrice = (annualPrice: number) => {
    if (billingCycle === 'annual') return `₦${annualPrice.toLocaleString()}`;
    const monthlyRaw = annualPrice / 12;
    const monthlyRounded = Math.ceil(monthlyRaw / 50) * 50;
    return `₦${monthlyRounded.toLocaleString()}`;
  };

  const cycleLabel = billingCycle === 'annual' ? '/yr' : '/mo';

  const handleSubscribe = async (tier: string, annualPrice: number) => {
    if (!user) {
      navigate('/register');
      return;
    }
    
    setLoadingTier(tier);
    try {
      const amount = billingCycle === 'annual' ? annualPrice : (Math.ceil((annualPrice / 12) / 50) * 50);
      const res = await initializePayment({
        email: user.email,
        amount: amount,
        plan: tier,
        billingCycle: billingCycle === 'annual' ? 'annually' : 'monthly',
      });
      
      if (res && res.data && res.data.authorization_url) {
        window.location.href = res.data.authorization_url;
      } else {
        toast.error('Could not initialize payment. Please try again.');
      }
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to initialize payment.');
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F8FAFC', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Navbar */}
      <Box sx={{ px: { xs: 2, md: 5 }, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#F8FAFC' }}>
        <OnlokLogo />
        
        {/* Desktop Links */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 4, alignItems: 'center' }}>
          <Typography component={RouterLink} to="/" sx={{ textDecoration: 'none', color: '#64748B', fontSize: '0.9rem', fontWeight: 500, '&:hover': { color: '#0F172A' } }}>Home</Typography>
          <Typography component={RouterLink} to="/security" sx={{ textDecoration: 'none', color: '#64748B', fontSize: '0.9rem', fontWeight: 500, '&:hover': { color: '#0F172A' } }}>Security</Typography>
          <Box sx={{ position: 'relative' }}>
            <Typography component={RouterLink} to="/pricing" sx={{ textDecoration: 'none', color: '#0029FF', fontSize: '0.9rem', fontWeight: 600 }}>Pricing</Typography>
            <Box sx={{ position: 'absolute', bottom: -4, left: 0, width: '100%', height: 2, bgcolor: '#0029FF' }} />
          </Box>
          <Typography component={RouterLink} to="/about" sx={{ textDecoration: 'none', color: '#64748B', fontSize: '0.9rem', fontWeight: 500, '&:hover': { color: '#0F172A' } }}>About</Typography>
        </Box>

        {/* Buttons */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button 
            component={RouterLink} 
            to="/login"
            sx={{ bgcolor: '#E2E8F0', color: '#475569', borderRadius: 1.5, textTransform: 'none', fontWeight: 600, px: 3, py: 1, '&:hover': { bgcolor: '#CBD5E1' } }}
          >
            Sign In
          </Button>
          <Button 
            component={RouterLink} 
            to="/register"
            variant="contained"
            sx={{ bgcolor: '#0029FF', color: '#fff', borderRadius: 1.5, textTransform: 'none', fontWeight: 600, px: 3, py: 1, boxShadow: 'none', '&:hover': { bgcolor: '#001ECC' } }}
          >
            Get Verified
          </Button>
        </Box>
      </Box>

      <Container maxWidth="lg" sx={{ pt: 8, pb: 12 }}>
        
        {/* Header Content */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 5 }}>
          <Box sx={{ bgcolor: '#00084D', color: '#fff', px: 3, py: 0.8, borderRadius: 1.5, fontSize: '0.8rem', fontWeight: 500, mb: 3 }}>
            Pricing
          </Box>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '2rem', md: '2.5rem' }, color: '#111827', textAlign: 'center', lineHeight: 1.2, mb: 2 }}>
            Choose Your Verification<br/>Level
          </Typography>
          <Typography sx={{ color: '#4B5563', fontSize: '0.95rem', textAlign: 'center', maxWidth: 400 }}>
            Get Verified And Build Trust With Clients, Partners, And Customers.
          </Typography>
        </Box>

        {/* Toggle UI */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 7 }}>
          <Box sx={{ display: 'inline-flex', bgcolor: '#E2E8F0', p: 0.5, borderRadius: 10 }}>
            <Button 
              onClick={() => setBillingCycle('monthly')}
              disableRipple
              sx={{ 
                borderRadius: 10, px: 3, py: 1, textTransform: 'none', fontWeight: 600,
                bgcolor: billingCycle === 'monthly' ? '#fff' : 'transparent',
                color: billingCycle === 'monthly' ? '#0F172A' : '#64748B',
                boxShadow: billingCycle === 'monthly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                '&:hover': { bgcolor: billingCycle === 'monthly' ? '#fff' : 'transparent' }
              }}
            >
              Monthly
            </Button>
            <Button 
              onClick={() => setBillingCycle('annual')}
              disableRipple
              sx={{ 
                borderRadius: 10, px: 3, py: 1, textTransform: 'none', fontWeight: 600,
                bgcolor: billingCycle === 'annual' ? '#fff' : 'transparent',
                color: billingCycle === 'annual' ? '#0F172A' : '#64748B',
                boxShadow: billingCycle === 'annual' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                '&:hover': { bgcolor: billingCycle === 'annual' ? '#fff' : 'transparent' }
              }}
            >
              Annually
            </Button>
          </Box>
        </Box>

        {/* Pricing Cards Grid */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' }, 
          alignItems: { xs: 'center', md: 'stretch' }, 
          justifyContent: 'center', 
          gap: { xs: 4, md: 3 },
          px: { xs: 2, md: 0 }
        }}>
          
          {/* TIER ONE */}
          <Box sx={{ 
            flex: 1, 
            maxWidth: { xs: '100%', md: 320 }, 
            bgcolor: '#fff', 
            borderRadius: 3, 
            p: 4, 
            border: '1px solid #E5E7EB',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', letterSpacing: '0.1em', mb: 2 }}>
              TIER ONE
            </Typography>
            <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', color: '#111827', lineHeight: 1.2, mb: 2 }}>
              Verified Vendor Plan
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <Box sx={{ transform: 'scale(0.8)', transformOrigin: 'center', height: 80, display: 'flex', alignItems: 'center' }}>
                <OnlokBadge tier="bronze" size={100} tooltip={false} vendorId={user?.vendor_id || "OL-NG-0000"} businessName={user?.business_name || "VERIFIED VENDOR"} />
              </Box>
            </Box>
            <Typography sx={{ fontSize: '0.9rem', color: '#4B5563', lineHeight: 1.5, mb: 4, flexGrow: 1 }}>
              For Small Business Owners Selling Products (Simple, Accessible Entry Point)
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 3 }}>
              <Typography sx={{ fontWeight: 900, fontSize: '2.2rem', color: '#111827' }}>
                {getPrice(10000)}
              </Typography>
              <Typography sx={{ fontSize: '1rem', color: '#6B7280', fontWeight: 600 }}>{cycleLabel}</Typography>
            </Box>
              <Button 
                variant="outlined" 
                onClick={() => handleSubscribe('Verified Vendor', 10000)}
                disabled={loadingTier === 'Verified Vendor' || isTierDisabled('Verified Vendor')}
                sx={{ 
                  borderRadius: 1.5, py: 1.2, fontWeight: 700, textTransform: 'none', 
                  borderColor: '#0029FF', color: '#0029FF', 
                  '&:hover': { bgcolor: '#F0F4FF', borderColor: '#0029FF' },
                  ...(isTierDisabled('Verified Vendor') && { opacity: 0.5, pointerEvents: 'none' })
                }}
              >
                {loadingTier === 'Verified Vendor' ? <CircularProgress size={24} /> : (user ? 'Subscribe Now' : 'Get Verified')}
              </Button>
          </Box>

          {/* TIER TWO (POPULAR) */}
          <Box sx={{ 
            flex: 1, 
            maxWidth: { xs: '100%', md: 340 }, 
            bgcolor: '#fff', 
            borderRadius: 3, 
            p: 4, 
            pt: 5,
            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            transform: { md: 'scale(1.05)' },
            zIndex: 2
          }}>
            <Box sx={{ 
              position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)',
              bgcolor: '#0029FF', color: '#fff', px: 3, py: 0.8, borderRadius: 5,
              fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em'
            }}>
              MOST POPULAR
            </Box>

            <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: '#0029FF', letterSpacing: '0.1em', mb: 2 }}>
              TIER TWO
            </Typography>
            <Typography sx={{ fontWeight: 800, fontSize: '1.7rem', color: '#111827', lineHeight: 1.2, mb: 2 }}>
              Verified Professional Plan
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <Box sx={{ transform: 'scale(0.8)', transformOrigin: 'center', height: 80, display: 'flex', alignItems: 'center' }}>
                <OnlokBadge tier="silver" size={100} tooltip={false} vendorId={user?.vendor_id || "OL-NG-0000"} businessName={user?.business_name || "PROFESSIONAL"} />
              </Box>
            </Box>
            <Typography sx={{ fontSize: '0.9rem', color: '#4B5563', lineHeight: 1.5, mb: 4, flexGrow: 1 }}>
              For Service Providers (Designers, Marketers, Freelancers, Etc.) (Feels More Skilled, Higher Value)
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 3 }}>
              <Typography sx={{ fontWeight: 900, fontSize: '2.2rem', color: '#111827' }}>
                {getPrice(15000)}
              </Typography>
              <Typography sx={{ fontSize: '1rem', color: '#6B7280', fontWeight: 600 }}>{cycleLabel}</Typography>
            </Box>
              <Button 
                variant="contained" 
                onClick={() => handleSubscribe('Verified Professional', 15000)}
                disabled={loadingTier === 'Verified Professional' || isTierDisabled('Verified Professional')}
                sx={{ 
                  borderRadius: 1.5, py: 1.2, fontWeight: 700, textTransform: 'none', 
                  bgcolor: '#0029FF', color: '#fff', boxShadow: 'none',
                  '&:hover': { bgcolor: '#001ECC' },
                  ...(isTierDisabled('Verified Professional') && { opacity: 0.5, pointerEvents: 'none', bgcolor: '#ccc' })
                }}
              >
                {loadingTier === 'Verified Professional' ? <CircularProgress size={24} color="inherit" /> : (user ? 'Subscribe Now' : 'Get Verified')}
              </Button>
          </Box>

          {/* TIER THREE */}
          <Box sx={{ 
            flex: 1, 
            maxWidth: { xs: '100%', md: 320 }, 
            bgcolor: '#fff', 
            borderRadius: 3, 
            p: 4, 
            border: '1px solid #E5E7EB',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', letterSpacing: '0.1em', mb: 2 }}>
              TIER THREE
            </Typography>
            <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', color: '#111827', lineHeight: 1.2, mb: 2 }}>
              Premium Category
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <Box sx={{ transform: 'scale(0.8)', transformOrigin: 'center', height: 80, display: 'flex', alignItems: 'center' }}>
                <OnlokBadge tier="gold" size={100} tooltip={false} vendorId={user?.vendor_id || "OL-NG-0000"} businessName={user?.business_name || "PREMIUM VENDOR"} />
              </Box>
            </Box>
            <Typography sx={{ fontSize: '0.9rem', color: '#4B5563', lineHeight: 1.5, mb: 4, flexGrow: 1 }}>
              For Real Estate, Automobiles, Travel Agencies (High-Risk, High-Trust Industries → Name Must Feel Serious And Exclusive)
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 3 }}>
              <Typography sx={{ fontWeight: 900, fontSize: '2.2rem', color: '#111827' }}>
                {getPrice(25000)}
              </Typography>
              <Typography sx={{ fontSize: '1rem', color: '#6B7280', fontWeight: 600 }}>{cycleLabel}</Typography>
            </Box>
              <Button 
                variant="outlined" 
                onClick={() => handleSubscribe('Premium Category', 25000)}
                disabled={loadingTier === 'Premium Category' || isTierDisabled('Premium Category')}
                sx={{ 
                  borderRadius: 1.5, py: 1.2, fontWeight: 700, textTransform: 'none', 
                  borderColor: '#0029FF', color: '#0029FF', 
                  '&:hover': { bgcolor: '#F0F4FF', borderColor: '#0029FF' },
                  ...(isTierDisabled('Premium Category') && { opacity: 0.5, pointerEvents: 'none' })
                }}
              >
                {loadingTier === 'Premium Category' ? <CircularProgress size={24} /> : (user ? 'Subscribe Now' : 'Get Verified')}
              </Button>
          </Box>

        </Box>
      </Container>
    </Box>
  );
}
