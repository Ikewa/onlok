import { Box, Typography, Button, Avatar } from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import EditNoteIcon from '@mui/icons-material/EditNote';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import PaymentsIcon from '@mui/icons-material/Payments';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import BusinessIcon from '@mui/icons-material/Business';
import ArticleIcon from '@mui/icons-material/Article';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function OnlokLogo() {
  return (
    <Typography component={RouterLink} to="/" sx={{ textDecoration: 'none', fontWeight: 900, fontSize: '1.5rem', color: '#1A1FE8', letterSpacing: '-0.04em' }}>
      Onlok
    </Typography>
  );
}

const steps = [
  { icon: <EditNoteIcon sx={{ fontSize: 22, color: '#1A1FE8' }} />, num: '1.', title: 'Submit Request', desc: 'Fill The Form With Changes You Want To Make' },
  { icon: <FactCheckIcon sx={{ fontSize: 22, color: '#1A1FE8' }} />, num: '2.', title: 'Admin Review', desc: 'Our Team Will Review And Verify You Request' },
  { icon: <PaymentsIcon sx={{ fontSize: 22, color: '#1A1FE8' }} />, num: '3.', title: 'Make Payment', desc: 'Pay The Required Fee To Proceed The Update' },
  { icon: <AutorenewIcon sx={{ fontSize: 22, color: '#1A1FE8' }} />, num: '4.', title: 'Profile Updated', desc: 'We Will Update Your Profile Once Approved' },
];

const options = [
  {
    icon: <BusinessIcon sx={{ color: '#1A1FE8', fontSize: 22 }} />,
    title: 'Update Business Information',
    desc: 'Make The Necessary Change By Updating Your Information',
    route: '/dashboard/update/bio',
  },
  {
    icon: <ArticleIcon sx={{ color: '#1A1FE8', fontSize: 22 }} />,
    title: 'Update Document',
    desc: 'Make The Necessary Change By Updating Your Information',
    route: '/dashboard/update/docs',
  },
];

export default function ProfileUpdatePage() {
  const { user } = useAuth();
  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fff', fontFamily: 'Inter, sans-serif' }}>
      {/* Nav */}
      <Box sx={{ bgcolor: '#fff', px: 2.5, py: 1.8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
        <OnlokLogo />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <NotificationsNoneIcon sx={{ color: '#475569', fontSize: 24 }} />
          <Avatar sx={{ width: 36, height: 36, bgcolor: '#1A1FE8', fontSize: '0.85rem', fontWeight: 700 }}>{initials}</Avatar>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 480, mx: 'auto', px: 2.5, pt: 2.5, pb: 8 }}>
        {/* Back */}
        <Button component={RouterLink} to="/dashboard" sx={{ textTransform: 'none', color: '#475569', fontWeight: 600, fontSize: '0.9rem', pl: 0, mb: 2, '&:hover': { bgcolor: 'transparent', color: '#1A1FE8' } }}>
          ‹ Back
        </Button>

        {/* Heading */}
        <Typography sx={{ fontWeight: 900, fontSize: '1.5rem', color: '#0F172A', mb: 0.5 }}>
          Update Your Profile
        </Typography>
        <Typography sx={{ fontSize: '0.88rem', color: '#64748B', lineHeight: 1.6, mb: 3 }}>
          Request To Update Your Business Information. Our Admin Team Will Review Your Request.
        </Typography>

        {/* 4-Step Grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #E2E8F0', borderLeft: '1px solid #E2E8F0', mb: 4 }}>
          {steps.map((step) => (
            <Box key={step.num} sx={{ borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', p: 1.8 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                {step.icon}
              </Box>
              <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', color: '#0F172A', mb: 0.4 }}>
                {step.num} {step.title}
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#64748B', lineHeight: 1.4 }}>{step.desc}</Typography>
            </Box>
          ))}
        </Box>

        {/* Choose Preference */}
        <Typography sx={{ fontWeight: 900, fontSize: '1.25rem', color: '#0F172A', mb: 0.5 }}>
          Choose Your Preference
        </Typography>
        <Typography sx={{ fontSize: '0.84rem', color: '#64748B', mb: 2.5 }}>
          Select Which Aspect Of Your Profile You Want To Update
        </Typography>

        {options.map((opt) => (
          <Box
            key={opt.title}
            component={RouterLink}
            to={opt.route}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 2.5,
              mb: 1.5,
              border: '1px solid #E2E8F0',
              borderRadius: 3,
              textDecoration: 'none',
              '&:hover': { bgcolor: '#F8FAFC', borderColor: '#1A1FE8' },
              transition: '0.15s',
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A', mb: 0.3 }}>{opt.title}</Typography>
              <Typography sx={{ fontSize: '0.8rem', color: '#64748B' }}>{opt.desc}</Typography>
            </Box>
            <ArrowForwardIosIcon sx={{ fontSize: 14, color: '#94A3B8' }} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
