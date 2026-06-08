import { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Paper, Avatar, Divider, Chip,
  Container, Alert, Collapse, useTheme, useMediaQuery, IconButton
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VerifiedIcon from '@mui/icons-material/Verified';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import ShareIcon from '@mui/icons-material/Share';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import InstagramIcon from '@mui/icons-material/Instagram';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import { useNavigate, Navigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboard } from '../api/dashboard';
import type { DashboardData } from '../types';
import toast from 'react-hot-toast';
import { OnlokBadge } from '../components/OnlokBadge';
import { QRCode } from 'react-qr-code';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isExpanded, setIsExpanded] = useState(false);
  const showContent = !isMobile || isExpanded;

  useEffect(() => {
    getDashboard()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load dashboard. Please refresh.');
        setLoading(false);
      });
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const dashUser = data?.user ?? user;
  const firstName = dashUser?.first_name ?? 'Munir';
  const fullName = `${dashUser?.first_name ?? 'Muhammad'} ${dashUser?.last_name ?? 'Munir'}`.trim();
  const vendorId = dashUser?.vendor_id ?? 'ONL-7829-KX';
  const profileLink = data?.profile?.profile_link ?? `Onlok.Net/Ref/${firstName}`;

  const cardStyle = { p: 2.5, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none', bgcolor: '#F8FAFC', mb: 2.5 };

  return (
    <Box sx={{ flexGrow: 1, bgcolor: '#FFFFFF', minHeight: '100vh', pb: 10, boxSizing: 'border-box', overflowX: 'hidden' }}>
      <Container maxWidth="xl" sx={{ pt: { xs: 2, md: 4 }, px: { xs: 2, md: 4 } }}>
        
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {/* Back To Search */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, cursor: 'pointer' }} onClick={() => navigate('/search')}>
          <ArrowBackIosNewIcon sx={{ fontSize: 16, color: '#0F172A', fontWeight: 900 }} />
          <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: '#0F172A' }}>Back To Search</Typography>
        </Box>

        {/* Welcome Text */}
        <Typography sx={{ fontWeight: 900, fontSize: '1.5rem', color: '#0F172A', mb: 0.5 }}>
          Welcome Back {firstName}
        </Typography>
        <Typography sx={{ fontSize: '0.9rem', color: '#475569', mb: 3 }}>
          Here's Your Verified Business Profile
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 3, alignItems: 'flex-start', maxWidth: 1100 }}>
          
          {/* Left Column */}
          <Box sx={{ width: { xs: '100%', sm: '58%' }, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* Earn Rewards Block */}
            <Paper sx={{ ...cardStyle }}>
              <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: '#475569', mb: 1.5 }}>
                Earn Rewards By Referring Others
              </Typography>
              <Box sx={{ bgcolor: '#94A3B8', opacity: 0.8, borderRadius: 2, p: 2, mb: 2, textAlign: 'center' }}>
                <Typography sx={{ color: '#0F172A', fontWeight: 600, fontSize: '0.95rem', wordBreak: 'break-all' }}>
                  Your Referral Link: {profileLink}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button variant="outlined" fullWidth startIcon={<ContentCopyIcon sx={{ fontSize: 18 }} />} onClick={() => copyToClipboard(profileLink)} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, color: '#1A1FE8', borderColor: '#1A1FE8', py: 1 }}>
                  Copy Link
                </Button>
                <Button variant="contained" fullWidth startIcon={<ShareIcon sx={{ fontSize: 18 }} />} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, bgcolor: '#84CC16', color: '#fff', py: 1, boxShadow: 'none', '&:hover': { bgcolor: '#65A30D' } }}>
                  Share On Whatsapp
                </Button>
              </Box>
            </Paper>

            {/* Badge Card */}
            <Paper sx={{ ...cardStyle, bgcolor: '#F4F7FB' }}>
              <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, mb: 3 }}>
                <Box sx={{ width: '40%', display: 'flex', justifyContent: 'center', pt: 1 }}>
                  <OnlokBadge tier="gold" size={130} vendorId={vendorId} tooltip={false} />
                </Box>
                <Box sx={{ width: '60%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.1rem', sm: '1.4rem' }, color: '#0F172A' }}>{fullName}</Typography>
                    <VerifiedIcon sx={{ color: '#1A1FE8', fontSize: { xs: 18, sm: 22 } }} />
                  </Box>
                  <Typography sx={{ fontSize: { xs: '0.8rem', sm: '0.9rem' }, color: '#0F172A', mb: 2 }}>Onlok Verified Vendor</Typography>
                  <Typography sx={{ fontSize: '0.8rem', color: '#475569', mb: 0.2 }}>Onlok ID</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: { xs: '0.85rem', sm: '1rem' }, color: '#0F172A' }}>ID: {vendorId}</Typography>
                    <ContentCopyIcon sx={{ fontSize: { xs: 14, sm: 18 }, color: '#0F172A', cursor: 'pointer' }} onClick={() => copyToClipboard(vendorId)} />
                  </Box>
                  <Typography sx={{ fontSize: '0.75rem', color: '#64748B', lineHeight: 1.4 }}>
                    Use Your Onlok ID To Let Customers Verify Your Business Authenticity
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button variant="contained" fullWidth sx={{ borderRadius: '24px', textTransform: 'none', bgcolor: '#1A1FE8', py: 1, boxShadow: 'none' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FileDownloadOutlinedIcon sx={{ fontSize: 20 }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Download</Typography>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Badge</Typography>
                    </Box>
                  </Box>
                </Button>
                <Button variant="outlined" fullWidth sx={{ borderRadius: '24px', textTransform: 'none', fontWeight: 800, fontSize: '1rem', color: '#0F172A', borderColor: '#CBD5E1', py: 1, bgcolor: '#FFFFFF' }}>
                  View Badge
                </Button>
              </Box>
            </Paper>

            {/* Contact And Order */}
            <Paper sx={{ ...cardStyle }}>
              <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: '#475569', mb: 0.5 }}>Contact And Order</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#64748B', mb: 3, lineHeight: 1.4 }}>
                Reach Out To Us On Our Verified Channels To Place Order And Make Enquiey
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ 
                      width: 50, height: 50, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'linear-gradient(135deg, #e6f5eb 0%, #c1ebd0 100%)',
                      boxShadow: '4px 4px 10px rgba(0,0,0,0.1), -4px -4px 10px rgba(255,255,255,0.8), inset 2px 2px 5px rgba(255,255,255,0.5), inset -2px -2px 5px rgba(0,0,0,0.05)',
                      transform: 'perspective(500px) rotateX(5deg) rotateY(-5deg)'
                    }}>
                      <WhatsAppIcon sx={{ color: '#25D366', fontSize: 32, filter: 'drop-shadow(2px 2px 2px rgba(37,211,102,0.4))' }} />
                    </Box>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>WhatsApp</Typography>
                        <VerifiedIcon sx={{ color: '#84CC16', fontSize: 16 }} />
                      </Box>
                      <Typography sx={{ fontSize: '0.75rem', color: '#64748B' }}>Chat To Order</Typography>
                    </Box>
                  </Box>
                  <Divider sx={{ borderColor: '#E2E8F0' }} />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ 
                      width: 50, height: 50, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)',
                      boxShadow: '4px 4px 10px rgba(0,0,0,0.1), -4px -4px 10px rgba(255,255,255,0.8), inset 2px 2px 5px rgba(255,255,255,0.5), inset -2px -2px 5px rgba(0,0,0,0.05)',
                      transform: 'perspective(500px) rotateX(5deg) rotateY(-5deg)'
                    }}>
                      <InstagramIcon sx={{ color: '#E1306C', fontSize: 32, filter: 'drop-shadow(2px 2px 2px rgba(225,48,108,0.4))' }} />
                    </Box>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>Instagram</Typography>
                        <VerifiedIcon sx={{ color: '#84CC16', fontSize: 16 }} />
                      </Box>
                      <Typography sx={{ fontSize: '0.75rem', color: '#64748B' }}>View And DM Us</Typography>
                    </Box>
                  </Box>
                  <Divider sx={{ borderColor: '#E2E8F0' }} />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ 
                      width: 50, height: 50, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                      boxShadow: '4px 4px 10px rgba(0,0,0,0.1), -4px -4px 10px rgba(255,255,255,0.8), inset 2px 2px 5px rgba(255,255,255,0.5), inset -2px -2px 5px rgba(0,0,0,0.05)',
                      transform: 'perspective(500px) rotateX(5deg) rotateY(-5deg)'
                    }}>
                      <MusicNoteIcon sx={{ color: '#000', fontSize: 32, filter: 'drop-shadow(2px 2px 2px rgba(0,0,0,0.4))' }} />
                    </Box>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>TikTok</Typography>
                        <VerifiedIcon sx={{ color: '#84CC16', fontSize: 16 }} />
                      </Box>
                      <Typography sx={{ fontSize: '0.75rem', color: '#64748B' }}>See Our Latest And DM</Typography>
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ width: 140, bgcolor: '#F8FAFC', borderRadius: 3, p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid #E2E8F0' }}>
                  <WhatsAppIcon sx={{ color: '#25D366', fontSize: 32, mb: 1 }} />
                  <Typography sx={{ fontSize: '0.65rem', color: '#64748B', textAlign: 'center', lineHeight: 1.2, mb: 1 }}>Typically Responds In</Typography>
                  <Typography sx={{ fontWeight: 900, fontSize: '1rem', color: '#1A1FE8' }}>{'< 10 Mins'}</Typography>
                </Box>
              </Box>
            </Paper>

            {/* Update Profile Request Steps */}
            <Paper sx={{ ...cardStyle }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: '#0F172A' }}>
                  Update Profile Request
                </Typography>
                {isMobile ? (
                  <IconButton
                    size="small"
                    onClick={() => navigate('/dashboard/update')}
                    sx={{ 
                      color: '#1A1FE8', 
                      bgcolor: '#EEF2FF',
                      '&:hover': { bgcolor: '#E0E7FF' },
                      p: 0.5
                    }}
                  >
                    <ArrowForwardIosIcon sx={{ fontSize: 12 }} />
                  </IconButton>
                ) : (
                  <Button
                    variant="contained"
                    onClick={() => navigate('/dashboard/update')}
                    sx={{ 
                      bgcolor: '#1A1FE8', 
                      color: '#fff', 
                      borderRadius: 2, 
                      textTransform: 'none', 
                      fontWeight: 700, 
                      px: 3.5, 
                      py: 1,
                      boxShadow: 'none',
                      '&:hover': { bgcolor: '#1318C0', boxShadow: 'none' }
                    }}
                  >
                    Edit Profile
                  </Button>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1, maxWidth: '100%', boxSizing: 'border-box' }}>
                {[
                  { icon: '📝', title: '1. Submit Request', desc: 'Fill The Form With Changes You Want To Make' },
                  { icon: '🛡️', title: '2. Admin Review', desc: 'Our Team Will Review And Verify You Request' },
                  { icon: '💳', title: '3. Make Payment', desc: 'Pay The Required Fee To Proceed The Update' },
                  { icon: '✅', title: '4. Profile Updated', desc: 'We Will Update Your Profile Once Approved' },
                ].map((step, i) => (
                  <Box key={i} sx={{ flex: '1 0 130px', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ mb: 1, fontSize: '1.5rem' }}>{step.icon}</Box>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', color: '#0F172A', mb: 0.5, lineHeight: 1.2 }}>{step.title}</Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: '#64748B', lineHeight: 1.4 }}>{step.desc}</Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Box>

          {/* Right Column */}
          <Box sx={{ width: { xs: '100%', sm: '40%' }, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* Profile Status */}
            <Paper sx={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 45, height: 45, bgcolor: '#F4F7FB', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <VerifiedIcon sx={{ color: '#84CC16', fontSize: 28 }} />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: '#475569' }}>Profile Status</Typography>
                <Typography sx={{ fontSize: '0.85rem', color: '#0F172A', mt: 0.5 }}>
                  Verified On {new Date().toLocaleDateString()}
                </Typography>
              </Box>
            </Paper>

            {/* Business Information */}
            <Paper 
              sx={{ 
                ...cardStyle, 
                cursor: isMobile ? 'pointer' : 'default',
                transition: 'background-color 0.2s ease',
                '&:hover': isMobile ? { bgcolor: '#F1F5F9' } : {}
              }}
              onClick={() => {
                if (isMobile) {
                  setIsExpanded(!isExpanded);
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: '#475569' }}>
                  Business Information
                </Typography>
                {isMobile && (
                  <ExpandMoreIcon 
                    sx={{ 
                      color: '#64748B', 
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease-in-out'
                    }} 
                  />
                )}
              </Box>
              <Collapse in={showContent} timeout="auto">
                <Box sx={{ pt: 2 }}>
                  {[
                    { label: 'Business Name', value: dashUser?.business_name ?? 'N/A' },
                    { label: 'Business Mail', value: dashUser?.email ?? 'N/A' },
                    { label: 'Business Phone Number', value: data?.profile?.phone ?? '+234 800 000 0000' },
                    { label: 'Business Address', value: data?.profile?.address ?? 'Lagos, Nigeria' },
                  ].map((item, i) => (
                    <Box key={i} sx={{ mb: i === 3 ? 0 : 2.5 }}>
                      <Typography sx={{ fontSize: '0.75rem', color: '#64748B', mb: 0.3 }}>{item.label}</Typography>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A' }}>{item.value}</Typography>
                    </Box>
                  ))}
                </Box>
              </Collapse>
            </Paper>

            {/* QR Code */}
            <Paper sx={{ ...cardStyle, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Box sx={{ width: '100%', mb: 2 }}>
                <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A', mb: 0.2 }}>QR Code</Typography>
                <Typography sx={{ fontSize: '0.75rem', color: '#64748B' }}>Scan To Verify My Business</Typography>
              </Box>
              <Box sx={{ width: 160, height: 160, bgcolor: '#F4F7FB', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
                <QRCode 
                  value={profileLink}
                  size={140}
                  level="H"
                  style={{ borderRadius: 8 }}
                />
              </Box>
              <Button variant="contained" fullWidth startIcon={<ShareIcon sx={{ fontSize: 20 }} />} sx={{ bgcolor: '#1A1FE8', color: '#fff', borderRadius: '50px', textTransform: 'none', fontWeight: 800, fontSize: '1rem', py: 1.5, boxShadow: 'none' }}>
                Share QR Code
              </Button>
            </Paper>
          </Box>

        </Box>
      </Container>
    </Box>
  );
}
