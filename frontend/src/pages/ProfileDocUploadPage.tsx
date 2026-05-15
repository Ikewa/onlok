import { useState, useRef } from 'react';
import { Box, Typography, Button, Avatar } from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import EditNoteIcon from '@mui/icons-material/EditNote';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import PaymentsIcon from '@mui/icons-material/Payments';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import UploadIcon from '@mui/icons-material/Upload';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
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

function UploadZone({
  title, subtitle, accept, labels, onFile,
}: {
  title: string; subtitle: string; accept: string; labels: string[]; onFile?: (f: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) { setFileName(file.name); onFile?.(file); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setFileName(file.name); onFile?.(file); }
  };

  return (
    <Box>
      <Typography sx={{ fontWeight: 900, fontSize: '1.15rem', color: '#0F172A', mb: 0.3 }}>{title}</Typography>
      <Typography sx={{ fontSize: '0.82rem', color: '#64748B', mb: 1.5 }}>{subtitle}</Typography>

      <Box
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        sx={{
          border: '2px dashed #CBD5E1',
          borderRadius: 3,
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          minHeight: 130,
          bgcolor: fileName ? '#F0FDF4' : '#FAFAFA',
          borderColor: fileName ? '#22C55E' : '#CBD5E1',
          transition: '0.15s',
          '&:hover': { borderColor: '#1A1FE8', bgcolor: '#EEF2FF' },
          mb: 0.8,
        }}
      >
        <input ref={inputRef} type="file" accept={accept} hidden onChange={handleChange} />
        {fileName ? (
          <>
            <CheckCircleIcon sx={{ color: '#22C55E', fontSize: 32, mb: 1 }} />
            <Typography sx={{ fontSize: '0.82rem', color: '#22C55E', fontWeight: 700 }}>{fileName}</Typography>
          </>
        ) : (
          <>
            <UploadIcon sx={{ color: '#94A3B8', fontSize: 32, mb: 1 }} />
            <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#475569' }}>Click To Upload Document</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8', mt: 0.3 }}>{accept.includes('video') ? 'mp4 (100mb)' : 'PNG, JPG or PDF (max. 10MB)'}</Typography>
          </>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        {labels.map((l) => (
          <Typography key={l} sx={{ fontSize: '0.75rem', color: '#64748B', bgcolor: '#F1F5F9', px: 1.2, py: 0.4, borderRadius: 1, fontWeight: 500 }}>
            {l}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

export default function ProfileDocUploadPage() {
  const { user } = useAuth();
  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase();

  const handleSubmit = () => toast.success('Documents submitted for review!');

  const instructions = [
    'Ensure all 4 corners of the document are visible',
    'Avoid glare or reflections on the document',
    'Photo must be clear and text fully legible',
    'Document must not be expired',
  ];

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

        {/* Upload zones */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mb: 3 }}>
          <UploadZone
            title="Identity Verification"
            subtitle="Upload A Valid, Unexpired Government-Issued ID."
            accept="image/*,.pdf"
            labels={['Passport', 'National ID']}
          />
          <UploadZone
            title="Business Registration"
            subtitle="Upload A Valid CAC Certificate Or SMEDAN"
            accept="image/*,.pdf"
            labels={['CAC Certificate', 'SMEDAN']}
          />
          <UploadZone
            title="Video Upload"
            subtitle="Upload Two Minute Of You And Your Business Environment"
            accept="video/mp4"
            labels={['Video']}
          />
        </Box>

        {/* Instructions */}
        <Box sx={{ border: '1px solid #E2E8F0', borderRadius: 3, p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <InfoOutlinedIcon sx={{ color: '#1A1FE8', fontSize: 18 }} />
            <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A' }}>Upload Instructions</Typography>
          </Box>
          {instructions.map((inst) => (
            <Box key={inst} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.8, mb: 0.8 }}>
              <Typography sx={{ color: '#64748B', fontSize: '0.82rem', lineHeight: 1.5 }}>• {inst}</Typography>
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
