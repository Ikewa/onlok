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
import TwitterIcon from '@mui/icons-material/Twitter';
import FacebookIcon from '@mui/icons-material/Facebook';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { searchVendors } from '../api/dashboard';
import type { VendorSearchResult } from '../types';
import { OnlokBadge } from '../components/OnlokBadge';

const countryMap: Record<string, string> = {
  NG: 'Nigeria',
  SG: 'Singapore',
  US: 'United States',
  GB: 'United Kingdom',
  UK: 'United Kingdom',
  GH: 'Ghana',
  KE: 'Kenya',
  ZA: 'South Africa',
};

const getCountryFromVendorId = (vendorId?: string) => {
  if (!vendorId) return 'Nigeria';
  const parts = vendorId.split('-');
  if (parts.length >= 3) {
    const code = parts[1].toUpperCase();
    return countryMap[code] ?? code;
  }
  return 'Nigeria';
};

const getSocialUrl = (platform: 'twitter' | 'instagram' | 'facebook' | 'tiktok' | 'whatsapp', val?: string | null) => {
  if (!val || !val.trim()) return null;
  const cleanVal = val.trim();
  if (cleanVal.startsWith('http')) return cleanVal;

  switch (platform) {
    case 'whatsapp': {
      const cleanPhone = cleanVal.replace(/\D/g, '');
      return cleanPhone ? `https://wa.me/${cleanPhone}` : null;
    }
    case 'twitter': {
      const handle = cleanVal.replace(/^@/, '');
      return `https://x.com/${handle}`;
    }
    case 'instagram': {
      const handle = cleanVal.replace(/^@/, '');
      return `https://instagram.com/${handle}`;
    }
    case 'facebook': {
      return `https://facebook.com/${cleanVal}`;
    }
    case 'tiktok': {
      const handle = cleanVal.replace(/^@/, '');
      return `https://tiktok.com/@${handle}`;
    }
    default:
      return cleanVal;
  }
};

const verificationItems = [
  { label: 'Identity Verified', desc: 'Biometric liveness check passed' },
  { label: 'Government ID Confirmed', desc: 'Passport verified via NFC' },
  { label: 'Business Registration Verified', desc: 'Chen Design Studio LLC' },
  { label: 'Address Verified', desc: 'Proof of residence confirmed' },
  { label: 'Ongoing Monitoring Active', desc: 'Daily global watchlist screening' },
];

