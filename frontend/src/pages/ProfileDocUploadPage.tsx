import React, { useState, useRef } from 'react';
import { Box, Typography, Button, Avatar, Breadcrumbs, Link as MuiLink, Paper } from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import EditNoteIcon from '@mui/icons-material/EditNote';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import PaymentsIcon from '@mui/icons-material/Payments';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import UploadIcon from '@mui/icons-material/Upload';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { submitVerification } from '../api/verifications';
import toast from 'react-hot-toast';



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
  const navigate = useNavigate();
  const [govId, setGovId] = useState<File | null>(null);
  const [cacDoc, setCacDoc] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!govId || !cacDoc || !video) {
      toast.error('Please upload all three required files');
      return;
    }
    setLoading(true);
    try {
      await submitVerification(govId, cacDoc, video);
      toast.success('Documents submitted for review!');
      navigate('/dashboard/verification');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Failed to submit verification');
    } finally {
      setLoading(false);
    }
  };

  const instructions = [
    'Ensure all 4 corners of the document are visible',
    'Avoid glare or reflections on the document',
    'Photo must be clear and text fully legible',
    'Document must not be expired',
  ];

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
          {/* Upload zones */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mb: 3 }}>
            <UploadZone
              title="Identity Verification"
              subtitle="Upload a valid, unexpired government-issued ID."
              accept="image/*,.pdf"
              labels={['Passport', 'National ID', "Driver's License"]}
              onFile={setGovId}
            />
            <UploadZone
              title="Business Registration"
              subtitle="Upload a valid government-issued ID."
              accept="image/*,.pdf"
              labels={['CAC Certificate']}
              onFile={setCacDoc}
            />
            <UploadZone
              title="video upload"
              subtitle="Upload two minute of you and your business environment"
              accept="video/mp4"
              labels={['Video']}
              onFile={setVideo}
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
            disabled={loading}
            onClick={handleSubmit}
            sx={{ bgcolor: '#1A1FE8', color: '#fff', borderRadius: 2.5, py: 1.6, fontWeight: 700, fontSize: '1rem', textTransform: 'none', '&:hover': { bgcolor: '#1318C0' } }}
          >
            {loading ? 'Submitting...' : 'Submit For Review'}
          </Button>
        </Paper>
      </Box>
    </Box>
  );
}
