import React, { useState } from 'react';
import { Box, Typography, Button, TextField, Avatar, Breadcrumbs, Link as MuiLink, Paper } from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import EditNoteIcon from '@mui/icons-material/EditNote';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import PaymentsIcon from '@mui/icons-material/Payments';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';



const steps = [
  { icon: <EditNoteIcon sx={{ fontSize: 18, color: '#1A1FE8' }} />, num: '1.', title: 'Submit Request', desc: 'Fill The Form With Changes You Want To Make' },
  { icon: <FactCheckIcon sx={{ fontSize: 18, color: '#1A1FE8' }} />, num: '2.', title: 'Admin Review', desc: 'Our Team Will Review And Verify You Request' },
  { icon: <PaymentsIcon sx={{ fontSize: 18, color: '#1A1FE8' }} />, num: '3.', title: 'Make Payment', desc: 'Pay The Required Fee To Proceed The Update' },
  { icon: <AutorenewIcon sx={{ fontSize: 18, color: '#1A1FE8' }} />, num: '4.', title: 'Profile Updated', desc: 'We Will Update Your Profile Once Approved' },
];

const inputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2, fontSize: '0.9rem',
    '& fieldset': { borderColor: '#E2E8F0' },
    '&:hover fieldset': { borderColor: '#1A1FE8' },
    '&.Mui-focused fieldset': { borderColor: '#1A1FE8' },
  },
};

export default function ProfileBioEditPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase();

  const [form, setForm] = useState({ fullName: '', twitter: '', instagram: '', facebook: '', tiktok: '' });
  const handleChange = (f: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [f]: e.target.value }));

  const handleSubmit = () => toast.success('Profile update submitted for review!');

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

        <Typography sx={{ fontWeight: 900, fontSize: '1.5rem', color: '#0F172A', mb: 0.5 }}>Update Your Profile</Typography>
        <Typography sx={{ fontSize: '0.88rem', color: '#64748B', lineHeight: 1.6, mb: 3 }}>
          Request To Update Your Business Information. Our Admin Team Will Review Your Request.
        </Typography>

        {/* Steps */}
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

        <Box sx={{ textAlign: 'center', mt: 4, mb: 3 }}>
          <Typography sx={{ fontWeight: 900, fontSize: '1.5rem', color: '#0F172A', mb: 0.5 }}>
            Update Your Business Information
          </Typography>
          <Typography sx={{ fontSize: '0.88rem', color: '#64748B', maxWidth: 480, mx: 'auto' }}>
            Tell Us About What You Do So We Can Update It On Your Public Profile.
          </Typography>
        </Box>

        <Paper 
          elevation={0}
          sx={{ 
            maxWidth: 650, 
            mx: 'auto', 
            p: { xs: 2.5, md: 5 }, 
            border: { xs: 'none', md: '1px solid #E2E8F0' }, 
            borderRadius: 4, 
            boxShadow: { xs: 'none', md: '0 4px 20px rgba(0,0,0,0.05)' },
            bgcolor: '#FFFFFF'
          }}
        >
          {/* Personal Information */}
          <Box sx={{ mb: 4 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '1.15rem', color: '#0F172A', mb: 0.3 }}>Personal Information</Typography>
            <Typography sx={{ fontSize: '0.82rem', color: '#64748B', mb: 2 }}>
              Please Provide Your Legal Name Exactly As It Appears On Your ID.
            </Typography>
            <Typography
              component="label"
              htmlFor="fullName"
              sx={{ fontSize: '0.78rem', color: '#0F172A', fontWeight: 600, display: 'block', mb: 0.8 }}
            >
              Full Legal Name
            </Typography>
            <TextField
              id="fullName"
              fullWidth
              placeholder="e.g., Sarah Chen"
              value={form.fullName}
              onChange={handleChange('fullName')}
              sx={inputSx}
              size="small"
            />
          </Box>

          {/* Social Media */}
          <Box sx={{ mb: 4 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '1.15rem', color: '#0F172A', mb: 0.3 }}>Social Media Presence</Typography>
            <Typography sx={{ fontSize: '0.82rem', color: '#64748B', mb: 2 }}>
              Used To Understand Your Digital Footprint And Brand Presence
            </Typography>

            {[
              { field: 'twitter', label: 'X (formally tweeter) handle', placeholder: 'https://x.com/profile' },
              { field: 'instagram', label: 'Instagram Handle', placeholder: 'https://instagram.com/profile' },
              { field: 'facebook', label: 'Facebook Handle', placeholder: 'https://facebook.com/profile' },
              { field: 'tiktok', label: 'TikTok Handle', placeholder: 'https://tiktok.com/@profile' },
            ].map((item) => (
              <Box key={item.field} sx={{ mb: 2.5 }}>
                <Typography sx={{ fontSize: '0.78rem', color: '#0F172A', fontWeight: 600, mb: 0.8 }}>{item.label}</Typography>
                <TextField
                  fullWidth
                  placeholder={item.placeholder}
                  value={(form as any)[item.field]}
                  onChange={handleChange(item.field)}
                  sx={inputSx}
                  size="small"
                />
              </Box>
            ))}
          </Box>

          <Button
            variant="contained"
            fullWidth
            onClick={handleSubmit}
            sx={{ bgcolor: '#1A1FE8', color: '#fff', borderRadius: 2.5, py: 1.6, fontWeight: 700, fontSize: '1rem', textTransform: 'none', '&:hover': { bgcolor: '#1318C0' } }}
          >
            Submit For Review
          </Button>
        </Paper>
      </Box>
    </Box>
  );
}