function SocialRow({ icon, label, sub, url }: { icon: React.ReactNode; label: string; sub: string; url?: string | null }) {
  const hasUrl = !!url?.trim();

  const content = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        py: 1,
        opacity: hasUrl ? 1 : 0.4,
        cursor: hasUrl ? 'pointer' : 'not-allowed',
        userSelect: hasUrl ? 'auto' : 'none',
      }}
    >
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

  if (hasUrl) {
    return (
      <a
        href={url.startsWith('http') ? url : `https://${url}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: 'none', color: 'inherit' }}
      >
        {content}
      </a>
    );
  }
  return content;
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

  const fullName = vendor ? `${vendor.first_name} ${vendor.last_name}`.trim() : '-';
  const initials = fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const isVerified = vendor ? vendor.status === 'verified' : false;
  const memberSince = vendor
    ? new Date(vendor.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : '-';
  const lastVerified = vendor?.last_verified
    ? new Date(vendor.last_verified).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : 'Not Verified';

  const trustLevel = vendor?.status === 'verified'
    ? (vendor?.badges?.includes('premium') ? 5 : (vendor?.badges?.includes('verified_vendor') ? 4 : 3))
    : (vendor?.status === 'pending' ? 2 : 1);

  const businessName = vendor?.business_name ?? '-';
  const userRoleText = isVerified ? 'Onlok Verified Vendor' : 'Onlok Vendor';
  const countryName = getCountryFromVendorId(vendor?.vendor_id);

  const getStatusChipProps = (status: string) => {
    switch (status) {
      case 'verified':
        return {
          label: 'FULLY VERIFIED',
          color: '#1A1FE8',
          bgcolor: '#EEF2FF',
        };
      case 'pending':
        return {
          label: 'PENDING VERIFICATION',
          color: '#D97706',
          bgcolor: '#FEF3C7',
        };
      case 'rejected':
        return {
          label: 'VERIFICATION REJECTED',
          color: '#DC2626',
          bgcolor: '#FEE2E2',
        };
      case 'suspended':
        return {
          label: 'SUSPENDED',
          color: '#4B5563',
          bgcolor: '#F3F4F6',
        };
      default:
        return {
          label: status.toUpperCase(),
          color: '#64748B',
          bgcolor: '#F1F5F9',
        };
    }
  };
  const statusProps = getStatusChipProps(vendor?.status ?? 'pending');

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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
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

          {/* Shield badge or OnlokBadge sticker */}
          {isVerified && vendor ? (
            <OnlokBadge
              tier={vendor.badges?.includes('premium') ? 'gold' : (vendor.badges?.includes('verified_vendor') ? 'silver' : 'bronze')}
              size={100}
              vendorId={vendor.vendor_id}
              businessName={vendor.business_name}
              tooltip={true}
            />
          ) : (
            <Box sx={{ width: 80, height: 80, bgcolor: '#F8FAFC', border: '2.5px dashed #CBD5E1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}>
              <ShieldIcon sx={{ color: '#94A3B8', fontSize: 36 }} />
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography sx={{ fontWeight: 900, fontSize: '1.3rem', color: '#1A1FE8' }}>{fullName}</Typography>
          {vendor && (
            <Chip
              icon={<ShieldIcon sx={{ fontSize: 14 }} />}
              label={statusProps.label}
              sx={{ bgcolor: statusProps.bgcolor, color: statusProps.color, fontWeight: 700, fontSize: '0.68rem', height: 22, borderRadius: '50px', '& .MuiChip-icon': { color: statusProps.color, ml: 0.5 } }}
            />
          )}
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: '#475569', mb: 1 }}>
          ID: {vendor?.vendor_id ?? '-'}
        </Typography>

        <Box sx={{ display: 'flex', gap: 3, mb: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
            <WorkIcon sx={{ fontSize: 16, color: '#64748B' }} />
            <Typography sx={{ fontSize: '0.82rem', color: '#475569' }}>{userRoleText}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
            <LocationOnIcon sx={{ fontSize: 16, color: '#64748B' }} />
            <Typography sx={{ fontSize: '0.82rem', color: '#475569' }}>{countryName}</Typography>
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
              <SocialRow icon={<WhatsAppIcon sx={{ color: '#25D366', fontSize: 32 }} />} label="Whatsapp" sub="Chat To Order" url={getSocialUrl('whatsapp', vendor?.phone_number)} />
              <Divider sx={{ borderColor: '#F1F5F9', my: 0.5 }} />
              <SocialRow icon={<InstagramIcon sx={{ color: '#E1306C', fontSize: 32 }} />} label="Instagram" sub="View And DM Us" url={getSocialUrl('instagram', vendor?.instagram_handle)} />
              <Divider sx={{ borderColor: '#F1F5F9', my: 0.5 }} />
              <SocialRow icon={<MusicNoteIcon sx={{ color: '#000', fontSize: 28 }} />} label="TikTok" sub="See Our Latest And DM" url={getSocialUrl('tiktok', vendor?.tiktok_handle)} />
              <Divider sx={{ borderColor: '#F1F5F9', my: 0.5 }} />
              <SocialRow icon={<TwitterIcon sx={{ color: '#1DA1F2', fontSize: 32 }} />} label="Twitter" sub="Follow And DM Us" url={getSocialUrl('twitter', vendor?.twitter_handle)} />
              <Divider sx={{ borderColor: '#F1F5F9', my: 0.5 }} />
              <SocialRow icon={<FacebookIcon sx={{ color: '#1877F2', fontSize: 32 }} />} label="Facebook" sub="Connect With Us" url={getSocialUrl('facebook', vendor?.facebook_handle)} />
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
            {trustLevel >= 4
              ? 'High confidence based on comprehensive data points.'
              : trustLevel === 3
              ? 'Moderate confidence. Basic verification completed.'
              : trustLevel === 2
              ? 'Under review. Verification in progress.'
              : 'Caution. This profile is not verified or has been suspended/rejected.'}
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
              <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                {isVerified ? `ONLOK Registered Vendor (${countryName})` : `Status: ${vendor?.status || 'Unverified'}`}
              </Typography>
            </Box>
            <OpenInNewIcon sx={{ fontSize: 18, color: '#64748B' }} />
          </Box>
        </Box>

        {/* Verification Breakdown */}
        <Typography sx={{ fontWeight: 900, fontSize: '1.15rem', color: '#1A1FE8', mb: 1.5 }}>Verification Breakdown</Typography>
        <Box sx={{ border: '1px solid #E2E8F0', borderRadius: 3, p: 2, mb: 3 }}>
          {verificationItems.map((item, i) => {
            const itemVerified = isVerified;
            return (
              <Box key={i} sx={{ display: 'flex', gap: 1.5, mb: i < verificationItems.length - 1 ? 2 : 0, opacity: itemVerified ? 1 : 0.5 }}>
                {itemVerified ? (
                  <CheckCircleIcon sx={{ color: '#0EA5E9', fontSize: 22, mt: 0.1, flexShrink: 0 }} />
                ) : (
                  <WarningAmberIcon sx={{ color: '#94A3B8', fontSize: 22, mt: 0.1, flexShrink: 0 }} />
                )}
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: itemVerified ? '#0EA5E9' : '#64748B' }}>
                    {item.label}
                  </Typography>
                  <Typography sx={{ fontSize: '0.77rem', color: '#94A3B8' }}>
                    {itemVerified ? (item.label === 'Business Registration Verified' ? `${businessName} Verified` : item.desc) : 'Pending validation'}
                  </Typography>
                </Box>
              </Box>
            );
          })}
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
