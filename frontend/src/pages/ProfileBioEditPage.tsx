import { useState } from 'react';
import { Box, Typography, Button, TextField, Avatar } from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import EditNoteIcon from '@mui/icons-material/EditNote';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import PaymentsIcon from '@mui/icons-material/Payments';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function OnlokLogo() {
  return (
    <Typography component={RouterLink} to="/" sx={{ textDecoration: 'none', fontWeight: 900, fontSize: '1.5rem', color: '#1A1FE8', letterSpacing: '-0.04em' }}>
      Onlok
    </Typography>
  );
}

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
  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase();

  const [form, setForm] = useState({ businessName: '', twitter: '', instagram: '', facebook: '' });
  const handleChange = (f: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [f]: e.target.value }));

  const handleSubmit = () => toast.success('Profile update submitted for review!');

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
        <Button component={RouterLink} to="/dashboard/update" sx={{ textTransform: 'none', color: '#475569', fontWeight: 600, fontSize: '0.9rem', pl: 0, mb: 2, '&:hover': { bgcolor: 'transparent', color: '#1A1FE8' } }}>
          ‹ Back
        </Button>

        <Typography sx={{ fontWeight: 900, fontSize: '1.5rem', color: '#0F172A', mb: 0.5 }}>Update Your Profile</Typography>
        <Typography sx={{ fontSize: '0.88rem', color: '#64748B', lineHeight: 1.6, mb: 3 }}>
          Request To Update Your Business Information. Our Admin Team Will Review Your Request.
        </Typography>

        {/* Steps */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #E2E8F0', borderLeft: '1px solid #E2E8F0', mb: 4 }}>
          {steps.map((step) => (
            <Box key={step.num} sx={{ borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', p: 1.5 }}>
              <Box sx={{ width: 30, height: 30, borderRadius: '50%', bgcolor: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.8 }}>{step.icon}</Box>
              <Typography sx={{ fontWeight: 800, fontSize: '0.8rem', color: '#0F172A', mb: 0.3 }}>{step.num} {step.title}</Typography>
              <Typography sx={{ fontSize: '0.7rem', color: '#64748B', lineHeight: 1.3 }}>{step.desc}</Typography>
            </Box>
          ))}
        </Box>

        {/* Business Details */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontWeight: 900, fontSize: '1.2rem', color: '#0F172A', mb: 0.3 }}>Business / Service Details</Typography>
          <Typography sx={{ fontSize: '0.82rem', color: '#64748B', mb: 2 }}>
            Tell Us About What You Do So We Can Display It On Your Public Profile.
          </Typography>
          <Typography
            component="label"
            htmlFor="bizName"
            sx={{ fontSize: '0.82rem', color: '#0F172A', fontWeight: 500, textDecoration: 'underline', display: 'block', mb: 0.8 }}
          >
            Business Name or Professional Role
          </Typography>
          <TextField
            id="bizName"
            fullWidth
            placeholder="E.G., Chen Design"
            value={form.businessName}
            onChange={handleChange('businessName')}
            sx={inputSx}
            size="small"
          />
        </Box>

        {/* Social Media */}
        <Box sx={{ mb: 4 }}>
          <Typography sx={{ fontWeight: 900, fontSize: '1.2rem', color: '#0F172A', mb: 0.3 }}>Social Media Presence</Typography>
          <Typography sx={{ fontSize: '0.82rem', color: '#64748B', mb: 2 }}>
            Used To Understand Your Digital Footprint And Brand Presence
          </Typography>

          {[
            { field: 'twitter', label: 'X (formally tweeter) handle', placeholder: 'https://x.com/profile' },
            { field: 'instagram', label: 'Instagram Handle', placeholder: 'https://instagram.com/profile' },
            { field: 'facebook', label: 'Facebook Handle', placeholder: 'https://facebook.com/profile' },
          ].map((item) => (
            <Box key={item.field} sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: '0.82rem', color: '#0F172A', fontWeight: 500, mb: 0.8 }}>{item.label}</Typography>
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
      </Box>
    </Box>
  );
}
