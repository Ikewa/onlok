import { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Paper, Chip, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Grid, Card, CardContent, Divider
} from '@mui/material';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { OnlokBadge, resolveVendorBadgeTier } from '../components/OnlokBadge';
import { useAuth } from '../context/AuthContext';
import { getMySubscription, getManageSubscriptionLink, cancelSubscription, type UserSubscriptionInfo } from '../api/subscriptions';
import toast from 'react-hot-toast';

export default function VendorSubscriptionPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [subData, setSubData] = useState<UserSubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [manageLoading, setManageLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  const fetchSubscription = async () => {
    setLoading(true);
    try {
      const data = await getMySubscription();
      setSubData(data);
    } catch (err: any) {
      console.error('Failed to fetch subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  const handleManageCard = async () => {
    setManageLoading(true);
    const toastId = toast.loading('Generating Paystack card update link...');
    try {
      const { link } = await getManageSubscriptionLink();
      toast.success('Opening Paystack portal...', { id: toastId });
      window.open(link, '_blank');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Could not generate card update link. Please try again.', { id: toastId });
    } finally {
      setManageLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    setCancelLoading(true);
    const toastId = toast.loading('Cancelling subscription...');
    try {
      await cancelSubscription();
      toast.success('Subscription cancelled successfully.', { id: toastId });
      setConfirmCancelOpen(false);
      await fetchSubscription();
      if (typeof refreshUser === 'function') await refreshUser();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to cancel subscription.', { id: toastId });
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={40} sx={{ color: '#1A1FE8' }} />
      </Box>
    );
  }

  const sub = subData?.subscription;
  const badgeTier = resolveVendorBadgeTier({
    badges: subData?.badges ? subData.badges.map(b => (typeof b === 'string' ? b : (b as any).badge_type)) : undefined,
    badge_type: subData?.badge_type || (user as any)?.badge_type,
    assigned_tier: sub?.tier,
    status: user?.status,
  });
  const isActive = sub?.status === 'active';
  const isCancelled = sub?.status === 'cancelled';
  const isAttention = sub?.status === 'attention';

  const expiresDateStr = subData?.subscription_expires_at || sub?.next_payment_date;
  const formattedExpires = expiresDateStr
    ? new Date(expiresDateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A';

  return (
    <Box sx={{ p: { xs: 2, md: 5 }, maxWidth: 1100, width: '100%', flexGrow: 1, fontFamily: 'Inter, sans-serif' }}>
      
      {/* Page Title Header */}
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.8rem' }, color: '#0F172A', mb: 0.5 }}>
          My Subscription
        </Typography>
        <Typography sx={{ color: '#64748B', fontSize: '0.95rem' }}>
          Manage your verification plan, payment methods, and auto-renewal options
        </Typography>
      </Box>

      {/* Main Subscription Content Card */}
      <Grid container spacing={3}>
        
        {/* Left Column: Active Subscription Overview */}
        <Grid item xs={12} md={7}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, md: 4 },
              borderRadius: 3,
              bgcolor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justify: 'space-between'
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justify: 'space-between', mb: 3 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#0F172A' }}>
                  Current Plan Overview
                </Typography>
                
                {/* Status Chip */}
                {isActive && (
                  <Chip
                    icon={<CheckCircleOutlinedIcon style={{ fontSize: 16, color: '#059669' }} />}
                    label="Active"
                    sx={{ bgcolor: '#ECFDF5', color: '#059669', fontWeight: 700, fontSize: '0.8rem', borderRadius: 2 }}
                  />
                )}
                {isAttention && (
                  <Chip
                    icon={<WarningAmberOutlinedIcon style={{ fontSize: 16, color: '#D97706' }} />}
                    label="Payment Required"
                    sx={{ bgcolor: '#FEF3C7', color: '#D97706', fontWeight: 700, fontSize: '0.8rem', borderRadius: 2 }}
                  />
                )}
                {isCancelled && (
                  <Chip
                    icon={<CancelOutlinedIcon style={{ fontSize: 16, color: '#DC2626' }} />}
                    label="Cancelled"
                    sx={{ bgcolor: '#FEF2F2', color: '#DC2626', fontWeight: 700, fontSize: '0.8rem', borderRadius: 2 }}
                  />
                )}
                {!sub && (
                  <Chip
                    label="No Active Plan"
                    sx={{ bgcolor: '#F1F5F9', color: '#64748B', fontWeight: 700, fontSize: '0.8rem', borderRadius: 2 }}
                  />
                )}
              </Box>

              {/* Badge Visual & Tier Details */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, p: 3, bgcolor: '#F8FAFC', borderRadius: 2.5, mb: 3, border: '1px solid #F1F5F9' }}>
                <Box sx={{ transform: 'scale(0.85)', transformOrigin: 'center flex-start', flexShrink: 0, width: 80, height: 80, display: 'flex', alignItems: 'center', justify: 'center' }}>
                  <OnlokBadge tier={badgeTier} size={90} tooltip={false} vendorId={user?.vendor_id || 'OL-NG-0000'} businessName={user?.business_name} />
                </Box>
                <Box>
                  <Typography sx={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', mb: 0.5 }}>
                    {badgeTier} Tier Badge
                  </Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', color: '#0F172A', mb: 0.5 }}>
                    {sub?.plan_name || 'Verified Vendor Plan'}
                  </Typography>
                  <Typography sx={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 500 }}>
                    {sub?.amount ? `₦${Number(sub.amount).toLocaleString()} / ${sub.billing_cycle || 'year'}` : '₦10,000 / year'}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2.5 }} />

              {/* Subscription Properties */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: '0.9rem', color: '#64748B', fontWeight: 500 }}>
                    Billing Cycle
                  </Typography>
                  <Typography sx={{ fontSize: '0.9rem', color: '#0F172A', fontWeight: 700, textTransform: 'capitalize' }}>
                    {sub?.billing_cycle || 'Annual'}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: '0.9rem', color: '#64748B', fontWeight: 500 }}>
                    Next Renewal / Expiration
                  </Typography>
                  <Typography sx={{ fontSize: '0.9rem', color: '#0F172A', fontWeight: 700 }}>
                    {formattedExpires}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: '0.9rem', color: '#64748B', fontWeight: 500 }}>
                    Auto-Renewal
                  </Typography>
                  <Typography sx={{ fontSize: '0.9rem', color: isActive ? '#059669' : '#DC2626', fontWeight: 700 }}>
                    {isActive ? 'Enabled via Paystack' : 'Disabled'}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Bottom Upgrade CTA */}
            <Box sx={{ mt: 4 }}>
              <Button
                component={RouterLink}
                to="/pricing"
                variant="contained"
                endIcon={<ArrowForwardOutlinedIcon />}
                sx={{
                  width: '100%',
                  bgcolor: '#1A1FE8',
                  color: '#fff',
                  borderRadius: 2,
                  py: 1.5,
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  textTransform: 'none',
                  boxShadow: 'none',
                  '&:hover': { bgcolor: '#1318C0' }
                }}
              >
                Change or Upgrade Plan
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Right Column: Actions & Payment Management */}
        <Grid item xs={12} md={5}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '100%' }}>
            
            {/* Card Update Box */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <CreditCardOutlinedIcon sx={{ color: '#1A1FE8' }} />
                <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A' }}>
                  Payment Method
                </Typography>
              </Box>

              <Typography sx={{ color: '#64748B', fontSize: '0.85rem', lineHeight: 1.5, mb: 3 }}>
                Update your debit card or billing details directly on the secure Paystack customer portal.
              </Typography>

              <Button
                onClick={handleManageCard}
                disabled={manageLoading}
                variant="outlined"
                endIcon={manageLoading ? <CircularProgress size={18} /> : <OpenInNewIcon sx={{ fontSize: 18 }} />}
                sx={{
                  width: '100%',
                  borderColor: '#CBD5E1',
                  color: '#0F172A',
                  borderRadius: 2,
                  py: 1.2,
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#F8FAFC', borderColor: '#94A3B8' }
                }}
              >
                Update Card on Paystack
              </Button>
            </Paper>

            {/* Cancel Subscription Box */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
              }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A', mb: 1 }}>
                Cancel Subscription
              </Typography>
              <Typography sx={{ color: '#64748B', fontSize: '0.85rem', lineHeight: 1.5, mb: 3 }}>
                Cancelling disables automatic renewal. You will retain your active badge benefits until the end of your billing cycle.
              </Typography>

              <Button
                onClick={() => setConfirmCancelOpen(true)}
                disabled={!isActive || cancelLoading}
                variant="outlined"
                color="error"
                sx={{
                  width: '100%',
                  borderRadius: 2,
                  py: 1.2,
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  textTransform: 'none'
                }}
              >
                Cancel Auto-Renewal
              </Button>
            </Paper>

          </Box>
        </Grid>

      </Grid>

      {/* Confirmation Dialog for Cancellation */}
      <Dialog
        open={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.2rem', color: '#0F172A' }}>
          Cancel Auto-Renewal?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#475569', fontSize: '0.95rem' }}>
            Are you sure you want to cancel automatic subscription renewal? Your verified badge will remain active until <strong>{formattedExpires}</strong>, after which auto-billing will stop.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={() => setConfirmCancelOpen(false)}
            sx={{ color: '#64748B', fontWeight: 600, textTransform: 'none' }}
          >
            Keep Active
          </Button>
          <Button
            onClick={handleConfirmCancel}
            disabled={cancelLoading}
            variant="contained"
            color="error"
            sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2, px: 3 }}
          >
            {cancelLoading ? <CircularProgress size={20} color="inherit" /> : 'Confirm Cancel'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
