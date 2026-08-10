import {
  Box,
  Typography,
  Button,
  Chip,
  Avatar,
  Divider,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from '@mui/material';
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
import StarIcon from '@mui/icons-material/Star';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CloseIcon from '@mui/icons-material/Close';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined';
import BlockIcon from '@mui/icons-material/Block';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { searchVendors } from '../api/dashboard';
import type { VendorSearchResult } from '../types';
import { OnlokBadge, resolveVendorBadgeTier } from '../components/OnlokBadge';

const API_BASE = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000');

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
  if (!vendorId) return null;
  const parts = vendorId.split('-');
  if (parts.length >= 3) {
    const code = parts[1].toUpperCase();
    return countryMap[code] ?? code;
  }
  return null;
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

function SocialRow({ icon, label, sub, url, disabled }: { icon: React.ReactNode; label: string; sub: string; url?: string | null; disabled?: boolean }) {
  const hasUrl = !!url?.trim() && !disabled;

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
          {!disabled && <VerifiedIcon sx={{ color: '#22C55E', fontSize: 15 }} />}
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
  const statusParam = searchParams.get('status');

  const [vendor, setVendor] = useState<VendorSearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [contactOpen, setContactOpen] = useState(false);
  const [riskModalOpen, setRiskModalOpen] = useState(false);

  useEffect(() => {
    if (vendorId) {
      searchVendors(vendorId)
        .then((res) => {
          if (res.results.length > 0) {
            setVendor(res.results[0]);
          } else {
            // If vendor search returns empty but an ID or status override is present (e.g. demo mode), fallback to mock
            setVendor({
              id: 65,
              vendor_id: vendorId,
              first_name: 'Munir',
              last_name: 'Musa',
              business_name: 'UX Designer & Consultant',
              status: statusParam || 'verified',
              created_at: new Date().toISOString(),
              badges: ['verified_vendor', 'gold'],
              phone_number: '+6591234567',
              instagram_handle: '@munirmusa',
              twitter_handle: '@munirmusa',
              tiktok_handle: '@munirmusa',
              facebook_handle: 'munirmusa',
              profile_picture_url: null,
              reports_count: 3,
              admin_notes: 'Multiple complains received regarding user reports.',
            });
          }
        })
        .catch(() => {
          setVendor(null);
        })
        .finally(() => setLoading(false));
    } else {
      // Default demo state if page opened without query params
      setVendor({
        id: 65,
        vendor_id: 'OL-NG-0065',
        first_name: 'Munir',
        last_name: 'Musa',
        business_name: 'UX Designer & Consultant',
        status: statusParam || 'flagged',
        created_at: new Date().toISOString(),
        badges: ['verified_vendor', 'gold'],
        phone_number: '+6591234567',
        instagram_handle: '@munirmusa',
        twitter_handle: '@munirmusa',
        tiktok_handle: '@munirmusa',
        facebook_handle: 'munirmusa',
        profile_picture_url: null,
        reports_count: 3,
        admin_notes: 'Multiple complains received regarding user reports.',
      });
      setLoading(false);
    }
  }, [vendorId, statusParam]);

  // Determine raw and effective status
  const rawStatus = (statusParam || vendor?.status || 'pending').toLowerCase();
  let effectiveStatus: 'verified' | 'flagged' | 'revoked' | 'pending' = 'pending';

  if (['flagged', 'suspended'].includes(rawStatus)) {
    effectiveStatus = 'flagged';
  } else if (['revoked', 'rejected'].includes(rawStatus)) {
    effectiveStatus = 'revoked';
  } else if (['verified', 'approved'].includes(rawStatus)) {
    effectiveStatus = 'verified';
  } else {
    effectiveStatus = 'pending';
  }

  const fullName = vendor ? `${vendor.first_name} ${vendor.last_name}`.trim() : 'Munir Musa';
  const initials = fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const isVerified = effectiveStatus === 'verified';
  const avatarSrc = vendor?.profile_picture_url ? `${API_BASE}${vendor.profile_picture_url}` : undefined;
  const memberSince = vendor
    ? new Date(vendor.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : 'June 2024';
  const lastVerified = isVerified
    ? (vendor?.last_verified ? new Date(vendor.last_verified).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : 'August 2026')
    : 'Not Verified';

  const userRoleText = vendor?.business_name && vendor.business_name !== '-' ? vendor.business_name : 'UX Designer & Consultant';
  const countryName = vendor?.business_address || vendor?.country || getCountryFromVendorId(vendor?.vendor_id) || 'Not Specified';

  // Status configuration mapping
  const statusConfig = {
    flagged: {
      pillLabel: 'FLAGGED',
      pillBgColor: '#FFECE0',
      pillBorderColor: '#FFD8C2',
      pillTextColor: '#EA580C',
      pillIcon: <WarningAmberIcon sx={{ fontSize: 17, color: '#EA580C' }} />,
      subtext: 'Multiple Complains About The User',
      bannerBg: '#FFECE0',
      bannerBorder: '#FFD8C2',
      bannerTitleIcon: <WarningAmberIcon sx={{ color: '#EA580C', fontSize: 24 }} />,
      bannerTitle: 'FLAGGED',
      bannerTitleColor: '#EA580C',
      bannerHeaderPill: 'Under Review',
      bannerBody: 'This Profile Has Receive Multiple Verified Reports, Exercse Caution Before Proceeding',
      bannerSubIcon: <ErrorOutlinedIcon sx={{ color: '#EA580C', fontSize: 18 }} />,
      bannerSubText: 'Onlok Recommends Verifying Additional Information Before Making Payment Or Sharing Sensitive Information',
      trustLevel: 2,
      trustText: 'Under review. Multiple verified reports received.',
      trustColor: '#EA580C',
      isContactDisabled: false,
    },
    revoked: {
      pillLabel: 'REVOKED',
      pillBgColor: '#FEE2E2',
      pillBorderColor: '#FCA5A5',
      pillTextColor: '#EF4444',
      pillIcon: <HighlightOffIcon sx={{ fontSize: 17, color: '#EF4444' }} />,
      subtext: 'Could Not Verify Informations By The User',
      bannerBg: '#FEE2E2',
      bannerBorder: '#FCA5A5',
      bannerTitleIcon: <HighlightOffIcon sx={{ color: '#EF4444', fontSize: 24 }} />,
      bannerTitle: 'Verification Revoked',
      bannerTitleColor: '#DC2626',
      bannerHeaderPill: null,
      bannerBody: 'The Verification Has Been Revoked Because The Submitted Information Could Be Verified',
      bannerSubIcon: <ErrorOutlinedIcon sx={{ color: '#EF4444', fontSize: 18 }} />,
      bannerSubText: 'Onlok Does Not Recommend Relying On This Profile Fir Trust Or Identify Verification',
      trustLevel: 1,
      trustText: 'Revoked. Verification documents failed identity criteria.',
      trustColor: '#EF4444',
      isContactDisabled: true,
    },
    pending: {
      pillLabel: 'PENDING VERIFICATION',
      pillBgColor: '#FEF3C7',
      pillBorderColor: '#FDE68A',
      pillTextColor: '#D97706',
      pillIcon: <WarningAmberIcon sx={{ fontSize: 16, color: '#D97706' }} />,
      subtext: 'Verification Request Under Review',
      bannerBg: '#FFFBEB',
      bannerBorder: '#FEF3C7',
      bannerTitleIcon: <WarningAmberIcon sx={{ color: '#D97706', fontSize: 24 }} />,
      bannerTitle: 'Verification Pending',
      bannerTitleColor: '#D97706',
      bannerHeaderPill: 'In Queue',
      bannerBody: 'This profile is currently undergoing verification review by Onlok administrators.',
      bannerSubIcon: <ErrorOutlinedIcon sx={{ color: '#D97706', fontSize: 18 }} />,
      bannerSubText: 'Onlok Recommends Verifying Additional Information Before Making Payment Or Sharing Sensitive Information',
      trustLevel: 2,
      trustText: 'Under review. Verification screening in progress.',
      trustColor: '#D97706',
      isContactDisabled: false,
    },
    verified: {
      pillLabel: 'FULLY VERIFIED',
      pillBgColor: '#EEF2FF',
      pillBorderColor: '#C7D2FE',
      pillTextColor: '#1A1FE8',
      pillIcon: <CheckCircleIcon sx={{ fontSize: 16, color: '#1A1FE8' }} />,
      subtext: 'Official ONLOK Verified Public Profile',
      bannerBg: '#F0FDF4',
      bannerBorder: '#BBF7D0',
      bannerTitleIcon: <VerifiedIcon sx={{ color: '#16A34A', fontSize: 24 }} />,
      bannerTitle: 'Fully Verified Profile',
      bannerTitleColor: '#15803D',
      bannerHeaderPill: 'Active',
      bannerBody: 'This profile has passed identity and business verification checks on Onlok.',
      bannerSubIcon: <CheckCircleIcon sx={{ color: '#16A34A', fontSize: 18 }} />,
      bannerSubText: 'ONLOK verified identity credentials and active watchlist monitoring.',
      trustLevel: vendor?.badges?.includes('premium') ? 5 : 4,
      trustText: 'High confidence based on comprehensive data points.',
      trustColor: '#0EA5E9',
      isContactDisabled: false,
    },
  }[effectiveStatus];

  const contactChannels = [
    {
      label: 'WhatsApp',
      sub: 'Chat to order',
      icon: <WhatsAppIcon sx={{ color: '#25D366', fontSize: 30 }} />,
      href: vendor?.phone_number ? getSocialUrl('whatsapp', vendor.phone_number) : null,
    },
    {
      label: 'Instagram',
      sub: 'View & DM',
      icon: <InstagramIcon sx={{ color: '#E1306C', fontSize: 30 }} />,
      href: vendor?.instagram_handle ? getSocialUrl('instagram', vendor.instagram_handle) : null,
    },
    {
      label: 'TikTok',
      sub: 'See latest & DM',
      icon: <MusicNoteIcon sx={{ fontSize: 28, color: '#000' }} />,
      href: vendor?.tiktok_handle ? getSocialUrl('tiktok', vendor.tiktok_handle) : null,
    },
    {
      label: 'Twitter / X',
      sub: 'Follow & DM',
      icon: <TwitterIcon sx={{ color: '#1DA1F2', fontSize: 30 }} />,
      href: vendor?.twitter_handle ? getSocialUrl('twitter', vendor.twitter_handle) : null,
    },
    {
      label: 'Facebook',
      sub: 'Connect & message',
      icon: <FacebookIcon sx={{ color: '#1877F2', fontSize: 30 }} />,
      href: vendor?.facebook_handle ? getSocialUrl('facebook', vendor.facebook_handle) : null,
    },
  ];

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LinearProgress sx={{ width: 200 }} />
      </Box>
    );
  }

  if (!vendor && !vendorId) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: 3,
        }}
      >
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            bgcolor: '#F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 3,
          }}
        >
          <ShieldIcon sx={{ fontSize: 36, color: '#94A3B8' }} />
        </Box>
        <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', color: '#0F172A', mb: 0.5 }}>
          No Record Found
        </Typography>
        <Typography sx={{ fontSize: '0.88rem', color: '#64748B', textAlign: 'center', maxWidth: 320, mb: 4, lineHeight: 1.6 }}>
          This ID does not match any registered vendor on Onlok.
        </Typography>
        <Button component={RouterLink} to="/search" variant="contained" sx={{ bgcolor: '#1A1FE8', borderRadius: '8px', px: 3, py: 1, textTransform: 'none', fontWeight: 700 }}>
          ‹ Back to Search
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <Box sx={{ maxWidth: 480, mx: 'auto', px: 2.5, pt: 2, pb: 8 }}>
        {/* Back navigation */}
        <Button component={RouterLink} to="/search" sx={{ textTransform: 'none', color: '#475569', fontWeight: 600, fontSize: '0.9rem', pl: 0, mb: 2, '&:hover': { bgcolor: 'transparent', color: '#1A1FE8' } }}>
          ‹ Back To Search
        </Button>

        {/* Header Blue Banner */}
        <Box sx={{ bgcolor: '#1A1FE8', borderRadius: '10px', py: 1.2, px: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 3 }}>
          <ShieldIcon sx={{ color: '#fff', fontSize: 20 }} />
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.2px' }}>
            Official ONLOK Public Verification Profile
          </Typography>
        </Box>

        {/* Profile Avatar & Badge Row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
          <Box sx={{ position: 'relative' }}>
            <Avatar
              src={avatarSrc}
              sx={{ width: 88, height: 88, bgcolor: '#334155', fontSize: '1.8rem', fontWeight: 800, border: '3px solid #F8FAFC' }}
            >
              {initials}
            </Avatar>
            {isVerified && (
              <Box sx={{ position: 'absolute', bottom: 2, right: 2, bgcolor: '#fff', borderRadius: '50%', p: 0.3, display: 'flex' }}>
                <CheckCircleIcon sx={{ color: '#1A1FE8', fontSize: 20 }} />
              </Box>
            )}
          </Box>

          {/* Onlok Verification Gold Badge Ribbon */}
          <OnlokBadge
            tier={resolveVendorBadgeTier({ badges: vendor?.badges, status: effectiveStatus })}
            size={140}
            vendorId={vendor?.vendor_id}
            businessName={vendor?.business_name}
            tooltip={true}
          />
        </Box>

        {/* Name, Status Pill & Subtext Row (Matching Design Screenshot) */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5, gap: 1 }}>
          {/* Name & ID */}
          <Box>
            <Typography sx={{ fontWeight: 900, fontSize: '1.4rem', color: effectiveStatus === 'revoked' ? '#1A1FE8' : '#1A1FE8', lineHeight: 1.2 }}>
              {fullName}
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#475569', mt: 0.5 }}>
              ID: {vendor?.vendor_id ?? 'OL-NG-0065'}
            </Typography>
          </Box>

          {/* Status Pill Badge & Subtext */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', maxWidth: 195 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.6,
                px: 1.6,
                py: 0.6,
                borderRadius: '50px',
                bgcolor: statusConfig.pillBgColor,
                border: `1px solid ${statusConfig.pillBorderColor}`,
              }}
            >
              {statusConfig.pillIcon}
              <Typography sx={{ fontWeight: 800, fontSize: '0.75rem', color: statusConfig.pillTextColor, letterSpacing: '0.4px' }}>
                {statusConfig.pillLabel}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '0.72rem', color: '#475569', fontWeight: 600, textAlign: 'right', mt: 0.6, lineHeight: 1.25 }}>
              {statusConfig.subtext}
            </Typography>
          </Box>
        </Box>

        {/* Work & Location Sub-header */}
        <Box sx={{ display: 'flex', gap: 3, mb: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
            <WorkIcon sx={{ fontSize: 17, color: '#64748B' }} />
            <Typography sx={{ fontSize: '0.85rem', color: '#475569', fontWeight: 500 }}>{userRoleText}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
            <LocationOnIcon sx={{ fontSize: 17, color: '#64748B' }} />
            <Typography sx={{ fontSize: '0.85rem', color: '#475569', fontWeight: 500 }}>{countryName}</Typography>
          </Box>
        </Box>

        {/* Status Notice Banner / Action Box */}
        <Box
          sx={{
            bgcolor: statusConfig.bannerBg,
            border: `1px solid ${statusConfig.bannerBorder}`,
            borderRadius: 3,
            p: 2.5,
            mb: 3,
          }}
        >
          {/* Header of Banner */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {statusConfig.bannerTitleIcon}
              <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color: statusConfig.bannerTitleColor }}>
                {statusConfig.bannerTitle}
              </Typography>
            </Box>
            {statusConfig.bannerHeaderPill && (
              <Chip
                label={statusConfig.bannerHeaderPill}
                sx={{
                  bgcolor: '#FED7AA',
                  color: '#C2410C',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  height: 22,
                  borderRadius: '50px',
                }}
              />
            )}
          </Box>

          {/* Body Description */}
          <Typography sx={{ fontSize: '0.86rem', color: '#475569', lineHeight: 1.45, mb: 2, fontWeight: 500 }}>
            {statusConfig.bannerBody}
          </Typography>

          {/* Sub-warning line with icon */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2.5 }}>
            <Box sx={{ mt: 0.2 }}>{statusConfig.bannerSubIcon}</Box>
            <Typography sx={{ fontSize: '0.78rem', color: '#64748B', lineHeight: 1.35 }}>
              {statusConfig.bannerSubText}
            </Typography>
          </Box>

          {/* Action Buttons depending on status */}
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            {effectiveStatus === 'flagged' && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<EmailIcon />}
                  onClick={() => setContactOpen(true)}
                  sx={{
                    flex: 1,
                    borderColor: '#1A1FE8',
                    color: '#1A1FE8',
                    bgcolor: '#fff',
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 700,
                    py: 1,
                    '&:hover': { bgcolor: '#F4F5FF', borderColor: '#1318C0' },
                  }}
                >
                  Contact
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<WarningAmberIcon />}
                  onClick={() => setRiskModalOpen(true)}
                  sx={{
                    flex: 1,
                    borderColor: '#EA580C',
                    color: '#EA580C',
                    bgcolor: '#fff',
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 700,
                    py: 1,
                    '&:hover': { bgcolor: '#FFF7ED', borderColor: '#C2410C' },
                  }}
                >
                  View Risk Details
                </Button>
              </>
            )}

            {effectiveStatus === 'revoked' && (
              <>
                <Button
                  variant="outlined"
                  disabled
                  startIcon={<EmailIcon sx={{ color: '#94A3B8' }} />}
                  sx={{
                    flex: 1,
                    borderColor: '#CBD5E1',
                    color: '#94A3B8',
                    bgcolor: '#F8FAFC',
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 700,
                    py: 1,
                  }}
                >
                  Contact
                </Button>
                <Button
                  variant="outlined"
                  disabled
                  startIcon={<BlockIcon sx={{ color: '#94A3B8' }} />}
                  sx={{
                    flex: 1,
                    borderColor: '#CBD5E1',
                    color: '#94A3B8',
                    bgcolor: '#F8FAFC',
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 700,
                    py: 1,
                  }}
                >
                  Do Not Proceed
                </Button>
              </>
            )}

            {effectiveStatus === 'pending' && (
              <>
                <Button
                  variant="contained"
                  startIcon={<EmailIcon />}
                  onClick={() => setContactOpen(true)}
                  sx={{ flex: 1, bgcolor: '#1A1FE8', borderRadius: 2, textTransform: 'none', fontWeight: 700, py: 1 }}
                >
                  Contact
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<WarningAmberIcon />}
                  sx={{ flex: 1, borderColor: '#D97706', color: '#D97706', borderRadius: 2, textTransform: 'none', fontWeight: 700, py: 1 }}
                >
                  Proceed With Caution
                </Button>
              </>
            )}

            {effectiveStatus === 'verified' && (
              <>
                <Button
                  variant="contained"
                  startIcon={<EmailIcon />}
                  onClick={() => setContactOpen(true)}
                  sx={{ flex: 1, bgcolor: '#1A1FE8', borderRadius: 2, textTransform: 'none', fontWeight: 700, py: 1 }}
                >
                  Contact
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CheckCircleIcon />}
                  sx={{ flex: 1, borderColor: '#0EA5E9', color: '#0EA5E9', borderRadius: 2, textTransform: 'none', fontWeight: 700, py: 1 }}
                >
                  Proceed With Confidence
                </Button>
              </>
            )}
          </Box>
        </Box>

        {/* Contact And Order Section */}
        <Box sx={{ border: '1px solid #E2E8F0', borderRadius: 3, p: 2.5, mb: 2.5, opacity: effectiveStatus === 'revoked' ? 0.6 : 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A', mb: 0.3 }}>Contact And Order</Typography>
          <Typography sx={{ fontSize: '0.78rem', color: '#64748B', mb: 2 }}>Reach Out To Us On Our Verified Channels To Place Order And Make Enquiry</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <SocialRow icon={<WhatsAppIcon sx={{ color: '#25D366', fontSize: 30 }} />} label="Whatsapp" sub="Chat To Order" url={getSocialUrl('whatsapp', vendor?.phone_number)} disabled={effectiveStatus === 'revoked'} />
              <Divider sx={{ borderColor: '#F1F5F9', my: 0.5 }} />
              <SocialRow icon={<InstagramIcon sx={{ color: '#E1306C', fontSize: 30 }} />} label="Instagram" sub="View And DM Us" url={getSocialUrl('instagram', vendor?.instagram_handle)} disabled={effectiveStatus === 'revoked'} />
              <Divider sx={{ borderColor: '#F1F5F9', my: 0.5 }} />
              <SocialRow icon={<MusicNoteIcon sx={{ color: '#000', fontSize: 26 }} />} label="TikTok" sub="See Our Latest And DM" url={getSocialUrl('tiktok', vendor?.tiktok_handle)} disabled={effectiveStatus === 'revoked'} />
              <Divider sx={{ borderColor: '#F1F5F9', my: 0.5 }} />
              <SocialRow icon={<TwitterIcon sx={{ color: '#1DA1F2', fontSize: 30 }} />} label="Twitter" sub="Follow And DM Us" url={getSocialUrl('twitter', vendor?.twitter_handle)} disabled={effectiveStatus === 'revoked'} />
              <Divider sx={{ borderColor: '#F1F5F9', my: 0.5 }} />
              <SocialRow icon={<FacebookIcon sx={{ color: '#1877F2', fontSize: 30 }} />} label="Facebook" sub="Connect With Us" url={getSocialUrl('facebook', vendor?.facebook_handle)} disabled={effectiveStatus === 'revoked'} />
            </Box>
            <Box sx={{ width: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#F8FAFC', borderRadius: 2, p: 1.5, gap: 0.5 }}>
              <StarIcon sx={{ color: '#F59E0B', fontSize: 28 }} />
              <Typography sx={{ fontSize: '0.75rem', color: '#64748B', textAlign: 'center', fontWeight: 600 }}>Reviews</Typography>
              <Typography sx={{ fontWeight: 800, fontSize: '0.8rem', color: '#0F172A', textAlign: 'center', lineHeight: 1.2 }}>Coming Soon</Typography>
            </Box>
          </Box>
        </Box>

        {/* Trust Level Bar */}
        <Box sx={{ mb: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography sx={{ fontWeight: 900, fontSize: '1.1rem', color: '#1A1FE8' }}>Trust Level</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', color: statusConfig.trustColor }}>
              Level {statusConfig.trustLevel} / 5
            </Typography>
          </Box>
          <Box sx={{ width: '100%', height: 10, bgcolor: '#E2E8F0', borderRadius: 5, overflow: 'hidden', mb: 1 }}>
            <Box sx={{ width: `${(statusConfig.trustLevel / 5) * 100}%`, height: '100%', bgcolor: statusConfig.trustColor, borderRadius: 5 }} />
          </Box>
          <Typography sx={{ fontSize: '0.78rem', color: '#64748B' }}>
            {statusConfig.trustText}
          </Typography>
        </Box>

        {/* Member Since / Last Verified Cards */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5 }}>
          <Box sx={{ flex: 1, border: '1px solid #E2E8F0', borderRadius: 3, p: 1.8 }}>
            <Typography sx={{ fontSize: '0.72rem', color: '#64748B', mb: 0.5 }}>Member Since</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: '#1A1FE8' }}>{memberSince}</Typography>
          </Box>
          <Box sx={{ flex: 1, border: '1px solid #E2E8F0', borderRadius: 3, p: 1.8 }}>
            <Typography sx={{ fontSize: '0.72rem', color: '#64748B', mb: 0.5 }}>Last Verified</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: isVerified ? '#1A1FE8' : '#94A3B8' }}>{lastVerified}</Typography>
          </Box>
        </Box>

        {/* Associated Business */}
        <Box sx={{ border: '1px solid #E2E8F0', borderRadius: 3, p: 2, mb: 2.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#1A1FE8', mb: 0.8 }}>Associated Business</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.92rem', color: '#0F172A' }}>{userRoleText}</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#64748B' }}>
                {isVerified ? `ONLOK Registered Vendor (${countryName})` : `Status: ${statusConfig.pillLabel}`}
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
              <Box key={i} sx={{ display: 'flex', gap: 1.5, mb: i < verificationItems.length - 1 ? 2 : 0, opacity: itemVerified ? 1 : 0.6 }}>
                {itemVerified ? (
                  <CheckCircleIcon sx={{ color: '#0EA5E9', fontSize: 22, mt: 0.1, flexShrink: 0 }} />
                ) : effectiveStatus === 'revoked' ? (
                  <GppBadIcon sx={{ color: '#EF4444', fontSize: 22, mt: 0.1, flexShrink: 0 }} />
                ) : (
                  <WarningAmberIcon sx={{ color: '#EA580C', fontSize: 22, mt: 0.1, flexShrink: 0 }} />
                )}
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: itemVerified ? '#0EA5E9' : effectiveStatus === 'revoked' ? '#DC2626' : '#C2410C' }}>
                    {item.label}
                  </Typography>
                  <Typography sx={{ fontSize: '0.77rem', color: '#94A3B8' }}>
                    {itemVerified ? item.desc : effectiveStatus === 'revoked' ? 'Verification revoked' : 'Under review'}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* Report this profile button */}
        <Button
          component={RouterLink}
          to={`/report?vendor=${vendor?.vendor_id ?? ''}`}
          sx={{ color: '#94A3B8', textTransform: 'none', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 0.8, '&:hover': { color: '#DC2626' } }}
        >
          <WarningAmberIcon sx={{ fontSize: 16 }} />
          Report this profile
        </Button>
      </Box>

      {/* Contact Channels Modal */}
      <Dialog open={contactOpen} onClose={() => setContactOpen(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 3, px: 0.5 } }}>
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A', pr: 6 }}>
          Contact {fullName}
          <IconButton onClick={() => setContactOpen(false)} size="small" sx={{ position: 'absolute', right: 12, top: 12, color: '#94A3B8' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 0, pb: 2 }}>
          <Typography sx={{ fontSize: '0.8rem', color: '#64748B', mb: 1.5 }}>
            Reach out via any verified channel below.
          </Typography>
          <List disablePadding>
            {contactChannels.map((ch) => (
              <ListItem
                key={ch.label}
                disableGutters
                component={ch.href ? 'a' : 'div'}
                href={ch.href ?? undefined}
                target={ch.href ? '_blank' : undefined}
                rel={ch.href ? 'noopener noreferrer' : undefined}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  px: 1.5,
                  py: 1,
                  textDecoration: 'none',
                  opacity: ch.href ? 1 : 0.4,
                  cursor: ch.href ? 'pointer' : 'not-allowed',
                  '&:hover': ch.href ? { bgcolor: '#F8FAFC' } : {},
                }}
              >
                <ListItemAvatar sx={{ minWidth: 44 }}>{ch.icon}</ListItemAvatar>
                <ListItemText
                  primary={<Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A' }}>{ch.label}</Typography>}
                  secondary={<Typography sx={{ fontSize: '0.75rem', color: '#64748B' }}>{ch.href ? ch.sub : 'Not set'}</Typography>}
                />
                {ch.href && <OpenInNewIcon sx={{ fontSize: 16, color: '#94A3B8' }} />}
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>

      {/* Risk Details Modal (Opens for FLAGGED profiles) */}
      <Dialog open={riskModalOpen} onClose={() => setRiskModalOpen(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.05rem', color: '#EA580C', pr: 6, display: 'flex', alignItems: 'center', gap: 1 }}>
          <GppMaybeIcon sx={{ color: '#EA580C', fontSize: 24 }} />
          Risk Assessment Details
          <IconButton onClick={() => setRiskModalOpen(false)} size="small" sx={{ position: 'absolute', right: 12, top: 12, color: '#94A3B8' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 0, pb: 2 }}>
          <Box sx={{ bgcolor: '#FFF7ED', border: '1px solid #FFEDD5', borderRadius: 2, p: 2, mb: 2 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: '#C2410C', mb: 0.5 }}>
              Status: FLAGGED (Under Review)
            </Typography>
            <Typography sx={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.4 }}>
              This profile has received verified complaint reports from users. Onlok administrators are investigating the reports.
            </Typography>
          </Box>

          <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: '#0F172A', mb: 1 }}>
            Safety Advisory & Guidelines:
          </Typography>

          <List disablePadding>
            <ListItem disableGutters sx={{ mb: 1 }}>
              <ListItemAvatar sx={{ minWidth: 32 }}>
                <ErrorOutlineIcon sx={{ color: '#EA580C', fontSize: 20 }} />
              </ListItemAvatar>
              <ListItemText
                primary={<Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#0F172A' }}>Verify identity before payment</Typography>}
                secondary={<Typography sx={{ fontSize: '0.75rem', color: '#64748B' }}>Confirm seller identity & contact details outside social channels.</Typography>}
              />
            </ListItem>

            <ListItem disableGutters sx={{ mb: 1 }}>
              <ListItemAvatar sx={{ minWidth: 32 }}>
                <ErrorOutlineIcon sx={{ color: '#EA580C', fontSize: 20 }} />
              </ListItemAvatar>
              <ListItemText
                primary={<Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#0F172A' }}>Avoid direct unverified bank transfers</Typography>}
                secondary={<Typography sx={{ fontSize: '0.75rem', color: '#64748B' }}>Use verified payment options or escrow protection.</Typography>}
              />
            </ListItem>
          </List>

          <Box sx={{ mt: 2.5, display: 'flex', gap: 1.5 }}>
            <Button
              component={RouterLink}
              to={`/report?vendor=${vendor?.vendor_id ?? ''}`}
              variant="contained"
              fullWidth
              sx={{ bgcolor: '#EA580C', textTransform: 'none', fontWeight: 700, borderRadius: 2, '&:hover': { bgcolor: '#C2410C' } }}
            >
              Report Profile
            </Button>
            <Button
              onClick={() => setRiskModalOpen(false)}
              variant="outlined"
              fullWidth
              sx={{ borderColor: '#CBD5E1', color: '#475569', textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
            >
              Close
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

