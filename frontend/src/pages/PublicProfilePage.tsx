import { Box, Typography, Button, Chip, Avatar, Divider, LinearProgress } from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ShieldIcon from '@mui/icons-material/Shield';
import EmailIcon from '@mui/icons-material/Email';
import WorkIcon from '@mui/icons-material/Work';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import InstagramIcon from '@mui/icons-material/Instagram';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { searchVendors } from '../api/dashboard';
import type { VendorSearchResult } from '../types';

const verificationItems = [
  { label: 'Identity Verified', desc: 'Biometric liveness check passed' },
  { label: 'Government ID Confirmed', desc: 'Passport verified via NFC' },
  { label: 'Business Registration Verified', desc: 'Chen Design Studio LLC' },
  { label: 'Address Verified', desc: 'Proof of residence confirmed' },
  { label: 'Ongoing Monitoring Active', desc: 'Daily global watchlist screening' },
];

function SocialRow({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
      {icon}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.93rem', color: '#0F172A' }}>{label}</Typography>
          <VerifiedIcon sx={{ color: '#22C55E', fontSize: 15 }} />
        </Box>
        <Typography sx={{ fontSize: '0.75rem', color: '#64748B' }}>{sub}</Typography>
      </Box>
    </Box>
  );
}

export default function PublicProfilePage() {
  const [searchParams] = useSearchParams();
  const vendorId = searchParams.get('id') ?? '';
  const [vendor, setVendor] = useState<VendorSearchResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (vendorId) {
      searchVendors(vendorId)
        .then((res) => setVendor(res.results[0] ?? null))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [vendorId]);

  const fullName = vendor ? `${vendor.first_name} ${vendor.last_name}`.trim() : 'Munir Musa';
  const initials = fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const isVerified = vendor ? vendor.status === 'verified' : true;
  const memberSince = vendor
    ? new Date(vendor.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : 'January 2024';
  const lastVerified = vendor?.last_verified
    ? new Date(vendor.last_verified).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : 'March 2025';
  const trustLevel = isVerified ? 4 : 1;
  const businessName = vendor?.business_name ?? 'Chen Design Studio';

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LinearProgress sx={{ width: 200 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <Box sx={{ maxWidth: 480, mx: 'auto', px: 2.5, pt: 2, pb: 8 }}>
        {/* Back */}
        <Button component={RouterLink} to="/search" sx={{ textTransform: 'none', color: '#475569', fontWeight: 600, fontSize: '0.9rem', pl: 0, mb: 2, '&:hover': { bgcolor: 'transparent', color: '#1A1FE8' } }}>
          ‹ Back To Search
        </Button>

        {/* Blue Banner */}
        <Box sx={{ bgcolor: '#1A1FE8', borderRadius: 2, py: 1.2, px: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 3 }}>
          <ShieldIcon sx={{ color: '#fff', fontSize: 18 }} />
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.82rem' }}>
            Official ONLOK Public Verification Profile
          </Typography>
        </Box>

        {/* Profile header */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ position: 'relative' }}>
            <Avatar sx={{ width: 80, height: 80, bgcolor: '#334155', fontSize: '1.6rem', fontWeight: 800 }}>
              {initials}
            </Avatar>
            {isVerified && (
              <Box sx={{ position: 'absolute', bottom: -2, right: -2, bgcolor: '#fff', borderRadius: '50%', p: 0.3 }}>
                <CheckCircleIcon sx={{ color: '#1A1FE8', fontSize: 18 }} />
              </Box>
            )}
          </Box>

          {/* Shield badge */}
          <Box sx={{ width: 70, height: 70, background: 'linear-gradient(180deg, #333 0%, #111 100%)', clipPath: 'polygon(50% 0%, 100% 15%, 100% 70%, 50% 100%, 0% 70%, 0% 15%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <VerifiedIcon sx={{ color: '#C0C0C0', fontSize: 32 }} />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography sx={{ fontWeight: 900, fontSize: '1.3rem', color: '#1A1FE8' }}>{fullName}</Typography>
          <Chip
            icon={<ShieldIcon sx={{ fontSize: 14 }} />}
            label="FULLY VERIFIED"
            sx={{ bgcolor: '#EEF2FF', color: '#1A1FE8', fontWeight: 700, fontSize: '0.68rem', height: 22, borderRadius: '50px', '& .MuiChip-icon': { color: '#1A1FE8', ml: 0.5 } }}
          />
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: '#475569', mb: 1 }}>
          ID: {vendor?.vendor_id ?? 'ONL-7829-KX'}
        </Typography>

        <Box sx={{ display: 'flex', gap: 3, mb: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
            <WorkIcon sx={{ fontSize: 16, color: '#64748B' }} />
            <Typography sx={{ fontSize: '0.82rem', color: '#475569' }}>UX Designer & Consultant</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
            <LocationOnIcon sx={{ fontSize: 16, color: '#64748B' }} />
            <Typography sx={{ fontSize: '0.82rem', color: '#475569' }}>Singapore</Typography>
          </Box>
        </Box>

        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
          <Button variant="contained" startIcon={<EmailIcon />} sx={{ flex: 1, bgcolor: '#1A1FE8', borderRadius: 2, textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#1318C0' } }}>
            Contact
          </Button>
          <Button variant="outlined" startIcon={<CheckCircleIcon />} sx={{ flex: 1, borderColor: '#0EA5E9', color: '#0EA5E9', borderRadius: 2, textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#EFF9FF' } }}>
            Proceed With Confidence
          </Button>
        </Box>

        {/* Contact And Order */}
        <Box sx={{ border: '1px solid #E2E8F0', borderRadius: 3, p: 2.5, mb: 2 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A', mb: 0.3 }}>Contact And Order</Typography>
          <Typography sx={{ fontSize: '0.78rem', color: '#64748B', mb: 2 }}>Reach Out To Us On Our Verified Channels To Place Order And Make Enquiry</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <SocialRow icon={<WhatsAppIcon sx={{ color: '#25D366', fontSize: 32 }} />} label="Whatsapp" sub="Chat To Order" />
              <Divider sx={{ borderColor: '#F1F5F9', my: 0.5 }} />
              <SocialRow icon={<InstagramIcon sx={{ color: '#E1306C', fontSize: 32 }} />} label="Instagram" sub="View And DM Us" />
              <Divider sx={{ borderColor: '#F1F5F9', my: 0.5 }} />
              <SocialRow icon={<MusicNoteIcon sx={{ color: '#000', fontSize: 28 }} />} label="TikTok" sub="See Our Latest And DM" />
            </Box>
            <Box sx={{ width: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#F8FAFC', borderRadius: 2, p: 1.5, gap: 0.5 }}>
              <WhatsAppIcon sx={{ color: '#25D366', fontSize: 28 }} />
              <Typography sx={{ fontSize: '0.7rem', color: '#64748B', textAlign: 'center' }}>Typically Responds In</Typography>
              <Typography sx={{ fontWeight: 900, fontSize: '1rem', color: '#0F172A' }}>{'< 10 Mins'}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#22C55E' }} />
                <Typography sx={{ fontSize: '0.7rem', color: '#22C55E', fontWeight: 600 }}>active today</Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Trust Level */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography sx={{ fontWeight: 900, fontSize: '1.1rem', color: '#1A1FE8' }}>Trust Level</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', color: '#0EA5E9' }}>Level {trustLevel} / 5</Typography>
          </Box>
          <Box sx={{ width: '100%', height: 10, bgcolor: '#E2E8F0', borderRadius: 5, overflow: 'hidden', mb: 1 }}>
            <Box sx={{ width: `${(trustLevel / 5) * 100}%`, height: '100%', bgcolor: '#0EA5E9', borderRadius: 5 }} />
          </Box>
          <Typography sx={{ fontSize: '0.78rem', color: '#94A3B8' }}>
            High confidence based on comprehensive data points.
          </Typography>
        </Box>

        {/* Member Since / Last Verified */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
          {[
            { label: 'Member Since', value: memberSince },
            { label: 'Last Verified', value: lastVerified },
          ].map((item) => (
            <Box key={item.label} sx={{ flex: 1, border: '1px solid #E2E8F0', borderRadius: 3, p: 1.8 }}>
              <Typography sx={{ fontSize: '0.72rem', color: '#64748B', mb: 0.5 }}>{item.label}</Typography>
              <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: '#1A1FE8' }}>{item.value}</Typography>
            </Box>
          ))}
        </Box>

        {/* Associated Business */}
        <Box sx={{ border: '1px solid #E2E8F0', borderRadius: 3, p: 2, mb: 2.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#1A1FE8', mb: 0.8 }}>Associated Business</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: '0.92rem', color: '#1A1FE8' }}>{businessName}</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>Reg. 202394827M (Singapore)</Typography>
            </Box>
            <OpenInNewIcon sx={{ fontSize: 18, color: '#64748B' }} />
          </Box>
        </Box>

        {/* Verification Breakdown */}
        <Typography sx={{ fontWeight: 900, fontSize: '1.15rem', color: '#1A1FE8', mb: 1.5 }}>Verification Breakdown</Typography>
        <Box sx={{ border: '1px solid #E2E8F0', borderRadius: 3, p: 2, mb: 3 }}>
          {verificationItems.map((item, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1.5, mb: i < verificationItems.length - 1 ? 2 : 0 }}>
              <CheckCircleIcon sx={{ color: '#0EA5E9', fontSize: 22, mt: 0.1, flexShrink: 0 }} />
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#0EA5E9' }}>{item.label}</Typography>
                <Typography sx={{ fontSize: '0.77rem', color: '#94A3B8' }}>{item.desc}</Typography>
              </Box>
            </Box>
          ))}
        </Box>

        {/* Report */}
        <Button
          component={RouterLink}
          to={`/report?vendor=${vendor?.vendor_id ?? ''}`}
          sx={{ color: '#94A3B8', textTransform: 'none', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 0.8, '&:hover': { color: '#DC2626' } }}
        >
          <WarningAmberIcon sx={{ fontSize: 16 }} />
          Report this profile
        </Button>
      </Box>
    </Box>
  );
}
