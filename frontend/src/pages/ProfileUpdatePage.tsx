import React from 'react';
import { Box, Typography, Button, Avatar, Breadcrumbs, Link as MuiLink } from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import EditNoteIcon from '@mui/icons-material/EditNote';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import PaymentsIcon from '@mui/icons-material/Payments';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import BusinessIcon from '@mui/icons-material/Business';
import ArticleIcon from '@mui/icons-material/Article';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';



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
  {
    icon: <AccountCircleIcon sx={{ color: '#1A1FE8', fontSize: 22 }} />,
    title: 'Update Profile Picture',
    desc: 'Upload A New Photo For Your Public Vendor Profile',
    route: '/dashboard/update/avatar',
  },
];

export default function ProfileUpdatePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <Box sx={{ maxWidth: { xs: 480, md: 1000 }, mx: 'auto', px: 2.5, pt: 2.5, pb: 8 }}>
        {/* Back */}
        <Button 
          onClick={() => navigate(-1)} 
          sx={{ 
            textTransform: 'none', 
            color: '#475569', 
            fontWeight: 600, 
            fontSize: '0.9rem', 
            pl: 0, 
            mb: 2, 
            '&:hover': { bgcolor: 'transparent', color: '#1A1FE8' } 
          }}
        >
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
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, 
          gap: 2, 
          mb: 5 
        }}>
          {steps.map((step, index) => {
            const stepStyles = [
              { bg: '#EFF6FF', iconBg: '#DBEAFE', iconColor: '#1E40AF' },
              { bg: '#F7FEE7', iconBg: '#ECFCCB', iconColor: '#3F6212' },
              { bg: '#ECFDF5', iconBg: '#D1FAE5', iconColor: '#065F46' },
              { bg: '#F5F3FF', iconBg: '#EDE9FE', iconColor: '#5B21B6' }
            ];
            const style = stepStyles[index];
            return (
              <Box 
                key={step.num} 
                sx={{ 
                  bgcolor: style.bg,
                  borderRadius: 3, 
                  p: 2, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  gap: 1.5,
                  border: '1px solid rgba(0,0,0,0.03)'
                }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', color: '#0F172A', mb: 0.5 }}>
                    {step.num} {step.title}
                  </Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: '#475569', lineHeight: 1.3 }}>
                    {step.desc}
                  </Typography>
                </Box>
                <Box sx={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: '50%', 
                  bgcolor: style.iconBg, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {step.icon && React.cloneElement(step.icon as React.ReactElement, { sx: { fontSize: 18, color: style.iconColor } })}
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* Choose Preference */}
        <Box sx={{ maxWidth: 600 }}>
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
    </Box>
  );
}
